import { useState, useEffect } from "react";
import { Edit3, Plus, Trash2, Edit2, Check, X, Loader2, Link as LinkIcon, FileText, Wifi, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ItemType = "url" | "text" | "pdf" | "image" | "video" | "audio" | "others" | "wifi" | "largefile";

export interface EditableItem {
  id: string; // item id
  qr_page_item_id?: string;
  title: string;
  type: ItemType;
  content: string;
  category_name?: string;
}

interface EditQRPageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrPageId: string;
  initialTitle: string;
  initialItems: EditableItem[];
  ownerId: string;
  onSaveSuccess?: () => void;
}

export const EditQRPageModal = ({
  open,
  onOpenChange,
  qrPageId,
  initialTitle,
  initialItems,
  ownerId,
  onSaveSuccess,
}: EditQRPageModalProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState<EditableItem[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  // New item form state
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemType, setNewItemType] = useState<ItemType>("url");
  const [newItemContent, setNewItemContent] = useState("");

  // Editing existing item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemTitle, setEditItemTitle] = useState("");
  const [editItemType, setEditItemType] = useState<ItemType>("url");
  const [editItemContent, setEditItemContent] = useState("");

  useEffect(() => {
    setTitle(initialTitle);
    setItems(initialItems);
  }, [initialTitle, initialItems, open]);

  const handleStartEditItem = (item: EditableItem) => {
    setEditingItemId(item.id);
    setEditItemTitle(item.title);
    setEditItemType(item.type);
    setEditItemContent(item.content);
  };

  const handleSaveItemEdit = async (itemId: string) => {
    if (!editItemTitle.trim() || !editItemContent.trim()) {
      toast.error("Title and content are required");
      return;
    }

    try {
      const { error } = await supabase
        .from("items")
        .update({
          title: editItemTitle.trim(),
          type: editItemType,
          content: editItemContent.trim(),
        })
        .eq("id", itemId);

      if (error) throw error;

      setItems(items.map((i) =>
        i.id === itemId
          ? { ...i, title: editItemTitle.trim(), type: editItemType, content: editItemContent.trim() }
          : i
      ));
      setEditingItemId(null);
      toast.success("Item updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update item");
    }
  };

  const handleDeleteItem = async (item: EditableItem) => {
    try {
      // If linked via qr_page_item_id, delete from qr_page_items
      if (item.qr_page_item_id) {
        const { error } = await supabase
          .from("qr_page_items")
          .delete()
          .eq("id", item.qr_page_item_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("qr_page_items")
          .delete()
          .eq("qr_page_id", qrPageId)
          .eq("item_id", item.id);
        if (error) throw error;
      }

      setItems(items.filter((i) => i.id !== item.id));
      toast.success("Item removed from page");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove item");
    }
  };

  const handleAddNewItem = async () => {
    if (!newItemTitle.trim() || !newItemContent.trim()) {
      toast.error("Please provide both title and content");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      if (!currentUserId) throw new Error("Authentication required");

      // 1. Create or get general category
      let categoryId: string | null = null;
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", ownerId)
        .limit(1)
        .maybeSingle();

      if (cat) {
        categoryId = cat.id;
      } else {
        const { data: newCat } = await supabase
          .from("categories")
          .insert({
            user_id: ownerId,
            name: "General",
            display_order: 0,
          })
          .select("id")
          .single();
        categoryId = newCat?.id || "";
      }

      if (!categoryId) {
        throw new Error("Failed to find or create a category for the item");
      }

      // 2. Insert item into items table
      const { data: newItem, error: itemError } = await supabase
        .from("items")
        .insert({
          user_id: currentUserId,
          category_id: categoryId,
          title: newItemTitle.trim(),
          type: newItemType,
          content: newItemContent.trim(),
          display_order: items.length,
        })
        .select("id, title, type, content")
        .single();

      if (itemError) throw itemError;

      // 3. Link to qr_page_items
      const { data: linkItem, error: linkError } = await supabase
        .from("qr_page_items")
        .insert({
          qr_page_id: qrPageId,
          item_id: newItem.id,
          display_order: items.length,
        })
        .select("id")
        .single();

      if (linkError) throw linkError;

      const created: EditableItem = {
        id: newItem.id,
        qr_page_item_id: linkItem.id,
        title: newItem.title,
        type: newItem.type,
        content: newItem.content,
        category_name: "General",
      };

      setItems([...items, created]);
      setNewItemTitle("");
      setNewItemContent("");
      setIsAddingItem(false);
      toast.success("New item added to page");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add item");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePageTitle = async () => {
    if (!title.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("qr_pages")
        .update({
          title: title.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", qrPageId);

      if (error) throw error;

      toast.success("Page updated successfully!");
      onSaveSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save title");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full max-h-[85vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/60 shadow-2xl p-6">
        <DialogHeader className="pb-2 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Edit3 className="w-5 h-5 text-primary" />
            Edit QR Webpage
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Editing live webpage. Any saved changes will synchronize in real-time.
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* Page Title Section */}
          <div className="space-y-2">
            <Label htmlFor="page-title" className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Page Title
            </Label>
            <div className="flex gap-2">
              <Input
                id="page-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter page title"
                className="bg-secondary/20 border-border/50 text-sm"
              />
              <Button
                onClick={handleSavePageTitle}
                disabled={isSaving || title === initialTitle}
                className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-3"
              >
                Save Title
              </Button>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Content Items ({items.length})
              </Label>
              {!isAddingItem && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingItem(true)}
                  className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              )}
            </div>

            {/* Inline Add Item Form */}
            {isAddingItem && (
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Add New Item</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAddingItem(false)}
                    className="h-6 w-6 p-0 text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Title (e.g. Website)"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    className="col-span-2 bg-background/50 text-xs h-9"
                  />
                  <Select value={newItemType} onValueChange={setNewItemType}>
                    <SelectTrigger className="bg-background/50 text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url">Link / URL</SelectItem>
                      <SelectItem value="text">Text Note</SelectItem>
                      <SelectItem value="wifi">Wi-Fi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  placeholder={newItemType === "url" ? "https://example.com" : "Content or description"}
                  value={newItemContent}
                  onChange={(e) => setNewItemContent(e.target.value)}
                  className="bg-background/50 text-xs h-9"
                />

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAddingItem(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddNewItem}
                    disabled={isSaving || !newItemTitle.trim() || !newItemContent.trim()}
                    className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                    Add Item
                  </Button>
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-border/50 bg-secondary/10 space-y-2"
                >
                  {editingItemId === item.id ? (
                    /* Inline Editing Mode */
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={editItemTitle}
                          onChange={(e) => setEditItemTitle(e.target.value)}
                          className="col-span-2 text-xs h-8 bg-background/60"
                        />
                        <Select value={editItemType} onValueChange={setEditItemType}>
                          <SelectTrigger className="text-xs h-8 bg-background/60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="url">URL</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="wifi">Wi-Fi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        value={editItemContent}
                        onChange={(e) => setEditItemContent(e.target.value)}
                        className="text-xs h-8 bg-background/60"
                      />
                      <div className="flex justify-end gap-1.5 pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingItemId(null)}
                          className="h-7 text-xs px-2"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveItemEdit(item.id)}
                          className="h-7 text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {item.title}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono py-0 px-1.5">
                            {item.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
                          {item.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartEditItem(item)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteItem(item)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {items.length === 0 && !isAddingItem && (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border/50 rounded-xl">
                  No items on this page yet. Click "Add Item" above to add content.
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
