import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Star, Edit, Trash2, TrendingUp } from "lucide-react";

export const MangaManager = () => {
  const { toast } = useToast();
  const [manga, setManga] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManga();
  }, []);

  const fetchManga = async () => {
    const { data, error } = await supabase
      .from('manga')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setManga(data);
    }
    setLoading(false);
  };

  const toggleFeatured = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('manga')
      .update({ is_featured: !currentValue })
      .eq('id', id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث الحالة",
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم بنجاح",
        description: !currentValue ? "تمت إضافة المانجا للمميزة" : "تمت إزالة المانجا من المميزة",
      });
      fetchManga();
    }
  };

  const updateRating = async (id: string, newRating: number) => {
    const { error } = await supabase
      .from('manga')
      .update({ rating: newRating })
      .eq('id', id);

    if (!error) {
      fetchManga();
      toast({
        title: "تم التحديث",
        description: "تم تحديث التقييم",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      {manga.map((item) => (
        <Card key={item.id} className="p-6 bg-card border-border">
          <div className="flex gap-4">
            {item.cover_url && (
              <img 
                src={item.cover_url} 
                alt={item.title}
                className="w-20 h-28 object-cover rounded"
              />
            )}
            
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground text-lg">{item.title}</h3>
                <div className="flex gap-2 mt-2">
                  <Badge>{item.status}</Badge>
                  <Badge variant="outline">{item.chapter_count || 0} فصل</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={item.is_featured}
                    onCheckedChange={() => toggleFeatured(item.id, item.is_featured)}
                  />
                  <Label className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    مانجا مميزة
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Label>التقييم:</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={item.rating || 0}
                    onChange={(e) => updateRating(item.id, parseFloat(e.target.value))}
                    className="w-20"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
