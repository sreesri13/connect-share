import { useState, useEffect } from "react";
import { Shield, UserPlus, X, Check, Clock, Mail, Users, Globe, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Permission {
  id: string;
  user_email: string;
  role: string;
  status: string;
  created_at: string;
}

interface AccessRequest {
  id: string;
  user_email: string;
  requested_role: string;
  status: string;
  created_at: string;
}

interface ManageAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrId: string;
  qrType: "profile" | "business";
  qrTitle: string;
  userId: string;
}

export const ManageAccessDialog = ({
  open, onOpenChange, qrId, qrType, qrTitle, userId
}: ManageAccessDialogProps) => {
  const [publicView, setPublicView] = useState(true);
  const [allowRequests, setAllowRequests] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const table = qrType === "profile" ? "qr_pages" : "qr_business_pages";
  const fkColumn = qrType === "profile" ? "qr_page_id" : "qr_business_page_id";

  useEffect(() => {
    if (open && qrId) {
      fetchData();
    }
  }, [open, qrId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch QR settings
      const { data: qrData } = await supabase
        .from(table)
        .select("public_view, allow_requests")
        .eq("id", qrId)
        .single();

      if (qrData) {
        setPublicView(qrData.public_view ?? true);
        setAllowRequests(qrData.allow_requests ?? false);
      }

      // Fetch permissions
      const { data: perms } = await supabase
        .from("qr_permissions")
        .select("*")
        .eq(fkColumn, qrId);

      setPermissions(perms || []);

      // Fetch pending requests
      const { data: reqs } = await supabase
        .from("qr_access_requests")
        .select("*")
        .eq(fkColumn, qrId)
        .eq("status", "pending");

      setRequests(reqs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublicView = async (val: boolean) => {
    setPublicView(val);
    await supabase.from(table).update({ public_view: val }).eq("id", qrId);
    toast.success(val ? "Public access enabled" : "Access restricted to permitted users");
  };

  const handleToggleAllowRequests = async (val: boolean) => {
    setAllowRequests(val);
    await supabase.from(table).update({ allow_requests: val }).eq("id", qrId);
    toast.success(val ? "Access requests enabled" : "Access requests disabled");
  };

  const handleAddPerson = async () => {
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      toast.error("Please enter a valid email");
      return;
    }

    const emailLower = newEmail.trim().toLowerCase();
    
    // Check if already has permission
    if (permissions.some(p => p.user_email === emailLower)) {
      toast.error("This email already has access");
      return;
    }

    setIsSaving(true);
    try {
      const insertData: any = {
        [fkColumn]: qrId,
        user_email: emailLower,
        role: newRole,
        status: "active",
        granted_by: userId,
      };

      const { error } = await supabase.from("qr_permissions").insert(insertData);
      if (error) throw error;

      toast.success(`${emailLower} added as ${newRole}`);
      setNewEmail("");
      fetchData();
    } catch (err: any) {
      toast.error("Failed to add permission");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeRole = async (permId: string, role: string) => {
    await supabase.from("qr_permissions").update({ role }).eq("id", permId);
    toast.success("Role updated");
    fetchData();
  };

  const handleRemovePermission = async (permId: string) => {
    await supabase.from("qr_permissions").delete().eq("id", permId);
    toast.success("Access removed");
    fetchData();
  };

  const handleApproveRequest = async (req: AccessRequest) => {
    try {
      // Update request status
      await supabase.from("qr_access_requests").update({ status: "approved" }).eq("id", req.id);

      // Check if permission already exists
      const { data: existingPerm } = await supabase
        .from("qr_permissions")
        .select("id")
        .eq(fkColumn, qrId)
        .eq("user_email", req.user_email)
        .maybeSingle();

      if (existingPerm) {
        // Update existing permission role
        await supabase.from("qr_permissions").update({ 
          role: req.requested_role, 
          status: "active" 
        }).eq("id", existingPerm.id);
      } else {
        // Add new permission
        const insertData: any = {
          [fkColumn]: qrId,
          user_email: req.user_email,
          role: req.requested_role,
          status: "active",
          granted_by: userId,
        };
        await supabase.from("qr_permissions").insert(insertData);
      }

      toast.success(`Approved ${req.user_email} as ${req.requested_role}`);
      fetchData();
    } catch (err) {
      toast.error("Failed to approve request");
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    await supabase.from("qr_access_requests").update({ status: "rejected" }).eq("id", reqId);
    toast.success("Request rejected");
    fetchData();
  };

  const pendingCount = requests.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Manage Access
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{qrTitle || "Untitled QR"}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Access Toggles */}
            <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Public View Access</p>
                    <p className="text-xs text-muted-foreground">Anyone can view without login</p>
                  </div>
                </div>
                <Switch checked={publicView} onCheckedChange={handleTogglePublicView} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Allow Access Requests</p>
                    <p className="text-xs text-muted-foreground">Users can request view/edit access</p>
                  </div>
                </div>
                <Switch checked={allowRequests} onCheckedChange={handleToggleAllowRequests} />
              </div>
            </div>

            <Tabs defaultValue="people">
              <TabsList className="w-full">
                <TabsTrigger value="people" className="flex-1">
                  <Users className="w-4 h-4 mr-1" /> People
                </TabsTrigger>
                <TabsTrigger value="requests" className="flex-1 relative">
                  <Mail className="w-4 h-4 mr-1" /> Requests
                  {pendingCount > 0 && (
                    <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="people" className="space-y-4 mt-4">
                {/* Add person */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
                    className="flex-1"
                  />
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddPerson} disabled={isSaving} size="icon" className="shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Owner */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      You
                    </div>
                    <div>
                      <p className="text-sm font-medium">You (Owner)</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Owner</Badge>
                </div>

                {/* Permissions list */}
                {permissions.map((perm) => (
                  <div key={perm.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground uppercase shrink-0">
                        {perm.user_email[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{perm.user_email}</p>
                        {perm.status === "pending" && (
                          <p className="text-xs text-amber-500">Invited</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={perm.role} onValueChange={(val) => handleChangeRole(perm.id, val)}>
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemovePermission(perm.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {permissions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No people added yet</p>
                )}
              </TabsContent>

              <TabsContent value="requests" className="space-y-3 mt-4">
                {requests.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No pending requests</p>
                  </div>
                ) : (
                  requests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{req.user_email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">{req.requested_role}</Badge>
                          <span className="text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="default" className="h-8" onClick={() => handleApproveRequest(req)}>
                          <Check className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => handleRejectRequest(req.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
