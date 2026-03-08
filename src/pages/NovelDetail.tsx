import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star, BookOpen, Eye, Heart, Share2, Clock, User, Calendar, Globe, Play, ChevronDown, BookText,
} from "lucide-react";

const NovelDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 1.1]);
  const contentY = useTransform(scrollY, [0, 300], [0, -50]);

  useEffect(() => { checkUser(); }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const { data: novel, isLoading: novelLoading, error: novelError } = useQuery({
    queryKey: ["novel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manga").select("*").eq("slug", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Novel not found");
      return data;
    },
  });

  useEffect(() => {
    if (user && novel) checkFavorite();
  }, [user, novel]);

  const checkFavorite = async () => {
    if (!user || !novel) return;
    const { data } = await supabase
      .from("manga_favorites").select("id")
      .eq("user_id", user.id).eq("manga_id", novel.id).maybeSingle();
    setIsFavorite(!!data);
  };

  const { data: chapters = [], isLoading: chaptersLoading } = useQuery({
    queryKey: ["novel-chapters", novel?.id],
    queryFn: async () => {
      if (!novel?.id) return [];
      const { data, error } = await supabase
        .from("chapters").select("*").eq("manga_id", novel.id)
        .order("chapter_number", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!novel?.id,
  });

  useEffect(() => {
    if (novelError) navigate("/404");
  }, [novelError, navigate]);

  const toggleFavorite = async () => {
    if (!user) {
      toast({ title: "تسجيل الدخول مطلوب", description: "يجب تسجيل الدخول لإضافة رواية للمفضلة", variant: "destructive" });
      return;
    }
    if (isFavorite) {
      await supabase.from("manga_favorites").delete().eq("user_id", user.id).eq("manga_id", novel!.id);
      setIsFavorite(false);
      toast({ title: "تم الإزالة", description: "تم إزالة الرواية من المفضلة" });
    } else {
      await supabase.from("manga_favorites").insert({ user_id: user.id, manga_id: novel!.id });
      setIsFavorite(true);
      toast({ title: "تمت الإضافة", description: "تمت إضافة الرواية للمفضلة" });
    }
  };

  const shareNovel = async () => {
    if (navigator.share) {
      await navigator.share({ title: novel?.title, text: `اقرأ ${novel?.title} على Mangafas`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "تم النسخ", description: "تم نسخ رابط الرواية" });
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  if (novelLoading || chaptersLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">جاري التحميل...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!novel) return null;

  const firstChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null;
  const latestChapter = chapters.length > 0 ? chapters[0] : null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <motion.section ref={heroRef} style={{ opacity: heroOpacity }} className="relative h-[85vh] min-h-[600px] overflow-hidden">
        <motion.div style={{ scale: heroScale }} className="absolute inset-0">
          <img src={novel.banner_url || novel.cover_url || "/placeholder.svg"} alt={novel.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
        </motion.div>

        <motion.div style={{ y: contentY }} className="absolute bottom-0 left-0 right-0 z-10">
          <div className="container mx-auto px-4 pb-12">
            <div className="flex flex-col md:flex-row gap-8 items-end">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="flex-shrink-0"
              >
                <div className="relative group">
                  <motion.div whileHover={{ scale: 1.02 }} className="w-48 md:w-64 rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 border-2 border-primary/20">
                    <img src={novel.cover_url || "/placeholder.svg"} alt={novel.title} className="w-full h-auto" />
                  </motion.div>
                  <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full -z-10 opacity-60" />
                </div>
              </motion.div>

              <div className="flex-1 space-y-4">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 backdrop-blur-sm">
                    <BookText className="h-3 w-3 ml-1" />
                    رواية
                  </Badge>
                  <Badge className="bg-primary/20 text-primary border-primary/30 backdrop-blur-sm">
                    {novel.status === "ongoing" ? "مستمرة" : "مكتملة"}
                  </Badge>
                  {novel.year && (
                    <Badge variant="outline" className="backdrop-blur-sm border-border/50">{novel.year}</Badge>
                  )}
                </motion.div>

                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="text-4xl md:text-6xl font-bold text-foreground leading-tight"
                >
                  {novel.title}
                </motion.h1>

                {novel.alternative_titles?.length > 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-muted-foreground text-sm">
                    {novel.alternative_titles.slice(0, 2).join(" • ")}
                  </motion.p>
                )}

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-border/50">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xl font-bold text-foreground">{novel.rating?.toFixed(1) || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-5 w-5" />
                    <span>{formatViews(novel.views || 0)} مشاهدة</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Heart className="h-5 w-5" />
                    <span>{formatViews(novel.favorites || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-5 w-5" />
                    <span>{chapters.length} فصل</span>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex flex-wrap gap-3 pt-4">
                  {firstChapter && (
                    <Link to={`/read-novel/${novel.slug}/${firstChapter.chapter_number}`}>
                      <Button size="lg" className="gap-2 text-lg px-8 shadow-lg shadow-primary/30">
                        <Play className="h-5 w-5" />
                        ابدأ القراءة
                      </Button>
                    </Link>
                  )}
                  {latestChapter && latestChapter !== firstChapter && (
                    <Link to={`/read-novel/${novel.slug}/${latestChapter.chapter_number}`}>
                      <Button size="lg" variant="secondary" className="gap-2 px-6">
                        <Clock className="h-5 w-5" />
                        آخر فصل ({latestChapter.chapter_number})
                      </Button>
                    </Link>
                  )}
                  <Button size="lg" variant="outline" onClick={toggleFavorite}
                    className={`gap-2 backdrop-blur-sm ${isFavorite ? "border-red-500/50 bg-red-500/10" : ""}`}
                  >
                    <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                    {isFavorite ? "في المفضلة" : "أضف للمفضلة"}
                  </Button>
                  <Button size="lg" variant="outline" onClick={shareNovel} className="gap-2 backdrop-blur-sm">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="flex flex-col items-center gap-2 text-muted-foreground">
            <span className="text-xs">اسحب للأسفل</span>
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 relative z-20 -mt-20">
        {novel.genres?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-wrap gap-2 mb-8">
            {novel.genres.map((genre: string, i: number) => (
              <motion.div key={genre} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105">
                  {genre}
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Info Cards */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: User, label: "المؤلف", value: novel.author || "غير محدد" },
            { icon: Calendar, label: "سنة الإصدار", value: novel.year || "غير محدد" },
            { icon: Globe, label: "الحالة", value: novel.status === "ongoing" ? "مستمرة" : "مكتملة" },
            { icon: BookOpen, label: "عدد الفصول", value: chapters.length },
          ].map((item, index) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ y: -5, scale: 1.02 }}>
              <div className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <item.icon className="h-4 w-4" />
                  <span className="text-xs">{item.label}</span>
                </div>
                <p className="font-semibold text-foreground truncate">{String(item.value)}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Description & Chapters */}
        <Tabs defaultValue="chapters" className="w-full" dir="rtl">
          <TabsList className="w-full justify-start mb-6 bg-card border border-border/50">
            <TabsTrigger value="chapters" className="gap-2"><BookOpen className="h-4 w-4" />الفصول ({chapters.length})</TabsTrigger>
            <TabsTrigger value="info" className="gap-2"><User className="h-4 w-4" />معلومات</TabsTrigger>
          </TabsList>

          <TabsContent value="chapters">
            {chapters.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">لا توجد فصول حالياً</div>
            ) : (
              <div className="space-y-2">
                {chapters.map((ch: any, i: number) => (
                  <motion.div key={ch.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <Link to={`/read-novel/${novel.slug}/${ch.chapter_number}`}>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:bg-accent/5 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {ch.chapter_number}
                          </div>
                          <div>
                            <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                              الفصل {ch.chapter_number} {ch.title ? `- ${ch.title}` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ch.created_at ? new Date(ch.created_at).toLocaleDateString('ar') : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Eye className="h-4 w-4" />
                          <span>{ch.views || 0}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="info">
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              {novel.description ? (
                <div>
                  <h3 className="text-lg font-bold mb-3 text-foreground">القصة</h3>
                  <p className={`text-muted-foreground leading-relaxed whitespace-pre-line ${!showFullDescription ? 'line-clamp-6' : ''}`}>
                    {novel.description}
                  </p>
                  {novel.description.length > 300 && (
                    <Button variant="ghost" size="sm" onClick={() => setShowFullDescription(!showFullDescription)} className="mt-2 text-primary">
                      {showFullDescription ? 'عرض أقل' : 'عرض المزيد'}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">لا يوجد وصف متاح</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default NovelDetail;
