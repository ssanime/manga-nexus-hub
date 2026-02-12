import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/home/Footer";
import { Shield, Eye, Lock, Share2, Trash2, Mail } from "lucide-react";

export default function Privacy() {
  const sections = [
    {
      icon: Shield,
      title: "مقدمة",
      content: `مرحباً بك في مانجافاس! نحن نقدر خصوصيتك ونلتزم بحماية بيانتك الشخصية. تشرح هذه السياسة كيفية جمع واستخدام ومشاركة معلوماتك. نرجو قراءة هذه السياسة بعناية لفهم ممارسات الخصوصية لدينا.`,
    },
    {
      icon: Eye,
      title: "المعلومات التي نجمعها",
      content: `نجمع المعلومات التالية:
      
• المعلومات التي تقدمها طواعية: عند التسجيل أو تسجيل الدخول، قد نطلب منك اسم المستخدم والبريد الإلكتروني وكلمة المرور.

• معلومات الاستخدام: نجمع معلومات عن كيفية استخدامك للموقع، مثل الصفحات التي تزورها والمحتوى الذي تقرأه والوقت الذي تقضيه على الموقع.

• معلومات الجهاز: قد نجمع معلومات عن جهازك، مثل نوع المتصفح ونظام التشغيل وعنوان IP الخاص بك.

• الملفات الصغيرة (Cookies): نستخدم ملفات تتبع لتحسين تجربتك وتذكر تفضيلاتك.`,
    },
    {
      icon: Lock,
      title: "كيف نحمي بيانتك",
      content: `نحن نتخذ احتياطات قوية لحماية بيانتك:

• التشفير: نستخدم بروتوكول HTTPS لتشفير البيانات المرسلة بين جهازك وخوادمنا.

• الوصول المحدود: يمكن لموظفي مانجافاس فقط الوصول إلى بيانات المستخدمين على أساس الحاجة.

• المراقبة المستمرة: نراقب أنظمتنا باستمرار للكشف عن أي نشاط غير معتاد.

• التحديثات المنتظمة: نحدث معايير الأمان لدينا بانتظام لمواجهة التهديدات الجديدة.`,
    },
    {
      icon: Share2,
      title: "مشاركة المعلومات",
      content: `لا نبيع بيانات المستخدمين لأطراف ثالثة. قد نشارك المعلومات فقط في الحالات التالية:

• مع فريق الدعم: لمساعدتك في حل المشاكل التقنية.

• مع مزودي الخدمات: الذين يساعدوننا في تشغيل الموقع والخدمات.

• عند الضرورة القانونية: إذا كنا مطالبين بالقانون بالكشف عن معلومات معينة.

• مع موافقتك: قد نشارك المعلومات مع أطراف ثالثة إذا طلبت ذلك صراحة.`,
    },
    {
      icon: Trash2,
      title: "الاحتفاظ بالبيانات",
      content: `نحتفظ بيانات المستخدم طالما كان حسابك نشطاً. إذا قررت حذف حسابك:

• سيتم حذف بيانات ملفك الشخصي فوراً.

• قد نحتفظ ببيانات التحليلات والإحصائيات بشكل مجهول لأغراض البحث والتحسين.

• قد نحتفظ ببعض المعلومات للامتثال للالتزامات القانونية.`,
    },
    {
      icon: Mail,
      title: "حقوقك",
      content: `لديك الحق في:

• الوصول: طلب نسخة من البيانات الشخصية التي لدينا عنك.

• التصحيح: طلب تصحيح المعلومات غير الدقيقة أو الناقصة.

• الحذف: طلب حذف بيانتك الشخصية (حق النسيان).

• المعارضة: الاعتراض على معالجة بيانتك لأغراض معينة.

• التنقل: الحصول على بيانتك بصيغة قابلة للنقل.

للتمتع بأي من هذه الحقوق، يرجى التواصل معنا عبر البريد الإلكتروني.`,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
          <div className="container mx-auto relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                سياسة الخصوصية
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                نحن ملتزمون بحماية خصوصيتك وبيانتك الشخصية
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                آخر تحديث: فبراير 2026
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content Sections */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="space-y-12">
              {sections.map((section, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="pb-12 border-b border-border last:border-0"
                >
                  <div className="flex items-start gap-4 mb-6">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center"
                    >
                      <section.icon className="h-6 w-6 text-primary" />
                    </motion.div>
                    <h2 className="text-2xl font-bold">{section.title}</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Additional Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-16 p-6 rounded-xl bg-primary/5 border border-primary/20"
            >
              <h3 className="font-bold text-lg mb-4">تحديثات السياسة</h3>
              <p className="text-muted-foreground mb-4">
                قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر لعكس التغييرات في ممارسات الخصوصية لدينا أو لأسباب أخرى. سيتم إعلامك بأي تحديثات جوهرية من خلال الموقع أو البريد الإلكتروني.
              </p>
              <p className="text-muted-foreground">
                بمتابعة استخدام الموقع بعد نشر التحديثات، فإنك توافق على السياسة المحدثة.
              </p>
            </motion.div>

            {/* Contact Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-16 p-8 rounded-xl bg-card/50 border border-border text-center"
            >
              <h3 className="font-bold text-xl mb-4">
                أسئلة أو مخاوف بشأن الخصوصية؟
              </h3>
              <p className="text-muted-foreground mb-6">
                إذا كان لديك أي أسئلة حول هذه السياسة أو ممارسات الخصوصية لدينا، يرجى التواصل معنا.
              </p>
              <a
                href="/contact"
                className="inline-block px-8 py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                تواصل معنا
              </a>
            </motion.div>
          </div>
        </section>

        {/* Legal Notice */}
        <section className="py-12 px-4 bg-card/30 border-t border-border">
          <div className="container mx-auto max-w-4xl">
            <p className="text-xs text-muted-foreground text-center">
              هذه السياسة قابلة للتطبيق على جميع المستخدمين من جميع البلدان. بما يتوافق مع القوانين المعمول بها بشأن الخصوصية والبيانات الشخصية.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
