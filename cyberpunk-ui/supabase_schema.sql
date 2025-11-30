-- Extend auth.users with profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  xp_total INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  character_class TEXT DEFAULT 'Novice',
  streak_count INTEGER DEFAULT 0,
  last_active_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge nodes (the syllabus graph)
CREATE TABLE knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
