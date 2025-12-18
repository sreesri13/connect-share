import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { QrCode, Link as LinkIcon, FileText, ExternalLink, User, File, Image, Video, Music, Loader2, Download, Play, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

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

const typeIcons: Record<string, React.ComponentType<any>> = {
  url: LinkIcon,
  text: FileText,
  pdf: File,
  image: Image,
  video: Video,
  audio: Music,
};

const PublicProfile = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [items, setItems] = useState<ProfileItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ProfileItem | null>(null);

  // Password protection states
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (profileId) {
      checkPasswordProtection();
    }
  }, [profileId]);

  const checkPasswordProtection = async () => {
    try {
      const { data: qrPage, error: qrError } = await supabase
        .from("qr_pages")
        .select("password_hash")
        .eq("public_id", profileId)
        .maybeSingle();

      if (qrError) throw qrError;

      if (!qrPage) {
        setError("Profile not found");
        setIsLoading(false);
        return;
      }

      if (qrPage.password_hash) {
        setIsPasswordProtected(true);
        setIsLoading(false);
      } else {
        setIsPasswordVerified(true);
        fetchPublicProfile();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load profile");
      setIsLoading(false);
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
      const { data, error } = await supabase.rpc("verify_qr_password", {
        qr_public_id: profileId,
        password: password.trim(),
      });

      if (error) throw error;

      if (data) {
        setIsPasswordVerified(true);
        setIsLoading(true);
        fetchPublicProfile();
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

  const fetchPublicProfile = async () => {
    try {
      // Fetch QR page
      const { data: qrPage, error: qrError } = await supabase
        .from("qr_pages")
        .select(`
          id,
          user_id,
          title
        `)
        .eq("public_id", profileId)
        .maybeSingle();

      if (qrError) throw qrError;

      if (!qrPage) {
        setError("Profile not found");
        setIsLoading(false);
        return;
      }

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
    if (item.type === "url") {
      // Ensure URL has protocol
      let url = item.content;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (item.type === "text") {
      navigator.clipboard.writeText(item.content);
      // Show a toast or feedback
    } else if (item.type === "pdf") {
      // Open PDF in new tab
      window.open(item.content, "_blank", "noopener,noreferrer");
    } else if (["image", "video", "audio"].includes(item.type)) {
      // Open modal for media preview
      setSelectedItem(item);
    }
  };

  const handleDownload = (item: ProfileItem) => {
    // For Supabase storage URLs, add download parameter
    let downloadUrl = item.content;
    if (downloadUrl.includes('supabase.co/storage')) {
      // Append download parameter if not already present
      downloadUrl = downloadUrl.includes('?') 
        ? `${downloadUrl}&download=true` 
        : `${downloadUrl}?download=true`;
    }
    
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = item.title;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category_name]) {
      acc[item.category_name] = [];
    }
    acc[item.category_name].push(item);
    return acc;
  }, {} as Record<string, ProfileItem[]>);

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
                              <p className="text-sm text-muted-foreground">Click to copy</p>
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

      {/* Media Preview Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedItem?.title}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedItem && handleDownload(selectedItem)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {selectedItem?.type === "image" && (
              <img
                src={selectedItem.content}
                alt={selectedItem.title}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            )}
            
            {selectedItem?.type === "video" && (
              <video
                src={selectedItem.content}
                controls
                autoPlay
                className="w-full h-auto max-h-[70vh] rounded-lg"
              >
                Your browser does not support the video tag.
              </video>
            )}
            
            {selectedItem?.type === "audio" && (
              <div className="p-8 bg-muted rounded-lg flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Music className="w-12 h-12 text-primary" />
                </div>
                <p className="font-medium text-lg">{selectedItem.title}</p>
                <audio
                  src={selectedItem.content}
                  controls
                  autoPlay
                  className="w-full max-w-md"
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicProfile;
