/* ==========================================================================
   Articulate English — test result signup worker
   --------------------------------------------------------------------------
   Receives the result-email form from a static page on GitHub Pages and:
     1. writes the contact (plus the consent record) into Brevo
     2. sends the result email

   Deploy: Cloudflare dashboard → Workers & Pages → Create a Worker →
           paste this file → Deploy. Then set the secrets below and put the
           Worker URL into site-config.js as ARTICULATE.workerEndpoint.

   Secrets (Workers → Settings → Variables):
     BREVO_API_KEY   Brevo → SMTP & API → API keys
     BREVO_LIST_ID   numeric id of the list to add contacts to
     FROM_EMAIL      a verified sender address in your Brevo account
   ========================================================================== */

var CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

function reply(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS)
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

var EMAIL_HTML = function (d) {
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.6">' +
    '<h1 style="font-size:20px;margin:0 0 6px">Your English level result</h1>' +
    '<p>Thank you for taking the free Articulate English level test. Here is what we found.</p>' +
    '<p style="font-size:26px;font-weight:bold;color:#0d9488;margin:6px 0">Estimated level: ' + esc(d.level) + '</p>' +
    '<p style="margin:4px 0">' + esc(d.score) + '</p>' +
    '<p style="color:#475569;font-size:13px">Breakdown by band: ' + esc(d.breaks) + '</p>' +
    '<p>This is an indicator from 32 questions, not a certified assessment. It does not test speaking, ' +
    'which is where most learners discover the real gap.</p>' +
    '<h2 style="font-size:16px;margin:18px 0 6px">Your next step</h2>' +
    '<p>We offer <strong>two free 20-minute intro sessions each week</strong> to people we think will get ' +
    'real value from the course. Reply to this email with your result and two times that suit you, and we ' +
    'will confirm one of them.</p>' +
    '<p><a href="https://articulate-english.github.io/articulate-english/index.html#pricing" ' +
    'style="background:#0d9488;color:#fff;padding:11px 18px;border-radius:8px;text-decoration:none;display:inline-block">See the packages</a></p>' +
    '<p style="color:#64748b;font-size:13px;margin-top:22px">Articulate English · 1:1 online English lessons<br>' +
    'You received this because you asked for your result. ' +
    '<a href="https://articulate-english.github.io/articulate-english/privacy.html">Privacy policy</a></p>' +
    '</div>';
};

export default {
  fetch: function (request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== 'POST') {
      return reply({ error: 'Method not allowed' }, 405);
    }
    return request.json().then(function (b) {
      return handle(b, env);
    }).catch(function () {
      return reply({ error: 'Invalid JSON body' }, 400);
    });
  }
};

function handle(body, env) {
  body = body || {};
  var email = String(body.email || '').trim().toLowerCase();

  if (!validEmail(email)) return reply({ error: 'Please check the email address.' }, 400);
  if (!body.wantResult) return reply({ error: 'Consent to send the result is required.' }, 400);
  if (!env.BREVO_API_KEY) return reply({ error: 'Server is not configured yet.' }, 500);

  var now = new Date().toISOString();
  var listId = parseInt(env.BREVO_LIST_ID || '1', 10);

  var attributes = {
    TEST_TAKEN: body.test || 'general',
    TEST_LEVEL: body.level || '',
    TEST_SCORE: body.score || '',
    TEST_DATE: now.slice(0, 10),
    MARKETING_OPT_IN: body.wantMarketing ? 'YES' : 'NO',
    CONSENT_DATE: now,
    CONSENT_SOURCE: 'free-english-level-test'
  };

  var headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    'api-key': env.BREVO_API_KEY
  };

  var contact = {
    email: email,
    attributes: attributes,
    listIds: [listId],
    updateEnabled: true
  };

  return fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(contact)
  }).then(function (r) {
    return r.text().then(function (t) { return { ok: r.ok, status: r.status, body: t }; });
  }).then(function (res) {
    if (!res.ok) {
      return reply({ error: 'Could not save the contact (Brevo ' + res.status + ').' }, 502);
    }

    var mail = {
      sender: { name: 'Articulate English', email: env.FROM_EMAIL || 'hello@articulate.ee' },
      to: [{ email: email }],
      replyTo: { email: 'hello@articulate.ee', name: 'Articulate English' },
      subject: 'Your English level result — Articulate English',
      htmlContent: EMAIL_HTML({
        level: body.level,
        score: body.score,
        breaks: body.breaks
      })
    };

    return fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(mail)
    }).then(function (r2) {
      return r2.text().then(function (t2) { return { ok: r2.ok, status: r2.status, body: t2 }; });
    }).then(function (res2) {
      if (!res2.ok) {
        return reply({ error: 'Saved, but the email failed to send (Brevo ' + res2.status + ').' }, 502);
      }
      return reply({ ok: true });
    });
  });
}
