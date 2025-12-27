/**
 * Google Analytics Data API Edge Function
 * 
 * This function fetches analytics data from Google Analytics 4 using the Data API.
 * 
 * REQUIRED SECRETS (add via Cloud secrets):
 * - GA_PROPERTY_ID: Your GA4 property ID (e.g., "123456789")
 * - GA_SERVICE_ACCOUNT_EMAIL: Service account email
 * - GA_PRIVATE_KEY: Service account private key (JSON format)
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a service account in Google Cloud Console
 * 2. Grant it "Viewer" role on your GA4 property
 * 3. Download the JSON key file
 * 4. Add the credentials as secrets in Lovable Cloud
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to create JWT for Google API authentication
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

  // Import the private key
  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
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

// Get access token from Google
async function getAccessToken(serviceAccountEmail: string, privateKey: string): Promise<string> {
  const jwt = await createGoogleJWT(serviceAccountEmail, privateKey);
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Fetch analytics data from GA4 Data API
async function fetchAnalyticsData(propertyId: string, accessToken: string, period: string) {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case "7d":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(endDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(endDate.getDate() - 90);
      break;
    default:
      startDate.setDate(endDate.getDate() - 7);
  }

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  // Fetch overview metrics
  const overviewResponse = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        metrics: [
          { name: "screenPageViews" },
          { name: "activeUsers" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
        ],
      }),
    }
  );

  // Fetch traffic by date
  const trafficResponse = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "activeUsers" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    }
  );

  // Fetch top pages
  const pagesResponse = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 5,
      }),
    }
  );

  // Fetch device breakdown
  const devicesResponse = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
      }),
    }
  );

  // Fetch traffic sources
  const sourcesResponse = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 5,
      }),
    }
  );

  // Fetch countries
  const countriesResponse = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 5,
      }),
    }
  );

  // Fetch QR scan events
  const eventsResponse = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          orGroup: {
            expressions: [
              { filter: { fieldName: "eventName", stringFilter: { value: "qr_scan" } } },
              { filter: { fieldName: "eventName", stringFilter: { value: "profile_view" } } },
              { filter: { fieldName: "eventName", stringFilter: { value: "payment_qr_scan" } } },
            ],
          },
        },
      }),
    }
  );

  const [overview, traffic, pages, devices, sources, countries, events] = await Promise.all([
    overviewResponse.json(),
    trafficResponse.json(),
    pagesResponse.json(),
    devicesResponse.json(),
    sourcesResponse.json(),
    countriesResponse.json(),
    eventsResponse.json(),
  ]);

  return { overview, traffic, pages, devices, sources, countries, events };
}

// Process raw GA4 data into dashboard format
function processAnalyticsData(rawData: any) {
  const { overview, traffic, pages, devices, sources, countries, events } = rawData;

  // Process overview metrics
  const overviewRow = overview.rows?.[0]?.metricValues || [];
  const totalVisits = parseInt(overviewRow[0]?.value || "0");
  const uniqueVisitors = parseInt(overviewRow[1]?.value || "0");
  const bounceRate = parseFloat(overviewRow[2]?.value || "0") * 100;
  const avgDuration = parseInt(overviewRow[3]?.value || "0");
  const minutes = Math.floor(avgDuration / 60);
  const seconds = avgDuration % 60;

  // Process events for QR scans and profile views
  let qrScans = 0;
  let profileViews = 0;
  (events.rows || []).forEach((row: any) => {
    const eventName = row.dimensionValues?.[0]?.value;
    const count = parseInt(row.metricValues?.[0]?.value || "0");
    if (eventName === "qr_scan" || eventName === "payment_qr_scan") qrScans += count;
    if (eventName === "profile_view") profileViews += count;
  });

  // Process traffic data
  const trafficData = (traffic.rows || []).map((row: any) => {
    const dateStr = row.dimensionValues?.[0]?.value || "";
    const date = new Date(
      parseInt(dateStr.slice(0, 4)),
      parseInt(dateStr.slice(4, 6)) - 1,
      parseInt(dateStr.slice(6, 8))
    );
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      date: dayNames[date.getDay()],
      visits: parseInt(row.metricValues?.[0]?.value || "0"),
      uniqueVisitors: parseInt(row.metricValues?.[1]?.value || "0"),
    };
  });

  // Process top pages
  const totalPageViews = (pages.rows || []).reduce(
    (sum: number, row: any) => sum + parseInt(row.metricValues?.[0]?.value || "0"),
    0
  );
  const topPages = (pages.rows || []).map((row: any) => {
    const views = parseInt(row.metricValues?.[0]?.value || "0");
    return {
      path: row.dimensionValues?.[0]?.value || "",
      title: row.dimensionValues?.[1]?.value || "Untitled",
      views,
      percentage: totalPageViews > 0 ? Math.round((views / totalPageViews) * 100) : 0,
    };
  });

  // Process devices
  const totalDeviceUsers = (devices.rows || []).reduce(
    (sum: number, row: any) => sum + parseInt(row.metricValues?.[0]?.value || "0"),
    0
  );
  const deviceColors: Record<string, string> = {
    mobile: "hsl(var(--primary))",
    desktop: "hsl(var(--secondary))",
    tablet: "hsl(var(--muted))",
  };
  const deviceData = (devices.rows || []).map((row: any) => {
    const device = row.dimensionValues?.[0]?.value?.toLowerCase() || "other";
    const users = parseInt(row.metricValues?.[0]?.value || "0");
    return {
      device: device.charAt(0).toUpperCase() + device.slice(1),
      value: totalDeviceUsers > 0 ? Math.round((users / totalDeviceUsers) * 100) : 0,
      color: deviceColors[device] || "hsl(var(--muted))",
    };
  });

  // Process sources
  const totalSessions = (sources.rows || []).reduce(
    (sum: number, row: any) => sum + parseInt(row.metricValues?.[0]?.value || "0"),
    0
  );
  const sourceData = (sources.rows || []).map((row: any) => {
    const visits = parseInt(row.metricValues?.[0]?.value || "0");
    return {
      source: row.dimensionValues?.[0]?.value || "Unknown",
      visits,
      percentage: totalSessions > 0 ? Math.round((visits / totalSessions) * 100) : 0,
    };
  });

  // Process countries with flag emojis
  const countryFlags: Record<string, string> = {
    India: "🇮🇳",
    "United States": "🇺🇸",
    "United Kingdom": "🇬🇧",
    Canada: "🇨🇦",
    Australia: "🇦🇺",
    Germany: "🇩🇪",
    France: "🇫🇷",
    Japan: "🇯🇵",
    Brazil: "🇧🇷",
    Singapore: "🇸🇬",
  };
  const countryData = (countries.rows || []).map((row: any) => {
    const country = row.dimensionValues?.[0]?.value || "Unknown";
    return {
      country,
      visits: parseInt(row.metricValues?.[0]?.value || "0"),
      flag: countryFlags[country] || "🌍",
    };
  });

  return {
    overview: {
      totalVisits,
      uniqueVisitors,
      qrScans,
      profileViews,
      bounceRate: parseFloat(bounceRate.toFixed(1)),
      avgSessionDuration: `${minutes}m ${seconds}s`,
    },
    trafficData,
    topPages,
    devices: deviceData,
    sources: sourceData,
    countries: countryData,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is authenticated
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get request body
    const { period = "7d" } = await req.json().catch(() => ({}));

    // Check for required secrets
    const propertyId = Deno.env.get("GA_PROPERTY_ID");
    const serviceAccountEmail = Deno.env.get("GA_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GA_PRIVATE_KEY");

    if (!propertyId || !serviceAccountEmail || !privateKey) {
      // Return demo data if GA is not configured
      console.log("GA4 not configured, returning demo data");
      return new Response(JSON.stringify({ 
        configured: false,
        message: "Google Analytics not configured. Showing demo data.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get access token and fetch analytics
    const accessToken = await getAccessToken(serviceAccountEmail, privateKey);
    const rawData = await fetchAnalyticsData(propertyId, accessToken, period);
    const processedData = processAnalyticsData(rawData);

    return new Response(JSON.stringify({ configured: true, ...processedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch analytics";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
