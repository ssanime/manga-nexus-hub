import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Play, Star, Eye, ChevronLeft, ChevronRight } from "lucide-react";
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

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase
        .from("manga")
        .select("id, slug, title, cover_url, description, rating, views, genres")
        .eq("publish_status", "published")
        .eq("is_featured", true)
        .order("views", { ascending: false })
        .limit(5);
      
      if (data && data.length > 0) {
        setFeaturedManga(data);
      }
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
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.5 },
        scale: { duration: 0.5 },
      },
    },
    exit: (direction: number) => ({
      x: direction > 0 ? "-100%" : "100%",
      opacity: 0,
      scale: 0.9,
      transition: {
        x: { type: "spring" as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
      },
    }),
  };

  const textVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        ease: "easeOut" as const,
      },
    }),
  };

  if (featuredManga.length === 0) {
    return (
      <div className="relative h-[70vh] min-h-[500px] bg-gradient-to-br from-card via-background to-card flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </motion.div>
      </div>
    );
  }

  const currentManga = featuredManga[currentIndex];

  return (
    <section 
      className="relative h-[75vh] min-h-[550px] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Animated Background */}
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
          {/* Background Image with Overlay */}
          <div className="absolute inset-0">
            <img
              src={currentManga.cover_url || "/placeholder.svg"}
              alt={currentManga.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Animated Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: -10,
            }}
            animate={{
              y: typeof window !== 'undefined' ? window.innerHeight + 10 : 800,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
        <div className="max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div key={currentIndex} className="space-y-6">
              {/* Genres */}
              <motion.div
                custom={0}
                variants={textVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap gap-2"
              >
                {currentManga.genres?.slice(0, 4).map((genre, i) => (
                  <motion.span
                    key={genre}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="px-3 py-1 bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full text-sm text-primary"
                  >
                    {genre}
                  </motion.span>
                ))}
              </motion.div>

              {/* Title */}
              <motion.h1
                custom={1}
                variants={textVariants}
                initial="hidden"
                animate="visible"
                className="text-4xl md:text-6xl font-bold text-foreground leading-tight"
              >
                {currentManga.title}
              </motion.h1>

              {/* Stats */}
              <motion.div
                custom={2}
                variants={textVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-6 text-muted-foreground"
              >
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold text-foreground">
                    {currentManga.rating?.toFixed(1) || "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  <span>{(currentManga.views || 0).toLocaleString()} مشاهدة</span>
                </div>
              </motion.div>

              {/* Description */}
              <motion.p
                custom={3}
                variants={textVariants}
                initial="hidden"
                animate="visible"
                className="text-muted-foreground text-lg line-clamp-3 max-w-xl"
              >
                {currentManga.description || "استمتع بقراءة هذا العمل المميز على موقعنا"}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                custom={4}
                variants={textVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap gap-4 pt-4"
              >
                <Link to={`/manga/${currentManga.slug || currentManga.id}`}>
                  <Button size="lg" className="gap-2 text-lg px-8 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all">
                    <Play className="h-5 w-5" />
                    ابدأ القراءة
                  </Button>
                </Link>
                <Link to={`/manga/${currentManga.slug || currentManga.id}`}>
                  <Button size="lg" variant="outline" className="gap-2 text-lg px-8 backdrop-blur-sm border-primary/30 hover:bg-primary/10">
                    المزيد من التفاصيل
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Featured Cover Preview */}
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="hidden lg:block absolute left-16 top-1/2 -translate-y-1/2"
        >
          <div className="relative">
            <motion.div
              whileHover={{ scale: 1.05, rotateY: -5 }}
              className="w-64 h-96 rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 border-2 border-primary/20"
              style={{ perspective: 1000 }}
            >
              <img
                src={currentManga.cover_url || "/placeholder.svg"}
                alt={currentManga.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </motion.div>
            
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full -z-10" />
          </div>
        </motion.div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevious}
          className="h-12 w-12 rounded-full bg-card/50 backdrop-blur-sm border border-border hover:bg-primary/20 hover:border-primary/50"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        {/* Pagination Dots */}
        <div className="flex items-center gap-2">
          {featuredManga.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`relative h-2 rounded-full transition-all duration-300 ${
                index === currentIndex ? "w-8 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground"
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              {index === currentIndex && (
                <motion.div
                  layoutId="activeDot"
                  className="absolute inset-0 bg-primary rounded-full"
                />
              )}
            </motion.button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
          className="h-12 w-12 rounded-full bg-card/50 backdrop-blur-sm border border-border hover:bg-primary/20 hover:border-primary/50"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30">
        <motion.div
          key={currentIndex}
          initial={{ width: "0%" }}
          animate={{ width: isPaused ? undefined : "100%" }}
          transition={{ duration: 6, ease: "linear" }}
          className="h-full bg-gradient-to-r from-primary to-accent"
        />
      </div>
    </section>
  );
};
