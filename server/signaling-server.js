const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

// CONFIG
const HTTP_PORT = process.env.HTTP_PORT || 8080;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;
const STATIC_DIR = process.env.STATIC_DIR || path.resolve(__dirname, '..');
const CERT_DIR = path.resolve(__dirname, 'certs');

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
