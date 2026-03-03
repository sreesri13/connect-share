import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  QrCode,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  ScanLine,
  Store,
  CreditCard,
  FileText,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface UserAnalytics {
  totalQRCodes: number;
  totalBusinessQR: number;
  totalPayments: number;
  totalItems: number;
  totalScans: number;
  recentScans: Array<{
    date: string;
    scans: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    count: number;
    color: string;
  }>;
  topQRCodes: Array<{
    title: string;
    scans: number;
    type: 'profile' | 'business';
  }>;
}

export const AnalyticsSection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all data in parallel
      const [
        { count: qrCount },
        { count: bizCount },
        { count: payCount },
        { count: itemCount },
        { data: qrPages },
        { data: bizPages },
        { data: allScans },
      ] = await Promise.all([
        supabase.from('qr_pages').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_deleted', false),
        supabase.from('qr_business_pages').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_deleted', false),
        supabase.from('upi_payments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('qr_pages').select('id, title').eq('user_id', user.id).eq('is_deleted', false),
        supabase.from('qr_business_pages').select('id, title, business_name').eq('user_id', user.id).eq('is_deleted', false),
        supabase.from('qr_scans').select('scanned_at, device_type, qr_page_id, qr_business_page_id'),
      ]);

      const qrPageIds = (qrPages || []).map(p => p.id);
      const bizPageIds = (bizPages || []).map(p => p.id);

      // Filter scans belonging to this user
      const userScans = (allScans || []).filter(s => 
        (s.qr_page_id && qrPageIds.includes(s.qr_page_id)) ||
        (s.qr_business_page_id && bizPageIds.includes(s.qr_business_page_id))
      );

      // Recent scans (last 7 days)
      const now = new Date();
      const recentScans: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        recentScans[key] = 0;
      }
      userScans.forEach(s => {
        const d = new Date(s.scanned_at);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (key in recentScans) recentScans[key]++;
      });

      // Device breakdown
      const deviceMap: Record<string, number> = {};
      userScans.forEach(s => {
        const device = s.device_type || 'Unknown';
        deviceMap[device] = (deviceMap[device] || 0) + 1;
      });
      const deviceColors: Record<string, string> = {
        'Mobile': 'hsl(142, 76%, 36%)',
        'Desktop': 'hsl(221, 83%, 53%)',
        'Tablet': 'hsl(262, 83%, 58%)',
        'Unknown': 'hsl(var(--muted-foreground))',
      };
      const deviceBreakdown = Object.entries(deviceMap).map(([device, count]) => ({
        device,
        count,
        color: deviceColors[device] || 'hsl(var(--muted-foreground))',
      }));

      // Top QR codes by scans
      const scanCountMap: Record<string, number> = {};
      userScans.forEach(s => {
        const id = s.qr_page_id || s.qr_business_page_id || '';
        if (id) scanCountMap[id] = (scanCountMap[id] || 0) + 1;
      });

      const topQRCodes = Object.entries(scanCountMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, scans]) => {
          const qr = (qrPages || []).find(p => p.id === id);
          const biz = (bizPages || []).find(p => p.id === id);
          return {
            title: qr?.title || biz?.business_name || biz?.title || 'Untitled',
            scans,
            type: (biz ? 'business' : 'profile') as 'profile' | 'business',
          };
        });

      setAnalytics({
        totalQRCodes: qrCount || 0,
        totalBusinessQR: bizCount || 0,
        totalPayments: payCount || 0,
        totalItems: itemCount || 0,
        totalScans: userScans.length,
        recentScans: Object.entries(recentScans).map(([date, scans]) => ({ date, scans })),
        deviceBreakdown,
        topQRCodes,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const MetricCard = ({ title, value, icon: Icon, iconColor = "text-primary", bgColor = "bg-primary/10" }: { 
    title: string; value: string | number; icon: React.ElementType; iconColor?: string; bgColor?: string;
  }) => (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-xl sm:text-2xl font-bold">{value}</p>
          </div>
          <div className={`p-2 sm:p-3 rounded-full ${bgColor} flex-shrink-0`}>
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            My Analytics
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Your QR code performance at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Updated: {lastUpdated.toLocaleTimeString()}
          </p>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 sm:h-28" />)}
        </div>
      ) : analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <MetricCard title="Total Scans" value={analytics.totalScans} icon={ScanLine} iconColor="text-green-500" bgColor="bg-green-500/10" />
          <MetricCard title="QR Codes" value={analytics.totalQRCodes} icon={QrCode} iconColor="text-purple-500" bgColor="bg-purple-500/10" />
          <MetricCard title="Business QR" value={analytics.totalBusinessQR} icon={Store} iconColor="text-blue-500" bgColor="bg-blue-500/10" />
          <MetricCard title="Payments" value={analytics.totalPayments} icon={CreditCard} iconColor="text-orange-500" bgColor="bg-orange-500/10" />
          <MetricCard title="Total Items" value={analytics.totalItems} icon={FileText} iconColor="text-cyan-500" bgColor="bg-cyan-500/10" />
        </div>
      )}

      {/* Charts */}
      {!isLoading && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scans Last 7 Days */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Scans (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.recentScans}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="scans" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Device Breakdown */}
          {analytics.deviceBreakdown.length > 0 ? (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Scan Devices</CardTitle>
                <CardDescription>What devices scan your QR codes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={analytics.deviceBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="count" paddingAngle={2}>
                        {analytics.deviceBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {analytics.deviceBreakdown.map((d, i) => {
                      const Icon = d.device === 'Mobile' ? Smartphone : d.device === 'Tablet' ? Tablet : Monitor;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                          <Icon className="h-5 w-5" style={{ color: d.color }} />
                          <div>
                            <p className="text-sm font-medium">{d.device}</p>
                            <p className="text-xs text-muted-foreground">{d.count} scans</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Scan Devices</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-40">
                <p className="text-sm text-muted-foreground">No scan data yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Top QR Codes */}
      {!isLoading && analytics && analytics.topQRCodes.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Top QR Codes by Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topQRCodes.map((qr, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    qr.type === 'business' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{qr.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{qr.type}</p>
                  </div>
                  <p className="text-sm font-medium">{qr.scans} scans</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsSection;
