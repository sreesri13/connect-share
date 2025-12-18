import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User,
  LogOut,
  Trash2,
  ArrowLeft,
  Save,
  AlertTriangle,
  Loader2,
  Settings,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type SettingsSection = "profile" | "account";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();

  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    if (!user && !authLoading) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, bio")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    if (!user) return;

    setIsDeleting(true);
    try {
      // Delete all user data
      // Delete QR page items first (due to foreign keys)
      const { data: qrPages } = await supabase
        .from("qr_pages")
        .select("id")
        .eq("user_id", user.id);

      if (qrPages && qrPages.length > 0) {
        const qrPageIds = qrPages.map((qr) => qr.id);
        await supabase.from("qr_page_items").delete().in("qr_page_id", qrPageIds);
      }

      // Delete QR pages
      await supabase.from("qr_pages").delete().eq("user_id", user.id);

      // Delete items
      await supabase.from("items").delete().eq("user_id", user.id);

      // Delete categories
      await supabase.from("categories").delete().eq("user_id", user.id);

      // Delete profile
      await supabase.from("profiles").delete().eq("user_id", user.id);

      // Sign out and redirect
      await signOut();
      toast.success("Account deleted successfully");
      navigate("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const sidebarItems = [
    { id: "profile" as SettingsSection, label: "My Profile", icon: User },
    { id: "account" as SettingsSection, label: "Account", icon: Shield },
  ];

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero p-6 md:p-12">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground">Manage your account and profile</p>
            </div>
          </div>
        </motion.div>

        {/* Side-by-side layout */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="md:w-64 flex-shrink-0"
          >
            <Card className="p-2">
              <nav className="space-y-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                        activeSection === item.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </Card>
          </motion.div>

          {/* Content Area */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1"
          >
            {/* Profile Section */}
            {activeSection === "profile" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your display name and bio that appears on your public profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell people about yourself..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ""} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                  </div>
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Account Section */}
            {activeSection === "account" && (
              <div className="space-y-6">
                {/* Sign Out */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LogOut className="w-5 h-5 text-primary" />
                      Sign Out
                    </CardTitle>
                    <CardDescription>
                      Sign out of your account on this device.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            Delete Account Permanently
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-4">
                            <p>
                              This action will permanently delete your account including:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>Your profile information</li>
                              <li>All categories and items</li>
                              <li>All QR codes you've created</li>
                              <li>All uploaded files</li>
                            </ul>
                            <p className="font-medium text-foreground">
                              This action cannot be undone.
                            </p>
                            <div className="space-y-2 pt-2">
                              <Label htmlFor="deleteConfirm">
                                Type <span className="font-mono font-bold">DELETE</span> to confirm:
                              </Label>
                              <Input
                                id="deleteConfirm"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                              />
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmText !== "DELETE" || isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {isDeleting ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                              </span>
                            ) : (
                              "Delete Account"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
