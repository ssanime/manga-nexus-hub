import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";

export const CloudflareNotice = () => {
  return (
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
  );
};
