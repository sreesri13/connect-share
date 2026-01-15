import { useState, useCallback } from "react";
import { QRScanner } from "./QRScanner";
import { ScanLine, ExternalLink, Copy, Check, X, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ScanResult {
  content: string;
  contentType: "url" | "text" | "email" | "phone" | "wifi" | "other";
  timestamp: Date;
}

export function PublicQRScanner() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [copied, setCopied] = useState(false);

  const detectContentType = (content: string): ScanResult["contentType"] => {
    if (content.match(/^https?:\/\//i)) return "url";
    if (content.match(/^mailto:/i)) return "email";
    if (content.match(/^tel:/i)) return "phone";
    if (content.match(/^WIFI:/i)) return "wifi";
    if (content.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) return "email";
    return "other";
  };

  const handleScanSuccess = useCallback((decodedText: string) => {
    const contentType = detectContentType(decodedText);
    setScanResult({
      content: decodedText,
      contentType,
      timestamp: new Date(),
    });
    setIsScannerOpen(false);
    toast.success("QR Code scanned successfully!");
  }, []);

  const handleCopy = async () => {
    if (!scanResult) return;
    try {
      await navigator.clipboard.writeText(scanResult.content);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleOpenLink = () => {
    if (!scanResult) return;
    let url = scanResult.content;
    
    if (scanResult.contentType === "email" && !url.startsWith("mailto:")) {
      url = `mailto:${url}`;
    } else if (scanResult.contentType === "phone" && !url.startsWith("tel:")) {
      url = `tel:${url}`;
    }
    
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleClose = () => {
    setScanResult(null);
    setCopied(false);
  };

  const handleScanAnother = () => {
    setScanResult(null);
    setCopied(false);
    setIsScannerOpen(true);
  };

  const getContentTypeLabel = (type: ScanResult["contentType"]) => {
    switch (type) {
      case "url": return "Website URL";
      case "email": return "Email Address";
      case "phone": return "Phone Number";
      case "wifi": return "WiFi Configuration";
      case "text": return "Text Content";
      default: return "Content";
    }
  };

  const isOpenable = scanResult?.contentType === "url" || 
                     scanResult?.contentType === "email" || 
                     scanResult?.contentType === "phone";

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setIsScannerOpen(true)}
        className="w-full sm:w-auto min-h-[48px] sm:min-h-[56px] bg-background/50 backdrop-blur-sm border-primary/30 hover:border-primary hover:bg-primary/10"
      >
        <ScanLine className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
        Scan QR Code
      </Button>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Scan Result Dialog */}
      <Dialog open={!!scanResult} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Link2 className="w-4 h-4 text-primary" />
              </div>
              Scan Result
            </DialogTitle>
          </DialogHeader>

          {scanResult && (
            <div className="space-y-4">
              {/* Content Type Badge */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                  {getContentTypeLabel(scanResult.contentType)}
                </span>
              </div>

              {/* Content Display */}
              <div className="p-4 rounded-lg bg-muted border border-border">
                <p className="text-sm break-all text-foreground font-mono">
                  {scanResult.content}
                </p>
              </div>

              {/* Info Notice */}
              <p className="text-xs text-muted-foreground text-center">
                ℹ️ Sign in to save scan history and access more features
              </p>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                {isOpenable && (
                  <Button onClick={handleOpenLink} className="flex-1">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {scanResult.contentType === "url" ? "Open Link" : 
                     scanResult.contentType === "email" ? "Send Email" : "Call"}
                  </Button>
                )}
                <Button variant="outline" onClick={handleCopy} className="flex-1">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button variant="ghost" onClick={handleScanAnother} className="flex-1">
                  <ScanLine className="w-4 h-4 mr-2" />
                  Scan Another
                </Button>
                <Button variant="ghost" onClick={handleClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
