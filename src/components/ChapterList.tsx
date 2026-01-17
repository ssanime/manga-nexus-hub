import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookOpen, 
  Eye, 
  Clock, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Play,
  CheckCircle2,
  BookMarked
} from "lucide-react";

interface Chapter {
  id: string;
  chapter_number: number;
  title: string | null;
  views: number | null;
  release_date: string | null;
  created_at: string;
}

interface ChapterListProps {
  chapters: Chapter[];
  mangaSlug: string;
  mangaId: string;
}

const formatViews = (views: number) => {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
};

const formatDate = (date: string | null) => {
  if (!date) return 'غير محدد';
  const d = new Date(date);
  const now = new Date();
  const diffTime = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسبوع`;
  if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} شهر`;
  return d.toLocaleDateString('ar-SA');
};

export const ChapterList = ({ chapters, mangaSlug, mangaId }: ChapterListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [readChapterIds, setReadChapterIds] = useState<Set<string>>(new Set());
  const [lastReadChapterId, setLastReadChapterId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const INITIAL_DISPLAY = 20;

  // Check for user and fetch reading history
  useEffect(() => {
    const fetchUserAndHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user && mangaId) {
        // Fetch all reading history for this manga
        const { data } = await supabase
          .from('reading_history')
          .select('chapter_id, updated_at')
          .eq('user_id', user.id)
          .eq('manga_id', mangaId)
          .order('updated_at', { ascending: false });
        
        if (data && data.length > 0) {
          // Set all read chapter IDs
          const readIds = new Set(data.map(r => r.chapter_id));
          setReadChapterIds(readIds);
          // Set the last read chapter
          setLastReadChapterId(data[0].chapter_id);
        }
      }
    };

    fetchUserAndHistory();
  }, [mangaId, user?.id]);

  // Filter and sort chapters
  const filteredChapters = useMemo(() => {
    if (!searchQuery) return chapters;
    
    return chapters.filter(chapter => {
      const searchNum = parseFloat(searchQuery);
      if (!isNaN(searchNum)) {
        return chapter.chapter_number === searchNum;
      }
      return chapter.title?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [chapters, searchQuery]);

  // Get special chapters
  const firstChapter = chapters.length > 0 
    ? chapters.reduce((min, c) => c.chapter_number < min.chapter_number ? c : min, chapters[0])
    : null;
  
  const latestChapter = chapters.length > 0
    ? chapters.reduce((max, c) => c.chapter_number > max.chapter_number ? c : max, chapters[0])
    : null;

  const lastReadChapterData = lastReadChapterId
    ? chapters.find(c => c.id === lastReadChapterId)
    : null;
  
  const lastReadChapter = lastReadChapterData?.chapter_number || null;

  // Display chapters
  const displayedChapters = showAll 
    ? filteredChapters 
    : filteredChapters.slice(0, INITIAL_DISPLAY);

  if (chapters.length === 0) {
    return (
      <Card className="p-8 bg-card border-border text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">لا توجد فصول متاحة حالياً</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* First Chapter */}
        {firstChapter && (
          <Link to={`/read/${mangaSlug}/${firstChapter.chapter_number}`}>
            <Card className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 hover:border-primary/50 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors">
                  <Play className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">ابدأ من البداية</p>
                  <p className="font-semibold truncate">الفصل {firstChapter.chapter_number}</p>
                </div>
              </div>
            </Card>
          </Link>
        )}

        {/* Last Read Chapter */}
        {lastReadChapterData && lastReadChapter !== latestChapter?.chapter_number && (
          <Link to={`/read/${mangaSlug}/${lastReadChapterData.chapter_number}`}>
            <Card className="p-4 bg-gradient-to-br from-accent/20 to-accent/5 border-accent/30 hover:border-accent/50 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded-lg group-hover:bg-accent/30 transition-colors">
                  <BookMarked className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">أكمل القراءة</p>
                  <p className="font-semibold truncate">الفصل {lastReadChapterData.chapter_number}</p>
                </div>
              </div>
            </Card>
          </Link>
        )}

        {/* Latest Chapter */}
        {latestChapter && (
          <Link to={`/read/${mangaSlug}/${latestChapter.chapter_number}`}>
            <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30 hover:border-green-500/50 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">آخر فصل</p>
                  <p className="font-semibold truncate">الفصل {latestChapter.chapter_number}</p>
                </div>
              </div>
            </Card>
          </Link>
        )}
      </div>

      {/* Search */}
      {chapters.length > 10 && (
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن فصل برقمه أو عنوانه..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      )}

      {/* Chapters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayedChapters.map((chapter) => {
          const isRead = readChapterIds.has(chapter.id);
          const isLastRead = lastReadChapterId === chapter.id;
          const isLatest = latestChapter?.chapter_number === chapter.chapter_number;
          
          return (
            <Link 
              key={chapter.id} 
              to={`/read/${mangaSlug}/${chapter.chapter_number}`}
            >
              <Card className={`p-4 transition-all cursor-pointer group hover:shadow-md ${
                isLastRead 
                  ? 'border-accent bg-accent/10 hover:bg-accent/20' 
                  : isLatest
                    ? 'border-green-500/50 bg-green-500/5 hover:bg-green-500/10'
                    : 'border-border hover:border-primary/50 hover:bg-secondary/50'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Read/Unread Eye Indicator */}
                    <div className={`p-2 rounded-lg transition-colors ${
                      isRead 
                        ? 'bg-red-500/20' 
                        : 'bg-muted'
                    }`}>
                      <Eye className={`h-4 w-4 transition-colors ${
                        isRead ? 'text-red-500' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold group-hover:text-primary transition-colors ${
                          isRead ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          الفصل {chapter.chapter_number}
                        </h3>
                        {isLastRead && (
                          <Badge variant="secondary" className="text-xs bg-accent/20 text-accent">
                            آخر قراءة
                          </Badge>
                        )}
                        {isLatest && !isLastRead && (
                          <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-500">
                            جديد
                          </Badge>
                        )}
                      </div>
                      {chapter.title && (
                        <p className="text-sm text-muted-foreground truncate">{chapter.title}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{formatViews(chapter.views || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(chapter.release_date || chapter.created_at)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Show More/Less Button */}
      {filteredChapters.length > INITIAL_DISPLAY && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="gap-2"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                عرض أقل
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                عرض الكل ({filteredChapters.length - INITIAL_DISPLAY} فصل إضافي)
              </>
            )}
          </Button>
        </div>
      )}

      {/* No Results */}
      {filteredChapters.length === 0 && searchQuery && (
        <Card className="p-8 text-center">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">لا توجد نتائج للبحث "{searchQuery}"</p>
        </Card>
      )}
    </div>
  );
};
