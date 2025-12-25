# Email Confirmation'ı Kapatma

Email confirmation'ı kapatmak için Supabase Dashboard'da şu adımları takip edin:

## Adımlar:

1. **Supabase Dashboard'a git**
   - https://supabase.com/dashboard

2. **Projenizi seçin**

3. **Authentication > Settings** bölümüne git

4. **"Enable email confirmations"** seçeneğini **KAPAT**

5. **Kaydet**

Artık kullanıcılar email confirmation olmadan direkt login olabilecekler.

## Not:
- Email confirmation kapalıyken, yeni kullanıcılar direkt olarak giriş yapabilir
- Güvenlik için production'da email confirmation açık tutmanız önerilir
- Development/test ortamında kapalı tutabilirsiniz

