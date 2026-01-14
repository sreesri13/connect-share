import { useState } from "react";
import { ExternalLink, Copy, Check, Save, Link2, QrCode, FileText, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ScanResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  scannedContent: string;
  onScanAnother: () => void;
}

export function ScanResultDialog({
  isOpen,
  onClose,
  scannedContent,
  onScanAnother,
}: ScanResultDialogProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isUrl = /^https?:\/\//i.test(scannedContent) || /^www\./i.test(scannedContent);
  const displayUrl = scannedContent.startsWith("www.") ? `https://${scannedContent}` : scannedContent;
  
  const getContentType = () => {
    if (isUrl) return "url";
    if (scannedContent.startsWith("mailto:")) return "email";
    if (scannedContent.startsWith("tel:")) return "phone";
    if (scannedContent.startsWith("WIFI:")) return "wifi";
    if (scannedContent.startsWith("BEGIN:VCARD")) return "vcard";
    return "text";
  };

  const getTitle = () => {
    if (isUrl) {
      try {
        const url = new URL(displayUrl);
        return url.hostname;
      } catch {
        return displayUrl.substring(0, 50);
      }
    }
    return scannedContent.substring(0, 50);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scannedContent);
      setCopied(true);
      toast({ description: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ variant: "destructive", description: "Failed to copy" });
    }
  };

  const handleOpenLink = () => {
    if (isUrl) {
      window.open(displayUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleSaveToHistory = async () => {
    if (!user) {
      toast({ 
        variant: "destructive", 
        description: "Please sign in to save scan history" 
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("scan_history").insert({
        user_id: user.id,
        scanned_content: scannedContent,
        content_type: getContentType(),
        title: getTitle(),
      });

      if (error) throw error;

      setSaved(true);
      toast({ description: "Saved to scan history" });
    } catch (err: any) {
      console.error("Failed to save scan:", err);
      toast({ 
        variant: "destructive", 
        description: "Failed to save to history" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getIcon = () => {
    switch (getContentType()) {
      case "url":
        return <Globe className="w-8 h-8 text-primary" />;
      case "email":
      case "phone":
        return <Link2 className="w-8 h-8 text-primary" />;
      default:
        return <FileText className="w-8 h-8 text-primary" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            QR Code Scanned
          </DialogTitle>
          <DialogDescription>
            {isUrl ? "A link was detected" : "Content was detected"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Content preview */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                {getIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {getTitle()}
                </p>
                <p className="text-xs text-muted-foreground mt-1 break-all line-clamp-2">
                  {scannedContent}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {isUrl && (
              <Button onClick={handleOpenLink} className="w-full gap-2">
                <ExternalLink className="w-4 h-4" />
                Open Link
              </Button>
            )}
            
            <Button variant="secondary" onClick={handleCopy} className="w-full gap-2">
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy {isUrl ? "Link" : "Content"}
                </>
              )}
            </Button>

            {user && !saved && (
              <Button 
                variant="outline" 
                onClick={handleSaveToHistory}
                disabled={isSaving}
                className="w-full gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save to History"}
              </Button>
            )}

            {saved && (
              <Button variant="outline" disabled className="w-full gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Saved to History
              </Button>
            )}
          </div>

          {/* Scan another */}
          <Button 
            variant="ghost" 
            onClick={() => {
              setSaved(false);
              onScanAnother();
            }}
            className="w-full"
          >
            Scan Another QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
