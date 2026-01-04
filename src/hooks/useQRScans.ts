import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ScanRecord {
  id: string;
  scanned_at: string;
  country: string | null;
  city: string | null;
  device_type: string | null;
}

interface QRScanStats {
  totalScans: number;
  scans: ScanRecord[];
  isLoading: boolean;
}

export function useQRScans(qrPageId: string | null) {
  const [stats, setStats] = useState<QRScanStats>({
    totalScans: 0,
    scans: [],
    isLoading: true,
  });

  useEffect(() => {
    if (!qrPageId) {
      setStats({ totalScans: 0, scans: [], isLoading: false });
      return;
    }

    const fetchScans = async () => {
      try {
        const { data, error } = await supabase
          .from('qr_scans')
          .select('id, scanned_at, country, city, device_type')
          .eq('qr_page_id', qrPageId)
          .order('scanned_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        setStats({
          totalScans: data?.length || 0,
          scans: data || [],
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to fetch scan stats:', error);
        setStats({ totalScans: 0, scans: [], isLoading: false });
      }
    };

    fetchScans();
  }, [qrPageId]);

  return stats;
}

// Function to record a scan - called from public pages
export async function recordQRScan(
  qrPageId: string,
  isBusinessPage: boolean = false
): Promise<void> {
  try {
    // Get basic device info
    const userAgent = navigator.userAgent;
    const deviceType = /mobile/i.test(userAgent) ? 'mobile' : /tablet/i.test(userAgent) ? 'tablet' : 'desktop';

    const scanData: {
      qr_page_id?: string;
      qr_business_page_id?: string;
      user_agent: string;
      device_type: string;
    } = {
      user_agent: userAgent.substring(0, 500),
      device_type: deviceType,
    };

    if (isBusinessPage) {
      scanData.qr_business_page_id = qrPageId;
    } else {
      scanData.qr_page_id = qrPageId;
    }

    await supabase.from('qr_scans').insert(scanData);
  } catch (error) {
    console.error('Failed to record scan:', error);
  }
}
