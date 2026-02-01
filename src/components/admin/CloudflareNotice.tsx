import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, AlertTriangle, Key, CheckCircle, Zap, Lock } from "lucide-react";

export const CloudflareNotice = () => {
  return (
    <>
      <Alert className="bg-green-500/10 border-green-500/50 mb-4">
        <Zap className="h-4 w-4 text-green-500" />
        <AlertTitle className="text-green-500">🚀 نظام السحب المُحسّن - تحديث 2026</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <div className="space-y-2 mt-2">
            <p>
              <strong>تم تحديث نظام السحب مع تجاوز حماية متقدم:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 mr-4 text-sm">
              <li><strong>Firecrawl:</strong> ✅ متصل - الأولوية الأولى للتجاوز</li>
              <li><strong>FlareSolverr:</strong> دعم كامل للحماية القوية</li>
              <li><strong>ZenRows:</strong> تجاوز antibot مدمج</li>
              <li><strong>Ultra-Stealth:</strong> محاكاة متصفح متقدمة مع cookies</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      <Alert className="bg-blue-500/10 border-blue-500/50 mb-4">
        <CheckCircle className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-500">✅ المصادر المدعومة</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <div className="space-y-2 mt-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span>✓ azoramoon.com</span>
              <span>✓ lavatoons.com</span>
              <span>✓ olympustaff.com</span>
              <span>✓ 3asq.org</span>
              <span>✓ onma.me</span>
              <span>✓ dilar.tube</span>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <Alert className="bg-amber-500/10 border-amber-500/50 mb-4">
        <Lock className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-500">⚠️ المواقع المحمية بشدة</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <div className="space-y-2 mt-2">
            <p className="text-sm">
              بعض المواقع مثل <strong>lekmanga.site</strong> محمية بـ Cloudflare بشكل قوي جداً.
              النظام يحاول تجاوز الحماية تلقائياً عبر:
            </p>
            <ol className="list-decimal list-inside space-y-1 mr-4 text-sm">
              <li>Firecrawl مع JS rendering (الأقوى)</li>
              <li>FlareSolverr مع session persistence</li>
              <li>ZenRows مع premium proxy + antibot</li>
              <li>Multi-origin bypass + cookie collection</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              💡 إذا فشل السحب، جرب مصدر آخر مثل azoramoon أو lavatoons
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <Alert className="bg-purple-500/10 border-purple-500/50 mb-4">
        <Key className="h-4 w-4 text-purple-500" />
        <AlertTitle className="text-purple-500">🔑 APIs المتاحة</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <div className="space-y-2 mt-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span>FIRECRAWL_API_KEY - متصل ✓</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span>FLARESOLVERR_URL - متصل ✓</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span>ZENROWS_API_KEY - متصل ✓</span>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </>
  );
};
