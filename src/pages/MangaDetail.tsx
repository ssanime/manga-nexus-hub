import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChapterListNew } from "@/components/chapters/ChapterListNew";
import { BackgroundQueueManager } from "@/components/admin/BackgroundQueueManager";
import {
  Star,
  BookOpen,
  Eye,
  Heart,
  Share2,
  Loader2,
  Clock,
  User,
  Palette,
  Calendar,
  Globe,
  Play,
  ChevronDown,
  Bookmark,
  MessageCircle,
  ExternalLink,
  Settings,
  Download,
} from "lucide-react";

const MangaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 1.1]);
  const contentY = useTransform(scrollY, [0, 300], [0, -50]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!roleData);
    }
  };

  // Fetch manga data
  const { data: manga, isLoading: mangaLoading, error: mangaError } = useQuery({
    queryKey: ["manga", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manga")
        .select("*")
        .eq("slug", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Manga not found");
      return data;
    },
  });

  // Check favorite status
  useEffect(() => {
    if (user && manga) {
      checkFavorite();
    }
  }, [user, manga]);

  const checkFavorite = async () => {
    if (!user || !manga) return;
    const { data } = await supabase
      .from("manga_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("manga_id", manga.id)
      .maybeSingle();
    setIsFavorite(!!data);
  };

  // Fetch chapters
  const { data: chapters = [], isLoading: chaptersLoading } = useQuery({
    queryKey: ["chapters", manga?.id],
    queryFn: async () => {
      if (!manga?.id) return [];
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("manga_id", manga.id)
        .order("chapter_number", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!manga?.id,
  });

  useEffect(() => {
    if (mangaError) {
      navigate("/404");
    }
  }, [mangaError, navigate]);

  const toggleFavorite = async () => {
    if (!user) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يجب تسجيل الدخول لإضافة مانجا للمفضلة",
        variant: "destructive",
      });
      return;
    }

    if (isFavorite) {
      await supabase
        .from("manga_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("manga_id", manga.id);
      setIsFavorite(false);
      toast({ title: "تم الإزالة", description: "تم إزالة المانجا من المفضلة" });
    } else {
      await supabase
        .from("manga_favorites")
        .insert({ user_id: user.id, manga_id: manga.id });
      setIsFavorite(true);
      toast({ title: "تمت الإضافة", description: "تمت إضافة المانجا للمفضلة" });
    }
  };

  const shareManga = async () => {
    if (navigator.share) {
      await navigator.share({
        title: manga?.title,
        text: `اقرأ ${manga?.title} على Mangafas`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "تم النسخ", description: "تم نسخ رابط المانجا" });
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  if (mangaLoading || chaptersLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">جاري التحميل...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!manga) return null;

  const firstChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null;
  const latestChapter = chapters.length > 0 ? chapters[0] : null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* Immersive Hero Section */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity }}
        className="relative h-[85vh] min-h-[600px] overflow-hidden"
      >
        {/* Animated Background */}
        <motion.div style={{ scale: heroScale }} className="absolute inset-0">
          <img
            src={manga.banner_url || manga.cover_url || "/placeholder.svg"}
            alt={manga.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
        </motion.div>

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-primary/20 rounded-full"
              initial={{
                x: Math.random() * 100 + "%",
                y: "110%",
                scale: Math.random() * 0.5 + 0.5,
              }}
              animate={{
                y: "-10%",
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 15 + 10,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
            />
          ))}
        </div>

        {/* Trailer Button */}
        {manga.trailer_url && (
          <motion.a
            href={manga.trailer_url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute top-24 right-8 z-20"
          >
            <Button className="gap-2 bg-red-600 hover:bg-red-700 shadow-lg">
              <Play className="h-5 w-5" />
              مقطع ترويجي
            </Button>
          </motion.a>
        )}

        {/* Hero Content */}
        <motion.div
          style={{ y: contentY }}
          className="absolute bottom-0 left-0 right-0 z-10"
        >
          <div className="container mx-auto px-4 pb-12">
            <div className="flex flex-col md:flex-row gap-8 items-end">
              {/* Cover Image */}
              <motion.div
                initial={{ opacity: 0, y: 50, rotateY: -15 }}
                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex-shrink-0"
                style={{ perspective: 1000 }}
              >
                <div className="relative group">
                  <motion.div
                    whileHover={{ scale: 1.02, rotateY: 5 }}
                    className="w-48 md:w-64 rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 border-2 border-primary/20"
                  >
                    <img
                      src={manga.cover_url || "/placeholder.svg"}
                      alt={manga.title}
                      className="w-full h-auto"
                    />
                  </motion.div>
                  {/* Glow Effect */}
                  <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full -z-10 opacity-60" />
                </div>
              </motion.div>

              {/* Info */}
              <div className="flex-1 space-y-4">
                {/* Badges */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap gap-2"
                >
                  <Badge className="bg-primary/20 text-primary border-primary/30 backdrop-blur-sm">
                    {manga.status === "ongoing" ? "مستمرة" : "مكتملة"}
                  </Badge>
                  {manga.is_featured && (
                    <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 backdrop-blur-sm">
                      <Star className="h-3 w-3 ml-1 fill-yellow-500" />
                      مميزة
                    </Badge>
                  )}
                  {manga.year && (
                    <Badge variant="outline" className="backdrop-blur-sm border-border/50">
                      {manga.year}
                    </Badge>
                  )}
                </motion.div>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl md:text-6xl font-bold text-foreground leading-tight"
                >
                  {manga.title}
                </motion.h1>

                {/* Alternative Titles */}
                {manga.alternative_titles?.length > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-muted-foreground text-sm"
                  >
                    {manga.alternative_titles.slice(0, 2).join(" • ")}
                  </motion.p>
                )}

                {/* Stats Row */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap items-center gap-6 text-sm"
                >
                  <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-border/50">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xl font-bold text-foreground">
                      {manga.rating?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-5 w-5" />
                    <span>{formatViews(manga.views || 0)} مشاهدة</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Heart className="h-5 w-5" />
                    <span>{formatViews(manga.favorites || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-5 w-5" />
                    <span>{chapters.length} فصل</span>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-wrap gap-3 pt-4"
                >
                  {firstChapter && (
                    <Link to={`/read/${manga.slug}/${firstChapter.chapter_number}`}>
                      <Button size="lg" className="gap-2 text-lg px-8 shadow-lg shadow-primary/30">
                        <Play className="h-5 w-5" />
                        ابدأ القراءة
                      </Button>
                    </Link>
                  )}
                  {latestChapter && latestChapter !== firstChapter && (
                    <Link to={`/read/${manga.slug}/${latestChapter.chapter_number}`}>
                      <Button size="lg" variant="secondary" className="gap-2 px-6">
                        <Clock className="h-5 w-5" />
                        آخر فصل ({latestChapter.chapter_number})
                      </Button>
                    </Link>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={toggleFavorite}
                    className={`gap-2 backdrop-blur-sm ${
                      isFavorite ? "border-red-500/50 bg-red-500/10" : ""
                    }`}
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        isFavorite ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                    {isFavorite ? "في المفضلة" : "أضف للمفضلة"}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={shareManga}
                    className="gap-2 backdrop-blur-sm"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex flex-col items-center gap-2 text-muted-foreground"
          >
            <span className="text-xs">اسحب للأسفل</span>
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 relative z-20 -mt-20">
        {/* Genres */}
        {manga.genres?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap gap-2 mb-8"
          >
            {manga.genres.map((genre: string, i: number) => (
              <motion.div
                key={genre}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/manga?genre=${encodeURIComponent(genre)}`}>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105"
                  >
                    {genre}
                  </Badge>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Info Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { icon: User, label: "المؤلف", value: manga.author || "غير محدد" },
            { icon: Palette, label: "الرسام", value: manga.artist || "غير محدد" },
            { icon: Calendar, label: "سنة الإصدار", value: manga.year || "غير محدد" },
            { icon: Globe, label: "الحالة", value: manga.status === "ongoing" ? "مستمرة" : "مكتملة" },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-semibold text-foreground">{item.value}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Description */}
        {manga.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                القصة
              </h3>
              <div className="relative">
                <p
                  className={`text-muted-foreground leading-relaxed whitespace-pre-line ${
                    !showFullDescription && manga.description.length > 500
                      ? "line-clamp-4"
                      : ""
                  }`}
                >
                  {manga.description}
                </p>
                {manga.description.length > 500 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="mt-2"
                  >
                    {showFullDescription ? "عرض أقل" : "عرض المزيد"}
                    <ChevronDown
                      className={`h-4 w-4 mr-1 transition-transform ${
                        showFullDescription ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Tabs defaultValue="chapters" className="w-full">
            <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 mb-8">
              <TabsTrigger value="chapters" className="gap-2">
                <BookOpen className="h-4 w-4" />
                الفصول ({chapters.length})
              </TabsTrigger>
              <TabsTrigger value="gallery" className="gap-2">
                <Bookmark className="h-4 w-4" />
                معلومات إضافية
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chapters">
              {/* Admin: Download All Button */}
              {isAdmin && (
                <div className="mb-6">
                  <BackgroundQueueManager
                    mangaId={manga.id}
                    mangaTitle={manga.title}
                    source={manga.source}
                  />
                </div>
              )}
              <ChapterListNew
                mangaId={manga.id}
                mangaSlug={manga.slug}
                chapters={chapters}
                mangaCover={manga.cover_url}
              />
            </TabsContent>

            <TabsContent value="gallery">
              <div className="space-y-6">
                <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {manga.publisher && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">الناشر</p>
                        <p className="font-semibold">{manga.publisher}</p>
                      </div>
                    )}
                    {manga.country && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">بلد الأصل</p>
                        <p className="font-semibold">
                          {manga.country === "japan"
                            ? "اليابان"
                            : manga.country === "korea"
                            ? "كوريا"
                            : manga.country === "china"
                            ? "الصين"
                            : "أخرى"}
                        </p>
                      </div>
                    )}
                    {manga.language && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">اللغة</p>
                        <p className="font-semibold">{manga.language}</p>
                      </div>
                    )}
                    {manga.reading_direction && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">اتجاه القراءة</p>
                        <p className="font-semibold">
                          {manga.reading_direction === "rtl"
                            ? "من اليمين لليسار"
                            : "من اليسار لليمين"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* External Links */}
                  {manga.external_links &&
                    typeof manga.external_links === "object" &&
                    !Array.isArray(manga.external_links) && (
                      <div className="mt-6 pt-6 border-t border-border">
                        <p className="text-sm text-muted-foreground mb-3">روابط خارجية</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(manga.external_links).map(([key, url]) => (
                            <a
                              key={key}
                              href={url as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary hover:bg-primary/20 rounded-lg text-sm transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {key === "mal"
                                ? "MyAnimeList"
                                : key === "anilist"
                                ? "AniList"
                                : key}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                </Card>

                {/* Admin Only: Background Download Manager */}
                {isAdmin && (
                  <div className="pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Settings className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">أدوات المسؤول</h3>
                    </div>
                    <BackgroundQueueManager
                      mangaId={manga.id}
                      mangaTitle={manga.title}
                      source={manga.source}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default MangaDetail;
