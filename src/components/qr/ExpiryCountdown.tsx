import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface ExpiryCountdownProps {
  expiresAt: string;
  className?: string;
}

export const ExpiryCountdown = ({ expiresAt, className = "" }: ExpiryCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        return null;
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!timeLeft) {
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 bg-destructive/10 text-destructive rounded text-xs ${className}`}>
        <Clock className="w-3 h-3" />
        <span>Expired</span>
      </div>
    );
  }

  // Format the countdown string
  const formatCountdown = () => {
    const parts: string[] = [];
    
    if (timeLeft.days > 0) {
      parts.push(`${timeLeft.days}d`);
    }
    if (timeLeft.hours > 0 || timeLeft.days > 0) {
      parts.push(`${timeLeft.hours}h`);
    }
    if (timeLeft.minutes > 0 || timeLeft.hours > 0 || timeLeft.days > 0) {
      parts.push(`${timeLeft.minutes}m`);
    }
    parts.push(`${timeLeft.seconds}s`);

    return parts.join(" ");
  };

  // Determine urgency level for styling
  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 1;
  const isWarning = timeLeft.days === 0 && timeLeft.hours < 24;

  return (
    <div 
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
        isUrgent 
          ? "bg-destructive/10 text-destructive animate-pulse" 
          : isWarning 
            ? "bg-amber-500/10 text-amber-600" 
            : "bg-amber-500/10 text-amber-600"
      } ${className}`}
    >
      <Clock className="w-3 h-3" />
      <span>Expires in: {formatCountdown()}</span>
    </div>
  );
};
