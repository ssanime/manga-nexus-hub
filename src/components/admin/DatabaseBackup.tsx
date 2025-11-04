import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Database, FileJson } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const DatabaseBackup = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const exportTableData = async (tableName: string) => {
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*');

      if (error) throw error;

      return {
        table: tableName,
        data: data || [],
        count: data?.length || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(`Error exporting ${tableName}:`, error);
      return {
        table: tableName,
        error: error.message,
        count: 0
      };
    }
  };

  const handleFullBackup = async () => {
    setLoading(true);
    try {
      toast({
        title: "جاري إنشاء النسخة الاحتياطية",
        description: "قد يستغرق هذا بعض الوقت...",
      });

      const tables = [
        'manga',
        'chapters',
        'chapter_pages',
        'teams',
        'team_members',
        'team_join_requests',
        'profiles',
        'scraper_sources',
        'manga_favorites',
        'reading_history'
      ];

      const backupData: any = {
        backup_info: {
          created_at: new Date().toISOString(),
          version: '1.0',
          site: 'Mangafas'
        },
        tables: {}
      };

      for (const table of tables) {
        const result = await exportTableData(table);
        backupData.tables[table] = result;
      }

      // Create downloadable file
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mangafas_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "تم إنشاء النسخة الاحتياطية",
        description: "تم تحميل ملف النسخة الاحتياطية بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTableBackup = async (tableName: string) => {
    setLoading(true);
    try {
      const result = await exportTableData(tableName);
      
      const jsonString = JSON.stringify(result, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tableName}_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "تم التصدير",
        description: `تم تصدير جدول ${tableName} بنجاح`,
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const tables = [
    { name: 'manga', label: 'المانجا', icon: '📚' },
    { name: 'chapters', label: 'الفصول', icon: '📖' },
    { name: 'chapter_pages', label: 'صفحات الفصول', icon: '📄' },
    { name: 'teams', label: 'الفرق', icon: '👥' },
    { name: 'profiles', label: 'المستخدمين', icon: '👤' },
    { name: 'scraper_sources', label: 'مصادر السحب', icon: '🌐' },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-xl font-bold text-foreground">نسخة احتياطية كاملة</h3>
            <p className="text-sm text-muted-foreground">
              تصدير جميع البيانات من قاعدة البيانات
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleFullBackup}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          <Download className="w-5 h-5 ml-2" />
          {loading ? "جاري الإنشاء..." : "إنشاء نسخة احتياطية كاملة"}
        </Button>
      </Card>

      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-3 mb-4">
          <FileJson className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-xl font-bold text-foreground">تصدير جدول محدد</h3>
            <p className="text-sm text-muted-foreground">
              اختر جدول واحد للتصدير
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tables.map((table) => (
            <Button
              key={table.name}
              onClick={() => handleTableBackup(table.name)}
              disabled={loading}
              variant="outline"
              className="justify-start"
            >
              <span className="text-xl ml-2">{table.icon}</span>
              {table.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-card border-border">
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary">ℹ️</span>
            معلومات مهمة
          </h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>• يتم حفظ النسخ الاحتياطية بصيغة JSON</p>
            <p>• يمكن استخدامها لاستعادة البيانات أو نقلها لخادم آخر</p>
            <p>• تحتوي النسخة الكاملة على جميع الجداول</p>
            <p>• يُنصح بإنشاء نسخة احتياطية بشكل دوري</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
