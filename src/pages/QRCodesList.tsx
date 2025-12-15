import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { QrCode, ExternalLink, Trash2, Calendar, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface QRPage {
  id: string;
  public_id: string;
  title: string | null;
  created_at: string;
  item_count: number;
}

const QRCodesList = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [qrPages, setQrPages] = useState<QRPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      }));

      setQrPages(pages);
    } catch (error) {
      toast.error("Failed to load QR codes");
      console.error(error);
    } finally {
      setIsLoading(false);
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
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <QrCode className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">
                        {page.title || `QR Code`}
                      </h3>
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
    </div>
  );
};

export default QRCodesList;
