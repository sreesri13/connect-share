import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, ChevronRight, QrCode, Download, Copy, Link, Share2, Lock, LockOpen, Clock, Eye, EyeOff } from "lucide-react";
import { BusinessInfoForm, BusinessInfo, defaultBusinessInfo } from "@/components/business/BusinessInfoForm";
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
import { hashPassword } from "@/lib/crypto";
import { addHours, addDays, format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

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
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(defaultBusinessInfo);
  const [activeTab, setActiveTab] = useState("products");

  // Location lock settings
  const [enableLocationLock, setEnableLocationLock] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  // Password settings
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Expiry settings
  type ExpiryOption = "none" | "1h" | "24h" | "7d" | "30d" | "custom";
  const [expiryOption, setExpiryOption] = useState<ExpiryOption>("none");
  const [customExpiryDate, setCustomExpiryDate] = useState<Date | undefined>(undefined);
  const [showExpiryToVisitors, setShowExpiryToVisitors] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);
  const { styles, saveStyle, getStyleById } = useQRStyles();

  useEffect(() => {
    fetchData();
  }, [userId]);

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
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const toggleCategorySelection = (categoryId: string) => {
    const categoryProducts = getProductsByCategory(categoryId);
    const allSelected = categoryProducts.every((p) => selectedProducts.has(p.id));
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      categoryProducts.forEach((p) => {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      });
      return next;
    });
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
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

  const calculateExpirationDate = (): string | null => {
    if (expiryOption === "none") return null;
    const baseDate = new Date();
    switch (expiryOption) {
      case "1h": return addHours(baseDate, 1).toISOString();
      case "24h": return addHours(baseDate, 24).toISOString();
      case "7d": return addDays(baseDate, 7).toISOString();
      case "30d": return addDays(baseDate, 30).toISOString();
      case "custom": return customExpiryDate ? customExpiryDate.toISOString() : null;
      default: return null;
    }
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
    if (enablePassword && !password.trim()) {
      toast.error("Please enter a password");
      return;
    }
    if (expiryOption === "custom" && !customExpiryDate) {
      toast.error("Please select an expiry date");
      return;
    }

    setIsGenerating(true);
    try {
      const publicId = generatePublicId();
      const qrUrl = `${window.location.origin}/business/${publicId}`;
      const expiresAt = calculateExpirationDate();
      const passwordHash = enablePassword && password.trim() ? hashPassword(password.trim()) : null;

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
          password_hash: passwordHash,
          expires_at: expiresAt,
          show_expires_at: showExpiryToVisitors,
          business_name: businessInfo.business_name || null,
          business_logo_url: businessInfo.business_logo_url || null,
          business_address: businessInfo.business_address || null,
          business_phone: businessInfo.business_phone || null,
          business_email: businessInfo.business_email || null,
          business_website: businessInfo.business_website || null,
          business_instagram: businessInfo.business_instagram || null,
          business_facebook: businessInfo.business_facebook || null,
          business_twitter: businessInfo.business_twitter || null,
          business_whatsapp: businessInfo.business_whatsapp || null,
          business_hours: businessInfo.business_hours || null,
        } as any)
        .select("id")
        .single();

      if (pageError) throw pageError;

      const productEntries = Array.from(selectedProducts).map((productId, index) => ({
        qr_page_id: pageData.id,
        product_id: productId,
        display_order: index,
      }));

      const { error: productsError } = await supabase
        .from("qr_business_page_products")
        .insert(productEntries);

      if (productsError) throw productsError;

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
      if (!canvas) { toast.error("QR code not ready"); return; }
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
    setEnablePassword(false);
    setPassword("");
    setShowPassword(false);
    setExpiryOption("none");
    setCustomExpiryDate(undefined);
    setShowExpiryToVisitors(false);
    setBusinessInfo(defaultBusinessInfo);
    setActiveTab("products");
  };

  const handleSaveStyle = async (name: string) => {
    await saveStyle(name, qrStyle);
  };

  const handleLoadStyle = (styleId: string) => {
    const style = getStyleById(styleId);
    if (style) setQrStyle({ ...defaultQRStyle, ...style.config });
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
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        <p>Please create categories and add products first.</p>
      </CardContent></Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        <p>Please add products to your categories first.</p>
      </CardContent></Card>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
              <Button onClick={handleDownload} className="min-h-[44px]">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <QRShareButton qrCanvasId="business-qr-canvas" title={qrTitle || "Business QR"} url={generatedQR.url} />
              <Button variant="secondary" onClick={() => window.open(generatedQR.url, "_blank")} className="min-h-[44px]">
                <Eye className="w-4 h-4 mr-2" />
                Preview Page
              </Button>
              <Button variant="outline" onClick={handleReset} className="min-h-[44px]">
                Create Another
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine if right panel should show
  const showRightPanel = enableCustomization || enableLocationLock;

  return (
    <div className="space-y-6">
      {/* Top Section: Products & Business Info in tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products">Select Products</TabsTrigger>
          <TabsTrigger value="business">Business Information</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
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
                    <Collapsible key={category.id} open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
                      <div className="flex items-center gap-2 p-3 bg-muted/30">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCategorySelection(category.id)}
                          className={isPartial ? "data-[state=checked]:bg-primary/50" : ""}
                        />
                        <CollapsibleTrigger asChild>
                          <button className="flex-1 flex items-center gap-2 text-left">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span className="font-medium">{category.name}</span>
                            <span className="text-sm text-muted-foreground">({categoryProducts.length})</span>
                          </button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <div className="divide-y">
                          {categoryProducts.map((product) => (
                            <label key={product.id} className="flex items-center gap-3 p-3 pl-10 hover:bg-muted/30 cursor-pointer">
                              <Checkbox checked={selectedProducts.has(product.id)} onCheckedChange={() => toggleProductSelection(product.id)} />
                              <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded object-cover" />
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
        </TabsContent>

        <TabsContent value="business" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <BusinessInfoForm value={businessInfo} onChange={setBusinessInfo} userId={userId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Section: QR Preview (left) + Customization/Location (right) */}
      <div className={`grid gap-6 ${showRightPanel ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* QR Code Preview & Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">QR Code Preview</CardTitle>
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

            {/* Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-muted-foreground" />
                  <Label>Customize QR</Label>
                </div>
                <Switch checked={enableCustomization} onCheckedChange={setEnableCustomization} />
              </div>

              {/* Password Protection */}
              <div className="space-y-3 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {enablePassword ? <Lock className="w-4 h-4 text-primary" /> : <LockOpen className="w-4 h-4 text-muted-foreground" />}
                    <Label>Password Protection</Label>
                  </div>
                  <Switch checked={enablePassword} onCheckedChange={setEnablePassword} />
                </div>
                {enablePassword && (
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
              </div>

              {/* Location Lock Toggle */}
              <div className="p-3 border rounded-lg">
                {!showRightPanel || !enableLocationLock ? (
                  <LocationPicker
                    enabled={enableLocationLock}
                    onEnabledChange={setEnableLocationLock}
                    location={locationData}
                    onLocationChange={setLocationData}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      <Label>Location Lock</Label>
                    </div>
                    <Switch checked={enableLocationLock} onCheckedChange={setEnableLocationLock} />
                  </div>
                )}
              </div>

              {/* Expiry Settings */}
              <div className="space-y-3 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Label>QR Code Expiration</Label>
                </div>
                <Select value={expiryOption} onValueChange={(value) => setExpiryOption(value as ExpiryOption)}>
                  <SelectTrigger><SelectValue placeholder="Set expiration" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Never expires</SelectItem>
                    <SelectItem value="1h">Expire in 1 hour</SelectItem>
                    <SelectItem value="24h">Expire in 24 hours</SelectItem>
                    <SelectItem value="7d">Expire in 7 days</SelectItem>
                    <SelectItem value="30d">Expire in 30 days</SelectItem>
                    <SelectItem value="custom">Custom date</SelectItem>
                  </SelectContent>
                </Select>
                {expiryOption === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {customExpiryDate ? format(customExpiryDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={customExpiryDate} onSelect={setCustomExpiryDate} disabled={(date) => date < new Date()} initialFocus />
                    </PopoverContent>
                  </Popover>
                )}
                {expiryOption !== "none" && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="show-expiry" className="text-sm">Show countdown to visitors</Label>
                    </div>
                    <Switch id="show-expiry" checked={showExpiryToVisitors} onCheckedChange={setShowExpiryToVisitors} />
                  </div>
                )}
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={selectedProducts.size === 0 || isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate QR Code ({selectedProducts.size} products)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right Panel: Customization / Location Map */}
        {showRightPanel && (
          <div className="space-y-6">
            {enableCustomization && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">QR Customization</CardTitle>
                </CardHeader>
                <CardContent>
                  <QRCustomizationPanel
                    value={qrStyle}
                    onChange={setQrStyle}
                    savedStyles={styles}
                    onSaveStyle={handleSaveStyle}
                    onLoadStyle={handleLoadStyle}
                  />
                </CardContent>
              </Card>
            )}

            {enableLocationLock && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Location Lock</CardTitle>
                </CardHeader>
                <CardContent>
                  <LocationPicker
                    enabled={enableLocationLock}
                    onEnabledChange={setEnableLocationLock}
                    location={locationData}
                    onLocationChange={setLocationData}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
