import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    
    if (!token) {
      console.log("No reCAPTCHA token provided");
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

    // Verify token using reCAPTCHA v2 API
    const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
    
    const formData = new URLSearchParams();
    formData.append("secret", RECAPTCHA_SECRET_KEY);
    formData.append("response", token);

    const verifyResponse = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const verifyData = await verifyResponse.json();
    
    console.log("reCAPTCHA v2 verification response:", verifyData);

    if (!verifyResponse.ok) {
      console.error("reCAPTCHA verification request failed");
      return new Response(
        JSON.stringify({ success: false, error: "reCAPTCHA verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if verification passed
    const success = verifyData.success === true;

    if (!success) {
      console.error("reCAPTCHA verification failed:", verifyData["error-codes"]);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "reCAPTCHA verification failed",
          errorCodes: verifyData["error-codes"]
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification passed"
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
