import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Link2, Download, Loader2, Zap, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [useAggressiveMode, setUseAggressiveMode] = useState(true);
  const [retryFailedChapters, setRetryFailedChapters] = useState(true);

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

      // Step 3: Queue pages for background download if enabled
      if (autoDownloadPages && savedCount > 0) {
        setProgress(70);
        setProgressMessage("جاري إضافة الفصول لقائمة التحميل بالخلفية...");
        
        try {
          const { data: queueResult, error: queueError } = await supabase.functions.invoke('queue-all-chapters', {
            body: { mangaId: manga.id, source: selectedSource },
          });

          if (queueError) {
            console.error('Queue error:', queueError);
            toast({
              title: "⚠️ تحذير",
              description: `تم سحب المانجا لكن فشل إضافة الفصول لقائمة التحميل. يمكنك إضافتها يدوياً من صفحة المانجا.`,
            });
          } else {
            toast({
              title: "✅ نجح السحب",
              description: `تم سحب "${manga.title}" مع ${savedCount} فصل. تم إضافة ${queueResult?.queued || 0} فصل لقائمة التحميل بالخلفية.`,
            });
          }
        } catch (qErr: any) {
          console.error('Queue exception:', qErr);
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
        description: `تم إنشاء ${count} مانجا مع فصولها. يمكنك الآن تحميل الصور من صفحة كل مانجا.`,
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

            {/* Advanced Options */}
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-download-pages" className="text-sm cursor-pointer">
                    تحميل صفحات جميع الفصول تلقائياً
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    سيتم سحب الصور في الخلفية حتى بعد إغلاق الصفحة
                  </p>
                </div>
                <Switch
                  id="auto-download-pages"
                  checked={autoDownloadPages}
                  onCheckedChange={setAutoDownloadPages}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="aggressive-mode" className="text-sm cursor-pointer flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    وضع التجاوز القوي
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    تفعيل جميع طرق تجاوز الحماية
                  </p>
                </div>
                <Switch
                  id="aggressive-mode"
                  checked={useAggressiveMode}
                  onCheckedChange={setUseAggressiveMode}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="retry-failed" className="text-sm cursor-pointer">
                    إعادة محاولة الفصول الفاشلة
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    محاولة مرة أخرى للفصول التي فشل سحبها
                  </p>
                </div>
                <Switch
                  id="retry-failed"
                  checked={retryFailedChapters}
                  onCheckedChange={setRetryFailedChapters}
                />
              </div>
            </div>

            {selectedSource?.toLowerCase().includes('lekmanga') && (
              <Alert className="bg-yellow-500/10 border-yellow-500/30">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-sm text-yellow-500/90">
                  موقع lekmanga محمي بشدة. سيتم استخدام Firecrawl + Multi-strategy bypass.
                </AlertDescription>
              </Alert>
            )}

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
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري السحب...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  سحب المانجا مع الفصول
                </>
              )}
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
          
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-400">
              🚀 <strong>سحب تلقائي كامل:</strong> سيتم سحب المانجا + إنشائها في قاعدة البيانات + سحب جميع الفصول تلقائياً.
              يمكنك لاحقاً تحميل صور الفصول بالخلفية.
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
