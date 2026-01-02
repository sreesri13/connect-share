import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Plus,
  Trash2,
  IndianRupee,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UPIPayment {
  id: string;
  upi_id: string;
  display_name: string;
  public_code: string;
  amount: number | null;
  created_at: string;
  updated_at: string;
}

interface QRPaymentsSectionProps {
  userId: string;
}

const UPI_ID_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;

export const QRPaymentsSection = ({ userId }: QRPaymentsSectionProps) => {
  const [upiPayments, setUpiPayments] = useState<UPIPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [displayName, setDisplayName] = useState("QR Payments");
  const [hasFixedAmount, setHasFixedAmount] = useState(false);
  const [amount, setAmount] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUpiId, setEditUpiId] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editHasFixedAmount, setEditHasFixedAmount] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchUPIPayments();
  }, [userId]);

  const fetchUPIPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("upi_payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUpiPayments(data || []);
    } catch (error) {
      console.error("Error fetching UPI payments:", error);
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
      const amountValue = hasFixedAmount && amount ? parseFloat(amount) : null;

      const { data, error } = await supabase
        .from("upi_payments")
        .insert({
          user_id: userId,
          upi_id: upiId.trim(),
          display_name: displayName.trim() || "QR Payments",
          public_code: publicCode,
          amount: amountValue,
        })
        .select()
        .single();

      if (error) throw error;

      setUpiPayments([data, ...upiPayments]);
      setUpiId("");
      setDisplayName("QR Payments");
      setHasFixedAmount(false);
      setAmount("");
      setShowCreateForm(false);
      toast.success("QR Code generated successfully!");
    } catch (error: any) {
      console.error("Error generating QR:", error);
      toast.error("Failed to generate QR code");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartEdit = (payment: UPIPayment) => {
    setEditingId(payment.id);
    setEditUpiId(payment.upi_id);
    setEditDisplayName(payment.display_name);
    setEditHasFixedAmount(payment.amount !== null);
    setEditAmount(payment.amount?.toString() || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditUpiId("");
    setEditDisplayName("");
    setEditHasFixedAmount(false);
    setEditAmount("");
    setValidationError("");
  };

  const handleSaveEdit = async (paymentId: string) => {
    if (!validateUpiId(editUpiId)) return;

    setIsSaving(true);
    try {
      const amountValue = editHasFixedAmount && editAmount ? parseFloat(editAmount) : null;

      const { error } = await supabase
        .from("upi_payments")
        .update({
          upi_id: editUpiId.trim(),
          display_name: editDisplayName.trim() || "QR Payments",
          amount: amountValue,
        })
        .eq("id", paymentId);

      if (error) throw error;

      setUpiPayments(
        upiPayments.map((p) =>
          p.id === paymentId
            ? {
                ...p,
                upi_id: editUpiId.trim(),
                display_name: editDisplayName.trim() || "QR Payments",
                amount: amountValue,
              }
            : p
        )
      );
      setEditingId(null);
      toast.success("UPI ID updated! Payments will now go to the new ID.");
    } catch (error) {
      console.error("Error updating UPI:", error);
      toast.error("Failed to update UPI ID");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from("upi_payments").delete().eq("id", deleteId);

      if (error) throw error;

      setUpiPayments(upiPayments.filter((p) => p.id !== deleteId));
      toast.success("Payment QR deleted successfully");
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment QR");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleDownloadQR = (paymentId: string) => {
    const svg = document.getElementById(`upi-qr-code-${paymentId}`);
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

  const handleCopyLink = (publicCode: string) => {
    const url = getRedirectUrl(publicCode);
    navigator.clipboard.writeText(url);
    toast.success("Payment link copied!");
  };

  const getRedirectUrl = (publicCode: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/pay?code=${publicCode}`;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">QR Payments</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Create dynamic UPI QR codes for receiving payments
          </p>
        </div>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)} className="min-h-[44px]">
            <Plus className="w-4 h-4 mr-2" />
            New QR Code
          </Button>
        )}
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Generate Payment QR
                </CardTitle>
                <CardDescription>
                  Enter your UPI ID to create a dynamic QR code. You can update the UPI ID later
                  without changing the QR.
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

                {/* Fixed Amount Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Fixed Amount</Label>
                      <p className="text-xs text-muted-foreground">
                        Pre-fill a fixed amount in payment apps
                      </p>
                    </div>
                    <Switch checked={hasFixedAmount} onCheckedChange={setHasFixedAmount} />
                  </div>

                  {hasFixedAmount && (
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="min-h-[44px] pl-9"
                        min="1"
                        step="0.01"
                      />
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs sm:text-sm text-primary flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Ensure this UPI ID is active and can receive payments.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateQR}
                    disabled={isGenerating || !upiId.trim()}
                    className="flex-1 min-h-[44px]"
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
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setUpiId("");
                      setDisplayName("QR Payments");
                      setHasFixedAmount(false);
                      setAmount("");
                      setValidationError("");
                    }}
                    className="min-h-[44px]"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Codes List */}
      {upiPayments.length === 0 && !showCreateForm ? (
        <Card className="max-w-lg">
          <CardContent className="py-12 text-center">
            <QrCode className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Payment QR Codes</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first dynamic UPI QR code to start receiving payments
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create QR Code
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {upiPayments.map((payment) => (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">
                {/* QR Code */}
                  <div className="flex justify-center p-4 bg-white rounded-xl">
                    <div className="w-full max-w-[160px] sm:max-w-[180px]">
                      <QRCodeSVG
                        id={`upi-qr-code-${payment.id}`}
                        value={getRedirectUrl(payment.public_code)}
                        size={180}
                        level="H"
                        includeMargin={true}
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                    </div>
                  </div>

                  {/* Info or Edit Form */}
                  {editingId === payment.id ? (
                    <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="space-y-2">
                        <Label className="text-xs">UPI ID</Label>
                        <Input
                          value={editUpiId}
                          onChange={(e) => {
                            setEditUpiId(e.target.value);
                            if (validationError) validateUpiId(e.target.value);
                          }}
                          className="min-h-[40px]"
                        />
                        {validationError && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationError}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Display Name</Label>
                        <Input
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                          className="min-h-[40px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Fixed Amount</Label>
                          <Switch
                            checked={editHasFixedAmount}
                            onCheckedChange={setEditHasFixedAmount}
                          />
                        </div>
                        {editHasFixedAmount && (
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="min-h-[40px] pl-9"
                              min="1"
                              step="0.01"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(payment.id)}
                          disabled={isSaving}
                          className="flex-1 min-h-[36px]"
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="min-h-[36px]"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">
                            {payment.display_name}
                          </p>
                          <p className="text-sm text-muted-foreground font-mono truncate">
                            {payment.upi_id}
                          </p>
                          {payment.amount && (
                            <p className="text-sm text-primary font-medium mt-1 flex items-center gap-1">
                              <IndianRupee className="w-3 h-3" />
                              {payment.amount.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(payment)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(payment.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadQR(payment.id)}
                      className="min-h-[36px]"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(payment.public_code)}
                      className="min-h-[36px]"
                      title="Copy Link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = getRedirectUrl(payment.public_code);
                        const shareText = `📱 Scan to pay: ${payment.display_name}\n\n💰 ${payment.amount ? `Amount: ₹${payment.amount}` : 'Enter amount when paying'}\n\n🔗 ${url}`;
                        if (navigator.share) {
                          navigator.share({
                            title: `Pay ${payment.display_name}`,
                            text: shareText,
                            url: url,
                          }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(shareText);
                          window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                        }
                      }}
                      className="min-h-[36px]"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getRedirectUrl(payment.public_code), "_blank")}
                      className="min-h-[36px]"
                      title="Preview"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment QR?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this QR code. Anyone with the old QR or link will no
              longer be able to make payments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};