import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { QrCode, ExternalLink, Trash2, Calendar, Loader2, Edit2, Lock, LockOpen, Eye, EyeOff, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { supabase } from "@/integrations/supabase/client";
import { FileUpload } from "@/components/FileUpload";
import { hashPassword } from "@/lib/crypto";

interface QRPage {
  id: string;
  public_id: string;
  title: string | null;
  created_at: string;
  item_count: number;
  has_password: boolean;
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

export const QRCodesSection = ({ userId }: QRCodesSectionProps) => {
  const [qrPages, setQrPages] = useState<QRPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const [editingQR, setEditingQR] = useState<QRPage | null>(null);
  const [isEditQROpen, setIsEditQROpen] = useState(false);
  const [editQRTitle, setEditQRTitle] = useState("");
  const [editEnablePassword, setEditEnablePassword] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [qrItems, setQrItems] = useState<QRItem[]>([]);
  const [editingItem, setEditingItem] = useState<QRItem | null>(null);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);

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
      // Soft delete - move to recycle bin
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
        // Soft delete - move to recycle bin
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
    await fetchQRItems(qrPage.id);
    setIsEditQROpen(true);
  };

  const handleSaveQRChanges = async () => {
    if (!editingQR) return;

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

      const { error } = await supabase
        .from("qr_pages")
        .update(updateData)
        .eq("id", editingQR.id);

      if (error) throw error;

      setQrPages(qrPages.map((p) =>
        p.id === editingQR.id
          ? { ...p, title: editQRTitle, has_password: editEnablePassword }
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

  const getPublicUrl = (publicId: string) => {
    return `${window.location.origin}/p/${publicId}`;
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
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary flex-shrink-0">Protected</span>
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
        <DialogContent className="max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit QR Code</DialogTitle>
            <DialogDescription>Update QR code settings and manage items</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 pr-2">
            <div className="space-y-2">
              <Label>QR Code Title</Label>
              <Input
                value={editQRTitle}
                onChange={(e) => setEditQRTitle(e.target.value)}
                placeholder="Enter title"
              />
            </div>

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
    </div>
  );
};
