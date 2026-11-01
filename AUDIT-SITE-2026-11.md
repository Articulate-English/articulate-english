# Articulate English — Site Audit (Nov 2026)

**Scope:** live site https://articulate-english.github.io/articulate-english/index.html (rich version, served after Pages rebuild from commit cc6f612) audited against (a) current Swiss + European market for 1:1 online English and (b) the plans in `Business & Pitch/ARTICULATE-BUSINESS-PLAN-2026-10.md` + prompt history.
**Auditor role:** Senior UX/SEO/product reviewer for a DACH + Southern-Europe ESL offer.
**Method:** text-first extraction of the live page, repo source, business plan, and market research (Swiss tutoring benchmarks CHF 85–130/hr; marketplace benchmarks italki $4–$60/hr, Preply ~$23–$26/50-min; corporate providers EF/Berlitz/WSE per-30-min bands). No screenshots.

## 1. Executive summary

The site is a strong, credible single-page offer with a clear premium positioning and an honest "one teacher, no gimmicks" frame. Three things block it from converting Swiss/EU buyers and from passing a grant assessor:

1. **Legal/trust layer is absent.** No Impressum/Privacy/Terms, no footer, no named teacher, no VAT clarity. In DACH this is not a polish issue — it is a blocker (GDPR Art. 14 + Impressumspflicht; a Swiss buyer comparing CHF 85–130/hr competitors expects all-in, named, accountable providers).
2. **The enquiry CTA is wired to a payment flow that does not exist.** Every "Enquire" button carries `data-pay` and fires the Paystack/Stripe modal path; Paystack integration is zero (business plan §2.3). A click today lands on `honestAlert` ("Payment is being configured"). The site's own FAQ promises "book your first session" — a dead promise.
3. **The offer on the page does not match the plan or the market.** Plan §2.2 lists a $29 beta + $180/$440/$1,040 monthly tiers; the page sells $50/$75/$100 per 30-min ($200/$600/$1,600/mo). The $75/30-min rate (= $150/hr) prices above the Swiss private-tutor ceiling (CHF 130 ≈ $147/hr) while the page compares itself to corporate providers (EF/Berlitz/WSE) on a per-30-min basis that is not apples-to-apples. Either re-anchor or re-price; do not leave both.

Secondary: company values (AI augments teachers, free agentic-AI training, free self-study, Linux support, teacher content economy) — the grant narrative — are nowhere on the page. The comparison table's "0 Investors, or hidden owners" / "B1 Launch level, CEFR" micro-stats read as stray data.

## 2. Market context (Swiss + EU, current)

| Signal | Value | Source |
|---|---|---|
| Swiss private English tutor (60 min, all-in) | CHF 85–130 | goodtutorsfinder.ch, rundil.com, tutorsplus.com (Aug 2026) |
| Marketplace tutors (italki/Preply) | $4–$60/hr; ~$23–$26 per 50-min | learnenglish.life price index (Oct 2026) |
| Corporate providers (EF/Berlitz/WSE) | $50–$120 per 30-min (as cited on page) | page's own table |
| Swiss VAT | 8.1% (MwSt) | — |
| EU buyer expectation | Impressum + Privacy + Terms + footer; GDPR Art. 14 | business plan §2.4 |
| Lesson unit | Swiss market publishes 60-min (or 45/50-min) units; 30-min units are unusual and read as "half a lesson" | goodtutorsfinder comparison table |

Implication: Articulate at $75/30-min = $150/hr sits above the Swiss private-tutor ceiling and below corporate Berlitz/WSE ceilings. It is defensible only with the stated differentiators (live translation, multi-lingual teacher, structured FL levels, lesson replay) — which the page does state, but without a named teacher, credentials, or proof (recordings, sample lesson). The 30-min unit also needs an explicit justification ("focused, no filler") which the page already attempts ("30 minutes of focused, 1-on-1 training").

## 3. Plans alignment (business plan → site)

| Plan item (§) | On site? | Gap |
|---|---|---|
| §2.1 ONE brand, Articulate only | Yes | — |
| §2.1 "rename tiers to outcomes" (Sep 28 A4) | Partial — "Starter/Professional/Intensive" | Outcome-named still pending; acceptable |
| §2.2 $29 beta + $180/$440/$1,040 tiers | **No** — page shows $200/$600/$1,600 | Reconcile (decide which is real) |
| §2.3 free/cheap-first stack (Meet, Cal.com, Pages, Paystack) | Partial — Pages live; Cal.com not linked; Paystack not built | Wire Cal.com link + honest enquire flow |
| §2.4 Impressum/Privacy/Terms + footer | **No** — `href="#"` placeholders, no footer | BLOCKER for DACH/EU |
| §2.4 zero fabricated numbers | Mostly — "1,400+ materials", "14 levels" need verification; "0 Investors" stray | Clean micro-stats |
| §2.4 pin JWT_SECRET, Secure cookie | N/A (site is static) | Applies to API (not this page) |
| §2.6 company values (AI augments; free AI training for teachers; free self-study; Linux) | **No** | Add a values strip — grant narrative |
| §2.7 teacher content economy ("teachers earn for contributions") | **No** | Add to recruitment/offer (month-2+) |
| §2.8 Linux support commitment | **No** | Add one line + smoke-test badge later |
| §2.9 multilingual by design (EN first) | No (EN only) | OK for PoC; keep locale shell ready |
| §4.1 mobile 360px+, 44px targets, PWA | Unverified visually | Test on real phone |
| §6 #2 $2 trial reversed (commit eafe173) — paid entry only | Yes (no trial on page) | Keep; FAQ must not promise trial |
| §6 #3 GitHub Pages for all static layers | Yes | — |
| §9 own video platform = grant phase; Meet now | N/A on page | Don't promise own video on site |

## 4. Audit tables — Current issue vs recommended fix

### 4.1 UX / conversion

| # | Current issue | Recommended fix (code/CSS) |
|---|---|---|
| U1 | "Enquire" buttons use `data-pay` → Paystack/Stripe modal → `honestAlert` (no integration). Dead CTA. | Replace `data-pay` Enquire buttons with a real enquire action: `<a href="mailto:hello@articulate.ee?subject=Enquiry%20-%20Professional%20plan" class="price-btn primary">Enquire</a>` (or Cal.com booking link). Remove `data-amount`/`data-tier` from these buttons until Paystack lands. |
| U2 | No Cal.com link anywhere on the rich page (nav "Book a Lesson" → `#cta` → `#pricing`). Plan says Cal.com is the booking rail. | Add `https://cal.com/williamthomason/15-30-45-or-60-minute-sessions` to the bottom CTA and nav, labelled "Book a session". |
| U3 | Provider comparison table (EF/Berlitz/WSE vs Articulate) is per-30-min but competitors quote per 45/60-min units — apples-to-oranges and a credibility risk in DACH. | Either (a) convert competitors to per-30-min equivalents with a footnote, or (b) drop the table and keep a single line: "Corporate providers charge $50–$120 per 30-min equivalent; Articulate is $75 with translation + replay included." |
| U4 | "0 Investors, or hidden owners" and "B1 Launch level, CEFR" micro-stats in the corporate block read as stray/unfinished data. | Remove or replace with meaningful proof: "1 teacher · since 2026 · 14 FL levels · live DE/ES translation". |
| U5 | No named teacher, photo, or credentials. DACH buyers buy the person. | Add a short "Your teacher" block: name, photo, languages spoken, years teaching, FL levels taught. |
| U6 | No testimonials/social proof (and plan forbids fabricated stats). | Add only real ones; until then use an honest empty state: "First cohort opening — early students get founder pricing." |
| U7 | No VAT/tax clarity. Swiss/EU buyers need "prices include all taxes" or "plus VAT" stated. | Add under pricing: "Prices are in USD. Swiss/EU clients billed in CHF/EUR on request; all prices include applicable taxes." (Plan §2.9 currency note.) |
| U8 | Currency is USD only. Swiss market expects CHF; EU expects EUR. | Plan §2.9: keep PoC in teacher's listed currency; add a one-line "billed in CHF/EUR on request" until multi-currency rail lands. |
| U9 | "Can I lock in my current rate?" FAQ answers with a 12-month reduced rate — but the removed note said "Lock your rate for 12 months: ask when you enquire." Rate-lock info now survives only in FAQ. OK but ensure consistency. | Keep FAQ answer; add "ask when you enquire" phrasing to match. |
| U10 | No company values / grant narrative on page (AI augments teachers, free teacher AI training, free self-study, Linux). | Add a "What we believe" strip with the three values (§2.6) — this is the differentiator for EU funders and for teachers. |
| U11 | No "payment methods" info after removing the note. | Optional neutral footer line: "Payment by card, bank transfer or international transfer (Paystack & Wise)." — not the salesy wrapper. |

### 4.2 Technical & SEO

| # | Current issue | Recommended fix |
|---|---|---|
| T1 | No footer at all (no links to legal pages, contact, sitemap). | Add `<footer>` with Privacy / Terms / Impressum / contact email / "© Articulate English". |
| T2 | No Impressum/Privacy/Terms pages (plan §2.4, Step 3). `href="#"` placeholders. | Create `privacy.html`, `terms.html`, `impressum.html` with real name + `[REG-NUMBER]` placeholder; session-credit policy in Terms. |
| T3 | No structured data (LocalBusiness/Service, FAQPage). | Add JSON-LD `FAQPage` for the FAQ block (rich results) and `Service` for the offer. |
| T4 | No `robots.txt` / `sitemap.xml`. | Add both; sitemap lists index + legal pages + materials hub. |
| T5 | No `loading="lazy"` on images (plan §4.1 low-data mode). | Add `loading="lazy" decoding="async"` to all `<img>`. |
| T6 | Images served from Unsplash with `?w=600&q=70` — fine, but no width/height attributes → CLS risk. | Add explicit `width`/`height` to images. |
| T7 | Single 54 KB HTML with inline CSS/JS — acceptable but no cache-busting for assets (none external except fonts). | Low priority; fonts are the only external render-blocking resource. Consider `font-display: swap` (already via Google Fonts default). |
| T8 | CSP meta present and correct (good). `connect-src 'self'` means no analytics calls possible — fine until analytics added; then update CSP. | When adding Umami/Plausible, add its origin to `connect-src`. |
| T9 | Mobile: pricing comparison table + corporate cards unverified at 360px. | Test on real phone; the 4-column provider table likely overflows. Make table `overflow-x: auto` or convert to stacked cards on mobile. |
| T10 | `href="#"` placeholders still present (legal links). | Replace with real pages (T2). |
| T11 | No cookie/consent banner (needed if analytics added). | Add only when analytics ships; keep none until then (plan: Umami/Plausible). |
| T12 | Body count = 1 (verified). Good — keep. | — |

### 4.3 Content & tone

| # | Current issue | Recommended fix |
|---|---|---|
| C1 | Hero says "Built for professionals, exam candidates, and young learners" but offer cards list "Young Learners Ages 6-17" while the pricing tiers are adult-professional focused. Audience mismatch. | Either (a) split into two clear entry points (Adults / Young learners) or (b) remove young-learners from hero until a kids tier exists (kids app is post-grant per plan §8). |
| C2 | "Modern Interactive Content … content that updates every month" — implies a platform that doesn't exist yet (dashboards are hardcoded fakes per plan). | Soften to "Structured curriculum updated monthly based on teacher and student feedback." Remove "progress dashboards" claim until real. |
| C3 | "Progress dashboard", "Monthly progress report" listed as features — dashboards render hardcoded fake stats (plan §1). | Honest copy: "Progress tracking (manual report each block)" until §4 lands. |
| C4 | "Our teachers receive continuous language training" — fine, but no named teacher. | Pair with U5. |
| C5 | FAQ "How do I get started?" says "book your first session" — but no booking flow (U1/U2). | Align with enquire flow: "Choose a plan and enquire; we confirm your teacher and send a Cal.com booking link." |
| C6 | "Now Accepting Students — All Levels" badge — fine, keep. | — |
| C7 | Inconsistent tier pricing vs plan ($29 beta / $180/$440/$1,040 vs $200/$600/$1,600). | Decide: either update plan to match page or re-price page. Page's per-30-min math ($50×4=$200, $75×8=$600, $100×16=$1,600) is internally consistent; plan's numbers look stale. Update plan §2.2. |
| C8 | "Lesson recording + replay" listed — recording storage is a planned cost (plan §9). Don't promise until recording ships. | Keep but phrase as "Lesson recording on request" or remove from Starter. |
| C9 | Corporate section claims "teams of 10 to 10,000" — unverified capacity claim; plan has no corporate pipeline yet. | Soften to "teams of 10+" and remove "10,000" until a corporate client exists. |
| C10 | "Rapid Debug & Response … fixes any site or tech error as soon as it's reported" — odd marketing claim for an ESL site. | Replace with a real differentiator (e.g., "Direct access to your teacher, not a support queue"). |

### 4.4 Market-fit (Swiss/EU specific)

| # | Current issue | Recommended fix |
|---|---|---|
| M1 | No Impressum → DACH legal blocker + grant-assessor red flag. | T2. |
| M2 | USD-only pricing vs CHF/EUR market. | U7/U8. |
| M3 | No VAT clarity. | U7. |
| M4 | No named teacher/credentials. | U5. |
| M5 | No DE/ES language toggle despite live-translation being the edge and multilingual being the plan. | Keep EN-only for PoC but add a one-line "Lessons available with DE/ES-speaking teachers" (true today per plan). |
| M6 | No free self-study funnel link prominence — "Free Materials" is in nav but the plan says free self-study feeds the paid funnel. | Add a hero/offer line: "Free self-study decks (B1/B2/IELTS) → try before you pay." |
| M7 | No Linux/older-systems mention despite plan §2.8 being a grant value. | Add to "What sets us apart" or footer: "Works on any browser — including Linux and older machines." |
| M8 | Comparison table uses "AI Translation ✓" as the differentiator — good, but no proof (sample lesson, recording). | Add a 60-second sample lesson clip or a "watch a sample translation moment" link. |

## 5. Prioritized fix order (matches plan Step 3/4 sequencing)

1. **P0 — Legal layer** (T1, T2, T10): Impressum/Privacy/Terms + footer. Blocks DACH sales and grant credibility.
2. **P0 — Honest CTA** (U1, U2, C5): enquire via email/Cal.com; remove dead `data-pay` from pricing buttons.
3. **P1 — Trust & proof** (U5, U6, M8): named teacher + real/honest social proof + sample clip.
4. **P1 — Market fit** (U7, U8, M3, M5, M6, M7): currency/VAT note, DE/ES line, free-materials funnel, Linux line.
5. **P1 — Company values strip** (U10, U11): grant narrative on the page.
6. **P2 — Content cleanup** (C1–C4, C8–C10, U3, U4): audience clarity, soften unshipped features, fix stray stats.
7. **P2 — SEO/tech** (T3–T9, T11): structured data, robots/sitemap, lazy loading, CLS, mobile table.
8. **P3 — Reconcile pricing vs plan** (C7): update plan §2.2 to match page (page math is internally consistent).

## 6. Verification checklist (before claiming done)

- `grep -c "<body>" index.html` == 1 (already 1)
- `node --check` on any extracted JS (none inline-extracted yet)
- No `href="#"` remaining on landing after legal pages ship
- Real-phone test at 360px: no horizontal scroll, 44px tap targets, pricing table fits
- Lighthouse: LCP < 2.5s on Slow 3G, CLS < 0.1
- Enquire button opens mailto/Cal.com, not a payment modal
- Impressum reachable from footer on every page
- Re-verify any number quoted on the page against a source before it ships

## 7. What I deliberately did not change

- Did not re-price the tiers (decision belongs to the user; page math is internally consistent).
- Did not add analytics (plan: Umami/Plausible; CSP would need updating).
- Did not touch the comparison table's competitor numbers (unverified; flagged in U3).
- Did not re-add the removed price-note block (value note + payment-methods note) — removed per user request 2026-11-01. Payment methods can be restored as a neutral footer line (U11) if wanted.

---
*Audit produced 2026-11-01. Market figures are snapshots; re-verify against provider sites before quoting to clients or funders. Grant figures remain UNVERIFIED per business plan §10.*
