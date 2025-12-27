import { useState, useEffect, useCallback } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
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
  { code: "en", name: "English" },
  { code: "te", name: "Telugu" },
  { code: "hi", name: "Hindi" },
  { code: "ta", name: "Tamil" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "mr", name: "Marathi" },
  { code: "bn", name: "Bengali" },
  { code: "gu", name: "Gujarati" },
  { code: "pa", name: "Punjabi" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "ru", name: "Russian" },
  { code: "pt", name: "Portuguese" },
  { code: "it", name: "Italian" },
];

const STORAGE_KEYS = {
  currentLang: "gt_current_language",
  targetLang: "gt_target_language",
  defaultLang: "gt_default_language",
};

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
  // Default language is English, target language defaults to Telugu
  const [currentLang, setCurrentLang] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.currentLang) || "en"
  );
  const [targetLang, setTargetLang] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.targetLang) || "te"
  );
  const [isTranslateReady, setIsTranslateReady] = useState(false);
  const [isChangingPreset, setIsChangingPreset] = useState(false);

  const getCurrentLanguageName = () => {
    return LANGUAGES.find(l => l.code === currentLang)?.name || "English";
  };

  const getTargetLanguageName = () => {
    return LANGUAGES.find(l => l.code === targetLang)?.name || "Telugu";
  };

  // Initialize Google Translate
  useEffect(() => {
    // Check if script already exists
    if (document.getElementById("google-translate-script")) {
      return;
    }

    // Create hidden container for Google Translate widget
    const translateDiv = document.createElement("div");
    translateDiv.id = "google_translate_element";
    translateDiv.style.display = "none";
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
      setIsTranslateReady(true);
    };

    // Load Google Translate script
    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
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
      .goog-tooltip:hover {
        display: none !important;
        visibility: hidden !important;
      }
      
      body {
        top: 0 !important;
        position: static !important;
      }
      
      .goog-te-gadget {
        display: none !important;
      }
      
      .skiptranslate {
        display: none !important;
      }
      
      /* Fix body positioning after Google Translate modifies it */
      body {
        top: 0px !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Cleanup on unmount
      const scriptEl = document.getElementById("google-translate-script");
      const styleEl = document.getElementById("google-translate-styles");
      const translateEl = document.getElementById("google_translate_element");
      
      if (scriptEl) scriptEl.remove();
      if (styleEl) styleEl.remove();
      if (translateEl) translateEl.remove();
    };
  }, []);

  // Apply translation when ready and on initial load
  useEffect(() => {
    if (isTranslateReady && currentLang !== "en") {
      // Small delay to ensure Google Translate is fully initialized
      const timeout = setTimeout(() => {
        translateToLanguage(currentLang);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isTranslateReady]);

  // Function to trigger translation
  const translateToLanguage = useCallback((langCode: string) => {
    // Get the Google Translate select element
    const selectEl = document.querySelector(
      ".goog-te-combo"
    ) as HTMLSelectElement | null;

    if (selectEl) {
      selectEl.value = langCode;
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      // Fallback: Try using cookie-based approach
      const setCookie = (name: string, value: string, days: number) => {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
      };

      if (langCode === "en") {
        // Reset to original language
        setCookie("googtrans", "", -1);
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." + window.location.hostname;
      } else {
        setCookie("googtrans", `/en/${langCode}`, 365);
      }
      
      // Reload to apply (only as fallback)
      if (!selectEl) {
        window.location.reload();
      }
    }
  }, []);

  // Toggle between current and target language
  const handleToggle = () => {
    const newLang = currentLang === "en" ? targetLang : "en";
    setCurrentLang(newLang);
    localStorage.setItem(STORAGE_KEYS.currentLang, newLang);
    translateToLanguage(newLang);
  };

  // Change the target language preset
  const handleChangeTargetLanguage = (langCode: string) => {
    if (langCode === "en") return; // Can't set English as target (it's always the base)
    
    setTargetLang(langCode);
    localStorage.setItem(STORAGE_KEYS.targetLang, langCode);
    setIsChangingPreset(false);

    // If currently viewing non-English, switch to new target language
    if (currentLang !== "en") {
      setCurrentLang(langCode);
      localStorage.setItem(STORAGE_KEYS.currentLang, langCode);
      translateToLanguage(langCode);
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2",
      !inline && "fixed top-4 right-4 z-50"
    )}>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={!isTranslateReady}
        className={cn(
          "flex items-center gap-2 bg-background/95 backdrop-blur-sm border-border/50",
          "shadow-lg hover:shadow-xl transition-all duration-200",
          "min-w-[120px] justify-center"
        )}
      >
        <Globe className="h-4 w-4" />
        <span className="font-medium text-sm">
          {getCurrentLanguageName()}
        </span>
      </Button>

      {/* Language Preset Dropdown */}
      <DropdownMenu open={isChangingPreset} onOpenChange={setIsChangingPreset}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "bg-background/95 backdrop-blur-sm border-border/50",
              "shadow-lg hover:shadow-xl transition-all duration-200"
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 max-h-80 overflow-y-auto bg-background border border-border shadow-xl"
        >
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            Toggle Language: English ↔ {getTargetLanguageName()}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Change target language:
          </DropdownMenuLabel>
          {LANGUAGES.filter(l => l.code !== "en").map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleChangeTargetLanguage(lang.code)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span>{lang.name}</span>
              {targetLang === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default LanguageToggle;
