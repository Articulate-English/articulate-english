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
  phoneDisplay: '',              // e.g. '+27 82 123 4567' — shown on the Impressum

  /* ── BOOKING ─────────────────────────────────────────────────────────
     Your Cal.com booking link. Find it in the Cal.com dashboard:
     Booking Links -> your event -> "Copy link"  (looks like
     https://cal.com/<your-username>/<event-slug> )                            */
  bookingUrl:   'https://cal.com/williamthomason/15-30-45-or-60-minute-sessions',

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
  paypalUrl:          '',
  paystackUrl:        '',
  paystackPublicKey:  '',
  stripePublishableKey: '',

  /* ── Pricing (multi-currency for Swiss/EU/US) ──────────────────────
     Each currency has: symbol, ISO code, payment rail, and three tiers.
     Cents = smallest unit (cents for USD/EUR, Rappen for CHF).
     Rail: 'paystack' = inline modal | 'stripe' = redirect Checkout
     Currency auto-detects from browser locale; URL ?cur= overrides.        */
  prices: {
    usd: { symbol: '$',   code: 'USD', rail: 'paystack', tiers: {
      starter:      { label: 'Starter',      amount: 200,  cents: 20000,  sessions: 4,  note: '4 lessons per month' },
      professional: { label: 'Professional', amount: 600,  cents: 60000,  sessions: 8,  note: '8 lessons per month' },
      intensive:    { label: 'Intensive',    amount: 1600, cents: 160000, sessions: 16, note: 'accelerated progress' }
    }},
    eur: { symbol: '€',   code: 'EUR', rail: 'stripe',  tiers: {
      starter:      { label: 'Starter',      amount: 180,  cents: 18000,  sessions: 4,  note: '4 lessons per month' },
      professional: { label: 'Professional', amount: 540,  cents: 54000,  sessions: 8,  note: '8 lessons per month' },
      intensive:    { label: 'Intensive',    amount: 1500, cents: 150000, sessions: 16, note: 'accelerated progress' }
    }},
    chf: { symbol: 'CHF', code: 'CHF', rail: 'stripe',  tiers: {
      starter:      { label: 'Starter',      amount: 400,  cents: 40000,  sessions: 4,  note: '4 lessons per month' },
      professional: { label: 'Professional', amount: 880,  cents: 88000,  sessions: 8,  note: '8 lessons per month' },
      intensive:    { label: 'Intensive',    amount: 1650, cents: 165000, sessions: 16, note: 'accelerated progress' }
    }}
  },

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
    if (!A.paypalUrl) return '';
    // PayPal.Me links accept /<amount>; hosted buttons do not. Append only
    // when the URL is a paypal.me link and no amount is already present.
    if (/\/paypal\.me\//i.test(A.paypalUrl) && amount && !/\d\.\d\d\/?$/.test(A.paypalUrl)) {
      return A.paypalUrl.replace(/\/?$/, '/') + amount;
    }
    return A.paypalUrl;
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
    return p.symbol + ' ' + amount;            // CHF 400
  };

  /* Get a tier's data for the current currency. */
  A.tier = function (tierName) {
    return A.currency().tiers[tierName] || null;
  };

  /* Determine which payment provider to use for the current currency.
     Returns: 'paystack' | 'stripe' | 'paypal' | 'none'                */
  A.paymentRail = function () {
    var p = A.currency();
    if (p.rail === 'paystack' && A.paystackPublicKey) return 'paystack';
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

      // Update the per-session price-amount span
      var amountSpan = document.querySelector('[data-tier-amount="' + tierName + '"]');
      if (amountSpan) {
        var perSession = tier.sessions ? (tier.amount / tier.sessions) : tier.amount;
        amountSpan.textContent = perSession.toFixed(p.code === 'CHF' ? 0 : 2).replace(/\.00$/, '');
      }

      // Update the currency symbol inside the price-amount .currency span
      var symSpan = document.querySelector('.price-card[data-tier-card="' + tierName + '"] .price-amount .currency');
      if (symSpan) {
        symSpan.textContent = p.symbol;
        if (p.symbol === 'CHF') symSpan.style.marginRight = '0.25em';
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
    corpTiers.forEach(function (tierName) {
      var corp = (A.corporate && A.corporate[A.detectCurrency()] &&
                  A.corporate[A.detectCurrency()].tiers[tierName]);
      if (!corp) return;
      var el = document.querySelector('[data-corp-price="' + tierName + '"]');
      if (el) {
        el.textContent = corp.symbol + ' ' + corp.amount;
      }
      var perEl = document.querySelector('[data-corp-per="' + tierName + '"]');
      if (perEl) {
        perEl.textContent = A.formatPrice(corp.cents);
      }
    });
  });
})();
