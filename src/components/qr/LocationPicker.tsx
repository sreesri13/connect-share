import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, Navigation, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

// Helper to get google maps safely
const getGoogleMaps = () => (window as any).google?.maps;

export interface LocationData {
  lat: number;
  lng: number;
  name: string;
}

interface LocationPickerProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  location: LocationData | null;
  onLocationChange: (location: LocationData | null) => void;
}

export const LocationPicker = ({
  enabled,
  onEnabledChange,
  location,
  onLocationChange,
}: LocationPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);

  // Load Google Maps script
  useEffect(() => {
    if (!enabled) return;

    const loadGoogleMaps = () => {
      const maps = getGoogleMaps();
      if (maps) {
        setIsMapLoaded(true);
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        toast.error("Google Maps API key not configured");
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsMapLoaded(true);
      script.onerror = () => toast.error("Failed to load Google Maps");
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [enabled]);

  // Initialize map when loaded
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !enabled) return;

    const maps = getGoogleMaps();
    if (!maps) return;

    const defaultCenter = location
      ? { lat: location.lat, lng: location.lng }
      : { lat: 20.5937, lng: 78.9629 }; // Default to India center

    mapInstanceRef.current = new maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: location ? 15 : 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    autocompleteServiceRef.current = new maps.places.AutocompleteService();
    placesServiceRef.current = new maps.places.PlacesService(mapInstanceRef.current);
    geocoderRef.current = new maps.Geocoder();

    if (location) {
      placeMarker({ lat: location.lat, lng: location.lng }, location.name);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [isMapLoaded, enabled]);

  const placeMarker = useCallback((position: { lat: number; lng: number }, title: string) => {
    if (!mapInstanceRef.current) return;

    const maps = getGoogleMaps();
    if (!maps) return;

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = new maps.Marker({
      position,
      map: mapInstanceRef.current,
      title,
      animation: maps.Animation.DROP,
    });

    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.setZoom(15);
  }, []);

  // Handle search input
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);

    if (!query.trim() || !autocompleteServiceRef.current) {
      setPredictions([]);
      return;
    }

    const maps = getGoogleMaps();
    if (!maps) return;

    autocompleteServiceRef.current.getPlacePredictions(
      { input: query },
      (results: any[], status: string) => {
        if (status === maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results.slice(0, 5));
        } else {
          setPredictions([]);
        }
      }
    );
  }, []);

  // Handle place selection
  const handleSelectPlace = useCallback((placeId: string, description: string) => {
    if (!placesServiceRef.current) return;

    const maps = getGoogleMaps();
    if (!maps) return;

    placesServiceRef.current.getDetails(
      { placeId, fields: ["geometry", "name", "formatted_address"] },
      (place: any, status: string) => {
        if (status === maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const name = place.name || place.formatted_address || description;

          onLocationChange({ lat, lng, name });
          placeMarker({ lat, lng }, name);
          setSearchQuery(name);
          setPredictions([]);
          toast.success("Location selected");
        } else {
          toast.error("Failed to get location details");
        }
      }
    );
  }, [onLocationChange, placeMarker]);

  // Detect current location
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        if (!geocoderRef.current) {
          onLocationChange({ lat, lng, name: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
          placeMarker({ lat, lng }, "Selected Location");
          setIsLoadingLocation(false);
          toast.success("Location detected");
          return;
        }

        geocoderRef.current.geocode(
          { location: { lat, lng } },
          (results: any[], status: string) => {
            setIsLoadingLocation(false);

            if (status === "OK" && results[0]) {
              const name = results[0].formatted_address;
              onLocationChange({ lat, lng, name });
              placeMarker({ lat, lng }, name);
              setSearchQuery(name);
              toast.success("Location detected");
            } else {
              onLocationChange({ lat, lng, name: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
              placeMarker({ lat, lng }, "Selected Location");
              toast.success("Location detected");
            }
          }
        );
      },
      (error) => {
        setIsLoadingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location unavailable");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out");
            break;
          default:
            toast.error("Failed to detect location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onLocationChange, placeMarker]);

  // Clear location
  const handleClearLocation = useCallback(() => {
    onLocationChange(null);
    setSearchQuery("");
    setPredictions([]);
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: 20.5937, lng: 78.9629 });
      mapInstanceRef.current.setZoom(5);
    }
  }, [onLocationChange]);

  return (
    <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
      <div className="flex items-center justify-between">
        <Label htmlFor="location-toggle" className="flex items-center gap-2 cursor-pointer">
          <MapPin className="w-4 h-4 text-primary" />
          Enable Location-Based Access (Google Maps)
        </Label>
        <Switch
          id="location-toggle"
          checked={enabled}
          onCheckedChange={(checked) => {
            onEnabledChange(checked);
            if (!checked) {
              handleClearLocation();
            }
          }}
        />
      </div>

      {enabled && (
        <div className="space-y-4 pt-2">
          {/* Search Input */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search for a location..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleDetectLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Predictions Dropdown */}
            {predictions.length > 0 && (
              <Card className="absolute z-50 w-full mt-1 shadow-lg">
                <CardContent className="p-0">
                  {predictions.map((prediction) => (
                    <button
                      key={prediction.place_id}
                      type="button"
                      className="w-full px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors border-b last:border-0"
                      onClick={() => handleSelectPlace(prediction.place_id, prediction.description)}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <span className="line-clamp-2">{prediction.description}</span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Selected Location Display */}
          {location && (
            <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">Selected Location</p>
                <p className="text-xs text-muted-foreground truncate">{location.name}</p>
                <p className="text-xs text-muted-foreground">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleClearLocation}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Map Container */}
          <div
            ref={mapRef}
            className="w-full h-[200px] rounded-lg border border-border overflow-hidden bg-muted"
          >
            {!isMapLoaded && (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Users scanning this QR code will need to be at the selected location to access the content.
          </p>
        </div>
      )}
    </div>
  );
};
