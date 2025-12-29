import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  QrCode,
  Folder,
  ChevronRight,
  LogOut,
  Settings,
  User,
  Menu,
  X,
  CreditCard,
  BarChart3,
  Store,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ProfileSection } from "@/components/dashboard/ProfileSection";
import { QRCodesSection } from "@/components/dashboard/QRCodesSection";
import { QRPaymentsSection } from "@/components/dashboard/QRPaymentsSection";
import { SettingsSection } from "@/components/dashboard/SettingsSection";
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection";
import { QRBusinessSection } from "@/components/dashboard/QRBusinessSection";
import { cn } from "@/lib/utils";

type DashboardSection = "profile" | "qrcodes" | "qrpayments" | "qrbusiness" | "analytics" | "settings";

interface Profile {
  display_name: string | null;
  bio: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<DashboardSection>("profile");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile menu on section change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeSection]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, bio")
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile(profileData);
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  const sidebarItems = [
    { id: "profile" as DashboardSection, label: "My Profile", icon: Folder },
    { id: "qrcodes" as DashboardSection, label: "QR Codes", icon: QrCode },
    { id: "qrpayments" as DashboardSection, label: "QR Payments", icon: CreditCard },
    { id: "qrbusiness" as DashboardSection, label: "QR Business", icon: Store },
    { id: "analytics" as DashboardSection, label: "Dashboard", icon: BarChart3 },
    { id: "settings" as DashboardSection, label: "Settings", icon: Settings },
  ];

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
          <QrCode className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-foreground">
          Connect<span className="text-gradient-primary">HUB</span>
        </span>
      </div>

      <nav className="flex-1 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors min-h-[48px]",
                activeSection === item.id
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent active:bg-sidebar-accent"
              )}
            >
              <span className={activeSection === item.id ? "text-sidebar-primary" : "text-muted-foreground"}>
                <Icon className="w-5 h-5" />
              </span>
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sidebar-accent active:bg-sidebar-accent transition-colors min-h-[56px]">
              <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                {userInitials}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setActiveSection("settings")}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveSection("settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-hero">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between safe-area-padding">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <QrCode className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">
            Connect<span className="text-gradient-primary">HUB</span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="min-h-[44px] min-w-[44px]"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed top-[57px] left-0 bottom-0 w-[280px] max-w-[85vw] bg-sidebar border-r border-sidebar-border p-4 flex flex-col z-50 transition-transform duration-300 ease-in-out safe-area-padding",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="flex-1 space-y-2 mt-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors min-h-[48px]",
                  activeSection === item.id
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent active:bg-sidebar-accent"
                )}
              >
                <span className={activeSection === item.id ? "text-sidebar-primary" : "text-muted-foreground"}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sidebar-accent active:bg-sidebar-accent transition-colors min-h-[56px]">
                <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                  {userInitials}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setActiveSection("settings")}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection("settings")}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border p-4 flex-col z-50">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-[57px] lg:pt-0 min-h-screen min-h-[100dvh]">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          {activeSection === "profile" && user && (
            <ProfileSection userId={user.id} />
          )}
          {activeSection === "qrcodes" && user && (
            <QRCodesSection userId={user.id} />
          )}
          {activeSection === "qrpayments" && user && (
            <QRPaymentsSection userId={user.id} />
          )}
          {activeSection === "qrbusiness" && user && (
            <QRBusinessSection userId={user.id} />
          )}
          {activeSection === "analytics" && user && (
            <AnalyticsSection />
          )}
          {activeSection === "settings" && user && (
            <SettingsSection userId={user.id} userEmail={user.email || ""} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;