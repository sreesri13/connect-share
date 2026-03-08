import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

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

  // Use store slug path for scope if available, otherwise use "/" for SPA routing
  const storePath = storeSlug ? `/store/${storeSlug}` : pagePath;
  const startUrl = storeSlug ? `/store/${storeSlug}` : pagePath;

  const manifest = {
    name: businessName,
    short_name: businessName.length > 12 ? businessName.substring(0, 12) : businessName,
    description: `Shop at ${businessName}`,
    theme_color: "#7C3AED",
    background_color: "#0F0F23",
    display: "standalone",
    orientation: "portrait-primary",
    scope: "/",
    start_url: startUrl,
    icons,
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
  const manifestUrl = URL.createObjectURL(blob);

  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = manifestUrl;
  document.head.appendChild(link);

  // Also update page title and meta tags
  document.title = businessName;

  // Update apple-mobile-web-app-title
  let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleMeta) {
    appleMeta.setAttribute("content", businessName);
  }

  // Update apple-touch-icon if logo available
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
  const [showBanner, setShowBanner] = useState(false);
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

    // Use store-specific dismissal key
    const dismissKey = storeSlug 
      ? `store-install-dismissed-${storeSlug}` 
      : "business-install-dismissed";
    const dismissed = localStorage.getItem(dismissKey);
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 3) return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // For browsers that don't fire beforeinstallprompt, show a manual prompt
    const timer = setTimeout(() => {
      if (!deferredPrompt) {
        setShowBanner(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(timer);
    };
  }, [storeSlug]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // Show manual instructions for iOS / unsupported browsers
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert("To install: tap the Share button in Safari, then tap 'Add to Home Screen'");
      } else {
        alert("To install: open browser menu (⋮) and tap 'Add to Home Screen' or 'Install App'");
      }
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    const dismissKey = storeSlug 
      ? `store-install-dismissed-${storeSlug}` 
      : "business-install-dismissed";
    localStorage.setItem(dismissKey, new Date().toISOString());
  };

  if (isInstalled || !showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        className="fixed bottom-20 right-4 left-4 z-50 sm:left-auto sm:max-w-sm"
      >
        <Card className="shadow-2xl border-primary/20 bg-background/95 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border" />
              ) : (
                <div className="p-2 rounded-xl bg-primary/10">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Install {businessName}</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Add this store to your home screen for quick access anytime
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleInstallClick} className="flex-1">
                    <Download className="w-4 h-4 mr-1" />
                    Install App
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismiss}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
