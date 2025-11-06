import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Star, Edit, Trash2, TrendingUp, Flame } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  const toggleCategory = async (id: string, category: string, currentGenres: string[]) => {
    const genres = currentGenres || [];
    const hasCategory = genres.includes(category);
    
    const updatedGenres = hasCategory
      ? genres.filter(g => g !== category)
      : [...genres, category];

    const { error } = await supabase
      .from('manga')
      .update({ genres: updatedGenres })
      .eq('id', id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث التصنيف",
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم بنجاح",
        description: hasCategory ? `تمت إزالة من ${category}` : `تمت الإضافة إلى ${category}`,
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

  const deleteManga = async (id: string) => {
    // First delete all chapters and their pages
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id')
      .eq('manga_id', id);

    if (chapters) {
      for (const chapter of chapters) {
        await supabase
          .from('chapter_pages')
          .delete()
          .eq('chapter_id', chapter.id);
      }

      await supabase
        .from('chapters')
        .delete()
        .eq('manga_id', id);
    }

    // Delete manga
    const { error } = await supabase
      .from('manga')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({
        title: "تم الحذف",
        description: "تم حذف المانجا بنجاح",
      });
      fetchManga();
    } else {
      toast({
        title: "خطأ",
        description: "فشل حذف المانجا",
        variant: "destructive",
      });
    }
  };

  const deleteChapter = async (mangaId: string, chapterId: string) => {
    // Delete chapter pages first
    await supabase
      .from('chapter_pages')
      .delete()
      .eq('chapter_id', chapterId);

    // Delete chapter
    const { error } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId);

    if (!error) {
      toast({
        title: "تم الحذف",
        description: "تم حذف الفصل بنجاح",
      });
      fetchManga();
    } else {
      toast({
        title: "خطأ",
        description: "فشل حذف الفصل",
        variant: "destructive",
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

              <div className="space-y-4">
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

                {/* Categories Management */}
                <div className="border-t border-border pt-4">
                  <Label className="text-sm font-semibold mb-3 block">التصنيفات</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={item.genres?.includes('الأعمال الرائجة') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleCategory(item.id, 'الأعمال الرائجة', item.genres || [])}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      الأعمال الرائجة
                    </Button>
                    <Button
                      variant={item.genres?.includes('الأعمال الشعبية') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleCategory(item.id, 'الأعمال الشعبية', item.genres || [])}
                    >
                      <Flame className="h-4 w-4 mr-2" />
                      الأعمال الشعبية
                    </Button>
                    <Button
                      variant={item.genres?.includes('المانجا المشهورة') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleCategory(item.id, 'المانجا المشهورة', item.genres || [])}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      المانجا المشهورة
                    </Button>
                  </div>
                </div>

                {/* Edit Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <Edit className="h-4 w-4 mr-2" />
                      تعديل معلومات المانجا
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>تعديل: {item.title}</DialogTitle>
                    </DialogHeader>
                    <EditMangaForm manga={item} onUpdate={fetchManga} />
                  </DialogContent>
                </Dialog>

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        إدارة الفصول
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>إدارة فصول: {item.title}</DialogTitle>
                      </DialogHeader>
                      <ChaptersList mangaId={item.id} onDeleteChapter={deleteChapter} />
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        حذف المانجا
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          سيتم حذف المانجا وجميع فصولها نهائياً. لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteManga(item.id)}>
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

const ChaptersList = ({ mangaId, onDeleteChapter }: { mangaId: string; onDeleteChapter: (mangaId: string, chapterId: string) => void }) => {
  const [chapters, setChapters] = useState<any[]>([]);

  useEffect(() => {
    fetchChapters();
  }, [mangaId]);

  const fetchChapters = async () => {
    const { data } = await supabase
      .from('chapters')
      .select('*')
      .eq('manga_id', mangaId)
      .order('chapter_number', { ascending: false });

    if (data) {
      setChapters(data);
    }
  };

  return (
    <div className="space-y-2">
      {chapters.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">لا توجد فصول</p>
      ) : (
        chapters.map((chapter) => (
          <div key={chapter.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <p className="font-semibold">الفصل {chapter.chapter_number}</p>
              {chapter.title && <p className="text-sm text-muted-foreground">{chapter.title}</p>}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف الفصل؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم حذف الفصل {chapter.chapter_number} نهائياً.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDeleteChapter(mangaId, chapter.id)}>
                    حذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))
      )}
    </div>
  );
};

const EditMangaForm = ({ manga, onUpdate }: { manga: any; onUpdate: () => void }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: manga.title || '',
    description: manga.description || '',
    author: manga.author || '',
    artist: manga.artist || '',
    status: manga.status || 'ongoing',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('manga')
      .update(formData)
      .eq('id', manga.id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث المانجا",
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم بنجاح",
        description: "تم تحديث معلومات المانجا",
      });
      onUpdate();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>العنوان</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>الوصف</Label>
        <textarea
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>المؤلف</Label>
          <Input
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
          />
        </div>

        <div>
          <Label>الرسام</Label>
          <Input
            value={formData.artist}
            onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>الحالة</Label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        >
          <option value="ongoing">مستمر</option>
          <option value="completed">مكتمل</option>
          <option value="hiatus">متوقف</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      <Button type="submit" className="w-full">
        حفظ التغييرات
      </Button>
    </form>
  );
};
