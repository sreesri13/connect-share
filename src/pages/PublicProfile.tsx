import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { QrCode, Link as LinkIcon, FileText, ExternalLink, User, File, Image, Video, Music, Loader2, Lock, Eye, EyeOff, Play, Wifi, Copy, Check, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { verifyQRPassword } from "@/lib/crypto";
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
import { QRExpiredScreen } from "@/components/qr/QRExpiredScreen";
import { useAuth } from "@/contexts/AuthContext";
import { fetchQRAccessInfo } from "@/hooks/useQRPermissions";
import { EditQRPageModal } from "@/components/qr/EditQRPageModal";
import { Badge } from "@/components/ui/badge";
import { RequestAccessBanner } from "@/components/qr/RequestAccessBanner";

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
  avatar_url: string | null;
}

interface QRPageData {
  id: string;
  public_id: string;
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
  show_install_popup: boolean;
  show_footer_branding: boolean;
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
  const [isExpired, setIsExpired] = useState(false);
  const [expiredAt, setExpiredAt] = useState<string | null>(null);
  const [scanLimitReached, setScanLimitReached] = useState(false);
  const [scanLimitReachedType, setScanLimitReachedType] = useState<'total' | 'daily'>('total');

  // Access control states
  const [accessDenied, setAccessDenied] = useState(false);
  const [allowRequests, setAllowRequests] = useState(false);
  const [qrIdForAccess, setQrIdForAccess] = useState("");
  const [qrPageTitle, setQrPageTitle] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState("Owner");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  // Realtime subscription for updates to page data, items, and permissions
  useEffect(() => {
    if (!qrIdForAccess) return;

    const channel = supabase
      .channel(`public-profile-live-${qrIdForAccess}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "qr_pages",
          filter: `id=eq.${qrIdForAccess}`,
        },
        (payload: any) => {
          if (payload.new) {
            setQrPageData((prev: any) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "qr_page_items",
          filter: `qr_page_id=eq.${qrIdForAccess}`,
        },
        () => {
          fetchPublicProfileItems(qrIdForAccess);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "qr_permissions",
          filter: `qr_page_id=eq.${qrIdForAccess}`,
        },
        () => {
          checkSecurityRequirements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qrIdForAccess]);

  const checkSecurityRequirements = async () => {
    try {
      // 1. Fetch access info securely
      const accessInfo = await fetchQRAccessInfo(profileId || "", false);
      if (!accessInfo.exists) {
        setError("Profile not found");
        setIsLoading(false);
        return;
      }

      setOwnerName(accessInfo.owner_name || "Owner");
      setAllowRequests(accessInfo.allow_requests ?? false);
      setUserRole(accessInfo.user_role || null);
      if (accessInfo.id) {
        setQrIdForAccess(accessInfo.id);
      }
      if (accessInfo.title) {
        setQrPageTitle(accessInfo.title);
      }

      // Check access permission (Public vs Private)
      const isPublic = accessInfo.public_view ?? true;
      const isAuthorized =
        accessInfo.user_role === "owner" ||
        accessInfo.user_role === "editor" ||
        accessInfo.user_role === "viewer";

      if (!isPublic && !isAuthorized) {
        setAccessDenied(true);
        setIsLoading(false);
        return;
      }

      // 2. Fetch full QR page row
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId || "");
      let query = supabase
        .from("qr_pages")
        .select("id, user_id, title, public_id, password_hash, location_locked, location_lat, location_lng, location_name, expires_at, show_expires_at, starred_item_id, scan_limit_type, max_scans, daily_limit, public_view, allow_requests, show_install_popup, show_footer_branding, is_deleted");

      if (isUuid) {
        query = query.or(`public_id.eq.${profileId},id.eq.${profileId}`);
      } else {
        query = query.eq("public_id", profileId);
      }

      const { data: qrPage, error: qrError } = await query.maybeSingle();

      if (qrError) {
        console.error("Error fetching QR page:", qrError);
        throw qrError;
      }

      if (!qrPage || qrPage.is_deleted) {
        setError("Profile not found");
        setIsLoading(false);
        return;
      }

      setQrPageData(qrPage as any);
      setQrIdForAccess(qrPage.id);

      // =========================================================================
      // STRICT ORDER OF VERIFICATION:
      // 1. Expiration Time -> 2. Scan Limit -> 3. Location Lock -> 4. Password
      // =========================================================================

      // Step 1: Verify Expiration Time First
      if (qrPage.expires_at) {
        const expiryDate = new Date(qrPage.expires_at);
        if (expiryDate.getTime() < Date.now()) {
          setIsExpired(true);
          setExpiredAt(qrPage.expires_at);
          setIsLoading(false);
          return;
        }
      }

      // Step 2: Verify Scan Limit Next
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

      // Step 3: Verify Location Lock (Before Password)
      const isLocationSecured = Boolean(qrPage.location_locked && qrPage.location_lat && qrPage.location_lng);
      if (isLocationSecured) {
        setIsLocationLocked(true);
        // Note: isLocationVerified is false initially, so location screen will show first
        setIsLoading(false);
        return;
      }

      // Step 4: Verify Password (If not location locked, or location verified)
      const hasPassword = Boolean(qrPage.password_hash);
      if (hasPassword) {
        setIsPasswordProtected(true);
        setIsLoading(false);
        return;
      }

      // Step 5: All verifications passed - Fetch content directly
      setIsPasswordVerified(true);
      setIsLocationVerified(true);
      fetchPublicProfile(qrPage as any);
    } catch (err) {
      console.error("Profile check security error:", err);
      setError("Failed to load profile");
      setIsLoading(false);
    }
  };

  const handleLocationVerified = () => {
    setIsLocationVerified(true);
    // After location is verified, check if password is required before showing content
    if (qrPageData?.password_hash && !isPasswordVerified) {
      setIsPasswordProtected(true);
      setIsLoading(false);
    } else {
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
      // Verify password server-side (bcrypt)
      const lookupPublicId = qrPageData?.public_id || profileId!;
      const isValid = await verifyQRPassword(lookupPublicId, password.trim());

      if (isValid) {
        setIsPasswordVerified(true);
        setIsLoading(true);
        fetchPublicProfile(qrPageData!);
      } else {
        setPasswordError("Incorrect password. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setPasswordError("Failed to verify password");
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchPublicProfileItems = async (pageId: string) => {
    try {
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
        .eq("qr_page_id", pageId)
        .order("display_order", { ascending: true });

      if (!itemsError && qrPageItems) {
        const formattedItems = qrPageItems
          .filter((qpItem: any) => qpItem && qpItem.items)
          .map((qpItem: any) => ({
            id: qpItem.items.id,
            title: qpItem.items.title,
            type: qpItem.items.type,
            content: qpItem.items.content,
            category_name: qpItem.items.categories?.name || "General",
          }));
        setItems(formattedItems);
        return formattedItems;
      }
      return [];
    } catch (itemsErr) {
      console.warn("Items query error:", itemsErr);
      return [];
    }
  };

  const fetchPublicProfile = async (qrPage: QRPageData) => {
    try {
      // Record scan in database
      recordQRScan(qrPage.id, false).catch(e => console.warn("Scan record error:", e));

      // Fetch profile of the owner
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name, bio, avatar_url")
          .eq("user_id", qrPage.user_id)
          .maybeSingle();

        setProfile(profileData);
        if (profileData?.display_name) {
          setOwnerName(profileData.display_name);
        }
      } catch (profErr) {
        console.warn("Owner profile fetch error:", profErr);
      }

      // Fetch items associated with this QR page
      const formattedItems = await fetchPublicProfileItems(qrPage.id);

      // Check for starred item - redirect if valid URL, or auto-open file viewer
      if (qrPage.starred_item_id) {
        const starredItem = formattedItems.find((item: ProfileItem) => item.id === qrPage.starred_item_id);
        if (starredItem) {
          if (starredItem.type === "url" && starredItem.content && starredItem.content.trim()) {
            setIsRedirecting(true);
            let url = starredItem.content.trim();
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              url = 'https://' + url;
            }
            window.location.replace(url);
            return;
          } else if (starredItem.content) {
            setItems(formattedItems);
            setIsLoading(false);
            setSelectedItem(starredItem);
            return;
          }
        }
      }
    } catch (err) {
      console.error("Public profile load error:", err);
      setItems([]);
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

  // Expired screen
  if (isExpired) {
    return <QRExpiredScreen expiredAt={expiredAt} title={qrPageData?.title} />;
  }

  // Access denied screen
  if (accessDenied) {
    return (
      <AccessDenied
        qrId={qrIdForAccess}
        qrType="profile"
        allowRequests={allowRequests}
        qrTitle={qrPageTitle || qrPageData?.title || "QR Page"}
        ownerName={ownerName}
      />
    );
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
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-start">
      {/* Request Access Banner when allowRequests is on and user is not owner/editor */}
      {allowRequests && userRole !== "owner" && userRole !== "editor" && (
        <RequestAccessBanner
          qrId={qrIdForAccess}
          qrType="profile"
          allowRequests={allowRequests}
          qrTitle={qrPageTitle || qrPageData?.title || "QR Profile"}
          ownerName={ownerName}
          userRole={userRole as any}
        />
      )}

      <div className="w-full flex-1 flex items-center justify-center p-6 relative">
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
        {/* Owner Highlighting */}
        <div className="flex justify-center mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/70 border border-border/60 text-xs font-medium text-muted-foreground shadow-sm">
            <User className="w-3.5 h-3.5 text-primary" />
            <span>Owner: <strong className="text-foreground">{ownerName}</strong></span>
            {userRole && (
              <Badge variant="outline" className="ml-1 text-[10px] uppercase font-semibold tracking-wider py-0 px-1.5 border-primary/30 text-primary">
                {userRole === "owner" ? "Owner" : userRole === "editor" ? "Editor" : "Viewer"}
              </Badge>
            )}
          </div>
        </div>

        {/* Profile Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow overflow-hidden"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name || "User"} className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-primary-foreground" />
            )}
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

        {/* View-only banner for viewers without edit access */}
        {userRole !== "owner" && userRole !== "editor" && (
          <AccessDenied
            qrId={qrIdForAccess}
            qrType="profile"
            allowRequests={allowRequests}
            qrTitle={qrPageData?.title || "QR Page"}
            ownerName={ownerName}
            viewOnly
          />
        )}

        {/* Categories & Items */}
        <div className="space-y-6">
          {items.length === 0 ? (
            <Card className="p-8 text-center bg-card/60 backdrop-blur border-border/50">
              <QrCode className="w-12 h-12 mx-auto mb-3 text-muted-foreground/60" />
              <h3 className="text-base font-semibold text-foreground mb-1">No Items Added Yet</h3>
              <p className="text-sm text-muted-foreground">
                This QR page doesn't have any active links or files attached to it.
              </p>
            </Card>
          ) : (
            Object.entries(groupedItems).map(([categoryName, categoryItems], catIndex) => (
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
            ))
          )}
        </div>

        {/* Footer - conditional on show_footer_branding */}
        {(qrPageData?.show_footer_branding !== false) && (
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
        )}
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

      <FileViewer
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        file={selectedItem ? {
          title: selectedItem.title,
          content: selectedItem.content,
          type: selectedItem.type as "url" | "text" | "pdf" | "image" | "video" | "audio" | "others" | "wifi" | "largefile"
        } : null}
      />

      {/* Floating Edit Button for Owner and Approved Editors */}
      {(userRole === "owner" || userRole === "editor") && (
        <Button
          size="sm"
          onClick={() => setIsEditModalOpen(true)}
          className="fixed bottom-6 right-6 z-50 rounded-full shadow-2xl bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 flex items-center gap-2"
        >
          <Edit3 className="w-4 h-4" />
          <span className="font-semibold text-xs">Edit Page</span>
          {userRole === "editor" && (
            <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] py-0 px-1.5 ml-0.5">
              Editor
            </Badge>
          )}
        </Button>
      )}
      </div>

      {/* In-page Edit QR Webpage Modal */}
      {qrPageData && (
        <EditQRPageModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          qrPageId={qrPageData.id}
          initialTitle={qrPageData.title || "Untitled QR"}
          initialItems={items.map((i) => ({ ...i }))}
          ownerId={qrPageData.user_id}
          onSaveSuccess={() => {
            if (qrPageData?.id) {
              fetchPublicProfileItems(qrPageData.id);
            }
          }}
        />
      )}
    </div>
  );
};

export default PublicProfile;
