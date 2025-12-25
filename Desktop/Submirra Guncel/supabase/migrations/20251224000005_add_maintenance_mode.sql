-- Create site_settings table for maintenance mode and other global settings

CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  maintenance_mode BOOLEAN DEFAULT false,
  maintenance_message TEXT DEFAULT 'Sitemiz şu an bakım aşamasındadır. En yakın zamanda hizmetinize açılacaktır.',
  maintenance_started_at TIMESTAMPTZ,
  maintenance_started_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row
INSERT INTO site_settings (id, maintenance_mode, maintenance_message)
VALUES ('global', false, 'Sitemiz şu an bakım aşamasındadır. En yakın zamanda hizmetinize açılacaktır.')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read site settings (to check maintenance mode)
CREATE POLICY "Anyone can read site settings"
ON site_settings FOR SELECT
TO public
USING (true);

-- Only developers can update site settings
-- We check the user's is_developer column in the profiles table
CREATE POLICY "Only developers can update site settings"
ON site_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_developer = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_developer = true
  )
);

-- Function to toggle maintenance mode
CREATE OR REPLACE FUNCTION toggle_maintenance_mode(enable BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_developer BOOLEAN;
BEGIN
  -- Check if user is developer
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_developer = true
  ) INTO is_developer;
  
  IF NOT is_developer THEN
    RAISE EXCEPTION 'Only developers can toggle maintenance mode';
  END IF;
  
  -- Update maintenance mode
  UPDATE site_settings 
  SET 
    maintenance_mode = enable,
    maintenance_started_at = CASE WHEN enable THEN NOW() ELSE NULL END,
    maintenance_started_by = CASE WHEN enable THEN auth.uid() ELSE NULL END,
    updated_at = NOW()
  WHERE id = 'global';
  
  RETURN enable;
END;
$$;
