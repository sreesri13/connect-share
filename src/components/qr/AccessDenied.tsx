import { useState, useEffect } from "react";
import { Shield, Mail, Lock, Loader2, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AccessDeniedProps {
  qrId: string;
  qrType: "profile" | "business";
  allowRequests: boolean;
  /** If true, user can view but not edit — show a banner instead of full block */
  viewOnly?: boolean;
}

export const AccessDenied = ({ qrId, qrType, allowRequests, viewOnly = false }: AccessDeniedProps) => {
  const { user } = useAuth();
  const [requestedRole, setRequestedRole] = useState("viewer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const fkColumn = qrType === "profile" ? "qr_page_id" : "qr_business_page_id";

  // Check for existing pending request on mount
  useEffect(() => {
    const checkExistingRequest = async () => {
      const userEmail = user?.email;
      if (!userEmail) return;
      
      setCheckingExisting(true);
      try {
        const { data: existing } = await supabase
          .from("qr_access_requests")
          .select("id")
          .eq(fkColumn, qrId)
          .eq("user_email", userEmail.toLowerCase())
          .eq("status", "pending")
          .maybeSingle();

        if (existing) {
          setAlreadyRequested(true);
          setSubmitted(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingRequest();
  }, [qrId, user?.email]);

  const handleRequestAccess = async () => {
    const userEmail = user?.email || email.trim();
    if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      toast.error("Please enter a valid email");
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if already requested
      const { data: existing } = await supabase
        .from("qr_access_requests")
        .select("id")
        .eq(fkColumn, qrId)
        .eq("user_email", userEmail.toLowerCase())
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        toast.info("You already have a pending request");
        setSubmitted(true);
        setAlreadyRequested(true);
        return;
      }

      const insertData: any = {
        [fkColumn]: qrId,
        user_email: userEmail.toLowerCase(),
        requested_role: requestedRole,
        user_id: user?.id || null,
      };

      const { error } = await supabase.from("qr_access_requests").insert(insertData);
      if (error) throw error;

      setSubmitted(true);
      toast.success("Access request sent!");
    } catch (err) {
      toast.error("Failed to send request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Banner mode: user can view but wants to request edit access
  if (viewOnly) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground truncate">
              You can view this content. Request edit access to make changes.
            </p>
          </div>
          {allowRequests && user && !submitted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRequestedRole("editor");
                handleRequestAccess();
              }}
              disabled={isSubmitting || alreadyRequested}
              className="shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : alreadyRequested ? (
                <Check className="w-3 h-3 mr-1" />
              ) : (
                <Mail className="w-3 h-3 mr-1" />
              )}
              {alreadyRequested ? "Request Sent" : "Request Edit Access"}
            </Button>
          )}
          {submitted && !alreadyRequested && (
            <div className="flex items-center gap-1 text-primary text-sm shrink-0">
              <Check className="w-3 h-3" /> Sent
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full access denied screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
          <p className="text-muted-foreground mt-2">
            You don't have permission to view this page.
          </p>
        </div>

        {/* Only show request UI for logged-in users when requests are allowed */}
        {allowRequests && user && !submitted && (
          <div className="space-y-4 p-6 rounded-xl border border-border bg-card">
            <h3 className="text-sm font-semibold flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Request Access
            </h3>

            <Select value={requestedRole} onValueChange={setRequestedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select access type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">View Access</SelectItem>
                <SelectItem value="editor">Edit Access</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleRequestAccess}
              disabled={isSubmitting || checkingExisting}
              className="w-full"
            >
              {isSubmitting || checkingExisting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Send Request
            </Button>
          </div>
        )}

        {/* Not logged in - prompt to login */}
        {allowRequests && !user && !submitted && (
          <div className="space-y-3 p-6 rounded-xl border border-border bg-card">
            <p className="text-sm text-muted-foreground">
              Sign in to request access to this page.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/auth"} className="w-full">
              Sign In
            </Button>
          </div>
        )}

        {submitted && (
          <div className="p-6 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
            <Check className="w-8 h-8 mx-auto text-primary" />
            <p className="text-sm font-medium text-foreground">
              {alreadyRequested ? "Request Already Sent" : "Request Sent!"}
            </p>
            <p className="text-xs text-muted-foreground">
              The owner will review your request and grant access.
            </p>
          </div>
        )}

        {!allowRequests && (
          <p className="text-sm text-muted-foreground">
            Contact the owner to get access to this page.
          </p>
        )}
      </div>
    </div>
  );
};
