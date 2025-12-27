import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Folder,
  Link as LinkIcon,
  FileText,
  Image,
  Video,
  Music,
  File,
  MoreVertical,
  Edit2,
  Trash2,
  GripVertical,
  QrCode,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload } from "@/components/FileUpload";
import { useNavigate } from "react-router-dom";

interface Item {
  id: string;
  title: string;
  type: "url" | "text" | "pdf" | "image" | "video" | "audio" | "others";
  content: string;
  selected: boolean;
  category_id: string;
  display_order: number;
}

interface Category {
  id: string;
  name: string;
  items: Item[];
  display_order: number;
}

const itemTypeIcons: Record<Item["type"], any> = {
  url: LinkIcon,
  text: FileText,
  pdf: File,
  image: Image,
  video: Video,
  audio: Music,
  others: File,
};

interface ProfileSectionProps {
  userId: string;
}

export const ProfileSection = ({ userId }: ProfileSectionProps) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ title: "", type: "url" as Item["type"], content: "" });

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const { data: categoriesData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId)
        .order("display_order", { ascending: true });

      if (catError) throw catError;

      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", userId)
        .order("display_order", { ascending: true });

      if (itemsError) throw itemsError;

      const categoriesWithItems = (categoriesData || []).map((cat) => ({
        ...cat,
        items: (itemsData || [])
          .filter((item) => item.category_id === cat.id)
          .map((item) => ({ ...item, selected: selectedItems.has(item.id) })),
      }));

      setCategories(categoriesWithItems);
    } catch (error: any) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          user_id: userId,
          name: newCategoryName.trim(),
          display_order: categories.length,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("Category already exists");
        } else {
          throw error;
        }
        return;
      }

      setCategories([...categories, { ...data, items: [] }]);
      setNewCategoryName("");
      setIsAddCategoryOpen(false);
      toast.success("Category created!");
    } catch (error: any) {
      toast.error("Failed to create category");
    }
  };

  const handleAddItem = async () => {
    if (!selectedCategoryId || !newItem.title.trim() || !newItem.content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const category = categories.find((c) => c.id === selectedCategoryId);
    if (!category) return;

    try {
      const { data, error } = await supabase
        .from("items")
        .insert({
          user_id: userId,
          category_id: selectedCategoryId,
          title: newItem.title.trim(),
          type: newItem.type,
          content: newItem.content.trim(),
          display_order: category.items.length,
        })
        .select()
        .single();

      if (error) throw error;

      setCategories(
        categories.map((cat) => {
          if (cat.id === selectedCategoryId) {
            return { ...cat, items: [...cat.items, { ...data, selected: false }] };
          }
          return cat;
        })
      );

      setNewItem({ title: "", type: "url", content: "" });
      setSelectedCategoryId(null);
      setIsAddItemOpen(false);
      toast.success("Item added!");
    } catch (error: any) {
      toast.error("Failed to add item");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", categoryId);
      if (error) throw error;

      setCategories(categories.filter((c) => c.id !== categoryId));
      toast.success("Category deleted");
    } catch (error: any) {
      toast.error("Failed to delete category");
    }
  };

  const handleDeleteItem = async (categoryId: string, itemId: string) => {
    try {
      const { error } = await supabase.from("items").delete().eq("id", itemId);
      if (error) throw error;

      setCategories(
        categories.map((cat) => {
          if (cat.id === categoryId) {
            return { ...cat, items: cat.items.filter((i) => i.id !== itemId) };
          }
          return cat;
        })
      );

      setSelectedItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      toast.success("Item deleted");
    } catch (error: any) {
      toast.error("Failed to delete item");
    }
  };

  const handleEditCategory = async (categoryId: string) => {
    if (!editingCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      const { error } = await supabase
        .from("categories")
        .update({ name: editingCategoryName.trim() })
        .eq("id", categoryId);

      if (error) throw error;

      setCategories(
        categories.map((cat) =>
          cat.id === categoryId ? { ...cat, name: editingCategoryName.trim() } : cat
        )
      );
      setEditingCategoryId(null);
      setEditingCategoryName("");
      toast.success("Category renamed!");
    } catch (error: any) {
      toast.error("Failed to rename category");
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

      setCategories(
        categories.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === editingItem.id ? { ...editingItem, selected: selectedItems.has(editingItem.id) } : item
          ),
        }))
      );
      setIsEditItemOpen(false);
      setEditingItem(null);
      toast.success("Item updated!");
    } catch (error: any) {
      toast.error("Failed to update item");
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleCategorySelection = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    const categoryItemIds = category.items.map((item) => item.id);
    const allSelected = categoryItemIds.every((id) => selectedItems.has(id));

    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        categoryItemIds.forEach((id) => next.delete(id));
      } else {
        categoryItemIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const isCategorySelected = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category || category.items.length === 0) return false;
    return category.items.every((item) => selectedItems.has(item.id));
  };

  const isCategoryPartiallySelected = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category || category.items.length === 0) return false;
    const selectedCount = category.items.filter((item) => selectedItems.has(item.id)).length;
    return selectedCount > 0 && selectedCount < category.items.length;
  };

  const selectAll = () => {
    const allItemIds = categories.flatMap((cat) => cat.items.map((item) => item.id));
    setSelectedItems(new Set(allItemIds));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleGenerateQR = () => {
    if (selectedItems.size === 0) {
      toast.error("Please select at least one item");
      return;
    }
    const itemIds = Array.from(selectedItems);
    navigate(`/qr?items=${itemIds.join(",")}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">My Profile</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your categories and items</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-[40px]">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Category</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>Add a new category to organize your items.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                  className="min-h-[44px]"
                />
                <Button onClick={handleAddCategory} className="w-full min-h-[44px]">
                  Create Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
            <DialogTrigger asChild>
              <Button disabled={categories.length === 0} size="sm" className="min-h-[44px] sm:min-h-[40px]">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Item</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
                <DialogDescription>Add a new item to one of your categories.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Select value={selectedCategoryId || ""} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Item title"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="min-h-[44px]"
                />
                <Select
                  value={newItem.type}
                  onValueChange={(v) => setNewItem({ ...newItem, type: v as Item["type"], content: "" })}
                >
                  <SelectTrigger className="min-h-[44px]">
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

                {["pdf", "image", "video", "audio", "others"].includes(newItem.type) ? (
                  <FileUpload
                    type={newItem.type as "pdf" | "image" | "video" | "audio" | "others"}
                    userId={userId}
                    value={newItem.content}
                    onUploadComplete={(url) => setNewItem({ ...newItem, content: url })}
                  />
                ) : newItem.type === "text" ? (
                  <Textarea
                    placeholder="Enter text content (supports multiple lines)"
                    value={newItem.content}
                    onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                    rows={5}
                  />
                ) : (
                  <Input
                    placeholder="https://..."
                    value={newItem.content}
                    onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                    className="min-h-[44px]"
                  />
                )}

                <Button onClick={handleAddItem} className="w-full min-h-[44px]" disabled={!newItem.content}>
                  Add Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Selection Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl glass border-border/50"
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <span className="text-sm text-muted-foreground">
            <span className="text-primary font-semibold">{selectedItems.size}</span> items selected
          </span>
          <div className="flex gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll} className="min-h-[36px] px-2 sm:px-3">
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll} className="min-h-[36px] px-2 sm:px-3">
              Deselect All
            </Button>
          </div>
        </div>
        <Button onClick={handleGenerateQR} disabled={selectedItems.size === 0} size="sm" className="w-full sm:w-auto min-h-[44px]">
          <QrCode className="w-4 h-4 mr-2" />
          Generate QR Code
        </Button>
      </motion.div>

      {/* Categories */}
      {categories.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Folder className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No categories yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first category to start organizing your profile.
          </p>
          <Button onClick={() => setIsAddCategoryOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Category
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {categories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="overflow-hidden hover:border-primary/30 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between bg-secondary/30 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isCategorySelected(category.id)}
                        ref={(el) => {
                          if (el && isCategoryPartiallySelected(category.id)) {
                            el.dataset.state = "indeterminate";
                          }
                        }}
                        onCheckedChange={() => toggleCategorySelection(category.id)}
                        disabled={category.items.length === 0}
                      />
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Folder className="w-5 h-5 text-primary" />
                      </div>
                      {editingCategoryId === category.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="h-8 w-40"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditCategory(category.id);
                              if (e.key === "Escape") {
                                setEditingCategoryId(null);
                                setEditingCategoryName("");
                              }
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditCategory(category.id)}>
                            <Check className="w-4 h-4 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingCategoryId(null); setEditingCategoryName(""); }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {category.items.length} item{category.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingCategoryId(category.id);
                            setEditingCategoryName(category.name);
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="p-0">
                    {category.items.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">No items in this category yet.</div>
                    ) : (
                      <ul className="divide-y divide-border/50">
                        {category.items.map((item) => {
                          const Icon = itemTypeIcons[item.type];
                          return (
                            <li
                              key={item.id}
                              className="flex items-center gap-4 p-4 hover:bg-secondary/20 transition-colors"
                            >
                              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={() => toggleItemSelection(item.id)}
                              />
                              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground">{item.title}</p>
                                <p className="text-sm text-muted-foreground truncate">{item.content}</p>
                              </div>
                              <span className="px-2 py-1 text-xs font-medium rounded-md bg-secondary text-muted-foreground uppercase">
                                {item.type}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingItem({ ...item });
                                      setIsEditItemOpen(true);
                                    }}
                                  >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteItem(category.id, item.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemOpen} onOpenChange={(open) => { setIsEditItemOpen(open); if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update the item details below.</DialogDescription>
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
                onValueChange={(v) => setEditingItem({ ...editingItem, type: v as Item["type"], content: "" })}
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

              {["pdf", "image", "video", "audio", "others"].includes(editingItem.type) ? (
                <FileUpload
                  type={editingItem.type as "pdf" | "image" | "video" | "audio" | "others"}
                  userId={userId}
                  value={editingItem.content}
                  onUploadComplete={(url) => setEditingItem({ ...editingItem, content: url })}
                />
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
