/* ==========================================================================
   Articulate English - Lesson request inbox
   --------------------------------------------------------------------------
   WHY THIS EXISTS
     A static GitHub Pages site cannot store form submissions by itself.
     Visitors submit a YouTube link + level + topic + their email; this Worker
     stores the request in D1 and lets Hermes (with an admin token) list and
     publish them.

   WHAT IT DOES
     site form --(POST /api/submit)----> this Worker --> D1 (status=pending)
     Hermes   --(GET /api/submissions)-> this Worker --> pending list
     Hermes   --(POST /api/publish)---> this Worker --> marks published + returns rows

   COST: free. Cloudflare Workers free tier = 100,000 requests/day; D1 free tier.

   SETUP (one time)
     1. wrangler d1 execute lesson-requests --file=schema.sql
     2. wrangler secret put ADMIN_TOKEN
     3. wrangler deploy
   ========================================================================== */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// Pull a YouTube video id out of the common URL shapes.
function extractVideoId(raw) {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return id || null;
    }
    if (host.endsWith('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;
      const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?]+)/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

function authorized(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return !!token && !!env.ADMIN_TOKEN && token === env.ADMIN_TOKEN;
}

async function handleSubmit(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid JSON' }, 400);
  }

  const url = String(body.url || '').trim();
  const level = String(body.level || '').trim().toUpperCase();
  const topic = String(body.topic || '').trim();
  const email = String(body.email || '').trim();
  const videoId = extractVideoId(url);

  if (!videoId) return json({ ok: false, error: 'invalid YouTube link' }, 400);
  if (!['A2', 'B1'].includes(level)) return json({ ok: false, error: 'level must be A2 or B1' }, 400);
  if (!topic) return json({ ok: false, error: 'topic is required' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'invalid email' }, 400);

  const now = new Date().toISOString();
  const info = await env.DB.prepare(
    'INSERT INTO requests (video_id, url, level, topic, email, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(videoId, url, level, topic, email, 'pending', now).run();

  return json({ ok: true, id: info.meta.last_row_id });
}

async function handleSubmissions(request, env) {
  if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  const { results } = await env.DB.prepare(
    'SELECT id, video_id, url, level, topic, email, status, created_at FROM requests ORDER BY created_at DESC LIMIT 200'
  ).all();
  return json({ ok: true, submissions: results });
}

async function handlePublish(request, env) {
  if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid JSON' }, 400);
  }

  const videoId = String(body.videoId || '').trim();
  const slug = String(body.slug || '').trim();
  const lessonUrl = String(body.url || '').trim();
  if (!videoId) return json({ ok: false, error: 'videoId is required' }, 400);
  if (!slug) return json({ ok: false, error: 'slug is required' }, 400);

  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE requests SET status = 'published', lesson_slug = ?, lesson_url = ?, published_at = ? WHERE video_id = ? AND status = 'pending'"
  ).bind(slug, lessonUrl, now, videoId).run();

  const { results } = await env.DB.prepare(
    'SELECT id, email, level, topic, url, lesson_slug, lesson_url FROM requests WHERE video_id = ? AND status = ? AND published_at = ?'
  ).bind(videoId, 'published', now).all();

  return json({ ok: true, notified: results });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (path === '/api/submit' && request.method === 'POST') return handleSubmit(request, env);
    if (path === '/api/submissions' && request.method === 'GET') return handleSubmissions(request, env);
    if (path === '/api/publish' && request.method === 'POST') return handlePublish(request, env);

    if (path === '/' || path === '/health') {
      return json({ ok: true, service: 'ae-lesson-requests' });
    }
    return json({ ok: false, error: 'not found' }, 404);
  },
};
