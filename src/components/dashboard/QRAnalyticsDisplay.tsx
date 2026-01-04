import { useState, useEffect } from "react";
import { BarChart3, Calendar, MapPin, Smartphone, Laptop, Tablet, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ScanRecord {
  id: string;
  scanned_at: string;
  country: string | null;
  city: string | null;
  device_type: string | null;
}

interface QRAnalyticsDisplayProps {
  qrPageId: string;
}

export function QRAnalyticsDisplay({ qrPageId }: QRAnalyticsDisplayProps) {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        // Get total count
        const { count, error: countError } = await supabase
          .from('qr_scans')
          .select('*', { count: 'exact', head: true })
          .eq('qr_page_id', qrPageId);

        if (countError) throw countError;
        setTotalCount(count || 0);

        // Get recent scans
        const { data, error } = await supabase
          .from('qr_scans')
          .select('id, scanned_at, country, city, device_type')
          .eq('qr_page_id', qrPageId)
          .order('scanned_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setScans(data || []);
      } catch (error) {
        console.error('Failed to fetch scan stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScans();
  }, [qrPageId]);

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-3 h-3" />;
      case 'tablet':
        return <Tablet className="w-3 h-3" />;
      default:
        return <Laptop className="w-3 h-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <Label className="font-medium">Scan Analytics</Label>
      </div>

      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{totalCount}</p>
          <p className="text-sm text-muted-foreground">Total Scans</p>
        </div>
      </div>

      {scans.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Recent Scans</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center justify-between p-2 rounded bg-secondary/30 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span>{format(new Date(scan.scanned_at), "MMM d, h:mm a")}</span>
                </div>
                <div className="flex items-center gap-2">
                  {scan.city && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {scan.city}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {getDeviceIcon(scan.device_type)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">
          No scans recorded yet. Analytics will appear here once your QR code is scanned.
        </p>
      )}
    </div>
  );
}
