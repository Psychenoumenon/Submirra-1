# Lemon Squeezy Entegrasyon Kurulum Rehberi

Bu rehber, Lemon Squeezy ödeme sistemini Submirra'ya entegre etmek için gerekli adımları açıklar.

## 1. Lemon Squeezy Hesap Kurulumu

1. **Lemon Squeezy'de oturum açın**: https://app.lemonsqueezy.com
2. **Ürünlerinizi oluşturun**:
   - Standard Plan ürünü oluşturun
   - Premium Plan ürünü oluşturun
   - Her ürün için aylık abonelik variant'ı ekleyin

## 2. Gerekli Bilgileri Toplayın

### API Key
1. https://app.lemonsqueezy.com/settings/api adresine gidin
2. "Create API Key" butonuna tıklayın
3. API key'inizi kopyalayın ve güvenli bir yerde saklayın

### Store ID
1. Store ayarlarınıza gidin
2. URL'deki Store ID'yi not alın (örn: `store_123456`)

### Product ve Variant ID'leri
1. Products sayfanıza gidin
2. Her ürün için:
   - Ürünü açın
   - Product ID'yi kopyalayın
   - Variant sekmesine gidin
   - Variant ID'yi kopyalayın

## 3. Çevre Değişkenlerini Ayarlayın

`.env` dosyası oluşturun (`.env.example`'dan kopyalayın):

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin ve aşağıdaki değerleri doldurun:

```env
# Lemon Squeezy Configuration
VITE_LEMON_SQUEEZY_API_KEY=lsv_xxxxx
VITE_LEMON_SQUEEZY_STORE_ID=123456
VITE_LEMON_PRODUCT_ID_STANDARD=123456
VITE_LEMON_PRODUCT_ID_PREMIUM=123457
VITE_LEMON_VARIANT_ID_STANDARD=123458
VITE_LEMON_VARIANT_ID_PREMIUM=123459
```

## 4. Supabase Edge Function'ı Deploy Edin

### 4.1 Supabase CLI'yi kurun (eğer yoksa)
```bash
npm install -g supabase
```

### 4.2 Supabase projenize login olun
```bash
supabase login
```

### 4.3 Edge Function'ı deploy edin
```bash
cd supabase
supabase functions deploy lemon-squeezy-webhook
```

### 4.4 Webhook secret'ını ayarlayın
```bash
supabase secrets set LEMON_SQUEEZY_WEBHOOK_SECRET=your_webhook_secret
```

## 5. Database Migration'ları Çalıştırın

Supabase Dashboard'unuzda SQL Editor'ü açın ve aşağıdaki migration dosyalarını sırayla çalıştırın:

1. `supabase/migrations/20251216000000_add_lemon_squeezy_integration.sql`
2. `supabase/migrations/20251216000001_add_payment_notification_types.sql`

Veya Supabase CLI ile:
```bash
supabase db push
```

## 6. Lemon Squeezy Webhook Kurulumu

1. https://app.lemonsqueezy.com/settings/webhooks adresine gidin
2. "Create Webhook" butonuna tıklayın
3. Webhook ayarlarını yapın:
   - **URL**: `https://your-project-id.supabase.co/functions/v1/lemon-squeezy-webhook`
   - **Signing Secret**: Güçlü bir secret oluşturun (bu değeri `.env`'e de eklemelisiniz)
   - **Events**: Aşağıdaki eventleri seçin:
     - ✅ `subscription_created`
     - ✅ `subscription_updated`
     - ✅ `subscription_cancelled`
     - ✅ `subscription_payment_failed`
     - ✅ `subscription_payment_success`

4. "Create Webhook" butonuna tıklayın

## 7. Checkout URL'lerini Ayarlayın

Lemon Squeezy checkout sayfalarınızda aşağıdaki custom data alanlarının aktarıldığından emin olun:
- `user_id`: Kullanıcının Supabase user ID'si

Bu otomatik olarak `generateCheckoutUrl` fonksiyonu tarafından yapılmaktadır.

## 8. Test Edin

### 8.1 Yerel geliştirme ortamını başlatın
```bash
npm run dev
```

### 8.2 Test adımları:
1. Uygulamaya giriş yapın
2. Pricing sayfasına gidin (`/pricing`)
3. Standard veya Premium planı seçin
4. Lemon Squeezy checkout sayfasına yönlendirildiğinizi doğrulayın
5. Test kartı ile ödeme yapın (Lemon Squeezy test modu)
6. Webhook'un çalıştığını Supabase Function Logs'dan kontrol edin
7. Settings sayfasından (`/settings`) aboneliğinizi yönetin

### 8.3 Test kartları (Lemon Squeezy test modu)
- **Başarılı ödeme**: `4242 4242 4242 4242`
- **Başarısız ödeme**: `4000 0000 0000 0002`

## 9. Önemli Notlar

### Güvenlik
- **API Key'inizi asla commit etmeyin** - `.env` dosyası `.gitignore`'da olmalı
- Webhook secret'ınızı güvenli tutun
- Production'da mutlaka HTTPS kullanın

### Abonelik Yönetimi
- Kullanıcılar Settings sayfasından aboneliklerini yönetebilir
- "Aboneliği Yönet" butonu kullanıcıyı Lemon Squeezy portal'ına yönlendirir
- Abonelik iptal edildiğinde kullanıcı otomatik olarak Free plan'a düşer
- Ödeme başarısız olduğunda kullanıcıya bildirim gönderilir

### Plan Kısıtlamaları
- Free plan kullanıcıları ücretli planlara geçemez (ödeme gereklidir)
- Standard plan kullanıcıları Premium'a yükseltebilir
- Premium plan kullanıcıları Standard'a düşemez (önce iptal etmeli)
- Ücretli plandan Free'ye geçmek için aboneliği iptal etmelisiniz

### Webhook Olayları
Sistem aşağıdaki Lemon Squeezy webhook olaylarını işler:
- **subscription_created**: Yeni abonelik oluşturulduğunda
- **subscription_updated**: Abonelik güncellendiğinde
- **subscription_cancelled**: Abonelik iptal edildiğinde
- **subscription_payment_failed**: Ödeme başarısız olduğunda (kullanıcıyı Free'ye düşürür)
- **subscription_payment_success**: Ödeme başarılı olduğunda

## 10. Sorun Giderme

### Webhook çalışmıyor
1. Supabase Function Logs'u kontrol edin
2. Webhook URL'inin doğru olduğundan emin olun
3. Webhook secret'ının doğru ayarlandığından emin olun
4. Lemon Squeezy webhook logs'unu kontrol edin

### Checkout sayfası açılmıyor
1. `.env` dosyasındaki variant ID'lerin doğru olduğundan emin olun
2. Browser console'da hata olup olmadığını kontrol edin
3. Ürünlerinizin Lemon Squeezy'de aktif olduğundan emin olun

### Abonelik güncellenmedi
1. Webhook'un başarıyla tetiklendiğini kontrol edin
2. Supabase'de subscriptions tablosunu kontrol edin
3. Kullanıcının `lemon_squeezy_subscription_id` değerinin doğru olduğundan emin olun

## Destek

Sorun yaşarsanız:
1. Supabase Function Logs'u kontrol edin
2. Browser console'u kontrol edin
3. Lemon Squeezy webhook logs'unu kontrol edin
4. Database'de subscriptions tablosunu kontrol edin
