import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Users, Layers, Eye } from "lucide-react";

interface Stats {
  mangaCount: number;
  chapterCount: number;
  totalViews: number;
  teamCount: number;
}

const AnimatedNumber = ({ value }: { value: number }) => {
  const spring = useSpring(0, { duration: 2000 });
  const display = useTransform(spring, (current) => Math.floor(current).toLocaleString());

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
};

export const StatsSection = () => {
  const [stats, setStats] = useState<Stats>({
    mangaCount: 0,
    chapterCount: 0,
    totalViews: 0,
    teamCount: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [mangaResult, chapterResult, viewsResult, teamResult] = await Promise.all([
        supabase.from("manga").select("id", { count: "exact", head: true }).eq("publish_status", "published"),
        supabase.from("chapters").select("id", { count: "exact", head: true }),
        supabase.from("manga").select("views").eq("publish_status", "published"),
        supabase.from("teams").select("id", { count: "exact", head: true }).eq("status", "approved"),
      ]);

      const totalViews = viewsResult.data?.reduce((sum, m) => sum + (m.views || 0), 0) || 0;

      setStats({
        mangaCount: mangaResult.count || 0,
        chapterCount: chapterResult.count || 0,
        totalViews,
        teamCount: teamResult.count || 0,
      });
    };

    fetchStats();
  }, []);

  const statItems = [
    {
      label: "عمل متاح",
      value: stats.mangaCount,
      icon: BookOpen,
      gradient: "from-rose-500 to-pink-600",
    },
    {
      label: "فصل مترجم",
      value: stats.chapterCount,
      icon: Layers,
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      label: "مشاهدة",
      value: stats.totalViews,
      icon: Eye,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      label: "فريق ترجمة",
      value: stats.teamCount,
      icon: Users,
      gradient: "from-violet-500 to-purple-600",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="py-12 relative overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {statItems.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="relative group"
            >
              <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300">
                {/* Icon */}
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.gradient} mb-4`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </motion.div>

                {/* Number */}
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                  <AnimatedNumber value={stat.value} />
                </div>

                {/* Label */}
                <p className="text-sm text-muted-foreground">{stat.label}</p>

                {/* Hover Glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
};
