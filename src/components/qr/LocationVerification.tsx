import { useState, useEffect } from "react";
import { MapPin, Loader2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface LocationVerificationProps {
  targetLat: number;
  targetLng: number;
  targetName: string;
  onVerified: () => void;
}

// Distance tolerance in meters (approximately 100 meters)
const DISTANCE_TOLERANCE_METERS = 100;

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export const LocationVerification = ({
  targetLat,
  targetLng,
  targetName,
  onVerified,
}: LocationVerificationProps) => {
  const [status, setStatus] = useState<"requesting" | "verifying" | "success" | "failed" | "denied">("requesting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const [userDistance, setUserDistance] = useState<number | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("denied");
      setErrorMessage("Geolocation is not supported by your browser. Please use a modern browser with location support.");
      return;
    }

    setStatus("verifying");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const distance = calculateDistance(latitude, longitude, targetLat, targetLng);
        setUserDistance(distance);

        // Consider accuracy - if user's accuracy is poor, be more lenient
        const effectiveTolerance = Math.max(DISTANCE_TOLERANCE_METERS, accuracy * 2);

        if (distance <= effectiveTolerance) {
          setStatus("success");
          setTimeout(() => {
            onVerified();
          }, 1500);
        } else {
          setStatus("failed");
          if (distance < 1000) {
            setErrorMessage(
              `You are approximately ${Math.round(distance)} meters away from the authorized location.`
            );
          } else {
            const distanceKm = (distance / 1000).toFixed(2);
            setErrorMessage(
              `You are approximately ${distanceKm} km away from the authorized location.`
            );
          }
        }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setStatus("denied");
            setErrorMessage("Location access is required to view this QR content. Please allow location access and try again.");
            break;
          case error.POSITION_UNAVAILABLE:
            setStatus("denied");
            setErrorMessage("Unable to determine your location. Please ensure GPS is enabled and try again.");
            break;
          case error.TIMEOUT:
            setStatus("denied");
            setErrorMessage("Location request timed out. Please try again.");
            break;
          default:
            setStatus("denied");
            setErrorMessage("An error occurred while accessing your location. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    // Auto-request on mount
    const timer = setTimeout(() => {
      requestLocation();
    }, 500);

    return () => clearTimeout(timer);
  }, [retryCount]);

  const handleRetry = () => {
    setStatus("requesting");
    setUserDistance(null);
    setRetryCount((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-hero flex items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 sm:w-96 h-64 sm:h-96 bg-primary/10 rounded-full blur-[100px] sm:blur-[120px] animate-pulse-glow" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm relative z-10"
      >
        <Card className="p-6 sm:p-8">
          {status === "requesting" && (
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">Location Required</h2>
              <p className="text-muted-foreground text-sm mb-6">
                This QR content is accessible only at a specific location. Please allow location access to continue.
              </p>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Requesting location access...</span>
              </div>
            </div>
          )}

          {status === "verifying" && (
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary animate-spin" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">Verifying Location</h2>
              <p className="text-muted-foreground text-sm">
                Checking if you're at the authorized location...
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center"
              >
                <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
              </motion.div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">Location Verified</h2>
              <p className="text-muted-foreground text-sm">
                Access granted. Loading content...
              </p>
            </div>
          )}

          {status === "failed" && (
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-7 h-7 sm:w-8 sm:h-8 text-destructive" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">Location Not Authorized</h2>
              <p className="text-muted-foreground text-sm mb-2">
                Your current location is not authorized for this QR content.
              </p>
              <p className="text-xs text-muted-foreground mb-4 px-3 py-2 bg-muted/50 rounded">
                {errorMessage}
              </p>
              <div className="text-xs text-muted-foreground mb-6 p-3 bg-secondary/50 rounded-lg">
                <p className="font-medium mb-1">Required location:</p>
                <p className="line-clamp-2">{targetName}</p>
              </div>
              <Button onClick={handleRetry} variant="outline" className="w-full min-h-[44px]">
                Try Again
              </Button>
            </div>
          )}

          {status === "denied" && (
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">Location Access Required</h2>
              <p className="text-muted-foreground text-sm mb-6">
                {errorMessage}
              </p>
              <Button onClick={handleRetry} className="w-full min-h-[44px]">
                Enable Location & Retry
              </Button>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};
