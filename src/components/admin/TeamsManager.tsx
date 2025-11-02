import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export const TeamsManager = () => {
  const { toast } = useToast();
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
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTeams(data);
    }
    setLoading(false);
  };

  const handleTeamStatus = async (teamId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ status })
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: status === 'approved' ? "تمت الموافقة" : "تم الرفض",
        description: status === 'approved' ? "تم الموافقة على الفريق" : "تم رفض الفريق",
      });

      fetchTeams();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> معتمد</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> مرفوض</Badge>;
      default:
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> قيد المراجعة</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">إدارة الفرق</h2>
        <p className="text-muted-foreground">الموافقة على الفرق الجديدة أو رفضها</p>
      </div>

      {teams.length === 0 ? (
        <Card className="p-8 text-center bg-card border-border">
          <p className="text-muted-foreground">لا توجد فرق بعد</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <Card key={team.id} className="p-6 bg-card border-border">
              <div className="flex items-start gap-4">
                {team.logo_url && (
                  <img 
                    src={team.logo_url} 
                    alt={team.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                  />
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground text-lg">
                      {team.name}
                    </h3>
                    {getStatusBadge(team.status)}
                  </div>
                  
                  {team.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {team.description}
                    </p>
                  )}
                  
                  {team.join_requirements && (
                    <p className="text-xs text-muted-foreground bg-secondary/20 p-2 rounded">
                      متطلبات الانضمام: {team.join_requirements}
                    </p>
                  )}
                  
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">
                      {team.team_members?.[0]?.count || 0} عضو
                    </Badge>
                    <Badge variant="outline">
                      {new Date(team.created_at).toLocaleDateString('ar-SA')}
                    </Badge>
                  </div>
                </div>
                
                {team.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleTeamStatus(team.id, 'approved')}
                    >
                      <CheckCircle className="w-4 h-4 ml-1" />
                      موافقة
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleTeamStatus(team.id, 'rejected')}
                    >
                      <XCircle className="w-4 h-4 ml-1" />
                      رفض
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
