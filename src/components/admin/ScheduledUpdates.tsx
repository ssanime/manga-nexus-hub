import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Play, Pause, RefreshCw, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ScheduleConfig {
  enabled: boolean;
  intervalHours: number;
  lastRun?: string;
  nextRun?: string;
}

export const ScheduledUpdates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [manualUpdateLoading, setManualUpdateLoading] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
    enabled: false,
    intervalHours: 6,
  });

  // Fetch manga that need updates
  const { data: mangaToUpdate, isLoading } = useQuery({
    queryKey: ['manga-for-update'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manga')
        .select('id, title, source, source_url, last_scraped_at, chapter_count')
        .not('source_url', 'is', null)
        .order('last_scraped_at', { ascending: true, nullsFirst: true })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  // Check for stalled jobs
  const { data: stalledJobs } = useQuery({
    queryKey: ['stalled-scrape-jobs'],
    queryFn: async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('status', 'processing')
        .lt('updated_at', tenMinutesAgo);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const runManualUpdate = async () => {
    if (!mangaToUpdate || mangaToUpdate.length === 0) {
      toast({
        title: "لا توجد مانجا",
        description: "لا توجد مانجا لتحديثها",
        variant: "destructive",
      });
      return;
    }

    setManualUpdateLoading(true);

    try {
      // Update first 10 manga that haven't been updated recently
      const oldManga = mangaToUpdate
        .filter(m => {
          if (!m.last_scraped_at) return true;
          const lastScrape = new Date(m.last_scraped_at);
          const hoursSince = (Date.now() - lastScrape.getTime()) / (1000 * 60 * 60);
          return hoursSince > 1;
        })
        .slice(0, 5);

      if (oldManga.length === 0) {
        toast({
          title: "تم التحديث مؤخراً",
          description: "جميع المانجا تم تحديثها خلال الساعة الماضية",
        });
        setManualUpdateLoading(false);
        return;
      }

      let updated = 0;
      let failed = 0;

      for (const manga of oldManga) {
        try {
          const { error } = await supabase.functions.invoke('scrape-lekmanga', {
            body: {
              url: manga.source_url,
              jobType: 'chapters',
              source: manga.source,
            },
          });

          if (error) {
            failed++;
            console.error(`Failed to update ${manga.title}:`, error);
          } else {
            updated++;
            // Update last_scraped_at
            await supabase
              .from('manga')
              .update({ last_scraped_at: new Date().toISOString() })
              .eq('id', manga.id);
          }
        } catch (e) {
          failed++;
          console.error(`Error updating ${manga.title}:`, e);
        }
      }

      toast({
        title: "اكتمل التحديث",
        description: `تم تحديث ${updated} مانجا، فشل ${failed}`,
      });

      queryClient.invalidateQueries({ queryKey: ['manga-for-update'] });
    } catch (error) {
      console.error('Manual update failed:', error);
      toast({
        title: "فشل التحديث",
        description: "حدث خطأ أثناء التحديث",
        variant: "destructive",
      });
    } finally {
      setManualUpdateLoading(false);
    }
  };

  const clearStalledJobs = async () => {
    if (!stalledJobs || stalledJobs.length === 0) return;

    try {
      const { error } = await supabase
        .from('scrape_jobs')
        .update({ status: 'failed', error_message: 'Cleared: Job stalled for too long' })
        .eq('status', 'processing')
        .lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

      if (error) throw error;

      toast({
        title: "تم المسح",
        description: `تم مسح ${stalledJobs.length} مهمة متوقفة`,
      });

      queryClient.invalidateQueries({ queryKey: ['stalled-scrape-jobs'] });
    } catch (error) {
      console.error('Failed to clear stalled jobs:', error);
      toast({
        title: "خطأ",
        description: "فشل مسح المهام المتوقفة",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">جدولة تحديث الفصول</h3>
          </div>
          <Badge variant={scheduleConfig.enabled ? "default" : "secondary"}>
            {scheduleConfig.enabled ? "مفعل" : "متوقف"}
          </Badge>
        </div>

        {/* Manual Update Section */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">تحديث يدوي</h4>
              <p className="text-sm text-muted-foreground">
                تحديث أقدم 5 مانجا لم يتم تحديثها منذ ساعة
              </p>
            </div>
            <Button 
              onClick={runManualUpdate} 
              disabled={manualUpdateLoading || isLoading}
            >
              {manualUpdateLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  تحديث الآن
                </>
              )}
            </Button>
          </div>

          {mangaToUpdate && mangaToUpdate.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{mangaToUpdate.length}</span> مانجا جاهزة للتحديث
            </div>
          )}
        </div>

        {/* Stalled Jobs Section */}
        {stalledJobs && stalledJobs.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-destructive">مهام متوقفة</h4>
                <p className="text-sm text-muted-foreground">
                  {stalledJobs.length} مهمة متوقفة منذ أكثر من 10 دقائق
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={clearStalledJobs}>
                مسح المهام المتوقفة
              </Button>
            </div>
          </div>
        )}

        {/* Schedule Configuration */}
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <Label>تفعيل التحديث التلقائي</Label>
            </div>
            <Switch
              checked={scheduleConfig.enabled}
              onCheckedChange={(enabled) => setScheduleConfig({ ...scheduleConfig, enabled })}
            />
          </div>

          {scheduleConfig.enabled && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label>الفترة بين التحديثات</Label>
                <Select
                  value={String(scheduleConfig.intervalHours)}
                  onValueChange={(v) => setScheduleConfig({ ...scheduleConfig, intervalHours: parseInt(v) })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">ساعة</SelectItem>
                    <SelectItem value="3">3 ساعات</SelectItem>
                    <SelectItem value="6">6 ساعات</SelectItem>
                    <SelectItem value="12">12 ساعة</SelectItem>
                    <SelectItem value="24">يوم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-400">
                  💡 لتفعيل التحديث التلقائي الكامل، تحتاج إلى إعداد Cron Job في Supabase.
                  التحديث اليدوي متاح دائماً.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Manga List for Update */}
        <div className="space-y-2 border-t border-border pt-4">
          <h4 className="font-medium">المانجا بحاجة للتحديث</h4>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </div>
            ) : mangaToUpdate && mangaToUpdate.length > 0 ? (
              mangaToUpdate.slice(0, 10).map((manga) => (
                <div key={manga.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div>
                    <span className="font-medium">{manga.title}</span>
                    <span className="text-xs text-muted-foreground mr-2">
                      ({manga.chapter_count || 0} فصل)
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {manga.last_scraped_at 
                      ? new Date(manga.last_scraped_at).toLocaleDateString('ar')
                      : 'لم يُحدّث'}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">لا توجد مانجا</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
