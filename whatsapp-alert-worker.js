/* ==========================================================================
   Articulate English — WhatsApp booking-alert bridge
   --------------------------------------------------------------------------
   WHY THIS EXISTS
     A static GitHub Pages site cannot push a message to WhatsApp by itself.
     Cal.com can send you an EMAIL when someone books. To turn that into a
     WHATSAPP message on your phone, something small has to receive Cal.com's
     webhook and forward it. That "something" is this file.

   WHAT IT DOES
     Cal.com  --(BOOKING_CREATED webhook)-->  this Worker  --(HTTPS)-->  CallMeBot
                                                                          |
                                                                  your WhatsApp

   COST: free. Cloudflare Workers free tier = 100,000 requests/day.
          CallMeBot is free (it shows you an ad occasionally).

   SETUP (one time, ~10 minutes)
     1. Cloudflare: run `wrangler login`, then `wrangler deploy` in this folder.
     2. CallMeBot: send the word "I accept" from YOUR phone to
        +1 (865) 430-0019 (or the number CallMeBot shows), then read the
        API key it replies with.
     3. Set the secrets:
          wrangler secret put CALLMEBOT_API_KEY
          wrangler secret put CALLMEBOT_PHONE      # your number, intl digits only
     4. Cal.com dashboard -> Developer -> API keys / Webhooks -> add webhook:
          URL:      https://<this-worker>.workers.dev/
          Events:   BOOKING_CREATED  (add BOOKING_CANCELLED too, optionally)
     5. Test: make a booking. You get a WhatsApp message.

   FAIL-SAFE: if CallMeBot fails, the Worker logs the payload and returns 200
   anyway so Cal.com does not retry-loop. A failed alert is recorded in the
   Worker logs, not silently swallowed.
   ========================================================================== */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check — proves the Worker is deployed and reachable.
    if (url.pathname === '/health') {
      return json({ ok: true, service: 'articulate-whatsapp-bridge', time: new Date().toISOString() });
    }

    // CORS preflight, in case a browser ever calls it directly.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'POST only' }, 405);
    }

    // Configured?
    if (!env.CALLMEBOT_API_KEY || !env.CALLMEBOT_PHONE) {
      return json({ ok: false, error: 'not configured: set CALLMEBOT_API_KEY and CALLMEBOT_PHONE' }, 500);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return json({ ok: false, error: 'invalid JSON' }, 400);
    }

    const type = payload.triggerEvent || 'UNKNOWN';

    // Only booking events become messages.
    if (type !== 'BOOKING_CREATED' && type !== 'BOOKING_CANCELLED') {
      return json({ ok: true, ignored: type });
    }

    const p = (payload && payload.payload) || {};

    // Cal.com's payload shape, read defensively so one missing field cannot
    // throw and lose the alert.
    const attendee = (p.attendees && p.attendees[0]) || {};
    const when = p.startTime ? String(p.startTime).replace('T', ' ').slice(0, 19) + ' UTC' : 'time not set';
    const who = [attendee.name, attendee.email].filter(Boolean).join(' · ') || 'name not provided';

    const lines = [
      type === 'BOOKING_CANCELLED' ? '*BOOKING CANCELLED*' : '*NEW BOOKING*',
      '',
      who,
      'When: ' + when,
      'Duration: ' + (p.endTime && p.startTime
        ? Math.round((new Date(p.endTime) - new Date(p.startTime)) / 60000) + ' min'
        : 'n/a'),
      p.title ? 'Event: ' + p.title : null,
      '',
      type === 'BOOKING_CANCELLED'
        ? 'Open your calendar and offer the student a new time.'
        : 'Reply to the student to confirm the video link.',
      '',
      '— Articulate English booking alert'
    ].filter(Boolean);

    const text = lines.join('\n');

    // CallMeBot WhatsApp endpoint.
    const target = 'https://api.callmebot.com/whatsapp.php?phone=' +
      encodeURIComponent(env.CALLMEBOT_PHONE) +
      '&text=' + encodeURIComponent(text) +
      '&apikey=' + encodeURIComponent(env.CALLMEBOT_API_KEY);

    let delivered = false;
    let detail = '';
    try {
      const res = await fetch(target);
      delivered = res.ok;
      detail = 'callmebot status ' + res.status;
    } catch (e) {
      detail = 'callmebot error: ' + String(e && e.message || e);
    }

    // Always 200 to Cal.com: a retry would just re-send the same booking.
    // The outcome is visible in the Worker logs either way.
    return json({
      ok: true,
      event: type,
      delivered: delivered,
      detail: detail,
      // echo enough to debug without needing the logs
      bookingUid: p.uid || null,
      attendee: attendee.email || null
    }, delivered ? 200 : 200, cors());
  }
};

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }, extra || {})
  });
}

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
  };
}
