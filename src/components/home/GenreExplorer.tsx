import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sword, Heart, Skull, Sparkles, Flame, Shield, Ghost, Zap } from "lucide-react";

const genres = [
  { name: "أكشن", icon: Sword, gradient: "from-red-600 to-orange-500", glow: "shadow-red-500/30", path: "/manga?genre=أكشن" },
  { name: "رومانسي", icon: Heart, gradient: "from-pink-500 to-rose-400", glow: "shadow-pink-500/30", path: "/manga?genre=رومانسي" },
  { name: "رعب", icon: Skull, gradient: "from-purple-700 to-violet-500", glow: "shadow-purple-500/30", path: "/manga?genre=رعب" },
  { name: "خيال", icon: Sparkles, gradient: "from-cyan-500 to-blue-500", glow: "shadow-cyan-500/30", path: "/manga?genre=خيال" },
  { name: "قتال", icon: Flame, gradient: "from-amber-500 to-yellow-400", glow: "shadow-amber-500/30", path: "/manga?genre=قتال" },
  { name: "مغامرة", icon: Shield, gradient: "from-emerald-600 to-green-400", glow: "shadow-emerald-500/30", path: "/manga?genre=مغامرة" },
  { name: "غموض", icon: Ghost, gradient: "from-slate-600 to-gray-400", glow: "shadow-slate-500/30", path: "/manga?genre=غموض" },
  { name: "قوى خارقة", icon: Zap, gradient: "from-indigo-600 to-blue-400", glow: "shadow-indigo-500/30", path: "/manga?genre=قوى خارقة" },
];

export const GenreExplorer = () => {
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h2 className="text-3xl md:text-4xl font-black mb-3">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            استكشف حسب التصنيف
          </span>
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          اختر تصنيفك المفضل وابدأ رحلتك في عالم المانجا
        </p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {genres.map((genre, i) => {
          const Icon = genre.icon;
          return (
            <motion.div
              key={genre.name}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
            >
              <Link to={genre.path}>
                <motion.div
                  whileHover={{ y: -10, scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className={`group relative overflow-hidden rounded-2xl p-6 cursor-pointer bg-gradient-to-br ${genre.gradient} shadow-xl ${genre.glow} hover:shadow-2xl transition-shadow duration-500`}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-[1500ms]" />
                  </div>

                  {/* Noise texture */}
                  <div className="absolute inset-0 opacity-[0.08] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4xIi8+PC9zdmc+')]" />

                  <div className="relative z-10 flex flex-col items-center text-center gap-3">
                    <motion.div
                      whileHover={{ rotate: 20, scale: 1.2 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Icon className="h-10 w-10 text-white drop-shadow-lg" />
                    </motion.div>
                    <span className="text-white font-bold text-lg drop-shadow-md">{genre.name}</span>
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
