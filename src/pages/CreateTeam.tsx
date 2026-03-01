import { useState, useRef, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, X, Plus, Trash2, GripVertical, Eye, EyeOff,
  Shield, Users, Settings, FileText, MessageSquare,
  CheckCircle2, AlertCircle, Sparkles, Globe, Lock,
  Palette, ChevronDown, ChevronUp, Image as ImageIcon,
  BookOpen, Award, Zap, Target, Crown, Star
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface CustomQuestion {
  id: string;
  text: string;
  type: "text" | "textarea" | "select";
  required: boolean;
  options?: string[];
}

const TEAM_CATEGORIES = [
  { value: "manga", label: "مانجا", icon: BookOpen },
  { value: "manhwa", label: "مانهوا", icon: Star },
  { value: "manhua", label: "مانها", icon: Globe },
  { value: "novel", label: "روايات", icon: FileText },
  { value: "mixed", label: "متعدد", icon: Sparkles },
];

const SPECIALIZATIONS = [
  "ترجمة", "تنظيف", "تايبسيت", "رسم", "تدقيق", "إخراج", "تحرير", "إدارة"
];

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function CreateTeam() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    join_requirements: "",
    require_sample_chapter: false,
    sample_chapter_instructions: "",
    category: "manga",
    specializations: [] as string[],
    is_open: true,
    max_members: 50,
    language: "ar",
    discord_url: "",
    twitter_url: "",
    website_url: "",
    rules: "",
    welcome_message: "",
    auto_accept: false,
    min_age: 0,
  });

  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([
    { id: generateId(), text: "", type: "text", required: false }
  ]);

  const steps = [
    { title: "المعلومات الأساسية", icon: Users, description: "اسم الفريق والوصف" },
    { title: "الهوية البصرية", icon: Palette, description: "الشعار والبانر" },
    { title: "الإعدادات المتقدمة", icon: Settings, description: "التخصصات والفئة" },
    { title: "نظام الانضمام", icon: Shield, description: "المتطلبات والأسئلة" },
    { title: "المراجعة والإرسال", icon: CheckCircle2, description: "مراجعة نهائية" },
  ];

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "خطأ", description: "حجم الصورة يجب أن يكون أقل من 5MB", variant: "destructive" });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "خطأ", description: "حجم البانر يجب أن يكون أقل من 10MB", variant: "destructive" });
        return;
      }
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBannerPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }));
  };

  const addQuestion = () => {
    setCustomQuestions(prev => [...prev, { id: generateId(), text: "", type: "text", required: false }]);
  };

  const removeQuestion = (id: string) => {
    setCustomQuestions(prev => prev.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<CustomQuestion>) => {
    setCustomQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0: return formData.name.trim().length >= 3;
      case 1: return true;
      case 2: return true;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  }, [currentStep, formData.name]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      let logoUrl = "";
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `team_logo_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('manga-covers').upload(fileName, logoFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('manga-covers').getPublicUrl(fileName);
        logoUrl = publicUrl;
      }

      const slug = formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
      const filteredQuestions = customQuestions
        .filter(q => q.text.trim() !== "")
        .map(q => ({ text: q.text, type: q.type, required: q.required, options: q.options }));

      const { error: insertError } = await supabase
        .from('teams')
        .insert({
          name: formData.name,
          slug,
          description: formData.description || null,
          logo_url: logoUrl || null,
          join_requirements: formData.join_requirements || null,
          created_by: user.id,
          status: 'pending',
          require_sample_chapter: formData.require_sample_chapter,
          sample_chapter_instructions: formData.sample_chapter_instructions || null,
          custom_questions: filteredQuestions.length > 0 ? filteredQuestions : null,
        });

      if (insertError) throw insertError;

      toast({ title: "تم إرسال الطلب بنجاح! 🎉", description: "سيتم مراجعة طلبك من قبل الإدارة" });
      navigate('/teams');
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    enter: { opacity: 0, x: 50 },
    center: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.3 } },
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div key="step0" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                اسم الفريق *
              </Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: فريق الأنمي العربي"
                className="text-lg h-12"
              />
              {formData.name && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground">
                  الرابط: /teams/{formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '')}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                وصف الفريق
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="اكتب وصفاً مميزاً لفريقك يجذب المترجمين..."
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-left">{formData.description.length}/500</p>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                الفئة الرئيسية
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {TEAM_CATEGORIES.map(cat => (
                  <motion.button
                    key={cat.value}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.category === cat.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <cat.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{cat.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                رسالة ترحيب للأعضاء الجدد
              </Label>
              <Textarea
                value={formData.welcome_message}
                onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                placeholder="مرحباً بك في الفريق! نحن سعداء بانضمامك..."
                rows={3}
                className="resize-none"
              />
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                شعار الفريق
              </Label>
              <div className="flex items-center gap-6">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={`relative w-32 h-32 rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
                    logoPreview ? "border-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(""); }}
                        className="absolute top-1 right-1 w-6 h-6 bg-destructive rounded-full flex items-center justify-center z-20"
                      >
                        <X className="w-3 h-3 text-destructive-foreground" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                      <Upload className="w-8 h-8" />
                      <span className="text-xs">رفع شعار</span>
                    </div>
                  )}
                </motion.div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• يفضل صورة مربعة</p>
                  <p>• الحد الأقصى: 5MB</p>
                  <p>• PNG أو JPG أو WebP</p>
                </div>
              </div>
            </div>

            {/* Banner Upload */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                صورة الغلاف (بانر)
              </Label>
              <motion.div
                whileHover={{ scale: 1.01 }}
                className={`relative h-48 rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
                  bannerPreview ? "border-primary" : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {bannerPreview ? (
                  <>
                    <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setBannerFile(null); setBannerPreview(""); }}
                      className="absolute top-2 right-2 w-8 h-8 bg-destructive rounded-full flex items-center justify-center z-20"
                    >
                      <X className="w-4 h-4 text-destructive-foreground" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                    <ImageIcon className="w-12 h-12" />
                    <span className="text-sm">اضغط لرفع صورة الغلاف (1200×400 مثالي)</span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                روابط التواصل (اختياري)
              </Label>
              <div className="grid grid-cols-1 gap-3">
                <Input
                  value={formData.discord_url}
                  onChange={(e) => setFormData({ ...formData, discord_url: e.target.value })}
                  placeholder="رابط Discord"
                  className="h-11"
                />
                <Input
                  value={formData.twitter_url}
                  onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                  placeholder="رابط Twitter / X"
                  className="h-11"
                />
                <Input
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="موقع الويب"
                  className="h-11"
                />
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
            {/* Specializations */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                تخصصات الفريق
              </Label>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map(spec => (
                  <motion.button
                    key={spec}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleSpecialization(spec)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                      formData.specializations.includes(spec)
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-card hover:border-primary/40 text-muted-foreground"
                    }`}
                  >
                    {spec}
                    {formData.specializations.includes(spec) && (
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Team Settings */}
            <div className="space-y-4 p-5 rounded-xl border border-border bg-card/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                إعدادات الفريق
              </h3>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">فتح باب الانضمام</p>
                  <p className="text-xs text-muted-foreground">السماح للمستخدمين بتقديم طلبات انضمام</p>
                </div>
                <Switch
                  checked={formData.is_open}
                  onCheckedChange={(v) => setFormData({ ...formData, is_open: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">القبول التلقائي</p>
                  <p className="text-xs text-muted-foreground">قبول الطلبات تلقائياً دون مراجعة</p>
                </div>
                <Switch
                  checked={formData.auto_accept}
                  onCheckedChange={(v) => setFormData({ ...formData, auto_accept: v })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">الحد الأقصى للأعضاء</p>
                  <Badge variant="secondary">{formData.max_members}</Badge>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={formData.max_members}
                  onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) })}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5</span>
                  <span>200</span>
                </div>
              </div>
            </div>

            {/* Rules */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                قوانين الفريق
              </Label>
              <Textarea
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                placeholder="1. الالتزام بمواعيد التسليم&#10;2. جودة عالية في الترجمة&#10;3. التعاون مع باقي الأعضاء"
                rows={5}
                className="resize-none"
              />
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div key="step3" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
            {/* Join Requirements */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                متطلبات الانضمام
              </Label>
              <Textarea
                value={formData.join_requirements}
                onChange={(e) => setFormData({ ...formData, join_requirements: e.target.value })}
                placeholder="يجب أن يكون لديك خبرة سابقة في الترجمة..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Sample Chapter */}
            <div className="space-y-4 p-5 rounded-xl border border-border bg-card/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold">فصل تجريبي</p>
                    <p className="text-xs text-muted-foreground">اطلب فصل عمل كعينة من المتقدمين</p>
                  </div>
                </div>
                <Switch
                  checked={formData.require_sample_chapter}
                  onCheckedChange={(v) => setFormData({ ...formData, require_sample_chapter: v })}
                />
              </div>
              <AnimatePresence>
                {formData.require_sample_chapter && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <Textarea
                      value={formData.sample_chapter_instructions}
                      onChange={(e) => setFormData({ ...formData, sample_chapter_instructions: e.target.value })}
                      placeholder="يرجى ترجمة 5 صفحات من أي مانجا حديثة..."
                      rows={3}
                      className="resize-none"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Custom Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  أسئلة مخصصة للمتقدمين
                </Label>
                <Button type="button" size="sm" variant="outline" onClick={addQuestion} className="gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  إضافة
                </Button>
              </div>
              <AnimatePresence>
                {customQuestions.map((q, idx) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 rounded-xl border border-border bg-secondary/10 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">سؤال {idx + 1}</Badge>
                        <div className="flex-1" />
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">إلزامي</span>
                          <Switch
                            checked={q.required}
                            onCheckedChange={(v) => updateQuestion(q.id, { required: v })}
                          />
                        </div>
                        {customQuestions.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 text-destructive"
                            onClick={() => removeQuestion(q.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <Input
                        value={q.text}
                        onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                        placeholder="اكتب السؤال هنا..."
                      />
                      <Select
                        value={q.type}
                        onValueChange={(v) => updateQuestion(q.id, { type: v as CustomQuestion["type"] })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">نص قصير</SelectItem>
                          <SelectItem value="textarea">نص طويل</SelectItem>
                          <SelectItem value="select">اختيار من قائمة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div key="step4" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
            <div className="text-center mb-6">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Sparkles className="w-12 h-12 mx-auto text-primary mb-3" />
              </motion.div>
              <h3 className="text-2xl font-bold">مراجعة نهائية</h3>
              <p className="text-muted-foreground">تأكد من صحة البيانات قبل الإرسال</p>
            </div>

            {/* Preview Card */}
            <Card className="overflow-hidden border-primary/30">
              {bannerPreview && (
                <div className="h-32 relative">
                  <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                </div>
              )}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border-2 border-primary/40" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <Users className="w-8 h-8 text-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{formData.name || "اسم الفريق"}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary">
                        {TEAM_CATEGORIES.find(c => c.value === formData.category)?.label}
                      </Badge>
                      {formData.is_open ? (
                        <Badge className="bg-primary/20 text-primary border-primary/30">مفتوح</Badge>
                      ) : (
                        <Badge className="bg-destructive/20 text-destructive border-destructive/30">مغلق</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {formData.description && (
                  <p className="text-sm text-muted-foreground">{formData.description}</p>
                )}

                {formData.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {formData.specializations.map(s => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-secondary/20">
                    <p className="text-muted-foreground text-xs">الحد الأقصى</p>
                    <p className="font-bold">{formData.max_members} عضو</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/20">
                    <p className="text-muted-foreground text-xs">الأسئلة</p>
                    <p className="font-bold">{customQuestions.filter(q => q.text.trim()).length} سؤال</p>
                  </div>
                </div>

                {formData.require_sample_chapter && (
                  <div className="flex items-center gap-2 text-sm text-primary p-2 rounded-lg bg-primary/10">
                    <Award className="w-4 h-4" />
                    يتطلب فصل تجريبي
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="inline-block mb-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">إنشاء فريق ترجمة جديد</h1>
            <p className="text-muted-foreground">سيتم مراجعة طلبك من قبل الإدارة قبل الموافقة</p>
          </motion.div>

          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              {/* Progress Line */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-border">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: "0%" }}
                  animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {steps.map((step, i) => {
                const StepIcon = step.icon;
                const isActive = i === currentStep;
                const isComplete = i < currentStep;
                return (
                  <motion.button
                    key={i}
                    type="button"
                    onClick={() => i <= currentStep && setCurrentStep(i)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative z-10 flex flex-col items-center gap-1.5 ${i <= currentStep ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110" :
                      isComplete ? "bg-primary/80 text-primary-foreground" :
                      "bg-card border-2 border-border text-muted-foreground"
                    }`}>
                      {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-4 h-4" />}
                    </div>
                    <span className={`text-[10px] font-medium hidden sm:block ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {step.title}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <Card className="p-6 md:p-8 bg-card/80 backdrop-blur border-border">
            <div className="mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {(() => { const Icon = steps[currentStep].icon; return <Icon className="w-5 h-5 text-primary" />; })()}
                {steps[currentStep].title}
              </h2>
              <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
            </div>

            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ChevronUp className="w-4 h-4 rotate-90" />
                السابق
              </Button>

              <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-all ${
                    i === currentStep ? "bg-primary w-6" : i < currentStep ? "bg-primary/50" : "bg-border"
                  }`} />
                ))}
              </div>

              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceed()}
                  className="gap-2 bg-gradient-to-r from-primary to-accent"
                >
                  التالي
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !formData.name.trim()}
                  className="gap-2 bg-gradient-to-r from-primary to-accent min-w-[140px]"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      إرسال الطلب
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
