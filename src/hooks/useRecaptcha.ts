import { useState, useEffect, useCallback } from "react";

declare global {
  interface Window {
    grecaptcha: {
      enterprise: {
        ready: (callback: () => void) => void;
        render: (container: string | HTMLElement, parameters: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark";
          size?: "normal" | "compact";
          action?: string;
        }) => number;
        reset: (widgetId?: number) => void;
        getResponse: (widgetId?: number) => string;
        execute: (sitekey: string, options: { action: string }) => Promise<string>;
      };
    };
    onRecaptchaLoad: () => void;
  }
}

// reCAPTCHA Enterprise site key
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

export const useRecaptcha = (containerId: string) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [widgetId, setWidgetId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if script already exists
    if (document.getElementById("recaptcha-script")) {
      if (window.grecaptcha?.enterprise) {
        setIsLoaded(true);
      }
      return;
    }

    // Load reCAPTCHA Enterprise script
    const script = document.createElement("script");
    script.id = "recaptcha-script";
    script.src = "https://www.google.com/recaptcha/enterprise.js?onload=onRecaptchaLoad&render=explicit";
    script.async = true;
    script.defer = true;

    window.onRecaptchaLoad = () => {
      setIsLoaded(true);
    };

    document.body.appendChild(script);

    return () => {
      // Clean up if needed
    };
  }, []);

  const renderRecaptcha = useCallback(() => {
    if (!isLoaded || !window.grecaptcha?.enterprise) return;

    const container = document.getElementById(containerId);
    if (!container || container.hasChildNodes()) return;

    window.grecaptcha.enterprise.ready(() => {
      try {
        const id = window.grecaptcha.enterprise.render(containerId, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (responseToken: string) => {
            setToken(responseToken);
          },
          "expired-callback": () => {
            setToken(null);
          },
          "error-callback": () => {
            setToken(null);
          },
          theme: "light",
          size: "normal",
        });
        setWidgetId(id);
      } catch (error) {
        console.error("Failed to render reCAPTCHA:", error);
      }
    });
  }, [isLoaded, containerId]);

  const resetRecaptcha = useCallback(() => {
    if (widgetId !== null && window.grecaptcha?.enterprise) {
      window.grecaptcha.enterprise.reset(widgetId);
      setToken(null);
    }
  }, [widgetId]);

  return {
    isLoaded,
    token,
    renderRecaptcha,
    resetRecaptcha,
    isVerified: !!token,
  };
};
