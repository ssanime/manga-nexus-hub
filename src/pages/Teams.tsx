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
  Award, Zap, Target, Clock, CheckCircle2, BarChart3,
  Sparkles, Globe, MapPin, ExternalLink, UserPlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
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

type SortOption = "newest" | "oldest" | "most_members" | "most_manga" | "most_views" | "name_asc" | "name_desc";
type ViewMode = "grid" | "list";
type FilterStatus = "all" | "active" | "new";

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
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(12);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.95]);

  useEffect(() => {
    fetchTeams();
    checkUser();
    const savedFavs = localStorage.getItem("team_favorites");
    if (savedFavs) setFavorites(new Set(JSON.parse(savedFavs)));

    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user ?? null);
  };

  const fetchTeams = async () => {
    const { data: teamsData, error } = await supabase
      .from("teams")
      .select(`*, team_members (count)`)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error || !teamsData) { setLoading(false); return; }

    const { data: mangaData } = await supabase
      .from("manga").select("team_id, views").not("team_id", "is", null);
    const { data: chapterData } = await supabase
      .from("chapters").select("team_id").not("team_id", "is", null);

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
      if (c.team_id) chapterByTeam[c.team_id] = (chapterByTeam[c.team_id] || 0) + 1;
    });

    const enriched: TeamWithStats[] = teamsData.map((t) => ({
      id: t.id, name: t.name, slug: t.slug, description: t.description,
      logo_url: t.logo_url, created_at: t.created_at, status: t.status,
      join_requirements: t.join_requirements,
      member_count: (t.team_members as any)?.[0]?.count || 0,
      manga_count: mangaByTeam[t.id]?.count || 0,
      chapter_count: chapterByTeam[t.id] || 0,
      total_views: mangaByTeam[t.id]?.views || 0,
    }));

    setTeams(enriched);
    setLoading(false);
  };

  const filteredTeams = useMemo(() => {
    let result = teams;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }

    if (filterStatus === "active") {
      result = result.filter(t => t.manga_count > 0 || t.chapter_count > 0);
    } else if (filterStatus === "new") {
      const thirtyDaysAgo = Date.now() - 30 * 86400000;
      result = result.filter(t => new Date(t.created_at).getTime() > thirtyDaysAgo);
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "most_members": return b.member_count - a.member_count;
        case "most_manga": return b.manga_count - a.manga_count;
        case "most_views": return b.total_views - a.total_views;
        case "name_asc": return a.name.localeCompare(b.name, "ar");
        case "name_desc": return b.name.localeCompare(a.name, "ar");
        default: return 0;
      }
    });

    return result;
  }, [teams, searchQuery, sortBy, filterStatus]);

  const visibleTeams = useMemo(() => filteredTeams.slice(0, visibleCount), [filteredTeams, visibleCount]);

  const globalStats = useMemo(() => ({
    totalTeams: teams.length,
    totalMembers: teams.reduce((s, t) => s + t.member_count, 0),
    totalManga: teams.reduce((s, t) => s + t.manga_count, 0),
    totalChapters: teams.reduce((s, t) => s + t.chapter_count, 0),
    totalViews: teams.reduce((s, t) => s + t.total_views, 0),
  }), [teams]);

  const topTeams = useMemo(
    () => [...teams].sort((a, b) => (b.manga_count * 3 + b.chapter_count + b.total_views / 100) - (a.manga_count * 3 + a.chapter_count + a.total_views / 100)).slice(0, 3),
    [teams]
  );

  const toggleFavorite = useCallback((teamId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      localStorage.setItem("team_favorites", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const shareTeam = useCallback(async (team: TeamWithStats, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/teams/${team.slug}`;
    if (navigator.share) await navigator.share({ title: team.name, url });
    else await navigator.clipboard.writeText(url);
  }, []);

  const relativeTime = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return "اليوم";
    if (days === 1) return "أمس";
    if (days < 7) return `منذ ${days} أيام`;
    if (days < 30) return `منذ ${Math.floor(days / 7)} أسابيع`;
    if (days < 365) return `منذ ${Math.floor(days / 30)} أشهر`;
    return `منذ ${Math.floor(days / 365)} سنوات`;
  };

  const getRankBadge = (index: number) => {
    const medals = [
      { icon: "🥇", bg: "from-yellow-500/20 to-amber-600/10", border: "border-yellow-500/40", glow: "shadow-yellow-500/20" },
      { icon: "🥈", bg: "from-slate-400/20 to-slate-500/10", border: "border-slate-400/40", glow: "shadow-slate-400/20" },
      { icon: "🥉", bg: "from-amber-700/20 to-orange-800/10", border: "border-amber-700/40", glow: "shadow-amber-700/20" },
    ];
    return medals[index];
  };

  const getActivityLevel = (team: TeamWithStats) => {
    const score = team.manga_count * 3 + team.chapter_count + team.member_count * 2;
    if (score > 50) return { label: "نشاط عالي", color: "text-green-400", bg: "bg-green-500/10", icon: Flame };
    if (score > 20) return { label: "نشاط متوسط", color: "text-yellow-400", bg: "bg-yellow-500/10", icon: Zap };
    return { label: "فريق جديد", color: "text-blue-400", bg: "bg-blue-500/10", icon: Sparkles };
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1, y: 0, scale: 1,
      transition: { delay: i * 0.04, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
    }),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* ===== HERO ===== */}
        <motion.section
          ref={heroRef}
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative py-24 px-4 overflow-hidden"
        >
          {/* Animated mesh gradient background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8" />
            <motion.div
              animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]"
            />
            <motion.div
              animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-10 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]"
            />
          </div>

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 bg-primary/20 rounded-full"
                initial={{ x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%` }}
                animate={{
                  y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                  x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                  opacity: [0.2, 0.6, 0.2],
                }}
                transition={{ duration: Math.random() * 15 + 10, repeat: Infinity }}
              />
            ))}
          </div>

          <div className="container mx-auto relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-center mb-14"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6 backdrop-blur-sm"
              >
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                <span className="font-medium">{globalStats.totalTeams} فريق ترجمة نشط</span>
              </motion.div>

              <h1 className="text-5xl md:text-7xl font-black mb-5">
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-[gradient_3s_linear_infinite]">
                  فرق الترجمة
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                انضم لأفضل فرق الترجمة العربية أو أنشئ فريقك الخاص وابدأ رحلة الترجمة
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    onClick={() => navigate("/teams/create")}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground text-lg px-8 h-14 shadow-xl shadow-primary/20"
                  >
                    <Plus className="w-5 h-5 ml-2" />
                    إنشاء فريق جديد
                  </Button>
                </motion.div>
                {!currentUser && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="lg" variant="outline"
                      onClick={() => navigate("/auth")}
                      className="text-lg px-8 h-14 border-primary/30 hover:bg-primary/10"
                    >
                      <UserPlus className="w-5 h-5 ml-2" />
                      سجّل الدخول
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl mx-auto"
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  whileHover={{ y: -4, scale: 1.03 }}
                  className="p-4 rounded-2xl bg-card/60 border border-border/50 backdrop-blur-sm text-center hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
                >
                  <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                  <p className="text-2xl font-black">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* ===== LEADERBOARD ===== */}
        {topTeams.length >= 3 && (
          <section className="py-16 px-4 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent" />
            <div className="container mx-auto relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-10 text-center"
              >
                <div className="inline-flex items-center gap-2 text-primary mb-3">
                  <Trophy className="w-6 h-6" />
                  <h2 className="text-3xl font-black">لوحة المتصدرين</h2>
                </div>
                <p className="text-muted-foreground">أكثر الفرق نشاطاً وإنتاجية في المنصة</p>
              </motion.div>

              {/* Podium layout: 2nd, 1st, 3rd */}
              <div className="flex items-end justify-center gap-4 md:gap-6 max-w-4xl mx-auto">
                {[topTeams[1], topTeams[0], topTeams[2]].map((team, displayIdx) => {
                  const actualIdx = displayIdx === 0 ? 1 : displayIdx === 1 ? 0 : 2;
                  const medal = getRankBadge(actualIdx);
                  const heights = ["h-56 md:h-64", "h-64 md:h-80", "h-48 md:h-56"];
                  return (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: displayIdx * 0.15, type: "spring" }}
                      whileHover={{ y: -8 }}
                      onClick={() => navigate(`/teams/${team.slug}`)}
                      className={`relative flex-1 max-w-[280px] ${heights[displayIdx]} rounded-2xl bg-gradient-to-br ${medal?.bg} border ${medal?.border} cursor-pointer backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${medal?.glow} overflow-hidden`}
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                      <div className="absolute -top-2 -right-2 text-4xl z-10">{medal?.icon}</div>

                      <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-4 relative z-10">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt={team.name}
                            className={`${actualIdx === 0 ? "w-24 h-24" : "w-18 h-18"} rounded-full object-cover border-2 border-primary/40 shadow-lg`}
                          />
                        ) : (
                          <div className={`${actualIdx === 0 ? "w-24 h-24" : "w-18 h-18"} rounded-full bg-primary/20 flex items-center justify-center shadow-lg`}>
                            <Users className={`${actualIdx === 0 ? "w-10 h-10" : "w-7 h-7"} text-primary`} />
                          </div>
                        )}
                        <h3 className="font-bold text-sm md:text-lg">{team.name}</h3>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{team.member_count}</span>
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{team.manga_count}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(team.total_views)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ===== FILTERS ===== */}
        <section className="py-6 px-4 border-y border-border/50 bg-card/30 backdrop-blur-sm sticky top-16 z-40">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="ابحث عن فريق..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(12); }}
                  className="pr-10 bg-card border-border h-11"
                />
              </div>

              {/* Filter chips */}
              <div className="flex gap-2">
                {[
                  { value: "all" as const, label: "الكل" },
                  { value: "active" as const, label: "نشط" },
                  { value: "new" as const, label: "جديد" },
                ].map(f => (
                  <Button
                    key={f.value}
                    size="sm"
                    variant={filterStatus === f.value ? "default" : "outline"}
                    onClick={() => { setFilterStatus(f.value); setVisibleCount(12); }}
                    className="rounded-full"
                  >
                    {f.label}
                  </Button>
                ))}
              </div>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-48 bg-card border-border h-11">
                  <ArrowUpDown className="w-4 h-4 ml-2" />
                  <SelectValue placeholder="ترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="most_members">الأكثر أعضاء</SelectItem>
                  <SelectItem value="most_manga">الأكثر أعمالاً</SelectItem>
                  <SelectItem value="most_views">الأكثر مشاهدة</SelectItem>
                  <SelectItem value="newest">الأحدث</SelectItem>
                  <SelectItem value="oldest">الأقدم</SelectItem>
                  <SelectItem value="name_asc">أبجدي (أ-ي)</SelectItem>
                  <SelectItem value="name_desc">أبجدي (ي-أ)</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex bg-card border border-border rounded-xl overflow-hidden">
                <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("grid")} className="rounded-none">
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("list")} className="rounded-none">
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <Badge variant="secondary" className="whitespace-nowrap">
                {filteredTeams.length} نتيجة
              </Badge>
            </div>
          </div>
        </section>

        {/* ===== TEAMS ===== */}
        <section className="py-12 px-4">
          <div className="container mx-auto">
            {loading ? (
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
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="p-16 text-center bg-card/50 border-border">
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
                    <Users className="w-20 h-20 mx-auto mb-6 text-muted-foreground/50" />
                  </motion.div>
                  {searchQuery ? (
                    <>
                      <h3 className="text-2xl font-bold mb-2">لا توجد نتائج</h3>
                      <p className="text-muted-foreground mb-6">لم نجد فريقاً يطابق "{searchQuery}"</p>
                      <Button variant="outline" onClick={() => setSearchQuery("")}>مسح البحث</Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold mb-2">لا توجد فرق بعد</h3>
                      <p className="text-muted-foreground mb-6">كن أول من ينشئ فريق ترجمة!</p>
                      <Button onClick={() => navigate("/teams/create")}>
                        <Plus className="w-4 h-4 ml-2" />إنشاء فريق
                      </Button>
                    </>
                  )}
                </Card>
              </motion.div>
            ) : viewMode === "grid" ? (
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
                        whileHover={{ y: -8 }}
                      >
                        <Card
                          className="group relative overflow-hidden bg-card border-border hover:border-primary/40 transition-all duration-500 cursor-pointer hover:shadow-xl hover:shadow-primary/5"
                          onClick={() => navigate(`/teams/${team.slug}`)}
                        >
                          {/* Animated gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-accent/0 group-hover:from-primary/5 group-hover:via-transparent group-hover:to-accent/5 transition-all duration-700" />

                          {/* Shine sweep */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/3 to-transparent rotate-12 group-hover:translate-x-full transition-transform duration-1000" />
                          </div>

                          {/* Quick actions */}
                          <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-10">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost"
                                  className="w-8 h-8 bg-card/90 backdrop-blur-sm hover:bg-primary/20 rounded-full"
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(team.id); }}
                                >
                                  <Heart className={`w-4 h-4 transition-all ${favorites.has(team.id) ? "fill-red-500 text-red-500 scale-110" : "text-muted-foreground"}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>مفضلة</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost"
                                  className="w-8 h-8 bg-card/90 backdrop-blur-sm hover:bg-primary/20 rounded-full"
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
                            <Badge variant="secondary" className={`gap-1 text-xs ${activity.color} ${activity.bg} border-0`}>
                              <ActivityIcon className="w-3 h-3" />
                              {activity.label}
                            </Badge>
                          </div>

                          <div className="relative p-6 space-y-5">
                            <div className="flex justify-center">
                              {team.logo_url ? (
                                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="relative">
                                  <img src={team.logo_url} alt={team.name}
                                    className="w-24 h-24 rounded-2xl object-cover border-2 border-primary/30 shadow-lg"
                                  />
                                  <div className="absolute -inset-2 bg-primary/10 blur-xl rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </motion.div>
                              ) : (
                                <motion.div whileHover={{ scale: 1.1, rotate: 5 }}
                                  className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shadow-lg border border-primary/20"
                                >
                                  <Users className="w-10 h-10 text-primary" />
                                </motion.div>
                              )}
                            </div>

                            <div className="text-center">
                              <h3 className="text-xl font-bold mb-1.5 group-hover:text-primary transition-colors">{team.name}</h3>
                              {team.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{team.description}</p>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { icon: Users, value: team.member_count, label: "عضو", color: "text-primary" },
                                { icon: BookOpen, value: team.manga_count, label: "مانجا", color: "text-blue-400" },
                                { icon: BarChart3, value: team.chapter_count, label: "فصل", color: "text-green-400" },
                              ].map((stat) => (
                                <div key={stat.label} className="text-center p-2.5 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-colors">
                                  <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
                                  <p className="text-sm font-bold">{stat.value}</p>
                                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />{relativeTime(team.created_at)}
                              </span>
                              {team.total_views > 0 && (
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />{formatNumber(team.total_views)}
                                </span>
                              )}
                            </div>

                            <Button
                              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground h-11 rounded-xl"
                              onClick={(e) => { e.stopPropagation(); navigate(`/teams/${team.slug}`); }}
                            >
                              <ExternalLink className="w-4 h-4 ml-2" />
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
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {visibleTeams.map((team, i) => {
                    const activity = getActivityLevel(team);
                    const ActivityIcon = activity.icon;
                    return (
                      <motion.div key={team.id} custom={i} variants={cardVariants} initial="hidden" animate="visible" exit={{ opacity: 0, x: -20 }} layout>
                        <Card
                          className="group p-4 bg-card border-border hover:border-primary/40 transition-all cursor-pointer hover:shadow-lg hover:shadow-primary/5"
                          onClick={() => navigate(`/teams/${team.slug}`)}
                        >
                          <div className="flex items-center gap-4">
                            {team.logo_url ? (
                              <img src={team.logo_url} alt={team.name} className="w-14 h-14 rounded-xl object-cover border-2 border-primary/30 flex-shrink-0" />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                                <Users className="w-6 h-6 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{team.name}</h3>
                                <Badge variant="secondary" className={`gap-1 text-[10px] ${activity.color} ${activity.bg} border-0`}>
                                  <ActivityIcon className="w-3 h-3" />{activity.label}
                                </Badge>
                              </div>
                              {team.description && <p className="text-sm text-muted-foreground truncate">{team.description}</p>}
                            </div>
                            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{team.member_count}</span>
                              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{team.manga_count}</span>
                              <span className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4" />{team.chapter_count}</span>
                              <span className="flex items-center gap-1.5 text-xs"><Clock className="w-3.5 h-3.5" />{relativeTime(team.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full"
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(team.id); }}
                              >
                                <Heart className={`w-4 h-4 ${favorites.has(team.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                              </Button>
                              <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full"
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

            {/* Load More */}
            {visibleCount < filteredTeams.length && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12 text-center">
                <Button variant="outline" size="lg" onClick={() => setVisibleCount(prev => prev + 12)} className="gap-2 rounded-full px-8">
                  <TrendingUp className="w-4 h-4" />
                  عرض المزيد ({filteredTeams.length - visibleCount} متبقي)
                </Button>
              </motion.div>
            )}
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-card/30 to-accent/5" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="container mx-auto relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto text-center"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Award className="w-14 h-14 mx-auto mb-5 text-primary" />
              </motion.div>
              <h2 className="text-4xl font-black mb-5">هل أنت مترجم موهوب؟</h2>
              <p className="text-lg text-muted-foreground mb-10">
                انضم لأحد الفرق أو أنشئ فريقك الخاص وساهم في إثراء المحتوى العربي
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => navigate("/teams/create")} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 h-13 text-lg px-8">
                  <Plus className="w-5 h-5 ml-2" />إنشاء فريق
                </Button>
                {!currentUser && (
                  <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="h-13 text-lg px-8">
                    سجّل دخولك أولاً
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />

      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
