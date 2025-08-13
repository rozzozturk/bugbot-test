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
app.use(bodyParser.json());
app.use(cookieParser());
app.set('view engine', 'ejs');

// Bellek sızıntısı için global obje
const cartCache = {};

// E-ticaret için örnek ürün ve kullanıcı tablosu
// (daha gerçekçi bir yapı)
db.serialize(() => {
  db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, isAdmin INTEGER)');
  db.run("INSERT INTO users (username, password, isAdmin) VALUES ('admin', 'admin123', 1)");
  db.run("INSERT INTO users (username, password, isAdmin) VALUES ('user', 'user123', 0)");
  db.run('CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL, description TEXT)');
  db.run("INSERT INTO products (name, price, description) VALUES ('Laptop', 1500, 'Güçlü bir laptop')");
  db.run("INSERT INTO products (name, price, description) VALUES ('Mouse', 20, 'Kablosuz mouse')");
});

// --- 1. Subtle SQL Injection ---
app.post('/login', (req, res) => {
  // Hata: Parametreli sorgu kullanılmıyor, input kısmen filtreleniyor ama yetersiz
  const username = req.body.username?.replace(/[';]/g, ''); // Sadece tek tırnak ve noktalı virgül kaldırılıyor
  const password = req.body.password;
  const sql = `SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'`;
  db.get(sql, (err, user) => {
    if (user) {
      res.cookie('session', user.id + ':' + (user.isAdmin ? 'admin' : 'user'), { httpOnly: true });
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Giriş başarısız' });
    }
  });
});

// --- 2. Subtle XSS ---
app.get('/product/:id', (req, res) => {
  // Hata: Ürün açıklaması doğrudan HTML'e ekleniyor, escape edilmiyor
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, product) => {
    if (!product) return res.status(404).send('Ürün bulunamadı');
    res.send(`<h2>${product.name}</h2><p>${product.description}</p>`); // description escape edilmiyor
  });
});

// --- 3. Subtle Auth Bypass ---
function isAuthenticated(req) {
  // Hata: Sadece cookie'nin varlığına bakılıyor, içerik doğrulanmıyor
  return req.cookies.session && req.cookies.session.split(':').length === 2;
}
function isAdmin(req) {
  // Hata: Cookie'den admin olup olmadığına bakılıyor, manipülasyona açık
  return req.cookies.session && req.cookies.session.split(':')[1] === 'admin';
}
app.get('/admin/dashboard', (req, res) => {
  if (!isAuthenticated(req) || !isAdmin(req)) {
    return res.status(403).send('Yetkisiz erişim');
  }
  res.send('Admin paneli!');
});

// --- 4. Subtle Input Validation ---
app.post('/cart/add', (req, res) => {
  // Hata: productId ve quantity için tip/güvenlik kontrolü yok
  const { productId, quantity } = req.body;
  if (!productId || !quantity) return res.status(400).send('Eksik parametre');
  // Bellek sızıntısı için cartCache kullanılıyor
  const userId = req.cookies.session?.split(':')[0];
  if (!cartCache[userId]) cartCache[userId] = [];
  cartCache[userId].push({ productId, quantity });
  res.send('Ürün sepete eklendi');
});

// --- 5. Subtle Path Traversal ---
app.get('/download', (req, res) => {
  // Hata: Dosya adı filtrelenmiyor, path.join ile dizin atlaması engellenmiyor
  const file = req.query.file;
  const filePath = path.join(__dirname, 'downloads', file);
  res.download(filePath);
});

// --- 6. Subtle Async/Await Error Handling ---
app.get('/order/:id', async (req, res) => {
  // Hata: try/catch yok, db.get callback ile kullanılıyor, await yanlış yerde
  let order;
  await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, row) => {
    order = row;
  });
  if (!order) return res.status(404).send('Sipariş bulunamadı');
  res.json(order);
});

// --- 7. Subtle Memory Leak ---
app.post('/cart/checkout', (req, res) => {
  // Hata: Sepet temizlenmiyor, cartCache sürekli büyüyor
  const userId = req.cookies.session?.split(':')[0];
  if (cartCache[userId]) {
    // Sipariş işlemleri...
    res.send('Sipariş alındı!');
    // cartCache[userId] = []; // Unutulmuş!
  } else {
    res.status(400).send('Sepet boş');
  }
});

// --- 8. Subtle Race Condition ---
let stock = 10;
app.post('/buy', (req, res) => {
  // Hata: Stok kontrolü ve güncellemesi atomik değil
  const { productId, quantity } = req.body;
  if (stock >= quantity) {
    setTimeout(() => {
      stock -= quantity;
      res.send('Satın alma başarılı');
    }, Math.random() * 100);
  } else {
    res.status(400).send('Yetersiz stok');
  }
});

app.listen(3000, () => {
  console.log('BugBot test uygulaması 3000 portunda çalışıyor!');
});
