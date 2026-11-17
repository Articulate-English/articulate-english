# Articulate English — where we sell (payments + storefront)

Status: 2026-11-17. Companion to `ARTICULATE-BUSINESS-PLAN-2026-10.md`.

## Why Lemon Squeezy is out (two reasons, neither is "South Africa")

1. **Lemon Squeezy is shutting down.** It closed new store sign-ups and stops
   processing on **31 March 2027** (lemonsqueezy.com/blog/saying-goodbye-to-lemon-squeezy).
   Their docs still list South Africa as a supported payout country, so the
   refusal was the wind-down, not the country.
2. **Lemon Squeezy prohibits services.** Prohibited Products list includes
   "Services of any kind"; their store-approval doc says they "typically do not
   approve stores selling services or goods fulfilled outside of Lemon Squeezy".
   A 1:1 lesson school is a service.

Their migration path (Stripe Managed Payments) is **not available in South Africa**
— supported business locations are US/CA/UK/EU/AU/HK/JP/SG only.

## The real constraint

We sell **1:1 teacher lessons (a service)**. Almost every merchant-of-record
provider is digital-goods/software-only and refuses coaching and 1:1 services:
Paddle (AUP names coaching as refused), Polar, Dodo Payments, Creem, Whop,
Gumroad. Swapping one for another does not fix this.

## Decision

| What | Channel | Why |
|---|---|---|
| 1:1 lessons + lesson packages | **Paystack** | ZA-registered businesses, accepts services + digital, local methods (card, EFT, SnapScan, Apple Pay), ZAR, 2-day settlement, no monthly fee. Paystack is Stripe's African platform. |
| Downloadable decks / recorded courses / memberships | **Payhip** | Sells from ZA (connect Paystack or PayPal); explicitly allows courses, coaching, memberships AND physical products; handles EU/UK VAT. 5% free plan / 2% Plus / 0% Pro. |

Not viable: Stripe Managed Payments (no ZA), Paddle, Polar, Dodo, Creem, Whop
(all refuse services/coaching). Gumroad works for pure digital (ZAR bank payouts)
but is digital-only and takes 10%.

## Paystack — activate (lessons)

Already wired in the site; nothing is live yet because the keys are empty.

1. Create a Paystack account at paystack.com (ZA business) → Settings → API Keys.
2. Put the **public** key (`pk_live_…`) in `site-config.js` → `paystackPublicKey`
   (public value, safe to commit).
3. Put the **secret** key (`sk_live_…`) in `.env` → `PAYSTACK_SECRET_KEY`
   (gitignored; never commit or paste).
4. Test with `pk_test_` / `sk_test_` first.

Code already in place (this repo, local working copy):
- `landing.html` / `index.html`: the three plan buttons are wired to the gate
  (`data-pay` + `data-tier`; amount filled from `site-config.js`).
- `landing.html`: Paystack inline modal → **server-side verification** → only then
  redirect to Cal.com with `?paid=1&ref=…`.
- `server/signaling-server.js`: `POST /api/paystack/verify` confirms the transaction
  with Paystack (status + amount + currency) before the booking is allowed.

## Payhip — set up (materials)

Account setup is yours (needs your login); the steps:

1. Sign up at payhip.com → Settings → Payment Details → country **South Africa**
   → connect **Paystack** (or PayPal).
2. Add products: each deck pack / recorded course / membership as a separate product.
   Payhip delivers files and handles EU/UK VAT.
3. Set prices in USD or ZAR; Payhip does not auto-localise currency.
4. Payouts go to your Paystack balance → SA bank.
5. Optional: use Payhip's free plan to start (5% per sale).

## Open item

Persisting verified payments (a `payments` table) and reconciling them with
Cal.com bookings is not done yet. Worth doing before the grant demo so the
dashboard can show real sales.
