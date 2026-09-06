import { useState, useEffect } from "react";
import { Shield, Mail, Lock, Loader2, Check, Eye, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface AccessDeniedProps {
  qrId: string;
  qrType: "profile" | "business";
  allowRequests: boolean;
  qrTitle?: string;
  ownerName?: string;
  /** If true, user can view but not edit — show a banner instead of full block */
  viewOnly?: boolean;
}

export const AccessDenied = ({
  qrId,
  qrType,
  allowRequests,
  qrTitle,
  ownerName,
  viewOnly = false,
}: AccessDeniedProps) => {
  const { user } = useAuth();
  const [requestedRole, setRequestedRole] = useState<"viewer" | "editor">("editor");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const fkColumn = qrType === "profile" ? "qr_page_id" : "qr_business_page_id";

  useEffect(() => {
    const checkExistingRequest = async () => {
      const userEmail = user?.email;
      if (!userEmail || !qrId) return;

      setCheckingExisting(true);
      try {
        const { data: existing } = await supabase
          .from("qr_access_requests")
          .select("id, requested_role")
          .eq(fkColumn, qrId)
          .eq("user_email", userEmail.toLowerCase())
          .eq("status", "pending")
          .maybeSingle();

        if (existing) {
          setAlreadyRequested(true);
          setSubmitted(true);
          setPendingRole(existing.requested_role);
        }
      } catch (err) {
        console.error("Error checking existing request:", err);
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingRequest();
  }, [qrId, user?.email]);

  const handleRequestAccess = async (roleToRequest: "viewer" | "editor" = requestedRole) => {
    const userEmail = user?.email;
    if (!userEmail) {
      handleRedirectToLogin();
      return;
    }

    setIsSubmitting(true);
    try {
      // Check existing pending request
      const { data: existing } = await supabase
        .from("qr_access_requests")
        .select("id")
        .eq(fkColumn, qrId)
        .eq("user_email", userEmail.toLowerCase())
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        toast.info("You already have a pending access request");
        setSubmitted(true);
        setAlreadyRequested(true);
        return;
      }

      // Look up owner_id from page if possible
      let ownerId: string | null = null;
      const pageTable = qrType === "profile" ? "qr_pages" : "qr_business_pages";
      const { data: pData } = await supabase.from(pageTable).select("user_id").eq("id", qrId).maybeSingle();
      if (pData) {
        ownerId = pData.user_id;
      }

      const insertData: any = {
        [fkColumn]: qrId,
        user_email: userEmail.toLowerCase(),
        requested_role: roleToRequest,
        user_id: user?.id || null,
        owner_id: ownerId,
        status: "pending",
      };

      const { error } = await supabase.from("qr_access_requests").insert(insertData);
      if (error) throw error;

      setSubmitted(true);
      setAlreadyRequested(true);
      setPendingRole(roleToRequest);
      toast.success("Access request sent to the owner!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit access request");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedirectToLogin = () => {
    const currentUrl = window.location.pathname + window.location.search;
    window.location.href = `/auth?redirect=${encodeURIComponent(currentUrl)}`;
  };

  // Banner mode: user has view access and can request edit access
  if (viewOnly) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <Eye className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-foreground font-medium">
                Viewing mode
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {ownerName ? `Created by ${ownerName}. ` : ""}Request editor access to collaborate on this page.
              </p>
            </div>
          </div>

          {allowRequests && (
            <div className="shrink-0 w-full sm:w-auto">
              {!user ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRedirectToLogin}
                  className="w-full sm:w-auto h-7 text-xs border-primary/30 hover:bg-primary/10"
                >
                  <Mail className="w-3 h-3 mr-1.5" /> Sign in to Request Edit
                </Button>
              ) : submitted || alreadyRequested ? (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium px-2 py-1 bg-primary/10 rounded-lg">
                  <Check className="w-3.5 h-3.5" /> Request Sent ({pendingRole || "editor"})
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRequestAccess("editor")}
                  disabled={isSubmitting || checkingExisting}
                  className="w-full sm:w-auto h-7 text-xs border-primary/30 hover:bg-primary/10"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                  ) : (
                    <Mail className="w-3 h-3 mr-1.5" />
                  )}
                  Request Edit Access
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full Access Restricted screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-md w-full relative z-10 text-center space-y-6">
        {/* Icon & Title */}
        <div className="space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shadow-lg">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {qrTitle || "This QR Code"} is private
            </p>
          </div>

          {/* Owner Highlight Badge */}
          {ownerName && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/60 border border-border text-xs text-muted-foreground font-medium">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Owner: <strong className="text-foreground">{ownerName}</strong></span>
            </div>
          )}
        </div>

        {/* Requests Allowed: Logged In Form */}
        {allowRequests && user && !submitted && (
          <div className="space-y-4 p-6 rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-xl text-left">
            <div className="flex items-center gap-2 pb-1 border-b border-border/40">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Request Access</h3>
            </div>

            <p className="text-xs text-muted-foreground">
              Select the permission you need. The owner will review and grant access.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Requested Permission</label>
              <Select
                value={requestedRole}
                onValueChange={(val: "viewer" | "editor") => setRequestedRole(val)}
              >
                <SelectTrigger className="w-full bg-secondary/30 border-border/60">
                  <SelectValue placeholder="Select access type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer Access (View content only)</SelectItem>
                  <SelectItem value="editor">Editor Access (Edit and collaborate)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => handleRequestAccess(requestedRole)}
              disabled={isSubmitting || checkingExisting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
            >
              {isSubmitting || checkingExisting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Send Request to Owner
            </Button>
          </div>
        )}

        {/* Requests Allowed: Non-Logged-In Redirect Flow */}
        {allowRequests && !user && !submitted && (
          <div className="space-y-4 p-6 rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-xl">
            <p className="text-sm text-muted-foreground">
              Sign in to request view or edit access from the owner.
            </p>
            <Button
              onClick={handleRedirectToLogin}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
            >
              Sign In to Request Access <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Request Submitted Confirmation */}
        {submitted && (
          <div className="p-6 rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur-xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                {alreadyRequested ? "Request Already Pending" : "Access Request Sent!"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                {ownerName || "The owner"} will review your request. Once approved, you will gain {pendingRole || requestedRole} access immediately.
              </p>
            </div>
          </div>
        )}

        {/* Requests Disabled: Private Code Notice */}
        {!allowRequests && (
          <div className="p-6 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md space-y-2">
            <p className="text-sm font-medium text-foreground">
              Private QR Code
            </p>
            <p className="text-xs text-muted-foreground">
              Only the owner and authorized users can access this page. Access requests are currently closed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
