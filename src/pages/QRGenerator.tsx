import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QrCode, Download, Copy, ArrowLeft, Check, ExternalLink, Share2, Lock, Eye, EyeOff, Clock, Calendar, Palette, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { hashPassword } from "@/lib/crypto";
import { format, addDays, addHours, addMinutes } from "date-fns";
import { CustomQRCode } from "@/components/qr/CustomQRCode";
import { QRCustomizationPanel } from "@/components/qr/QRCustomizationPanel";
import { QRShareButton } from "@/components/qr/QRShareButton";
import { LocationPicker, LocationData } from "@/components/qr/LocationPicker";
import { useQRStyles } from "@/hooks/useQRStyles";
import type { QRStyleConfig } from "@/lib/qr-styles";
import { defaultQRStyle, oceanPresetStyle } from "@/lib/qr-styles";

interface ItemWithCategory {
  id: string;
  title: string;
  type: string;
  content: string;
  category_name: string;
}

const QRGenerator = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { styles: savedStyles, saveStyle, defaultStyle, getStyleById } = useQRStyles();
  
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ItemWithCategory[]>([]);
  const [qrPageId, setQrPageId] = useState<string | null>(null);
  const [qrTitle, setQrTitle] = useState("");
  
  // QR Style
  const [qrStyle, setQrStyle] = useState<QRStyleConfig>(defaultQRStyle);
  const [enableCustomization, setEnableCustomization] = useState(false);
  // Store the final style at generation time to prevent changes
  const [generatedStyle, setGeneratedStyle] = useState<QRStyleConfig | null>(null);
  
  // Password protection
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Expiration settings
  const [enableExpiration, setEnableExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(0);
  const [expirationHours, setExpirationHours] = useState(1);
  const [expirationMinutes, setExpirationMinutes] = useState(0);

  // Location lock settings
  const [enableLocationLock, setEnableLocationLock] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  // Load Ocean preset when customization is enabled (default style takes priority)
  useEffect(() => {
    if (enableCustomization) {
      if (defaultStyle) {
        setQrStyle(defaultStyle);
      } else {
        // Default to Ocean preset when customization is enabled
        setQrStyle(oceanPresetStyle);
      }
    } else {
      setQrStyle(defaultQRStyle);
    }
  }, [defaultStyle, enableCustomization]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !authLoading) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch selected items
  useEffect(() => {
    const itemIds = searchParams.get("items")?.split(",") || [];
    if (itemIds.length > 0 && user) {
      fetchItems(itemIds);
    } else {
      setIsLoading(false);
    }
  }, [searchParams, user]);

  const fetchItems = async (itemIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select(`
          id,
          title,
          type,
          content,
          categories (name)
        `)
        .in("id", itemIds);

      if (error) throw error;

      const itemsWithCategory = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        content: item.content,
        category_name: item.categories?.name || "Unknown",
      }));

      setSelectedItems(itemsWithCategory);
    } catch (error) {
      toast.error("Failed to load items");
    } finally {
      setIsLoading(false);
    }
  };

  const generatePublicId = () => {
    return Math.random().toString(36).substring(2, 10);
  };

  const calculateExpirationDate = () => {
    if (!enableExpiration) return null;
    
    let expirationDate = new Date();
    expirationDate = addDays(expirationDate, expirationDays);
    expirationDate = addHours(expirationDate, expirationHours);
    expirationDate = addMinutes(expirationDate, expirationMinutes);
    
    return expirationDate.toISOString();
  };

  const handleSaveQR = async () => {
    if (!user || selectedItems.length === 0) return;

    if (enablePassword && !password.trim()) {
      toast.error("Please enter a password");
      return;
    }

    if (enableExpiration && expirationDays === 0 && expirationHours === 0 && expirationMinutes === 0) {
      toast.error("Please set an expiration time");
      return;
    }

    if (enableLocationLock && !locationData) {
      toast.error("Please select a location for location-based access");
      return;
    }

    setIsSaving(true);
    try {
      const publicId = generatePublicId();

      // Hash password if enabled using client-side hashing
      let passwordHash = null;
      if (enablePassword && password.trim()) {
        passwordHash = hashPassword(password.trim());
      }

      // Calculate expiration date
      const expiresAt = calculateExpirationDate();

      // Create QR page with style config (only if customization enabled)
      const { data: qrPage, error: qrError } = await supabase
        .from("qr_pages")
        .insert({
          user_id: user.id,
          public_id: publicId,
          title: qrTitle || `QR ${new Date().toLocaleDateString()}`,
          password_hash: passwordHash,
          expires_at: expiresAt,
          style_config: enableCustomization ? (qrStyle as any) : null,
          location_locked: enableLocationLock,
          location_lat: locationData?.lat || null,
          location_lng: locationData?.lng || null,
          location_name: locationData?.name || null,
        })
        .select()
        .single();

      if (qrError) throw qrError;

      // Add items to QR page
      const qrPageItems = selectedItems.map((item, index) => ({
        qr_page_id: qrPage.id,
        item_id: item.id,
        display_order: index,
      }));

      const { error: itemsError } = await supabase.from("qr_page_items").insert(qrPageItems);

      if (itemsError) throw itemsError;

      setQrPageId(publicId);
      // Lock in the style used at generation time
      setGeneratedStyle(enableCustomization ? qrStyle : defaultQRStyle);
      toast.success("QR code saved successfully!");
    } catch (error: any) {
      toast.error("Failed to save QR code");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const publicUrl = qrPageId 
    ? `${window.location.origin}/p/${qrPageId}` 
    : "";
  
  const handleDownloadQR = () => {
    if (!qrPageId) {
      toast.error("Please save the QR code first");
      return;
    }
    
    const canvas = document.querySelector("#qr-code-canvas") as HTMLCanvasElement;
    if (canvas) {
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
      
      const pngFile = downloadCanvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `connecthub-qr-${qrPageId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success("QR code downloaded!");
    }
  };

  const handleCopyUrl = () => {
    if (!qrPageId) {
      toast.error("Please save the QR code first");
      return;
    }
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveStyle = async (name: string) => {
    await saveStyle(name, qrStyle);
  };

  const handleLoadStyle = (id: string) => {
    const style = getStyleById(id);
    if (style) {
      setQrStyle(style.config);
      toast.success(`Style "${style.name}" loaded!`);
    }
  };

  // Group items by category
  const groupedItems = selectedItems.reduce((acc, item) => {
    if (!acc[item.category_name]) {
      acc[item.category_name] = [];
    }
    acc[item.category_name].push(item);
    return acc;
  }, {} as Record<string, ItemWithCategory[]>);

  const getExpirationPreview = () => {
    if (!enableExpiration) return null;
    const date = calculateExpirationDate();
    if (!date) return null;
    return format(new Date(date), "PPp");
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
        <Card className="max-w-md text-center p-8">
          <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">No items selected</h2>
          <p className="text-muted-foreground mb-6">
            Go back to your dashboard and select items to generate a QR code.
          </p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </Card>
      </div>
    );
  }

  // Preview URL for customization (before saving)
  const previewUrl = "https://example.com/preview";

  return (
    <div className="min-h-screen bg-gradient-hero px-2 py-3 sm:p-6 md:p-12 pb-24 sm:pb-12">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-8"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="h-10 w-10 sm:min-h-[44px] sm:min-w-[44px] flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground leading-tight">Generate QR Code</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Share your content with a single scan</p>
          </div>
        </motion.div>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* QR Code Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <Card className="overflow-hidden">
              <CardHeader className="text-center py-2 sm:py-4">
                <CardTitle className="text-sm sm:text-lg">Your QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-2 sm:gap-4 pb-3 sm:pb-6 px-2 sm:px-6">
                {/* QR Preview - Compact for mobile */}
                <div 
                  className="p-2 sm:p-4 rounded-xl shadow-elevated w-[140px] sm:w-[200px] aspect-square flex items-center justify-center mx-auto"
                  style={{ backgroundColor: qrPageId && generatedStyle ? generatedStyle.backgroundColor : (enableCustomization ? qrStyle.backgroundColor : '#ffffff') }}
                >
                  <CustomQRCode
                    id="qr-code-canvas"
                    value={qrPageId ? publicUrl : previewUrl}
                    style={qrPageId && generatedStyle ? generatedStyle : (enableCustomization ? qrStyle : defaultQRStyle)}
                    className="w-full h-full"
                  />
                </div>

                {!qrPageId && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    {enableCustomization ? 'Live preview' : 'Standard QR'}
                  </p>
                )}

                {!qrPageId && (
                  <div className="w-full space-y-2 sm:space-y-4">
                    {/* Customize QR Code Toggle */}
                    <div className="flex items-center space-x-2 p-2 sm:p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <Checkbox
                        id="enableCustomization"
                        checked={enableCustomization}
                        onCheckedChange={(checked) => setEnableCustomization(checked as boolean)}
                        className="h-4 w-4 sm:min-h-[20px] sm:min-w-[20px]"
                      />
                      <Label htmlFor="enableCustomization" className="flex items-center gap-1.5 sm:gap-2 cursor-pointer font-medium text-xs sm:text-sm">
                        <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                        <span>Customize QR</span>
                      </Label>
                    </div>

                    <Input
                      placeholder="QR Code title (optional)"
                      value={qrTitle}
                      onChange={(e) => setQrTitle(e.target.value)}
                      className="h-10 sm:min-h-[44px] text-xs sm:text-sm"
                    />
                    
                    {/* Password Protection Option */}
                    <div className="space-y-2 p-2 sm:p-4 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="enablePassword"
                          checked={enablePassword}
                          onCheckedChange={(checked) => setEnablePassword(checked as boolean)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="enablePassword" className="flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm">
                          <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                          <span>Password</span>
                        </Label>
                      </div>
                      
                      {enablePassword && (
                        <div className="relative mt-1.5">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-10 h-10 text-xs sm:text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-2 sm:px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Expiration Option */}
                    <div className="space-y-2 p-2 sm:p-4 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="enableExpiration"
                          checked={enableExpiration}
                          onCheckedChange={(checked) => setEnableExpiration(checked as boolean)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="enableExpiration" className="flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                          <span>Expiration</span>
                        </Label>
                      </div>
                      
                      {enableExpiration && (
                        <div className="space-y-1.5 mt-1.5">
                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="space-y-0.5">
                              <Label className="text-[9px] sm:text-xs text-muted-foreground">Days</Label>
                              <Input
                                type="number"
                                min="0"
                                max="365"
                                value={expirationDays}
                                onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                                className="text-center h-9 text-xs px-1"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-[9px] sm:text-xs text-muted-foreground">Hours</Label>
                              <Input
                                type="number"
                                min="0"
                                max="23"
                                value={expirationHours}
                                onChange={(e) => setExpirationHours(parseInt(e.target.value) || 0)}
                                className="text-center h-9 text-xs px-1"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-[9px] sm:text-xs text-muted-foreground">Mins</Label>
                              <Input
                                type="number"
                                min="0"
                                max="59"
                                value={expirationMinutes}
                                onChange={(e) => setExpirationMinutes(parseInt(e.target.value) || 0)}
                                className="text-center h-9 text-xs px-1"
                              />
                            </div>
                          </div>
                          {getExpirationPreview() && (
                            <p className="text-[9px] sm:text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Expires: {getExpirationPreview()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Location Lock Option */}
                    <LocationPicker
                      enabled={enableLocationLock}
                      onEnabledChange={setEnableLocationLock}
                      location={locationData}
                      onLocationChange={setLocationData}
                    />
                    
                    <Button onClick={handleSaveQR} className="w-full h-11 sm:min-h-[48px] text-sm" disabled={isSaving}>
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 mr-2" />
                          Generate QR
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {qrPageId && (
                  <div className="w-full space-y-2 sm:space-y-3">
                    {enablePassword && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-primary text-xs sm:text-sm">
                        <Lock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>Password protected</span>
                      </div>
                    )}
                    {enableExpiration && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-600 text-xs sm:text-sm">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">Expires: {getExpirationPreview()}</span>
                      </div>
                    )}
                    {enableLocationLock && locationData && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 text-blue-600 text-xs sm:text-sm">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>Location locked</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-secondary/50 border border-border">
                      <input
                        type="text"
                        value={publicUrl}
                        readOnly
                        className="flex-1 bg-transparent text-xs sm:text-sm text-foreground outline-none min-w-0"
                      />
                      <Button variant="ghost" size="sm" onClick={handleCopyUrl} className="min-h-[36px] min-w-[36px] p-1 flex-shrink-0">
                        {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDownloadQR()} className="min-h-[40px] text-xs px-2">
                        <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span>Download</span>
                      </Button>
                      <QRShareButton
                        qrCanvasId="qr-code-canvas"
                        title={qrTitle || "QR Code"}
                        url={publicUrl}
                        className="min-h-[40px]"
                      />
                    </div>
                    
                    <Button
                      variant="default"
                      className="w-full min-h-[44px] text-sm"
                      onClick={() => window.open(publicUrl, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Preview Page
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Customization Panel - only show if enabled AND before QR generation */}
          {enableCustomization && !qrPageId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-1"
            >
              <QRCustomizationPanel
                value={qrStyle}
                onChange={setQrStyle}
                onSaveStyle={handleSaveStyle}
                savedStyles={savedStyles.map(s => ({ id: s.id, name: s.name, config: s.config }))}
                onLoadStyle={handleLoadStyle}
              />
            </motion.div>
          )}

          {/* Selected Items Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-primary" />
                  Shared Content ({selectedItems.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                {Object.entries(groupedItems).map(([categoryName, items]) => (
                  <div key={categoryName} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">{categoryName}</h4>
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30"
                        >
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <QrCode className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                          </div>
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-secondary text-muted-foreground uppercase">
                            {item.type}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;
