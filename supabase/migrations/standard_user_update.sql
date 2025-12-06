-- ============================================
-- STANDARD PAKET YAPMAK İÇİN SQL SORGUSU
-- ============================================
-- Kullanım: Aşağıdaki sorguda 'BURAYA_USER_ID_YAZ' kısmını 
-- değiştirip kullanıcının gerçek user_id'sini yazın
-- ============================================

-- YÖNTEM 1: Hazır Fonksiyon Kullanarak (ÖNERİLEN)
SELECT update_subscription_plan(
  'BURAYA_USER_ID_YAZ'::uuid,  -- ⬅️ BURAYA KULLANICI ID'SİNİ YAZIN
  'standard'                    -- plan_type: 'trial', 'standard', veya 'premium'
                                -- DİKKAT: 'standart' değil, 'standard' yazılmalı!
);

-- ============================================
-- ÖRNEK KULLANIMLAR:
-- ============================================

-- Örnek 1: Belirli bir kullanıcıyı standard yapmak
-- SELECT update_subscription_plan('4e319154-a316-4367-b8d6-d7776cef9d70'::uuid, 'standard');

-- Örnek 2: Email ile kullanıcıyı bulup standard yapmak
-- SELECT update_subscription_plan(
--   (SELECT id FROM auth.users WHERE email = 'kullanici@email.com' LIMIT 1),
--   'standard'
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
--   monthly_library_limit = 90,
--   subscription_start_date = now(),
--   updated_at = now();

