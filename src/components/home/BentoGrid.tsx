import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Star, Eye, Clock, Flame, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MangaItem {
  id: string;
  slug?: string;
  title: string;
  cover_url?: string;
  rating?: number;
  views?: number;
  genres?: string[];
}

interface BentoGridProps {
  title: string;
  icon: React.ReactNode;
  items: MangaItem[];
  variant?: "large" | "medium" | "small";
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
};

export const BentoGrid = ({ title, icon, items, variant = "medium", className }: BentoGridProps) => {
  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const getGridClass = () => {
    switch (variant) {
      case "large":
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4";
      case "medium":
        return "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3";
      case "small":
        return "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2";
      default:
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4";
    }
  };

  const getCardSize = () => {
    switch (variant) {
      case "large":
        return "aspect-[3/4]";
      case "medium":
        return "aspect-[2/3]";
      case "small":
        return "aspect-[3/4]";
      default:
        return "aspect-[3/4]";
    }
  };

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={containerVariants}
      className={cn("py-8", className)}
    >
      {/* Section Header */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm"
          >
            {icon}
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {title}
          </h2>
        </div>
        <motion.div whileHover={{ x: -5 }}>
          <Link
            to="/manga"
            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            عرض الكل
            <span className="text-lg">←</span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Grid */}
      <motion.div className={cn("grid", getGridClass())}>
        {items.slice(0, variant === "large" ? 10 : variant === "medium" ? 12 : 16).map((item, index) => (
          <motion.div
            key={item.id}
            variants={itemVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className="group"
          >
            <Link to={`/manga/${item.slug || item.id}`}>
              <div className={cn(
                "relative overflow-hidden rounded-xl bg-card border border-border/50",
                "transition-all duration-300",
                "hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10",
                getCardSize()
              )}>
                {/* Cover Image */}
                <img
                  src={item.cover_url || "/placeholder.svg"}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                {/* Rating Badge */}
                {item.rating && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg"
                  >
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-semibold text-white">
                      {item.rating.toFixed(1)}
                    </span>
                  </motion.div>
                )}

                {/* Views Badge */}
                {item.views && variant === "large" && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-white">{formatViews(item.views)}</span>
                  </div>
                )}

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className={cn(
                    "font-bold text-white line-clamp-2 group-hover:text-primary transition-colors",
                    variant === "small" ? "text-xs" : variant === "medium" ? "text-sm" : "text-base"
                  )}>
                    {item.title}
                  </h3>

                  {/* Genres - only for large variant */}
                  {variant === "large" && item.genres && item.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.genres.slice(0, 2).map((genre) => (
                        <span
                          key={genre}
                          className="text-xs px-2 py-0.5 bg-primary/30 rounded-full text-primary-foreground"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300" />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
};

// Pre-built section components
export const PopularSection = ({ items }: { items: MangaItem[] }) => (
  <BentoGrid
    title="الأعمال الشعبية"
    icon={<Flame className="h-6 w-6 text-primary" />}
    items={items}
    variant="large"
  />
);

export const TrendingSection = ({ items }: { items: MangaItem[] }) => (
  <BentoGrid
    title="الأعمال الرائجة"
    icon={<TrendingUp className="h-6 w-6 text-accent" />}
    items={items}
    variant="medium"
    className="bg-card/30 py-12 -mx-4 px-4 md:-mx-8 md:px-8"
  />
);

export const NewReleasesSection = ({ items }: { items: MangaItem[] }) => (
  <BentoGrid
    title="إصدارات جديدة"
    icon={<Sparkles className="h-6 w-6 text-yellow-500" />}
    items={items}
    variant="medium"
  />
);

export const RecentlyUpdatedSection = ({ items }: { items: MangaItem[] }) => (
  <BentoGrid
    title="آخر التحديثات"
    icon={<Clock className="h-6 w-6 text-primary" />}
    items={items}
    variant="small"
  />
);
