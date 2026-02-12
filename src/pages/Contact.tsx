import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare, Phone, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/home/Footer";
import { toast } from "sonner";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate form submission
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("تم إرسال رسالتك بنجاح! سنرد عليك قريباً.");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch {
      toast.error("حدث خطأ ما. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactChannels = [
    {
      icon: Mail,
      title: "البريد الإلكتروني",
      value: "support@mangafas.com",
      description: "الرد خلال 24 ساعة",
    },
    {
      icon: MessageSquare,
      title: "Discord",
      value: "انضم لمجتمعنا",
      description: "تواصل مع الفريق والمجتمع",
    },
    {
      icon: Phone,
      title: "الدعم السريع",
      value: "للمشاكل العاجلة",
      description: "تواصل معنا عبر الموقع",
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
              <h1 className="text-4xl md:text-5xl font-bold mb-4">تواصل معنا</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                لديك سؤال أو اقتراح؟ نحن هنا لمساعدتك. تواصل معنا وسنرد عليك في أسرع وقت.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact Channels */}
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              {contactChannels.map((channel, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-all hover:border-primary/50"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4"
                  >
                    <channel.icon className="h-6 w-6 text-primary" />
                  </motion.div>
                  <h3 className="font-bold text-lg mb-2">{channel.title}</h3>
                  <p className="text-primary font-semibold mb-2">{channel.value}</p>
                  <p className="text-sm text-muted-foreground">{channel.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto"
            >
              <div className="p-8 rounded-xl border border-border bg-card/50 backdrop-blur">
                <h2 className="text-2xl font-bold mb-6">أرسل لنا رسالة</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        الاسم
                      </label>
                      <Input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="اسمك الكامل"
                        required
                        className="bg-secondary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        البريد الإلكتروني
                      </label>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="بريدك الإلكتروني"
                        required
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      الموضوع
                    </label>
                    <Input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="موضوع الرسالة"
                      required
                      className="bg-secondary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      الرسالة
                    </label>
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="اكتب رسالتك هنا..."
                      required
                      rows={6}
                      className="bg-secondary/50 resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  >
                    {isSubmitting ? "جاري الإرسال..." : "إرسال الرسالة"}
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Preview */}
        <section className="py-16 px-4 bg-card/30">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">أسئلة شائة</h2>
            <p className="text-center text-muted-foreground mb-8">
              قد تجد إجابة لسؤالك في{" "}
              <a href="/faq" className="text-primary hover:underline">
                صفحة الأسئلة الشائعة
              </a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
