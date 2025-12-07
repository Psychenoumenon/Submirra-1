# Email Confirmation Hatası Düzeltme

## Sorun
"Invalid email or password" hatası alıyorsunuz çünkü email confirmation açık ve email'iniz onaylanmamış.

## Çözüm 1: Email Confirmation'ı Kapat (ÖNERİLEN)

1. **Supabase Dashboard'a git:**
   - https://supabase.com/dashboard/project/soewlqmskqmpycaevhoc

2. **Sol menüden Authentication'a tıkla**

3. **Settings sekmesine git**

4. **"Enable email confirmations" seçeneğini BUL ve KAPAT**

5. **Kaydet butonuna tıkla**

6. **Artık yeni kullanıcılar direkt login olabilir!**

## Çözüm 2: Eski Hesabı Sil ve Yeniden Kayıt Ol

Eğer daha önce kayıt olduysanız ve email onaylamadıysanız:

1. **Supabase Dashboard → Authentication → Users**
2. **Eski hesabınızı bulun (victoriatules2@gmail.com)**
3. **Sil butonuna tıklayın**
4. **Uygulamada yeniden kayıt olun**

## Test Et

1. Email confirmation'ı kapattıktan sonra
2. Uygulamada yeni bir hesap oluşturun
3. Direkt login olabilmelisiniz!

