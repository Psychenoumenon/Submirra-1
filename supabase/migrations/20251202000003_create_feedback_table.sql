/*
  # Feedback System
  
  This migration creates:
  1. 'feedback' table for user feedback submissions
  2. RLS policies to ensure only admins can view feedback
*/

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  category text NOT NULL CHECK (category IN ('bug', 'feature', 'improvement', 'other')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view all feedback
-- Note: You'll need to manually set admin users in Supabase Dashboard
-- For now, we'll create a policy that allows users to insert their own feedback
-- and only you (as the site owner) can view all feedback via Supabase Dashboard

-- Allow users to insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to insert feedback even when not authenticated (optional)
CREATE POLICY "Anyone can insert feedback"
  ON feedback
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only allow viewing feedback through Supabase Dashboard (no SELECT policy for regular users)
-- This ensures only you can view feedback via Supabase Dashboard

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();


