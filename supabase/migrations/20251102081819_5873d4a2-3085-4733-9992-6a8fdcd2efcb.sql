-- Create enum for team member roles
CREATE TYPE public.team_role AS ENUM ('leader', 'manager', 'member');

-- Create enum for team status
CREATE TYPE public.team_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for join request status
CREATE TYPE public.join_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  join_requirements TEXT,
  status team_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create team_join_requests table
CREATE TABLE public.team_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status join_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  UNIQUE(team_id, user_id, status)
);

-- Add team_id to manga table
ALTER TABLE public.manga 
  ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add team_id to chapters table
ALTER TABLE public.chapters 
  ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Anyone can view approved teams"
  ON public.teams FOR SELECT
  USING (status = 'approved' OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Team leaders can update their teams"
  ON public.teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = teams.id 
        AND user_id = auth.uid() 
        AND role = 'leader'
    )
  );

-- RLS Policies for team_members
CREATE POLICY "Anyone can view team members of approved teams"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_members.team_id AND status = 'approved'
    )
  );

CREATE POLICY "Team leaders and managers can add members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('leader', 'manager')
    )
  );

CREATE POLICY "Team leaders and managers can update members"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('leader', 'manager')
    )
  );

CREATE POLICY "Team leaders and managers can remove members"
  ON public.team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('leader', 'manager')
    )
  );

-- RLS Policies for team_join_requests
CREATE POLICY "Users can view their own join requests"
  ON public.team_join_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Team leaders and managers can view requests"
  ON public.team_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_join_requests.team_id
        AND user_id = auth.uid()
        AND role IN ('leader', 'manager')
    )
  );

CREATE POLICY "Authenticated users can create join requests"
  ON public.team_join_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Team leaders and managers can update requests"
  ON public.team_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_join_requests.team_id
        AND user_id = auth.uid()
        AND role IN ('leader', 'manager')
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_teams_status ON public.teams(status);
CREATE INDEX idx_teams_slug ON public.teams(slug);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_join_requests_team_id ON public.team_join_requests(team_id);
CREATE INDEX idx_team_join_requests_status ON public.team_join_requests(status);
CREATE INDEX idx_manga_team_id ON public.manga(team_id);
CREATE INDEX idx_chapters_team_id ON public.chapters(team_id);

-- Function to automatically add creator as team leader
CREATE OR REPLACE FUNCTION public.add_team_leader()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'leader');
  RETURN NEW;
END;
$$;

-- Trigger to add creator as leader
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.add_team_leader();

-- Function to handle join request approval
CREATE OR REPLACE FUNCTION public.approve_team_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (NEW.team_id, NEW.user_id, 'member')
    ON CONFLICT (team_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for join request approval
CREATE TRIGGER on_join_request_approved
  AFTER UPDATE ON public.team_join_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.approve_team_join_request();

-- Update trigger for teams
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();