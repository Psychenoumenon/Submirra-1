-- Add likes and dislikes count columns to dream_comments table
ALTER TABLE dream_comments 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0;

-- Add likes and dislikes count columns to generation_comments table
ALTER TABLE generation_comments 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0;

-- Create comment_likes table for dream comments
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES dream_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_like BOOLEAN NOT NULL, -- true = like, false = dislike
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Create generation_comment_likes table for generation comments
CREATE TABLE IF NOT EXISTS generation_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES generation_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_like BOOLEAN NOT NULL, -- true = like, false = dislike
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comment_likes
CREATE POLICY "Anyone can view comment likes"
    ON comment_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own likes"
    ON comment_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own likes"
    ON comment_likes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
    ON comment_likes FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for generation_comment_likes
CREATE POLICY "Anyone can view generation comment likes"
    ON generation_comment_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own generation likes"
    ON generation_comment_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generation likes"
    ON generation_comment_likes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generation likes"
    ON generation_comment_likes FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update dream comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_like THEN
            UPDATE dream_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        ELSE
            UPDATE dream_comments SET dislikes_count = dislikes_count + 1 WHERE id = NEW.comment_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_like THEN
            UPDATE dream_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.comment_id;
        ELSE
            UPDATE dream_comments SET dislikes_count = GREATEST(0, dislikes_count - 1) WHERE id = OLD.comment_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- User changed from like to dislike or vice versa
        IF OLD.is_like AND NOT NEW.is_like THEN
            UPDATE dream_comments SET likes_count = GREATEST(0, likes_count - 1), dislikes_count = dislikes_count + 1 WHERE id = NEW.comment_id;
        ELSIF NOT OLD.is_like AND NEW.is_like THEN
            UPDATE dream_comments SET dislikes_count = GREATEST(0, dislikes_count - 1), likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update generation comment likes count
CREATE OR REPLACE FUNCTION update_generation_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_like THEN
            UPDATE generation_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        ELSE
            UPDATE generation_comments SET dislikes_count = dislikes_count + 1 WHERE id = NEW.comment_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_like THEN
            UPDATE generation_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.comment_id;
        ELSE
            UPDATE generation_comments SET dislikes_count = GREATEST(0, dislikes_count - 1) WHERE id = OLD.comment_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_like AND NOT NEW.is_like THEN
            UPDATE generation_comments SET likes_count = GREATEST(0, likes_count - 1), dislikes_count = dislikes_count + 1 WHERE id = NEW.comment_id;
        ELSIF NOT OLD.is_like AND NEW.is_like THEN
            UPDATE generation_comments SET dislikes_count = GREATEST(0, dislikes_count - 1), likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS comment_likes_trigger ON comment_likes;
CREATE TRIGGER comment_likes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

DROP TRIGGER IF EXISTS generation_comment_likes_trigger ON generation_comment_likes;
CREATE TRIGGER generation_comment_likes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON generation_comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_generation_comment_likes_count();
