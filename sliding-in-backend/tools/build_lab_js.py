# -*- coding: utf-8 -*-
"""Bundle portal-lab.html into a JS module the Worker can import.

wrangler here has no `?raw` loader for .html, so emit a plain ES module holding the
page as a JSON string literal.

Run:  python tools/build_lab_js.py
"""
import io
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "src")

page = io.open(os.path.join(ROOT, "portal-lab.html"), "r", encoding="utf-8").read()
out = os.path.join(SRC, "lab-html.js")
io.open(out, "w", encoding="utf-8", newline="").write(
    "/* generated from ../portal-lab.html by tools/build_lab_js.py — do not edit */\n"
    "export default %s;\n" % json.dumps(page)
)
print("wrote %s (%d bytes, page %d chars)" % (out, os.path.getsize(out), len(page)))
