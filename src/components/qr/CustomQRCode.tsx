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

// QR Code position detection patterns are at these positions
const getEyePositions = (moduleCount: number) => [
  { x: 0, y: 0 }, // top-left
  { x: moduleCount - 7, y: 0 }, // top-right
  { x: 0, y: moduleCount - 7 }, // bottom-left
];

const isInEyeArea = (row: number, col: number, moduleCount: number): boolean => {
  const eyePositions = getEyePositions(moduleCount);
  return eyePositions.some(eye => 
    col >= eye.x && col < eye.x + 7 && row >= eye.y && row < eye.y + 7
  );
};

const isEyeFrame = (row: number, col: number, moduleCount: number): boolean => {
  const eyePositions = getEyePositions(moduleCount);
  return eyePositions.some(eye => {
    const localX = col - eye.x;
    const localY = row - eye.y;
    if (localX < 0 || localX >= 7 || localY < 0 || localY >= 7) return false;
    // Outer ring (frame)
    return localX === 0 || localX === 6 || localY === 0 || localY === 6;
  });
};

const isEyeBall = (row: number, col: number, moduleCount: number): boolean => {
  const eyePositions = getEyePositions(moduleCount);
  return eyePositions.some(eye => {
    const localX = col - eye.x;
    const localY = row - eye.y;
    if (localX < 0 || localX >= 7 || localY < 0 || localY >= 7) return false;
    // Inner square (2-4 range)
    return localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4;
  });
};

// Shape rendering functions
const renderBodyModule = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  shape: BodyShape, color: string
) => {
  ctx.fillStyle = color;

  switch (shape) {
    case 'dots':
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'rounded':
      ctx.beginPath();
      const r = size * 0.25;
      ctx.roundRect(x, y, size, size, r);
      ctx.fill();
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y);
      ctx.lineTo(x + size, y + size / 2);
      ctx.lineTo(x + size / 2, y + size);
      ctx.lineTo(x, y + size / 2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'star':
      const cx = x + size / 2;
      const cy = y + size / 2;
      const outerR = size * 0.5;
      const innerR = size * 0.22;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * Math.PI / 180;
        const px = cx + outerR * Math.cos(angle);
        const py = cy + outerR * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
        ctx.lineTo(cx + innerR * Math.cos(innerAngle), cy + innerR * Math.sin(innerAngle));
      }
      ctx.closePath();
      ctx.fill();
      break;
    default: // square - fill completely with no padding
      ctx.fillRect(x, y, size, size);
  }
};

const renderEyeFrame = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  shape: EyeFrameShape, color: string
) => {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  const lineWidth = size;

  switch (shape) {
    case 'rounded':
      ctx.beginPath();
      ctx.roundRect(x, y, size * 7, size * 7, size * 1.5);
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      // Clear inside
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.roundRect(x + size, y + size, size * 5, size * 5, size);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(x + size * 3.5, y + size * 3.5, size * 3.5, 0, Math.PI * 2);
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x + size * 3.5, y + size * 3.5, size * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'leaf':
      ctx.beginPath();
      ctx.roundRect(x, y, size * 7, size * 7, [0, size * 3, 0, size * 3]);
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.roundRect(x + size, y + size, size * 5, size * 5, [0, size * 2, 0, size * 2]);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'dotted':
      const dotCount = 14;
      const radius = size * 3;
      ctx.beginPath();
      for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * Math.PI * 2;
        ctx.moveTo(
          x + size * 3.5 + Math.cos(angle) * (radius + size * 0.3),
          y + size * 3.5 + Math.sin(angle) * (radius + size * 0.3)
        );
        ctx.arc(
          x + size * 3.5 + Math.cos(angle) * radius,
          y + size * 3.5 + Math.sin(angle) * radius,
          size * 0.5, 0, Math.PI * 2
        );
      }
      ctx.fill();
      break;
    default: // square
      ctx.fillRect(x, y, size * 7, size);
      ctx.fillRect(x, y + size * 6, size * 7, size);
      ctx.fillRect(x, y + size, size, size * 5);
      ctx.fillRect(x + size * 6, y + size, size, size * 5);
  }
};

const renderEyeBall = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  shape: EyeBallShape, color: string
) => {
  ctx.fillStyle = color;
  const centerX = x + size * 1.5;
  const centerY = y + size * 1.5;

  switch (shape) {
    case 'rounded':
      ctx.beginPath();
      ctx.roundRect(x, y, size * 3, size * 3, size * 0.8);
      ctx.fill();
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'diamond':
      // Diamond shape for eye center
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(x + size * 3, centerY);
      ctx.lineTo(centerX, y + size * 3);
      ctx.lineTo(x, centerY);
      ctx.closePath();
      ctx.fill();
      break;
    case 'leaf':
      // Leaf/teardrop shape for eye center
      ctx.beginPath();
      ctx.roundRect(x, y, size * 3, size * 3, [0, size * 1.2, 0, size * 1.2]);
      ctx.fill();
      break;
    default: // square
      ctx.fillRect(x, y, size * 3, size * 3);
  }
};

export function CustomQRCode({ value, style = {}, className, id }: CustomQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mergedStyle = useMemo(() => ({ ...defaultQRStyle, ...style }), [style]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    const render = async () => {
      try {
        // Generate QR code data
        const qrData = await QRCodeGenerator.create(value, {
          errorCorrectionLevel: mergedStyle.errorCorrectionLevel,
        });

        const moduleCount = qrData.modules.size;
        const moduleSize = mergedStyle.size / (moduleCount + mergedStyle.margin * 2);
        const canvasSize = mergedStyle.size;
        const offset = moduleSize * mergedStyle.margin;

        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and draw background
        ctx.fillStyle = mergedStyle.backgroundColor;
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        // Draw data modules (excluding eye areas)
        for (let row = 0; row < moduleCount; row++) {
          for (let col = 0; col < moduleCount; col++) {
            if (qrData.modules.get(row, col) && !isInEyeArea(row, col, moduleCount)) {
              const x = offset + col * moduleSize;
              const y = offset + row * moduleSize;
              renderBodyModule(ctx, x, y, moduleSize, mergedStyle.bodyShape, mergedStyle.bodyColor);
            }
          }
        }

        // Draw eye frames and balls
        const eyePositions = getEyePositions(moduleCount);
        eyePositions.forEach(eye => {
          const frameX = offset + eye.x * moduleSize;
          const frameY = offset + eye.y * moduleSize;
          renderEyeFrame(ctx, frameX, frameY, moduleSize, mergedStyle.eyeFrameShape, mergedStyle.eyeFrameColor);
          
          const ballX = offset + (eye.x + 2) * moduleSize;
          const ballY = offset + (eye.y + 2) * moduleSize;
          renderEyeBall(ctx, ballX, ballY, moduleSize, mergedStyle.eyeBallShape, mergedStyle.eyeBallColor);
        });

      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };

    render();
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
        aspectRatio: '1 / 1'
      }}
    />
  );
}
