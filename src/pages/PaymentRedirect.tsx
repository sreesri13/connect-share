import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentRedirect = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [upiData, setUpiData] = useState<{ upi_id: string; display_name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const code = searchParams.get("code");

  useEffect(() => {
    if (!code) {
      setError("Invalid payment link");
      setIsLoading(false);
      return;
    }

    resolveAndRedirect();
  }, [code]);

  const resolveAndRedirect = async () => {
    try {
      // Fetch UPI data directly from database
      const { data, error: dbError } = await supabase
        .from("upi_payments")
        .select("upi_id, display_name")
        .eq("public_code", code)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        setError("Payment link not found or expired");
        setIsLoading(false);
        return;
      }

      setUpiData(data);
      
      // Build UPI deep link
      const displayName = encodeURIComponent(data.display_name || "Payment");
      const upiDeepLink = `upi://pay?pa=${encodeURIComponent(data.upi_id)}&pn=${displayName}&cu=INR`;

      // Try to redirect immediately
      window.location.href = upiDeepLink;
      
      // After a short delay, show the manual button (in case auto-redirect fails)
      setTimeout(() => {
        setIsLoading(false);
      }, 1500);

    } catch (err) {
      console.error("Error resolving UPI:", err);
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleOpenPaymentApp = () => {
    if (!upiData) return;
    
    const displayName = encodeURIComponent(upiData.display_name || "Payment");
    const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiData.upi_id)}&pn=${displayName}&cu=INR`;
    window.location.href = upiDeepLink;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Payment Link Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="text-center max-w-sm mx-auto">
        {isLoading ? (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Opening Payment App...</h1>
            <p className="text-muted-foreground text-sm">Please wait while we redirect you</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Open Payment App</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Tap the button below to open your UPI payment app
            </p>
            
            <Button 
              onClick={handleOpenPaymentApp}
              size="lg"
              className="w-full min-h-[52px] text-base font-medium"
            >
              <Smartphone className="w-5 h-5 mr-2" />
              Open UPI App
            </Button>

            {upiData && (
              <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Paying to</p>
                <p className="font-medium text-foreground">{upiData.display_name}</p>
                <p className="text-sm text-muted-foreground font-mono">{upiData.upi_id}</p>
              </div>
            )}

            <p className="mt-6 text-xs text-muted-foreground">
              Works with GPay, PhonePe, Paytm, BHIM & all UPI apps
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentRedirect;
