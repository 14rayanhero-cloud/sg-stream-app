// SG STREAM language switch (Arabic default / English). The UI is written in Arabic; in English mode every Arabic phrase that appears in the page
// (text nodes, placeholders, titles, native dialogs, toasts and modals rendered later) is replaced from the SG_EN dictionary, longest phrase first.
// The choice is remembered in localStorage ("sg-lang") and can also be forced with ?lang=en / ?lang=ar.
(function () {
  const KEY = 'sg-lang', AR = /[\u0600-\u06FF]/;
  let lang = 'ar';
  try { lang = new URLSearchParams(location.search).get('lang') || localStorage.getItem(KEY) || 'ar'; } catch {}
  if (lang !== 'en') lang = 'ar';
  const dict = window.SG_EN || {};
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&').replace(/ +/g, '\\s+');
  const rx = keys.length ? new RegExp(keys.map(esc).join('|'), 'g') : null;
  const memo = new Map();
  const tr = (s) => {
    if (!rx || !AR.test(s)) return s;
    let r = memo.get(s); if (r !== undefined) return r;
    r = s.replace(rx, (m) => dict[m] !== undefined ? dict[m] : dict[m.replace(/\s+/g, ' ')] !== undefined ? dict[m.replace(/\s+/g, ' ')] : m);
    if (memo.size > 4000) memo.clear(); memo.set(s, r); return r;
  };
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  let busy = false;

  function doText(n) {
    if (n.__sgOrig !== undefined && n.data === n.__sgOut) return;              // already translated, untouched since
    const d = n.data; if (!AR.test(d)) return;
    const out = tr(d); if (out === d) return;
    n.__sgOrig = d; n.__sgOut = out; n.data = out;
  }
  function doEl(el) {
    if (el.nodeType !== 1) return;
    for (const a of ATTRS) {
      const v = el.getAttribute && el.getAttribute(a); if (!v || !AR.test(v)) continue;
      if (el.__sgA && el.__sgA[a] && el.__sgA[a].out === v) continue;
      const out = tr(v); if (out === v) continue;
      (el.__sgA || (el.__sgA = {}))[a] = { orig: v, out }; el.setAttribute(a, out);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (/^(SCRIPT|STYLE)$/.test(root.tagName)) return; doEl(root); }
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: (n) => n.nodeType === 1 && /^(SCRIPT|STYLE)$/.test(n.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let n; while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  function revert() {
    const tw = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n; while ((n = tw.nextNode())) {
      if (n.nodeType === 3 && n.__sgOrig !== undefined) { if (n.data === n.__sgOut) n.data = n.__sgOrig; n.__sgOrig = undefined; }
      else if (n.nodeType === 1 && n.__sgA) { for (const a in n.__sgA) if (n.getAttribute(a) === n.__sgA[a].out) n.setAttribute(a, n.__sgA[a].orig); n.__sgA = null; }
    }
  }

  const obs = new MutationObserver((muts) => {
    if (lang !== 'en' || busy) return; busy = true;
    try { for (const m of muts) { if (m.type === 'childList') m.addedNodes.forEach(walk); else if (m.type === 'characterData') doText(m.target); else if (m.type === 'attributes') doEl(m.target); } }
    finally { busy = false; }
  });

  function layout() {
    const h = document.documentElement; h.lang = lang; h.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.querySelectorAll('.sg-lang').forEach((b) => { b.textContent = lang === 'en' ? 'العربية' : 'English'; b.title = lang === 'en' ? 'Arabic' : 'English'; });
  }
  function apply() {
    layout();
    if (lang === 'en') { busy = true; try { walk(document.documentElement); } finally { busy = false; } }
    else revert();
  }
  function set(l) { lang = l === 'en' ? 'en' : 'ar'; try { localStorage.setItem(KEY, lang); } catch {} apply(); if (typeof window.onSgLang === 'function') window.onSgLang(lang); }

  // native dialogs
  for (const f of ['alert', 'confirm', 'prompt']) { const o = window[f]; window[f] = function (m, ...r) { return o.call(window, lang === 'en' ? tr(String(m)) : m, ...r); }; }

  window.SGLang = { get: () => lang, set, toggle: () => set(lang === 'en' ? 'ar' : 'en'), t: (s) => (lang === 'en' ? tr(String(s)) : s) };
  const start = () => { layout(); if (lang === 'en') apply(); obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  layout();
})();