/*
  # Fix New User Registration - No Auto Trial Assignment
  
  This migration updates the handle_new_user function to NOT automatically
  assign a trial plan to new users. Users must explicitly activate a plan
  from the Pricing page.
*/

-- Update handle_new_user function to only create profile, NOT subscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile, do NOT create subscription
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', '')
  );
  
  -- No subscription is created automatically
  -- Users must activate a plan from the Pricing page
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
