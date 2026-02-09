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
}

export const BusinessInstallPrompt = ({ businessName, logoUrl }: BusinessInstallPromptProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem("business-install-dismissed");
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
  }, []);

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
    localStorage.setItem("business-install-dismissed", new Date().toISOString());
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
                    Install
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
