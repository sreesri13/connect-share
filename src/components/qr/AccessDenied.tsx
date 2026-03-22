import { useState } from "react";
import { Shield, Mail, Lock, Loader2, Check } from "lucide-react";
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
}

export const AccessDenied = ({ qrId, qrType, allowRequests }: AccessDeniedProps) => {
  const { user } = useAuth();
  const [requestedRole, setRequestedRole] = useState("viewer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  const fkColumn = qrType === "profile" ? "qr_page_id" : "qr_business_page_id";

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

        {allowRequests && !submitted && (
          <div className="space-y-4 p-6 rounded-xl border border-border bg-card">
            <h3 className="text-sm font-semibold flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Request Access
            </h3>

            {!user && (
              <Input
                placeholder="Your email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}

            <Select value={requestedRole} onValueChange={setRequestedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select access type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">View Access</SelectItem>
                <SelectItem value="editor">Edit Access</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleRequestAccess} disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              Send Request
            </Button>
          </div>
        )}

        {submitted && (
          <div className="p-6 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
            <Check className="w-8 h-8 mx-auto text-primary" />
            <p className="text-sm font-medium text-foreground">Request Sent!</p>
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
