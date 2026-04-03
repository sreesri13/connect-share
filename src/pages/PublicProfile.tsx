import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { QrCode, Link as LinkIcon, FileText, ExternalLink, User, File, Image, Video, Music, Loader2, Lock, Eye, EyeOff, Play, Wifi, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { verifyPassword } from "@/lib/crypto";
import { toast } from "sonner";
import { initGA, trackProfileView, trackQRScan, trackLinkClick, isQRTraffic } from "@/lib/analytics";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LocationVerification } from "@/components/qr/LocationVerification";
import { ExpiryCountdown } from "@/components/qr/ExpiryCountdown";
import { recordQRScan, checkScanLimit } from "@/hooks/useQRScans";
import { FileViewer } from "@/components/FileViewer";
import { ScanLimitReached } from "@/components/qr/ScanLimitReached";
import { PlatformIcon } from "@/lib/platform-icons";
import { AccessDenied } from "@/components/qr/AccessDenied";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileItem {
  id: string;
  title: string;
  type: string;
  content: string;
  category_name: string;
}

interface ProfileData {
  display_name: string | null;
  bio: string | null;
}

interface QRPageData {
  id: string;
  user_id: string;
  title: string | null;
  password_hash: string | null;
  location_locked: boolean | null;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
  expires_at: string | null;
  show_expires_at: boolean | null;
  starred_item_id: string | null;
  scan_limit_type: string | null;
  max_scans: number | null;
  daily_limit: number | null;
}

const typeIcons: Record<string, React.ComponentType<any>> = {
  url: LinkIcon,
  text: FileText,
  pdf: File,
  image: Image,
  video: Video,
  audio: Music,
  others: File,
  wifi: Wifi,
};

// Helper to handle starred item redirect
const handleStarredRedirect = (item: ProfileItem) => {
  if (item.type === "url") {
    let url = item.content;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    window.location.href = url;
    return true;
  }
  return false;
};

const PublicProfile = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [items, setItems] = useState<ProfileItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ProfileItem | null>(null);
  const [qrPageData, setQrPageData] = useState<QRPageData | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [scanLimitReached, setScanLimitReached] = useState(false);
  const [scanLimitReachedType, setScanLimitReachedType] = useState<'total' | 'daily'>('total');

  // Access control states
  const [accessDenied, setAccessDenied] = useState(false);
  const [allowRequests, setAllowRequests] = useState(false);
  const [qrIdForAccess, setQrIdForAccess] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  // Password protection states
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Location verification states
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [isLocationVerified, setIsLocationVerified] = useState(false);

  useEffect(() => {
    // Initialize GA tracking on public profile pages
    initGA();
    
    if (profileId) {
      // Track QR scan event when profile is accessed
      trackQRScan(profileId);
      trackProfileView(profileId);
      checkSecurityRequirements();
    }
  }, [profileId]);

  const checkSecurityRequirements = async () => {
    try {
      const { data: qrPage, error: qrError } = await supabase
        .from("qr_pages")
        .select("id, user_id, title, password_hash, location_locked, location_lat, location_lng, location_name, expires_at, show_expires_at, starred_item_id, scan_limit_type, max_scans, daily_limit, public_view, allow_requests")
        .eq("public_id", profileId)
        .maybeSingle();

      if (qrError) throw qrError;

      if (!qrPage) {
        setError("Profile not found");
        setIsLoading(false);
        return;
      }

      setQrPageData(qrPage);
      setQrIdForAccess(qrPage.id);

      // Check access control
      const isPublic = (qrPage as any).public_view ?? true;
      const reqsAllowed = (qrPage as any).allow_requests ?? false;
      setAllowRequests(reqsAllowed);

      if (!isPublic) {
        // Check if user is owner
        const { data: { session } } = await supabase.auth.getSession();
        const isOwner = session?.user?.id === qrPage.user_id;
        
        if (isOwner) {
          setUserRole("owner");
        } else {
          // Check if user has permission
          let permRole: string | null = null;
          if (session?.user?.email) {
            const { data: perm } = await supabase
              .from("qr_permissions")
              .select("role")
              .eq("qr_page_id", qrPage.id)
              .eq("user_email", session.user.email.toLowerCase())
              .eq("status", "active")
              .maybeSingle();
            permRole = perm?.role || null;
          }
          
          if (!permRole) {
            setAccessDenied(true);
            setIsLoading(false);
            return;
          }
          setUserRole(permRole);
        }
      } else {
        // Public page - still check role for banner display
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id === qrPage.user_id) {
          setUserRole("owner");
        } else if (session?.user?.email) {
          const { data: perm } = await supabase
            .from("qr_permissions")
            .select("role")
            .eq("qr_page_id", qrPage.id)
            .eq("user_email", session.user.email.toLowerCase())
            .eq("status", "active")
            .maybeSingle();
          setUserRole(perm?.role || null);
        }
      }

      // Check scan limit before anything else
      if (qrPage.scan_limit_type && qrPage.scan_limit_type !== 'unlimited') {
        const limitCheck = await checkScanLimit(
          qrPage.id, qrPage.scan_limit_type, qrPage.max_scans, qrPage.daily_limit, false
        );
        if (!limitCheck.allowed) {
          setScanLimitReached(true);
          setScanLimitReachedType(qrPage.scan_limit_type === 'daily' ? 'daily' : 'total');
          setIsLoading(false);
          return;
        }
      }

      // Check for location lock first
      if (qrPage.location_locked && qrPage.location_lat && qrPage.location_lng) {
        setIsLocationLocked(true);
        setIsLoading(false);
        return;
      }

      // Then check for password
      if (qrPage.password_hash) {
        setIsPasswordProtected(true);
        setIsLoading(false);
      } else {
        setIsPasswordVerified(true);
        fetchPublicProfile(qrPage);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load profile");
      setIsLoading(false);
    }
  };

  const handleLocationVerified = () => {
    setIsLocationVerified(true);
    // After location verification, check for password
    if (qrPageData?.password_hash) {
      setIsPasswordProtected(true);
    } else {
      setIsPasswordVerified(true);
      setIsLoading(true);
      fetchPublicProfile(qrPageData!);
    }
  };

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setPasswordError("Please enter a password");
      return;
    }

    setIsVerifying(true);
    setPasswordError("");

    try {
      // Get the stored password hash
      const { data: qrPage, error } = await supabase
        .from("qr_pages")
        .select("password_hash")
        .eq("public_id", profileId)
        .single();

      if (error) throw error;

      // Verify password using client-side hashing
      if (qrPage?.password_hash && verifyPassword(password.trim(), qrPage.password_hash)) {
        setIsPasswordVerified(true);
        setIsLoading(true);
        fetchPublicProfile(qrPageData!);
      } else {
        setPasswordError("Incorrect password");
      }
    } catch (err) {
      console.error(err);
      setPasswordError("Failed to verify password");
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchPublicProfile = async (qrPage: QRPageData) => {
    try {
      // Record scan in database
      recordQRScan(qrPage.id, false);

      // Fetch profile of the owner
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, bio")
        .eq("user_id", qrPage.user_id)
        .maybeSingle();

      setProfile(profileData);

      // Fetch items associated with this QR page
      const { data: qrPageItems, error: itemsError } = await supabase
        .from("qr_page_items")
        .select(`
          display_order,
          items (
            id,
            title,
            type,
            content,
            categories (name)
          )
        `)
        .eq("qr_page_id", qrPage.id)
        .order("display_order", { ascending: true });

      if (itemsError) throw itemsError;

      const formattedItems = (qrPageItems || []).map((qpItem: any) => ({
        id: qpItem.items.id,
        title: qpItem.items.title,
        type: qpItem.items.type,
        content: qpItem.items.content,
        category_name: qpItem.items.categories?.name || "Unknown",
      }));

      // Check for starred item - redirect directly
      if (qrPage.starred_item_id) {
        const starredItem = formattedItems.find((item: ProfileItem) => item.id === qrPage.starred_item_id);
        if (starredItem) {
          if (starredItem.type === "url") {
            setIsRedirecting(true);
            let url = starredItem.content;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              url = 'https://' + url;
            }
            window.location.replace(url);
            return;
          } else {
            // For file types, show only that item
            setItems([starredItem]);
            setProfile(profileData);
            setIsLoading(false);
            // Auto-open the file viewer
            setSelectedItem(starredItem);
            return;
          }
        }
      }

      setItems(formattedItems);
    } catch (err) {
      console.error(err);
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  // WiFi dialog state
  const [wifiItem, setWifiItem] = useState<ProfileItem | null>(null);
  const [wifiCopied, setWifiCopied] = useState("");

  const parseWifi = (content: string) => {
    const ssidMatch = content.match(/S:([^;]*)/);
    const passMatch = content.match(/P:([^;]*)/);
    const typeMatch = content.match(/T:([^;]*)/);
    const hiddenMatch = content.match(/H:([^;]*)/);
    return {
      ssid: ssidMatch?.[1] || "",
      password: passMatch?.[1] || "",
      encryption: typeMatch?.[1] || "WPA",
      hidden: hiddenMatch?.[1] === "true",
    };
  };

  const handleCopyWifiField = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setWifiCopied(field);
      setTimeout(() => setWifiCopied(""), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleItemClick = (item: ProfileItem) => {
    // Track link click for analytics
    trackLinkClick(
      item.content,
      item.title,
      item.type === "url" ? "url" : "other",
      profileId
    );

    if (item.type === "wifi") {
      setWifiItem(item);
      return;
    }

    if (item.type === "url") {
      // Ensure URL has protocol
      let url = item.content;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");
      if (!newWindow) {
        navigator.clipboard.writeText(url);
        toast.info("Link copied! Open it in a new tab.");
      }
    } else {
      setSelectedItem(item);
    }
  };

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category_name]) {
      acc[item.category_name] = [];
    }
    acc[item.category_name].push(item);
    return acc;
  }, {} as Record<string, ProfileItem[]>);

  // Access denied screen
  if (accessDenied) {
    return <AccessDenied qrId={qrIdForAccess} qrType="profile" allowRequests={allowRequests} />;
  }

  // Scan limit reached screen
  if (scanLimitReached) {
    return <ScanLimitReached type={scanLimitReachedType} />;
  }

  // Location verification screen
  if (isLocationLocked && !isLocationVerified && qrPageData) {
    return (
      <LocationVerification
        targetLat={qrPageData.location_lat!}
        targetLng={qrPageData.location_lng!}
        targetName={qrPageData.location_name || "Selected Location"}
        onVerified={handleLocationVerified}
      />
    );
  }

  // Password entry screen
  if (isPasswordProtected && !isPasswordVerified) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm relative z-10"
        >
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Protected Content</h2>
              <p className="text-muted-foreground text-sm">
                This QR code is password protected. Enter the password to view the content.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}

              <Button onClick={handleVerifyPassword} className="w-full" disabled={isVerifying}>
                {isVerifying ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Unlock Content"
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // When redirecting to a starred URL, show nothing
  if (isRedirecting) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
        <Card className="max-w-md text-center p-8">
          <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">{error}</h2>
          <p className="text-muted-foreground mb-6">
            This profile link may be invalid or expired.
          </p>
          <Button asChild>
            <a href="/">Create Your Own Profile</a>
          </Button>
        </Card>
      </div>
    );
  }

  const displayName = profile?.display_name || "User";

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      {/* Language Toggle - Top Right */}
      <LanguageToggle />
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Profile Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow"
          >
            <User className="w-12 h-12 text-primary-foreground" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-foreground mb-1"
          >
            {displayName}
          </motion.h1>
          {profile?.bio && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground"
            >
              {profile.bio}
            </motion.p>
          )}
          {/* Expiry Countdown */}
          {qrPageData?.show_expires_at && qrPageData?.expires_at && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-3 flex justify-center"
            >
              <ExpiryCountdown expiresAt={qrPageData.expires_at} />
            </motion.div>
          )}
        </div>

        {/* View-only banner for logged-in users without edit access */}
        {user && userRole !== "owner" && userRole !== "editor" && (
          <AccessDenied qrId={qrIdForAccess} qrType="profile" allowRequests={allowRequests} viewOnly />
        )}

        {/* Categories & Items */}
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([categoryName, categoryItems], catIndex) => (
            <motion.div
              key={categoryName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + catIndex * 0.1 }}
            >
              <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
                {categoryName}
              </h3>
              <div className="space-y-2">
                {categoryItems.map((item, itemIndex) => {
                  const isMedia = ["image", "video", "audio", "pdf"].includes(item.type);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + catIndex * 0.1 + itemIndex * 0.05 }}
                    >
                      <Card
                        className="cursor-pointer hover:border-primary/50 hover:shadow-glow transition-all group"
                        onClick={() => handleItemClick(item)}
                      >
                        <CardContent className="flex items-center gap-4 p-4">
                          <PlatformIcon type={item.type} content={item.content} size="lg" className="group-hover:scale-110 transition-transform" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{item.title}</p>
                            {item.type === "url" && (
                              <p className="text-sm text-muted-foreground truncate">{item.content}</p>
                            )}
                            {item.type === "text" && (
                              <p className="text-sm text-muted-foreground">Click to view</p>
                            )}
                            {item.type === "wifi" && (
                              <p className="text-sm text-muted-foreground">Tap to connect</p>
                            )}
                            {isMedia && item.type !== "pdf" && (
                              <p className="text-sm text-muted-foreground">Click to view</p>
                            )}
                            {item.type === "pdf" && (
                              <p className="text-sm text-muted-foreground">Click to open PDF</p>
                            )}
                          </div>
                          {(item.type === "url" || item.type === "pdf") && (
                            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          )}
                          {item.type === "wifi" && (
                            <Wifi className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          )}
                          {["image", "video", "audio"].includes(item.type) && (
                            <Play className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <QrCode className="w-4 h-4" />
            <span className="text-sm">Powered by ConnectHUB</span>
          </div>
          <Button variant="link" className="mt-2 text-primary" asChild>
            <a href="/">Create your own profile</a>
          </Button>
        </motion.div>
      </motion.div>

      {/* WiFi Credentials Dialog */}
      <Dialog open={!!wifiItem} onOpenChange={(open) => !open && setWifiItem(null)}>
        <DialogContent className="sm:max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" />
              {wifiItem?.title || "WiFi Network"}
            </DialogTitle>
            <DialogDescription>
              Connect to this WiFi network
            </DialogDescription>
          </DialogHeader>
          {wifiItem && (() => {
            const wifi = parseWifi(wifiItem.content);
            return (
              <div className="space-y-4 mt-2">
                <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Network Name</p>
                      <p className="font-medium text-foreground">{wifi.ssid}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyWifiField(wifi.ssid, "ssid")}>
                      {wifiCopied === "ssid" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  {wifi.encryption !== "nopass" && wifi.password && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Password</p>
                        <p className="font-medium text-foreground font-mono">{wifi.password}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyWifiField(wifi.password, "password")}>
                        {wifiCopied === "password" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Security</p>
                    <p className="text-sm text-foreground">{wifi.encryption === "nopass" ? "Open (No Password)" : wifi.encryption}</p>
                  </div>
                  {wifi.hidden && (
                    <p className="text-xs text-muted-foreground italic">This is a hidden network</p>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* File Viewer Modal - Supports all file types */}
      <FileViewer
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        file={selectedItem ? {
          title: selectedItem.title,
          content: selectedItem.content,
          type: selectedItem.type as "url" | "text" | "pdf" | "image" | "video" | "audio" | "others" | "wifi" | "largefile"
        } : null}
      />
    </div>
  );
};

export default PublicProfile;
