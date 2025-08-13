const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const ejs = require('ejs');
const _ = require('lodash');

const app = express();
const db = new sqlite3.Database(':memory:');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.set('view engine', 'ejs');

// Bellek sızıntısı için global array
let memoryLeakArray = [];

// Basit kullanıcı tablosu
db.serialize(() => {
  db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)');
  db.run("INSERT INTO users (username, password) VALUES ('admin', 'admin123')");
});

// SQL Injection Açığı
app.post('/login', (req, res) => {
  // KÖTÜ: Kullanıcı girdisi doğrudan SQL sorgusuna ekleniyor
  const sql = `SELECT * FROM users WHERE username = '${req.body.username}' AND password = '${req.body.password}'`;
  db.get(sql, (err, row) => {
    if (row) {
      res.cookie('auth', 'true');
      res.send('Giriş başarılı!');
    } else {
      res.send('Hatalı giriş!');
    }
  });
});

// XSS Açığı
app.get('/greet', (req, res) => {
  // KÖTÜ: Kullanıcı girdisi escape edilmeden HTML'e ekleniyor
  res.send(`<h1>Merhaba, ${req.query.name}</h1>`);
});

// Kimlik Doğrulama Atlatma
app.get('/admin', (req, res) => {
  // KÖTÜ: Sadece bir cookie değerine bakılıyor, gerçek doğrulama yok
  if (req.cookies.auth === 'true') {
    res.send('Admin paneline hoş geldiniz!');
  } else {
    res.send('Yetkisiz!');
  }
});

// Bellek Sızıntısı
app.get('/leak', (req, res) => {
  // KÖTÜ: Her istekle diziye veri ekleniyor, asla temizlenmiyor
  memoryLeakArray.push(new Array(1e6).fill('leak'));
  res.send('Bellek sızdırıldı!');
});

// Yarış Durumu (Race Condition)
let raceValue = 0;
app.get('/race', (req, res) => {
  // KÖTÜ: Aynı anda birden fazla istek raceValue'yu güncelleyebilir
  const oldValue = raceValue;
  setTimeout(() => {
    raceValue = oldValue + 1;
    res.send(`raceValue: ${raceValue}`);
  }, 100);
});

// Async/Await Hatalı Kullanımı
app.get('/async', async (req, res) => {
  // KÖTÜ: await eksik, hata yakalanmıyor
  let result;
  try {
    result = await db.get('SELECT 1'); // sqlite3 get fonksiyonu promise döndürmez!
  } catch (e) {
    // Hata asla yakalanmaz
  }
  res.send('Async hata örneği!');
});

// Girdi Doğrulama Eksikliği
app.post('/echo', (req, res) => {
  // KÖTÜ: Girdi doğrulaması yok, her şeyi geri döndürüyor
  res.send(`Girdi: ${req.body.input}`);
});

// Path Traversal Açığı
app.get('/file', (req, res) => {
  // KÖTÜ: Kullanıcıdan gelen yol doğrudan dosya sistemine aktarılıyor
  const filePath = path.join(__dirname, req.query.path);
  res.sendFile(filePath);
});

// Prototype Pollution Açığı
app.post('/pollute', (req, res) => {
  // KÖTÜ: Lodash merge ile kontrolsüz nesne birleştirme
  let obj = {};
  _.merge(obj, req.body);
  res.send('Prototype pollution denendi!');
});

app.listen(3000, () => {
  console.log('BugBot test uygulaması 3000 portunda çalışıyor!');
});
