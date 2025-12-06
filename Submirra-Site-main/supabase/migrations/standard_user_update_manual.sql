-- ============================================
-- MANUEL UPDATE SORGUSU İLE STANDARD YAPMAK
-- ============================================
-- ÖNEMLİ: plan_type = 'standard' olmalı, 'standart' DEĞİL!
-- ============================================

-- YÖNTEM 2: Manuel UPDATE Sorgusu
UPDATE subscriptions
SET 
  plan_type = 'standard',  -- 'standart' DEĞİL, 'standard' yazılmalı!
  status = 'active',
  daily_analysis_limit = 3,
  visualizations_per_analysis = 1,  -- Standard için 1 görselleştirme
  monthly_library_limit = 90,  -- Standard için aylık 90 analiz limiti
  subscription_start_date = now(),
  updated_at = now()
WHERE user_id = 'BURAYA_USER_ID_YAZ'::uuid;  -- ⬅️ BURAYA KULLANICI ID'SİNİ YAZIN

-- ============================================
-- ÖRNEK KULLANIMLAR:
-- ============================================

-- Örnek 1: Belirli bir kullanıcıyı standard yapmak
-- UPDATE subscriptions
-- SET 
--   plan_type = 'standard',  -- DİKKAT: 'standart' değil!
--   status = 'active',
--   daily_analysis_limit = 3,
--   visualizations_per_analysis = 1,
--   monthly_library_limit = 5,
--   subscription_start_date = now(),
--   updated_at = now()
-- WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid;

-- Örnek 2: Email ile kullanıcıyı bulup standard yapmak
-- UPDATE subscriptions
-- SET 
--   plan_type = 'standard',
--   status = 'active',
--   daily_analysis_limit = 3,
--   visualizations_per_analysis = 1,
--   monthly_library_limit = 5,
--   subscription_start_date = now(),
--   updated_at = now()
-- WHERE user_id = (
--   SELECT id FROM auth.users WHERE email = 'kullanici@email.com' LIMIT 1
-- );

-- ============================================
-- TÜM KULLANICILARI STANDARD YAPMAK İÇİN:
-- ============================================
-- DİKKAT: Bu sorgu TÜM kullanıcıları standard yapar!
-- UPDATE subscriptions
-- SET 
--   plan_type = 'standard',
--   status = 'active',
--   daily_analysis_limit = 3,
--   visualizations_per_analysis = 1,
--   monthly_library_limit = 5,
--   subscription_start_date = now(),
--   updated_at = now();

