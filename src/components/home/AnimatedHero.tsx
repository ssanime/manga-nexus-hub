import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Play, Star, Eye, ChevronLeft, ChevronRight, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeaturedManga {
  id: string;
  slug: string;
  title: string;
  cover_url: string;
  description: string;
  rating: number;
  views: number;
  genres: string[];
}

export const AnimatedHero = () => {
  const [featuredManga, setFeaturedManga] = useState<FeaturedManga[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase
        .from("manga")
        .select("id, slug, title, cover_url, description, rating, views, genres")
        .eq("publish_status", "published")
        .eq("is_featured", true)
        .order("views", { ascending: false })
        .limit(5);
      if (data && data.length > 0) setFeaturedManga(data);
    };
    fetchFeatured();
  }, []);

  useEffect(() => {
    if (isPaused || featuredManga.length === 0) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % featuredManga.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, featuredManga.length, currentIndex]);

  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % featuredManga.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000);
  };

  const goToPrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + featuredManga.length) % featuredManga.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000);
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0, scale: 1.1 }),
    center: {
      x: 0, opacity: 1, scale: 1,
      transition: { x: { type: "spring" as const, stiffness: 300, damping: 30 }, opacity: { duration: 0.6 }, scale: { duration: 0.8 } },
    },
    exit: (direction: number) => ({
      x: direction > 0 ? "-100%" : "100%", opacity: 0, scale: 0.95,
      transition: { x: { type: "spring" as const, stiffness: 300, damping: 30 }, opacity: { duration: 0.3 } },
    }),
  };

  const textVariants = {
    hidden: { opacity: 0, y: 40, filter: "blur(10px)" },
    visible: (i: number) => ({
      opacity: 1, y: 0, filter: "blur(0px)",
      transition: { delay: i * 0.12, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
    }),
  };

  if (featuredManga.length === 0) {
    return (
      <div className="relative h-[75vh] min-h-[550px] bg-gradient-to-br from-card via-background to-card flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </motion.div>
      </div>
    );
  }

  const currentManga = featuredManga[currentIndex];

  return (
    <section
      ref={sectionRef}
      className="relative h-[80vh] min-h-[600px] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Parallax Background */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
        >
          <motion.div className="absolute inset-0" style={{ y: bgY }}>
            <img
              src={currentManga.cover_url || "/placeholder.svg"}
              alt={currentManga.title}
              className="w-full h-[120%] object-cover"
            />
            {/* Multi-layer gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
            {/* Color wash */}
            <div className="absolute inset-0 bg-primary/5 mix-blend-overlay" />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px]"
        />
        <motion.div
          animate={{ x: [0, -80, 0], y: [0, 60, 0], scale: [1.2, 1, 1.2] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 left-20 w-48 h-48 bg-accent/10 rounded-full blur-[60px]"
        />
      </div>

      {/* Content */}
      <motion.div style={{ opacity: contentOpacity }} className="relative z-10 container mx-auto px-4 h-full flex items-center">
        <div className="max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div key={currentIndex} className="space-y-6">
              {/* Badge */}
              <motion.div custom={0} variants={textVariants} initial="hidden" animate="visible">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 backdrop-blur-md border border-primary/20 text-primary text-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>مميز</span>
                </div>
              </motion.div>

              {/* Genres */}
              <motion.div custom={1} variants={textVariants} initial="hidden" animate="visible" className="flex flex-wrap gap-2">
                {currentManga.genres?.slice(0, 4).map((genre, i) => (
                  <motion.span
                    key={genre}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="px-3 py-1 bg-card/40 backdrop-blur-md border border-border/50 rounded-full text-sm text-foreground/80"
                  >
                    {genre}
                  </motion.span>
                ))}
              </motion.div>

              {/* Title */}
              <motion.h1
                custom={2}
                variants={textVariants}
                initial="hidden"
                animate="visible"
                className="text-4xl md:text-6xl font-black text-foreground leading-tight tracking-tight"
              >
                {currentManga.title}
              </motion.h1>

              {/* Stats */}
              <motion.div custom={3} variants={textVariants} initial="hidden" animate="visible"
                className="flex items-center gap-6 text-muted-foreground"
              >
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-foreground">{currentManga.rating?.toFixed(1) || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  <span>{(currentManga.views || 0).toLocaleString()} مشاهدة</span>
                </div>
              </motion.div>

              {/* Description */}
              <motion.p custom={4} variants={textVariants} initial="hidden" animate="visible"
                className="text-muted-foreground text-lg line-clamp-3 max-w-xl leading-relaxed"
              >
                {currentManga.description || "استمتع بقراءة هذا العمل المميز على موقعنا"}
              </motion.p>

              {/* CTA */}
              <motion.div custom={5} variants={textVariants} initial="hidden" animate="visible"
                className="flex flex-wrap gap-4 pt-4"
              >
                <Link to={`/manga/${currentManga.slug || currentManga.id}`}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" className="gap-2 text-lg px-8 h-14 shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all">
                      <Play className="h-5 w-5" />
                      ابدأ القراءة
                    </Button>
                  </motion.div>
                </Link>
                <Link to={`/manga/${currentManga.slug || currentManga.id}`}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" variant="outline" className="gap-2 text-lg px-8 h-14 backdrop-blur-md border-primary/30 hover:bg-primary/10">
                      <BookOpen className="h-5 w-5" />
                      التفاصيل
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Cover Preview */}
        <motion.div
          initial={{ opacity: 0, x: 100, rotateY: -15 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="hidden lg:block absolute left-16 top-1/2 -translate-y-1/2"
        >
          <div className="relative" style={{ perspective: 1200 }}>
            <motion.div
              whileHover={{ scale: 1.05, rotateY: -8 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-72 h-[420px] rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 border border-primary/20"
              style={{ transformStyle: "preserve-3d" }}
            >
              <img src={currentManga.cover_url || "/placeholder.svg"} alt={currentManga.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {/* Reflection */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            </motion.div>
            {/* Glow */}
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -inset-6 bg-primary/15 blur-3xl rounded-full -z-10"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Navigation */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button variant="ghost" size="icon" onClick={goToPrevious}
            className="h-12 w-12 rounded-full bg-card/40 backdrop-blur-md border border-border/50 hover:bg-primary/20 hover:border-primary/50"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </motion.div>

        <div className="flex items-center gap-2">
          {featuredManga.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => { setDirection(index > currentIndex ? 1 : -1); setCurrentIndex(index); }}
              className={`relative h-2 rounded-full transition-all duration-500 ${
                index === currentIndex ? "w-10 bg-primary shadow-lg shadow-primary/50" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
              }`}
              whileHover={{ scale: 1.3 }}
              whileTap={{ scale: 0.8 }}
            />
          ))}
        </div>

        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button variant="ghost" size="icon" onClick={goToNext}
            className="h-12 w-12 rounded-full bg-card/40 backdrop-blur-md border border-border/50 hover:bg-primary/20 hover:border-primary/50"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </motion.div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/20">
        <motion.div
          key={currentIndex}
          initial={{ width: "0%" }}
          animate={{ width: isPaused ? undefined : "100%" }}
          transition={{ duration: 6, ease: "linear" }}
          className="h-full bg-gradient-to-r from-primary via-accent to-primary"
        />
      </div>

      {/* Slide counter */}
      <div className="absolute top-6 left-6 z-20">
        <div className="px-3 py-1.5 rounded-full bg-card/40 backdrop-blur-md border border-border/50 text-xs font-mono">
          <span className="text-primary font-bold">{String(currentIndex + 1).padStart(2, '0')}</span>
          <span className="text-muted-foreground"> / {String(featuredManga.length).padStart(2, '0')}</span>
        </div>
      </div>
    </section>
  );
};
