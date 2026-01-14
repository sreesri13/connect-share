import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Camera, X, Flashlight, SwitchCamera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function QRScanner({ onScanSuccess, onClose, isOpen }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScannedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current || isScanning || hasScannedRef.current) return;

    try {
      setError(null);
      
      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        setHasPermission(true);
        
        // Prefer back camera on mobile
        const backCameraIndex = devices.findIndex(
          (d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("rear")
        );
        const cameraIndex = backCameraIndex >= 0 ? backCameraIndex : 0;
        setCurrentCameraIndex(cameraIndex);
        
        // Initialize scanner
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("qr-scanner-region");
        }

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        };

        await scannerRef.current.start(
          devices[cameraIndex].id,
          config,
          (decodedText) => {
            if (!hasScannedRef.current) {
              hasScannedRef.current = true;
              // Vibrate on successful scan (if supported)
              if (navigator.vibrate) {
                navigator.vibrate(100);
              }
              onScanSuccess(decodedText);
              stopScanner();
            }
          },
          () => {
            // Ignore QR not detected errors
          }
        );

        setIsScanning(true);

        // Check torch support
        try {
          const track = scannerRef.current.getRunningTrackSettings();
          // @ts-ignore - torch capability check
          setTorchSupported(!!track?.torch || document.querySelector('video')?.srcObject);
        } catch {
          setTorchSupported(false);
        }
      } else {
        setError("No cameras found on this device");
        setHasPermission(false);
      }
    } catch (err: any) {
      console.error("Scanner error:", err);
      if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
        setError("Camera permission denied. Please allow camera access to scan QR codes.");
        setHasPermission(false);
      } else {
        setError(err.message || "Failed to start scanner");
      }
    }
  }, [isScanning, onScanSuccess, stopScanner]);

  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1) return;
    
    await stopScanner();
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    
    // Restart with new camera
    setTimeout(() => {
      hasScannedRef.current = false;
      startScanner();
    }, 100);
  }, [cameras, currentCameraIndex, stopScanner, startScanner]);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !torchSupported) return;
    
    try {
      await scannerRef.current.applyVideoConstraints({
        // @ts-ignore
        advanced: [{ torch: !torchEnabled }],
      });
      setTorchEnabled(!torchEnabled);
    } catch (err) {
      console.error("Torch toggle failed:", err);
    }
  }, [torchEnabled, torchSupported]);

  useEffect(() => {
    if (isOpen) {
      hasScannedRef.current = false;
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Scan QR Code</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            stopScanner();
            onClose();
          }}
          className="min-h-[44px] min-w-[44px]"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-destructive">{error}</p>
            <Button onClick={() => {
              setError(null);
              hasScannedRef.current = false;
              startScanner();
            }}>
              Try Again
            </Button>
          </div>
        ) : hasPermission === null ? (
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Requesting camera access...</p>
          </div>
        ) : (
          <div className="relative w-full max-w-sm">
            {/* Scanner container */}
            <div 
              ref={containerRef}
              id="qr-scanner-region"
              className="w-full aspect-square rounded-xl overflow-hidden bg-muted"
            />
            
            {/* Scan frame overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[250px] h-[250px] relative">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  
                  {/* Scanning animation */}
                  <div className="absolute inset-x-2 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
                </div>
              </div>
            </div>

            {/* Camera controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              {cameras.length > 1 && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={switchCamera}
                  className="rounded-full bg-background/80 backdrop-blur-sm"
                >
                  <SwitchCamera className="w-5 h-5" />
                </Button>
              )}
              {torchSupported && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={toggleTorch}
                  className={cn(
                    "rounded-full bg-background/80 backdrop-blur-sm",
                    torchEnabled && "bg-primary text-primary-foreground"
                  )}
                >
                  <Flashlight className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        )}
        
        <p className="text-sm text-muted-foreground mt-6 text-center max-w-xs">
          Position the QR code within the frame. It will be scanned automatically.
        </p>
      </div>
    </div>
  );
}
