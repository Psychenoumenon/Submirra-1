/*
  # Auto Update Subscription on plan_type Change
  
  Bu migration, subscriptions tablosunda plan_type değiştiğinde
  otomatik olarak ilgili alanları (daily_analysis_limit, visualizations_per_analysis,
  monthly_library_limit, status, subscription_start_date) güncelleyen bir trigger oluşturur.
  
  Artık Supabase Table Editor'da plan_type'ı manuel olarak değiştirdiğinizde,
  diğer alanlar otomatik olarak güncellenecek.
*/

-- Function to auto-update subscription fields when plan_type changes
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
      WHEN NEW.plan_type = 'trial' THEN 3  -- Trial için toplam 3 (trial_analyses_used ile kontrol)
      WHEN NEW.plan_type = 'standard' THEN 3  -- Standard günlük 3
      WHEN NEW.plan_type = 'premium' THEN 5  -- Premium günlük 5
      ELSE COALESCE(NEW.daily_analysis_limit, 3)
    END;
    
    NEW.visualizations_per_analysis := CASE 
      WHEN NEW.plan_type = 'trial' THEN 1
      WHEN NEW.plan_type = 'standard' THEN 1
      WHEN NEW.plan_type = 'premium' THEN 3
      ELSE COALESCE(NEW.visualizations_per_analysis, 1)
    END;
    
    NEW.monthly_library_limit := CASE 
      WHEN NEW.plan_type = 'trial' THEN NULL
      WHEN NEW.plan_type = 'standard' THEN 90
      WHEN NEW.plan_type = 'premium' THEN NULL
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

-- Drop triggers if exists (to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_auto_update_subscription_on_plan_type_change_update ON subscriptions;
DROP TRIGGER IF EXISTS trigger_auto_update_subscription_on_plan_type_change_insert ON subscriptions;

-- Create trigger for UPDATE (plan_type değiştiğinde)
CREATE TRIGGER trigger_auto_update_subscription_on_plan_type_change_update
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (NEW.plan_type IS DISTINCT FROM OLD.plan_type OR NEW.plan_type = 'standart')
  EXECUTE FUNCTION auto_update_subscription_on_plan_type_change();

-- Create trigger for INSERT (yeni kayıt oluşturulurken)
CREATE TRIGGER trigger_auto_update_subscription_on_plan_type_change_insert
  BEFORE INSERT ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_subscription_on_plan_type_change();

-- Açıklama:
-- Bu trigger, subscriptions tablosunda plan_type değiştiğinde veya yeni kayıt oluşturulurken otomatik olarak:
-- 1. "standart" (Türkçe) yazılırsa otomatik olarak "standard" (İngilizce) yapar
-- 2. daily_analysis_limit'i günceller (trial/standard: 3, premium: 5)
-- 3. visualizations_per_analysis'i günceller (trial/standard: 1, premium: 3)
-- 4. monthly_library_limit'i günceller (trial/premium: NULL, standard: 90)
-- 5. status'u günceller (trial: 'trial', diğerleri: 'active')
-- 6. subscription_start_date'i günceller (standard/premium'a geçişte)
-- 7. updated_at'i günceller
--
-- Artık "standart" yazsanız bile otomatik olarak "standard" yapılacak ve hata vermeyecek!

