// Auto page numbers for Readymag, counting version. Built into anz/inject.js by anz/make-inject.py, so the one
// script line pasted into the Readymag project brings the lift and the page numbers together.
//
// Put a text widget on any page with one of these markers in it. The marker is replaced with the page
// number, in that widget's own font, size, colour and formatting. Anything else in the widget stays.
//
//   {pg}     the number as is            1, 14
//   {2pg}    always two digits           01, 14
//   {3pg}    always three digits         001, 014
//   {pg+1}   adds 1 to the number        works with digits too: {2pg+1}
//   {pg-1}   takes 1 off
//
// Numbers are NOT the page's position in the mag. Every text widget that carries a marker is one number,
// and each one is the previous one plus one, counted from the front of the mag. So a Readymag page laid
// out as a spread, with a marker widget on its left half and another on its right, uses two numbers
// (say 4 and 5), and the next page starts at 6. Pages with no marker (the cover, dividers, full-bleed
// spreads) take no number and don't advance the count. The first marker in the mag shows CFG.start
// (1 by default). Two markers inside the same widget show the same number.
//
// Within a page, widgets side by side are numbered left to right; widgets one above the other are
// numbered top to bottom.
//
// Readymag only sends a page's widgets when that page is about to show, so on load this script counts
// the marker widgets on every page first: from the viewer's own data where a page is already loaded
// (always the case in preview), otherwise with one small request per page to Readymag's API, all at
// once. Numbers are written only once that count is in, so a number is never shown and then changed.
// Markers stay invisible until then, for at most CFG.wait ms; if the count hasn't arrived by then the
// markers show anyway, numbered from the pages that have rendered. The count is cached in the browser
// for a published version, so return visits are instant. Nothing is cached in preview.
(function () {
  if (window.__rmPageNumbers) return; window.__rmPageNumbers = true;   // once per page, however the script arrives
  var CFG = {
    start: 1,    // the number shown on the first marker in the mag
    wait: 5000,  // the longest (ms) markers may stay invisible while the count is coming in
    tick: 500,   // how often (ms) to re-check, as a backup to the observer
    debug: false // true: log the per-page counts and what was found on each page to the console
  };
  var PG = /\{(\d)?pg(?:([+-])(\d+))?\}/g, PG_TEST = /\{\d?pg([+-]\d+)?\}/;

  function mag() { try { return window.RM.viewerRouter.mag || null; } catch (e) { return null; } }
  function magData() { try { return window.ServerData.mags.mag || null; } catch (e) { return null; } }
  function arts() { return [].slice.call(document.querySelectorAll('article.page')); }
  function urlPage() {
    var m = location.pathname.match(/\/(\d+)\/?$/), n = m ? +m[1] : 1, count = 0;
    var d = mag() || magData(); if (d && d.pages) count = d.pages.length;
    return (n < 1 || (count && n > count)) ? 1 : n;
  }
  function pageIndex(art) {                            // this page's real position in the mag, 1 = first page
    var m = mag();
    if (m && m.getPage && m.getPagesCount) {
      var n = m.getPagesCount();
      for (var i = 1; i <= n; i++) { var p = m.getPage(i); if (p && p.el === art) return i; }
    }
    var list = arts(), c = -1, i = list.indexOf(art); // fallback: the URL's page plus this article's offset from the centre page
    list.forEach(function (a, j) { if (a.classList.contains('center-page')) c = j; });
    return c < 0 ? urlPage() : urlPage() + (i - c);
  }

  // counts[i] is how many marker widgets page i carries (1 = first page). ready is true once every
  // page has been counted (or the wait ran out); until then nothing is written and markers stay invisible.
  var counts = [], ready = false, started = false, t0 = Date.now();
  function hasMarker(o) {
    var s = '';
    try { s = JSON.stringify(o); } catch (e) {}
    return PG_TEST.test(s.replace(/<[^>]*>/g, ''));
  }
  function shownHere(w) {                              // not hidden outright, nor hidden for the viewport in use
    if (!w || w.hidden === true) return false;
    var m = mag(), vp = m && m.viewport;
    if (vp && vp !== 'default' && w['viewport_' + vp] && w['viewport_' + vp].hidden === true) return false;
    return true;
  }
  function countWidgets(list) {
    var c = 0;
    (list || []).forEach(function (w) { if (w && w.type === 'text' && shownHere(w) && hasMarker(w)) c++; });
    return c;
  }
  function cacheKey(d) { return 'rmpg:' + d.num_id + ':' + (d.last_published || d.version || '') + ':' + (d.viewport || ''); }
  function done(why) {
    ready = true;
    if (CFG.debug) console.log('[pg] ' + why, JSON.stringify(counts));
    numbers();
  }
  function load() {
    if (started) return;
    var m = mag(), d = m || magData();                 // the viewer's mag object first (it has the loaded widgets), else the page data
    if (!d || !d.pages || !d.pages.length || !d.num_id) return;   // viewer not up yet: try again on the next tick
    started = true;
    var preview = !!(m && m.isPreview), key = cacheKey(d);
    if (!preview) {
      try { var hit = localStorage.getItem(key); if (hit) { counts = JSON.parse(hit); done('counts from cache'); return; } } catch (e) {}
    }
    var globals = countWidgets((m && m.staticGlobalWidgetsData) || d.globalWidgets);   // global widgets sit on every page
    var jobs = d.pages.map(function (p, i) {
      if (p.hidden) { counts[i + 1] = 0; return Promise.resolve(); }
      var fetched = p.widgetsFetched || (p.wids && p.wids.length && typeof p.wids[0] === 'object');
      if (fetched) {                                   // already loaded (always so in preview): count it right here
        var list = p.widgetsData || p.wids || [];
        var hasGlobals = list.some(function (w) { return w && w.is_global; });
        counts[i + 1] = countWidgets(list) + (hasGlobals ? 0 : globals);
        return Promise.resolve();
      }
      var url = '/api/viewer/project/' + d.num_id + '/widgets?pageId=' + p._id;
      return fetch(url, { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (list) {
        var own = (list || []).filter(function (w) { return !w.is_global; });
        counts[i + 1] = globals + countWidgets(own);
      });
    });
    Promise.all(jobs).then(function () {
      if (!preview) { try { localStorage.setItem(key, JSON.stringify(counts)); } catch (e) {} }
      done('counts');
    }, function (err) {
      if (CFG.debug) console.warn('[pg] widget fetch failed, numbering from rendered pages only', err);
      counts = [];
      done('fallback');
    });
  }
  function before(idx) {                               // the last number used on the pages before page idx
    var n = 0;
    for (var i = 1; i < idx; i++) n += counts[i] || 0;
    return CFG.start - 1 + n;
  }
  // The widget holding this text node: the nearest ancestor that Readymag positions on the page
  // (class containing "widget", or position absolute/fixed). Falls back to the text's own block.
  function widgetOf(node, art) {
    var el = node.parentNode;
    while (el && el !== art && el !== document.body) {
      if (el.className && /widget/i.test(el.className)) return el;
      var pos = getComputedStyle(el).position;
      if (pos === 'absolute' || pos === 'fixed') return el;
      el = el.parentNode;
    }
    return node.parentNode;
  }
  // Side by side (sharing a horizontal band): left to right. One above the other: top to bottom.
  function byPlace(a, b) {
    var overlap = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    return overlap > 0 ? a.r.left - b.r.left : a.r.top - b.r.top;
  }

  function pad(n, d) { var s = String(n); while (s.length < d) s = '0' + s; return s; }
  function pgText(tpl, num) {
    return tpl.replace(PG, function (_, digits, sign, shift) {
      var n = num + (shift ? (sign === '-' ? -shift : +shift) : 0);
      return n < 1 ? '' : pad(n, digits ? +digits : 1);
    });
  }
  function numbers() {
    try { load(); } catch (e) { if (CFG.debug) console.warn('[pg]', e); }
    if (!ready && Date.now() - t0 > CFG.wait) { counts = []; done('wait ran out, numbering from rendered pages only'); return; }
    arts().forEach(function (art) { try { number(art); } catch (e) { if (CFG.debug) console.warn('[pg]', e); } });
  }
  function number(art) {                               // write this page's numbers (or hide its markers while the count is pending)
    var groups = [], w = document.createTreeWalker(art, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) {
      if (n.qfTpl == null) {                         // first sight of this text node: remember its template
        if (n.nodeValue.indexOf('pg') < 0 || !PG_TEST.test(n.nodeValue)) continue;
        n.qfTpl = n.nodeValue;
      }
      var el = widgetOf(n, art), g = null;
      for (var i = 0; i < groups.length; i++) if (groups[i].el === el) g = groups[i];
      if (!g) groups.push(g = { el: el, r: el.getBoundingClientRect(), nodes: [] });
      g.nodes.push(n);
    }
    if (!groups.length) return;
    if (!ready) {                                    // counts still coming in: keep the markers out of sight
      groups.forEach(function (g) { if (!g.el.qfHid) { g.el.qfHid = true; g.el.style.visibility = 'hidden'; } });
      return;
    }
    var idx = pageIndex(art);
    if (!(idx in counts) && groups.length > (counts[idx] || 0)) counts[idx] = groups.length;   // only when nothing was counted for this page
    groups.sort(byPlace);
    var base = before(idx);
    if (CFG.debug) console.log('[pg] page', idx, 'starts after', base, groups.map(function (g) { return g.el; }));
    groups.forEach(function (g, k) {
      g.nodes.forEach(function (n) {
        var out = pgText(n.qfTpl, base + k + 1);
        if (n.nodeValue !== out) n.nodeValue = out;
      });
      if (g.el.qfHid) { g.el.qfHid = false; g.el.style.visibility = ''; }
    });
  }

  var raf = 0;
  function boot() {
    numbers();
    new MutationObserver(function () {                 // Readymag loads and unloads pages as you scroll
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; numbers(); });
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
    setInterval(numbers, CFG.tick);
    window.addEventListener('popstate', function () { setTimeout(numbers, 50); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
