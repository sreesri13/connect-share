/**
 * Google Analytics 4 Integration
 * 
 * Provides comprehensive tracking for:
 * - Page views with UTM parameters
 * - QR code scans and page views
 * - Link clicks and engagement
 * - Traffic source differentiation (QR vs URL)
 */

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-PWRFTR3KCM';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * Initialize Google Analytics 4
 */
export const initGA = (): void => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') {
    console.warn('GA4: No Measurement ID configured');
    return;
  }

  if (document.getElementById('ga-script')) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: true,
  });

  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  console.log('GA4: Initialized with ID:', GA_MEASUREMENT_ID);
};

/**
 * Get UTM parameters from current URL
 */
export const getUTMParams = (): Record<string, string> => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
  };
};

/**
 * Check if traffic is from QR scan
 */
export const isQRTraffic = (): boolean => {
  const params = getUTMParams();
  return params.utm_source === 'qr' && params.utm_medium === 'scan';
};

/**
 * Check if traffic is from shared URL
 */
export const isSharedURLTraffic = (): boolean => {
  const params = getUTMParams();
  return params.utm_source === 'link' && params.utm_medium === 'share';
};

/**
 * Track a page view with UTM parameters
 */
export const trackPageView = (path: string, title?: string): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  
  const utmParams = getUTMParams();
  
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    ...utmParams,
  });
};

/**
 * Track a QR code scan event
 */
export const trackQRScan = (qrId: string, qrTitle?: string, qrType?: 'profile' | 'business' | 'payment'): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('event', 'qr_scan', {
    event_category: 'QR Code',
    event_label: qrTitle || qrId,
    qr_id: qrId,
    qr_type: qrType || 'profile',
    traffic_source: 'qr',
  });
};

/**
 * Track a QR page view (when someone views a QR-generated page)
 */
export const trackQRPageView = (qrId: string, qrTitle?: string): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  const isQR = isQRTraffic();
  const isShared = isSharedURLTraffic();

  window.gtag('event', 'qr_page_view', {
    event_category: 'QR Page',
    event_label: qrTitle || qrId,
    qr_id: qrId,
    traffic_type: isQR ? 'qr_scan' : isShared ? 'shared_url' : 'direct',
  });
};

/**
 * Track URL open from shared link
 */
export const trackURLOpen = (pageId: string, pageTitle?: string): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('event', 'qr_url_open', {
    event_category: 'Shared URL',
    event_label: pageTitle || pageId,
    page_id: pageId,
  });
};

/**
 * Track a public profile view
 */
export const trackProfileView = (profileId: string): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  const isQR = isQRTraffic();

  window.gtag('event', 'profile_view', {
    event_category: 'Profile',
    event_label: profileId,
    profile_id: profileId,
    traffic_type: isQR ? 'qr_scan' : 'direct',
  });
};

/**
 * Track a UPI payment QR scan
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
 * Track link clicks on QR pages
 */
export const trackLinkClick = (
  linkUrl: string, 
  linkTitle: string, 
  linkType: 'url' | 'whatsapp' | 'social' | 'product' | 'other',
  pageId?: string
): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('event', 'link_click', {
    event_category: 'Engagement',
    event_label: linkTitle,
    link_url: linkUrl,
    link_type: linkType,
    page_id: pageId || '',
  });
};

/**
 * Track time spent on QR pages
 */
export const trackTimeOnPage = (pageId: string, durationSeconds: number): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('event', 'page_engagement', {
    event_category: 'Engagement',
    page_id: pageId,
    engagement_time_msec: durationSeconds * 1000,
  });
};

/**
 * Track product clicks on business pages
 */
export const trackProductClick = (productId: string, productName: string, pageId: string): void => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('event', 'product_click', {
    event_category: 'Business',
    event_label: productName,
    product_id: productId,
    page_id: pageId,
  });
};

/**
 * Track a custom event
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

/**
 * Generate QR URL with UTM parameters for tracking
 */
export const generateQRURL = (baseUrl: string, qrId: string): string => {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', 'qr');
  url.searchParams.set('utm_medium', 'scan');
  url.searchParams.set('utm_campaign', qrId);
  return url.toString();
};

/**
 * Generate shareable URL with UTM parameters for tracking
 */
export const generateShareableURL = (baseUrl: string, pageId: string): string => {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', 'link');
  url.searchParams.set('utm_medium', 'share');
  url.searchParams.set('utm_campaign', pageId);
  return url.toString();
};

export { GA_MEASUREMENT_ID };
