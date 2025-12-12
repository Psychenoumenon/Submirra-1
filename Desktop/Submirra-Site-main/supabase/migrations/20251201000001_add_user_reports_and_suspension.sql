-- Add suspension columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Create user_reports table for reporting users
CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reported_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(reporter_id, reported_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles(is_suspended);

-- Enable RLS
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Policies for user_reports
CREATE POLICY "Users can view their own reports" ON user_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports" ON user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Function to automatically suspend user after 10 reports
CREATE OR REPLACE FUNCTION check_user_suspension()
RETURNS TRIGGER AS $$
DECLARE
  report_count integer;
BEGIN
  -- Count total reports for the reported user
  SELECT COUNT(*) INTO report_count
  FROM user_reports
  WHERE reported_user_id = NEW.reported_user_id;
  
  -- If 10 or more reports, suspend the user
  IF report_count >= 10 THEN
    UPDATE profiles
    SET 
      is_suspended = true,
      suspended_at = now(),
      suspension_reason = 'Çok sayıda şikayet nedeniyle otomatik askıya alındı (' || report_count || ' şikayet)'
    WHERE id = NEW.reported_user_id AND is_suspended = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check suspension after each report
CREATE TRIGGER trigger_check_user_suspension
  AFTER INSERT ON user_reports
  FOR EACH ROW
  EXECUTE FUNCTION check_user_suspension();


