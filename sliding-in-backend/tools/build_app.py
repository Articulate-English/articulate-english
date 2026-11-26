# -*- coding: utf-8 -*-
"""Build the Sliding In PWA layer for one deck repo.

Emits into the app repo:
  manifest.webmanifest, sw.js, icon-192.png, icon-512.png, apple-touch-icon.png,
  app-runtime.js, lesson-data.js (free teaser payload)
and patches index.html (head links, unlock/share UI, runtime script tag, access check).

Run:  uv run --with pillow python tools/build_app.py 1
"""
import json
import os
import re
import shutil
import sys

BE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(BE)))
STAGE = os.path.join(ROOT, "5-esl-materials", "Sliding In", "Products", "pwa-payloads")
REPO = {d: os.path.join(ROOT, ("sliding-in-src" if d == "1" else f"sliding-in-{d}-src"))
        for d in ("1", "2", "3", "4")}

FREE_SLUGS = {
    "1": ["age", "appearance", "childhood", "choices"],
    "2": ["booksreading", "canyoudescribe", "doyouknowhowto", "workjobs"],
    "3": ["privacy", "police", "lawjustice", "politics"],
    "4": ["airportsflying", "carsdriving", "conversation", "introductions"],
}
COUNTS = {"1": (27, 366), "2": (27, 378), "3": (27, 363), "4": (26, 345)}
STUDENT_LINE = {
    "1": '<p class="sub">Student edition · 27 topics · 366 questions</p>',
    "2": '<p class="sub">Student edition · 27 topics · full deck</p>',
    "3": '<p class="sub">Student edition · 27 topics · full deck</p>',
    "4": '<p class="sub">Student edition · 26 topics · full deck</p>',
}

MANIFEST = """{
  "name": "Sliding In __DECK__ — ESL Speaking Questions",
  "short_name": "Sliding In __DECK__",
  "description": "Open-ended B1+ ESL speaking questions as art-directed slide decks, with a one-tap UK/US English switch.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#08090a",
  "theme_color": "#08090a",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
"""

SERVICE_WORKER = """/* Sliding In __DECK__ — offline shell.
   Network-first for navigations and code so deploys are never pinned to a stale cache;
   cache-first only for content-stable assets. Bump CACHE_NAME on every release. */
var CACHE_NAME = 'sliding-in-__DECK__-v3';
var APP_SHELL = ['./', './index.html', './lesson-data.js', './app-runtime.js',
                 './manifest.webmanifest', './icon-192.png', './icon-512.png',
                 './mapping-data.json', './sliding-in-image-map.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function (c) { return c.addAll(APP_SHELL); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; })
      .map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   // never intercept cross-origin
  var isCode = /\\.(js|mjs|css|html|webmanifest|json|png)$/i.test(url.pathname);

  if (e.request.mode === 'navigate' || isCode) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (c) { return c || caches.match('./index.html'); });
      })
    );
    return;
  }

  e.respondWith(caches.match(e.request).then(function (cached) {
    return cached || fetch(e.request);
  }));
});
"""

RUNTIME = r"""/* Sliding In __DECK__ — PWA runtime: install, per-lesson deep links, teacher
   sharing, licence unlock.

   Content model: lesson-data.js carries only the free teaser, encrypted under a
   public key. The full deck is sealed per buyer (or per shared lesson) by the
   unlock service and decrypted here. The paid key never ships. */
(function () {
  "use strict";
  var DECK = "__DECK__";
  var WORKER = "https://ae-sliding-in.billiethomasonsound.workers.dev";
  var PRODUCT_KEY = "";        /* Payhip product key — set when the product exists */
  var BUY_URL = "";            /* Payhip checkout URL — empty keeps the honest "soon" state */
  var FREE_SLUGS = __FREE_SLUGS__;
  var unlocked = false;
  var granted = {};

  /* ── service worker ── */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function (e) {
        if (window.console) console.warn("[Sliding In] service worker failed", e);
      });
    });
  }

  /* ── install prompt ── */
  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    var b = document.getElementById("installBtn");
    if (b) b.classList.remove("hidden");
  });
  window.slidingInInstall = function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
  };

  /* ── access ── */
  window.slidingInIsOpen = function (slug) {
    return FREE_SLUGS.indexOf(slug) >= 0 || unlocked || !!granted[slug];
  };

  /* ── crypto (mirrors the Worker's hkdfFromString) ── */
  function b64urlDecode(s) {
    try {
      var t = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
      var pad = t.length % 4 === 0 ? "" : "=".repeat(4 - (t.length % 4));
      var bin = atob(t + pad);
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    } catch (e) { return new Uint8Array(0); }
  }
  function deriveKey(secret, salt, info) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(secret))).then(function (ikm) {
      return crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveKey"]);
    }).then(function (base) {
      return crypto.subtle.deriveKey(
        { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode(salt), info: new TextEncoder().encode(info) },
        base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    });
  }
  function decryptPayload(ctB64, key) {
    var raw = b64urlDecode(ctB64);
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, key, raw.slice(12));
  }
  function grantNonce(token) {
    try {
      var part = String(token).split(".")[0];
      return JSON.parse(new TextDecoder().decode(b64urlDecode(part))).nonce || null;
    } catch (e) { return null; }
  }
  function deviceId() {
    try {
      var id = localStorage.getItem("sliding-in-device");
      if (!id) { id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem("sliding-in-device", id); }
      return id;
    } catch (e) { return "anonymous"; }
  }

  /* ── data ── */
  function mergeTopics(incoming) {
    var data = window.lessonData || [];
    (incoming || []).forEach(function (cat) {
      var target = null;
      for (var i = 0; i < data.length; i++) if (data[i].category === cat.category) { target = data[i]; break; }
      if (!target) { target = { category: cat.category, topics: [] }; data.push(target); }
      (cat.topics || []).forEach(function (t) {
        var found = false;
        for (var j = 0; j < target.topics.length; j++) {
          if (target.topics[j].slug === t.slug) { target.topics[j] = t; found = true; break; }
        }
        if (!found) target.topics.push(t);
      });
    });
    window.lessonData = data;
  }
  function findTopic(slug) {
    var data = window.lessonData || [];
    for (var i = 0; i < data.length; i++) {
      for (var j = 0; j < data[i].topics.length; j++) {
        if (data[i].topics[j].slug === slug) return { cat: data[i].category, topic: data[i].topics[j] };
      }
    }
    return null;
  }
  function openLesson(slug) {
    var hit = findTopic(slug);
    if (hit && window.openDeck) { window.openDeck(hit.cat, hit.topic); return true; }
    return false;
  }
  function rerender() { if (window.tryInitLibrary) window.tryInitLibrary(); }

  /* ── licence unlock ── */
  function storedLicence() { try { return localStorage.getItem("sliding-in-licence") || ""; } catch (e) { return ""; } }
  function setUnlockMessage(text, kind) {
    var el = document.getElementById("unlockMsg");
    if (!el) return;
    el.textContent = text;
    el.style.color = kind === "error" ? "#f87171" : "var(--text-dim)";
  }
  window.slidingInUnlock = function () {
    var input = document.getElementById("licenceKey");
    var key = input ? input.value.trim() : storedLicence();
    if (!key) { setUnlockMessage("Paste the license key from your receipt email.", "error"); return; }
    if (!PRODUCT_KEY) { setUnlockMessage("Unlock is not enabled yet — the store is still being wired.", "error"); return; }
    setUnlockMessage("Checking…");
    fetch(WORKER + "/sliding-in/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licence_key: key, product_key: PRODUCT_KEY })
    }).then(function (r) { return r.json().then(function (d) { return { status: r.status, body: d }; }); })
      .then(function (res) {
        if (!res.body.ok) { setUnlockMessage(res.body.error || "That key was not accepted.", "error"); return; }
        return fetch(WORKER + "/sliding-in/payload", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licence_key: key, product_key: PRODUCT_KEY, deck: DECK })
        }).then(function (r2) { return r2.json().then(function (d2) { return { status: r2.status, body: d2 }; }); })
          .then(function (res2) {
            if (!res2.body.ok) { setUnlockMessage(res2.body.error || "Could not load the deck.", "error"); return; }
            return deriveKey(key, "sliding-in/" + DECK, "sliding-in/payload/v1")
              .then(function (k) { return decryptPayload(res2.body.ciphertext, k); })
              .then(function (plain) {
                mergeTopics(JSON.parse(new TextDecoder().decode(plain)));
                unlocked = true;
                try { localStorage.setItem("sliding-in-licence", key); } catch (e) {}
                setUnlockMessage("");
                var modal = document.getElementById("buyModal");
                if (modal) modal.classList.remove("open");
                rerender();
                var btn = document.getElementById("buyBtn");
                if (btn) { btn.textContent = "Unlocked"; btn.classList.remove("disabled"); }
              });
          });
      }).catch(function (e) { setUnlockMessage("Network error — try again.", "error"); });
  };

  /* ── teacher sharing ── */
  window.slidingInShare = function (slug) {
    var key = storedLicence();
    if (!key) { openBuyModal(null); setUnlockMessage("Unlock the deck first, then share lessons with your students.", "error"); return; }
    if (!PRODUCT_KEY) { setUnlockMessage("Sharing is not enabled yet.", "error"); return; }
    return fetch(WORKER + "/sliding-in/grant", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licence_key: key, product_key: PRODUCT_KEY, deck: DECK, lesson: slug })
    }).then(function (r) { return r.json().then(function (d) { return { status: r.status, body: d }; }); })
      .then(function (res) {
        if (!res.body.ok) { alert("Could not create a share link: " + (res.body.error || "unknown error")); return; }
        var url = res.body.url;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () { alert("Lesson link copied — send it to your students."); });
        } else {
          prompt("Copy this lesson link:", url);
        }
      }).catch(function () { alert("Network error — could not create the link."); });
  };

  /* ── deep link: ?lesson=<slug>&grant=<token> ── */
  function handleDeepLink() {
    var p = new URLSearchParams(window.location.search);
    var slug = p.get("lesson");
    var token = p.get("grant");
    if (!slug) return;
    if (window.slidingInIsOpen(slug)) { openLesson(slug); return; }
    if (!token) { openBuyModal(null); return; }
    var nonce = grantNonce(token);
    fetch(WORKER + "/sliding-in/redeem", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant: token, device: deviceId() })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) { openBuyModal(null); return; }
      granted[d.lesson] = true;
      if (!d.payload || !nonce) { rerender(); openLesson(d.lesson); return; }
      deriveKey(nonce, "sliding-in/grant/" + d.deck + "/" + d.lesson, "sliding-in/grant/v1")
        .then(function (k) { return decryptPayload(d.payload, k); })
        .then(function (plain) {
          mergeTopics(JSON.parse(new TextDecoder().decode(plain)));
          rerender();
          openLesson(d.lesson);
        }).catch(function () { rerender(); });
    }).catch(function () { openBuyModal(null); });
  }

  /* ── wire the UI once the page exists ── */
  function wire() {
    var share = document.getElementById("shareBtn");
    if (share) share.addEventListener("click", function () {
      var slug = share.getAttribute("data-slug");
      if (slug) window.slidingInShare(slug);
    });
    var unlockBtn = document.getElementById("unlockBtn");
    if (unlockBtn) unlockBtn.addEventListener("click", window.slidingInUnlock);
    var buyBtn = document.getElementById("buyBtn");
    if (buyBtn) {
      if (BUY_URL) { buyBtn.textContent = "Buy on Payhip"; buyBtn.classList.remove("disabled"); buyBtn.setAttribute("href", BUY_URL); }
      else { buyBtn.textContent = "On Payhip soon"; buyBtn.classList.add("disabled"); }
    }
    var empty = document.getElementById("buyEmpty");
    if (empty && !BUY_URL) empty.textContent = "Payhip checkout opens here once the store is live. Have a license key? Use Unlock below.";
  }

  /* keep the Share button pointed at whichever lesson is open */
  function hookOpenDeck() {
    if (!window.openDeck) { setTimeout(hookOpenDeck, 200); return; }
    if (window.__slidingInHooked) return;
    window.__slidingInHooked = true;
    var orig = window.openDeck;
    window.openDeck = function (cat, topic) {
      var btn = document.getElementById("shareBtn");
      if (btn && topic && topic.slug) btn.setAttribute("data-slug", topic.slug);
      return orig.apply(this, arguments);
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    hookOpenDeck();
    wire();
    handleDeepLink();
  });
})();
"""


def make_icons(deck, outdir):
    from PIL import Image, ImageDraw, ImageFont
    top = (94, 106, 210)      # #5e6ad2
    bottom = (74, 85, 184)    # #4a55b8
    for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        for y in range(size):
            t = y / max(1, size - 1)
            d.line([(0, y), (size, y)], fill=(
                int(top[0] + (bottom[0] - top[0]) * t),
                int(top[1] + (bottom[1] - top[1]) * t),
                int(top[2] + (bottom[2] - top[2]) * t), 255))
        label = "SI"
        sub = "1" if deck == "1" else deck
        try:
            f_big = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", int(size * 0.42))
            f_small = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", int(size * 0.16))
        except Exception:
            f_big = ImageFont.load_default()
            f_small = f_big
        bbox = d.textbbox((0, 0), label, font=f_big)
        d.text(((size - (bbox[2] - bbox[0])) / 2 - bbox[0], size * 0.30 - bbox[1]), label, font=f_big, fill=(255, 255, 255, 255))
        tag = "DECK " + sub
        sb = d.textbbox((0, 0), tag, font=f_small)
        d.text(((size - (sb[2] - sb[0])) / 2 - sb[0], size * 0.72 - sb[1]), tag, font=f_small, fill=(215, 218, 245, 255))
        img.save(os.path.join(outdir, name))


def patch_html(path, deck):
    html = open(path, encoding="utf-8").read()

    def sub_once(old, new):
        nonlocal html
        n = html.count(old)
        assert n == 1, "anchor count %d for %r" % (n, old[:70])
        html = html.replace(old, new)

    # 1. head: manifest, theme colour, icons, iOS
    sub_once(
        '<meta charset="UTF-8">',
        '<meta charset="UTF-8">\n'
        '<meta name="theme-color" content="#08090a">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n'
        '<link rel="apple-touch-icon" href="apple-touch-icon.png">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
    )

    # 2. access check driven by the runtime (the free slug list differs per deck)
    html, n = re.subn(r"      var isFree = \(t\.slug === [^;]*\);",
                      "      var isFree = window.slidingInIsOpen(t.slug);", html, count=1)
    assert n == 1, "isFree anchor not found"

    # 2b. question counts must come from the shipped metadata, not the (withheld) array
    sub_once("'+t.questions.length+' questions", "'+(t.questionCount||t.questions.length)+' questions")

    # 3. buy modal: honest Payhip state + licence unlock row, no stale prices
    sub_once('<div class="price">$9</div>', '<div class="price">One-off purchase</div>')
    sub_once(STUDENT_LINE[deck],
             '<p class="sub">Every topic in Sliding In ' + deck + ' · works offline on any device</p>')
    sub_once(
        '<button class="btn-buy disabled" id="buyBtn">On Lemon Squeezy soon</button>\n'
        '    <div class="empty-state">Lemon Squeezy checkout will be wired here once the store is live.</div>',
        '<button class="btn-buy disabled" id="buyBtn">On Payhip soon</button>\n'
        '    <div class="empty-state" id="buyEmpty">Payhip checkout opens here once the store is live.</div>\n'
        '    <div class="unlock-row">\n'
        '      <input id="licenceKey" type="text" placeholder="License key" autocomplete="off" autocapitalize="none">\n'
        '      <button class="btn-buy" id="unlockBtn" type="button">Unlock</button>\n'
        '    </div>\n'
        '    <div class="unlock-msg" id="unlockMsg"></div>'
    )

    # 4. share button in the deck controls
    sub_once(
        '    <button class="deck-btn" onclick="toggleAnswers()">Reveal possible answers</button>',
        '    <button class="deck-btn" id="shareBtn" data-slug="">Share lesson</button>\n'
        '    <button class="deck-btn" onclick="toggleAnswers()">Reveal possible answers</button>'
    )

    # 5. runtime script, before the data loader
    sub_once(
        '<script src="lesson-data.js"></script>',
        '<script src="app-runtime.js"></script>\n<script src="lesson-data.js"></script>'
    )

    # 6. styles for the new UI
    sub_once(
        '.buy-modal-card .empty-state{margin-top:12px;font-family:var(--mono);font-size:.7rem;color:var(--text-dim);letter-spacing:.5px}',
        '.buy-modal-card .empty-state{margin-top:12px;font-family:var(--mono);font-size:.7rem;color:var(--text-dim);letter-spacing:.5px}\n'
        '.unlock-row{display:flex;gap:8px;margin-top:14px}\n'
        '.unlock-row input{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px 12px;font-family:var(--mono);font-size:.75rem}\n'
        '.unlock-row input:focus{outline:none;border-color:var(--accent)}\n'
        '.unlock-row .btn-buy{padding:10px 16px;font-size:.75rem}\n'
        '.unlock-msg{margin-top:8px;font-family:var(--mono);font-size:.65rem;min-height:1em;color:var(--text-dim)}\n'
        '.hidden{display:none!important}'
    )

    open(path, "w", encoding="utf-8").write(html)


def main():
    deck = sys.argv[1]
    assert deck in REPO, "deck must be 1-4"
    repo = REPO[deck]
    assert os.path.isdir(repo), repo

    make_icons(deck, repo)

    manifest = MANIFEST.replace("__DECK__", deck)
    open(os.path.join(repo, "manifest.webmanifest"), "w", encoding="utf-8").write(manifest)

    sw = SERVICE_WORKER.replace("__DECK__", deck)
    open(os.path.join(repo, "sw.js"), "w", encoding="utf-8").write(sw)

    runtime = (RUNTIME.replace("__DECK__", deck)
                     .replace("__FREE_SLUGS__", json.dumps(FREE_SLUGS[deck])))
    open(os.path.join(repo, "app-runtime.js"), "w", encoding="utf-8").write(runtime)

    # shipped payload becomes the data loader the app reads
    src = os.path.join(STAGE, f"deck{deck}-shipped-lesson-data.js")
    loader = open(src, encoding="utf-8").read()
    open(os.path.join(repo, "lesson-data.js"), "w", encoding="utf-8").write(loader)

    patch_html(os.path.join(repo, "index.html"), deck)

    topics, questions = COUNTS[deck]
    print(f"deck {deck}: built PWA layer -> {repo} ({topics} topics / {questions} questions)")


if __name__ == "__main__":
    main()
