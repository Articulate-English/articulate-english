# -*- coding: utf-8 -*-
"""Sliding In v3 payload generator.

Splits each deck into two payloads:

  free payload  — the 4 free topics, encrypted under a PUBLIC key that ships in the
                  app repo (same obfuscated-passphrase loader as before). Public by
                  design: it is the teaser.
  paid payload  — the full deck, encrypted under the master key K_m, which lives only
                  as a Worker secret. Written to D1; never shipped in a repo.

The Worker later decrypts the paid payload with K_m and re-encrypts it per buyer
(K_b = HKDF(K_m, licence_key)) or per lesson grant.

Usage:
  uv run --with cryptography python tools/reencrypt.py
"""
import base64
import hashlib
import json
import os
import secrets
import subprocess
import sys

BE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(BE)))   # William-Projects
BACKUP = os.path.join(ROOT, "5-esl-materials", "Sliding In", "_plaintext-backup")
STAGE = os.path.join(ROOT, "5-esl-materials", "Sliding In", "Products", "pwa-payloads")
REPOS = {d: os.path.join(ROOT, ("sliding-in-src" if d == "1" else f"sliding-in-{d}-src"))
         for d in ("1", "2", "3", "4")}

# The free teaser topics, mirroring the `isFree` lists hardcoded in each index.html.
FREE_SLUGS = {
    "1": ["age", "appearance", "childhood", "choices"],
    "2": ["booksreading", "canyoudescribe", "doyouknowhowto", "workjobs"],
    "3": ["privacy", "police", "lawjustice", "politics"],
    "4": ["airportsflying", "carsdriving", "conversation", "introductions"],
}

_ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
OBF_XOR = 0x5A

LOADER = r"""/* Sliding In __DECK__ — shipped payload.
   Every topic's metadata ships here (title, slug, question count) so the library is
   browsable offline, plus the full question text for the free teaser topics only.
   The paid question text is delivered per-buyer by the unlock service. */
(function(){
  "use strict";
  var P="__PAYLOAD__",O="__OBF__";
  function b(s){var t=atob(s),o=new Uint8Array(t.length);for(var i=0;i<t.length;i++)o[i]=t.charCodeAt(i);return o;}
  function d(s){var t=atob(s),o="";for(var i=0;i<t.length;i++)o+=String.fromCharCode(t.charCodeAt(i)^0x5A);return o;}
  function fail(){ if(window.console) console.error("[Sliding In] payload failed"); }
  try{
    if(!window.crypto || !crypto.subtle){ fail(); return; }
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(d(O))).then(function(km){
      return crypto.subtle.importKey("raw", km, {name:"AES-GCM"}, false, ["decrypt"]);
    }).then(function(key){
      var raw=b(P);
      return crypto.subtle.decrypt({name:"AES-GCM", iv:raw.slice(0,12)}, key, raw.slice(12));
    }).then(function(pt){
      window.lessonData = JSON.parse(new TextDecoder().decode(pt));
      if(window.tryInitLibrary) window.tryInitLibrary();
    }).catch(fail);
  }catch(e){ fail(); }
})();
"""


def seal(key_bytes, plaintext_bytes):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    nonce = os.urandom(12)
    return base64.b64encode(nonce + AESGCM(key_bytes).encrypt(nonce, plaintext_bytes, None)).decode("ascii")


def make_free_key():
    passphrase = "".join(secrets.choice(_ALPH) for _ in range(32))
    return hashlib.sha256(passphrase.encode("ascii")).digest(), passphrase


def obfuscate(passphrase):
    return base64.b64encode(bytes(b ^ OBF_XOR for b in passphrase.encode("ascii"))).decode("ascii")


def shipped_view(deck, free_slugs):
    """Full library structure with question text withheld except for free topics.

    The grid needs every topic's title, slug and question count so the library stays
    browsable; the questions themselves only arrive with a licence or a shared lesson.
    """
    out = []
    for cat in deck:
        topics = []
        for t in cat["topics"]:
            is_free = t.get("slug") in free_slugs
            topics.append({
                "title": t["title"],
                "slug": t.get("slug"),
                "level": t.get("level"),
                "questionCount": len(t.get("questions", [])),
                "questions": t.get("questions", []) if is_free else [],
            })
        out.append({"category": cat["category"], "topics": topics})
    return out


def subset(deck, slugs):
    kept = []
    all_slugs = {t.get("slug") for cat in deck for t in cat["topics"]}
    skipped = [s for s in slugs if s not in all_slugs]
    for cat in deck:
        topics = [t for t in cat["topics"] if t.get("slug") in slugs]
        if topics:
            kept.append({"category": cat["category"], "topics": topics})
    return kept, skipped


def main():
    os.makedirs(STAGE, exist_ok=True)
    master_hex = open(os.path.join(BE, ".secrets", "master-key.txt"), encoding="ascii").read().strip()
    master = bytes.fromhex(master_hex)
    version = sys.argv[1] if len(sys.argv) > 1 else "v3-" + secrets.token_hex(4)

    sql = ["DELETE FROM payloads;"]
    summary = []

    for deck in ("1", "2", "3", "4"):
        data = json.load(open(os.path.join(BACKUP, f"deck{deck}-lesson-data.json"), encoding="utf-8"))
        free, skipped = subset(data, FREE_SLUGS[deck])
        if skipped:
            print(f"!! deck {deck}: free slugs not found: {skipped}")

        # shipped payload -> repo loader (metadata for all topics, questions for free only)
        ship_key, ship_pass = make_free_key()
        ship_ct = seal(ship_key, json.dumps(shipped_view(data, FREE_SLUGS[deck]),
                                            ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
        loader = (LOADER.replace("__PAYLOAD__", ship_ct)
                        .replace("__OBF__", obfuscate(ship_pass))
                        .replace("__DECK__", deck))
        loader_path = os.path.join(STAGE, f"deck{deck}-shipped-lesson-data.js")
        open(loader_path, "w", encoding="utf-8").write(loader)

        # paid payload -> D1
        paid_ct = seal(master, json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
        iv = base64.b64decode(paid_ct)[:12].hex()
        paid_obj = {"deck": deck, "version": version, "ciphertext": paid_ct, "iv": iv}
        open(os.path.join(STAGE, f"paid-deck{deck}.json"), "w", encoding="utf-8").write(json.dumps(paid_obj))

        sql.append(
            "INSERT INTO payloads (deck, ciphertext, nonce, version, updated_at) "
            f"VALUES ('{deck}', '{paid_ct}', '{iv}', '{version}', datetime('now'));"
        )

        topics = sum(len(c["topics"]) for c in data)
        questions = sum(len(t["questions"]) for c in data for t in c["topics"])
        summary.append((deck, topics, questions, len(ship_ct), len(paid_ct)))

    open(os.path.join(STAGE, "load-payloads.sql"), "w", encoding="utf-8").write("\n".join(sql))

    print(f"version {version}")
    for deck, topics, questions, flen, plen in summary:
        print(f"  deck {deck}: {topics} topics, {questions} questions | free b64 {flen} | paid b64 {plen}")
    print(f"staged loaders: {STAGE}")
    print(f"SQL: {os.path.join(STAGE, 'load-payloads.sql')}")


if __name__ == "__main__":
    main()
