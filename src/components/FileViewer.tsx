import { useState } from "react";
import { 
  Download, 
  ExternalLink, 
  Copy, 
  Check,
  FileText,
  File,
  Image as ImageIcon,
  Video,
  Music,
  X,
  Loader2,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    title: string;
    content: string; // URL to the file
    type: "url" | "text" | "pdf" | "image" | "video" | "audio" | "others" | "wifi" | "largefile";
  } | null;
}

// Helper to get file extension from URL or filename
const getFileExtension = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase() || '';
    return ext;
  } catch {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    return ext.split('?')[0]; // Remove query params
  }
};

// Check if file is an Office document
const isOfficeDocument = (ext: string): boolean => {
  const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
  return officeExtensions.includes(ext);
};

// Check if file is a PDF
const isPdfDocument = (ext: string): boolean => {
  return ext === 'pdf';
};

// Check if file is an image
const isImageFile = (ext: string): boolean => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  return imageExtensions.includes(ext);
};

// Check if file is a video
const isVideoFile = (ext: string): boolean => {
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v'];
  return videoExtensions.includes(ext);
};

// Check if file is audio
const isAudioFile = (ext: string): boolean => {
  const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma'];
  return audioExtensions.includes(ext);
};

// Check if file is a text file
const isTextFile = (ext: string): boolean => {
  const textExtensions = ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts', 'log'];
  return textExtensions.includes(ext);
};

// Get Microsoft Office Online Viewer URL
const getOfficeViewerUrl = (fileUrl: string): string => {
  const encodedUrl = encodeURIComponent(fileUrl);
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
};

// Get Google Docs Viewer URL (fallback for PDFs and other documents)
const getGoogleDocsViewerUrl = (fileUrl: string): string => {
  const encodedUrl = encodeURIComponent(fileUrl);
  return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
};

// Get appropriate icon for file type
const getFileIcon = (type: string, ext: string) => {
  if (type === 'image' || isImageFile(ext)) return <ImageIcon className="w-6 h-6" />;
  if (type === 'video' || isVideoFile(ext)) return <Video className="w-6 h-6" />;
  if (type === 'audio' || isAudioFile(ext)) return <Music className="w-6 h-6" />;
  if (type === 'pdf' || isPdfDocument(ext)) return <FileText className="w-6 h-6" />;
  if (isOfficeDocument(ext)) return <FileText className="w-6 h-6" />;
  if (isTextFile(ext)) return <FileText className="w-6 h-6" />;
  return <File className="w-6 h-6" />;
};

// Get file type label
const getFileTypeLabel = (type: string, ext: string): string => {
  if (type === 'image' || isImageFile(ext)) return 'Image';
  if (type === 'video' || isVideoFile(ext)) return 'Video';
  if (type === 'audio' || isAudioFile(ext)) return 'Audio';
  if (type === 'pdf' || isPdfDocument(ext)) return 'PDF Document';
  if (ext === 'doc' || ext === 'docx') return 'Word Document';
  if (ext === 'xls' || ext === 'xlsx') return 'Excel Spreadsheet';
  if (ext === 'ppt' || ext === 'pptx') return 'PowerPoint Presentation';
  if (ext === 'txt') return 'Text File';
  if (isTextFile(ext)) return 'Text File';
  return 'File';
};

export function FileViewer({ isOpen, onClose, file }: FileViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!file) return null;

  const ext = getFileExtension(file.content);
  const fileTypeLabel = getFileTypeLabel(file.type, ext);

  const handleDownload = async () => {
    try {
      const response = await fetch(file.content);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.title || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Download started!");
    } catch {
      window.open(file.content, "_blank", "noopener,noreferrer");
      toast.info("Opening file in new tab...");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleOpenInNewTab = () => {
    window.open(file.content, "_blank", "noopener,noreferrer");
  };

  const renderViewer = () => {
    // Text content
    if (file.type === 'text') {
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border whitespace-pre-wrap max-h-[60vh] overflow-auto font-mono text-sm">
            {file.content}
          </div>
          <Button onClick={handleCopy} variant="outline" className="w-full">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied!" : "Copy Text"}
          </Button>
        </div>
      );
    }

    // Image files
    if (file.type === 'image' || isImageFile(ext)) {
      return (
        <div className="space-y-4">
          <div className="relative bg-muted/30 rounded-lg overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            <img
              src={file.content}
              alt={file.title}
              className="w-full max-h-[60vh] object-contain rounded-lg"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleOpenInNewTab} className="flex-1">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open
            </Button>
          </div>
        </div>
      );
    }

    // Video files
    if (file.type === 'video' || isVideoFile(ext)) {
      return (
        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            <video
              src={file.content}
              controls
              className="w-full max-h-[60vh] rounded-lg"
              playsInline
              onLoadedData={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleOpenInNewTab} className="flex-1">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open
            </Button>
          </div>
        </div>
      );
    }

    // Audio files
    if (file.type === 'audio' || isAudioFile(ext)) {
      return (
        <div className="space-y-4">
          <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-border">
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Music className="w-10 h-10 text-primary" />
              </div>
            </div>
            <audio
              src={file.content}
              controls
              className="w-full"
              onLoadedData={() => setIsLoading(false)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleOpenInNewTab} className="flex-1">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open
            </Button>
          </div>
        </div>
      );
    }

    // PDF files - Use embedded viewer
    if (file.type === 'pdf' || isPdfDocument(ext)) {
      return (
        <div className="space-y-4">
          <div className="relative bg-muted/30 rounded-lg overflow-hidden border border-border" style={{ height: isFullscreen ? 'calc(100vh - 200px)' : '60vh' }}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <div className="text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading PDF...</p>
                </div>
              </div>
            )}
            <iframe
              src={`${file.content}#toolbar=1&navpanes=0`}
              className="w-full h-full"
              title={file.title}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                // Fallback to Google Docs viewer
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleOpenInNewTab} className="flex-1">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Office documents (Word, Excel, PowerPoint) - Use Microsoft Office Online Viewer
    if (isOfficeDocument(ext)) {
      const viewerUrl = getOfficeViewerUrl(file.content);
      
      return (
        <div className="space-y-4">
          <div className="relative bg-muted/30 rounded-lg overflow-hidden border border-border" style={{ height: isFullscreen ? 'calc(100vh - 200px)' : '60vh' }}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <div className="text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading {fileTypeLabel}...</p>
                </div>
              </div>
            )}
            <iframe
              src={viewerUrl}
              className="w-full h-full"
              title={file.title}
              onLoad={() => setIsLoading(false)}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={() => window.open(viewerUrl, "_blank")} className="flex-1">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Viewer
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Text files - Try to fetch and display content
    if (isTextFile(ext)) {
      return (
        <div className="space-y-4">
          <div className="relative bg-muted/30 rounded-lg overflow-hidden border border-border" style={{ height: '50vh' }}>
            <iframe
              src={file.content}
              className="w-full h-full bg-background"
              title={file.title}
              onLoad={() => setIsLoading(false)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleOpenInNewTab} className="flex-1">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open
            </Button>
          </div>
        </div>
      );
    }

    // Fallback for other file types - Use Google Docs Viewer or download
    return (
      <div className="space-y-4">
        <div className="p-8 rounded-lg bg-muted/30 border border-border text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            {getFileIcon(file.type, ext)}
          </div>
          <h3 className="font-medium text-lg mb-2">{file.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {fileTypeLabel} • Click below to view or download
          </p>
          
          {/* Try Google Docs Viewer for supported formats */}
          <div className="relative bg-muted/30 rounded-lg overflow-hidden border border-border mb-4" style={{ height: '40vh' }}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            <iframe
              src={getGoogleDocsViewerUrl(file.content)}
              className="w-full h-full"
              title={file.title}
              onLoad={() => setIsLoading(false)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownload} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" onClick={handleOpenInNewTab} className="flex-1">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(
        "max-h-[95vh] overflow-auto",
        isFullscreen ? "max-w-[95vw] w-full" : "max-w-3xl"
      )}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              {getFileIcon(file.type, ext)}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">{file.title}</DialogTitle>
              <DialogDescription className="truncate">{fileTypeLabel}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        {renderViewer()}
      </DialogContent>
    </Dialog>
  );
}

export { getFileExtension, isOfficeDocument, isPdfDocument, isImageFile, isVideoFile, isAudioFile, isTextFile, getFileTypeLabel, getFileIcon };
