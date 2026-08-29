import { motion } from "framer-motion";
import { Clock, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QRExpiredScreenProps {
  expiredAt?: string | null;
  title?: string | null;
}

export const QRExpiredScreen = ({ expiredAt, title }: QRExpiredScreenProps) => {
  const formattedDate = expiredAt
    ? new Date(expiredAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-destructive/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 text-center border border-border/50 shadow-elevated">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <Clock className="w-8 h-8" />
          </div>
          {title && (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {title}
            </p>
          )}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            QR Code Expired
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            This QR link is no longer accessible because its scheduled expiration duration has ended.
          </p>
          {formattedDate && (
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-destructive bg-destructive/10 py-2 px-3 rounded-lg mb-6 max-w-xs mx-auto">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Expired on {formattedDate}</span>
            </div>
          )}
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Return to Homepage
          </Button>
        </Card>
      </motion.div>
    </div>
  );
};
