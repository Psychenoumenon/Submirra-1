# Migration Dosyalarını Çalıştırma Sırası

Bu dosyalar **tam bu sırayla** Supabase SQL Editor'da çalıştırılmalıdır:

## 1. Temel Şema
```sql
-- 20251112130450_create_dreams_schema.sql
-- Temel tablolar (profiles, dreams) ve RLS politikaları
```

## 2. Otomatik Profil Oluşturma
```sql
-- 20251112150000_auto_create_profile.sql  
-- Yeni kullanıcı kaydında otomatik profil oluşturma trigger'ı
```

## 3. Abonelik Sistemi (Opsiyonel)
```sql
-- 20251112141432_add_subscription_system.sql
-- 20251112143639_update_subscription_tiers.sql
```

## 4. Sosyal Özellikler
```sql
-- 20251113000000_add_social_features.sql
-- Public dreams, likes, comments, avatar_url, bio
```

## 5. Gelişmiş Sosyal Özellikler
```sql
-- 20251113000001_advanced_social_features.sql
-- Follow sistemi, bildirimler
```

## 6. Avatar Storage
```sql
-- 20251113000002_create_avatars_storage.sql
-- Avatar yükleme için storage politikaları
```

## 7. Kullanıcı Adı ve Mesajlaşma
```sql
-- 20251122000000_add_username_and_messaging.sql
-- Username alanı ve mesajlaşma sistemi
```

## 8. Mesajlaşma Düzeltmeleri
```sql
-- 20251122000001_fix_messaging.sql
-- 20251122000003_add_user_blocks.sql
```

## ⚠️ Önemli Notlar:

1. **Sıralı Çalıştırın**: Bu dosyalar birbirine bağımlı, sırayı değiştirmeyin
2. **Policy Hatası Düzeltildi**: Artık "policy already exists" hatası almayacaksınız
3. **Tekrar Çalıştırılabilir**: Tüm migration'lar güvenli hale getirildi
4. **Storage Bucket**: `avatars` bucket'ını manuel oluşturmayı unutmayın
5. **Email Confirmation**: Authentication > Settings'den kapatın

## ✅ Başarı Kontrolü:

Migration'lar başarılı olduysa şu tablolar oluşmalı:
- `profiles` (username, avatar_url, bio, trial_* alanları ile)
- `dreams` (is_public, likes_count alanları ile)  
- `dream_likes`
- `dream_comments`
- `messages`

Ve şu fonksiyonlar/trigger'lar:
- `handle_new_user()` fonksiyonu
- `update_dream_likes_count()` fonksiyonu
- Otomatik profil oluşturma trigger'ı
- Likes count güncelleme trigger'ları
