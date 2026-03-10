import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/home/Footer";
import {
  Settings, Play, Star, Eye, ChevronLeft, ChevronRight, Sparkles, BookOpen,
  Flame, Crown, Palette, Sword, Heart, Skull, Shield, Ghost, Zap, Clock,
  TrendingUp, ArrowLeft, Layers, Trophy, BarChart3, Users, Bookmark,
  ArrowUpRight, Hash, Calendar, Gem, Target, Compass
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

/* ═══════════════════════ Types ═══════════════════════ */
interface MangaItem {
  id: string; slug: string; title: string; cover_url: string | null;
  description?: string | null; rating?: number | null; views?: number | null;
  genres?: string[] | null; chapter_count?: number | null; country?: string | null;
  status?: string | null; type?: string | null;
}
interface ChapterItem {
  id: string; chapter_number: number; title: string | null; created_at: string; views: number | null;
  manga: { id: string; slug: string; title: string; cover_url: string | null; genres: string[] | null; };
}

const fmt = (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(1)}K` : String(v);
const fmtTime = (d: string) => { try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ar }); } catch { return ""; } };

/* ═══════════════════════════════════════════════════════════════════════
   1. CINEMATIC HERO — Full-viewport immersive slider with floating particles
   ═══════════════════════════════════════════════════════════════════════ */
const CinematicHero = ({ items }: { items: MangaItem[] }) => {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 800], [0, 200]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const scale = useTransform(scrollY, [0, 600], [1, 1.1]);

  useEffect(() => {
    if (paused || !items.length) return;
    const t = setInterval(() => setIdx(p => (p + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [paused, items.length]);

  if (!items.length) return (
    <section className="relative h-[90vh] min-h-[650px] bg-background flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 mx-auto border-4 border-primary/30 border-t-primary rounded-full" />
        <p className="text-muted-foreground">جاري تحميل المحتوى...</p>
      </motion.div>
    </section>
  );

  const m = items[idx];

  return (
    <section className="relative h-[90vh] min-h-[650px] overflow-hidden" 
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      
      {/* Parallax BG with zoom */}
      <AnimatePresence mode="wait">
        <motion.div key={m.id}
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ opacity: 1, scale: 1.05 }}
          exit={{ opacity: 0, scale: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0" style={{ y: bgY, scale }}>
          <img src={m.cover_url || "/placeholder.svg"} alt="" className="w-full h-[130%] object-cover" />
        </motion.div>
      </AnimatePresence>

      {/* Multi-layer overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,hsl(var(--primary)/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.1),transparent_50%)]" />

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            initial={{ x: `${Math.random() * 100}%`, y: "110%", opacity: 0 }}
            animate={{ y: "-10%", opacity: [0, 1, 0] }}
            transition={{ duration: 6 + Math.random() * 8, repeat: Infinity, delay: Math.random() * 5, ease: "linear" }}
          />
        ))}
      </div>

      {/* Grain */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.4'/%3E%3C/svg%3E")`,
      }} />

      {/* Content */}
      <motion.div style={{ opacity }} className="relative z-10 container mx-auto px-4 h-full flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16 items-center w-full">
          <div className="max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div key={m.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-7">
                
                {/* Top badges */}
                <div className="flex items-center gap-3 flex-wrap">
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/15 backdrop-blur-2xl border border-primary/25">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-primary text-sm font-bold">مميز</span>
                  </motion.div>
                  {m.status && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent/15 backdrop-blur-2xl border border-accent/25">
                      <span className="text-accent text-sm font-bold">{m.status === 'ongoing' ? 'مستمر' : m.status === 'completed' ? 'مكتمل' : m.status}</span>
                    </motion.div>
                  )}
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2">
                  {m.genres?.slice(0, 5).map((g, gi) => (
                    <motion.span key={g} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + gi * 0.06 }}
                      className="px-3 py-1.5 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-xl text-sm text-foreground/80 font-medium">{g}</motion.span>
                  ))}
                </div>

                {/* Title */}
                <motion.h1 
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.8 }}
                  className="text-5xl md:text-7xl font-black text-foreground leading-[1.05] tracking-tight drop-shadow-2xl">
                  {m.title}
                </motion.h1>

                {/* Stats row */}
                <div className="flex items-center gap-6 text-muted-foreground flex-wrap">
                  {m.rating && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-black text-yellow-500">{m.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" /><span className="font-medium">{fmt(m.views || 0)} مشاهدة</span>
                  </div>
                  {m.chapter_count && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" /><span className="font-medium">{m.chapter_count} فصل</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-muted-foreground text-lg leading-relaxed line-clamp-2 max-w-xl">{m.description || "استمتع بقراءة هذا العمل الاستثنائي"}</p>

                {/* CTAs */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link to={`/manga/${m.slug || m.id}`}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button size="lg" className="gap-3 text-lg px-12 h-16 rounded-2xl shadow-2xl shadow-primary/40 font-bold relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%] group-hover:animate-[gradient_3s_ease_infinite] transition-all" />
                        <span className="relative flex items-center gap-3"><Play className="h-5 w-5 fill-current" /> ابدأ القراءة</span>
                      </Button>
                    </motion.div>
                  </Link>
                  <Link to={`/manga/${m.slug || m.id}`}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button size="lg" variant="outline" className="gap-3 text-lg px-10 h-16 rounded-2xl backdrop-blur-2xl border-foreground/10 hover:bg-foreground/5 font-bold">
                        <BookOpen className="h-5 w-5" /> التفاصيل
                      </Button>
                    </motion.div>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Cover Card — hidden on mobile */}
          <AnimatePresence mode="wait">
            <motion.div key={m.id}
              initial={{ opacity: 0, y: 80, rotateY: -20, rotateX: 5 }}
              animate={{ opacity: 1, y: 0, rotateY: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -60, rotateY: 20 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block">
              <div className="relative group perspective-1000">
                <motion.div whileHover={{ rotateY: -8, rotateX: 4, scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-72 xl:w-80 aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 ring-1 ring-primary/20">
                  <img src={m.cover_url || "/placeholder.svg"} alt={m.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/5" />
                  {/* Shine on hover */}
                  <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1500ms]" />
                  </div>
                </motion.div>
                {/* Glow */}
                <motion.div animate={{ opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 5, repeat: Infinity }}
                  className="absolute -inset-12 bg-primary/15 blur-[80px] rounded-full -z-10" />
                {/* Reflection */}
                <div className="absolute -bottom-8 left-4 right-4 h-16 bg-gradient-to-b from-primary/10 to-transparent blur-xl rounded-full" />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bottom nav with thumbnail previews */}
      <div className="absolute bottom-6 left-0 right-0 z-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => { setIdx(p => (p - 1 + items.length) % items.length); setPaused(true); setTimeout(() => setPaused(false), 5000); }}
              className="h-10 w-10 rounded-xl bg-card/40 backdrop-blur-xl border border-border/30 hover:bg-primary/20 flex items-center justify-center transition-all">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex gap-3 items-center">
              {items.map((item, i) => (
                <button key={i} onClick={() => setIdx(i)} className="group/dot relative">
                  <div className={cn(
                    "rounded-xl transition-all duration-500 overflow-hidden border",
                    i === idx 
                      ? "w-16 h-10 border-primary/60 shadow-lg shadow-primary/30" 
                      : "w-10 h-10 border-border/20 hover:border-primary/30 opacity-50 hover:opacity-80"
                  )}>
                    <img src={item.cover_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                  </div>
                  {i === idx && (
                    <motion.div layoutId="hero-indicator" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-primary shadow-lg shadow-primary/50" />
                  )}
                </button>
              ))}
            </div>
            <button onClick={() => { setIdx(p => (p + 1) % items.length); setPaused(true); setTimeout(() => setPaused(false), 5000); }}
              className="h-10 w-10 rounded-xl bg-card/40 backdrop-blur-xl border border-border/30 hover:bg-primary/20 flex items-center justify-center transition-all">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground/5">
        <motion.div key={`${idx}-${paused}`} initial={{ width: "0%" }} animate={{ width: paused ? undefined : "100%" }}
          transition={{ duration: 6, ease: "linear" }} className="h-full bg-gradient-to-r from-primary via-accent to-primary" />
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   2. TRENDING STRIP — Numbered ranking like AsuraScans/Toonily
   ═══════════════════════════════════════════════════════════════════════ */
const TrendingStrip = ({ items }: { items: MangaItem[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  if (!items.length) return null;

  return (
    <section className="py-10 relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.03] to-transparent" />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}
            className="p-2.5 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/30">
            <Flame className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground">الأكثر رواجاً</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              يتم التحديث الآن
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => ref.current?.scrollBy({ left: 340, behavior: "smooth" })} className="p-2 rounded-xl bg-card/60 backdrop-blur border border-border/30 hover:border-primary/40 transition"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => ref.current?.scrollBy({ left: -340, behavior: "smooth" })} className="p-2 rounded-xl bg-card/60 backdrop-blur border border-border/30 hover:border-primary/40 transition"><ChevronLeft className="h-4 w-4" /></button>
        </div>
      </div>

      <div ref={ref} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
        {items.slice(0, 10).map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: Math.min(i * 0.05, 0.4) }}
            className="flex-shrink-0" style={{ scrollSnapAlign: "start" }}>
            <Link to={`/manga/${item.slug || item.id}`} className="group flex items-end gap-1">
              {/* Large rank number */}
              <span className={cn(
                "text-7xl md:text-8xl font-black leading-none select-none transition-colors",
                i === 0 ? "text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]" :
                i === 1 ? "text-slate-400" :
                i === 2 ? "text-amber-700" :
                "text-foreground/10 group-hover:text-foreground/20"
              )}>
                {String(i + 1).padStart(2, '0')}
              </span>
              
              <motion.div whileHover={{ y: -10, scale: 1.03 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                <div className="relative w-40 md:w-48 aspect-[3/4] rounded-2xl overflow-hidden bg-card border border-border/20 group-hover:border-primary/40 transition-all duration-500 shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/15">
                  <img src={item.cover_url || "/placeholder.svg"} alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  
                  {/* Shine */}
                  <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none">
                    <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1400ms]" />
                  </div>

                  {/* Rating pill */}
                  {item.rating && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" /><span className="text-[11px] font-bold text-white">{item.rating.toFixed(1)}</span>
                    </div>
                  )}

                  {/* Bottom */}
                  <div className="absolute bottom-0 inset-x-0 p-3">
                    <h3 className="text-white font-bold text-sm line-clamp-2 drop-shadow-lg leading-snug">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Eye className="h-3 w-3 text-white/50" />
                      <span className="text-[10px] text-white/50">{fmt(item.views || 0)}</span>
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

/* ═══════════════════════════════════════════════════════════════════════
   3. POPULAR TODAY — Toonily-style grid with chapter info
   ═══════════════════════════════════════════════════════════════════════ */
const PopularGrid = ({ items, chapters }: { items: MangaItem[]; chapters: ChapterItem[] }) => {
  if (!items.length) return null;

  const getLatestChapters = (mangaId: string) => {
    return chapters.filter(c => c.manga?.id === mangaId).slice(0, 2);
  };

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/20">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-foreground">الأكثر شعبية اليوم</h2>
        </div>
        <Link to="/manga" className="text-sm text-primary font-bold hover:underline flex items-center gap-1">عرض الكل <ArrowLeft className="h-3.5 w-3.5" /></Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.slice(0, 12).map((item, i) => {
          const latestChs = getLatestChapters(item.id);
          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
              <div className="group bg-card rounded-2xl border border-border/20 hover:border-primary/30 overflow-hidden transition-all duration-400 hover:shadow-xl hover:shadow-primary/5">
                <Link to={`/manga/${item.slug || item.id}`}>
                  <div className="flex gap-4 p-4">
                    {/* Cover */}
                    <div className="relative w-24 h-32 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                      <img src={item.cover_url || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                      {i < 3 && (
                        <div className={cn(
                          "absolute top-1 left-1 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black",
                          i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-black" :
                          i === 1 ? "bg-gradient-to-br from-slate-300 to-gray-400 text-black" :
                          "bg-gradient-to-br from-amber-700 to-orange-800 text-white"
                        )}>{i + 1}</div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0 py-1">
                      <h3 className="font-bold text-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors mb-2">{item.title}</h3>
                      
                      <div className="flex items-center gap-3 mb-3">
                        {item.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-bold text-foreground">{item.rating.toFixed(1)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          <span className="text-xs">{fmt(item.views || 0)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {item.genres?.slice(0, 2).map(g => (
                          <span key={g} className="text-[10px] px-2 py-0.5 bg-secondary rounded-md text-muted-foreground">{g}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Latest chapters */}
                {latestChs.length > 0 && (
                  <div className="border-t border-border/10 px-4 py-2 space-y-1">
                    {latestChs.map(ch => (
                      <Link key={ch.id} to={`/read/${ch.manga?.slug || ch.manga?.id}/${ch.chapter_number}`}
                        className="flex items-center justify-between py-1 hover:bg-secondary/50 -mx-2 px-2 rounded-lg transition-colors">
                        <span className="text-xs font-medium text-primary">الفصل {ch.chapter_number}</span>
                        <span className="text-[10px] text-muted-foreground">{fmtTime(ch.created_at)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   4. WORLD CATEGORIES — Manga/Manhwa/Manhua cards with cover collages
   ═══════════════════════════════════════════════════════════════════════ */
const WorldCategories = ({ items }: { items: { type: string; label: string; desc: string; icon: any; gradient: string; manga: MangaItem[]; count: number }[] }) => {
  if (!items.length) return null;
  return (
    <section className="py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
          <Compass className="w-4 h-4 text-primary" />
          <span className="text-primary text-sm font-bold">استكشف العوالم</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-black mb-3">
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%] animate-[gradient_4s_ease_infinite]">
            عوالم مختلفة، متعة واحدة
          </span>
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">اكتشف أفضل الأعمال من اليابان وكوريا والصين</p>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((cat, ci) => {
          const Icon = cat.icon;
          return (
            <motion.div key={cat.type} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: ci * 0.15, type: "spring", stiffness: 200 }}>
              <Link to={`/${cat.type}`}>
                <motion.div whileHover={{ y: -10, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}
                  className="group relative rounded-3xl overflow-hidden bg-card border border-border/15 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10">
                  
                  {/* Cover collage */}
                  <div className="relative h-52 overflow-hidden">
                    <div className="grid grid-cols-4 h-full">
                      {cat.manga.slice(0, 4).map(m => (
                        <div key={m.id} className="overflow-hidden"><img src={m.cover_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" /></div>
                      ))}
                      {Array.from({ length: Math.max(0, 4 - cat.manga.length) }).map((_, i) => <div key={i} className="bg-muted" />)}
                    </div>
                    <div className={`absolute inset-0 bg-gradient-to-t ${cat.gradient} opacity-40 group-hover:opacity-25 transition-opacity duration-500`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                    
                    {/* Floating icon */}
                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}
                      className="absolute top-4 right-4 p-3 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/20 shadow-lg">
                      <Icon className="h-6 w-6 text-white" />
                    </motion.div>

                    {/* Count badge */}
                    <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10">
                      <span className="text-white font-black text-lg">{cat.count}</span>
                      <span className="text-white/60 text-xs mr-1">عمل</span>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">{cat.label}</h3>
                        <p className="text-sm text-muted-foreground">{cat.desc}</p>
                      </div>
                      <motion.div whileHover={{ x: -4 }} className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <ArrowLeft className="h-5 w-5 text-primary" />
                      </motion.div>
                    </div>
                    <div className="flex -space-x-2 rtl:space-x-reverse mt-4 pt-3 border-t border-border/15">
                      {cat.manga.slice(0, 4).map(m => (
                        <img key={m.id} src={m.cover_url || "/placeholder.svg"} alt="" className="w-8 h-8 rounded-full border-2 border-card object-cover" />
                      ))}
                      {cat.count > 4 && <div className="w-8 h-8 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">+{cat.count - 4}</div>}
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

/* ═══════════════════════════════════════════════════════════════════════
   5. SHOWCASE RAIL — Premium horizontal scroll with hover effects
   ═══════════════════════════════════════════════════════════════════════ */
const ShowcaseRail = ({ title, icon, items, link, accent }: { title: string; icon: React.ReactNode; items: MangaItem[]; link?: string; accent?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  if (!items.length) return null;

  return (
    <section className="py-10">
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-2xl shadow-lg", accent || "bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/10")}>{icon}</div>
          <h2 className="text-2xl md:text-3xl font-black text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => ref.current?.scrollBy({ left: 340, behavior: "smooth" })} className="p-2 rounded-xl bg-card/60 backdrop-blur border border-border/30 hover:border-primary/40 transition"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => ref.current?.scrollBy({ left: -340, behavior: "smooth" })} className="p-2 rounded-xl bg-card/60 backdrop-blur border border-border/30 hover:border-primary/40 transition"><ChevronLeft className="h-4 w-4" /></button>
          {link && <Link to={link} className="text-sm text-primary font-bold hover:underline mr-2 flex items-center gap-1">الكل <ArrowLeft className="h-3 w-3" /></Link>}
        </div>
      </div>
      <div ref={ref} className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
        {items.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: Math.min(i * 0.04, 0.3) }} className="flex-shrink-0" style={{ scrollSnapAlign: "start" }}>
            <Link to={`/manga/${item.slug || item.id}`} className="group block">
              <motion.div whileHover={{ y: -12 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                <div className="relative w-44 md:w-52 aspect-[3/4] rounded-2xl overflow-hidden bg-card border border-border/15 group-hover:border-primary/40 transition-all duration-500 shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/10">
                  <img src={item.cover_url || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/8 transition-colors duration-500" />
                  
                  {/* Shine */}
                  <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none">
                    <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1400ms]" />
                  </div>

                  {item.rating && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded-lg border border-white/10">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" /><span className="text-[11px] font-bold text-white">{item.rating.toFixed(1)}</span>
                    </div>
                  )}

                  <div className="absolute bottom-0 inset-x-0 p-3.5">
                    <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 drop-shadow-lg mb-1">{item.title}</h3>
                    <div className="flex gap-1.5 flex-wrap">
                      {item.genres?.slice(0, 2).map(g => (
                        <span key={g} className="text-[9px] px-1.5 py-0.5 bg-white/10 backdrop-blur rounded-md text-white/70">{g}</span>
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

/* ═══════════════════════════════════════════════════════════════════════
   6. EDITOR'S PICK — Cinematic spotlight with 3D card
   ═══════════════════════════════════════════════════════════════════════ */
const EditorSpotlight = ({ manga }: { manga: MangaItem | null }) => {
  if (!manga) return null;
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={manga.cover_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover blur-[120px] scale-[2] opacity-[0.07]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      </div>
      
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-12">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-400 shadow-xl shadow-amber-500/30">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">اختيار المحرر</h2>
            <p className="text-sm text-muted-foreground">العمل الأفضل تقييماً هذا الأسبوع</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-14 items-center">
          <motion.div initial={{ opacity: 0, scale: 0.8, rotateY: -20 }} whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
            viewport={{ once: true }} transition={{ type: "spring", stiffness: 150, damping: 20 }} className="mx-auto lg:mx-0">
            <div className="relative group perspective-1000">
              <motion.div whileHover={{ rotateY: -10, scale: 1.05 }} transition={{ type: "spring", stiffness: 200 }}
                className="w-64 md:w-80 aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border-2 border-primary/15 ring-1 ring-white/5">
                <img src={manga.cover_url || "/placeholder.svg"} alt={manga.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              </motion.div>
              <motion.div animate={{ opacity: [0.1, 0.4, 0.1] }} transition={{ duration: 5, repeat: Infinity }}
                className="absolute -inset-12 bg-primary/15 blur-[100px] rounded-full -z-10" />
              {/* Crown badge */}
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
                className="absolute -top-4 -right-4 p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-400 shadow-xl shadow-amber-500/40">
                <Trophy className="h-5 w-5 text-white" />
              </motion.div>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }} className="space-y-6 text-right">
            <div className="flex flex-wrap gap-2 justify-end">
              {manga.genres?.slice(0, 5).map(g => (
                <span key={g} className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-2xl text-sm text-primary font-bold">{g}</span>
              ))}
            </div>
            <h3 className="text-4xl md:text-6xl font-black text-foreground leading-tight">{manga.title}</h3>
            <p className="text-muted-foreground text-lg leading-relaxed line-clamp-3 max-w-xl mr-auto">{manga.description || "عمل استثنائي يستحق القراءة"}</p>
            
            <div className="flex items-center gap-8 justify-end">
              {manga.rating && (
                <div className="text-center">
                  <div className="flex items-center gap-1.5"><Star className="h-5 w-5 text-yellow-500 fill-yellow-500" /><span className="text-2xl font-black text-foreground">{manga.rating.toFixed(1)}</span></div>
                  <span className="text-xs text-muted-foreground">التقييم</span>
                </div>
              )}
              <div className="text-center">
                <span className="text-2xl font-black text-foreground">{manga.chapter_count || 0}</span>
                <p className="text-xs text-muted-foreground">فصل</p>
              </div>
              <div className="text-center">
                <span className="text-2xl font-black text-foreground">{fmt(manga.views || 0)}</span>
                <p className="text-xs text-muted-foreground">مشاهدة</p>
              </div>
            </div>
            
            <div className="flex gap-4 justify-end pt-4">
              <Link to={`/manga/${manga.slug || manga.id}`}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="gap-3 px-10 h-14 rounded-2xl shadow-xl shadow-primary/30 font-bold text-lg">
                    <Play className="h-5 w-5 fill-current" /> ابدأ القراءة
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   7. GENRE EXPLORER — Vibrant genre mosaic
   ═══════════════════════════════════════════════════════════════════════ */
const genreList = [
  { name: "أكشن", icon: Sword, gradient: "from-red-600 to-orange-500", glow: "shadow-red-500/25" },
  { name: "رومانسي", icon: Heart, gradient: "from-pink-500 to-rose-400", glow: "shadow-pink-500/25" },
  { name: "رعب", icon: Skull, gradient: "from-purple-700 to-violet-500", glow: "shadow-purple-500/25" },
  { name: "خيال", icon: Sparkles, gradient: "from-cyan-500 to-blue-500", glow: "shadow-cyan-500/25" },
  { name: "قتال", icon: Flame, gradient: "from-amber-500 to-yellow-400", glow: "shadow-amber-500/25" },
  { name: "مغامرة", icon: Shield, gradient: "from-emerald-600 to-green-400", glow: "shadow-emerald-500/25" },
  { name: "غموض", icon: Ghost, gradient: "from-slate-600 to-gray-400", glow: "shadow-slate-500/25" },
  { name: "قوى خارقة", icon: Zap, gradient: "from-indigo-600 to-blue-400", glow: "shadow-indigo-500/25" },
];

const GenreExplorer = () => (
  <section className="py-16 relative">
    <div className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
    </div>
    
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent/10 border border-accent/20 mb-4">
        <Target className="w-4 h-4 text-accent" />
        <span className="text-accent text-sm font-bold">التصنيفات</span>
      </div>
      <h2 className="text-3xl md:text-4xl font-black mb-2">
        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">استكشف حسب التصنيف</span>
      </h2>
      <p className="text-muted-foreground text-sm">اختر تصنيفك المفضل وابدأ رحلتك</p>
    </motion.div>
    
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {genreList.map((g, i) => {
        const Icon = g.icon;
        return (
          <motion.div key={g.name} initial={{ opacity: 0, y: 25, scale: 0.9 }} whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }} transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}>
            <Link to={`/manga?genre=${g.name}`}>
              <motion.div whileHover={{ y: -10, scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className={`group relative overflow-hidden rounded-2xl p-7 bg-gradient-to-br ${g.gradient} shadow-xl ${g.glow} hover:shadow-2xl transition-shadow duration-500`}>
                
                {/* Shine */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1500ms]" />
                </div>
                
                {/* Noise texture */}
                <div className="absolute inset-0 opacity-[0.06] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4xIi8+PC9zdmc+')]" />
                
                <div className="relative z-10 flex flex-col items-center gap-3 text-center">
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

/* ═══════════════════════════════════════════════════════════════════════
   8. LATEST CHAPTERS — Toonily-style release feed with chapter pills
   ═══════════════════════════════════════════════════════════════════════ */
const LatestChaptersSection = ({ chapters, loading }: { chapters: ChapterItem[]; loading: boolean }) => {
  if (loading) return (
    <section className="py-12">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[3/4] rounded-2xl bg-card animate-pulse" />
            <div className="h-3 w-3/4 bg-card rounded animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );

  if (!chapters.length) return null;

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/20">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground">آخر الإصدارات</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
                className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {chapters.map((ch, i) => (
          <motion.div key={ch.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
            <Link to={`/read/${ch.manga?.slug || ch.manga?.id}/${ch.chapter_number}`} className="group block">
              <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }}>
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-card border border-border/15 hover:border-primary/30 transition-all duration-500 shadow-md hover:shadow-xl hover:shadow-primary/10">
                  <img src={ch.manga?.cover_url || "/placeholder.svg"} alt={ch.manga?.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90" />
                  
                  {/* Shine */}
                  <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none">
                    <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1200ms]" />
                  </div>

                  {/* Chapter badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <div className="bg-primary/90 backdrop-blur-md rounded-xl px-2.5 py-1">
                      <span className="text-[11px] text-primary-foreground font-bold">الفصل {ch.chapter_number}</span>
                    </div>
                  </div>

                  {/* Time badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <div className="bg-black/50 backdrop-blur-md rounded-xl px-2 py-0.5 border border-white/10">
                      <span className="text-[10px] text-white/70">{fmtTime(ch.created_at)}</span>
                    </div>
                  </div>

                  <div className="absolute bottom-0 inset-x-0 p-3">
                    <h3 className="text-white font-bold text-sm line-clamp-2 drop-shadow-lg">{ch.manga?.title}</h3>
                    {ch.views != null && ch.views > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Eye className="h-3 w-3 text-white/40" />
                        <span className="text-[10px] text-white/40">{fmt(ch.views)}</span>
                      </div>
                    )}
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

/* ═══════════════════════════════════════════════════════════════════════
   9. STATS BAR — Animated counters
   ═══════════════════════════════════════════════════════════════════════ */
const AnimatedCounter = ({ value }: { value: number }) => {
  const spring = useSpring(0, { stiffness: 50, damping: 20 });
  const display = useTransform(spring, v => fmt(Math.round(v)));
  const ref = useRef<HTMLSpanElement>(null);
  
  useEffect(() => { spring.set(value); }, [value, spring]);
  useEffect(() => {
    const unsub = display.on("change", v => { if (ref.current) ref.current.textContent = v; });
    return unsub;
  }, [display]);
  
  return <span ref={ref}>0</span>;
};

const StatsBar = ({ stats }: { stats: { manga: number; chapters: number; views: number; teams: number } }) => {
  const statItems = [
    { label: "عمل", value: stats.manga, icon: BookOpen, color: "text-primary" },
    { label: "فصل", value: stats.chapters, icon: Layers, color: "text-accent" },
    { label: "مشاهدة", value: stats.views, icon: Eye, color: "text-yellow-500" },
    { label: "فريق", value: stats.teams, icon: Users, color: "text-emerald-500" },
  ];

  return (
    <section className="py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="relative group p-5 rounded-2xl bg-card/50 backdrop-blur border border-border/15 hover:border-primary/20 transition-all text-center">
              <Icon className={cn("h-6 w-6 mx-auto mb-2", s.color)} />
              <div className="text-3xl font-black text-foreground"><AnimatedCounter value={s.value} /></div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
const Index = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [featured, setFeatured] = useState<MangaItem[]>([]);
  const [popular, setPopular] = useState<MangaItem[]>([]);
  const [newReleases, setNewReleases] = useState<MangaItem[]>([]);
  const [updated, setUpdated] = useState<MangaItem[]>([]);
  const [editorPick, setEditorPick] = useState<MangaItem | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [stats, setStats] = useState({ manga: 0, chapters: 0, views: 0, teams: 0 });

  useEffect(() => {
    // Admin check
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
        if (data?.some(r => r.role === "admin")) setIsAdmin(true);
      });
    });

    const fetchAll = async () => {
      const [featRes, popRes, newRes, updRes, pickRes, chapRes, mangaCount, chapCount, viewsRes, teamsCount] = await Promise.all([
        supabase.from("manga").select("id, slug, title, cover_url, description, rating, views, genres, chapter_count, status").eq("publish_status", "published").eq("is_featured", true).order("views", { ascending: false }).limit(5),
        supabase.from("manga").select("id, slug, title, cover_url, rating, views, genres, status").eq("publish_status", "published").order("views", { ascending: false }).limit(15),
        supabase.from("manga").select("id, slug, title, cover_url, rating, views, genres").eq("publish_status", "published").order("created_at", { ascending: false }).limit(15),
        supabase.from("manga").select("id, slug, title, cover_url, rating, views, genres").eq("publish_status", "published").order("updated_at", { ascending: false }).limit(15),
        supabase.from("manga").select("id, slug, title, cover_url, description, rating, views, genres, chapter_count").eq("publish_status", "published").eq("is_featured", true).order("rating", { ascending: false }).limit(1).single(),
        supabase.from("chapters").select("id, chapter_number, title, created_at, views, manga:manga_id (id, slug, title, cover_url, genres)").order("created_at", { ascending: false }).limit(18),
        supabase.from("manga").select("id", { count: "exact", head: true }).eq("publish_status", "published"),
        supabase.from("chapters").select("id", { count: "exact", head: true }),
        supabase.from("manga").select("views").eq("publish_status", "published"),
        supabase.from("teams").select("id", { count: "exact", head: true }),
      ]);

      if (featRes.data) setFeatured(featRes.data);
      if (popRes.data) setPopular(popRes.data);
      if (newRes.data) setNewReleases(newRes.data);
      if (updRes.data) setUpdated(updRes.data);
      if (pickRes.data) setEditorPick(pickRes.data);
      if (chapRes.data) setChapters(chapRes.data as any);
      setChaptersLoading(false);

      const totalViews = viewsRes.data?.reduce((s, m) => s + (m.views || 0), 0) || 0;
      setStats({
        manga: mangaCount.count || 0,
        chapters: chapCount.count || 0,
        views: totalViews,
        teams: teamsCount.count || 0,
      });

      // Categories
      const catDefs = [
        { type: "manga", label: "مانجا", desc: "أعمال يابانية أصلية", icon: BookOpen, gradient: "from-rose-600 to-pink-500", country: "اليابان" },
        { type: "manhwa", label: "مانهوا", desc: "أعمال كورية ملونة", icon: Palette, gradient: "from-blue-600 to-cyan-500", country: "كوريا" },
        { type: "manhua", label: "مانها", desc: "أعمال صينية مميزة", icon: Crown, gradient: "from-amber-600 to-yellow-500", country: "الصين" },
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

      {/* 1. Cinematic Hero */}
      <CinematicHero items={featured.length > 0 ? featured : popular.slice(0, 5)} />

      {/* 2. Stats Bar */}
      <div className="container mx-auto px-4">
        <StatsBar stats={stats} />
      </div>

      {/* 3. Trending Strip (numbered ranking) */}
      <div className="container mx-auto px-4">
        <TrendingStrip items={popular} />
      </div>

      {/* 4. World Categories */}
      <div className="container mx-auto px-4">
        <WorldCategories items={categories} />
      </div>

      {/* 5. Popular Today (grid with chapter info) */}
      <div className="bg-card/30">
        <div className="container mx-auto px-4">
          <PopularGrid items={popular} chapters={chapters} />
        </div>
      </div>

      {/* 6. Editor's Pick */}
      <EditorSpotlight manga={editorPick} />

      {/* 7. Genre Explorer */}
      <div className="container mx-auto px-4">
        <GenreExplorer />
      </div>

      {/* 8. New Releases Rail */}
      <div className="bg-card/20">
        <div className="container mx-auto px-4">
          <ShowcaseRail title="إصدارات جديدة" icon={<Gem className="h-6 w-6 text-yellow-500" />}
            accent="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/15"
            items={newReleases} link="/manga" />
        </div>
      </div>

      {/* 9. Recently Updated Rail */}
      <div className="container mx-auto px-4">
        <ShowcaseRail title="آخر التحديثات" icon={<TrendingUp className="h-6 w-6 text-accent" />}
          accent="bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/15"
          items={updated} link="/manga" />
      </div>

      {/* 10. Latest Chapters */}
      <div className="bg-card/30">
        <div className="container mx-auto px-4">
          <LatestChaptersSection chapters={chapters} loading={chaptersLoading} />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
