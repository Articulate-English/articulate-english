#!/usr/bin/env python3
"""Publish a lesson and email everyone who requested it.

Workflow:
  1. Build + push the lesson as usual.
  2. python notify.py list
  3. python notify.py publish --video-id <id> --slug <slug> --url <lesson-url>
     -> marks matching requests as published in D1 and emails each requester.

Configuration (env vars, or .env in the repo root):
  GMAIL_USER          your Gmail address
  GMAIL_APP_PASSWORD  a Google app password (needs 2-Step Verification on)
  ADMIN_TOKEN         optional; defaults to .secrets/admin-token.txt
  WORKER_URL          optional; defaults to the deployed Worker
"""
import argparse
import json
import os
import smtplib
import ssl
import sys
import urllib.request
from email.mime.text import MIMEText

WORKER_URL = os.environ.get(
    'WORKER_URL', 'https://ae-lesson-requests.billiethomasonsound.workers.dev'
)
# Cloudflare bot protection blocks default script User-Agents (e.g. Python-urllib).
USER_AGENT = 'ArticulateEnglish-lesson-bot/1.0'
TOKEN_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', '..', '.secrets', 'admin-token.txt'
)

# The bundled Python's default CA path can be stale on Windows; certifi is reliable.
try:
    import certifi
    CA_BUNDLE = certifi.where()
except ImportError:
    CA_BUNDLE = None


def ssl_context():
    if CA_BUNDLE:
        return ssl.create_default_context(cafile=CA_BUNDLE)
    return ssl.create_default_context()


def admin_token():
    token = os.environ.get('ADMIN_TOKEN')
    if token:
        return token
    try:
        with open(TOKEN_FILE, encoding='utf-8') as fh:
            return fh.read().strip()
    except FileNotFoundError:
        return None


def api(path, payload=None):
    token = admin_token()
    data = json.dumps(payload).encode('utf-8') if payload is not None else None
    req = urllib.request.Request(WORKER_URL + path, data=data, method='POST' if data else 'GET')
    req.add_header('Authorization', 'Bearer ' + (token or ''))
    req.add_header('User-Agent', USER_AGENT)
    if data:
        req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, timeout=30, context=ssl_context()) as resp:
        return json.loads(resp.read().decode('utf-8'))


def list_pending():
    subs = api('/api/submissions').get('submissions', [])
    if not subs:
        print('No submissions.')
        return 0
    for s in subs:
        print('%s | %s | %s | %s | %s | %s' % (
            s['id'], s['level'], s['topic'], s['email'], s['video_id'], s['status']))
    print('\n%d submission(s).' % len(subs))
    return 0


def send_email(to, subject, body):
    user = os.environ.get('GMAIL_USER')
    password = os.environ.get('GMAIL_APP_PASSWORD')
    if not user or not password:
        print('Missing GMAIL_USER / GMAIL_APP_PASSWORD in the environment.')
        return False
    msg = MIMEText(body, 'plain', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = user
    msg['To'] = to
    with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=ssl_context(), timeout=30) as server:
        server.login(user, password)
        server.sendmail(user, [to], msg.as_string())
    return True


def publish(video_id, slug, url, dry_run=False):
    res = api('/api/publish', {'videoId': video_id, 'slug': slug, 'url': url})
    rows = res.get('notified', [])
    print('Matched %d submission(s) for %s.' % (len(rows), video_id))
    if dry_run:
        for r in rows:
            print('  [dry-run] would email %s (%s %s)' % (r['email'], r['level'], r['topic']))
        return 0
    sent = 0
    for r in rows:
        subject = 'Your Articulate English lesson is live'
        body = (
            'Hi,\n\n'
            'The lesson you asked for is live!\n\n'
            'Topic: %s\nLevel: %s\nVideo: %s\nLesson: %s\n\n'
            'Watch the video, answer the questions, and learn English.\n\n'
            '- Articulate English\n' % (r['topic'], r['level'], r['url'], r['lesson_url'])
        )
        if send_email(r['email'], subject, body):
            print('  emailed %s' % r['email'])
            sent += 1
        else:
            print('  FAILED %s' % r['email'])
    print('Sent %d/%d.' % (sent, len(rows)))
    return 0 if sent == len(rows) else 1


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='cmd', required=True)
    sub.add_parser('list')
    p = sub.add_parser('publish')
    p.add_argument('--video-id', required=True)
    p.add_argument('--slug', required=True)
    p.add_argument('--url', required=True)
    p.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    if args.cmd == 'list':
        return list_pending()
    return publish(args.video_id, args.slug, args.url, args.dry_run)


if __name__ == '__main__':
    sys.exit(main())
