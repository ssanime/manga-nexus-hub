import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Settings, Sun, Moon, ZoomIn, RotateCcw, AlignVerticalJustifyCenter, FileText } from "lucide-react";

type ReadingMode = "vertical" | "single";

interface ReaderSettingsProps {
  readingMode: ReadingMode;
  brightness: number;
  zoom: number;
  isDarkMode: boolean;
  gapless: boolean;
  onReadingModeChange: (mode: ReadingMode) => void;
  onBrightnessChange: (v: number) => void;
  onZoomChange: (v: number) => void;
  onDarkModeToggle: () => void;
  onGaplessToggle: () => void;
  onReset: () => void;
}

export const ReaderSettings = ({
  readingMode,
  brightness,
  zoom,
  isDarkMode,
  gapless,
  onReadingModeChange,
  onBrightnessChange,
  onZoomChange,
  onDarkModeToggle,
  onGaplessToggle,
  onReset,
}: ReaderSettingsProps) => {
  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed top-20 left-4 z-50 w-72"
    >
      <Card className="p-5 bg-card/95 backdrop-blur-md border-border shadow-2xl">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          إعدادات القراءة
        </h3>

        <div className="space-y-5">
          {/* Reading Mode */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">وضع القراءة</label>
            <div className="flex gap-2">
              {[
                { value: "vertical" as const, label: "عمودي", icon: AlignVerticalJustifyCenter },
                { value: "single" as const, label: "صفحة", icon: FileText },
              ].map((mode) => (
                <Button
                  key={mode.value}
                  variant={readingMode === mode.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onReadingModeChange(mode.value)}
                  className="flex-1 gap-1.5"
                >
                  <mode.icon className="h-3.5 w-3.5" />
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Brightness */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                السطوع
              </span>
              <span>{brightness}%</span>
            </label>
            <Slider
              value={[brightness]}
              onValueChange={([v]) => onBrightnessChange(v)}
              min={30}
              max={150}
              step={5}
            />
          </div>

          {/* Zoom */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ZoomIn className="h-4 w-4" />
                التكبير
              </span>
              <span>{zoom}%</span>
            </label>
            <Slider
              value={[zoom]}
              onValueChange={([v]) => onZoomChange(v)}
              min={50}
              max={200}
              step={5}
            />
          </div>

          {/* Gapless mode (vertical only) */}
          {readingMode === "vertical" && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">بدون فواصل</span>
              <Button variant="outline" size="sm" onClick={onGaplessToggle}>
                {gapless ? "مفعّل" : "معطّل"}
              </Button>
            </div>
          )}

          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              الوضع الليلي
            </span>
            <Button variant="outline" size="sm" onClick={onDarkModeToggle}>
              {isDarkMode ? "مفعّل" : "معطّل"}
            </Button>
          </div>

          {/* Reset */}
          <Button variant="ghost" size="sm" className="w-full gap-2" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            إعادة ضبط
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};
