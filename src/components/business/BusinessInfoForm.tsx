import { useState, useRef } from "react";
import { Building2, MapPin, Phone, Mail, Globe, Instagram, Facebook, Twitter, MessageCircle, Upload, X, Crop, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

export interface BusinessInfo {
  business_name: string;
  business_logo_url: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  business_website: string;
  business_instagram: string;
  business_facebook: string;
  business_twitter: string;
  business_whatsapp: string;
  business_hours: string;
}

interface BusinessInfoFormProps {
  value: BusinessInfo;
  onChange: (info: BusinessInfo) => void;
  userId: string;
}

export const BusinessInfoForm = ({ value, onChange, userId }: BusinessInfoFormProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [cropZoom, setCropZoom] = useState([1]);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleUpdate = (field: keyof BusinessInfo, val: string) => {
    onChange({ ...value, [field]: val });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a PNG, JPG or JPEG image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setRawFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawImage(ev.target?.result as string);
      setCropDialogOpen(true);
      setCropZoom([1]);
      setCropOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropAndUpload = async () => {
    if (!rawImage || !rawFile) return;

    const img = imgRef.current;
    if (!img) return;

    setIsUploading(true);
    try {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const size = 400;
      canvas.width = size;
      canvas.height = size;

      const zoom = cropZoom[0];
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const minDim = Math.min(imgW, imgH);
      const cropSize = minDim / zoom;
      const cx = (imgW - cropSize) / 2 + cropOffset.x * (imgW - cropSize) / 2;
      const cy = (imgH - cropSize) / 2 + cropOffset.y * (imgH - cropSize) / 2;

      ctx.drawImage(img, Math.max(0, cx), Math.max(0, cy), cropSize, cropSize, 0, 0, size, size);

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png", 0.9)
      );

      const ext = "png";
      const fileName = `${userId}/business-logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, blob, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(fileName);

      handleUpdate("business_logo_url", publicUrl);
      setCropDialogOpen(false);
      setRawImage(null);
      setRawFile(null);
      toast.success("Logo uploaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        <Label className="font-semibold">Business Information (Optional)</Label>
      </div>

      {/* Logo */}
      <div className="space-y-2">
        <Label className="text-sm">Business Logo (Square, PNG/JPG)</Label>
        {value.business_logo_url ? (
          <div className="flex items-center gap-3">
            <img
              src={value.business_logo_url}
              alt="Business Logo"
              className="w-16 h-16 rounded-lg object-cover border"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUpdate("business_logo_url", "")}
              className="text-destructive"
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg hover:border-primary/50 cursor-pointer">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload logo (PNG, JPG)</span>
            </div>
          </div>
        )}
      </div>

      {/* Name */}
      <div className="space-y-1">
        <Label className="text-sm">Business Name</Label>
        <Input
          value={value.business_name}
          onChange={(e) => handleUpdate("business_name", e.target.value)}
          placeholder="Your Business Name"
        />
      </div>

      {/* Address */}
      <div className="space-y-1">
        <Label className="text-sm flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</Label>
        <Textarea
          value={value.business_address}
          onChange={(e) => handleUpdate("business_address", e.target.value)}
          placeholder="Business address"
          rows={2}
        />
      </div>

      {/* Business Hours */}
      <div className="space-y-1">
        <Label className="text-sm flex items-center gap-1"><Clock className="w-3 h-3" /> Business Hours</Label>
        <Textarea
          value={value.business_hours}
          onChange={(e) => handleUpdate("business_hours", e.target.value)}
          placeholder="e.g. Mon-Fri: 9AM - 6PM&#10;Sat: 10AM - 4PM&#10;Sun: Closed"
          rows={3}
        />
      </div>

      {/* Contacts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
          <Input value={value.business_phone} onChange={(e) => handleUpdate("business_phone", e.target.value)} placeholder="+91 XXXXX XXXXX" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
          <Input value={value.business_email} onChange={(e) => handleUpdate("business_email", e.target.value)} placeholder="email@business.com" />
        </div>
      </div>

      {/* Social Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm flex items-center gap-1"><Globe className="w-3 h-3" /> Website</Label>
          <Input value={value.business_website} onChange={(e) => handleUpdate("business_website", e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1">
          <Label className="text-sm flex items-center gap-1"><Instagram className="w-3 h-3" /> Instagram</Label>
          <Input value={value.business_instagram} onChange={(e) => handleUpdate("business_instagram", e.target.value)} placeholder="@username" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm flex items-center gap-1"><Facebook className="w-3 h-3" /> Facebook</Label>
          <Input value={value.business_facebook} onChange={(e) => handleUpdate("business_facebook", e.target.value)} placeholder="facebook.com/page" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm flex items-center gap-1"><Twitter className="w-3 h-3" /> Twitter / X</Label>
          <Input value={value.business_twitter} onChange={(e) => handleUpdate("business_twitter", e.target.value)} placeholder="@handle" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm flex items-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp</Label>
          <Input value={value.business_whatsapp} onChange={(e) => handleUpdate("business_whatsapp", e.target.value)} placeholder="+91 XXXXX XXXXX" />
        </div>
      </div>

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Crop className="w-5 h-5" /> Crop Logo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden border">
              {rawImage && (
                <img
                  ref={imgRef}
                  src={rawImage}
                  alt="Crop preview"
                  className="w-full h-full object-cover"
                  style={{ transform: `scale(${cropZoom[0]})` }}
                  crossOrigin="anonymous"
                />
              )}
              <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Zoom</Label>
              <Slider
                value={cropZoom}
                onValueChange={setCropZoom}
                min={1}
                max={3}
                step={0.1}
              />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <Button
              onClick={handleCropAndUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? "Uploading..." : "Crop & Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const defaultBusinessInfo: BusinessInfo = {
  business_name: "",
  business_logo_url: "",
  business_address: "",
  business_phone: "",
  business_email: "",
  business_website: "",
  business_instagram: "",
  business_facebook: "",
  business_twitter: "",
  business_whatsapp: "",
  business_hours: "",
};
