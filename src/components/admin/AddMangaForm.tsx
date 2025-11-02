import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X, Upload, Search, Image as ImageIcon, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const AddMangaForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreSearch, setGenreSearch] = useState("");
  
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [newGenre, setNewGenre] = useState("");
  const [userTeams, setUserTeams] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    alternative_titles: "",
    description: "",
    author: "",
    artist: "",
    status: "ongoing",
    cover_url: "",
    banner_url: "",
    publisher: "",
    country: "",
    release_date: "",
    language: "العربية",
    reading_direction: "rtl",
    rating: "",
    year: "",
    type: "manga",
    is_featured: false,
    publish_status: "published",
    sort_order: "0",
    team_id: "",
    external_links: {
      mal: "",
      anilist: "",
      official: "",
    },
  });

  useEffect(() => {
    fetchGenres();
    fetchUserTeams();
  }, []);

  const fetchUserTeams = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          teams (id, name, slug)
        `)
        .eq('user_id', user.id)
        .in('role', ['leader', 'manager']);
      
      if (data) {
        setUserTeams(data.map((tm: any) => tm.teams).filter(Boolean));
      }
    }
  };

  const fetchGenres = async () => {
    const { data, error } = await supabase
      .from('genres')
      .select('name')
      .order('name');
    
    if (!error && data) {
      setAvailableGenres(data.map(g => g.name));
    }
  };

  const addNewGenre = async () => {
    if (!newGenre.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال اسم التصنيف",
        variant: "destructive",
      });
      return;
    }

    if (availableGenres.includes(newGenre.trim())) {
      toast({
        title: "تنبيه",
        description: "هذا التصنيف موجود بالفعل",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('genres')
      .insert({ name: newGenre.trim() });
    
    if (error) {
      toast({
        title: "خطأ",
        description: "فشل إضافة التصنيف",
        variant: "destructive",
      });
    } else {
      toast({
        title: "نجح",
        description: "تم إضافة التصنيف بنجاح",
      });
      await fetchGenres();
      setSelectedGenres([...selectedGenres, newGenre.trim()]);
      setNewGenre("");
    }
  };

  const filteredGenres = availableGenres.filter(genre => 
    genre.toLowerCase().includes(genreSearch.toLowerCase())
  );

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

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setGalleryFiles(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGalleryPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeGalleryImage = (index: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
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
      const { data: { user } } = await supabase.auth.getUser();
      let coverUrl = formData.cover_url;
      let bannerUrl = formData.banner_url;
      let galleryUrls: string[] = [];

      // Upload cover if file selected
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('manga-covers')
          .upload(fileName, coverFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('manga-covers')
          .getPublicUrl(fileName);

        coverUrl = publicUrl;
      }

      // Upload banner if file selected
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `banner_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('manga-covers')
          .upload(fileName, bannerFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('manga-covers')
          .getPublicUrl(fileName);

        bannerUrl = publicUrl;
      }

      // Upload gallery images
      for (const file of galleryFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `gallery_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('manga-covers')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('manga-covers')
          .getPublicUrl(fileName);

        galleryUrls.push(publicUrl);
      }

      // Insert manga
      const finalSlug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
      const manualSourceUrl = `${window.location.origin}/manga/${finalSlug}`;
      
      const { error: insertError } = await supabase
        .from('manga')
        .insert({
          title: formData.title,
          slug: finalSlug,
          alternative_titles: formData.alternative_titles ? formData.alternative_titles.split(',').map(t => t.trim()) : null,
          description: formData.description || null,
          author: formData.author || null,
          artist: formData.artist || null,
          status: formData.status,
          cover_url: coverUrl || null,
          banner_url: bannerUrl || null,
          gallery: galleryUrls.length > 0 ? galleryUrls : null,
          publisher: formData.publisher || null,
          country: formData.country || null,
          release_date: formData.release_date || null,
          language: formData.language,
          reading_direction: formData.reading_direction,
          genres: selectedGenres.length > 0 ? selectedGenres : null,
          tags: tags.length > 0 ? tags : null,
          rating: formData.rating ? parseFloat(formData.rating) : 0,
          year: formData.year ? parseInt(formData.year) : null,
          source: 'manual',
          source_url: manualSourceUrl,
          is_featured: formData.is_featured,
          publish_status: formData.publish_status,
          sort_order: parseInt(formData.sort_order),
          team_id: formData.team_id || null,
          external_links: formData.external_links,
          last_modified_by: user?.id,
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
        banner_url: "",
        publisher: "",
        country: "",
        release_date: "",
        language: "العربية",
        reading_direction: "rtl",
        rating: "",
        year: "",
        type: "manga",
        is_featured: false,
        publish_status: "published",
        sort_order: "0",
        team_id: "",
        external_links: { mal: "", anilist: "", official: "" },
      });
      setCoverFile(null);
      setCoverPreview("");
      setBannerFile(null);
      setBannerPreview("");
      setGalleryFiles([]);
      setGalleryPreviews([]);
      setSelectedGenres([]);
      setTags([]);
      setGenreSearch("");
      setTagInput("");
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

          {/* Banner Upload */}
          <div className="space-y-2 md:col-span-2">
            <Label>🖼️ صورة البانر (Header Image)</Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    {bannerPreview ? (
                      <img src={bannerPreview} alt="Banner Preview" className="h-24 w-full object-cover rounded" />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-sm">اضغط لرفع صورة البانر</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <Input
                  placeholder="أو أدخل رابط صورة البانر"
                  value={formData.banner_url}
                  onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Gallery Upload */}
          <div className="space-y-2 md:col-span-2">
            <Label>📸 معرض الصور (Gallery)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryChange}
                className="hidden"
                id="gallery-upload"
              />
              <label htmlFor="gallery-upload" className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="w-8 h-8" />
                <span className="text-sm">اضغط لرفع صور (يمكن رفع عدة صور)</span>
              </label>
              {galleryPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {galleryPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img src={preview} alt={`Gallery ${index}`} className="h-24 w-full object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

          {/* Type */}
          <div className="space-y-2">
            <Label>النوع</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manga">مانجا يابانية</SelectItem>
                <SelectItem value="manhwa">مانهوا كورية</SelectItem>
                <SelectItem value="manhua">مانها صينية</SelectItem>
              </SelectContent>
            </Select>
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

          {/* Publisher */}
          <div className="space-y-2">
            <Label>🏷️ الناشر/الفريق</Label>
            <Input
              value={formData.publisher}
              onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
              placeholder="اسم الفريق المترجم"
            />
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label>🌍 بلد الأصل</Label>
            <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الدولة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="japan">اليابان</SelectItem>
                <SelectItem value="korea">كوريا</SelectItem>
                <SelectItem value="china">الصين</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Release Date */}
          <div className="space-y-2">
            <Label>📅 تاريخ الإصدار</Label>
            <Input
              type="date"
              value={formData.release_date}
              onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
            />
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label>🔠 لغة الترجمة</Label>
            <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="العربية">العربية</SelectItem>
                <SelectItem value="الإنجليزية">الإنجليزية</SelectItem>
                <SelectItem value="الفرنسية">الفرنسية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reading Direction */}
          <div className="space-y-2">
            <Label>🧭 اتجاه القراءة</Label>
            <Select value={formData.reading_direction} onValueChange={(value) => setFormData({ ...formData, reading_direction: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rtl">من اليمين إلى اليسار</SelectItem>
                <SelectItem value="ltr">من اليسار إلى اليمين</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Team Selection */}
          {userTeams.length > 0 && (
            <div className="space-y-2 md:col-span-2">
              <Label>👥 الفريق (اختياري)</Label>
              <Select value={formData.team_id} onValueChange={(value) => setFormData({ ...formData, team_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفريق أو اترك فارغاً" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون فريق</SelectItem>
                  {userTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Genres */}
          <div className="space-y-2 md:col-span-2">
            <Label>التصنيفات ({availableGenres.length} تصنيف متاح)</Label>
            
            {/* Add new genre */}
            <div className="flex gap-2 mb-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Input
                placeholder="إضافة تصنيف جديد..."
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addNewGenre();
                  }
                }}
              />
              <Button
                type="button"
                onClick={addNewGenre}
                variant="default"
                className="whitespace-nowrap"
              >
                إضافة تصنيف
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={genreSearch}
                onChange={(e) => setGenreSearch(e.target.value)}
                placeholder="ابحث عن تصنيف..."
                className="pr-10"
              />
            </div>
            <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {filteredGenres.slice(0, 50).map(genre => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => addGenre(genre)}
                    disabled={selectedGenres.includes(genre)}
                    className={`text-sm p-2 rounded border transition-colors text-right ${
                      selectedGenres.includes(genre)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-accent border-border'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
            {filteredGenres.length > 50 && (
              <p className="text-xs text-muted-foreground">
                عرض 50 من {filteredGenres.length} تصنيف - استخدم البحث لتضييق النتائج
              </p>
            )}
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

          {/* Tags / Keywords */}
          <div className="space-y-2 md:col-span-2">
            <Label>🔖 الكلمات المفتاحية (Tags)</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="أضف كلمة مفتاحية واضغط Enter"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" onClick={addTag} variant="outline">
                إضافة
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* External Links */}
          <div className="space-y-4 md:col-span-2 p-4 border border-border rounded-lg">
            <h3 className="font-semibold flex items-center gap-2">
              🔗 روابط خارجية
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>MyAnimeList</Label>
                <Input
                  value={formData.external_links.mal}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    external_links: { ...formData.external_links, mal: e.target.value }
                  })}
                  placeholder="https://myanimelist.net/..."
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>AniList</Label>
                <Input
                  value={formData.external_links.anilist}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    external_links: { ...formData.external_links, anilist: e.target.value }
                  })}
                  placeholder="https://anilist.co/..."
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>الموقع الرسمي</Label>
                <Input
                  value={formData.external_links.official}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    external_links: { ...formData.external_links, official: e.target.value }
                  })}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Admin Tools */}
          <div className="space-y-4 md:col-span-2 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
            <h3 className="font-semibold flex items-center gap-2">
              🧑‍💻 أدوات الإدارة
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  مميز (Featured)
                </Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.is_featured ? 'نعم' : 'لا'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>🗂️ ترتيب الظهور</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>🔒 حالة النشر</Label>
                <Select value={formData.publish_status} onValueChange={(value) => setFormData({ ...formData, publish_status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">منشورة</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="hidden">مخفية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "جاري الإضافة..." : "إضافة المانجا"}
        </Button>
      </form>
    </Card>
  );
};
