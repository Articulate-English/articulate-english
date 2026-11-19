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
   ==========================================================================

   SWISS / EU SETUP
   --------------------------------------------------------------------------
   Paystack settles to ZAR (South African Rand) by default — fine for
   USD/SA clients, but Swiss and EU clients expect to pay in CHF / EUR.

   For CHF and EUR clients the page routes to Stripe Checkout (redirect-based,
   SCA-compliant). Paste your Stripe publishable key here:

       https://dashboard.stripe.com/api-keys  →  "Publishable key"

   Paystack stays active for USD. If you prefer PayPal for EU/CHF instead
   of Stripe, paste your PayPal.Me link in paypalUrl — it takes priority
   over Stripe when present.
   ========================================================================== */

window.ARTICULATE = {

  /* ── Brand ─────────────────────────────────────────────────────────── */
  brand:        'Articulate English',
  email:        'hello@articulate.ee',
  phoneDisplay: '+27 67 177 6770',  // shown on the Impressum

  /* ── BOOKING ─────────────────────────────────────────────────────────
     Your Cal.com booking link. Find it in the Cal.com dashboard:
     Booking Links -> your event -> "Copy link"  (looks like
     https://cal.com/<your-username>/<event-slug> )                            */
  bookingUrl:   'https://cal.com/williamthomason/15-30-45-or-60-minute-sessions',
  /* Cloudflare Worker that records the test signup in Brevo and emails the
     result. Empty = the form says honestly that it is not set up yet. */
  workerEndpoint: '',

  /* ── WHATSAPP ────────────────────────────────────────────────────────
     Your WhatsApp number in international format, digits only.
     Example: South Africa 082 123 4567  ->  '27821234567'
     This powers BOTH the contact button and the booking deep-link.        */
  whatsappNumber: '',

  /* ── PAYMENTS ────────────────────────────────────────────────────────
     PayPal:  a PayPal.Me link  ->  https://paypal.me/<your-slug>/<amount>
              or a PayPal hosted-button / Payment Link from your dashboard.
              Takes priority for EUR/CHF clients when present.
     Paystack: Public key from the Paystack dashboard
              (Settings → API Keys → "Public Key"). Starts with pk_live_
              or pk_test_. Enables inline card/EFT checkout on USD tier
              buttons; amount is set per-tier in the prices object below.
     Stripe:  Publishable key from the Stripe dashboard
              (Developers → API keys → "Publishable key"). Starts with
              pk_live_ or pk_test_. Powers the EUR/CHF redirect Checkout
              for Swiss and EU clients (Paystack settles ZAR only).
   At least one payment key is needed to take live payments. Leave all
   empty for the honest on-request state.                                 */
  paypalUrl:          'https://paypal.me/ArticulateEnglish',
  /* One PayPal.Me link per currency — a single link serves every deck and
     every package in that currency, because the amount is appended to the
     URL. Only needed if the links differ by currency. */
  paypalUrls: {
    usd: '', eur: '', chf: '', zar: ''
  },
  paystackUrl:        '',
  paystackPublicKey:  'pk_test_8373ee5f0e47b5da3189e8bff1d9e1edd0859662',
  stripePublishableKey: '',

  /* ── Bank transfer (Wise EUR account) ───────────────────────────────
     Shown on the pricing page as a zero-fee alternative to PayPal.
     Fill these from your Wise account → EUR → "Account details".       */
  bankDetails: {
    name:      'William Thomason',
    iban:      'BE69 9673 0036 2078',
    swift:     'TRWIBEB1XXX',
    reference: 'Your invoice number and full name'
  },

  /* ── Pricing (multi-currency for Swiss/EU/US) ──────────────────────
     Each currency has: symbol, ISO code, payment rail, and three tiers.
     Cents = smallest unit (cents for USD/EUR, Rappen for CHF).
     Rail: 'paystack' = inline modal | 'mor' = hosted checkout (Merchant of Record) | 'stripe' = redirect Checkout
     Currency auto-detects from browser locale; URL ?cur= overrides.        */
  prices: {
    usd: { symbol: '$',   code: 'USD', rail: 'paypal',  tiers: {
      starter:      { label: 'Starter',      amount: 120,  cents: 12000,  sessions: 4,  note: '4 lessons per month' },
      professional: { label: 'Professional', amount: 312,  cents: 31200,  sessions: 8,  note: '8 lessons per month' },
      intensive:    { label: 'Intensive',    amount: 768,  cents: 76800,  sessions: 16, note: 'accelerated progress' }
    }},
    eur: { symbol: '€',   code: 'EUR', rail: 'mor',    tiers: {
      starter:      { label: 'Starter',      amount: 120,  cents: 12000,  sessions: 4,  note: '4 lessons per month' },
      professional: { label: 'Professional', amount: 312,  cents: 31200,  sessions: 8,  note: '8 lessons per month' },
      intensive:    { label: 'Intensive',    amount: 768,  cents: 76800,  sessions: 16, note: 'accelerated progress' }
    }},
    chf: { symbol: 'CHF', code: 'CHF', rail: 'mor',    tiers: {
      starter:      { label: 'Starter',      amount: 168,  cents: 16800,  sessions: 4,  note: '4 lessons per month' },
      professional: { label: 'Professional', amount: 432,  cents: 43200,  sessions: 8,  note: '8 lessons per month' },
      intensive:    { label: 'Intensive',    amount: 1056, cents: 105600, sessions: 16, note: 'accelerated progress' }
    }},
    zar: { symbol: 'R',   code: 'ZAR', rail: 'paystack', tiers: {
      starter:      { label: 'Starter',      amount: 720,  cents: 72000,  sessions: 4,  note: '4 lessons per month' },
      professional: { label: 'Professional', amount: 1840, cents: 184000, sessions: 8,  note: '8 lessons per month' },
      intensive:    { label: 'Intensive',    amount: 4480, cents: 448000, sessions: 16, note: 'accelerated progress' }
    }}
  },

  /* ── Hosted checkouts (Merchant of Record) ──────────────────────────
     EUR and CHF are routed to a Merchant of Record so the platform is the
     seller of record and handles EU/Swiss VAT. Paste one checkout URL per
     tier per currency; empty string = honest "on request" fallback.

     NOTE: most MoR platforms (Paddle, Lemon Squeezy, Polar, Creem, Dodo)
     restrict sellers to software/digital products and do NOT accept 1:1
     tutoring or coaching services. If yours rejects services, the realistic
     routes are an EU/UK entity with Stripe, or invoicing EUR clients.
     Wiring is here so either route works.                              */
  hostedCheckouts: {
    eur: { starter: '', professional: '', intensive: '' },
    chf: { starter: '', professional: '', intensive: '' }
  },
     /* ── Lock-in discount (12-month commitment) ────────────────────────
     SaaS-norm: 2 months free (~16.7% off). Applied as a coupon code until
     Paystack/Stripe coupon wiring lands. Code is informational for now.     */
  lockInCoupon:   'LOCK12',
  lockInMonths:   12,
  lockInFreeMonths: 2,


/* ── Corporate tiers (also multi-currency) ──────────────────────────
     Per-session corporate rates. cents = per-session in smallest unit. */
  corporate: {
    usd: { symbol: '$',   code: 'USD', tiers: {
      team:     { label: 'Team',     amount: 35,  cents: 3500,  seats: 10,  mo: 2500 },
      business: { label: 'Business', amount: 45,  cents: 4500,  seats: 50,  mo: 8500 },
      enterprise:{ label: 'Enterprise', amount: 75, cents: 7500,  seats: 999, mo: 0 }
    }},
    eur: { symbol: '€',   code: 'EUR', tiers: {
      team:     { label: 'Team',     amount: 30,  cents: 3000,  seats: 10,  mo: 2200 },
      business: { label: 'Business', amount: 40,  cents: 4000,  seats: 50,  mo: 7500 },
      enterprise:{ label: 'Enterprise', amount: 65, cents: 6500,  seats: 999, mo: 0 }
    }},
    chf: { symbol: 'CHF', code: 'CHF', tiers: {
      team:     { label: 'Team',     amount: 40,  cents: 4000,  seats: 10,  mo: 3800 },
      business: { label: 'Business', amount: 55,  cents: 5500,  seats: 50,  mo: 7200 },
      enterprise:{ label: 'Enterprise', amount: 90, cents: 9000,  seats: 999, mo: 0 }
    }}
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
    // Currency-specific PayPal.Me link wins; the single paypalUrl is the
    // fallback. One link per currency serves every deck and every package,
    // because the amount is appended to the URL.
    var url = '';
    var cur = A.detectCurrency();
    if (A.paypalUrls && A.paypalUrls[cur]) url = A.paypalUrls[cur];
    else if (A.paypalUrl) url = A.paypalUrl;
    if (!url) return '';
    // PayPal.Me links accept /<amount>; hosted buttons do not. Append only
    // when the URL is a paypal.me link and no amount is already present.
    if (/\/paypal\.me\//i.test(url) && amount && !/\d([A-Z]{3})?\/?$/.test(url)) {
      /* PayPal.Me accepts /<amount><currency>, e.g. /39EUR — so ONE link
         serves every currency we quote, and the client is charged in their
         own currency instead of a converted default. */
      var cur=(A.detectCurrency()||'').toUpperCase();
      return url.replace(/\/?$/, '/') + amount + cur;
    }
    return url;
  };

  A.paystackLink = function () { return A.paystackUrl || ''; };

  /* ── Multi-currency helpers (Swiss/EU/US) ─────────────────────────── */

  /* Currency auto-detection from browser locale.
     Override with ?cur=usd|eur|chf in the URL.                           */
  A.detectCurrency = function () {
    var m = location.search.match(/(?:^|&)cur=([a-z]{3})/i);
    if (m && A.prices[m[1].toLowerCase()]) return m[1].toLowerCase();
    var loc = (navigator.language || 'en-US').toLowerCase();
    // de-CH, fr-CH, it-CH, rm-CH → Swiss franc
    if (loc.indexOf('-ch') > 0) return 'chf';
    // South African locales → rand (Paystack SA rail)
    if (loc.indexOf('-za') > 0) return 'zar';
    // EU locales → Euro
    var eu = ['-de','-at','-fr','-es','-it','-nl','-be','-pt','-fi','-ie','-sk','-si','-lv','-lt','-ee','-cy','-gr','-lu'];
    if (eu.some(function(e){ return loc.indexOf(e) > 0; })) return 'eur';
    return 'usd';
  };

  /* Convenience: get the price object for the detected currency.       */
  A.currency = function () { return A.prices[A.detectCurrency()] || A.prices.usd; };

  /* Format a cents value into the local currency string.
     $200  | 180€ | CHF 400                                          */
  A.formatPrice = function (cents) {
    var p = A.currency();
    var amount = (cents / 100).toFixed(p.code === 'CHF' ? 0 : 2).replace(/\.00$/, '');
    if (p.symbol === '$')    return '$' + amount;
    if (p.symbol === '€')    return amount + '€';
    if (p.symbol === 'R')    return 'R ' + amount;
    return p.symbol + ' ' + amount;            // CHF 400
  };

  /* Get a tier's data for the current currency. */
  A.tier = function (tierName) {
    return A.currency().tiers[tierName] || null;
  };

  /* Hosted checkout URL (Merchant of Record) for a currency + tier.      */
  A.hostedCheckout = function (tierName) {
    var cur = A.detectCurrency();
    var map = A.hostedCheckouts || {};
    return (map[cur] && map[cur][tierName]) || '';
  };

  /* Determine which payment provider to use for the current currency.
     Returns: 'paystack' | 'mor' | 'stripe' | 'paypal' | 'none'          */
  A.paymentRail = function () {
    var p = A.currency();
    if (p.rail === 'paystack' && A.paystackPublicKey) return 'paystack';
    if (p.rail === 'mor') {
      var any = ['starter', 'professional', 'intensive'].some(function (t) {
        return !!A.hostedCheckout(t);
      });
      if (any)                                          return 'mor';
      if (A.paypalUrl)                                  return 'paypal';
    }
    if (p.rail === 'stripe') {
      if (A.paypalUrl)                              return 'paypal';
      if (A.stripePublishableKey)                   return 'stripe';
    }
    // Fallback: any client can use PayPal if configured
    if (A.paypalUrl) return 'paypal';
    return 'none';
  };

  /* Mark every CTA that has no destination yet, so the page can render it
     honestly instead of shipping a dead "#" link.                     */
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

    /* Fill in dynamic prices on pricing cards (multi-currency).
       Each tier button has data-tier="starter|professional|intensive"
       Each price-amount has data-tier-amount="starter|..."
       Each price-note has a <span data-currency-total="tier"> inside it.  */
    var priceTiers = ['starter', 'professional', 'intensive'];
    priceTiers.forEach(function (tierName) {
      var tier = A.tier(tierName);
      if (!tier) return;
      var p = A.currency();

      // Update every per-session price-amount span (pricing cards + comparison table)
      var amountSpans = document.querySelectorAll('[data-tier-amount="' + tierName + '"]');
      Array.prototype.forEach.call(amountSpans, function (amountSpan) {
        var perSession = tier.sessions ? (tier.amount / tier.sessions) : tier.amount;
        amountSpan.textContent = perSession.toFixed(p.code === 'CHF' ? 0 : 2).replace(/\.00$/, '');
      });

      // Update the currency symbol inside the price-amount .currency span
      var symSpan = document.querySelector('.price-card[data-tier-card="' + tierName + '"] .price-amount .currency');
      if (symSpan) {
        symSpan.textContent = p.symbol;
        if (p.symbol === 'CHF') symSpan.style.marginRight = '0.25em';
      }
      // Comparison-table currency symbol follows the selected currency too
      var compSym = document.querySelector('.comp-currency');
      if (compSym) {
        compSym.textContent = p.symbol;
        if (p.symbol === 'CHF') compSym.style.marginRight = '0.25em';
      }

      // Update the price total span inside the price-note
      var totalSpan = document.querySelector('[data-currency-total="' + tierName + '"]');
      if (totalSpan) {
        totalSpan.textContent = A.formatPrice(tier.cents);
      }

      // Set the button's data-amount to match the tier cents for the current currency
      var btn = document.querySelector('[data-tier="' + tierName + '"]');
      if (btn) {
        btn.setAttribute('data-amount', tier.cents);
      }
    });

    /* Render the "Ways to pay" block (PayPal + bank transfer) if present. */
    var po = document.getElementById('pay-options-body');
    if (po) {
      var esc = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
      };
      var email = A.email || '';
      var html = '';
      if (A.paypalUrl) {
        html += '<div class="po"><div><h3>PayPal</h3><p>Card or PayPal balance — <a href="' +
                esc(A.paypalUrl) + '" target="_blank" rel="noopener">open PayPal</a>.</p></div></div>';
      } else {
        html += '<div class="po"><div><h3>PayPal</h3><p>On request — email <a href="mailto:' +
                esc(email) + '">' + esc(email) + '</a> and we will send a secure payment link.</p></div></div>';
      }
      var bd = A.bankDetails || {};
      if (bd.iban) {
        html += '<div class="po"><div><h3>Bank transfer (EUR, via Wise)</h3><p>' +
                '<strong>' + esc(bd.name || 'Articulate English') + '</strong><br>' +
                'IBAN: <code>' + esc(bd.iban) + '</code><br>' +
                'SWIFT/BIC: <code>' + esc(bd.swift) + '</code>' +
                (bd.reference ? '<br>Reference: <code>' + esc(bd.reference) + '</code>' : '') +
                '<br><span style="opacity:.75">Send in EUR from an EU bank (SEPA) and put your invoice number in the reference. ' +
                'Email <a href="mailto:' + esc(email) + '">' + esc(email) +
                '</a> your transfer receipt and we will book your first lesson.</span></p></div></div>';
      } else {
        html += '<div class="po"><div><h3>Bank transfer (EUR, via Wise)</h3><p>On request — we will send our EUR account details by email.</p></div></div>';
      }
      po.innerHTML = html;
    }

    /* Initialise currency selector in footer */
    var currSelect = document.getElementById('currencySelect');
    if (currSelect) {
      var current = A.detectCurrency();
      currSelect.value = current;
      currSelect.addEventListener('change', function () {
        var val = this.value;
        if (val === 'auto') {
          // Remove ?cur= param and reload
          var url = new URL(window.location.href);
          url.searchParams.delete('cur');
          window.location.href = url.toString();
        } else {
          window.location.href = window.location.pathname + '?cur=' + val;
        }
      });
    }
    var corpTiers = ['team', 'business', 'enterprise'];
    corpTiers.forEach(function (tierName) {
      var corp = (A.corporate && A.corporate[A.detectCurrency()] &&
                  A.corporate[A.detectCurrency()].tiers[tierName]);
      if (!corp) return;
      /* Only the per-session span is updated — writing textContent on the
         container would wipe the "/session" label next to it. */
      var perEl = document.querySelector('[data-corp-per="' + tierName + '"]');
      if (perEl) {
        perEl.textContent = A.formatPrice(corp.cents);
      }
    });
  });
})();
