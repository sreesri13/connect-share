import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  QrCode,
  Download,
  Edit2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";

interface UPIPayment {
  id: string;
  upi_id: string;
  display_name: string;
  public_code: string;
  created_at: string;
  updated_at: string;
}

interface QRPaymentsSectionProps {
  userId: string;
}

// UPI ID validation regex
const UPI_ID_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;

export const QRPaymentsSection = ({ userId }: QRPaymentsSectionProps) => {
  const [upiPayment, setUpiPayment] = useState<UPIPayment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upiId, setUpiId] = useState("");
  const [displayName, setDisplayName] = useState("QR Payments");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUpiId, setEditUpiId] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    fetchUPIPayment();
  }, [userId]);

  const fetchUPIPayment = async () => {
    try {
      const { data, error } = await supabase
        .from("upi_payments")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setUpiPayment(data);
    } catch (error) {
      console.error("Error fetching UPI payment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateUpiId = (id: string): boolean => {
    if (!id.trim()) {
      setValidationError("UPI ID is required");
      return false;
    }
    if (!UPI_ID_REGEX.test(id.trim())) {
      setValidationError("Invalid UPI ID format (e.g., example@upi)");
      return false;
    }
    setValidationError("");
    return true;
  };

  const generatePublicCode = (): string => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGenerateQR = async () => {
    if (!validateUpiId(upiId)) return;

    setIsGenerating(true);
    try {
      const publicCode = generatePublicCode();

      const { data, error } = await supabase
        .from("upi_payments")
        .insert({
          user_id: userId,
          upi_id: upiId.trim(),
          display_name: displayName.trim() || "QR Payments",
          public_code: publicCode,
        })
        .select()
        .single();

      if (error) throw error;

      setUpiPayment(data);
      setUpiId("");
      setDisplayName("QR Payments");
      toast.success("QR Code generated successfully!");
    } catch (error: any) {
      console.error("Error generating QR:", error);
      toast.error("Failed to generate QR code");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartEdit = () => {
    if (upiPayment) {
      setEditUpiId(upiPayment.upi_id);
      setEditDisplayName(upiPayment.display_name);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditUpiId("");
    setEditDisplayName("");
    setValidationError("");
  };

  const handleSaveEdit = async () => {
    if (!upiPayment) return;
    if (!validateUpiId(editUpiId)) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("upi_payments")
        .update({
          upi_id: editUpiId.trim(),
          display_name: editDisplayName.trim() || "QR Payments",
        })
        .eq("id", upiPayment.id);

      if (error) throw error;

      setUpiPayment({
        ...upiPayment,
        upi_id: editUpiId.trim(),
        display_name: editDisplayName.trim() || "QR Payments",
      });
      setIsEditing(false);
      toast.success("UPI ID updated! Payments will now go to the new ID.");
    } catch (error) {
      console.error("Error updating UPI:", error);
      toast.error("Failed to update UPI ID");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("upi-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 400, 400);
      }

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "upi-qr-code.png";
      link.href = pngUrl;
      link.click();
      toast.success("QR Code downloaded!");
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopyLink = () => {
    if (!upiPayment) return;
    const url = getRedirectUrl(upiPayment.public_code);
    navigator.clipboard.writeText(url);
    toast.success("Payment link copied!");
  };

  const getRedirectUrl = (publicCode: string): string => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1/resolve-upi?code=${publicCode}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">QR Payments</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Create a dynamic UPI QR code for receiving payments
        </p>
      </div>

      {!upiPayment ? (
        /* Generate QR Card */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <CreditCard className="w-5 h-5 text-primary" />
                Generate Payment QR
              </CardTitle>
              <CardDescription>
                Enter your UPI ID to create a dynamic QR code. You can update the UPI ID later without changing the QR.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upiId">UPI ID *</Label>
                <Input
                  id="upiId"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => {
                    setUpiId(e.target.value);
                    if (validationError) validateUpiId(e.target.value);
                  }}
                  className="min-h-[44px]"
                />
                {validationError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (Optional)</Label>
                <Input
                  id="displayName"
                  placeholder="Your Name or Business"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>

              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs sm:text-sm text-primary flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Ensure this UPI ID is active and can receive payments. We do not process or store payment data.
                </p>
              </div>

              <Button
                onClick={handleGenerateQR}
                disabled={isGenerating || !upiId.trim()}
                className="w-full min-h-[44px]"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        /* QR Display Card */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 sm:space-y-6"
        >
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <QrCode className="w-5 h-5 text-primary" />
                Your Payment QR Code
              </CardTitle>
              <CardDescription>
                Share this QR code to receive payments. Update your UPI ID anytime without changing the QR.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center p-4 sm:p-6 bg-white rounded-xl">
                <QRCodeSVG
                  id="upi-qr-code"
                  value={getRedirectUrl(upiPayment.public_code)}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Current UPI Info */}
              {isEditing ? (
                <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="space-y-2">
                    <Label>UPI ID</Label>
                    <Input
                      value={editUpiId}
                      onChange={(e) => {
                        setEditUpiId(e.target.value);
                        if (validationError) validateUpiId(e.target.value);
                      }}
                      className="min-h-[44px]"
                    />
                    {validationError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="min-h-[44px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="flex-1 min-h-[44px]"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="min-h-[44px]"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Current UPI ID</p>
                      <p className="font-medium text-foreground truncate">{upiPayment.upi_id}</p>
                      <p className="text-xs text-muted-foreground mt-1">{upiPayment.display_name}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStartEdit}
                      className="min-h-[40px] flex-shrink-0"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleDownloadQR}
                  className="min-h-[44px]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="min-h-[44px]"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              </div>

              {/* Payment Link */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Payment Link</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono text-foreground truncate flex-1">
                    {getRedirectUrl(upiPayment.public_code)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => window.open(getRedirectUrl(upiPayment.public_code), "_blank")}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Info Note */}
              <p className="text-xs text-muted-foreground text-center">
                Last updated: {new Date(upiPayment.updated_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};