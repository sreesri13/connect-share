/**
 * Google Analytics 4 Integration
 * 
 * This module provides:
 * 1. GA4 initialization with gtag.js
 * 2. Custom event tracking for QR scans, page views, etc.
 * 3. Helper functions to track specific user actions
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a GA4 property at https://analytics.google.com
 * 2. Get your Measurement ID (starts with G-)
 * 3. Replace GA_MEASUREMENT_ID below with your ID
 */

// GA4 Measurement ID for ConnectHub
// This is a public/publishable key - safe to include in frontend code
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-PWRFTR3KCM';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * Initialize Google Analytics 4
 * Call this once when the app loads
 */
export const initGA = (): void => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') {
    console.warn('GA4: No Measurement ID configured');
    return;
  }

  // Check if already initialized
  if (document.getElementById('ga-script')) {
    return;
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    // Anonymize IP for privacy compliance
    anonymize_ip: true,
    // Send page views automatically
    send_page_view: true,
  });

  // Load gtag.js script
  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  console.log('GA4: Initialized with ID:', GA_MEASUREMENT_ID);
};

/**
 * Track a page view
 * @param path - The page path (e.g., '/dashboard')
 * @param title - The page title
 */
export const trackPageView = (path: string, title?: string): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
  });
};

/**
 * Track a QR code scan event
 * @param qrId - The QR code's public ID
 * @param qrTitle - The QR code's title (if available)
 */
export const trackQRScan = (qrId: string, qrTitle?: string): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('event', 'qr_scan', {
    event_category: 'QR Code',
    event_label: qrTitle || qrId,
    qr_id: qrId,
  });
};

/**
 * Track a public profile view
 * @param profileId - The profile's public ID
 */
export const trackProfileView = (profileId: string): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('event', 'profile_view', {
    event_category: 'Profile',
    event_label: profileId,
    profile_id: profileId,
  });
};

/**
 * Track a UPI payment QR scan
 * @param paymentCode - The payment QR's public code
 */
export const trackPaymentQRScan = (paymentCode: string): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('event', 'payment_qr_scan', {
    event_category: 'Payment',
    event_label: paymentCode,
    payment_code: paymentCode,
  });
};

/**
 * Track a custom event
 * @param eventName - The event name
 * @param params - Additional parameters
 */
export const trackEvent = (eventName: string, params?: Record<string, unknown>): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('event', eventName, params);
};

/**
 * Check if GA is configured and ready
 */
export const isGAConfigured = (): boolean => {
  return !!GA_MEASUREMENT_ID && GA_MEASUREMENT_ID.startsWith('G-');
};

export { GA_MEASUREMENT_ID };
