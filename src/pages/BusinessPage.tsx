import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Minus, Plus, ShoppingCart, X, Store, Lock, Eye, EyeOff, Clock, MapPin, Phone, Mail, Globe, Instagram, Facebook, Twitter, MessageCircle, Search, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { initGA, trackQRScan, trackProductClick } from "@/lib/analytics";
import { LocationVerification } from "@/components/qr/LocationVerification";
import { LanguageToggle } from "@/components/LanguageToggle";
import { recordQRScan, checkScanLimit } from "@/hooks/useQRScans";
import { ScanLimitReached } from "@/components/qr/ScanLimitReached";
import { hashPassword } from "@/lib/crypto";
import { ExpiryCountdown } from "@/components/qr/ExpiryCountdown";
import { BusinessInstallPrompt } from "@/components/business/BusinessInstallPrompt";

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
  business_hours: string | null;
  scan_limit_type: string | null;
  max_scans: number | null;
  daily_limit: number | null;
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
  const [introPhase, setIntroPhase] = useState<"logo" | "name" | "line" | "done">("logo");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Location verification states
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [isLocationVerified, setIsLocationVerified] = useState(false);

  // Password protection states
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [scanLimitReached, setScanLimitReached] = useState(false);
  const [scanLimitReachedType, setScanLimitReachedType] = useState<'total' | 'daily'>('total');

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  // In standalone mode, lock all navigation to this business page only
  useEffect(() => {
    if (!isStandalone) return;

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;

      // Allow same-page anchors
      if (href.startsWith("#")) return;

      // Block all navigation - this installed app should only show this business page
      try {
        const url = new URL(href, window.location.origin);
        const currentPath = `/business/${publicId}`;
        if (url.origin === window.location.origin && url.pathname === currentPath) return;
      } catch {}

      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isStandalone, publicId]);

  useEffect(() => {
    initGA();
    if (publicId) {
      trackQRScan(publicId, undefined, 'business');
      checkSecurityRequirements();
    }
  }, [publicId]);

  const checkSecurityRequirements = async () => {
    try {
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

      if (pageDataResult.expires_at && new Date(pageDataResult.expires_at) < new Date()) {
        setError("This QR code has expired");
        setIsLoading(false);
        return;
      }

      setPageData(pageDataResult as any);
      setPageTitle(pageDataResult.title);

      // Check scan limit before security checks
      const limitType = (pageDataResult as any).scan_limit_type;
      if (limitType && limitType !== 'unlimited') {
        const limitCheck = await checkScanLimit(
          pageDataResult.id, limitType, (pageDataResult as any).max_scans, (pageDataResult as any).daily_limit, true
        );
        if (!limitCheck.allowed) {
          setScanLimitReached(true);
          setScanLimitReachedType(limitType === 'daily' ? 'daily' : 'total');
          setIsLoading(false);
          return;
        }
      }

      if (pageDataResult.password_hash) {
        setIsPasswordProtected(true);
        setIsLoading(false);
        return;
      }

      if (pageDataResult.location_locked && pageDataResult.location_lat && pageDataResult.location_lng) {
        setIsLocationLocked(true);
        setIsLoading(false);
        return;
      }

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
      recordQRScan(pageId, true);

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

      const activeProducts = (pageProducts || [])
        .filter((pp: any) => pp.business_products.status === "active")
        .map((pp: any) => pp.business_products as Product);

      setProducts(activeProducts);

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

  const filteredProducts = useMemo(() => {
    let result = products;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (activeCategory) {
      result = result.filter((p) => p.category_id === activeCategory);
    }
    return result;
  }, [products, searchQuery, activeCategory]);

  const getProductsByCategory = (categoryId: string) => {
    return filteredProducts.filter((p) => p.category_id === categoryId);
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
    cart.forEach((item) => { total += item.quantity; });
    return total;
  };

  const getTotalPrice = () => {
    let total = 0;
    cart.forEach((item) => { total += getProductPrice(item.product) * item.quantity; });
    return total;
  };

  // Scan limit reached
  if (scanLimitReached) {
    return <ScanLimitReached type={scanLimitReachedType} />;
  }

  // Password verification screen
  if (isPasswordProtected && !isPasswordVerified) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-card rounded-2xl border shadow-xl p-6 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Password Protected</h1>
            <p className="text-sm text-muted-foreground">Enter the password to view this catalog</p>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(""); }}
                placeholder="Enter password"
                className="pr-10"
                onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSubmit(); }}
              />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            <Button onClick={handlePasswordSubmit} className="w-full">Submit</Button>
          </div>
        </motion.div>
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
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{error}</h1>
          <p className="text-muted-foreground">The page you're looking for doesn't exist or has been removed.</p>
        </motion.div>
      </div>
    );
  }

  const hasBusinessInfo = pageData?.business_name || pageData?.business_logo_url;

  // Polished Intro animation
  if (showIntro && hasBusinessInfo) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center overflow-hidden">
        <motion.div
          className="flex flex-col items-center gap-6 text-center px-8"
          onAnimationComplete={() => {
            setTimeout(() => {
              setIntroPhase("name");
              setTimeout(() => {
                setIntroPhase("line");
                setTimeout(() => setShowIntro(false), 1200);
              }, 800);
            }, 600);
          }}
        >
          {pageData?.business_logo_url && (
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.3, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden shadow-2xl border-2 border-primary/20">
                <img
                  src={pageData.business_logo_url}
                  alt={pageData.business_name || "Business Logo"}
                  className="w-full h-full object-cover"
                />
              </div>
              <motion.div
                className="absolute -inset-2 rounded-3xl border-2 border-primary/30"
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{ opacity: [0, 0.5, 0], scale: [1.2, 1.05, 1.1] }}
                transition={{ duration: 1.2, delay: 0.3 }}
              />
            </motion.div>
          )}
          {pageData?.business_name && (
            <motion.h1
              className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight"
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {pageData.business_name}
            </motion.h1>
          )}
          {pageData?.title && pageData.title !== pageData.business_name && (
            <motion.p
              className="text-lg text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              {pageData.title}
            </motion.p>
          )}
          <motion.div
            className="flex gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <motion.div className="w-2 h-2 rounded-full bg-primary" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} />
            <motion.div className="w-2 h-2 rounded-full bg-primary" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} />
            <motion.div className="w-2 h-2 rounded-full bg-primary" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const hasSocialLinks = pageData?.business_website || pageData?.business_instagram || pageData?.business_facebook || pageData?.business_twitter || pageData?.business_whatsapp;
  const hasContactInfo = pageData?.business_address || pageData?.business_phone || pageData?.business_email || pageData?.business_hours || hasSocialLinks;

  const visibleCategories = categories.filter((c) => getProductsByCategory(c.id).length > 0);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Sticky Header */}
      <motion.header
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border shadow-sm"
      >
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {pageData?.business_logo_url ? (
              <img src={pageData.business_logo_url} alt="" className="w-10 h-10 rounded-xl object-cover border flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-base sm:text-lg text-foreground truncate">
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
        </div>
      </motion.header>

      {/* Search Bar */}
      <div className="sticky top-[65px] z-30 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="pl-9 h-10 bg-muted/50 border-0 focus:bg-background"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          {/* Category Pills */}
          {categories.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 pb-28">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
          {searchQuery && filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No products found for "{searchQuery}"</p>
            </div>
          )}

          {visibleCategories.map((category, catIdx) => {
            const categoryProducts = getProductsByCategory(category.id);
            if (categoryProducts.length === 0) return null;

            return (
              <motion.section
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIdx * 0.1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">{category.name}</h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{categoryProducts.length} items</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {categoryProducts.map((product, idx) => {
                    const discountPercent = getDiscountPercentage(product.original_price, product.discount_price);
                    const cartQty = getCartQuantity(product.id);

                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group bg-card rounded-xl border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                      >
                        <div
                          className="cursor-pointer"
                          onClick={() => {
                            trackProductClick(product.id, product.name, publicId || '');
                            setSelectedProduct(product);
                          }}
                        >
                          <div className="relative overflow-hidden">
                            <AspectRatio ratio={1}>
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                              />
                            </AspectRatio>
                            {discountPercent && (
                              <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs shadow-sm">
                                -{discountPercent}%
                              </Badge>
                            )}
                          </div>
                          <div className="p-3 space-y-1.5">
                            <h3 className="font-medium text-sm line-clamp-2 leading-tight">{product.name}</h3>
                            <div className="flex items-center gap-2">
                              {product.discount_price ? (
                                <>
                                  <span className="font-bold text-primary text-sm">₹{product.discount_price}</span>
                                  <span className="text-xs text-muted-foreground line-through">₹{product.original_price}</span>
                                </>
                              ) : (
                                <span className="font-bold text-sm">₹{product.original_price}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="px-3 pb-3">
                          {cartQty === 0 ? (
                            <Button
                              size="sm"
                              className="w-full h-9"
                              onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                          ) : (
                            <div className="flex items-center justify-center gap-1 bg-primary rounded-md h-9">
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10" onClick={(e) => { e.stopPropagation(); removeFromCart(product.id); }}>
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="font-bold text-primary-foreground min-w-[24px] text-center text-sm">{cartQty}</span>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            );
          })}
        </div>
      </main>

      {/* Footer with business info */}
      {hasContactInfo && (
        <footer className="bg-muted/50 border-t border-border">
          <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Brand Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {pageData?.business_logo_url ? (
                    <img src={pageData.business_logo_url} alt="" className="w-10 h-10 rounded-xl object-cover border" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                      <Store className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                  <h3 className="font-bold text-foreground">
                    {pageData?.business_name || pageTitle || "Our Store"}
                  </h3>
                </div>
                {pageData?.business_address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{pageData.business_address}</span>
                  </div>
                )}
              </div>

              {/* Contact Column */}
              {(pageData?.business_phone || pageData?.business_email || pageData?.business_hours) && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider">Contact</h4>
                  {pageData?.business_phone && (
                    <a href={`tel:${pageData.business_phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{pageData.business_phone}</span>
                    </a>
                  )}
                  {pageData?.business_email && (
                    <a href={`mailto:${pageData.business_email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span>{pageData.business_email}</span>
                    </a>
                  )}
                  {pageData?.business_hours && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="whitespace-pre-line">{pageData.business_hours}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Social Column */}
              {hasSocialLinks && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider">Follow Us</h4>
                  <div className="flex flex-wrap gap-2">
                    {pageData?.business_website && (
                      <a href={pageData.business_website.startsWith("http") ? pageData.business_website : `https://${pageData.business_website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border hover:border-primary/50 transition-colors text-sm text-muted-foreground hover:text-primary">
                        <Globe className="w-4 h-4" />
                        <span>Website</span>
                      </a>
                    )}
                    {pageData?.business_instagram && (
                      <a href={`https://instagram.com/${pageData.business_instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border hover:border-primary/50 transition-colors text-sm text-muted-foreground hover:text-primary">
                        <Instagram className="w-4 h-4" />
                        <span>Instagram</span>
                      </a>
                    )}
                    {pageData?.business_facebook && (
                      <a href={pageData.business_facebook.startsWith("http") ? pageData.business_facebook : `https://facebook.com/${pageData.business_facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border hover:border-primary/50 transition-colors text-sm text-muted-foreground hover:text-primary">
                        <Facebook className="w-4 h-4" />
                        <span>Facebook</span>
                      </a>
                    )}
                    {pageData?.business_twitter && (
                      <a href={`https://x.com/${pageData.business_twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border hover:border-primary/50 transition-colors text-sm text-muted-foreground hover:text-primary">
                        <Twitter className="w-4 h-4" />
                        <span>Twitter</span>
                      </a>
                    )}
                    {pageData?.business_whatsapp && (
                      <a href={`https://wa.me/${pageData.business_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border hover:border-primary/50 transition-colors text-sm text-muted-foreground hover:text-primary">
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-8 pt-4 border-t border-border/50 text-center">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} {pageData?.business_name || "Store"}. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      )}

      {/* Floating Cart Bar */}
      <AnimatePresence>
        {getTotalItems() > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-2xl"
          >
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="w-6 h-6" />
                  <span className="absolute -top-2 -right-2 bg-background text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                </div>
                <div>
                  <p className="text-xs opacity-80">{getTotalItems()} item{getTotalItems() !== 1 ? "s" : ""}</p>
                  <p className="font-bold text-lg">₹{getTotalPrice().toFixed(2)}</p>
                </div>
              </div>
              <Button variant="secondary" onClick={() => setIsCartOpen(true)} className="font-semibold shadow-lg">
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
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
              </AspectRatio>
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {selectedProduct.discount_price ? (
                    <>
                      <span className="text-2xl font-bold text-primary">₹{selectedProduct.discount_price}</span>
                      <span className="text-lg text-muted-foreground line-through">₹{selectedProduct.original_price}</span>
                      <Badge className="bg-destructive text-destructive-foreground">
                        -{getDiscountPercentage(selectedProduct.original_price, selectedProduct.discount_price)}%
                      </Badge>
                    </>
                  ) : (
                    <span className="text-2xl font-bold">₹{selectedProduct.original_price}</span>
                  )}
                </div>
                {selectedProduct.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed">{selectedProduct.description}</p>
                )}
                <Button className="w-full" onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}>
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
                  <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{product.name}</h4>
                    <p className="text-primary font-bold text-sm">₹{getProductPrice(product)} × {quantity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => removeFromCart(product.id)}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-medium text-sm">{quantity}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => addToCart(product)}>
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

      {/* Install Prompt */}
      {pageData && (
        <BusinessInstallPrompt
          businessName={pageData.business_name || pageTitle || "Store"}
          logoUrl={pageData.business_logo_url}
          pageUrl={`/b/${publicId}`}
        />
      )}
    </div>
  );
};

export default BusinessPage;
