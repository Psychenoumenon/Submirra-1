/*
  # Update User Reports RLS
  
  This migration updates RLS policies to allow users to view report counts
  for other users (for transparency), but not the details of who reported them.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own reports" ON user_reports;
DROP POLICY IF EXISTS "Users can create reports" ON user_reports;

-- Allow users to view their own reports (with details)
CREATE POLICY "Users can view their own reports"
  ON user_reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

-- Allow users to create reports
CREATE POLICY "Users can create reports"
  ON user_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Allow users to view report counts for any user (for transparency)
-- This is done via a function that only returns the count
CREATE OR REPLACE FUNCTION get_user_report_count(p_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM user_reports
    WHERE reported_user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_report_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_report_count(uuid) TO anon;


