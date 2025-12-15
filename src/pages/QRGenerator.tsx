import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Download, Copy, ArrowLeft, Check, ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Mock selected items for demo
const selectedItems = [
  { id: "1", categoryName: "Social Links", title: "Twitter", type: "url", content: "https://twitter.com/johndoe" },
  { id: "2", categoryName: "Social Links", title: "LinkedIn", type: "url", content: "https://linkedin.com/in/johndoe" },
  { id: "3", categoryName: "Portfolio", title: "Website", type: "url", content: "https://johndoe.com" },
];

const QRGenerator = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  
  // Generate a unique public URL for this QR
  const publicUrl = `${window.location.origin}/p/demo123`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const svg = document.querySelector("#qr-code-svg");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new window.Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = "connecthub-qr.png";
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success("QR code downloaded!");
      };
      
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
  };

  // Group items by category
  const groupedItems = selectedItems.reduce((acc, item) => {
    if (!acc[item.categoryName]) {
      acc[item.categoryName] = [];
    }
    acc[item.categoryName].push(item);
    return acc;
  }, {} as Record<string, typeof selectedItems>);

  return (
    <div className="min-h-screen bg-gradient-hero p-6 md:p-12">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your QR Code</h1>
            <p className="text-muted-foreground">Share your selected content with a single scan</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* QR Code Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden">
              <CardHeader className="text-center">
                <CardTitle>Scan to View</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6 pb-8">
                <div className="p-6 bg-foreground rounded-2xl shadow-elevated">
                  <QRCodeSVG
                    id="qr-code-svg"
                    value={publicUrl}
                    size={200}
                    level="H"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>

                <div className="w-full space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                    <input
                      type="text"
                      value={publicUrl}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-foreground outline-none"
                    />
                    <Button variant="ghost" size="sm" onClick={handleCopyUrl}>
                      {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={handleDownloadQR}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="default" className="flex-1" asChild>
                      <Link to="/p/demo123" target="_blank">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Preview
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Selected Items Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-primary" />
                  Shared Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(groupedItems).map(([categoryName, items]) => (
                  <div key={categoryName} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">{categoryName}</h4>
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <QrCode className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                          </div>
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-secondary text-muted-foreground uppercase">
                            {item.type}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    Anyone with this QR code can view {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;
