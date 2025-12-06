/*
  # Allow Public Read of plan_type
  
  This migration allows anyone to read the plan_type from subscriptions table
  so that plan badges can be displayed on user profiles.
*/

-- Add policy to allow reading plan_type for any user (for profile badges)
DROP POLICY IF EXISTS "Anyone can view plan_type" ON subscriptions;
CREATE POLICY "Anyone can view plan_type"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (true); -- Allow authenticated users to read plan_type for profile display

