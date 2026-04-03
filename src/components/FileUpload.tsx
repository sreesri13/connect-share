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
    maxSize: 100 * 1024 * 1024,
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
    setUploadProgress(0);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Use XMLHttpRequest for progress tracking
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to upload files");
        setIsUploading(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/uploads/${fileName}`;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed")));

        xhr.open("POST", uploadUrl);
        xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.send(file);
      });

      const { data: { publicUrl } } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);

      setUploadedFile({ name: file.name, url: publicUrl });
      onUploadComplete(publicUrl);
      toast.success("File uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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
