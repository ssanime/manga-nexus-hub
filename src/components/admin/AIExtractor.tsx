import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, CheckCircle2, Link2 } from "lucide-react";

interface AIExtractorProps {
  mangaId?: string;
  sourceUrl?: string;
  onExtracted?: (data: any) => void;
}

export const AIExtractor = ({ mangaId, sourceUrl, onExtracted }: AIExtractorProps) => {
  const { toast } = useToast();
  const [url, setUrl] = useState(sourceUrl || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const extractInfo = async () => {
    if (!url) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال رابط صفحة المانجا",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      toast({
        title: "جاري الاستخراج",
        description: "يقوم الذكاء الاصطناعي باستخراج المعلومات...",
      });

      const response = await supabase.functions.invoke("extract-manga-info", {
        body: { url, mangaId },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      if (response.error) {
        throw new Error(response.error.message || "فشل استخراج المعلومات");
      }

      if (response.data?.success) {
        setResult(response.data.data);
        toast({
          title: "تم بنجاح",
          description: "تم استخراج معلومات المانجا بالذكاء الاصطناعي",
        });
        
        if (onExtracted) {
          onExtracted(response.data.data);
        }
      } else {
        throw new Error(response.data?.error || "فشل استخراج المعلومات");
      }
    } catch (error: any) {
      console.error("Extraction error:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل استخراج المعلومات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-primary/20 p-3">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">استخراج تلقائي بالذكاء الاصطناعي</h3>
          <p className="text-sm text-muted-foreground">
            أدخل رابط صفحة المانجا وسيقوم AI باستخراج القصة والتصنيفات والمعلومات الأخرى
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>رابط صفحة المانجا</Label>
          <div className="flex gap-2">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/manga/title"
              dir="ltr"
              className="flex-1"
            />
            <Button onClick={extractInfo} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري...
                </>
              ) : (
                <>
                  <Sparkles className="ml-2 h-4 w-4" />
                  استخراج
                </>
              )}
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-3 rounded-lg border border-primary/20 bg-card p-4">
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">تم الاستخراج بنجاح</span>
            </div>
            
            <div className="grid gap-3 text-sm">
              {result.title && (
                <div>
                  <span className="font-semibold text-muted-foreground">العنوان:</span>{" "}
                  {result.title}
                </div>
              )}
              {result.description && (
                <div>
                  <span className="font-semibold text-muted-foreground">القصة:</span>
                  <p className="mt-1 rounded bg-muted/50 p-2 text-xs leading-relaxed">
                    {result.description.substring(0, 300)}
                    {result.description.length > 300 && "..."}
                  </p>
                </div>
              )}
              {result.genres?.length > 0 && (
                <div>
                  <span className="font-semibold text-muted-foreground">التصنيفات:</span>{" "}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.genres.map((genre: string, i: number) => (
                      <span
                        key={i}
                        className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.author && (
                <div>
                  <span className="font-semibold text-muted-foreground">المؤلف:</span>{" "}
                  {result.author}
                </div>
              )}
              {result.artist && (
                <div>
                  <span className="font-semibold text-muted-foreground">الرسام:</span>{" "}
                  {result.artist}
                </div>
              )}
              {result.status && (
                <div>
                  <span className="font-semibold text-muted-foreground">الحالة:</span>{" "}
                  {result.status === "ongoing" ? "مستمر" : "مكتمل"}
                </div>
              )}
              {result.year && (
                <div>
                  <span className="font-semibold text-muted-foreground">سنة الإصدار:</span>{" "}
                  {result.year}
                </div>
              )}
              {result.country && (
                <div>
                  <span className="font-semibold text-muted-foreground">البلد:</span>{" "}
                  {result.country === "japan"
                    ? "اليابان"
                    : result.country === "korea"
                    ? "كوريا"
                    : result.country === "china"
                    ? "الصين"
                    : result.country}
                </div>
              )}
            </div>

            {mangaId && (
              <p className="text-xs text-green-600">
                ✓ تم تحديث معلومات المانجا في قاعدة البيانات تلقائياً
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
