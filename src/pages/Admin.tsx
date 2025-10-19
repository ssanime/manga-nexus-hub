import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, Download, RefreshCw, CheckCircle, XCircle, Clock, Plus, BookPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddMangaForm } from "@/components/admin/AddMangaForm";
import { AddChapterForm } from "@/components/admin/AddChapterForm";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mangaUrl, setMangaUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [mangaList, setMangaList] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
    fetchJobs();
    fetchManga();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

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


          {/* Tabs */}
          <Tabs defaultValue="manga" className="w-full">
            <TabsList className="grid w-full max-w-6xl grid-cols-6">
              <TabsTrigger value="manga">مانجا</TabsTrigger>
              <TabsTrigger value="manhwa">مانهوا</TabsTrigger>
              <TabsTrigger value="manhua">مانها</TabsTrigger>
              <TabsTrigger value="add-manga">
                <Plus className="w-4 h-4 mr-2" />
                إضافة
              </TabsTrigger>
              <TabsTrigger value="add-chapter">
                <BookPlus className="w-4 h-4 mr-2" />
                فصل
              </TabsTrigger>
              <TabsTrigger value="jobs">
                <Database className="w-4 h-4 mr-2" />
                المهام
              </TabsTrigger>
            </TabsList>
            
            {/* Manga Tab */}
            <TabsContent value="manga" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">قائمة المانجا</h2>
                  <p className="text-muted-foreground">جميع المانجا المتوفرة</p>
                </div>
                {mangaList.filter(m => !m.source_url.toLowerCase().includes('manhwa') && !m.source_url.toLowerCase().includes('manhua')).length === 0 ? (
                  <Card className="p-8 text-center bg-card border-border">
                    <p className="text-muted-foreground">لا توجد مانجا بعد</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {mangaList.filter(m => !m.source_url.toLowerCase().includes('manhwa') && !m.source_url.toLowerCase().includes('manhua')).map((manga) => (
                      <Card key={manga.id} className="overflow-hidden bg-card border-border hover:border-primary transition-colors">
                        <div className="flex gap-4 p-4">
                          {manga.cover_url && (
                            <img src={manga.cover_url} alt={manga.title} className="w-20 h-28 object-cover rounded" />
                          )}
                          <div className="flex-1 space-y-2">
                            <h3 className="font-semibold text-foreground line-clamp-2">{manga.title}</h3>
                            <div className="flex flex-wrap gap-2">
                              {manga.status && (
                                <Badge variant="secondary" className="text-xs">
                                  {manga.status === "completed" ? "مكتملة" : "مستمرة"}
                                </Badge>
                              )}
                              {manga.rating > 0 && (
                                <Badge variant="outline" className="text-xs">⭐ {manga.rating}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Manhwa Tab */}
            <TabsContent value="manhwa" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">قائمة المانهوا</h2>
                  <p className="text-muted-foreground">جميع المانهوا الكورية</p>
                </div>
                {mangaList.filter(m => m.source_url.toLowerCase().includes('manhwa')).length === 0 ? (
                  <Card className="p-8 text-center bg-card border-border">
                    <p className="text-muted-foreground">لا توجد مانهوا بعد</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {mangaList.filter(m => m.source_url.toLowerCase().includes('manhwa')).map((manga) => (
                      <Card key={manga.id} className="overflow-hidden bg-card border-border hover:border-primary transition-colors">
                        <div className="flex gap-4 p-4">
                          {manga.cover_url && (
                            <img src={manga.cover_url} alt={manga.title} className="w-20 h-28 object-cover rounded" />
                          )}
                          <div className="flex-1 space-y-2">
                            <h3 className="font-semibold text-foreground line-clamp-2">{manga.title}</h3>
                            <div className="flex flex-wrap gap-2">
                              {manga.status && (
                                <Badge variant="secondary" className="text-xs">
                                  {manga.status === "completed" ? "مكتملة" : "مستمرة"}
                                </Badge>
                              )}
                              {manga.rating > 0 && (
                                <Badge variant="outline" className="text-xs">⭐ {manga.rating}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Manhua Tab */}
            <TabsContent value="manhua" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">قائمة المانها</h2>
                  <p className="text-muted-foreground">جميع المانها الصينية</p>
                </div>
                {mangaList.filter(m => m.source_url.toLowerCase().includes('manhua')).length === 0 ? (
                  <Card className="p-8 text-center bg-card border-border">
                    <p className="text-muted-foreground">لا توجد مانها بعد</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {mangaList.filter(m => m.source_url.toLowerCase().includes('manhua')).map((manga) => (
                      <Card key={manga.id} className="overflow-hidden bg-card border-border hover:border-primary transition-colors">
                        <div className="flex gap-4 p-4">
                          {manga.cover_url && (
                            <img src={manga.cover_url} alt={manga.title} className="w-20 h-28 object-cover rounded" />
                          )}
                          <div className="flex-1 space-y-2">
                            <h3 className="font-semibold text-foreground line-clamp-2">{manga.title}</h3>
                            <div className="flex flex-wrap gap-2">
                              {manga.status && (
                                <Badge variant="secondary" className="text-xs">
                                  {manga.status === "completed" ? "مكتملة" : "مستمرة"}
                                </Badge>
                              )}
                              {manga.rating > 0 && (
                                <Badge variant="outline" className="text-xs">⭐ {manga.rating}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="add-manga" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    إضافة مانجا جديدة
                  </h2>
                  <p className="text-muted-foreground">
                    أضف مانجا جديدة يدوياً مع كل التفاصيل
                  </p>
                </div>
                <AddMangaForm onSuccess={() => { fetchManga(); }} />
              </div>
            </TabsContent>

            <TabsContent value="add-chapter" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    إضافة فصل جديد
                  </h2>
                  <p className="text-muted-foreground">
                    أضف فصل جديد لإحدى المانجا الموجودة
                  </p>
                </div>
                <AddChapterForm onSuccess={() => { fetchManga(); }} />
              </div>
            </TabsContent>

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

          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Admin;
