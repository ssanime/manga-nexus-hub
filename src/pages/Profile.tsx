import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Settings, BookMarked, Upload, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const COMMON_GENRES = [
  "أكشن", "مغامرة", "كوميدي", "دراما", "فانتازيا", "رعب", 
  "رومانسي", "خيال علمي", "إثارة", "رياضة", "شريحة من الحياة",
  "خارق للطبيعة", "غموض", "نفسي", "مدرسي"
];

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    favorite_genres: [] as string[],
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    fetchProfile(session.user.id);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
      setFormData({
        username: data.username || "",
        bio: data.bio || "",
        favorite_genres: data.favorite_genres || [],
      });
      setAvatarPreview(data.avatar_url || "");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let avatarUrl = profile?.avatar_url;

      // Upload avatar if file selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}_avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('manga-covers')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('manga-covers')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          bio: formData.bio,
          avatar_url: avatarUrl,
          favorite_genres: formData.favorite_genres,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم تحديث الملف الشخصي",
      });

      fetchProfile(user.id);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      favorite_genres: prev.favorite_genres.includes(genre)
        ? prev.favorite_genres.filter(g => g !== genre)
        : [...prev.favorite_genres, genre]
    }));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="profile">
                <User className="w-4 h-4 mr-2" />
                الملف الشخصي
              </TabsTrigger>
              <TabsTrigger value="favorites">
                <BookMarked className="w-4 h-4 mr-2" />
                المفضلة
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card className="p-8 bg-card border-border">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="w-32 h-32">
                      <AvatarImage src={avatarPreview} />
                      <AvatarFallback className="text-4xl">
                        {formData.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <label htmlFor="avatar-upload">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span className="cursor-pointer">
                            <Upload className="w-4 h-4 mr-2" />
                            تغيير الصورة
                          </span>
                        </Button>
                      </label>
                    </div>

                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <Label>اسم المستخدم</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="اسم المستخدم"
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label>نبذة عني</Label>
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="اكتب نبذة عنك..."
                      rows={4}
                    />
                  </div>

                  {/* Favorite Genres */}
                  <div className="space-y-2">
                    <Label>التصنيفات المفضلة</Label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_GENRES.map(genre => (
                        <Badge
                          key={genre}
                          variant={formData.favorite_genres.includes(genre) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleGenre(genre)}
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      تسجيل الخروج
                    </Button>
                  </div>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="favorites">
              <Card className="p-8 bg-card border-border">
                <div className="text-center text-muted-foreground">
                  <BookMarked className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>قريباً: ستتمكن من رؤية قائمة المانجا المفضلة هنا</p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;