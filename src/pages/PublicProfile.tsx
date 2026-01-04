import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { QrCode, Link as LinkIcon, FileText, ExternalLink, User, File, Image, Video, Music, Loader2, Download, Play, Lock, Eye, EyeOff, Copy } from "lucide-react";
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
import { recordQRScan } from "@/hooks/useQRScans";

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
}

const typeIcons: Record<string, React.ComponentType<any>> = {
  url: LinkIcon,
  text: FileText,
  pdf: File,
  image: Image,
  video: Video,
  audio: Music,
  others: File,
};

const PublicProfile = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [items, setItems] = useState<ProfileItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ProfileItem | null>(null);
  const [qrPageData, setQrPageData] = useState<QRPageData | null>(null);

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
        .select("id, user_id, title, password_hash, location_locked, location_lat, location_lng, location_name")
        .eq("public_id", profileId)
        .maybeSingle();

      if (qrError) throw qrError;

      if (!qrPage) {
        setError("Profile not found");
        setIsLoading(false);
        return;
      }

      setQrPageData(qrPage);

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

      setItems(formattedItems);
    } catch (err) {
      console.error(err);
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
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

    if (item.type === "url") {
      // Ensure URL has protocol
      let url = item.content;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      // Open URL in a new browser window/tab - use window.open with popup approach for better compatibility
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");
      if (!newWindow) {
        // Fallback: copy URL and notify user
        navigator.clipboard.writeText(url);
        toast.info("Link copied! Open it in a new tab.");
      }
    } else if (item.type === "text") {
      // Open text in modal for viewing
      setSelectedItem(item);
    } else if (item.type === "pdf" || item.type === "others") {
      // Open PDF or other file in new tab
      const newWindow = window.open(item.content, "_blank", "noopener,noreferrer");
      if (!newWindow) {
        navigator.clipboard.writeText(item.content);
        toast.info("File link copied! Open it in a new tab.");
      }
    } else if (["image", "video", "audio"].includes(item.type)) {
      // Open modal for media preview
      setSelectedItem(item);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Text copied to clipboard!");
  };

  const handleDownload = (item: ProfileItem) => {
    // For Supabase storage URLs, use fetch to download
    const downloadUrl = item.content;
    
    // Use fetch to get the file and trigger download
    fetch(downloadUrl)
      .then(response => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = item.title || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("Download started!");
      })
      .catch(() => {
        // Fallback: open in new tab
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
        toast.info("Opening file in new tab...");
      });
  };

  const handleOpenInNewTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category_name]) {
      acc[item.category_name] = [];
    }
    acc[item.category_name].push(item);
    return acc;
  }, {} as Record<string, ProfileItem[]>);

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
        </div>

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
                  const Icon = typeIcons[item.type] || LinkIcon;
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
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{item.title}</p>
                            {item.type === "url" && (
                              <p className="text-sm text-muted-foreground truncate">{item.content}</p>
                            )}
                            {item.type === "text" && (
                              <p className="text-sm text-muted-foreground">Click to view</p>
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

      {/* Media/Text Preview Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
            {selectedItem?.type === "text" && (
              <DialogDescription>Text content</DialogDescription>
            )}
          </DialogHeader>

          {selectedItem?.type === "text" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border whitespace-pre-wrap">
                {selectedItem.content}
              </div>
              <Button 
                onClick={() => handleCopyText(selectedItem.content)}
                variant="outline"
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Text
              </Button>
            </div>
          )}

          {selectedItem?.type === "image" && (
            <div className="space-y-4">
              <img
                src={selectedItem.content}
                alt={selectedItem.title}
                className="w-full rounded-lg"
              />
              <div className="flex gap-2">
                <Button onClick={() => handleDownload(selectedItem)} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleOpenInNewTab(selectedItem.content)}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </Button>
              </div>
            </div>
          )}

          {selectedItem?.type === "video" && (
            <div className="space-y-4">
              <video
                src={selectedItem.content}
                controls
                className="w-full rounded-lg"
                playsInline
              />
              <div className="flex gap-2">
                <Button onClick={() => handleDownload(selectedItem)} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleOpenInNewTab(selectedItem.content)}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </Button>
              </div>
            </div>
          )}

          {selectedItem?.type === "audio" && (
            <div className="space-y-4">
              <audio
                src={selectedItem.content}
                controls
                className="w-full"
              />
              <div className="flex gap-2">
                <Button onClick={() => handleDownload(selectedItem)} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleOpenInNewTab(selectedItem.content)}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicProfile;
