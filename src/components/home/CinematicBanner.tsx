import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Palette, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  { type: "manga", label: "مانجا", desc: "أعمال يابانية", icon: BookOpen, gradient: "from-rose-600 to-pink-500" },
  { type: "manhwa", label: "مانهوا", desc: "أعمال كورية", icon: Palette, gradient: "from-blue-600 to-cyan-500" },
  { type: "manhua", label: "مانها", desc: "أعمال صينية", icon: Crown, gradient: "from-amber-600 to-yellow-500" },
];

interface CategoryData {
  type: string;
  label: string;
  desc: string;
  icon: any;
  gradient: string;
  items: { id: string; slug: string; cover_url: string; title: string }[];
  count: number;
}

export const CinematicBanner = () => {
  const [data, setData] = useState<CategoryData[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.all(
        categories.map(async (cat) => {
          const countryMap: Record<string, string> = { manga: "اليابان", manhwa: "كوريا", manhua: "الصين" };
          const [{ data: items }, { count }] = await Promise.all([
            supabase
              .from("manga")
              .select("id, slug, cover_url, title")
              .eq("publish_status", "published")
              .eq("country", countryMap[cat.type])
              .order("views", { ascending: false })
              .limit(4),
            supabase
              .from("manga")
              .select("id", { count: "exact", head: true })
              .eq("publish_status", "published")
              .eq("country", countryMap[cat.type]),
          ]);
          return { ...cat, items: items || [], count: count || 0 };
        })
      );
      setData(results);
    };
    fetchAll();
  }, []);

  if (data.length === 0) return null;

  return (
    <section className="py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-10"
      >
        <h2 className="text-3xl md:text-4xl font-black mb-2">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            عوالم مختلفة، متعة واحدة
          </span>
        </h2>
        <p className="text-muted-foreground text-sm">اكتشف أفضل الأعمال من اليابان وكوريا والصين</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.type}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.6 }}
            >
              <Link to={`/${cat.type === "manhwa" ? "manhwa" : cat.type}`}>
                <motion.div
                  whileHover={{ y: -8 }}
                  className="group relative rounded-3xl overflow-hidden bg-card border border-border/30 hover:border-primary/40 transition-all duration-500"
                >
                  {/* Cover collage */}
                  <div className="relative h-48 overflow-hidden">
                    <div className="grid grid-cols-4 h-full">
                      {cat.items.map((item, i) => (
                        <div key={item.id} className="relative overflow-hidden">
                          <img
                            src={item.cover_url || "/placeholder.svg"}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                          />
                        </div>
                      ))}
                      {/* Fill empty slots */}
                      {Array.from({ length: Math.max(0, 4 - cat.items.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-muted" />
                      ))}
                    </div>
                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-t ${cat.gradient} opacity-60 group-hover:opacity-40 transition-opacity duration-500`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    
                    {/* Icon float */}
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute top-4 right-4 p-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-xl"
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </motion.div>
                  </div>

                  {/* Info */}
                  <div className="p-5 space-y-3">
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

                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <div className="flex -space-x-2 rtl:space-x-reverse">
                        {cat.items.slice(0, 3).map((item) => (
                          <img
                            key={item.id}
                            src={item.cover_url || "/placeholder.svg"}
                            alt=""
                            className="w-8 h-8 rounded-full border-2 border-card object-cover"
                          />
                        ))}
                      </div>
                      <span className="text-xs text-primary flex items-center gap-1 group-hover:gap-2 transition-all font-bold">
                        تصفح الآن
                        <ArrowLeft className="h-3 w-3" />
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
