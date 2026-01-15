import { useState, useCallback, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { QRScanner } from "./QRScanner";
import { ScanLine, ExternalLink, Copy, Check, X, Link2, Upload, Camera } from "lucide-react";
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

interface PublicQRScannerProps {
  variant?: "button" | "nav";
}

export function PublicQRScanner({ variant = "button" }: PublicQRScannerProps) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    
    try {
      const html5QrCode = new Html5Qrcode("qr-image-scanner-temp");
      const result = await html5QrCode.scanFile(file, true);
      
      const contentType = detectContentType(result);
      setScanResult({
        content: result,
        contentType,
        timestamp: new Date(),
      });
      
      toast.success("QR Code scanned from image!");
      
      // Clean up
      html5QrCode.clear();
    } catch (err: any) {
      console.error("Image scan error:", err);
      toast.error("Could not detect QR code in the image. Please try another image.");
    } finally {
      setIsProcessingImage(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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
      {/* Hidden element for image scanning */}
      <div id="qr-image-scanner-temp" style={{ display: "none" }} />
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {variant === "nav" ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsScannerOpen(true)}
          className="min-h-[44px] px-3 sm:px-4"
        >
          <ScanLine className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Scan</span>
        </Button>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsScannerOpen(true)}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-[56px] bg-background/50 backdrop-blur-sm border-primary/30 hover:border-primary hover:bg-primary/10"
          >
            <Camera className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
            Scan with Camera
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingImage}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-[56px] bg-background/50 backdrop-blur-sm border-primary/30 hover:border-primary hover:bg-primary/10"
          >
            <Upload className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
            {isProcessingImage ? "Processing..." : "Upload QR Image"}
          </Button>
        </div>
      )}

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        onUploadClick={() => {
          setIsScannerOpen(false);
          setTimeout(() => fileInputRef.current?.click(), 100);
        }}
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
