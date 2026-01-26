import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Star, Edit, Trash2, TrendingUp, Flame, Sparkles } from "lucide-react";
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
import { AIExtractor } from "./AIExtractor";

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
                      variant={item.genres?.includes('رائج') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleCategory(item.id, 'رائج', item.genres || [])}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      الأعمال الرائجة
                    </Button>
                    <Button
                      variant={item.genres?.includes('شعبي') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleCategory(item.id, 'شعبي', item.genres || [])}
                    >
                      <Flame className="h-4 w-4 mr-2" />
                      الأعمال الشعبية
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
                      <Button variant="outline" size="sm" className="bg-primary/10 border-primary/30 hover:bg-primary/20">
                        <Sparkles className="h-4 w-4 mr-2" />
                        استخراج بالذكاء الاصطناعي
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>استخراج معلومات: {item.title}</DialogTitle>
                      </DialogHeader>
                      <AIExtractor 
                        mangaId={item.id} 
                        sourceUrl={item.source_url}
                        onExtracted={() => fetchManga()}
                      />
                    </DialogContent>
                  </Dialog>

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
  
  // Detect work type from genres or country
  const getWorkType = () => {
    const genres = manga.genres || [];
    if (genres.includes('مانهوا') || manga.country === 'korea') return 'manhwa';
    if (genres.includes('مانها') || manga.country === 'china') return 'manhua';
    if (genres.includes('مانجا') || manga.country === 'japan') return 'manga';
    return '';
  };

  const [formData, setFormData] = useState({
    title: manga.title || '',
    description: manga.description || '',
    author: manga.author || '',
    artist: manga.artist || '',
    status: manga.status || 'ongoing',
    cover_url: manga.cover_url || '',
    banner_url: manga.banner_url || '',
    country: manga.country || '',
    publisher: manga.publisher || '',
    year: manga.year || '',
    rating: manga.rating || 0,
    language: manga.language || '',
    reading_direction: manga.reading_direction || 'rtl',
    publish_status: manga.publish_status || 'published',
    alternative_titles: manga.alternative_titles?.join(', ') || '',
    tags: manga.tags?.join(', ') || '',
    work_type: getWorkType(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Map work_type to country
    let country = formData.country;
    if (formData.work_type === 'manga') country = 'japan';
    else if (formData.work_type === 'manhwa') country = 'korea';
    else if (formData.work_type === 'manhua') country = 'china';
    
    // Update genres to include work type
    let existingGenres = manga.genres || [];
    // Remove old work type genres
    existingGenres = existingGenres.filter((g: string) => !['مانجا', 'مانهوا', 'مانها'].includes(g));
    // Add new work type genre
    if (formData.work_type === 'manga' && !existingGenres.includes('مانجا')) {
      existingGenres = ['مانجا', ...existingGenres];
    } else if (formData.work_type === 'manhwa' && !existingGenres.includes('مانهوا')) {
      existingGenres = ['مانهوا', ...existingGenres];
    } else if (formData.work_type === 'manhua' && !existingGenres.includes('مانها')) {
      existingGenres = ['مانها', ...existingGenres];
    }
    
    const updateData: any = {
      title: formData.title,
      description: formData.description,
      author: formData.author || null,
      artist: formData.artist || null,
      status: formData.status,
      cover_url: formData.cover_url || null,
      banner_url: formData.banner_url || null,
      country: country || null,
      publisher: formData.publisher || null,
      year: formData.year ? parseInt(formData.year) : null,
      rating: formData.rating || null,
      language: formData.language || null,
      reading_direction: formData.reading_direction || null,
      publish_status: formData.publish_status || 'published',
      genres: existingGenres,
      alternative_titles: formData.alternative_titles 
        ? formData.alternative_titles.split(',').map((t: string) => t.trim()).filter(Boolean)
        : null,
      tags: formData.tags 
        ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : null,
    };

    const { error } = await supabase
      .from('manga')
      .update(updateData)
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
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>العنوان</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        <div className="col-span-2">
          <Label>الأسماء البديلة (مفصولة بفاصلة)</Label>
          <Input
            value={formData.alternative_titles}
            onChange={(e) => setFormData({ ...formData, alternative_titles: e.target.value })}
            placeholder="الاسم الإنجليزي, الاسم الياباني"
          />
        </div>

        <div className="col-span-2">
          <Label>الوصف</Label>
          <textarea
            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

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

        <div>
          <Label>نوع العمل</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            value={formData.work_type}
            onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
          >
            <option value="">غير محدد</option>
            <option value="manga">مانجا (اليابان)</option>
            <option value="manhwa">مانهوا (كوريا)</option>
            <option value="manhua">مانها (الصين)</option>
          </select>
        </div>

        <div>
          <Label>حالة النشر</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            value={formData.publish_status}
            onChange={(e) => setFormData({ ...formData, publish_status: e.target.value })}
          >
            <option value="published">منشور</option>
            <option value="draft">مسودة</option>
            <option value="pending">قيد المراجعة</option>
          </select>
        </div>

        <div>
          <Label>البلد</Label>
          <Input
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            placeholder="اليابان، كوريا، الصين..."
          />
        </div>

        <div>
          <Label>سنة الإصدار</Label>
          <Input
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            min="1900"
            max="2030"
          />
        </div>

        <div>
          <Label>التقييم</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div>
          <Label>الناشر</Label>
          <Input
            value={formData.publisher}
            onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
          />
        </div>

        <div>
          <Label>اللغة</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
          >
            <option value="">غير محدد</option>
            <option value="ar">العربية</option>
            <option value="ja">اليابانية</option>
            <option value="ko">الكورية</option>
            <option value="zh">الصينية</option>
            <option value="en">الإنجليزية</option>
          </select>
        </div>

        <div>
          <Label>اتجاه القراءة</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            value={formData.reading_direction}
            onChange={(e) => setFormData({ ...formData, reading_direction: e.target.value })}
          >
            <option value="rtl">من اليمين لليسار (مانجا)</option>
            <option value="ltr">من اليسار لليمين (مانهوا/ويب تون)</option>
          </select>
        </div>

        <div className="col-span-2">
          <Label>رابط الغلاف</Label>
          <Input
            value={formData.cover_url}
            onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
            dir="ltr"
          />
        </div>

        <div className="col-span-2">
          <Label>رابط البانر</Label>
          <Input
            value={formData.banner_url}
            onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
            dir="ltr"
          />
        </div>

        <div className="col-span-2">
          <Label>الوسوم (مفصولة بفاصلة)</Label>
          <Input
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="أكشن, مغامرات, خيال"
          />
        </div>
      </div>

      <Button type="submit" className="w-full">
        حفظ التغييرات
      </Button>
    </form>
  );
};
