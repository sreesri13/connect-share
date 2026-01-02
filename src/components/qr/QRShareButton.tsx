import { Share2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QRShareButtonProps {
  qrCanvasId: string;
  title?: string;
  url: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
}

export const QRShareButton = ({
  qrCanvasId,
  title = "QR Code",
  url,
  variant = "outline",
  size = "sm",
  className,
}: QRShareButtonProps) => {
  const handleShare = async () => {
    try {
      const canvas = document.getElementById(qrCanvasId) as HTMLCanvasElement;
      if (!canvas) {
        toast.error("QR code not ready");
        return;
      }

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );

      if (!blob) {
        toast.error("Failed to prepare QR code");
        return;
      }

      const file = new File([blob], `${title.replace(/\s+/g, "-")}-qr.png`, {
        type: "image/png",
      });

      const shareText = `📱 Scan this QR code to access: ${title}\n\n🔗 ${url}`;

      // Check if Web Share API is available with file sharing
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${title} - QR Code`,
          text: shareText,
          files: [file],
        });
        toast.success("Shared successfully!");
      } else if (navigator.share) {
        // Fallback: share without file
        await navigator.share({
          title: `${title} - QR Code`,
          text: shareText,
          url: url,
        });
        toast.success("Shared successfully!");
      } else {
        // Desktop fallback: copy to clipboard and show options
        await navigator.clipboard.writeText(`${shareText}`);
        
        // Open WhatsApp web as primary option
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, "_blank");
        
        toast.success("Link copied! Opening WhatsApp...");
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        // User didn't cancel, try clipboard fallback
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied to clipboard!");
        } catch {
          toast.error("Failed to share");
        }
      }
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={`min-h-[44px] ${className || ''}`}
    >
      <Share2 className="w-4 h-4 mr-1" />
      Share
    </Button>
  );
};
