import { useState, useEffect, useRef } from "react";
import { 
  Trash2, Download, Copy, ExternalLink, Eye, MoreVertical, Share2, 
  Edit2, Lock, LockOpen, MapPin, Clock, X, Check, AlertCircle, Loader2 
} from "lucide-react";
import { BusinessInfoForm, BusinessInfo, defaultBusinessInfo } from "@/components/business/BusinessInfoForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CustomQRCode } from "@/components/qr/CustomQRCode";
import { LocationPicker, LocationData } from "@/components/qr/LocationPicker";
import { hashPassword } from "@/lib/crypto";
import { defaultQRStyle, QRStyleConfig } from "@/lib/qr-styles";
import { format, isPast, addDays, addHours } from "date-fns";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BusinessQRPage {
  id: string;
  public_id: string;
  title: string | null;
  style_config: QRStyleConfig | null;
  is_deleted: boolean;
  created_at: string;
  product_count: number;
  password_hash: string | null;
  expires_at: string | null;
  location_locked: boolean;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
  show_expires_at: boolean;
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

interface BusinessQRListProps {
  userId: string;
}

type ExpiryExtension = "none" | "1h" | "24h" | "7d" | "30d" | "custom" | "remove";

export const BusinessQRList = ({ userId }: BusinessQRListProps) => {
  const [pages, setPages] = useState<BusinessQRPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const qrRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchOperation, setBatchOperation] = useState<"password" | "location" | "expiry" | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Batch operation values
  const [batchEnablePassword, setBatchEnablePassword] = useState(false);
  const [batchPassword, setBatchPassword] = useState("");
  const [showBatchPassword, setShowBatchPassword] = useState(false);
  const [batchEnableLocation, setBatchEnableLocation] = useState(false);
  const [batchLocationData, setBatchLocationData] = useState<LocationData | null>(null);
  const [batchExpiryOption, setBatchExpiryOption] = useState<ExpiryExtension>("none");
  const [batchCustomExpiryDate, setBatchCustomExpiryDate] = useState<Date | undefined>(undefined);
  const [batchShowExpiryToVisitors, setBatchShowExpiryToVisitors] = useState(false);

  // Edit state
  const [editingQR, setEditingQR] = useState<BusinessQRPage | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Password state
  const [editEnablePassword, setEditEnablePassword] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  
  // Location lock state
  const [editEnableLocationLock, setEditEnableLocationLock] = useState(false);
  const [editLocationData, setEditLocationData] = useState<LocationData | null>(null);
  
  // Expiry state
  const [editExpiryExtension, setEditExpiryExtension] = useState<ExpiryExtension>("none");
  const [editCustomExpiryDate, setEditCustomExpiryDate] = useState<Date | undefined>(undefined);
  const [editShowExpiryToVisitors, setEditShowExpiryToVisitors] = useState(false);
  const [editBusinessInfo, setEditBusinessInfo] = useState<BusinessInfo>(defaultBusinessInfo);
  
  const qrPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPages();
  }, [userId]);

  const fetchPages = async () => {
    try {
      const { data: pagesData, error: pagesError } = await supabase
        .from("qr_business_pages")
        .select("*")
        .eq("user_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (pagesError) throw pagesError;

      // Get product counts for each page
      const pagesWithCounts = await Promise.all(
        (pagesData || []).map(async (page) => {
          const { count } = await supabase
            .from("qr_business_page_products")
            .select("id", { count: "exact", head: true })
            .eq("qr_page_id", page.id);

          return {
            ...page,
            style_config: page.style_config as unknown as QRStyleConfig | null,
            product_count: count || 0,
            show_expires_at: page.show_expires_at || false,
            business_name: (page as any).business_name || null,
            business_logo_url: (page as any).business_logo_url || null,
            business_address: (page as any).business_address || null,
            business_phone: (page as any).business_phone || null,
            business_email: (page as any).business_email || null,
            business_website: (page as any).business_website || null,
            business_instagram: (page as any).business_instagram || null,
            business_facebook: (page as any).business_facebook || null,
            business_twitter: (page as any).business_twitter || null,
            business_whatsapp: (page as any).business_whatsapp || null,
          };
        })
      );

      setPages(pagesWithCounts);
    } catch (error: any) {
      toast.error("Failed to load QR codes");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("qr_business_pages")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("QR code deleted");
      setDeleteId(null);
      fetchPages();
    } catch (error: any) {
      toast.error("Failed to delete QR code");
      console.error(error);
    }
  };

  const handleEditQR = (page: BusinessQRPage) => {
    setEditingQR(page);
    setEditTitle(page.title || "");
    setEditEnablePassword(!!page.password_hash);
    setEditPassword("");
    setEditEnableLocationLock(page.location_locked || false);
    setEditLocationData(
      page.location_lat && page.location_lng
        ? { lat: page.location_lat, lng: page.location_lng, name: page.location_name || "" }
        : null
    );
    setEditExpiryExtension("none");
    setEditCustomExpiryDate(undefined);
    setEditShowExpiryToVisitors(page.show_expires_at || false);
    setEditBusinessInfo({
      business_name: page.business_name || "",
      business_logo_url: page.business_logo_url || "",
      business_address: page.business_address || "",
      business_phone: page.business_phone || "",
      business_email: page.business_email || "",
      business_website: page.business_website || "",
      business_instagram: page.business_instagram || "",
      business_facebook: page.business_facebook || "",
      business_twitter: page.business_twitter || "",
      business_whatsapp: page.business_whatsapp || "",
      business_hours: (page as any).business_hours || "",
    });
    setIsEditOpen(true);
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pages.map((p) => p.id)));
    }
  };

  const openBatchOperation = (operation: "password" | "location" | "expiry") => {
    setBatchOperation(operation);
    setBatchEnablePassword(false);
    setBatchPassword("");
    setShowBatchPassword(false);
    setBatchEnableLocation(false);
    setBatchLocationData(null);
    setBatchExpiryOption("none");
    setBatchCustomExpiryDate(undefined);
    setBatchShowExpiryToVisitors(false);
    setIsBatchOpen(true);
  };

  const calculateBatchExpirationDate = (): string | null | undefined => {
    if (batchExpiryOption === "none") return undefined;
    if (batchExpiryOption === "remove") return null;
    
    const baseDate = new Date();
    
    switch (batchExpiryOption) {
      case "1h": return addHours(baseDate, 1).toISOString();
      case "24h": return addHours(baseDate, 24).toISOString();
      case "7d": return addDays(baseDate, 7).toISOString();
      case "30d": return addDays(baseDate, 30).toISOString();
      case "custom": return batchCustomExpiryDate ? batchCustomExpiryDate.toISOString() : undefined;
      default: return undefined;
    }
  };

  const handleBatchApply = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchProcessing(true);

    try {
      const updateData: any = {};

      if (batchOperation === "password") {
        if (batchEnablePassword && batchPassword.trim()) {
          updateData.password_hash = hashPassword(batchPassword.trim());
        } else if (!batchEnablePassword) {
          updateData.password_hash = null;
        }
      } else if (batchOperation === "location") {
        updateData.location_locked = batchEnableLocation;
        if (batchEnableLocation && batchLocationData) {
          updateData.location_lat = batchLocationData.lat;
          updateData.location_lng = batchLocationData.lng;
          updateData.location_name = batchLocationData.name || null;
        } else {
          updateData.location_lat = null;
          updateData.location_lng = null;
          updateData.location_name = null;
        }
      } else if (batchOperation === "expiry") {
        const newExpiration = calculateBatchExpirationDate();
        if (newExpiration !== undefined) {
          updateData.expires_at = newExpiration;
          updateData.show_expires_at = batchShowExpiryToVisitors;
        }
      }

      if (Object.keys(updateData).length === 0) {
        toast.error("No changes to apply");
        return;
      }

      for (const id of selectedIds) {
        await supabase
          .from("qr_business_pages")
          .update(updateData)
          .eq("id", id);
      }

      toast.success(`Updated ${selectedIds.size} QR code(s)`);
      setIsBatchOpen(false);
      setSelectedIds(new Set());
      fetchPages();
    } catch (error) {
      toast.error("Failed to apply batch changes");
      console.error(error);
    } finally {
      setIsBatchProcessing(false);
    }
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

  const handleSaveChanges = async () => {
    if (!editingQR) return;
    setIsSaving(true);

    try {
      let passwordHash: string | null | undefined = undefined;

      if (editEnablePassword && editPassword.trim()) {
        passwordHash = hashPassword(editPassword.trim());
      } else if (!editEnablePassword) {
        passwordHash = null;
      }

      const updateData: any = { 
        title: editTitle,
        business_name: editBusinessInfo.business_name || null,
        business_logo_url: editBusinessInfo.business_logo_url || null,
        business_address: editBusinessInfo.business_address || null,
        business_phone: editBusinessInfo.business_phone || null,
        business_email: editBusinessInfo.business_email || null,
        business_website: editBusinessInfo.business_website || null,
        business_instagram: editBusinessInfo.business_instagram || null,
        business_facebook: editBusinessInfo.business_facebook || null,
        business_twitter: editBusinessInfo.business_twitter || null,
        business_whatsapp: editBusinessInfo.business_whatsapp || null,
        business_hours: editBusinessInfo.business_hours || null,
      };
      
      if (passwordHash !== undefined) {
        updateData.password_hash = passwordHash;
      }
      
      // Handle expiration
      const newExpiration = calculateNewExpirationDate();
      if (newExpiration !== undefined) {
        updateData.expires_at = newExpiration;
      }

      // Handle show expires at setting
      updateData.show_expires_at = editShowExpiryToVisitors;

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
        .from("qr_business_pages")
        .update(updateData)
        .eq("id", editingQR.id);

      if (error) throw error;

      setPages(pages.map((p) =>
        p.id === editingQR.id
          ? { 
              ...p, 
              title: editTitle, 
              password_hash: passwordHash !== undefined ? passwordHash : p.password_hash,
              expires_at: newExpiration !== undefined ? newExpiration : p.expires_at,
              location_locked: editEnableLocationLock,
              location_lat: editEnableLocationLock ? editLocationData?.lat ?? null : null,
              location_lng: editEnableLocationLock ? editLocationData?.lng ?? null : null,
              location_name: editEnableLocationLock ? editLocationData?.name ?? null : null,
              show_expires_at: editShowExpiryToVisitors,
            }
          : p
      ));

      toast.success("QR code updated!");
      setIsEditOpen(false);
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
        .from("qr_business_pages")
        .update({ password_hash: null })
        .eq("id", editingQR.id);

      if (error) throw error;

      setEditEnablePassword(false);
      setPages(pages.map((p) =>
        p.id === editingQR.id ? { ...p, password_hash: null } : p
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
    link.download = `business-qr-${editingQR.public_id}.png`;
    link.href = downloadCanvas.toDataURL("image/png");
    link.click();
    toast.success("QR code downloaded (high quality)");
  };

  const handleDownload = (page: BusinessQRPage) => {
    const ref = qrRefs.current.get(page.id);
    if (!ref) return;

    const canvas = ref.querySelector("canvas");
    if (!canvas) {
      toast.error("QR code not ready");
      return;
    }

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
    link.download = `business-qr-${page.public_id}.png`;
    link.href = downloadCanvas.toDataURL("image/png");
    link.click();
    toast.success("QR code downloaded");
  };

  const handleCopyUrl = (page: BusinessQRPage) => {
    const url = `${window.location.origin}/business/${page.public_id}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  const handleShare = async (page: BusinessQRPage) => {
    const url = `${window.location.origin}/business/${page.public_id}`;
    const shareText = `📱 Check out this catalog: ${page.title || 'Business Products'}\n\n🔗 ${url}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: page.title || 'Business QR',
          text: shareText,
          url: url,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          navigator.clipboard.writeText(shareText);
          toast.success("Link copied!");
        }
      }
    } else {
      navigator.clipboard.writeText(shareText);
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
      toast.success("Link copied! Opening WhatsApp...");
    }
  };

  const handleOpenPage = (page: BusinessQRPage) => {
    window.open(`/business/${page.public_id}`, "_blank");
  };

  const isExpired = (expiresAt: string | null) => {
    return expiresAt ? isPast(new Date(expiresAt)) : false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>No QR codes generated yet. Create your first business QR code!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Generated QR Codes</CardTitle>
          <div className="flex items-center gap-2">
            {pages.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === pages.length && pages.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Batch Operations Bar */}
        {selectedIds.size > 0 && (
          <div className="px-6 pb-4">
            <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
              <Button size="sm" variant="outline" onClick={() => openBatchOperation("password")}>
                <Lock className="w-4 h-4 mr-1" />
                Set Password
              </Button>
              <Button size="sm" variant="outline" onClick={() => openBatchOperation("location")}>
                <MapPin className="w-4 h-4 mr-1" />
                Set Location
              </Button>
              <Button size="sm" variant="outline" onClick={() => openBatchOperation("expiry")}>
                <Clock className="w-4 h-4 mr-1" />
                Set Expiry
              </Button>
            </div>
          </div>
        )}
        
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page) => {
              const url = `${window.location.origin}/business/${page.public_id}`;
              const styleConfig = page.style_config || defaultQRStyle;
              const expired = isExpired(page.expires_at);

              return (
                <div
                  key={page.id}
                  className={`border rounded-lg p-4 space-y-3 bg-card hover:shadow-md transition-shadow ${expired ? 'opacity-60' : ''} ${selectedIds.has(page.id) ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedIds.has(page.id)}
                        onCheckedChange={() => toggleSelect(page.id)}
                        className="mt-1"
                      />
                      <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {page.title || "Untitled"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(page.created_at), "MMM d, yyyy")}
                      </p>
                      {/* Status badges */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {page.password_hash && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Password
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
                            variant={expired ? "destructive" : "secondary"} 
                            className="text-xs"
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {expired ? "Expired" : format(new Date(page.expires_at), "MMM d")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditQR(page)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenPage(page)}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open Page
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyUrl(page)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy URL
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare(page)}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(page)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download QR
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(page.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div
                    ref={(el) => {
                      if (el) qrRefs.current.set(page.id, el);
                    }}
                    className="flex justify-center p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="w-full max-w-[140px]">
                      <CustomQRCode 
                        id={`biz-list-qr-${page.id}`}
                        value={url} 
                        style={{ ...styleConfig, size: 140 }} 
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      {page.product_count} product{page.product_count !== 1 ? "s" : ""}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditQR(page)}
                      className="text-xs"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit QR Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Edit Business QR Code
            </DialogTitle>
            <DialogDescription>
              Update settings for this QR code. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>

          {editingQR && (
            <div className="space-y-6">
              {/* QR Preview & Download */}
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div 
                  ref={qrPreviewRef}
                  className="bg-muted/30 rounded-lg p-4 flex justify-center"
                >
                  <CustomQRCode
                    id={`edit-biz-qr-${editingQR.id}`}
                    value={`${window.location.origin}/business/${editingQR.public_id}`}
                    style={{ ...(editingQR.style_config || defaultQRStyle), size: 160 }}
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <Button onClick={handleDownloadQR} variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download High-Quality PNG
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    URL: {window.location.origin}/business/{editingQR.public_id}
                  </p>
                </div>
              </div>

              {/* Edit Name */}
              <div className="space-y-2">
                <Label htmlFor="edit-title">QR Code Name</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter a name for this QR code"
                />
              </div>

              {/* Password Protection */}
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {editEnablePassword ? (
                      <Lock className="w-4 h-4 text-primary" />
                    ) : (
                      <LockOpen className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Label>Password Protection</Label>
                  </div>
                  <Switch
                    checked={editEnablePassword}
                    onCheckedChange={setEditEnablePassword}
                  />
                </div>
                
                {editEnablePassword && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type={showEditPassword ? "text" : "password"}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder={editingQR.password_hash ? "Enter new password (leave empty to keep current)" : "Enter password"}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                      >
                        {showEditPassword ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {editingQR.password_hash && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePassword}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove Password
                      </Button>
                    )}
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

              {/* Expiry Settings */}
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Label>QR Code Expiration</Label>
                </div>
                
                {editingQR.expires_at && (
                  <div className={`flex items-center gap-2 text-sm ${isExpired(editingQR.expires_at) ? 'text-destructive' : 'text-muted-foreground'}`}>
                    <AlertCircle className="w-4 h-4" />
                    {isExpired(editingQR.expires_at) 
                      ? `Expired on ${format(new Date(editingQR.expires_at), "PPp")}`
                      : `Expires on ${format(new Date(editingQR.expires_at), "PPp")}`
                    }
                  </div>
                )}

                <Select
                  value={editExpiryExtension}
                  onValueChange={(value) => setEditExpiryExtension(value as ExpiryExtension)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Set expiration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No change</SelectItem>
                    <SelectItem value="1h">Expire in 1 hour</SelectItem>
                    <SelectItem value="24h">Expire in 24 hours</SelectItem>
                    <SelectItem value="7d">Expire in 7 days</SelectItem>
                    <SelectItem value="30d">Expire in 30 days</SelectItem>
                    <SelectItem value="custom">Custom date</SelectItem>
                    <SelectItem value="remove">Remove expiration</SelectItem>
                  </SelectContent>
                </Select>

                {editExpiryExtension === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {editCustomExpiryDate 
                          ? format(editCustomExpiryDate, "PPP") 
                          : "Pick a date"
                        }
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

                {/* Show expiry to visitors toggle */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="edit-show-expiry" className="text-sm">Show countdown to visitors</Label>
                  </div>
                  <Switch
                    id="edit-show-expiry"
                    checked={editShowExpiryToVisitors}
                    onCheckedChange={setEditShowExpiryToVisitors}
                  />
                </div>
              </div>

              {/* Business Information */}
              <BusinessInfoForm value={editBusinessInfo} onChange={setEditBusinessInfo} userId={userId} />

              {/* Save Button */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete QR Code</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate this QR code. Users who scan it will see an error page.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Operations Dialog */}
      <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {batchOperation === "password" && <Lock className="w-5 h-5" />}
              {batchOperation === "location" && <MapPin className="w-5 h-5" />}
              {batchOperation === "expiry" && <Clock className="w-5 h-5" />}
              Batch {batchOperation === "password" ? "Password" : batchOperation === "location" ? "Location" : "Expiry"} Settings
            </DialogTitle>
            <DialogDescription>
              Apply settings to {selectedIds.size} selected QR code(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {batchOperation === "password" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {batchEnablePassword ? (
                      <Lock className="w-4 h-4 text-primary" />
                    ) : (
                      <LockOpen className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Label>Enable Password Protection</Label>
                  </div>
                  <Switch
                    checked={batchEnablePassword}
                    onCheckedChange={setBatchEnablePassword}
                  />
                </div>
                
                {batchEnablePassword && (
                  <div className="relative">
                    <Input
                      type={showBatchPassword ? "text" : "password"}
                      value={batchPassword}
                      onChange={(e) => setBatchPassword(e.target.value)}
                      placeholder="Enter password for all selected QR codes"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowBatchPassword(!showBatchPassword)}
                    >
                      {showBatchPassword ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {batchOperation === "location" && (
              <LocationPicker
                enabled={batchEnableLocation}
                onEnabledChange={setBatchEnableLocation}
                location={batchLocationData}
                onLocationChange={setBatchLocationData}
              />
            )}

            {batchOperation === "expiry" && (
              <div className="space-y-3">
                <Select
                  value={batchExpiryOption}
                  onValueChange={(value) => setBatchExpiryOption(value as ExpiryExtension)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Set expiration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No change</SelectItem>
                    <SelectItem value="1h">Expire in 1 hour</SelectItem>
                    <SelectItem value="24h">Expire in 24 hours</SelectItem>
                    <SelectItem value="7d">Expire in 7 days</SelectItem>
                    <SelectItem value="30d">Expire in 30 days</SelectItem>
                    <SelectItem value="custom">Custom date</SelectItem>
                    <SelectItem value="remove">Remove expiration</SelectItem>
                  </SelectContent>
                </Select>

                {batchExpiryOption === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {batchCustomExpiryDate 
                          ? format(batchCustomExpiryDate, "PPP") 
                          : "Pick a date"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={batchCustomExpiryDate}
                        onSelect={setBatchCustomExpiryDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {batchExpiryOption !== "none" && batchExpiryOption !== "remove" && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="batch-show-expiry" className="text-sm">Show countdown to visitors</Label>
                    </div>
                    <Switch
                      id="batch-show-expiry"
                      checked={batchShowExpiryToVisitors}
                      onCheckedChange={setBatchShowExpiryToVisitors}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsBatchOpen(false)}
                disabled={isBatchProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBatchApply}
                disabled={isBatchProcessing}
              >
                {isBatchProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Apply to {selectedIds.size} QR(s)
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
