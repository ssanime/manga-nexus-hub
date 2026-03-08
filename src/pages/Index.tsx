import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/home/Footer";
import {
  Settings, Play, Star, Eye, ChevronLeft, ChevronRight, Sparkles, BookOpen,
  Flame, Crown, Palette, Sword, Heart, Skull, Shield, Ghost, Zap, Clock,
  TrendingUp, ArrowLeft, Layers
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MangaItem {
  id: string; slug: string; title: string; cover_url: string | null;
  description?: string | null; rating?: number | null; views?: number | null;
  genres?: string[] | null; chapter_count?: number | null; country?: string | null;
}
interface ChapterItem {
  id: string; chapter_number: number; title: string | null; created_at: string; views: number | null;
  manga: { id: string; slug: string; title: string; cover_url: string | null; genres: string[] | null; };
}

const fmt = (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(1)}K` : String(v);
const fmtTime = (d: string) => { try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ar }); } catch { return ""; } };

/* ══════════════════════════════════════════════════════════════════
   IMMERSIVE HERO — Full-bleed parallax with cinematic overlay
   ══════════════════════════════════════════════════════════════════ */
const ImmersiveHero = ({ items }: { items: MangaItem[] }) => {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 150]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  useEffect(() => {
    if (paused || !items.length) return;
    const t = setInterval(() => setIdx(p => (p + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [paused, items.length, idx]);

  if (!items.length) return (
    <section className="relative h-[85vh] min-h-[600px] bg-background flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <p className="text-muted-foreground text-lg">جاري تحميل المحتوى...</p>
      </motion.div>
    </section>
  );

  const m = items[idx];

  return (
    <section className="relative h-[85vh] min-h-[600px] overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Parallax BG */}
      <AnimatePresence mode="wait">
        <motion.div
          key={m.id}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0"
          style={{ y: bgY }}
        >
          <img src={m.cover_url || "/placeholder.svg"} alt="" className="w-full h-[120%] object-cover" />
        </motion.div>
      </AnimatePresence>

      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.12),transparent_70%)]" />

      {/* Grain texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E")`,
      }} />

      {/* Content */}
      <motion.div style={{ opacity }} className="relative z-10 container mx-auto px-4 h-full flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center w-full">
          {/* Text */}
          <div className="max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {/* Badge */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 backdrop-blur-xl border border-primary/20">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-primary text-sm font-bold tracking-wide">مميز</span>
                </motion.div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2">
                  {m.genres?.slice(0, 4).map((g, gi) => (
                    <motion.span key={g} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + gi * 0.05 }}
                      className="px-3 py-1.5 bg-card/30 backdrop-blur-xl border border-border/40 rounded-xl text-sm text-foreground/80 font-medium">{g}</motion.span>
                  ))}
                </div>

                {/* Title */}
                <h1 className="text-5xl md:text-7xl font-black text-foreground leading-[1.1] tracking-tight">{m.title}</h1>

                {/* Stats */}
                <div className="flex items-center gap-8 text-muted-foreground">
                  {m.rating && <div className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500 fill-yellow-500" /><span className="font-bold text-foreground text-lg">{m.rating.toFixed(1)}</span></div>}
                  <div className="flex items-center gap-2"><Eye className="h-5 w-5" /><span>{fmt(m.views || 0)} مشاهدة</span></div>
                </div>

                {/* Description */}
                <p className="text-muted-foreground text-lg leading-relaxed line-clamp-2 max-w-lg">{m.description || "استمتع بقراءة هذا العمل المميز"}</p>

                {/* CTAs */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link to={`/manga/${m.slug || m.id}`}>
                    <Button size="lg" className="gap-3 text-lg px-10 h-16 rounded-2xl shadow-2xl shadow-primary/40 font-bold">
                      <Play className="h-5 w-5 fill-current" /> ابدأ القراءة
                    </Button>
                  </Link>
                  <Link to={`/manga/${m.slug || m.id}`}>
                    <Button size="lg" variant="outline" className="gap-3 text-lg px-10 h-16 rounded-2xl backdrop-blur-xl border-foreground/10 hover:bg-foreground/5 font-bold">
                      <BookOpen className="h-5 w-5" /> التفاصيل
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Cover Card — hidden on mobile */}
          <AnimatePresence mode="wait">
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 60, rotateY: -15 }}
              animate={{ opacity: 1, y: 0, rotateY: 0 }}
              exit={{ opacity: 0, y: -40, rotateY: 15 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block"
            >
              <div className="relative perspective-1000">
                <div className="w-72 h-[420px] rounded-3xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10 ring-1 ring-primary/20">
                  <img src={m.cover_url || "/placeholder.svg"} alt={m.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/5" />
                </div>
                <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -inset-8 bg-primary/10 blur-[60px] rounded-full -z-10" />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bottom nav */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
        <button onClick={() => { setIdx(p => (p - 1 + items.length) % items.length); setPaused(true); setTimeout(() => setPaused(false), 5000); }}
          className="h-11 w-11 rounded-2xl bg-card/30 backdrop-blur-xl border border-border/40 hover:bg-primary/20 flex items-center justify-center transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="flex gap-2 items-center">
          {items.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={cn("rounded-full transition-all duration-500", i === idx ? "w-10 h-2.5 bg-primary shadow-lg shadow-primary/50" : "w-2.5 h-2.5 bg-foreground/20 hover:bg-foreground/40")} />
          ))}
        </div>
        <button onClick={() => { setIdx(p => (p + 1) % items.length); setPaused(true); setTimeout(() => setPaused(false), 5000); }}
          className="h-11 w-11 rounded-2xl bg-card/30 backdrop-blur-xl border border-border/40 hover:bg-primary/20 flex items-center justify-center transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-foreground/5">
        <motion.div key={idx} initial={{ width: "0%" }} animate={{ width: paused ? undefined : "100%" }}
          transition={{ duration: 7, ease: "linear" }} className="h-full bg-gradient-to-r from-primary to-accent" />
      </div>
    </section>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MANGA RAIL — Horizontally-scrollable cards with hover effects
   ══════════════════════════════════════════════════════════════════ */
const MangaRail = ({ title, icon, items, link }: { title: string; icon: React.ReactNode; items: MangaItem[]; link?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * 320, behavior: "smooth" });

  if (!items.length) return null;

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/10">{icon}</div>
          <h2 className="text-2xl md:text-3xl font-black text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scroll(1)} className="p-2.5 rounded-xl bg-card/60 backdrop-blur border border-border/40 hover:border-primary/40 transition-colors"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => scroll(-1)} className="p-2.5 rounded-xl bg-card/60 backdrop-blur border border-border/40 hover:border-primary/40 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
          {link && <Link to={link} className="text-sm text-primary font-bold hover:underline mr-2">عرض الكل</Link>}
        </div>
      </div>
      <div ref={ref} className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
        {items.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }} className="flex-shrink-0" style={{ scrollSnapAlign: "start" }}>
            <Link to={`/manga/${item.slug || item.id}`} className="group block">
              <motion.div whileHover={{ y: -12 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                <div className="relative w-48 md:w-56 aspect-[3/4] rounded-2xl overflow-hidden bg-card border border-border/20 group-hover:border-primary/40 transition-all duration-500 shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/10">
                  <img src={item.cover_url || "/placeholder.svg"} alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  {/* Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/8 transition-colors duration-500" />
                  {/* Shine sweep */}
                  <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none">
                    <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1400ms]" />
                  </div>
                  {/* Rating */}
                  {item.rating && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-xl border border-white/10">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" /><span className="text-xs font-bold text-white">{item.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {/* Rank medal */}
                  {i < 3 && (
                    <div className={cn("absolute top-3 left-3 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-lg",
                      i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-black" :
                      i === 1 ? "bg-gradient-to-br from-slate-300 to-gray-400 text-black" :
                      "bg-gradient-to-br from-amber-700 to-orange-800 text-white"
                    )}>{i + 1}</div>
                  )}
                  {/* Info */}
                  <div className="absolute bottom-0 inset-x-0 p-4">
                    <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 drop-shadow-lg mb-1.5">{item.title}</h3>
                    <div className="flex gap-1.5 flex-wrap">
                      {item.genres?.slice(0, 2).map(g => (
                        <span key={g} className="text-[10px] px-2 py-0.5 bg-white/10 backdrop-blur rounded-lg text-white/70">{g}</span>
                      ))}
                    </div>
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

/* ══════════════════════════════════════════════════════════════════
   WORLD CARDS — Manga / Manhwa / Manhua category cards
   ══════════════════════════════════════════════════════════════════ */
const WorldCards = ({ items }: { items: { type: string; label: string; desc: string; icon: any; gradient: string; manga: MangaItem[]; count: number }[] }) => {
  if (!items.length) return null;
  return (
    <section className="py-14">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-black mb-2">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">عوالم مختلفة، متعة واحدة</span>
        </h2>
        <p className="text-muted-foreground text-sm">اكتشف أفضل الأعمال من اليابان وكوريا والصين</p>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((cat, ci) => {
          const Icon = cat.icon;
          return (
            <motion.div key={cat.type} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: ci * 0.12 }}>
              <Link to={`/${cat.type}`}>
                <motion.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}
                  className="group relative rounded-3xl overflow-hidden bg-card border border-border/20 hover:border-primary/30 transition-all duration-500">
                  <div className="relative h-48 overflow-hidden">
                    <div className="grid grid-cols-4 h-full">
                      {cat.manga.slice(0, 4).map(m => (
                        <div key={m.id} className="overflow-hidden"><img src={m.cover_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" /></div>
                      ))}
                      {Array.from({ length: Math.max(0, 4 - cat.manga.length) }).map((_, i) => <div key={i} className="bg-muted" />)}
                    </div>
                    <div className={`absolute inset-0 bg-gradient-to-t ${cat.gradient} opacity-50 group-hover:opacity-30 transition-opacity duration-500`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}
                      className="absolute top-4 right-4 p-3 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/20">
                      <Icon className="h-6 w-6 text-white" />
                    </motion.div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">{cat.label}</h3>
                        <p className="text-sm text-muted-foreground">{cat.desc}</p>
                      </div>
                      <div className="text-left">
                        <span className="text-3xl font-black text-primary">{cat.count}</span>
                        <p className="text-xs text-muted-foreground">عمل</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/20">
                      <div className="flex -space-x-2 rtl:space-x-reverse">
                        {cat.manga.slice(0, 3).map(m => (
                          <img key={m.id} src={m.cover_url || "/placeholder.svg"} alt="" className="w-8 h-8 rounded-full border-2 border-card object-cover" />
                        ))}
                      </div>
                      <span className="text-xs text-primary font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                        تصفح الآن <ArrowLeft className="h-3 w-3" />
                      </span>
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

/* ══════════════════════════════════════════════════════════════════
   EDITOR'S PICK — Cinematic spotlight with blurred BG
   ══════════════════════════════════════════════════════════════════ */
const EditorSpotlight = ({ manga }: { manga: MangaItem | null }) => {
  if (!manga) return null;
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={manga.cover_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover blur-[100px] scale-150 opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      </div>
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-400 shadow-xl shadow-amber-500/30">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-foreground">اختيار المحرر</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-12 items-center">
          <motion.div initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }} className="mx-auto lg:mx-0">
            <div className="relative">
              <div className="w-64 md:w-80 aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border-2 border-primary/15 ring-1 ring-white/5">
                <img src={manga.cover_url || "/placeholder.svg"} alt={manga.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              </div>
              <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 5, repeat: Infinity }}
                className="absolute -inset-10 bg-primary/10 blur-[80px] rounded-full -z-10" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.7 }} className="space-y-6 text-right">
            <div className="flex flex-wrap gap-2 justify-end">
              {manga.genres?.slice(0, 5).map(g => (
                <span key={g} className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-2xl text-sm text-primary font-bold">{g}</span>
              ))}
            </div>
            <h3 className="text-4xl md:text-6xl font-black text-foreground leading-tight">{manga.title}</h3>
            <p className="text-muted-foreground text-lg leading-relaxed line-clamp-3">{manga.description || "عمل استثنائي يستحق القراءة"}</p>
            <div className="flex items-center gap-8 justify-end text-muted-foreground">
              <div className="flex items-center gap-2"><BookOpen className="h-5 w-5" /><span className="font-bold">{manga.chapter_count || 0} فصل</span></div>
              <div className="flex items-center gap-2"><Eye className="h-5 w-5" /><span className="font-bold">{fmt(manga.views || 0)} مشاهدة</span></div>
              {manga.rating && <div className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500 fill-yellow-500" /><span className="font-bold">{manga.rating.toFixed(1)}</span></div>}
            </div>
            <div className="flex gap-4 justify-end pt-3">
              <Link to={`/manga/${manga.slug || manga.id}`}>
                <Button size="lg" className="gap-3 px-10 h-14 rounded-2xl shadow-xl shadow-primary/30 font-bold text-lg">
                  <Play className="h-5 w-5 fill-current" /> ابدأ القراءة
                </Button>
              </Link>
              <Link to={`/manga/${manga.slug || manga.id}`}>
                <Button size="lg" variant="outline" className="gap-3 px-10 h-14 rounded-2xl border-primary/20 font-bold text-lg">التفاصيل</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ══════════════════════════════════════════════════════════════════
   GENRE EXPLORER — Vibrant genre tiles
   ══════════════════════════════════════════════════════════════════ */
const genreList = [
  { name: "أكشن", icon: Sword, gradient: "from-red-600 to-orange-500" },
  { name: "رومانسي", icon: Heart, gradient: "from-pink-500 to-rose-400" },
  { name: "رعب", icon: Skull, gradient: "from-purple-700 to-violet-500" },
  { name: "خيال", icon: Sparkles, gradient: "from-cyan-500 to-blue-500" },
  { name: "قتال", icon: Flame, gradient: "from-amber-500 to-yellow-400" },
  { name: "مغامرة", icon: Shield, gradient: "from-emerald-600 to-green-400" },
  { name: "غموض", icon: Ghost, gradient: "from-slate-600 to-gray-400" },
  { name: "قوى خارقة", icon: Zap, gradient: "from-indigo-600 to-blue-400" },
];

const GenreExplorer = () => (
  <section className="py-14 relative">
    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
      <h2 className="text-3xl md:text-4xl font-black mb-2">
        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">استكشف حسب التصنيف</span>
      </h2>
      <p className="text-muted-foreground text-sm">اختر تصنيفك المفضل وابدأ رحلتك</p>
    </motion.div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {genreList.map((g, i) => {
        const Icon = g.icon;
        return (
          <motion.div key={g.name} initial={{ opacity: 0, y: 20, scale: 0.9 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
            <Link to={`/manga?genre=${g.name}`}>
              <motion.div whileHover={{ y: -8, scale: 1.04 }} whileTap={{ scale: 0.97 }}
                className={`group relative overflow-hidden rounded-2xl p-7 bg-gradient-to-br ${g.gradient} shadow-xl hover:shadow-2xl transition-shadow duration-500`}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1500ms]" />
                </div>
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <motion.div whileHover={{ rotate: 15, scale: 1.2 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Icon className="h-10 w-10 text-white drop-shadow-lg" />
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

/* ══════════════════════════════════════════════════════════════════
   LATEST CHAPTERS — Card grid with time badges
   ══════════════════════════════════════════════════════════════════ */
const LatestChaptersSection = () => {
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("chapters")
        .select("id, chapter_number, title, created_at, views, manga:manga_id (id, slug, title, cover_url, genres)")
        .order("created_at", { ascending: false })
        .limit(18);
      if (data) setChapters(data as any);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <section className="py-12">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-card animate-pulse" />)}
      </div>
    </section>
  );

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground">آخر الفصول</h2>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />{chapters.length} فصل جديد
            </p>
          </div>
        </div>
        <Link to="/recent"><Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-primary/20 hover:bg-primary/10">عرض الكل <ArrowLeft className="h-3.5 w-3.5" /></Button></Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {chapters.map((ch, i) => (
          <motion.div key={ch.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
            <Link to={`/read/${ch.manga?.slug || ch.manga?.id}/${ch.chapter_number}`} className="group block">
              <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }}>
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-card border border-border/20 hover:border-primary/30 transition-all duration-500 shadow-md hover:shadow-xl hover:shadow-primary/10">
                  <img src={ch.manga?.cover_url || "/placeholder.svg"} alt={ch.manga?.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                  {/* Shine */}
                  <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none">
                    <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1200ms]" />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-3">
                    <div className="bg-primary/90 backdrop-blur-md rounded-xl px-2.5 py-1 inline-block mb-1.5">
                      <span className="text-[11px] text-primary-foreground font-bold">الفصل {ch.chapter_number}</span>
                    </div>
                    <h3 className="text-white font-bold text-sm line-clamp-2 drop-shadow-lg">{ch.manga?.title}</h3>
                    <span className="text-[10px] text-white/50 mt-1 block">{fmtTime(ch.created_at)}</span>
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

/* ══════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ══════════════════════════════════════════════════════════════════ */
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
        if (data?.some(r => r.role === "admin")) setIsAdmin(true);
      });
    });

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
          <Button onClick={() => navigate("/admin")} size="lg" className="shadow-lg shadow-primary/30 gap-2 rounded-2xl">
            <Settings className="w-5 h-5" /> لوحة التحكم
          </Button>
        </motion.div>
      )}

      <ImmersiveHero items={featured.length > 0 ? featured : popular.slice(0, 5)} />

      <div className="container mx-auto px-4">
        <WorldCards items={categories} />
      </div>

      <div className="container mx-auto px-4">
        <MangaRail title="الأكثر مشاهدة" icon={<Flame className="h-6 w-6 text-primary" />} items={popular} link="/manga" />
      </div>

      <EditorSpotlight manga={editorPick} />

      <div className="container mx-auto px-4">
        <GenreExplorer />
      </div>

      <div className="bg-card/20">
        <div className="container mx-auto px-4">
          <MangaRail title="إصدارات جديدة" icon={<Sparkles className="h-6 w-6 text-yellow-500" />} items={newReleases} link="/manga" />
        </div>
      </div>

      <div className="container mx-auto px-4">
        <MangaRail title="آخر التحديثات" icon={<TrendingUp className="h-6 w-6 text-accent" />} items={updated} link="/manga" />
      </div>

      <div className="bg-card/20">
        <div className="container mx-auto px-4">
          <LatestChaptersSection />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
