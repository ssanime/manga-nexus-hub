import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Teams() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members (count)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTeams(data);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                فرق الترجمة
              </h1>
              <p className="text-muted-foreground">
                تصفح جميع فرق الترجمة المعتمدة
              </p>
            </div>
            <Button onClick={() => navigate('/teams/create')}>
              <Plus className="w-4 h-4 ml-2" />
              إنشاء فريق جديد
            </Button>
          </div>

          {/* Teams Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : teams.length === 0 ? (
            <Card className="p-12 text-center bg-card border-border">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">لا توجد فرق بعد</h3>
              <p className="text-muted-foreground mb-4">كن أول من ينشئ فريق ترجمة</p>
              <Button onClick={() => navigate('/teams/create')}>
                <Plus className="w-4 h-4 ml-2" />
                إنشاء فريق
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <Card 
                  key={team.id} 
                  className="overflow-hidden bg-card border-border hover:border-primary transition-all cursor-pointer"
                  onClick={() => navigate(`/teams/${team.slug}`)}
                >
                  <div className="p-6 space-y-4">
                    {/* Logo */}
                    {team.logo_url && (
                      <div className="flex justify-center">
                        <img 
                          src={team.logo_url} 
                          alt={team.name} 
                          className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                        />
                      </div>
                    )}
                    
                    {/* Name */}
                    <div>
                      <h3 className="text-xl font-bold text-foreground text-center mb-2">
                        {team.name}
                      </h3>
                      {team.description && (
                        <p className="text-sm text-muted-foreground text-center line-clamp-2">
                          {team.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Stats */}
                    <div className="flex justify-center gap-4">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="w-3 h-3" />
                        {team.team_members?.[0]?.count || 0} عضو
                      </Badge>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/teams/${team.slug}`);
                      }}
                    >
                      عرض التفاصيل
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
