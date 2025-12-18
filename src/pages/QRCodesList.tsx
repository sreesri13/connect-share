import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { QrCode, ExternalLink, Trash2, Calendar, ArrowLeft, Loader2, Edit2, Lock, LockOpen, Eye, EyeOff, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/contexts/AuthContext";
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
          qr_page_items (id)
        `)
        .eq("user_id", user!.id)
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
    await fetchQRItems(qrPage.id);
    setIsEditQROpen(true);
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit QR Code</DialogTitle>
            <DialogDescription>Update QR code settings and manage items</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
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
              <div className="flex items-center justify-between">
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
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={handleRemovePassword}>
                    Remove Password
                  </Button>
                )}
              </div>

              {editEnablePassword && (
                <div className="relative mt-2">
                  <Input
                    type={showEditPassword ? "text" : "password"}
                    placeholder={editingQR?.has_password ? "Enter new password (leave empty to keep current)" : "Enter password"}
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

            {/* Items List */}
            <div className="space-y-3">
              <Label>Items in this QR Code ({qrItems.length})</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {qrItems.map((item) => (
                  <div
                    key={item.qr_page_item_id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-secondary text-muted-foreground uppercase">
                      {item.type}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
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
                      className="text-destructive"
                      onClick={() => handleRemoveItemFromQR(item.qr_page_item_id, item.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSaveQRChanges} className="w-full">
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemOpen} onOpenChange={(open) => { setIsEditItemOpen(open); if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update the item details</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Item title"
                value={editingItem.title}
                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
              />
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

              {["pdf", "image", "video", "audio"].includes(editingItem.type) ? (
                <FileUpload
                  type={editingItem.type as "pdf" | "image" | "video" | "audio"}
                  userId={user?.id || ""}
                  value={editingItem.content}
                  onUploadComplete={(url) => setEditingItem({ ...editingItem, content: url })}
                />
              ) : (
                <Input
                  placeholder={editingItem.type === "url" ? "https://..." : "Enter text content"}
                  value={editingItem.content}
                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                />
              )}

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
