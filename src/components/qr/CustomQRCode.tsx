import { useEffect, useRef, useMemo } from 'react';
import QRCodeGenerator from 'qrcode';
import type { QRStyleConfig, BodyShape, EyeFrameShape, EyeBallShape } from '@/lib/qr-styles';
import { defaultQRStyle } from '@/lib/qr-styles';

interface CustomQRCodeProps {
  value: string;
  style?: Partial<QRStyleConfig>;
  className?: string;
  id?: string;
}

// Finder patterns (3 corner positioning eyes: 7x7 modules each)
const getEyePositions = (moduleCount: number) => [
  { x: 0, y: 0 }, // Top-left
  { x: moduleCount - 7, y: 0 }, // Top-right
  { x: 0, y: moduleCount - 7 }, // Bottom-left
];

const isInEyeArea = (row: number, col: number, moduleCount: number): boolean => {
  const eyePositions = getEyePositions(moduleCount);
  return eyePositions.some(
    eye => col >= eye.x && col < eye.x + 7 && row >= eye.y && row < eye.y + 7
  );
};

// Shape rendering functions for data modules
const renderBodyModule = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: BodyShape,
  color: string
) => {
  ctx.fillStyle = color;

  switch (shape) {
    case 'dots':
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.44, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'rounded':
      ctx.beginPath();
      const r = size * 0.28;
      ctx.roundRect(x + size * 0.03, y + size * 0.03, size * 0.94, size * 0.94, r);
      ctx.fill();
      break;

    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + size * 0.05);
      ctx.lineTo(x + size * 0.95, y + size / 2);
      ctx.lineTo(x + size / 2, y + size * 0.95);
      ctx.lineTo(x + size * 0.05, y + size / 2);
      ctx.closePath();
      ctx.fill();
      break;

    case 'classy':
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, [size * 0.4, 0, size * 0.4, 0]);
      ctx.fill();
      break;

    case 'star':
      const cx = x + size / 2;
      const cy = y + size / 2;
      const outerR = size * 0.48;
      const innerR = size * 0.28;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * (Math.PI / 180);
        const px = cx + outerR * Math.cos(angle);
        const py = cy + outerR * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        const innerAngle = (i * 72 + 36 - 90) * (Math.PI / 180);
        ctx.lineTo(cx + innerR * Math.cos(innerAngle), cy + innerR * Math.sin(innerAngle));
      }
      ctx.closePath();
      ctx.fill();
      break;

    default: // square - standard high-density solid module
      ctx.fillRect(x, y, size, size);
      break;
  }
};

// Render 7x7 outer eye frame with solid background filling to guarantee 100% contrast & scannability
const renderEyeFrame = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: EyeFrameShape,
  frameColor: string,
  bgColor: string
) => {
  const outerWidth = size * 7;
  const innerWidth = size * 5;
  const innerOffset = size * 1;

  switch (shape) {
    case 'rounded':
      ctx.fillStyle = frameColor;
      ctx.beginPath();
      ctx.roundRect(x, y, outerWidth, outerWidth, size * 1.6);
      ctx.fill();

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(x + innerOffset, y + innerOffset, innerWidth, innerWidth, size * 0.9);
      ctx.fill();
      break;

    case 'circle':
      const center = x + outerWidth / 2;
      const centerY = y + outerWidth / 2;

      ctx.fillStyle = frameColor;
      ctx.beginPath();
      ctx.arc(center, centerY, outerWidth / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(center, centerY, innerWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'leaf':
      ctx.fillStyle = frameColor;
      ctx.beginPath();
      ctx.roundRect(x, y, outerWidth, outerWidth, [0, size * 3, 0, size * 3]);
      ctx.fill();

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(x + innerOffset, y + innerOffset, innerWidth, innerWidth, [0, size * 2, 0, size * 2]);
      ctx.fill();
      break;

    case 'dotted':
      ctx.fillStyle = frameColor;
      const dotCount = 16;
      const ringRadius = size * 3;
      const dotRadius = size * 0.46;
      const cX = x + outerWidth / 2;
      const cY = y + outerWidth / 2;

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(x, y, outerWidth, outerWidth, size);
      ctx.fill();

      ctx.fillStyle = frameColor;
      for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * Math.PI * 2;
        const dotX = cX + Math.cos(angle) * ringRadius;
        const dotY = cY + Math.sin(angle) * ringRadius;
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    default: // square (standard 7x7 outer frame, 5x5 inner)
      ctx.fillStyle = frameColor;
      ctx.fillRect(x, y, outerWidth, outerWidth);

      ctx.fillStyle = bgColor;
      ctx.fillRect(x + innerOffset, y + innerOffset, innerWidth, innerWidth);
      break;
  }
};

// Render 3x3 inner eye pupil / center
const renderEyeBall = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: EyeBallShape,
  color: string
) => {
  ctx.fillStyle = color;
  const ballSize = size * 3;
  const centerX = x + ballSize / 2;
  const centerY = y + ballSize / 2;

  switch (shape) {
    case 'rounded':
      ctx.beginPath();
      ctx.roundRect(x, y, ballSize, ballSize, size * 0.85);
      ctx.fill();
      break;

    case 'circle':
      ctx.beginPath();
      ctx.arc(centerX, centerY, ballSize / 2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(x + ballSize, centerY);
      ctx.lineTo(centerX, y + ballSize);
      ctx.lineTo(x, centerY);
      ctx.closePath();
      ctx.fill();
      break;

    case 'leaf':
      ctx.beginPath();
      ctx.roundRect(x, y, ballSize, ballSize, [0, size * 1.3, 0, size * 1.3]);
      ctx.fill();
      break;

    default: // square
      ctx.fillRect(x, y, ballSize, ballSize);
      break;
  }
};

/**
 * Dedicated high-resolution vector QR generator for pristine, print-ready image downloads
 */
export async function renderHighResQRCanvas(
  value: string,
  style: Partial<QRStyleConfig> = {},
  canvasSize: number = 2048
): Promise<HTMLCanvasElement> {
  const mergedStyle: QRStyleConfig = {
    ...defaultQRStyle,
    ...style,
    size: canvasSize,
    backgroundColor: style.backgroundColor || '#ffffff',
    errorCorrectionLevel: style.logoUrl ? 'H' : (style.errorCorrectionLevel || 'H'),
  };

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  // Paint solid background color
  ctx.fillStyle = mergedStyle.backgroundColor;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // Generate QR code data matrix
  const qrData = await QRCodeGenerator.create(value, {
    errorCorrectionLevel: mergedStyle.errorCorrectionLevel,
  });

  const moduleCount = qrData.modules.size;
  const margin = Math.max(1, mergedStyle.margin ?? 4);
  const totalModules = moduleCount + margin * 2;
  const moduleSize = canvasSize / totalModules;
  const offset = moduleSize * margin;

  // Draw data modules
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qrData.modules.get(row, col) && !isInEyeArea(row, col, moduleCount)) {
        const x = offset + col * moduleSize;
        const y = offset + row * moduleSize;
        renderBodyModule(
          ctx,
          x,
          y,
          moduleSize,
          mergedStyle.bodyShape,
          mergedStyle.bodyColor
        );
      }
    }
  }

  // Draw finder eyes
  const eyePositions = getEyePositions(moduleCount);
  eyePositions.forEach(eye => {
    const frameX = offset + eye.x * moduleSize;
    const frameY = offset + eye.y * moduleSize;
    renderEyeFrame(
      ctx,
      frameX,
      frameY,
      moduleSize,
      mergedStyle.eyeFrameShape,
      mergedStyle.eyeFrameColor,
      mergedStyle.backgroundColor
    );

    const ballX = offset + (eye.x + 2) * moduleSize;
    const ballY = offset + (eye.y + 2) * moduleSize;
    renderEyeBall(
      ctx,
      ballX,
      ballY,
      moduleSize,
      mergedStyle.eyeBallShape,
      mergedStyle.eyeBallColor
    );
  });

  // Draw center logo if present
  if (mergedStyle.logoUrl) {
    await new Promise<void>((resolve) => {
      const logoImg = new window.Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.onload = () => {
        const logoSizeRatio =
          mergedStyle.logoSize === 'large'
            ? 0.26
            : mergedStyle.logoSize === 'small'
            ? 0.16
            : 0.21;
        const logoSize = canvasSize * logoSizeRatio;
        const logoX = (canvasSize - logoSize) / 2;
        const logoY = (canvasSize - logoSize) / 2;
        const padding = logoSize * 0.15;

        // Protective white badge behind logo
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = Math.max(4, canvasSize * 0.008);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = Math.max(2, canvasSize * 0.003);

        const rx = logoX - padding;
        const ry = logoY - padding;
        const rw = logoSize + padding * 2;
        const rh = logoSize + padding * 2;
        const cornerRadius = padding * 1.5;

        ctx.beginPath();
        ctx.roundRect(rx, ry, rw, rh, cornerRadius);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = Math.max(1, canvasSize * 0.002);
        ctx.stroke();

        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        resolve();
      };
      logoImg.onerror = () => {
        console.warn('Failed to load logo for high-res export');
        resolve();
      };
      logoImg.src = mergedStyle.logoUrl!;
    });
  }

  return canvas;
}

export function CustomQRCode({ value, style = {}, className, id }: CustomQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Force Error Correction Level 'H' (30%) if a center logo is attached
  const mergedStyle = useMemo(() => {
    const base = { ...defaultQRStyle, ...style };
    if (base.logoUrl) {
      base.errorCorrectionLevel = 'H';
    }
    if (!base.backgroundColor) {
      base.backgroundColor = '#ffffff';
    }
    return base;
  }, [style]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    let isSubscribed = true;

    const render = async () => {
      try {
        const qrData = await QRCodeGenerator.create(value, {
          errorCorrectionLevel: mergedStyle.errorCorrectionLevel,
        });

        if (!isSubscribed) return;

        const moduleCount = qrData.modules.size;
        const canvasSize = mergedStyle.size || 240;
        const margin = Math.max(1, mergedStyle.margin ?? 4);
        const totalModules = moduleCount + margin * 2;
        const moduleSize = canvasSize / totalModules;
        const offset = moduleSize * margin;

        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = mergedStyle.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        for (let row = 0; row < moduleCount; row++) {
          for (let col = 0; col < moduleCount; col++) {
            if (qrData.modules.get(row, col) && !isInEyeArea(row, col, moduleCount)) {
              const x = offset + col * moduleSize;
              const y = offset + row * moduleSize;
              renderBodyModule(
                ctx,
                x,
                y,
                moduleSize,
                mergedStyle.bodyShape,
                mergedStyle.bodyColor
              );
            }
          }
        }

        const eyePositions = getEyePositions(moduleCount);
        eyePositions.forEach(eye => {
          const frameX = offset + eye.x * moduleSize;
          const frameY = offset + eye.y * moduleSize;
          renderEyeFrame(
            ctx,
            frameX,
            frameY,
            moduleSize,
            mergedStyle.eyeFrameShape,
            mergedStyle.eyeFrameColor,
            mergedStyle.backgroundColor || '#ffffff'
          );

          const ballX = offset + (eye.x + 2) * moduleSize;
          const ballY = offset + (eye.y + 2) * moduleSize;
          renderEyeBall(
            ctx,
            ballX,
            ballY,
            moduleSize,
            mergedStyle.eyeBallShape,
            mergedStyle.eyeBallColor
          );
        });

        if (mergedStyle.logoUrl) {
          const logoImg = new window.Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.onload = () => {
            if (!isSubscribed) return;

            const logoSizeRatio =
              mergedStyle.logoSize === 'large'
                ? 0.26
                : mergedStyle.logoSize === 'small'
                ? 0.16
                : 0.21;
            const logoSize = canvasSize * logoSizeRatio;
            const logoX = (canvasSize - logoSize) / 2;
            const logoY = (canvasSize - logoSize) / 2;
            const padding = logoSize * 0.15;

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;

            const rx = logoX - padding;
            const ry = logoY - padding;
            const rw = logoSize + padding * 2;
            const rh = logoSize + padding * 2;
            const cornerRadius = padding * 1.5;

            ctx.beginPath();
            ctx.roundRect(rx, ry, rw, rh, cornerRadius);
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
          };

          logoImg.src = mergedStyle.logoUrl;
        }
      } catch (error) {
        console.error('Failed to generate QR code canvas:', error);
      }
    };

    render();

    return () => {
      isSubscribed = false;
    };
  }, [value, mergedStyle]);

  return (
    <canvas
      ref={canvasRef}
      id={id}
      className={className}
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        maxWidth: '100%',
        aspectRatio: '1 / 1',
        imageRendering: 'crisp-edges',
      }}
    />
  );
}
