import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ScanLimitReachedProps {
  type: 'total' | 'daily';
}

export const ScanLimitReached = ({ type }: ScanLimitReachedProps) => {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-destructive/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm relative z-10"
      >
        <Card className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {type === 'daily' ? 'Daily Scan Limit Reached' : 'QR Code Scan Limit Reached'}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {type === 'daily'
              ? 'This QR code has reached its daily scan limit. Please try again tomorrow.'
              : 'This QR code is no longer active. The maximum number of scans has been reached.'}
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Go to Home
          </Button>
        </Card>
      </motion.div>
    </div>
  );
};
