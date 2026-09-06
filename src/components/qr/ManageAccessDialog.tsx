import { useState, useEffect } from "react";
import { Shield, UserPlus, X, Check, Clock, Mail, Users, Globe, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  updateQRAccessSettings,
  approveAccessRequest, 
  rejectAccessRequest, 
  revokePermission, 
  addDirectPermission,
  updatePermissionRole,
  fetchQRPermissionsList,
  fetchQRAccessRequestsList
} from "@/hooks/useQRPermissions";

interface Permission {
  id: string;
  user_email: string;
  user_id?: string;
  role: string;
  status: string;
  created_at: string;
}

interface AccessRequest {
  id: string;
  user_email: string;
  user_id?: string;
  requested_role: string;
  status: string;
  created_at: string;
  requester_name?: string;
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
  open,
  onOpenChange,
  qrId,
  qrType,
  qrTitle,
  userId,
}: ManageAccessDialogProps) => {
  const [publicView, setPublicView] = useState(true);
  const [allowRequests, setAllowRequests] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"viewer" | "editor">("viewer");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const table = qrType === "profile" ? "qr_pages" : "qr_business_pages";
  const fkColumn = qrType === "profile" ? "qr_page_id" : "qr_business_page_id";

  useEffect(() => {
    if (open && qrId) {
      fetchData();

      // Realtime subscription for incoming access requests & permission updates
      const channel = supabase
        .channel(`manage-access-${qrId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "qr_access_requests",
            filter: `${fkColumn}=eq.${qrId}`,
          },
          () => {
            fetchRequests();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "qr_permissions",
            filter: `${fkColumn}=eq.${qrId}`,
          },
          () => {
            fetchPermissions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, qrId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch QR settings
      const { data: qrData } = await supabase
        .from(table)
        .select("public_view, allow_requests")
        .eq("id", qrId)
        .single();

      if (qrData) {
        setPublicView(qrData.public_view ?? true);
        setAllowRequests(qrData.allow_requests ?? false);
      }

      await Promise.all([fetchPermissions(), fetchRequests()]);
    } catch (err) {
      console.error("Error loading access settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const perms = await fetchQRPermissionsList(qrId, qrType === "business", userId);
      setPermissions(perms || []);
    } catch (err) {
      console.warn("RPC fetchQRPermissionsList failed, falling back to direct query:", err);
      const { data: perms } = await supabase
        .from("qr_permissions")
        .select("*")
        .eq(fkColumn, qrId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setPermissions(perms || []);
    }
  };

  const fetchRequests = async () => {
    try {
      const reqs = await fetchQRAccessRequestsList(qrId, qrType === "business", userId);
      setRequests(reqs || []);
    } catch (err) {
      console.warn("RPC fetchQRAccessRequestsList failed, falling back to direct query:", err);
      const { data: reqs } = await supabase
        .from("qr_access_requests")
        .select("*")
        .eq(fkColumn, qrId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!reqs || reqs.length === 0) {
        setRequests([]);
        return;
      }

      const userIds = reqs.map((r: any) => r.user_id).filter(Boolean);
      let nameMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);

        (profiles || []).forEach((p: any) => {
          if (p.user_id && p.display_name) {
            nameMap[p.user_id] = p.display_name;
          }
        });
      }

      setRequests(
        reqs.map((r: any) => ({
          ...r,
          requester_name: r.user_id ? nameMap[r.user_id] : undefined,
        }))
      );
    }
  };

  const handleTogglePublicView = async (val: boolean) => {
    setPublicView(val);
    try {
      await updateQRAccessSettings(qrId, qrType === "business", val, allowRequests, userId);
      toast.success(val ? "Public access enabled" : "Access restricted to permitted users");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update Public View Access");
      setPublicView(!val);
    }
  };

  const handleToggleAllowRequests = async (val: boolean) => {
    setAllowRequests(val);
    try {
      await updateQRAccessSettings(qrId, qrType === "business", publicView, val, userId);
      toast.success(val ? "Access requests enabled" : "Access requests disabled");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update Allow Access Requests");
      setAllowRequests(!val);
    }
  };

  const handleAddPerson = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (permissions.some((p) => p.user_email.toLowerCase() === trimmed)) {
      toast.error("This user already has access");
      return;
    }

    setIsSaving(true);
    try {
      await addDirectPermission(qrId, qrType === "business", trimmed, newRole, userId);
      toast.success(`${trimmed} added as ${newRole}`);
      setNewEmail("");
      await fetchPermissions();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add user permission");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeRole = async (permId: string, role: "viewer" | "editor") => {
    try {
      await updatePermissionRole(permId, role, userId);
      toast.success(`Role updated to ${role}`);
      await fetchPermissions();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update role");
    }
  };

  const handleRemovePermission = async (permId: string, email: string) => {
    try {
      await revokePermission(permId, userId);
      toast.success(`Access revoked for ${email}`);
      await fetchPermissions();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove permission");
    }
  };

  const handleApprove = async (req: AccessRequest, role: "viewer" | "editor") => {
    setActionLoadingId(`${req.id}-${role}`);
    try {
      await approveAccessRequest(req.id, role, userId);
      toast.success(`Approved ${req.user_email} as ${role}`);
      await Promise.all([fetchRequests(), fetchPermissions()]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve request");
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (reqId: string) => {
    setActionLoadingId(`${reqId}-reject`);
    try {
      await rejectAccessRequest(reqId, userId);
      toast.success("Request rejected");
      await fetchRequests();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject request");
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = requests.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full max-h-[85vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/60 shadow-2xl p-6">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            Manage Access
          </DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{qrTitle || "Untitled QR"}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Access Toggles */}
            <div className="space-y-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Public View Access</p>
                    <p className="text-xs text-muted-foreground">Anyone can view without login</p>
                  </div>
                </div>
                <Switch checked={publicView} onCheckedChange={handleTogglePublicView} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Allow Access Requests</p>
                    <p className="text-xs text-muted-foreground">Users can request view/edit access</p>
                  </div>
                </div>
                <Switch checked={allowRequests} onCheckedChange={handleToggleAllowRequests} />
              </div>
            </div>

            {/* People and Requests Tabs */}
            <Tabs defaultValue="people" className="w-full">
              <TabsList className="w-full grid grid-cols-2 bg-secondary/40 border border-border/40 p-1">
                <TabsTrigger value="people" className="flex items-center gap-2 text-xs font-semibold py-2">
                  <Users className="w-4 h-4" /> People
                </TabsTrigger>
                <TabsTrigger value="requests" className="flex items-center gap-2 text-xs font-semibold py-2 relative">
                  <Mail className="w-4 h-4" /> Requests
                  {pendingCount > 0 && (
                    <Badge className="ml-1.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] bg-primary text-primary-foreground font-bold rounded-full">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* People Tab Content */}
              <TabsContent value="people" className="space-y-4 mt-4">
                {/* Add Person Row */}
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
                    className="flex-1 bg-secondary/20 border-border/50 h-10 text-sm"
                  />
                  <Select
                    value={newRole}
                    onValueChange={(val: "viewer" | "editor") => setNewRole(val)}
                  >
                    <SelectTrigger className="w-28 h-10 text-xs font-medium border-border/50 bg-secondary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddPerson}
                    disabled={isSaving || !newEmail.trim()}
                    className="h-10 px-3.5 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                    title="Add User"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Owner Row */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-secondary/15">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      You
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">You (Owner)</p>
                      <p className="text-xs text-muted-foreground">Original creator</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-semibold text-primary border-primary/30 bg-primary/5">
                    Owner
                  </Badge>
                </div>

                {/* Permissions List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-secondary/10 hover:bg-secondary/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-xs font-bold uppercase shrink-0 border border-border/40">
                          {perm.user_email[0] || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{perm.user_email}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{perm.role}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={perm.role}
                          onValueChange={(val: "viewer" | "editor") => handleChangeRole(perm.id, val)}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs font-medium border-border/50 bg-background/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemovePermission(perm.id, perm.user_email)}
                          title="Revoke access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {permissions.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No people added yet
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Requests Tab Content */}
              <TabsContent value="requests" className="space-y-3 mt-4">
                {requests.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center mx-auto text-muted-foreground">
                      <Mail className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No pending requests</p>
                    <p className="text-xs text-muted-foreground">
                      When users request access to this QR code, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {requests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-xl border border-border/60 bg-secondary/15 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {req.requester_name ? `${req.requester_name} (${req.user_email})` : req.user_email}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold uppercase tracking-wider text-primary border-primary/30 bg-primary/10"
                              >
                                Requested: {req.requested_role}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground flex items-center">
                                <Clock className="w-3 h-3 mr-1 inline" />
                                {new Date(req.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Owner Approval Decision Buttons */}
                        <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/30">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs px-2.5 hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                            disabled={!!actionLoadingId}
                            onClick={() => handleApprove(req, "viewer")}
                          >
                            {actionLoadingId === `${req.id}-viewer` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <Check className="w-3.5 h-3.5 mr-1" />
                            )}
                            As Viewer
                          </Button>

                          <Button
                            size="sm"
                            className="h-8 text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={!!actionLoadingId}
                            onClick={() => handleApprove(req, "editor")}
                          >
                            {actionLoadingId === `${req.id}-editor` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <Check className="w-3.5 h-3.5 mr-1" />
                            )}
                            As Editor
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            disabled={!!actionLoadingId}
                            onClick={() => handleReject(req.id)}
                            title="Reject request"
                          >
                            {actionLoadingId === `${req.id}-reject` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
