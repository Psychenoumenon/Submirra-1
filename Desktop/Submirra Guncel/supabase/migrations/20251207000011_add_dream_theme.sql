-- Add theme column to dreams table for Premium users
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS theme TEXT;

-- Add check constraint for valid themes
ALTER TABLE dreams 
ADD CONSTRAINT valid_theme 
CHECK (theme IS NULL OR theme IN ('korku', 'hüzün', 'mutluluk', 'macera', 'mistik', 'bilim_kurgu'));

-- Create index for theme filtering
CREATE INDEX IF NOT EXISTS idx_dreams_theme ON dreams(theme);

-- Add comment
COMMENT ON COLUMN dreams.theme IS 'Dream theme selected by Premium users (korku, hüzün, mutluluk, macera, mistik, bilim_kurgu)';
