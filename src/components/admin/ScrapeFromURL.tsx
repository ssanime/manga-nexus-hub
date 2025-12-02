import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";

export const ScrapeFromURL = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [catalogSource, setCatalogSource] = useState<string>("");
  const [catalogLimit, setCatalogLimit] = useState("20");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [autoDownloadPages, setAutoDownloadPages] = useState(false);

  const { data: sources } = useQuery({
    queryKey: ['scraper-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scraper_sources')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  const handleScrape = async () => {
    if (!url || !selectedSource) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setProgress(0);
    setProgressMessage("جاري الاتصال بالموقع...");
    
    try {
      console.log(`Starting scrape: ${selectedSource} - ${url}`);
      
      setProgress(10);
      setProgressMessage("جاري سحب معلومات المانجا...");
      
      // Step 1: Scrape manga info first
      const { data: mangaResponse, error: mangaError } = await supabase.functions.invoke('scrape-lekmanga', {
        body: {
          url,
          jobType: 'manga_info',
          source: selectedSource,
        },
      });

      if (mangaError) {
        console.error('Manga scrape error:', mangaError);
        throw mangaError;
      }

      const manga = mangaResponse?.manga;
      
      if (!manga || !manga.title) {
        throw new Error('لم يتم العثور على بيانات المانجا. قد يكون الموقع محمي أو الرابط غير صحيح');
      }

      setProgress(40);
      setProgressMessage(`تم سحب "${manga.title}"، جاري سحب الفصول...`);
      
      // Step 2: Scrape chapters (without pages)
      const { data: chaptersResponse, error: chaptersError } = await supabase.functions.invoke('scrape-lekmanga', {
        body: {
          url,
          jobType: 'chapters',
          source: selectedSource,
        },
      });

      if (chaptersError) {
        console.error('Chapters scrape error:', chaptersError);
        // Don't throw - manga info is already saved
        toast({
          title: "⚠️ تحذير",
          description: "تم سحب المانجا لكن فشل سحب بعض الفصول. قد تحتاج لإعادة المحاولة.",
        });
      }

      const savedCount = chaptersResponse?.saved || 0;
      const totalCount = chaptersResponse?.total || 0;
      const partial = chaptersResponse?.partial || false;

      // Step 3: Download pages if auto-download is enabled
      if (autoDownloadPages && savedCount > 0) {
        setProgress(70);
        setProgressMessage("جاري تحميل صفحات الفصول...");
        
        // Get the saved chapters
        const { data: chapters } = await supabase
          .from('chapters')
          .select('id, chapter_number, source_url')
          .eq('manga_id', manga.id)
          .order('chapter_number', { ascending: false })
          .limit(10); // Limit to first 10 chapters to avoid timeout
        
        if (chapters && chapters.length > 0) {
          let downloadedChapters = 0;
          
          for (const chapter of chapters) {
            try {
              setProgressMessage(`جاري تحميل صفحات الفصل ${chapter.chapter_number}...`);
              
              await supabase.functions.invoke('scrape-lekmanga', {
                body: {
                  url: chapter.source_url,
                  jobType: 'pages',
                  source: selectedSource,
                  chapterId: chapter.id,
                },
              });
              
              downloadedChapters++;
              setProgress(70 + (downloadedChapters / chapters.length) * 25);
            } catch (pageError) {
              console.error(`Failed to download pages for chapter ${chapter.chapter_number}:`, pageError);
              // Continue with next chapter
            }
          }
          
          toast({
            title: "✅ نجح السحب",
            description: `تم سحب "${manga.title}" مع ${savedCount} فصل. تم تحميل صفحات ${downloadedChapters} من الفصول الأولى.`,
          });
        }
      } else {
        toast({
          title: "✅ نجح السحب",
          description: `تم سحب "${manga.title}" مع ${savedCount}${partial ? `/${totalCount}` : ''} فصل${partial ? ' (بعض الفصول لم يتم سحبها بسبب الوقت)' : ''}. الصفحات سيتم سحبها عند فتح الفصل.`,
        });
      }

      setProgress(100);
      setProgressMessage("اكتمل السحب بنجاح!");
      
      setUrl("");
      onSuccess();
    } catch (error: any) {
      console.error('Scrape failed:', error);
      
      let errorMsg = error.message || 'حدث خطأ غير معروف';
      
      if (errorMsg.includes('Cloudflare') || errorMsg.includes('CLOUDFLARE')) {
        errorMsg = 'الموقع محمي بـ Cloudflare ولا يمكن السحب منه حالياً. جرب موقع آخر.';
      } else if (errorMsg.includes('403') || errorMsg.includes('Anti-bot')) {
        errorMsg = 'الموقع يمنع السحب الآلي. جرب موقع آخر أو انتظر قليلاً';
      } else if (errorMsg.includes('timeout') || errorMsg.includes('TIMEOUT')) {
        errorMsg = 'انتهت مهلة الاتصال. المانجا قد تكون كبيرة جداً. جرب مرة أخرى.';
      } else if (errorMsg.includes('Network')) {
        errorMsg = 'فقدان الاتصال بالشبكة. تحقق من اتصالك.';
      }
      
      toast({
        title: "❌ فشل السحب",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress(0);
      setProgressMessage("");
    }
  };

  const scrapeCatalog = async () => {
    if (!catalogSource) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار المصدر",
        variant: "destructive",
      });
      return;
    }

    setCatalogLoading(true);
    setProgress(0);
    setProgressMessage("جاري الاتصال بالكتالوج...");
    
    try {
      const source = sources?.find(s => s.name === catalogSource);
      
      console.log(`Starting catalog scrape: ${catalogSource}`);
      
      setProgress(20);
      setProgressMessage("جاري البحث عن المانجا في الكتالوج...");
      
      const { data: response, error } = await supabase.functions.invoke('scrape-lekmanga', {
        body: {
          url: source?.base_url,
          jobType: 'catalog',
          source: catalogSource,
          limit: parseInt(catalogLimit),
        },
      });

      if (error) {
        console.error('Catalog error:', error);
        throw error;
      }

      setProgress(60);
      setProgressMessage("جاري سحب بيانات المانجا...");

      console.log('Catalog response:', response);

      const mangaUrls = response?.mangaUrls || [];
      const count = response?.count || 0;

      if (count === 0) {
        throw new Error('لم يتم العثور على أي مانجا في الكتالوج');
      }

      setProgress(100);
      setProgressMessage("اكتمل سحب الكتالوج!");

      toast({
        title: "✅ تم سحب الكتالوج",
        description: `تم سحب ${count} مانجا بنجاح مع جميع الفصول والصور`,
      });

      // Show URLs in console for debugging
      console.log('Found manga URLs:', mangaUrls);

      onSuccess();
    } catch (error: any) {
      console.error('Catalog failed:', error);
      
      let errorMsg = error.message || 'حدث خطأ غير معروف';
      
      if (errorMsg.includes('Cloudflare') || errorMsg.includes('403')) {
        errorMsg = 'الموقع محمي ولا يمكن السحب منه. جرب onma.top';
      }
      
      toast({
        title: "❌ فشل سحب الكتالوج",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setCatalogLoading(false);
      setProgress(0);
      setProgressMessage("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Scrape from URL */}
      <Card className="p-6 bg-card border-border">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">سحب من رابط</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اختر المصدر</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الموقع" />
                </SelectTrigger>
                <SelectContent>
                  {sources?.map(source => (
                    <SelectItem key={source.id} value={source.name || source.id}>
                      {source.name} - {source.base_url}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>رابط المانجا</Label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/manga/name"
                dir="ltr"
              />
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                id="auto-download-pages"
                checked={autoDownloadPages}
                onChange={(e) => setAutoDownloadPages(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="auto-download-pages" className="text-sm cursor-pointer">
                تحميل صفحات الفصول تلقائياً (أول 10 فصول)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              إذا فعلت هذا الخيار، سيتم تحميل صفحات أول 10 فصول مباشرة (يأخذ وقت أطول)
            </p>

            {loading && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{progressMessage}</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleScrape} 
              disabled={loading || !url || !selectedSource}
              className="w-full"
            >
              {loading ? "جاري السحب..." : "سحب"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Catalog Scraping */}
      <Card className="p-6 bg-card border-border">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">سحب من الكتالوج</h3>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-400">
              💡 سحب الكتالوج يعثر على روابط المانجا من الصفحة الرئيسية. بعدها يمكنك سحب كل مانجا على حدة
            </p>
          </div>
          
          {selectedSource === 'lekmanga' && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-400">
                ⚠️ تحذير: موقع lekmanga محمي بـ Cloudflare وقد لا يعمل السحب منه
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اختر المصدر</Label>
              <Select value={catalogSource} onValueChange={setCatalogSource}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الموقع" />
                </SelectTrigger>
                <SelectContent>
                  {sources?.map(source => (
                    <SelectItem key={source.id} value={source.name || source.id}>
                      {source.name} - {source.base_url}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>عدد المانجا</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={catalogLimit}
                onChange={(e) => setCatalogLimit(e.target.value)}
                placeholder="20"
              />
              <p className="text-xs text-muted-foreground">
                تحديد: يمكنك سحب من 1 إلى 50 مانجا في المرة الواحدة
              </p>
            </div>

            {catalogLoading && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{progressMessage}</span>
                </div>
              </div>
            )}

            <Button 
              onClick={scrapeCatalog} 
              disabled={catalogLoading || !catalogSource}
              className="w-full"
            >
              {catalogLoading ? "جاري السحب من الكتالوج..." : "سحب من الكتالوج"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
