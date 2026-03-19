import { useState, useEffect } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface BusinessInstallPromptProps {
  businessName: string;
  logoUrl?: string | null;
  pageUrl?: string;
  storeSlug?: string | null;
}

// Dynamically inject a manifest for this specific business page
const injectDynamicManifest = (
  businessName: string,
  logoUrl: string | null | undefined,
  pagePath: string,
  storeSlug?: string | null
) => {
  // Remove any existing manifest link
  const existingManifest = document.querySelector('link[rel="manifest"]');
  if (existingManifest) {
    existingManifest.remove();
  }

  const icons: any[] = [];

  if (logoUrl) {
    icons.push(
      { src: logoUrl, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: logoUrl, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: logoUrl, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: logoUrl, sizes: "512x512", type: "image/png", purpose: "maskable" }
    );
  } else {
    icons.push(
      { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" }
    );
  }

  const storePath = storeSlug ? `/store/${storeSlug}` : pagePath;
  const startUrl = storeSlug ? `/store/${storeSlug}` : pagePath;
  const storeScope = storeSlug ? `/store/${storeSlug}/` : "/";

  const manifest = {
    id: storeSlug ? `/store/${storeSlug}` : pagePath,
    name: businessName,
    short_name: businessName.length > 12 ? businessName.substring(0, 12) : businessName,
    description: `Shop at ${businessName}`,
    theme_color: "#7C3AED",
    background_color: "#0F0F23",
    display: "standalone",
    orientation: "portrait-primary",
    scope: storeScope,
    start_url: startUrl,
    icons,
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
  const manifestUrl = URL.createObjectURL(blob);

  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = manifestUrl;
  document.head.appendChild(link);

  document.title = businessName;

  let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleMeta) {
    appleMeta.setAttribute("content", businessName);
  }

  if (logoUrl) {
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleIcon) {
      appleIcon.setAttribute("href", logoUrl);
    }
  }

  return () => {
    URL.revokeObjectURL(manifestUrl);
  };
};

export const BusinessInstallPrompt = ({ businessName, logoUrl, pageUrl, storeSlug }: BusinessInstallPromptProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Inject dynamic manifest on mount
  useEffect(() => {
    const currentPath = pageUrl || window.location.pathname;
    const cleanup = injectDynamicManifest(businessName, logoUrl, currentPath, storeSlug);
    return cleanup;
  }, [businessName, logoUrl, pageUrl, storeSlug]);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [storeSlug]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert("To install: tap the Share button in Safari, then tap 'Add to Home Screen'");
      } else {
        alert("To install: open browser menu (⋮) and tap 'Add to Home Screen' or 'Install App'");
      }
    }
  };

  if (isInstalled) return null;

  return (
    <div className="w-full border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3">
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-border flex-shrink-0" />
          ) : (
            <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
              <Smartphone className="w-4 h-4 text-primary" />
            </div>
          )}
          <span className="text-xs text-muted-foreground truncate">
            Install this store as an app
          </span>
        </div>
        <Button size="sm" onClick={handleInstallClick} className="flex-shrink-0">
          <Download className="w-4 h-4 mr-1" />
          Install
        </Button>
      </div>
    </div>
  );
};
