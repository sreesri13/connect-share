import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { QrCode, ExternalLink, Trash2, Calendar, ArrowLeft, Loader2, Edit2, Lock, LockOpen, Eye, EyeOff, X, Check, Clock, Plus, Download, MapPin, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload } from "@/components/FileUpload";
import { hashPassword } from "@/lib/crypto";
import { CustomQRCode } from "@/components/qr/CustomQRCode";
import { defaultQRStyle } from "@/lib/qr-styles";
import { LocationPicker, LocationData } from "@/components/qr/LocationPicker";
import { format, addDays, addHours, addMinutes } from "date-fns";
import { QRAnalyticsDisplay } from "@/components/dashboard/QRAnalyticsDisplay";

interface QRPage {
  id: string;
  public_id: string;
  title: string | null;
  created_at: string;
  item_count: number;
  has_password: boolean;
  expires_at: string | null;
  style_config: any;
  location_locked: boolean;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
}

interface QRItem {
  id: string;
  title: string;
  type: "url" | "text" | "pdf" | "image" | "video" | "audio";
  content: string;
  qr_page_item_id: string;
}

const QRCodesList = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [qrPages, setQrPages] = useState<QRPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit QR states
  const [editingQR, setEditingQR] = useState<QRPage | null>(null);
  const [isEditQROpen, setIsEditQROpen] = useState(false);
  const [editQRTitle, setEditQRTitle] = useState("");
  const [editEnablePassword, setEditEnablePassword] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [qrItems, setQrItems] = useState<QRItem[]>([]);
  const [editingItem, setEditingItem] = useState<QRItem | null>(null);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  
  // Expiration extension states
  const [editEnableExpiration, setEditEnableExpiration] = useState(false);
  const [editExpirationDays, setEditExpirationDays] = useState(0);
  const [editExpirationHours, setEditExpirationHours] = useState(0);
  const [editExpirationMinutes, setEditExpirationMinutes] = useState(0);

  // Location lock states
  const [editEnableLocationLock, setEditEnableLocationLock] = useState(false);
  const [editLocationData, setEditLocationData] = useState<LocationData | null>(null);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchQRPages();
    }
  }, [user]);

  const fetchQRPages = async () => {
    try {
      const { data, error } = await supabase
        .from("qr_pages")
        .select(`
          id,
          public_id,
          title,
          created_at,
          password_hash,
          expires_at,
          style_config,
          location_locked,
          location_lat,
          location_lng,
          location_name,
          qr_page_items (id)
        `)
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const pages = (data || []).map((page: any) => ({
        id: page.id,
        public_id: page.public_id,
        title: page.title,
        created_at: page.created_at,
        item_count: page.qr_page_items?.length || 0,
        has_password: !!page.password_hash,
        expires_at: page.expires_at,
        style_config: page.style_config,
        location_locked: page.location_locked || false,
        location_lat: page.location_lat,
        location_lng: page.location_lng,
        location_name: page.location_name,
      }));

      setQrPages(pages);
    } catch (error) {
      toast.error("Failed to load QR codes");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQRItems = async (qrPageId: string) => {
    try {
      const { data, error } = await supabase
        .from("qr_page_items")
        .select(`
          id,
          items (
            id,
            title,
            type,
            content
          )
        `)
        .eq("qr_page_id", qrPageId)
        .order("display_order", { ascending: true });

      if (error) throw error;

      const items = (data || []).map((qpItem: any) => ({
        id: qpItem.items.id,
        title: qpItem.items.title,
        type: qpItem.items.type,
        content: qpItem.items.content,
        qr_page_item_id: qpItem.id,
      }));

      setQrItems(items);
    } catch (error) {
      toast.error("Failed to load QR items");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // First delete qr_page_items
      await supabase.from("qr_page_items").delete().eq("qr_page_id", id);
      
      // Then delete qr_page
      const { error } = await supabase.from("qr_pages").delete().eq("id", id);
      if (error) throw error;

      setQrPages(qrPages.filter((p) => p.id !== id));
      toast.success("QR code deleted");
    } catch (error) {
      toast.error("Failed to delete QR code");
      console.error(error);
    }
  };

  const handleEditQR = async (qrPage: QRPage) => {
    setEditingQR(qrPage);
    setEditQRTitle(qrPage.title || "");
    setEditEnablePassword(qrPage.has_password);
    setEditPassword("");
    // Set expiration states
    setEditEnableExpiration(!!qrPage.expires_at);
    setEditExpirationDays(0);
    setEditExpirationHours(0);
    setEditExpirationMinutes(0);
    // Set location states
    setEditEnableLocationLock(qrPage.location_locked);
    setEditLocationData(qrPage.location_lat && qrPage.location_lng ? {
      lat: qrPage.location_lat,
      lng: qrPage.location_lng,
      name: qrPage.location_name || undefined,
    } : null);
    await fetchQRItems(qrPage.id);
    setIsEditQROpen(true);
  };

  const calculateNewExpirationDate = () => {
    if (!editEnableExpiration) return undefined;
    if (editExpirationDays === 0 && editExpirationHours === 0 && editExpirationMinutes === 0) return undefined;
    
    // Start from current expiration or now
    let baseDate = editingQR?.expires_at ? new Date(editingQR.expires_at) : new Date();
    // If already expired, start from now
    if (baseDate < new Date()) {
      baseDate = new Date();
    }
    
    baseDate = addDays(baseDate, editExpirationDays);
    baseDate = addHours(baseDate, editExpirationHours);
    baseDate = addMinutes(baseDate, editExpirationMinutes);
    
    return baseDate.toISOString();
  };

  const handleSaveQRChanges = async () => {
    if (!editingQR) return;

    try {
      let passwordHash: string | null | undefined = undefined;
      
      // If password enabled and new password provided, hash it using client-side hashing
      if (editEnablePassword && editPassword.trim()) {
        passwordHash = hashPassword(editPassword.trim());
      } else if (!editEnablePassword) {
        // If password disabled, remove it
        passwordHash = null;
      }

      const updateData: any = { title: editQRTitle };
      if (passwordHash !== undefined) {
        updateData.password_hash = passwordHash;
      }
      
      // Handle expiration extension
      const newExpiration = calculateNewExpirationDate();
      if (newExpiration !== undefined) {
        updateData.expires_at = newExpiration;
      }

      // Handle location lock settings
      updateData.location_locked = editEnableLocationLock;
      if (editEnableLocationLock && editLocationData) {
        updateData.location_lat = editLocationData.lat;
        updateData.location_lng = editLocationData.lng;
        updateData.location_name = editLocationData.name || null;
      } else if (!editEnableLocationLock) {
        updateData.location_lat = null;
        updateData.location_lng = null;
        updateData.location_name = null;
      }

      const { error } = await supabase
        .from("qr_pages")
        .update(updateData)
        .eq("id", editingQR.id);

      if (error) throw error;

      setQrPages(qrPages.map((p) =>
        p.id === editingQR.id
          ? { 
              ...p, 
              title: editQRTitle, 
              has_password: editEnablePassword,
              expires_at: newExpiration || p.expires_at,
              location_locked: editEnableLocationLock,
              location_lat: editEnableLocationLock ? editLocationData?.lat ?? null : null,
              location_lng: editEnableLocationLock ? editLocationData?.lng ?? null : null,
              location_name: editEnableLocationLock ? editLocationData?.name ?? null : null,
            }
          : p
      ));

      toast.success("QR code updated!");
      setIsEditQROpen(false);
      setEditingQR(null);
    } catch (error) {
      toast.error("Failed to update QR code");
      console.error(error);
    }
  };

  const handleRemovePassword = async () => {
    if (!editingQR) return;

    try {
      const { error } = await supabase
        .from("qr_pages")
        .update({ password_hash: null })
        .eq("id", editingQR.id);

      if (error) throw error;

      setEditEnablePassword(false);
      setQrPages(qrPages.map((p) =>
        p.id === editingQR.id ? { ...p, has_password: false } : p
      ));
      toast.success("Password removed!");
    } catch (error) {
      toast.error("Failed to remove password");
      console.error(error);
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || !editingItem.title.trim() || !editingItem.content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("items")
        .update({
          title: editingItem.title.trim(),
          type: editingItem.type,
          content: editingItem.content.trim(),
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      setQrItems(qrItems.map((item) =>
        item.id === editingItem.id ? { ...editingItem } : item
      ));
      setIsEditItemOpen(false);
      setEditingItem(null);
      toast.success("Item updated!");
    } catch (error) {
      toast.error("Failed to update item");
      console.error(error);
    }
  };

  const handleRemoveItemFromQR = async (qrPageItemId: string, itemId: string) => {
    try {
      const { error } = await supabase
        .from("qr_page_items")
        .delete()
        .eq("id", qrPageItemId);

      if (error) throw error;

      setQrItems(qrItems.filter((item) => item.qr_page_item_id !== qrPageItemId));
      if (editingQR) {
        setQrPages(qrPages.map((p) =>
          p.id === editingQR.id ? { ...p, item_count: p.item_count - 1 } : p
        ));
      }
      toast.success("Item removed from QR code");
    } catch (error) {
      toast.error("Failed to remove item");
      console.error(error);
    }
  };

  const handleDownloadEditQR = () => {
    if (!editingQR) return;
    
    const canvas = document.querySelector("#edit-qr-canvas") as HTMLCanvasElement;
    if (!canvas) {
      toast.error("QR code not ready");
      return;
    }

    // Create high-res version
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
    link.download = `connecthub-qr-${editingQR.public_id}.png`;
    link.href = downloadCanvas.toDataURL("image/png");
    link.click();
    toast.success("QR code downloaded!");
  };

  const handleRemoveExpiration = async () => {
    if (!editingQR) return;

    try {
      const { error } = await supabase
        .from("qr_pages")
        .update({ expires_at: null })
        .eq("id", editingQR.id);

      if (error) throw error;

      setQrPages(qrPages.map((p) =>
        p.id === editingQR.id ? { ...p, expires_at: null } : p
      ));
      setEditingQR({ ...editingQR, expires_at: null });
      setEditEnableExpiration(false);
      toast.success("Expiration removed!");
    } catch (error) {
      toast.error("Failed to remove expiration");
      console.error(error);
    }
  };

  const getPublicUrl = (publicId: string) => {
    return `${window.location.origin}/p/${publicId}`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero p-6 md:p-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">My QR Codes</h1>
            <p className="text-muted-foreground">Manage all your generated QR codes</p>
          </div>
        </motion.div>

        {qrPages.length === 0 ? (
          <Card className="p-12 text-center">
            <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No QR codes yet</h3>
            <p className="text-muted-foreground mb-6">
              Generate your first QR code from the dashboard
            </p>
            <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {qrPages.map((page, index) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:border-primary/30 transition-colors">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center relative">
                      <QrCode className="w-6 h-6 text-primary" />
                      {page.has_password && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Lock className="w-2.5 h-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground truncate">
                          {page.title || `QR Code`}
                        </h3>
                        {page.has_password && (
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">Protected</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(page.created_at).toLocaleDateString()}
                        </span>
                        <span>{page.item_count} items</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {getPublicUrl(page.public_id)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditQR(page)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getPublicUrl(page.public_id), "_blank")}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(page.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit QR Dialog */}
      <Dialog open={isEditQROpen} onOpenChange={(open) => { setIsEditQROpen(open); if (!open) { setEditingQR(null); setQrItems([]); } }}>
        <DialogContent className="max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit QR Code</DialogTitle>
            <DialogDescription>Update QR code settings and manage items</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 pr-2">
            {/* QR Code Preview */}
            {editingQR && (
              <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                <Label className="text-sm text-muted-foreground">QR Code Preview</Label>
                <div id="edit-qr-preview" className="bg-white p-4 rounded-lg">
                  <CustomQRCode
                    id="edit-qr-canvas"
                    value={getPublicUrl(editingQR.public_id)}
                    style={editingQR.style_config || defaultQRStyle}
                    className="w-[140px] h-[140px]"
                  />
                </div>
                <p className="text-xs text-muted-foreground truncate max-w-full">
                  {getPublicUrl(editingQR.public_id)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadEditQR}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
            )}

            {/* Analytics Section */}
            {editingQR && (
              <QRAnalyticsDisplay qrPageId={editingQR.id} />
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label>QR Code Title</Label>
              <Input
                value={editQRTitle}
                onChange={(e) => setEditQRTitle(e.target.value)}
                placeholder="Enter title"
              />
            </div>

            {/* Password Protection */}
            <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="editEnablePassword"
                    checked={editEnablePassword}
                    onCheckedChange={(checked) => setEditEnablePassword(checked as boolean)}
                  />
                  <Label htmlFor="editEnablePassword" className="flex items-center gap-2 cursor-pointer">
                    {editEnablePassword ? <Lock className="w-4 h-4 text-primary" /> : <LockOpen className="w-4 h-4" />}
                    Password protection
                  </Label>
                </div>
                {editingQR?.has_password && (
                  <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={handleRemovePassword}>
                    Remove Password
                  </Button>
                )}
              </div>

              {editEnablePassword && (
                <div className="relative mt-2">
                  <Input
                    type={showEditPassword ? "text" : "password"}
                    placeholder={editingQR?.has_password ? "New password (leave empty to keep)" : "Enter password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </div>

            {/* Expiration Settings */}
            <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <Label className="font-medium">Expiration Settings</Label>
                </div>
                {editingQR?.expires_at && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive text-xs h-7" 
                    onClick={handleRemoveExpiration}
                  >
                    Remove Expiration
                  </Button>
                )}
              </div>
              
              {editingQR?.expires_at && (
                <p className="text-sm text-muted-foreground">
                  Current expiration: {format(new Date(editingQR.expires_at), "PPp")}
                  {new Date(editingQR.expires_at) < new Date() && (
                    <span className="ml-2 text-destructive font-medium">(Expired)</span>
                  )}
                </p>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editEnableExpiration"
                  checked={editEnableExpiration}
                  onCheckedChange={(checked) => setEditEnableExpiration(checked as boolean)}
                />
                <Label htmlFor="editEnableExpiration" className="cursor-pointer text-sm">
                  {editingQR?.expires_at ? "Extend expiration time" : "Set expiration time"}
                </Label>
              </div>

              {editEnableExpiration && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Days</Label>
                    <Input
                      type="number"
                      min="0"
                      max="365"
                      value={editExpirationDays}
                      onChange={(e) => setEditExpirationDays(parseInt(e.target.value) || 0)}
                      className="text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={editExpirationHours}
                      onChange={(e) => setEditExpirationHours(parseInt(e.target.value) || 0)}
                      className="text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Minutes</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={editExpirationMinutes}
                      onChange={(e) => setEditExpirationMinutes(parseInt(e.target.value) || 0)}
                      className="text-center"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Location Lock Settings */}
            <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {editEnableLocationLock ? (
                    <MapPin className="w-4 h-4 text-primary" />
                  ) : (
                    <MapPinOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Label className="font-medium">Location Lock</Label>
                </div>
                <Switch
                  checked={editEnableLocationLock}
                  onCheckedChange={setEditEnableLocationLock}
                />
              </div>

              {editEnableLocationLock && (
                <div className="mt-3">
                  <LocationPicker
                    enabled={editEnableLocationLock}
                    onEnabledChange={setEditEnableLocationLock}
                    location={editLocationData}
                    onLocationChange={setEditLocationData}
                  />
                </div>
              )}

              {!editEnableLocationLock && editingQR?.location_locked && (
                <p className="text-xs text-muted-foreground">
                  Location lock will be disabled when you save changes.
                </p>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-3">
              <Label>Items in this QR Code ({qrItems.length})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {qrItems.map((item) => (
                  <div
                    key={item.qr_page_item_id}
                    className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30"
                  >
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-medium text-sm text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-secondary text-muted-foreground uppercase flex-shrink-0">
                      {item.type}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 h-8 w-8 p-0"
                      onClick={() => {
                        setEditingItem({ ...item });
                        setIsEditItemOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive flex-shrink-0 h-8 w-8 p-0"
                      onClick={() => handleRemoveItemFromQR(item.qr_page_item_id, item.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 pt-4 border-t mt-4">
            <Button onClick={handleSaveQRChanges} className="w-full">
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemOpen} onOpenChange={(open) => { setIsEditItemOpen(open); if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update the item details</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Item title"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editingItem.type}
                  onValueChange={(v) => setEditingItem({ ...editingItem, type: v as QRItem["type"], content: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio (MP3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                {["pdf", "image", "video", "audio"].includes(editingItem.type) ? (
                  <div className="w-full overflow-hidden">
                    <FileUpload
                      type={editingItem.type as "pdf" | "image" | "video" | "audio"}
                      userId={user?.id || ""}
                      value={editingItem.content}
                      onUploadComplete={(url) => setEditingItem({ ...editingItem, content: url })}
                    />
                  </div>
                ) : (
                  <Input
                    placeholder={editingItem.type === "url" ? "https://..." : "Enter text content"}
                    value={editingItem.content}
                    onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                  />
                )}
              </div>

              <Button onClick={handleEditItem} className="w-full" disabled={!editingItem.content}>
                Update Item
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QRCodesList;
