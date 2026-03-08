import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/home/Footer";
import {
  Settings, Play, Star, Eye, ChevronLeft, ChevronRight, Sparkles, BookOpen,
  Flame, Crown, Palette, Sword, Heart, Skull, Shield, Ghost, Zap, Clock,
  TrendingUp, ArrowLeft, Layers, RefreshCw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/* ─────────────────────────────── TYPES ─────────────────────────────── */
interface MangaItem {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  description?: string | null;
  rating?: number | null;
  views?: number | null;
  genres?: string[] | null;
  chapter_count?: number | null;
  country?: string | null;
}

interface ChapterItem {
  id: string;
  chapter_number: number;
  title: string | null;
  created_at: string;
  views: number | null;
  manga: {
    id: string;
    slug: string;
    title: string;
    cover_url: string | null;
    genres: string[] | null;
  };
}

/* ─────────────────────────────── HELPERS ─────────────────────────────── */
const formatViews = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toString();
};

const formatTime = (date: string) => {
  try { return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar }); }
  catch { return "منذ فترة"; }
};

/* ─────────────────────────────── HERO ─────────────────────────────── */
const HeroSlider = ({ items }: { items: MangaItem[] }) => {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length === 0) return;
    const t = setInterval(() => { setDir(1); setIdx(p => (p + 1) % items.length); }, 6000);
    return () => clearInterval(t);
  }, [paused, items.length, idx]);

  const go = (d: number) => {
    setDir(d);
    setIdx(p => (p + d + items.length) % items.length);
    setPaused(true);
    setTimeout(() => setPaused(false), 5000);
  };

  if (items.length === 0) return (
    <div className="h-[70vh] min-h-[500px] flex items-center justify-center bg-gradient-to-br from-card via-background to-card">
      <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const m = items[idx];

  const slideV = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 200, damping: 25 } },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0, transition: { duration: 0.4 } }),
  };

  return (
    <section
      className="relative h-[75vh] min-h-[550px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* BG */}
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div key={idx} custom={dir} variants={slideV} initial="enter" animate="center" exit="exit" className="absolute inset-0">
          <img src={m.cover_url || "/placeholder.svg"} alt="" className="w-full h-[115%] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
          <div className="absolute inset-0 bg-primary/5 mix-blend-overlay" />
        </motion.div>
      </AnimatePresence>

      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ x: [0, 80, 0], y: [0, -40, 0] }} transition={{ duration: 18, repeat: Infinity }} className="absolute top-16 right-16 w-56 h-56 bg-primary/10 rounded-full blur-[70px]" />
        <motion.div animate={{ x: [0, -60, 0], y: [0, 50, 0] }} transition={{ duration: 14, repeat: Infinity }} className="absolute bottom-16 left-16 w-40 h-40 bg-accent/10 rounded-full blur-[50px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
        <div className="max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div key={idx} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="space-y-5">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 backdrop-blur-md border border-primary/20 text-primary text-sm">
                <Sparkles className="w-3.5 h-3.5" /> مميز
              </div>

              <div className="flex flex-wrap gap-2">
                {m.genres?.slice(0, 4).map(g => (
                  <span key={g} className="px-3 py-1 bg-card/40 backdrop-blur-md border border-border/50 rounded-full text-sm text-foreground/80">{g}</span>
                ))}
              </div>

              <h1 className="text-4xl md:text-6xl font-black text-foreground leading-tight">{m.title}</h1>

              <div className="flex items-center gap-6 text-muted-foreground">
                {m.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-foreground">{m.rating.toFixed(1)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  <span>{(m.views || 0).toLocaleString()} مشاهدة</span>
                </div>
              </div>

              <p className="text-muted-foreground text-lg line-clamp-3 max-w-xl">{m.description || "استمتع بقراءة هذا العمل المميز"}</p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link to={`/manga/${m.slug || m.id}`}>
                  <Button size="lg" className="gap-2 text-lg px-8 h-14 shadow-xl shadow-primary/30">
                    <Play className="h-5 w-5" /> ابدأ القراءة
                  </Button>
                </Link>
                <Link to={`/manga/${m.slug || m.id}`}>
                  <Button size="lg" variant="outline" className="gap-2 text-lg px-8 h-14 backdrop-blur-md border-primary/30 hover:bg-primary/10">
                    <BookOpen className="h-5 w-5" /> التفاصيل
                  </Button>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Cover float */}
        <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="hidden lg:block absolute left-16 top-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-64 h-[380px] rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 border border-primary/20">
              <img src={m.cover_url || "/placeholder.svg"} alt={m.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            </div>
            <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }} className="absolute -inset-6 bg-primary/15 blur-3xl rounded-full -z-10" />
          </div>
        </motion.div>
      </div>

      {/* Nav dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <button onClick={() => go(-1)} className="h-10 w-10 rounded-full bg-card/40 backdrop-blur-md border border-border/50 hover:bg-primary/20 flex items-center justify-center">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          {items.map((_, i) => (
            <button key={i} onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }}
              className={cn("h-2 rounded-full transition-all", i === idx ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30")} />
          ))}
        </div>
        <button onClick={() => go(1)} className="h-10 w-10 rounded-full bg-card/40 backdrop-blur-md border border-border/50 hover:bg-primary/20 flex items-center justify-center">
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Progress */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/20">
        <motion.div key={idx} initial={{ width: "0%" }} animate={{ width: paused ? undefined : "100%" }} transition={{ duration: 6, ease: "linear" }} className="h-full bg-gradient-to-r from-primary via-accent to-primary" />
      </div>
    </section>
  );
};

/* ─────────────────────────── CATEGORY CARDS ─────────────────────────── */
const CategorySection = ({ items }: { items: { type: string; label: string; desc: string; icon: any; gradient: string; manga: MangaItem[]; count: number }[] }) => {
  if (items.length === 0) return null;
  return (
    <section className="py-14">
      <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-black text-center mb-10">
        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">عوالم مختلفة، متعة واحدة</span>
      </motion.h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((cat, ci) => {
          const Icon = cat.icon;
          return (
            <motion.div key={cat.type} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: ci * 0.12 }}>
              <Link to={`/${cat.type}`}>
                <motion.div whileHover={{ y: -8 }} className="group relative rounded-3xl overflow-hidden bg-card border border-border/30 hover:border-primary/40 transition-all duration-500">
                  <div className="relative h-44 overflow-hidden">
                    <div className="grid grid-cols-4 h-full">
                      {cat.manga.slice(0, 4).map(m => (
                        <div key={m.id} className="overflow-hidden">
                          <img src={m.cover_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                        </div>
                      ))}
                      {Array.from({ length: Math.max(0, 4 - cat.manga.length) }).map((_, i) => <div key={i} className="bg-muted" />)}
                    </div>
                    <div className={`absolute inset-0 bg-gradient-to-t ${cat.gradient} opacity-60 group-hover:opacity-40 transition-opacity`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-4 right-4 p-2.5 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30">
                      <Icon className="h-5 w-5 text-white" />
                    </motion.div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">{cat.label}</h3>
                        <p className="text-sm text-muted-foreground">{cat.desc}</p>
                      </div>
                      <div className="text-left">
                        <span className="text-2xl font-black text-primary">{cat.count}</span>
                        <p className="text-xs text-muted-foreground">عمل</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

/* ─────────────────────── HORIZONTAL SHOWCASE ─────────────────────── */
const HorizontalShowcase = ({ title, icon, items }: { title: string; icon: React.ReactNode; items: MangaItem[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * 300, behavior: "smooth" });

  if (items.length === 0) return null;

  return (
    <section className="py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/10">{icon}</div>
          <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{title}</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => scroll(1)} className="p-2 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-colors"><ChevronRight className="h-5 w-5" /></button>
          <button onClick={() => scroll(-1)} className="p-2 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-colors"><ChevronLeft className="h-5 w-5" /></button>
          <Link to="/manga" className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-primary transition-colors">عرض الكل</Link>
        </div>
      </div>

      <div ref={ref} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
        {items.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }} className="flex-shrink-0" style={{ scrollSnapAlign: "start" }}>
            <Link to={`/manga/${item.slug || item.id}`} className="group block">
              <motion.div whileHover={{ y: -10, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="relative w-44 md:w-52">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-card border border-border/30 group-hover:border-primary/50 transition-all duration-500 shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/15">
                  <img src={item.cover_url || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-500" />
                  {/* Shine */}
                  <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none">
                    <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1300ms]" />
                  </div>
                  {item.rating && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-lg">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold text-white">{item.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {i < 3 && (
                    <div className={cn("absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-lg",
                      i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-black" :
                      i === 1 ? "bg-gradient-to-br from-slate-300 to-gray-400 text-black" :
                      "bg-gradient-to-br from-amber-600 to-orange-700 text-white"
                    )}>{i + 1}</div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-white font-bold text-sm line-clamp-2 drop-shadow-lg">{item.title}</h3>
                    {item.genres?.slice(0, 2).map(g => (
                      <span key={g} className="inline-block text-[10px] px-1.5 py-0.5 bg-white/10 rounded-full text-white/80 mr-1 mt-1">{g}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

/* ─────────────────────── GENRE EXPLORER ─────────────────────── */
const genres = [
  { name: "أكشن", icon: Sword, gradient: "from-red-600 to-orange-500" },
  { name: "رومانسي", icon: Heart, gradient: "from-pink-500 to-rose-400" },
  { name: "رعب", icon: Skull, gradient: "from-purple-700 to-violet-500" },
  { name: "خيال", icon: Sparkles, gradient: "from-cyan-500 to-blue-500" },
  { name: "قتال", icon: Flame, gradient: "from-amber-500 to-yellow-400" },
  { name: "مغامرة", icon: Shield, gradient: "from-emerald-600 to-green-400" },
  { name: "غموض", icon: Ghost, gradient: "from-slate-600 to-gray-400" },
  { name: "قوى خارقة", icon: Zap, gradient: "from-indigo-600 to-blue-400" },
];

const GenreSection = () => (
  <section className="py-14 relative">
    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
    <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-black text-center mb-10">
      <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">استكشف حسب التصنيف</span>
    </motion.h2>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {genres.map((g, i) => {
        const Icon = g.icon;
        return (
          <motion.div key={g.name} initial={{ opacity: 0, y: 20, scale: 0.9 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
            <Link to={`/manga?genre=${g.name}`}>
              <motion.div whileHover={{ y: -8, scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className={`group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${g.gradient} shadow-xl hover:shadow-2xl transition-shadow duration-500`}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1500ms]" />
                </div>
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <motion.div whileHover={{ rotate: 20, scale: 1.2 }} transition={{ type: "spring" }}>
                    <Icon className="h-9 w-9 text-white drop-shadow-lg" />
                  </motion.div>
                  <span className="text-white font-bold text-lg drop-shadow-md">{g.name}</span>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  </section>
);

/* ─────────────────────── LATEST CHAPTERS ─────────────────────── */
const LatestChapters = () => {
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("chapters")
        .select("id, chapter_number, title, created_at, views, manga:manga_id (id, slug, title, cover_url, genres)")
        .order("created_at", { ascending: false })
        .limit(18);
      if (data) setChapters(data as any);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return (
    <section className="py-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[...Array(12)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
      </div>
    </section>
  );

  return (
    <section className="py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">آخر الفصول</h2>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {chapters.length} فصل جديد
            </p>
          </div>
        </div>
        <Link to="/recent">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-primary/20 hover:bg-primary/10">
            عرض الكل <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {chapters.map((ch, i) => (
          <motion.div key={ch.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
            <Link to={`/read/${ch.manga?.slug || ch.manga?.id}/${ch.chapter_number}`} className="group block">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-card border border-border/30 hover:border-primary/40 transition-all duration-500 shadow-md hover:shadow-xl hover:shadow-primary/10">
                <img src={ch.manga?.cover_url || "/placeholder.svg"} alt={ch.manga?.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80" />
                {/* Shine */}
                <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none">
                  <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1200ms]" />
                </div>
                {/* Rank */}
                {i < 3 && (
                  <div className={cn("absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-lg",
                    i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-black" :
                    i === 1 ? "bg-gradient-to-br from-slate-300 to-gray-400 text-black" :
                    "bg-gradient-to-br from-amber-600 to-orange-700 text-white"
                  )}>{i + 1}</div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="bg-primary/90 backdrop-blur-md rounded-full px-2.5 py-0.5 inline-block mb-1.5">
                    <span className="text-[10px] text-primary-foreground font-bold">الفصل {ch.chapter_number}</span>
                  </div>
                  <h3 className="text-white font-bold text-sm line-clamp-2 drop-shadow-lg">{ch.manga?.title}</h3>
                  <span className="text-[10px] text-white/60 mt-1 block">{formatTime(ch.created_at)}</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

/* ─────────────────────── EDITOR'S PICK ─────────────────────── */
const EditorPick = ({ manga }: { manga: MangaItem | null }) => {
  if (!manga) return null;

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Blurred bg */}
      <div className="absolute inset-0 -z-10">
        <img src={manga.cover_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover blur-[80px] scale-125 opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
      </div>

      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 shadow-lg shadow-amber-500/30">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-3xl font-black text-foreground">اختيار المحرر</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-10 items-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ type: "spring" }} className="mx-auto lg:mx-0">
            <div className="relative">
              <div className="w-64 md:w-72 aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border-2 border-primary/20">
                <img src={manga.cover_url || "/placeholder.svg"} alt={manga.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              </div>
              <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity }} className="absolute -inset-6 bg-primary/15 blur-[50px] rounded-full -z-10" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-5 text-right">
            <div className="flex flex-wrap gap-2 justify-end">
              {manga.genres?.slice(0, 5).map(g => (
                <span key={g} className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary font-medium">{g}</span>
              ))}
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-foreground leading-tight">{manga.title}</h3>
            <p className="text-muted-foreground text-lg line-clamp-4 leading-relaxed">{manga.description || "عمل استثنائي يستحق القراءة"}</p>
            <div className="flex items-center gap-6 justify-end text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" />{manga.chapter_count || 0} فصل</div>
              <div className="flex items-center gap-2"><Eye className="h-4 w-4" />{(manga.views || 0).toLocaleString()} مشاهدة</div>
            </div>
            <div className="flex gap-4 justify-end pt-2">
              <Link to={`/manga/${manga.slug || manga.id}`}>
                <Button size="lg" className="gap-2 px-8 h-14 shadow-xl shadow-primary/30"><BookOpen className="h-5 w-5" /> ابدأ القراءة</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════ MAIN PAGE ═══════════════════════════ */
const Index = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [featured, setFeatured] = useState<MangaItem[]>([]);
  const [popular, setPopular] = useState<MangaItem[]>([]);
  const [newReleases, setNewReleases] = useState<MangaItem[]>([]);
  const [updated, setUpdated] = useState<MangaItem[]>([]);
  const [editorPick, setEditorPick] = useState<MangaItem | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    // Admin check
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
        if (data?.some(r => r.role === "admin")) setIsAdmin(true);
      });
    });

    // Fetch all data in parallel
    const fetchAll = async () => {
      const [featRes, popRes, newRes, updRes, pickRes] = await Promise.all([
        supabase.from("manga").select("id, slug, title, cover_url, description, rating, views, genres").eq("publish_status", "published").eq("is_featured", true).order("views", { ascending: false }).limit(5),
        supabase.from("manga").select("id, slug, title, cover_url, rating, views, genres").eq("publish_status", "published").order("views", { ascending: false }).limit(15),
        supabase.from("manga").select("id, slug, title, cover_url, rating, views, genres").eq("publish_status", "published").order("created_at", { ascending: false }).limit(15),
        supabase.from("manga").select("id, slug, title, cover_url, rating, views, genres").eq("publish_status", "published").order("updated_at", { ascending: false }).limit(15),
        supabase.from("manga").select("id, slug, title, cover_url, description, rating, views, genres, chapter_count").eq("publish_status", "published").eq("is_featured", true).order("rating", { ascending: false }).limit(1).single(),
      ]);

      if (featRes.data) setFeatured(featRes.data);
      if (popRes.data) setPopular(popRes.data);
      if (newRes.data) setNewReleases(newRes.data);
      if (updRes.data) setUpdated(updRes.data);
      if (pickRes.data) setEditorPick(pickRes.data);

      // Category data
      const catDefs = [
        { type: "manga", label: "مانجا", desc: "أعمال يابانية", icon: BookOpen, gradient: "from-rose-600 to-pink-500", country: "اليابان" },
        { type: "manhwa", label: "مانهوا", desc: "أعمال كورية", icon: Palette, gradient: "from-blue-600 to-cyan-500", country: "كوريا" },
        { type: "manhua", label: "مانها", desc: "أعمال صينية", icon: Crown, gradient: "from-amber-600 to-yellow-500", country: "الصين" },
      ];

      const catResults = await Promise.all(catDefs.map(async (c) => {
        const [{ data: manga }, { count }] = await Promise.all([
          supabase.from("manga").select("id, slug, cover_url, title").eq("publish_status", "published").eq("country", c.country).order("views", { ascending: false }).limit(4),
          supabase.from("manga").select("id", { count: "exact", head: true }).eq("publish_status", "published").eq("country", c.country),
        ]);
        return { ...c, manga: manga || [], count: count || 0 };
      }));

      setCategories(catResults);
    };

    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {isAdmin && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="fixed bottom-8 left-8 z-50">
          <Button onClick={() => navigate("/admin")} size="lg" className="shadow-lg shadow-primary/30 gap-2">
            <Settings className="w-5 h-5" /> لوحة التحكم
          </Button>
        </motion.div>
      )}

      {/* 1. Hero Slider */}
      <HeroSlider items={featured.length > 0 ? featured : popular.slice(0, 5)} />

      {/* 2. Category Banners */}
      <div className="container mx-auto px-4">
        <CategorySection items={categories} />
      </div>

      {/* 3. Popular */}
      <div className="container mx-auto px-4">
        <HorizontalShowcase title="الأكثر مشاهدة" icon={<Flame className="h-6 w-6 text-primary" />} items={popular} />
      </div>

      {/* 4. Editor's Pick */}
      <EditorPick manga={editorPick} />

      {/* 5. Genre Explorer */}
      <div className="container mx-auto px-4">
        <GenreSection />
      </div>

      {/* 6. New Releases */}
      <div className="bg-card/20">
        <div className="container mx-auto px-4">
          <HorizontalShowcase title="إصدارات جديدة" icon={<Sparkles className="h-6 w-6 text-yellow-500" />} items={newReleases} />
        </div>
      </div>

      {/* 7. Recently Updated */}
      <div className="container mx-auto px-4">
        <HorizontalShowcase title="آخر التحديثات" icon={<TrendingUp className="h-6 w-6 text-accent" />} items={updated} />
      </div>

      {/* 8. Latest Chapters */}
      <div className="bg-card/20">
        <div className="container mx-auto px-4">
          <LatestChapters />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
