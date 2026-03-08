import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, Eye, BookOpen, ArrowLeft, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MangaItem {
  id: string;
  slug: string;
  title: string;
  cover_url: string;
  description: string;
  rating: number;
  views: number;
  genres: string[];
  chapter_count: number;
}

export const EditorsPick = () => {
  const [manga, setManga] = useState<MangaItem | null>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("manga")
        .select("id, slug, title, cover_url, description, rating, views, genres, chapter_count")
        .eq("publish_status", "published")
        .eq("is_featured", true)
        .order("rating", { ascending: false })
        .limit(1)
        .single();
      if (data) setManga(data);
    };
    fetch();
  }, []);

  if (!manga) return null;

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Cinematic background */}
      <div className="absolute inset-0 -z-10">
        <img
          src={manga.cover_url || "/placeholder.svg"}
          alt=""
          className="w-full h-full object-cover blur-[80px] scale-125 opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
      </div>

      <div className="container mx-auto px-4">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex items-center gap-3 mb-10"
        >
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 shadow-lg shadow-amber-500/30">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">اختيار المحرر</h2>
            <p className="text-sm text-muted-foreground">العمل الأبرز لهذا الأسبوع</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-10 items-center">
          {/* 3D Cover Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, type: "spring" }}
            onMouseMove={handleMouse}
            onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
            className="relative mx-auto lg:mx-0 perspective-[1200px]"
          >
            <motion.div
              style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
              className="relative w-72 md:w-80 aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border-2 border-primary/20 group"
            >
              <img src={manga.cover_url || "/placeholder.svg"} alt={manga.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              {/* Glass reflection */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
              {/* Rating overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-bold text-sm">{manga.rating?.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <Eye className="h-4 w-4 text-blue-400" />
                  <span className="text-white text-sm">{(manga.views || 0).toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
            {/* Glow beneath */}
            <motion.div
              animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -inset-8 bg-primary/15 blur-[60px] rounded-full -z-10"
            />
          </motion.div>

          {/* Info Panel */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="space-y-6 text-right"
          >
            {/* Genres */}
            <div className="flex flex-wrap gap-2 justify-end">
              {manga.genres?.slice(0, 5).map((g, i) => (
                <motion.span
                  key={g}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary font-medium backdrop-blur-sm"
                >
                  {g}
                </motion.span>
              ))}
            </div>

            <h3 className="text-4xl md:text-5xl font-black text-foreground leading-tight">{manga.title}</h3>

            <p className="text-muted-foreground text-lg leading-relaxed line-clamp-4">
              {manga.description || "عمل استثنائي يستحق القراءة. تابع الأحداث المشوّقة واستمتع بالرسومات الرائعة."}
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-6 justify-end text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>{manga.chapter_count || 0} فصل</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{(manga.views || 0).toLocaleString()} مشاهدة</span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-4 justify-end pt-2">
              <Link to={`/manga/${manga.slug || manga.id}`}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="gap-2 text-lg px-8 h-14 shadow-xl shadow-primary/30">
                    <BookOpen className="h-5 w-5" />
                    ابدأ القراءة
                  </Button>
                </motion.div>
              </Link>
              <Link to={`/manga/${manga.slug || manga.id}`}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" variant="outline" className="gap-2 h-14 border-primary/30 hover:bg-primary/10">
                    التفاصيل
                    <ArrowLeft className="h-4 w-4" />
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
