import { WifiOff, Wifi } from "lucide-react";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export const OfflineIndicator = () => {
  const { isOnline, wasOffline } = useOfflineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-900 py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium shadow-lg"
        >
          <WifiOff className="w-4 h-4" />
          <span>Offline Mode - Some features require internet</span>
        </motion.div>
      )}
      {showReconnected && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium shadow-lg"
        >
          <Wifi className="w-4 h-4" />
          <span>Back Online</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
