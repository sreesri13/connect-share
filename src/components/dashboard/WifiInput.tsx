import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Wifi } from "lucide-react";

interface WifiInputProps {
  value: string;
  onChange: (value: string) => void;
}

// Parse WIFI: string format
const parseWifiString = (str: string) => {
  const ssidMatch = str.match(/S:([^;]*)/);
  const passMatch = str.match(/P:([^;]*)/);
  const typeMatch = str.match(/T:([^;]*)/);
  const hiddenMatch = str.match(/H:([^;]*)/);
  return {
    ssid: ssidMatch?.[1] || "",
    password: passMatch?.[1] || "",
    encryption: typeMatch?.[1] || "WPA",
    hidden: hiddenMatch?.[1] === "true",
  };
};

const buildWifiString = (ssid: string, password: string, encryption: string, hidden: boolean) => {
  return `WIFI:T:${encryption};S:${ssid};P:${password};H:${hidden};;`;
};

export const WifiInput = ({ value, onChange }: WifiInputProps) => {
  const parsed = parseWifiString(value);
  const [ssid, setSsid] = useState(parsed.ssid);
  const [password, setPassword] = useState(parsed.password);
  const [encryption, setEncryption] = useState(parsed.encryption);
  const [hidden, setHidden] = useState(parsed.hidden);

  useEffect(() => {
    if (ssid) {
      onChange(buildWifiString(ssid, password, encryption, hidden));
    }
  }, [ssid, password, encryption, hidden]);

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <Wifi className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">WiFi Credentials</span>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Network Name (SSID)</Label>
        <Input
          placeholder="My WiFi Network"
          value={ssid}
          onChange={(e) => setSsid(e.target.value)}
          className="min-h-[44px]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Encryption</Label>
        <Select value={encryption} onValueChange={setEncryption}>
          <SelectTrigger className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WPA">WPA/WPA2/WPA3</SelectItem>
            <SelectItem value="WEP">WEP</SelectItem>
            <SelectItem value="nopass">None (Open)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {encryption !== "nopass" && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Password</Label>
          <Input
            type="password"
            placeholder="WiFi password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-[44px]"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Hidden Network</Label>
        <Switch checked={hidden} onCheckedChange={setHidden} />
      </div>
    </div>
  );
};
