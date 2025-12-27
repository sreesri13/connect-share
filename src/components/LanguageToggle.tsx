import { useState, useEffect, useCallback } from "react";
import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Supported languages list (Google Translate supported languages)
const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "zh-CN", name: "Chinese", native: "中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "it", name: "Italian", native: "Italiano" },
];

const STORAGE_KEY = "selected_language";

declare global {
  interface Window {
    google: {
      translate: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages?: string;
            layout?: number;
            autoDisplay?: boolean;
          },
          elementId: string
        ) => void;
      };
    };
    googleTranslateElementInit: () => void;
  }
}

interface LanguageToggleProps {
  inline?: boolean;
}

export const LanguageToggle = ({ inline = false }: LanguageToggleProps) => {
  const [selectedLang, setSelectedLang] = useState(() => 
    localStorage.getItem(STORAGE_KEY) || "en"
  );
  const [isTranslateReady, setIsTranslateReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const getCurrentLanguage = () => {
    return LANGUAGES.find(l => l.code === selectedLang) || LANGUAGES[0];
  };

  // Initialize Google Translate
  useEffect(() => {
    // Check if script already exists
    if (document.getElementById("google-translate-script")) {
      // If script exists, check if translate is ready
      const checkReady = setInterval(() => {
        const selectEl = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
        if (selectEl) {
          setIsTranslateReady(true);
          clearInterval(checkReady);
        }
      }, 100);
      
      setTimeout(() => clearInterval(checkReady), 5000);
      return;
    }

    // Create hidden container for Google Translate widget
    const translateDiv = document.createElement("div");
    translateDiv.id = "google_translate_element";
    translateDiv.style.cssText = "position: absolute; left: -9999px; visibility: hidden;";
    document.body.appendChild(translateDiv);

    // Define the callback function
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: LANGUAGES.map(l => l.code).join(","),
          layout: 0,
          autoDisplay: false,
        },
        "google_translate_element"
      );
      
      // Wait for the select element to be ready
      const checkReady = setInterval(() => {
        const selectEl = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
        if (selectEl) {
          setIsTranslateReady(true);
          clearInterval(checkReady);
        }
      }, 100);
      
      setTimeout(() => clearInterval(checkReady), 5000);
    };

    // Load Google Translate script
    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    // Add CSS to hide Google Translate elements
    const style = document.createElement("style");
    style.id = "google-translate-styles";
    style.textContent = `
      /* Hide Google Translate toolbar and elements */
      .goog-te-banner-frame,
      .goog-te-balloon-frame,
      #goog-gt-tt,
      .goog-te-menu-frame,
      .goog-tooltip,
      .goog-tooltip:hover,
      .goog-te-gadget,
      .skiptranslate,
      #google_translate_element {
        display: none !important;
        visibility: hidden !important;
      }
      
      /* Fix body positioning after Google Translate modifies it */
      body {
        top: 0 !important;
        position: static !important;
      }
      
      /* Hide the Google Translate iframe */
      iframe.goog-te-menu-frame {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Don't cleanup on unmount to keep translation working
    };
  }, []);

  // Apply saved translation when ready
  useEffect(() => {
    if (isTranslateReady && selectedLang !== "en") {
      const timeout = setTimeout(() => {
        translateToLanguage(selectedLang);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isTranslateReady]);

  // Function to trigger translation
  const translateToLanguage = useCallback((langCode: string) => {
    const selectEl = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;

    if (selectEl) {
      if (langCode === "en") {
        // Reset to English - use the proper Google Translate reset mechanism
        // First clear the cookies
        const hostname = window.location.hostname;
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + hostname;
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." + hostname;
        
        // Set to English using the select
        selectEl.value = "en";
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        
        // Force restore by triggering the banner's restore link if available
        setTimeout(() => {
          // Try clicking the "Show original" button if it exists
          const restoreLink = document.querySelector(".goog-te-banner-frame");
          if (restoreLink) {
            try {
              const iframe = restoreLink as HTMLIFrameElement;
              const innerDoc = iframe.contentDocument || iframe.contentWindow?.document;
              if (innerDoc) {
                const restoreBtn = innerDoc.querySelector('[id=":1.restore"]') as HTMLElement;
                if (restoreBtn) {
                  restoreBtn.click();
                }
              }
            } catch (e) {
              // Cross-origin restrictions may prevent this
            }
          }
          
          // Alternative: Force the select back to empty state which shows original
          selectEl.selectedIndex = 0;
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        }, 100);
      } else {
        selectEl.value = langCode;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }, []);

  // Handle language selection
  const handleSelectLanguage = (langCode: string) => {
    setSelectedLang(langCode);
    localStorage.setItem(STORAGE_KEY, langCode);
    translateToLanguage(langCode);
    setIsOpen(false);
  };

  const currentLang = getCurrentLanguage();

  return (
    <div className={cn(
      "flex items-center",
      !inline && "fixed top-4 right-4 z-50"
    )}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!isTranslateReady}
            className={cn(
              "flex items-center gap-2 bg-background/95 backdrop-blur-sm border-border/50",
              "shadow-lg hover:shadow-xl transition-all duration-200",
              "min-w-[140px] justify-between"
            )}
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm notranslate">
                {currentLang.name}
              </span>
            </div>
            <svg
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-64 max-h-[400px] overflow-y-auto bg-background border border-border shadow-xl z-[100]"
          sideOffset={5}
        >
          <DropdownMenuLabel className="text-muted-foreground text-xs notranslate">
            Select Language
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleSelectLanguage(lang.code)}
              className={cn(
                "flex items-center justify-between cursor-pointer py-2.5 notranslate",
                selectedLang === lang.code && "bg-primary/10"
              )}
            >
              <div className="flex flex-col">
                <span className="font-medium">{lang.name}</span>
                <span className="text-xs text-muted-foreground">{lang.native}</span>
              </div>
              {selectedLang === lang.code && (
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default LanguageToggle;
