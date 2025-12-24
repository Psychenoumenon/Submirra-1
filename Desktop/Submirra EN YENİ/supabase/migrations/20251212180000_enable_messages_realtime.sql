-- Enable realtime for messages table (without affecting dream_generations)
-- This fixes the DM system not updating in real-time

-- Enable realtime replication for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Ensure messages table has correct permissions for realtime
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT ON public.messages TO anon;

-- Add messages table to realtime publication (if not already added)
-- This is what makes realtime work
DO $$
BEGIN
  -- Check if publication exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  
  -- Add messages table to publication (if not already added)
  -- This won't error if already added
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already in publication, ignore
    NULL;
END $$;
