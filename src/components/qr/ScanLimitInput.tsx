import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScanLine } from "lucide-react";

export type ScanLimitType = 'unlimited' | 'total' | 'daily';

interface ScanLimitInputProps {
  scanLimitType: ScanLimitType;
  onScanLimitTypeChange: (type: ScanLimitType) => void;
  maxScans: number;
  onMaxScansChange: (val: number) => void;
  dailyLimit: number;
  onDailyLimitChange: (val: number) => void;
  compact?: boolean;
}

export const ScanLimitInput = ({
  scanLimitType,
  onScanLimitTypeChange,
  maxScans,
  onMaxScansChange,
  dailyLimit,
  onDailyLimitChange,
  compact = false,
}: ScanLimitInputProps) => {
  return (
    <div className={`space-y-3 ${compact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'} border rounded-lg bg-secondary/30 border-border/50`}>
      <div className="flex items-center gap-2">
        <ScanLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
        <Label className={compact ? "text-xs sm:text-sm" : "text-sm"}>Scan Limit</Label>
      </div>
      <RadioGroup
        value={scanLimitType}
        onValueChange={(val) => onScanLimitTypeChange(val as ScanLimitType)}
        className="space-y-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="unlimited" id="scan-unlimited" />
          <Label htmlFor="scan-unlimited" className={`cursor-pointer ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
            Unlimited
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="total" id="scan-total" />
          <Label htmlFor="scan-total" className={`cursor-pointer ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
            Total Scan Limit
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="daily" id="scan-daily" />
          <Label htmlFor="scan-daily" className={`cursor-pointer ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
            Daily Scan Limit
          </Label>
        </div>
      </RadioGroup>

      {scanLimitType === 'total' && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Maximum Total Scans</Label>
          <Input
            type="number"
            min="1"
            value={maxScans}
            onChange={(e) => onMaxScansChange(parseInt(e.target.value) || 1)}
            placeholder="e.g. 100"
            className={compact ? "h-9 text-xs" : "h-10 text-sm"}
          />
        </div>
      )}

      {scanLimitType === 'daily' && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Maximum Scans Per Day</Label>
          <Input
            type="number"
            min="1"
            value={dailyLimit}
            onChange={(e) => onDailyLimitChange(parseInt(e.target.value) || 1)}
            placeholder="e.g. 50"
            className={compact ? "h-9 text-xs" : "h-10 text-sm"}
          />
        </div>
      )}
    </div>
  );
};
