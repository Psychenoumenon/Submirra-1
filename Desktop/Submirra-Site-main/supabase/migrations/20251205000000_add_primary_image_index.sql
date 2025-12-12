/*
  # Add Primary Image Index for Premium Users
  
  This migration adds a primary_image_index column to the dreams table
  to allow premium users to select which of their 3 images should be
  displayed first in the carousel and modal.
*/

-- Add primary_image_index column to dreams table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dreams' AND column_name = 'primary_image_index'
  ) THEN
    ALTER TABLE dreams ADD COLUMN primary_image_index integer DEFAULT 0 CHECK (primary_image_index >= 0 AND primary_image_index <= 2);
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_dreams_primary_image_index ON dreams(primary_image_index) WHERE primary_image_index IS NOT NULL;



