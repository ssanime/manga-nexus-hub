import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const AddChapterFromSource = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mangaList, setMangaList] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [selectedManga, setSelectedManga] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [chapterUrl, setChapterUrl] = useState("");
  const [autoDownload, setAutoDownload] = useState(true);

  useEffect(() => {
    fetchManga();
    fetchSources();
  }, []);

  const fetchManga = async () => {
    const { data, error } = await supabase
      .from("manga")
      .select("id, title, source")
      .order("title");

    if (!error && data) {
      setMangaList(data);
    }
  };

  const fetchSources = async () => {
    const { data, error } = await supabase
      .from("scraper_sources")
      .select("*")
      .eq("is_active", true);

    if (!error && data) {
      setSources(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedManga || !selectedSource || !chapterUrl) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      toast({
        title: "جاري السحب",
        description: "جاري سحب الفصل من المصدر...",
      });

      // Call edge function to scrape chapter pages
      const response = await supabase.functions.invoke('scrape-lekmanga', {
        body: {
          url: chapterUrl,
          jobType: 'pages',
          source: selectedSource,
          mangaId: selectedManga,
          autoDownload: autoDownload,
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      });

      if (response.error) {
        console.error('Scrape error details:', response.error);
        
        // Better error messages based on error type
        let errorMessage = response.error.message || 'فشل السحب';
        
        if (errorMessage.includes('Cloudflare') || errorMessage.includes('CLOUDFLARE')) {
          errorMessage = '🛡️ الموقع محمي بـ Cloudflare. يرجى التأكد من تفعيل Firecrawl API أو جرب موقع آخر.';
        } else if (errorMessage.includes('403')) {
          errorMessage = '⛔ الموقع يمنع الوصول. قد يكون محمي بـ Cloudflare أو يتطلب تسجيل دخول.';
        } else if (errorMessage.includes('404')) {
          errorMessage = '❌ الرابط غير موجود. تحقق من صحة الرابط.';
        } else if (errorMessage.includes('timeout')) {
          errorMessage = '⏱️ انتهت مهلة الاتصال. حاول مرة أخرى أو جرب فصل أصغر.';
        }
        
        throw new Error(errorMessage);
      }

      toast({
        title: "تم بنجاح",
        description: autoDownload 
          ? "تم سحب الفصل وصفحاته بنجاح"
          : "تم سحب بيانات الفصل. سيتم تحميل الصفحات عند أول قراءة",
      });

      setChapterUrl("");
      onSuccess();
    } catch (error: any) {
      console.error('Error scraping chapter:', error);
      toast({
        title: "خطأ",
        description: error.message || "فشل سحب الفصل",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 bg-card border-border">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label>اختر المانجا *</Label>
          <Select value={selectedManga} onValueChange={(value) => {
            setSelectedManga(value);
            const manga = mangaList.find(m => m.id === value);
            if (manga?.source) {
              setSelectedSource(manga.source);
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="اختر المانجا" />
            </SelectTrigger>
            <SelectContent>
              {mangaList.map(manga => (
                <SelectItem key={manga.id} value={manga.id}>
                  {manga.title}
                  {manga.source && ` (${manga.source})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>اختر المصدر *</Label>
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger>
              <SelectValue placeholder="اختر المصدر" />
            </SelectTrigger>
            <SelectContent>
              {sources.map(source => (
                <SelectItem key={source.id} value={source.name}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            يمكنك سحب فصول من موقع مختلف عن المصدر الأصلي للمانجا
          </p>
        </div>

        <div className="space-y-2">
          <Label>رابط الفصل *</Label>
          <Input
            type="url"
            required
            value={chapterUrl}
            onChange={(e) => setChapterUrl(e.target.value)}
            placeholder="https://example.com/manga/chapter-1"
          />
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          <input
            type="checkbox"
            id="auto-download"
            checked={autoDownload}
            onChange={(e) => setAutoDownload(e.target.checked)}
            className="rounded border-border"
          />
          <Label htmlFor="auto-download" className="text-sm cursor-pointer">
            تحميل صفحات الفصل تلقائياً (موصى به)
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          إذا تم إلغاء التحديد، سيتم تحميل الصفحات عند أول قراءة للفصل
        </p>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري السحب...
            </>
          ) : (
            <>
              <Link2 className="ml-2 h-4 w-4" />
              سحب الفصل من الرابط
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};
