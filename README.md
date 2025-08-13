# BugBot Test Projesi

Bu proje, BugBot'un güvenlik açığı tespit yeteneklerini test etmek için kasıtlı olarak güvenlik açıkları içeren bir Node.js uygulamasıdır.

## Uyarı
**Bu uygulama gerçek güvenlik açıkları içerir ve yalnızca test/araştırma amaçlı kullanılmalıdır. Gerçek ortamlarda veya internete açık sistemlerde çalıştırmayınız!**

## İçerdiği Güvenlik Açıkları
- SQL Injection
- XSS (Cross-Site Scripting)
- Kimlik Doğrulama Atlatma
- Bellek Sızıntısı
- Yarış Durumu (Race Condition)
- Async/Await Hatalı Kullanımı
- Girdi Doğrulama Eksikliği
- Path Traversal
- Prototype Pollution

## Kurulum
```bash
npm install
npm start
```

## Amaç
Bu proje, güvenlik araçlarının ve BugBot'un zafiyet tespit kabiliyetlerini test etmek için hazırlanmıştır.
