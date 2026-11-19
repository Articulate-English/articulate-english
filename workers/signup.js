/* ==========================================================================
   Articulate English - test / registration signup worker
   --------------------------------------------------------------------------
   Receives the signup form from the static pages on GitHub Pages and:
     1. writes the contact (plus the consent record) into Brevo
     2. sends the result email

   Deploy: Cloudflare dashboard -> Workers & Pages -> Create a Worker ->
           paste this file -> Deploy. Then set the secrets below and put the
           Worker URL into site-config.js as ARTICULATE.workerEndpoint.

   Secrets (Workers -> Settings -> Variables):
     BREVO_API_KEY   Brevo -> SMTP & API -> API keys          (secret)
     BREVO_LIST_ID   numeric id of the list to add contacts to
     FROM_EMAIL      a verified sender address in your Brevo account
     ALLOWED_ORIGIN  the site origin, e.g. https://articulate-english.github.io
   ========================================================================== */

var DEFAULT_ORIGIN = 'https://articulate-english.github.io';

var TEST_NAMES = { general: 'general English level test', business: 'business English test', kids: 'kids English test', teachers: 'teacher registration' };
var COUNTS = { general: 32, business: 33, kids: 20 };
var SOURCES = { general: 'free-english-level-test', business: 'free-business-english-test', kids: 'free-kids-english-test', teachers: 'teach-with-us' };

function originOf(request) {
  var o = request.headers.get('Origin') || request.headers.get('Referer') || '';
  if (!o) { return ''; }
  try { return new URL(o).origin; } catch (e) { return ''; }
}

function corsHeaders(allowed) {
  return {
    'Access-Control-Allow-Origin': allowed || 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function reply(obj, status, allowed) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(allowed))
  });
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
}

function clamp(s, n) {
  s = String(s == null ? '' : s);
  return s.length > n ? s.slice(0, n) : s;
}

function emailHtml(d) {
  var label = TEST_NAMES[d.test] || 'free English level test';
  var count = d.count || COUNTS[d.test] || 0;
  var what = d.test === 'teachers'
    ? '<p>Thank you for registering your interest in teaching with Articulate English. ' +
      'We will reply from hello@articulate.ee with the current terms and, if it looks like a fit, a short call.</p>'
    : '<p>Thank you for taking the free ' + esc(label) + '. Here is what we found.</p>' +
      '<p style="font-size:26px;font-weight:bold;color:#0d9488;margin:6px 0">Estimated level: ' + esc(d.level) + '</p>' +
      '<p style="margin:4px 0">' + esc(d.score) + '</p>' +
      '<p style="color:#475569;font-size:13px">Breakdown by band: ' + esc(d.breaks) + '</p>' +
      '<p>This is an indicator from ' + count + ' questions, not a certified assessment. It does not test speaking, ' +
      'which is where most learners discover the real gap.</p>' +
      '<h2 style="font-size:16px;margin:18px 0 6px">Your next step</h2>' +
      '<p>We offer <strong>two free 20-minute intro sessions each week</strong> to people we think will get ' +
      'real value from the course. Reply to this email with your result and two times that suit you, and we ' +
      'will confirm one of them.</p>';
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.6">' +
    '<h1 style="font-size:20px;margin:0 0 6px">' + (d.test === 'teachers' ? 'Teaching with Articulate English' : 'Your English level result') + '</h1>' +
    what +
    '<p><a href="https://articulate-english.github.io/articulate-english/index.html#pricing" ' +
    'style="background:#0d9488;color:#fff;padding:11px 18px;border-radius:8px;text-decoration:none;display:inline-block">' +
    (d.test === 'teachers' ? 'About the school' : 'See the packages') + '</a></p>' +
    '<p style="color:#64748b;font-size:13px;margin-top:22px">Articulate English &middot; 1:1 online English lessons<br>' +
    'You received this because you asked for it. ' +
    '<a href="https://articulate-english.github.io/articulate-english/privacy.html">Privacy policy</a></p>' +
    '</div>';
}

function bumpLimit(key, n) {
  var put = new Request('https://limit/' + key, { method: 'PUT' });
  var h = new Headers({ 'x-count': String(n + 1), 'Cache-Control': 'max-age=600' });
  return caches.default.put(put, new Response(null, { status: 204, headers: h })).catch(function () {});
}

export default {
  fetch: function (request, env) {
    var allowedOrigin = env.ALLOWED_ORIGIN || DEFAULT_ORIGIN;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }
    if (request.method !== 'POST') {
      return reply({ error: 'Method not allowed' }, 405, allowedOrigin);
    }

    var origin = originOf(request);
    if (origin && origin !== allowedOrigin &&
        !/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) &&
        origin !== 'http://localhost') {
      return reply({ error: 'Not allowed' }, 403, allowedOrigin);
    }

    return request.text().then(function (raw) {
      if (raw.length > 8192) { return reply({ error: 'Request too large.' }, 413, allowedOrigin); }

      var body;
      try { body = JSON.parse(raw); } catch (e) { return reply({ error: 'Invalid request.' }, 400, allowedOrigin); }
      body = body || {};

      if (body.website) { return reply({ ok: true }, 200, allowedOrigin); }   /* honeypot */

      var email = String(body.email || '').trim().toLowerCase();

      if (!validEmail(email)) { return reply({ error: 'Please check the email address.' }, 400, allowedOrigin); }
      if (!body.wantResult) { return reply({ error: 'Consent to send the result is required.' }, 400, allowedOrigin); }
      if (!env.BREVO_API_KEY || !env.BREVO_LIST_ID || !env.FROM_EMAIL) {
        return reply({ error: 'Server is not configured yet.' }, 500, allowedOrigin);
      }

      var testKey = TEST_NAMES[body.test] ? body.test : 'general';
      var level = clamp(body.level, 40);
      var score = clamp(body.score, 60);
      var breaks = clamp(body.breaks, 200);
      var count = COUNTS[testKey] || 0;

      var rlKey = 'rl:' + email;
      return caches.default.match(new Request('https://limit/' + rlKey)).then(function (hit) {
        var n = hit ? parseInt(hit.headers.get('x-count') || '0', 10) : 0;
        if (n >= 5) { return reply({ error: 'Too many attempts — please try again later.' }, 429, allowedOrigin); }

        var now = new Date().toISOString();
        var headers = {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': env.BREVO_API_KEY
        };

        var contact = {
          email: email,
          attributes: {
            TEST_TAKEN: testKey,
            TEST_LEVEL: level,
            TEST_SCORE: score,
            TEST_DATE: now.slice(0, 10),
            MARKETING_OPT_IN: body.wantMarketing ? 'YES' : 'NO',
            CONSENT_DATE: now,
            CONSENT_SOURCE: SOURCES[testKey] || 'website'
          },
          listIds: [parseInt(env.BREVO_LIST_ID, 10)],
          updateEnabled: true
        };

        return fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST', headers: headers, body: JSON.stringify(contact)
        }).then(function (r) {
          return r.text().then(function () { return r.ok; });
        }).then(function (ok) {
          if (!ok) { return reply({ error: 'Could not save your details. Please try again.' }, 502, allowedOrigin); }

          var mail = {
            sender: { name: 'Articulate English', email: env.FROM_EMAIL },
            to: [{ email: email }],
            replyTo: { email: env.FROM_EMAIL, name: 'Articulate English' },
            subject: testKey === 'teachers'
              ? 'Teaching with Articulate English — registration received'
              : 'Your English level result — Articulate English',
            htmlContent: emailHtml({ test: testKey, level: level, score: score, breaks: breaks, count: count })
          };

          return fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST', headers: headers, body: JSON.stringify(mail)
          }).then(function (r2) {
            return r2.text().then(function () { return r2.ok; });
          }).then(function (ok2) {
            if (!ok2) { return reply({ error: 'Saved, but the email could not be sent. Please try again.' }, 502, allowedOrigin); }
            bumpLimit(rlKey, n);
            return reply({ ok: true }, 200, allowedOrigin);
          });
        });
      });
    }).catch(function () {
      return reply({ error: 'Something went wrong. Please try again.' }, 500, allowedOrigin);
    });
  }
};
