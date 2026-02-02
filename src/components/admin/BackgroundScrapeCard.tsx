import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, StopCircle, Loader2, CheckCircle, XCircle } from "lucide-react";

interface ScrapeProgress {
  total: number;
  completed: number;
  failed: number;
  currentChapter: number | null;
  isRunning: boolean;
  message: string;
}

interface BackgroundScrapeCardProps {
  progress: ScrapeProgress;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export const BackgroundScrapeCard = ({
  progress,
  onStart,
  onStop,
  disabled = false,
}: BackgroundScrapeCardProps) => {
  const progressPercent = progress.total > 0 
    ? Math.round((progress.completed + progress.failed) / progress.total * 100) 
    : 0;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h4 className="font-semibold">سحب الصور في الخلفية</h4>
        </div>
        
        {progress.isRunning ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={onStop}
            className="gap-2"
          >
            <StopCircle className="h-4 w-4" />
            إيقاف
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={onStart}
            disabled={disabled}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            بدء السحب
          </Button>
        )}
      </div>

      {progress.isRunning && (
        <div className="space-y-3">
          <Progress value={progressPercent} className="h-2" />
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-green-500">
                <CheckCircle className="h-3 w-3" />
                {progress.completed}
              </span>
              {progress.failed > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-3 w-3" />
                  {progress.failed}
                </span>
              )}
              <span className="text-muted-foreground">
                من {progress.total}
              </span>
            </div>
            <span className="text-muted-foreground">{progressPercent}%</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{progress.message}</span>
            {progress.currentChapter && (
              <span className="text-primary">
                (الفصل {progress.currentChapter})
              </span>
            )}
          </div>
        </div>
      )}

      {!progress.isRunning && progress.total > 0 && (
        <div className="text-sm text-muted-foreground">
          {progress.message}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        💡 سيتم سحب صور الفصول التي لا تحتوي على صور تلقائياً. يمكنك إغلاق هذه الصفحة والسحب سيستمر.
      </p>
    </Card>
  );
};
