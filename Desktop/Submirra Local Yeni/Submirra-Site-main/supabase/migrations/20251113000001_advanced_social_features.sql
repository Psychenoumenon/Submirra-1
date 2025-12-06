/*
  # Advanced Social Features
  
  1. Create follows table for user following system
  2. Create notifications table for user notifications
  3. Add bio and username columns to profiles
  4. Create view for user statistics
  5. Add triggers for automatic notifications
  6. Update RLS policies
*/

-- Add bio and username to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio text DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username text DEFAULT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username) WHERE username IS NOT NULL;
  END IF;
END $$;

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention')),
  actor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  dream_id uuid REFERENCES dreams(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES dream_comments(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Follows policies (drop if exists first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view all follows" ON follows;
CREATE POLICY "Users can view all follows"
  ON follows FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view follows" ON follows;
CREATE POLICY "Anyone can view follows"
  ON follows FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON follows;
CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());

-- Notifications policies (drop if exists first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_at_idx ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_actor_id uuid,
  p_dream_id uuid DEFAULT NULL,
  p_comment_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- Don't create notification if user is acting on their own content
  IF p_user_id = p_actor_id THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO notifications (user_id, type, actor_id, dream_id, comment_id)
  VALUES (p_user_id, p_type, p_actor_id, p_dream_id, p_comment_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for like notifications
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
  v_dream_owner_id uuid;
BEGIN
  SELECT user_id INTO v_dream_owner_id
  FROM dreams
  WHERE id = NEW.dream_id;
  
  PERFORM create_notification(
    v_dream_owner_id,
    'like',
    NEW.user_id,
    NEW.dream_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for comment notifications
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_dream_owner_id uuid;
BEGIN
  SELECT user_id INTO v_dream_owner_id
  FROM dreams
  WHERE id = NEW.dream_id;
  
  PERFORM create_notification(
    v_dream_owner_id,
    'comment',
    NEW.user_id,
    NEW.dream_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for follow notifications
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.following_id,
    'follow',
    NEW.follower_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_on_like ON dream_likes;
CREATE TRIGGER trigger_notify_on_like
  AFTER INSERT ON dream_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_like();

DROP TRIGGER IF EXISTS trigger_notify_on_comment ON dream_comments;
CREATE TRIGGER trigger_notify_on_comment
  AFTER INSERT ON dream_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();

DROP TRIGGER IF EXISTS trigger_notify_on_follow ON follows;
CREATE TRIGGER trigger_notify_on_follow
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_follow();

-- View for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  p.id as user_id,
  COUNT(DISTINCT d.id) FILTER (WHERE d.is_public = true) as public_dreams_count,
  COUNT(DISTINCT dl.id) as total_likes_received,
  COUNT(DISTINCT dc.id) as total_comments_received,
  COUNT(DISTINCT f1.follower_id) as followers_count,
  COUNT(DISTINCT f2.following_id) as following_count
FROM profiles p
LEFT JOIN dreams d ON d.user_id = p.id
LEFT JOIN dream_likes dl ON dl.dream_id = d.id AND d.user_id = p.id
LEFT JOIN dream_comments dc ON dc.dream_id = d.id AND d.user_id = p.id
LEFT JOIN follows f1 ON f1.following_id = p.id
LEFT JOIN follows f2 ON f2.follower_id = p.id
GROUP BY p.id;

-- Grant access to view
GRANT SELECT ON user_stats TO authenticated, anon;

