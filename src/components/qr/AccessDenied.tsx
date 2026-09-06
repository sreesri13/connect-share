import { useState, useEffect } from "react";
import { Shield, Mail, Lock, Loader2, Check, Eye, User, ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { submitAccessRequest } from "@/hooks/useQRPermissions";

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
  const [guestEmail, setGuestEmail] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const fkColumn = qrType === "profile" ? "qr_page_id" : "qr_business_page_id";

  useEffect(() => {
    if (user?.email) {
      setGuestEmail(user.email);
    }
  }, [user?.email]);

  useEffect(() => {
    const checkExistingRequest = async () => {
      const emailToCheck = user?.email || guestEmail;
      if (!emailToCheck || !qrId) return;

      setCheckingExisting(true);
      try {
        const { data: existing } = await supabase
          .from("qr_access_requests")
          .select("id, requested_role")
          .eq(fkColumn, qrId)
          .eq("user_email", emailToCheck.toLowerCase().trim())
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

    if (user?.email) {
      checkExistingRequest();
    }
  }, [qrId, user?.email, fkColumn]);

  const handleRequestAccess = async (roleToRequest: "viewer" | "editor" = requestedRole) => {
    const emailToUse = (user?.email || guestEmail).trim().toLowerCase();

    if (!emailToUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!qrId) {
      toast.error("Unable to identify QR page");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAccessRequest(
        qrId,
        qrType === "business",
        emailToUse,
        roleToRequest,
        requestNote.trim() || undefined,
        user?.id
      );

      setSubmitted(true);
      setAlreadyRequested(true);
      setPendingRole(roleToRequest);
      toast.success("Access request sent to the owner!");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("already have a pending")) {
        toast.info("You already have a pending access request for this page");
        setSubmitted(true);
        setAlreadyRequested(true);
      } else {
        toast.error(msg || "Failed to submit access request");
      }
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
      <div className="mx-auto w-full max-w-3xl px-4 py-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-primary/25 bg-card/80 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <Eye className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                Viewing Mode
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-primary/30 text-primary">
                  Viewer
                </Badge>
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {ownerName ? `Created by ${ownerName}. ` : ""}Request editor access to collaborate and modify this page.
              </p>
            </div>
          </div>

          {allowRequests && (
            <div className="shrink-0 w-full sm:w-auto">
              {submitted || alreadyRequested ? (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                  <Check className="w-3.5 h-3.5" /> Request Sent ({pendingRole || "editor"})
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRequestAccess("editor")}
                  disabled={isSubmitting || checkingExisting}
                  className="w-full sm:w-auto h-8 text-xs border-primary/30 hover:bg-primary/10 text-primary"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
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

  // Full Access Restricted screen (Public View is OFF)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-md w-full relative z-10 text-center space-y-6">
        {/* Lock Icon & Title */}
        <div className="space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shadow-lg">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Access Restricted</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {qrTitle || "This QR Code"} is set to private
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

        {/* Access Requests Allowed: Unified Form for Logged In & Guests */}
        {allowRequests && !submitted && (
          <div className="space-y-4 p-6 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xl text-left">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Request Access from Owner</h3>
            </div>

            <p className="text-xs text-muted-foreground">
              This page requires permission from the owner to view. Send a request to get authorized access.
            </p>

            {/* Email input (editable if guest, pre-filled if logged in) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Your Email Address</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                disabled={!!user?.email}
                className="bg-secondary/30 border-border/60 text-sm"
              />
              {!user && (
                <p className="text-[11px] text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={handleRedirectToLogin}
                    className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                  >
                    Sign in <ArrowRight className="w-3 h-3 inline" />
                  </button>
                </p>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Requested Access Level</label>
              <Select
                value={requestedRole}
                onValueChange={(val: "viewer" | "editor") => setRequestedRole(val)}
              >
                <SelectTrigger className="w-full bg-secondary/30 border-border/60 text-sm">
                  <SelectValue placeholder="Select access type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer Access (View content)</SelectItem>
                  <SelectItem value="editor">Editor Access (Collaborate & edit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-muted-foreground" /> Note for the Owner <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="e.g. Hi, please approve my access to this page"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                className="bg-secondary/30 border-border/60 text-sm"
              />
            </div>

            <Button
              onClick={() => handleRequestAccess(requestedRole)}
              disabled={isSubmitting || checkingExisting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2 font-medium"
            >
              {isSubmitting || checkingExisting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Send Access Request
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
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                {ownerName || "The owner"} will review your request in their Manage Access dashboard. Once approved as <strong className="text-foreground">{pendingRole || requestedRole}</strong>, you will gain access immediately.
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
