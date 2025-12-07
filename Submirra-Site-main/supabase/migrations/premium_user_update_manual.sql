-- ============================================
-- MANUEL UPDATE SORGUSU İLE PREMIUM YAPMAK
-- ============================================
-- ÖNEMLİ: status = 'active' olmalı, plan_type = 'premium' olmalı
-- ============================================

-- YÖNTEM 2: Manuel UPDATE Sorgusu
UPDATE subscriptions
SET 
  plan_type = 'premium',
  status = 'active',  -- 'premium' DEĞİL, 'active' olmalı!
  daily_analysis_limit = 10,
  visualizations_per_analysis = 3,
  monthly_library_limit = NULL,  -- Premium için sınırsız
  subscription_start_date = now(),
  updated_at = now()
WHERE user_id = 'BURAYA_USER_ID_YAZ'::uuid;  -- ⬅️ BURAYA KULLANICI ID'SİNİ YAZIN

-- ============================================
-- ÖRNEK KULLANIMLAR:
-- ============================================

-- Örnek 1: Belirli bir kullanıcıyı premium yapmak
-- UPDATE subscriptions
-- SET 
--   plan_type = 'premium',
--   status = 'active',
--   daily_analysis_limit = 10,
--   visualizations_per_analysis = 3,
--   monthly_library_limit = NULL,
--   subscription_start_date = now(),
--   updated_at = now()
-- WHERE user_id = 'ded2c1c6-7064-499f-a1e7-a8f90c95904a'::uuid;

-- Örnek 2: Email ile kullanıcıyı bulup premium yapmak
-- UPDATE subscriptions
-- SET 
--   plan_type = 'premium',
--   status = 'active',
--   daily_analysis_limit = 10,
--   visualizations_per_analysis = 3,
--   monthly_library_limit = NULL,
--   subscription_start_date = now(),
--   updated_at = now()
-- WHERE user_id = (
--   SELECT id FROM auth.users WHERE email = 'kullanici@email.com' LIMIT 1
-- );

-- ============================================
-- TÜM KULLANICILARI PREMIUM YAPMAK İÇİN:
-- ============================================
-- DİKKAT: Bu sorgu TÜM kullanıcıları premium yapar!
-- UPDATE subscriptions
-- SET 
--   plan_type = 'premium',
--   status = 'active',
--   daily_analysis_limit = 10,
--   visualizations_per_analysis = 3,
--   monthly_library_limit = NULL,
--   subscription_start_date = now(),
--   updated_at = now();

