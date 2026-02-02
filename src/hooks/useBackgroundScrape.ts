import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScrapeProgress {
  total: number;
  completed: number;
  failed: number;
  currentChapter: number | null;
  isRunning: boolean;
  message: string;
}

export const useBackgroundScrape = () => {
  const { toast } = useToast();
  const [progress, setProgress] = useState<ScrapeProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    currentChapter: null,
    isRunning: false,
    message: '',
  });
  
  const abortRef = useRef(false);
  
  const scrapeAllChapterPages = useCallback(async (
    mangaId: string,
    source: string,
    onComplete?: () => void
  ) => {
    abortRef.current = false;
    
    // Get all chapters without pages
    const { data: chapters, error } = await supabase
      .from('chapters')
      .select(`
        id,
        chapter_number,
        source_url,
        chapter_pages(count)
      `)
      .eq('manga_id', mangaId)
      .order('chapter_number', { ascending: true });
    
    if (error || !chapters) {
      toast({
        title: "خطأ",
        description: "فشل تحميل قائمة الفصول",
        variant: "destructive",
      });
      return;
    }
    
    // Filter chapters without pages
    const chaptersWithoutPages = chapters.filter((ch: any) => {
      const count = ch.chapter_pages?.[0]?.count || 0;
      return count === 0;
    });
    
    if (chaptersWithoutPages.length === 0) {
      toast({
        title: "✅ مكتمل",
        description: "جميع الفصول لديها صور بالفعل",
      });
      return;
    }
    
    setProgress({
      total: chaptersWithoutPages.length,
      completed: 0,
      failed: 0,
      currentChapter: null,
      isRunning: true,
      message: 'جاري البدء...',
    });
    
    toast({
      title: "🚀 بدء السحب في الخلفية",
      description: `سيتم سحب صور ${chaptersWithoutPages.length} فصل`,
    });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    // Process in batches of 3 for better performance
    const batchSize = 3;
    let completed = 0;
    let failed = 0;
    
    for (let i = 0; i < chaptersWithoutPages.length; i += batchSize) {
      if (abortRef.current) {
        setProgress(prev => ({ ...prev, isRunning: false, message: 'تم الإيقاف' }));
        break;
      }
      
      const batch = chaptersWithoutPages.slice(i, i + batchSize);
      
      setProgress(prev => ({
        ...prev,
        currentChapter: batch[0].chapter_number,
        message: `جاري سحب الفصول ${i + 1} - ${Math.min(i + batchSize, chaptersWithoutPages.length)}...`,
      }));
      
      const results = await Promise.allSettled(
        batch.map(chapter =>
          supabase.functions.invoke('scrape-lekmanga', {
            body: {
              url: chapter.source_url,
              jobType: 'pages',
              source: source,
              chapterId: chapter.id,
            },
            headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
          })
        )
      );
      
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && !result.value.error) {
          completed++;
        } else {
          failed++;
          console.error(`Failed chapter ${batch[idx].chapter_number}:`, 
            result.status === 'rejected' ? result.reason : result.value?.error);
        }
      });
      
      setProgress(prev => ({
        ...prev,
        completed,
        failed,
      }));
      
      // Delay between batches
      if (i + batchSize < chaptersWithoutPages.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    setProgress(prev => ({
      ...prev,
      isRunning: false,
      currentChapter: null,
      message: `اكتمل: ${completed} نجاح، ${failed} فشل`,
    }));
    
    toast({
      title: failed > 0 ? "⚠️ اكتمل جزئياً" : "✅ اكتمل بنجاح",
      description: `تم سحب ${completed} فصل${failed > 0 ? ` (فشل ${failed})` : ''}`,
    });
    
    onComplete?.();
  }, [toast]);
  
  const stopScraping = useCallback(() => {
    abortRef.current = true;
    toast({
      title: "إيقاف",
      description: "جاري إيقاف السحب...",
    });
  }, [toast]);
  
  return {
    progress,
    scrapeAllChapterPages,
    stopScraping,
  };
};
