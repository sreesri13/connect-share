import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AspectRatio } from "@/components/ui/aspect-ratio";
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
}

interface Product {
  id: string;
  category_id: string;
  name: string;
  image_url: string;
  original_price: number;
  discount_price: number | null;
  description: string | null;
  status: "active" | "disabled";
}

interface BusinessProductsManagerProps {
  userId: string;
}

interface ProductFormData {
  name: string;
  category_id: string;
  original_price: string;
  discount_price: string;
  description: string;
  image_url: string;
}

const initialFormData: ProductFormData = {
  name: "",
  category_id: "",
  original_price: "",
  discount_price: "",
  description: "",
  image_url: "",
};

export const BusinessProductsManager = ({ userId }: BusinessProductsManagerProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        supabase
          .from("business_categories")
          .select("id, name")
          .eq("user_id", userId)
          .order("display_order"),
        supabase
          .from("business_products")
          .select("*")
          .eq("user_id", userId)
          .order("display_order"),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (productsRes.error) throw productsRes.error;

      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error: any) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      toast.success("Image uploaded");
    } catch (error: any) {
      toast.error("Failed to upload image");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const openCreateDialog = () => {
    if (categories.length === 0) {
      toast.error("Please create a category first");
      return;
    }
    setEditingProduct(null);
    setFormData({ ...initialFormData, category_id: categories[0].id });
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category_id: product.category_id,
      original_price: product.original_price.toString(),
      discount_price: product.discount_price?.toString() || "",
      description: product.description || "",
      image_url: product.image_url,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!formData.category_id) {
      toast.error("Category is required");
      return;
    }
    if (!formData.image_url) {
      toast.error("Product image is required");
      return;
    }
    const originalPrice = parseFloat(formData.original_price);
    if (isNaN(originalPrice) || originalPrice < 0) {
      toast.error("Valid original price is required");
      return;
    }

    const discountPrice = formData.discount_price
      ? parseFloat(formData.discount_price)
      : null;
    if (discountPrice !== null && (isNaN(discountPrice) || discountPrice < 0 || discountPrice > originalPrice)) {
      toast.error("Discount price must be less than original price");
      return;
    }

    try {
      const productData = {
        user_id: userId,
        category_id: formData.category_id,
        name: formData.name.trim(),
        image_url: formData.image_url,
        original_price: originalPrice,
        discount_price: discountPrice,
        description: formData.description.trim() || null,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("business_products")
          .update(productData)
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { error } = await supabase
          .from("business_products")
          .insert({ ...productData, display_order: products.length });
        if (error) throw error;
        toast.success("Product created");
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to save product");
      console.error(error);
    }
  };

  const toggleProductStatus = async (product: Product) => {
    const newStatus = product.status === "active" ? "disabled" : "active";
    try {
      const { error } = await supabase
        .from("business_products")
        .update({ status: newStatus })
        .eq("id", product.id);
      if (error) throw error;
      toast.success(`Product ${newStatus === "active" ? "enabled" : "disabled"}`);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update product status");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from("business_products")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;
      toast.success("Product deleted");
      setDeleteId(null);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to delete product");
      console.error(error);
    }
  };

  const getDiscountPercentage = (original: number, discount: number | null) => {
    if (!discount) return null;
    return Math.round(((original - discount) / original) * 100);
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "Unknown";
  };

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category_id === selectedCategory);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Products</CardTitle>
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Product
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Please create a category first before adding products.</p>
            </div>
          ) : (
            <>
              {/* Category filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Products grid */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No products yet. Add your first product above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => {
                    const discountPercent = getDiscountPercentage(
                      product.original_price,
                      product.discount_price
                    );
                    return (
                      <div
                        key={product.id}
                        className={`relative border rounded-lg overflow-hidden bg-card transition-opacity ${
                          product.status === "disabled" ? "opacity-50" : ""
                        }`}
                      >
                        <AspectRatio ratio={1}>
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </AspectRatio>
                        {discountPercent && (
                          <Badge className="absolute top-2 left-2 bg-destructive">
                            -{discountPercent}%
                          </Badge>
                        )}
                        <div className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate">{product.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {getCategoryName(product.category_id)}
                              </p>
                            </div>
                            <Badge variant={product.status === "active" ? "default" : "secondary"}>
                              {product.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {product.discount_price ? (
                              <>
                                <span className="font-bold text-primary">
                                  ₹{product.discount_price}
                                </span>
                                <span className="text-sm text-muted-foreground line-through">
                                  ₹{product.original_price}
                                </span>
                              </>
                            ) : (
                              <span className="font-bold">₹{product.original_price}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 pt-2 border-t">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => toggleProductStatus(product)}
                            >
                              {product.status === "active" ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(product)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Product Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Image upload */}
            <div className="space-y-2">
              <Label>Product Image *</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              {formData.image_url ? (
                <div className="relative">
                  <AspectRatio ratio={1} className="bg-muted rounded-lg overflow-hidden">
                    <img
                      src={formData.image_url}
                      alt="Product"
                      className="w-full h-full object-cover"
                    />
                  </AspectRatio>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => setFormData((prev) => ({ ...prev, image_url: "" }))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {isUploading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload product image
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max 5MB, 1:1 ratio recommended
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, category_id: val }))}
              >
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
            </div>

            {/* Product name */}
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
              />
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Original Price *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.original_price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, original_price: e.target.value }))
                  }
                  placeholder="₹0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Discount Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, discount_price: e.target.value }))
                  }
                  placeholder="₹0.00"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Enter product description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingProduct ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this product. This action cannot be undone.
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
    </>
  );
};
