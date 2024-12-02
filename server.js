require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Blind SQL Injection rentan
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  try {
    const result = await pool.query(query);
    if (result.rows.length > 0) {
      res.render('dashboard', { user: result.rows[0] });
    } else {
      res.send('Invalid credentials');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error occurred');
  }
});

// Halaman dashboard mahasiswa/dosen
app.get('/dashboard', (req, res) => {
  // Misalnya hanya user dengan role 'mahasiswa' atau 'dosen' yang bisa mengakses
  res.render('dashboard');
});

// Halaman jadwal kuliah (mahasiswa)
app.get('/jadwal', async (req, res) => {
  const user_id = req.query.user_id;  // Akan diambil dari session atau query params
  const query = `SELECT * FROM jadwal WHERE user_id = '${user_id}'`;

  try {
    const result = await pool.query(query);
    res.render('jadwal', { jadwal: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error occurred');
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
