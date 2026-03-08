import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface MangaItem {
  id: string;
  slug: string;
  title: string;
  cover_url: string;
  rating: number;
  views: number;
  genres: string[];
}

interface Props {
  title: string;
  query: "popular" | "new" | "updated";
}

export const MangaShowcase = ({ title, query }: Props) => {
  const [items, setItems] = useState<MangaItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const parallaxX = useTransform(scrollYProgress, [0, 1], [30, -30]);

  useEffect(() => {
    const fetchItems = async () => {
      let q = supabase
        .from("manga")
        .select("id, slug, title, cover_url, rating, views, genres")
        .eq("publish_status", "published");

      if (query === "popular") q = q.order("views", { ascending: false });
      else if (query === "new") q = q.order("created_at", { ascending: false });
      else q = q.order("updated_at", { ascending: false });

      const { data } = await q.limit(15);
      if (data) setItems(data);
    };
    fetchItems();
  }, [query]);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section ref={containerRef} className="py-12 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex items-center gap-3"
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/10">
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {title}
          </h2>
        </motion.div>

        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll(1)}
            className="p-2 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll(-1)}
            className="p-2 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <Link to="/manga" className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-primary transition-colors">
            عرض الكل
          </Link>
        </div>
      </div>

      {/* Horizontal scroll */}
      <motion.div style={{ x: parallaxX }}>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="flex-shrink-0"
              style={{ scrollSnapAlign: "start" }}
            >
              <Link to={`/manga/${item.slug || item.id}`} className="group block">
                <motion.div
                  whileHover={{ y: -12, scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative w-48 md:w-56"
                >
                  {/* Card */}
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-card border border-border/30 group-hover:border-primary/50 transition-all duration-500 shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/15">
                    <img
                      src={item.cover_url || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    {/* Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-500" />

                    {/* Shine sweep */}
                    <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none">
                      <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1300ms]" />
                    </div>

                    {/* Rating */}
                    {item.rating && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10">
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-bold text-white">{item.rating.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Rank medal for top 3 */}
                    {i < 3 && (
                      <div className={cn(
                        "absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg",
                        i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-black" :
                        i === 1 ? "bg-gradient-to-br from-slate-300 to-gray-400 text-black" :
                        "bg-gradient-to-br from-amber-600 to-orange-700 text-white"
                      )}>
                        {i + 1}
                      </div>
                    )}

                    {/* Bottom info */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-white font-bold text-sm line-clamp-2 mb-1 group-hover:text-primary-foreground transition-colors drop-shadow-lg">
                        {item.title}
                      </h3>
                      {item.genres?.slice(0, 2).map((g) => (
                        <span key={g} className="inline-block text-[10px] px-2 py-0.5 bg-white/10 rounded-full text-white/80 mr-1 mt-1 backdrop-blur-sm">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};
