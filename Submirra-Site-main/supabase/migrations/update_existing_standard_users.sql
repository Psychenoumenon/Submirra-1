-- ============================================
-- MEVCUT STANDARD KULLANICILARI GÜNCELLEMEK İÇİN
-- ============================================
-- Bu sorguyu Supabase SQL Editor'da çalıştırın
-- Tüm standard kullanıcıların monthly_library_limit'i 90 olacak
-- ============================================

UPDATE subscriptions
SET 
  monthly_library_limit = 90,
  updated_at = now()
WHERE plan_type = 'standard' 
  AND (monthly_library_limit IS NULL OR monthly_library_limit != 90);

-- Kaç kayıt güncellendiğini görmek için:
-- SELECT COUNT(*) FROM subscriptions WHERE plan_type = 'standard' AND monthly_library_limit = 90;

