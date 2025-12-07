# Supabase Kayıt Sorunu Çözümü

## Sorun: "Database error saving new user"

Bu hata, Supabase veritabanının doğru şekilde yapılandırılmamış olmasından kaynaklanır.

## Çözüm Adımları

### 1. Supabase Dashboard'a Giriş
1. https://supabase.com/dashboard adresine gidin
2. Projenizi seçin (soewlqmskqmpycaevhoc)

### 2. Migration Dosyalarını Çalıştırın

**SQL Editor'a gidin** ve aşağıdaki dosyaları **SIRAYLA** çalıştırın:

#### Adım 1: Ana Schema
```sql
-- supabase/migrations/20251112130450_create_dreams_schema.sql içeriğini kopyalayın
-- Profiles ve dreams tablolarını oluşturur
-- RLS politikalarını ayarlar
```

#### Adım 2: Auto Profile Creation
```sql
-- supabase/migrations/20251112150000_auto_create_profile.sql içeriğini kopyalayın
-- Otomatik profil oluşturma trigger'ını kurar
```

### 3. Email Confirmation'ı Kapatın

1. **Authentication → Settings** bölümüne gidin
2. **"Enable email confirmations"** seçeneğini **KAPATIN**
3. **Save** butonuna tıklayın

### 4. RLS Politikalarını Kontrol Edin

SQL Editor'da şu komutu çalıştırın:
```sql
-- Profiles tablosunun RLS politikalarını kontrol et
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Eğer politika yoksa, migration dosyasını tekrar çalıştırın
```

### 5. Trigger'ı Kontrol Edin

```sql
-- Trigger'ın var olup olmadığını kontrol et
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Eğer trigger yoksa, migration dosyasını tekrar çalıştırın
```

## Test Etme

1. Migration dosyalarını çalıştırdıktan sonra
2. Email confirmation'ı kapattıktan sonra
3. Uygulamada yeni bir hesap oluşturmayı deneyin

## Alternatif Çözüm

Eğer hala sorun yaşıyorsanız, **manuel olarak** şu SQL komutunu çalıştırın:

```sql
-- Profiles tablosunu manuel oluştur
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  username text UNIQUE,
  trial_start timestamptz,
  trial_end timestamptz,
  trial_used boolean DEFAULT false,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS'yi etkinleştir
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politikaları oluştur
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger fonksiyonunu oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## Sonuç

Bu adımları tamamladıktan sonra yeni kullanıcılar başarıyla kayıt olabilmelidir.

