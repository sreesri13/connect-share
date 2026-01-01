import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Eye, 
  Globe, 
  Smartphone, 
  Monitor,
  Tablet,
  QrCode,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Radio,
  Link2,
  MousePointerClick,
  Clock,
  UserPlus,
  UserCheck,
  Share2
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
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { isGAConfigured } from "@/lib/analytics";

// Types for analytics data
interface AnalyticsOverview {
  totalVisits: number;
  uniqueVisitors: number;
  returningVisitors: number;
  newUsers: number;
  qrScans: number;
  profileViews: number;
  bounceRate: number;
  avgSessionDuration: string;
  avgSessionSeconds: number;
  sessions: number;
  visitsTrend: number;
  visitorsTrend: number;
}

interface RealtimeData {
  activeUsers: number;
}

interface TrafficData {
  date: string;
  fullDate: string;
  visits: number;
  uniqueVisitors: number;
}

interface TopPage {
  path: string;
  title: string;
  views: number;
  percentage: number;
  isQRPage: boolean;
}

interface DeviceData {
  device: string;
  value: number;
  count: number;
  color: string;
}

interface TrafficSource {
  source: string;
  visits: number;
  percentage: number;
}

interface CountryData {
  country: string;
  region: string;
  visits: number;
  flag: string;
}

interface QRTrafficData {
  qrScans: number;
  urlOpens: number;
  total: number;
  qrPercentage: number;
}

interface EngagementData {
  qrPageViews: number;
  productClicks: number;
  topPages: Array<{
    path: string;
    avgTime: string;
    avgTimeSeconds: number;
    pageViews: number;
    engagedSessions: number;
  }>;
  linkClicks: Array<{
    url: string;
    clicks: number;
  }>;
}

type DateRange = "today" | "7d" | "30d";

export const AnalyticsSection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [realtime, setRealtime] = useState<RealtimeData>({ activeUsers: 0 });
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [sources, setSources] = useState<TrafficSource[]>([]);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [qrTraffic, setQRTraffic] = useState<QRTrafficData | null>(null);
  const [engagement, setEngagement] = useState<EngagementData | null>(null);

  const gaConfigured = isGAConfigured();

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('get-analytics', {
        body: { period: dateRange }
      });

      if (fetchError) {
        console.error('Error fetching analytics:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (data) {
        setIsConfigured(data.configured === true);
        
        if (data.configured) {
          if (data.overview) setOverview(data.overview);
          if (data.realtime) setRealtime(data.realtime);
          if (data.trafficData) setTrafficData(data.trafficData);
          if (data.topPages) setTopPages(data.topPages);
          if (data.devices) setDevices(data.devices);
          if (data.sources) setSources(data.sources);
          if (data.countries) setCountries(data.countries);
          if (data.qrTraffic) setQRTraffic(data.qrTraffic);
          if (data.engagement) setEngagement(data.engagement);
        }
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend,
    trendValue,
    iconColor = "text-primary",
    bgColor = "bg-primary/10"
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    iconColor?: string;
    bgColor?: string;
  }) => (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-xl sm:text-2xl font-bold">{value}</p>
            {trendValue && (
              <p className={`text-xs flex items-center gap-1 ${
                trend === 'up' ? 'text-green-500' : 
                trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                 trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
                {trendValue}
              </p>
            )}
          </div>
          <div className={`p-2 sm:p-3 rounded-full ${bgColor} flex-shrink-0`}>
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Not configured state
  if (!isConfigured && !isLoading) {
    return (
      <div className="space-y-6">
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
        </div>

        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-8 w-8 text-amber-500 flex-shrink-0" />
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Google Analytics Not Configured</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    To view real analytics data, please configure Google Analytics 4 credentials.
                  </p>
                </div>
                
                <div className="space-y-3 text-sm">
                  <p className="font-medium">Setup Instructions:</p>
                  <ol className="list-decimal ml-4 space-y-2 text-muted-foreground">
                    <li>
                      Create a GA4 property at{" "}
                      <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" 
                         className="text-primary hover:underline">
                        analytics.google.com
                      </a>
                    </li>
                    <li>
                      Create a service account in{" "}
                      <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" 
                         rel="noopener noreferrer" className="text-primary hover:underline">
                        Google Cloud Console
                      </a>
                    </li>
                    <li>Grant the service account "Viewer" role on your GA4 property</li>
                    <li>Download the JSON key file</li>
                    <li>
                      Add the following secrets in Lovable Cloud:
                      <ul className="list-disc ml-4 mt-1 space-y-1">
                        <li><code className="bg-muted px-1 rounded">GA_PROPERTY_ID</code> - Your GA4 property ID</li>
                        <li><code className="bg-muted px-1 rounded">GA_SERVICE_ACCOUNT_EMAIL</code> - Service account email</li>
                        <li><code className="bg-muted px-1 rounded">GA_PRIVATE_KEY</code> - Private key from JSON file</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <Button variant="outline" size="sm" asChild>
                  <a href="https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries" 
                     target="_blank" rel="noopener noreferrer">
                    View Full Documentation <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            Real-time insights from Google Analytics 4
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <TabsList className="h-8">
              <TabsTrigger value="today" className="text-xs px-2">Today</TabsTrigger>
              <TabsTrigger value="7d" className="text-xs px-2">7 Days</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-2">30 Days</TabsTrigger>
            </TabsList>
          </Tabs>
          <Badge variant="default" className="text-xs bg-green-500/20 text-green-500 border-green-500/30">
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAnalytics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-right">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </p>

      {/* Active Users & Overview Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 sm:h-28" />
          ))}
        </div>
      ) : overview && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Real-time Active Users */}
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Active Now</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-500">{realtime.activeUsers}</p>
                    <p className="text-xs flex items-center gap-1 text-green-500">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Real-time
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-full bg-green-500/20">
                    <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <MetricCard 
              title="Total Visits" 
              value={overview.totalVisits.toLocaleString()} 
              icon={Eye}
              trend={overview.visitsTrend > 0 ? "up" : overview.visitsTrend < 0 ? "down" : "neutral"}
              trendValue={`${overview.visitsTrend > 0 ? '+' : ''}${overview.visitsTrend}%`}
            />
            <MetricCard 
              title="Unique Visitors" 
              value={overview.uniqueVisitors.toLocaleString()} 
              icon={Users}
              trend={overview.visitorsTrend > 0 ? "up" : overview.visitorsTrend < 0 ? "down" : "neutral"}
              trendValue={`${overview.visitorsTrend > 0 ? '+' : ''}${overview.visitorsTrend}%`}
            />
            <MetricCard 
              title="Returning" 
              value={overview.returningVisitors.toLocaleString()} 
              icon={UserCheck}
              iconColor="text-blue-500"
              bgColor="bg-blue-500/10"
            />
            <MetricCard 
              title="QR Scans" 
              value={overview.qrScans.toLocaleString()} 
              icon={QrCode}
              iconColor="text-purple-500"
              bgColor="bg-purple-500/10"
            />
            <MetricCard 
              title="Bounce Rate" 
              value={`${overview.bounceRate}%`} 
              icon={TrendingDown}
              iconColor="text-orange-500"
              bgColor="bg-orange-500/10"
            />
          </div>

          {/* Additional Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard 
              title="Avg. Session" 
              value={overview.avgSessionDuration} 
              icon={Clock}
              iconColor="text-cyan-500"
              bgColor="bg-cyan-500/10"
            />
            <MetricCard 
              title="New Users" 
              value={overview.newUsers.toLocaleString()} 
              icon={UserPlus}
              iconColor="text-emerald-500"
              bgColor="bg-emerald-500/10"
            />
            <MetricCard 
              title="Profile Views" 
              value={overview.profileViews.toLocaleString()} 
              icon={Globe}
              iconColor="text-indigo-500"
              bgColor="bg-indigo-500/10"
            />
            <MetricCard 
              title="Sessions" 
              value={overview.sessions.toLocaleString()} 
              icon={MousePointerClick}
              iconColor="text-pink-500"
              bgColor="bg-pink-500/10"
            />
          </div>
        </>
      )}

      {/* QR vs URL Traffic */}
      {!isLoading && qrTraffic && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              QR Code vs Shared URL Traffic
            </CardTitle>
            <CardDescription>How users are accessing your QR pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <QrCode className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-bold">{qrTraffic.qrScans.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">QR Code Scans</p>
                <p className="text-xs text-purple-500 mt-1">{qrTraffic.qrPercentage}% of traffic</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Link2 className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{qrTraffic.urlOpens.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Shared URL Opens</p>
                <p className="text-xs text-blue-500 mt-1">{100 - qrTraffic.qrPercentage}% of traffic</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                <Eye className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{qrTraffic.total.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Tagged Traffic</p>
                <p className="text-xs text-primary mt-1">All tracked sources</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Over Time */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Traffic Over Time</CardTitle>
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
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="visits" 
                    stroke="hsl(142, 76%, 36%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 76%, 36%)' }}
                    name="Total Visits"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uniqueVisitors" 
                    stroke="hsl(221, 83%, 53%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(221, 83%, 53%)' }}
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
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={devices}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
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
                  {devices.map((device, i) => {
                    const Icon = device.device === 'Mobile' ? Smartphone : 
                                 device.device === 'Tablet' ? Tablet : Monitor;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: device.color }} />
                        <Icon className="h-5 w-5" style={{ color: device.color }} />
                        <div>
                          <p className="text-sm font-medium">{device.device}</p>
                          <p className="text-xs text-muted-foreground">
                            {device.value}% ({device.count.toLocaleString()} users)
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pages & Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top QR Pages */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Top Pages</CardTitle>
            <CardDescription>Most visited pages (QR pages highlighted)</CardDescription>
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
                {topPages.slice(0, 7).map((page, i) => {
                  // Extract simplified title - remove common suffixes
                  const simplifiedTitle = page.title
                    .replace(/\s*[-–|]\s*ConnectHUB.*$/i, '')
                    .replace(/\s*[-–|]\s*Share Your Digital Identity.*$/i, '')
                    .trim() || page.path;
                  
                  return (
                    <div 
                      key={i} 
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                        page.isQRPage ? 'bg-purple-500/5 border border-purple-500/20' : ''
                      }`}
                      onClick={() => window.open(page.path, '_blank')}
                    >
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                        page.isQRPage ? 'bg-purple-500/20 text-purple-500' : 'bg-primary/10 text-primary'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{simplifiedTitle}</p>
                          {page.isQRPage && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-purple-500/20 text-purple-500">
                              QR
                            </Badge>
                          )}
                          <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{page.path}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium">{page.views.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{page.percentage}%</p>
                      </div>
                    </div>
                  );
                })}
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
                  <YAxis 
                    dataKey="source" 
                    type="category" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    width={100}
                    tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + '...' : value}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                    formatter={(value: number) => [value.toLocaleString(), 'Visits']}
                  />
                  <Bar 
                    dataKey="visits" 
                    fill="hsl(262, 83%, 58%)" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Engagement & Location */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Link Clicks */}
        {engagement && engagement.linkClicks.length > 0 && (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MousePointerClick className="h-5 w-5 text-primary" />
                Top Link Clicks
              </CardTitle>
              <CardDescription>Most clicked links on your QR pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {engagement.linkClicks.slice(0, 5).map((link, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{link.url}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium">{link.clicks.toLocaleString()} clicks</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Countries */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Top Locations
            </CardTitle>
            <CardDescription>Visitor locations by country & region</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {countries.slice(0, 6).map((country, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-2xl">{country.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{country.country}</p>
                      {country.region && (
                        <p className="text-xs text-muted-foreground">{country.region}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{country.visits.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">visitors</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR Page Engagement */}
      {engagement && engagement.topPages.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              QR Page Engagement
            </CardTitle>
            <CardDescription>Time spent on QR-generated pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {engagement.topPages.slice(0, 6).map((page, i) => (
                <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-sm font-medium truncate mb-2">{page.path}</p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Avg. Time: <strong className="text-foreground">{page.avgTime}</strong></span>
                    <span>Views: <strong className="text-foreground">{page.pageViews}</strong></span>
                  </div>
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
