#!/usr/bin/env python3
"""Builds anz/lite.html: the no-WebGL fallback for the ANZ lift.

It is the 2D (CSS-only) lift carrying the same sections as anz/index.html. The 3D page sends
visitors here automatically when their browser cannot start WebGL. Re-run after editing the
sections in anz/index.html:   python3 anz/make-lite.py
"""
import os, re
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'index.html'), encoding='utf-8').read()
two = open(os.path.join(here, '..', '2d', 'index.html'), encoding='utf-8').read()

def swap(s, old, new):
    assert s.count(old) == 1, old[:60]
    return s.replace(old, new)

# the sections, straight from the 3D page
a = src.index("  floors: ["); b = src.index("\n  ],", a)
floors = src[a + len("  floors: ["):b]
a2 = two.index("    floors: ["); b2 = two.index("\n    ],", a2)
two = two[:a2] + "    floors: [" + floors + two[b2:]

two = swap(two, "<title>Lift — 2D</title>", '<title>Lift — ANZ</title><script src="../assets/finch-gate.js"></script>')
# every section opens on a full-bleed image with its number and title centred over it
two = swap(two, """d.innerHTML = (f.hero ? `<img class="hero" src="${f.hero}" alt="" decoding="async">` : '') + `<div class="copy">${f.html || ''}</div>`;""",
  """d.innerHTML = `<div class="herow">` + (f.hero ? `<img class="hero" src="${f.hero}" alt="" decoding="async">` : '<div class="hero"></div>')
      + `<div class="htitle"><small>${String(i + 1).padStart(3, '0')}</small><h1>${f.n}</h1></div></div><div class="copy">${(f.html || '').replace(/^\\s*<h1>.*?<\\/h1>/, '')}</div>`;""")
two = swap(two, "#lift .copy .ph{", """#lift .floor div.hero{background:linear-gradient(160deg,rgba(255,255,255,.13),rgba(255,255,255,.04))}
#lift .floor .herow{position:relative}
#lift .floor .htitle{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:0 6vw; color:#fff; pointer-events:none}
#lift .floor .herow:has(img) .htitle{background:radial-gradient(ellipse at center,rgba(4,18,34,.42),rgba(4,18,34,.12) 70%); text-shadow:0 2px 28px rgba(0,0,0,.45)}
#lift .floor .htitle small{font-size:clamp(12px,1.1vw,16px); font-weight:500; letter-spacing:.28em; margin:0 0 2.2vh; padding-left:.28em; opacity:.85}
#lift .floor .htitle h1{font-size:clamp(38px,8vw,112px); font-weight:600; letter-spacing:-.03em; line-height:1; margin:0}
#lift .copy ul{margin:0 0 2vh; padding-left:1.2em; max-width:52ch}
#lift .copy li{font-size:clamp(15px,1.25vw,19px); line-height:1.6; margin:0 0 1.4vh; opacity:.8}
#lift .copy li b{font-weight:600}
#lift .copy .dlg{padding-left:4ch; max-width:44ch}
#lift .copy .dlg b{display:block; font-weight:600; letter-spacing:.06em; font-size:.82em; margin-bottom:.2em}
#lift .copy .ph{""")
open(os.path.join(here, 'lite.html'), 'w', encoding='utf-8').write(two)
print('wrote anz/lite.html', len(two))
