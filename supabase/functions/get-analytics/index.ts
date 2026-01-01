/**
 * Google Analytics Data API Edge Function
 * 
 * Fetches real-time and historical analytics data from GA4.
 * 
 * REQUIRED SECRETS:
 * - GA_PROPERTY_ID: Your GA4 property ID
 * - GA_SERVICE_ACCOUNT_EMAIL: Service account email
 * - GA_PRIVATE_KEY: Service account private key
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create JWT for Google API authentication
async function createGoogleJWT(serviceAccountEmail: string, privateKey: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header));
  const claimB64 = btoa(JSON.stringify(claim));
  const signatureInput = `${headerB64}.${claimB64}`;

  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${headerB64}.${claimB64}.${signatureB64}`;
}

async function getAccessToken(serviceAccountEmail: string, privateKey: string): Promise<string> {
  const jwt = await createGoogleJWT(serviceAccountEmail, privateKey);
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token error:", error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Fetch realtime active users
async function fetchRealtimeData(propertyId: string, accessToken: string) {
  console.log("Fetching realtime data...");
  
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metrics: [{ name: "activeUsers" }],
      }),
    }
  );

  if (!response.ok) {
    console.error("Realtime API error:", await response.text());
    return { activeUsers: 0 };
  }

  const data = await response.json();
  return {
    activeUsers: parseInt(data.rows?.[0]?.metricValues?.[0]?.value || "0"),
  };
}

// Fetch analytics data from GA4 Data API
async function fetchAnalyticsData(propertyId: string, accessToken: string, period: string) {
  const endDate = new Date();
  const startDate = new Date();
  const prevEndDate = new Date();
  const prevStartDate = new Date();
  
  let days = 7;
  switch (period) {
    case "today":
      days = 0;
      startDate.setHours(0, 0, 0, 0);
      break;
    case "7d":
      days = 7;
      break;
    case "30d":
      days = 30;
      break;
  }
  
  if (days > 0) {
    startDate.setDate(endDate.getDate() - days);
    prevEndDate.setDate(startDate.getDate() - 1);
    prevStartDate.setDate(prevEndDate.getDate() - days);
  }

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  console.log(`Fetching analytics from ${formatDate(startDate)} to ${formatDate(endDate)}`);

  // Fetch all reports in parallel
  const [
    overviewRes,
    trafficRes,
    pagesRes,
    devicesRes,
    sourcesRes,
    countriesRes,
    eventsRes,
    qrTrafficRes,
    linkClicksRes,
    engagementRes,
    prevOverviewRes,
  ] = await Promise.all([
    // Overview metrics
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        metrics: [
          { name: "screenPageViews" },
          { name: "activeUsers" },
          { name: "newUsers" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
          { name: "sessions" },
        ],
      }),
    }),
    // Traffic by date
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    }),
    // Top pages
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
    }),
    // Device breakdown
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
      }),
    }),
    // Traffic sources with UTM breakdown
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      }),
    }),
    // Countries
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "country" }, { name: "region" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 10,
      }),
    }),
    // Custom events (qr_scan, profile_view, etc.)
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          orGroup: {
            expressions: [
              { filter: { fieldName: "eventName", stringFilter: { value: "qr_scan" } } },
              { filter: { fieldName: "eventName", stringFilter: { value: "qr_page_view" } } },
              { filter: { fieldName: "eventName", stringFilter: { value: "qr_url_open" } } },
              { filter: { fieldName: "eventName", stringFilter: { value: "profile_view" } } },
              { filter: { fieldName: "eventName", stringFilter: { value: "payment_qr_scan" } } },
              { filter: { fieldName: "eventName", stringFilter: { value: "product_click" } } },
            ],
          },
        },
      }),
    }),
    // QR vs URL traffic breakdown
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: {
          orGroup: {
            expressions: [
              { 
                andGroup: {
                  expressions: [
                    { filter: { fieldName: "sessionSource", stringFilter: { value: "qr" } } },
                    { filter: { fieldName: "sessionMedium", stringFilter: { value: "scan" } } },
                  ]
                }
              },
              { 
                andGroup: {
                  expressions: [
                    { filter: { fieldName: "sessionSource", stringFilter: { value: "link" } } },
                    { filter: { fieldName: "sessionMedium", stringFilter: { value: "share" } } },
                  ]
                }
              },
            ],
          },
        },
      }),
    }),
    // Link clicks
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "eventName" }, { name: "customEvent:link_url" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: { fieldName: "eventName", stringFilter: { value: "link_click" } },
        },
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 10,
      }),
    }),
    // Engagement metrics
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "pagePath" }],
        metrics: [
          { name: "userEngagementDuration" },
          { name: "screenPageViews" },
          { name: "engagedSessions" },
        ],
        dimensionFilter: {
          filter: { 
            fieldName: "pagePath", 
            stringFilter: { matchType: "BEGINS_WITH", value: "/p/" } 
          },
        },
        orderBys: [{ metric: { metricName: "userEngagementDuration" }, desc: true }],
        limit: 10,
      }),
    }),
    // Previous period for comparison
    days > 0 ? fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(prevStartDate), endDate: formatDate(prevEndDate) }],
        metrics: [
          { name: "screenPageViews" },
          { name: "activeUsers" },
          { name: "sessions" },
        ],
      }),
    }) : Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
  ]);

  const [overview, traffic, pages, devices, sources, countries, events, qrTraffic, linkClicks, engagement, prevOverview] = await Promise.all([
    overviewRes.json(),
    trafficRes.json(),
    pagesRes.json(),
    devicesRes.json(),
    sourcesRes.json(),
    countriesRes.json(),
    eventsRes.json(),
    qrTrafficRes.json(),
    linkClicksRes.json(),
    engagementRes.json(),
    prevOverviewRes.json(),
  ]);

  return { overview, traffic, pages, devices, sources, countries, events, qrTraffic, linkClicks, engagement, prevOverview };
}

// Process raw GA4 data into dashboard format
function processAnalyticsData(rawData: any, realtimeData: any) {
  const { overview, traffic, pages, devices, sources, countries, events, qrTraffic, linkClicks, engagement, prevOverview } = rawData;

  // Process overview metrics
  const overviewRow = overview.rows?.[0]?.metricValues || [];
  const prevOverviewRow = prevOverview.rows?.[0]?.metricValues || [];
  
  const totalVisits = parseInt(overviewRow[0]?.value || "0");
  const uniqueVisitors = parseInt(overviewRow[1]?.value || "0");
  const newUsers = parseInt(overviewRow[2]?.value || "0");
  const bounceRate = parseFloat(overviewRow[3]?.value || "0") * 100;
  const avgDuration = parseInt(overviewRow[4]?.value || "0");
  const sessions = parseInt(overviewRow[5]?.value || "0");
  
  const prevTotalVisits = parseInt(prevOverviewRow[0]?.value || "0");
  const prevUniqueVisitors = parseInt(prevOverviewRow[1]?.value || "0");
  
  const returningVisitors = uniqueVisitors - newUsers;
  const minutes = Math.floor(avgDuration / 60);
  const seconds = avgDuration % 60;

  // Calculate trends
  const visitsTrend = prevTotalVisits > 0 ? ((totalVisits - prevTotalVisits) / prevTotalVisits * 100).toFixed(1) : "0";
  const visitorsTrend = prevUniqueVisitors > 0 ? ((uniqueVisitors - prevUniqueVisitors) / prevUniqueVisitors * 100).toFixed(1) : "0";

  // Process events
  let qrScans = 0;
  let profileViews = 0;
  let qrPageViews = 0;
  let urlOpens = 0;
  let productClicks = 0;
  
  (events.rows || []).forEach((row: any) => {
    const eventName = row.dimensionValues?.[0]?.value;
    const count = parseInt(row.metricValues?.[0]?.value || "0");
    if (eventName === "qr_scan" || eventName === "payment_qr_scan") qrScans += count;
    if (eventName === "profile_view") profileViews += count;
    if (eventName === "qr_page_view") qrPageViews += count;
    if (eventName === "qr_url_open") urlOpens += count;
    if (eventName === "product_click") productClicks += count;
  });

  // Process QR vs URL traffic
  let qrTrafficCount = 0;
  let urlTrafficCount = 0;
  (qrTraffic.rows || []).forEach((row: any) => {
    const source = row.dimensionValues?.[0]?.value;
    const medium = row.dimensionValues?.[1]?.value;
    const count = parseInt(row.metricValues?.[0]?.value || "0");
    if (source === "qr" && medium === "scan") qrTrafficCount = count;
    if (source === "link" && medium === "share") urlTrafficCount = count;
  });

  // Process traffic data
  const trafficData = (traffic.rows || []).slice(-7).map((row: any) => {
    const dateStr = row.dimensionValues?.[0]?.value || "";
    const date = new Date(
      parseInt(dateStr.slice(0, 4)),
      parseInt(dateStr.slice(4, 6)) - 1,
      parseInt(dateStr.slice(6, 8))
    );
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      date: dayNames[date.getDay()],
      fullDate: date.toISOString().split("T")[0],
      visits: parseInt(row.metricValues?.[0]?.value || "0"),
      uniqueVisitors: parseInt(row.metricValues?.[1]?.value || "0"),
    };
  });

  // Process top pages (filter for QR pages)
  const totalPageViews = (pages.rows || []).reduce(
    (sum: number, row: any) => sum + parseInt(row.metricValues?.[0]?.value || "0"),
    0
  );
  const topPages = (pages.rows || []).map((row: any) => {
    const path = row.dimensionValues?.[0]?.value || "";
    const views = parseInt(row.metricValues?.[0]?.value || "0");
    const isQRPage = path.startsWith("/p/") || path.startsWith("/business/") || path.startsWith("/pay");
    return {
      path,
      title: row.dimensionValues?.[1]?.value || "Untitled",
      views,
      percentage: totalPageViews > 0 ? Math.round((views / totalPageViews) * 100) : 0,
      isQRPage,
    };
  });

  // Process devices
  const totalDeviceUsers = (devices.rows || []).reduce(
    (sum: number, row: any) => sum + parseInt(row.metricValues?.[0]?.value || "0"),
    0
  );
  const deviceColors: Record<string, string> = {
    mobile: "hsl(142, 76%, 36%)",
    desktop: "hsl(221, 83%, 53%)",
    tablet: "hsl(262, 83%, 58%)",
  };
  const deviceData = (devices.rows || []).map((row: any) => {
    const device = row.dimensionValues?.[0]?.value?.toLowerCase() || "other";
    const users = parseInt(row.metricValues?.[0]?.value || "0");
    return {
      device: device.charAt(0).toUpperCase() + device.slice(1),
      value: totalDeviceUsers > 0 ? Math.round((users / totalDeviceUsers) * 100) : 0,
      count: users,
      color: deviceColors[device] || "hsl(var(--muted))",
    };
  });

  // Process sources with QR/URL differentiation
  const totalSessions = (sources.rows || []).reduce(
    (sum: number, row: any) => sum + parseInt(row.metricValues?.[0]?.value || "0"),
    0
  );
  const sourceMap = new Map<string, number>();
  (sources.rows || []).forEach((row: any) => {
    const source = row.dimensionValues?.[0]?.value || "(direct)";
    const medium = row.dimensionValues?.[1]?.value || "(none)";
    const visits = parseInt(row.metricValues?.[0]?.value || "0");
    
    let label = source;
    if (source === "qr" && medium === "scan") label = "QR Code Scan";
    else if (source === "link" && medium === "share") label = "Shared URL";
    else if (source === "(direct)") label = "Direct";
    // Replace lovable.dev with vercel.app for display consistency
    else if (source.includes("lovable.dev")) label = source.replace("lovable.dev", "vercel.app");
    
    sourceMap.set(label, (sourceMap.get(label) || 0) + visits);
  });
  
  const sourceData = Array.from(sourceMap.entries())
    .map(([source, visits]) => ({
      source,
      visits,
      percentage: totalSessions > 0 ? Math.round((visits / totalSessions) * 100) : 0,
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);

  // Process countries with flags
  const countryFlags: Record<string, string> = {
    India: "🇮🇳", "United States": "🇺🇸", "United Kingdom": "🇬🇧", Canada: "🇨🇦",
    Australia: "🇦🇺", Germany: "🇩🇪", France: "🇫🇷", Japan: "🇯🇵", Brazil: "🇧🇷",
    Singapore: "🇸🇬", Netherlands: "🇳🇱", Spain: "🇪🇸", Italy: "🇮🇹", Mexico: "🇲🇽",
  };
  const countryData = (countries.rows || []).map((row: any) => {
    const country = row.dimensionValues?.[0]?.value || "Unknown";
    const region = row.dimensionValues?.[1]?.value || "";
    return {
      country,
      region,
      visits: parseInt(row.metricValues?.[0]?.value || "0"),
      flag: countryFlags[country] || "🌍",
    };
  });

  // Process link clicks
  const linkClicksData = (linkClicks.rows || []).map((row: any) => ({
    url: row.dimensionValues?.[1]?.value || "",
    clicks: parseInt(row.metricValues?.[0]?.value || "0"),
  })).filter((l: any) => l.url);

  // Process engagement data
  const engagementData = (engagement.rows || []).map((row: any) => {
    const duration = parseInt(row.metricValues?.[0]?.value || "0");
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return {
      path: row.dimensionValues?.[0]?.value || "",
      avgTime: `${mins}m ${secs}s`,
      avgTimeSeconds: duration,
      pageViews: parseInt(row.metricValues?.[1]?.value || "0"),
      engagedSessions: parseInt(row.metricValues?.[2]?.value || "0"),
    };
  });

  return {
    overview: {
      totalVisits,
      uniqueVisitors,
      returningVisitors,
      newUsers,
      qrScans,
      profileViews,
      bounceRate: parseFloat(bounceRate.toFixed(1)),
      avgSessionDuration: `${minutes}m ${seconds}s`,
      avgSessionSeconds: avgDuration,
      sessions,
      visitsTrend: parseFloat(visitsTrend),
      visitorsTrend: parseFloat(visitorsTrend),
    },
    realtime: {
      activeUsers: realtimeData.activeUsers,
    },
    trafficData,
    topPages,
    devices: deviceData,
    sources: sourceData,
    countries: countryData,
    qrTraffic: {
      qrScans: qrTrafficCount,
      urlOpens: urlTrafficCount,
      total: qrTrafficCount + urlTrafficCount,
      qrPercentage: qrTrafficCount + urlTrafficCount > 0 
        ? Math.round((qrTrafficCount / (qrTrafficCount + urlTrafficCount)) * 100) 
        : 0,
    },
    engagement: {
      qrPageViews,
      productClicks,
      topPages: engagementData,
      linkClicks: linkClicksData,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No auth header provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log("User not authenticated:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { period = "7d" } = await req.json().catch(() => ({}));
    console.log(`Fetching analytics for period: ${period}`);

    const propertyId = Deno.env.get("GA_PROPERTY_ID");
    const serviceAccountEmail = Deno.env.get("GA_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GA_PRIVATE_KEY");

    if (!propertyId || !serviceAccountEmail || !privateKey) {
      console.log("GA4 not configured - missing credentials");
      return new Response(JSON.stringify({ 
        configured: false,
        message: "Google Analytics not configured. Please add GA4 credentials.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Getting access token...");
    const accessToken = await getAccessToken(serviceAccountEmail, privateKey);
    
    console.log("Fetching analytics data...");
    const [rawData, realtimeData] = await Promise.all([
      fetchAnalyticsData(propertyId, accessToken, period),
      fetchRealtimeData(propertyId, accessToken),
    ]);
    
    console.log("Processing analytics data...");
    const processedData = processAnalyticsData(rawData, realtimeData);

    console.log("Analytics fetch complete");
    return new Response(JSON.stringify({ configured: true, ...processedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch analytics";
    return new Response(
      JSON.stringify({ error: errorMessage, configured: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
