// QR Style Types, Defaults, and Scannability Algorithms

export type BodyShape = 'square' | 'dots' | 'rounded' | 'diamond' | 'star' | 'classy';
export type EyeFrameShape = 'square' | 'rounded' | 'circle' | 'leaf' | 'dotted';
export type EyeBallShape = 'square' | 'rounded' | 'circle' | 'diamond' | 'leaf';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QRStyleConfig {
  bodyShape: BodyShape;
  eyeFrameShape: EyeFrameShape;
  eyeBallShape: EyeBallShape;
  bodyColor: string;
  eyeFrameColor: string;
  eyeBallColor: string;
  backgroundColor: string;
  size: number;
  margin: number;
  errorCorrectionLevel: ErrorCorrectionLevel;
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
}

export const defaultQRStyle: QRStyleConfig = {
  bodyShape: 'square',
  eyeFrameShape: 'square',
  eyeBallShape: 'square',
  bodyColor: '#000000',
  eyeFrameColor: '#000000',
  eyeBallColor: '#000000',
  backgroundColor: '#ffffff',
  size: 240,
  margin: 4,
  errorCorrectionLevel: 'H',
};

// Ocean preset with guaranteed white background
export const oceanPresetStyle: QRStyleConfig = {
  bodyShape: 'rounded',
  eyeFrameShape: 'rounded',
  eyeBallShape: 'circle',
  bodyColor: '#0077b6',
  eyeFrameColor: '#023e8a',
  eyeBallColor: '#0096c7',
  backgroundColor: '#ffffff',
  size: 240,
  margin: 4,
  errorCorrectionLevel: 'H',
};

export const bodyShapeOptions: { value: BodyShape; label: string; description: string }[] = [
  { value: 'square', label: 'Square', description: 'Standard high-density square blocks' },
  { value: 'dots', label: 'Dots', description: 'Modern circular dots' },
  { value: 'rounded', label: 'Rounded', description: 'Smooth rounded module corners' },
  { value: 'diamond', label: 'Diamond', description: 'Refined geometric diamond facets' },
  { value: 'classy', label: 'Classy', description: 'Diagonal rounded corner modules' },
  { value: 'star', label: 'Star', description: 'Stylized star module matrix' },
];

export const eyeFrameShapeOptions: { value: EyeFrameShape; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'circle', label: 'Circle' },
  { value: 'leaf', label: 'Leaf' },
  { value: 'dotted', label: 'Dotted' },
];

export const eyeBallShapeOptions: { value: EyeBallShape; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'circle', label: 'Circle' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'leaf', label: 'Leaf' },
];

export const errorCorrectionOptions: { value: ErrorCorrectionLevel; label: string; description: string }[] = [
  { value: 'L', label: 'Low (7%)', description: 'Minimal recovery' },
  { value: 'M', label: 'Medium (15%)', description: 'Standard recovery' },
  { value: 'Q', label: 'Quartile (25%)', description: 'Strong recovery' },
  { value: 'H', label: 'High (30%)', description: 'Best for custom styles & logos' },
];

// Presets with 100% white background and high contrast for instant phone camera scanning
export const presetThemes: { name: string; description: string; config: Partial<QRStyleConfig> }[] = [
  {
    name: 'Classic',
    description: 'Black & White',
    config: {
      bodyShape: 'square',
      eyeFrameShape: 'square',
      eyeBallShape: 'square',
      bodyColor: '#000000',
      eyeFrameColor: '#000000',
      eyeBallColor: '#000000',
      backgroundColor: '#ffffff',
      errorCorrectionLevel: 'H',
    },
  },
  {
    name: 'Midnight',
    description: 'Deep Navy',
    config: {
      bodyShape: 'rounded',
      eyeFrameShape: 'rounded',
      eyeBallShape: 'rounded',
      bodyColor: '#0f172a',
      eyeFrameColor: '#1e293b',
      eyeBallColor: '#2563eb',
      backgroundColor: '#ffffff',
      errorCorrectionLevel: 'H',
    },
  },
  {
    name: 'Emerald Pro',
    description: 'Forest Green',
    config: {
      bodyShape: 'rounded',
      eyeFrameShape: 'leaf',
      eyeBallShape: 'circle',
      bodyColor: '#064e3b',
      eyeFrameColor: '#047857',
      eyeBallColor: '#059669',
      backgroundColor: '#ffffff',
      errorCorrectionLevel: 'H',
    },
  },
  {
    name: 'Royal Purple',
    description: 'Vibrant Violet',
    config: {
      bodyShape: 'dots',
      eyeFrameShape: 'circle',
      eyeBallShape: 'circle',
      bodyColor: '#4c1d95',
      eyeFrameColor: '#6d28d9',
      eyeBallColor: '#7c3aed',
      backgroundColor: '#ffffff',
      errorCorrectionLevel: 'H',
    },
  },
  {
    name: 'Ocean Blue',
    description: 'Sapphire Azure',
    config: {
      bodyShape: 'rounded',
      eyeFrameShape: 'rounded',
      eyeBallShape: 'circle',
      bodyColor: '#1e3a8a',
      eyeFrameColor: '#1d4ed8',
      eyeBallColor: '#0284c7',
      backgroundColor: '#ffffff',
      errorCorrectionLevel: 'H',
    },
  },
  {
    name: 'Crimson',
    description: 'Deep Ruby',
    config: {
      bodyShape: 'diamond',
      eyeFrameShape: 'rounded',
      eyeBallShape: 'rounded',
      bodyColor: '#881337',
      eyeFrameColor: '#be123c',
      eyeBallColor: '#e11d48',
      backgroundColor: '#ffffff',
      errorCorrectionLevel: 'H',
    },
  },
  {
    name: 'Cyber Teal',
    description: 'Modern Teal',
    config: {
      bodyShape: 'classy',
      eyeFrameShape: 'rounded',
      eyeBallShape: 'diamond',
      bodyColor: '#134e4a',
      eyeFrameColor: '#0f766e',
      eyeBallColor: '#0d9488',
      backgroundColor: '#ffffff',
      errorCorrectionLevel: 'H',
    },
  },
  {
    name: 'Graphite',
    description: 'Dark Slate',
    config: {
      bodyShape: 'dots',
      eyeFrameShape: 'square',
      eyeBallShape: 'rounded',
      bodyColor: '#18181b',
      eyeFrameColor: '#27272a',
      eyeBallColor: '#3f3f46',
      backgroundColor: '#ffffff',
      errorCorrectionLevel: 'H',
    },
  },
];

/**
 * Calculates WCAG / QR code contrast ratio between foreground and background
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const getRelativeLuminance = (hex: string) => {
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    const r = parseInt(cleanHex.slice(0, 2), 16) / 255 || 0;
    const g = parseInt(cleanHex.slice(2, 4), 16) / 255 || 0;
    const b = parseInt(cleanHex.slice(4, 6), 16) / 255 || 0;
    
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };
  
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export interface ContrastStatus {
  ratio: number;
  status: 'excellent' | 'moderate' | 'poor';
  warningMessage: string | null;
  scannable: boolean;
}

export function evaluateQRScannability(
  bodyColor: string,
  eyeFrameColor: string,
  eyeBallColor: string,
  backgroundColor: string
): ContrastStatus {
  const bodyRatio = getContrastRatio(bodyColor, backgroundColor);
  const frameRatio = getContrastRatio(eyeFrameColor, backgroundColor);
  const ballRatio = getContrastRatio(eyeBallColor, backgroundColor);

  const minRatio = Math.min(bodyRatio, frameRatio, ballRatio);

  if (minRatio < 2.5) {
    return {
      ratio: minRatio,
      status: 'poor',
      scannable: false,
      warningMessage: 'Critical: Extremely low color contrast! Phone cameras will NOT be able to scan this QR code. Please use dark colors on a white/light background.',
    };
  }

  if (minRatio < 4.0) {
    return {
      ratio: minRatio,
      status: 'moderate',
      scannable: true,
      warningMessage: 'Notice: Moderate contrast. This QR will scan on most phones, but may struggle in dim lighting or at smaller print sizes.',
    };
  }

  return {
    ratio: minRatio,
    status: 'excellent',
    scannable: true,
    warningMessage: null,
  };
}

export function getContrastWarning(bodyColor: string, backgroundColor: string): string | null {
  const status = evaluateQRScannability(bodyColor, bodyColor, bodyColor, backgroundColor);
  return status.warningMessage;
}
