-- Create generation_likes table
CREATE TABLE IF NOT EXISTS public.generation_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES public.dream_generations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(generation_id, user_id)
);

-- Create generation_comments table
CREATE TABLE IF NOT EXISTS public.generation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES public.dream_generations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generation_likes_generation_id ON public.generation_likes(generation_id);
CREATE INDEX IF NOT EXISTS idx_generation_likes_user_id ON public.generation_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_comments_generation_id ON public.generation_comments(generation_id);
CREATE INDEX IF NOT EXISTS idx_generation_comments_user_id ON public.generation_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_comments_created_at ON public.generation_comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.generation_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view generation likes" ON public.generation_likes;
DROP POLICY IF EXISTS "Users can insert their own generation likes" ON public.generation_likes;
DROP POLICY IF EXISTS "Users can delete their own generation likes" ON public.generation_likes;
DROP POLICY IF EXISTS "Anyone can view generation comments" ON public.generation_comments;
DROP POLICY IF EXISTS "Users can insert their own generation comments" ON public.generation_comments;
DROP POLICY IF EXISTS "Users can delete their own generation comments" ON public.generation_comments;
DROP POLICY IF EXISTS "Users can update their own generation comments" ON public.generation_comments;

-- RLS Policies for generation_likes
-- Allow users to view all likes
CREATE POLICY "Anyone can view generation likes"
  ON public.generation_likes
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own likes
CREATE POLICY "Users can insert their own generation likes"
  ON public.generation_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own likes
CREATE POLICY "Users can delete their own generation likes"
  ON public.generation_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for generation_comments
-- Allow users to view all comments
CREATE POLICY "Anyone can view generation comments"
  ON public.generation_comments
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own comments
CREATE POLICY "Users can insert their own generation comments"
  ON public.generation_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Users can delete their own generation comments"
  ON public.generation_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow users to update their own comments
CREATE POLICY "Users can update their own generation comments"
  ON public.generation_comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
