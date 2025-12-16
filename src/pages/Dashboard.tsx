import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  QrCode,
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
  ChevronRight,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload } from "@/components/FileUpload";

// Types
interface Item {
  id: string;
  title: string;
  type: "url" | "text" | "pdf" | "image" | "video" | "audio";
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

interface Profile {
  display_name: string | null;
  bio: string | null;
}

const itemTypeIcons = {
  url: LinkIcon,
  text: FileText,
  pdf: File,
  image: Image,
  video: Video,
  audio: Music,
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ title: "", type: "url" as Item["type"], content: "" });

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !authLoading) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch profile and data
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, bio")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setProfile(profileData);

      // Fetch categories with items
      const { data: categoriesData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order", { ascending: true });

      if (catError) throw catError;

      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order", { ascending: true });

      if (itemsError) throw itemsError;

      // Combine categories with their items
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
    if (!newCategoryName.trim() || !user) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
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
    if (!selectedCategoryId || !newItem.title.trim() || !newItem.content.trim() || !user) {
      toast.error("Please fill in all fields");
      return;
    }

    const category = categories.find((c) => c.id === selectedCategoryId);
    if (!category) return;

    try {
      const { data, error } = await supabase
        .from("items")
        .insert({
          user_id: user.id,
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
    // Store selected items and navigate to QR generator
    const itemIds = Array.from(selectedItems);
    navigate(`/qr?items=${itemIds.join(",")}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border p-4 flex flex-col z-50">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <QrCode className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">
            Connect<span className="text-gradient-primary">HUB</span>
          </span>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarLink icon={<Folder />} label="My Profile" active />
          <SidebarLink icon={<QrCode />} label="QR Codes" onClick={() => navigate("/qr-list")} />
          <SidebarLink icon={<Settings />} label="Settings" />
        </nav>

        <div className="pt-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sidebar-accent transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {userInitials}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">My Profile</h1>
              <p className="text-muted-foreground">Manage your categories and items</p>
            </div>
            <div className="flex items-center gap-3">
              <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
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
                    />
                    <Button onClick={handleAddCategory} className="w-full">
                      Create Category
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                <DialogTrigger asChild>
                  <Button disabled={categories.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Item</DialogTitle>
                    <DialogDescription>Add a new item to one of your categories.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <Select value={selectedCategoryId || ""} onValueChange={setSelectedCategoryId}>
                      <SelectTrigger>
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
                    />
                    <Select
                      value={newItem.type}
                      onValueChange={(v) => setNewItem({ ...newItem, type: v as Item["type"], content: "" })}
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
                    
                    {/* Show FileUpload for file types, Input for url/text */}
                    {["pdf", "image", "video", "audio"].includes(newItem.type) ? (
                      <FileUpload
                        type={newItem.type as "pdf" | "image" | "video" | "audio"}
                        userId={user?.id || ""}
                        value={newItem.content}
                        onUploadComplete={(url) => setNewItem({ ...newItem, content: url })}
                      />
                    ) : (
                      <Input
                        placeholder={newItem.type === "url" ? "https://..." : "Enter text content"}
                        value={newItem.content}
                        onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                      />
                    )}
                    
                    <Button onClick={handleAddItem} className="w-full" disabled={!newItem.content}>
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
            className="flex items-center justify-between p-4 mb-6 rounded-xl glass border-border/50"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                <span className="text-primary font-semibold">{selectedItems.size}</span> items selected
              </span>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
            <Button onClick={handleGenerateQR} disabled={selectedItems.size === 0}>
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
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Folder className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {category.items.length} item{category.items.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
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
                                      <DropdownMenuItem>
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
        </div>
      </main>
    </div>
  );
};

const SidebarLink = ({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
      active ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"
    }`}
  >
    <span className={active ? "text-sidebar-primary" : "text-muted-foreground"}>{icon}</span>
    <span className="font-medium">{label}</span>
  </button>
);

export default Dashboard;
