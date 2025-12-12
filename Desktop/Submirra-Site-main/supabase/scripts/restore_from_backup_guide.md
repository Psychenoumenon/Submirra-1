# Rüyaları Geri Getirme Rehberi

Plan değişikliği sırasında silinen rüyaları geri getirmek için aşağıdaki yöntemleri kullanabilirsiniz:

## Yöntem 1: Supabase Backup'tan Restore (Önerilen)

### Adımlar:

1. **Supabase Dashboard'a gidin**
   - https://supabase.com/dashboard
   - Projenizi seçin

2. **Database > Backups bölümüne gidin**
   - Sol menüden "Database" > "Backups" seçin

3. **Point-in-Time Recovery kullanın**
   - Plan değişikliğinden ÖNCE bir tarih seçin
   - Örnek: 5 Aralık 2025 (plan 6 Aralık'ta değişmiş)
   - "Restore to this point" butonuna tıklayın

4. **Geçici bir database'e restore edin**
   - Ana database'i bozmamak için geçici bir database'e restore edin
   - Veya backup'ı indirip local'de çalıştırın

5. **Rüyaları export edin**
   ```sql
   SELECT * FROM dreams 
   WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid;
   ```

6. **Mevcut database'e import edin**
   - Export ettiğiniz rüyaları mevcut database'e INSERT edin
   - `restore_dreams_manual.sql` dosyasındaki örneği kullanın

## Yöntem 2: Leonardo AI'dan Manuel Restore

Eğer görseller Leonardo AI'da duruyorsa:

1. **Leonardo AI'dan görsel URL'lerini alın**
   - Leonardo AI dashboard'unuza gidin
   - Bu kullanıcıya ait görselleri bulun
   - Her görselin URL'sini kopyalayın

2. **Rüya metinlerini toplayın**
   - Eğer rüya metinlerini başka bir yerde sakladıysanız (notlar, email, vs.)
   - Analiz metinlerini de toplayın

3. **Manuel olarak ekleyin**
   - `restore_dreams_manual.sql` dosyasını açın
   - Placeholder değerleri gerçek verilerle değiştirin
   - Her rüya için bir INSERT statement'ı oluşturun
   - Supabase SQL Editor'de çalıştırın

## Yöntem 3: CSV/JSON Export'tan Restore

Eğer daha önce rüyaları export ettiyseniz:

1. **CSV/JSON dosyasını hazırlayın**
   - Rüya verilerini CSV veya JSON formatında hazırlayın
   - Gerekli kolonlar: id, user_id, dream_text, analysis_text, image_url, analysis_type, status, is_public, created_at

2. **Supabase Import özelliğini kullanın**
   - Supabase Dashboard > Database > Tables > dreams
   - "Import data" butonuna tıklayın
   - CSV/JSON dosyanızı yükleyin

## Önemli Notlar:

- **ID'ler**: Yeni rüyalar için `gen_random_uuid()` kullanın (eski ID'leri kullanmayın)
- **Timestamps**: Orijinal `created_at` tarihlerini kullanabilirsiniz (eğer varsa)
- **Analysis Type**: Rüyanın tipine göre ayarlayın:
  - Görseli varsa: `advanced_visual` veya `basic_visual`
  - Görseli yoksa: `advanced` veya `basic`
- **Status**: Tamamlanmış rüyalar için `completed` kullanın

## Kontrol Sorgusu:

Rüyaları ekledikten sonra kontrol edin:

```sql
SELECT 
  id,
  analysis_type,
  status,
  created_at,
  image_url
FROM dreams
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid
ORDER BY created_at DESC;
```


