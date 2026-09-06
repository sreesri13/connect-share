import { useState, useEffect } from "react";
import { Shield, Mail, Check, Loader2, Send, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { submitAccessRequest } from "@/hooks/useQRPermissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RequestAccessBannerProps {
  qrId: string;
  qrType: "profile" | "business";
  allowRequests: boolean;
  qrTitle?: string;
  ownerName?: string;
  userRole?: "owner" | "editor" | "viewer" | null;
}

export const RequestAccessBanner = ({
  qrId,
  qrType,
  allowRequests,
  qrTitle,
  ownerName,
  userRole,
}: RequestAccessBannerProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [requestedRole, setRequestedRole] = useState<"viewer" | "editor">("editor");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  // If user is owner or already an editor, or requests are disabled, do not show
  if (!allowRequests || userRole === "owner" || userRole === "editor") {
    return null;
  }

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  useEffect(() => {
    const checkPending = async () => {
      const emailToCheck = user?.email || email;
      if (!emailToCheck || !qrId) return;

      try {
        const fkColumn = qrType === "profile" ? "qr_page_id" : "qr_business_page_id";
        const { data } = await supabase
          .from("qr_access_requests")
          .select("id, requested_role")
          .eq(fkColumn, qrId)
          .eq("user_email", emailToCheck.trim().toLowerCase())
          .eq("status", "pending")
          .maybeSingle();

        if (data) {
          setHasPendingRequest(true);
          setPendingRole(data.requested_role);
        }
      } catch (err) {
        console.error("Error checking pending request:", err);
      }
    };

    if (user?.email) {
      checkPending();
    }
  }, [qrId, user?.email, qrType]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = (email || user?.email || "").trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAccessRequest(
        qrId,
        qrType === "business",
        cleanEmail,
        requestedRole,
        note.trim() || undefined,
        user?.id
      );

      setHasPendingRequest(true);
      setPendingRole(requestedRole);
      setIsOpen(false);
      toast.success("Access request sent to the owner!");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("already have a pending")) {
        toast.info("You already have a pending access request");
        setHasPendingRequest(true);
        setIsOpen(false);
      } else {
        toast.error(msg || "Failed to submit access request");
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Sleek Top Request Banner */}
      <div className="w-full bg-primary/10 border-b border-primary/20 backdrop-blur-md sticky top-0 z-40 px-4 py-2 text-foreground">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">
              {userRole === "viewer" ? (
                <>You have <strong className="text-foreground">Viewer access</strong> to this page.</>
              ) : (
                <>Public View: {ownerName ? `Created by ${ownerName}` : "Access requests enabled"}.</>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {hasPendingRequest ? (
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary py-0.5 px-2.5 gap-1.5 text-xs font-normal">
                <Check className="w-3.5 h-3.5" /> Request Pending ({pendingRole || "editor"})
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={() => setIsOpen(true)}
                className="h-7 text-xs px-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" /> Request Access
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Request Access Dialog Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center gap-2 text-primary mb-1">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-lg font-bold">Request Access</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Send an access request to {ownerName || "the owner"} for{" "}
              <strong className="text-foreground font-medium">{qrTitle || "this QR page"}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Your Email Address</label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!user?.email}
                className="bg-secondary/30 text-sm"
                required
              />
              {!user && (
                <p className="text-[11px] text-muted-foreground">
                  The owner will see your email to approve your request.
                </p>
              )}
            </div>

            {/* Requested Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Requested Role</label>
              <Select
                value={requestedRole}
                onValueChange={(val: "viewer" | "editor") => setRequestedRole(val)}
              >
                <SelectTrigger className="w-full bg-secondary/30 text-sm">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor (Can edit and manage content)</SelectItem>
                  <SelectItem value="viewer">Viewer (Full viewing access)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Message to Owner <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="Introduce yourself or describe what access you need..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="bg-secondary/30 resize-none text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-4 gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
