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
import { User, Settings, BookMarked, Upload, LogOut, Eye, BookOpen, TrendingUp, History } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [readingHistory, setReadingHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRead: 0,
    totalFavorites: 0,
    completedChapters: 0,
  });

  const [formData, setFormData] = useState({
    username: "",
    bio: "",
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
    fetchFavorites(session.user.id);
    fetchReadingHistory(session.user.id);
    fetchStats(session.user.id);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setFormData({
        username: data.username || "",
        bio: data.bio || "",
      });
      setAvatarPreview(data.avatar_url || "");
    } else if (!error || error.code === 'PGRST116') {
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          username: user?.email?.split('@')[0] || '',
        })
        .select()
        .single();

      if (newProfile && !createError) {
        setProfile(newProfile);
        setFormData({
          username: newProfile.username || "",
          bio: newProfile.bio || "",
        });
      }
    }
  };

  const fetchFavorites = async (userId: string) => {
    const { data } = await supabase
      .from("manga_favorites")
      .select(`
        id,
        created_at,
        manga:manga_id (
          id,
          slug,
          title,
          cover_url,
          rating,
          chapter_count
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setFavorites(data);
    }
  };

  const fetchReadingHistory = async (userId: string) => {
    const { data } = await supabase
      .from("reading_history")
      .select(`
        id,
        last_page_read,
        completed,
        updated_at,
        chapter:chapter_id (
          id,
          chapter_number,
          title,
          manga:manga_id (
            id,
            slug,
            title,
            cover_url
          )
        )
      `)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (data) {
      setReadingHistory(data);
    }
  };

  const fetchStats = async (userId: string) => {
    const { data: favData } = await supabase
      .from("manga_favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: historyData } = await supabase
      .from("reading_history")
      .select("id, completed", { count: "exact" })
      .eq("user_id", userId);

    const completedCount = historyData?.filter(h => h.completed).length || 0;

    setStats({
      totalFavorites: favData?.length || 0,
      totalRead: historyData?.length || 0,
      completedChapters: completedCount,
    });
  };

  const removeFavorite = async (favoriteId: string) => {
    const { error } = await supabase
      .from("manga_favorites")
      .delete()
      .eq("id", favoriteId);

    if (!error) {
      toast({
        title: "تم الحذف",
        description: "تم إزالة المانجا من المفضلة",
      });
      fetchFavorites(user.id);
      fetchStats(user.id);
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

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: formData.username,
          bio: formData.bio,
          avatar_url: avatarUrl,
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <BookMarked className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalFavorites}</p>
                  <p className="text-sm text-muted-foreground">مانجا مفضلة</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <BookOpen className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalRead}</p>
                  <p className="text-sm text-muted-foreground">فصول تمت قراءتها</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.completedChapters}</p>
                  <p className="text-sm text-muted-foreground">فصول مكتملة</p>
                </div>
              </div>
            </Card>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 mb-8">
              <TabsTrigger value="profile">
                <User className="w-4 h-4 mr-2" />
                الملف الشخصي
              </TabsTrigger>
              <TabsTrigger value="favorites">
                <BookMarked className="w-4 h-4 mr-2" />
                المفضلة
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-2" />
                السجل
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="w-4 h-4 mr-2" />
                الإعدادات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card className="p-8 bg-card border-border">
                <form onSubmit={handleSubmit} className="space-y-6">
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

                  <div className="space-y-2">
                    <Label>اسم المستخدم</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="اسم المستخدم"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>نبذة عني</Label>
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="اكتب نبذة عنك..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>معلومات الحساب</Label>
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">البريد الإلكتروني:</span>
                        <span className="font-medium">{user.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">تاريخ التسجيل:</span>
                        <span className="font-medium">
                          {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ar-SA') : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
                  </Button>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="favorites">
              {favorites.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {favorites.map((fav) => (
                    <Card key={fav.id} className="overflow-hidden group">
                      <Link to={`/manga/${fav.manga.slug}`}>
                        <div className="relative h-64 overflow-hidden bg-secondary">
                          {fav.manga.cover_url ? (
                            <img
                              src={fav.manga.cover_url}
                              alt={fav.manga.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <BookOpen className="h-16 w-16 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="p-4">
                        <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
                          {fav.manga.title}
                        </h3>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">
                            {fav.manga.chapter_count || 0} فصل
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFavorite(fav.id)}
                          >
                            إزالة
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 bg-card border-border text-center">
                  <BookMarked className="w-16 h-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                  <p className="text-muted-foreground">لم تضف أي مانجا للمفضلة بعد</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history">
              {readingHistory.length > 0 ? (
                <div className="space-y-4">
                  {readingHistory.map((item) => (
                    <Card key={item.id} className="p-4 bg-card border-border">
                      <Link 
                        to={`/read/${item.chapter.manga.slug}/${item.chapter.chapter_number}`}
                        className="flex items-center gap-4 hover:opacity-80 transition-opacity"
                      >
                        <div className="w-16 h-20 flex-shrink-0 overflow-hidden rounded bg-secondary">
                          {item.chapter.manga.cover_url ? (
                            <img
                              src={item.chapter.manga.cover_url}
                              alt={item.chapter.manga.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground line-clamp-1">
                            {item.chapter.manga.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            الفصل {item.chapter.chapter_number}
                            {item.chapter.title && ` - ${item.chapter.title}`}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>آخر قراءة: {new Date(item.updated_at).toLocaleDateString('ar-SA')}</span>
                            {item.completed && (
                              <Badge variant="secondary" className="text-xs">
                                مكتمل
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 bg-card border-border text-center">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                  <p className="text-muted-foreground">لم تبدأ بقراءة أي فصول بعد</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settings">
              <Card className="p-8 bg-card border-border">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">إعدادات الحساب</h3>
                    <Button variant="destructive" onClick={handleLogout} className="w-full">
                      <LogOut className="w-4 h-4 mr-2" />
                      تسجيل الخروج
                    </Button>
                  </div>
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
