import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const ScrapeFromURL = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [catalogSource, setCatalogSource] = useState<string>("");
  const [catalogLimit, setCatalogLimit] = useState("20");

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
    try {
      // First scrape manga info
      const { data: mangaData, error: mangaError } = await supabase.functions.invoke('scrape-lekmanga', {
        body: {
          url,
          jobType: 'manga_info',
          source: selectedSource,
        },
      });

      if (mangaError) throw mangaError;

      toast({
        title: "نجح",
        description: "نجح سحب معلومات المانجا",
      });

      // Then scrape chapters
      const { data: chaptersData, error: chaptersError } = await supabase.functions.invoke('scrape-lekmanga', {
        body: {
          url,
          jobType: 'chapters',
          source: selectedSource,
        },
      });

      if (chaptersError) throw chaptersError;

      const chapterCount = chaptersData?.data?.length || 0;
      
      toast({
        title: "نجح",
        description: `تم سحب ${chapterCount} فصل للمانجا`,
      });

      setUrl("");
      onSuccess();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: `خطأ: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    try {
      const source = sources?.find(s => s.name === catalogSource);
      
      const { data, error } = await supabase.functions.invoke('scrape-lekmanga', {
        body: {
          url: source?.base_url,
          jobType: 'catalog',
          source: catalogSource,
          limit: parseInt(catalogLimit),
        },
      });

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: `تم سحب ${data?.data?.length || 0} مانجا من الكتالوج`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: `خطأ: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setCatalogLoading(false);
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
                    <SelectItem key={source.id} value={source.name}>
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
          
          <p className="text-sm text-muted-foreground mb-4">
            سحب عدة مانجا مع فصولها من الصفحة الرئيسية للموقع
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اختر المصدر</Label>
              <Select value={catalogSource} onValueChange={setCatalogSource}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الموقع" />
                </SelectTrigger>
                <SelectContent>
                  {sources?.map(source => (
                    <SelectItem key={source.id} value={source.name}>
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
