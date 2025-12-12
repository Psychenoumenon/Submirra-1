# Rüya Atölyesi (Dream Generator) Kurulum Kılavuzu

## Genel Bakış
Rüya Atölyesi, kullanıcıların mevcut rüya görsellerini seçilen prompt'lara göre dönüştürmesine olanak tanır. Bu özellik, n8n workflow ve AI görsel üretim servisi ile çalışır.

## Gereksinimler
- Supabase veritabanı (zaten yapılandırılmış)
- n8n instance (self-hosted veya cloud)
- AI görsel üretim servisi (örn: Replicate, Stability AI, vb.)

## Kurulum Adımları

### 1. Environment Variables (.env dosyası)
Projenin root dizininde `.env` dosyası oluşturun ve aşağıdaki değişkeni ekleyin:

```env
VITE_N8N_GENERATOR_WEBHOOK_URL=https://your-n8n-instance.com/webhook/generator-webhook
```

### 2. Supabase Veritabanı Tablosu
`dream_generations` tablosunun aşağıdaki yapıda olduğundan emin olun:

```sql
CREATE TABLE dream_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_image_url TEXT NOT NULL,
  generated_image_url TEXT,
  prompt TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE dream_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generations"
  ON dream_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations"
  ON dream_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations"
  ON dream_generations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations"
  ON dream_generations FOR DELETE
  USING (auth.uid() = user_id);
```

### 3. n8n Webhook Workflow

n8n'de aşağıdaki workflow'u oluşturun:

**Webhook Node:**
- Method: POST
- Path: generator-webhook
- Response Mode: Immediately

**Expected Payload:**
```json
{
  "user_id": "uuid",
  "source_image_url": "https://...",
  "prompt": "user's transformation prompt",
  "generation_id": "uuid"
}
```

**Workflow Adımları:**
1. **Webhook Node** - Gelen isteği al
2. **AI Image Generation Node** - Görseli işle
   - Source image: `{{$json.source_image_url}}`
   - Prompt: `{{$json.prompt}}`
3. **Upload to Storage** - Oluşturulan görseli Supabase Storage'a yükle
4. **Update Database** - Supabase'de kaydı güncelle
   ```javascript
   // Update query
   UPDATE dream_generations 
   SET 
     generated_image_url = '{{generated_url}}',
     status = 'completed'
   WHERE id = '{{$json.generation_id}}'
   ```

### 4. Realtime Updates (Opsiyonel)
Supabase Realtime'ı etkinleştirin:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE dream_generations;
```

## Test Etme

### Local Test (Webhook olmadan)
Webhook yapılandırılmadığında:
- Kayıt veritabanına eklenir
- Status 'processing' olarak kalır
- Console'da bilgilendirme mesajları görünür
- Manuel olarak veritabanından status güncellenebilir

### Production Test
1. n8n webhook'unu ayarlayın
2. `.env` dosyasına webhook URL'sini ekleyin
3. Uygulamayı yeniden başlatın
4. Bir görsel seçip prompt girin
5. Generate butonuna basın
6. Realtime güncelleme ile görselin tamamlandığını görün

## Sorun Giderme

### "Failed to generate" hatası
- Console'u kontrol edin - detaylı log'lar var
- Webhook URL'sinin doğru olduğundan emin olun
- n8n workflow'unun aktif olduğunu kontrol edin
- Supabase bağlantısını test edin

### Download çalışmıyor
- CORS ayarlarını kontrol edin
- Supabase Storage'da public erişim ayarlarını kontrol edin
- Browser console'da hata mesajlarını kontrol edin

### Görsel tamamlanmıyor
- n8n workflow log'larını kontrol edin
- AI servisinizin API limitlerini kontrol edin
- Supabase realtime'ın aktif olduğundan emin olun

## Önerilen AI Servisleri

1. **Replicate** (Önerilen)
   - Kolay entegrasyon
   - Çeşitli modeller
   - Pay-as-you-go

2. **Stability AI**
   - Güçlü modeller
   - Hızlı işleme

3. **OpenAI DALL-E**
   - Yüksek kalite
   - Kolay kullanım

## Notlar
- Premium kullanıcılar için özellik
- Her generation için veritabanı kaydı tutulur
- Realtime güncellemeler için Supabase subscription kullanılır
- Download fonksiyonu CORS sorunlarını handle eder
