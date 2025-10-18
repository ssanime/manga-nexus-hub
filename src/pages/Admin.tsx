import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, Download, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Admin = () => {
  const { toast } = useToast();
  const [mangaUrl, setMangaUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [mangaList, setMangaList] = useState<any[]>([]);

  useEffect(() => {
    fetchJobs();
    fetchManga();
  }, []);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("scrape_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching jobs:", error);
    } else {
      setJobs(data || []);
    }
  };

  const fetchManga = async () => {
    const { data, error } = await supabase
      .from("manga")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching manga:", error);
    } else {
      setMangaList(data || []);
    }
  };

  const handleScrapeManga = async () => {
    if (!mangaUrl.includes("lekmanga.net")) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال رابط صحيح من موقع lekmanga.net",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Scrape manga info
      const { data: infoData, error: infoError } = await supabase.functions.invoke(
        "scrape-lekmanga",
        {
          body: { url: mangaUrl, jobType: "manga_info" },
        }
      );

      if (infoError) throw infoError;

      toast({
        title: "تم بنجاح",
        description: "تم سحب معلومات المانجا بنجاح",
      });

      // Step 2: Scrape chapters
      const { data: chaptersData, error: chaptersError } = await supabase.functions.invoke(
        "scrape-lekmanga",
        {
          body: { url: mangaUrl, jobType: "chapters" },
        }
      );

      if (chaptersError) throw chaptersError;

      toast({
        title: "مكتمل",
        description: `تم سحب ${chaptersData?.data?.length || 0} فصل بنجاح`,
      });

      // Refresh data
      fetchJobs();
      fetchManga();
      setMangaUrl("");

    } catch (error: any) {
      console.error("Scrape error:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل سحب المحتوى",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrapeChapterPages = async (chapterId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("scrape-lekmanga", {
        body: { url: "", jobType: "pages", chapterId },
      });

      if (error) throw error;

      toast({
        title: "مكتمل",
        description: `تم سحب ${data?.data?.length || 0} صفحة`,
      });

      fetchJobs();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> مكتمل</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> فشل</Badge>;
      case "processing":
        return <Badge className="bg-blue-500"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> جاري المعالجة</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> قيد الانتظار</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              لوحة التحكم
            </h1>
            <p className="text-muted-foreground">
              إدارة المحتوى وسحب المانجا من lekmanga.net
            </p>
          </div>

          {/* Scrape Form */}
          <Card className="p-6 bg-card border-border">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  سحب مانجا جديدة
                </h2>
                <p className="text-sm text-muted-foreground">
                  أدخل رابط المانجا من موقع lekmanga.net لسحب المعلومات والفصول تلقائياً
                </p>
              </div>

              <div className="flex gap-4">
                <Input
                  type="url"
                  placeholder="https://lekmanga.net/manga/example-manga/"
                  value={mangaUrl}
                  onChange={(e) => setMangaUrl(e.target.value)}
                  className="flex-1 bg-background border-border"
                  dir="ltr"
                />
                <Button
                  onClick={handleScrapeManga}
                  disabled={isLoading || !mangaUrl}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      جاري السحب...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      سحب المحتوى
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="jobs" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="jobs">
                <Database className="w-4 h-4 mr-2" />
                مهام السحب
              </TabsTrigger>
              <TabsTrigger value="manga">
                <RefreshCw className="w-4 h-4 mr-2" />
                المانجا المسحوبة
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-4 mt-6">
              {jobs.length === 0 ? (
                <Card className="p-8 text-center bg-card border-border">
                  <p className="text-muted-foreground">لا توجد مهام سحب بعد</p>
                </Card>
              ) : (
                jobs.map((job) => (
                  <Card key={job.id} className="p-4 bg-card border-border">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          {getStatusBadge(job.status)}
                          <span className="text-sm text-muted-foreground">
                            {job.job_type === "manga_info" && "معلومات المانجا"}
                            {job.job_type === "chapters" && "الفصول"}
                            {job.job_type === "pages" && "صفحات الفصل"}
                          </span>
                        </div>
                        <p className="text-sm text-foreground font-mono truncate max-w-md" dir="ltr">
                          {job.source_url}
                        </p>
                        {job.error_message && (
                          <p className="text-sm text-destructive">
                            خطأ: {job.error_message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(job.created_at).toLocaleString("ar-SA")}
                        </p>
                      </div>
                      {job.status === "failed" && job.retry_count < job.max_retries && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            /* Retry logic */
                          }}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          إعادة المحاولة
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="manga" className="space-y-4 mt-6">
              {mangaList.length === 0 ? (
                <Card className="p-8 text-center bg-card border-border">
                  <p className="text-muted-foreground">لا توجد مانجا مسحوبة بعد</p>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {mangaList.map((manga) => (
                    <Card key={manga.id} className="overflow-hidden bg-card border-border hover:border-primary transition-colors">
                      <div className="flex gap-4 p-4">
                        {manga.cover_url && (
                          <img
                            src={manga.cover_url}
                            alt={manga.title}
                            className="w-20 h-28 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 space-y-2">
                          <h3 className="font-semibold text-foreground line-clamp-2">
                            {manga.title}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {manga.status && (
                              <Badge variant="secondary" className="text-xs">
                                {manga.status === "completed" ? "مكتملة" : "مستمرة"}
                              </Badge>
                            )}
                            {manga.rating > 0 && (
                              <Badge variant="outline" className="text-xs">
                                ⭐ {manga.rating}
                              </Badge>
                            )}
                          </div>
                          {manga.last_scraped_at && (
                            <p className="text-xs text-muted-foreground">
                              آخر سحب: {new Date(manga.last_scraped_at).toLocaleDateString("ar-SA")}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Admin;
