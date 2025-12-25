/*
  # Update Standard Monthly Library Limit to 90
  
  Bu migration, mevcut standard plan kullanıcılarının monthly_library_limit
  değerini 5'ten 90'a günceller.
*/

-- Mevcut standard kullanıcıların monthly_library_limit'ini 90'a güncelle
UPDATE subscriptions
SET 
  monthly_library_limit = 90,
  updated_at = now()
WHERE plan_type = 'standard' 
  AND (monthly_library_limit IS NULL OR monthly_library_limit != 90);

-- Açıklama:
-- Bu migration, tüm standard plan kullanıcılarının monthly_library_limit
-- değerini 90 olarak ayarlar. Premium kullanıcılar NULL (sınırsız) kalır.

