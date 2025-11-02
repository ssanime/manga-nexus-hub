import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { Users, Shield, Settings, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function TeamDetail() {
  const { slug } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userMembership, setUserMembership] = useState<any>(null);

  useEffect(() => {
    fetchTeamData();
    checkCurrentUser();
  }, [slug]);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    
    if (user && slug) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (teamData) {
        const { data: membership } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamData.id)
          .eq('user_id', user.id)
          .single();
        
        setUserMembership(membership);
      }
    }
  };

  const fetchTeamData = async () => {
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'approved')
      .single();

    if (teamError || !teamData) {
      navigate('/teams');
      return;
    }

    setTeam(teamData);

    const { data: membersData } = await supabase
      .from('team_members')
      .select(`
        *,
        profiles (username, avatar_url)
      `)
      .eq('team_id', teamData.id)
      .order('role', { ascending: true });

    if (membersData) {
      setMembers(membersData);
    }

    setLoading(false);
  };

  const handleJoinRequest = async () => {
    if (!currentUser) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('team_join_requests')
        .insert({
          team_id: team.id,
          user_id: currentUser.id,
          message: joinMessage,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "تم إرسال الطلب",
        description: "سيتم مراجعة طلبك من قبل مدير الفريق",
      });

      setIsDialogOpen(false);
      setJoinMessage("");
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
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Team Header */}
          <Card className="p-8 bg-card border-border">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              {team.logo_url && (
                <img 
                  src={team.logo_url} 
                  alt={team.name} 
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary"
                />
              )}
              
              <div className="flex-1 text-center md:text-right">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {team.name}
                </h1>
                {team.description && (
                  <p className="text-muted-foreground mb-4">
                    {team.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Badge variant="secondary">
                    <Users className="w-3 h-3 ml-1" />
                    {members.length} عضو
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                {userMembership ? (
                  <>
                    {(userMembership.role === 'leader' || userMembership.role === 'manager') && (
                      <Button onClick={() => navigate(`/teams/${slug}/dashboard`)}>
                        <Settings className="w-4 h-4 ml-2" />
                        لوحة التحكم
                      </Button>
                    )}
                  </>
                ) : (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>طلب الانضمام</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>طلب الانضمام إلى {team.name}</DialogTitle>
                        <DialogDescription>
                          {team.join_requirements && (
                            <div className="mb-4 p-3 bg-secondary/20 rounded">
                              <p className="font-semibold mb-1">متطلبات الانضمام:</p>
                              <p className="text-sm">{team.join_requirements}</p>
                            </div>
                          )}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>رسالة أو سبب الانضمام</Label>
                          <Textarea
                            value={joinMessage}
                            onChange={(e) => setJoinMessage(e.target.value)}
                            placeholder="أخبرنا عن خبرتك ولماذا تريد الانضمام..."
                            rows={4}
                          />
                        </div>
                        
                        <Button onClick={handleJoinRequest} className="w-full">
                          إرسال الطلب
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </Card>

          {/* Team Members */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              أعضاء الفريق
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              {members.map((member) => (
                <div 
                  key={member.id}
                  className="flex items-center gap-3 p-4 bg-secondary/20 rounded-lg"
                >
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
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
