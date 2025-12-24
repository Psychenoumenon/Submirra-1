/*
  # Fix Library Limits to Match Pricing Page
  
  Sitedeki fiyatlandırma sayfasındaki limitlerle eşleştir:
  - Free: 10 dreams
  - Trial: 30 dreams (7 gün süresince)
  - Standard: 30 dreams
  - Premium: 60 dreams
*/

-- Update existing subscriptions to match pricing page limits
UPDATE subscriptions
SET 
  monthly_library_limit = CASE 
    WHEN plan_type = 'free' THEN 10
    WHEN plan_type = 'trial' THEN 30
    WHEN plan_type = 'standard' THEN 30
    WHEN plan_type = 'premium' THEN 60
    ELSE monthly_library_limit
  END,
  updated_at = now();

-- Update the trigger function to use correct limits
CREATE OR REPLACE FUNCTION update_subscription_on_plan_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Plan type değiştiğinde ilgili alanları güncelle
  IF TG_OP = 'UPDATE' AND OLD.plan_type IS DISTINCT FROM NEW.plan_type THEN
    -- "standart" yazılırsa "standard" yap
    IF NEW.plan_type = 'standart' THEN
      NEW.plan_type := 'standard';
    END IF;
    
    -- daily_analysis_limit güncelle
    NEW.daily_analysis_limit := CASE 
      WHEN NEW.plan_type = 'free' THEN NULL  -- Free plan: only basic (unlimited)
      WHEN NEW.plan_type = 'trial' THEN 7  -- Trial: 7 total during trial
      WHEN NEW.plan_type = 'standard' THEN 3
      WHEN NEW.plan_type = 'premium' THEN 5
      ELSE COALESCE(NEW.daily_analysis_limit, 3)
    END;
    
    -- visualizations_per_analysis güncelle
    NEW.visualizations_per_analysis := CASE 
      WHEN NEW.plan_type = 'free' THEN 0  -- Free plan: no visuals
      WHEN NEW.plan_type = 'trial' THEN 1
      WHEN NEW.plan_type = 'standard' THEN 1
      WHEN NEW.plan_type = 'premium' THEN 3
      ELSE COALESCE(NEW.visualizations_per_analysis, 1)
    END;
    
    -- monthly_library_limit güncelle (PRICING PAGE ILE ESIT)
    NEW.monthly_library_limit := CASE 
      WHEN NEW.plan_type = 'free' THEN 10      -- Free: 10 dreams
      WHEN NEW.plan_type = 'trial' THEN 30     -- Trial: 30 dreams
      WHEN NEW.plan_type = 'standard' THEN 30  -- Standard: 30 dreams
      WHEN NEW.plan_type = 'premium' THEN 60   -- Premium: 60 dreams
      ELSE NEW.monthly_library_limit
    END;
    
    -- Status'u güncelle
    NEW.status := CASE 
      WHEN NEW.plan_type = 'trial' THEN 'trial'
      ELSE 'active'
    END;
    
    -- subscription_start_date güncelle
    IF NEW.plan_type IN ('standard', 'premium') AND (OLD.plan_type IS NULL OR OLD.plan_type NOT IN ('standard', 'premium')) THEN
      NEW.subscription_start_date := now();
    END IF;
    
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the update_subscription_plan function
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
      WHEN p_plan_type = 'free' THEN NULL
      WHEN p_plan_type = 'trial' THEN 7
      WHEN p_plan_type = 'standard' THEN 3
      WHEN p_plan_type = 'premium' THEN 5
    END,
    visualizations_per_analysis = CASE 
      WHEN p_plan_type = 'free' THEN 0
      WHEN p_plan_type = 'trial' THEN 1
      WHEN p_plan_type = 'standard' THEN 1
      WHEN p_plan_type = 'premium' THEN 3
    END,
    monthly_library_limit = CASE 
      WHEN p_plan_type = 'free' THEN 10      -- Free: 10 dreams
      WHEN p_plan_type = 'trial' THEN 30     -- Trial: 30 dreams
      WHEN p_plan_type = 'standard' THEN 30  -- Standard: 30 dreams
      WHEN p_plan_type = 'premium' THEN 60   -- Premium: 60 dreams
    END,
    status = CASE 
      WHEN p_plan_type = 'trial' THEN 'trial'
      ELSE 'active'
    END,
    subscription_start_date = CASE 
      WHEN p_plan_type IN ('standard', 'premium') THEN now()
      ELSE subscription_start_date
    END,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
