require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware untuk sesi pengguna
app.use(session({
  secret: 'kampussecret',  // Ganti dengan secret yang lebih aman di produksi
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // Pastikan diubah jika menggunakan HTTPS
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Halaman beranda
app.get('/', (req, res) => {
  res.render('index');
});

// Halaman login
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Rute login dengan celah Insecure JWT
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Query rentan terhadap Blind SQL Injection
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    const result = await pool.query(query);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Menggunakan secret key lemah, hard-coded, dan memiliki masa expire yang cukup lama
      const token = jwt.sign({ id: user.id }, 'weaksecret', { expiresIn: '1d' });

      // Simpan token di cookie tanpa secure flag
      res.cookie('token', token, { httpOnly: true, secure: false });
      
      res.redirect('/dashboard');
    } else {
      res.render('login', { error: 'Username atau password salah' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Middleware untuk autentikasi JWT (rentan)
function authenticateJWT(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/login');
  }

  // Mengabaikan verifikasi atau menggunakan secret key lemah
  jwt.verify(token, 'weaksecret', (err, user) => {
    if (err) {
      return res.redirect('/login');
    }
    req.user = user;
    next();
  });
}

// Halaman dashboard dengan middleware autentikasi
app.get('/dashboard', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    // Query untuk mendapatkan nama pengguna berdasarkan ID
    const query = `SELECT nama FROM users WHERE id = ${userId}`;
    const result = await pool.query(query);

    if (result.rows.length > 0) {
      const nama = result.rows[0].nama;

      // Kirim nama ke view dashboard
      res.render('dashboard', { user: { nama } });
    } else {
      res.status(404).send('User tidak ditemukan');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


// Halaman jadwal kuliah dengan query rentan Blind SQL Injection
app.get('/jadwal', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `SELECT * FROM jadwal WHERE user_id = ${userId}`;
    const result = await pool.query(query);

    res.render('jadwal', { jadwal: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Halaman berita
app.get('/berita', async (req, res) => {
  const query = 'SELECT * FROM berita ORDER BY tanggal DESC';
  try {
    const result = await pool.query(query);
    res.render('berita', { berita: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error occurred');
  }
});

// Menjalankan server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
