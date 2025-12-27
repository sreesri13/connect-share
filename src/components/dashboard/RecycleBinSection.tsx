import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, RefreshCw, Calendar, Loader2, AlertTriangle, QrCode, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, addDays, isPast } from "date-fns";

interface DeletedQRPage {
  id: string;
  public_id: string;
  title: string | null;
  created_at: string;
  deleted_at: string;
  expires_at: string | null;
  item_count: number;
  is_expired: boolean;
}

interface RecycleBinSectionProps {
  userId: string;
}

export const RecycleBinSection = ({ userId }: RecycleBinSectionProps) => {
  const [deletedItems, setDeletedItems] = useState<DeletedQRPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    fetchDeletedItems();
  }, [userId]);

  const fetchDeletedItems = async () => {
    try {
      const { data, error } = await supabase
        .from("qr_pages")
        .select(`
          id,
          public_id,
          title,
          created_at,
          deleted_at,
          expires_at,
          qr_page_items (id)
        `)
        .eq("user_id", userId)
        .eq("is_deleted", true)
        .order("deleted_at", { ascending: false });

      if (error) throw error;

      const items = (data || []).map((page: any) => ({
        id: page.id,
        public_id: page.public_id,
        title: page.title,
        created_at: page.created_at,
        deleted_at: page.deleted_at,
        expires_at: page.expires_at,
        item_count: page.qr_page_items?.length || 0,
        is_expired: page.expires_at ? isPast(new Date(page.expires_at)) : false,
      }));

      setDeletedItems(items);
    } catch (error) {
      toast.error("Failed to load deleted items");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const item = deletedItems.find((i) => i.id === id);
      
      const { error } = await supabase
        .from("qr_pages")
        .update({ 
          is_deleted: false, 
          deleted_at: null,
          // If it was expired, make it permanent (no expiration)
          expires_at: item?.is_expired ? null : item?.expires_at
        })
        .eq("id", id);

      if (error) throw error;

      setDeletedItems(deletedItems.filter((i) => i.id !== id));
      toast.success(item?.is_expired 
        ? "QR code restored as permanent (expiration removed)" 
        : "QR code restored successfully"
      );
    } catch (error) {
      toast.error("Failed to restore QR code");
      console.error(error);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await supabase.from("qr_page_items").delete().eq("qr_page_id", id);
      const { error } = await supabase.from("qr_pages").delete().eq("id", id);
      if (error) throw error;

      setDeletedItems(deletedItems.filter((i) => i.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("QR code permanently deleted");
    } catch (error) {
      toast.error("Failed to delete QR code");
      console.error(error);
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsRestoring(true);
    try {
      for (const id of selectedIds) {
        const item = deletedItems.find((i) => i.id === id);
        await supabase
          .from("qr_pages")
          .update({ 
            is_deleted: false, 
            deleted_at: null,
            expires_at: item?.is_expired ? null : item?.expires_at
          })
          .eq("id", id);
      }
      setDeletedItems(deletedItems.filter((i) => !selectedIds.has(i.id)));
      toast.success(`${selectedIds.size} QR code(s) restored`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error("Failed to restore QR codes");
      console.error(error);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      for (const id of selectedIds) {
        await supabase.from("qr_page_items").delete().eq("qr_page_id", id);
        await supabase.from("qr_pages").delete().eq("id", id);
      }
      setDeletedItems(deletedItems.filter((i) => !selectedIds.has(i.id)));
      toast.success(`${selectedIds.size} QR code(s) permanently deleted`);
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
    if (selectedIds.size === deletedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deletedItems.map((i) => i.id)));
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    const deleteDate = new Date(deletedAt);
    const autoDeleteDate = addDays(deleteDate, 30);
    return formatDistanceToNow(autoDeleteDate, { addSuffix: true });
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
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Recycle Bin
          </CardTitle>
          <CardDescription>
            Deleted and expired QR codes are stored here for 30 days before permanent deletion.
            Restored expired QR codes will become permanent (no expiration).
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Actions */}
      {deletedItems.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleSelectAll} className="min-h-[44px] text-xs sm:text-sm">
              {selectedIds.size === deletedItems.length ? "Deselect" : "Select All"}
            </Button>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreSelected}
                disabled={isRestoring}
                className="min-h-[44px]"
              >
                {isRestoring ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <RefreshCw className="w-4 h-4 sm:mr-2" />}
                <span className="hidden sm:inline">Restore ({selectedIds.size})</span>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                    className="min-h-[44px]"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <Trash2 className="w-4 h-4 sm:mr-2" />}
                    <span className="hidden sm:inline">Delete Forever ({selectedIds.size})</span>
                    <span className="sm:hidden">{selectedIds.size}</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Delete Permanently?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {selectedIds.size} QR code(s). This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSelected}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete Forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      )}

      {deletedItems.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <Trash2 className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Recycle bin is empty</h3>
          <p className="text-sm sm:text-base text-muted-foreground">
            Deleted and expired QR codes will appear here
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {deletedItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`hover:border-destructive/30 transition-colors ${selectedIds.has(item.id) ? "border-destructive bg-destructive/5" : ""}`}>
                <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      className="flex-shrink-0"
                    />
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground truncate text-sm sm:text-base">
                          {item.title || `QR Code`}
                        </h3>
                        {item.is_expired && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 flex-shrink-0">
                            Expired
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Deleted {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })}
                        </span>
                        <span>{item.item_count} items</span>
                      </div>
                      <p className="text-xs text-destructive/70 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Auto-deletes {getDaysRemaining(item.deleted_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end sm:justify-start ml-auto sm:ml-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(item.id)}
                      className="min-h-[40px]"
                    >
                      <RefreshCw className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Restore</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive min-h-[40px]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this QR code and all its items. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handlePermanentDelete(item.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete Forever
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
