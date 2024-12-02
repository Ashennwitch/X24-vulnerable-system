require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');

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

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Halaman beranda
app.get('/', (req, res) => {
  res.render('index');
});

// Halaman login
app.get('/login', (req, res) => {
  res.render('login');
});

// Halaman login
// Route login yang rentan
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Query rentan terhadap Blind SQL Injection (gunakan string concatenation)
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    
    const result = await pool.query(query);

    if (result.rows.length > 0) {
      // Jika login berhasil, simpan userId di sesi
      req.session.userId = result.rows[0].id;
      res.redirect('/dashboard');  // Redirect ke halaman dashboard
    } else {
      res.send('Username atau password salah');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});
  
// Halaman dashboard mahasiswa/dosen
// Halaman Dashboard
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
      return res.redirect('/login');  // Jika belum login, redirect ke halaman login
    }
  
    res.render('dashboard');  // Tampilkan dashboard setelah login
  });
// Halaman jadwal kuliah (mahasiswa)
// Halaman Jadwal
// Halaman Jadwal dengan query yang rentan (berbahaya!)
app.get('/jadwal', async (req, res) => {
    if (!req.session.userId) {
      return res.redirect('/login');  // Jika belum login, redirect ke halaman login
    }
  
    try {
      // Ambil userId dari sesi
      const userId = req.session.userId;
      
      // Query rentan terhadap Blind SQL Injection (tidak aman!)
      const query = `SELECT * FROM jadwal WHERE user_id = ${userId}`;
      
      const result = await pool.query(query);
      
      // Tampilkan halaman jadwal dengan data yang ditemukan
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
