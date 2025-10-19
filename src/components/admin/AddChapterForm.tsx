import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const AddChapterForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mangaList, setMangaList] = useState<any[]>([]);
  const [selectedManga, setSelectedManga] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [pageFiles, setPageFiles] = useState<File[]>([]);
  const [pagePreviews, setPagePreviews] = useState<string[]>([]);

  useEffect(() => {
    fetchManga();
  }, []);

  const fetchManga = async () => {
    const { data, error } = await supabase
      .from("manga")
      .select("id, title")
      .order("title");

    if (!error && data) {
      setMangaList(data);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPageFiles(prev => [...prev, ...files]);

    // Generate previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePage = (index: number) => {
    setPageFiles(prev => prev.filter((_, i) => i !== index));
    setPagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedManga) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار مانجا",
        variant: "destructive",
      });
      return;
    }

    if (pageFiles.length === 0) {
      toast({
        title: "خطأ",
        description: "الرجاء رفع صور الفصل",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Insert chapter
      const { data: chapter, error: chapterError } = await supabase
        .from('chapters')
        .insert({
          manga_id: selectedManga,
          chapter_number: parseFloat(chapterNumber),
          title: chapterTitle || `الفصل ${chapterNumber}`,
          source_url: '',
        })
        .select()
        .single();

      if (chapterError) throw chapterError;

      // Upload pages
      const pagePromises = pageFiles.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${chapter.id}_page_${index + 1}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('chapter-pages')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chapter-pages')
          .getPublicUrl(fileName);

        return {
          chapter_id: chapter.id,
          page_number: index + 1,
          image_url: publicUrl,
        };
      });

      const pages = await Promise.all(pagePromises);

      // Insert pages
      const { error: pagesError } = await supabase
        .from('chapter_pages')
        .insert(pages);

      if (pagesError) throw pagesError;

      toast({
        title: "تم بنجاح",
        description: `تمت إضافة الفصل ${chapterNumber} بنجاح`,
      });

      // Reset form
      setSelectedManga("");
      setChapterNumber("");
      setChapterTitle("");
      setPageFiles([]);
      setPagePreviews([]);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
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
          <Select value={selectedManga} onValueChange={setSelectedManga}>
            <SelectTrigger>
              <SelectValue placeholder="اختر المانجا" />
            </SelectTrigger>
            <SelectContent>
              {mangaList.map(manga => (
                <SelectItem key={manga.id} value={manga.id}>
                  {manga.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>رقم الفصل *</Label>
            <Input
              type="number"
              step="0.1"
              required
              value={chapterNumber}
              onChange={(e) => setChapterNumber(e.target.value)}
              placeholder="1 أو 1.5"
            />
          </div>

          <div className="space-y-2">
            <Label>عنوان الفصل</Label>
            <Input
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="اختياري"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>صور الفصل *</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="chapter-pages"
            />
            <label htmlFor="chapter-pages" className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="w-8 h-8" />
              <span className="text-sm">اضغط لرفع صور الفصل (يمكنك اختيار أكثر من صورة)</span>
              <span className="text-xs">تم رفع {pageFiles.length} صورة</span>
            </label>
          </div>

          {pagePreviews.length > 0 && (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mt-4">
              {pagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img src={preview} alt={`Page ${index + 1}`} className="w-full h-24 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => removePage(index)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "جاري الإضافة..." : "إضافة الفصل"}
        </Button>
      </form>
    </Card>
  );
};