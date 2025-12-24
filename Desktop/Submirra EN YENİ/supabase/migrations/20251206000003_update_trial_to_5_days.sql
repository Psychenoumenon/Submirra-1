/*
  # Update Trial to 5 Days
  
  This migration updates all trial-related settings from 3 days to 5 days:
  1. Updates check_daily_analysis_limit function to use 5 for trial limit
  2. Updates check_trial_analysis_limit function to use 5 for trial limit
  3. Updates auto_update_subscription_on_plan_type_change to use 5 for trial
  4. Updates update_subscription_plan to use 5 for trial
  5. Updates trial_end_date calculation to use 5 days instead of 3
*/

-- 1. Update check_daily_analysis_limit function
CREATE OR REPLACE FUNCTION check_daily_analysis_limit(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_plan_type text;
  v_daily_limit integer;
  v_analyses_used integer;
  v_current_date date;
  v_daily_limit_record record;
  v_trial_analyses_used integer;
BEGIN
  -- Get user's plan type and daily limit
  SELECT plan_type, daily_analysis_limit INTO v_plan_type, v_daily_limit
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- If no subscription found, default to trial
  IF v_plan_type IS NULL THEN
    v_plan_type := 'trial';
    v_daily_limit := 5;
  END IF;
  
  -- Trial users don't use daily limits, they use trial_analyses_used
  IF v_plan_type = 'trial' THEN
    SELECT COALESCE(trial_analyses_used, 0) INTO v_trial_analyses_used
    FROM subscriptions
    WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object(
      'can_analyze', v_trial_analyses_used < 5,
      'used', v_trial_analyses_used,
      'limit', 5,
      'is_trial', true
    );
  END IF;
  
  -- Get or create daily limit record for today
  v_current_date := CURRENT_DATE;
  
  SELECT * INTO v_daily_limit_record
  FROM daily_limits
  WHERE user_id = p_user_id AND date = v_current_date;
  
  -- If no record exists for today, create one
  IF v_daily_limit_record IS NULL THEN
    INSERT INTO daily_limits (user_id, date, analyses_used, analyses_limit)
    VALUES (p_user_id, v_current_date, 0, v_daily_limit)
    ON CONFLICT (user_id, date) DO NOTHING
    RETURNING * INTO v_daily_limit_record;
    
    -- If still null, try to select again
    IF v_daily_limit_record IS NULL THEN
      SELECT * INTO v_daily_limit_record
      FROM daily_limits
      WHERE user_id = p_user_id AND date = v_current_date;
    END IF;
  END IF;
  
  -- Get analyses used (default to 0 if null)
  v_analyses_used := COALESCE(v_daily_limit_record.analyses_used, 0);
  
  -- Check if user can analyze
  RETURN jsonb_build_object(
    'can_analyze', v_analyses_used < v_daily_limit,
    'used', v_analyses_used,
    'limit', v_daily_limit,
    'is_trial', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update check_trial_analysis_limit function
CREATE OR REPLACE FUNCTION check_trial_analysis_limit(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_trial_analyses_used integer;
  v_plan_type text;
BEGIN
  -- Kullanıcının plan tipini kontrol et
  SELECT plan_type, trial_analyses_used INTO v_plan_type, v_trial_analyses_used
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- Eğer trial değilse true döndür (limit kontrolü günlük limit ile yapılacak)
  IF v_plan_type != 'trial' THEN
    RETURN true;
  END IF;
  
  -- Trial kullanıcılar için toplam 5 hak kontrolü
  IF v_trial_analyses_used IS NULL THEN
    v_trial_analyses_used := 0;
  END IF;
  
  -- Eğer 5'ten az kullanılmışsa true döndür
  RETURN v_trial_analyses_used < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update auto_update_subscription_on_plan_type_change trigger function
CREATE OR REPLACE FUNCTION auto_update_subscription_on_plan_type_change()
RETURNS TRIGGER AS $$
BEGIN
  -- ÖNEMLİ: Türkçe "standart" yazılırsa otomatik olarak İngilizce "standard" yap
  IF NEW.plan_type = 'standart' THEN
    NEW.plan_type := 'standard';
  END IF;
  
  -- Eğer plan_type değiştiyse veya yeni kayıt oluşturuluyorsa, diğer alanları otomatik güncelle
  IF (TG_OP = 'INSERT') OR (NEW.plan_type IS DISTINCT FROM COALESCE(OLD.plan_type, '')) THEN
    NEW.daily_analysis_limit := CASE 
      WHEN NEW.plan_type = 'trial' THEN 5  -- Trial için toplam 5 (trial_analyses_used ile kontrol edilecek)
      WHEN NEW.plan_type = 'standard' THEN 3  -- Standard günlük 3
      WHEN NEW.plan_type = 'premium' THEN 5  -- Premium günlük 5
      ELSE COALESCE(NEW.daily_analysis_limit, 5)
    END;
    
    NEW.visualizations_per_analysis := CASE 
      WHEN NEW.plan_type = 'trial' THEN 1
      WHEN NEW.plan_type = 'standard' THEN 1
      WHEN NEW.plan_type = 'premium' THEN 3
      ELSE COALESCE(NEW.visualizations_per_analysis, 1)
    END;
    
    NEW.monthly_library_limit := CASE 
      WHEN NEW.plan_type = 'trial' THEN NULL  -- Trial için limit yok ama bitince silinecek
      WHEN NEW.plan_type = 'standard' THEN 90  -- Standard 90 rüya
      WHEN NEW.plan_type = 'premium' THEN NULL  -- Premium sınırsız
      ELSE NEW.monthly_library_limit
    END;
    
    -- Status'u güncelle (trial ise 'trial', değilse 'active')
    NEW.status := CASE 
      WHEN NEW.plan_type = 'trial' THEN 'trial'
      ELSE 'active'
    END;
    
    -- Standard veya premium ise subscription_start_date'i güncelle
    IF NEW.plan_type IN ('standard', 'premium') AND 
       (TG_OP = 'INSERT' OR OLD.plan_type NOT IN ('standard', 'premium')) THEN
      NEW.subscription_start_date := now();
    END IF;
    
    -- updated_at'i güncelle
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update update_subscription_plan function
CREATE OR REPLACE FUNCTION update_subscription_plan(
  p_user_id uuid,
  p_plan_type text
)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET 
    plan_type = p_plan_type,
    daily_analysis_limit = CASE 
      WHEN p_plan_type = 'trial' THEN 5
      WHEN p_plan_type = 'standard' THEN 3
      WHEN p_plan_type = 'premium' THEN 5
    END,
    visualizations_per_analysis = CASE 
      WHEN p_plan_type = 'trial' THEN 1
      WHEN p_plan_type = 'standard' THEN 1
      WHEN p_plan_type = 'premium' THEN 3
    END,
    monthly_library_limit = CASE 
      WHEN p_plan_type = 'trial' THEN NULL
      WHEN p_plan_type = 'standard' THEN 90
      WHEN p_plan_type = 'premium' THEN NULL
    END,
    status = CASE 
      WHEN p_plan_type = 'trial' THEN 'trial'
      ELSE 'active'
    END,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update handle_new_user function to use 5 days for trial
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', '')
  );
  
  INSERT INTO public.subscriptions (
    user_id,
    plan_type,
    trial_start_date,
    trial_end_date,
    trial_analyses_used
  ) VALUES (
    NEW.id,
    'trial',
    now(),
    now() + interval '5 days',
    0
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



