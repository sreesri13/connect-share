import { useState, useEffect, useRef } from "react";
import { Trash2, Download, Copy, ExternalLink, Eye, MoreVertical, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CustomQRCode } from "@/components/qr/CustomQRCode";
import { defaultQRStyle, QRStyleConfig } from "@/lib/qr-styles";
import { format } from "date-fns";
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
}

interface BusinessQRListProps {
  userId: string;
}

export const BusinessQRList = ({ userId }: BusinessQRListProps) => {
  const [pages, setPages] = useState<BusinessQRPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const qrRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    fetchPages();
  }, [userId]);

  const fetchPages = async () => {
    try {
      const { data: pagesData, error: pagesError } = await supabase
        .from("qr_business_pages")
        .select("id, public_id, title, style_config, is_deleted, created_at")
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

  const handleDownload = (page: BusinessQRPage) => {
    const ref = qrRefs.current.get(page.id);
    if (!ref) return;

    const canvas = ref.querySelector("canvas");
    if (!canvas) {
      toast.error("QR code not ready");
      return;
    }

    // Create high-res version by default
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
        <CardHeader>
          <CardTitle className="text-lg">Generated QR Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page) => {
              const url = `${window.location.origin}/business/${page.public_id}`;
              const styleConfig = page.style_config || defaultQRStyle;

              return (
                <div
                  key={page.id}
                  className="border rounded-lg p-4 space-y-3 bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium text-sm truncate">
                        {page.title || "Untitled"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(page.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                      onClick={() => handleOpenPage(page)}
                      className="text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
    </>
  );
};
