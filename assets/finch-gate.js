/* Finch fullscreen / Chrome gate. Load with a plain <script src> in the <head>, so the frosted glass is up before first paint. */
(function () {
  if (window.__fgGate) return; window.__fgGate = 1;
  // Stay out of Readymag's editor and preview — only run on the published treatment
  var inFrame = false; try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
  if (inFrame || /(^|\.)my\.readymag\.com$/.test(location.hostname) || /\/(edit|preview)\//.test(location.pathname)) return;

  /* ───────── CONFIG ───────── */
  var CFG = {
    theme: 'light',          // 'light' | 'dark' | 'auto'
    oncePerSession: true,    // show once per browser tab (refreshes and page changes in that tab won't re-prompt; a new tab will)
    pill: true,              // small "Full screen" pill once dismissed (Chrome only, hidden while fullscreen)
    cardDelay: 250,          // ms before the card rises in — the frosted glass itself is up from the very first paint
    font: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
    copy: {
      phone: {
        eyebrow: 'Viewing note',
        title: 'This treatment won\'t work properly on&nbsp;mobile',
        body: 'Please open it on a computer, ideally in Chrome.',
        primary: 'Copy link',
        primaryDone: 'Link copied',
        secondary: 'Continue anyway'
      },
      browser: {
        eyebrow: 'Viewing note',
        title: 'This treatment is best viewed in Google&nbsp;Chrome',
        body: 'It uses effects that render most reliably in Chrome. Copy the link to open it there, or continue in this browser.',
        primary: 'Copy link',
        primaryDone: 'Link copied',
        secondary: 'Continue anyway'
      },
      fs: {
        eyebrow: 'Before you begin',
        title: 'This treatment is best viewed full&nbsp;screen',
        body: 'It\'s designed to fill your display. Switch to full screen for the intended experience.',
        primary: 'Enter full screen',
        secondary: 'Not now',
        note: 'Press <kbd>Esc</kbd> at any time to exit full screen.'
      },
      pill: 'Full screen'
    }
  };

  /* ───────── HELPERS ───────── */
  var d = document, root = d.documentElement, KEY = 'fgGate:v1';
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  function isPhone() {
    var ud = navigator.userAgentData;
    if (ud && typeof ud.mobile === 'boolean' && ud.mobile) return true;
    var ua = navigator.userAgent;
    if (/iPhone|iPod|Windows Phone|Android.+Mobile|Mobile.+Firefox|BlackBerry|Opera Mini/i.test(ua)) return true;
    // Fallback: touch-first device with a phone-sized screen
    var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    return !!coarse && Math.min(screen.width, screen.height) < 600;
  }
  function isChrome() {
    if (navigator.brave) return false;
    var ud = navigator.userAgentData;
    if (ud && ud.brands && ud.brands.length) {
      return ud.brands.some(function (b) { return b.brand === 'Google Chrome'; });
    }
    var ua = navigator.userAgent;
    if (/CriOS\//.test(ua)) return true;
    return /Chrome\/\d+/.test(ua) && !/Edg\/|OPR\/|SamsungBrowser|YaBrowser|Vivaldi|Brave/.test(ua);
  }
  // Readymag stops responding to scroll whenever document.fullscreenElement is set (it assumes a video
  // has gone full screen). Our full screen is the whole page, so hide it from Readymag: report null when
  // the full-screen element is <html>. Real video full screen still reports normally.
  var FS_KEYS = ['fullscreenElement', 'webkitFullscreenElement', 'webkitCurrentFullScreenElement'];
  var nativeFs = {};
  FS_KEYS.forEach(function (k) {
    var desc = Object.getOwnPropertyDescriptor(Document.prototype, k);
    if (!desc || !desc.get) return;
    nativeFs[k] = desc.get;
    try {
      Object.defineProperty(d, k, { configurable: true, get: function () { var el = desc.get.call(d); return el === root ? null : el; } });
    } catch (e) {}
  });
  function realFsEl() {
    for (var i = 0; i < FS_KEYS.length; i++) { var g = nativeFs[FS_KEYS[i]]; if (g) { var el = g.call(d); if (el) return el; } }
    return null;
  }

  var fsEnabled = !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
  function isFs() {
    if (realFsEl()) return true;
    return Math.abs(innerHeight - screen.height) <= 1 && Math.abs(innerWidth - screen.width) <= 1; // F11 / green-button fullscreen
  }
  function goFs() {
    var fn = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!fn) return;
    try { var p = fn.call(root, { navigationUI: 'hide' }); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function copyLink(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(url);
    return new Promise(function (res, rej) {
      var t = d.createElement('textarea'); t.value = url; t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      d.body.appendChild(t); t.select();
      try { d.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); }
      t.remove();
    });
  }
  function themeClass() {
    var t = CFG.theme;
    if (t === 'auto') t = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    return 'fg-' + t;
  }

  var FINCH_BIRD = '<svg viewBox="0 0 291 266" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M265 264C255 260 250 256 226 233L204 211L185 212C175 212 164 212 162 213C132 216 102 213 81 205C37 188 19 165 18 124C18 105 20 95 27 81L32 72L24 67C9 56 1 50 1 48C-1 43 8 27 18 17C39 -3 76 -6 95 11C100 16 114 32 120 42C130 56 138 65 149 76C163 90 166 94 182 119C189 130 200 146 206 156C213 165 221 178 225 184C231 193 237 201 258 225C273 241 286 256 288 258L291 262L288 264C282 266 273 266 265 264ZM150 189C153 189 152 188 149 182L145 176L141 177C133 179 111 179 102 176C78 170 63 156 56 135C53 126 52 111 53 98C53 96 53 95 52 95C48 94 47 116 50 131C58 171 95 194 142 190C145 189 149 189 150 189ZM49 33C53 30 53 27 50 24C45 20 37 28 42 33C44 36 46 36 49 33Z"/></svg>';
  var ICON_EXPAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3"/></svg>';

  /* ───────── STYLES ───────── */
  var NOISE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>";
  var CSS = ''
  + '.fg-light{--fg-ink:#141414;--fg-on-ink:#fff;--fg-soft:rgba(20,20,20,.64);--fg-mute:rgba(20,20,20,.44);--fg-scrim:rgba(236,235,231,.30);--fg-scrim-solid:rgba(236,235,231,.95);--fg-card:rgba(255,255,255,.60);--fg-edge:rgba(255,255,255,.75);--fg-line:rgba(20,20,20,.08);--fg-chip:rgba(20,20,20,.05);--fg-shadow:0 1px 0 rgba(255,255,255,.85) inset,0 2px 8px rgba(20,20,20,.04),0 40px 90px -30px rgba(20,20,20,.38)}'
  + '.fg-dark{--fg-ink:#f2f1ee;--fg-on-ink:#121212;--fg-soft:rgba(242,241,238,.66);--fg-mute:rgba(242,241,238,.42);--fg-scrim:rgba(12,12,13,.40);--fg-scrim-solid:rgba(12,12,13,.95);--fg-card:rgba(30,30,32,.55);--fg-edge:rgba(255,255,255,.10);--fg-line:rgba(255,255,255,.08);--fg-chip:rgba(255,255,255,.07);--fg-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 2px 8px rgba(0,0,0,.2),0 40px 90px -30px rgba(0,0,0,.7)}'
  + '.fg{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;font-family:' + CFG.font + ';-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;opacity:1;transition:opacity .35s cubic-bezier(.2,.7,.2,1)}'
  + '.fg *{box-sizing:border-box;margin:0}'
  + '.fg.fg-out{opacity:0}'
  + '.fg-scrim{position:absolute;inset:0;background:var(--fg-scrim);-webkit-backdrop-filter:blur(26px) saturate(1.15);backdrop-filter:blur(26px) saturate(1.15)}'
  + '.fg-scrim:after{content:"";position:absolute;inset:0;background-image:url("' + NOISE + '");opacity:.07;mix-blend-mode:overlay;pointer-events:none}'
  + '@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.fg-scrim{background:var(--fg-scrim-solid)}}'
  + '.fg-card{position:relative;width:min(440px,100%);padding:32px 32px 26px;border-radius:22px;background:var(--fg-card);border:1px solid var(--fg-edge);box-shadow:var(--fg-shadow);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);opacity:0;transform:translateY(14px) scale(.985);transition:opacity .5s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.16,1,.3,1)}'
  + '.fg-card:focus,.fg-card:focus-visible{outline:none!important;box-shadow:var(--fg-shadow)!important}'
  + '.fg.fg-in .fg-card{opacity:1;transform:none}.fg.fg-out .fg-card{transform:translateY(-6px) scale(.99);transition-duration:.35s}'
  + '.fg-mark{display:block;width:26px;height:auto;color:var(--fg-ink);margin-bottom:22px}'
  + '.fg-mark svg{display:block;width:100%;height:auto}'
  + '.fg-eyebrow{font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-mute);margin-bottom:10px}'
  + '.fg-title{font-size:26px;font-weight:500;line-height:1.15;letter-spacing:-.022em;color:var(--fg-ink);margin-bottom:12px}'
  + '.fg-body{font-size:15px;line-height:1.55;color:var(--fg-soft);margin-bottom:26px;text-wrap:pretty}'
  + '.fg-actions{display:flex;gap:8px;flex-wrap:wrap}'
  + '.fg-btn{appearance:none;-webkit-appearance:none;border:0;font:inherit;font-size:14px;font-weight:500;letter-spacing:-.005em;height:44px;padding:0 20px;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:background .2s,color .2s,transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s}'
  + '.fg-btn svg{width:16px;height:16px}'
  + '.fg-primary{background:var(--fg-ink);color:var(--fg-on-ink);box-shadow:0 1px 2px rgba(0,0,0,.12),0 10px 24px -10px rgba(0,0,0,.45)}'
  + '.fg-primary:hover{transform:translateY(-1px);box-shadow:0 1px 2px rgba(0,0,0,.12),0 14px 28px -10px rgba(0,0,0,.5)}'
  + '.fg-primary:active{transform:translateY(0)}'
  + '.fg-ghost{background:transparent;color:var(--fg-soft)}.fg-ghost:hover{background:var(--fg-chip);color:var(--fg-ink)}'
  + '.fg-btn:focus-visible,.fg-pill:focus-visible{outline:2px solid var(--fg-ink);outline-offset:3px}'
  + '.fg-note{margin-top:22px;padding-top:18px;border-top:1px solid var(--fg-line);font-size:12px;line-height:1.5;color:var(--fg-mute)}'
  + '.fg kbd{font:inherit;font-size:11px;padding:1px 6px;border-radius:5px;border:1px solid var(--fg-line);background:var(--fg-chip);color:var(--fg-soft)}'
  + '.fg-pill{position:fixed;right:20px;bottom:20px;z-index:2147482999;display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 14px 0 11px;border-radius:999px;border:1px solid var(--fg-edge);background:var(--fg-card);-webkit-backdrop-filter:blur(16px) saturate(1.2);backdrop-filter:blur(16px) saturate(1.2);color:var(--fg-ink);font:500 12px/1 ' + CFG.font + ';letter-spacing:.01em;cursor:pointer;box-shadow:0 10px 26px -12px rgba(0,0,0,.35);opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .4s,transform .5s cubic-bezier(.16,1,.3,1)}'
  + '.fg-pill svg{width:15px;height:15px}'
  + '.fg-pill.on{opacity:.72;transform:none;pointer-events:auto}.fg-pill.on:hover{opacity:1}'
  + '@media (max-width:480px){.fg-card{padding:26px 22px 20px;border-radius:20px}.fg-title{font-size:22px}.fg-btn{flex:1 1 auto}}'
  + '@media (prefers-reduced-motion:reduce){.fg,.fg-card,.fg-pill{transition:opacity .2s!important;transform:none!important}}';

  /* ───────── PILL ───────── */
  var pill = null, pillReady = false;
  function setupPill() {
    if (!CFG.pill || pill) return;
    pill = d.createElement('button');
    pill.type = 'button';
    pill.className = 'fg-pill ' + themeClass();
    pill.setAttribute('aria-label', 'Enter full screen');
    pill.innerHTML = ICON_EXPAND + '<span>' + CFG.copy.pill + '</span>';
    pill.addEventListener('click', goFs);
    onBody(function () { d.body.appendChild(pill); });
    d.addEventListener('fullscreenchange', updatePill);
    d.addEventListener('webkitfullscreenchange', updatePill);
    addEventListener('resize', updatePill);
  }
  function updatePill() { if (pill) pill.classList.toggle('on', pillReady && !isFs()); }

  /* ───────── OVERLAY ───────── */
  function show(mode) {
    var c = CFG.copy[mode];
    var o = d.createElement('div');
    o.className = 'fg ' + themeClass();
    o.innerHTML =
      '<div class="fg-scrim"></div>' +
      '<div class="fg-card" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="fg-t" aria-describedby="fg-b">' +
        '<div class="fg-mark">' + FINCH_BIRD + '</div>' +
        '<p class="fg-eyebrow">' + c.eyebrow + '</p>' +
        '<h2 class="fg-title" id="fg-t">' + c.title + '</h2>' +
        '<p class="fg-body" id="fg-b">' + c.body + '</p>' +
        '<div class="fg-actions">' +
          '<button type="button" class="fg-btn fg-primary">' + (mode === 'fs' ? ICON_EXPAND : '') + '<span>' + c.primary + '</span></button>' +
          '<button type="button" class="fg-btn fg-ghost">' + c.secondary + '</button>' +
        '</div>' +
        (c.note ? '<p class="fg-note">' + c.note + '</p>' : '') +
      '</div>';

    var block = function (e) { e.preventDefault(); };   // page scroll is blocked by the overlay itself — never by locking <html>, which upsets Readymag's layout
    o.addEventListener('wheel', block, { passive: false });
    o.addEventListener('touchmove', block, { passive: false });

    var closed = false;
    function close() {
      if (closed) return; closed = true;
      store.set(KEY, '1');
      d.removeEventListener('keydown', onKey, true);
      o.classList.remove('fg-in'); o.classList.add('fg-out');
      setTimeout(function () { o.remove(); }, 420);
      pillReady = true; setTimeout(updatePill, 600);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key) && !/BUTTON/.test((e.target || {}).tagName)) e.preventDefault();
    }

    var primary = o.querySelector('.fg-primary'), ghost = o.querySelector('.fg-ghost');
    ghost.addEventListener('click', close);
    if (mode === 'fs') {
      primary.addEventListener('click', function () { goFs(); close(); });
    } else {
      var label = primary.querySelector('span'), t;
      primary.addEventListener('click', function () {
        copyLink(location.href).then(function () {
          label.textContent = c.primaryDone;
          clearTimeout(t); t = setTimeout(function () { label.textContent = c.primary; }, 2200);
        }).catch(function () { window.prompt('Copy this link and open it in Chrome:', location.href); });
      });
    }

    d.addEventListener('keydown', onKey, true);
    (d.body || root).appendChild(o);   // glass goes up immediately, before Readymag paints anything
    setTimeout(function () {
      o.classList.add('fg-in');
      try { o.querySelector('.fg-card').focus({ preventScroll: true }); } catch (e) {}
    }, CFG.cardDelay);
  }

  /* ───────── BOOT ───────── */
  function init() {
    var s = d.createElement('style'); s.id = 'fg-gate-css'; s.textContent = CSS; (d.head || root).appendChild(s);

    var chrome = isChrome();
    var mode = isPhone() ? 'phone' : (chrome ? (fsEnabled ? 'fs' : null) : 'browser');   // phones get the desktop prompt first, whatever the browser
    if (!mode) return;
    if (mode === 'fs') setupPill();

    if ((CFG.oncePerSession && store.get(KEY)) || (mode === 'fs' && isFs())) {
      pillReady = true; updatePill(); return;
    }
    show(mode);
  }
  function onBody(fn) { if (d.body) fn(); else d.addEventListener('DOMContentLoaded', fn); }
  init();   // run synchronously — no waiting for load, so there's no flash of the page
})();
