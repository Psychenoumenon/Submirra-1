/*
  # Update Subscription Limits and Library Cleanup Rules
  
  Bu migration şunları yapar:
  1. Premium daily_analysis_limit'i 10'dan 5'e düşürür
  2. Trial kullanıcılar için toplam 3 hak (trial_analyses_used ile kontrol)
  3. Trial bitince library'deki tüm rüyaları siler
  4. Standard kullanıcılar için 30 günlük temizleme (90 rüya limiti)
  5. Premium kullanıcılar için hiç silinmez (sınırsız)
*/

-- 1. Trigger fonksiyonunu güncelle - Premium daily limit 5 olsun
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
      WHEN NEW.plan_type = 'trial' THEN 3  -- Trial için toplam 3 (trial_analyses_used ile kontrol edilecek)
      WHEN NEW.plan_type = 'standard' THEN 3  -- Standard günlük 3
      WHEN NEW.plan_type = 'premium' THEN 5  -- Premium günlük 5 (10'dan 5'e düşürüldü)
      ELSE COALESCE(NEW.daily_analysis_limit, 3)
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

-- 2. update_subscription_plan fonksiyonunu güncelle
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
      WHEN p_plan_type = 'trial' THEN 3
      WHEN p_plan_type = 'standard' THEN 3
      WHEN p_plan_type = 'premium' THEN 5  -- 10'dan 5'e düşürüldü
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
    subscription_start_date = CASE 
      WHEN p_plan_type IN ('standard', 'premium') THEN now()
      ELSE subscription_start_date
    END,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trial bitince library'deki tüm rüyaları silen fonksiyon
CREATE OR REPLACE FUNCTION clear_trial_library_on_expiration(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Trial kullanıcının tüm rüyalarını sil
  DELETE FROM dreams
  WHERE user_id = p_user_id;
  
  -- Library items'ları da sil (eğer varsa)
  DELETE FROM library_items
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. check_trial_expiration fonksiyonunu güncelle - trial bitince library'yi temizle
CREATE OR REPLACE FUNCTION check_trial_expiration(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_trial_end timestamptz;
  v_trial_used boolean;
  v_notification_exists boolean;
  v_plan_type text;
  v_status text;
BEGIN
  -- Get trial info from profiles
  SELECT trial_end, trial_used INTO v_trial_end, v_trial_used
  FROM profiles
  WHERE id = p_user_id;
  
  -- Get subscription info
  SELECT plan_type, status INTO v_plan_type, v_status
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- Check if trial has expired and was used
  IF v_trial_used = true AND v_trial_end IS NOT NULL AND v_trial_end < NOW() THEN
    -- Eğer hala trial planındaysa ve trial bitmişse, library'yi temizle
    IF v_plan_type = 'trial' AND v_status = 'trial' THEN
      PERFORM clear_trial_library_on_expiration(p_user_id);
    END IF;
    
    -- Check if notification already exists (to avoid duplicates)
    SELECT EXISTS(
      SELECT 1 FROM notifications
      WHERE user_id = p_user_id
      AND type = 'trial_expired'
      AND created_at > v_trial_end
    ) INTO v_notification_exists;
    
    -- Create notification if it doesn't exist
    IF NOT v_notification_exists THEN
      INSERT INTO notifications (user_id, type, actor_id, dream_id)
      VALUES (p_user_id, 'trial_expired', NULL, NULL);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. clear_monthly_libraries fonksiyonunu güncelle - Standard için her ay temizle, Premium için hiç silme
CREATE OR REPLACE FUNCTION clear_monthly_libraries()
RETURNS void AS $$
DECLARE
  v_user_record RECORD;
  v_current_month_start date;
  v_subscription_month_start date;
  v_subscription_year integer;
  v_subscription_month integer;
  v_current_year integer;
  v_current_month integer;
BEGIN
  -- Standard kullanıcılar için: subscription_start_date'den itibaren her ay temizle
  FOR v_user_record IN 
    SELECT user_id, subscription_start_date
    FROM subscriptions
    WHERE plan_type = 'standard'
      AND subscription_start_date IS NOT NULL
  LOOP
    -- Mevcut ayın başlangıcını hesapla
    v_current_month_start := date_trunc('month', NOW())::date;
    v_current_year := EXTRACT(YEAR FROM NOW())::integer;
    v_current_month := EXTRACT(MONTH FROM NOW())::integer;
    
    -- Subscription başlangıç ayının başlangıcını hesapla
    v_subscription_month_start := date_trunc('month', v_user_record.subscription_start_date)::date;
    v_subscription_year := EXTRACT(YEAR FROM v_user_record.subscription_start_date)::integer;
    v_subscription_month := EXTRACT(MONTH FROM v_user_record.subscription_start_date)::integer;
    
    -- Eğer subscription_start_date'den 1 ay veya daha fazla geçmişse ve farklı bir aydaysak temizle
    -- (Yani subscription_start_date'in ayı ile mevcut ay farklıysa)
    IF (v_current_year > v_subscription_year) OR 
       (v_current_year = v_subscription_year AND v_current_month > v_subscription_month) THEN
      -- Bu kullanıcının library_items'larını sil
      DELETE FROM library_items
      WHERE user_id = v_user_record.user_id;
      
      -- Bu kullanıcının dreams'lerini de sil (standart plan için aylık temizleme)
      DELETE FROM dreams
      WHERE user_id = v_user_record.user_id;
      
      -- subscription_start_date'i mevcut ayın başlangıcına güncelle (yeni dönem başlat)
      UPDATE subscriptions
      SET subscription_start_date = v_current_month_start
      WHERE user_id = v_user_record.user_id;
    END IF;
  END LOOP;
  
  -- Premium kullanıcılar için hiçbir şey yapma (sınırsız saklama)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trial için toplam 3 hak kontrolü yapan fonksiyon
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
  
  -- Trial kullanıcılar için toplam 3 hak kontrolü
  IF v_trial_analyses_used IS NULL THEN
    v_trial_analyses_used := 0;
  END IF;
  
  -- Eğer 3'ten az kullanılmışsa true döndür
  RETURN v_trial_analyses_used < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trial analiz kullanıldığında trial_analyses_used'ı artıran fonksiyon
CREATE OR REPLACE FUNCTION increment_trial_analyses_used(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_plan_type text;
BEGIN
  -- Sadece trial kullanıcılar için artır
  SELECT plan_type INTO v_plan_type
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  IF v_plan_type = 'trial' THEN
    UPDATE subscriptions
    SET 
      trial_analyses_used = COALESCE(trial_analyses_used, 0) + 1,
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trial süresi dolan kullanıcıların analiz yapmasını engelleyen fonksiyon
CREATE OR REPLACE FUNCTION can_user_submit_analysis(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_trial_end timestamptz;
  v_trial_used boolean;
  v_plan_type text;
  v_status text;
BEGIN
  -- Get trial info from profiles
  SELECT trial_end, trial_used INTO v_trial_end, v_trial_used
  FROM profiles
  WHERE id = p_user_id;
  
  -- Get subscription info
  SELECT plan_type, status INTO v_plan_type, v_status
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- Eğer trial kullanılmışsa ve trial bitmişse
  IF v_trial_used = true AND v_trial_end IS NOT NULL AND v_trial_end < NOW() THEN
    -- Eğer hala trial planındaysa (standart/premium'a geçmemişse), analiz yapamaz
    IF v_plan_type = 'trial' AND v_status = 'trial' THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Diğer durumlarda analiz yapabilir
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Mevcut premium kullanıcıların daily_analysis_limit'ini güncelle
UPDATE subscriptions
SET 
  daily_analysis_limit = 5,
  updated_at = now()
WHERE plan_type = 'premium' AND daily_analysis_limit != 5;

-- Açıklama:
-- 1. Premium kullanıcılar artık günlük 5 analiz yapabilir (önceden 10)
-- 2. Trial kullanıcılar toplam 3 analiz yapabilir (trial_analyses_used ile kontrol)
-- 3. Trial bitince (trial_end < NOW()) library'deki tüm rüyalar silinir
-- 4. Trial süresi dolan kullanıcılar, standart/premium paket almadıysa analiz yapamaz
-- 5. Standard kullanıcılar 90 rüya saklayabilir, subscription_start_date'den itibaren her ay temizlenir
-- 6. Premium kullanıcılar sınırsız saklayabilir, hiç silinmez

