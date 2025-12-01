-- Extend auth.users with profiles
  title TEXT NOT NULL,
  description TEXT,
  parent_node_id UUID REFERENCES knowledge_nodes(id),
  domain TEXT NOT NULL, -- e.g., 'biology', 'physics'
  difficulty_tier INTEGER DEFAULT 1,
  concept_content TEXT, -- Study material
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quests (challenges)
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  quest_type TEXT DEFAULT 'feynman', -- 'feynman', 'socratic'
  scenario_prompt TEXT NOT NULL,
  win_condition JSONB, -- Scoring rubric
  xp_reward INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'locked', -- 'locked', 'corrupted', 'restored'
  mastery_score INTEGER DEFAULT 0,
  is_bookmarked BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, node_id)
);

-- Quest conversation logs
CREATE TABLE quest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  transcript JSONB, -- Array of {role, content}
  ai_grade_json JSONB, -- {score, feedback, misconceptions}
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_logs ENABLE ROW LEVEL SECURITY;

-- Public read for knowledge nodes and quests
ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for knowledge_nodes" ON knowledge_nodes
  FOR SELECT USING (true);

CREATE POLICY "Public read access for quests" ON quests
  FOR SELECT USING (true);

CREATE POLICY "Auth users can insert nodes" ON knowledge_nodes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own nodes" ON knowledge_nodes
  FOR UPDATE USING (auth.uid() = created_by);

-- User-specific policies
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read own quest logs" ON quest_logs
  FOR ALL USING (auth.uid() = user_id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, NEW.email); -- Default username to email initially
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Social Features Schema Updates

-- Add is_public column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Allow public access to profiles that are marked as public
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (is_public = true);

-- Secure Leaderboard Function (Masks private users)
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  id UUID,
  username TEXT,
  xp_total INTEGER,
  level INTEGER,
  character_class TEXT,
  avatar_url TEXT,
  is_public BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    CASE WHEN p.is_public THEN p.username ELSE 'Anonymous Agent' END as username,
    p.xp_total,
    p.level,
    p.character_class,
    CASE WHEN p.is_public THEN p.avatar_url ELSE NULL END as avatar_url,
    p.is_public
  FROM profiles p
  ORDER BY p.xp_total DESC
  LIMIT 50;
END;
$$;


-- Add hints_used column to user_progress
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS hints_used INTEGER DEFAULT 0;


-- RESTORATION SQUADS SCHEMA

CREATE TABLE squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  squad_xp INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  is_open BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE squad_members (
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'leader', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (squad_id, user_id)
);

-- RLS
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for squads" ON squads FOR SELECT USING (true);
CREATE POLICY "Members can view squad members" ON squad_members FOR SELECT USING (true);

-- RPC: Create Squad (Ensures user isn't already in one)
CREATE OR REPLACE FUNCTION create_squad(name TEXT, description TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_squad_id UUID;
BEGIN
  -- Check if user is already in a squad
  IF EXISTS (SELECT 1 FROM squad_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User is already in a squad';
  END IF;

  -- Create Squad
  INSERT INTO squads (name, description, created_by)
  VALUES (name, description, auth.uid())
  RETURNING id INTO new_squad_id;

  -- Add Creator as Leader
  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (new_squad_id, auth.uid(), 'leader');

  RETURN new_squad_id;
END;
$$;

-- RPC: Join Squad
CREATE OR REPLACE FUNCTION join_squad(squad_id_input UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Check if user is already in a squad
  IF EXISTS (SELECT 1 FROM squad_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User is already in a squad';
  END IF;

  -- Join
  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (squad_id_input, auth.uid(), 'member');
END;
$$;

-- RPC: Leave Squad
CREATE OR REPLACE FUNCTION leave_squad()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_squad_id UUID;
  is_leader BOOLEAN;
  member_count INTEGER;
BEGIN
  -- Get current squad info
  SELECT squad_id, (role = 'leader') INTO current_squad_id, is_leader
  FROM squad_members
  WHERE user_id = auth.uid();

  IF current_squad_id IS NULL THEN
    RAISE EXCEPTION 'User is not in a squad';
  END IF;

  -- Remove member
  DELETE FROM squad_members WHERE user_id = auth.uid();

  -- If leader left, check if squad is empty or assign new leader
  -- For MVP: If leader leaves, just delete squad if empty, or let it be leaderless (or assign random).
  -- Simple logic: If squad empty, delete it.
  SELECT COUNT(*) INTO member_count FROM squad_members WHERE squad_id = current_squad_id;
  
  IF member_count = 0 THEN
    DELETE FROM squads WHERE id = current_squad_id;
  END IF;
END;
$$;




-- CONTENT GENERATION SCHEMA

-- Add status and created_by to knowledge_nodes
ALTER TABLE knowledge_nodes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published'; -- 'draft', 'published'
ALTER TABLE knowledge_nodes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Storage for Syllabi
INSERT INTO storage.buckets (id, name, public) 
VALUES ('syllabi', 'syllabi', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'syllabi');
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'syllabi' AND auth.role() = 'authenticated');
