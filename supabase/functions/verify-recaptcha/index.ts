import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECAPTCHA_PROJECT_ID = "connecthub-482514";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, action = "signup" } = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "No reCAPTCHA token provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RECAPTCHA_SECRET_KEY = Deno.env.get("RECAPTCHA_SECRET_KEY");
    
    if (!RECAPTCHA_SECRET_KEY) {
      console.error("RECAPTCHA_SECRET_KEY is not configured");
      return new Response(
        JSON.stringify({ success: false, error: "reCAPTCHA not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create assessment using reCAPTCHA Enterprise API
    const assessmentUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${RECAPTCHA_PROJECT_ID}/assessments?key=${RECAPTCHA_SECRET_KEY}`;
    
    const siteKey = Deno.env.get("RECAPTCHA_SITE_KEY") || "";
    
    const assessmentResponse = await fetch(assessmentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: {
          token: token,
          siteKey: siteKey,
          expectedAction: action,
        },
      }),
    });

    const assessmentData = await assessmentResponse.json();
    
    if (!assessmentResponse.ok) {
      console.error("reCAPTCHA assessment failed:", assessmentData);
      return new Response(
        JSON.stringify({ success: false, error: "reCAPTCHA verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is valid
    if (!assessmentData.tokenProperties?.valid) {
      console.error("Invalid reCAPTCHA token:", assessmentData.tokenProperties?.invalidReason);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid token: ${assessmentData.tokenProperties?.invalidReason || "unknown"}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the risk score (0.0 = likely bot, 1.0 = likely human)
    const score = assessmentData.riskAnalysis?.score || 0;
    
    // Consider scores above 0.5 as passing (you can adjust this threshold)
    const passed = score >= 0.5;

    console.log("reCAPTCHA assessment:", {
      score,
      passed,
      action: assessmentData.tokenProperties?.action,
      reasons: assessmentData.riskAnalysis?.reasons,
    });

    return new Response(
      JSON.stringify({ 
        success: passed, 
        score,
        message: passed ? "Verification passed" : "Verification failed - suspected bot activity"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error verifying reCAPTCHA:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
