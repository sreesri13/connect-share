import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, GripVertical, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

interface Category {
  id: string;
  name: string;
  display_order: number;
}

interface BusinessCategoriesManagerProps {
  userId: string;
  onUpdate?: () => void;
}

export const BusinessCategoriesManager = ({ userId, onUpdate }: BusinessCategoriesManagerProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [userId]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("business_categories")
        .select("*")
        .eq("user_id", userId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast.error("Failed to load categories");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      const { error } = await supabase.from("business_categories").insert({
        user_id: userId,
        name: newCategoryName.trim(),
        display_order: categories.length,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("A category with this name already exists");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Category created");
      setNewCategoryName("");
      fetchCategories();
      onUpdate?.();
    } catch (error: any) {
      toast.error("Failed to create category");
      console.error(error);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      const { error } = await supabase
        .from("business_categories")
        .update({ name: editingName.trim() })
        .eq("id", id);

      if (error) {
        if (error.code === "23505") {
          toast.error("A category with this name already exists");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Category updated");
      setEditingId(null);
      fetchCategories();
      onUpdate?.();
    } catch (error: any) {
      toast.error("Failed to update category");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("business_categories")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Category deleted");
      setDeleteId(null);
      fetchCategories();
      onUpdate?.();
    } catch (error: any) {
      toast.error("Failed to delete category");
      console.error(error);
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Product Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new category */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter category name..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1"
          />
          <Button onClick={handleCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Categories list */}
        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No categories yet. Create your first category above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg group"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />

                {editingId === category.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(category.id);
                        if (e.key === "Escape") cancelEditing();
                      }}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleUpdate(category.id)}
                      className="h-8 w-8"
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={cancelEditing}
                      className="h-8 w-8"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{category.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEditing(category)}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteId(category.id)}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this category and all its products.
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
      </CardContent>
    </Card>
  );
};
