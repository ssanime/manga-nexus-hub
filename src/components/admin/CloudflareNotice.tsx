import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, AlertTriangle, Key } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CloudflareNotice = () => {
  return (
    <>
      <Alert className="bg-amber-500/10 border-amber-500/50 mb-4">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-500">تنبيه هام - حماية Cloudflare</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <div className="space-y-2 mt-2">
            <p>
              <strong>بعض المواقع محمية بـ Cloudflare</strong> مما يمنع السحب التلقائي.
            </p>
            <p>
              إذا واجهت خطأ <code className="bg-background px-1 rounded">403</code> أو 
              <code className="bg-background px-1 rounded ml-1">Cloudflare challenge</code>:
            </p>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li>استخدم خاصية "إضافة مانجا" اليدوية بدلاً من السحب التلقائي</li>
              <li>قم برفع الصور والمعلومات يدوياً</li>
              <li>جرب السحب في وقت لاحق - قد تنجح أحياناً</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      <Alert className="bg-blue-500/10 border-blue-500/50 mb-4">
        <Key className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-500">💡 حل مشكلة Cloudflare - تحسينات جديدة!</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <div className="space-y-3 mt-2">
            <p>
              <strong>تم تحسين نظام تجاوز Cloudflare!</strong> النظام الآن يستخدم تقنيات متقدمة:
            </p>
            
            <ul className="list-disc list-inside space-y-1 mr-4 text-sm">
              <li>User agents عشوائية متنوعة لتجنب الكشف</li>
              <li>توقيتات عشوائية تحاكي السلوك البشري</li>
              <li>إعادة محاولات ذكية مع Cookies</li>
              <li>كشف دقيق لحماية Cloudflare (تقليل الإنذارات الخاطئة)</li>
            </ul>

            <div className="bg-background/50 p-3 rounded-lg space-y-2 mt-3">
              <p className="text-sm font-semibold">للحماية القوية - Firecrawl API:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm mr-3">
                <li>سجل في <a href="https://firecrawl.dev" target="_blank" rel="noopener" className="text-primary hover:underline">firecrawl.dev</a> واحصل على API key مع credits كافية</li>
                <li>اذهب إلى: الإعدادات → Lovable Cloud → Secrets</li>
                <li>حدّث secret باسم <code className="bg-background px-2 py-0.5 rounded text-primary">FIRECRAWL_API_KEY</code></li>
                <li>الصق API key الجديد</li>
              </ol>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ <strong>ملاحظة:</strong> تأكد من أن Firecrawl API key لديك يحتوي على credits كافية. المفتاح الحالي قد يكون منتهي الرصيد (402 error).
            </p>

            <p className="text-xs text-muted-foreground">
              ✨ بدون Firecrawl، النظام يستخدم تقنيات stealth متقدمة تعمل مع معظم المواقع
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </>
  );
};
