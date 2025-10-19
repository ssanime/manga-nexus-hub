import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const COMMON_GENRES = [
  "أكشن", "مغامرة", "كوميدي", "دراما", "فانتازيا", "رعب", 
  "رومانسي", "خيال علمي", "إثارة", "رياضة", "شريحة من الحياة",
  "خارق للطبيعة", "غموض", "نفسي", "مدرسي"
];

export const AddMangaForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    alternative_titles: "",
    description: "",
    author: "",
    artist: "",
    status: "ongoing",
    cover_url: "",
    rating: "",
    year: "",
  });

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addGenre = (genre: string) => {
    if (!selectedGenres.includes(genre)) {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const removeGenre = (genre: string) => {
    setSelectedGenres(selectedGenres.filter(g => g !== genre));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let coverUrl = formData.cover_url;

      // Upload cover if file selected
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('manga-covers')
          .upload(fileName, coverFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('manga-covers')
          .getPublicUrl(fileName);

        coverUrl = publicUrl;
      }

      // Insert manga
      const { error: insertError } = await supabase
        .from('manga')
        .insert({
          title: formData.title,
          slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-'),
          alternative_titles: formData.alternative_titles ? formData.alternative_titles.split(',').map(t => t.trim()) : null,
          description: formData.description || null,
          author: formData.author || null,
          artist: formData.artist || null,
          status: formData.status,
          cover_url: coverUrl || null,
          genres: selectedGenres.length > 0 ? selectedGenres : null,
          rating: formData.rating ? parseFloat(formData.rating) : 0,
          year: formData.year ? parseInt(formData.year) : null,
          source: 'manual',
          source_url: '',
        });

      if (insertError) throw insertError;

      toast({
        title: "تم بنجاح",
        description: "تمت إضافة المانجا بنجاح",
      });

      // Reset form
      setFormData({
        title: "",
        slug: "",
        alternative_titles: "",
        description: "",
        author: "",
        artist: "",
        status: "ongoing",
        cover_url: "",
        rating: "",
        year: "",
      });
      setCoverFile(null);
      setCoverPreview("");
      setSelectedGenres([]);
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
        <div className="grid gap-6 md:grid-cols-2">
          {/* Cover Upload */}
          <div className="space-y-2 md:col-span-2">
            <Label>صورة الغلاف</Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Preview" className="h-32 object-cover rounded" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8" />
                        <span className="text-sm">اضغط لرفع صورة</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <Input
                  placeholder="أو أدخل رابط الصورة"
                  value={formData.cover_url}
                  onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>العنوان *</Label>
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="اسم المانجا"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label>المعرّف (Slug)</Label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="يتم توليده تلقائياً من العنوان"
              dir="ltr"
            />
          </div>

          {/* Alternative Titles */}
          <div className="space-y-2 md:col-span-2">
            <Label>العناوين البديلة</Label>
            <Input
              value={formData.alternative_titles}
              onChange={(e) => setFormData({ ...formData, alternative_titles: e.target.value })}
              placeholder="افصل بين العناوين بفاصلة"
            />
          </div>

          {/* Author & Artist */}
          <div className="space-y-2">
            <Label>الكاتب</Label>
            <Input
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="اسم الكاتب"
            />
          </div>

          <div className="space-y-2">
            <Label>الرسام</Label>
            <Input
              value={formData.artist}
              onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
              placeholder="اسم الرسام"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>الحالة</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ongoing">مستمرة</SelectItem>
                <SelectItem value="completed">مكتملة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rating & Year */}
          <div className="space-y-2">
            <Label>التقييم (0-10)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              placeholder="8.5"
            />
          </div>

          <div className="space-y-2">
            <Label>السنة</Label>
            <Input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              placeholder="2024"
            />
          </div>

          {/* Genres */}
          <div className="space-y-2 md:col-span-2">
            <Label>التصنيفات</Label>
            <Select onValueChange={addGenre}>
              <SelectTrigger>
                <SelectValue placeholder="اختر التصنيفات" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_GENRES.map(genre => (
                  <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedGenres.map(genre => (
                <Badge key={genre} variant="secondary" className="gap-1">
                  {genre}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeGenre(genre)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 md:col-span-2">
            <Label>القصة</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="وصف المانجا والقصة..."
              rows={6}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "جاري الإضافة..." : "إضافة المانجا"}
        </Button>
      </form>
    </Card>
  );
};