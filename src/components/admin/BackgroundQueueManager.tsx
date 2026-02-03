import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Play, 
  Pause, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Clock,
  RefreshCw 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface BackgroundQueueManagerProps {
  mangaId: string;
  mangaTitle: string;
  source: string;
}

export const BackgroundQueueManager = ({ 
  mangaId, 
  mangaTitle, 
  source 
}: BackgroundQueueManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [queueing, setQueueing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Query queue status for this manga
  const { data: queueStatus, isLoading } = useQuery({
    queryKey: ['queue-status', mangaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('background_download_queue')
        .select('status')
        .eq('manga_id', mangaId);

      if (error) throw error;

      const statusCounts = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: data?.length || 0,
      };

      data?.forEach(item => {
        statusCounts[item.status as keyof typeof statusCounts]++;
      });

      return statusCounts;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const queueAllChapters = async () => {
    setQueueing(true);
    try {
      const { data, error } = await supabase.functions.invoke('queue-all-chapters', {
        body: { mangaId, source },
      });

      if (error) throw error;

      toast({
        title: "✅ تم إضافة الفصول للقائمة",
        description: data?.message || `تم إضافة ${data?.queued} فصل`,
      });

      queryClient.invalidateQueries({ queryKey: ['queue-status', mangaId] });
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err?.message || "فشل إضافة الفصول للقائمة",
        variant: "destructive",
      });
    } finally {
      setQueueing(false);
    }
  };

  const triggerProcessing = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-download-queue', {
        body: { mangaId },
      });

      if (error) throw error;

      toast({
        title: "✅ جاري المعالجة",
        description: data?.message || `تم معالجة ${data?.processed} فصل`,
      });

      queryClient.invalidateQueries({ queryKey: ['queue-status', mangaId] });
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err?.message || "فشل بدء المعالجة",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const progress = queueStatus?.total 
    ? Math.round(((queueStatus.completed + queueStatus.failed) / queueStatus.total) * 100)
    : 0;

  const isActive = (queueStatus?.pending || 0) > 0 || (queueStatus?.processing || 0) > 0;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h4 className="font-semibold">تحميل دائم بالخلفية</h4>
        </div>
        
        {isActive && (
          <Badge variant="secondary" className="bg-green-500/20 text-green-500">
            <Clock className="w-3 h-3 mr-1" />
            نشط
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        💡 أضف كل الفصول لقائمة التحميل. سيستمر التحميل تلقائياً حتى لو أغلقت المتصفح.
      </p>

      {queueStatus && queueStatus.total > 0 && (
        <div className="space-y-3 mb-4">
          <Progress value={progress} className="h-2" />
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-green-500">
                <CheckCircle className="h-3 w-3" />
                {queueStatus.completed}
              </span>
              {queueStatus.pending > 0 && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <Clock className="h-3 w-3" />
                  {queueStatus.pending}
                </span>
              )}
              {queueStatus.processing > 0 && (
                <span className="flex items-center gap-1 text-blue-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {queueStatus.processing}
                </span>
              )}
              {queueStatus.failed > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-3 w-3" />
                  {queueStatus.failed}
                </span>
              )}
            </div>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={queueAllChapters}
          disabled={queueing || isLoading}
          className="flex-1 gap-2"
          variant={isActive ? "outline" : "default"}
        >
          {queueing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري الإضافة...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              إضافة كل الفصول
            </>
          )}
        </Button>

        {isActive && (
          <Button
            onClick={triggerProcessing}
            disabled={processing}
            variant="secondary"
            className="gap-2"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        )}

        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['queue-status', mangaId] })}
          variant="ghost"
          size="icon"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
