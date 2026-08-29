import { useState, useCallback } from "react";
import { Upload, X, FileText, Image, Video, Music, Loader2, HardDrive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  type: "pdf" | "image" | "video" | "audio" | "others" | "largefile";
  userId: string;
  onUploadComplete: (url: string) => void;
  value?: string;
}

const typeConfig = {
  pdf: {
    accept: ".pdf",
    icon: FileText,
    label: "PDF Document",
    maxSize: 10 * 1024 * 1024,
  },
  image: {
    accept: "image/*",
    icon: Image,
    label: "Image",
    maxSize: 5 * 1024 * 1024,
  },
  video: {
    accept: "video/*",
    icon: Video,
    label: "Video",
    maxSize: 50 * 1024 * 1024,
  },
  audio: {
    accept: "audio/*",
    icon: Music,
    label: "Audio",
    maxSize: 20 * 1024 * 1024,
  },
  others: {
    accept: "*/*",
    icon: FileText,
    label: "File",
    maxSize: 50 * 1024 * 1024,
  },
  largefile: {
    accept: "*/*",
    icon: HardDrive,
    label: "Large File",
    maxSize: 1024 * 1024 * 1024,
  },
};

export const FileUpload = ({ type, userId, onUploadComplete, value }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(
    value ? { name: "Uploaded file", url: value } : null
  );

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFile = async (file: File) => {
    if (file.size > config.maxSize) {
      toast.error(`File too large. Maximum size is ${config.maxSize / (1024 * 1024)}MB`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = userId || session?.user?.id;
      if (!currentUserId) {
        toast.error("Please sign in to upload files");
        setIsUploading(false);
        return;
      }

      // Clean and sanitize filename
      const rawExt = file.name.split(".").pop() || "bin";
      const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanBaseName = file.name
        .substring(0, file.name.lastIndexOf(".") > 0 ? file.name.lastIndexOf(".") : file.name.length)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .substring(0, 30);
      const fileName = `${currentUserId}/${Date.now()}-${cleanBaseName}.${cleanExt}`;

      setUploadProgress(40);

      // Upload directly via Supabase Storage SDK
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.warn("SDK upload failed, attempting direct storage endpoint:", uploadError);
        // Fallback to direct REST endpoint with apikey and auth header
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "";
        const uploadUrl = `${supabaseUrl}/storage/v1/object/uploads/${fileName}`;

        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "apikey": anonKey,
            "Authorization": `Bearer ${session?.access_token || anonKey}`,
            "x-upsert": "true",
          },
          body: file,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(uploadError.message || errText || "Upload failed");
        }
      }

      setUploadProgress(90);

      const { data: { publicUrl } } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);

      setUploadedFile({ name: file.name, url: publicUrl });
      onUploadComplete(publicUrl);
      setUploadProgress(100);
      toast.success("File uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Failed to upload file: ${error?.message || 'Please check your connection and try again'}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        uploadFile(file);
      }
    },
    [userId, type]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
    onUploadComplete("");
  };

  if (uploadedFile) {
    const displayName = uploadedFile.name !== "Uploaded file" 
      ? uploadedFile.name 
      : uploadedFile.url.split('/').pop()?.split('?')[0] || "Uploaded file";
    
    return (
      <div className="relative p-4 rounded-xl border border-border bg-muted/50 flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate max-w-full">{config.label} uploaded</p>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative p-8 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <input
        type="file"
        accept={config.accept}
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading}
      />
      
      <div className="flex flex-col items-center justify-center text-center">
        {isUploading ? (
          <div className="w-full space-y-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <p className="text-sm font-medium">Uploading... {uploadProgress}%</p>
            <Progress value={uploadProgress} className="w-full h-2" />
            <p className="text-xs text-muted-foreground">
              {uploadProgress < 100 ? "Please wait..." : "Finalizing..."}
            </p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">
              Drop your {config.label} here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum file size: {config.maxSize / (1024 * 1024)}MB
            </p>
          </>
        )}
      </div>
    </div>
  );
};
