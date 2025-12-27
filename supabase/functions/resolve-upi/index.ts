import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const publicCode = url.searchParams.get("code");

    console.log("Resolving UPI for public code:", publicCode);

    if (!publicCode) {
      console.error("No public code provided");
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head><title>Error</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1>Invalid QR Code</h1>
            <p>This QR code is not valid or has expired.</p>
          </body>
        </html>`,
        {
          status: 400,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the UPI payment record
    const { data, error } = await supabase
      .from("upi_payments")
      .select("upi_id, display_name")
      .eq("public_code", publicCode)
      .maybeSingle();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head><title>Error</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1>Something went wrong</h1>
            <p>Please try again later.</p>
          </body>
        </html>`,
        {
          status: 500,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    if (!data) {
      console.error("No UPI record found for code:", publicCode);
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head><title>Not Found</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1>Payment Link Not Found</h1>
            <p>This QR code is no longer active.</p>
          </body>
        </html>`,
        {
          status: 404,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    // Build UPI deep link
    const displayName = encodeURIComponent(data.display_name || "QR Payments");
    const upiDeepLink = `upi://pay?pa=${encodeURIComponent(data.upi_id)}&pn=${displayName}&cu=INR`;

    console.log("Redirecting to UPI link:", upiDeepLink);

    // Return HTML that redirects to UPI app with fallback
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Opening Payment App...</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
              color: white;
              padding: 20px;
            }
            .container {
              text-align: center;
              max-width: 400px;
            }
            .loader {
              width: 50px;
              height: 50px;
              border: 3px solid rgba(45, 212, 191, 0.3);
              border-top-color: #2dd4bf;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 24px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            h1 { font-size: 24px; margin-bottom: 12px; }
            p { color: #888; margin-bottom: 24px; }
            .pay-btn {
              display: inline-block;
              background: linear-gradient(135deg, #2dd4bf, #38bdf8);
              color: #0a0a0a;
              padding: 14px 32px;
              border-radius: 12px;
              text-decoration: none;
              font-weight: 600;
              font-size: 16px;
            }
            .upi-id {
              background: rgba(255,255,255,0.1);
              padding: 12px 20px;
              border-radius: 8px;
              margin-top: 24px;
              font-size: 14px;
              word-break: break-all;
            }
          </style>
          <script>
            window.location.href = "${upiDeepLink}";
          </script>
        </head>
        <body>
          <div class="container">
            <div class="loader"></div>
            <h1>Opening Payment App</h1>
            <p>If the app doesn't open automatically, tap the button below.</p>
            <a href="${upiDeepLink}" class="pay-btn">Open UPI App</a>
            <div class="upi-id">
              <strong>UPI ID:</strong> ${data.upi_id}
            </div>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in resolve-upi function:", error);
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head><title>Error</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>Something went wrong</h1>
          <p>${error.message}</p>
        </body>
      </html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      }
    );
  }
});