import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Minus, Plus, ShoppingCart, X, Store, Lock, Eye, EyeOff, Clock, MapPin, Phone, Mail, Globe, Instagram, Facebook, Twitter, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { initGA, trackQRScan, trackProductClick } from "@/lib/analytics";
import { LocationVerification } from "@/components/qr/LocationVerification";
import { LanguageToggle } from "@/components/LanguageToggle";
import { recordQRScan } from "@/hooks/useQRScans";
import { hashPassword } from "@/lib/crypto";
import { ExpiryCountdown } from "@/components/qr/ExpiryCountdown";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  category_id: string;
  name: string;
  image_url: string;
  original_price: number;
  discount_price: number | null;
  description: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface BusinessPageData {
  id: string;
  title: string | null;
  is_deleted: boolean;
  location_locked: boolean | null;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
  password_hash: string | null;
  expires_at: string | null;
  show_expires_at: boolean | null;
  business_name: string | null;
  business_logo_url: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_website: string | null;
  business_instagram: string | null;
  business_facebook: string | null;
  business_twitter: string | null;
  business_whatsapp: string | null;
}

const BusinessPage = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const [pageData, setPageData] = useState<BusinessPageData | null>(null);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Location verification states
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [isLocationVerified, setIsLocationVerified] = useState(false);

  // Password protection states
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    // Initialize GA tracking on business pages
    initGA();
    
    if (publicId) {
      // Track QR scan event when page is accessed
      trackQRScan(publicId, undefined, 'business');
      checkSecurityRequirements();
    }
  }, [publicId]);

  const checkSecurityRequirements = async () => {
    try {
      // Fetch page details
      const { data: pageDataResult, error: pageError } = await supabase
        .from("qr_business_pages")
        .select("*")
        .eq("public_id", publicId)
        .maybeSingle();

      if (pageError) throw pageError;

      if (!pageDataResult) {
        setError("Page not found");
        setIsLoading(false);
        return;
      }

      if (pageDataResult.is_deleted) {
        setError("This QR code is no longer active");
        setIsLoading(false);
        return;
      }

      // Check for expiration
      if (pageDataResult.expires_at && new Date(pageDataResult.expires_at) < new Date()) {
        setError("This QR code has expired");
        setIsLoading(false);
        return;
      }

      setPageData(pageDataResult as any);
      setPageTitle(pageDataResult.title);

      // Check for password protection first
      if (pageDataResult.password_hash) {
        setIsPasswordProtected(true);
        setIsLoading(false);
        return;
      }

      // Check for location lock
      if (pageDataResult.location_locked && pageDataResult.location_lat && pageDataResult.location_lng) {
        setIsLocationLocked(true);
        setIsLoading(false);
        return;
      }

      // No security, proceed to fetch products
      fetchPageProducts(pageDataResult.id);
    } catch (error: any) {
      console.error(error);
      setError("Failed to load page");
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (!pageData || !passwordInput.trim()) return;

    const inputHash = hashPassword(passwordInput.trim());
    
    if (inputHash === pageData.password_hash) {
      setIsPasswordVerified(true);
      setPasswordError("");
      
      // Check if location lock is also needed
      if (pageData.location_locked && pageData.location_lat && pageData.location_lng) {
        setIsLocationLocked(true);
      } else {
        setIsLoading(true);
        fetchPageProducts(pageData.id);
      }
    } else {
      setPasswordError("Incorrect password");
    }
  };

  const handleLocationVerified = () => {
    setIsLocationVerified(true);
    if (pageData) {
      setIsLoading(true);
      fetchPageProducts(pageData.id);
    }
  };

  const fetchPageProducts = async (pageId: string) => {
    try {
      // Record scan in database
      recordQRScan(pageId, true);

      // Fetch products for this page
      const { data: pageProducts, error: productsError } = await supabase
        .from("qr_business_page_products")
        .select(`
          product_id,
          display_order,
          business_products!inner (
            id,
            category_id,
            name,
            image_url,
            original_price,
            discount_price,
            description,
            status
          )
        `)
        .eq("qr_page_id", pageId)
        .order("display_order");

      if (productsError) throw productsError;

      // Filter active products and extract data
      const activeProducts = (pageProducts || [])
        .filter((pp: any) => pp.business_products.status === "active")
        .map((pp: any) => pp.business_products as Product);

      setProducts(activeProducts);

      // Get unique category IDs
      const categoryIds = [...new Set(activeProducts.map((p) => p.category_id))];

      if (categoryIds.length > 0) {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("business_categories")
          .select("id, name")
          .in("id", categoryIds);

        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);
      }
    } catch (error: any) {
      console.error(error);
      setError("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  const getProductsByCategory = (categoryId: string) => {
    return products.filter((p) => p.category_id === categoryId);
  };

  const getDiscountPercentage = (original: number, discount: number | null) => {
    if (!discount) return null;
    return Math.round(((original - discount) / original) * 100);
  };

  const getProductPrice = (product: Product) => {
    return product.discount_price ?? product.original_price;
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(product.id);
      if (existing) {
        next.set(product.id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(product.id, { product, quantity: 1 });
      }
      return next;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId);
      if (existing && existing.quantity > 1) {
        next.set(productId, { ...existing, quantity: existing.quantity - 1 });
      } else {
        next.delete(productId);
      }
      return next;
    });
  };

  const getCartQuantity = (productId: string) => {
    return cart.get(productId)?.quantity || 0;
  };

  const getTotalItems = () => {
    let total = 0;
    cart.forEach((item) => {
      total += item.quantity;
    });
    return total;
  };

  const getTotalPrice = () => {
    let total = 0;
    cart.forEach((item) => {
      total += getProductPrice(item.product) * item.quantity;
    });
    return total;
  };

  // Password verification screen
  if (isPasswordProtected && !isPasswordVerified) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card rounded-2xl border shadow-lg p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Password Protected</h1>
            <p className="text-sm text-muted-foreground">
              Enter the password to view this catalog
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError("");
                }}
                placeholder="Enter password"
                className="pr-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePasswordSubmit();
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
            <Button onClick={handlePasswordSubmit} className="w-full">
              Submit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Location verification screen
  if (isLocationLocked && !isLocationVerified && pageData) {
    return (
      <LocationVerification
        targetLat={pageData.location_lat!}
        targetLng={pageData.location_lng!}
        targetName={pageData.location_name || "Selected Location"}
        onVerified={handleLocationVerified}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{error}</h1>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const hasBusinessInfo = pageData?.business_name || pageData?.business_logo_url;

  // Intro animation
  if (showIntro && hasBusinessInfo) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          onAnimationComplete={() => {
            setTimeout(() => setShowIntro(false), 1500);
          }}
          className="flex flex-col items-center gap-4 text-center px-6"
        >
          {pageData?.business_logo_url && (
            <motion.img
              src={pageData.business_logo_url}
              alt={pageData.business_name || "Business Logo"}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover shadow-lg border"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            />
          )}
          {pageData?.business_name && (
            <motion.h1
              className="text-2xl sm:text-4xl font-bold text-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {pageData.business_name}
            </motion.h1>
          )}
          <motion.div
            className="w-8 h-1 bg-primary rounded-full"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          />
        </motion.div>
      </div>
    );
  }

  const hasSocialLinks = pageData?.business_website || pageData?.business_instagram || pageData?.business_facebook || pageData?.business_twitter || pageData?.business_whatsapp;

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          {pageData?.business_logo_url ? (
            <img src={pageData.business_logo_url} alt="" className="w-10 h-10 rounded-xl object-cover border flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg text-foreground truncate">
              {pageData?.business_name || pageTitle || "Product Catalog"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {products.length} product{products.length !== 1 ? "s" : ""}
            </p>
          </div>
          {pageData?.show_expires_at && pageData?.expires_at && (
            <ExpiryCountdown expiresAt={pageData.expires_at} />
          )}
          <LanguageToggle inline />
        </div>
      </header>

      {/* Business Info Section */}
      {(pageData?.business_address || pageData?.business_phone || pageData?.business_email || hasSocialLinks) && (
        <div className="max-w-3xl mx-auto px-4 py-4 border-b border-border/50">
          <div className="space-y-3">
            {pageData?.business_address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{pageData.business_address}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {pageData?.business_phone && (
                <a href={`tel:${pageData.business_phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{pageData.business_phone}</span>
                </a>
              )}
              {pageData?.business_email && (
                <a href={`mailto:${pageData.business_email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{pageData.business_email}</span>
                </a>
              )}
            </div>
            {hasSocialLinks && (
              <div className="flex items-center gap-3">
                {pageData?.business_website && (
                  <a href={pageData.business_website.startsWith("http") ? pageData.business_website : `https://${pageData.business_website}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-muted hover:bg-primary/10 transition-colors">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                  </a>
                )}
                {pageData?.business_instagram && (
                  <a href={`https://instagram.com/${pageData.business_instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-muted hover:bg-primary/10 transition-colors">
                    <Instagram className="w-4 h-4 text-muted-foreground" />
                  </a>
                )}
                {pageData?.business_facebook && (
                  <a href={pageData.business_facebook.startsWith("http") ? pageData.business_facebook : `https://facebook.com/${pageData.business_facebook}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-muted hover:bg-primary/10 transition-colors">
                    <Facebook className="w-4 h-4 text-muted-foreground" />
                  </a>
                )}
                {pageData?.business_twitter && (
                  <a href={`https://x.com/${pageData.business_twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-muted hover:bg-primary/10 transition-colors">
                    <Twitter className="w-4 h-4 text-muted-foreground" />
                  </a>
                )}
                {pageData?.business_whatsapp && (
                  <a href={`https://wa.me/${pageData.business_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-muted hover:bg-primary/10 transition-colors">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {categories.map((category) => {
          const categoryProducts = getProductsByCategory(category.id);
          if (categoryProducts.length === 0) return null;


          return (
            <section key={category.id} className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">{category.name}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {categoryProducts.map((product) => {
                  const discountPercent = getDiscountPercentage(
                    product.original_price,
                    product.discount_price
                  );
                  const cartQty = getCartQuantity(product.id);

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          trackProductClick(product.id, product.name, publicId || '');
                          setSelectedProduct(product);
                        }}
                      >
                        <div className="relative">
                          <AspectRatio ratio={1}>
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </AspectRatio>
                          {discountPercent && (
                            <Badge className="absolute top-2 left-2 bg-destructive text-xs">
                              -{discountPercent}%
                            </Badge>
                          )}
                        </div>
                        <div className="p-3 space-y-2">
                          <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                          <div className="flex items-center gap-2">
                            {product.discount_price ? (
                              <>
                                <span className="font-bold text-primary">
                                  ₹{product.discount_price}
                                </span>
                                <span className="text-xs text-muted-foreground line-through">
                                  ₹{product.original_price}
                                </span>
                              </>
                            ) : (
                              <span className="font-bold">₹{product.original_price}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Add to cart controls */}
                      <div className="px-3 pb-3">
                        {cartQty === 0 ? (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        ) : (
                          <div className="flex items-center justify-center gap-2 bg-primary rounded-md py-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromCart(product.id);
                              }}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="font-bold text-primary-foreground min-w-[20px] text-center">
                              {cartQty}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {/* Cart Summary Bar */}
      <AnimatePresence>
        {getTotalItems() > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-4 shadow-lg"
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="w-6 h-6" />
                  <span className="absolute -top-2 -right-2 bg-background text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                </div>
                <div>
                  <p className="text-sm opacity-90">
                    {getTotalItems()} item{getTotalItems() !== 1 ? "s" : ""}
                  </p>
                  <p className="font-bold text-lg">₹{getTotalPrice().toFixed(2)}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setIsCartOpen(true)}
                className="font-semibold"
              >
                View Cart
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <AspectRatio ratio={1} className="bg-muted rounded-lg overflow-hidden">
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </AspectRatio>
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {selectedProduct.discount_price ? (
                    <>
                      <span className="text-2xl font-bold text-primary">
                        ₹{selectedProduct.discount_price}
                      </span>
                      <span className="text-lg text-muted-foreground line-through">
                        ₹{selectedProduct.original_price}
                      </span>
                      <Badge className="bg-destructive">
                        -{getDiscountPercentage(
                          selectedProduct.original_price,
                          selectedProduct.discount_price
                        )}%
                      </Badge>
                    </>
                  ) : (
                    <span className="text-2xl font-bold">
                      ₹{selectedProduct.original_price}
                    </span>
                  )}
                </div>
                {selectedProduct.description && (
                  <p className="text-muted-foreground">{selectedProduct.description}</p>
                )}
                <Button
                  className="w-full"
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart Modal */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Your Cart
            </DialogTitle>
          </DialogHeader>
          {cart.size === 0 ? (
            <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
          ) : (
            <div className="space-y-4">
              {Array.from(cart.values()).map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-16 h-16 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{product.name}</h4>
                    <p className="text-primary font-bold">
                      ₹{getProductPrice(product)} × {quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => removeFromCart(product.id)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => addToCart(product)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">₹{getTotalPrice().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessPage;
