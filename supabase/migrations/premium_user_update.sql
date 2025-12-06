-- ============================================
-- PREMIUM PAKET YAPMAK İÇİN SQL SORGUSU
-- ============================================
-- Kullanım: Aşağıdaki sorguda 'BURAYA_USER_ID_YAZ' kısmını 
-- değiştirip kullanıcının gerçek user_id'sini yazın
-- ============================================

-- YÖNTEM 1: Hazır Fonksiyon Kullanarak (ÖNERİLEN)
SELECT update_subscription_plan(
  'BURAYA_USER_ID_YAZ'::uuid,  -- ⬅️ BURAYA KULLANICI ID'SİNİ YAZIN
  'premium'                     -- plan_type: 'trial', 'standard', veya 'premium'
);

-- ============================================
-- ÖRNEK KULLANIMLAR:
-- ============================================

-- Örnek 1: Belirli bir kullanıcıyı premium yapmak
-- SELECT update_subscription_plan('ded2c1c6-7064-499f-a1e7-a8f90c95904a'::uuid, 'premium');

-- Örnek 2: Email ile kullanıcıyı bulup premium yapmak
-- SELECT update_subscription_plan(
--   (SELECT id FROM auth.users WHERE email = 'kullanici@email.com' LIMIT 1),
--   'premium'
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

