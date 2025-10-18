import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Home, List, Settings, X } from "lucide-react";
import { Card } from "@/components/ui/card";

const Reader = () => {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  const [showControls, setShowControls] = useState(true);

  // Mock data - will be replaced with real data
  const chapterNumber = Number(chapterId) || 1;
  const chapter = {
    mangaId: mangaId || "1",
    chapterNumber: chapterNumber,
    title: "نحو الشجرة على ذلك التل",
    mangaTitle: "هجوم العمالقة",
    pages: [
      "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=800&h=1200&fit=crop",
      "https://images.unsplash.com/photo-1612178537253-bccd437b730e?w=800&h=1200&fit=crop",
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=1200&fit=crop",
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=1200&fit=crop",
      "https://images.unsplash.com/photo-1601645191163-3fc0d5d64e35?w=800&h=1200&fit=crop",
    ],
    prevChapter: chapterNumber > 1 ? chapterNumber - 1 : null,
    nextChapter: chapterNumber < 139 ? chapterNumber + 1 : null,
  };

  const handlePrevChapter = () => {
    if (chapter.prevChapter) {
      navigate(`/read/${mangaId}/${chapter.prevChapter}`);
    }
  };

  const handleNextChapter = () => {
    if (chapter.nextChapter) {
      navigate(`/read/${mangaId}/${chapter.nextChapter}`);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Top Controls */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent transition-all duration-300 ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={`/manga/${mangaId}`}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <X className="h-6 w-6" />
                </Button>
              </Link>
              <div>
                <h1 className="text-white font-bold text-lg">{chapter.mangaTitle}</h1>
                <p className="text-gray-400 text-sm">الفصل {chapter.chapterNumber}: {chapter.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select defaultValue={String(chapter.chapterNumber)}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="اختر فصل" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 139 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      الفصل {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Link to={`/manga/${mangaId}`}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <List className="h-5 w-5" />
                </Button>
              </Link>

              <Link to="/">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Reader Content */}
      <div 
        className="flex flex-col items-center justify-center min-h-screen py-20 cursor-pointer"
        onClick={() => setShowControls(!showControls)}
      >
        <div className="max-w-4xl w-full space-y-0">
          {chapter.pages.map((page, index) => (
            <img
              key={index}
              src={page}
              alt={`الصفحة ${index + 1}`}
              className="w-full h-auto"
              loading={index > 2 ? "lazy" : "eager"}
            />
          ))}
        </div>

        {/* End of Chapter Card */}
        <Card className="max-w-4xl w-full mt-8 p-8 bg-card border-border">
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-foreground">
              نهاية الفصل {chapter.chapterNumber}
            </h2>
            <p className="text-muted-foreground">
              هل استمتعت بهذا الفصل؟ تابع القراءة!
            </p>
            <div className="flex gap-4 justify-center">
              {chapter.prevChapter && (
                <Button 
                  onClick={handlePrevChapter}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  الفصل السابق
                </Button>
              )}
              {chapter.nextChapter && (
                <Button 
                  onClick={handleNextChapter}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-manga-glow"
                >
                  الفصل التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Link to={`/manga/${mangaId}`}>
              <Button variant="ghost">
                العودة لصفحة المانجا
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent transition-all duration-300 ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              onClick={handlePrevChapter}
              disabled={!chapter.prevChapter}
              variant="outline"
              className="text-white border-white/20 hover:bg-white/10 disabled:opacity-50"
            >
              <ChevronRight className="mr-2 h-4 w-4" />
              السابق
            </Button>

            <div className="text-white text-sm">
              الصفحة 1 من {chapter.pages.length}
            </div>

            <Button 
              onClick={handleNextChapter}
              disabled={!chapter.nextChapter}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              التالي
              <ChevronLeft className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reader;
