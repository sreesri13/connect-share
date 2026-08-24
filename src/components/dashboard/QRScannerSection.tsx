import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Camera, 
  History, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check, 
  Globe, 
  FileText, 
  Link2,
  Loader2,
  QrCode,
  Clock,
  RefreshCw,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QRScanner } from "@/components/scanner/QRScanner";
import { ScanResultDialog } from "@/components/scanner/ScanResultDialog";
import { format } from "date-fns";

interface ScanHistoryItem {
  id: string;
  scanned_content: string;
  content_type: string;
  scanned_at: string;
  title: string | null;
}

interface QRScannerSectionProps {
  userId: string;
}

export function QRScannerSection({ userId }: QRScannerSectionProps) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("scan_history")
        .select("*")
        .eq("user_id", userId)
        .order("scanned_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Failed to fetch scan history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const handleScanSuccess = async (decodedText: string) => {
    setScanResult(decodedText);
    setIsScannerOpen(false);
    setShowResultDialog(true);

    if (userId) {
      try {
        const isUrl = /^https?:\/\//i.test(decodedText) || /^www\./i.test(decodedText);
        const contentType = isUrl
          ? "url"
          : decodedText.startsWith("mailto:")
          ? "email"
          : decodedText.startsWith("tel:")
          ? "phone"
          : decodedText.startsWith("WIFI:")
          ? "wifi"
          : "text";
        const title = isUrl
          ? (decodedText.startsWith("www.") ? `https://${decodedText}` : decodedText).substring(0, 50)
          : decodedText.substring(0, 50);

        await supabase.from("scan_history").insert({
          user_id: userId,
          scanned_content: decodedText,
          content_type: contentType,
          title: title,
        });
        fetchHistory();
      } catch (err) {
        console.error("Auto-save scan error:", err);
      }
    }
  };

  const handleDeleteScan = async (id: string) => {
    try {
      const { error } = await supabase
        .from("scan_history")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setHistory((prev) => prev.filter((item) => item.id !== id));
      toast({ description: "Scan record deleted" });
    } catch (err) {
      console.error("Failed to delete scan:", err);
      toast({ variant: "destructive", description: "Failed to delete" });
    }
  };

  const handleClearHistory = async () => {
    try {
      const { error } = await supabase
        .from("scan_history")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      setHistory([]);
      toast({ description: "Scan history cleared" });
    } catch (err) {
      console.error("Failed to clear history:", err);
      toast({ variant: "destructive", description: "Failed to clear history" });
    }
  };

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast({ description: "Copied to clipboard" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({ variant: "destructive", description: "Failed to copy" });
    }
  };

  const getIcon = (contentType: string) => {
    switch (contentType) {
      case "url":
        return <Globe className="w-4 h-4" />;
      case "email":
      case "phone":
        return <Link2 className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    
    try {
      const html5QrCode = new Html5Qrcode("qr-image-scanner-dashboard");
      const result = await html5QrCode.scanFile(file, true);
      
      setScanResult(result);
      setShowResultDialog(true);
      toast({ description: "QR Code scanned from image!" });
      
      html5QrCode.clear();

      if (userId) {
        try {
          const isUrl = /^https?:\/\//i.test(result) || /^www\./i.test(result);
          const contentType = isUrl
            ? "url"
            : result.startsWith("mailto:")
            ? "email"
            : result.startsWith("tel:")
            ? "phone"
            : result.startsWith("WIFI:")
            ? "wifi"
            : "text";
          const title = isUrl
            ? (result.startsWith("www.") ? `https://${result}` : result).substring(0, 50)
            : result.substring(0, 50);

          await supabase.from("scan_history").insert({
            user_id: userId,
            scanned_content: result,
            content_type: contentType,
            title: title,
          });
          fetchHistory();
        } catch (err) {
          console.error("Auto-save image scan error:", err);
        }
      }
    } catch (err: any) {
      console.error("Image scan error:", err);
      toast({ 
        variant: "destructive", 
        description: "Could not detect QR code in the image. Please try another image." 
      });
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden elements for image scanning */}
      <div id="qr-image-scanner-dashboard" style={{ display: "none" }} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            QR Scanner
          </h1>
          <p className="text-muted-foreground mt-1">
            Scan any QR code including highly customized designs
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => setIsScannerOpen(true)}
            size="lg"
            className="gap-2 shadow-glow"
          >
            <Camera className="w-5 h-5" />
            Scan with Camera
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingImage}
            className="gap-2"
          >
            <Upload className="w-5 h-5" />
            {isProcessingImage ? "Processing..." : "Upload Image"}
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <QrCode className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Powerful QR Scanner</h3>
            <p className="text-sm text-muted-foreground">
              Scan with camera or upload an image. Works with customized QR codes that other scanners can't recognize.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Scan History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-lg">Scan History</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchHistory}
                className="min-h-[36px] min-w-[36px]"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              {history.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear scan history?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all your scan records. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearHistory}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
          <CardDescription>
            Your recently scanned QR codes are saved here
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No scans yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Scan a QR code to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const isUrl = item.content_type === "url";
                const displayUrl = item.scanned_content.startsWith("www.")
                  ? `https://${item.scanned_content}`
                  : item.scanned_content;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                      {getIcon(item.content_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.title || item.scanned_content.substring(0, 50)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(item.scanned_at), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(displayUrl, "_blank", "noopener,noreferrer")}
                          className="min-h-[36px] min-w-[36px]"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(item.scanned_content, item.id)}
                        className="min-h-[36px] min-w-[36px]"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-h-[36px] min-w-[36px] text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete scan record?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this scan record.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteScan(item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanner Modal */}
      <QRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        onUploadClick={() => {
          setIsScannerOpen(false);
          setTimeout(() => fileInputRef.current?.click(), 100);
        }}
      />

      {/* Result Dialog */}
      {scanResult && (
        <ScanResultDialog
          isOpen={showResultDialog}
          onClose={() => {
            setShowResultDialog(false);
            setScanResult(null);
            fetchHistory();
          }}
          scannedContent={scanResult}
          onScanAnother={() => {
            setShowResultDialog(false);
            setScanResult(null);
            setIsScannerOpen(true);
          }}
        />
      )}
    </div>
  );
}
