// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.urlencoded({ extended: false })); // body parser

// ---------- Database connection ----------
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',   // MySQL root password
  database: process.env.DB_NAME || 'websec',
  port: process.env.DB_PORT || 3306,
  multipleStatements: false
});

db.connect(err => {
  if (err) {
    console.error('MySQL connection error:', err.message);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
});

// ---------- CSS for demo pages ----------
const pageStyle = `
<style>
body{font-family: Arial, Helvetica, sans-serif;background:#f4f7fb;padding:40px;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
.card{background:white;padding:28px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.07);width:360px}
h2{text-align:center;margin-top:0;color:#333}
input{width:100%;padding:12px;margin:8px 0;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box}
button{width:100%;padding:12px;border-radius:8px;border:none;background:#2563eb;color:white;font-weight:600;cursor:pointer}
.alt{background:transparent;color:#2563eb;border:1px solid #cfe0ff;margin-top:10px}
.msg{padding:10px;border-radius:8px;margin:10px 0}
.success{background:#ecfdf5;color:#065f46}
.error{background:#ffeff0;color:#7f1d1d}
</style>
`;

// ---------- Home ----------
app.get('/', (req, res) => {
  res.send(`
    ${pageStyle}
    <div class="card">
      <h2>Welcome</h2>
      <p style="text-align:center;color:#555">Use buttons below</p>
      <a href="/login"><button>Login</button></a>
      <a href="/register"><button class="alt">Register</button></a>
    </div>
  `);
});

// ---------- Register ----------
app.get('/register', (req, res) => {
  res.send(`
    ${pageStyle}
    <div class="card">
      <h2>Create Account</h2>
      <form method="POST" action="/register">
        <input name="username" placeholder="Username" required />
        <input name="password" placeholder="Password" type="password" required />
        <button>Create Account</button>
      </form>
      <p style="text-align:center;margin-top:8px"><a href="/login">Already have account? Login</a></p>
    </div>
  `);
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.send(renderMessage('Provide username & password', 'error'));

  // check if user exists
  db.query('SELECT id FROM users WHERE username = ?', [username], (err, rows) => {
    if (err) return res.send(renderMessage('DB error', 'error'));
    if (rows.length) return res.send(renderMessage('Username already taken', 'error'));

    // hash password
    const hashed = bcrypt.hashSync(password, 10);

    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed], err2 => {
      if (err2) return res.send(renderMessage('DB error on insert', 'error'));
      return res.send(renderMessage('Account created — you can now login', 'success', '/login'));
    });
  });
});

// ---------- Login ----------
app.get('/login', (req, res) => {
  res.send(`
    ${pageStyle}
    <div class="card">
      <h2>Login</h2>
      <form method="POST" action="/login">
        <input name="username" placeholder="Username" required />
        <input name="password" placeholder="Password" type="password" required />
        <button>Login</button>
      </form>
      <p style="text-align:center;margin-top:8px"><a href="/register">Create account</a></p>
    </div>
  `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT id, username, password FROM users WHERE username = ? LIMIT 1';
  db.query(sql, [username], (err, results) => {
    if (err) return res.send(renderMessage('DB error', 'error'));
    if (!results.length) return res.send(renderMessage('Invalid username or password', 'error'));

    const match = bcrypt.compareSync(password, results[0].password);
    if (!match) return res.send(renderMessage('Invalid username or password', 'error'));

    res.send(`
      ${pageStyle}
      <div class="card">
        <h2>Welcome, ${escapeHtml(results[0].username)}</h2>
        <p class="msg success">Login successful ✅</p>
        <a href="/"><button class="alt">Back</button></a>
      </div>
    `);
  });
});

// ---------- Helpers ----------
function renderMessage(text, kind = 'success', goTo = '/') {
  const cls = kind === 'success' ? 'success' : 'error';
  return `
    ${pageStyle}
    <div class="card">
      <h2>Status</h2>
      <div class="msg ${cls}">${escapeHtml(text)}</div>
      <a href="${goTo}"><button class="alt">Continue</button></a>
    </div>
  `;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------- Start server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
