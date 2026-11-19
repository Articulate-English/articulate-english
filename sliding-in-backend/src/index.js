/* ==========================================================================
   Articulate English — Sliding In licence + lesson-grant service
   --------------------------------------------------------------------------
   WHY THIS EXISTS
     The Sliding In apps are static PWAs on GitHub Pages. A static app cannot
     keep a secret: anything shipped to the browser can be extracted. So the
     paid content key never ships. This Worker holds it, verifies licences
     against Payhip, and hands each buyer a payload encrypted for them alone.

   THREAT MODEL (honest)
     - Free teaser topics are public by design.
     - The paid key lives only here (wrangler secret); the repos hold ciphertext.
     - Every buyer's payload is different, so a leak is attributable.
     - A motivated buyer can still screenshot or read their own memory. No DRM
       exists for text in a browser; this raises cost and enables attribution,
       it does not make extraction impossible.

   ENDPOINTS
     GET  /sliding-in/health
     POST /sliding-in/verify    {licence_key, product_key} -> Payhip check + record
     POST /sliding-in/grant     {licence_key, product_key, deck, lesson} -> signed URL
     POST /sliding-in/redeem    {grant, device} -> per-device unlock
     POST /sliding-in/payload   {licence_key, deck} -> per-buyer ciphertext (phase 2)
     GET  /sliding-in/admin/stats?token=...

   SETUP
     wrangler secret put MASTER_KEY
     wrangler secret put GRANT_SECRET
     wrangler secret put PAYHIP_SECRETS     # JSON: {"<product_key>":"<product-secret-key>"}
     wrangler secret put PORTAL_LAB_TOKEN   # gates /portal-lab; the lab writes /portal-tune
     wrangler d1 execute sliding-in --file=schema.sql --remote
     wrangler deploy
   ========================================================================== */

const ALLOWED_ORIGIN = /^(https:\/\/articulate-english\.github\.io|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
const DECKS = ['1', '2', '3', '4'];
const GRANT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/* the private portal tuning page, bundled at build time (wrangler ?raw import) */
import labHtml from './lab-html.js';

function corsFor(request) {
  const origin = request.headers.get('Origin') || '';
  const headers = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  if (ALLOWED_ORIGIN.test(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(data, status = 200, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...(request ? corsFor(request) : { 'Access-Control-Allow-Origin': '*' }),
      'Content-Type': 'application/json',
    },
  });
}

// ── encoding helpers ───────────────────────────────────────────────────────
function b64urlEncode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  try {
    const s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
    const bin = atob(s + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return new Uint8Array(0);
  }
}

function hexBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function randomHex(bytes) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return [...a].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// ── crypto (WebCrypto) ─────────────────────────────────────────────────────
async function sha256Hex(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function hkdfAesKey(ikmHex, salt, info) {
  const base = await crypto.subtle.importKey('raw', hexBytes(ikmHex), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new TextEncoder().encode(salt), info: new TextEncoder().encode(info) },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function hmacKey(secretHex) {
  return crypto.subtle.importKey('raw', hexBytes(secretHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

// Derive an AES key from a human-held secret (licence key or grant nonce). The secret
// never needs to leave the device, and the master key is not involved — so the app can
// derive the same key locally and decrypt offline.
async function hkdfFromString(secret, salt, info) {
  const ikm = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(secret)));
  const base = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new TextEncoder().encode(salt), info: new TextEncoder().encode(info) },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Paid payloads live in KV, sealed under the master key. Returns the parsed deck.
async function loadPaidPayload(env, deck) {
  if (!env.MASTER_KEY || !env.PAYLOADS) return null;
  const raw = await env.PAYLOADS.get('deck' + deck);
  if (!raw) return null;
  const key = await crypto.subtle.importKey('raw', hexBytes(env.MASTER_KEY), { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await aesOpen(key, b64urlDecode(JSON.parse(raw).ciphertext));
  return JSON.parse(new TextDecoder().decode(plain));
}

async function aesSeal(key, plaintextBytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintextBytes);
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), 12);
  return out;
}

async function aesOpen(key, bytes) {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
}

// ── grants ─────────────────────────────────────────────────────────────────
async function signGrant(env, obj) {
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify(obj)));
  const key = await hmacKey(env.GRANT_SECRET);
  const sig = b64urlEncode(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  return payload + '.' + sig;
}

async function verifyGrant(env, token) {
  if (!env.GRANT_SECRET) return null;
  const i = String(token || '').lastIndexOf('.');
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const key = await hmacKey(env.GRANT_SECRET);
  const ok = await crypto.subtle.verify('HMAC', key, b64urlDecode(sig), new TextEncoder().encode(payload));
  if (!ok) return null;
  try {
    return JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
  } catch {
    return null;
  }
}

// ── Payhip ─────────────────────────────────────────────────────────────────
async function payhipVerify(productKey, licenceKey, secrets) {
  const secret = secrets[productKey];
  if (!secret) return { ok: false, error: 'unknown product_key' };
  const res = await fetch(
    'https://payhip.com/api/v2/license/verify?license_key=' + encodeURIComponent(licenceKey),
    { headers: { 'product-secret-key': secret } }
  );
  if (res.status === 404) return { ok: false, error: 'invalid licence key' };
  const body = await res.json().catch(() => null);
  const data = body && body.data;
  if (!data) return { ok: false, error: 'licence lookup failed' };
  if (data.enabled === false) return { ok: false, error: 'licence disabled (refunded or revoked)' };
  return { ok: true, data };
}

function payhipSecrets(env) {
  try {
    return JSON.parse(env.PAYHIP_SECRETS || '{}');
  } catch {
    return {};
  }
}

async function authorized(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const query = new URL(request.url).searchParams.get('token') || '';
  return !!env.ADMIN_TOKEN && (token === env.ADMIN_TOKEN || query === env.ADMIN_TOKEN);
}

// ── handlers ───────────────────────────────────────────────────────────────
async function handleHealth() {
  return json({ ok: true, service: 'ae-sliding-in' });
}

async function handleVerify(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, error: 'invalid JSON' }, 400, request);
  const licenceKey = String(body.licence_key || '').trim();
  const productKey = String(body.product_key || '').trim();
  if (!licenceKey || !productKey) {
    return json({ ok: false, error: 'licence_key and product_key are required' }, 400, request);
  }

  const result = await payhipVerify(productKey, licenceKey, payhipSecrets(env));
  if (!result.ok) return json(result, 401, request);

  const d = result.data;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO licences (licence_key, product_key, product_name, variant, uses, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (licence_key, product_key)
     DO UPDATE SET uses = excluded.uses, last_seen_at = excluded.last_seen_at`
  ).bind(licenceKey, productKey, d.product_name || '', d.variant_name || '', d.uses || 0, now, now).run();

  return json({
    ok: true,
    product_name: d.product_name || '',
    variant: d.variant_name || '',
    uses: d.uses || 0,
    buyer_email: d.buyer_email || '',
  }, 200, request);
}

async function handleGrant(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, error: 'invalid JSON' }, 400, request);
  const licenceKey = String(body.licence_key || '').trim();
  const productKey = String(body.product_key || '').trim();
  const deck = String(body.deck || '').trim();
  const lesson = String(body.lesson || '').trim();

  if (!licenceKey || !productKey) return json({ ok: false, error: 'licence_key and product_key are required' }, 400, request);
  if (!DECKS.includes(deck)) return json({ ok: false, error: 'deck must be 1, 2, 3 or 4' }, 400, request);
  if (!lesson) return json({ ok: false, error: 'lesson is required' }, 400, request);

  const result = await payhipVerify(productKey, licenceKey, payhipSecrets(env));
  if (!result.ok) return json(result, 401, request);

  const nonce = randomHex(12);
  const exp = Math.floor(Date.now() / 1000) + GRANT_TTL_SECONDS;
  const licHash = (await sha256Hex(licenceKey)).slice(0, 16);
  const token = await signGrant(env, { v: 1, deck, lesson, lic: licHash, exp, nonce });

  const now = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO grants (nonce, deck, lesson, licence_key, created_at, expires_at, revoked) VALUES (?, ?, ?, ?, ?, ?, 0)'
  ).bind(nonce, deck, lesson, licenceKey, now, new Date(exp * 1000).toISOString()).run();

  const base = 'https://articulate-english.github.io/sliding-in' + (deck === '1' ? '' : '-' + deck) + '/';
  return json({ ok: true, url: base + '?lesson=' + encodeURIComponent(lesson) + '&grant=' + token, deck, lesson, expires: exp }, 200, request);
}

async function handleRedeem(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, error: 'invalid JSON' }, 400, request);
  const grant = String(body.grant || '').trim();
  const device = String(body.device || '').trim();

  const obj = await verifyGrant(env, grant);
  if (!obj) return json({ ok: false, error: 'invalid grant' }, 400, request);
  if (!DECKS.includes(String(obj.deck))) return json({ ok: false, error: 'grant for an unknown deck' }, 400, request);
  if (obj.exp < Math.floor(Date.now() / 1000)) return json({ ok: false, error: 'grant expired' }, 410, request);

  const row = await env.DB.prepare('SELECT revoked FROM grants WHERE nonce = ?').bind(obj.nonce).first();
  if (row && row.revoked) return json({ ok: false, error: 'grant revoked' }, 410, request);

  await env.DB.prepare(
    'INSERT INTO redemptions (nonce, device, created_at) VALUES (?, ?, ?)'
  ).bind(obj.nonce, device || null, new Date().toISOString()).run();

  // Seal just this lesson for the grant. The app derives the key from the grant nonce
  // (which is in the shared link), so it decrypts offline; the ciphertext is only
  // obtainable here, after the grant signature has been verified.
  let payload = null;
  const paid = await loadPaidPayload(env, obj.deck);
  if (paid) {
    const matched = [];
    for (const cat of paid) {
      const topics = cat.topics.filter((t) => t.slug === obj.lesson);
      if (topics.length) matched.push({ category: cat.category, topics });
    }
    if (matched.length) {
      const key = await hkdfFromString(obj.nonce, 'sliding-in/grant/' + obj.deck + '/' + obj.lesson, 'sliding-in/grant/v1');
      const sealed = await aesSeal(key, new TextEncoder().encode(JSON.stringify(matched)));
      payload = b64urlEncode(sealed);
    }
  }

  return json({
    ok: true,
    deck: obj.deck,
    lesson: obj.lesson,
    expires: obj.exp,
    payload,
  }, 200, request);
}

async function handlePayload(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, error: 'invalid JSON' }, 400, request);
  const licenceKey = String(body.licence_key || '').trim();
  const productKey = String(body.product_key || '').trim();
  const deck = String(body.deck || '').trim();

  if (!licenceKey || !productKey) {
    return json({ ok: false, error: 'licence_key and product_key are required' }, 400, request);
  }
  if (!DECKS.includes(deck)) return json({ ok: false, error: 'deck must be 1, 2, 3 or 4' }, 400, request);

  const result = await payhipVerify(productKey, licenceKey, payhipSecrets(env));
  if (!result.ok) return json(result, 401, request);

  const paid = await loadPaidPayload(env, deck);
  if (!paid) return json({ ok: false, error: 'payload not provisioned' }, 500, request);

  // Sealed for this licence only. The app derives the same key from the licence key,
  // so it can decrypt offline; the ciphertext itself is only obtainable here, after
  // Payhip has confirmed the purchase.
  const key = await hkdfFromString(licenceKey, 'sliding-in/' + deck, 'sliding-in/payload/v1');
  const sealed = await aesSeal(key, new TextEncoder().encode(JSON.stringify(paid)));

  return json({
    ok: true,
    deck,
    variant: result.data.variant_name || '',
    ciphertext: b64urlEncode(sealed),
  }, 200, request);
}

async function handleStats(request, env) {
  if (!(await authorized(request, env))) return json({ ok: false, error: 'unauthorized' }, 401, request);
  const licences = await env.DB.prepare('SELECT COUNT(*) AS n FROM licences').first();
  const grants = await env.DB.prepare('SELECT COUNT(*) AS n FROM grants').first();
  const redemptions = await env.DB.prepare('SELECT COUNT(*) AS n FROM redemptions').first();
  const revoked = await env.DB.prepare('SELECT COUNT(*) AS n FROM grants WHERE revoked = 1').first();
  return json({
    ok: true,
    licences: licences ? licences.n : 0,
    grants: grants ? grants.n : 0,
    redemptions: redemptions ? redemptions.n : 0,
    revoked: revoked ? revoked.n : 0,
  }, 200, request);
}

// ── router ─────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsFor(request) });
    }

    if (path === '/sliding-in/health') return handleHealth();
    if (path === '/sliding-in/verify' && request.method === 'POST') return handleVerify(request, env);
    if (path === '/sliding-in/grant' && request.method === 'POST') return handleGrant(request, env);
    if (path === '/sliding-in/redeem' && request.method === 'POST') return handleRedeem(request, env);
    if (path === '/sliding-in/payload' && request.method === 'POST') return handlePayload(request, env);
    if (path === '/sliding-in/admin/stats' && request.method === 'GET') return handleStats(request, env);

    /* ═══ PORTAL LAB (private tuning page) ═══
       The page is gated by a token. The tuning it writes is a public read — it is
       only visual settings, and the public site needs it to apply a saved tune. */
    if (path === '/portal-tune' && request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsFor(request) });
    }

    if (path === '/portal-lab' && request.method === 'GET') {
      const token = url.searchParams.get('token') || '';
      if (!env.PORTAL_LAB_TOKEN || token !== env.PORTAL_LAB_TOKEN) {
        return json({ ok: false, error: 'not found' }, 404, request);
      }
      return new Response(labHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    if (path === '/portal-tune' && request.method === 'GET') {
      const raw = await env.PAYLOADS.get('portal-tune');
      return new Response(raw || '{}', {
        headers: { 'Content-Type': 'application/json', ...corsFor(request) }
      });
    }

    if (path === '/portal-tune' && request.method === 'POST') {
      const auth = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      if (!env.PORTAL_LAB_TOKEN || auth !== env.PORTAL_LAB_TOKEN) {
        return json({ ok: false, error: 'unauthorized' }, 401, request);
      }
      const body = await request.json().catch(() => null);
      const tune = body && body.tune;
      if (!tune || typeof tune !== 'object' || Array.isArray(tune)) {
        return json({ ok: false, error: 'bad_request' }, 400, request);
      }
      await env.PAYLOADS.put('portal-tune', JSON.stringify({ tune }));
      return json({ ok: true }, 200, request);
    }

    return json({ ok: false, error: 'not found' }, 404, request);
  },
};
