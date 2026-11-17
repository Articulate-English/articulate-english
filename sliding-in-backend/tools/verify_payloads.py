# -*- coding: utf-8 -*-
"""Verify the v3 payloads: free subsets match the expected slugs, paid payloads
decrypt with the master key and reproduce the full deck.

Usage:  uv run --with cryptography python tools/verify_payloads.py
"""
import base64
import hashlib
import json
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

BE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(BE)))
BK = os.path.join(ROOT, "5-esl-materials", "Sliding In", "_plaintext-backup")
STAGE = os.path.join(ROOT, "5-esl-materials", "Sliding In", "Products", "pwa-payloads")

FREE = {
    "1": ["age", "appearance", "childhood", "choices"],
    "2": ["booksreading", "canyoudescribe", "doyouknowhowto", "workjobs"],
    "3": ["privacy", "police", "lawjustice", "politics"],
    "4": ["airportsflying", "carsdriving", "conversation", "introductions"],
}


def js_string(js, marker):
    i = js.index(marker) + len(marker)
    return js[i:js.index('"', i)]


def decrypt_shipped(path):
    js = open(path, encoding="utf-8").read()
    passphrase = "".join(chr(b ^ 0x5A) for b in base64.b64decode(js_string(js, ',O="')))
    key = hashlib.sha256(passphrase.encode("ascii")).digest()
    raw = base64.b64decode(js_string(js, 'var P="'))
    return json.loads(AESGCM(key).decrypt(raw[:12], raw[12:], None).decode("utf-8"))


def counts(deck):
    return (sum(len(c["topics"]) for c in deck),
            sum(len(t["questions"]) for c in deck for t in c["topics"]))


def main():
    master = bytes.fromhex(open(os.path.join(BE, ".secrets", "master-key.txt"), encoding="ascii").read().strip())
    sql = open(os.path.join(STAGE, "load-payloads.sql"), encoding="utf-8").read()

    ok = True
    for deck in ("1", "2", "3", "4"):
        plaintext = json.load(open(os.path.join(BK, f"deck{deck}-lesson-data.json"), encoding="utf-8"))
        want_t, want_q = counts(plaintext)

        ship = decrypt_shipped(os.path.join(STAGE, f"deck{deck}-shipped-lesson-data.js"))
        want_slugs = [t.get("slug") for c in plaintext for t in c["topics"]]
        ship_slugs = [t.get("slug") for c in ship for t in c["topics"]]
        all_topics = sorted(ship_slugs) == sorted(want_slugs)
        free_with_q = all(len(t["questions"]) > 0 for c in ship for t in c["topics"]
                          if t["slug"] in FREE[deck])
        paid_bare = all(len(t["questions"]) == 0 for c in ship for t in c["topics"]
                        if t["slug"] not in FREE[deck])
        counts_ok = all(t.get("questionCount") == len(o["questions"])
                        for c, oc in zip(ship, plaintext)
                        for t, o in zip(c["topics"], oc["topics"]))
        ship_ok = all_topics and free_with_q and paid_bare and counts_ok

        row = [l for l in sql.splitlines() if l.startswith("INSERT") and f"('{deck}'," in l][0]
        ct = base64.b64decode(row.split("'")[3])
        paid = json.loads(AESGCM(master).decrypt(ct[:12], ct[12:], None).decode("utf-8"))
        paid_t, paid_q = counts(paid)
        paid_ok = (paid_t, paid_q) == (want_t, want_q)

        ok = ok and ship_ok and paid_ok
        print(f"deck {deck}: shipped {len(ship_slugs)} topics "
              f"(all={all_topics} freeQ={free_with_q} paidBare={paid_bare} counts={counts_ok}) | "
              f"paid {paid_t} topics / {paid_q} questions (ok={paid_ok}) | expected {want_t}/{want_q}")

    print("ALL PAYLOADS VERIFIED:", ok)
    raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()
