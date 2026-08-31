import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Square,
  Eye,
  Settings2,
  Sparkles,
  Save,
  Wand2,
  Image as ImageIcon,
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Circle,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { QRStyleConfig, BodyShape, EyeFrameShape, EyeBallShape, ErrorCorrectionLevel } from '@/lib/qr-styles';
import {
  defaultQRStyle,
  bodyShapeOptions,
  eyeFrameShapeOptions,
  eyeBallShapeOptions,
  errorCorrectionOptions,
  presetThemes,
  evaluateQRScannability,
  autoFixQRContrast,
} from '@/lib/qr-styles';

interface QRCustomizationPanelProps {
  value: QRStyleConfig;
  onChange: (style: QRStyleConfig) => void;
  onSaveStyle?: (name: string) => void;
  savedStyles?: { id: string; name: string; config: QRStyleConfig }[];
  onLoadStyle?: (id: string) => void;
  hideCardWrapper?: boolean;
  className?: string;
}

export function QRCustomizationPanel({
  value,
  onChange,
  onSaveStyle,
  savedStyles = [],
  onLoadStyle,
  hideCardWrapper = false,
  className = '',
}: QRCustomizationPanelProps) {
  const [newStyleName, setNewStyleName] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Evaluate real-time scannability based on contrast
  const scannability = evaluateQRScannability(
    value.bodyColor,
    value.eyeFrameColor,
    value.eyeBallColor,
    value.backgroundColor || '#ffffff'
  );

  const updateStyle = (updates: Partial<QRStyleConfig>) => {
    onChange({ ...value, ...updates });
  };

  const applyPreset = (preset: typeof presetThemes[0]) => {
    updateStyle({
      ...preset.config,
      backgroundColor: '#ffffff', // Ensure white background
      errorCorrectionLevel: value.logoUrl ? 'H' : (preset.config.errorCorrectionLevel || 'H'),
    });
  };

  const handleAutoFixContrast = () => {
    const fixedStyle = autoFixQRContrast(value);
    onChange(fixedStyle);
    toast.success('Auto-fixed contrast! QR code colors are now 100% scannable.');
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo image must be under 5MB');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `qr-logos/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      // Upload to Supabase storage 'uploads' bucket
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, file, { upsert: true });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);
        updateStyle({
          logoUrl: publicUrl,
          logoSize: 'medium',
          errorCorrectionLevel: 'H',
        });
        toast.success('Logo uploaded successfully!');
        return;
      }

      // Fallback: Read as data URL
      const reader = new FileReader();
      reader.onload = () => {
        updateStyle({
          logoUrl: reader.result as string,
          logoSize: 'medium',
          errorCorrectionLevel: 'H',
        });
        toast.success('Logo added!');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Logo upload error:', err);
      toast.error('Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const content = (
    <div className={`space-y-5 sm:space-y-6 ${className}`}>
      
      {/* 1. Quick Presets (100% White Background & High Scannability) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            Quick Presets (100% Scannable)
          </Label>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground">White bg verified</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {presetThemes.map((preset) => {
            const isSelected =
              value.bodyColor === preset.config.bodyColor &&
              value.eyeFrameColor === preset.config.eyeFrameColor &&
              value.bodyShape === preset.config.bodyShape;

            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 group ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                    : 'border-border/50 bg-secondary/30 hover:border-primary/40 hover:bg-secondary/60'
                }`}
              >
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg border border-border/40 flex items-center justify-center flex-shrink-0 shadow-xs"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <div
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-xs"
                    style={{ backgroundColor: preset.config.bodyColor }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] sm:text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {preset.name}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                    {preset.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Saved Custom Styles */}
      {savedStyles.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <Label className="text-xs font-semibold text-muted-foreground">Saved Styles</Label>
          <Select onValueChange={onLoadStyle}>
            <SelectTrigger className="w-full h-9 sm:h-10 bg-secondary/30 text-xs">
              <SelectValue placeholder="Load a saved custom style..." />
            </SelectTrigger>
            <SelectContent>
              {savedStyles.map((style) => (
                <SelectItem key={style.id} value={style.id} className="text-xs">
                  {style.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 3. Scannability Warning & Auto-Fix Banner */}
      <AnimatePresence>
        {scannability.status === 'poor' ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive" className="bg-destructive/15 border-destructive/30 p-3">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <AlertTitle className="text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span>⚠️ Color Warning: Cannot Scan!</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAutoFixContrast}
                  className="h-7 text-xs bg-background text-foreground border-destructive/40 w-full sm:w-auto"
                >
                  <Wand2 className="w-3 h-3 mr-1 text-primary" />
                  Auto-Fix Contrast
                </Button>
              </AlertTitle>
              <AlertDescription className="text-[11px] mt-1">
                {scannability.warningMessage}
              </AlertDescription>
            </Alert>
          </motion.div>
        ) : scannability.status === 'moderate' ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300 p-3">
              <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <AlertTitle className="text-xs font-semibold flex items-center justify-between">
                <span>Notice: Moderate Contrast</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAutoFixContrast}
                  className="h-6 text-[11px] text-amber-700 dark:text-amber-300 underline p-0"
                >
                  Maximize
                </Button>
              </AlertTitle>
              <AlertDescription className="text-[11px] mt-0.5">
                {scannability.warningMessage}
              </AlertDescription>
            </Alert>
          </motion.div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 font-medium text-[11px]">
              Scannability Verified: 100% High Contrast on white background.
            </span>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Customization Tabs: Shapes, Colors, Advanced, Logo */}
      <Tabs defaultValue="shapes" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-10 p-1 bg-secondary/40 rounded-lg border border-border/40">
          <TabsTrigger value="shapes" className="text-[11px] sm:text-xs font-medium px-1 sm:px-3">
            <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
            Shapes
          </TabsTrigger>
          <TabsTrigger value="colors" className="text-[11px] sm:text-xs font-medium px-1 sm:px-3">
            <Palette className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="logo" className="text-[11px] sm:text-xs font-medium px-1 sm:px-3">
            <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
            Logo
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-[11px] sm:text-xs font-medium px-1 sm:px-3">
            <Settings2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
            Rules
          </TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------- */}
        {/* SHAPES SUB-TAB                                       */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="shapes" className="space-y-4 mt-4">
          {/* Body Shape */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Body Pattern Shape</Label>
              <span className="text-[10px] text-muted-foreground">Internal matrix dots</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {bodyShapeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateStyle({ bodyShape: option.value })}
                  className={`p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1.5 ${
                    value.bodyShape === option.value
                      ? 'border-primary bg-primary/15 text-primary shadow-xs ring-1 ring-primary'
                      : 'border-border/50 bg-secondary/30 hover:border-primary/40'
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    {option.value === 'star' ? (
                      <svg viewBox="0 0 24 24" className={`w-4 h-4 ${value.bodyShape === option.value ? 'fill-primary' : 'fill-foreground'}`}>
                        <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
                      </svg>
                    ) : option.value === 'classy' ? (
                      <div className={`w-4 h-4 rounded-tl-md rounded-br-md ${value.bodyShape === option.value ? 'bg-primary' : 'bg-foreground'}`} />
                    ) : (
                      <div className={`w-4 h-4 ${value.bodyShape === option.value ? 'bg-primary' : 'bg-foreground'} ${
                        option.value === 'dots' ? 'rounded-full' :
                        option.value === 'rounded' ? 'rounded-xs' :
                        option.value === 'diamond' ? 'rotate-45 scale-85' :
                        ''
                      }`} />
                    )}
                  </div>
                  <span className="text-[11px] font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Eye Frame Shape */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-primary" />
                Corner Eye Frame Shape
              </Label>
              <span className="text-[10px] text-muted-foreground">3 corner outer boxes</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {eyeFrameShapeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateStyle({ eyeFrameShape: option.value })}
                  className={`p-2 rounded-lg border text-center transition-all min-h-[38px] flex items-center justify-center ${
                    value.eyeFrameShape === option.value
                      ? 'border-primary bg-primary/15 text-primary shadow-xs ring-1 ring-primary'
                      : 'border-border/50 bg-secondary/30 hover:border-primary/40'
                  }`}
                >
                  <span className="text-[11px] font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Eye Center (Ball) Shape */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Circle className="w-3.5 h-3.5 text-primary" />
                Corner Eye Center Pupil
              </Label>
              <span className="text-[10px] text-muted-foreground">Inner corner pupil dots</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {eyeBallShapeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateStyle({ eyeBallShape: option.value })}
                  className={`p-2 rounded-lg border text-center transition-all min-h-[38px] flex items-center justify-center ${
                    value.eyeBallShape === option.value
                      ? 'border-primary bg-primary/15 text-primary shadow-xs ring-1 ring-primary'
                      : 'border-border/50 bg-secondary/30 hover:border-primary/40'
                  }`}
                >
                  <span className="text-[11px] font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* COLORS SUB-TAB                                       */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="colors" className="space-y-4 mt-4">
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/40 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-primary" />
              Optimal Scannability Color Guidelines:
            </p>
            <p>• Keep the <strong>Background</strong> pure White (<code className="text-primary font-mono">#ffffff</code>) for instant detection by phone cameras.</p>
            <p>• Use rich, deep colors for <strong>Body</strong>, <strong>Eye Frame</strong>, and <strong>Eye Center</strong>.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Body Color */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
              <div>
                <Label className="text-xs font-semibold">1. Body Pattern Color</Label>
                <p className="text-[10px] text-muted-foreground">Data matrix modules</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value.bodyColor}
                  onChange={(e) => updateStyle({ bodyColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-background flex-shrink-0"
                />
                <Input
                  value={value.bodyColor}
                  onChange={(e) => updateStyle({ bodyColor: e.target.value })}
                  className="flex-1 font-mono text-xs h-10"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* 2. Background Color */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">2. Canvas Background</Label>
                  <p className="text-[10px] text-muted-foreground">Always recommended: White</p>
                </div>
                {value.backgroundColor !== '#ffffff' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStyle({ backgroundColor: '#ffffff' })}
                    className="h-6 text-[10px] px-2"
                  >
                    Reset
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value.backgroundColor || '#ffffff'}
                  onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-background flex-shrink-0"
                />
                <Input
                  value={value.backgroundColor || '#ffffff'}
                  onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                  className="flex-1 font-mono text-xs h-10"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* 3. Eye Frame Color */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
              <div>
                <Label className="text-xs font-semibold">3. Eye Frame Color</Label>
                <p className="text-[10px] text-muted-foreground">3 corner outer boxes</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value.eyeFrameColor}
                  onChange={(e) => updateStyle({ eyeFrameColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-background flex-shrink-0"
                />
                <Input
                  value={value.eyeFrameColor}
                  onChange={(e) => updateStyle({ eyeFrameColor: e.target.value })}
                  className="flex-1 font-mono text-xs h-10"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* 4. Eye Ball (Center) Color */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
              <div>
                <Label className="text-xs font-semibold">4. Eye Center Pupil Color</Label>
                <p className="text-[10px] text-muted-foreground">3 corner inner dots</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value.eyeBallColor}
                  onChange={(e) => updateStyle({ eyeBallColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-background flex-shrink-0"
                />
                <Input
                  value={value.eyeBallColor}
                  onChange={(e) => updateStyle({ eyeBallColor: e.target.value })}
                  className="flex-1 font-mono text-xs h-10"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* LOGO SUB-TAB                                         */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="logo" className="space-y-4 mt-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong>100% Scan Protection Active:</strong> When a center logo is added, Error Correction Level is automatically locked to <strong>High (30% recovery)</strong> with a protective white badge, ensuring phone cameras scan the QR instantly without interference.
            </div>
          </div>

          {value.logoUrl ? (
            <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border border-border/50 bg-secondary/30">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-border bg-white flex items-center justify-center p-1 shadow-xs flex-shrink-0">
                <img src={value.logoUrl} alt="Center Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-foreground">Center Logo Attached</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Label className="text-[11px] text-muted-foreground">Size:</Label>
                  <select
                    value={value.logoSize || 'medium'}
                    onChange={(e) => updateStyle({ logoSize: e.target.value as 'small' | 'medium' | 'large' })}
                    className="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground"
                  >
                    <option value="small">Small (16%)</option>
                    <option value="medium">Medium (21%)</option>
                    <option value="large">Large (26%)</option>
                  </select>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                onClick={() => updateStyle({ logoUrl: undefined, logoSize: undefined })}
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isUploadingLogo}
                onChange={handleLogoFileUpload}
              />
              <div className="flex flex-col items-center justify-center gap-2 p-5 sm:p-6 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/60 bg-secondary/20 transition-all cursor-pointer text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {isUploadingLogo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {isUploadingLogo ? 'Uploading logo...' : 'Upload Center Logo'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, WebP or SVG (Max 5MB)</p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* ADVANCED SUB-TAB                                     */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="advanced" className="space-y-4 mt-4">
          {/* Quiet Zone Margin */}
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Quiet Zone (Outer White Margin)</Label>
              <span className="text-xs text-muted-foreground font-mono">{value.margin} modules</span>
            </div>
            <Slider
              value={[value.margin]}
              onValueChange={([margin]) => updateStyle({ margin: Math.max(1, margin) })}
              min={1}
              max={8}
              step={1}
            />
            <p className="text-[10px] text-muted-foreground">
              A minimum margin of 4 modules is standard for guaranteed scanner isolation.
            </p>
          </div>

          {/* Error Correction Level */}
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Error Correction Level</Label>
              {value.logoUrl && (
                <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary">
                  Level H Locked for Logo
                </Badge>
              )}
            </div>
            <RadioGroup
              value={value.errorCorrectionLevel}
              onValueChange={(level) => updateStyle({ errorCorrectionLevel: level as ErrorCorrectionLevel })}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              disabled={!!value.logoUrl}
            >
              {errorCorrectionOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer ${
                    value.errorCorrectionLevel === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border/50 bg-background'
                  }`}
                  onClick={() => !value.logoUrl && updateStyle({ errorCorrectionLevel: option.value })}
                >
                  <RadioGroupItem value={option.value} id={`ec-${option.value}`} />
                  <div>
                    <Label htmlFor={`ec-${option.value}`} className="text-xs font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-[10px] text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </TabsContent>
      </Tabs>

      {/* 5. Save Custom Style to Profile */}
      {onSaveStyle && (
        <div className="pt-3 border-t border-border/40">
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Save This Custom Style
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. My Brand Style..."
              value={newStyleName}
              onChange={(e) => setNewStyleName(e.target.value)}
              className="flex-1 h-9 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (newStyleName.trim()) {
                  onSaveStyle(newStyleName.trim());
                  setNewStyleName('');
                }
              }}
              disabled={!newStyleName.trim()}
              className="h-9 text-xs"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Save Style
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (hideCardWrapper) {
    return content;
  }

  return (
    <Card className="w-full border-border/60 bg-card/85 backdrop-blur-md shadow-elevated">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-primary" />
          Customize QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {content}
      </CardContent>
    </Card>
  );
}
