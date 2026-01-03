import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Square, Eye, Settings2, ChevronDown, ChevronUp, Sparkles, Save, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  getContrastWarning,
} from '@/lib/qr-styles';

interface QRCustomizationPanelProps {
  value: QRStyleConfig;
  onChange: (style: QRStyleConfig) => void;
  onSaveStyle?: (name: string) => void;
  savedStyles?: { id: string; name: string; config: QRStyleConfig }[];
  onLoadStyle?: (id: string) => void;
}

const ShapePreview = ({ shape, type }: { shape: string; type: 'body' | 'eyeFrame' | 'eyeBall' }) => {
  const getPath = () => {
    if (type === 'body') {
      switch (shape) {
        case 'dots': return 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z';
        case 'rounded': return 'M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z';
        case 'diamond': return 'M12 2l10 10-10 10L2 12 12 2z';
        case 'star': return 'M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z';
        case 'classy': return 'M4 4h16v16H4z';
        default: return 'M4 4h16v16H4z';
      }
    }
    return 'M4 4h16v16H4z';
  };

  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
      <path d={getPath()} />
    </svg>
  );
};

export function QRCustomizationPanel({
  value,
  onChange,
  onSaveStyle,
  savedStyles = [],
  onLoadStyle,
}: QRCustomizationPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('shapes');
  const [newStyleName, setNewStyleName] = useState('');
  const contrastWarning = getContrastWarning(value.bodyColor, value.backgroundColor);

  const updateStyle = (updates: Partial<QRStyleConfig>) => {
    onChange({ ...value, ...updates });
  };

  const applyPreset = (preset: typeof presetThemes[0]) => {
    updateStyle(preset.config);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-primary" />
          Customize QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset Themes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick Presets</Label>
          <div className="grid grid-cols-3 gap-2">
            {presetThemes.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Saved Styles */}
        {savedStyles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">My Saved Styles</Label>
            <Select onValueChange={onLoadStyle}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Load a saved style..." />
              </SelectTrigger>
              <SelectContent>
                {savedStyles.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    {style.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Tabs defaultValue="shapes" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="shapes" className="text-xs">
              <Square className="w-3 h-3 mr-1" />
              Shapes
            </TabsTrigger>
            <TabsTrigger value="colors" className="text-xs">
              <Palette className="w-3 h-3 mr-1" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs">
              <Settings2 className="w-3 h-3 mr-1" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shapes" className="space-y-4 mt-4">
            {/* Body Shape */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Body Shape</Label>
              <div className="grid grid-cols-5 gap-2">
                {bodyShapeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateStyle({ bodyShape: option.value })}
                    className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                      value.bodyShape === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {option.value === 'star' ? (
                      <svg viewBox="0 0 24 24" className={`w-4 h-4 ${value.bodyShape === option.value ? 'fill-primary' : 'fill-foreground'}`}>
                        <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
                      </svg>
                    ) : (
                      <div className={`w-4 h-4 ${value.bodyShape === option.value ? 'bg-primary' : 'bg-foreground'} ${
                        option.value === 'dots' ? 'rounded-full' :
                        option.value === 'rounded' ? 'rounded-md' :
                        option.value === 'diamond' ? 'rotate-45' :
                        ''
                      }`} />
                    )}
                    <span className="text-[10px]">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Eye Frame Shape */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Eye Frame
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {eyeFrameShapeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateStyle({ eyeFrameShape: option.value })}
                    className={`p-2 rounded-lg border transition-all text-center ${
                      value.eyeFrameShape === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-[10px]">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Eye Ball Shape */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Eye Center</Label>
              <div className="grid grid-cols-5 gap-2">
                {eyeBallShapeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateStyle({ eyeBallShape: option.value })}
                    className={`p-2 rounded-lg border transition-all text-center ${
                      value.eyeBallShape === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-[10px]">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="colors" className="space-y-4 mt-4">
            {/* Color Pickers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Body Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={value.bodyColor}
                    onChange={(e) => updateStyle({ bodyColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={value.bodyColor}
                    onChange={(e) => updateStyle({ bodyColor: e.target.value })}
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Background</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={value.backgroundColor}
                    onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={value.backgroundColor}
                    onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Eye Frame</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={value.eyeFrameColor}
                    onChange={(e) => updateStyle({ eyeFrameColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={value.eyeFrameColor}
                    onChange={(e) => updateStyle({ eyeFrameColor: e.target.value })}
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Eye Center</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={value.eyeBallColor}
                    onChange={(e) => updateStyle({ eyeBallColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={value.eyeBallColor}
                    onChange={(e) => updateStyle({ eyeBallColor: e.target.value })}
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Contrast Warning */}
            <AnimatePresence>
              {contrastWarning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                    <AlertDescription className="text-xs">
                      ⚠️ {contrastWarning}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auto-fix button */}
            {contrastWarning && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateStyle({
                  bodyColor: '#000000',
                  backgroundColor: '#ffffff',
                })}
                className="w-full"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Auto-fix Contrast
              </Button>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            {/* Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">QR Size</Label>
                <span className="text-xs text-muted-foreground">{value.size}px</span>
              </div>
              <Slider
                value={[value.size]}
                onValueChange={([size]) => updateStyle({ size })}
                min={100}
                max={400}
                step={10}
              />
            </div>

            {/* Margin */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Quiet Zone (Margin)</Label>
                <span className="text-xs text-muted-foreground">{value.margin} modules</span>
              </div>
              <Slider
                value={[value.margin]}
                onValueChange={([margin]) => updateStyle({ margin: Math.max(1, margin) })}
                min={1}
                max={10}
                step={1}
              />
            </div>

            {/* Error Correction Level */}
            <div className="space-y-2">
              <Label className="text-sm">Error Correction Level</Label>
              <RadioGroup
                value={value.errorCorrectionLevel}
                onValueChange={(level) => updateStyle({ errorCorrectionLevel: level as ErrorCorrectionLevel })}
                className="grid grid-cols-2 gap-2"
              >
                {errorCorrectionOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer ${
                      value.errorCorrectionLevel === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                    onClick={() => updateStyle({ errorCorrectionLevel: option.value })}
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div>
                      <Label htmlFor={option.value} className="text-xs font-medium cursor-pointer">
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

        {/* Save Style */}
        {onSaveStyle && (
          <div className="pt-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                placeholder="Style name..."
                value={newStyleName}
                onChange={(e) => setNewStyleName(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (newStyleName.trim()) {
                    onSaveStyle(newStyleName.trim());
                    setNewStyleName('');
                  }
                }}
                disabled={!newStyleName.trim()}
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
