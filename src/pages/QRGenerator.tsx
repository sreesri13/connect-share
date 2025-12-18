import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Download, Copy, ArrowLeft, Check, ExternalLink, Share2, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { hashPassword } from "@/lib/crypto";

interface ItemWithCategory {
  id: string;
  title: string;
  type: string;
  content: string;
  category_name: string;
}

const QRGenerator = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ItemWithCategory[]>([]);
  const [qrPageId, setQrPageId] = useState<string | null>(null);
  const [qrTitle, setQrTitle] = useState("");
  
  // Password protection
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !authLoading) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch selected items
  useEffect(() => {
    const itemIds = searchParams.get("items")?.split(",") || [];
    if (itemIds.length > 0 && user) {
      fetchItems(itemIds);
    } else {
      setIsLoading(false);
    }
  }, [searchParams, user]);

  const fetchItems = async (itemIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select(`
          id,
          title,
          type,
          content,
          categories (name)
        `)
        .in("id", itemIds);

      if (error) throw error;

      const itemsWithCategory = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        content: item.content,
        category_name: item.categories?.name || "Unknown",
      }));

      setSelectedItems(itemsWithCategory);
    } catch (error) {
      toast.error("Failed to load items");
    } finally {
      setIsLoading(false);
    }
  };

  const generatePublicId = () => {
    return Math.random().toString(36).substring(2, 10);
  };

  const handleSaveQR = async () => {
    if (!user || selectedItems.length === 0) return;

    if (enablePassword && !password.trim()) {
      toast.error("Please enter a password");
      return;
    }

    setIsSaving(true);
    try {
      const publicId = generatePublicId();

      // Hash password if enabled using client-side hashing
      let passwordHash = null;
      if (enablePassword && password.trim()) {
        passwordHash = hashPassword(password.trim());
      }

      // Create QR page
      const { data: qrPage, error: qrError } = await supabase
        .from("qr_pages")
        .insert({
          user_id: user.id,
          public_id: publicId,
          title: qrTitle || `QR ${new Date().toLocaleDateString()}`,
          password_hash: passwordHash,
        })
        .select()
        .single();

      if (qrError) throw qrError;

      // Add items to QR page
      const qrPageItems = selectedItems.map((item, index) => ({
        qr_page_id: qrPage.id,
        item_id: item.id,
        display_order: index,
      }));

      const { error: itemsError } = await supabase.from("qr_page_items").insert(qrPageItems);

      if (itemsError) throw itemsError;

      setQrPageId(publicId);
      toast.success("QR code saved successfully!");
    } catch (error: any) {
      toast.error("Failed to save QR code");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const publicUrl = qrPageId 
    ? `${window.location.origin}/p/${qrPageId}` 
    : "";
  
  const handleDownloadQR = () => {
    if (!qrPageId) {
      toast.error("Please save the QR code first");
      return;
    }
    
    const svg = document.querySelector("#qr-code-svg");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new window.Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `connecthub-qr-${qrPageId}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success("QR code downloaded!");
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const handleCopyUrl = () => {
    if (!qrPageId) {
      toast.error("Please save the QR code first");
      return;
    }
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Group items by category
  const groupedItems = selectedItems.reduce((acc, item) => {
    if (!acc[item.category_name]) {
      acc[item.category_name] = [];
    }
    acc[item.category_name].push(item);
    return acc;
  }, {} as Record<string, ItemWithCategory[]>);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
        <Card className="max-w-md text-center p-8">
          <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">No items selected</h2>
          <p className="text-muted-foreground mb-6">
            Go back to your dashboard and select items to generate a QR code.
          </p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero p-6 md:p-12">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Generate QR Code</h1>
            <p className="text-muted-foreground">Share your selected content with a single scan</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* QR Code Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden">
              <CardHeader className="text-center">
                <CardTitle>Your QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6 pb-8">
                {qrPageId ? (
                  <div className="p-6 bg-foreground rounded-2xl shadow-elevated">
                    <QRCodeSVG
                      id="qr-code-svg"
                      value={publicUrl}
                      size={200}
                      level="H"
                      includeMargin
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                ) : (
                  <div className="p-6 bg-secondary/50 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center w-[232px] h-[232px]">
                    <QrCode className="w-16 h-16 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground text-center">
                      Click "Generate QR Code" to create your shareable link
                    </p>
                  </div>
                )}

                {!qrPageId && (
                  <div className="w-full space-y-4">
                    <Input
                      placeholder="QR Code title (optional)"
                      value={qrTitle}
                      onChange={(e) => setQrTitle(e.target.value)}
                    />
                    
                    {/* Password Protection Option */}
                    <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="enablePassword"
                          checked={enablePassword}
                          onCheckedChange={(checked) => setEnablePassword(checked as boolean)}
                        />
                        <Label htmlFor="enablePassword" className="flex items-center gap-2 cursor-pointer">
                          <Lock className="w-4 h-4 text-primary" />
                          Password protect this QR code
                        </Label>
                      </div>
                      
                      {enablePassword && (
                        <div className="relative mt-2">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <Button onClick={handleSaveQR} className="w-full" disabled={isSaving}>
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 mr-2" />
                          Generate QR Code
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {qrPageId && (
                  <div className="w-full space-y-3">
                    {enablePassword && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-primary text-sm">
                        <Lock className="w-4 h-4" />
                        This QR code is password protected
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                      <input
                        type="text"
                        value={publicUrl}
                        readOnly
                        className="flex-1 bg-transparent text-sm text-foreground outline-none"
                      />
                      <Button variant="ghost" size="sm" onClick={handleCopyUrl}>
                        {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={handleDownloadQR}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => window.open(publicUrl, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Selected Items Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-primary" />
                  Shared Content ({selectedItems.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                {Object.entries(groupedItems).map(([categoryName, items]) => (
                  <div key={categoryName} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">{categoryName}</h4>
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30"
                        >
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <QrCode className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                          </div>
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-secondary text-muted-foreground uppercase">
                            {item.type}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;
