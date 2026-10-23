/* ==========================================================================
   Articulate English — SITE CONFIG
   --------------------------------------------------------------------------
   THIS IS THE ONLY FILE YOU EDIT to make the site take real bookings, real
   money and real WhatsApp alerts.

   Every CTA on the site reads from here. Paste your real values in, and the
   whole site activates at once — no HTML edits needed.

   Rules:
   - Paste the FULL URL exactly as your provider gives it (including https://)
   - For WhatsApp: international format, digits only, NO + and NO spaces
   - Leave a value as "" and that CTA renders as an honest "on request" state
     instead of a dead link. Never invent a URL.
   ========================================================================== */

window.ARTICULATE = {

  /* ── Brand ─────────────────────────────────────────────────────────── */
  brand:        'Articulate English',
  email:        'hello@articulate.ee',
  phoneDisplay: '',              // e.g. '+27 82 123 4567' — shown on the Impressum

  /* ── BOOKING ─────────────────────────────────────────────────────────
     Your Cal.com booking link. Find it in the Cal.com dashboard:
     Booking Links -> your event -> "Copy link"  (looks like
     https://cal.com/<your-username>/<event-slug> )
     The old value https://app.cal.com/william-o8lcqk now 404s.            */
  bookingUrl:   '',

  /* ── WHATSAPP ────────────────────────────────────────────────────────
     Your WhatsApp number in international format, digits only.
     Example: South Africa 082 123 4567  ->  '27821234567'
     This powers BOTH the contact button and the booking deep-link.        */
  whatsappNumber: '',

  /* ── PAYMENTS ────────────────────────────────────────────────────────
     PayPal:  a PayPal.Me link  ->  https://paypal.me/<your-slug>/<amount>
              or a PayPal hosted-button / Payment Link from your dashboard.
     Paystack: a Payment Link from the Paystack dashboard
              (Payment Pages -> create -> copy the public link).
              Supports ZAR, Visa/Mastercard and EFT. No code needed.       */
  paypalUrl:    '',
  paystackUrl:  '',

  /* ── Pricing shown on the page (keep in sync with your real rates) ──── */
  prices: {
    standard: { label: 'Standard',    amount: 80,  currency: 'USD', period: '/month', note: '4 lessons per month' },
    intensive:{ label: 'Intensive',   amount: 150, currency: 'USD', period: '/month', note: '8 lessons per month' }
  }

};

/* ── Derived helpers (do not edit) ─────────────────────────────────────── */
(function () {
  var A = window.ARTICULATE;

  A.whatsappLink = function (text) {
    if (!A.whatsappNumber) return '';
    return 'https://wa.me/' + A.whatsappNumber +
           '?text=' + encodeURIComponent(text || ('Hi ' + A.brand + ', I would like to book a free trial lesson.'));
  };

  A.paypalLink = function (amount, note) {
    if (!A.paypalUrl) return '';
    // PayPal.Me links accept /<amount>; hosted buttons do not. Append only
    // when the URL is a paypal.me link and no amount is already present.
    if (/\/paypal\.me\//i.test(A.paypalUrl) && amount && !/\d\.\d\d\/?$/.test(A.paypalUrl)) {
      return A.paypalUrl.replace(/\/?$/, '/') + amount;
    }
    return A.paypalUrl;
  };

  A.paystackLink = function () { return A.paystackUrl || ''; };

  /* Mark every CTA that has no destination yet, so the page can render it
     honestly instead of shipping a dead "#" link. */
  document.addEventListener('DOMContentLoaded', function () {
    var map = [
      { sel: '[data-book]',   url: A.bookingUrl,        label: 'Booking opens shortly' },
      { sel: '[data-paypal]', url: A.paypalLink(),     label: 'PayPal — on request' },
      { sel: '[data-paystack]', url: A.paystackLink(),  label: 'Card / EFT — on request' },
      { sel: '[data-whatsapp]', url: A.whatsappLink(),  label: 'WhatsApp — on request' }
    ];
    map.forEach(function (m) {
      var els = document.querySelectorAll(m.sel);
      Array.prototype.forEach.call(els, function (el) {
        if (m.url) {
          el.setAttribute('href', m.url);
          el.setAttribute('data-wired', 'true');
        } else {
          el.setAttribute('aria-disabled', 'true');
          el.setAttribute('data-wired', 'false');
          el.setAttribute('title', m.label);
          // keep it a link for styling, but never navigate nowhere
          el.removeAttribute('href');
        }
      });
    });
  });
})();
