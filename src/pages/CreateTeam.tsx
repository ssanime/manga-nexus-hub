import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Upload } from "lucide-react";

export default function CreateTeam() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    join_requirements: "",
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }

      let logoUrl = "";
      
      // Upload logo if selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `team_logo_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('manga-covers')
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('manga-covers')
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      // Create team
      const slug = formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
      
      const { error: insertError } = await supabase
        .from('teams')
        .insert({
          name: formData.name,
          slug,
          description: formData.description || null,
          logo_url: logoUrl || null,
          join_requirements: formData.join_requirements || null,
          created_by: user.id,
          status: 'pending'
        });

      if (insertError) throw insertError;

      toast({
        title: "تم إرسال الطلب",
        description: "سيتم مراجعة طلبك من قبل المدير العام",
      });

      navigate('/teams');
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 bg-card border-border">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              إنشاء فريق ترجمة جديد
            </h1>
            <p className="text-muted-foreground mb-6">
              سيتم مراجعة طلبك من قبل المدير العام قبل الموافقة
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Logo */}
              <div className="space-y-2">
                <Label>شعار الفريق</Label>
                <div className="flex gap-4 items-center">
                  <div className="relative border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8" />
                          <span className="text-sm">اضغط لرفع شعار</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label>اسم الفريق *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="فريق الأنمي العربي"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="نحن فريق متخصص في ترجمة المانجا اليابانية..."
                  rows={4}
                />
              </div>

              {/* Join Requirements */}
              <div className="space-y-2">
                <Label>متطلبات الانضمام</Label>
                <Textarea
                  value={formData.join_requirements}
                  onChange={(e) => setFormData({ ...formData, join_requirements: e.target.value })}
                  placeholder="يجب أن يكون لديك خبرة في الترجمة..."
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "جاري الإرسال..." : "إرسال الطلب"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
