// QR Style Types and Defaults

export type BodyShape = 'square' | 'dots' | 'rounded' | 'diamond' | 'star' | 'blob' | 'classy' | 'classy-rounded' | 'extra-rounded';
export type EyeFrameShape = 'square' | 'rounded' | 'circle' | 'leaf' | 'dotted';
export type EyeBallShape = 'square' | 'rounded' | 'circle' | 'diamond' | 'flower';
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
}

export const defaultQRStyle: QRStyleConfig = {
  bodyShape: 'square',
  eyeFrameShape: 'square',
  eyeBallShape: 'square',
  bodyColor: '#000000',
  eyeFrameColor: '#000000',
  eyeBallColor: '#000000',
  backgroundColor: '#ffffff',
  size: 200,
  margin: 4,
  errorCorrectionLevel: 'H',
};

export const bodyShapeOptions: { value: BodyShape; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'dots', label: 'Dots' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'star', label: 'Star' },
  { value: 'classy', label: 'Classy' },
  { value: 'classy-rounded', label: 'Classy Rounded' },
  { value: 'extra-rounded', label: 'Extra Rounded' },
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
  { value: 'flower', label: 'Flower' },
];

export const errorCorrectionOptions: { value: ErrorCorrectionLevel; label: string; description: string }[] = [
  { value: 'L', label: 'Low (7%)', description: 'Minimal error recovery' },
  { value: 'M', label: 'Medium (15%)', description: 'Balanced recovery' },
  { value: 'Q', label: 'Quartile (25%)', description: 'Good recovery' },
  { value: 'H', label: 'High (30%)', description: 'Best recovery for designs' },
];

export const presetThemes: { name: string; config: Partial<QRStyleConfig> }[] = [
  {
    name: 'Classic',
    config: {
      bodyShape: 'square',
      eyeFrameShape: 'square',
      eyeBallShape: 'square',
      bodyColor: '#000000',
      eyeFrameColor: '#000000',
      eyeBallColor: '#000000',
      backgroundColor: '#ffffff',
    },
  },
  {
    name: 'Modern',
    config: {
      bodyShape: 'rounded',
      eyeFrameShape: 'rounded',
      eyeBallShape: 'rounded',
      bodyColor: '#1a1a2e',
      eyeFrameColor: '#16213e',
      eyeBallColor: '#0f3460',
      backgroundColor: '#ffffff',
    },
  },
  {
    name: 'Minimal',
    config: {
      bodyShape: 'dots',
      eyeFrameShape: 'circle',
      eyeBallShape: 'circle',
      bodyColor: '#333333',
      eyeFrameColor: '#333333',
      eyeBallColor: '#333333',
      backgroundColor: '#ffffff',
    },
  },
  {
    name: 'Neon',
    config: {
      bodyShape: 'rounded',
      eyeFrameShape: 'rounded',
      eyeBallShape: 'circle',
      bodyColor: '#00d4ff',
      eyeFrameColor: '#ff00ff',
      eyeBallColor: '#00ff88',
      backgroundColor: '#0a0a0a',
    },
  },
  {
    name: 'Artistic',
    config: {
      bodyShape: 'classy-rounded',
      eyeFrameShape: 'leaf',
      eyeBallShape: 'flower',
      bodyColor: '#e63946',
      eyeFrameColor: '#1d3557',
      eyeBallColor: '#457b9d',
      backgroundColor: '#f1faee',
    },
  },
  {
    name: 'Corporate',
    config: {
      bodyShape: 'classy',
      eyeFrameShape: 'square',
      eyeBallShape: 'square',
      bodyColor: '#2c3e50',
      eyeFrameColor: '#2c3e50',
      eyeBallColor: '#3498db',
      backgroundColor: '#ffffff',
    },
  },
];

export function getContrastWarning(bodyColor: string, backgroundColor: string): string | null {
  const getRelativeLuminance = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };
  
  const l1 = getRelativeLuminance(bodyColor);
  const l2 = getRelativeLuminance(backgroundColor);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  
  if (ratio < 3) {
    return 'Low contrast may affect scannability. Consider using darker/lighter colors.';
  }
  if (ratio < 4.5) {
    return 'Moderate contrast. QR should scan but may have issues in low light.';
  }
  return null;
}
