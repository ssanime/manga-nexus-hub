import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, AlertTriangle, Key, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CloudflareNotice = () => {
  return (
    <>
      <Alert className="bg-green-500/10 border-green-500/50 mb-4">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertTitle className="text-green-500">✅ نظام السحب المحسّن - تحديث 2026</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <div className="space-y-2 mt-2">
            <p>
              <strong>تم تحديث نظام السحب ليدعم أحدث هياكل المواقع:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 mr-4 text-sm">
              <li><strong>azoramoon.com:</strong> دعم كامل للهيكل الجديد مع flex layout وتواريخ نسبية</li>
              <li><strong>lavatoons/lavascans:</strong> دعم ts-main-image و ch-main-anchor مع retry متعدد</li>
              <li>استخراج محسّن للصور من مسارات wp-content/uploads</li>
              <li>تجاوز ذكي لحماية Cloudflare مع محاولات متعددة</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      <Alert className="bg-amber-500/10 border-amber-500/50 mb-4">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-500">تنبيه - حماية Cloudflare</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <div className="space-y-2 mt-2">
            <p>
              بعض المواقع محمية بـ Cloudflare. النظام يحاول تجاوز الحماية تلقائياً:
            </p>
            <ul className="list-disc list-inside space-y-1 mr-4 text-sm">
              <li>محاولات متعددة مع headers مختلفة</li>
              <li>تأخيرات عشوائية لمحاكاة السلوك البشري</li>
              <li>دعم Firecrawl API للمواقع الصعبة</li>
            </ul>
            <p className="text-xs mt-2">
              إذا فشل السحب، جرب مرة أخرى بعد دقائق أو استخدم الإضافة اليدوية.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <Alert className="bg-blue-500/10 border-blue-500/50 mb-4">
        <Key className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-500">💡 Firecrawl API - للحماية القوية</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <div className="space-y-3 mt-2">
            <p className="text-sm">
              للمواقع المحمية بشدة، أضف Firecrawl API key:
            </p>
            
            <ol className="list-decimal list-inside space-y-1 text-sm mr-3">
              <li>سجل في <a href="https://firecrawl.dev" target="_blank" rel="noopener" className="text-primary hover:underline">firecrawl.dev</a></li>
              <li>اذهب إلى: الإعدادات → Lovable Cloud → Secrets</li>
              <li>أضف secret باسم <code className="bg-background px-2 py-0.5 rounded text-primary">FIRECRAWL_API_KEY</code></li>
            </ol>

            <p className="text-xs text-muted-foreground">
              ✨ بدون Firecrawl، النظام يستخدم تقنيات stealth متقدمة تعمل مع معظم المواقع
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </>
  );
};
