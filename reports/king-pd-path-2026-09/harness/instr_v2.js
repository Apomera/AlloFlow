(() => {
  if (window.__k4) return;
  // v2: kept cheap on purpose. v1 (document-wide style/characterData observer and a
  // full button-text scan per mutation batch) slowed a Fast 3G + 4x boot from ~13-21 s
  // to 40-77 s: it measured a different program. Rules now:
  //  - the subtree observer watches childList only; body/loader attributes separately;
  //  - a mark is only checked while the harness has asked for it (K.want);
  //  - selector checks first; a button-text scan runs at most once per callback and only
  //    when an asked-for mark needs text;
  //  - module registration is read on the loader's own registry event, not a Proxy;
  //  - the clickable watch samples every 50 ms, only while one step waits.
  const K = window.__k4 = { marks: {}, order: [], clicks: [], changes: [], errors: [], resErrors: [], mods: {}, queue: [], longtasks: [], hits: {},
    want: new Set(['root_child', 'loader_hidden', 'clear_all_data', 'launchpad']) };
  const now = () => Math.round(performance.now());
  const mark = (n, x) => { if (K.marks[n] == null) { K.marks[n] = now(); K.order.push([n, K.marks[n], x || '']); } };
  K.mark = mark;
  K.addWant = (names) => { for (const n of names) K.want.add(n); check(); };
  const label = (el) => { if (!el) return ''; const a = el.getAttribute && el.getAttribute('aria-label'); return String(a || el.textContent || el.tagName || '').trim().replace(/\s+/g, ' ').slice(0, 70); };
  addEventListener('click', (e) => { if (!e.isTrusted) return; const t = e.target; const el = t && t.closest ? (t.closest('button,a,[role=button],label,input,summary') || t) : t; K.clicks.push([now(), label(el)]); }, true);
  addEventListener('change', (e) => { const el = e.target; if (el && el.type === 'file') K.changes.push([now(), el.files && el.files[0] ? el.files[0].name : '']); }, true);
  addEventListener('error', (e) => {
    if (e instanceof ErrorEvent) K.errors.push([now(), String(e.message || '').slice(0, 240)]);
    else if (e.target && (e.target.src || e.target.href)) K.resErrors.push([now(), String(e.target.src || e.target.href).slice(0, 200)]);
  }, true);
  addEventListener('unhandledrejection', (e) => { K.errors.push([now(), 'rejection: ' + String((e.reason && e.reason.message) || e.reason).slice(0, 240)]); });
  let modCount = 0;
  const scanMods = () => { const m = window.AlloModules; if (!m) return; const ks = Object.keys(m); if (ks.length === modCount) return; modCount = ks.length; const t = now(); for (let i = 0; i < ks.length; i++) if (K.mods[ks[i]] == null) K.mods[ks[i]] = t; };
  addEventListener('alloflow:module-registry-changed', () => {
    scanMods();
    try { const s = window.__alloModuleSnapshot(); const n = s.queued.length + s.pending.length; const l = K.queue[K.queue.length - 1];
      if (!l || l[1] !== n || l[2] !== s.failed.length) K.queue.push([now(), n, s.failed.length, s.queued.length]); } catch (e) {}
  });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) K.longtasks.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  // Until the remote ui_strings.js lands, most shell labels are the component's fallback or
  // blank. Record when it arrives (resource timing, no polling).
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (K.stringsAt == null && e.name.indexOf('/ui_strings.js') >= 0) K.stringsAt = Math.round(e.responseEnd); }).observe({ type: 'resource', buffered: true }); } catch (e) {}
  const q = (s) => document.querySelector(s);
  let labels = null;
  const btn = (re) => { if (!labels) { labels = []; const bs = document.getElementsByTagName('button'); for (let i = 0; i < bs.length; i++) labels.push((bs[i].getAttribute('aria-label') || '') + '|' + bs[i].textContent); } for (let i = 0; i < labels.length; i++) if (re.test(labels[i])) return true; return false; };
  const body = () => document.body;
  const CHECKS = {
    root_child: () => { const r = q('#root'); return !!r && r.children.length > 0; },
    loader_hidden: () => { const l = q('#alloflow-loader'); return !!l && l.style.display === 'none'; },
    clear_all_data: () => { const s = q('#loader-status button'); return !!s && /Clear All Data/.test(s.textContent); },
    launchpad: () => !!body() && body().classList.contains('alloflow-launchpad-active') && !!q('[data-alloflow-launch-pad]'),
    role_gate: () => btn(/\|Student\s*Join your class/),
    wizard: () => !!q('[aria-labelledby="quickstart-wizard-title"]'),
    workspace: () => !!body() && !body().classList.contains('alloflow-workspace-concealed') && !body().classList.contains('alloflow-launchpad-active') && !!q('#main-content'),
    wizard_closed: () => K.marks.wizard != null && !q('[aria-labelledby="quickstart-wizard-title"]'),
    codename_modal: () => btn(/Load Saved File/),
    history_menu: () => !!q('button[aria-label="More resource pack actions"]'),
    load_item: () => btn(/\|\s*Load Project\s*$/),
    pack_loaded: () => !!q('button[aria-label*="Crew Launch Week 1: Norms We Can Name and Keep"]'),
    directions_link: () => !!q('a[href^="#sel-hub/crewProtocols"]'),
    selhub_open: () => !!q('button[aria-label="Close SEL Hub"]'),
    selhub_gotit: () => !!q('#sel-ephemeral-explainer-modal'),
    station_started: () => !!q('#sel-active-station-guide') || !!q('button[aria-label="Exit station mode"]'),
    tool_frame: () => !!q('button[aria-label="Back to SEL tools"]'),
    tool_content: () => K.marks.tool_text != null,
  };
  const PHRASES = [
    ['is not available in this SEL Hub', 'toast_tool_unavailable'],
    ['is opening...', 'toast_tool_opening'],
    ['Norms We Can Name and Keep started', 'toast_station_started'],
    ['Crew is built. It is not assumed.', 'tool_text'],
    ['Failed to load project', 'toast_load_failed'],
  ];
  function check() {
    labels = null;
    K.want.forEach((k) => { if (K.marks[k] != null || !CHECKS[k]) return; try { if (CHECKS[k]()) mark(k); } catch (e) {} });
  }
  K.check = check;
  // Per-step clickable time: present, visible, and on top at its centre. Sampled every
  // 50 ms only while that step waits; one control per watch.
  K.watchHit = (name, sel, reSrc) => {
    const re = reSrc ? new RegExp(reSrc) : null;
    const tick = () => {
      if (K.hits[name] != null) return;
      const els = document.querySelectorAll(sel);
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (re && !re.test((el.getAttribute('aria-label') || '') + '|' + el.textContent)) continue;
        const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
        if (getComputedStyle(el).visibility === 'hidden') continue;
        const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
        if (cy >= 0 && cy < innerHeight && cx >= 0 && cx < innerWidth) {
          const h = document.elementFromPoint(cx, cy);
          if (!h || !(el === h || el.contains(h))) continue;
          K.hits[name] = [now(), 'in-view']; return;
        }
        K.hits[name] = [now(), 'below-fold']; return;
      }
      setTimeout(tick, 50);
    };
    tick();
  };
  const phraseWanted = () => PHRASES.some((p) => K.want.has(p[1]) && K.marks[p[1]] == null);
  const mo = new MutationObserver((recs) => {
    if (phraseWanted()) {
      for (const r of recs) {
        for (const n of r.addedNodes) {
          if (n.nodeType !== 1 || n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE') continue;
          const tx = n.textContent; if (!tx || tx.length > 60000) continue;
          for (const [ph, name] of PHRASES) if (K.want.has(name) && K.marks[name] == null && tx.indexOf(ph) >= 0) mark(name, tx.trim().slice(0, 120));
        }
      }
    }
    check();
  });
  mo.observe(document, { childList: true, subtree: true });
  const attrMo = new MutationObserver(check);
  const watchAttrs = () => {
    if (document.body) attrMo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const l = document.getElementById('alloflow-loader'); if (l) attrMo.observe(l, { attributes: true, attributeFilter: ['style'] });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchAttrs); else watchAttrs();
})();
