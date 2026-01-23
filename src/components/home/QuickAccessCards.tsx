import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, Palette, Crown, Zap } from "lucide-react";

const categories = [
  {
    title: "مانجا",
    description: "أعمال يابانية أصلية",
    icon: BookOpen,
    href: "/manga",
    gradient: "from-rose-500 to-pink-600",
    bgGlow: "bg-rose-500/20",
  },
  {
    title: "مانهوا",
    description: "أعمال كورية ملونة",
    icon: Palette,
    href: "/manhwa",
    gradient: "from-blue-500 to-cyan-600",
    bgGlow: "bg-blue-500/20",
  },
  {
    title: "مانها",
    description: "أعمال صينية مميزة",
    icon: Crown,
    href: "/manhua",
    gradient: "from-amber-500 to-orange-600",
    bgGlow: "bg-amber-500/20",
  },
  {
    title: "فرق الترجمة",
    description: "انضم لفريقك المفضل",
    icon: Zap,
    href: "/teams",
    gradient: "from-violet-500 to-purple-600",
    bgGlow: "bg-violet-500/20",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

export const QuickAccessCards = () => {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
      className="py-12"
    >
      <motion.h2
        variants={cardVariants}
        className="text-2xl md:text-3xl font-bold text-center mb-8"
      >
        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          استكشف المحتوى
        </span>
      </motion.h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <motion.div key={category.href} variants={cardVariants}>
              <Link to={category.href}>
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative overflow-hidden rounded-2xl p-6 bg-card border border-border/50 hover:border-transparent transition-all duration-300"
                >
                  {/* Background Glow */}
                  <div className={`absolute inset-0 ${category.bgGlow} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  {/* Gradient Border Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                  <div className="relative z-10">
                    {/* Icon */}
                    <motion.div
                      whileHover={{ rotate: 15, scale: 1.1 }}
                      className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${category.gradient} mb-4`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </motion.div>

                    {/* Content */}
                    <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>

                    {/* Arrow */}
                    <motion.div
                      initial={{ x: 0, opacity: 0 }}
                      whileHover={{ x: -5, opacity: 1 }}
                      className="absolute bottom-6 left-6 text-primary"
                    >
                      ←
                    </motion.div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
};
