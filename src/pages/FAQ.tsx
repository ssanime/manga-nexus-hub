import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/home/Footer";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqItems: FAQItem[] = [
  {
    id: "1",
    category: "عام",
    question: "ما هو موقع مانجافاس؟",
    answer:
      "مانجافاس هو موقع عربي متخصص في قراءة المانجا والمانهوا والمانها المترجمة للعربية. نوفر تجربة قراءة مجانية وآمنة مع أفضل جودة للصور والترجمات.",
  },
  {
    id: "2",
    category: "عام",
    question: "هل الموقع آمن للاستخدام؟",
    answer:
      "نعم، الموقع آمن تماماً. نحن نستخدم تقنيات حماية حديثة وسياسات خصوصية صارمة لحماية بيانات المستخدمين. لا نطلب معلومات حساسة غير ضرورية.",
  },
  {
    id: "3",
    category: "عام",
    question: "هل محتوى الموقع مرخص قانوناً؟",
    answer:
      "نحن نعمل على توفير محتوى بطرق قانونية وآمنة. نحترم حقوق المؤلفين والناشرين ونعمل على التعاون معهم لتوفير أفضل تجربة للقراء.",
  },
  {
    id: "4",
    category: "الحساب",
    question: "كيف أنشئ حساباً على الموقع؟",
    answer:
      "يمكنك إنشاء حساب بسهولة عن طريق الضغط على زر تسجيل الدخول في الأعلى واختيار البريد الإلكتروني وكلمة مرور. بعد التحقق من بريدك، سيكون حسابك جاهزاً للاستخدام.",
  },
  {
    id: "5",
    category: "الحساب",
    question: "هل أحتاج حساباً لقراءة المانجا؟",
    answer:
      "لا، يمكنك قراءة جميع المانجا بدون حساب. لكن إنشاء حساب يتيح لك حفظ المفضلة ومتابعة الفصول الجديدة وتتبع تقدمك في القراءة.",
  },
  {
    id: "6",
    category: "الحساب",
    question: "كيف أستعيد كلمة مروري؟",
    answer:
      "إذا نسيت كلمة المرور، اضغط على 'نسيت كلمة المرور' في صفحة تسجيل الدخول وأدخل بريدك الإلكتروني. ستتلقى رابط لإعادة تعيين كلمة المرور.",
  },
  {
    id: "7",
    category: "الميزات",
    question: "ما هي ميزات الموقع الرئيسية؟",
    answer:
      "نوفر قارئ متقدم مع أوضاع قراءة مختلفة، وحفظ المفضلة، وتتبع تاريخ القراءة، والبحث المتقدم، ودعم الفريق المترجمة، وتحديثات يومية للمحتوى.",
  },
  {
    id: "8",
    category: "الميزات",
    question: "هل يمكن تحميل الفصول للقراءة الأوفلاين؟",
    answer:
      "نعم، يمكنك تحميل الفصول على جهازك لقراءتها لاحقاً بدون اتصال إنترنت. استخدم زر التحميل في قارئ الفصل.",
  },
  {
    id: "9",
    category: "الميزات",
    question: "كيف أضيف مانجا للمفضلة؟",
    answer:
      "اذهب لصفحة تفاصيل المانجا واضغط على زر القلب أو أيقونة المفضلة. سيتم حفظها في قائمة المفضلة الخاصة بك والوصول إليها من صفحة الملف الشخصي.",
  },
  {
    id: "10",
    category: "البحث والفلاتر",
    question: "كيف أبحث عن مانجا محددة؟",
    answer:
      "استخدم شريط البحث في الأعلى لكتابة اسم المانجا. يمكنك أيضاً تصفح حسب النوع أو الحالة من صفحات المانجا والمانهوا والمانها.",
  },
  {
    id: "11",
    category: "البحث والفلاتر",
    question: "هل هناك فلاتر متقدمة للبحث؟",
    answer:
      "نعم، يمكنك تصفية النتائج حسب النوع والحالة والسنة والتصنيف. استخدم قسم الفلاتر المتقدمة في صفحة البحث.",
  },
  {
    id: "12",
    category: "الفريق",
    question: "كيف أنضم لفريق ترجمة؟",
    answer:
      "يمكنك عرض الفرق المتاحة من صفحة الفرق، واختيار فريق وتقديم طلب الانضمام. سيقيم الفريق طلبك ويرسل لك إشعاراً بقبول أو رفض الطلب.",
  },
  {
    id: "13",
    category: "الفريق",
    question: "ما هي فوائد الانضمام لفريق ترجمة؟",
    answer:
      "يمكنك المساهمة في ترجمة المانجا، وبناء سمعة في المجتمع، والتعاون مع مترجمين آخرين، والوصول لميزات خاصة بالفريق.",
  },
  {
    id: "14",
    category: "المشاكل الشائعة",
    question: "الصور لا تظهر بشكل صحيح، ماذا أفعل؟",
    answer:
      "حاول تحديث الصفحة أو مسح ذاكرة التخزين المؤقت للمتصفح. إذا استمرت المشكلة، جرب متصفح مختلف أو تواصل معنا عبر صفحة الاتصال.",
  },
  {
    id: "15",
    category: "المشاكل الشائعة",
    question: "الموقع بطيء جداً، ما السبب؟",
    answer:
      "قد يكون السبب اتصال إنترنت بطيء أو حمل على الخوادم. جرب الاتصال بشبكة مختلفة أو الانتظار قليلاً. إذا استمرت المشكلة، تواصل معنا.",
  },
];

const categories = ["الكل", ...new Set(faqItems.map((item) => item.category))];

export default function FAQ() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("الكل");

  const filteredItems =
    selectedCategory === "الكل"
      ? faqItems
      : faqItems.filter((item) => item.category === selectedCategory);

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
                الأسئلة الشائعة
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                ستجد إجابة لمعظم أسئلتك هنا. إذا لم تجد ما تبحث عنه، تواصل معنا.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Categories Filter */}
        <section className="py-8 px-4 border-b border-border">
          <div className="container mx-auto">
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => (
                <motion.button
                  key={category}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedCategory === category
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border hover:border-primary/50"
                  }`}
                >
                  {category}
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Items */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="space-y-4">
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === item.id ? null : item.id)
                    }
                    className="w-full p-6 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-all hover:border-primary/50 text-right flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{item.question}</h3>
                      <p className="text-xs text-primary mt-1">
                        {item.category}
                      </p>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedId === item.id ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedId === item.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 bg-primary/5 border border-t-0 border-border rounded-b-xl">
                          <p className="text-muted-foreground leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  لا توجد أسئلة في هذه الفئة.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-16 px-4 bg-card/30 border-t border-border">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">لم تجد إجابتك؟</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              إذا كان لديك سؤال لم يتم الإجابة عليه هنا، تواصل معنا وسنساعدك في أسرع وقت.
            </p>
            <a
              href="/contact"
              className="inline-block px-8 py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              تواصل معنا
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
