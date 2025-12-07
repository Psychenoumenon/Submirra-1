# Supabase Kurulum Rehberi

Bu proje için Supabase authentication'ı kullanılıyor. Login özelliğini aktif etmek için aşağıdaki adımları takip edin:

## 1. Supabase Projesi Oluşturma

1. [Supabase](https://supabase.com) sitesine gidin ve bir hesap oluşturun
2. Yeni bir proje oluşturun
3. Projenizin hazır olmasını bekleyin (birkaç dakika sürebilir)

## 2. Environment Variables Ayarlama

Proje kök dizininde `.env` dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:

```env
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Supabase Credentials Nasıl Bulunur?

1. Supabase dashboard'unuzda projenize gidin
2. Sol menüden **Settings** (Ayarlar) > **API** seçeneğine tıklayın
3. **Project URL** değerini kopyalayın → `VITE_SUPABASE_URL` olarak kullanın
4. **anon/public** key'i kopyalayın → `VITE_SUPABASE_ANON_KEY` olarak kullanın

## 3. Database Migrations Çalıştırma

Projede hazır migration dosyaları var. Bunları Supabase'de çalıştırmanız gerekiyor:

1. Supabase dashboard'da **SQL Editor**'a gidin
2. `supabase/migrations/` klasöründeki SQL dosyalarını sırayla çalıştırın:
   - `20251112130450_create_dreams_schema.sql` - Temel tablolar ve RLS politikaları
   - `20251112141432_add_subscription_system.sql` - Abonelik sistemi (varsa)
   - `20251112143639_update_subscription_tiers.sql` - Abonelik seviyeleri (varsa)
   - `20251113000000_add_social_features.sql` - Sosyal özellikler (public dreams, likes, comments)
   - `20251113000001_advanced_social_features.sql` - Gelişmiş sosyal özellikler (follow, notifications)

## 3.5. Storage Bucket Oluşturma (Avatar Yükleme İçin)

Avatar yükleme özelliğinin çalışması için "avatars" storage bucket'ını oluşturmanız gerekiyor:

1. Supabase dashboard'da **Storage** bölümüne gidin
2. **New bucket** butonuna tıklayın
3. Bucket adı: `avatars`
4. **Public bucket** seçeneğini işaretleyin (avatar'lar herkese açık olmalı)
5. **Create bucket** butonuna tıklayın
6. SQL Editor'da `20251113000002_create_avatars_storage.sql` migration dosyasını çalıştırın (RLS politikaları için)

## 4. Email Authentication Ayarları

1. Supabase dashboard'da **Authentication** > **Providers** bölümüne gidin
2. **Email** provider'ının aktif olduğundan emin olun
3. İsteğe bağlı: Email şablonlarını özelleştirebilirsiniz

## 5. Test Etme

1. Development server'ı başlatın: `npm run dev`
2. Login sayfasına gidin (`/signin`)
3. Yeni bir hesap oluşturmayı deneyin
4. Email'inize gelen confirmation link'ine tıklayın
5. Tekrar login olmayı deneyin

## Notlar

- `.env` dosyasını git'e commit etmeyin (zaten `.gitignore`'da olmalı)
- Production'da environment variables'ları hosting platform'unuzda ayarlayın
- Supabase free tier'da günde 50,000 email gönderimi limiti vardır

