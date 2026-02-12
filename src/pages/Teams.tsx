import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/home/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Plus, Search, Grid3X3, List, Trophy, TrendingUp,
  BookOpen, Crown, Shield, Star, ArrowUpDown, Filter,
  ChevronUp, Eye, Calendar, Flame, Heart, Share2,
  Award, Zap, Target, Clock, CheckCircle2, BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SortOption = "newest" | "oldest" | "most_members" | "most_manga" | "name_asc" | "name_desc";
type ViewMode = "grid" | "list";

interface TeamWithStats {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  status: string;
  join_requirements: string | null;
  member_count: number;
  manga_count: number;
  chapter_count: number;
  total_views: number;
}

export default function Teams() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("most_members");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(12);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTeams();
    checkUser();

    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user ?? null);
  };

  const fetchTeams = async () => {
    // Fetch teams with member count
    const { data: teamsData, error } = await supabase
      .from("teams")
      .select(`
        *,
        team_members (count)
      `)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error || !teamsData) {
      setLoading(false);
      return;
    }

    // Fetch manga counts per team
    const { data: mangaData } = await supabase
      .from("manga")
      .select("team_id, views")
      .not("team_id", "is", null);

    // Fetch chapter counts per team
    const { data: chapterData } = await supabase
      .from("chapters")
      .select("team_id")
      .not("team_id", "is", null);

    const mangaByTeam: Record<string, { count: number; views: number }> = {};
    const chapterByTeam: Record<string, number> = {};

    mangaData?.forEach((m) => {
      if (m.team_id) {
        if (!mangaByTeam[m.team_id]) mangaByTeam[m.team_id] = { count: 0, views: 0 };
        mangaByTeam[m.team_id].count++;
        mangaByTeam[m.team_id].views += m.views || 0;
      }
    });

    chapterData?.forEach((c) => {
      if (c.team_id) {
        chapterByTeam[c.team_id] = (chapterByTeam[c.team_id] || 0) + 1;
      }
    });

    const enriched: TeamWithStats[] = teamsData.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      logo_url: t.logo_url,
      created_at: t.created_at,
      status: t.status,
      join_requirements: t.join_requirements,
      member_count: (t.team_members as any)?.[0]?.count || 0,
      manga_count: mangaByTeam[t.id]?.count || 0,
      chapter_count: chapterByTeam[t.id] || 0,
      total_views: mangaByTeam[t.id]?.views || 0,
    }));

    setTeams(enriched);
    setLoading(false);
  };

  // 1. Search system
  const filteredTeams = useMemo(() => {
    let result = teams;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // 2. Sort system
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "most_members": return b.member_count - a.member_count;
        case "most_manga": return b.manga_count - a.manga_count;
        case "name_asc": return a.name.localeCompare(b.name, "ar");
        case "name_desc": return b.name.localeCompare(a.name, "ar");
        default: return 0;
      }
    });

    return result;
  }, [teams, searchQuery, sortBy]);

  // 3. Pagination / Load more
  const visibleTeams = useMemo(
    () => filteredTeams.slice(0, visibleCount),
    [filteredTeams, visibleCount]
  );

  // 4. Global statistics
  const globalStats = useMemo(() => {
    const totalMembers = teams.reduce((s, t) => s + t.member_count, 0);
    const totalManga = teams.reduce((s, t) => s + t.manga_count, 0);
    const totalChapters = teams.reduce((s, t) => s + t.chapter_count, 0);
    const totalViews = teams.reduce((s, t) => s + t.total_views, 0);
    return { totalTeams: teams.length, totalMembers, totalManga, totalChapters, totalViews };
  }, [teams]);

  // 5. Top 3 leaderboard
  const topTeams = useMemo(
    () => [...teams].sort((a, b) => b.manga_count - a.manga_count || b.member_count - a.member_count).slice(0, 3),
    [teams]
  );

  // 6. Favorite toggle (local)
  const toggleFavorite = useCallback((teamId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      return next;
    });
  }, []);

  // 7. Share team
  const shareTeam = useCallback(async (team: TeamWithStats, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/teams/${team.slug}`;
    if (navigator.share) {
      await navigator.share({ title: team.name, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, []);

  // 8. Relative time
  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "اليوم";
    if (days === 1) return "أمس";
    if (days < 7) return `منذ ${days} أيام`;
    if (days < 30) return `منذ ${Math.floor(days / 7)} أسابيع`;
    if (days < 365) return `منذ ${Math.floor(days / 30)} أشهر`;
    return `منذ ${Math.floor(days / 365)} سنوات`;
  };

  // 9. Rank badge
  const getRankBadge = (index: number) => {
    const medals = [
      { icon: "🥇", color: "from-yellow-500/30 to-yellow-600/10", border: "border-yellow-500/50" },
      { icon: "🥈", color: "from-gray-400/30 to-gray-500/10", border: "border-gray-400/50" },
      { icon: "🥉", color: "from-amber-700/30 to-amber-800/10", border: "border-amber-700/50" },
    ];
    return medals[index];
  };

  // 10. Activity level
  const getActivityLevel = (team: TeamWithStats) => {
    const score = team.manga_count * 3 + team.chapter_count + team.member_count * 2;
    if (score > 50) return { label: "نشاط عالي", color: "text-green-400", icon: Flame };
    if (score > 20) return { label: "نشاط متوسط", color: "text-yellow-400", icon: Zap };
    return { label: "فريق جديد", color: "text-muted-foreground", icon: Target };
  };

  // 11. Format large numbers
  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  // Card animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1, y: 0, scale: 1,
      transition: { delay: i * 0.05, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
    }),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background" ref={containerRef}>
      <Navbar />

      <main className="flex-1">
        {/* ===== HERO SECTION ===== */}
        <section className="relative py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
          <div className="absolute top-20 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />

          <div className="container mx-auto relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
                <Users className="w-4 h-4" />
                <span>{globalStats.totalTeams} فريق ترجمة نشط</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                فرق الترجمة
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                انضم لأفضل فرق الترجمة العربية أو أنشئ فريقك الخاص وابدأ رحلة الترجمة
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/teams/create")}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground"
              >
                <Plus className="w-5 h-5 ml-2" />
                إنشاء فريق جديد
              </Button>
            </motion.div>

            {/* ===== GLOBAL STATS ===== */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto"
            >
              {[
                { icon: Users, label: "فريق", value: globalStats.totalTeams, color: "text-primary" },
                { icon: Crown, label: "عضو", value: globalStats.totalMembers, color: "text-yellow-400" },
                { icon: BookOpen, label: "مانجا", value: globalStats.totalManga, color: "text-blue-400" },
                { icon: BarChart3, label: "فصل", value: globalStats.totalChapters, color: "text-green-400" },
                { icon: Eye, label: "مشاهدة", value: formatNumber(globalStats.totalViews), color: "text-accent" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="p-4 rounded-xl bg-card/60 border border-border/50 backdrop-blur text-center hover:border-primary/40 transition-all"
                >
                  <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ===== LEADERBOARD ===== */}
        {topTeams.length >= 3 && (
          <section className="py-12 px-4">
            <div className="container mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-8 text-center"
              >
                <div className="inline-flex items-center gap-2 text-primary mb-2">
                  <Trophy className="w-5 h-5" />
                  <h2 className="text-2xl font-bold">لوحة المتصدرين</h2>
                </div>
                <p className="text-muted-foreground">أكثر الفرق نشاطاً وإنتاجية</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {topTeams.map((team, i) => {
                  const medal = getRankBadge(i);
                  return (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15 }}
                      whileHover={{ y: -6, scale: 1.02 }}
                      onClick={() => navigate(`/teams/${team.slug}`)}
                      className={`relative p-6 rounded-2xl bg-gradient-to-br ${medal?.color} border ${medal?.border} cursor-pointer backdrop-blur transition-all`}
                    >
                      <div className="absolute -top-3 -right-3 text-3xl">{medal?.icon}</div>

                      <div className="flex flex-col items-center text-center gap-3">
                        {team.logo_url ? (
                          <img
                            src={team.logo_url}
                            alt={team.name}
                            className="w-20 h-20 rounded-full object-cover border-2 border-primary/50"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                            <Users className="w-8 h-8 text-primary" />
                          </div>
                        )}
                        <h3 className="text-lg font-bold">{team.name}</h3>
                        <div className="flex gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {team.member_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            {team.manga_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {formatNumber(team.total_views)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ===== SEARCH + FILTERS + SORT ===== */}
        <section className="py-8 px-4 border-y border-border/50 bg-card/20 backdrop-blur sticky top-16 z-40">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="ابحث عن فريق..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(12); }}
                  className="pr-10 bg-card border-border"
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-48 bg-card border-border">
                  <ArrowUpDown className="w-4 h-4 ml-2" />
                  <SelectValue placeholder="ترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="most_members">الأكثر أعضاء</SelectItem>
                  <SelectItem value="most_manga">الأكثر أعمالاً</SelectItem>
                  <SelectItem value="newest">الأحدث</SelectItem>
                  <SelectItem value="oldest">الأقدم</SelectItem>
                  <SelectItem value="name_asc">أبجدي (أ-ي)</SelectItem>
                  <SelectItem value="name_desc">أبجدي (ي-أ)</SelectItem>
                </SelectContent>
              </Select>

              {/* View mode */}
              <div className="flex bg-card border border-border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="rounded-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="rounded-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Result count */}
              <Badge variant="secondary" className="whitespace-nowrap">
                <Filter className="w-3 h-3 ml-1" />
                {filteredTeams.length} نتيجة
              </Badge>
            </div>
          </div>
        </section>

        {/* ===== TEAMS CONTENT ===== */}
        <section className="py-12 px-4">
          <div className="container mx-auto">
            {loading ? (
              /* ===== SKELETON LOADING ===== */
              <div className={viewMode === "grid" ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-6 bg-card border-border">
                    <div className="flex flex-col items-center gap-4">
                      <Skeleton className="w-20 h-20 rounded-full" />
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-60" />
                      <div className="flex gap-3">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredTeams.length === 0 ? (
              /* ===== EMPTY STATE ===== */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="p-16 text-center bg-card/50 border-border">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                  >
                    <Users className="w-20 h-20 mx-auto mb-6 text-muted-foreground/50" />
                  </motion.div>
                  {searchQuery ? (
                    <>
                      <h3 className="text-2xl font-bold mb-2">لا توجد نتائج</h3>
                      <p className="text-muted-foreground mb-6">
                        لم نجد فريقاً يطابق "{searchQuery}"
                      </p>
                      <Button variant="outline" onClick={() => setSearchQuery("")}>
                        مسح البحث
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold mb-2">لا توجد فرق بعد</h3>
                      <p className="text-muted-foreground mb-6">كن أول من ينشئ فريق ترجمة!</p>
                      <Button onClick={() => navigate("/teams/create")}>
                        <Plus className="w-4 h-4 ml-2" />
                        إنشاء فريق
                      </Button>
                    </>
                  )}
                </Card>
              </motion.div>
            ) : viewMode === "grid" ? (
              /* ===== GRID VIEW ===== */
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {visibleTeams.map((team, i) => {
                    const activity = getActivityLevel(team);
                    const ActivityIcon = activity.icon;
                    return (
                      <motion.div
                        key={team.id}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, scale: 0.9 }}
                        layout
                        whileHover={{ y: -6 }}
                      >
                        <Card
                          className="group relative overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 cursor-pointer"
                          onClick={() => navigate(`/teams/${team.slug}`)}
                        >
                          {/* Hover glow */}
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                          {/* Quick actions */}
                          <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-8 h-8 bg-card/80 backdrop-blur hover:bg-primary/20"
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(team.id); }}
                                >
                                  <Heart
                                    className={`w-4 h-4 transition-all ${
                                      favorites.has(team.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                                    }`}
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>مفضلة</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-8 h-8 bg-card/80 backdrop-blur hover:bg-primary/20"
                                  onClick={(e) => shareTeam(team, e)}
                                >
                                  <Share2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>مشاركة</TooltipContent>
                            </Tooltip>
                          </div>

                          {/* Activity badge */}
                          <div className="absolute top-3 right-3 z-10">
                            <Badge variant="secondary" className={`gap-1 text-xs ${activity.color}`}>
                              <ActivityIcon className="w-3 h-3" />
                              {activity.label}
                            </Badge>
                          </div>

                          <div className="relative p-6 space-y-5">
                            {/* Logo */}
                            <div className="flex justify-center">
                              {team.logo_url ? (
                                <motion.img
                                  whileHover={{ scale: 1.1, rotate: 5 }}
                                  src={team.logo_url}
                                  alt={team.name}
                                  className="w-24 h-24 rounded-full object-cover border-3 border-primary/40 shadow-lg"
                                />
                              ) : (
                                <motion.div
                                  whileHover={{ scale: 1.1, rotate: 5 }}
                                  className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center shadow-lg"
                                >
                                  <Users className="w-10 h-10 text-primary" />
                                </motion.div>
                              )}
                            </div>

                            {/* Name + Description */}
                            <div className="text-center">
                              <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                                {team.name}
                              </h3>
                              {team.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {team.description}
                                </p>
                              )}
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { icon: Users, value: team.member_count, label: "عضو" },
                                { icon: BookOpen, value: team.manga_count, label: "مانجا" },
                                { icon: BarChart3, value: team.chapter_count, label: "فصل" },
                              ].map((stat) => (
                                <div
                                  key={stat.label}
                                  className="text-center p-2 rounded-lg bg-secondary/30"
                                >
                                  <stat.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                                  <p className="text-sm font-bold">{stat.value}</p>
                                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                                </div>
                              ))}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {relativeTime(team.created_at)}
                              </span>
                              {team.total_views > 0 && (
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {formatNumber(team.total_views)}
                                </span>
                              )}
                            </div>

                            {/* CTA */}
                            <Button
                              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground"
                              onClick={(e) => { e.stopPropagation(); navigate(`/teams/${team.slug}`); }}
                            >
                              عرض الفريق
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              /* ===== LIST VIEW ===== */
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {visibleTeams.map((team, i) => {
                    const activity = getActivityLevel(team);
                    const ActivityIcon = activity.icon;
                    return (
                      <motion.div
                        key={team.id}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20 }}
                        layout
                      >
                        <Card
                          className="group p-4 bg-card border-border hover:border-primary/50 transition-all cursor-pointer"
                          onClick={() => navigate(`/teams/${team.slug}`)}
                        >
                          <div className="flex items-center gap-4">
                            {/* Logo */}
                            {team.logo_url ? (
                              <img
                                src={team.logo_url}
                                alt={team.name}
                                className="w-14 h-14 rounded-full object-cover border-2 border-primary/30 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <Users className="w-6 h-6 text-primary" />
                              </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                                  {team.name}
                                </h3>
                                <Badge variant="secondary" className={`gap-1 text-[10px] ${activity.color}`}>
                                  <ActivityIcon className="w-3 h-3" />
                                  {activity.label}
                                </Badge>
                              </div>
                              {team.description && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {team.description}
                                </p>
                              )}
                            </div>

                            {/* Stats */}
                            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                {team.member_count}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4" />
                                {team.manga_count}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <BarChart3 className="w-4 h-4" />
                                {team.chapter_count}
                              </span>
                              <span className="flex items-center gap-1.5 text-xs">
                                <Clock className="w-3.5 h-3.5" />
                                {relativeTime(team.created_at)}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-8 h-8"
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(team.id); }}
                              >
                                <Heart
                                  className={`w-4 h-4 ${
                                    favorites.has(team.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                                  }`}
                                />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-8 h-8"
                                onClick={(e) => shareTeam(team, e)}
                              >
                                <Share2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* ===== LOAD MORE ===== */}
            {visibleCount < filteredTeams.length && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-12 text-center"
              >
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setVisibleCount((prev) => prev + 12)}
                  className="gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  عرض المزيد ({filteredTeams.length - visibleCount} متبقي)
                </Button>
              </motion.div>
            )}
          </div>
        </section>

        {/* ===== CTA SECTION ===== */}
        <section className="py-16 px-4 bg-gradient-to-br from-primary/5 via-card/30 to-accent/5 border-t border-border/50">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto text-center"
            >
              <Award className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-3xl font-bold mb-4">هل أنت مترجم موهوب؟</h2>
              <p className="text-muted-foreground mb-8">
                انضم لأحد الفرق أو أنشئ فريقك الخاص وساهم في إثراء المحتوى العربي
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate("/teams/create")}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  <Plus className="w-5 h-5 ml-2" />
                  إنشاء فريق
                </Button>
                {!currentUser && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/auth")}
                  >
                    سجّل دخولك أولاً
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />

      {/* ===== BACK TO TOP ===== */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
