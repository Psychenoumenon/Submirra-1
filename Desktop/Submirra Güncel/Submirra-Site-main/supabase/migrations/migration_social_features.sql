/*
  # Add Social Features
  
  1. Add is_public column to dreams table
  2. Add avatar_url column to profiles table
  3. Create dream_likes table for likes
  4. Create dream_comments table for comments
  5. Update RLS policies to allow viewing public dreams
*/

-- Add is_public column to dreams table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dreams' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE dreams ADD COLUMN is_public boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add avatar_url column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text DEFAULT NULL;
  END IF;
END $$;

-- Create dream_likes table
CREATE TABLE IF NOT EXISTS dream_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(dream_id, user_id)
);

-- Create dream_comments table
CREATE TABLE IF NOT EXISTS dream_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE dream_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_comments ENABLE ROW LEVEL SECURITY;

-- Update dreams RLS policy to allow viewing public dreams
DROP POLICY IF EXISTS "Users can view own dreams" ON dreams;
DROP POLICY IF EXISTS "Users can view own dreams or public dreams" ON dreams;
CREATE POLICY "Users can view own dreams or public dreams"
  ON dreams FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_public = true);

-- Allow anonymous users to view public dreams
DROP POLICY IF EXISTS "Anyone can view public dreams" ON dreams;
CREATE POLICY "Anyone can view public dreams"
  ON dreams FOR SELECT
  TO anon
  USING (is_public = true);

-- Dream likes policies
DROP POLICY IF EXISTS "Users can view all likes" ON dream_likes;
CREATE POLICY "Users can view all likes"
  ON dream_likes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view likes on public dreams" ON dream_likes;
CREATE POLICY "Anyone can view likes on public dreams"
  ON dream_likes FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM dreams
      WHERE dreams.id = dream_likes.dream_id
      AND dreams.is_public = true
    )
  );

DROP POLICY IF EXISTS "Users can insert own likes" ON dream_likes;
CREATE POLICY "Users can insert own likes"
  ON dream_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own likes" ON dream_likes;
CREATE POLICY "Users can delete own likes"
  ON dream_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Dream comments policies
DROP POLICY IF EXISTS "Users can view all comments" ON dream_comments;
CREATE POLICY "Users can view all comments"
  ON dream_comments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view comments on public dreams" ON dream_comments;
CREATE POLICY "Anyone can view comments on public dreams"
  ON dream_comments FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM dreams
      WHERE dreams.id = dream_comments.dream_id
      AND dreams.is_public = true
    )
  );

DROP POLICY IF EXISTS "Users can insert own comments" ON dream_comments;
CREATE POLICY "Users can insert own comments"
  ON dream_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own comments" ON dream_comments;
CREATE POLICY "Users can delete own comments"
  ON dream_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS dreams_is_public_idx ON dreams(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS dream_likes_dream_id_idx ON dream_likes(dream_id);
CREATE INDEX IF NOT EXISTS dream_likes_user_id_idx ON dream_likes(user_id);
CREATE INDEX IF NOT EXISTS dream_comments_dream_id_idx ON dream_comments(dream_id);
CREATE INDEX IF NOT EXISTS dream_comments_user_id_idx ON dream_comments(user_id);

