-- Sync result_image_url data to generated_image_url
UPDATE public.dream_generations 
SET generated_image_url = result_image_url 
WHERE result_image_url IS NOT NULL 
  AND (generated_image_url IS NULL OR generated_image_url = '');

-- Drop result_image_url column if it exists
ALTER TABLE public.dream_generations DROP COLUMN IF EXISTS result_image_url;

-- Enable realtime
ALTER TABLE public.dream_generations REPLICA IDENTITY FULL;

-- Ensure correct permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dream_generations TO authenticated;
GRANT SELECT ON public.dream_generations TO anon;
