import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  QrCode, ExternalLink, Trash2, Calendar, Loader2, Edit2, Lock, LockOpen, 
  Eye, EyeOff, X, Check, Download, MapPin, Clock, AlertCircle, Plus, GripVertical,
  Folder, LinkIcon, FileText, Image, Video, Music, File, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload } from "@/components/FileUpload";
import { hashPassword } from "@/lib/crypto";
import { CustomQRCode } from "@/components/qr/CustomQRCode";
import { LocationPicker, LocationData } from "@/components/qr/LocationPicker";
import { defaultQRStyle, QRStyleConfig } from "@/lib/qr-styles";
import { format, isPast, addDays, addHours, addMonths } from "date-fns";
import { PlatformIcon } from "@/lib/platform-icons";

interface QRPage {
  id: string;
  public_id: string;
  title: string | null;
  created_at: string;
  item_count: number;
  has_password: boolean;
  expires_at: string | null;
  style_config: QRStyleConfig | null;
  location_locked: boolean;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
}

interface QRItem {
  id: string;
  title: string;
  type: "url" | "text" | "pdf" | "image" | "video" | "audio" | "others";
  content: string;
  qr_page_item_id: string;
}

interface QRCodesSectionProps {
  userId: string;
}

type ExpiryExtension = "none" | "1h" | "24h" | "7d" | "30d" | "custom" | "remove";

export const QRCodesSection = ({ userId }: QRCodesSectionProps) => {
  const [qrPages, setQrPages] = useState<QRPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit QR state
  const [editingQR, setEditingQR] = useState<QRPage | null>(null);
  const [isEditQROpen, setIsEditQROpen] = useState(false);
  const [editQRTitle, setEditQRTitle] = useState("");
  const [editEnablePassword, setEditEnablePassword] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  
  // Location lock state
  const [editEnableLocationLock, setEditEnableLocationLock] = useState(false);
  const [editLocationData, setEditLocationData] = useState<LocationData | null>(null);
  
  // Expiry state
  const [editExpiryExtension, setEditExpiryExtension] = useState<ExpiryExtension>("none");
  const [editCustomExpiryDate, setEditCustomExpiryDate] = useState<Date | undefined>(undefined);
  
  // Items state
  const [qrItems, setQrItems] = useState<QRItem[]>([]);
  const [editingItem, setEditingItem] = useState<QRItem | null>(null);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);

  // Add items from profile state
  const [isAddItemToQROpen, setIsAddItemToQROpen] = useState(false);
  const [profileCategories, setProfileCategories] = useState<{ id: string; name: string; items: { id: string; title: string; type: string; content: string }[] }[]>([]);
  const [isAddNewItemOpen, setIsAddNewItemOpen] = useState(false);
  const [newQRItem, setNewQRItem] = useState({ title: "", type: "url" as QRItem["type"], content: "" });
  const [newItemCategoryId, setNewItemCategoryId] = useState<string>("");

  // Drag state for QR items
  const [dragQRItemId, setDragQRItemId] = useState<string | null>(null);
  
  const qrPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchQRPages();
  }, [userId]);

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
          is_deleted,
          qr_page_items (id)
        `)
        .eq("user_id", userId)
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
        style_config: page.style_config as QRStyleConfig | null,
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
      const { error } = await supabase
        .from("qr_pages")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      setQrPages(qrPages.filter((p) => p.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("QR code moved to recycle bin");
    } catch (error) {
      toast.error("Failed to delete QR code");
      console.error(error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      for (const id of selectedIds) {
        await supabase
          .from("qr_pages")
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq("id", id);
      }
      setQrPages(qrPages.filter((p) => !selectedIds.has(p.id)));
      toast.success(`${selectedIds.size} QR code(s) moved to recycle bin`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error("Failed to delete QR codes");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === qrPages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(qrPages.map((p) => p.id)));
    }
  };

  const handleEditQR = async (qrPage: QRPage) => {
    setEditingQR(qrPage);
    setEditQRTitle(qrPage.title || "");
    setEditEnablePassword(qrPage.has_password);
    setEditPassword("");
    setEditEnableLocationLock(qrPage.location_locked);
    setEditLocationData(
      qrPage.location_lat && qrPage.location_lng
        ? { lat: qrPage.location_lat, lng: qrPage.location_lng, name: qrPage.location_name || "" }
        : null
    );
    setEditExpiryExtension("none");
    setEditCustomExpiryDate(undefined);
    await fetchQRItems(qrPage.id);
    setIsEditQROpen(true);
  };

  const calculateNewExpirationDate = (): string | null | undefined => {
    if (editExpiryExtension === "none") return undefined;
    if (editExpiryExtension === "remove") return null;
    
    const baseDate = new Date();
    
    switch (editExpiryExtension) {
      case "1h": return addHours(baseDate, 1).toISOString();
      case "24h": return addHours(baseDate, 24).toISOString();
      case "7d": return addDays(baseDate, 7).toISOString();
      case "30d": return addDays(baseDate, 30).toISOString();
      case "custom": return editCustomExpiryDate ? editCustomExpiryDate.toISOString() : undefined;
      default: return undefined;
    }
  };

  const handleSaveQRChanges = async () => {
    if (!editingQR) return;
    setIsSaving(true);

    try {
      let passwordHash: string | null | undefined = undefined;

      if (editEnablePassword && editPassword.trim()) {
        passwordHash = hashPassword(editPassword.trim());
      } else if (!editEnablePassword) {
        passwordHash = null;
      }

      const updateData: any = { title: editQRTitle };
      
      if (passwordHash !== undefined) {
        updateData.password_hash = passwordHash;
      }
      
      // Handle expiration
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
              expires_at: newExpiration !== undefined ? newExpiration : p.expires_at,
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
    } finally {
      setIsSaving(false);
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

  const handleDownloadQR = () => {
    if (!qrPreviewRef.current || !editingQR) return;
    
    const canvas = qrPreviewRef.current.querySelector("canvas");
    if (!canvas) {
      toast.error("QR code not ready");
      return;
    }

    // Create high-res version (4x scale)
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
    link.download = `qr-${editingQR.public_id}.png`;
    link.href = downloadCanvas.toDataURL("image/png");
    link.click();
    toast.success("QR code downloaded (high quality)");
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

  const getPublicUrl = (publicId: string) => {
    return `${window.location.origin}/p/${publicId}`;
  };

  const fetchProfileCategories = async () => {
    try {
      const { data: cats } = await supabase.from("categories").select("*").eq("user_id", userId).order("display_order");
      const { data: items } = await supabase.from("items").select("*").eq("user_id", userId).order("display_order");
      setProfileCategories((cats || []).map(cat => ({
        id: cat.id, name: cat.name,
        items: (items || []).filter(i => i.category_id === cat.id).map(i => ({ id: i.id, title: i.title, type: i.type, content: i.content }))
      })));
    } catch { toast.error("Failed to load profile items"); }
  };

  const handleAddExistingItemToQR = async (itemId: string) => {
    if (!editingQR) return;
    if (qrItems.some(qi => qi.id === itemId)) { toast.error("Item already added"); return; }
    try {
      const { data, error } = await supabase.from("qr_page_items").insert({
        qr_page_id: editingQR.id, item_id: itemId, display_order: qrItems.length
      }).select("id, items(id, title, type, content)").single();
      if (error) throw error;
      const newItem: QRItem = { id: data.items.id, title: data.items.title, type: data.items.type, content: data.items.content, qr_page_item_id: data.id };
      setQrItems(prev => [...prev, newItem]);
      setQrPages(prev => prev.map(p => p.id === editingQR.id ? { ...p, item_count: p.item_count + 1 } : p));
      toast.success("Item added to QR code");
    } catch { toast.error("Failed to add item"); }
  };

  const handleAddNewItemToQR = async () => {
    if (!editingQR || !newQRItem.title.trim() || !newQRItem.content.trim()) { toast.error("Please fill in all fields"); return; }
    if (!newItemCategoryId) { toast.error("Please select a category"); return; }
    try {
      const { data: itemData, error: itemError } = await supabase.from("items").insert({
        user_id: userId, category_id: newItemCategoryId,
        title: newQRItem.title.trim(), type: newQRItem.type, content: newQRItem.content.trim(), display_order: 0,
      }).select().single();
      if (itemError) throw itemError;
      const { data: linkData, error: linkError } = await supabase.from("qr_page_items").insert({
        qr_page_id: editingQR.id, item_id: itemData.id, display_order: qrItems.length
      }).select().single();
      if (linkError) throw linkError;
      setQrItems(prev => [...prev, { id: itemData.id, title: itemData.title, type: itemData.type, content: itemData.content, qr_page_item_id: linkData.id }]);
      setQrPages(prev => prev.map(p => p.id === editingQR.id ? { ...p, item_count: p.item_count + 1 } : p));
      setNewQRItem({ title: "", type: "url", content: "" });
      setNewItemCategoryId("");
      setIsAddNewItemOpen(false);
      toast.success("New item created and added!");
    } catch { toast.error("Failed to create item"); }
  };

  const handleQRDragStart = (qrPageItemId: string) => { setDragQRItemId(qrPageItemId); };
  const handleQRDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragQRItemId || dragQRItemId === targetId) return;
    setQrItems(prev => {
      const items = [...prev];
      const dragIndex = items.findIndex(i => i.qr_page_item_id === dragQRItemId);
      const targetIndex = items.findIndex(i => i.qr_page_item_id === targetId);
      if (dragIndex === -1 || targetIndex === -1) return prev;
      const [moved] = items.splice(dragIndex, 1);
      items.splice(targetIndex, 0, moved);
      return items;
    });
  };
  const handleQRDragEnd = async () => {
    try {
      await Promise.all(qrItems.map((item, index) =>
        supabase.from("qr_page_items").update({ display_order: index }).eq("id", item.qr_page_item_id)
      ));
    } catch { toast.error("Failed to save order"); }
    setDragQRItemId(null);
  };

  const isExpired = (expiresAt: string | null) => {
    return expiresAt ? isPast(new Date(expiresAt)) : false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">My QR Codes</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage all your generated QR codes</p>
        </div>
        {qrPages.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleSelectAll} className="min-h-[44px] text-xs sm:text-sm">
              {selectedIds.size === qrPages.length ? "Deselect" : "Select All"}
            </Button>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="min-h-[44px]"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <Trash2 className="w-4 h-4 sm:mr-2" />}
                <span className="hidden sm:inline">Delete ({selectedIds.size})</span>
                <span className="sm:hidden">{selectedIds.size}</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {qrPages.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <QrCode className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">No QR codes yet</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">
            Generate your first QR code from the My Profile section
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {qrPages.map((page, index) => (
            <motion.div
              key={page.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`hover:border-primary/30 transition-colors ${selectedIds.has(page.id) ? "border-primary bg-primary/5" : ""}`}>
                <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <Checkbox
                      checked={selectedIds.has(page.id)}
                      onCheckedChange={() => toggleSelect(page.id)}
                      className="flex-shrink-0"
                    />
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center relative flex-shrink-0">
                      <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      {page.has_password && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Lock className="w-2.5 h-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground truncate text-sm sm:text-base">
                          {page.title || `QR Code`}
                        </h3>
                        {page.has_password && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Protected
                          </Badge>
                        )}
                        {page.location_locked && (
                          <Badge variant="secondary" className="text-xs">
                            <MapPin className="w-3 h-3 mr-1" />
                            Location
                          </Badge>
                        )}
                        {page.expires_at && (
                          <Badge 
                            variant={isExpired(page.expires_at) ? "destructive" : "secondary"} 
                            className="text-xs"
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {isExpired(page.expires_at) ? "Expired" : format(new Date(page.expires_at), "MMM d")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(page.created_at).toLocaleDateString()}
                        </span>
                        <span>{page.item_count} items</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1 hidden sm:block">
                        {getPublicUrl(page.public_id)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end sm:justify-start ml-auto sm:ml-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditQR(page)}
                      className="min-h-[40px] min-w-[40px]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getPublicUrl(page.public_id), "_blank")}
                      className="min-h-[40px] min-w-[40px]"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive min-h-[40px] min-w-[40px]"
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

      {/* Edit QR Dialog */}
      <Dialog open={isEditQROpen} onOpenChange={(open) => { setIsEditQROpen(open); if (!open) { setEditingQR(null); setQrItems([]); } }}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit QR Code</DialogTitle>
            <DialogDescription>Update QR code settings, security, and access rules</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 pr-2">
            {/* QR Preview and Download */}
            {editingQR && (
              <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                <div 
                  ref={qrPreviewRef}
                  className="w-32 h-32 sm:w-40 sm:h-40 mx-auto sm:mx-0 flex-shrink-0"
                >
                  <CustomQRCode 
                    id="edit-qr-preview"
                    value={getPublicUrl(editingQR.public_id)} 
                    style={editingQR.style_config || defaultQRStyle}
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Public URL</p>
                    <p className="text-xs break-all">{getPublicUrl(editingQR.public_id)}</p>
                  </div>
                  <Button onClick={handleDownloadQR} variant="outline" size="sm" className="w-full sm:w-auto">
                    <Download className="w-4 h-4 mr-2" />
                    Download High Quality
                  </Button>
                </div>
              </div>
            )}

            {/* QR Title */}
            <div className="space-y-2">
              <Label>QR Code Name</Label>
              <Input
                value={editQRTitle}
                onChange={(e) => setEditQRTitle(e.target.value)}
                placeholder="Enter a name for this QR code"
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
                    Password Protection
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

            {/* Location Lock */}
            <LocationPicker
              enabled={editEnableLocationLock}
              onEnabledChange={setEditEnableLocationLock}
              location={editLocationData}
              onLocationChange={setEditLocationData}
            />

            {/* Expiry Management */}
            <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <Label>QR Code Expiry</Label>
              </div>
              
              {editingQR?.expires_at && (
                <div className={`flex items-center gap-2 p-2 rounded text-sm ${isExpired(editingQR.expires_at) ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {isExpired(editingQR.expires_at) 
                      ? `Expired on ${format(new Date(editingQR.expires_at), "MMM d, yyyy 'at' h:mm a")}` 
                      : `Expires on ${format(new Date(editingQR.expires_at), "MMM d, yyyy 'at' h:mm a")}`}
                  </span>
                </div>
              )}

              <Select value={editExpiryExtension} onValueChange={(v) => setEditExpiryExtension(v as ExpiryExtension)}>
                <SelectTrigger>
                  <SelectValue placeholder="Set or modify expiry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keep current setting</SelectItem>
                  <SelectItem value="1h">Set to expire in 1 hour</SelectItem>
                  <SelectItem value="24h">Set to expire in 24 hours</SelectItem>
                  <SelectItem value="7d">Set to expire in 7 days</SelectItem>
                  <SelectItem value="30d">Set to expire in 30 days</SelectItem>
                  <SelectItem value="custom">Set custom date</SelectItem>
                  <SelectItem value="remove">Remove expiry (never expires)</SelectItem>
                </SelectContent>
              </Select>

              {editExpiryExtension === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {editCustomExpiryDate ? format(editCustomExpiryDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editCustomExpiryDate}
                      onSelect={setEditCustomExpiryDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Items in QR Code */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items in this QR Code ({qrItems.length})</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { fetchProfileCategories(); setIsAddItemToQROpen(true); }}>
                    <Folder className="w-3 h-3 mr-1" />
                    From Profile
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { fetchProfileCategories(); setIsAddNewItemOpen(true); }}>
                    <Plus className="w-3 h-3 mr-1" />
                    New Item
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {qrItems.map((item) => (
                  <div
                    key={item.qr_page_item_id}
                    className={`flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30 ${dragQRItemId === item.qr_page_item_id ? "opacity-50" : ""}`}
                    draggable
                    onDragStart={() => handleQRDragStart(item.qr_page_item_id)}
                    onDragOver={(e) => handleQRDragOver(e, item.qr_page_item_id)}
                    onDragEnd={handleQRDragEnd}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0" />
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
                {qrItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No items linked to this QR code</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 pt-4 border-t mt-4">
            <Button onClick={handleSaveQRChanges} className="w-full" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
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
                    <SelectItem value="others">Others (Any File)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                {["pdf", "image", "video", "audio", "others"].includes(editingItem.type) ? (
                  <div className="w-full overflow-hidden">
                    <FileUpload
                      type={editingItem.type as "pdf" | "image" | "video" | "audio" | "others"}
                      userId={userId}
                      value={editingItem.content}
                      onUploadComplete={(url) => setEditingItem({ ...editingItem, content: url })}
                    />
                  </div>
                ) : editingItem.type === "text" ? (
                  <Textarea
                    placeholder="Enter text content (supports multiple lines)"
                    value={editingItem.content}
                    onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                    rows={5}
                  />
                ) : (
                  <Input
                    placeholder="https://..."
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

      {/* Add Item from Profile Dialog */}
      <Dialog open={isAddItemToQROpen} onOpenChange={setIsAddItemToQROpen}>
        <DialogContent className="max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add from Profile</DialogTitle>
            <DialogDescription>Select items from your profile categories to add to this QR code</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {profileCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No profile items found</p>
            ) : (
              profileCategories.map(cat => (
                <div key={cat.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{cat.name}</span>
                  </div>
                  {cat.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-6">No items</p>
                  ) : (
                    <div className="space-y-1 pl-6">
                      {cat.items.map(item => {
                        const alreadyAdded = qrItems.some(qi => qi.id === item.id);
                        return (
                          <div key={item.id} className="flex items-center gap-2 p-2 rounded bg-secondary/30">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.type}</p>
                            </div>
                            <Button
                              variant={alreadyAdded ? "ghost" : "outline"}
                              size="sm"
                              disabled={alreadyAdded}
                              onClick={() => handleAddExistingItemToQR(item.id)}
                              className="h-7 text-xs"
                            >
                              {alreadyAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Item Dialog */}
      <Dialog open={isAddNewItemOpen} onOpenChange={setIsAddNewItemOpen}>
        <DialogContent className="max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>Create a new item and add it to this QR code</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newItemCategoryId} onValueChange={setNewItemCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {profileCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="Item title" value={newQRItem.title} onChange={e => setNewQRItem({ ...newQRItem, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newQRItem.type} onValueChange={v => setNewQRItem({ ...newQRItem, type: v as QRItem["type"], content: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio (MP3)</SelectItem>
                  <SelectItem value="others">Others (Any File)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              {["pdf", "image", "video", "audio", "others"].includes(newQRItem.type) ? (
                <FileUpload
                  type={newQRItem.type as "pdf" | "image" | "video" | "audio" | "others"}
                  userId={userId}
                  value={newQRItem.content}
                  onUploadComplete={url => setNewQRItem({ ...newQRItem, content: url })}
                />
              ) : newQRItem.type === "text" ? (
                <Textarea placeholder="Enter text content" value={newQRItem.content} onChange={e => setNewQRItem({ ...newQRItem, content: e.target.value })} rows={5} />
              ) : (
                <Input placeholder="https://..." value={newQRItem.content} onChange={e => setNewQRItem({ ...newQRItem, content: e.target.value })} />
              )}
            </div>
            <Button onClick={handleAddNewItemToQR} className="w-full" disabled={!newQRItem.title.trim() || !newQRItem.content.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Create & Add Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
