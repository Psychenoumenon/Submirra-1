/*
  # Submirra Dream Analysis Platform - Database Schema

  ## Overview
  This migration creates the core database structure for the Submirra dream analysis platform,
  including user profiles, dream entries, and AI-generated analyses.

  ## Tables Created
  
  ### 1. profiles
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User's email address
  - `full_name` (text) - User's full name
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update
  
  ### 2. dreams
  - `id` (uuid, primary key) - Unique dream entry identifier
  - `user_id` (uuid, foreign key) - References profiles.id
  - `dream_text` (text) - The dream description (max 5000 chars handled in frontend)
  - `analysis_text` (text) - AI-generated subconscious analysis
  - `image_url` (text) - URL to the generated dream visualization
  - `created_at` (timestamptz) - When the dream was submitted
  - `status` (text) - Processing status: 'pending', 'processing', 'completed', 'failed'
  
  ## Security
  
  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Users can only access their own data
  - Authenticated users required for all operations
  
  ### Policies
  
  #### profiles table:
  - Users can view their own profile
  - Users can insert their own profile (on signup)
  - Users can update their own profile
  
  #### dreams table:
  - Users can view only their own dreams
  - Users can insert their own dreams
  - Users can update only their own dreams
  - Users can delete only their own dreams
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  username text UNIQUE,
  trial_start timestamptz,
  trial_end timestamptz,
  trial_used boolean DEFAULT false,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create dreams table
CREATE TABLE IF NOT EXISTS dreams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dream_text text NOT NULL,
  analysis_text text DEFAULT '',
  image_url text DEFAULT '',
  status text DEFAULT 'pending' NOT NULL,
  is_public boolean DEFAULT false,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;

-- Profiles policies (drop if exists first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Dreams policies (drop if exists first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own dreams" ON dreams;
CREATE POLICY "Users can view own dreams"
  ON dreams FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own dreams" ON dreams;
CREATE POLICY "Users can insert own dreams"
  ON dreams FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own dreams" ON dreams;
CREATE POLICY "Users can update own dreams"
  ON dreams FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own dreams" ON dreams;
CREATE POLICY "Users can delete own dreams"
  ON dreams FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS dreams_user_id_idx ON dreams(user_id);
CREATE INDEX IF NOT EXISTS dreams_created_at_idx ON dreams(created_at DESC);