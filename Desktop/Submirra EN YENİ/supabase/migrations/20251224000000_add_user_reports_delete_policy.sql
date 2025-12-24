/*
  # Add Delete Policy for User Reports
  
  This migration adds the ability for users to delete/withdraw their own reports.
*/

-- Allow users to delete their own reports (withdraw report feature)
CREATE POLICY "Users can delete their own reports"
  ON user_reports
  FOR DELETE
  USING (auth.uid() = reporter_id);
