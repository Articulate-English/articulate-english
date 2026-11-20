# ARTICULATE ENGLISH — Business Plan Update, October 2026

**Written by:** DeepSeek (via Hermes), 2026-10-02, 13:21 SAST per local clock
**Location:** `2-websites/articulate-english/Business & Pitch/`
**Supersedes for planning:** the "ESL Business" trio (brand-strategy / gantt / phase1 HTML), the May 2025 grant-guide.md (stale, unverified), and the Sep 28 launch audit where noted below.
**Assignments:** source-verified facts are cited; unverified items are explicitly marked UNVERIFIED.

---

## 1. WHERE PROJECTS ARE — OCTOBER 2026 (verified against disk/git/API)

| Asset | State today | Evidence |
|---|---|---|
| GitHub repo Articulate-English/articulate-english | PUBLIC, main, last push 2026-09-30 (`85bdf1d`) | gh api, verified today |
| GitHub Pages | OFF — **no public URL exists** | Pages API returns 404 |
| Landing page `landing.html` | Built, ~54 KB; dead CTAs + destroyed-lead form fixed in `85bdf1d` (Sep 30) | Sep 28 audit + commit title |
| Lead form | Now wired (Sep 30) — needs live re-verification | commit 85bdf1d |
| Video lesson builder (Extras/) | Works, saves via `/api/lessons` | handoff audit |
| Teacher dashboard | Renders **hardcoded fake stats** (5 students, 24 lessons, 92%, 3) | disk |
| Student dashboard | Renders **hardcoded fake stats** (12, FL4, 85%, 3) | disk |
| Booking → Meet link for students | DOES NOT EXIST (no `user_id`, no `meet_url`, no GET route) | disk |
| Paystack | ZERO integration (user completed Paystack setup, code untouched) | tree walk |
| Auth/session | **MISATTRIBUTED — corrected 2026-10-25.** The shipped `server/signaling-server.js` is 199 lines of WebRTC signaling with NO auth and NO database. The real API (JWT, bcrypt, SQLite, `/api/livekit/token`, file upload, chat) is `Teacher Student Classroom/tutoring-platform/api/src/index.js` (310 lines) and is **not wired to the live site** | disk, verified 2026-10-25 |
| Legal pages | Privacy/Terms = `href="#"`. No Impressum, no footer | disk |
| Grant docs | grant-guide.md dated May 2025, all figures UNVERIFIED, timeline expired | disk |
| Local working folder | **Has no .git** — local edits can't push without re-initializing | disk |
| Fly.io | fly.toml exists ("articulate-whiteboard"), never deployed | handoff (fly auth unverified) |
| ESL materials hub (`5-esl-materials`) | B1/B2 speaking decks live (local), 48 IELTS decks asset-ready | disk/profile |
| **Articulate Materials hub** | **NEW 2026-10-25** — `WGT-Edutech/articulate-materials`, Pages built, live at `https://wgt-edutech.github.io/articulate-materials/`. Holds the published self-study material OFF the commercial site: 12 B2 decks, 47 speaking topics, 27 library pages, 6 curriculum pages. Main site nav now links here as "Free Materials" | disk + live, verified 2026-10-25 |
| Eloquenta (IELTS Speaking PWA) | Separate brand/repo, shipped | profile |
| **Headline:** still ZERO live revenue, ZERO captured leads in production. The site and the materials hub are both live (corrected 2026-10-25 — the "no public URL" claim was stale). | | |

---

## 2. BUSINESS MODEL — OPTIMIZATION BY FACTOR

### 2.1 Positioning (what we keep)
The hybrid positioning from the brand-strategy doc is still correct and is Articulate's real edge:
**Structured curriculum (English Score-style FL levels) + premium 1:1 (Fluentify) + live DE/ES translation during lessons (nobody else does this)**, sold by one named teacher in South Africa to DACH + Southern Europe professionals and exam candidates.

Optimization decisions (NEW in this update):
1. **ONE brand.** Three coexist today: Articulate (deck+landing), "ESL Business" (3 plan docs), Eloquenta (IELTS PWA). The PoC sells as **Articulate**. Re-skin the 3 stale docs or archive them (user decision, §6). Do not launch two brands (Sep 28 audit B6.4).
2. **Do not add features in month 1.** The Sep 28 priority table still stands: wiring beats building.
3. **Rename tiers to outcomes** — carried from Sep 28 audit A4: "Nobody wants lessons; they want to unstick their speaking."
5. **Multilingual by design** (user directive, 2026-10-02): English FIRST — but the structure is multilingual from day one (i18n shell + per-language content slots), to bring in more people and help more people. Locales open per demand trigger (first paying customer or 10+ sign-ups in a language — same threshold as the legal language policy in the ADW plan). Assets already exist: DE/ES lesson content (the 12-year-old A0 project), live DE/ES translation during lessons = the unique edge from the brand-strategy doc. Multilingual widens BOTH sides: more students, and a larger teacher contributor pool (DE/ES teachers contribute in-language content through §2.7). Strengthens the EU-grant narrative (a genuinely multilingual European platform).
4. **POSITIONING REFRAME (user, 2026-10-02): Articulate is a SERVICE to teachers, not their boss.** Platform product = "help teachers earn" (free agentic-AI training, paid content contributions, booking/ICS/payment rails, student pipeline). Teachers keep clients, brand, and freedom. Revenue = transaction/service fee + content-catalog margin, NOT a commission on lesson pay (no Preply-style 33% skim). No exclusivity, no non-competes, no rating-control. Quality gate = certification + curated Articulate badge (open to all teachers; only certified carries the badge). This becomes the grant narrative: educator-first platform, employability and empowerment as outcomes.

### 2.2 Revenue & offer
- Pricing ladder (reconciled 2026-11-19; single source of truth = `site-config.js`): Starter €30, Professional €39, Intensive €48 per 30-min session = €120 / €312 / €768 per month for 4 / 8 / 16 sessions. USD mirrors EUR ($120 / $312 / $768); CHF 42 / 54 / 66 (CHF 168 / 432 / 1,056); ZAR 30 / 46 / 56 (R720 / 1,840 / 4,480). The per-session rate rises with the **service level**, not the volume: Starter adds translation + placement assessment; Professional adds replay + materials + monthly reports; Intensive adds roadmap + account manager + weekly reports. Capped at/below the Swiss private-tutor ceiling (~CHF 65/30-min). All consumer-facing surfaces (home, landing, advisor, corporate cards, FAQ minimum) read this one table. Corporate tiers are per-currency in `site-config.js` (USD $35/$45/custom per seat; EUR €30/€40; CHF 40/55; ZAR R180/R230/custom; monthly minima $2,500 / $8,500, €2,200 / €7,500, CHF 3,800 / 7,200, R7,500 / R20,000). UNVERIFIED market fit — beta is the test.
- Package ladder from the brand doc (5-pack, 10-pack, exam intensive, monthly unlimited) is sound; keep monthly-unlimited as the retention anchor.
- **Session-credit-not-cash-refund policy** (Sep 28 B2.5) — protects cash, improves rebooking. Put in ToS.
- Revenue math: break-even 10 students @ 4 h/wk; $4k/mo @ 20 students. Verify against SA costs (UNVERIFIED — 2025-era estimate).

### 2.3 Cost optimization (free/cheap-first per house rules)
| Need | Free option | Status |
|---|---|---|
| Video | Google Meet (1:1, free Gmail) | chosen |
| Booking + reminders | Cal.com free (`william-o8lcqk`) | exists, not on landing page |
| Landing hosting | GitHub Pages | **OFF — enable** |
| App hosting | Fly.io free tier (256 MB) | not deployed |
| Payments | Paystack (ZA verified; amounts in cents) | not built |
| Calendar invites | Generated .ics (RFC 5545) — no Google API | not built |
| Analytics | Umami/Plausible self-host or free tier | not installed |

### 2.4 Trust & legal (the factor that beats all marketing)
- Imprint/Impressum + Privacy + Terms + footer. EU (DE) audience = GDPR Art. 14 + legal-identity requirement. **A grant assessor reading `href="#"` reads a template, not a business** (handoff §6). Build with real name + `[REG-NUMBER]` placeholder.
- **Non-negotiable: zero fabricated numbers anywhere**, including dashboards. Hardcoded 92% attendance is the same liability class as the fake ratings removed Sep 28 — one layer deeper, exactly where an assessor clicks.
- Hosting/infra persistence: pin `JWT_SECRET` (today it randomizes on restart → every demo/logout invalidates); cookies lack `Secure`.
- **Sole-prop feasibility (user Q, 2026-10-02):** "service to teachers" reduces sole-proprietorship pressure (no employees, teachers bill own students → smaller DAC7 platform exposure) but does NOT remove the two real drivers of incorporation: (1) EU grant eligibility — major programs (Erasmus+, EIC SME, EIT) want an established EU-incorporated legal entity; (2) unlimited personal liability (GDPR/consumer). Sequence: sole prop now, EU entity (Estonian OÜ per grant-guide) before grant application. Sources: ec.europa.eu DAC7 page (non-Union platform operators must register/report in one Member State); EIC Accelerator applicant guide (legal entity requirement); EUR-Lex EIC memorandum (Jul 2025). Verify scope with a cross-border advisor before teachers earn at scale.
- UNVERIFIED (confirm before relying): Paystack current ZA tariffs; Fly free-tier limits; "1:1 Meet has no 60-min cap" (corroborated, not primary-sourced).

### 2.5 Retention — the offline voice thread is a retention engine
Progress visibility is what makes subscriptions defensible (Sep 28 B3). The voice-thread feature (§4) adds the second pillar: the conversation survives bad connections, so students never lose a lesson moment to a dropped call — and the transcript ledger becomes the progress record.

### 2.6 Company values (NEW — user directive, 2026-10-02)
These are the public-identity values; they belong ON the landing page and IN the grant narrative:

1. **AI augments, never replaces.** AI tools exist to make teachers and learning materials better. The teacher is the value; AI is the amplifier. (Continuation of the Jul 11 grant differentiator: "AI empowers, doesn't replace" — @session:default/20260711_143831_77a85a. And per §2.1 reframe: we are a SERVICE to teachers — students are the outcome, teachers are the customer.)
2. **Free agentic AI training for teachers.** Teachers receive agentic-AI training at no cost — but it is NOT self-serve AI content: it is facilitated by paid human teachers. **Funding (user directive, 2026-10-02): teachers pay with the UNSEEN portion of lesson payment** — a share of the platform margin on teacher lesson earnings funds the training pool; no visible tuition, but framed honestly as "training included", never as a secret withhold. This keeps the value honest with value #1: humans teach, AI is the subject taught. Curriculum: `Business & Pitch/TEACHER-AI-TRAINING-CURRICULUM.md` (6 months, courses: setup → rules → memory → skills → your own site → production decks; includes free-vs-cheap-vs-top-tier model guide).
3. **Free self-study language training.** Learners get free self-paced training (existing B1/B2/IELTS corpus = the funnel) — free self-study feeds the paid 1:1 funnel, not a competitor to it (Sep 28 B4 was against building a Duolingo; giving away existing static decks is not that).

### 2.7 Teacher content economy — paid knowledge-base contributions (NEW)
- **Mechanism:** teachers get paid for accepted knowledge-base additions — learning materials AND short video lessons built for social-media traction (two-sided: quality content + marketing reach).
- **Why it fills early schedules:** new teachers earn during ramp-up, before their student load matures — income bridge. Aligns with MON/GOAL rules (teachers as creators, not gig-serfs).
- **Honest conflict flag:** the Sep 28 audit deferred "$1 session royalty" over German/EU employment-law exposure. This is a DIFFERENT mechanism (per-piece purchase for a licensed contribution, not per-session royalty) — cleaner, but still needs: (a) an acceptance gate (you review before paying — paid = approved), (b) a per-piece content license grant (buyout or perpetual per-use fee), (c) no exclusivity/obligation language that creates de-facto employment. Draft contract BEFORE the first payout.
- **Payout rail:** Paystack transfers when payments go live (Step 9); until then, manual/EFT.
- Sequencing: content marketplace = month 2+, NOT in the grant PoC v1. The value ships on the recruitment page ("teachers earn for contributions") from day 1.

### 2.8 Linux support — teachers on older systems (NEW)
- Teachers browse, they don't install — Articulate is web-only (Meet, Cal.com, dashboards, voice threads), so Linux support is a **performance + testing commitment, not a porting project**.
- Commitments: pages stay light (landing 54 KB class; dashboards under ~200 KB; no mandatory WebGL/heavy canvas); support stated matrix = Chrome + Firefox on Linux (MediaRecorder voice notes verified working on both); Meet works in Firefox/Chrome on Linux.
- Server side is Node on Linux (Fly) — free alignment.
- Test commitment: add one smoke-test pass on a Linux box (any old laptop/VM) per release — Step 10 in the tutorial.
- Older-systems budget: no hero video autoplay, images lazy, animations scroll-driven only (web-dev mode rule), 4 GB RAM machines must run a full lesson + voice-thread session smoothly.

---

### 2.9 Multilingual implementation notes (NEW — from §2.1 decision #5)
- **Day-one structure:** every UI string goes through a locale dictionary (`ui.en`, `ui.de`, `ui.es`) even when only EN has values; content catalogs get `lang` fields. Locales open per demand trigger.
- **Production pipeline per locale:** machine translation (free tier) → PAID native-speaker human review (house values: humans verify) → verified against house checklists (PIC/RAND rules carry over to translated decks).
- **Currency note:** ZA seller + EU buyers — Paystack settles ZAR; EU-priced tiers later may need a EUR rail. UNVERIFIED item for the legal/finance workbook, not a blocker for the PoC (PoC sells in the teacher's listed currency).
- **SEO/URLs:** per-locale paths (`/de/`) with hreflang when locales open; not before.
- **Contribution economy:** in-language content counts toward §2.7 payouts exactly like EN content — this is how the DE/ES catalogs fill without hiring writers.

## 3. SECURITY MEASURES (prioritized)

Verified by reading `server/signaling-server.js` today. Items marked [verify] need one read before claiming done.

| # | Severity | Issue | Fix | Effort |
|---|---|---|---|---|
| 1 | CRITICAL | Seeded default accounts `william@` / `maria@articulate.com`, password `Pass123!` | Delete seed block; create real accounts, strong pass, teacher role verified server-side | 10 min |
| 2 | HIGH | `JWT_SECRET` falls back to random per process → all sessions die every restart | Set `JWT_SECRET` in `.env` (server-side only, never committed); keep random as explicit dev-only fallback | 10 min |
| 3 | HIGH | Cookie lacks `Secure` (fine on localhost; session theft risk in prod) | Add `; Secure` in prod (and keep `SameSite=Lax`); serve only over HTTPS | 5 min |
| 4 | HIGH | No rate limiting / lockout on `/api/login`, `/api/register` [verify] | In-memory throttle (e.g. 5 fails → 15 min lock per IP+email) | 1 h |
| 5 | HIGH | Stored content (lessons, messages) — no escaping visible in server render paths [verify] | Escape on render: `escapeHtml()` helper on all dynamic fields | 1 h |
| 6 | MEDIUM | Paystack future: static button without server webhook = anyone with link unlocks | Server-side webhook; verify `x-paystack-signature` HMAC-SHA512; amounts in cents; idempotency key | 1 day |
| 7 | MEDIUM | Meeting URLs (.ics/DB) — calendar/HTML injection surface | Whitelist `https://meet.google.com/...` prefix; line-fold + escape all .ics text (RFC 5545: CRLF, escape `\,;`) | 30 min |
| 8 | MEDIUM | API responses lack security headers [verify] | Add `X-Content-Type-Options: nosniff`, `Content-Security-Policy` for any API-served HTML; pages keep CSP meta | 30 min |
| 9 | LOW | Repo is public by design | Fine for code; never commit `.env`, `data.db`, `meet-logs/`, voice files — confirm `.gitignore` before first push | 10 min |
| 10 | LOW | No file size/type validation on future uploads (voice) | Cap (e.g. 15 MB), sniff/map MIME from detection, store outside webroot | 30 min |

Already good and verified: bcrypt(10), min password length 8, opaque DB-backed revocable session tokens, prepared statements everywhere (no SQL injection pattern found), `.gitignore` covers `node_modules`/`dist`/`server/certs`, no secrets in history.

---

## 4. MOBILE + OFFLINE SUPPORT (design)

### 4.1 Mobile (baseline)
- Dashboards + landing responsive (360 px+) with 44 px+ touch targets; test on real phone per house rule.
- PWA: `manifest.webmanifest` + service worker for landing + student dashboard → installable, and the SW is the backbone of offline (§4.2).
- Cal.com booking page embeds fine in mobile browsers (test link placement on landing CTA).
- Low-data mode: hero images `loading="lazy"`, tiny placeholder skeletons in SW served when offline.

### 4.2 THE CLEVER PART — voice threads that survive weak connections
Concept: **the lesson conversation continues asynchronously as voice notes**, so a dropped Meet call or a student on a train with 2 bars never kills the learning moment. It is not a video replacement — it is the always-on seam between and around live lessons.

Flow:
1. Teacher/student record a voice note (30 s – 5 min) from their dashboard.
2. Note is written to **IndexedDB** first — it is "sent" instantly from the user's point of view.
3. Background sync / `online` event uploads the queue to the server with retry. Weak connection = slow success, never failure.
4. Recipient sees it in a thread (booking-scoped); replies the same way.
5. Optional (phase 2): transcript + quick correction note (the teacher can do it — the human edge).

Why this beats live-everything: async-first fits B1/B2 exam practice, timezone offsets, and (per Apr) the market's data reality; voice = speaking practice without the pressure of a live call; the queue makes connectivity invisible.

### 4.3 Architecture (add to existing stack — no new services)
- Client: `MediaRecorder` with codec detection — `audio/webm;codecs=opus` (Chrome/Edge/Firefox), Safari iOS 14.5+ records audio/mp4 (AAC) — store the blob + MIME, upload as-is.
- Client queue: IndexedDB (`voice-queue` store); flush on `navigator.onLine` + `sync` event (Background Sync API — Chrome/Edge reliable; Safari: flush on next app open + online event = identical UX, mild delay).
- Server (extend `signaling-server.js`, ~40 lines): `POST /api/voice` accepts raw binary body + headers `x-thread-id`, `x-mime`, `x-duration` → writes file to `server/voice/` (gitignored) + row into new table; `GET /api/voice?thread=<id>` lists with `created_at`; auth via existing cookie helper. Raw-body upload means no multipart library needed.
- File size cap 15 MB, idempotent by client-generated upload id to survive retries/duplicates.

Schema (add to signaling-server.js migrations):
```sql
CREATE TABLE IF NOT EXISTS voice_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id TEXT NOT NULL,
  sender_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  duration_ms INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

Client queue pseudocode (the heart of the offlineness):
```js
// 1. record with format detection
const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus' : 'audio/mp4';
const rec = new MediaRecorder(stream, { mimeType: mime });

// 2. on stop -> save to IndexedDB queue first (works offline)
await idbPut('voice-queue', { id: crypto.randomUUID(), blob, threadId, mime, ts: Date.now() });
renderAsSent();

// 3. flush: try upload; keep failed items for next trigger
async function flushQueue() {
  for (const item of await idbAll('voice-queue')) {
    const ok = await upload(item);       // fetch POST raw blob, retry x3
    if (ok) await idbDelete('voice-queue', item.id);
  }
}
window.addEventListener('online', flushQueue);
if ('serviceWorker' in navigator && 'SyncManager' in window) await sw.ready; 
// ^ register 'sync' tag in the service worker, which calls flushQueue on reconnect (Chrome/Edge)
```

Service worker: pre-cache dashboard shell (cache-first), so the whole app + voice recorder function with zero network.

---

## 5. TUTORIAL — HOW TO BUILD IT (yourself, in order)

Working folder today has **no `.git`** — step 1 fixes that without touching the old 1.35 GB folder.

**STEP 1 — Restore git safely (10 min)**
```
cd /c/Users/irieb/Documents/William-Projects/2-websites
gh repo clone Articulate-English/articulate-english articulate-repo
# compare: is anything local-only newer than the clone?
diff -rq articulate-english articulate-repo | grep -v node_modules | head
# copy over any newer local files, then work ONLY in articulate-repo
```
Old folder stays untouched (house rule: never delete without asking). If local == clone, just work in the clone.

**STEP 2 — Harden the server BEFORE anything else (30 min)**
1. In `server/signaling-server.js`: delete the seed-users block (lines with `Pass123!`); `.env` gains `JWT_SECRET=<long-random>` (generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`); add `; Secure` to Set-Cookie when `NODE_ENV=production`.
2. Add login throttle (15 min lock after 5 fails per IP).
3. Add `.gitignore` lines: `server/voice/`, `data.db`, `.env`, `meet-logs/`.
4. Verify: restart server, log in, restart again — session must survive (proves pinned secret).

**STEP 3 — Public URL + legal pages (1–2 h)**
1. Settings → Pages → deploy from `main` root (repo is public already; confirm no `.db`/`.env` tracked first: `git ls-files | grep -iE "\.(db|env|pem)$"` → must return nothing).
2. Create `privacy.html`, `terms.html`, `impressum.html` (real name, `[REG-NUMBER]` placeholder, session-credit policy in Terms) + real footer in `landing.html` linking all three. Verify: `grep -c "<body>"` = 1 per file; no `href="#"` left on landing.
3. Re-check the Sep 30 lead-form fix end-to-end once live (submit test lead → confirm it arrives).

**STEP 4 — Kill the fake dashboard numbers (1 h)**
Replace hardcoded `.stat-num` literals with `GET /api/...` results; where no data exists yet, render an honest empty state ("No lessons yet"). Never invented numbers. Add `/api/dashboard` (teacher: counts from `users`/`lessons`; student: own counts) to `signaling-server.js`.

**STEP 5 — Booking → Meet → ICS (2–3 h)**
1. Migration: `ALTER TABLE bookings ADD COLUMN user_id INTEGER; ADD COLUMN meet_url TEXT;`
2. `GET /api/bookings` (auth-scoped), teacher POST to set `meet_url` (whitelist `https://meet.google.com/`).
3. `.ics` endpoint: `GET /api/bookings/:id/ics` — build RFC 5545 (`BEGIN:VCALENDAR ... VEVENT`, `DTSTART/DTEND` in UTC, Meet URL in `DESCRIPTION`, CRLF line endings, UID from booking id). Test import into Google Calendar + Outlook.
4. Student dashboard: show link + Download .ics button; email the .ics via the existing reminder pipeline.

**STEP 5b — LESSON-AWARE CONFIRMATION + REMINDERS (user directive 2026-10-02; 2-3 h)**
Rule: both parties must prove they are aware the evening before. Teacher proves it by ACTING (submitting the message); student proves it by RECEIVING it.
1. Migration adds to `bookings`: `prep_msg TEXT` (teacher's content plan / question), `prep_submitted_at TEXT`, `reminder_state TEXT DEFAULT 'due'`, `reminder_sent_at TEXT`, `student_reminder_sent_at TEXT`.
2. Teacher submission: `POST /api/bookings/:id/prep` (auth-scoped, teacher only) → stores prep_msg. Teacher dashboard lists "Lessons needing your message tonight" above everything else.
3. Evening run (target 19:00 SAST): for each booking in the next 24 h — (a) teacher gets the prep nudge (WhatsApp wa.me deep-link + dashboard flag); (b) student reminder is SENT ONLY AFTER prep exists — it carries the teacher's actual message (plan or question). No prep by 20:00 cutoff → student gets base reminder (Meet link) + teacher gets an escalating nudge. Bookings never hold both parties silent.
4. Delivery (honest, PoC): WhatsApp = existing wa.me route (one-tap manual send — teacher is the human sender, phone number stays server-side). Email = NOT REAL YET — `/api/reminders/send-email` updates DB and logs "sent" WITHOUT sending (verified 2026-10-02, no SMTP call exists). Either build Gmail SMTP app-password sender (~1 h, free) or deliver wa.me-first.
5. NO-SILENT-FAILURE RULE (Fluentify precedent): every send writes `reminder_log` with real outcome (queued/sent_whatsapp/failed). Teacher dashboard shows honest counts. Never mark "sent" without a send.
6. Scheduler: manual "Send evening reminders" button on the teacher dashboard first (0 infra); automate later (Fly scheduled job post-deploy, or Hermes cron while PC is on — CHOOSE AT BUILD, listed in §6 #10).

**STEP 6 — PWA mobile baseline (1–2 h)**
`manifest.webmanifest` (name, icons, `display: standalone`, theme color) + `sw.js` (precache dashboard shell, cache-first) + register in both dashboards. Test: install on Android phone, airplane-mode → app still opens.

**STEP 7 — Voice thread (3–4 h, the clever part)**
1. Server: add `voice_messages` table (§4.3 schema); `POST /api/voice` (raw body → `server/voice/<uuid>.<ext>`; auth; 15 MB cap; parse `x-thread-id/x-mime/x-duration`) and `GET /api/voice?thread=`. Verify with curl: upload a dummy blob, fetch the list.
2. Client: recorder component with MIME detection; IndexedDB queue; flush on `online` + `sync` event; thread UI under each booking on both dashboards.
3. Test the failure path deliberately: DevTools → offline → record 3 notes (they appear sent) → go online → confirm all 3 arrive server-side, no duplicates.

**STEP 8 — Deploy**
1. Push to GitHub (`gh` flows; watch line endings on Windows: `git config core.autocrlf true`).
2. Fly.io: copy `Teacher Student Classroom/fly.toml`, point at server folder, `fly launch` + `fly deploy`; set secrets via `fly secrets set` (never in files).
3. Landing on GitHub Pages; API on Fly (https); CORS/cookie domain notes: dashboard pages call `https://api...` — add the Fly URL to any allowed-origin list.
4. Verify live: `curl -I` both URLs; login on phone; booking flow with a test student.

**STEP 9 — Paystack checkout + coupon waiver (REQUIRED before first trial booking — $2 trial directive, 2026-10-02; 1 day)**
Checkout → server creates transaction (secret key, cents) → authorize URL → on `charge.success`: webhook HMAC `x-paystack-signature` verification → set entitlement/credit. Never trust the client redirect alone.

**STEP 10 — Linux smoke test (the older-systems commitment)**
On any Linux box (old laptop or a VM), Chrome OR Firefox:
1. Open the dashboards — login, record ONE voice note, go offline, record a second — both must appear (LocalStorage/IndexedDB, no special drivers).
2. Load the landing page with DevTools throttled to "Slow 3G" — tolerable load, no layout jank.
3. Start a 1:1 Google Meet from the same machine (browser-only; works on Linux).
4. Note anything that needed the GPU or a codec the browser lacks — that item gets fixed or documented.
This pass is the proof behind the "Linux supported" claim — run it once per release.

After every step: `node --check` on JS, `grep -c "<body>"` on HTML edits, small commit.

---

## 6. OPEN DECISIONS FOR YOU (blocking order)

1. **Brand consolidation** — Articulate only, or keep "ESL Business" docs as internal plan layer? (recommend: Articulate public; mark the 3 HTML docs superseded-by-this-file)
2. **Payment in PoC?** — SOLVED 2026-10-02 (user directive): $2 TRIAL sessions instead of free — freeloaders waste company time in most cases; fee waived via coupon for people in the correct target group. Consequences: Paystack moves INTO PoC core (the $2 checkout must work before the first trial booking, not step 9), plus a coupon/waiver flow (code → fee substitution at checkout). Price is a qualification filter, not revenue. Funnel stays consistent: free self-study materials + free kids' basic app feed the $2 trial, then normal rates. **REVERSED 2026-10-23 (commit eafe173):** the free/discounted trial tier was removed from the live site; the entry point is now a paid lesson ($80/mo Standard / $150/mo Intensive). The $2 trial and the coupon flow are not built. If the trial is wanted back, it needs re-adding to the pricing grid and a decision on the coupon mechanic.
3. **Hosting** — SOLVED 2026-10-02 (user Q): GitHub Pages for ALL static layers — landing, decks, interested-parties hub, kids-app PWA — enable Pages on articulate-english now (zero cost, gives the grant form a public URL). Fly.io for the Node backend ONLY (auth, bookings, Meet links, ICS, signaling, Paystack) — Pages cannot run a server. Sequence: security fixes BEFORE either goes public; Fly when live end-to-end flows must work (verify `fly auth` + current pricing at deploy time; sources conflict on whether free allowances still exist, some say removed 2024).
4. **Legal entity details** — real name/reg number now, or `[REG-NUMBER]` placeholders you fill in before funder sees it? (recommend: placeholders, fill before sending)
5. Voice-thread scope — teacher-side transcription of student voice notes (more speaking-feedback value, more work) or notes-only for voice and text transcription where the teacher types the correction? (recommend: notes-only first)
6. Content payment model — flat fee per accepted material + flat fee per video (recommended, simplest, cleanest legally), or revenue share? And rates (e.g. $20–50/material, $30–80/video — your call, VERIFY against budget).
7. Linux test device — do you have an old Linux laptop to be the reference machine, or shall we standardize on a lightweight VM image for the Step 10 test? (recommend: whatever is already in the house)
8. Teacher-owned projects — confirm the open model: teachers may run own projects with the skills we teach (recommend YES: branded as internal entrepreneurship, platform keeps the fastest payout lane, no non-competes; becomes an EU-grant ecosystem outcome) — flagged 2026-10-02.
9. Entity sequencing — sole proprietorship now, EU incorporation before the grant application (recommended; see §2.4) — flagged 2026-10-02.
10. Reminder delivery + scheduler (from STEP 5b, user feature): (a) DELIVERY — wa.me-first using the existing WhatsApp route (works today, recommended), or build the Gmail SMTP sender first (~1 h, needs an app password), or both? (b) SCHEDULER — manual "Send evening reminders" button now (recommended, zero infra), Hermes cron while PC is on, or Fly scheduled job after deploy?

## 9. OWN VIDEO CALL PLATFORM — BUDGET PLAN v0 (NEW, user directive 2026-10-02)

User directive: budget for a state-of-the-art OWN video call platform — screen share, 2nd-camera share, whiteboard, video-lesson search engine. NOTE: this reverses Sep 28 audit B6.1 ("don't build video — Meet does it free"). The assets that already exist change the arithmetic: `signaling-server.js` (ws signaling, auth, rooms), `Articulate Video Call/` + `articulate-english-video-call` repo (PeerJS room UI), `whiteboard` repo (Pages enabled), `video-lesson-builder` (saved lesson videos = the search corpus). This is an integration/build-out, not greenfield.

| Line | Estimate (v0 — VERIFY) | Basis / honest note |
|---|---|---|
| Integration dev (WebRTC rooms: screen share + whiteboard + record) | agent-assisted build, ~2-4 weeks effort; near-zero cash | signaling + PeerJS + whiteboard already exist in-repo |
| **2nd camera share** | $0 extra | DESIGN WIN: the phone IS the 2nd cam — a QR/session link opens the student's smartphone camera as another participant over WiFi. No hardware, no cable |
| TURN relay (NAT traversal, SA/EU) | $5-15/mo ESTIMATE | coturn self-hosted on the Fly VM, or managed relay (Twilio ~$0.40/GB — UNVERIFIED, verify before relying); free STUN alone fails behind strict NATs |
| Video lesson search engine | agent-assisted, ~1 week; infra $0 (OSS index) | meilisearch/typesense OSS on the Fly VM over the existing lesson corpus |
| Recording storage (if lessons are recorded at all) | $3-10/mo ESTIMATE after first GBs | S3-compatible (B2/Wasabi class) — UNVERIFIED prices; skip recording in PoC if budget bites |
| Legal/consent note | included in legal ADW doc #4 | Recording/2nd-cam = consent clauses in student terms |
| **Total (ESTIMATE, verify)** | **~$10-25/mo + build time** | PoC cash stays lean; the real cost is reliability time |

User directive update (2026-10-02): **we use Google Meet NOW — the own platform is the grant-funded phase.** If the grant lands, this budget becomes the build plan (grant funds TURN, dev time, storage, reliability work). Until then Meet + ICS carries every lesson.

## 10. HONESTY LEDGER
- Grant figures in grant-guide.md: UNVERIFIED + stale. Do not present to funders until re-verified against the funding body's own site (listed per-portfolio task, not done).
- "1:1 Meet unlimited on free Gmail": corroborated, not primary-sourced — confirm before marketing it.
- Fly free-tier limits + Paystack current fees: checked 2026-10-02 — FLY SOURCES CONFLICT (one comparison says free allowances removed 2024; another cites 750 instance-hours/mo suspension). Treat Fly as paid (~a few $/mo) and confirm with Fly's own calculator before deploy. Paystack still unverified.
- `/api/reminders/send-email` is a STUB: it updates status + writes "email_sent" to reminder_log WITHOUT sending anything (no SMTP code exists; verified 2026-10-02 reading signaling-server.js L432-452). Any future work must not trust "sent" states from it.
- Sep 28 audit's funnel table was true Sep 28; CTAs/lead form claim fixed Sep 30 — re-verified live before trusting.
- Kids-app budget numbers (§8) are v0 ESTIMATES — get a lawyer quote + asset quotes before presenting to anyone.
- GDPR Art. 8 age-of-consent per EU country (13-16): MUST be verified per market before onboarding children — not stated as fact here.
- Kids-app marketing claim rule: "play-based reading/writing practice" only — NO literacy-outcome guarantees ("teaches your toddler to read" = legal risk, put it through the doc #9 legal review).
- Astra 6 costs: token pricing verified ($10/$50 per M, 5 sources) but applied to SCRIPT OUTPUT — whether Astra emits audio natively is UNVERIFIED; TTS per-minute prices unverified, re-check at cohort time.
- KAK content: video durations + transcripts used ONLY as size benchmarks; all scripted content must be original (adaptation rule in §8).

## 8. FLAGSHIP KIDS APP — TODDLER READING & WRITING APP — BUDGET PLAN v0 (NEW, user 2026-10-02)
Goal: a Khan-Academy-Kids-style free flagship — specifically a TODDLER READING & WRITING app (~3-6 yrs, play-based phonics, letter tracing, first words). Two jobs: (1) brand float — free, delightful, parents share it; (2) a built-in funnel: kids who finish the basic free app are offered sign-up for more lessons WITH TEACHERS — and those teachers add content to the app itself, earning via the §2.7 contribution economy (bundled with §2.6 "fill their schedule" promise). The app IS the teacher's shelf, not a competitor to teachers.

Build model: agentic + contributor-built (academy graduates produce packs as paid contributions) → cash dev cost near zero. Honest v0 cost lines:

| Line | Estimate | Basis |
|---|---|---|
| Illustration assets | $0-50 | Pexels/Pixabay free tiers; NO paid stock (house rule) |
| Kid-safe audio/music packs | $0-50 | Free CC0 packs; verify licenses before use |
| Content QA (facilitator hours) | existing academy budget | Kids packs reviewed exactly like any deck |
| Children's privacy addendum + lawyer review | UNVERIFIED — get one quote | Doc #9 in the legal ADW plan; cheapest compliance = parental consent + no ads + NO third-party trackers |
| Hosting | $0 | PWA-first on Pages/CF Pages — avoids App Store fees and store-review delays |
| Device QA | $0 | Existing phone + Linux laptop (Step 10 habit) |
| Phonics voice / TTS | replaced by lines below | Measured decision, 2026-10-02: production voices, not browser TTS |
| **Astra 6 script + tone prompts (every word of narration)** | **~$5** (range $3-10) | MEASURED: KAK transcripts avg 91 wpm → V1 = 136 min ≈ 12.3k words ≈ 16k output tokens; 3 revision passes at $50/M output + $10/M input (aicost.tools, layer3labs, aiagencycalculator — all agree $10/$50 per M) |
| **Production voice rendering (realistic voices, perfect tone)** | **$5-15 per full version** | Dedicated TTS rendering the Astra scripts: $2 (mini-TTS class ~$0.015/min) to $8+ (premium ~$0.06/min) for 136 min — VERIFY provider prices at cohort time |
| Tracing / reading fonts | $0 | OFL-licensed fonts only |
| Contingency | $100 | Buffer for asset/quote surprises |
| **Total cash (ESTIMATE, verify)** | **~$300** | Floats as brand-investment, not profit centre |

### Content benchmark — measured from Khan Academy Kids YouTube (2026-10-02)
Method: yt-dlp flat playlist + auto-transcripts (EJS solver), 7 sampled videos across lesson types. Served ONLY as volume/structure reference — see ADAPTATION RULE.
- Channel: 296 videos, 26.93 h total. Composition: 176 micro-lessons ≤2 min (2.26 h of real scripted content — letters/sight words/phonics/counting ~20-45 s each), 50 mid-length 2-10 min (3.94 h), remainder = Circle Time/webinars (hosted long-form, NOT scripted app content — excluded from benchmark).
- Narration pace measured from transcripts: micro-lessons 48-75 wpm, read-alouds ~105 wpm, blended ~91 wpm (kid narration is deliberately slow).
- Forest-Friends V1 target: ~120 items ≈ 136 min narration ≈ 12.3k words (composition: 100 micro × 30 s + 30 sight words × 20 s + 20 numbers × 25 s + 15 shape/color × 30 s + 20 stories × 3 min).
- ADAPTATION RULE (user directive, 2026-10-02): KAK is a size benchmark, NEVER source material. Every item is original: new character names, new situations, rewritten phrases (synonym substitution). First attempt = FOREST-FRIENDS theme. No KAK scripts, names, or situations reproduced — copyright must be practice-proof. Reference corpus + usage protocol saved at `Business & Pitch/kids-app/content-references/` (7 transcripts across all lesson types + structural notes + pacing table).
- Astra voice-modality caveat: budget assumes Astra 6 writes the SCRIPTS and a dedicated TTS renders the audio. Whether Astra emits audio natively is UNVERIFIED — check before purchase; if it does, audio-token pricing replaces the TTS line instead.

Sequencing: post-grant-PoC. Prototype = 1 toddler pack (phonics + tracing) + app shell after platform Phase 2 (booking/Meet) is live; full flagship paces the 6-month academy (each cohort ships packs). Funnel: finish the free basic path → in-app sign-up prompt for teacher-led lessons → teacher-added advanced content shows ONLY for enrolled kids (their teacher's shelf). ARCHITECTURE RULE: no child accounts — a parent/adult account holds child profiles; parental consent behind every gate. GDPR Art. 8 consent ages (13-16) verified per market before any child data exists. PWA, not native apps, for v1.

Open questions (join §6 list): priority of kids app vs grant PoC; premium-pack rev-share percentage; whether kids packs count toward the same flat-fee contribution rates (§6 #6) or a separate kids-content rate card.