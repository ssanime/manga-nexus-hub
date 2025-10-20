import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit2, Check, X, Globe } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface Source {
  id: string;
  name: string;
  base_url: string;
  is_active: boolean;
  config: any;
  created_at: string;
}

export const SourcesManager = () => {
  const { toast } = useToast();
  const [sources, setSources] = useState<Source[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSource, setNewSource] = useState({
    name: "",
    base_url: "",
    config: JSON.stringify({
      selectors: {
        title: "",
        cover: "",
        description: "",
        status: "",
        genres: "",
        author: "",
        artist: "",
        chapters: "",
        chapterTitle: "a",
        chapterUrl: "a",
        chapterDate: "",
        pageImages: ""
      }
    }, null, 2)
  });

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    const { data, error } = await supabase
      .from("scraper_sources")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sources:", error);
      toast({
        title: "خطأ",
        description: "فشل جلب المصادر",
        variant: "destructive",
      });
    } else {
      setSources(data || []);
    }
  };

  const handleAddSource = async () => {
    try {
      const config = JSON.parse(newSource.config);
      
      const { error } = await supabase
        .from("scraper_sources")
        .insert({
          name: newSource.name.toLowerCase().replace(/\s+/g, '-'),
          base_url: newSource.base_url,
          config,
        });

      if (error) throw error;

      toast({
        title: "نجح",
        description: "تم إضافة المصدر بنجاح",
      });

      setNewSource({
        name: "",
        base_url: "",
        config: JSON.stringify({
          selectors: {
            title: "",
            cover: "",
            description: "",
            status: "",
            genres: "",
            author: "",
            artist: "",
            chapters: "",
            chapterTitle: "a",
            chapterUrl: "a",
            chapterDate: "",
            pageImages: ""
          }
        }, null, 2)
      });
      setIsAdding(false);
      fetchSources();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل إضافة المصدر",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("scraper_sources")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث حالة المصدر",
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم",
        description: !currentStatus ? "تم تفعيل المصدر" : "تم تعطيل المصدر",
      });
      fetchSources();
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المصدر؟")) return;

    const { error } = await supabase
      .from("scraper_sources")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل حذف المصدر",
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم",
        description: "تم حذف المصدر بنجاح",
      });
      fetchSources();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            <Globe className="w-6 h-6 inline-block ml-2" />
            إدارة المصادر
          </h2>
          <p className="text-muted-foreground">
            إدارة مواقع السحب التلقائي للمانجا
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? (
            <>
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 ml-2" />
              إضافة مصدر جديد
            </>
          )}
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                اسم المصدر
              </label>
              <Input
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                placeholder="مثال: mangasite"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                رابط الموقع
              </label>
              <Input
                value={newSource.base_url}
                onChange={(e) => setNewSource({ ...newSource, base_url: e.target.value })}
                placeholder="https://example.com"
                className="bg-background border-border text-foreground"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                إعدادات CSS Selectors (JSON)
              </label>
              <Textarea
                value={newSource.config}
                onChange={(e) => setNewSource({ ...newSource, config: e.target.value })}
                placeholder="JSON configuration"
                className="bg-background border-border text-foreground font-mono min-h-[300px]"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-2">
                قم بتعديل CSS selectors حسب بنية HTML للموقع المستهدف
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddSource} className="flex-1">
                <Check className="w-4 h-4 ml-2" />
                حفظ المصدر
              </Button>
              <Button 
                onClick={() => setIsAdding(false)} 
                variant="outline"
                className="flex-1"
              >
                <X className="w-4 h-4 ml-2" />
                إلغاء
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {sources.length === 0 ? (
          <Card className="p-8 text-center bg-card border-border">
            <p className="text-muted-foreground">لا توجد مصادر بعد</p>
          </Card>
        ) : (
          sources.map((source) => (
            <Card key={source.id} className="p-4 bg-card border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      {source.name}
                    </h3>
                    {source.is_active ? (
                      <Badge className="bg-green-500">مفعّل</Badge>
                    ) : (
                      <Badge variant="secondary">معطّل</Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground font-mono" dir="ltr">
                    {source.base_url}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      Selectors: {Object.keys(source.config?.selectors || {}).length}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {new Date(source.created_at).toLocaleDateString("ar-SA")}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={source.is_active}
                      onCheckedChange={() => handleToggleActive(source.id, source.is_active)}
                    />
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSource(source.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  عرض الإعدادات التفصيلية
                </summary>
                <pre className="mt-2 p-3 bg-background rounded text-xs overflow-auto" dir="ltr">
                  {JSON.stringify(source.config, null, 2)}
                </pre>
              </details>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
