import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChapterPairCard } from "./ChapterPairCard";

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  release_date: string | null;
  manga: {
    id: string;
    slug: string;
    title: string;
    cover_url: string;
  };
}

export const LatestChapters = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    fetchLatestChapters();
  }, []);

  const fetchLatestChapters = async () => {
    const { data, error } = await supabase
      .from("chapters")
      .select(
        `
        id,
        chapter_number,
        title,
        release_date,
        manga:manga_id (
          id,
          slug,
          title,
          cover_url
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setChapters(data as any);
    }
  };

  // Group chapters by manga, showing up to 2 consecutive chapters per card
  const groupChaptersByManga = () => {
    const grouped: Array<[Chapter] | [Chapter, Chapter]> = [];
    const mangaMap = new Map<string, Chapter[]>();

    // Group chapters by manga
    chapters.forEach((chapter) => {
      const mangaId = chapter.manga.id;
      if (!mangaMap.has(mangaId)) {
        mangaMap.set(mangaId, []);
      }
      mangaMap.get(mangaId)!.push(chapter);
    });

    // Create pairs or singles from each manga's chapters
    mangaMap.forEach((mangaChapters) => {
      for (let i = 0; i < mangaChapters.length; i += 2) {
        if (i + 1 < mangaChapters.length) {
          grouped.push([mangaChapters[i], mangaChapters[i + 1]]);
        } else {
          grouped.push([mangaChapters[i]]);
        }
      }
    });

    // Sort by most recent chapter
    return grouped.sort((a, b) => {
      const dateA = new Date(a[0].release_date || 0).getTime();
      const dateB = new Date(b[0].release_date || 0).getTime();
      return dateB - dateA;
    }).slice(0, 12);
  };

  const chapterPairs = groupChaptersByManga();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {chapterPairs.map((pair, index) => (
        <ChapterPairCard key={`pair-${index}-${pair[0].id}`} chapters={pair} />
      ))}
    </div>
  );
};
