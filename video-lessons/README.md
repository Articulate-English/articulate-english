# Video Lessons

Interactive English lessons built from real nature videos. Each lesson embeds a
YouTube video and pauses at set points to ask questions generated from the actual
video dialogue, targeting one grammar point from the test-english.com A2 / B1 syllabus.

## Build a lesson

1. Write a spec JSON in `pipeline/specs/` (see an existing one for the shape).
2. `python pipeline/build.py` — generates `lessons/<slug>.html` and rebuilds `index.html`.
3. Commit and push; GitHub Pages deploys.

## Request a lesson (public form)

`request.html` lets a visitor submit a YouTube link + level + grammar topic + their
email. It posts to the Cloudflare Worker `ae-lesson-requests`, which stores the
request in the D1 database `lesson-requests` with status `pending`.

## Publish + notify

After building and pushing a lesson, tell the Worker it is live and email everyone
who asked for that video:

```
python pipeline/notify.py list
python pipeline/notify.py publish \
  --video-id <youtube-id> \
  --slug <lesson-slug> \
  --url <lesson-url>
```

`publish` marks matching requests as published in D1 and emails each requester the
lesson link. Add `--dry-run` to preview without sending.

### Email configuration

Set these in a `.env` at the repo root (gitignored):

```
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

`GMAIL_APP_PASSWORD` is a Google app password — it requires 2-Step Verification
on the Google account.

## Infrastructure

| Piece | Value |
| --- | --- |
| Worker | `ae-lesson-requests` (workers.dev) |
| D1 database | `lesson-requests` |
| Admin token | `.secrets/admin-token.txt` (gitignored) |
| Admin endpoints | `GET /api/submissions`, `POST /api/publish` |

Note: `wrangler d1 execute` defaults to a local database when `wrangler.toml` is
present — always pass `--remote` for the production database.
