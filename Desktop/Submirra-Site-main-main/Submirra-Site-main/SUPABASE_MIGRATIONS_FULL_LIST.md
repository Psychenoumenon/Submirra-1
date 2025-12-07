# 🗄️ Supabase Migration'ları - Tam Liste

Bu dosya Submirra projesi için gerekli **TÜM** Supabase migration'larını içerir.
Sırayla her birini Supabase SQL Editor'da çalıştırın.

---

## 📋 Migration Sırası

### 1️⃣ Dream Generations Tablosu (AI Rüya Atölyesi için)

```sql
-- Dream Generations Table (AI Generated Images for Premium Users)
-- Bu tablo premium kullanıcıların AI ile oluşturduğu görselleri saklar

-- Tablo oluştur
CREATE TABLE IF NOT EXISTS dream_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_image_url TEXT NOT NULL,
  generated_image_url TEXT DEFAULT '',
  prompt TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performans için index'ler
CREATE INDEX IF NOT EXISTS idx_dream_generations_user_id ON dream_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_dream_generations_is_public ON dream_generations(is_public);
CREATE INDEX IF NOT EXISTS idx_dream_generations_created_at ON dream_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dream_generations_user_public ON dream_generations(user_id, is_public);

-- Row Level Security aktif et
ALTER TABLE dream_generations ENABLE ROW LEVEL SECURITY;

-- Eski policy'leri temizle (re-run için)
DROP POLICY IF EXISTS "Users can view own generations" ON dream_generations;
DROP POLICY IF EXISTS "Users can insert own generations" ON dream_generations;
DROP POLICY IF EXISTS "Users can update own generations" ON dream_generations;
DROP POLICY IF EXISTS "Users can delete own generations" ON dream_generations;
DROP POLICY IF EXISTS "Public generations are viewable by all" ON dream_generations;

-- RLS Policies

-- 1. Kullanıcılar kendi generation'larını görebilir
CREATE POLICY "Users can view own generations"
  ON dream_generations FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Kullanıcılar kendi generation'larını ekleyebilir
CREATE POLICY "Users can insert own generations"
  ON dream_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Kullanıcılar kendi generation'larını güncelleyebilir
CREATE POLICY "Users can update own generations"
  ON dream_generations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Kullanıcılar kendi generation'larını silebilir
CREATE POLICY "Users can delete own generations"
  ON dream_generations FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Herkes public generation'ları görebilir
CREATE POLICY "Public generations are viewable by all"
  ON dream_generations FOR SELECT
  USING (is_public = true);

-- İzinleri ayarla
GRANT SELECT, INSERT, UPDATE, DELETE ON dream_generations TO authenticated;
GRANT SELECT ON dream_generations TO anon;

-- Tablo açıklamaları (dokümantasyon)
COMMENT ON TABLE dream_generations IS 'AI-generated images created by premium users from their dream images';
COMMENT ON COLUMN dream_generations.source_image_url IS 'Original dream image URL used as source';
COMMENT ON COLUMN dream_generations.generated_image_url IS 'AI-generated image URL (from Leonardo AI)';
COMMENT ON COLUMN dream_generations.prompt IS 'User prompt describing the transformation';
COMMENT ON COLUMN dream_generations.is_public IS 'Whether this generation is visible on social feed';
```

---

## ✅ Migration'ı Çalıştırma Adımları

1. **Supabase Dashboard'a git**: https://supabase.com/dashboard
2. **Projenizi seçin**
3. **SQL Editor'ı aç** (soldaki menüden)
4. **Yukarıdaki SQL'i kopyala yapıştır**
5. **Run** butonuna bas
6. ✅ Başarılı mesajı geldiğinde tamamdır!

---

## 🔍 Kontrol Et

Migration'ın başarılı olduğunu kontrol etmek için:

```sql
-- Tablo var mı?
SELECT * FROM dream_generations LIMIT 1;

-- RLS policy'ler aktif mi?
SELECT * FROM pg_policies WHERE tablename = 'dream_generations';

-- Index'ler oluştu mu?
SELECT indexname FROM pg_indexes WHERE tablename = 'dream_generations';
```

---

## 📊 Tablo Yapısı

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Kullanıcı ID (Foreign Key) |
| `source_image_url` | TEXT | Kaynak rüya görseli URL'i |
| `generated_image_url` | TEXT | AI ile oluşturulan görsel URL'i |
| `prompt` | TEXT | Kullanıcının girdiği prompt |
| `is_public` | BOOLEAN | Sosyal feed'de görünsün mü? |
| `created_at` | TIMESTAMP | Oluşturulma tarihi |

---

## 🎯 Kullanım

### Backend (Leonardo AI Integration)

```javascript
// 1. Kullanıcı generator'dan istek gönderiyor
const { data } = await supabase
  .from('dream_generations')
  .insert({
    user_id: userId,
    source_image_url: sourceImageUrl,
    generated_image_url: sourceImageUrl, // Önce kaynak, sonra güncellenecek
    prompt: userPrompt,
    is_public: false
  })
  .select()
  .single();

// 2. Leonardo AI'a gönder (backend/n8n/make.com)
// 3. Sonucu güncelle
await supabase
  .from('dream_generations')
  .update({ generated_image_url: aiGeneratedUrl })
  .eq('id', data.id);
```

---

## 🚨 Önemli Notlar

1. ✅ **RLS Aktif**: Kullanıcılar sadece kendi generation'larını görebilir/düzenleyebilir
2. ✅ **Public Policy**: is_public=true olanlar herkes tarafından görülebilir (Social feed için)
3. ✅ **Cascade Delete**: Kullanıcı silinirse tüm generation'ları da silinir
4. ✅ **Index'ler**: user_id, is_public ve created_at için performans optimize edilmiş

---

## 🎨 İlgili Özellikler

- ✅ `/generator` sayfası (Premium only)
- ✅ Navigation'da "Rüya Atölyesi" linki (Premium only)
- ✅ Social'da "Rüya Atölyeleri" tab'ı (Herkes görür, sadece premium girebilir)
- ✅ Public generation'lar sosyal feed'de görünür
- ✅ İndirme sadece kendi generation sayfasından

---

## 🔧 Troubleshooting

### Hata: "permission denied for table dream_generations"
```sql
-- İzinleri tekrar ver
GRANT SELECT, INSERT, UPDATE, DELETE ON dream_generations TO authenticated;
GRANT SELECT ON dream_generations TO anon;
```

### Hata: "RLS policy violation"
```sql
-- RLS'yi kontrol et
SELECT * FROM pg_policies WHERE tablename = 'dream_generations';

-- RLS'yi geçici olarak kapat (SADECE TEST İÇİN!)
ALTER TABLE dream_generations DISABLE ROW LEVEL SECURITY;

-- Sonra tekrar aç
ALTER TABLE dream_generations ENABLE ROW LEVEL SECURITY;
```

---

## 📅 Migration Tarihi
- **Oluşturulma**: 7 Aralık 2025
- **Versiyon**: 1.0
- **Durum**: ✅ Hazır

Bu migration'ı çalıştırdıktan sonra "Rüya Atölyesi" özelliği tam olarak çalışır durumda olacak! 🎉
