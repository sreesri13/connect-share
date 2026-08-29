import { toast } from "sonner";

/**
 * Universal QR code downloader for web and native Android APK.
 * When inside Flutter InAppWebView, delegates to native file saver to save
 * directly to the "ConnectHub" folder on the device storage.
 */
export async function saveOrDownloadQRCode(
  source: HTMLCanvasElement | string,
  filename: string
): Promise<void> {
  try {
    let dataUrl = "";
    if (typeof source === "string") {
      dataUrl = source;
    } else if (source instanceof HTMLCanvasElement) {
      dataUrl = source.toDataURL("image/png", 1.0);
    }

    if (!dataUrl) {
      throw new Error("Invalid image data");
    }

    const cleanFilename = filename.endsWith(".png") ? filename : `${filename}.png`;

    // 1. Native Flutter InAppWebView Path (Mobile APK)
    if (
      typeof window !== "undefined" &&
      (window as any).flutter_inappwebview?.callHandler
    ) {
      try {
        await (window as any).flutter_inappwebview.callHandler(
          "saveQRCode",
          {
            base64Data: dataUrl,
            filename: cleanFilename,
          }
        );
        toast.success("QR Code saved to ConnectHub folder!");
        return;
      } catch (err: any) {
        console.warn("[download-utils] Native save handler fallback to browser download:", err);
      }
    }

    // 2. Standard Web Browser Path
    const downloadLink = document.createElement("a");
    downloadLink.download = cleanFilename;
    downloadLink.href = dataUrl;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success("High-Resolution QR code downloaded!");
  } catch (error: any) {
    console.error("[download-utils] Download error:", error);
    toast.error(`Failed to download QR code: ${error?.message || "Unknown error"}`);
  }
}
