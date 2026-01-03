import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, Navigation, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

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

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export const LocationPicker = ({
  enabled,
  onEnabledChange,
  location,
  onLocationChange,
}: LocationPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize map
  useEffect(() => {
    if (!enabled || !mapContainerRef.current) return;

    // Only initialize if map doesn't exist
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      return;
    }

    const defaultCenter: [number, number] = location
      ? [location.lat, location.lng]
      : [20.5937, 78.9629]; // Default to India center

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: location ? 15 : 5,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add existing location marker if available
    if (location) {
      const marker = L.marker([location.lat, location.lng]).addTo(map);
      marker.bindPopup(location.name).openPopup();
      markerRef.current = marker;
    }

    // Handle map click to set location
    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      await reverseGeocode(lat, lng);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [enabled]);

  // Update marker when location changes
  useEffect(() => {
    if (!mapInstanceRef.current || !enabled) return;

    if (location) {
      if (markerRef.current) {
        markerRef.current.setLatLng([location.lat, location.lng]);
        markerRef.current.setPopupContent(location.name);
      } else {
        const marker = L.marker([location.lat, location.lng]).addTo(mapInstanceRef.current);
        marker.bindPopup(location.name).openPopup();
        markerRef.current = marker;
      }
      mapInstanceRef.current.setView([location.lat, location.lng], 15);
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [location, enabled]);

  // Reverse geocode coordinates to address using Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );
      const data = await response.json();
      const name = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      
      onLocationChange({ lat, lng, name });
      setSearchQuery(name);
      toast.success("Location selected");
    } catch (error) {
      // Fallback to coordinates if geocoding fails
      const name = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      onLocationChange({ lat, lng, name });
      setSearchQuery(name);
      toast.success("Location selected");
    }
  };

  // Search for locations using Nominatim
  const searchLocations = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );
      const data: NominatimResult[] = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(query);
    }, 500);
  }, [searchLocations]);

  // Handle place selection from search results
  const handleSelectPlace = useCallback((result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.display_name;

    onLocationChange({ lat, lng, name });
    setSearchQuery(name);
    setSearchResults([]);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15);
    }

    toast.success("Location selected");
  }, [onLocationChange]);

  // Detect current location using browser Geolocation API
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLoadingLocation(true);

    // First try with high accuracy, then fallback to low accuracy if it fails
    const tryGetLocation = (highAccuracy: boolean, attempt: number) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          await reverseGeocode(lat, lng);
          setIsLoadingLocation(false);
        },
        (error) => {
          // If high accuracy fails with timeout, retry with low accuracy
          if (highAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
            console.log("High accuracy failed, trying with low accuracy...");
            tryGetLocation(false, attempt + 1);
            return;
          }

          setIsLoadingLocation(false);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              toast.error("Location permission denied. Please allow location access in your browser settings.");
              break;
            case error.POSITION_UNAVAILABLE:
              toast.error("Location unavailable. Please check your device's location settings.");
              break;
            case error.TIMEOUT:
              toast.error("Could not detect location. Please try again or search for your location.");
              break;
            default:
              toast.error("Failed to detect location. Please try searching instead.");
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 15000 : 30000,
          maximumAge: 60000, // Accept cached position up to 1 minute old
        }
      );
    };

    tryGetLocation(true, 1);
  }, []);

  // Clear location
  const handleClearLocation = useCallback(() => {
    onLocationChange(null);
    setSearchQuery("");
    setSearchResults([]);
    
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([20.5937, 78.9629], 5);
    }
  }, [onLocationChange]);

  return (
    <div className="space-y-2 sm:space-y-4 p-2 sm:p-4 rounded-lg bg-secondary/30 border border-border/50">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="location-toggle" className="flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm">
          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
          <span>Location Lock</span>
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
          className="scale-90 sm:scale-100"
        />
      </div>

      {enabled && (
        <div className="space-y-2 sm:space-y-4 pt-1">
          {/* Search Input */}
          <div className="relative">
            <div className="flex gap-1.5 sm:gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                <Input
                  placeholder="Search location..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-7 sm:pl-10 h-9 sm:min-h-[44px] text-xs sm:text-sm"
                />
                {isSearching && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleDetectLocation}
                disabled={isLoadingLocation}
                className="h-9 w-9 sm:min-h-[44px] sm:min-w-[44px] shrink-0 p-0"
                title="Detect My Location"
              >
                {isLoadingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-[200px] overflow-auto">
                <CardContent className="p-0">
                  {searchResults.map((result) => (
                    <button
                      key={result.place_id}
                      type="button"
                      className="w-full px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors border-b last:border-0"
                      onClick={() => handleSelectPlace(result)}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <span className="line-clamp-2">{result.display_name}</span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Selected Location Display */}
          {location && (
            <div className="flex items-start gap-1.5 p-2 sm:p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs sm:text-sm text-foreground">Location Set</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{location.name}</p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={handleClearLocation}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Map Container */}
          <div
            ref={mapContainerRef}
            className="w-full h-[140px] sm:h-[200px] rounded-lg border border-border overflow-hidden bg-muted z-0"
            style={{ position: "relative" }}
          />

          <p className="text-[9px] sm:text-xs text-muted-foreground">
            Tap map or search to set location.
          </p>
        </div>
      )}
    </div>
  );
};
