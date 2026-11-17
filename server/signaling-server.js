const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { WebSocketServer } = require('ws');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// CONFIG
const HTTP_PORT = process.env.HTTP_PORT || 8080;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;
const STATIC_DIR = process.env.STATIC_DIR || path.resolve(__dirname, '..');
const CERT_DIR = path.resolve(__dirname, 'certs');
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const DB_PATH = path.join(__dirname, 'data.db');

// STRIPE (guarded so the server still boots without a key set; the Checkout
// endpoint returns a 500 "not configured" until STRIPE_SECRET_KEY is present.)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// MIME TYPES
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
};

// ═══ DATABASE ═══
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    level TEXT,
    data TEXT,
    teacher_id INTEGER NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(teacher_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS reminder_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(teacher_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    student_name TEXT NOT NULL,
    lesson_title TEXT,
    lesson_time TEXT,
    topic TEXT,
    status TEXT DEFAULT 'pending',
    template_id INTEGER,
    composed_subject TEXT,
    composed_body TEXT,
    channel TEXT DEFAULT 'email',
    sent_at TEXT,
    confirmed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(teacher_id) REFERENCES users(id),
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(template_id) REFERENCES reminder_templates(id)
  );
  CREATE TABLE IF NOT EXISTS reminder_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reminder_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(reminder_id) REFERENCES reminders(id)
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room TEXT NOT NULL,
    email TEXT,
    time TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed default accounts
const seedUsers = [
  { email: 'william@articulate.com', password: 'Pass123!', name: 'William', role: 'teacher' },
  { email: 'maria@articulate.com', password: 'Pass123!', name: 'Maria', role: 'student' },
];
for (const u of seedUsers) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
  if (!existing) {
    const hash = bcrypt.hashSync(u.password, 10);
    db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(u.email, hash, u.name, u.role);
  }
}
console.log('[OK] Database ready');

// ═══ AUTH HELPERS ═══
function createToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return token;
}

function getUserFromToken(token) {
  if (!token) return null;
  const session = db.prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')").get(token);
  if (!session) return null;
  return db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(session.user_id);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [key, val] = c.trim().split('=');
    if (key) cookies[key] = val;
  });
  return cookies;
}

function maskName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0) + '.';
}

// LOAD CERTS
let tlsOptions;
try {
  tlsOptions = {
    key: fs.readFileSync(path.join(CERT_DIR, 'key.pem')),
    cert: fs.readFileSync(path.join(CERT_DIR, 'cert.pem')),
  };
  console.log('[OK] TLS certificates loaded');
} catch (e) {
  console.log('[WARN] No TLS certs found in', CERT_DIR);
  console.log('  Run: openssl req -x509 -newkey rsa:2048 -keyout server/certs/key.pem -out server/certs/cert.pem -days 365 -nodes -subj "/CN=localhost"');
  console.log('  Starting HTTP-only mode (WebRTC will only work on localhost)');
}

// STATIC FILE SERVER
function createAppServer() {
  return tlsOptions ? https.createServer(tlsOptions, handleRequest) : http.createServer(handleRequest);
}

function handleRequest(req, res) {
  // Skip /signal - handled by WS upgrade
  if (req.url === '/signal') { res.writeHead(400); res.end(); return; }

  // ═══ AUTH API ═══
  if (req.url === '/api/register' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { email, password, name, role } = JSON.parse(body);
        if (!email || !password || !name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields' }));
          return;
        }
        if (password.length < 8) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Password must be at least 8 characters' }));
          return;
        }
        const validRoles = ['student', 'teacher'];
        const userRole = validRoles.includes(role) ? role : 'student';
        const hash = bcrypt.hashSync(password, 10);
        try {
          const result = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(email, hash, name, userRole);
          const token = createToken(result.lastInsertRowid);
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
          });
          res.end(JSON.stringify({ success: true, role: userRole }));
        } catch (e) {
          if (e.message.includes('UNIQUE constraint failed')) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Email already registered' }));
          } else {
            throw e;
          }
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (req.url === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid email or password' }));
          return;
        }
        const token = createToken(user.id);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
        });
        res.end(JSON.stringify({ success: true, role: user.role, name: user.name }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (req.url === '/api/logout' && req.method === 'POST') {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(cookies.token);
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'token=; HttpOnly; Path=/; Max-Age=0'
    });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (req.url === '/api/me' && req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const user = getUserFromToken(cookies.token);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(user));
    return;
  }

  // ═══ LESSONS API ═══
  if (req.url === '/api/lessons' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { lessonId, title, level, data, teacherId } = JSON.parse(body);
        db.prepare('INSERT OR REPLACE INTO lessons (id, title, level, data, teacher_id, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"))').run(lessonId, title, level, JSON.stringify(data), teacherId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (req.url === '/api/lessons' && req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const user = getUserFromToken(cookies.token);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }
    const lessons = db.prepare('SELECT id, title, level, updated_at FROM lessons WHERE teacher_id = ? ORDER BY updated_at DESC').all(user.id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(lessons));
    return;
  }

  // ═══ MEET CAPTURE API ═══
  if (req.url === '/api/meet-capture' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { room, student, message } = JSON.parse(body);
        if (!room || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing room or message' }));
          return;
        }
        const meetLogsDir = path.join(__dirname, 'meet-logs');
        if (!fs.existsSync(meetLogsDir)) fs.mkdirSync(meetLogsDir, { recursive: true });
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(meetLogsDir, `${date}_${room}.txt`);
        const line = `[${message.timestamp}] ${message.type}: ${message.text}\n`;
        fs.appendFileSync(logFile, line);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // ═══ REMINDER TEMPLATES API ═══
  if (req.url === '/api/reminder-templates' && req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const user = getUserFromToken(cookies.token);
    if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not authenticated' })); return; }
    const templates = db.prepare('SELECT * FROM reminder_templates WHERE teacher_id = ? ORDER BY is_default DESC, created_at DESC').all(user.id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(templates));
    return;
  }

  if (req.url === '/api/reminder-templates' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const cookies = parseCookies(req.headers.cookie);
        const user = getUserFromToken(cookies.token);
        if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not authenticated' })); return; }
        const { name, subject, body: templateBody, isDefault } = JSON.parse(body);
        if (isDefault) db.prepare('UPDATE reminder_templates SET is_default = 0 WHERE teacher_id = ?').run(user.id);
        const result = db.prepare('INSERT INTO reminder_templates (teacher_id, name, subject, body, is_default) VALUES (?, ?, ?, ?, ?)').run(user.id, name, subject, templateBody, isDefault ? 1 : 0);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: result.lastInsertRowid }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (req.url === '/api/reminder-templates' && req.method === 'DELETE') {
    const cookies = parseCookies(req.headers.cookie);
    const user = getUserFromToken(cookies.token);
    if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not authenticated' })); return; }
    const id = req.url.split('/').pop();
    db.prepare('DELETE FROM reminder_templates WHERE id = ? AND teacher_id = ?').run(id, user.id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // ═══ REMINDERS API ═══
  if (req.url === '/api/reminders' && req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const user = getUserFromToken(cookies.token);
    if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not authenticated' })); return; }
    const reminders = db.prepare('SELECT id, student_name, lesson_title, lesson_time, topic, status, channel, created_at FROM reminders WHERE teacher_id = ? ORDER BY created_at DESC').all(user.id);
    const masked = reminders.map(r => ({ ...r, student_name: maskName(r.student_name) }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(masked));
    return;
  }

  if (req.url === '/api/reminders' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const cookies = parseCookies(req.headers.cookie);
        const user = getUserFromToken(cookies.token);
        if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not authenticated' })); return; }
        const { studentId, studentName, lessonTitle, lessonTime, topic, templateId, composedSubject, composedBody, channel } = JSON.parse(body);
        const result = db.prepare('INSERT INTO reminders (teacher_id, student_id, student_name, lesson_title, lesson_time, topic, template_id, composed_subject, composed_body, channel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(user.id, studentId, studentName, lessonTitle, lessonTime, topic, templateId, composedSubject, composedBody, channel || 'email');
        db.prepare('INSERT INTO reminder_log (reminder_id, action, detail) VALUES (?, ?, ?)').run(result.lastInsertRowid, 'created', `${channel || 'email'} reminder for ${studentName}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: result.lastInsertRowid }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (req.url === '/api/reminders/confirm' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const cookies = parseCookies(req.headers.cookie);
        const user = getUserFromToken(cookies.token);
        if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not authenticated' })); return; }
        const { reminderId } = JSON.parse(body);
        const reminder = db.prepare('SELECT * FROM reminders WHERE id = ? AND teacher_id = ?').get(reminderId, user.id);
        if (!reminder) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not found' })); return; }
        db.prepare("UPDATE reminders SET status = ?, confirmed_at = datetime('now') WHERE id = ?").run('confirmed', reminderId);
        db.prepare('INSERT INTO reminder_log (reminder_id, action, detail) VALUES (?, ?, ?)').run(reminderId, 'confirmed', `Teacher confirmed ${reminder.channel} reminder sent`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (req.url === '/api/reminders/send-email' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const cookies = parseCookies(req.headers.cookie);
        const user = getUserFromToken(cookies.token);
        if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not authenticated' })); return; }
        const { reminderId } = JSON.parse(body);
        const reminder = db.prepare('SELECT r.*, u.email as student_email, u.name as student_name FROM reminders r JOIN users u ON r.student_id = u.id WHERE r.id = ? AND r.teacher_id = ?').get(reminderId, user.id);
        if (!reminder) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not found' })); return; }
        db.prepare('UPDATE reminders SET status = ?, sent_at = datetime("now") WHERE id = ?').run('sent', reminderId);
        db.prepare('INSERT INTO reminder_log (reminder_id, action, detail) VALUES (?, ?, ?)').run(reminderId, 'email_sent', `Email sent to student`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // ═══ WHATSAPP REDIRECT (student number hidden from teacher) ═══
  if (req.url.startsWith('/api/whatsapp/') && req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const user = getUserFromToken(cookies.token);
    if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not authenticated' })); return; }
    const reminderId = req.url.split('/').pop();
    const reminder = db.prepare('SELECT r.*, u.phone FROM reminders r JOIN users u ON r.student_id = u.id WHERE r.id = ? AND r.teacher_id = ?').get(reminderId, user.id);
    if (!reminder || !reminder.phone) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'No phone number' })); return; }
    const text = encodeURIComponent(reminder.composed_body || 'Reminder about your lesson');
    res.writeHead(302, { Location: `https://wa.me/${reminder.phone}?text=${text}` });
    res.end();
    return;
  }

  // ═══ BOOKINGS API ═══
  if (req.url === '/api/bookings' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { room, email, time } = JSON.parse(body);
        db.prepare("INSERT INTO bookings (room, email, time, created_at) VALUES (?, ?, ?, datetime('now'))").run(room, email, time);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // ═══ PAYMENT: Stripe Checkout — any & all payment methods════════════════
  if (req.url === '/api/create-checkout-session' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        if (!stripe) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Stripe not configured on the server (set STRIPE_SECRET_KEY in .env).' }));
          return;
        }
        const payload = JSON.parse(body);
        const currency = (payload.currency || 'eur').toUpperCase();
        const base = process.env.APP_BASE_URL || 'http://localhost:8080';
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          currency: currency,
          // NO payment_method_types array -> Stripe surfaces ALL methods enabled
          // for this account/country (card, wallets, SEPA, iDEAL, Klarna ...).
          automatic_payment_methods: { enabled: true },
          line_items: [{
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: payload.productName || 'Articulate English',
                description: payload.productDescription || ''
              },
              unit_amount: payload.unitAmount
            },
            quantity: 1
          }],
          success_url: base + '/stripe-callback.html?session_id={CHECKOUT_SESSION_ID}&return_to=' + encodeURIComponent(payload.returnTo || (base + '/landing.html')),
          cancel_url: base + '/',
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ url: session.url, sessionId: session.id }));
      } catch (e) {
        console.error('[stripe] create-session error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.url === '/api/checkout-session' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        if (!stripe) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Stripe not configured on the server.' }));
          return;
        }
        const payload = JSON.parse(body);
        const session = await stripe.checkout.sessions.retrieve(payload.sessionId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: session.id,
          payment_status: session.payment_status,
          paid: session.payment_status === 'paid',
          amount_total: session.amount_total,
          currency: session.currency
        }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Webhook — forwarded locally via: stripe listen --forward-to http://localhost:8080/api/webhook
  if (req.url === '/api/webhook' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
      if (!stripe || !secret) {
        console.error('[stripe] webhook hit but Stripe/webhook not configured');
        res.writeHead(500); res.end('webhook not configured');
        return;
      }
      const sig = req.headers['stripe-signature'];
      let event;
      try {
        event = stripe.webhooks.constructEvent(body, sig, secret);
      } catch (e) {
        console.error('[stripe] webhook signature failed:', e.message);
        res.writeHead(400); res.end('bad signature');
        return;
      }
      if (event.type === 'checkout.session.completed') {
        const s = event.data.object;
        console.log('[stripe] paid session:', s.id, s.amount_total, s.currency);
        // TODO: provision the paid booking here
      }
      res.writeHead(200); res.end('ok');
    });
    return;
  }

  // ═══ PAYMENT: Paystack verification (USD / ZA rail) ═══════════════════════
  // The Paystack inline modal runs in the browser, so its callback is not proof
  // of payment — anyone can visit ?paid=1 by hand. Confirm the transaction
  // server-side with the secret key before sending the customer off to book a
  // pre-paid session.
  if (req.url === '/api/paystack/verify' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const json = (code, obj) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      const secret = process.env.PAYSTACK_SECRET_KEY || '';
      if (!secret) {
        console.error('[paystack] verify hit but PAYSTACK_SECRET_KEY is not set');
        json(503, { verified: false, error: 'Paystack is not configured on the server (set PAYSTACK_SECRET_KEY in .env).' });
        return;
      }
      let payload;
      try { payload = JSON.parse(body); } catch (e) { json(400, { verified: false, error: 'Invalid request.' }); return; }
      const reference = String(payload.reference || '').trim();
      if (!reference) { json(400, { verified: false, error: 'Missing transaction reference.' }); return; }
      try {
        const r = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), {
          headers: { Authorization: 'Bearer ' + secret, Accept: 'application/json' }
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.status) {
          console.error('[paystack] verify failed for', reference, r.status, (data && data.message) || '');
          json(502, { verified: false, error: 'Payment could not be confirmed with Paystack. Please contact us before booking.' });
          return;
        }
        const tx = data.data || {};
        const expected = Number(payload.amount);   // kobo / cents, optional
        const amountOk = !expected || Number(tx.amount) === expected;
        const currencyOk = !payload.currency || !tx.currency ||
                           String(tx.currency).toLowerCase() === String(payload.currency).toLowerCase();
        const verified = tx.status === 'success' && amountOk && currencyOk;
        console.log('[paystack] verify', reference, tx.status, tx.amount, tx.currency, '->', verified ? 'VERIFIED' : 'REJECTED');
        json(200, {
          verified: verified,
          reference: reference,
          status: tx.status,
          amount: tx.amount,
          currency: tx.currency,
          paidAt: tx.paid_at || tx.transaction_date || '',
          email: (tx.customer && tx.customer.email) || ''
        });
      } catch (e) {
        console.error('[paystack] verify error:', e.message);
        json(502, { verified: false, error: 'Payment confirmation failed. Please contact us before booking.' });
      }
    });
    return;
  }

  // ═══ STATIC FILES ═══
  let filePath = path.join(STATIC_DIR, req.url === '/' ? 'landing.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (!ext) {
        filePath = path.join(STATIC_DIR, 'index.html');
        return fs.readFile(filePath, (err2, data2) => {
          if (err2) { res.writeHead(404); res.end('Not found'); }
          else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(data2); }
        });
      }
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Permissions-Policy': 'camera=(self), microphone=(self), display-capture=(self)',
    });
    res.end(data);
  });
}

// WEBSOCKET SIGNALING
// Rooms: Map<roomId, Set<ws>>
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  return rooms.get(roomId);
}

function broadcastToRoom(roomId, sender, message) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(message);
  room.forEach(client => {
    if (client !== sender && client.readyState === 1) {
      client.send(data);
    }
  });
}

function leaveRoom(ws, clientData) {
  if (clientData && clientData.room) {
    const room = rooms.get(clientData.room);
    if (room) {
      room.delete(ws);
      broadcastToRoom(clientData.room, ws, { type: 'peer-left', room: clientData.room });
      if (room.size === 0) rooms.delete(clientData.room);
    }
  }
}

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  const clientData = { room: null, role: null };
  console.log('WS connected:', req.socket.remoteAddress);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { return; }

    switch (msg.type) {
      case 'join': {
        const roomId = msg.room || 'default';
        clientData.room = roomId;
        clientData.role = msg.role || 'student';
        const room = getOrCreateRoom(roomId);
        room.add(ws);
        ws.send(JSON.stringify({ type: 'joined', room: roomId, peers: room.size - 1 }));
        console.log('  join: ' + clientData.role + ' -> ' + roomId + ' (' + room.size + ' peers)');
        break;
      }
      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        if (clientData.room) {
          broadcastToRoom(clientData.room, ws, { type: msg.type, sdp: msg.sdp, candidate: msg.candidate });
        }
        break;
      }
      default:
        break;
    }
  });

  ws.on('close', () => {
    console.log('WS disconnected');
    leaveRoom(ws, clientData);
  });

  ws.on('error', (e) => {
    console.error('WS error:', e.message);
  });
});

// START SERVER
const mainServer = createAppServer();

mainServer.on('upgrade', (req, socket, head) => {
  if (req.url === '/signal') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

const PORT = tlsOptions ? HTTPS_PORT : HTTP_PORT;
const PROTO = tlsOptions ? 'https' : 'http';

mainServer.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('============================================');
  console.log('  Articulate Video Classroom Server');
  console.log('============================================');
  console.log('  ' + PROTO + '://localhost:' + PORT);
  console.log('  ' + PROTO + '://0.0.0.0:' + PORT);
  console.log('  Static dir: ' + STATIC_DIR);
  console.log('  WebSocket:  ws://localhost:' + PORT + '/signal');
  console.log('============================================');
  console.log('');
  console.log('  Room URL example:');
  console.log('  ' + PROTO + '://localhost:' + PORT + '/voip.html?room=test123&role=teacher');
  console.log('');
  if (!tlsOptions) {
    console.log('  [WARN] HTTP mode - WebRTC only works on localhost');
    console.log('  [WARN] For remote testing, generate certs (see above)');
  }
  console.log('');
});

// HTTP -> HTTPS redirect
if (tlsOptions) {
  http.createServer((req, res) => {
    const host = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';
    res.writeHead(302, { Location: 'https://' + host + ':' + HTTPS_PORT + req.url });
    res.end();
  }).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log('  HTTP redirect: http://localhost:' + HTTP_PORT + ' -> https://localhost:' + HTTPS_PORT);
    console.log('');
  });
}
