-- Enable realtime and fix permissions for dream_generations table
-- This ensures frontend can receive updates when workflow completes

-- Enable realtime replication
ALTER TABLE public.dream_generations REPLICA IDENTITY FULL;

-- Ensure correct permissions for realtime to work
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dream_generations TO authenticated;
GRANT SELECT ON public.dream_generations TO anon;

-- Ensure RLS is enabled
ALTER TABLE public.dream_generations ENABLE ROW LEVEL SECURITY;

-- Recreate policies to ensure they work with realtime
DROP POLICY IF EXISTS "Users can view own generations" ON public.dream_generations;
CREATE POLICY "Users can view own generations"
  ON public.dream_generations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own generations" ON public.dream_generations;
CREATE POLICY "Users can update own generations"
  ON public.dream_generations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
