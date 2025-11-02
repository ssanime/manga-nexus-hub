import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { Users, CheckCircle, XCircle, Shield, Crown } from "lucide-react";

export default function TeamDashboard() {
  const { slug } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, [slug]);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!teamData) {
      navigate('/teams');
      return;
    }

    setTeam(teamData);

    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamData.id)
      .eq('user_id', user.id)
      .single();

    if (!membership || (membership.role !== 'leader' && membership.role !== 'manager')) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية للوصول إلى لوحة التحكم",
        variant: "destructive",
      });
      navigate(`/teams/${slug}`);
      return;
    }

    setUserRole(membership.role);
    fetchData(teamData.id);
  };

  const fetchData = async (teamId: string) => {
    // Fetch members
    const { data: membersData } = await supabase
      .from('team_members')
      .select(`
        *,
        profiles (username, avatar_url)
      `)
      .eq('team_id', teamId)
      .order('role', { ascending: true });

    if (membersData) {
      setMembers(membersData);
    }

    // Fetch join requests
    const { data: requestsData } = await supabase
      .from('team_join_requests')
      .select(`
        *,
        profiles (username, avatar_url)
      `)
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsData) {
      setJoinRequests(requestsData);
    }

    setLoading(false);
  };

  const handleJoinRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('team_join_requests')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser?.id
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: status === 'approved' ? "تم قبول الطلب" : "تم رفض الطلب",
        description: status === 'approved' ? "تم إضافة العضو إلى الفريق" : "تم رفض طلب الانضمام",
      });

      fetchData(team.id);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'leader' | 'manager' | 'member') => {
    if (userRole !== 'leader') {
      toast({
        title: "غير مصرح",
        description: "فقط القائد يمكنه تغيير الأدوار",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث دور العضو بنجاح",
      });

      fetchData(team.id);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeMember = async (memberId: string) => {
    if (userRole !== 'leader' && userRole !== 'manager') {
      return;
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "تم الإزالة",
        description: "تم إزالة العضو من الفريق",
      });

      fetchData(team.id);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'leader':
        return <Crown className="w-4 h-4" />;
      case 'manager':
        return <Shield className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'leader':
        return 'قائد';
      case 'manager':
        return 'مدير';
      default:
        return 'عضو';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              لوحة إدارة {team?.name}
            </h1>
            <p className="text-muted-foreground">
              إدارة الأعضاء والطلبات
            </p>
          </div>

          <Tabs defaultValue="requests" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="requests">
                طلبات الانضمام ({joinRequests.length})
              </TabsTrigger>
              <TabsTrigger value="members">
                الأعضاء ({members.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-6">
              {joinRequests.length === 0 ? (
                <Card className="p-8 text-center bg-card border-border">
                  <p className="text-muted-foreground">لا توجد طلبات انضمام جديدة</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {joinRequests.map((request) => (
                    <Card key={request.id} className="p-6 bg-card border-border">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {request.profiles?.avatar_url ? (
                              <img 
                                src={request.profiles.avatar_url} 
                                alt={request.profiles.username || 'User'}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                              </div>
                            )}
                            <p className="font-semibold text-foreground">
                              {request.profiles?.username || 'مستخدم'}
                            </p>
                          </div>
                          
                          {request.message && (
                            <p className="text-sm text-muted-foreground bg-secondary/20 p-3 rounded">
                              {request.message}
                            </p>
                          )}
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(request.created_at).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleJoinRequest(request.id, 'approved')}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            قبول
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleJoinRequest(request.id, 'rejected')}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            رفض
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="members" className="mt-6">
              <div className="space-y-4">
                {members.map((member) => (
                  <Card key={member.id} className="p-6 bg-card border-border">
                    <div className="flex items-center gap-4">
                      {member.profiles?.avatar_url ? (
                        <img 
                          src={member.profiles.avatar_url} 
                          alt={member.profiles.username || 'User'}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {member.profiles?.username || 'مستخدم'}
                        </p>
                        <Badge variant="outline" className="gap-1 text-xs">
                          {getRoleIcon(member.role)}
                          {getRoleLabel(member.role)}
                        </Badge>
                      </div>

                      {userRole === 'leader' && member.role !== 'leader' && (
                        <div className="flex gap-2">
                          {member.role !== 'manager' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMemberRole(member.id, 'manager')}
                            >
                              ترقية لمدير
                            </Button>
                          )}
                          {member.role === 'manager' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMemberRole(member.id, 'member')}
                            >
                              خفض لعضو
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeMember(member.id)}
                          >
                            إزالة
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
