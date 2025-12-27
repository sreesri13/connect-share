import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  Globe, 
  Smartphone, 
  Monitor,
  QrCode,
  RefreshCw,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import {
  LineChart,
  Line,
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
import { isGAConfigured, GA_MEASUREMENT_ID } from "@/lib/analytics";

// Types for analytics data
interface AnalyticsOverview {
  totalVisits: number;
  uniqueVisitors: number;
  qrScans: number;
  profileViews: number;
  bounceRate: number;
  avgSessionDuration: string;
}

interface TrafficData {
  date: string;
  visits: number;
  uniqueVisitors: number;
}

interface TopPage {
  path: string;
  title: string;
  views: number;
  percentage: number;
}

interface DeviceData {
  device: string;
  value: number;
  color: string;
}

interface TrafficSource {
  source: string;
  visits: number;
  percentage: number;
}

interface CountryData {
  country: string;
  visits: number;
  flag: string;
}

// Demo data for when GA is not configured
const DEMO_OVERVIEW: AnalyticsOverview = {
  totalVisits: 2547,
  uniqueVisitors: 1823,
  qrScans: 892,
  profileViews: 456,
  bounceRate: 34.2,
  avgSessionDuration: "2m 45s",
};

const DEMO_TRAFFIC_DATA: TrafficData[] = [
  { date: "Mon", visits: 245, uniqueVisitors: 180 },
  { date: "Tue", visits: 312, uniqueVisitors: 225 },
  { date: "Wed", visits: 289, uniqueVisitors: 195 },
  { date: "Thu", visits: 378, uniqueVisitors: 290 },
  { date: "Fri", visits: 456, uniqueVisitors: 340 },
  { date: "Sat", visits: 523, uniqueVisitors: 410 },
  { date: "Sun", visits: 344, uniqueVisitors: 260 },
];

const DEMO_TOP_PAGES: TopPage[] = [
  { path: "/p/myprofile", title: "My Public Profile", views: 456, percentage: 35 },
  { path: "/pay?code=abc123", title: "Payment QR - Main", views: 312, percentage: 24 },
  { path: "/p/work", title: "Work Profile", views: 234, percentage: 18 },
  { path: "/pay?code=shop", title: "Payment QR - Shop", views: 178, percentage: 14 },
  { path: "/", title: "Landing Page", views: 112, percentage: 9 },
];

const DEMO_DEVICES: DeviceData[] = [
  { device: "Mobile", value: 68, color: "hsl(var(--primary))" },
  { device: "Desktop", value: 28, color: "hsl(var(--secondary))" },
  { device: "Tablet", value: 4, color: "hsl(var(--muted))" },
];

const DEMO_SOURCES: TrafficSource[] = [
  { source: "Direct", visits: 892, percentage: 35 },
  { source: "QR Code Scan", visits: 756, percentage: 30 },
  { source: "Social Media", visits: 512, percentage: 20 },
  { source: "Referral", visits: 256, percentage: 10 },
  { source: "Search", visits: 131, percentage: 5 },
];

const DEMO_COUNTRIES: CountryData[] = [
  { country: "India", visits: 1823, flag: "🇮🇳" },
  { country: "United States", visits: 312, flag: "🇺🇸" },
  { country: "United Kingdom", visits: 156, flag: "🇬🇧" },
  { country: "Canada", visits: 89, flag: "🇨🇦" },
  { country: "Australia", visits: 67, flag: "🇦🇺" },
];

export const AnalyticsSection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [overview, setOverview] = useState<AnalyticsOverview>(DEMO_OVERVIEW);
  const [trafficData, setTrafficData] = useState<TrafficData[]>(DEMO_TRAFFIC_DATA);
  const [topPages, setTopPages] = useState<TopPage[]>(DEMO_TOP_PAGES);
  const [devices, setDevices] = useState<DeviceData[]>(DEMO_DEVICES);
  const [sources, setSources] = useState<TrafficSource[]>(DEMO_SOURCES);
  const [countries, setCountries] = useState<CountryData[]>(DEMO_COUNTRIES);

  const gaConfigured = isGAConfigured();

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      if (gaConfigured) {
        // Fetch real analytics data from edge function
        const { data, error } = await supabase.functions.invoke('get-analytics', {
          body: { period: '7d' }
        });

        if (error) {
          console.error('Error fetching analytics:', error);
          // Fall back to demo data
        } else if (data) {
          // Update state with real data
          if (data.overview) setOverview(data.overview);
          if (data.trafficData) setTrafficData(data.trafficData);
          if (data.topPages) setTopPages(data.topPages);
          if (data.devices) setDevices(data.devices);
          if (data.sources) setSources(data.sources);
          if (data.countries) setCountries(data.countries);
        }
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendUp 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType;
    trend?: string;
    trendUp?: boolean;
  }) => (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <p className={`text-xs flex items-center gap-1 ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
                <TrendingUp className={`h-3 w-3 ${!trendUp && 'rotate-180'}`} />
                {trend}
              </p>
            )}
          </div>
          <div className="p-3 rounded-full bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
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
            Analytics Overview
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track your QR codes, profile views, and website traffic
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={gaConfigured ? "default" : "secondary"} className="text-xs">
            {gaConfigured ? "GA4 Connected" : "Demo Data"}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAnalytics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* GA Setup Notice */}
      {!gaConfigured && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Google Analytics not configured</p>
              <p className="text-xs text-muted-foreground">
                You're viewing demo data. To see real analytics, set up GA4:
              </p>
              <ol className="text-xs text-muted-foreground list-decimal ml-4 space-y-1">
                <li>Create a GA4 property at <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">analytics.google.com</a></li>
                <li>Copy your Measurement ID (starts with G-)</li>
                <li>Add it as VITE_GA_MEASUREMENT_ID environment variable</li>
                <li>For Data API access, add service account credentials</li>
              </ol>
              <Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild>
                <a href="https://developers.google.com/analytics/devguides/collection/ga4" target="_blank" rel="noopener noreferrer">
                  Learn more about GA4 setup <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Updated */}
      <p className="text-xs text-muted-foreground text-right">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </p>

      {/* Overview Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Total Visits" 
            value={overview.totalVisits.toLocaleString()} 
            icon={Eye}
            trend="+12.5% from last week"
            trendUp={true}
          />
          <MetricCard 
            title="Unique Visitors" 
            value={overview.uniqueVisitors.toLocaleString()} 
            icon={Users}
            trend="+8.2% from last week"
            trendUp={true}
          />
          <MetricCard 
            title="QR Code Scans" 
            value={overview.qrScans.toLocaleString()} 
            icon={QrCode}
            trend="+23.1% from last week"
            trendUp={true}
          />
          <MetricCard 
            title="Profile Views" 
            value={overview.profileViews.toLocaleString()} 
            icon={Globe}
            trend="+5.4% from last week"
            trendUp={true}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Over Time */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Traffic This Week</CardTitle>
            <CardDescription>Daily visits and unique visitors</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trafficData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="visits" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Total Visits"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uniqueVisitors" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--secondary))' }}
                    name="Unique Visitors"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Device Breakdown</CardTitle>
            <CardDescription>Traffic by device type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="flex items-center justify-center gap-8">
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie
                      data={devices}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {devices.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {devices.map((device, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {device.device === 'Mobile' ? (
                        <Smartphone className="h-5 w-5 text-primary" />
                      ) : (
                        <Monitor className="h-5 w-5 text-secondary" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{device.device}</p>
                        <p className="text-xs text-muted-foreground">{device.value}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pages & Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Top Pages</CardTitle>
            <CardDescription>Most visited pages and QR codes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {topPages.map((page, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{page.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{page.path}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{page.views.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{page.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Traffic Sources</CardTitle>
            <CardDescription>Where your visitors come from</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sources} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="source" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Countries */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Top Countries</CardTitle>
          <CardDescription>Visitor locations (country-level)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {countries.map((country, i) => (
                <div key={i} className="text-center p-4 rounded-lg bg-muted/30">
                  <span className="text-3xl">{country.flag}</span>
                  <p className="text-sm font-medium mt-2">{country.country}</p>
                  <p className="text-xs text-muted-foreground">{country.visits.toLocaleString()} visits</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsSection;
