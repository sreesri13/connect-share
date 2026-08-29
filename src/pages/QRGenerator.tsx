import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  QrCode,
  Download,
  Copy,
  ArrowLeft,
  Check,
  ExternalLink,
  Share2,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Calendar,
  Palette,
  MapPin,
  Users,
  Star,
  Shield,
  Layers,
  Sparkles,
  ScanLine,
  Smartphone,
  Info,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  CheckCircle,
  PlusCircle,
  Save,
  CheckSquare,
  Square as SquareIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { setQRPassword } from "@/lib/crypto";
import { format, addDays, addHours, addMinutes } from "date-fns";
import { CustomQRCode, renderHighResQRCanvas } from "@/components/qr/CustomQRCode";
import { QRCustomizationPanel } from "@/components/qr/QRCustomizationPanel";
import { QRShareButton } from "@/components/qr/QRShareButton";
import { LocationPicker, LocationData } from "@/components/qr/LocationPicker";
import { ScanLimitInput, ScanLimitType } from "@/components/qr/ScanLimitInput";
import { useQRStyles } from "@/hooks/useQRStyles";
import type { QRStyleConfig } from "@/lib/qr-styles";
import { defaultQRStyle, oceanPresetStyle, presetThemes, evaluateQRScannability } from "@/lib/qr-styles";
import { PlatformIcon } from "@/lib/platform-icons";
import { saveOrDownloadQRCode } from "@/lib/download-utils";


interface ItemWithCategory {
  id: string;
  title: string;
  type: string;
  content: string;
  category_name: string;
  isSelected?: boolean;
}

const QRGenerator = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { styles: savedStyles, saveStyle, defaultStyle, getStyleById } = useQRStyles();
  
  const [activeTab, setActiveTab] = useState<string>("style");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ItemWithCategory[]>([]);
  const [allItems, setAllItems] = useState<ItemWithCategory[]>([]);
  const [qrPageId, setQrPageId] = useState<string | null>(null);
  const [qrPageDbId, setQrPageDbId] = useState<string | null>(null);
  const [qrTitle, setQrTitle] = useState("");
  
  // QR Style
  const [qrStyle, setQrStyle] = useState<QRStyleConfig>(defaultQRStyle);
  const [enableCustomization, setEnableCustomization] = useState(false);
  const [generatedStyle, setGeneratedStyle] = useState<QRStyleConfig | null>(null);
  const [showFullCustomizer, setShowFullCustomizer] = useState(false);
  
  // Password protection
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Expiration settings
  const [enableExpiration, setEnableExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(0);
  const [expirationHours, setExpirationHours] = useState(1);
  const [expirationMinutes, setExpirationMinutes] = useState(0);
  const [showExpiryToVisitors, setShowExpiryToVisitors] = useState(false);

  // Location lock settings
  const [enableLocationLock, setEnableLocationLock] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  // Star item (direct redirect on scan)
  const [starredItemId, setStarredItemId] = useState<string | null>(null);

  // Scan limit settings
  const [scanLimitType, setScanLimitType] = useState<ScanLimitType>('unlimited');
  const [maxScans, setMaxScans] = useState(100);
  const [dailyLimit, setDailyLimit] = useState(50);

  // Branding toggles
  const [showInstallPopup, setShowInstallPopup] = useState(true);
  const [showFooterBranding, setShowFooterBranding] = useState(true);

  // Real-time scannability evaluation
  const activeStyleConfig = qrPageId && generatedStyle ? generatedStyle : (enableCustomization ? qrStyle : defaultQRStyle);
  const scannability = evaluateQRScannability(
    activeStyleConfig.bodyColor,
    activeStyleConfig.eyeFrameColor,
    activeStyleConfig.eyeBallColor,
    activeStyleConfig.backgroundColor || '#ffffff'
  );

  // Load default or Ocean preset initially
  useEffect(() => {
    if (enableCustomization) {
      if (defaultStyle) {
        setQrStyle({ ...defaultStyle, backgroundColor: '#ffffff' });
      } else {
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

  // Fetch items (either specified in query params or all user's items)
  useEffect(() => {
    if (user) {
      const itemIds = searchParams.get("items")?.split(",").filter(Boolean) || [];
      fetchItems(itemIds);
    }
  }, [searchParams, user]);

  const fetchItems = async (itemIds: string[]) => {
    try {
      if (!user) return;
      const { data, error } = await supabase
        .from("items")
        .select(`
          id,
          title,
          type,
          content,
          categories (name)
        `)
        .eq("user_id", user.id)
        .order("display_order", { ascending: true });

      if (error) throw error;

      const formattedItems: ItemWithCategory[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        content: item.content,
        category_name: item.categories?.name || "General",
        isSelected: itemIds.length > 0 ? itemIds.includes(item.id) : true,
      }));

      setAllItems(formattedItems);
      
      const filtered = itemIds.length > 0 
        ? formattedItems.filter(i => itemIds.includes(i.id))
        : formattedItems;

      setSelectedItems(filtered);
    } catch (error) {
      console.error("Error loading items:", error);
      toast.error("Failed to load your content items");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (item: ItemWithCategory) => {
    setSelectedItems(prev => {
      const exists = prev.some(i => i.id === item.id);
      if (exists) {
        if (starredItemId === item.id) {
          setStarredItemId(null);
        }
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const generatePublicId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
    if (!user) {
      toast.error("You must be logged in to create a QR code");
      navigate("/auth");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("Please select at least 1 item in the Content tab to include in your QR code");
      setActiveTab("content");
      return;
    }

    if (enablePassword && !password.trim()) {
      setActiveTab("security");
      toast.error("Please enter a password in the Security tab");
      return;
    }

    if (enableExpiration && expirationDays === 0 && expirationHours === 0 && expirationMinutes === 0) {
      setActiveTab("security");
      toast.error("Please set an expiration duration in the Security tab");
      return;
    }

    if (enableLocationLock && !locationData) {
      setActiveTab("security");
      toast.error("Please pick a location on the map in the Security tab");
      return;
    }

    setIsSaving(true);
    try {
      const publicId = generatePublicId();
      const wantsPassword = enablePassword && !!password.trim();
      const expiresAt = calculateExpirationDate();

      const finalStyleConfig: QRStyleConfig = enableCustomization 
        ? {
            ...qrStyle,
            backgroundColor: qrStyle.backgroundColor || '#ffffff',
            errorCorrectionLevel: qrStyle.logoUrl ? 'H' : (qrStyle.errorCorrectionLevel || 'H'),
          } 
        : defaultQRStyle;

      const validStarredId = (starredItemId && selectedItems.some(i => i.id === starredItemId))
        ? starredItemId
        : null;

      const { data: qrPage, error: qrError } = await supabase
        .from("qr_pages")
        .insert({
          user_id: user.id,
          public_id: publicId,
          title: (qrTitle && qrTitle.trim()) || `QR Code (${new Date().toLocaleDateString()})`,
          expires_at: expiresAt,
          show_expires_at: Boolean(enableExpiration && showExpiryToVisitors),
          style_config: enableCustomization ? (finalStyleConfig as any) : null,
          location_locked: Boolean(enableLocationLock && locationData),
          location_lat: enableLocationLock && locationData ? Number(locationData.lat) : null,
          location_lng: enableLocationLock && locationData ? Number(locationData.lng) : null,
          location_name: enableLocationLock && locationData ? String(locationData.name) : null,
          starred_item_id: validStarredId,
          scan_limit_type: scanLimitType || 'unlimited',
          max_scans: scanLimitType === 'total' ? Number(maxScans) : null,
          daily_limit: scanLimitType === 'daily' ? Number(dailyLimit) : null,
          show_install_popup: Boolean(showInstallPopup),
          show_footer_branding: Boolean(showFooterBranding),
          is_deleted: false,
          public_view: true,
          allow_requests: false,
        } as any)
        .select()
        .single();

      if (qrError) throw new Error(qrError.message || "Database insert failed");

      if (!qrPage?.id) throw new Error("No QR Page ID returned by server");

      if (wantsPassword) {
        await setQRPassword("profile", qrPage.id, password.trim());
      }

      if (selectedItems.length > 0) {
        const qrPageItems = selectedItems.map((item, index) => ({
          qr_page_id: qrPage.id,
          item_id: item.id,
          display_order: index,
        }));

        const { error: itemsError } = await supabase.from("qr_page_items").insert(qrPageItems);
        if (itemsError) {
          console.error("Items insert error:", itemsError);
        }
      }

      setQrPageId(publicId);
      setQrPageDbId(qrPage.id);
      setGeneratedStyle(finalStyleConfig);
      toast.success("QR code generated and saved successfully!");
    } catch (error: any) {
      console.error("Detailed QR Save Error:", error);
      const msg = error?.message || error?.error_description || "Database error";
      toast.error(`Failed to save QR code: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLiveQR = async () => {
    if (!qrPageDbId || !user) return;

    if (enablePassword && !password.trim()) {
      setActiveTab("security");
      toast.error("Please enter a password in the Security tab");
      return;
    }

    setIsUpdating(true);
    try {
      const expiresAt = calculateExpirationDate();
      const finalStyleConfig = enableCustomization 
        ? {
            ...qrStyle,
            backgroundColor: qrStyle.backgroundColor || '#ffffff',
            errorCorrectionLevel: qrStyle.logoUrl ? 'H' : (qrStyle.errorCorrectionLevel || 'H'),
          } 
        : defaultQRStyle;

      const validStarredId = (starredItemId && selectedItems.some(i => i.id === starredItemId))
        ? starredItemId
        : null;

      const { error: updateError } = await supabase
        .from("qr_pages")
        .update({
          title: (qrTitle && qrTitle.trim()) || `QR Code (${new Date().toLocaleDateString()})`,
          expires_at: expiresAt,
          show_expires_at: Boolean(enableExpiration && showExpiryToVisitors),
          style_config: enableCustomization ? (finalStyleConfig as any) : null,
          location_locked: Boolean(enableLocationLock && locationData),
          location_lat: enableLocationLock && locationData ? Number(locationData.lat) : null,
          location_lng: enableLocationLock && locationData ? Number(locationData.lng) : null,
          location_name: enableLocationLock && locationData ? String(locationData.name) : null,
          starred_item_id: validStarredId,
          scan_limit_type: scanLimitType || 'unlimited',
          max_scans: scanLimitType === 'total' ? Number(maxScans) : null,
          daily_limit: scanLimitType === 'daily' ? Number(dailyLimit) : null,
          show_install_popup: Boolean(showInstallPopup),
          show_footer_branding: Boolean(showFooterBranding),
        } as any)
        .eq("id", qrPageDbId);

      if (updateError) throw updateError;

      if (enablePassword) {
        if (password.trim()) {
          await setQRPassword("profile", qrPageDbId, password.trim());
        }
      } else {
        await setQRPassword("profile", qrPageDbId, null);
      }

      setGeneratedStyle(finalStyleConfig);
      toast.success("QR code settings updated live!");
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(`Update failed: ${error?.message || 'Database error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const publicUrl = qrPageId 
    ? `${window.location.origin}/p/${qrPageId}` 
    : "";
  
  const handleDownloadQR = async () => {
    const urlToEncode = qrPageId ? publicUrl : (publicUrl || "https://connecthub.app/preview");
    const styleToUse = qrPageId && generatedStyle 
      ? generatedStyle 
      : (enableCustomization ? qrStyle : defaultQRStyle);

    setIsDownloading(true);
    try {
      const highResCanvas = await renderHighResQRCanvas(urlToEncode, styleToUse, 2048);
      const filename = qrPageId 
        ? `connecthub-qr-${qrPageId}-hd.png` 
        : `connecthub-qr-${qrTitle ? qrTitle.toLowerCase().replace(/\s+/g, '-') : 'preview'}-hd.png`;
      await saveOrDownloadQRCode(highResCanvas, filename);
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to generate high-resolution QR image");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyUrl = () => {
    if (!qrPageId) {
      toast.error("Please generate the QR code first");
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
      setQrStyle({ ...style.config, backgroundColor: '#ffffff' });
      toast.success(`Style "${style.name}" loaded!`);
    }
  };

  // Group items by category
  const groupedItems = allItems.reduce((acc, item) => {
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

  const activeSecurityCount = [
    enablePassword,
    enableExpiration,
    enableLocationLock,
    scanLimitType !== 'unlimited',
    !showInstallPopup,
    !showFooterBranding
  ].filter(Boolean).length;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const previewUrl = "https://connecthub.app/preview";

  return (
    <div className="min-h-screen bg-gradient-hero px-3 sm:px-6 lg:px-8 py-3 sm:py-6 pb-32 lg:pb-12 text-foreground">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[140px] animate-pulse-glow" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-4 sm:space-y-6">
        {/* Header Bar */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-secondary/80 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-bold leading-tight">
                  {qrPageId ? "QR Code Active" : "Generate QR Code"}
                </h1>
                <Badge variant="secondary" className="text-[10px] sm:text-xs px-2 py-0.5 font-medium bg-primary/15 text-primary border-primary/20">
                  {selectedItems.length} selected
                </Badge>
              </div>
              <p className="text-[11px] sm:text-sm text-muted-foreground">
                {qrPageId 
                  ? "Your QR code is live. All active rules, style, and content are shown below and can be edited anytime."
                  : "Customize appearance, scannability, security rules, and direct actions before sharing"}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="text-xs">
              Dashboard
            </Button>

            {qrPageId ? (
              <Button
                size="sm"
                onClick={handleUpdateLiveQR}
                disabled={isUpdating}
                className="text-xs font-semibold shadow-glow bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isUpdating ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Save & Sync Updates
                  </>
                )}
              </Button>
            ) : (
              <Button size="sm" onClick={handleSaveQR} disabled={isSaving} className="text-xs font-semibold shadow-glow">
                {isSaving ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Generating...
                  </span>
                ) : (
                  <>
                    <QrCode className="w-3.5 h-3.5 mr-1.5" />
                    Generate QR Code
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Main 2-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-5 sm:gap-6">
          
          {/* ============================================================ */}
          {/* LEFT COLUMN: Sticky Live QR Preview & Actions Card           */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full lg:w-[380px] xl:w-[410px] lg:sticky lg:top-6 flex-shrink-0 space-y-4"
          >
            <Card className="border-border/60 bg-card/85 backdrop-blur-md shadow-elevated overflow-hidden">
              <CardHeader className="p-3.5 sm:p-5 pb-3 border-b border-border/40 bg-secondary/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-primary" />
                    {qrPageId ? "Generated QR Code" : "Live QR Preview"}
                  </CardTitle>
                  <CardDescription className="text-[11px] sm:text-xs">
                    {qrPageId ? "Your QR is ready for sharing" : "Updates dynamically with your settings"}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 ${
                    qrPageId 
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold" 
                      : scannability.status === 'poor'
                        ? "bg-destructive/15 text-destructive border-destructive/30"
                        : "bg-primary/15 text-primary border-primary/30"
                  }`}
                >
                  {qrPageId 
                    ? "✓ Live & Active" 
                    : scannability.status === 'poor' 
                      ? "Low Contrast" 
                      : enableCustomization 
                        ? "Custom Style" 
                        : "Standard"}
                </Badge>
              </CardHeader>

              <CardContent className="p-3.5 sm:p-6 space-y-3.5 sm:space-y-4">
                {/* QR Canvas Container with solid background */}
                <div className="relative group">
                  <div
                    className="p-3.5 sm:p-5 rounded-2xl shadow-elevated w-[180px] sm:w-[220px] aspect-square flex items-center justify-center mx-auto transition-all duration-300 border border-border/40"
                    style={{
                      backgroundColor: qrPageId && generatedStyle 
                        ? (generatedStyle.backgroundColor || '#ffffff')
                        : (enableCustomization ? (qrStyle.backgroundColor || '#ffffff') : '#ffffff')
                    }}
                  >
                    <CustomQRCode
                      id="qr-code-canvas"
                      value={qrPageId ? publicUrl : previewUrl}
                      style={qrPageId && generatedStyle ? generatedStyle : (enableCustomization ? qrStyle : defaultQRStyle)}
                      className="w-full h-full"
                    />
                  </div>
                  
                  {/* Scannability indicator */}
                  <div className="text-center mt-2 sm:mt-2.5">
                    {scannability.status === 'poor' ? (
                      <p className="text-[10px] sm:text-[11px] font-semibold text-destructive flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Contrast warning: May not scan on phones
                      </p>
                    ) : (
                      <p className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        100% Scannable (High Contrast)
                      </p>
                    )}
                  </div>
                </div>

                {/* QR Title Input */}
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="qr-title" className="text-xs font-medium text-muted-foreground">
                    QR Code Title / Label
                  </Label>
                  <Input
                    id="qr-title"
                    placeholder="e.g. My Portfolio & Socials"
                    value={qrTitle}
                    onChange={(e) => setQrTitle(e.target.value)}
                    className="h-9 sm:h-10 text-xs sm:text-sm bg-secondary/30"
                  />
                </div>

                {/* Primary Actions & Download Button */}
                {!qrPageId ? (
                  <div className="space-y-2 pt-1">
                    <Button
                      onClick={handleSaveQR}
                      className="w-full h-10 sm:h-11 text-xs sm:text-sm font-semibold shadow-glow"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Generating QR Code...
                        </span>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 mr-2" />
                          Generate QR Code ({selectedItems.length} items)
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadQR}
                      disabled={isDownloading}
                      className="w-full h-9 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5 text-primary" />
                      {isDownloading ? "Rendering HD PNG..." : "Download High-Res 2048px PNG"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5 sm:space-y-3 pt-1">
                    {/* Copy Link Field */}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border">
                      <input
                        type="text"
                        value={publicUrl}
                        readOnly
                        className="flex-1 bg-transparent text-xs text-foreground outline-none min-w-0 font-mono"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyUrl}
                        className="h-8 w-8 p-0 flex-shrink-0"
                        title="Copy Public Link"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* Action Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadQR}
                        disabled={isDownloading}
                        className="h-9 sm:h-10 text-xs font-medium border-primary/30 hover:border-primary text-primary"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        {isDownloading ? "Exporting..." : "Download PNG"}
                      </Button>
                      
                      <QRShareButton
                        qrCanvasId="qr-code-canvas"
                        title={qrTitle || "ConnectHUB QR Code"}
                        url={publicUrl}
                        className="h-9 sm:h-10 text-xs"
                      />
                    </div>

                    <Button
                      variant="default"
                      className="w-full h-9 sm:h-10 text-xs font-semibold"
                      onClick={() => window.open(publicUrl, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-1.5" />
                      Open Public Page
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUpdateLiveQR}
                      disabled={isUpdating}
                      className="w-full text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 font-medium h-9"
                    >
                      <Save className="w-3.5 h-3.5 mr-1" />
                      {isUpdating ? "Syncing..." : "Sync Any Settings Changes"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN:                                                */}
          {/* A) SETUP MODE (Before Generation): 3 Categories Tabs         */}
          {/* B) IMPLEMENTED MODE (After Generation): Active Summary & Live Controls */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex-1 min-w-0 space-y-4"
          >
            {/* ========================================================================= */}
            {/* SCENARIO B: AFTER GENERATION -> SHOW IMPLEMENTED SUMMARY & DIRECT EDITORS */}
            {/* ========================================================================= */}
            {qrPageId ? (
              <div className="space-y-4 sm:space-y-5">
                {/* 1. Implemented Style & Design */}
                <Card className="border-border/60 bg-card/85 backdrop-blur-md shadow-elevated">
                  <CardHeader className="p-3.5 sm:p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                        <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        1. Implemented Style
                      </CardTitle>
                      <CardDescription className="text-[11px] sm:text-xs">
                        Active visual themes, shapes, and scannability settings
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFullCustomizer(!showFullCustomizer)}
                      className="text-xs h-8 gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5 text-primary" />
                      {showFullCustomizer ? "Hide" : "Customize"}
                    </Button>
                  </CardHeader>

                  <CardContent className="p-3.5 sm:p-6 space-y-3.5 sm:space-y-4">
                    {/* Active Style Badges Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 sm:p-3 rounded-xl bg-secondary/30 border border-border/40">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-semibold">Body Shape</p>
                        <p className="text-xs font-bold capitalize mt-0.5 text-foreground">{qrStyle.bodyShape}</p>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl bg-secondary/30 border border-border/40">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-semibold">Eye Shapes</p>
                        <p className="text-xs font-bold capitalize mt-0.5 text-foreground">{qrStyle.eyeFrameShape} / {qrStyle.eyeBallShape}</p>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl bg-secondary/30 border border-border/40">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-semibold">Background</p>
                        <p className="text-xs font-bold mt-0.5 text-foreground">Solid White</p>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl bg-secondary/30 border border-border/40">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-semibold">Error Recovery</p>
                        <p className="text-xs font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">Level H (30%)</p>
                      </div>
                    </div>

                    {/* Quick Preset Selector for instant changes */}
                    <div className="space-y-2 pt-1 border-t border-border/40">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        Switch Color Theme:
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {presetThemes.slice(0, 4).map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              setQrStyle((prev) => ({
                                ...prev,
                                ...preset.config,
                                backgroundColor: '#ffffff',
                              }));
                              toast.success(`Theme updated to ${preset.name}! Click 'Save & Sync' to save.`);
                            }}
                            className="p-2 rounded-lg border border-border/50 bg-secondary/20 hover:border-primary/50 text-left flex items-center gap-2 transition-all"
                          >
                            <div
                              className="w-3.5 h-3.5 rounded-xs border border-border flex-shrink-0"
                              style={{ backgroundColor: preset.config.bodyColor }}
                            />
                            <span className="text-[11px] font-medium truncate">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Expanded Full Customizer Panel (if toggled) */}
                    <AnimatePresence>
                      {showFullCustomizer && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-3 border-t border-border/40"
                        >
                          <QRCustomizationPanel
                            value={qrStyle}
                            onChange={setQrStyle}
                            onSaveStyle={handleSaveStyle}
                            savedStyles={savedStyles.map(s => ({ id: s.id, name: s.name, config: s.config }))}
                            onLoadStyle={handleLoadStyle}
                            hideCardWrapper={true}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>

                {/* 2. Implemented Security & Rules */}
                <Card className="border-border/60 bg-card/85 backdrop-blur-md shadow-elevated">
                  <CardHeader className="p-3.5 sm:p-5 pb-3 border-b border-border/40">
                    <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      2. Implemented Security & Rules
                    </CardTitle>
                    <CardDescription className="text-[11px] sm:text-xs">
                      Active security protections and scan limits for this QR page
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-3.5 sm:p-6 space-y-3.5 sm:space-y-4">
                    {/* Password Protection Control */}
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-primary flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold">Password Protection</p>
                            <p className="text-[10px] text-muted-foreground">
                              {enablePassword ? "Passcode active" : "Public (No passcode)"}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={enablePassword}
                          onCheckedChange={setEnablePassword}
                        />
                      </div>

                      {enablePassword && (
                        <div className="pt-2 border-t border-border/30 flex items-center gap-2">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new passkey..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-8 text-xs bg-background flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Expiration Timer Control */}
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold">Expiration Timer</p>
                            <p className="text-[10px] text-muted-foreground">
                              {enableExpiration && getExpirationPreview() 
                                ? `Expires: ${getExpirationPreview()}` 
                                : "No expiration (Permanent access)"}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={enableExpiration}
                          onCheckedChange={setEnableExpiration}
                        />
                      </div>

                      {enableExpiration && (
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Days</Label>
                            <Input
                              type="number"
                              min="0"
                              max="365"
                              value={expirationDays}
                              onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                              className="text-center h-8 text-xs bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Hours</Label>
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              value={expirationHours}
                              onChange={(e) => setExpirationHours(parseInt(e.target.value) || 0)}
                              className="text-center h-8 text-xs bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Minutes</Label>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              value={expirationMinutes}
                              onChange={(e) => setExpirationMinutes(parseInt(e.target.value) || 0)}
                              className="text-center h-8 text-xs bg-background"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Scan Limits & Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 sm:p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <ScanLine className="w-3.5 h-3.5 text-primary" />
                          Scan Limit Policy
                        </div>
                        <p className="text-[11px] text-muted-foreground capitalize">
                          {scanLimitType === 'unlimited' ? 'Unlimited Scans' : `${scanLimitType} limit (${scanLimitType === 'total' ? maxScans : dailyLimit} scans)`}
                        </p>
                      </div>

                      <div className="p-2.5 sm:p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          Location Lock
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {enableLocationLock && locationData ? locationData.name : "Disabled (Global)"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Implemented Content List & Direct Open Star */}
                <Card className="border-border/60 bg-card/85 backdrop-blur-md shadow-elevated">
                  <CardHeader className="p-3.5 sm:p-5 pb-3 border-b border-border/40">
                    <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                      <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      3. Implemented Content ({selectedItems.length} items)
                    </CardTitle>
                    <CardDescription className="text-[11px] sm:text-xs">
                      Starred item opens automatically when visitors scan the QR code
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-3.5 sm:p-6 space-y-2.5 sm:space-y-3">
                    <ul className="space-y-2">
                      {selectedItems.map((item) => (
                        <li
                          key={item.id}
                          className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all ${
                            starredItemId === item.id 
                              ? "bg-amber-500/15 border-amber-500/40 shadow-sm" 
                              : "bg-secondary/30 border-border/40 hover:border-border"
                          }`}
                        >
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-background flex items-center justify-center flex-shrink-0 shadow-xs">
                            <PlatformIcon type={item.type} content={item.content} size="sm" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs sm:text-sm text-foreground truncate">
                              {item.title}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate font-mono">
                              {item.content}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const newStar = starredItemId === item.id ? null : item.id;
                              setStarredItemId(newStar);
                              toast.info(newStar ? `"${item.title}" will open directly on scan!` : "Direct open disabled.");
                            }}
                            className={`p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0 flex items-center gap-1 text-xs font-medium ${
                              starredItemId === item.id
                                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                            title="Toggle Direct Open on Scan"
                          >
                            <Star 
                              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                                starredItemId === item.id 
                                ? "text-amber-500 fill-amber-500" 
                                : "text-muted-foreground"
                              }`} 
                            />
                            <span className="hidden sm:inline">{starredItemId === item.id ? "Direct Open" : "Star"}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* ========================================================================= */
              /* SCENARIO A: BEFORE GENERATION -> SHOW 3 STEP SETUP CATEGORIES TABS        */
              /* ========================================================================= */
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Category Tab Selector */}
                <TabsList className="grid grid-cols-3 w-full h-11 sm:h-12 p-1 bg-secondary/50 backdrop-blur-md rounded-xl border border-border/50">
                  <TabsTrigger
                    value="style"
                    className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary px-1 sm:px-3"
                  >
                    <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">1. </span>
                    <span>Style</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="security"
                    className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary px-1 sm:px-3"
                  >
                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">2. </span>
                    <span>Security</span>
                    {activeSecurityCount > 0 && (
                      <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 bg-primary/20 text-primary">
                        {activeSecurityCount}
                      </Badge>
                    )}
                  </TabsTrigger>

                  <TabsTrigger
                    value="content"
                    className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary px-1 sm:px-3"
                  >
                    <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">3. </span>
                    <span>Content</span>
                    <span className="text-[10px] sm:text-[11px] opacity-80">({selectedItems.length})</span>
                    {starredItemId && (
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500 ml-0.5" />
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* -------------------------------------------------------- */}
                {/* TAB 1: Style & Design                                    */}
                {/* -------------------------------------------------------- */}
                <TabsContent value="style" className="space-y-4 mt-3 sm:mt-4">
                  <Card className="border-border/60 bg-card/85 backdrop-blur-md shadow-elevated">
                    <CardHeader className="p-3.5 sm:p-5 pb-3 border-b border-border/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            Style & Customization
                          </CardTitle>
                          <CardDescription className="text-[11px] sm:text-xs">
                            Personalize presets, patterns, eye shapes, colors, and logo
                          </CardDescription>
                        </div>
                        
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Label htmlFor="customization-toggle" className="text-xs cursor-pointer text-muted-foreground hidden sm:inline">
                            Custom Design
                          </Label>
                          <Switch
                            id="customization-toggle"
                            checked={enableCustomization}
                            onCheckedChange={setEnableCustomization}
                          />
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3.5 sm:p-6">
                      {enableCustomization ? (
                        <QRCustomizationPanel
                          value={qrStyle}
                          onChange={setQrStyle}
                          onSaveStyle={handleSaveStyle}
                          savedStyles={savedStyles.map(s => ({ id: s.id, name: s.name, config: s.config }))}
                          onLoadStyle={handleLoadStyle}
                          hideCardWrapper={true}
                        />
                      ) : (
                        <div className="py-6 sm:py-8 text-center space-y-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary/80 flex items-center justify-center mx-auto">
                            <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-semibold">Standard High-Contrast QR Code</h4>
                            <p className="text-[11px] sm:text-xs text-muted-foreground max-w-md mx-auto mt-1">
                              Using default solid black & white matrix for maximum compatibility across all scanner hardware.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEnableCustomization(true)}
                            className="text-xs mt-2"
                          >
                            <Palette className="w-3.5 h-3.5 mr-1.5 text-primary" />
                            Enable Custom Colors & Shapes
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* -------------------------------------------------------- */}
                {/* TAB 2: Security & Access Rules                           */}
                {/* -------------------------------------------------------- */}
                <TabsContent value="security" className="space-y-4 mt-3 sm:mt-4">
                  <Card className="border-border/60 bg-card/85 backdrop-blur-md shadow-elevated">
                    <CardHeader className="p-3.5 sm:p-5 pb-3 border-b border-border/40">
                      <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        Security & Access Controls
                      </CardTitle>
                      <CardDescription className="text-[11px] sm:text-xs">
                        Configure privacy protections, time limits, location geofencing, and scan restrictions
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-3.5 sm:p-6 space-y-4 sm:space-y-5">
                      {/* 1. Password Protection */}
                      <div className="p-3 sm:p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                              <Lock className="w-4 h-4" />
                            </div>
                            <div>
                              <Label htmlFor="enable-password-switch" className="text-xs sm:text-sm font-semibold cursor-pointer">
                                Password Protection
                              </Label>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                Require visitors to enter a passcode
                              </p>
                            </div>
                          </div>
                          <Switch
                            id="enable-password-switch"
                            checked={enablePassword}
                            onCheckedChange={setEnablePassword}
                          />
                        </div>

                        <AnimatePresence>
                          {enablePassword && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="pt-2 border-t border-border/40"
                            >
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Enter passkey..."
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  className="pr-10 h-9 sm:h-10 text-xs sm:text-sm bg-background"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* 2. Expiration Settings */}
                      <div className="p-3 sm:p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div>
                              <Label htmlFor="enable-expiration-switch" className="text-xs sm:text-sm font-semibold cursor-pointer">
                                Expiration Timer
                              </Label>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                Automatically disable after a duration
                              </p>
                            </div>
                          </div>
                          <Switch
                            id="enable-expiration-switch"
                            checked={enableExpiration}
                            onCheckedChange={setEnableExpiration}
                          />
                        </div>

                        <AnimatePresence>
                          {enableExpiration && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="pt-3 border-t border-border/40 space-y-3"
                            >
                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-muted-foreground">Days</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="365"
                                    value={expirationDays}
                                    onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                                    className="text-center h-9 sm:h-10 text-xs sm:text-sm bg-background"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-muted-foreground">Hours</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={expirationHours}
                                    onChange={(e) => setExpirationHours(parseInt(e.target.value) || 0)}
                                    className="text-center h-9 sm:h-10 text-xs sm:text-sm bg-background"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-muted-foreground">Minutes</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={expirationMinutes}
                                    onChange={(e) => setExpirationMinutes(parseInt(e.target.value) || 0)}
                                    className="text-center h-9 sm:h-10 text-xs sm:text-sm bg-background"
                                  />
                                </div>
                              </div>

                              {getExpirationPreview() && (
                                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-blue-500 dark:text-blue-400 bg-blue-500/10 p-2 rounded-lg">
                                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span>Will expire on: <strong>{getExpirationPreview()}</strong></span>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-1">
                                <Label htmlFor="show-expiry" className="text-[11px] sm:text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5" />
                                  Show countdown timer to visitors
                                </Label>
                                <Switch
                                  id="show-expiry"
                                  checked={showExpiryToVisitors}
                                  onCheckedChange={setShowExpiryToVisitors}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* 3. Location Lock */}
                      <div className="p-3 sm:p-4 rounded-xl bg-secondary/30 border border-border/50">
                        <LocationPicker
                          enabled={enableLocationLock}
                          onEnabledChange={setEnableLocationLock}
                          location={locationData}
                          onLocationChange={setLocationData}
                        />
                      </div>

                      {/* 4. Scan Limits */}
                      <div className="p-3 sm:p-4 rounded-xl bg-secondary/30 border border-border/50">
                        <ScanLimitInput
                          scanLimitType={scanLimitType}
                          onScanLimitTypeChange={setScanLimitType}
                          maxScans={maxScans}
                          onMaxScansChange={setMaxScans}
                          dailyLimit={dailyLimit}
                          onDailyLimitChange={setDailyLimit}
                        />
                      </div>

                      {/* 5. App & Branding Display Toggles */}
                      <div className="p-3 sm:p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-primary" />
                          <Label className="text-xs sm:text-sm font-semibold">Page Branding & Experience</Label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/40">
                            <div>
                              <Label htmlFor="showInstallPopup" className="text-xs font-medium cursor-pointer block">
                                Install App Popup
                              </Label>
                              <span className="text-[10px] text-muted-foreground">
                                Prompt visitors to install ConnectHUB
                              </span>
                            </div>
                            <Switch
                              id="showInstallPopup"
                              checked={showInstallPopup}
                              onCheckedChange={setShowInstallPopup}
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/40">
                            <div>
                              <Label htmlFor="showFooterBranding" className="text-xs font-medium cursor-pointer block">
                                Footer Branding
                              </Label>
                              <span className="text-[10px] text-muted-foreground">
                                Show "Powered by ConnectHUB"
                              </span>
                            </div>
                            <Switch
                              id="showFooterBranding"
                              checked={showFooterBranding}
                              onCheckedChange={setShowFooterBranding}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* -------------------------------------------------------- */}
                {/* TAB 3: Shared Content (With check/uncheck toggles)        */}
                {/* -------------------------------------------------------- */}
                <TabsContent value="content" className="space-y-4 mt-3 sm:mt-4">
                  <Card className="border-border/60 bg-card/85 backdrop-blur-md shadow-elevated">
                    <CardHeader className="p-3.5 sm:p-5 pb-3 border-b border-border/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            Choose Content ({selectedItems.length} of {allItems.length} selected)
                          </CardTitle>
                          <CardDescription className="text-[11px] sm:text-xs">
                            Select items for your QR profile and optionally star one for direct redirect
                          </CardDescription>
                        </div>
                      </div>

                      {/* Direct Redirect Tip Banner */}
                      <div className="flex items-start gap-2 p-2.5 sm:p-3 mt-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
                        <Star className="w-4 h-4 fill-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px]">
                          <strong>Direct Open:</strong> Click the Star icon on any selected link to redirect visitors directly to that link on scan.
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3.5 sm:p-6 space-y-4">
                      {Object.entries(groupedItems).map(([categoryName, items]) => (
                        <div key={categoryName} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              {categoryName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ({items.length})
                            </span>
                          </div>

                          <ul className="space-y-2">
                            {items.map((item) => {
                              const isItemSelected = selectedItems.some(i => i.id === item.id);
                              const isStarred = starredItemId === item.id;

                              return (
                                <li
                                  key={item.id}
                                  className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all ${
                                    isStarred 
                                      ? "bg-amber-500/15 border-amber-500/40 shadow-sm" 
                                      : isItemSelected
                                        ? "bg-secondary/40 border-primary/40 shadow-xs"
                                        : "bg-secondary/15 border-border/30 opacity-70 hover:opacity-100"
                                  }`}
                                >
                                  {/* Checkbox */}
                                  <button
                                    type="button"
                                    onClick={() => toggleItemSelection(item)}
                                    className="p-1 text-primary hover:scale-105 transition-transform flex-shrink-0"
                                    title={isItemSelected ? "Remove from QR Code" : "Include in QR Code"}
                                  >
                                    {isItemSelected ? (
                                      <CheckSquare className="w-5 h-5 text-primary" />
                                    ) : (
                                      <SquareIcon className="w-5 h-5 text-muted-foreground" />
                                    )}
                                  </button>

                                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-background flex items-center justify-center flex-shrink-0 shadow-xs">
                                    <PlatformIcon type={item.type} content={item.content} size="sm" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-xs sm:text-sm text-foreground truncate">
                                      {item.title}
                                    </p>
                                    <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate font-mono">
                                      {item.content}
                                    </p>
                                  </div>

                                  {isItemSelected && (
                                    <button
                                      type="button"
                                      onClick={() => setStarredItemId(isStarred ? null : item.id)}
                                      className={`p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0 flex items-center gap-1 text-xs font-medium ${
                                        isStarred
                                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                          : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                                      }`}
                                      title={isStarred ? "Remove star" : "Star this item (direct open on scan)"}
                                    >
                                      <Star 
                                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                                          isStarred 
                                            ? "text-amber-500 fill-amber-500 animate-pulse" 
                                            : "text-muted-foreground"
                                        }`} 
                                      />
                                      <span className="hidden sm:inline">
                                        {isStarred ? "Direct Open" : "Star"}
                                      </span>
                                    </button>
                                  )}

                                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 py-0.5 flex-shrink-0">
                                    {item.type}
                                  </Badge>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </motion.div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MOBILE STICKY BOTTOM ACTION BAR                              */}
      {/* ============================================================ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-2.5 sm:p-3 bg-background/95 backdrop-blur-lg border-t border-border/60 z-50 safe-area-padding">
        <div className="max-w-md mx-auto flex items-center gap-2">
          {!qrPageId ? (
            <div className="flex items-center gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadQR}
                disabled={isDownloading}
                className="h-11 px-3 text-xs flex-shrink-0"
                title="Download PNG"
              >
                <Download className="w-4 h-4 text-primary" />
              </Button>
              <Button
                onClick={handleSaveQR}
                className="flex-1 h-11 text-xs sm:text-sm font-semibold shadow-glow"
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Generating...
                  </span>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-1.5" />
                    Generate ({selectedItems.length} items)
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className="h-10 text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadQR}
                disabled={isDownloading}
                className="h-10 text-xs text-primary"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                HD PNG
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleUpdateLiveQR}
                disabled={isUpdating}
                className="h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                {isUpdating ? "..." : "Sync"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;
