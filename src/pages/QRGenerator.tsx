import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QrCode, Download, Copy, ArrowLeft, Check, ExternalLink, Share2, Lock, Eye, EyeOff, Clock, Calendar, Palette, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { hashPassword } from "@/lib/crypto";
import { format, addDays, addHours, addMinutes } from "date-fns";
import { CustomQRCode } from "@/components/qr/CustomQRCode";
import { QRCustomizationPanel } from "@/components/qr/QRCustomizationPanel";
import { useQRStyles } from "@/hooks/useQRStyles";
import type { QRStyleConfig } from "@/lib/qr-styles";
import { defaultQRStyle } from "@/lib/qr-styles";

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
  
  // Password protection
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Expiration settings
  const [enableExpiration, setEnableExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(0);
  const [expirationHours, setExpirationHours] = useState(1);
  const [expirationMinutes, setExpirationMinutes] = useState(0);

  // Load default style when customization is enabled and default style exists
  useEffect(() => {
    if (enableCustomization && defaultStyle) {
      setQrStyle(defaultStyle);
    } else if (!enableCustomization) {
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
  
  const handleDownloadQR = (highRes: boolean = false) => {
    if (!qrPageId) {
      toast.error("Please save the QR code first");
      return;
    }
    
    const canvas = document.querySelector("#qr-code-canvas") as HTMLCanvasElement;
    if (canvas) {
      let downloadCanvas = canvas;
      
      if (highRes) {
        // Create high-res version
        downloadCanvas = document.createElement("canvas");
        const scale = 4;
        downloadCanvas.width = canvas.width * scale;
        downloadCanvas.height = canvas.height * scale;
        const ctx = downloadCanvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.scale(scale, scale);
          ctx.drawImage(canvas, 0, 0);
        }
      }
      
      const pngFile = downloadCanvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `connecthub-qr-${qrPageId}${highRes ? '-hires' : ''}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success(highRes ? "High-res QR code downloaded!" : "QR code downloaded!");
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
    <div className="min-h-screen bg-gradient-hero p-6 md:p-12">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Generate QR Code</h1>
            <p className="text-muted-foreground">Share your selected content with a single scan</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* QR Code Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <Card className="overflow-hidden">
              <CardHeader className="text-center">
                <CardTitle>Your QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 sm:gap-6 pb-6 sm:pb-8">
                {/* QR Preview */}
                <div 
                  className="p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-elevated"
                  style={{ backgroundColor: enableCustomization ? qrStyle.backgroundColor : '#ffffff' }}
                >
                  {enableCustomization ? (
                    <CustomQRCode
                      id="qr-code-canvas"
                      value={qrPageId ? publicUrl : previewUrl}
                      style={qrStyle}
                      className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px]"
                    />
                  ) : (
                    <CustomQRCode
                      id="qr-code-canvas"
                      value={qrPageId ? publicUrl : previewUrl}
                      style={defaultQRStyle}
                      className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px]"
                    />
                  )}
                </div>

                {!qrPageId && (
                  <p className="text-xs text-muted-foreground text-center">
                    {enableCustomization ? 'Live preview - customize below' : 'Standard QR code'}
                  </p>
                )}

                {!qrPageId && (
                  <div className="w-full space-y-4">
                    {/* Customize QR Code Toggle */}
                    <div className="flex items-center space-x-2 p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <Checkbox
                        id="enableCustomization"
                        checked={enableCustomization}
                        onCheckedChange={(checked) => setEnableCustomization(checked as boolean)}
                      />
                      <Label htmlFor="enableCustomization" className="flex items-center gap-2 cursor-pointer font-medium">
                        <Palette className="w-4 h-4 text-primary" />
                        Customize QR Code Design
                      </Label>
                    </div>

                    <Input
                      placeholder="QR Code title (optional)"
                      value={qrTitle}
                      onChange={(e) => setQrTitle(e.target.value)}
                    />
                    
                    {/* Password Protection Option */}
                    <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="enablePassword"
                          checked={enablePassword}
                          onCheckedChange={(checked) => setEnablePassword(checked as boolean)}
                        />
                        <Label htmlFor="enablePassword" className="flex items-center gap-2 cursor-pointer">
                          <Lock className="w-4 h-4 text-primary" />
                          Password protect this QR code
                        </Label>
                      </div>
                      
                      {enablePassword && (
                        <div className="relative mt-2">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Expiration Option */}
                    <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="enableExpiration"
                          checked={enableExpiration}
                          onCheckedChange={(checked) => setEnableExpiration(checked as boolean)}
                        />
                        <Label htmlFor="enableExpiration" className="flex items-center gap-2 cursor-pointer">
                          <Clock className="w-4 h-4 text-primary" />
                          Set expiration time
                        </Label>
                      </div>
                      
                      {enableExpiration && (
                        <div className="space-y-3 mt-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Days</Label>
                              <Input
                                type="number"
                                min="0"
                                max="365"
                                value={expirationDays}
                                onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                                className="text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Hours</Label>
                              <Input
                                type="number"
                                min="0"
                                max="23"
                                value={expirationHours}
                                onChange={(e) => setExpirationHours(parseInt(e.target.value) || 0)}
                                className="text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Minutes</Label>
                              <Input
                                type="number"
                                min="0"
                                max="59"
                                value={expirationMinutes}
                                onChange={(e) => setExpirationMinutes(parseInt(e.target.value) || 0)}
                                className="text-center"
                              />
                            </div>
                          </div>
                          {getExpirationPreview() && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Expires: {getExpirationPreview()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button onClick={handleSaveQR} className="w-full" disabled={isSaving}>
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 mr-2" />
                          Generate QR Code
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {qrPageId && (
                  <div className="w-full space-y-3">
                    {enablePassword && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-primary text-sm">
                        <Lock className="w-4 h-4" />
                        This QR code is password protected
                      </div>
                    )}
                    {enableExpiration && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-600 text-sm">
                        <Clock className="w-4 h-4" />
                        Expires: {getExpirationPreview()}
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                      <input
                        type="text"
                        value={publicUrl}
                        readOnly
                        className="flex-1 bg-transparent text-sm text-foreground outline-none"
                      />
                      <Button variant="ghost" size="sm" onClick={handleCopyUrl}>
                        {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDownloadQR(false)}>
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadQR(true)}>
                        <Download className="w-4 h-4 mr-1" />
                        Hi-Res
                      </Button>
                    </div>
                    
                    <Button
                      variant="default"
                      className="w-full"
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

          {/* Customization Panel - only show if enabled */}
          {enableCustomization && (
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
