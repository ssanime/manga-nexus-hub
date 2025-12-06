import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, Play, Square, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const ResumeDownloads = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [currentMangaId, setCurrentMangaId] = useState<string | null>(null);

  // Fetch chapters without pages
  const { data: chaptersWithoutPages, isLoading, refetch } = useQuery({
    queryKey: ['chapters-without-pages'],
    queryFn: async () => {
      // Get all chapters
      const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, chapter_number, source_url, manga_id, manga:manga_id(title, source)')
        .order('created_at', { ascending: false });
      
      if (chaptersError) throw chaptersError;
      if (!chapters) return [];

      // Get chapters that have pages
      const { data: chapterPages } = await supabase
        .from('chapter_pages')
        .select('chapter_id')
        .limit(10000);

      const chaptersWithPages = new Set(chapterPages?.map(p => p.chapter_id) || []);

      // Filter chapters without pages
      const result = chapters.filter(c => !chaptersWithPages.has(c.id));

      // Group by manga
      const grouped: Record<string, { manga: any; chapters: any[] }> = {};
      result.forEach(chapter => {
        const mangaId = chapter.manga_id;
        if (!grouped[mangaId]) {
          grouped[mangaId] = {
            manga: chapter.manga,
            chapters: [],
          };
        }
        grouped[mangaId].chapters.push(chapter);
      });

      return Object.entries(grouped).map(([id, data]) => ({
        mangaId: id,
        mangaTitle: (data.manga as any)?.title || 'غير معروف',
        source: (data.manga as any)?.source || '',
        chapters: data.chapters,
        count: data.chapters.length,
      }));
    },
    refetchInterval: 30000,
  });

  const resumeDownload = async (mangaId: string, source: string, chapters: any[]) => {
    if (downloading) return;

    setDownloading(true);
    setCurrentMangaId(mangaId);
    setProgress(0);
    setProgressMessage("بدء استئناف التحميل...");

    try {
      const batchSize = 3;
      let completed = 0;
      let failed = 0;
      const total = chapters.length;

      for (let i = 0; i < chapters.length; i += batchSize) {
        const batch = chapters.slice(i, i + batchSize);
        
        setProgressMessage(`جاري تحميل الفصول ${i + 1} - ${Math.min(i + batchSize, total)} من ${total}...`);

        const results = await Promise.allSettled(
          batch.map(chapter =>
            supabase.functions.invoke('scrape-lekmanga', {
              body: {
                url: chapter.source_url,
                jobType: 'pages',
                source: source,
                chapterId: chapter.id,
              },
            })
          )
        );

        results.forEach((result) => {
          if (result.status === 'fulfilled' && !result.value.error) {
            completed++;
          } else {
            failed++;
          }
        });

        setProgress(((i + batch.length) / total) * 100);

        // Delay between batches
        if (i + batchSize < chapters.length) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      toast({
        title: "اكتمل التحميل",
        description: `تم تحميل ${completed} فصل، فشل ${failed} فصل`,
      });

      queryClient.invalidateQueries({ queryKey: ['chapters-without-pages'] });
    } catch (error) {
      console.error('Resume download failed:', error);
      toast({
        title: "فشل التحميل",
        description: "حدث خطأ أثناء استئناف التحميل",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
      setCurrentMangaId(null);
      setProgress(0);
      setProgressMessage("");
    }
  };

  const resumeAll = async () => {
    if (downloading || !chaptersWithoutPages || chaptersWithoutPages.length === 0) return;

    setDownloading(true);
    
    try {
      for (const manga of chaptersWithoutPages) {
        setCurrentMangaId(manga.mangaId);
        await resumeDownload(manga.mangaId, manga.source, manga.chapters);
      }

      toast({
        title: "اكتمل تحميل الكل",
        description: "تم استئناف تحميل جميع الفصول",
      });
    } catch (error) {
      console.error('Resume all failed:', error);
    } finally {
      setDownloading(false);
      setCurrentMangaId(null);
    }
  };

  const totalChapters = chaptersWithoutPages?.reduce((sum, m) => sum + m.count, 0) || 0;

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">استئناف التحميل المتوقف</h3>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {totalChapters > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-yellow-400">
                  {totalChapters} فصل بدون صفحات
                </p>
                <p className="text-sm text-muted-foreground">
                  من {chaptersWithoutPages?.length || 0} مانجا
                </p>
              </div>
              <Button 
                onClick={resumeAll}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                استئناف الكل
              </Button>
            </div>
          </div>
        )}

        {downloading && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{progressMessage}</span>
            </div>
          </div>
        )}

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            </div>
          ) : chaptersWithoutPages && chaptersWithoutPages.length > 0 ? (
            chaptersWithoutPages.map((manga) => (
              <div 
                key={manga.mangaId} 
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  currentMangaId === manga.mangaId 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border bg-muted/30'
                }`}
              >
                <div className="flex-1">
                  <h4 className="font-medium">{manga.mangaTitle}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{manga.source}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {manga.count} فصل بدون صفحات
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => resumeDownload(manga.mangaId, manga.source, manga.chapters)}
                  disabled={downloading}
                >
                  {currentMangaId === manga.mangaId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Download className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>جميع الفصول تحتوي على صفحات</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
