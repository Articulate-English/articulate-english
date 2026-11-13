#!/usr/bin/env python3
"""Remove (or restore) faulty question cards from published video lessons.

Removing a card does NOT delete it from the spec. It records the card id in
pipeline/removed-cards.json, which build.py honours, and then rebuilds the
lessons and the library index. The spec stays the single source of truth for
content and the registry is the "do not publish" list — so a removal is one
command to undo, and the reason stays on the record.

Usage:
  python pipeline/remove_card.py list [slug]
  python pipeline/remove_card.py remove <slug> <id-or-text> [--reason "why"]
  python pipeline/remove_card.py restore <slug> <id>

<id-or-text> matches a question id exactly (q3) or uniquely against the
question text / sentence / correct answer, so a card can be pulled without
opening the spec first.
"""
import argparse
import json
import os
import sys

import build

SPECS = build.load_specs()
BY_SLUG = {s['slug']: s for s in SPECS}


def qlabel(q):
    """The text a learner sees on the card — used for matching and listing."""
    if q.get('type') == 'mcq':
        return q.get('question', '')
    if q.get('type') == 'fillgap':
        return q.get('sentence', '')
    return q.get('correct', '')


def find_question(spec, token):
    """Resolve a user-supplied id-or-text to exactly one question id."""
    for q in spec['questions']:
        if q.get('id') == token:
            return q
    needle = token.strip().lower()
    hits = [q for q in spec['questions']
            if needle in (q.get('id', '') + ' ' + qlabel(q)).lower()]
    if len(hits) == 1:
        return hits[0]
    if not hits:
        raise SystemExit('No card in %s matches %r.' % (spec['slug'], token))
    lines = ['%s  %s' % (q.get('id'), qlabel(q)[:70]) for q in hits]
    raise SystemExit('%r matches %d cards in %s — use the id:\n  %s'
                     % (token, len(hits), spec['slug'], '\n  '.join(lines)))


def save_removed(removed):
    if removed:
        with open(build.REMOVED_PATH, 'w', encoding='utf-8') as f:
            json.dump(removed, f, indent=2, ensure_ascii=False)
            f.write('\n')
    elif os.path.exists(build.REMOVED_PATH):
        os.remove(build.REMOVED_PATH)


def cmd_list(args):
    removed = build.load_removed()
    if args.slug:
        if args.slug not in BY_SLUG:
            raise SystemExit('Unknown slug %r. Known: %s'
                             % (args.slug, ', '.join(sorted(BY_SLUG))))
        removed = {args.slug: removed.get(args.slug, {})}
    if not removed:
        print('No removed cards.')
        return 0
    total = 0
    for slug in sorted(removed):
        cards = removed[slug]
        if not cards:
            continue
        print('%s (%d removed)' % (slug, len(cards)))
        for qid in sorted(cards, key=lambda x: (len(x), x)):
            spec = BY_SLUG.get(slug)
            label = ''
            if spec:
                for q in spec['questions']:
                    if q.get('id') == qid:
                        label = qlabel(q)
                        break
            print('  %s  %s' % (qid, (label or '(not in spec)')[:78]))
            if cards[qid]:
                print('        reason: %s' % cards[qid])
            total += 1
    print('\n%d removed card(s) total.' % total)
    return 0


def cmd_remove(args):
    if args.slug not in BY_SLUG:
        raise SystemExit('Unknown slug %r. Known: %s'
                         % (args.slug, ', '.join(sorted(BY_SLUG))))
    spec = BY_SLUG[args.slug]
    q = find_question(spec, args.card)
    removed = build.load_removed()
    cards = removed.setdefault(args.slug, {})
    if q['id'] in cards:
        print('%s is already removed (%s). Nothing to do.' % (q['id'], cards[q['id']]))
        return 0
    cards[q['id']] = args.reason or ''
    save_removed(removed)
    print('Removed %s from %s:' % (q['id'], args.slug))
    print('  ' + qlabel(q)[:100])
    if cards[q['id']]:
        print('  reason: ' + cards[q['id']])
    print('\nRebuilding…')
    return build.main()


def cmd_restore(args):
    if args.slug not in BY_SLUG:
        raise SystemExit('Unknown slug %r. Known: %s'
                         % (args.slug, ', '.join(sorted(BY_SLUG))))
    spec = BY_SLUG[args.slug]
    q = find_question(spec, args.card)
    removed = build.load_removed()
    cards = removed.get(args.slug, {})
    if q['id'] not in cards:
        print('%s is not removed. Nothing to do.' % q['id'])
        return 0
    reason = cards.pop(q['id'])
    if not cards:
        removed.pop(args.slug, None)
    save_removed(removed)
    print('Restored %s in %s (was removed: %s)' % (q['id'], args.slug, reason or 'no reason'))
    print('\nRebuilding…')
    return build.main()


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)

    p = sub.add_parser('list', help='show removed cards')
    p.add_argument('slug', nargs='?')
    p.set_defaults(func=cmd_list)

    p = sub.add_parser('remove', help='pull a faulty card from the published lesson')
    p.add_argument('slug')
    p.add_argument('card', help='question id (q3) or unique text from the card')
    p.add_argument('--reason', default='', help='why it was removed (kept on record)')
    p.set_defaults(func=cmd_remove)

    p = sub.add_parser('restore', help='put a removed card back')
    p.add_argument('slug')
    p.add_argument('card')
    p.set_defaults(func=cmd_restore)

    args = ap.parse_args()
    return args.func(args)


if __name__ == '__main__':
    sys.exit(main())
