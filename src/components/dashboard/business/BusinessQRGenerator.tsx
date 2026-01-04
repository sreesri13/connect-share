import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, ChevronRight, QrCode, Download, Copy, Link, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CustomQRCode } from "@/components/qr/CustomQRCode";
import { QRCustomizationPanel } from "@/components/qr/QRCustomizationPanel";
import { QRShareButton } from "@/components/qr/QRShareButton";
import { LocationPicker, LocationData } from "@/components/qr/LocationPicker";
import { useQRStyles } from "@/hooks/useQRStyles";
import { defaultQRStyle, oceanPresetStyle, QRStyleConfig } from "@/lib/qr-styles";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  status: "active" | "disabled";
}

interface BusinessQRGeneratorProps {
  userId: string;
}

export const BusinessQRGenerator = ({ userId }: BusinessQRGeneratorProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [qrTitle, setQrTitle] = useState("");
  const [enableCustomization, setEnableCustomization] = useState(false);
  const [qrStyle, setQrStyle] = useState<QRStyleConfig>(defaultQRStyle);
  const [generatedQR, setGeneratedQR] = useState<{ publicId: string; url: string; style: QRStyleConfig } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Location lock settings
  const [enableLocationLock, setEnableLocationLock] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  const qrRef = useRef<HTMLDivElement>(null);
  const { styles, saveStyle, getStyleById } = useQRStyles();

  useEffect(() => {
    fetchData();
  }, [userId]);

  // Apply Ocean preset when customization is enabled
  useEffect(() => {
    if (enableCustomization) {
      setQrStyle(oceanPresetStyle);
    } else {
      setQrStyle(defaultQRStyle);
    }
  }, [enableCustomization]);

  const fetchData = async () => {
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        supabase
          .from("business_categories")
          .select("id, name")
          .eq("user_id", userId)
          .order("display_order"),
        supabase
          .from("business_products")
          .select("id, category_id, name, image_url, original_price, discount_price, status")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("display_order"),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (productsRes.error) throw productsRes.error;

      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
      
      // Expand all categories by default
      setExpandedCategories(new Set((categoriesRes.data || []).map((c) => c.id)));
    } catch (error: any) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProductsByCategory = (categoryId: string) => {
    return products.filter((p) => p.category_id === categoryId);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleCategorySelection = (categoryId: string) => {
    const categoryProducts = getProductsByCategory(categoryId);
    const allSelected = categoryProducts.every((p) => selectedProducts.has(p.id));

    setSelectedProducts((prev) => {
      const next = new Set(prev);
      categoryProducts.forEach((p) => {
        if (allSelected) {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      });
      return next;
    });
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const isCategorySelected = (categoryId: string) => {
    const categoryProducts = getProductsByCategory(categoryId);
    return categoryProducts.length > 0 && categoryProducts.every((p) => selectedProducts.has(p.id));
  };

  const isCategoryPartiallySelected = (categoryId: string) => {
    const categoryProducts = getProductsByCategory(categoryId);
    const selectedCount = categoryProducts.filter((p) => selectedProducts.has(p.id)).length;
    return selectedCount > 0 && selectedCount < categoryProducts.length;
  };

  const generatePublicId = () => {
    return `biz_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  };

  const handleGenerate = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Please select at least one product");
      return;
    }

    if (enableLocationLock && !locationData) {
      toast.error("Please select a location for location-based access");
      return;
    }

    setIsGenerating(true);
    try {
      const publicId = generatePublicId();
      const qrUrl = `${window.location.origin}/business/${publicId}`;

      // Create QR business page
      const { data: pageData, error: pageError } = await supabase
        .from("qr_business_pages")
        .insert({
          user_id: userId,
          public_id: publicId,
          title: qrTitle.trim() || null,
          style_config: enableCustomization ? (qrStyle as any) : null,
          location_locked: enableLocationLock,
          location_lat: locationData?.lat || null,
          location_lng: locationData?.lng || null,
          location_name: locationData?.name || null,
        })
        .select("id")
        .single();

      if (pageError) throw pageError;

      // Add selected products to the page
      const productEntries = Array.from(selectedProducts).map((productId, index) => ({
        qr_page_id: pageData.id,
        product_id: productId,
        display_order: index,
      }));

      const { error: productsError } = await supabase
        .from("qr_business_page_products")
        .insert(productEntries);

      if (productsError) throw productsError;

      // Store the style used at generation time to lock it
      setGeneratedQR({ publicId, url: qrUrl, style: enableCustomization ? qrStyle : defaultQRStyle });
      toast.success("QR code generated successfully!");
    } catch (error: any) {
      toast.error("Failed to generate QR code");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!qrRef.current || !generatedQR) return;

    try {
      const canvas = qrRef.current.querySelector("canvas");
      if (!canvas) {
        toast.error("QR code not ready");
        return;
      }

      // Create high-res version by default
      const downloadCanvas = document.createElement("canvas");
      const scale = 4;
      downloadCanvas.width = canvas.width * scale;
      downloadCanvas.height = canvas.height * scale;
      const ctx = downloadCanvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.scale(scale, scale);
        ctx.drawImage(canvas, 0, 0);
      }

      const link = document.createElement("a");
      link.download = `business-qr-${generatedQR.publicId}.png`;
      link.href = downloadCanvas.toDataURL("image/png");
      link.click();
      toast.success("QR code downloaded");
    } catch (error) {
      toast.error("Failed to download QR code");
    }
  };

  const handleCopyUrl = () => {
    if (!generatedQR) return;
    navigator.clipboard.writeText(generatedQR.url);
    toast.success("URL copied to clipboard");
  };

  const handleReset = () => {
    setGeneratedQR(null);
    setSelectedProducts(new Set());
    setQrTitle("");
    setQrStyle(defaultQRStyle);
    setEnableCustomization(false);
    setEnableLocationLock(false);
    setLocationData(null);
  };

  const handleSaveStyle = async (name: string) => {
    await saveStyle(name, qrStyle);
  };

  const handleLoadStyle = (styleId: string) => {
    const style = getStyleById(styleId);
    if (style) {
      setQrStyle({ ...defaultQRStyle, ...style.config });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>Please create categories and add products first.</p>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>Please add products to your categories first.</p>
        </CardContent>
      </Card>
    );
  }

  if (generatedQR) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">QR Code Generated!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div ref={qrRef} className="bg-card p-4 rounded-lg border w-full max-w-[200px] sm:max-w-[240px]">
              <CustomQRCode
                id="business-qr-canvas"
                value={generatedQR.url}
                style={generatedQR.style}
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg w-full">
              <Link className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs sm:text-sm truncate flex-1">{generatedQR.url}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={handleCopyUrl}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
              <Button onClick={handleDownload} className="min-h-[44px]">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <QRShareButton
                qrCanvasId="business-qr-canvas"
                title={qrTitle || "Business QR"}
                url={generatedQR.url}
              />
              <Button variant="outline" onClick={handleReset} className="col-span-2 sm:col-span-1 min-h-[44px]">
                Create Another
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>QR Code Title (Optional)</Label>
            <Input
              value={qrTitle}
              onChange={(e) => setQrTitle(e.target.value)}
              placeholder="e.g., Summer Menu, New Collection"
            />
          </div>

          <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
            {categories.map((category) => {
              const categoryProducts = getProductsByCategory(category.id);
              if (categoryProducts.length === 0) return null;

              const isExpanded = expandedCategories.has(category.id);
              const isSelected = isCategorySelected(category.id);
              const isPartial = isCategoryPartiallySelected(category.id);

              return (
                <Collapsible
                  key={category.id}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center gap-2 p-3 bg-muted/30">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCategorySelection(category.id)}
                      className={isPartial ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                    <CollapsibleTrigger asChild>
                      <button className="flex-1 flex items-center gap-2 text-left">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({categoryProducts.length})
                        </span>
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="divide-y">
                      {categoryProducts.map((product) => (
                        <label
                          key={product.id}
                          className="flex items-center gap-3 p-3 pl-10 hover:bg-muted/30 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => toggleProductSelection(product.id)}
                          />
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.discount_price ? (
                                <>
                                  <span className="text-primary">₹{product.discount_price}</span>
                                  <span className="line-through ml-1">₹{product.original_price}</span>
                                </>
                              ) : (
                                <>₹{product.original_price}</>
                              )}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {selectedProducts.size} product{selectedProducts.size !== 1 ? "s" : ""} selected
            </span>
            {selectedProducts.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedProducts(new Set())}>
                Clear selection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Customization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">QR Code Preview</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="customize-toggle" className="text-sm">
                Customize
              </Label>
              <Switch
                id="customize-toggle"
                checked={enableCustomization}
                onCheckedChange={setEnableCustomization}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
            <div className="w-full max-w-[160px] sm:max-w-[200px]">
              <CustomQRCode
                id="business-qr-preview"
                value={`${window.location.origin}/business/preview`}
                style={enableCustomization ? qrStyle : defaultQRStyle}
              />
            </div>
          </div>

          {enableCustomization && (
            <QRCustomizationPanel
              value={qrStyle}
              onChange={setQrStyle}
              savedStyles={styles}
              onSaveStyle={handleSaveStyle}
              onLoadStyle={handleLoadStyle}
            />
          )}

          {/* Location Lock Option */}
          <LocationPicker
            enabled={enableLocationLock}
            onEnabledChange={setEnableLocationLock}
            location={locationData}
            onLocationChange={setLocationData}
          />

          <Button
            onClick={handleGenerate}
            disabled={selectedProducts.size === 0 || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR Code
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
