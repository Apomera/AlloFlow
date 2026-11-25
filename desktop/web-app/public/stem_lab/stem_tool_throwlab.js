// ═══════════════════════════════════════════
// stem_tool_throwlab.js — Sports Physics Lab
// Headline mode: Pitcher's Mound (baseball)
// Teaches: projectile motion + drag + Magnus effect
// "Same arm, different ball, different game. See why."
// ═══════════════════════════════════════════

// ── ThrowLab keyframes (Pitch Locker celebration) ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('throwlab-celeb-css')) return;
  var st = document.createElement('style');
  st.id = 'throwlab-celeb-css';
  st.textContent = [
    '@keyframes throwlab-celeb-rise {',
    '  0%   { transform: translate(-50%, -120%); opacity: 0; }',
    '  10%  { transform: translate(-50%, 0%);    opacity: 1; }',
    '  88%  { transform: translate(-50%, 0%);    opacity: 1; }',
    '  100% { transform: translate(-50%, -10%);  opacity: 0; }',
    '}',
    // The in-page Pitch Locker banner only fades; with reduced motion it simply shows, then goes.
    '@keyframes throwlab-celeb-fade { 0% { opacity: 0; } 8% { opacity: 1; } 88% { opacity: 1; } 100% { opacity: 0; } }',
    '@media (prefers-reduced-motion: reduce){[data-throwlab-locker-banner]{animation:none!important}}'
  ].join('');
  if (document.head) document.head.appendChild(st);
})();

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

(function() {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Pin the STEM palette to its DARK values on this tool's own root ──
  // ThrowLab is dark by design (cyan #67e8f9 focus rings, cream/sky/amber inks on
  // slate panels) but only HALF-migrated, and it broke in both directions at once:
  // panels hardcoded to #1e293b took the themed ink, which resolves to #0f172a in
  // light -- 1.22:1 across all 21 mode tabs, 1.93:1 on five readouts -- while inks
  // hardcoded to the dark palette (#fde68a, #bae6fd, #fbbf24) landed on themed
  // grounds that went white, at 1.14-1.66:1. One inherited definition on the tool's
  // root settles both directions at once. Same fix as skatelab and bridgeLab;
  // html:not(.theme-contrast) leaves high-contrast mode to the theme.
  (function() {
    if (document.getElementById('allo-throwlab-palette-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-throwlab-palette-css';
    // ★ The guard below used to read `html:not(.theme-contrast)`, which left
    // NOTHING to the theme: `theme-${theme}` is stamped on <main>, never on
    // <html>, so the negation matched in every theme. The .theme-contrast rule
    // is the real hand-off, and it wins on specificity.
    st.textContent = '[data-throwlab-root]{'
      + '--allo-stem-canvas:#0f172a;--allo-stem-panel:#1e293b;--allo-stem-deeper:#020617;'
      + '--allo-stem-text:#e2e8f0;--allo-stem-text-soft:#94a3b8;--allo-stem-border:#334155;'
      + '--allo-stem-button-bg:#1e293b;--allo-stem-button-text:#e2e8f0;--allo-stem-button-border:#334155;'
      + 'background:#0f172a;}'
      + '.theme-contrast [data-throwlab-root]{'
      + '--allo-stem-canvas:#000000;--allo-stem-panel:#000000;--allo-stem-deeper:#000000;'
      + '--allo-stem-text:#ffff00;--allo-stem-text-soft:#ffff00;--allo-stem-border:#ffff00;'
      + '--allo-stem-button-bg:#000000;--allo-stem-button-text:#00ff00;--allo-stem-button-border:#00ff00;'
      + 'background:#000000;}'
      + '.theme-contrast [data-throwlab-root] .throwlab-hero-card,.theme-contrast [data-throwlab-root] .throwlab-mode-band{background:#000000!important;border-color:#ffff00!important;box-shadow:none!important;}'
      + '.theme-contrast [data-throwlab-root] .throwlab-telemetry-pill{background:#000000!important;border-color:#ffff00!important;color:#ffff00!important;}'
      // High contrast: most buttons and cards here carry fixed slate colors, so the theme never
      // reached them (slate borders on slate fills). Give every control a plain black fill with a
      // yellow edge, show the chosen one inverted, and make the launch button the one green thing.
      + '.theme-contrast [data-throwlab-root] button{background:#000000!important;color:#ffff00!important;border:2px solid #ffff00!important;box-shadow:none!important}'
      + '.theme-contrast [data-throwlab-root] button[aria-pressed="true"],.theme-contrast [data-throwlab-root] button[aria-selected="true"]{background:#ffff00!important;color:#000000!important}'
      + '.theme-contrast [data-throwlab-root] button[aria-pressed="true"] *,.theme-contrast [data-throwlab-root] button[aria-selected="true"] *{color:#000000!important}'
      + '.theme-contrast [data-throwlab-root] button[data-throwlab-launch]{background:#00ff00!important;color:#000000!important;border-color:#ffffff!important}'
      + '.theme-contrast [data-throwlab-root] section,.theme-contrast [data-throwlab-root] fieldset,.theme-contrast [data-throwlab-root] details,.theme-contrast [data-throwlab-root] .throwlab-sim-shell{background:#000000!important;border-color:#ffff00!important;box-shadow:none!important}'
      + '.theme-contrast [data-throwlab-root] button:disabled{border-style:dashed!important}';
    document.head.appendChild(st);
  })();

  (function() {
    if (document.getElementById('allo-throwlab-polish-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-throwlab-polish-css';
    st.textContent = [
      '.throwlab-play-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,320px);gap:16px;align-items:start}',
      '[data-throwlab-root] button,[data-throwlab-root] summary{min-height:44px}[data-throwlab-root] button{min-width:44px}[data-throwlab-root] input[type=range]{min-height:44px}',
      '[data-throwlab-root] button:focus-visible,[data-throwlab-root] summary:focus-visible,[data-throwlab-root] input:focus-visible,[data-throwlab-root] textarea:focus-visible{outline:3px solid #67e8f9;outline-offset:3px}',
      '.throwlab-mode-tabs{scrollbar-width:thin}.throwlab-mode-tab{scroll-snap-align:start}',
      '.throwlab-compendium-scroll{overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:thin;border-radius:8px}.throwlab-compendium-scroll:focus-visible{outline:3px solid #67e8f9;outline-offset:3px}',
      '#throwlab-fs-workspace:fullscreen,#throwlab-fs-workspace:-webkit-full-screen{box-sizing:border-box;width:100vw;height:100vh;overflow:auto;padding:clamp(10px,2vw,20px);background:#020617;align-content:start}',
      '#throwlab-fs-workspace:fullscreen .throwlab-sim-shell,#throwlab-fs-workspace:-webkit-full-screen .throwlab-sim-shell{min-height:min(68vh,720px)}',
      '.throwlab-run-focus-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(220px,.85fr);gap:12px}',
      '.throwlab-metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
      '.throwlab-launch-arc{position:relative;min-height:118px;margin-top:12px;border-radius:14px;overflow:hidden;background:linear-gradient(180deg,rgba(14,165,233,.16),rgba(22,163,74,.18));border:1px solid rgba(125,211,252,.24)}',
      '.throwlab-launch-arc:before{content:"";position:absolute;left:7%;right:7%;bottom:24px;height:2px;background:rgba(226,232,240,.45)}',
      '.throwlab-launch-arc:after{content:"";position:absolute;left:13%;right:18%;bottom:28px;height:58px;border-top:3px solid rgba(251,191,36,.9);border-radius:65% 65% 0 0;filter:drop-shadow(0 0 10px rgba(251,191,36,.35))}',
      '.throwlab-launch-arc[data-trajectory-shape="direct"]:after{height:18px;left:13%;right:14%;bottom:38px;border-radius:48% 48% 0 0;transform:rotate(-2deg);transform-origin:left center}',
      '.throwlab-launch-arc[data-trajectory-shape="high"]:after{height:72px;left:13%;right:18%;bottom:28px;border-radius:70% 70% 0 0}',
      '.throwlab-arc-point{position:absolute;z-index:1;display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:18px;background:rgba(15,23,42,.78);border:1px solid rgba(226,232,240,.18);color:#e0f2fe;font-size:11px;font-weight:800}',
      '.throwlab-learning-loop{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:0 0 14px}',
      '.throwlab-loop-step{display:flex;align-items:center;gap:7px;min-height:48px;padding:7px 9px;border-radius:10px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.24);color:#cbd5e1;font-size:11px;line-height:1.25}',
      '.throwlab-loop-step strong{display:block;color:#fef3c7;font-size:11px}',
      '.throwlab-loop-number{display:inline-flex;align-items:center;justify-content:center;flex:0 0 24px;width:24px;height:24px;border-radius:50%;background:rgba(251,191,36,.17);border:1px solid rgba(251,191,36,.45);color:#fde68a;font-weight:900}',
      '.throwlab-call-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}',
      '.throwlab-next-rep{margin-top:10px;padding:10px;border-radius:10px;background:linear-gradient(135deg,rgba(14,165,233,.12),rgba(16,185,129,.08));border:1px solid rgba(125,211,252,.42)}',
      '.throwlab-preset-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}',
      '.throwlab-result-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}',
      '.throwlab-sim-shell{position:relative;border-radius:16px;padding:10px;background:linear-gradient(180deg,rgba(15,23,42,.98),#08111f);border:1px solid rgba(251,191,36,.32);box-shadow:0 18px 40px rgba(15,23,42,.34),inset 0 1px 0 rgba(255,255,255,.08)}',
      '.throwlab-sim-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px}',
      '.throwlab-control-card{background:linear-gradient(180deg,rgba(15,23,42,.98),rgba(30,41,59,.94));border:1px solid rgba(148,163,184,.22);border-radius:14px;padding:12px;box-shadow:0 12px 26px rgba(15,23,42,.22)}',
      '.throwlab-analysis-details>summary{list-style-position:inside}.throwlab-analysis-details[open]>summary{border-bottom:1px solid rgba(192,132,252,.24);margin-bottom:10px}.throwlab-analysis-grid{grid-template-columns:minmax(0,1fr)}',
      '#throwlab-fs-workspace:fullscreen [data-throwlab-immersive-zone],#throwlab-fs-workspace:-webkit-full-screen [data-throwlab-immersive-zone]{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,380px);gap:10px;align-items:start}',
      '#throwlab-fs-workspace:fullscreen [data-throwlab-immersive-header],#throwlab-fs-workspace:fullscreen [data-throwlab-view-presets],#throwlab-fs-workspace:fullscreen #throwlab-immersive-help,#throwlab-fs-workspace:-webkit-full-screen [data-throwlab-immersive-header],#throwlab-fs-workspace:-webkit-full-screen [data-throwlab-view-presets],#throwlab-fs-workspace:-webkit-full-screen #throwlab-immersive-help{grid-column:1/-1}',
      '#throwlab-fs-workspace:fullscreen [data-throwlab-immersive-canvas],#throwlab-fs-workspace:-webkit-full-screen [data-throwlab-immersive-canvas]{grid-column:1;max-height:52vh;object-fit:contain}',
      '#throwlab-fs-workspace:fullscreen .throwlab-analysis-details,#throwlab-fs-workspace:-webkit-full-screen .throwlab-analysis-details{grid-column:2;grid-row:2/span 6;margin-top:0!important;max-height:calc(100vh - 150px);overflow:auto;position:sticky;top:8px}',
      '@media(max-width:1100px){#throwlab-fs-workspace:fullscreen [data-throwlab-immersive-zone],#throwlab-fs-workspace:-webkit-full-screen [data-throwlab-immersive-zone]{grid-template-columns:1fr}#throwlab-fs-workspace:fullscreen .throwlab-analysis-details,#throwlab-fs-workspace:-webkit-full-screen .throwlab-analysis-details{grid-column:1;grid-row:auto;position:static;max-height:none}}',
      // ★ Both canvases are authored at 640px and were painted at exactly that
      // on a 640px viewport: the sim shell's 7px of padding a side made the
      // panel 654px, and it spilled 38px past the tool column with nothing to
      // scroll it back (19 echoes across the sport views on the first 640px
      // board). Scaling is safe - the trajectory canvas takes keyboard input
      // only and the 3D canvas drags by clientX/clientY DELTAS, which are
      // scale-independent - and `max-width:100%` is a no-op whenever the shell
      // is wide enough for the bitmap.
      '[data-throwlab-canvas],[data-throwlab-immersive-canvas]{max-width:100%;height:auto}',
      // ★ `1fr` is `minmax(auto,1fr)`, whose minimum is the children's
      // min-content; the desktop rules guard with `minmax(0,…)` and this
      // narrow override dropped that guard, which is why the track grew to
      // 654px inside a 592px grid. Same shape as the author's own desktop rule.
      '@media(max-width:920px){.throwlab-play-grid,.throwlab-run-focus-grid{grid-template-columns:minmax(0,1fr)!important}.throwlab-sim-shell{padding:6px!important}.throwlab-metric-grid,.throwlab-result-grid{grid-template-columns:1fr 1fr!important}.throwlab-sim-toolbar{justify-content:flex-start!important}.throwlab-learning-loop{grid-template-columns:1fr 1fr}}',
      // Play-first layout: the call chips and the launch button share one row under the canvas.
      '.throwlab-launch-row{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(170px,1fr);gap:10px;align-items:stretch;margin-bottom:8px}',
      '.throwlab-launch-row>fieldset{margin:0!important;min-width:0}',
      // A raw checkbox stretched to the 44px touch size is a big white square. The label is the
      // 44px target instead; the box itself stays a normal size and takes the tool's accent color.
      '[data-throwlab-root] input[type=checkbox][data-tl-focusable]{min-width:0;min-height:0;width:20px;height:20px;flex:0 0 20px;accent-color:#fbbf24;margin:0}',
      '[data-throwlab-root] label:has(>input[type=checkbox]){min-height:44px;align-items:center;cursor:pointer}',
      // On a short screen (a 720 px Chromebook) the tagline gives its line to the launch button.
      '@media(max-height:800px){.throwlab-hero-card span.throwlab-hero-extra{display:none!important}}',
      '@media(max-width:560px){.throwlab-launch-row{grid-template-columns:minmax(0,1fr)}.throwlab-hero-card{padding:8px 10px!important;margin-bottom:8px!important}.throwlab-hero-extra{display:none!important}.throwlab-call-grid button span{display:none!important}}',
      '@media(max-width:560px){.throwlab-preset-grid,.throwlab-result-grid,.throwlab-learning-loop{grid-template-columns:1fr!important}.throwlab-launch-arc{min-height:104px}.throwlab-mode-tabs{flex-wrap:nowrap!important;overflow-x:auto;padding:2px 2px 8px;scroll-snap-type:x proximity}.throwlab-mode-tab{flex:0 0 auto}}',
      '@media(max-width:560px){.throwlab-challenge-entry{display:none!important}}',
      // Fullscreen: the picture was held at 640 px in a much bigger frame. Let it fill the frame, but
      // stop before it pushes the launch button off the bottom of the screen.
      '#throwlab-fs-workspace:fullscreen [data-throwlab-canvas],#throwlab-fs-workspace:-webkit-full-screen [data-throwlab-canvas]{width:min(100%,calc(62vh * 16 / 9))!important;max-width:none!important;display:block;margin:0 auto}',
      '#throwlab-fs-workspace:fullscreen .throwlab-sim-shell,#throwlab-fs-workspace:-webkit-full-screen .throwlab-sim-shell{min-height:0!important}',
      '@media(forced-colors:active){[data-throwlab-root] button:focus-visible,[data-throwlab-root] summary:focus-visible,[data-throwlab-root] input:focus-visible,[data-throwlab-root] textarea:focus-visible,.throwlab-compendium-scroll:focus-visible{outline:3px solid Highlight!important}}'
    ].join('');
    document.head.appendChild(st);
  })();

  // ── Focus-visible outline (WCAG 2.4.7 Focus Visible) ──
  // Inline styles on buttons/sliders below would suppress the browser's default
  // focus ring. This scoped CSS restores a visible 3px amber outline on
  // keyboard focus only (mouse clicks won't trigger it). Limited to elements
  // tagged `data-tl-focusable` so we don't fight any host-app focus styles.
  (function() {
    if (document.getElementById('allo-throwlab-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-throwlab-focus-css';
    // Focus outline + WCAG 2.5.5 minimum touch target (44×44px) for every interactive element
    // in throwlab — all `[data-tl-focusable]` usages are on <button> or <input>, so a global
    // min-size is safe (no risk of distorting text spans).
    st.textContent = '[data-tl-focusable]:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px!important;border-radius:6px} [data-tl-focusable]{min-width:44px;min-height:44px}';
    document.head.appendChild(st);
  })();


  // ── Audio (whoosh on throw, thwack on hit) ─────────────────
  var _tlAC = null;
  function getTlAC() {
    if (!_tlAC) {
      try { _tlAC = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); } catch (e) {}
    }
    if (_tlAC && _tlAC.state === 'suspended') { try { _tlAC.resume(); } catch (e) {} }
    return _tlAC;
  }
  function tlTone(f, d, tp, v) {
    var ac = getTlAC(); if (!ac) return;
    try {
      var o = ac.createOscillator(); var g = ac.createGain();
      o.type = tp || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(v || 0.07, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (d || 0.1));
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + (d || 0.1));
    } catch (e) {}
  }
  function sfxThrow() { tlTone(420, 0.20, 'sine', 0.05); tlTone(280, 0.25, 'sine', 0.04); }
  function sfxStrike() { tlTone(900, 0.05, 'square', 0.08); tlTone(600, 0.10, 'sine', 0.06); }
  function sfxBall() { tlTone(180, 0.18, 'sawtooth', 0.05); }
  function sfxCatch() { tlTone(150, 0.08, 'sine', 0.06); }

  // ── ARIA live region for screen-reader announcements ───────
  (function() {
    if (document.getElementById('allo-live-throwlab')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-throwlab';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();
  // Live-region announcer with rapid-fire protection.
  // Setting textContent twice within ~500ms can drop the first announcement
  // before the SR engine picks it up. We clear → wait one frame → set, so
  // each call produces a distinct mutation the SR will read. Pending
  // announcements stack via micro-queue: only the LAST queued message wins
  // (we don't want to read 3 stale messages back-to-back), but it always
  // fires in a fresh tick so it can't get clobbered by a same-tick second
  // call.
  var _tlAnnounceTimer = null;
  function tlAnnounce(msg) {
    var lr = document.getElementById('allo-live-throwlab');
    if (!lr) return;
    if (_tlAnnounceTimer) clearTimeout(_tlAnnounceTimer);
    lr.textContent = '';
    _tlAnnounceTimer = setTimeout(function() {
      lr.textContent = msg;
      _tlAnnounceTimer = null;
    }, 60);
  }

  // ═══════════════════════════════════════════
  // PHYSICS ENGINE
  // ═══════════════════════════════════════════

  // Air density at sea level, room temperature (kg/m³)
  var RHO = 1.225;
  // Gravity (m/s² Earth). simulatePitch accepts opts.gravity to override.
  var G = 9.81;
  // Planetary gravity presets — same numbers stem_tool_physics.js exposes,
  // so the two tools agree on "what gravity feels like on Mars". Pluto is
  // not included (its surface gravity is so weak the trajectory would walk
  // off the canvas).
  var GRAVITY_PRESETS = [
    { id: 'earth',   label: 'Earth',   g: 9.81,   icon: '🌍' },
    { id: 'moon',    label: 'Moon',    g: 1.62,   icon: '🌙' },
    { id: 'mercury', label: 'Mercury', g: 3.70,   icon: '☿️' },   // closest to Sun, gravity ≈ Mars
    { id: 'mars',    label: 'Mars',    g: 3.71,   icon: '🔴' },
    { id: 'saturn',  label: 'Saturn',  g: 10.44,  icon: '🪐' },   // sneaky-close to Earth
    { id: 'jupiter', label: 'Jupiter', g: 24.79, icon: '⚫' },
    { id: 'sun',     label: 'Sun',     g: 274.0,  icon: '☀️' }   // 28× Earth — extreme dropper
  ];
  // ── Engagement layer: Personal Bests ──
  // Per-sport "career highs" tracked across sessions. Each metric is a
  // simple number; on any throw, we walk the relevant metrics, compare,
  // and announce + persist if the student broke a record. Mirrors NBA
  // 2K MyCareer Highs / fantasy-sports records pages — a kid sees
  // their own all-time best and wants to top it.
  function checkPersonalBests(d, lr, stats) {
    var pbs = Object.assign({}, d.personalBests || {});
    var modeKey = d.mode;
    pbs[modeKey] = pbs[modeKey] || {};
    var sport = pbs[modeKey];
    var newRecords = [];
    function tryPB(metricKey, candidate, label, formatVal, minValue) {
      if (typeof candidate !== 'number' || isNaN(candidate)) return;
      if (minValue && candidate < minValue) return;
      var prev = sport[metricKey];
      if (prev == null || candidate > prev) {
        sport[metricKey] = candidate;
        newRecords.push({ label: label, value: formatVal ? formatVal(candidate) : candidate });
      }
    }
    var loc = lr && lr.location;
    var isMake = loc === 'strike' || loc === 'swish' || loc === 'made' || loc === 'goal' || loc === 'caught'
      || loc === 'good' || loc === 'wicket' || loc === 'shaved' || loc === 'bouncer' || loc === 'ace' || loc === 'in'
      || loc === 'green' || loc === 'fairway';
    if (d.mode === 'pitching' && loc === 'strike') {
      tryPB('fastestStrike', d.speedMph, 'Fastest strike', function(v) { return v + ' mph'; });
      tryPB('longestStrikeStreak', stats.streakStrikes || 0, 'Longest strike streak', null, 3);
    }
    // Curl is what spin bent the ball at the line (the model's spin shift), not how far the aim sent it sideways.
    var pbCurl = (lr && lr.read && lr.read.spinShift) ? lr.read.spinShift.side : null;
    if (d.mode === 'freekick' && loc === 'goal' && typeof pbCurl === 'number') {
      tryPB('biggestCurl', +Math.abs(pbCurl).toFixed(2), 'Biggest curl on a goal', function(v) { return v.toFixed(2) + ' m'; });
    }
    if (d.mode === 'fieldgoal' && loc === 'good') {
      tryPB('longestFG', d.fgDistanceYd || 0, 'Longest field goal made', function(v) { return v + ' yd'; });
    }
    if (d.mode === 'bowling' && (loc === 'wicket' || loc === 'shaved')) {
      tryPB('mostWickets', stats.totalWickets || 0, 'Most wickets in a session', null, 3);
    }
    if (d.mode === 'golf' && loc === 'green') {
      tryPB('greensInSession', (stats.golfClubsOnGreen ? Object.keys(stats.golfClubsOnGreen).length : 0), 'Different clubs to a green', null, 2);
    }
    if (d.mode === 'volleyball' && loc === 'ace') {
      tryPB('mostAces', stats.volleyAceCount || 0, 'Most aces in a session', null, 3);
      tryPB('fastestAce', d.speedMph, 'Fastest ace serve', function(v) { return v + ' mph'; });
    }
    if (d.mode === 'freethrow' && (loc === 'swish' || loc === 'made')) {
      tryPB('longestMakeStreak', stats.hotStreak || 0, 'Longest make streak', null, 3);
      tryPB('mostMakes', d.shotMakeCount || 0, 'Most makes in a session', null, 3);
    }
    // Cross-sport: longest hot streak ever (any mode)
    pbs.cross = pbs.cross || {};
    if (isMake && (stats.hotStreak || 0) >= 3 && (stats.hotStreak || 0) > (pbs.cross.longestStreakAnySport || 0)) {
      pbs.cross.longestStreakAnySport = stats.hotStreak;
      newRecords.push({ label: 'Longest streak (any sport)', value: stats.hotStreak });
    }
    return { personalBests: pbs, newRecords: newRecords };
  }

  // ── Engagement layer: Daily Challenge ──
  // Deterministic-by-date pick from SCENARIOS + customScenarios so
  // every student in the same class sees the same challenge today.
  // Tracks attempt + completion in toolData (dailyAttempted /
  // dailyCompleted, both keyed to date string). Mirrors fantasy-
  // sports daily-lineup hooks: come back tomorrow, see a new one.
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // Tiny string-hash so the same date → same scenario index
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }
  function getDailyChallenge() {
    var pool = SCENARIOS; // built-ins only — class-wide consistency
    if (!pool.length) return null;
    var idx = hashStr(todayKey()) % pool.length;
    return pool[idx];
  }

  // ── Engagement layer: Stats Card builder ──
  // Returns rows of {label, value} per sport — a fantasy-sports
  // stat-line a kid recognizes from their phone screen. Renders in
  // a "Your Numbers" panel + reuses the same data points the badges
  // and trading card already pull from. Pure data formatting, no
  // new state.
  function getStatsRows(d) {
    var s = d.drillStats || {};
    var pct = function(num, den) { return den ? Math.round((num / den) * 100) + '%' : '—'; };
    var rows = [];
    var totalThrows = (d.modeThrowCounts && d.modeThrowCounts[d.mode]) || 0;
    rows.push({ label: 'Sport attempts', value: totalThrows });
    rows.push({ label: 'All-sport attempts', value: d.throwCount || 0 });
    rows.push({ label: 'Hot streak', value: s.hotStreak || 0 });
    if (d.predictionStats && d.predictionStats.attempts) {
      rows.push({ label: 'Predictions matched', value: d.predictionStats.matches + ' / ' + d.predictionStats.attempts });
    }
    if (d.mode === 'pitching') {
      rows.push({ label: 'Strikes', value: d.strikeCount || 0 });
      rows.push({ label: 'Strike rate', value: pct(d.strikeCount || 0, totalThrows) });
      rows.push({ label: 'Pitch types thrown', value: Object.keys(d.pitchTypesUsed || {}).length });
      rows.push({ label: 'Pitch types struck', value: Object.keys(s.strikeTypes || {}).length });
    } else if (d.mode === 'freethrow') {
      rows.push({ label: 'Successful reps', value: d.shotMakeCount || 0 });
      rows.push({ label: 'Success rate', value: pct(d.shotMakeCount || 0, totalThrows) });
      rows.push({ label: 'Different swish heights', value: s.swishHeights || 0 });
      rows.push({ label: 'Bounce pass completed', value: s.completedBouncePass ? '✓' : '—' });
    } else if (d.mode === 'freekick') {
      rows.push({ label: 'Goals', value: d.goalCount || 0 });
      rows.push({ label: 'Goal rate', value: pct(d.goalCount || 0, totalThrows) });
      rows.push({ label: 'Kick styles scored', value: Object.keys(s.goalKickTypes || {}).length });
    } else if (d.mode === 'fieldgoal') {
      rows.push({ label: 'FGs made', value: d.fgMakeCount || 0 });
      rows.push({ label: 'Make rate', value: pct(d.fgMakeCount || 0, totalThrows) });
      rows.push({ label: 'Distances cleared', value: Object.keys(s.fgMadeByDist || {}).length });
    } else if (d.mode === 'bowling') {
      rows.push({ label: 'Wickets', value: d.wicketCount || 0 });
      rows.push({ label: 'Wicket rate', value: pct(d.wicketCount || 0, totalThrows) });
      rows.push({ label: 'Delivery types used', value: Object.keys(s.bowlTypes || {}).length });
    } else if (d.mode === 'golf') {
      rows.push({ label: 'Greens hit', value: d.golfGreenCount || 0 });
      rows.push({ label: 'Green rate', value: pct(d.golfGreenCount || 0, totalThrows) });
      rows.push({ label: 'Fairways hit', value: s.golfFairwaysHit || 0 });
      rows.push({ label: 'Clubs to a green', value: Object.keys(s.golfClubsOnGreen || {}).length });
    } else if (d.mode === 'volleyball') {
      rows.push({ label: 'Aces', value: d.volleyAceCount || 0 });
      rows.push({ label: 'Ace rate', value: pct(d.volleyAceCount || 0, totalThrows) });
      rows.push({ label: 'In-court serves', value: s.volleyInCount || 0 });
      rows.push({ label: 'Serve types in court', value: Object.keys(s.volleyServesIn || {}).length });
    }
    rows.push({ label: 'Badges earned', value: Object.keys(d.badgesEarned || {}).length + ' / ' + BADGES.length });
    // Career Highs — append the active sport\'s personal-bests as a
    // sub-section (separator first, then each PB in the same column
    // grid).
    var pbs = (d.personalBests && d.personalBests[d.mode]) || {};
    var pbKeys = Object.keys(pbs);
    if (pbKeys.length) {
      rows.push({ label: '── Career Highs ──', value: '' });
      // Pretty-print the metric keys we expect; fall back to raw key
      var pbLabels = {
        fastestStrike: 'Fastest strike (mph)',
        longestStrikeStreak: 'Longest strike streak',
        biggestCurl: 'Biggest curl (m)',
        longestFG: 'Longest FG (yd)',
        mostWickets: 'Most wickets',
        greensInSession: 'Greens / clubs',
        mostAces: 'Most aces',
        fastestAce: 'Fastest ace (mph)',
        longestMakeStreak: 'Longest make streak',
        mostMakes: 'Most makes'
      };
      pbKeys.forEach(function(k) {
        rows.push({ label: pbLabels[k] || k, value: pbs[k] });
      });
    }
    return rows;
  }

  // ── Engagement layer: Coach personality picker ──
  // Same Gemini call, different voice. Each persona prepends a short
  // system-style prefix to the Coach Mode prompt so the response
  // matches the persona's tone. The kid who wants Phil Jackson zen
  // calm gets it; the kid who wants Vince Lombardi intensity gets it.
  // Persisted in toolData.coachPersona; defaults to 'analyst'.
  var COACH_PERSONAS = [
    { id: 'analyst', label: 'Analyst', icon: '🎙️',
      prepend: 'Use a calm, analytical voice — present the physics like a broadcast color commentator. Educational but warm.' },
    { id: 'oldschool', label: 'Old School', icon: '🧢',
      prepend: 'Use a terse, demanding old-school coach voice. No frills. Short sentences. Tell the student what they did well, then exactly what to fix. "Good ball, kid. Now lower your release point" energy.' },
    { id: 'hype', label: 'Hype Man', icon: '🔥',
      prepend: 'Use an energetic, encouraging hype-man voice. Pump the student up. Use exclamation points sparingly but enthusiastically. "THERE YOU GO" / "THAT\'S WHAT I\'M TALKING ABOUT" energy. Stay specific and physics-grounded.' },
    { id: 'zen', label: 'Zen', icon: '🧘',
      prepend: 'Use a calm, reflective Phil Jackson zen-coach voice. Speak in measured rhythm. Connect the throw to a deeper principle. "Notice the apex. Notice where the ball wanted to go." Present-tense, observational.' }
  ];

  // ── Engagement layer: Achievements / Badges ──
  // Named badges unlocked from drill-stat criteria. The earn-detector
  // walks BADGES on every throw, awarding any whose `check` returns
  // true. Earned set persists in toolData.badgesEarned. Each first-
  // earn awards a small XP bonus + toast + tlAnnounce. Designed so
  // an athletic kid sees their collection grow as they explore — the
  // dopamine loop a sports kid recognizes from Madden / FIFA.
  var BADGES = [
    { id: 'beckham', emoji: '🌀', label: 'Beckham Badge',
      hint: 'Score a free kick that spin bends more than 3.5 m',
      check: function(d, lr) {
        // The Curling Shot preset bends 2.8 m on its own, so this needs more spin and a new aim.
        var bend = lr && lr.read && lr.read.spinShift ? lr.read.spinShift.side : null;
        return d.mode === 'freekick' && lr.location === 'goal' && typeof bend === 'number' && Math.abs(bend) > 3.5;
      } },
    { id: 'howzat', emoji: '🏏', label: 'Howzat',
      hint: '3 wickets, each with a different setup from the one before',
      check: function(d, lr, stats) { return d.mode === 'bowling' && (stats.vWickets || 0) >= 3; } },
    { id: 'money', emoji: '💰', label: 'Money',
      hint: 'Make 5 shots in a row, changing something each time',
      check: function(d, lr, stats) { return d.mode === 'freethrow' && (stats.variedStreak || 0) >= 5; } },
    { id: 'hailmary-hero', emoji: '🌠', label: 'Hail Mary Hero',
      hint: 'Make a 50+ yd field goal',
      check: function(d, lr) { return d.mode === 'fieldgoal' && lr.location === 'good' && (d.fgDistanceYd || 0) >= 50; } },
    { id: 'cutter', emoji: '⚡', label: 'Cutter',
      hint: 'Call it first, then strike with the slider',
      check: function(d, lr) { return d.mode === 'pitching' && lr.location === 'strike' && d.pitchType === 'slider' && !!d.predictionKey; } },
    { id: 'fastball-heat', emoji: '🔥', label: 'Fastball Heat',
      hint: 'Strike with a 4-Seam at 100+ mph',
      check: function(d, lr) { return d.mode === 'pitching' && lr.location === 'strike' && d.pitchType === '4seam' && d.speedMph >= 100; } },
    { id: 'knuckle-king', emoji: '🦋', label: 'Knuckle King',
      hint: 'Call it first, then strike with the knuckleball',
      check: function(d, lr) { return d.mode === 'pitching' && lr.location === 'strike' && d.pitchType === 'knuckle' && !!d.predictionKey; } },
    { id: 'birdie-threat', emoji: '⛳', label: 'Birdie Threat',
      hint: 'Call it first, then hit the green with the Sand Wedge',
      check: function(d, lr) { return d.mode === 'golf' && lr.location === 'green' && d.golfClub === 'wedge' && !!d.predictionKey; } },
    { id: 'ace-server', emoji: '🏐', label: 'Ace Server',
      hint: 'Land a volleyball ace',
      check: function(d, lr) { return d.mode === 'volleyball' && lr.location === 'ace'; } },
    // ── Stretch / mastery badges ──
    { id: 'streak-hunter', emoji: '🎯', label: 'Streak Hunter',
      hint: '10 makes in a row (any sport), changing something each time',
      check: function(d, lr, stats) { return (stats.variedStreak || 0) >= 10; } },
    { id: 'legendary', emoji: '👑', label: 'Legendary',
      hint: '25 makes in a row, changing something each time',
      check: function(d, lr, stats) { return (stats.variedStreak || 0) >= 25; } },
    { id: 'globetrotter', emoji: '🌍', label: 'Globetrotter',
      hint: 'Score in 3 different sports in one save',
      check: function(d) {
        // Counts sports where the student has at least one tracked make
        var sports = 0;
        if ((d.strikeCount || 0) >= 1) sports++;
        if ((d.shotMakeCount || 0) >= 1) sports++;
        if ((d.goalCount || 0) >= 1) sports++;
        if ((d.fgMakeCount || 0) >= 1) sports++;
        if ((d.wicketCount || 0) >= 1) sports++;
        if ((d.golfGreenCount || 0) >= 1) sports++;
        if ((d.volleyAceCount || 0) >= 1) sports++;
        return sports >= 3;
      } },
    { id: 'cosmonaut', emoji: '🚀', label: 'Cosmonaut',
      hint: 'Score on a non-Earth planet',
      check: function(d, lr, stats) {
        var loc = lr && lr.location;
        var isMake = loc === 'strike' || loc === 'swish' || loc === 'made' || loc === 'goal'
          || loc === 'good' || loc === 'wicket' || loc === 'shaved' || loc === 'ace'
          || loc === 'in' || loc === 'green' || loc === 'fairway';
        return isMake && d.gravityId && d.gravityId !== 'earth';
      } },
    { id: 'storm-rider', emoji: '🌪️', label: 'Storm Rider',
      hint: 'Score in 20+ mph wind',
      check: function(d, lr) {
        var loc = lr && lr.location;
        var isMake = loc === 'goal' || loc === 'good' || loc === 'green' || loc === 'fairway' || loc === 'wicket' || loc === 'ace';
        return isMake && (d.windMph || 0) >= 20;
      } },
    { id: 'curator', emoji: '📚', label: 'Curator',
      hint: 'Save 3 custom scenarios',
      check: function(d) { return (d.customScenarios || []).length >= 3; } }
  ];

  // ── Engagement layer: Hot-Hand + Hype ──
  // Sports broadcasting language scaffolding for athletic students who
  // bounce off academic framing. Streak indicator mirrors NBA Jam's
  // "He's heating up / On fire" momentum trope. Hype phrases are
  // cycled into a small pre-throw text box that auto-fades — never
  // blocks input. Tied to drillStats.streakStrikes (already tracked).
  var HYPE_PHRASES = [
    'Money time',
    'Show me what you got',
    'Lights, camera, clutch',
    'This is your moment',
    "Let's see it",
    'Time to cook',
    'Buckets',
    'In the zone',
    'Stay locked in',
    'One more rep',
    'Make it count',
    'Show out',
    'Let it rip',
    'Trust the work',
    'Take the shot'
  ];
  function pickHypePhrase(mode, attemptCount) {
    var modeOrder = ['pitching', 'freethrow', 'freekick', 'fieldgoal', 'bowling', 'golf', 'volleyball'];
    var modeIndex = Math.max(0, modeOrder.indexOf(mode));
    var attemptIndex = Math.max(0, Number(attemptCount) || 0);
    return HYPE_PHRASES[(attemptIndex + modeIndex * 3) % HYPE_PHRASES.length];
  }
  // Map a streak count to a Hot-Hand label. Returns null if the streak
  // is too short to surface (keeps the UI quiet during early misses).
  function getHotHand(streak) {
    if (!streak || streak < 2) return null;
    if (streak === 2) return { emoji: '🟧', label: 'Warming up', color: '#fb923c' };
    if (streak <= 4) return { emoji: '🔥', label: "Heating up!", color: '#ef4444' };
    return { emoji: '🔥🔥', label: 'ON FIRE', color: '#dc2626' };
  }

  // ── Scenarios ──
  // One-click teaching demos that combine mode + preset + gravity + wind
  // into a configured setup. Useful as a "warm up the lab" feature: the
  // teacher picks a scenario, the simulator snaps to it, students can
  // immediately throw and discuss WITHOUT manually dialing 6 controls.
  // Each scenario has a teach blurb describing what the student should
  // notice when they run it.
  var SCENARIOS = [
    { id: 'beckham', label: "Beckham's Curl", icon: '⚽',
      mode: 'freekick', presetId: 'curling', gravityId: 'earth',
      windMph: 0, windDirDeg: 0,
      teach: '22 m free kick with 600 rpm of sidespin. Watch the ball bend about 2.8 m around the wall — that\'s Magnus force in action. The signature soccer free kick.',
      questions: [
        'The spin force grows with both speed and spin rate. Why does Beckham strike the ball so hard if curl matters more than power?',
        'The wall is 9.15 m away, the goal is 22 m. How does the BALL position itself laterally over each segment of the flight?',
        'A right-footed kicker curls the ball one direction. What changes if the kicker is left-footed and standing on the same spot?'
      ] },
    { id: 'moon-fg', label: 'Field Goal on the Moon', icon: '🌙',
      mode: 'fieldgoal', presetId: 'long', gravityId: 'moon',
      windMph: 0, windDirDeg: 0,
      teach: '50-yard field goal at 1/6 Earth gravity. The ball stays in the air about 4 times as long (this lab keeps Earth\'s air, so drag still slows it) and travels far past the goalposts. Same speed + angle, drastically different trajectory — the lesson is that range scales with 1/g.',
      questions: [
        'Why does horizontal range scale with 1/g (inversely with gravity)? Derive it from the kinematic equations.',
        'The Moon has no atmosphere. How would adding Moon-gravity AND Earth-atmosphere change the trajectory differently?',
        'If you could pick ANY gravity for an Olympic javelin event, what would maximize distance — minimum gravity or some other value?'
      ] },
    { id: 'mariano', label: "Mariano's Cutter", icon: '⚾',
      mode: 'pitching', presetId: 'slider', gravityId: 'earth',
      windMph: 0, windDirDeg: 0,
      teach: 'A cutter in the style of Mariano Rivera\'s famous pitch: side spin slides the ball about 9 inches sideways on the way to the plate. Rivera threw his at about 90 to 93 mph; this setup is the lab\'s 84 mph slider.',
      questions: [
        // Rivera's cutter speed: https://www.baseballprospectus.com/news/article/9047/player-profile-mariano-rivera
        // About 150 ms to decide: https://www.popsci.com/story/science/why-is-hitting-a-baseball-so-hard/
        'An 84 mph slider reaches the plate in about 0.48 s. The hitter has about 0.15 s to decide after reading the spin. How does that timing favor the pitcher?',
        'Magnus force creates lateral break in the LAST third of the flight (the curve is non-linear). Why does the break feel more "sudden" than a constant curve?',
        'Why is Rivera\'s cutter called a "cutter" rather than a "slider" — what subtle difference in spin axis or velocity defines each?'
      ] },
    { id: 'parker-floater', label: "Tony Parker Floater", icon: '☔',
      mode: 'freethrow', presetId: 'floater', gravityId: 'earth',
      windMph: 0, windDirDeg: 0,
      teach: 'Slow, ultra-high (~62°) arc over a contesting big man. The ball is in the air about 1 second; the defender\'s hand is on the way DOWN by the time the ball drops through. Geometry beats reach.',
      questions: [
        'A 62° arc has more hangtime than a 45° arc but covers less horizontal distance per second. What\'s the physics trade-off?',
        // 7-footers' standing reach at the NBA combine is about 9 ft 4 in to 9 ft 9 in (2.85-2.97 m):
        // https://www.nba.com/news/nba-draft-combine-top-measurements-prospects
        'A 7-foot player standing with arms up can reach about 2.9 m. This floater peaks near 4.1 m. Why does that 1.2 m gap matter so much when the defender is right there?',
        'Why don\'t guards just shoot floaters all the time? What\'s the accuracy cost of releasing at high arc?'
      ] },
    { id: 'headwind-hailmary', label: 'Hail Mary into Headwind', icon: '💨',
      mode: 'fieldgoal', presetId: 'hailmary', gravityId: 'earth',
      windMph: 15, windDirDeg: 0,
      teach: '60-yard kick into a 15 mph headwind. In calm air this kick lands 59 yards out, just short. Into the wind it lands 47 yards out, 13 yards short of the posts. With an 8 mph tailwind it carries 66 yards and is good. This is why kickers check the flags.',
      questions: [
        'Drag scales with v² (relative to air, not ground). Headwind ADDS to relative airspeed — why does this make drag MORE than just additive?',
        'A 15 mph headwind costs this kick more than 12 yards. Would a 15 mph crosswind change the range as much, or differently?',
        'Does the best launch angle into a headwind shift higher or lower than in calm air? Test it.'
      ] },
    // The id stays for saved data. The preset is a leg-break, and so was the 1993 "Ball of the Century":
    // https://en.wikipedia.org/wiki/Ball_of_the_Century (no measured turn is published, so no comparison).
    { id: 'warne-googly', label: "Warne's Leg-Break", icon: '🌪️',
      mode: 'bowling', presetId: 'legspin', gravityId: 'earth',
      windMph: 0, windDirDeg: 0,
      teach: 'A 50 mph leg-spinner in the style of Shane Warne. It drifts about 28 cm one way in the air, bounces 3.9 m in front of the stumps, then turns back about 32 cm and hits them. Warne\'s "Ball of the Century" in 1993 was a leg-break too.',
      questions: [
        'In cricket the ball BOUNCES before reaching the batter. Why does spin in the AIR matter less than spin off the SURFACE?',
        '50 mph leg-spin is much slower than a 90 mph fast ball. How does the bowler use the speed difference to deceive the batter?',
        'A "googly" is a leg-spinner\'s wrong\'un — same arm action, opposite spin direction. Why does that work psychologically and geometrically?'
      ] },
    { id: 'driver-tail', label: 'Driver in a Tailwind', icon: '🏌️',
      mode: 'golf', presetId: 'driver', gravityId: 'earth',
      windMph: 8, windDirDeg: 180,
      teach: '250 yd driver with an 8 mph tailwind. The ball moves more slowly through the air, so drag drops, and it carries about 10 yards farther (261 yd). An 8 mph headwind costs about 13 yards.',
      questions: [
        'A tailwind at 8 mph pushes the ball forward by 8 mph during its airtime. Why does the actual carry increase by MORE than just (8 mph × airtime)?',
        'Tailwinds reduce ball-to-air relative speed, which reduces drag AND backspin lift. Which effect dominates for a driver, and why?',
        'If you played the same hole into an 8 mph headwind, would the carry decrease by the same amount? Why or why not?'
      ] },
    { id: 'olympic-jump', label: 'Olympic Jump Serve', icon: '🏐',
      mode: 'volleyball', presetId: 'jump', gravityId: 'earth',
      windMph: 0, windDirDeg: 0,
      teach: '62 mph jump serve from a 3.0 m release height with topspin. The Magnus force pulls the ball DOWN past the net at speed, so it lands about 0.7 s after contact.',
      questions: [
        'This 62 mph jump serve lands about 0.7 s after contact. How much of that time does a receiver have left to read the ball and move?',
        'Topspin Magnus force pulls the ball DOWN. Why is that helpful (rather than hurtful) for a high-speed serve over a 2.43 m net?',
        'The release height is 3.0 m, much higher than overhand serves. Why does a higher release point + topspin combine multiplicatively to make this serve so dangerous?'
      ] },
    { id: 'jupiter-pitcher', label: 'Pitching on Jupiter', icon: '⚫',
      mode: 'pitching', presetId: '4seam', gravityId: 'jupiter',
      windMph: 0, windDirDeg: 0,
      teach: 'A 92 mph 4-seam fastball at 2.5× Earth gravity. Thrown the same way as on Earth, it hits the dirt about 2.5 m before the plate. Lesson: backspin lift is far too small to beat that much gravity.',
      questions: [
        'A 4-seam fastball has backspin (Magnus lift up). On Jupiter, does the same backspin compensate for stronger gravity, or is it overwhelmed?',
        'How would a pitcher have to ADJUST their release angle on Jupiter to throw a strike?',
        'On Jupiter, would a curveball (topspin → drop) reach the plate at all? Compute the trajectory mentally.'
      ] }
  ];

  // Wind presets — quick-pick alternatives to manually setting speed +
  // direction. Direction convention: 0° = head (against the throw), 90° =
  // R-to-L cross, 180° = tail (with the throw), 270° = L-to-R cross.
  // Calm zeroes both fields; Tornado is intentionally exaggerated for
  // a dramatic teaching demo (real tornado speeds at the funnel are
  // 65-300+ mph, but ball physics break down past about 40 mph).
  var WIND_PRESETS = [
    { id: 'calm',     label: 'Calm',            mph: 0,  dirDeg: 0,   icon: '🌤️' },
    { id: 'tail',     label: 'Tailwind',        mph: 8,  dirDeg: 180, icon: '⬆️' },
    { id: 'head',     label: 'Strong Headwind', mph: 15, dirDeg: 0,   icon: '⬇️' },
    { id: 'cross',    label: 'Crosswind',       mph: 12, dirDeg: 90,  icon: '➡️' },
    { id: 'tornado',  label: 'Tornado',         mph: 40, dirDeg: 270, icon: '🌪️' }
  ];
  // Conversion helpers
  var MPH_PER_MPS = 2.23694;
  var FT_PER_M = 3.28084;

  // Ball specs — real-world. Each entry has flight params (mass, radius,
  // Cd, Cm) PLUS regulation specs (pressure, mass range, diameter range,
  // material) PLUS a coefficient of restitution (cor) for bounce physics.
  //
  // COR = coefficient of restitution. After a bounce, |v_after| = e·|v_before|
  // along the surface normal, so kinetic energy after = e² × KE before. A
  // perfectly elastic ball (no energy loss) has e = 1; a dead ball, e = 0.
  // Basketball drop test: the current NBA Rule 1 sets only the pressure (7.5-8.5 lb,
  // https://official.nba.com/rule-no-1-court-dimensions-equipment/). The drop test is in older
  // rulebooks (6 ft drop, rebound 49-54 in to the TOP of the ball) and the FIBA rules (1.8 m drop
  // from the bottom of the ball, rebound 1.2-1.4 m to the top; 2008 text at https://balls.com/?p=13).
  // sqrt(49/72)..sqrt(54/72) = 0.83-0.87 ignores that the two heights are measured to opposite sides
  // of the ball. Centre to centre (take off one 0.239 m diameter) FIBA gives e = 0.73-0.80 and the
  // old NBA test 0.74-0.79. Our 0.78 is a MODEL CHOICE inside that range.
  //
  // Cd values are approximate flight averages; real Cd varies with Reynolds
  // number + spin. Cm scaler tunes Magnus lift response — calibrated so
  // default pitches produce visually-recognizable break (curveball drops
  // ~12 inches more than fastball over 60.5 ft).
  var BALLS = {
    baseball: {
      label: 'Baseball', mass: 0.145, radius: 0.0366,
      cd: 0.35, cm: 0.95, liftScale: 0.7, cor: 0.55,
      knuckle: 0.3, knuckleCutRpm: 300, knuckleLobes: 4,
      color: '#fafafa', seamColor: '#dc2626',
      icon: '⚾',
      // Regulation specs — MLB (Rule 3.01) + 2021 ball spec
      regs: {
        league: 'MLB Rule 3.01',
        massSpec: '0.142–0.149 kg (5–5¼ oz)',
        diameterSpec: '0.073–0.075 m (9–9¼ in circumference)',
        pressureSpec: 'N/A (solid, not pressurized)',
        // Rule 3.01 (yarn on a cork/rubber core, two strips of cowhide); 108 double stitches per
        // https://blogs.loc.gov/loc/2018/03/baseballs-the-heart-of-the-matter/
        material: 'Cork-and-rubber core wound with yarn, covered by two strips of cowhide sewn with 108 double stitches (red thread)',
        physics: 'Mass + tight stitching keep Cd predictable. The seams trip airflow into a turbulent boundary layer, which helps a 4-seam fastball at 95 mph and 2,300 rpm make about 0.8 N of upward Magnus force, a bit more than half the ball\'s 1.4 N weight.'
      }
    },
    basketball: {
      label: 'Basketball', mass: 0.624, radius: 0.119,
      cd: 0.50, cm: 0.40, liftScale: 1.0, cor: 0.78,
      color: '#f97316', seamColor: '#1a1a1a',
      icon: '🏀',
      // NBA Rule 1, official ball spec
      regs: {
        // Pressure: NBA Rule 1. Size and weight: size 7 ball, 29.5 in and 22 oz
        // (https://www.wilson.com/en-fr/blogs/blog/how-to-choose-a-basketball). Leather, 8 panels:
        // https://www.nba.com/news/wilson-nba-partnership-game-ball-official-release
        league: 'NBA Rule 1 (pressure) · size 7 ball',
        massSpec: 'about 0.62 kg (22 oz)',
        diameterSpec: 'about 0.239 m (29.5 in circumference)',
        pressureSpec: '7.5–8.5 PSI (51–58 kPa)',
        material: 'Leather, 8 panels with channel seams (a composite ball tried in 2006 did not last). Pebbled grip surface for friction',
        physics: 'Pressure matters: a soft ball loses more energy when it hits the floor, so it bounces lower. The pebbled surface gives the friction needed to put backspin on a free throw.'
      }
    },
    soccer: {
      label: 'Soccer Ball', mass: 0.430, radius: 0.110,
      cd: 0.22, cm: 1.20, liftScale: 0.8, cor: 0.80,
      knuckle: 0.1, knuckleCutRpm: 150, knuckleLobes: 2,
      color: '#fafafa', seamColor: '#1a1a1a',
      icon: '⚽',
      regs: {
        // IFAB Law 2: https://www.thefa.com/football-rules-governance/lawsandrules/laws/football-11-11/law-2---the-ball (68-70 cm, 410-450 g, 0.6-1.1 atm).
        // Panels: https://en.wikipedia.org/wiki/Adidas_Telstar_18 (6 panels, glued; the 1970 Telstar had 32).
        league: 'IFAB Laws of the Game, Law 2',
        massSpec: '0.410–0.450 kg (14.5–16 oz) at the start of the match',
        diameterSpec: '0.216–0.223 m (68–70 cm circumference, size 5)',
        pressureSpec: '0.6–1.1 atm (8.5–15.6 PSI)',
        material: 'Synthetic panels over an inner bladder. The 1970 World Cup ball had 32 panels; the 2018 one had 6, glued instead of stitched',
        physics: 'With almost no spin, air leaves one side of the ball a little later than the other, and the push keeps changing side. That is the wobbling "knuckleball" kick.'
      }
    },
    football: {
      label: 'Football', mass: 0.410, radius: 0.110,
      cd: 0.20, cm: 0.10, liftScale: 0.1, cor: 0.62,
      color: '#7c2d12', seamColor: '#fafafa',
      icon: '🏈',
      regs: {
        league: 'NFL Rule 2',
        massSpec: '0.397–0.425 kg (14–15 oz)',
        diameterSpec: '~0.171 m short axis × 0.279 m long axis (prolate spheroid; we sphere-approximate for trajectory)',
        pressureSpec: '12.5–13.5 PSI (86–93 kPa)',
        // Wilson since 1941, "The Duke": https://www.wilson.com/en-us/blog/football/behind-scenes/how-wilson-and-duke-became-official-nfl-football
        material: 'Pebbled leather, four panels and laces. Wilson has made the NFL ball since 1941; it is called "The Duke"',
        physics: 'A tight spiral spins ALONG the axis of motion, so ω×v ≈ 0 — Magnus barely contributes (Cm ≈ 0.10). That\'s why a football\'s flight is mostly gravity and drag.'
      }
    },
    cricket: {
      label: 'Cricket Ball', mass: 0.160, radius: 0.0364,
      cd: 0.42, cm: 0.55, liftScale: 0.5, cor: 0.45,
      color: '#7f1d1d', seamColor: '#fafafa',
      icon: '🏏',
      regs: {
        // MCC Laws of Cricket, Law 4.1 (men's ball): https://www.lords.org/mcc/the-laws/the-ball
        // Six rows of seam stitches: https://en.wikipedia.org/wiki/Cricket_ball
        league: 'MCC Laws of Cricket, Law 4 (men\'s ball)',
        massSpec: '0.156–0.163 kg (5.5–5.75 oz)',
        diameterSpec: '0.071–0.073 m (8.81–9.0 in circumference)',
        pressureSpec: 'N/A (solid)',
        material: 'Cork core wound with string, leather cover with one raised seam of six rows of stitches. The seam, not the cover, is what makes the ball swing.',
        physics: 'Heavier than a baseball, with one raised seam. Tilt the seam and air leaves the two sides of the ball differently, so it swings sideways in the air.'
      }
    },
    golf: {
      label: 'Golf Ball', mass: 0.0459, radius: 0.0214,
      cd: 0.24, cm: 0.30, liftScale: 1.0, cor: 0.78,
      color: '#fafafa', seamColor: '#cbd5e1',
      icon: '⛳',
      regs: {
        // Rules of Golf, Equipment Rules (1.620 oz max, 1.680 in min):
        // https://www.randa.org/roe/the-rules-of-equipment/part-4-conformance-of-balls
        // 300 to 500 dimples: https://golf.com/gear/golf-balls/how-many-dimples-on-a-golf-ball/
        league: 'Rules of Golf, Equipment Rules (USGA / R&A)',
        massSpec: '≤ 0.0459 kg (1.62 oz max)',
        diameterSpec: '≥ 0.04267 m (1.68 in min)',
        pressureSpec: 'N/A (solid multi-layer core)',
        material: 'Rubber core under one or more layers and a hard cover. Most balls have 300 to 500 dimples.',
        physics: 'Dimples are the genius. They TRIP airflow into a turbulent boundary layer that hugs the ball longer before separating, so there is less drag and a dimpled ball flies much farther than a smooth one. Backspin (2,500–9,500 rpm in this lab) makes Magnus lift that keeps the ball in the air longer.'
      }
    },
    volleyball: {
      label: 'Volleyball', mass: 0.270, radius: 0.105,
      cd: 0.30, cm: 0.50, liftScale: 1.0, cor: 0.65,
      knuckle: 0.12, knuckleCutRpm: 150, knuckleLobes: 2,
      color: '#fafafa', seamColor: '#1e3a8a',
      icon: '🏐',
      regs: {
        league: 'FIVB Rule 3',
        massSpec: '0.260–0.280 kg (9.2–9.9 oz)',
        // FIVB Rule 3: 65-67 cm, 260-280 g, 0.30-0.325 kg/cm2 (4.26-4.61 psi). Panels (18 for decades,
        // 8-panel MVA200 from 2008, V200W from 2019): https://inside.cev.eu/sponsors-partners/mikasa/
        diameterSpec: '0.207–0.213 m (65–67 cm circumference)',
        pressureSpec: '0.30–0.325 kg/cm² (4.26–4.61 PSI)',
        material: 'Leather or synthetic leather over a rubber bladder. Balls had 18 panels for decades; the 2008 Olympic ball had 8, and the ball used since 2019 has 18 again.',
        physics: 'Light + low drag = strong spin-axis effect. A no-spin "float serve" wobbles like a knuckleball; a top-spin jump serve dives sharply past the net.'
      }
    }
  };

  // Pitch type presets — speed mph, spin rate rpm, spin axis (degrees relative to backspin)
  // axis 0° = pure backspin (4-seam fastball); axis 90° = pure sidespin (slider);
  // axis 180° = pure topspin (curveball drops faster). Spin axis is what the
  // student tweaks via grip preset; the underlying physics treats it as a unit
  // vector in 3D world space.
  var PITCH_TYPES = [
    // releaseHeight + aimDegV added Apr 30 2026 — without them the comparison
    // table at the top of the mode UI crashed on `pt.releaseHeight.toFixed(2)`.
    // Values reflect typical MLB overhand release (~1.85–1.95 m) with small
    // aimDegV adjustments per pitch — fastballs aim slightly down, curves
    // aim slightly up so topspin-induced drop lands in the strike zone.
    { id: '4seam', label: '4-Seam Fastball', icon: '🚀',
      speedMph: 92, spinRpm: 2300, spinAxisDeg: 0, aimDegV: -2.5, releaseHeight: 1.95,
      grip: 'Across the horseshoe, two fingers on the seams',
      teach: 'Pure backspin makes lift. In this lab the ball crosses the plate about 17 inches higher than the same throw with no spin. It still falls. It just falls less, so it looks like it rises.' },
    { id: '2seam', label: '2-Seam Fastball', icon: '🎯',
      speedMph: 90, spinRpm: 2150, spinAxisDeg: 25, aimDegV: -2, aimDegH: -0.6, releaseHeight: 1.95,
      grip: 'Along the seams where they come closest',
      teach: 'Tilted backspin: still plenty of lift, plus about 7 inches of sideways run. A little slower than a 4-seam.' },
    { id: 'curve', label: 'Curveball (12-6)', icon: '🌀',
      speedMph: 78, spinRpm: 2600, spinAxisDeg: 180, aimDegV: 2, releaseHeight: 1.95,
      grip: 'Middle finger along the seam, snap downward',
      teach: 'Pure topspin: the spin force points DOWN, on top of gravity. In this lab the ball crosses about 19 inches lower than the same throw with no spin.' },
    { id: 'slider', label: 'Slider', icon: '↔️',
      speedMph: 84, spinRpm: 700, spinAxisDeg: 90, aimDegV: 0, aimDegH: -0.7, releaseHeight: 1.9,
      grip: 'Off-center, fingers along the side seam',
      // Sliders: about 2,400-2,500 rpm total, about 25% of it useful spin (the rest is gyro / bullet spin):
      // https://rapsodo.com/understanding-rapsodo-pitching-data-spin-rate-efficiency-profile-curveball-slider-changeup/
      teach: 'Side spin: about 9 inches of sideways break and almost no lift. A real slider spins near 2,400 rpm, but most of that is bullet spin (like a football spiral), which makes no sideways force. Only the side-spin part, about 700 rpm, is modeled here.' },
    { id: 'knuckle', label: 'Knuckleball', icon: '🦋',
      speedMph: 65, spinRpm: 25, spinAxisDeg: 0, aimDegV: 2, releaseHeight: 1.85,
      grip: 'Knuckles on the ball, no wrist snap',
      teach: 'Almost no spin (about 25 rpm), so almost no spin force. Instead the ball darts. Air leaves one side of it later than the other and pushes it sideways: up to about 8 inches in this lab. In real life nobody can tell which way it will go. Here each numbered air pattern repeats exactly, so you can test it.' },
    { id: 'changeup', label: 'Change-Up', icon: '🐢',
      speedMph: 80, spinRpm: 1800, spinAxisDeg: 15, aimDegV: -1, aimDegH: -0.4, releaseHeight: 1.85,
      grip: 'Circle change — ball deeper in the palm',
      teach: 'Looks like a fastball at release but ~12 mph slower. Hitter\'s timing is wrecked.' }
  ];

  // Basketball shot presets — speed mph, release angle, release height, spin (almost always
  // backspin for basketball; spin axis stays at 0°). The teaching surface here is RELEASE
  // ANGLE + RELEASE HEIGHT, not pitch type — that's the whole free-throw lesson.
  var SHOT_TYPES = [
    { id: 'freethrow', label: 'Free Throw', icon: '🆓',
      speedMph: 16.5, spinRpm: 180, spinAxisDeg: 0, aimDegV: 52, releaseHeight: 2.2, distanceM: 4.19,
      grip: 'Square stance, ball balanced on shooting hand fingertips',
      teach: 'Standard free-throw form: high arc (~52°), backspin to "soften" the ball if it hits the rim. The taller you are, the flatter you can shoot.' },
    { id: 'jumper', label: 'Jump Shot', icon: '🦘',
      speedMph: 17, spinRpm: 200, spinAxisDeg: 0, aimDegV: 48, releaseHeight: 2.6, distanceM: 5,
      grip: 'Released at the top of the jump for higher release point',
      teach: 'Jumping raises your release point ~0.4m. Same arc but harder to defend — defender\'s arms can\'t reach the higher release.' },
    { id: 'hook', label: 'Hook Shot', icon: '🪝',
      speedMph: 12.25, spinRpm: 150, spinAxisDeg: 30, aimDegV: 55, aimDegH: -1, releaseHeight: 2.8, distanceM: 2.5,
      grip: 'One-handed sweep across the body, very high release',
      teach: 'Kareem Abdul-Jabbar\'s skyhook made this shot famous. The release point is so high (~2.8m) that defenders find it hard to block; tradeoff is some lateral spin so accuracy is harder.' },
    { id: 'bank', label: 'Bank Shot', icon: '🪞',
      speedMph: 16.25, spinRpm: 220, spinAxisDeg: 0, aimDegV: 45, releaseHeight: 2.3, distanceM: 3.5,
      grip: 'Aim for the upper square painted on the backboard',
      teach: 'Off the backboard. Lower arc + harder shot, but the backboard absorbs error — geometry forgives a wider release angle than a swish would.' },
    { id: 'three', label: '3-Pointer', icon: '🎯',
      speedMph: 20.75, spinRpm: 220, spinAxisDeg: 0, aimDegV: 49, releaseHeight: 2.5, distanceM: 7.24,
      grip: 'Same form as a free throw but with more leg drive',
      teach: 'The NBA 3-point line is 7.24 m from the hoop. A longer shot needs more speed. The arc stays near 49° so the ball still drops in instead of skipping off the back of the rim.' },
    { id: 'floater', label: 'Floater / Teardrop', icon: '☔',
      speedMph: 14.75, spinRpm: 280, spinAxisDeg: 0, aimDegV: 62, releaseHeight: 2.4, distanceM: 3,
      grip: 'One-handed soft touch, fingers flick UP and forward',
      teach: 'Tony Parker\'s signature finishing move. Ultra-high arc (~62°) over a contesting big man. Released early in the jump (lower than a true jumper) but with extreme arc to clear the defender. A 62° release keeps the ball in the air about 1 second, long enough to drop over a defender\'s hand.' },
    { id: 'stepback', label: 'Step-Back Jumper', icon: '⬅️',
      speedMph: 18.5, spinRpm: 230, spinAxisDeg: 0, aimDegV: 50, releaseHeight: 2.5, distanceM: 5.8,
      grip: 'Plant inside foot, push off + away; release slightly behind base',
      teach: 'James Harden / Luka Dončić signature move. Step backward 0.5-1.0 m to create separation. The ball still has to reach the rim — ~1 m extra distance means slightly more speed (+1-2 mph). Ideal arc stays ~50°; release height drops slightly because of backward momentum.' },
    { id: 'halfcourt', label: 'Half-Court Heave', icon: '🌠',
      speedMph: 28.75, spinRpm: 100, spinAxisDeg: 0, aimDegV: 47, releaseHeight: 2.4, distanceM: 13,
      grip: 'Two-handed overhead toss — chuck it like a soccer throw-in',
      teach: 'A buzzer-beater heave from about 13 m (43 ft). It needs about 29 mph, well above the 21 mph of a 3-pointer, and the ball is in the air about 1.8 seconds. Even pros make only a few in a hundred: a tiny change in speed moves the landing spot a long way.' },
    // PASS variants — use COR physics, target a teammate at chest height ~6 m away.
    // kind: 'pass' switches the scene + classifier (passing court vs hoop).
    { id: 'bouncepass', kind: 'pass', label: 'Bounce Pass', icon: '↘️',
      // Retuned 11-23 for the hardwood bounce rule (HARDWOOD_SURFACE); the tests check every number here.
      speedMph: 25, spinRpm: 60, spinAxisDeg: 0, aimDegV: -9, releaseHeight: 1.2,
      grip: 'Two-handed chest position, push down and forward',
      teach: 'Bounce it about ⅔ of the way: this pass hits the floor 3.8 m out, and your teammate is 6 m away. The floor\'s friction takes 40% of its forward speed (23 mph down to 14 mph), so it arrives later than a chest pass and about waist high. It is hard to steal because it stays below the defender\'s hands.' },
    { id: 'chestpass', kind: 'pass', label: 'Chest Pass', icon: '➡️',
      speedMph: 27, spinRpm: 50, spinAxisDeg: 0, aimDegV: 10.5, releaseHeight: 1.4,
      grip: 'Two-handed chest position, snap wrists forward',
      teach: 'Direct flat pass at chest height. Faster than a bounce pass (no time lost to bouncing) but easier to intercept — defender just needs hands up. Backspin keeps the ball from sailing.' }
  ];

  // Soccer free-kick presets — the headline lesson is SPIN AXIS:
  //   90° ≈ pure sidespin (curling shot, ball bends around the wall)
  //    0° ≈ backspin (lifts a low chip)
  //   near-zero spin = knuckle
  // Curve magnitude over a 22m kick is ~1-1.5m for ~600 rpm of sidespin —
  // recognizably "Beckham" without being a cartoon.
  var KICK_TYPES = [
    { id: 'curling', label: 'Curling Shot', icon: '🌀',
      speedMph: 60, spinRpm: 600, spinAxisDeg: 105, aimDegV: 16.5, aimDegH: -9, releaseHeight: 0.11,
      grip: 'Strike with the inside of the foot, follow through across the body',
      teach: 'Bend it like Beckham: about 600 rpm of side spin bends the ball about 2.8 m sideways over this 22 m kick. That is enough to start it outside the wall and bring it back inside the post. More spin means more curl and less control.' },
    { id: 'knuckle', label: 'Knuckle Shot', icon: '🦋',
      speedMph: 69, spinRpm: 30, spinAxisDeg: 0, aimDegV: 13, releaseHeight: 0.11,
      grip: 'Strike dead-center with the laces, no follow-through',
      teach: 'Struck with almost no spin, so the ball darts in the air: up to about 0.4 m sideways over this 22 m kick. It has to go over the wall and still dip under the bar. Change the air pattern and the same kick can hit the bar. A real keeper cannot read it either.' },
    { id: 'power', label: 'Power Drive', icon: '💥',
      speedMph: 78, spinRpm: 200, spinAxisDeg: 0, aimDegV: 5, aimDegH: 8, releaseHeight: 0.11,
      grip: 'Full-foot strike, low backswing, ankle locked',
      teach: 'Pure speed (78 mph) on a low line, aimed just outside the wall. Almost no curve, and it reaches the goal in about 0.7 s.' },
    { id: 'chip', label: 'Chip / Lob', icon: '🥄',
      speedMph: 35, spinRpm: 400, spinAxisDeg: 0, aimDegV: 37, releaseHeight: 0.11,
      grip: 'Underneath the ball with the toe, short backswing',
      teach: 'High arc (about 37°) over the wall. Backspin keeps the ball in the air longer. Used when the keeper is off the line.' }
  ];

  // ── Cricket bowling presets ──
  // Cricket bowling is the SECOND ball-bouncing sport in ThrowLab (after the
  // basketball bounce-pass). Distance is 20.12 m (22 yards crease-to-crease;
  // stumps live at the batter's end). The ball is heavier than a baseball
  // (~0.16 kg) and is delivered with a STRAIGHT ARM (the ICC allows the elbow
  // to straighten by up to 15 degrees).
  //
  // The headline cricket lesson: ball BOUNCES off the pitch ~3-5 m before
  // the batter ("good length"), which means the trajectory you see at
  // release is NOT the trajectory the batter sees. Spin axis controls
  // post-bounce deviation — off-spin and leg-spin turn the ball laterally
  // off the surface, which is the entire point of slow bowling.
  //
  // Modeling note: the ball bounces once off the pitch (see pitchBounce). The bounce
  // takes pace off, and side spin turns the ball off the pitch. A full toss (no bounce)
  // is legal below waist height. The wicket is judged where the ball passes the stumps.
  var CRICKET_DELIVERIES = [
    { id: 'fast', label: 'Fast (Pace Bowling)', icon: '🚀',
      speedMph: 90, spinRpm: 1200, spinAxisDeg: 0, aimDegV: -8, releaseHeight: 2.3,
      grip: 'Two fingers along the seam, wrist behind the ball',
      teach: 'Express pace. The ball leaves the hand at 90 mph going down about 8°, bounces 5.8 m in front of the stumps and hits them. The bounce costs pace: friction with the pitch takes the ball from 84 mph to 73 mph.' },
    { id: 'outswing', label: 'Out-Swinger', icon: '↗️',
      speedMph: 82, spinRpm: 1400, spinAxisDeg: 60, aimDegV: -7, aimDegH: -0.5, releaseHeight: 2.3,
      grip: 'Seam tilted toward the slips (away from the batter)',
      teach: 'Curves AWAY from a right-handed batter in the air: about 12 cm in this lab. Then it cuts back about 9 cm off the pitch. A real swing ball moves because of its tilted seam. The lab uses spin to make the same sideways push.' },
    { id: 'inswing', label: 'In-Swinger', icon: '↙️',
      speedMph: 82, spinRpm: 1400, spinAxisDeg: -60, aimDegV: -7, aimDegH: 0.5, releaseHeight: 2.3,
      grip: 'Seam tilted toward leg slip (into the batter)',
      teach: 'Curves INTO a right-handed batter in the air: about 12 cm in this lab. The bowler starts it outside off stump and the swing brings it back onto the stumps. The batter plays for one line and the ball ends up on another.' },
    { id: 'offspin', label: 'Off-Spin', icon: '🌀',
      speedMph: 55, spinRpm: 2400, spinAxisDeg: 90, aimDegV: -1.5, aimDegH: -0.5, releaseHeight: 2.4,
      grip: 'Index finger pulls down on the seam; ball spins clockwise (RHB view)',
      teach: 'Slow finger spin. In the air the ball drifts about 27 cm away from a right-handed batter. Then the spin grips the pitch and the ball turns back about 25 cm onto the stumps. The bounce also slows it from 52 mph to 43 mph.' },
    { id: 'legspin', label: 'Leg-Spin', icon: '🌪️',
      speedMph: 50, spinRpm: 2500, spinAxisDeg: -90, aimDegV: 0, aimDegH: 0.4, releaseHeight: 2.4,
      grip: 'Wrist flicked outward; ball spins counter-clockwise',
      teach: 'Wrist spin, the other way round. The ball drifts about 28 cm toward the batter\'s legs in the air, then turns back about 32 cm off the pitch: the biggest turn in this lab. Shane Warne made this delivery famous. It is hard to bowl accurately.' },
    { id: 'bouncer', kind: 'bouncer', label: 'Bouncer (Short)', icon: '⬆️',
      speedMph: 88, spinRpm: 1100, spinAxisDeg: 0, aimDegV: -15, releaseHeight: 2.3,
      grip: 'Bang the ball in about half way down the pitch',
      teach: 'A short ball, banged in hard. It leaves the hand going down about 15°, bounces 11.0 m in front of the stumps (about half way) and climbs to 1.15 m at the batter. It is aimed at the batter, not the stumps, so the goal here is chest to helmet height. Test cricket allows two an over.' }
  ];

  // Cricket verdict. The ball may bounce once off the pitch (most deliveries do) or not at
  // all (a full toss). The simulation ends the delivery at a second landing.
  //   'short'    it landed a second time before the stumps (a no-ball in the Laws)
  //   'beamer'   a full toss that reaches the batter above waist height (a no-ball)
  //   'overhead' it bounced and passed the batter above head height
  //   'bouncer'  Bouncer preset only: bounced once, reached the batter at chest-to-head height
  //   'wicket' / 'shaved' / 'wide' / 'dot'  judged where the ball passes the stumps
  function classifyBowlResult(samples, mm, kind) {
    if (!samples || samples.length < 2) return 'short';
    var batZ = mm.targetZ - mm.batterZ;
    var bounced = false, bat = null, stump = null;
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      if (cur.ground && cur.z < mm.targetZ) bounced = true;
      if (!bat && prev.z < batZ && cur.z >= batZ) {
        var fb = (batZ - prev.z) / (cur.z - prev.z);
        bat = { x: prev.x + (cur.x - prev.x) * fb, y: prev.y + (cur.y - prev.y) * fb };
      }
      if (prev.z < mm.targetZ && cur.z >= mm.targetZ) {
        var f = (mm.targetZ - prev.z) / (cur.z - prev.z);
        stump = { x: prev.x + (cur.x - prev.x) * f, y: prev.y + (cur.y - prev.y) * f };
        break;
      }
    }
    if (!stump) return 'short';
    if (!bounced && bat && bat.y > mm.waistHeight) return 'beamer';
    if (bounced && bat && bat.y > mm.chestBand[1]) return 'overhead';
    if (kind === 'bouncer' && bounced && bat && Math.abs(bat.x) <= mm.wideHalfWidth && bat.y >= mm.chestBand[0]) return 'bouncer';
    if (stump.y > 1.8) return 'overhead';
    if (Math.abs(stump.x) <= mm.stumpsHalfWidth && stump.y > 0 && stump.y <= mm.stumpsHeight) return 'wicket';
    // Just clipping the stumps (a bail-trembler still counts)
    if (Math.abs(stump.x) <= mm.stumpsHalfWidth + 0.04 && stump.y > 0 && stump.y <= mm.stumpsHeight + 0.04) return 'shaved';
    if (Math.abs(stump.x) > mm.wideHalfWidth) return 'wide';
    // Inside the wide line but missing the stumps: a ball the batter can leave or block.
    return 'dot';
  }

  // ── Golf tee-shot presets ──
  // Golf is the LONGEST-distance sport in ThrowLab — driver shots travel
  // ~228 m (250 yd) of carry, about four times the next-longest event
  // (Hail Mary FG at ~55 m). The headline golf lesson is the LOFT-DISTANCE
  // tradeoff: low-loft clubs (driver, 12°) carry the farthest but offer no
  // help when the lie is bad; high-loft clubs (sand wedge, 56°) only carry
  // ~75 m but rise sharply, drop steeply, and stop near the landing point.
  //
  // Spin matters too: backspin on a wedge (~9000 rpm) is what makes a ball
  // "check up" on the green — the Magnus lift slows the descent so the ball
  // lands soft. Drivers spin much less (~2500 rpm) so they roll out for ~30
  // yards extra distance.
  //
  // Modeling note: ThrowLab's simulator does not model post-landing roll.
  // We classify total carry only — students see WHERE the ball lands,
  // teach blurbs explain that real golf adds 10-30 yards of roll on a
  // driver vs ~0 yards on a wedge. Targets are fairway / green zones at
  // varying distances per club.
  var GOLF_TYPES = [
    { id: 'driver', label: 'Driver (1W)', icon: '🚀',
      speedMph: 157, spinRpm: 2500, spinAxisDeg: 0, aimDegV: 12, releaseHeight: 0.04,
      carryYd: 250,
      grip: 'Tee height ~3 cm; ball off the inside of front foot; full shoulder turn',
      // Ball speed is about 1.49 x club speed for tour drivers: https://www.trackman.com/blog/golf/smash-factor
      teach: 'Longest club, lowest loft. Ball speed about 157 mph (a 105 mph swing). It carries about 250 yd here, and about 108 yd of that comes from backspin lift: with no spin the same shot lands near 142 yd.' },
    { id: 'fairway', label: '5-Wood', icon: '🌲',
      speedMph: 128, spinRpm: 4000, spinAxisDeg: 0, aimDegV: 14, releaseHeight: 0.0,
      carryYd: 215,
      grip: 'Ball middle-of-stance; sweep through, no divot',
      teach: 'Shorter than a driver but easier to hit off the fairway. About 215 yd of carry. More loft means a steeper landing, so the ball stops sooner. Use it when you need accuracy more than distance.' },
    { id: 'iron', label: '7-Iron', icon: '⛳',
      speedMph: 99, spinRpm: 6500, spinAxisDeg: 0, aimDegV: 17, releaseHeight: 0.0,
      carryYd: 160,
      grip: 'Ball center-of-stance; descending strike, take a divot AFTER the ball',
      teach: 'Mid-iron, the workhorse. About 160 yd of carry. Higher spin (about 6,500 rpm) lifts the ball in flight, to a peak near 20 m. It lands soft on the green: an approach club from 160 yards.' },
    // Sand wedges are usually 54-58 degrees, 56 the most common: https://mygolfspy.com/news-opinion/you-asked-what-loft-is-a-sand-wedge/
    { id: 'wedge', label: 'Sand Wedge (56°)', icon: '🏖️',
      speedMph: 65, spinRpm: 9500, spinAxisDeg: 0, aimDegV: 30, releaseHeight: 0.0,
      carryYd: 85,
      grip: 'Open the clubface; ball forward; cut across the ball for extra spin',
      teach: 'A high-loft club: most sand wedges have 54-58° of loft. About 85 yd of carry. The 9,500 rpm of backspin helps the ball stop soon after it lands (this lab does not show the roll). Used for greenside shots and short approaches. Great for trouble.' }
  ];

  // Score classifier for golf. Each preset has a target distance (carryYd).
  // The "fairway" zone is ±15 yd of target distance. The "green" zone is
  // ±5 yd of target. Way long → in the woods (or trouble); way short →
  // chunked / topped. Lateral spread matters too — a slice/hook misses
  // the fairway sideways.
  function classifyGolfResult(samples, targetYd, lateralTol) {
    if (!samples || samples.length < 2) return 'topped';
    // Find landing point (first sample where y <= 0 with z > 5)
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      if (cur.y <= 0 && cur.z > 5) {
        // Interpolate exact landing
        var f = (cur.y === prev.y) ? 0 : prev.y / (prev.y - cur.y);
        var lz = prev.z + (cur.z - prev.z) * f;
        var lx = prev.x + (cur.x - prev.x) * f;
        var landYd = lz / 0.9144;
        var lateralYd = Math.abs(lx) / 0.9144;
        var distOff = Math.abs(landYd - targetYd);
        // Way off line → in the woods regardless of distance
        if (lateralYd > lateralTol * 2.5) return 'woods';
        if (lateralYd > lateralTol * 1.5) return 'rough';
        // On-line: classify by distance
        if (distOff <= 5) return 'green';      // pin-high or close
        if (distOff <= 15) return 'fairway';   // good shot, just past pin
        if (landYd < targetYd - 25) return 'short';
        if (landYd > targetYd + 25) return 'long';
        return 'rough';
      }
    }
    return 'topped';  // never reached the ground = ball never hit / driver swing whiff
  }

  // ── Volleyball serve presets ──
  // Volleyball is the SHORTEST-distance major sport in ThrowLab — server's
  // line is 9 m from the net, target court is the back 9 m beyond. The
  // headline lesson is SPIN AXIS: a no-spin float serve wobbles like a
  // soccer knuckleball, while top-spin jump serves dive sharply past the
  // net. Server stands at z=0, net stretches across z=9 m at 2.43 m height
  // (men's), target court is z=9 m to z=18 m, court width ±4.5 m.
  //
  // Spin axis convention (matches global Throw Lab convention):
  //   0° = backspin (lifts; used in gentle underhand serves)
  // 180° = topspin (drops the ball — what you want past the net)
  //  ~0 rpm + 0° = "float" (no-spin wobble)
  //
  // Modeling note: simulatePitch handles 3D drag + Magnus correctly for
  // these speeds. We don't model the receiving team's pass — the outcome
  // classifies at the LANDING POINT (where the ball first hits y=0
  // beyond the net).
  var VOLLEYBALL_TYPES = [
    { id: 'float', label: 'Float Serve', icon: '🦋',
      speedMph: 42, spinRpm: 30, spinAxisDeg: 0, aimDegV: 9.5, releaseHeight: 2.3,
      grip: 'Stiff wrist, contact dead-center of the ball, NO follow-through',
      teach: 'Hit with almost no spin, so the ball darts: up to about 0.3 m sideways in this lab, and it can drop a little short or carry a little long. That is why it is hard to pass. The same physics as a baseball knuckleball. It is a very common serve, especially in women\'s and beach volleyball.' },
    { id: 'jump', label: 'Jump Serve', icon: '🚀',
      speedMph: 62, spinRpm: 480, spinAxisDeg: 180, aimDegV: 7, releaseHeight: 3.0,
      grip: 'Toss high in front, attack-jump approach, snap-wrist top-spin contact',
      teach: 'Highest-skill serve. Toss the ball ~3 m high in front of you, run a 3-step approach, jump to ~3.0 m release height, contact with topspin. The Magnus lift pushes the ball DOWN, so it can clear the net at speed and still land in. Top servers (Wilfredo Leon ~80+ mph) make this almost unplayable.' },
    // Float serves are the most used in elite women's beach play (https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2020.559277);
    // men use more topspin jump serves. Leon's 135.6 km/h (84 mph) VNL serve:
    // https://en.volleyballworld.com/news/leon-demolishes-vnl-serving-record
    { id: 'topspin', label: 'Top-Spin Serve', icon: '🌀',
      speedMph: 48, spinRpm: 400, spinAxisDeg: 180, aimDegV: 14, releaseHeight: 2.4,
      grip: 'Toss above hitting shoulder, brush UP and OVER the ball at contact',
      teach: 'Topspin without the jump — middle-school + JV staple. About 400 rpm of topspin brings the ball down about 6 m sooner than the same serve with no spin. Clears the net with margin, still lands deep. Easier to control than a jump serve, harder to ace.' },
    { id: 'underhand', label: 'Underhand Serve', icon: '🤲',
      speedMph: 32, spinRpm: 60, spinAxisDeg: 0, aimDegV: 27, releaseHeight: 1.0,
      grip: 'Stable platform with non-dominant hand, swing dominant hand from below the waist',
      teach: 'Beginner serve. High arc (~25° launch), slow speed, gentle backspin. Easy to land in (high arc clears the net), but easy to pass — a passer has 1+ second of reaction time. Great for skill-building before progressing to overhand.' }
  ];

  // Score classifier for volleyball serves. Walks samples; first checks
  // for a NET hit (z crossing the net plane below net height), then for
  // a LANDING (y crossing 0 beyond the net). Returns:
  //   'net' — hit the net, didn't clear
  //   'short' — landed on server's side of the net (over-net unders)
  //   'long' — landed past the back line
  //   'out' — landed wide of the sideline
  //   'ace' — landed in the deep-corner zone (back 15% × outer 30%)
  //   'in' — clean serve, landed in the receiving court
  function classifyVolleyResult(samples, mm) {
    if (!samples || samples.length < 2) return 'short';
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // Net intersection? (z crosses netZ plane below net height)
      if (prev.z < mm.netZ && cur.z >= mm.netZ) {
        var fn = (mm.netZ - prev.z) / (cur.z - prev.z);
        var nx = prev.x + (cur.x - prev.x) * fn;
        var ny = prev.y + (cur.y - prev.y) * fn;
        if (Math.abs(nx) <= mm.courtHalfWidth && ny > 0 && ny <= mm.netHeight) return 'net';
      }
      // Ball lands? (y crosses 0)
      if (prev.y > 0 && cur.y <= 0) {
        var fy = prev.y / (prev.y - cur.y);
        var lz = prev.z + (cur.z - prev.z) * fy;
        var lx = prev.x + (cur.x - prev.x) * fy;
        if (lz < mm.netZ) return 'short';
        if (lz > mm.targetZ) return 'long';
        if (Math.abs(lx) > mm.courtHalfWidth) return 'out';
        // Ace zone: back 15% of court × outer 30% of width
        if (lz > mm.targetZ - (mm.targetZ - mm.netZ) * 0.15
            && Math.abs(lx) > mm.courtHalfWidth * 0.70) return 'ace';
        return 'in';
      }
    }
    return 'short';
  }

  // Football field goal presets — distance + power tradeoff. The headline lesson
  // is the angle ↔ distance tradeoff: too flat and the ball crashes into the
  // crossbar; too steep and you lose distance to vertical wastage. Each preset
  // sets a target distance the player should TRY to clear by adjusting speed
  // and angle. Spin axis = 0 (no Magnus); spinRpm scales kick power slightly.
  // distanceYd is metadata used for UI label + scenario distance setup.
  // Round 2: each preset is a SITUATION (a distance and a wind) with a kick that only just
  // clears. Every number in the teach lines is checked against the model by the tests.
  // Wind direction: 0 = headwind, 90 = across the field, 180 = tailwind.
  var GOAL_TYPES = [
    { id: 'chipshot', label: 'Chip Shot (20 yd)', icon: '🥧',
      speedMph: 44, spinRpm: 0, spinAxisDeg: 0, aimDegV: 32, releaseHeight: 0.0,
      distanceYd: 20, windMph: 0, windDirDeg: 0,
      grip: 'Hold the laces away, plant foot beside the ball',
      teach: 'A short kick in calm air. It clears the 3.05 m crossbar by about 1.4 m. Take speed off a little at a time: how slow can you go before it hits the bar?' },
    { id: 'midrange', label: 'Mid-Range (35 yd), crosswind', icon: '🎯',
      speedMph: 53, spinRpm: 0, spinAxisDeg: 0, aimDegV: 35, aimDegH: -4.5, releaseHeight: 0.0,
      distanceYd: 35, windMph: 18, windDirDeg: 90,
      grip: 'Standard placement, full leg drive',
      teach: 'An 18 mph wind blows across the field. It pushes this kick about 3.4 m sideways on the way to the posts, so the kick is aimed 4.5° into the wind. Set the left/right aim back to 0 and it sails wide.' },
    { id: 'long', label: 'Long (50 yd), headwind', icon: '💪',
      speedMph: 71, spinRpm: 0, spinAxisDeg: 0, aimDegV: 36, releaseHeight: 0.0,
      distanceYd: 50, windMph: 10, windDirDeg: 0,
      grip: 'Full backswing, dig the toe under the ball',
      teach: 'Into a 10 mph headwind. This kick clears the bar by about 1.3 m. In calm air the same kick would clear it by about 6.2 m. The wind makes the air hit the ball faster, so drag is bigger.' },
    { id: 'hailmary', label: 'Hail Mary (60 yd), tailwind', icon: '🌠',
      speedMph: 68, spinRpm: 0, spinAxisDeg: 0, aimDegV: 38, releaseHeight: 0.0,
      distanceYd: 60, windMph: 8, windDirDeg: 180,
      grip: 'Maximum power; risk of pulling the kick',
      teach: 'Only possible with help: an 8 mph tailwind. The kick clears the bar by about 1.7 m. Turn the wind off and the same kick lands 1 yd short of the posts. A 66-yard kick set the NFL record in 2021, and a 68-yard kick broke it in 2025.' }
  ];

  // ── DRILLS — per-mode challenge sequences ──
  // Each drill has a list of "tasks" the player completes in order. Each
  // task carries a goal description, a success check (run after each throw),
  // and a reset condition (run only when the throw fails the constraint).
  // Drills give students a structured progression on top of the sandbox.
  //
  // Design rule: tasks check the LATEST throw against state-derived
  // condition. Streak tasks track count via a session counter that resets
  // on miss; "type-coverage" tasks track a Set of pitch IDs used.
  // Every counter a drill task or badge reads, so a fresh or partly saved tally never reads undefined.
  function drillStatsWithDefaults(saved) {
    return Object.assign({
      streakStrikes: 0, strikeTypes: {}, strikeWithLowSpin: false,
      makeCount: 0, swishHeights: 0, swishHeightSet: {}, completedBouncePass: false,
      shotsMadeByType: {}, attemptedHalfCourt: false,
      goalKickTypes: {}, totalGoals: 0,
      fgMadeByDist: {},
      bowlTypes: {}, totalWickets: 0,
      golfClubsOnGreen: {}, golfFairwaysHit: 0,
      volleyServesIn: {}, volleyInCount: 0, volleyAceCount: 0,
      // Hot-Hand: cross-sport streak counter (incremented on ANY make,
      // reset on any miss). Surfaced as the broadcasting-style flame
      // indicator for athletic engagement.
      hotStreak: 0
    }, saved || {});
  }
  var DRILLS = {
    pitching: {
      label: 'Pitcher Drills',
      tasks: [
        { id: 'p1', goal: 'Throw 3 strikes in a row, changing something each time',
          test: function(s) { return (s.vStrikeStreak || 0) >= 3; },
          progress: function(s) { return (s.vStrikeStreak || 0) + ' / 3 strike streak'; },
          tip: 'Hint: lower release angle by ~1° if you keep going high.' },
        { id: 'p2', goal: 'Throw a 4-seam, a curveball, and a slider — each for a strike',
          test: function(s) { return s.strikeTypes['4seam'] && s.strikeTypes.curve && s.strikeTypes.slider; },
          progress: function(s) {
            var seen = ['4seam','curve','slider'].filter(function(id) { return s.strikeTypes[id]; });
            return seen.length + ' / 3 pitch types ✓ (need 4-seam, curve, slider)';
          },
          tip: 'Each pitch type sets its own grip + spin — let the preset do the work.' },
        { id: 'p3', goal: 'Strike with a knuckleball (spin under 200 rpm)',
          test: function(s) { return s.strikeWithLowSpin; },
          progress: function(s) { return s.strikeWithLowSpin ? 'Done!' : 'Need a strike with the knuckle preset'; },
          tip: 'Knucklers wobble — accept that "strike" might be lucky and keep throwing.' }
      ]
    },
    freethrow: {
      label: 'Basketball Drills',
      tasks: [
        { id: 'f1', goal: 'Make 5 shots, each with a different setup from the one before',
          test: function(s) { return (s.vMakes || 0) >= 5; },
          progress: function(s) { return (s.vMakes || 0) + ' / 5 makes'; },
          tip: 'Backspin softens rim contact — keep spin around 180-220 rpm.' },
        { id: 'f2', goal: 'Make a swish from 3 different release heights',
          test: function(s) { return s.swishHeights >= 3; },
          progress: function(s) { return s.swishHeights + ' / 3 different release heights'; },
          tip: 'Higher release = flatter arc; lower = steeper arc. Both can swish.' },
        { id: 'f3', goal: 'Complete a successful Bounce Pass',
          test: function(s) { return s.completedBouncePass; },
          progress: function(s) { return s.completedBouncePass ? 'Done!' : 'Pick Bounce Pass and aim for the yellow zone'; },
          tip: 'Bounce it about ⅔ of the way to your teammate. The floor takes speed off, so it arrives later than a chest pass.' },
        { id: 'f4', goal: 'Make a Floater (high-arc finish over a defender)',
          test: function(s) { return s.shotsMadeByType && s.shotsMadeByType.floater; },
          progress: function(s) { return (s.shotsMadeByType && s.shotsMadeByType.floater) ? 'Done!' : 'Pick the Floater preset and let the high arc do the work'; },
          tip: 'A 62° release keeps the ball in the air about 1 second. The defender\'s hand is already coming down by the time the ball drops.' },
        { id: 'f5', goal: 'Make a Step-Back Jumper',
          test: function(s) { return s.shotsMadeByType && s.shotsMadeByType.stepback; },
          progress: function(s) { return (s.shotsMadeByType && s.shotsMadeByType.stepback) ? 'Done!' : 'Pick Step-Back Jumper — slightly more speed than a regular jumper to cover the extra distance'; },
          tip: 'Stepping back ~1m means +1-2 mph clubhead speed equivalent. Same ~50° arc.' },
        { id: 'f6', goal: 'Hit a Half-Court Heave (no rim contact required, just on-target)',
          test: function(s) { return s.shotsMadeByType && (s.shotsMadeByType.halfcourt || s.attemptedHalfCourt); },
          progress: function(s) { return (s.shotsMadeByType && (s.shotsMadeByType.halfcourt || s.attemptedHalfCourt)) ? 'Done!' : 'Pick Half-Court Heave; success = the ball reaches the backboard area'; },
          tip: 'NBA players make only a few half-court heaves in a hundred, so this drill counts ANY shot that reaches the rim/backboard zone — the math is the lesson, not the make.' }
      ]
    },
    freekick: {
      label: 'Soccer Drills',
      tasks: [
        { id: 'k1', goal: 'Score a goal with a Curling Shot',
          test: function(s) { return s.goalKickTypes.curling; },
          progress: function(s) { return s.goalKickTypes.curling ? 'Done!' : 'Pick Curling Shot and bend it around the wall'; },
          tip: 'About 600 rpm of side spin bends the ball about 2.8 m over 22 m.' },
        { id: 'k2', goal: 'Score with a Power Drive (no curl)',
          test: function(s) { return s.goalKickTypes.power; },
          progress: function(s) { return s.goalKickTypes.power ? 'Done!' : 'Power Drive, then thread between defenders'; },
          tip: 'No spin = no curl, but the wall is just 9.15m away — go OVER or AROUND with a wide aim.' },
        { id: 'k3', goal: 'Score 3 goals, each with a different setup from the one before',
          test: function(s) { return (s.vGoals || 0) >= 3; },
          progress: function(s) { return (s.vGoals || 0) + ' / 3 goals'; },
          tip: 'Different styles for different defender configurations.' }
      ]
    },
    fieldgoal: {
      label: 'Kicker Drills',
      tasks: [
        { id: 'g1', goal: 'Make a 20-yard field goal',
          test: function(s) { return s.fgMadeByDist['20']; },
          progress: function(s) { return s.fgMadeByDist['20'] ? 'Done!' : 'Switch to Chip Shot preset'; },
          tip: 'Calm air and a short kick. The ball only has to be above 3.05 m at the posts.' },
        { id: 'g2', goal: 'Make a 35-yard field goal',
          test: function(s) { return s.fgMadeByDist['35']; },
          progress: function(s) { return s.fgMadeByDist['35'] ? 'Done!' : 'Mid-Range preset: mind the crosswind'; },
          tip: 'The wind pushes the ball sideways the whole way. Aim into it.' },
        { id: 'g3', goal: 'Make a 50-yard field goal',
          test: function(s) { return s.fgMadeByDist['50']; },
          progress: function(s) { return s.fgMadeByDist['50'] ? 'Done!' : 'Long preset: into a headwind'; },
          tip: 'A headwind makes drag bigger, so the kick needs more speed than in calm air.' }
      ]
    },
    golf: {
      label: 'Golf Drills',
      tasks: [
        { id: 'gf1', goal: 'Hit the green with a 7-Iron',
          test: function(s) { return s.golfClubsOnGreen && s.golfClubsOnGreen.iron; },
          progress: function(s) { return (s.golfClubsOnGreen && s.golfClubsOnGreen.iron) ? 'Done!' : 'Pick the 7-Iron preset'; },
          tip: 'Backspin pulls the ball up. Leave launch + spin near defaults; tweak speed for distance.' },
        { id: 'gf2', goal: 'Hit the green with a Sand Wedge',
          test: function(s) { return s.golfClubsOnGreen && s.golfClubsOnGreen.wedge; },
          progress: function(s) { return (s.golfClubsOnGreen && s.golfClubsOnGreen.wedge) ? 'Done!' : 'Pick the Sand Wedge: high launch, very high spin'; },
          tip: 'Wedge stops fast — 9500 rpm of backspin is the "check" effect.' },
        { id: 'gf3', goal: 'Hit the fairway with the Driver 3 times, changing something each time',
          test: function(s) { return (s.vFairways || 0) >= 3; },
          progress: function(s) { return (s.vFairways || 0) + ' / 3 fairways'; },
          tip: 'Driver loves a positive attack angle. Keep launch ~12-15°, low spin (~2500 rpm).' }
      ]
    },
    bowling: {
      label: 'Cricket Drills',
      tasks: [
        { id: 'b1', goal: 'Hit the stumps with a Fast delivery',
          test: function(s) { return s.bowlTypes && s.bowlTypes.fast; },
          progress: function(s) { return (s.bowlTypes && s.bowlTypes.fast) ? 'Done!' : 'Pick Fast preset and aim middle-stump'; },
          tip: 'Let it bounce about 6 m in front of the stumps. The bounce takes pace off.' },
        { id: 'b2', goal: 'Bowl a wicket with the In-Swinger',
          test: function(s) { return s.bowlTypes && s.bowlTypes.inswing; },
          progress: function(s) { return (s.bowlTypes && s.bowlTypes.inswing) ? 'Done!' : 'In-Swinger preset; aim wide of off-stump'; },
          tip: 'Start the line outside off-stump and let the swing bring it back onto middle.' },
        { id: 'b3', goal: 'Take 3 wickets, each with a different setup from the one before',
          test: function(s) { return (s.vWickets || 0) >= 3; },
          progress: function(s) { return (s.vWickets || 0) + ' / 3 wickets'; },
          tip: 'Mix pace and spin — keep the batter guessing about line and length.' }
      ]
    },
    volleyball: {
      label: 'Volleyball Drills',
      tasks: [
        { id: 'v1', goal: 'Land 3 serves IN, each with a different setup from the one before',
          test: function(s) { return (s.vServesIn || 0) >= 3; },
          progress: function(s) { return (s.vServesIn || 0) + ' / 3 serves in'; },
          tip: 'Underhand is most forgiving for first attempts — high arc, low speed.' },
        { id: 'v2', goal: 'Land a Float Serve in the receiving court',
          test: function(s) { return s.volleyServesIn && s.volleyServesIn.float; },
          progress: function(s) { return (s.volleyServesIn && s.volleyServesIn.float) ? 'Done!' : 'Pick Float Serve and aim deep'; },
          tip: 'Float serves wobble unpredictably — accept that landing IN is partially luck.' },
        { id: 'v3', goal: 'Score an Ace (deep corner)',
          test: function(s) { return s.volleyAceCount >= 1; },
          progress: function(s) { return (s.volleyAceCount || 0) > 0 ? 'Done!' : 'Aim for the deep corner — back 15% × outer 30% of court'; },
          tip: 'Aces are deep + wide. Jump serves with topspin clear the net then dive into back corners.' }
      ]
    }
  };

  // Mode metadata — controls which target / preset list / distances apply.
  var MODES = {
    pitching: {
      label: "Pitcher's Mound", icon: '⚾', ball: 'baseball', presets: PITCH_TYPES, defaultPreset: '4seam',
      targetZ: 18.44, // 60 ft 6 in
      releaseStrideDefault: 1.5,
      releaseHeightRange: [1.4, 2.4],
      speedRange: [50, 105], verticalAimRange: [-8, 4],
      spinRange: [0, 3500], spinStep: 50, spinAxisRange: [0, 360]
    },
    freethrow: {
      label: 'Free Throw', icon: '🏀', ball: 'basketball', presets: SHOT_TYPES,
      // Free throw line to the backboard is 15 ft (4.572 m). The rim center sits 15 in (0.381 m)
      // in front of the glass, so it is 4.19 m from the line. Rim inner radius 9 in (0.2286 m).
      targetZ: 4.57, backboardZ: 4.572,
      rimY: 3.05, rimZ: 4.19, rimRadius: 0.2286,
      defaultPreset: 'freethrow', speedStep: 0.25,
      releaseStrideDefault: 0.0,
      releaseHeightRange: [1.8, 3.0],
      speedRange: [8, 35], verticalAimRange: [-20, 70],
      spinRange: [0, 600], spinStep: 10, spinAxisRange: [0, 360]
    },
    freekick: {
      label: 'Free Kick', icon: '⚽', ball: 'soccer', presets: KICK_TYPES, defaultPreset: 'curling',
      // The wall is 1 m either side at 9.15 m, so aiming around it takes more than 6 degrees.
      aimHRange: [-15, 15],
      targetZ: 22.0, // 22m typical free-kick distance (just outside the box)
      // Goal: 7.32m wide × 2.44m tall — FIFA spec
      goalHalfWidth: 3.66, goalHeight: 2.44,
      // Posts and bar: FIFA Law 1 allows up to 12 cm, so 6 cm either side of the drawn frame line.
      frameHalf: 0.06,
      // Defender wall: 9.15m (10 yd) from ball, 4 silhouettes shoulder-to-shoulder
      wallZ: 9.15, wallHalfWidth: 1.0, wallHeight: 1.7,
      // Rolling on grass. MODEL CHOICE, not a measured value: once a bounce would lift the ball
      // less than 1.5 cm it rolls, slowed by 0.4 m/s² of rolling resistance (scaled with gravity)
      // plus air drag. Real grass varies a lot with length and wetness.
      rollDecel: 0.4, rollHopM: 0.015,
      releaseStrideDefault: 0.0,
      releaseHeightRange: [0.11, 0.11], // ball sits on ground; not user-adjustable
      speedRange: [25, 90], verticalAimRange: [-2, 45],
      spinRange: [0, 1200], spinStep: 25, spinAxisRange: [0, 360]
    },
    fieldgoal: {
      label: 'Field Goal', icon: '🏈', ball: 'football', presets: GOAL_TYPES, defaultPreset: 'chipshot',
      // Default mid-range. Actual goal-line distance comes from the active
      // preset's distanceYd (the side-view canvas + classifier read it from
      // d.fgDistanceYd, set by applyGoalPreset).
      targetZ: 35 * 0.9144, // 35 yd in m — overridden per preset
      goalHalfWidth: 5.64 / 2, // 18.5 ft (NFL pro hash) → 5.64m → ±2.82
      crossbarHeight: 3.05,    // 10 ft
      // Doink zone (the free kick's rule): the ball touches the frame when its center passes within
      // ball radius + half the upright of the drawn frame line. Ball radius = BALLS.football.radius
      // (0.110 m, this lab's sphere stand-in for the football). NFL Rule 1: uprights 3-4 in across, so
      // half of 4 in = 0.05 m. The crossbar is given the same thickness (a model choice). 0.16 m in all.
      frameHalf: 0.05,
      releaseStrideDefault: 0.0,
      releaseHeightRange: [0.0, 0.0],
      speedRange: [30, 95], verticalAimRange: [20, 60],
      spinRange: [0, 2000], spinStep: 50, spinAxisRange: [0, 360]
    },
    bowling: {
      label: "Bowler's Crease", icon: '🏏', ball: 'cricket', presets: CRICKET_DELIVERIES, defaultPreset: 'fast',
      // 22 yd between creases = 20.12 m. Bowler's pop crease is "0"; batter's
      // stumps live at the far end (z = 20.12). The actual delivery stride
      // means the ball is RELEASED from ~17.5 m, not 20.12 — but for the
      // canvas physics we keep the bowler at z=0 and target the stumps.
      targetZ: 20.12,
      // Stumps: 71.1 cm tall, 22.86 cm overall width (3 stumps spaced ~7.6cm)
      stumpsHeight: 0.711,
      stumpsHalfWidth: 0.1143,
      // Wide line: MODEL CHOICE, 0.46 m either side of middle stump (not taken from a rule).
      wideHalfWidth: 0.46,
      // The batter stands at the popping crease, 1.22 m (4 ft) in front of the stumps.
      batterZ: 1.22,
      waistHeight: 1.05,        // a full toss above this is a no-ball
      chestBand: [1.0, 1.8],    // chest to the top of the helmet: where a bouncer arrives
      releaseStrideDefault: 1.2,
      releaseHeightRange: [1.8, 2.6],
      // A good-length ball leaves the hand going down about 7 degrees, a bouncer about 13.
      speedRange: [40, 100], verticalAimRange: [-16, 12],
      spinRange: [0, 3000], spinStep: 50, spinAxisRange: [-180, 180]
    },
    golf: {
      label: 'Golf Tee Shot', icon: '⛳', ball: 'golf', presets: GOLF_TYPES, defaultPreset: 'iron',
      // Target distance is preset-driven (driver carries 250 yd, sand wedge 85 yd).
      // Actual targetZ comes from the active preset's carryYd × 0.9144 m/yd.
      // Default to 7-iron 150 yd carry until preset applied.
      targetZ: 150 * 0.9144,
      // Lateral tolerance for a fairway hit (±15 yd from centerline = ±13.7 m).
      // Used by classifyGolfResult — anything outside is rough/woods.
      fairwayHalfYd: 15,
      releaseStrideDefault: 0.0,
      releaseHeightRange: [0.0, 0.05], // ball on ground, driver allows tiny tee
      speedRange: [50, 180], verticalAimRange: [5, 60],
      spinRange: [0, 12000], spinStep: 100, spinAxisRange: [0, 360]
    },
    volleyball: {
      label: "Server's Line", icon: '🏐', ball: 'volleyball', presets: VOLLEYBALL_TYPES, defaultPreset: 'float',
      // The deep corners are up to 14 degrees off the center line. With the old 5 degree limit the
      // ace zone (and the ace drill, badge and record) could not be reached by aiming.
      aimHRange: [-14, 14],
      // FIVB Rule 1: court is 18m × 9m total (each side 9m × 9m).
      // Server stands behind end-line at z=0, net stretches across z=9m at
      // height 2.43m (men) / 2.24m (women) — we use men's height.
      targetZ: 18.0,            // far end-line (ball must land in [9, 18])
      netZ: 9.0,                // midcourt net plane
      netHeight: 2.43,          // men's net top (women's: 2.24)
      courtHalfWidth: 4.5,      // ±4.5 m from centerline = 9m wide
      releaseStrideDefault: 0.0,
      releaseHeightRange: [0.5, 3.2], // underhand low, jump-serve high
      speedRange: [25, 80], verticalAimRange: [-2, 35],
      spinRange: [0, 2000], spinStep: 25, spinAxisRange: [0, 360]
    }
  };

  // Score classifier for field goal mode. Walks samples for the first crossing
  // of z = goalLineZ: above the crossbar AND between the uprights is good. 'doink' = the ball
  // touches the frame (fgFrameGap: center no farther from the bar or an upright than
  // ball radius + half the upright, 0.11 + 0.05 = 0.16 m), the free kick's rule.
  // part: 'bar' (under the bar, between the uprights), 'upright' (over the bar, outside),
  // 'corner' (under the bar and outside the upright: the end of the crossbar).
  function fgFrameGap(mm, gx, gy) {
    var ox = Math.max(0, Math.abs(gx) - mm.goalHalfWidth), oy = Math.max(0, mm.crossbarHeight - gy);
    return { gap: Math.sqrt(ox * ox + oy * oy), part: ox > 0 && oy > 0 ? 'corner' : oy > 0 ? 'bar' : 'upright',
      touch: ((BALLS[mm.ball] || {}).radius || 0.11) + (mm.frameHalf || 0) };
  }
  function classifyFieldGoalResult(samples, goalLineZ, crossbarHeight, goalHalfWidth) {
    if (!samples || samples.length < 2) return 'short';
    var fmm = Object.assign({}, MODES.fieldgoal, { crossbarHeight: crossbarHeight, goalHalfWidth: goalHalfWidth });
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // Short bounce before reaching goal line
      if (cur.y <= 0 && cur.z < goalLineZ) return 'short';
      // Goal-line crossing
      if (prev.z < goalLineZ && cur.z >= goalLineZ) {
        var f = (goalLineZ - prev.z) / (cur.z - prev.z);
        var gx = prev.x + (cur.x - prev.x) * f;
        var gy = prev.y + (cur.y - prev.y) * f;
        if (gy >= crossbarHeight && Math.abs(gx) <= goalHalfWidth) return 'good';
        var fr = fgFrameGap(fmm, gx, gy);
        if (fr.gap <= fr.touch) return 'doink';
        if (gy < crossbarHeight) return 'shortbar';
        return Math.abs(gx) > goalHalfWidth + 2 ? 'wide' : 'wideclose';
      }
    }
    return 'short';
  }

  // Score classifier for free kick mode. Walks samples for the first crossing
  // of z = goal-line plane (targetZ). If at that crossing the ball is inside
  // the goal mouth (|x| ≤ goalHalfWidth, 0 < y ≤ goalHeight) → goal. Otherwise
  // miss. Also detects wall-block (ball intersects wall plane below wallHeight
  // with |x| ≤ wallHalfWidth). A bounce before the line does not end the kick: the simulated
  // bounces carry on, and the line crossing is judged with the same goal-mouth check.
  // 'short' = the ball never reached the goal line.
  // 'post' = the ball touches the frame: its center passes the line outside the mouth but no
  // farther from the post or bar than ball radius + frame half-thickness (0.11 + 0.06 = 0.17 m).
  // part: which piece of the frame is nearest. gap: center to frame line, in m.
  function kickFrameGap(mm, gx, gy) {
    var ox = Math.max(0, Math.abs(gx) - mm.goalHalfWidth), oy = Math.max(0, gy - mm.goalHeight);
    return { gap: Math.sqrt(ox * ox + oy * oy), part: ox > 0 && oy > 0 ? 'corner' : oy > 0 ? 'bar' : 'post',
      touch: ((BALLS[mm.ball] || {}).radius || 0.11) + (mm.frameHalf || 0) };
  }
  function classifyKickResult(samples, mm) {
    if (!samples || samples.length < 2) return 'miss';
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // Wall block? (z crosses wallZ before reaching goal)
      if (prev.z < mm.wallZ && cur.z >= mm.wallZ) {
        var fw = (mm.wallZ - prev.z) / (cur.z - prev.z);
        var wx = prev.x + (cur.x - prev.x) * fw;
        var wy = prev.y + (cur.y - prev.y) * fw;
        if (Math.abs(wx) <= mm.wallHalfWidth && wy >= 0 && wy <= mm.wallHeight) return 'blocked';
        // Otherwise the ball cleared the wall — keep walking
      }
      // Goal-line crossing? (in the air or after a bounce; a rolling ball sits at y = 0)
      if (prev.z < mm.targetZ && cur.z >= mm.targetZ) {
        var fg = (mm.targetZ - prev.z) / (cur.z - prev.z);
        var gx = prev.x + (cur.x - prev.x) * fg;
        var gy = prev.y + (cur.y - prev.y) * fg;
        if (Math.abs(gx) <= mm.goalHalfWidth && gy >= 0 && gy <= mm.goalHeight) {
          // The whole ball has to cross the line. A rolling ball can stop on it.
          var fullZ = mm.targetZ + ((BALLS[mm.ball] || {}).radius || 0.11), far = cur.z;
          for (var k = i; k < samples.length; k++) if (samples[k].z > far) far = samples[k].z;
          return far >= fullZ ? 'goal' : 'short';
        }
        var fg2 = kickFrameGap(mm, gx, gy);
        if (fg2.gap <= fg2.touch) return 'post';
        if (gy > mm.goalHeight) return 'over';
        return 'wide';
      }
    }
    return 'short';
  }

  // Score classifier for basketball PASS shot types (bounce / chest).
  // Receiver is at z = receiverZ (~6 m), catching at chest height ~1.2 m.
  // Categories:
  //   'caught'        — arrived at receiver with y in chest band
  //   'highpass'      — arrived above the chest band (sailed)
  //   'lowpass'       — arrived below the chest band (worm-burner)
  //   'wide'          — lateral miss
  //   'short'         — never reached the receiver
  //   'wrongbounce'   — bounce pass with no bounces, OR chest pass that bounced
  function classifyPassResult(samples, kind, receiverZ) {
    if (!samples || samples.length < 2) return 'short';
    var bounceCount = 0;
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // Count ground-level transitions as bounces (matches simulator's bounce reflection)
      if (prev.y > 0.05 && cur.y <= 0.05) bounceCount++;
      // Arrival at receiver plane
      if (prev.z < receiverZ && cur.z >= receiverZ) {
        var f = (receiverZ - prev.z) / (cur.z - prev.z);
        var rcvX = prev.x + (cur.x - prev.x) * f;
        var rcvY = prev.y + (cur.y - prev.y) * f;
        // Lateral first
        if (Math.abs(rcvX) > 0.45) return 'wide';
        // Bounce-mode requirements
        if (kind === 'bouncepass' && bounceCount < 1) return 'wrongbounce';
        if (kind === 'chestpass' && bounceCount > 0) return 'wrongbounce';
        // Chest band
        if (rcvY > 1.6) return 'highpass';
        if (rcvY < 0.6) return 'lowpass';
        return 'caught';
      }
    }
    // Never reached receiver
    return 'short';
  }

  // Score classifier for basketball shots. Returns { loc, t, x, y, z, dist, dz, dx }.
  // The hoop is a ring of radius rimRadius centered at (x = 0, z = rimZ) at height rimY; the
  // backboard is a plane at z = backboardZ. The ball has a real size, so:
  //   'swish'     the whole ball fits through without touching (center within rimRadius - ballRadius)
  //   'made'      it grazes the rim and still drops (center within rimRadius - 0.35 ballRadius)
  //   'rim'       it lands on the iron and bounces out (center within rimRadius + ballRadius)
  //   'backboard' it reaches the glass before coming down to rim height
  //   'air'       it never gets up to rim height, or comes down short of the iron
  //   'miss'      it comes down past the rim (long or wide)
  function classifyShotDetail(samples, mm, ball, rimZ) {
    var rimY = mm.rimY, rimRadius = mm.rimRadius;
    var r = (ball && ball.radius) || 0.119;
    var board = null;
    if (!samples || samples.length < 2) return { loc: 'air', t: 0, x: 0, y: 0, z: 0, dist: null, dz: null, dx: null };
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // The simulation marks the sample where the ball met the glass (see opts.board).
      if (cur.board && !board) board = cur;
      // Downward crossing of rim height.
      if (prev.y > rimY && cur.y <= rimY) {
        var f = (prev.y - rimY) / (prev.y - cur.y);
        var cx = prev.x + (cur.x - prev.x) * f;
        var cz = prev.z + (cur.z - prev.z) * f;
        var dz = cz - rimZ;
        var dist = Math.sqrt(cx * cx + dz * dz);
        var loc = dist <= rimRadius - r ? (board ? 'made' : 'swish')
                : dist <= rimRadius - 0.35 * r ? 'made'
                : board ? 'backboard'
                : dist <= rimRadius + r ? 'rim'
                : (dz < 0 && Math.abs(cx) <= rimRadius + r) ? 'air'
                : 'miss';
        if (loc === 'backboard') return { loc: loc, t: board.t, x: board.x, y: board.y, z: board.z, dist: null, dz: null, dx: board.x, banked: false };
        return { loc: loc, t: prev.t + (cur.t - prev.t) * f, x: cx, y: rimY, z: cz, dist: dist, dz: dz, dx: cx, banked: !!board };
      }
    }
    if (board) return { loc: 'backboard', t: board.t, x: board.x, y: board.y, z: board.z, dist: null, dz: null, dx: board.x, banked: false };
    return { loc: 'air', t: samples[samples.length - 1].t, x: 0, y: 0, z: 0, dist: null, dz: null, dx: null };
  }

  // Convert pitch axis (degrees) into a 3D angular velocity unit vector.
  // World coords: +X = lateral, +Y = up, +Z = forward (mound to plate).
  // Magnus force F ∝ ω × v. With v along +Z:
  //   axis 0°   = backspin -> ω = (-1, 0, 0) -> ω × v = (0, +1, 0) (upward lift, same for RHP & LHP)
  //   axis 180° = topspin  -> ω = (+1, 0, 0) -> ω × v = (0, -1, 0) (downward drop, same for RHP & LHP)
  //   axis 90°  = sidespin -> ω = (0, ±1, 0) -> ω × v = (±1, 0, 0) (mirrored between RHP & LHP)
  // Lift (Magnus) coefficient from the spin factor S = r·ω / v (rim speed of the ball over
  // its speed through the air). C_L = k · S / (0.4 + 2.32·S) is the standard fit to wind-tunnel
  // and pitch-tracking data for a spinning ball: it grows with spin, then levels off. `liftScale`
  // (k) is 1 for a sphere whose spin axis is across the flight; lower where the sport's ball
  // gets less lift than that (a spiralling football spins ALONG its flight, a cricket ball swings
  // by its seam). The simulation, the result text and the Formulas panel all call this one function.
  function liftCoefficient(ball, omegaRad, speed) {
    if (!ball || !(omegaRad > 0) || !(speed > 0.01)) return 0;
    var S = ball.radius * omegaRad / speed;
    var k = typeof ball.liftScale === 'number' ? ball.liftScale : 1;
    return k * S / (0.4 + 2.32 * S);
  }

  function spinAxisVector(axisDeg, throwerHand) {
    var rad = axisDeg * Math.PI / 180;
    var sign = throwerHand === 'left' ? -1 : 1;
    var x = -Math.cos(rad);
    var y = Math.sin(rad) * sign;
    return { x: x, y: y, z: 0 };
  }

  // ── The low-spin dart ("knuckle" effect) ──
  // A ball with almost no spin does not fly straight. Air leaves one side of it a little
  // later than the other, so the ball gets a small sideways push, and the push changes
  // direction as the seams (or panels) slowly turn. That is the knuckleball, the knuckle
  // shot and the float serve.
  //   size of the push = ½·ρ·v²·A·C_k·w        C_k = ball.knuckle
  //   w = (1 − rpm / cut)²  below the cut-off spin, and 0 at or above it
  //   direction = sin(start angle + lobes × how far the ball has turned)
  // In real life nobody can predict the start angle. Here it comes from a numbered
  // "air pattern" (the seed), so the same setup always gives the same path and a test can
  // check it. A new number gives a different dart.
  function knuckleWeight(ball, spinRpm) {
    if (!ball || !ball.knuckle) return 0;
    var cut = ball.knuckleCutRpm || 150;
    var rpm = Math.abs(Number(spinRpm) || 0);
    if (rpm >= cut) return 0;
    var w = 1 - rpm / cut;
    return w * w;
  }
  function knucklePhases(seed) {
    var s = Math.floor(Math.abs(Number(seed) || 1));
    function rnd(i) {
      var t = (s * 2654435761 + i * 2246822519) >>> 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return { side: rnd(1) * Math.PI * 2, up: rnd(2) * Math.PI * 2 };
  }

  // ── The bounce off a cricket pitch ──
  // Up and down: the ball comes off the pitch with e times the speed it came down with
  // (e is the ball's coefficient of restitution).
  // Along the ground: while the ball is pressed into the pitch it slides, and friction
  // pushes back against the slide. The most speed that friction can change is
  //   push = μ·(1 + e)·|v_down|
  // so a steeper delivery loses more pace. Side spin makes the bottom of the ball slide
  // sideways too, so part of that push goes sideways: that is the turn. The push points
  // against the slide, so the ball turns the opposite way to its drift in the air.
  // Simplification, stated to the student too: a real spin bowler tilts the spin axis
  // along the line of flight. This lab has one spin axis, so it lets the side spin grip
  // the pitch as if it were tilted that way.
  var CRICKET_SURFACE = { mu: 0.35, spinKeep: 0.5, turnShare: 1 };
  // Grass under a free kick: the same bounce rule, so a shallow hop (small |v_down|) costs
  // little speed and a steep landing costs a lot. mu = 0.5 is a MODEL CHOICE, not a measured
  // value. Simplification: spin is left out of the slide (spinGrip false, turnShare 0), so the
  // grass never turns the ball or makes it spin back. A soccer ball is hollow, so friction takes
  // at most 2/5 of its speed along the ground before it rolls (a solid cricket ball: 2/7 = 1/3.5).
  var GRASS_SURFACE = { mu: 0.5, turnShare: 0, spinGrip: false, gripShare: 0.4 };
  // Hardwood under a basketball (bounce pass, and any shot that reaches the floor): the same rule.
  // mu = 0.6 is a MODEL CHOICE, not a measured value. e is the ball's own cor (0.78). Spin is left
  // out of the slide, as on grass. A basketball is hollow too, so friction takes at most 2/5 of its
  // level speed before it grips and rolls. A steep bounce pass reaches that limit.
  var HARDWOOD_SURFACE = { mu: 0.6, turnShare: 0, spinGrip: false, gripShare: 0.4 };
  function pitchBounce(ball, surface, v, omega) {
    var e = typeof surface.e === 'number' ? surface.e : (ball.cor || 0.5);
    var vDown = Math.abs(v.vy);
    var push = surface.mu * (1 + e) * vDown;
    var share = typeof surface.turnShare === 'number' ? surface.turnShare : 1;
    var slipX = v.vx + ball.radius * omega.y * share;
    var slipZ = surface.spinGrip === false ? v.vz : v.vz - ball.radius * omega.x;
    var slip = Math.sqrt(slipX * slipX + slipZ * slipZ);
    // If friction would stop the slide altogether the ball grips and rolls instead.
    var change = slip > 0 ? Math.min(push, typeof surface.gripShare === 'number' ? slip * surface.gripShare : slip / 3.5) : 0;
    var out = {
      vx: slip > 0 ? v.vx - change * slipX / slip : v.vx,
      vy: e * vDown,
      vz: slip > 0 ? v.vz - change * slipZ / slip : v.vz
    };
    out.speedIn = Math.sqrt(v.vx * v.vx + v.vy * v.vy + v.vz * v.vz);
    out.speedOut = Math.sqrt(out.vx * out.vx + out.vy * out.vy + out.vz * out.vz);
    out.turnDeg = (Math.atan2(out.vx, out.vz) - Math.atan2(v.vx, v.vz)) * 180 / Math.PI;
    return out;
  }

  // Simulate pitch flight: from release point to plate.
  // Returns array of {t, x, y, z, vx, vy, vz} samples and outcome metadata.
  // Coordinate system:
  //   x: lateral (+ = catcher's right = batter's left = 1B-side from mound)
  //   y: vertical (+ = up; ground = 0)
  //   z: forward (+ = toward plate; release ~ 0, plate ~ 18.4 m for MLB)
  function simulatePitch(opts) {
    var ball = BALLS[opts.ball || 'baseball'];
    var v0Mph = opts.speedMph || 90;
    var v0 = v0Mph / MPH_PER_MPS; // m/s
    var releaseHeight = opts.releaseHeight !== undefined ? opts.releaseHeight : 1.85; // m (typical MLB ~6 ft)
    var releaseSide = opts.releaseSide !== undefined ? opts.releaseSide : 0.0; // m off centerline
    var releaseStride = opts.releaseStride !== undefined ? opts.releaseStride : 1.5; // m forward of mound rubber
    var aimDegV = opts.aimDegV !== undefined ? opts.aimDegV : -1.5; // small downward tilt
    var aimDegH = opts.aimDegH !== undefined ? opts.aimDegH : 0;
    var spinRpm = opts.spinRpm !== undefined ? opts.spinRpm : 2300;
    var spinAxis = spinAxisVector(opts.spinAxisDeg || 0, opts.throwerHand || 'right');
    var omegaMag = spinRpm * 2 * Math.PI / 60; // rad/s
    var omega = { x: spinAxis.x * omegaMag, y: spinAxis.y * omegaMag, z: spinAxis.z * omegaMag };
    var area = Math.PI * ball.radius * ball.radius;
    var massInv = 1 / ball.mass;
    // Initial velocity vector (release direction)
    var radV = aimDegV * Math.PI / 180;
    var radH = aimDegH * Math.PI / 180;
    var vx = v0 * Math.cos(radV) * Math.sin(radH);
    var vy = v0 * Math.sin(radV);
    var vz = v0 * Math.cos(radV) * Math.cos(radH);
    var pos = { x: releaseSide, y: releaseHeight, z: releaseStride };
    var samples = [{ t: 0, x: pos.x, y: pos.y, z: pos.z, vx: vx, vy: vy, vz: vz }];
    var dt = 1 / 240; // small step for Magnus stability
    var t = 0;
    var plateZ = opts.targetZ !== undefined ? opts.targetZ : 18.44; // baseball plate default
    // Gravity (m/s²) — defaults to Earth. Overridable so the same pitch can
    // be replayed on Moon/Mars/Jupiter for the "what if" lesson.
    var gNow = opts.gravity !== undefined ? opts.gravity : G;
    var maxT = opts.maxT !== undefined ? opts.maxT : Math.min(30, Math.max(4.0, 4.0 * Math.sqrt(G / Math.max(0.5, gNow))));
    // Wind vector in m/s (world frame). Headwind in -Z direction (0°),
    // tailwind +Z (180°), crosswinds ±X. Drag uses RELATIVE air-frame
    // velocity (ball minus wind), so a tailwind shrinks |v_rel| and reduces
    // drag (extends range); a crosswind pushes the ball laterally even
    // without spin.
    var windMph = opts.windMph || 0;
    var windDirDeg = opts.windDirDeg || 0;
    var windMps = windMph / MPH_PER_MPS;
    var windRad = windDirDeg * Math.PI / 180;
    var wVx = -Math.sin(windRad) * windMps; // 90° → -X is wrong, 90° = +X cross. Convention: 0°=headwind (-Z), 90°=crossX +X, 180°=tail +Z, 270°=crossX -X.
    var wVy = 0;
    var wVz = -Math.cos(windRad) * windMps;
    // Quick fix: standard convention 0°=headwind means wind blows toward the
    // pitcher (in -Z), so wind vector should be (0, 0, -|w|). Re-derive:
    // 0°=head: wind in -Z; 180°=tail: wind in +Z. So:
    wVx = Math.sin(windRad) * windMps;  // 90° → +X
    wVy = 0;
    wVz = -Math.cos(windRad) * windMps; // 0° → -Z (headwind), 180° → +Z (tailwind)
    var outcome = null;
    var boardDone = false;
    var knW = opts.flutter ? knuckleWeight(ball, spinRpm) : 0;
    var knPh = knW > 0 ? knucklePhases(opts.flutter.seed) : null;
    var knLobes = ball.knuckleLobes || 4;
    // Rolling (free kick, opts.roll): once a bounce is too small to leave the ground, the ball rolls.
    // On the ground only air drag and rolling resistance act. Rolling resistance is a constant
    // slowing a_roll = decel·(g / 9.81), pointed against the motion (a model choice, see MODES.freekick).
    var roll = opts.roll || null, rolling = false, rollPvx = 0, rollPvz = 0;
    var rollDecel = roll ? roll.decel * gNow / G : 0;
    var rollMaxT = roll ? Math.max(maxT, roll.maxT || 30) : maxT;
    // A ball that is already bouncing along toward rolling gets the roll's time limit too, so a
    // slow chip is not cut off mid-hop and called short.
    while (t < ((rolling || (roll && outcome && outcome.bounceCount)) ? rollMaxT : maxT)) {
      // Relative-to-air velocity (used by drag + Magnus). Without wind this
      // collapses to ball velocity. With wind, |v_rel| > |v| if headwind,
      // |v_rel| < |v| if tailwind, and crosswind pushes the drag vector
      // sideways without spin.
      var rvx = vx - wVx;
      var rvy = vy - wVy;
      var rvz = vz - wVz;
      var spd = Math.sqrt(rvx * rvx + rvy * rvy + rvz * rvz);
      // Drag: F = -½ρ|v_rel|²·Cd·A · v_rel̂
      var dragMag = 0.5 * RHO * spd * spd * ball.cd * area;
      var dragFx = spd > 0 ? -dragMag * (rvx / spd) : 0;
      var dragFy = spd > 0 ? -dragMag * (rvy / spd) : 0;
      var dragFz = spd > 0 ? -dragMag * (rvz / spd) : 0;
      // Magnus: F = ½ρ|v_rel|²·Cm·A · (ω̂ × v_rel̂)
      // The ω × v̂ direction gives the lift sense; Cm scales magnitude.
      // Use relative-to-air velocity so wind shifts the Magnus direction
      // realistically (e.g., a tailwind reduces effective Magnus).
      var vhx = spd > 0 ? rvx / spd : 0;
      var vhy = spd > 0 ? rvy / spd : 0;
      var vhz = spd > 0 ? rvz / spd : 0;
      var crossX = omega.y * vhz - omega.z * vhy;
      var crossY = omega.z * vhx - omega.x * vhz;
      var crossZ = omega.x * vhy - omega.y * vhx;
      // (ω × v̂) has length ω·sin(angle between spin axis and flight), so dividing by ω
      // leaves the direction and the sin term; the size comes from the lift coefficient.
      var omegaNow = Math.sqrt(omega.x * omega.x + omega.y * omega.y + omega.z * omega.z);
      var magnusMag = omegaNow > 0 ? 0.5 * RHO * spd * spd * liftCoefficient(ball, omegaNow, spd) * area / omegaNow : 0;
      var magFx = magnusMag * crossX;
      var magFy = magnusMag * crossY;
      var magFz = magnusMag * crossZ;
      // Low-spin dart: a push across the flight whose direction follows the slow turn of the ball.
      var knFx = 0, knFy = 0, knFz = 0;
      if (knW > 0 && spd > 0.01) {
        var knMag = 0.5 * RHO * spd * spd * ball.knuckle * knW * area;
        var turned = omegaMag * t * knLobes;
        // e1 = level and across the flight; e2 = across the flight and (mostly) up
        var e1x = vhz, e1z = -vhx;
        var e1l = Math.sqrt(e1x * e1x + e1z * e1z) || 1; e1x /= e1l; e1z /= e1l;
        var e2x = vhy * e1z, e2y = vhz * e1x - vhx * e1z, e2z = -vhy * e1x;
        var kSide = Math.sin(knPh.side + turned), kUp = 0.5 * Math.sin(knPh.up + turned);
        knFx = knMag * (kSide * e1x + kUp * e2x);
        knFy = knMag * (kUp * e2y);
        knFz = knMag * (kSide * e1z + kUp * e2z);
      }
      // Total acceleration
      var ax = (dragFx + magFx + knFx) * massInv;
      var ay = (dragFy + magFy + knFy) * massInv - gNow;
      var az = (dragFz + magFz + knFz) * massInv;
      if (rolling) {
        // On the grass: drag on the level part of the motion, plus rolling resistance. No spin force.
        var rhs = Math.sqrt(rvx * rvx + rvz * rvz), ghs = Math.sqrt(vx * vx + vz * vz);
        var rDrag = 0.5 * RHO * rhs * rhs * ball.cd * area * massInv;
        ax = (rhs > 0 ? -rDrag * rvx / rhs : 0) - (ghs > 0 ? rollDecel * vx / ghs : 0);
        az = (rhs > 0 ? -rDrag * rvz / rhs : 0) - (ghs > 0 ? rollDecel * vz / ghs : 0);
        ay = 0; vy = 0; rollPvx = vx; rollPvz = vz;
      }
      // Euler integrate
      vx += ax * dt; vy += ay * dt; vz += az * dt;
      // Friction can stop a rolling ball, never send it backward.
      if (rolling && vx * rollPvx + vz * rollPvz <= 0) { vx = 0; vz = 0; }
      pos.x += vx * dt; pos.y += vy * dt; pos.z += vz * dt;
      t += dt;
      // Sample every 10ms for trajectory rendering
      if (samples.length === 0 || t - samples[samples.length - 1].t > 0.01) {
        var smp = { t: t, x: pos.x, y: pos.y, z: pos.z, vx: vx, vy: vy, vz: vz };
        if (rolling) smp.roll = true;
        samples.push(smp);
      }
      // Reached plate?
      // Record plate-plane crossing the FIRST time z reaches plateZ — but DON'T
      // truncate the simulation. Free Throw mode wants the trajectory to keep
      // arcing past the rim plane until it lands; pitching mode just uses the
      // recorded crossing for strike/ball classification.
      if ((!outcome || (opts.surface && !outcome.reachedPlate)) && pos.z >= plateZ) {
        var prev = samples[samples.length - 2] || samples[0];
        var dz = pos.z - prev.z;
        var f = dz > 0 ? (plateZ - prev.z) / dz : 0;
        var px = prev.x + (pos.x - prev.x) * f;
        var py = prev.y + (pos.y - prev.y) * f;
        var pt = prev.t + (t - prev.t) * f;
        outcome = Object.assign(outcome || {}, { reachedPlate: true, plateX: px, plateY: py, plateT: pt });
        // Insert the exact crossing sample so the trail draws to the right spot.
        samples.push({ t: pt, x: px, y: py, z: plateZ, vx: vx, vy: vy, vz: vz });
        // For pitching mode (truncateAtTarget), stop here. Free Throw passes
        // truncateAtTarget=false so the arc continues to the ground.
        if (opts.truncateAtTarget !== false) break;
      }
      // Backboard (basketball): the front of the ball meets the glass and rebounds. The glass
      // takes some speed away (about 0.6 of the speed toward it comes back).
      if (opts.board && !boardDone && vz > 0 && pos.z >= opts.board.z - ball.radius) {
        boardDone = true;
        if (pos.y >= opts.board.yMin && pos.y <= opts.board.yMax && Math.abs(pos.x) <= opts.board.halfW) {
          pos.z = opts.board.z - ball.radius;
          vz = -vz * 0.6; vx *= 0.9; vy *= 0.95;
          if (samples.length > 1 && samples[samples.length - 1].t >= t) samples.pop();
          samples.push({ t: t, x: pos.x, y: pos.y, z: pos.z, vx: vx, vy: vy, vz: vz, board: true });
        }
      }
      if (rolling) {
        // Rolling: stop when friction has used up the speed, or once the ball is well past the target.
        if (vx === 0 && vz === 0) {
          outcome.rollStop = { x: pos.x, z: pos.z, t: t };
          if (samples[samples.length - 1].t < t) samples.push({ t: t, x: pos.x, y: 0, z: pos.z, vx: 0, vy: 0, vz: 0, roll: true });
          break;
        }
        if (roll.stopZ !== undefined && pos.z > roll.stopZ) break;
        continue;
      }
      // Bounced (hit the ground)?
      if (pos.y <= 0) {
        // Record the FIRST bounce in outcome so existing classifiers can read
        // it. Subsequent bounces only matter when allowBounces is on.
        // Ground contact point: step back along this step's motion to y = 0. Saving it as a
        // sample is what lets every classifier see the landing. (Samples are only saved every
        // third step, so before this the landing was usually skipped and a LATER bounce was
        // judged instead.)
        var stepDy = vy * dt;
        var backF = stepDy < 0 ? Math.min(1, Math.max(0, pos.y / stepDy)) : 0;
        var hitX = pos.x - vx * dt * backF, hitZ = pos.z - vz * dt * backF, hitT = t - dt * backF;
        if (samples.length > 1 && samples[samples.length - 1].t >= hitT) samples.pop();
        samples.push({ t: hitT, x: hitX, y: 0, z: hitZ, vx: vx, vy: vy, vz: vz, ground: true });
        if (!outcome) outcome = { bounced: true, bounceX: hitX, bounceZ: hitZ, bounceT: hitT, bounceCount: 0 };
        else if (outcome.bounceCount === undefined) {
          outcome.bounced = true; outcome.bounceX = hitX; outcome.bounceZ = hitZ; outcome.bounceT = hitT; outcome.bounceCount = 0;
        }
        if (outcome.landZ === undefined) { outcome.landX = hitX; outcome.landZ = hitZ; outcome.landT = hitT; }
        outcome.bounceCount = (outcome.bounceCount || 0) + 1;
        if (opts.surface) {
          // Cricket: one bounce off the pitch. A second landing ends the delivery.
          if (outcome.bounceCount > 1) break;
          var bo = pitchBounce(ball, opts.surface, { vx: vx, vy: vy, vz: vz }, omega);
          outcome.bounce = { x: hitX, z: hitZ, t: hitT, speedIn: bo.speedIn, speedOut: bo.speedOut, turnDeg: bo.turnDeg };
          pos.x = hitX; pos.y = 0.0001; pos.z = hitZ; t = hitT;
          vx = bo.vx; vy = bo.vy; vz = bo.vz;
          var keep = typeof opts.surface.spinKeep === 'number' ? opts.surface.spinKeep : 0.5;
          omega.x *= keep; omega.y *= keep; omega.z *= keep;
          continue;
        }
        if (!opts.allowBounces) break;
        // Grass (free kick) or hardwood (basketball): friction takes level speed in proportion to how
        // hard the ball came down, mu·(1 + e)·|v_down|, the cricket pitch's rule (opts.grass holds the surface).
        var gb = opts.grass ? pitchBounce(ball, opts.grass, { vx: vx, vy: vy, vz: vz }, omega) : null;
        if (gb) { (outcome.hops = outcome.hops || []).push({ z: hitZ, t: hitT, vDown: Math.abs(vy), speedIn: gb.speedIn, levelIn: Math.sqrt(vx * vx + vz * vz), levelOut: Math.sqrt(gb.vx * gb.vx + gb.vz * gb.vz) }); }
        if (roll && (Math.pow(-vy * (ball.cor || 0.6), 2) / (2 * gNow) < roll.hopM || outcome.bounceCount > 6)) {
          // This bounce would lift the ball less than roll.hopM: from here it rolls. The landing
          // costs level speed like any bounce (the grass rule above, or the 0.78 below).
          if (gb) { vx = gb.vx; vz = gb.vz; } else { vx *= 0.78; vz *= 0.78; }
          vy = 0;
          pos.y = 0;
          omega.x = 0; omega.y = 0; omega.z = 0;
          rolling = true;
          samples[samples.length - 1].rollStart = true;
          outcome.rollStart = { x: hitX, z: hitZ, t: hitT, speed: Math.sqrt(vx * vx + vz * vz) };
          continue;
        }
        if (outcome.bounceCount > 6) break;
        // ── Coefficient-of-restitution reflection ──
        // |v_after_y| = e · |v_before_y|. Tangential velocity (X, Z) loses
        // energy too — combination of sliding friction + ball deformation
        // — modeled here as a simple 0.78× scale (rough match to a ball
        // sliding without skidding far). Ball stays at y=0 (we don't track
        // sub-surface penetration). Free kicks (grass) and basketball (hardwood) use the
        // impact rule instead; the 0.78 is left only for sports judged at the first landing.
        var e = ball.cor || 0.6;
        pos.y = 0.0001;            // tiny lift so the next iter doesn't re-trigger immediately
        vy = -vy * e;
        if (gb) { vx = gb.vx; vz = gb.vz; } else { vx *= 0.78; vz *= 0.78; }
        // Spin loses ~30% per bounce (frictional torque). Approximate as
        // 0.7× scale on omega magnitude; direction unchanged.
        omega.x *= 0.7; omega.y *= 0.7; omega.z *= 0.7;
      }
    }
    if (!outcome) outcome = { lostInFlight: true };
    return { samples: samples, outcome: outcome, opts: opts };
  }

  // Strike zone (MLB approximate, in meters)
  // Width: ±0.2159 m (= half of 17 in plate)
  // Height: 0.45 m (knees) to 1.05 m (mid-chest), assumes ~6 ft batter
  var STRIKE_ZONE = { xMin: -0.2159, xMax: 0.2159, yMin: 0.45, yMax: 1.05 };

  function classifyPlateLocation(plateX, plateY) {
    if (plateX === undefined || plateY === undefined) return 'wild';
    var inX = plateX >= STRIKE_ZONE.xMin && plateX <= STRIKE_ZONE.xMax;
    var inY = plateY >= STRIKE_ZONE.yMin && plateY <= STRIKE_ZONE.yMax;
    if (inX && inY) return 'strike';
    var nearX = plateX >= STRIKE_ZONE.xMin - 0.08 && plateX <= STRIKE_ZONE.xMax + 0.08;
    var nearY = plateY >= STRIKE_ZONE.yMin - 0.10 && plateY <= STRIKE_ZONE.yMax + 0.10;
    if (nearX && nearY) return 'borderline';
    return 'ball';
  }

  // ═══════════════════════════════════════════
  // ONE MODEL FOR THE VERDICT, THE DRAWN PATH AND THE READOUTS
  // ═══════════════════════════════════════════
  // evaluateThrow(setup) is the only place a throw is simulated and judged. The launch button,
  // the canvas, the 3D zone, the result card and the tests all read its return value, so a
  // number on screen cannot drift away from the model that teaches it.
  var MAKE_OUTCOMES = { strike: true, swish: true, made: true, caught: true, goal: true, good: true,
    wicket: true, shaved: true, bouncer: true, ace: true, 'in': true, green: true, fairway: true };
  function isMakeOutcome(loc) { return MAKE_OUTCOMES[loc] === true; }
  var PRESET_FIELD = { pitching: 'pitchType', freethrow: 'shotType', freekick: 'kickType', fieldgoal: 'goalType',
    bowling: 'bowlType', golf: 'golfClub', volleyball: 'serveType' };
  var PASS_RECEIVER_Z = 6.0;
  function presetsFor(mode) { return (MODES[mode] || MODES.pitching).presets; }
  function findPreset(mode, id) {
    var list = presetsFor(mode);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  // Every slider value a preset sets. Used by the preset buttons, the sport tabs, the scenarios
  // and the first-open defaults, so they cannot disagree with each other.
  function presetPatch(mode, presetId) {
    var m = MODES[mode] ? mode : 'pitching';
    var p = findPreset(m, presetId) || findPreset(m, MODES[m].defaultPreset) || presetsFor(m)[0];
    var patch = { speedMph: p.speedMph, spinRpm: p.spinRpm, spinAxisDeg: p.spinAxisDeg,
      aimDegV: p.aimDegV, aimDegH: p.aimDegH || 0, releaseHeight: p.releaseHeight };
    patch[PRESET_FIELD[m]] = p.id;
    // A field goal preset is a situation: it sets the distance and the wind as well.
    if (m === 'fieldgoal') { patch.fgDistanceYd = p.distanceYd; patch.windMph = p.windMph || 0; patch.windDirDeg = p.windDirDeg || 0; }
    return patch;
  }
  // Basketball shots are taken from different spots, so the hoop distance comes from the shot.
  function shotRimZ(shotId) {
    var p = findPreset('freethrow', shotId);
    return (p && p.distanceM) || MODES.freethrow.rimZ;
  }
  function gravityFor(id) {
    for (var i = 0; i < GRAVITY_PRESETS.length; i++) if (GRAVITY_PRESETS[i].id === id) return GRAVITY_PRESETS[i].g;
    return G;
  }
  // First time the path passes the plane z = value, moving forward.
  function crossPlane(samples, value) {
    for (var i = 1; i < samples.length; i++) {
      var a = samples[i - 1], b = samples[i];
      if (a.z < value && b.z >= value) {
        var f = (value - a.z) / (b.z - a.z);
        return { t: a.t + (b.t - a.t) * f, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: value,
          vx: b.vx, vy: b.vy, vz: b.vz };
      }
    }
    return null;
  }
  function firstGround(samples) {
    for (var i = 1; i < samples.length; i++) if (samples[i].ground) return samples[i];
    return null;
  }
  // Path up to time tStop, ending exactly on `end` (a sample-shaped point).
  function cutPath(samples, tStop, end) {
    var out = [];
    for (var i = 0; i < samples.length; i++) { if (samples[i].t < tStop) out.push(samples[i]); else break; }
    if (end) out.push({ t: tStop, x: end.x, y: end.y, z: end.z, vx: end.vx || 0, vy: end.vy || 0, vz: end.vz || 0, stop: true });
    return out;
  }
  // What the ball does after it hits something: a short free fall with the given push.
  function fallTail(from, vel, g) {
    var out = [], dt = 0.0125, x = from.x, y = from.y, z = from.z, vx = vel.x || 0, vy = vel.y || 0, vz = vel.z || 0, t = from.t;
    for (var i = 0; i < 160 && y > 0; i++) {
      vy -= g * dt; x += vx * dt; y += vy * dt; z += vz * dt; t += dt;
      out.push({ t: t, x: x, y: Math.max(0, y), z: z, vx: vx, vy: vy, vz: vz, after: true });
    }
    return out;
  }
  function withTail(samples, hit, vel, g) {
    return cutPath(samples, hit.t, hit).concat(fallTail(hit, vel, g));
  }
  function upToGround(samples, ground) {
    if (!ground) return samples;
    var out = [];
    for (var i = 0; i < samples.length; i++) { out.push(samples[i]); if (samples[i] === ground) break; }
    return out;
  }

  function evaluateThrow(setup) {
    var mode = MODES[setup.mode] ? setup.mode : 'pitching';
    var mm = MODES[mode];
    var ball = BALLS[mm.ball];
    var presetId = setup[PRESET_FIELD[mode]];
    var preset = findPreset(mode, presetId);
    var isPass = mode === 'freethrow' && !!preset && preset.kind === 'pass';
    var g = gravityFor(setup.gravityId || 'earth');
    var targetZ = mode === 'fieldgoal' ? (setup.fgDistanceYd || 35) * 0.9144
                : mode === 'golf' ? (preset || GOLF_TYPES[0]).carryYd * 0.9144
                : mode === 'freethrow' ? (isPass ? PASS_RECEIVER_Z : shotRimZ(presetId))
                : mm.targetZ;
    var baseMaxT = mode === 'golf' ? 12 : (mode === 'fieldgoal' ? 10 : 4);
    var simOpts = {
      ball: mm.ball,
      speedMph: setup.speedMph,
      releaseHeight: setup.releaseHeight,
      aimDegV: setup.aimDegV,
      aimDegH: setup.aimDegH,
      spinRpm: setup.spinRpm,
      spinAxisDeg: setup.spinAxisDeg,
      throwerHand: setup.throwerHand,
      targetZ: targetZ,
      releaseStride: mm.releaseStrideDefault,
      // Pitches and cricket deliveries end at the target plane. Every other sport needs the
      // whole arc so that "over", "wide", "long" and "short" can be told apart.
      truncateAtTarget: mode === 'pitching' || mode === 'bowling',
      allowBounces: mode !== 'pitching' && mode !== 'bowling',
      windMph: setup.windMph || 0,
      windDirDeg: setup.windDirDeg || 0,
      gravity: g,
      maxT: Math.min(30, Math.max(baseMaxT, baseMaxT * Math.sqrt(G / Math.max(0.5, g)))),
      // The numbered "air pattern" for a low-spin ball. Only balls with a knuckle value use it.
      flutter: { seed: setup.flutterSeed || 1 }
    };
    if (mode === 'bowling') simOpts.surface = CRICKET_SURFACE;
    // A free kick that stays low rolls along the grass after its bounces (see MODES.freekick).
    if (mode === 'freekick') { simOpts.roll = { decel: mm.rollDecel, hopM: mm.rollHopM, stopZ: targetZ + 3, maxT: 30 }; simOpts.grass = GRASS_SURFACE; }
    if (mode === 'freethrow') simOpts.grass = HARDWOOD_SURFACE;
    if (mode === 'freethrow' && !isPass) {
      simOpts.board ={ z: targetZ + (mm.backboardZ - mm.rimZ), yMin: mm.rimY - 0.15, yMax: mm.rimY + 0.92, halfW: 0.91 };
    }
    var sim = simulatePitch(simOpts);
    var raw = sim.samples;
    var last = raw[raw.length - 1];
    var ground = firstGround(raw);
    var read = { flightTime: null, cross: null, land: ground ? { x: ground.x, z: ground.z, t: ground.t } : null,
      targetZ: targetZ, spinShift: null };
    var path = raw;
    var loc;
    if (mode === 'pitching' || mode === 'bowling') {
      if (mode === 'bowling') loc = classifyBowlResult(raw, mm, preset && preset.kind);
      else loc = sim.outcome.reachedPlate ? classifyPlateLocation(sim.outcome.plateX, sim.outcome.plateY) : 'wild';
      if (sim.outcome.reachedPlate) {
        read.cross = { x: sim.outcome.plateX, y: sim.outcome.plateY, z: targetZ, t: sim.outcome.plateT };
        read.flightTime = sim.outcome.plateT;
      } else read.flightTime = (mode === 'bowling') ? last.t : (ground ? ground.t : last.t);
      if (mode === 'bowling') {
        var bn = sim.outcome.bounce || null;
        read.bounce = bn ? { x: bn.x, z: bn.z, t: bn.t, speedIn: bn.speedIn, speedOut: bn.speedOut, turnDeg: bn.turnDeg } : null;
        read.fullToss = !!sim.outcome.reachedPlate && !bn;
        read.batter = crossPlane(raw, mm.targetZ - mm.batterZ);
        read.secondLand = null;
        if (!sim.outcome.reachedPlate && last.ground && ground && last !== ground) read.secondLand = { x: last.x, z: last.z, t: last.t };
      }
    } else if (mode === 'freethrow' && isPass) {
      loc = classifyPassResult(raw, presetId, PASS_RECEIVER_Z);
      var rc = crossPlane(raw, PASS_RECEIVER_Z);
      if (rc) { read.cross = rc; read.flightTime = rc.t; path = cutPath(raw, rc.t, rc); }
      else { read.flightTime = ground ? ground.t : last.t; path = cutPath(raw, (ground ? ground.t : 0) + 1.2, null); }
      // The bounces on the floor before the teammate, with level speed in and out (HARDWOOD_SURFACE).
      read.hops = (sim.outcome.hops || []).filter(function(hp) { return !rc || hp.t <= rc.t; });
    } else if (mode === 'freethrow') {
      var det = classifyShotDetail(raw, mm, ball, targetZ);
      loc = det.loc;
      if (det.dist !== null || loc === 'backboard') {
        read.cross = { x: det.x, y: det.y, z: det.z, t: det.t, dz: det.dz, dx: det.dx, dist: det.dist, banked: !!det.banked };
      }
      if (loc === 'swish' || loc === 'made') {
        read.flightTime = det.t;
        path = withTail(raw, det, { x: 0, y: -1.5, z: 0 }, g);
      } else if (loc === 'backboard') {
        // The simulated rebound off the glass is already in the path: show it down to the floor.
        read.flightTime = det.t;
        path = upToGround(raw, ground);
      } else if (loc === 'rim') {
        read.flightTime = det.t;
        path = withTail(raw, det, { x: det.dx >= 0 ? 0.5 : -0.5, y: 2.0, z: det.dz >= 0 ? 0.9 : -0.9 }, g);
      } else {
        read.flightTime = ground ? ground.t : last.t;
        path = upToGround(raw, ground);
      }
    } else if (mode === 'freekick') {
      loc = classifyKickResult(raw, mm);
      var wallC = crossPlane(raw, mm.wallZ), goalC = loc === 'short' ? null : crossPlane(raw, mm.targetZ);
      // The roll: where it started (and how fast), where it stopped. Null for a kick that never rolled.
      var rs = sim.outcome.rollStart || null, rStop = sim.outcome.rollStop || null;
      read.roll = rs ? { x: rs.x, z: rs.z, t: rs.t, speed: rs.speed } : null;
      read.rollStop = rStop ? { x: rStop.x, z: rStop.z, t: rStop.t } : null;
      read.frame = (loc === 'post' && goalC) ? kickFrameGap(mm, goalC.x, goalC.y) : null;
      var rolledTo = function(c) { return !!(c && rs && rs.t <= c.t); };
      if (loc === 'blocked' && wallC) {
        read.cross = wallC; read.flightTime = wallC.t;
        read.rolledAtCross = rolledTo(wallC);
        path = read.rolledAtCross ? cutPath(raw, wallC.t, wallC) : withTail(raw, wallC, { x: 0, y: 0.6, z: -1.6 }, g);
      } else if (loc === 'goal' && goalC && rolledTo(goalC)) {
        // A rolled goal: show it rolling on into the net (1 m), along the simulated path.
        read.cross = goalC; read.flightTime = goalC.t; read.rolledAtCross = true;
        var inNet = crossPlane(raw, mm.targetZ + 1);
        path = inNet ? cutPath(raw, inNet.t, inNet) : raw;
      } else if ((loc === 'goal' || loc === 'post') && goalC) {
        read.cross = goalC; read.flightTime = goalC.t;
        path = withTail(raw, goalC, loc === 'goal' ? { x: 0, y: 0.3, z: 1.4 } : { x: 0, y: 0.8, z: -2.0 }, g);
      } else if (goalC) {
        read.cross = goalC; read.flightTime = goalC.t; read.rolledAtCross = rolledTo(goalC);
        path = (ground && ground.t > goalC.t) ? upToGround(raw, ground) : cutPath(raw, goalC.t + 0.8, null);
      } else if (rStop) {
        // Short: it rolled and stopped before the line. The verdict waits until it stops.
        read.flightTime = rStop.t;
        path = raw;
      } else {
        read.flightTime = ground ? ground.t : last.t;
        path = cutPath(raw, (ground ? ground.t : last.t) + 0.6, null);
      }
      // The bounces that mattered: before the wall or the goal line (later ones happen in the net).
      read.hops = (sim.outcome.hops || []).filter(function(hp) { return !read.cross || hp.t <= read.cross.t; });
    } else if (mode === 'fieldgoal') {
      loc = classifyFieldGoalResult(raw, targetZ, mm.crossbarHeight, mm.goalHalfWidth);
      var barC = crossPlane(raw, targetZ);
      if (barC && !(ground && ground.t < barC.t)) read.cross = barC;
      read.flightTime = ground ? ground.t : last.t;
      // Which piece of the frame it touched, and how close the center came (same rule as the classifier).
      read.frame = (loc === 'doink' && barC) ? fgFrameGap(mm, barC.x, barC.y) : null;
      // Off the bar it drops back toward the field; off an upright it is knocked out to the side.
      if (loc === 'doink' && barC) path = withTail(raw, barC, read.frame.part === 'upright' ? { x: barC.x > 0 ? 1.2 : -1.2, y: 0.4, z: -0.8 } : { x: 0, y: 1.0, z: -2.0 }, g);
      else path = upToGround(raw, ground);
    } else if (mode === 'golf') {
      loc = classifyGolfResult(raw, (preset || GOLF_TYPES[0]).carryYd, mm.fairwayHalfYd);
      read.flightTime = ground ? ground.t : last.t;
      path = upToGround(raw, ground);
    } else {
      loc = classifyVolleyResult(raw, mm);
      var netC = crossPlane(raw, mm.netZ);
      if (netC && !(ground && ground.t < netC.t)) read.cross = netC;
      if (loc === 'net' && netC) {
        read.flightTime = netC.t;
        path = withTail(raw, netC, { x: 0, y: 0, z: -0.5 }, g);
      } else {
        read.flightTime = ground ? ground.t : last.t;
        path = upToGround(raw, ground);
      }
    }
    // What spin changed: the same launch with no spin, same wind and gravity, and no dart.
    var noSpin = simulatePitch(Object.assign({}, simOpts, { spinRpm: 0, spinAxisDeg: 0, flutter: null }));
    var nsGround = firstGround(noSpin.samples);
    // What the low-spin dart changed: the same launch with the dart switched off.
    var dartW = knuckleWeight(ball, setup.spinRpm);
    var base = sim, baseGround = ground;
    read.dart = null;
    if (dartW > 0) {
      base = simulatePitch(Object.assign({}, simOpts, { flutter: null }));
      baseGround = firstGround(base.samples);
      var dA = crossPlane(raw, targetZ), dB = crossPlane(base.samples, targetZ);
      if (dA && ground && ground.t < dA.t) dA = null;
      if (dB && baseGround && baseGround.t < dB.t) dB = null;
      read.dart = { weight: dartW, seed: setup.flutterSeed || 1,
        side: (dA && dB) ? dA.x - dB.x : null, up: (dA && dB) ? dA.y - dB.y : null,
        landSide: (ground && baseGround) ? ground.x - baseGround.x : null,
        landCarry: (ground && baseGround) ? ground.z - baseGround.z : null };
    }
    var shift = { up: null, side: null, carry: null };
    var cA = crossPlane(base.samples, targetZ), cB = crossPlane(noSpin.samples, targetZ);
    if (cA && baseGround && baseGround.t < cA.t) cA = null;
    if (cB && nsGround && nsGround.t < cB.t) cB = null;
    if (cA && cB) { shift.up = cA.y - cB.y; shift.side = cA.x - cB.x; }
    if (baseGround && nsGround) shift.carry = baseGround.z - nsGround.z;
    if (mode === 'bowling') {
      // Movement in the air is measured just before the first of the two balls lands.
      var zRef = Math.min(ground ? ground.z : targetZ, nsGround ? nsGround.z : targetZ, targetZ) - 0.02;
      var sA = crossPlane(raw, zRef), sB = crossPlane(noSpin.samples, zRef);
      shift.side = (sA && sB) ? sA.x - sB.x : null;
      shift.up = (sA && sB) ? sA.y - sB.y : null;
      // The turn off the pitch: the same delivery on a pitch that does not grip the side spin.
      read.turn = null;
      if (read.bounce && read.cross && setup.spinRpm > 0) {
        var noGrip = simulatePitch(Object.assign({}, simOpts, { surface: Object.assign({}, CRICKET_SURFACE, { turnShare: 0 }) }));
        if (noGrip.outcome.reachedPlate) read.turn = read.cross.x - noGrip.outcome.plateX;
      }
    }
    read.spinShift = shift;
    // What the wind changed: the same launch in calm air.
    read.windShift = null;
    if ((setup.windMph || 0) > 0) {
      var calm = simulatePitch(Object.assign({}, simOpts, { windMph: 0 }));
      var calmGround = firstGround(calm.samples);
      var wA = crossPlane(raw, targetZ), wB = crossPlane(calm.samples, targetZ);
      if (mode !== 'bowling') {
        if (wA && ground && ground.t < wA.t) wA = null;
        if (wB && calmGround && calmGround.t < wB.t) wB = null;
      }
      read.windShift = { side: (wA && wB) ? wA.x - wB.x : null, up: (wA && wB) ? wA.y - wB.y : null,
        carry: (ground && calmGround) ? ground.z - calmGround.z : null };
    }
    var apex = 0;
    for (var ai = 0; ai < path.length; ai++) { if (path[ai].after) break; if (path[ai].y > apex) apex = path[ai].y; }
    read.apex = apex;
    sim.samples = path;
    sim.location = loc;
    sim.read = read;
    sim.flightTime = read.flightTime;
    if (base.outcome.reachedPlate && noSpin.outcome.reachedPlate) {
      sim.vBreakIn = (noSpin.outcome.plateY - base.outcome.plateY) * FT_PER_M * 12;
      sim.hBreakIn = (base.outcome.plateX - noSpin.outcome.plateX) * FT_PER_M * 12;
    } else { sim.vBreakIn = null; sim.hBreakIn = null; }
    sim.whereText = describeWhere(mode, loc, read, setup, preset);
    return sim;
  }

  // One or two plain sentences saying where the ball went, with numbers taken from the model.
  // Sides are from the thrower's view (+x in the model is the thrower's left).
  function describeWhere(mode, loc, read, setup, preset) {
    var mm = MODES[mode];
    var c = read.cross, land = read.land;
    function m(v, d) { return Math.abs(v).toFixed(d == null ? 2 : d) + ' m'; }
    function cm(v) { return Math.round(Math.abs(v) * 100) + ' cm'; }
    function inch(v) { return Math.round(Math.abs(v) * 39.37) + ' in'; }
    function side(x) { return x > 0 ? 'left' : 'right'; }
    function yd(v) { return Math.round(Math.abs(v) / 0.9144) + ' yd'; }
    if (mode === 'pitching') {
      if (!c) return land ? 'The pitch hit the dirt ' + m(mm.targetZ - land.z, 1) + ' before the plate.' : 'The pitch never reached the plate.';
      var parts = [];
      if (c.y < STRIKE_ZONE.yMin) parts.push(inch(STRIKE_ZONE.yMin - c.y) + ' below the zone');
      else if (c.y > STRIKE_ZONE.yMax) parts.push(inch(c.y - STRIKE_ZONE.yMax) + ' above the zone');
      if (c.x < STRIKE_ZONE.xMin) parts.push(inch(STRIKE_ZONE.xMin - c.x) + ' off the right edge');
      else if (c.x > STRIKE_ZONE.xMax) parts.push(inch(c.x - STRIKE_ZONE.xMax) + ' off the left edge');
      if (!parts.length) return 'It crossed the plate ' + inch(c.y) + ' high, ' + (Math.abs(c.x) < 0.05 ? 'down the middle' : inch(c.x) + ' ' + side(c.x) + ' of center') + '.';
      return 'It crossed the plate ' + parts.join(' and ') + '.';
    }
    if (mode === 'freethrow' && preset && preset.kind === 'pass') {
      if (!c) return land ? 'The pass hit the floor ' + m(land.z, 1) + ' out and never reached your teammate.' : 'The pass never reached your teammate.';
      // A bounce on the way: where, and the level speed the floor took (read.hops, HARDWOOD_SURFACE).
      var ph = (read.hops || [])[0], mph = function(v) { return Math.round(v * MPH_PER_MPS) + ' mph'; };
      // The arrival height (the verdict) comes first, so it survives the canvas banner's line limit.
      var arrive = 'It reached your teammate ' + m(c.y) + ' off the floor' + (Math.abs(c.x) > 0.1 ? ', ' + m(c.x) + ' to the ' + side(c.x) : '') + ' (catch zone 0.6 to 1.6 m).';
      if (!ph) return arrive;
      return arrive + ' It bounced ' + m(ph.z, 1) + ' out' + ((read.hops || []).length > 1 ? ' and again ' + m(read.hops[1].z, 1) + ' out' : '') + ', and the floor slowed it from ' + Math.round(ph.levelIn * MPH_PER_MPS) + ' to ' + mph(ph.levelOut) + ' going forward.';
    }
    if (mode === 'freethrow') {
      if (loc === 'backboard' && c) return 'The ball hit the backboard ' + m(c.y - mm.rimY) + (c.y >= mm.rimY ? ' above' : ' below') + ' the rim and bounced away from the hoop.';
      if (!c || c.dist === null) return 'The ball never got up to rim height (' + mm.rimY.toFixed(2) + ' m). Its highest point was ' + m(read.apex) + '.';
      if (loc === 'swish' || loc === 'made') return (c.banked ? 'It banked off the glass and came down ' : 'The ball came down ') + cm(c.dist) + ' from the center of the rim.';
      var where = Math.abs(c.dz) >= Math.abs(c.dx) ? (c.dz < 0 ? 'short of' : 'past') : ('to the ' + side(c.dx) + ' of');
      var off = Math.abs(c.dz) >= Math.abs(c.dx) ? c.dz : c.dx;
      return 'The ball came down ' + m(off) + ' ' + where + ' the center of the rim.';
    }
    if (mode === 'freekick') {
      var wallSize = ' The wall is ' + mm.wallHeight.toFixed(1) + ' m tall and ' + (mm.wallHalfWidth * 2).toFixed(0) + ' m wide.';
      if (loc === 'blocked' && c && read.rolledAtCross) return 'It landed ' + m(mm.wallZ - land.z, 1) + ' before the wall and rolled into it.' + wallSize;
      if (loc === 'blocked' && c) return 'The ball hit the wall ' + m(c.y) + ' off the ground.' + wallSize;
      var stop = read.rollStop;
      if (!c && stop && land) {
        if (stop.z >= mm.targetZ) return 'It landed ' + m(mm.targetZ - land.z, 1) + ' before the goal line, rolled, and stopped on the line. The whole ball must cross it.';
        return 'It landed ' + m(mm.targetZ - land.z, 1) + ' before the goal line, rolled, and stopped ' + m(mm.targetZ - stop.z, 1) + ' short of it.';
      }
      if (!c) return land ? 'The ball hit the ground ' + m(mm.targetZ - land.z, 1) + ' before the goal line.' : 'The ball never reached the goal line.';
      // A kick that bounced first is still judged where it crosses the line.
      var bouncedFirst = !!(land && land.z < mm.targetZ && land.t < c.t);
      var bounceLead = bouncedFirst ? 'It bounced ' + m(mm.targetZ - land.z, 1) + ' before the goal line, then ' : 'It ';
      var across = 'crossed the line ' + m(c.y) + ' high, ';
      if (read.rolledAtCross && land) { bounceLead = 'It landed ' + m(mm.targetZ - land.z, 1) + ' before the goal line, then '; across = 'rolled over the line '; }
      if (loc === 'goal') return bounceLead + across + (Math.abs(c.x) < 0.05 ? 'in the center' : m(c.x) + ' ' + side(c.x) + ' of center') + '.';
      if (loc === 'post' && read.frame) {
        // It touched the frame: say which piece, and how close the center came.
        var fr = read.frame;
        var piece = fr.part === 'bar' ? 'the crossbar' : fr.part === 'corner' ? 'the top ' + side(c.x) + ' corner of the goal' : 'the ' + side(c.x) + ' post';
        var gcm = function(v) { return Math.abs(v) < 0.005 ? 'less than 1 cm' : cm(v); };
        var how = fr.part === 'bar' ? gcm(c.y - mm.goalHeight) + ' over the bar' : fr.part === 'post' ? gcm(Math.abs(c.x) - mm.goalHalfWidth) + ' outside the post' : gcm(fr.gap) + ' from the corner';
        return bounceLead + (read.rolledAtCross ? 'rolled into ' : 'clipped ') + piece + '. The center of the ball passed ' + how + ', and the ball touches the frame when that gap is ' + cm(fr.touch) + ' or less.';
      }
      if (read.rolledAtCross && land) {
        var rb = Math.abs(c.x) > mm.goalHalfWidth ? m(Math.abs(c.x) - mm.goalHalfWidth) + ' outside the ' + side(c.x) + ' post' : m(c.x) + ' ' + side(c.x) + ' of center';
        return bounceLead + 'rolled over the line ' + rb + '.';
      }
      var bits = [];
      if (c.y > mm.goalHeight) bits.push(m(c.y - mm.goalHeight) + ' over the bar');
      if (Math.abs(c.x) > mm.goalHalfWidth) bits.push(m(Math.abs(c.x) - mm.goalHalfWidth) + ' outside the ' + side(c.x) + ' post');
      return bits.length ? bounceLead + 'crossed the line ' + bits.join(' and ') + '.' : 'It hit the frame of the goal ' + m(c.y) + ' high, ' + m(c.x) + ' ' + side(c.x) + ' of center.';
    }
    if (mode === 'fieldgoal') {
      if (!c) return land ? 'The ball landed ' + yd(read.targetZ - land.z) + ' short of the goal posts.' : 'The ball never reached the goal posts.';
      if (loc === 'doink' && read.frame) {
        // It touched the frame: say which piece, and how close the center came (the free kick's wording).
        var ff = read.frame;
        var fcm = function(v) { return Math.abs(v) < 0.005 ? 'less than 1 cm' : cm(v); };
        var fPiece = ff.part === 'bar' ? 'the crossbar' : ff.part === 'corner' ? 'the ' + side(c.x) + ' end of the crossbar' : 'the ' + side(c.x) + ' upright';
        var fHow = ff.part === 'bar' ? fcm(mm.crossbarHeight - c.y) + ' under the bar' : ff.part === 'upright' ? fcm(Math.abs(c.x) - mm.goalHalfWidth) + ' outside the upright' : fcm(ff.gap) + ' from the end of the bar';
        return 'It clipped ' + fPiece + '. The center of the ball passed ' + fHow + ', and the ball touches the frame when that gap is ' + cm(ff.touch) + ' or less.';
      }
      var fb = [];
      if (c.y < mm.crossbarHeight) fb.push(m(mm.crossbarHeight - c.y) + ' under the crossbar');
      else fb.push(m(c.y - mm.crossbarHeight) + ' over the crossbar');
      if (Math.abs(c.x) > mm.goalHalfWidth) fb.push(m(Math.abs(c.x) - mm.goalHalfWidth) + ' outside the ' + side(c.x) + ' upright');
      return 'It passed the posts ' + fb.join(' and ') + '.';
    }
    if (mode === 'bowling') {
      var bn = read.bounce, bat = read.batter;
      var lead = bn ? 'It bounced ' + m(mm.targetZ - bn.z, 1) + ' in front of the stumps' : 'A full toss (no bounce)';
      if (!c) {
        if (bn && read.secondLand) return lead + ' and landed again ' + m(mm.targetZ - read.secondLand.z, 1) + ' short of them. A ball that bounces twice is a no-ball.';
        return 'The ball never reached the stumps.';
      }
      if (loc === 'wicket' || loc === 'shaved') return lead + (bn ? ', then hit them ' : ': it hit the stumps ') + cm(c.y) + ' up. The stumps are 71 cm tall.';
      if (loc === 'bouncer' && bat) return lead + ' and reached the batter ' + m(bat.y) + ' high. That is between the chest and the helmet.';
      if (loc === 'beamer' && bat) return 'A full toss (no bounce) that reached the batter ' + m(bat.y) + ' high. Above the waist that is a no-ball.';
      if (loc === 'overhead' && bat) return lead + ' and passed the batter ' + m(bat.y) + ' high. That is over head height.';
      var bb = [];
      if (c.y > mm.stumpsHeight) bb.push(cm(c.y - mm.stumpsHeight) + ' over the top');
      if (Math.abs(c.x) > mm.stumpsHalfWidth) bb.push(cm(Math.abs(c.x) - mm.stumpsHalfWidth) + ' to the ' + side(c.x));
      return lead + (bn ? ', then passed them ' : ': it passed the stumps ') + (bb.length ? bb.join(' and ') : 'very close') + '.';
    }
    if (mode === 'golf') {
      if (!land) return 'The ball was still in the air when the timer ran out.';
      var target = (preset || GOLF_TYPES[0]).carryYd;
      var carry = land.z / 0.9144, diff = carry - target;
      return 'It carried ' + Math.round(carry) + ' yd: ' + (Math.abs(diff) < 0.5 ? 'right at' : Math.round(Math.abs(diff)) + ' yd ' + (diff < 0 ? 'short of' : 'past')) + ' the ' + target + ' yd flag'
        + (Math.abs(land.x) / 0.9144 >= 1 ? ', ' + yd(land.x) + ' to the ' + side(land.x) : '') + '.';
    }
    // volleyball
    if (loc === 'net' && c) return 'The ball hit the net ' + cm(mm.netHeight - c.y) + ' below the top. The net is ' + mm.netHeight.toFixed(2) + ' m high.';
    if (!land) return 'The ball never came down inside the time limit.';
    if (land.z < mm.netZ) return 'The ball landed ' + m(mm.netZ - land.z, 1) + ' before the net.';
    var clear = c ? 'It cleared the net by ' + cm(c.y - mm.netHeight) + ' and ' : 'It ';
    if (land.z > mm.targetZ) return clear + 'landed ' + m(land.z - mm.targetZ, 1) + ' past the back line.';
    if (Math.abs(land.x) > mm.courtHalfWidth) return clear + 'landed ' + m(Math.abs(land.x) - mm.courtHalfWidth, 1) + ' outside the ' + side(land.x) + ' sideline.';
    return clear + 'landed ' + m(mm.targetZ - land.z, 1) + ' inside the back line.';
  }

  // A stable name for "this exact setup", used so a make only earns XP the first time.
  function setupKey(setup) {
    var mode = MODES[setup.mode] ? setup.mode : 'pitching';
    return [mode, setup[PRESET_FIELD[mode]] || '', setup.speedMph, setup.releaseHeight, setup.aimDegV, setup.aimDegH,
      setup.spinRpm, setup.spinAxisDeg, setup.throwerHand || 'right', setup.gravityId || 'earth',
      setup.windMph || 0, setup.windDirDeg || 0, mode === 'fieldgoal' ? (setup.fgDistanceYd || 35) : ''].join('|');
  }

  // How long the replay of a flight should last on screen, in seconds. Fast, short flights
  // are slowed down so the eye can follow them; long ones are sped up. The ratio is shown
  // to the student, so the picture never pretends to be real time when it is not.
  function replaySeconds(flightTime, pathTime) {
    var ft = (typeof flightTime === 'number' && flightTime > 0) ? flightTime : 1;
    var shown = Math.max(0.9, Math.min(3.2, ft));
    var total = (typeof pathTime === 'number' && pathTime > ft) ? pathTime : ft;
    return shown * (total / ft);
  }

  // ═══════════════════════════════════════════
  // CHALLENGES: something to solve, checked by the model
  // ═══════════════════════════════════════════
  var SETUP_FIELDS = [
    ['speedMph', 'speed'], ['releaseHeight', 'release height'], ['aimDegV', 'launch angle'], ['aimDegH', 'left/right aim'],
    ['spinRpm', 'spin rate'], ['spinAxisDeg', 'spin axis'], ['gravityId', 'gravity'], ['windMph', 'wind speed'],
    ['windDirDeg', 'wind direction'], ['flutterSeed', 'air pattern']
  ];
  // Which controls differ between two setups (same sport). The preset counts as one control.
  function setupChanges(a, b) {
    var mode = MODES[a.mode] ? a.mode : 'pitching';
    var out = [];
    if ((a[PRESET_FIELD[mode]] || '') !== (b[PRESET_FIELD[mode]] || '')) out.push('preset');
    SETUP_FIELDS.forEach(function(pair) {
      var av = a[pair[0]], bv = b[pair[0]];
      if (pair[0] === 'gravityId') { av = av || 'earth'; bv = bv || 'earth'; }
      else if (pair[0] === 'flutterSeed') { av = av || 1; bv = bv || 1; }
      else { av = Number(av) || 0; bv = Number(bv) || 0; }
      if (pair[0] === 'windDirDeg' && !(Number(a.windMph) || Number(b.windMph))) return;
      if (av !== bv) out.push(pair[1]);
    });
    if (mode === 'fieldgoal' && (a.fgDistanceYd || 35) !== (b.fgDistanceYd || 35)) out.push('distance');
    return out;
  }
  function cleanSetup(mode, patch) {
    return Object.assign({ mode: mode, throwerHand: 'right', gravityId: 'earth', windMph: 0, windDirDeg: 0, flutterSeed: 1 }, patch);
  }

  // ── Fix this miss ──
  // One per sport: the sport's first preset with the speed moved until it just misses, and
  // two steps further so the fix takes a little thought. Built from the model, so it can
  // never go stale when a preset is retuned. dir -1 = too slow, +1 = too fast.
  var FIX_MISS_DIR = { pitching: -1, freethrow: -1, freekick: 1, fieldgoal: -1, bowling: -1, golf: 1, volleyball: 1 };
  function fixMissSetup(mode) {
    var m = MODES[mode] ? mode : 'pitching', mm = MODES[m];
    var step = mm.speedStep || 1, dir = FIX_MISS_DIR[m] || -1;
    var base = cleanSetup(m, presetPatch(m, mm.defaultPreset));
    var speed = base.speedMph, firstMiss = null;
    for (var i = 0; i < 400; i++) {
      speed += dir * step;
      if (speed < mm.speedRange[0] || speed > mm.speedRange[1]) break;
      if (!isMakeOutcome(evaluateThrow(Object.assign({}, base, { speedMph: speed })).location)) { firstMiss = speed; break; }
    }
    if (firstMiss === null) return null;
    var missSpeed = firstMiss;
    for (var k = 0; k < 2; k++) {
      var next = missSpeed + dir * step;
      if (next < mm.speedRange[0] || next > mm.speedRange[1]) break;
      if (isMakeOutcome(evaluateThrow(Object.assign({}, base, { speedMph: next })).location)) break;
      missSpeed = next;
    }
    return Object.assign({}, base, { speedMph: missSpeed });
  }
  // fm = { mode, setup, tried, done }. Returns the new state plus what just happened.
  function judgeFixMiss(fm, setup, made) {
    if (!fm || fm.done || fm.mode !== setup.mode) return { state: fm, event: null };
    var changed = setupChanges(fm.setup, setup);
    if (!changed.length) return { state: Object.assign({}, fm, { tried: true }), event: 'tried' };
    if (made && changed.length === 1) return { state: Object.assign({}, fm, { tried: true, done: true, fixedBy: changed[0] }), event: 'fixed' };
    if (made) return { state: Object.assign({}, fm, { tried: true, lastChanged: changed.length }), event: 'toomany' };
    return { state: Object.assign({}, fm, { tried: true, lastChanged: changed.length }), event: 'stillmiss' };
  }

  // ── One question per skill tier ──
  // Each tier's question needs the controls that tier unlocks. Free play is untouched: the
  // question is judged quietly from whatever the student launches.
  var TIER_NAMES = { 1: 'Rookie', 2: 'Pro', 3: 'All-Star', 4: 'Hall of Fame' };
  var SCORE_WORDS = { pitching: 'is a strike', freethrow: 'scores', freekick: 'scores', fieldgoal: 'is good',
    bowling: 'hits the stumps', golf: 'reaches the fairway or green', volleyball: 'lands in' };
  SCORE_WORDS.pitching = 'gives a strike'; SCORE_WORDS.fieldgoal = 'goes through the posts';
  var QUESTS = {
    2: { pitching: { type: 'slowMake', below: 15 }, bowling: { type: 'bounceAndFull' },
         freethrow: { type: 'twoAngles', gap: 15 }, freekick: { type: 'twoAngles', gap: 5 }, fieldgoal: { type: 'twoAngles', gap: 20 },
         golf: { type: 'twoAngles', gap: 20 }, volleyball: { type: 'twoAngles', gap: 10 } },
    3: { pitching: { type: 'spinMove', measure: 'side', min: 0.3556, say: '14 inches sideways' },
         freekick: { type: 'spinMove', measure: 'side', min: 3.5, say: '3.5 m sideways' },
         bowling: { type: 'spinMove', measure: 'turn', min: 0.40, say: '40 cm off the pitch' },
         golf: { type: 'spinMove', measure: 'carry', min: 120 * 0.9144, say: '120 yd of extra carry' },
         volleyball: { type: 'spinMove', measure: 'carryDown', min: 9.5, say: '9.5 m sooner' },
         freethrow: { type: 'bankAndSwish' },
         fieldgoal: { type: 'windKick', yd: 50, wind: 20 } }
  };
  function questFor(mode, tier) {
    var m = MODES[mode] ? mode : 'pitching';
    var t = Math.max(1, Math.min(4, Number(tier) || 1));
    if (t === 1) return { type: 'slowest', mode: m, tier: 1 };
    if (t === 4) return { type: 'calls', need: 3, mode: m, tier: 4 };
    return Object.assign({ mode: m, tier: t }, QUESTS[t][m]);
  }
  function questText(quest, presetLabel) {
    var who = TIER_NAMES[quest.tier] + ' question: ';
    if (quest.type === 'slowest') return who + 'what is the slowest speed that still ' + SCORE_WORDS[quest.mode] + '? Move only the speed slider.';
    if (quest.type === 'slowMake') { var p = findPreset(quest.mode, MODES[quest.mode].defaultPreset); return who + 'throw a ' + p.label + ' for a strike at ' + (p.speedMph - quest.below) + ' mph or slower. A slower ball drops more, so you will have to change your aim.'; }
    if (quest.type === 'bounceAndFull') return who + 'hit the stumps twice at ONE speed: once with a bounce, once with a full toss (no bounce).';
    if (quest.type === 'twoAngles') return who + 'score twice at ONE speed, with launch angles at least ' + quest.gap + '° apart. A low path and a high path can both work.';
    if (quest.type === 'bankAndSwish') return who + 'score the same kind of shot two ways: straight through the hoop, and banked in off the glass.';
    if (quest.type === 'windKick') return who + 'a spiral makes almost no lift, so here the test is wind. Make a kick from ' + quest.yd + ' yd or more into a headwind of ' + quest.wind + ' mph or more.';
    if (quest.type === 'spinMove') {
      var lead = 'Speed and aim move the whole path. Only spin bends it. ';
      if (quest.measure === 'turn') return who + lead + 'Hit the stumps with a ball that spin turns at least ' + quest.say + '.';
      if (quest.measure === 'carry') return who + lead + 'Land on the fairway or green with backspin adding at least ' + quest.say + '.';
      if (quest.measure === 'carryDown') return who + lead + 'Land a serve in with topspin bringing it down at least ' + quest.say + ' than the same serve with no spin.';
      if (quest.measure === 'up') return who + lead + 'Make a shot that backspin lifts at least ' + quest.say + '.';
      return who + lead + (quest.mode === 'pitching' ? 'Throw a strike' : 'Score') + ' with spin moving the ball at least ' + quest.say + '.';
    }
    return who + 'call the result before you launch, and be right ' + quest.need + ' times in a row, with a different setup each time. At least one must be a miss you saw coming.';
  }
  // The same setup with one or two controls blanked: "everything else the same".
  function restKey(setup, dropAngle) {
    return setupKey(Object.assign({}, setup, dropAngle ? { speedMph: 0, aimDegV: 0 } : { speedMph: 0 })) + '|' + (setup.flutterSeed || 1);
  }
  // Slowest speed on the slider that still scores, with every other control as it is.
  function slowestMake(setup) {
    var mm = MODES[MODES[setup.mode] ? setup.mode : 'pitching'];
    var step = mm.speedStep || 1;
    for (var s = mm.speedRange[0]; s <= mm.speedRange[1] + 1e-9; s += step) {
      if (isMakeOutcome(evaluateThrow(Object.assign({}, setup, { speedMph: s })).location)) return s;
    }
    return null;
  }
  function spinMeasure(quest, result) {
    var read = result.read || {}, sh = read.spinShift || {};
    var v = quest.measure === 'turn' ? read.turn : quest.measure === 'carry' ? sh.carry
          : quest.measure === 'carryDown' ? (typeof sh.carry === 'number' ? -sh.carry : null)
          : quest.measure === 'up' ? sh.up : sh.side;
    if (typeof v !== 'number') return null;
    return (quest.measure === 'side' || quest.measure === 'turn') ? Math.abs(v) : v;
  }
  // prog is the saved progress for one sport + tier. call = { called, matched, bucket }.
  // Returns new progress; prog.done turns true the moment the evidence is complete.
  function advanceQuest(quest, prog, setup, result, call) {
    var p = Object.assign({}, prog || {});
    if (p.done) return p;
    var made = isMakeOutcome(result.location);
    var mm = MODES[quest.mode], step = mm.speedStep || 1;
    var same = function(a, b) { return Math.abs(a - b) < 1e-9; };
    if (quest.type === 'slowest') {
      var rk = restKey(setup, false);
      if (p.rest !== rk) p = { rest: rk, best: null, misses: [], answer: null };
      if (made) p.best = (p.best === null || setup.speedMph < p.best) ? setup.speedMph : p.best;
      else p.misses = (p.misses || []).concat([setup.speedMph]).slice(-40);
      if (p.best !== null) {
        if (p.answer === null || p.answer === undefined) p.answer = slowestMake(setup);
        var below = p.answer - step;
        var proved = below < mm.speedRange[0] - 1e-9 || (p.misses || []).some(function(v) { return same(v, below); });
        if (same(p.best, p.answer) && proved) p.done = true;
      }
      return p;
    }
    if (quest.type === 'slowMake') {
      var cap = findPreset(quest.mode, mm.defaultPreset).speedMph - quest.below;
      // The question is about the sport's first pitch: a slower preset must not answer it for free.
      if (setup[PRESET_FIELD[quest.mode]] !== mm.defaultPreset) return p;
      if (made && setup.speedMph <= cap + 1e-9) { p.done = true; p.at = setup.speedMph; }
      else if (setup.speedMph <= cap + 1e-9) p.tries = (p.tries || 0) + 1;
      return p;
    }
    if (quest.type === 'twoAngles' || quest.type === 'bounceAndFull') {
      if (!made) return p;
      var entry = { s: setup.speedMph, a: setup.aimDegV, rest: restKey(setup, true), full: !!(result.read && result.read.fullToss) };
      var partner = (p.makes || []).filter(function(mk) {
        if (!same(mk.s, entry.s) || mk.rest !== entry.rest) return false;
        return quest.type === 'twoAngles' ? Math.abs(mk.a - entry.a) >= quest.gap - 1e-9 : mk.full !== entry.full;
      })[0];
      p.makes = (p.makes || []).concat([entry]).slice(-12);
      if (partner) { p.done = true; p.pair = [partner, entry]; }
      return p;
    }
    if (quest.type === 'bankAndSwish') {
      if (!(result.location === 'swish' || result.location === 'made')) return p;
      var shot = { preset: setup.shotType, banked: !!(result.read && result.read.cross && result.read.cross.banked) };
      var other = (p.makes || []).filter(function(mk) { return mk.preset === shot.preset && mk.banked !== shot.banked; })[0];
      p.makes = (p.makes || []).concat([shot]).slice(-12);
      if (other) p.done = true;
      return p;
    }
    if (quest.type === 'spinMove') {
      var val = spinMeasure(quest, result);
      if (typeof val === 'number' && (p.best === undefined || p.best === null || val > p.best) && made) p.best = val;
      if (made && typeof val === 'number' && val >= quest.min - 1e-9) p.done = true;
      return p;
    }
    if (quest.type === 'windKick') {
      var dir = ((Number(setup.windDirDeg) || 0) % 360 + 360) % 360;
      var head = dir <= 30 || dir >= 330;
      if (result.location === 'good' && (setup.fgDistanceYd || 0) >= quest.yd && (setup.windMph || 0) >= quest.wind && head) p.done = true;
      return p;
    }
    // calls: a run of correct calls on different setups, including at least one predicted miss
    if (!call || !call.called) return p;
    var key = setupKey(setup) + '|' + (setup.flutterSeed || 1);
    if (!call.matched) { p.run = []; p.lastKey = key; return p; }
    if (key === p.lastKey) return p;
    p.run = (p.run || []).concat([call.bucket]).slice(-quest.need);
    p.lastKey = key;
    if (p.run.length >= quest.need && p.run.some(function(b) { return b !== 'target'; })) p.done = true;
    return p;
  }

  // The shaded bounce zone on the passing court: with every control but the launch angle as it is
  // (the Bounce Pass preset when no setup is given), where the pass can hit the floor once and still
  // be caught. The angle is swept over its slider in 0.5° steps. null = no angle works at this speed.
  var bouncePassZoneCache = {};
  function bouncePassZone(setup) {
    var base = Object.assign(cleanSetup('freethrow', presetPatch('freethrow', 'bouncepass')), setup || {}, { mode: 'freethrow', shotType: 'bouncepass' });
    var key = setupKey(Object.assign({}, base, { aimDegV: 0 }));
    if (Object.prototype.hasOwnProperty.call(bouncePassZoneCache, key)) return bouncePassZoneCache[key];
    var lo = null, hi = null, vr = MODES.freethrow.verticalAimRange;
    for (var a = vr[0]; a <= 0; a += 0.5) {
      var r = evaluateThrow(Object.assign({}, base, { aimDegV: a }));
      var hp = (r.read.hops || [])[0];
      if (r.location !== 'caught' || !hp || r.read.hops.length !== 1) continue;
      lo = lo === null ? hp.z : Math.min(lo, hp.z); hi = hi === null ? hp.z : Math.max(hi, hp.z);
    }
    var keys = Object.keys(bouncePassZoneCache);
    if (keys.length > 60) delete bouncePassZoneCache[keys[0]];
    bouncePassZoneCache[key] = lo === null ? null : { zMin: lo, zMax: hi };
    return bouncePassZoneCache[key];
  }

  if (typeof window !== 'undefined' && window.StemLab) {
    window.StemLab.ThrowLabModel = {
      bouncePassZone: bouncePassZone,
      setupChanges: setupChanges, fixMissSetup: fixMissSetup, judgeFixMiss: judgeFixMiss, questFor: questFor,
      questText: questText, advanceQuest: advanceQuest, slowestMake: slowestMake, spinMeasure: spinMeasure, TIER_NAMES: TIER_NAMES,
      BALLS: BALLS, MODES: MODES, SCENARIOS: SCENARIOS, GRAVITY_PRESETS: GRAVITY_PRESETS, STRIKE_ZONE: STRIKE_ZONE,
      liftCoefficient: liftCoefficient, simulatePitch: simulatePitch, evaluateThrow: evaluateThrow,
      describeWhere: describeWhere, presetPatch: presetPatch, presetsFor: presetsFor, findPreset: findPreset,
      isMakeOutcome: isMakeOutcome, setupKey: setupKey, replaySeconds: replaySeconds, shotRimZ: shotRimZ,
      knuckleWeight: knuckleWeight, pitchBounce: pitchBounce, CRICKET_SURFACE: CRICKET_SURFACE,
      GRASS_SURFACE: GRASS_SURFACE, kickFrameGap: kickFrameGap, fgFrameGap: fgFrameGap, HARDWOOD_SURFACE: HARDWOOD_SURFACE
    };
  }

  // ═══════════════════════════════════════════
  // TOOL REGISTRATION
  // ═══════════════════════════════════════════
  // Reusable dependency-free perspective math for Throw Lab and future STEM canvases.
  var TL_PERSPECTIVE = Object.freeze({
    normalizeYaw: function(value) { return ((Number(value) + 180) % 360 + 360) % 360 - 180; },
    clampPitch: function(value) { return Math.max(10, Math.min(55, Number(value) || 10)); },
    createProjector: function(camera, target, width, height) {
      function sub(a,b){ return { x:a.x-b.x, y:a.y-b.y, z:a.z-b.z }; }
      function dot(a,b){ return a.x*b.x+a.y*b.y+a.z*b.z; }
      function cross(a,b){ return { x:a.y*b.z-a.z*b.y, y:a.z*b.x-a.x*b.z, z:a.x*b.y-a.y*b.x }; }
      function unit(v){ var n=Math.sqrt(dot(v,v))||1; return { x:v.x/n, y:v.y/n, z:v.z/n }; }
      var forward=unit(sub(target,camera)),right=unit(cross(forward,{x:0,y:1,z:0})),up=unit(cross(right,forward));
      return { project:function(point){var rel=sub(point,camera),depth=dot(rel,forward);if(depth<=0.5)return null;var focal=width*0.88;return [width/2+dot(rel,right)*focal/depth,height*0.56-dot(rel,up)*focal/depth,depth];},unit:unit,cross:cross };
    }
  });
  window.StemLab.ThrowLabProjection = TL_PERSPECTIVE;

  window.StemLab.registerTool('throwlab', {
    icon: '⚾',
    label: 'ThrowLab',
    desc: 'Sports physics: how spin, speed, and release point shape the ball\'s path',
    color: 'amber',
    category: 'science',
    gradeRange: '5-12',
    questHooks: [
      { id: 'tl_throw_5',
        label: 'Throw 5 pitches',
        icon: '⚾',
        check: function(d) { return (d.throwCount || 0) >= 5; },
        progress: function(d) { return (d.throwCount || 0) + '/5 pitches'; } },
      { id: 'tl_strike_3',
        label: 'Land 3 pitches in the strike zone',
        icon: '🎯',
        check: function(d) { return (d.strikeCount || 0) >= 3; },
        progress: function(d) { return (d.strikeCount || 0) + '/3 strikes'; } },
      { id: 'tl_explain_flight',
        label: 'Explain in your own words what shapes the flight',
        icon: '💡',
        check: function(d) { var iq = (d && d._throwHunt) || {}; return !!iq.understood && typeof iq.explanation === 'string' && iq.explanation.trim().length >= 40; },
        progress: function(d) { var iq = (d && d._throwHunt) || {}; return iq.understood ? (((iq.explanation || '').trim().length >= 40) ? 'Explained' : 'Say more') : 'Visit the inquiry station'; } },
      { id: 'tl_throw_each',
        label: 'Throw every pitch type at least once',
        icon: '🏆',
        check: function(d) { return (d.pitchTypesUsed && Object.keys(d.pitchTypesUsed).length >= PITCH_TYPES.length); },
        progress: function(d) { return ((d.pitchTypesUsed && Object.keys(d.pitchTypesUsed).length) || 0) + '/' + PITCH_TYPES.length + ' types'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;

      // ── State init guard ─────────────────────────────────
      // Seed defaults, but DO NOT early-return here. This render calls hooks
      // (useState/useRef/useEffect) on the lines below AND deep in its body, so
      // a conditional early-return changes the hook count between the empty and
      // seeded renders and throws "Rendered more hooks than during the previous
      // render" on that transition (live Rules-of-Hooks bug, fixed 2026-06-20).
      // We seed state and fall through with the defaults; the body reads state
      // only via the local `d` (bucket-or-defaults), so first paint matches the
      // next render.
      var THROWLAB_DEFAULTS = {
            pitchType: '4seam',
            speedMph: 92,
            releaseHeight: 1.95,
            aimDegV: -2.5,
            aimDegH: 0,
            spinRpm: 2300,
            spinAxisDeg: 0,
            throwerHand: 'right',
            showPhysics: false,
            scaffoldTier: 1, // 1 = Rookie (speed only), 2 = Pro (+angle), 3 = All-Star (+spin), 4 = Hall of Fame (full physics + formulas)
            lastResult: null,
            replayActive: false,
            replayT: 0,
            throwCount: 0,
            modeThrowCounts: {},
            strikeCount: 0,
            pitchTypesUsed: {},
            // Mode + per-mode extras
            mode: 'pitching',          // 'pitching' | 'freethrow' | 'freekick'
            shotType: 'freethrow',
            shotMakeCount: 0,          // free-throw scoring
            kickType: 'curling',
            goalCount: 0,              // free-kick scoring
            goalType: 'midrange',
            fgDistanceYd: 35,          // active field-goal distance
            fgMakeCount: 0,            // field-goal scoring
            // Compare Mode — pinned reference trajectory drawn behind the
            // current one so students can change ONE variable and see the
            // effect against a held-constant baseline.
            referenceResult: null,
            referenceLabel: '',        // "92 mph 4-Seam" etc.
            referenceList: [],
            // "Call your shot" turns each launch into a prediction/evidence
            // cycle. The selection is copied into the immutable trial snapshot
            // and then cleared so every new rep asks for fresh reasoning.
            predictionKey: null,
            predictionStats: { attempts: 0, matches: 0 },
            // Wind — defaults to calm. Outdoor modes (freekick, fieldgoal)
            // show the controls in the UI; indoor modes hide them. 0° =
            // headwind (against the throw), 90° = crosswind right, 180° =
            // tailwind, 270° = crosswind left.
            windMph: 0,
            windDirDeg: 0,
            // Gravity preset — defaults to Earth. Mars / Moon / Jupiter for
            // the "what if I pitched on another planet?" lesson.
            gravityId: 'earth',
            // Math view — opt-in toggle that appends a "Math behind the
            // throw" panel with the actual physics formulas + current
            // values. Default off so younger students don't see equations
            // they haven't been taught yet.
            showFormulas: false,
            // Coach Mode — Gemini-powered conversational feedback that
            // looks at recent history (not just the last throw) and
            // accommodates the student's scaffold tier.
            coachLoading: false,
            coachReply: '',
            coachError: '',
            recentThrows: [],          // last ~5 throws for history-aware coaching
            // Drills — pre-defined challenge sequences per mode. drillActive
            // toggles the goal panel above the canvas; drillTaskIdx tracks
            // progression through DRILLS[mode].tasks; drillStats accumulates
            // session counters that the task test functions read from.
            drillActive: false,
            drillTaskIdx: 0,
            drillStats: {
              streakStrikes: 0, strikeTypes: {}, strikeWithLowSpin: false,
              makeCount: 0, swishHeights: 0, swishHeightSet: {}, completedBouncePass: false,
              goalKickTypes: {}, totalGoals: 0,
              fgMadeByDist: {}
            }
          };
      if (!labToolData || !labToolData.throwlab) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { throwlab: THROWLAB_DEFAULTS });
        });
      }
      var storedThrowLab = labToolData && labToolData.throwlab;
      // Merge new defaults at read time so saved sessions from earlier
      // versions gain prediction, replay, and per-mode fields without a
      // destructive migration or an undefined-value render crash.
      // A saved session is INPUT: it can be copied between devices, hand-edited,
      // or carried across tool versions. The merge below already protects
      // against MISSING fields; these helpers protect against wrong-TYPED ones.
      // aimDegV and releaseHeight are read at 16 sites, several calling
      // .toFixed() straight on the value, so the only maintainable place to fix
      // them is here, where saved state enters.
      function _tlNum(v, min, max, fallback) {
        return (typeof v === 'number' && isFinite(v)) ? Math.min(max, Math.max(min, v)) : fallback;
      }
      function _tlCount(v) {
        return (typeof v === 'number' && isFinite(v) && v >= 0) ? Math.floor(v) : 0;
      }
      var d = storedThrowLab
        ? Object.assign({}, THROWLAB_DEFAULTS, storedThrowLab, {
            drillStats: Object.assign({}, THROWLAB_DEFAULTS.drillStats, storedThrowLab.drillStats || {}),
            predictionStats: Object.assign({}, THROWLAB_DEFAULTS.predictionStats, storedThrowLab.predictionStats || {}),
            // Widest per-mode ranges are releaseHeight [0.0, 3.2] and a vertical
            // aim well inside +/-90; the sliders enforce the per-mode range on
            // input, so these are the backstop for a malformed save.
            releaseHeight: _tlNum(storedThrowLab.releaseHeight, 0, 4, THROWLAB_DEFAULTS.releaseHeight),
            aimDegV: _tlNum(storedThrowLab.aimDegV, -90, 90, THROWLAB_DEFAULTS.aimDegV),
            customScenarios: Array.isArray(storedThrowLab.customScenarios) ? storedThrowLab.customScenarios : [],
            coachError: typeof storedThrowLab.coachError === 'string' ? storedThrowLab.coachError : '',
            // lastResult is read as .trial / .location; referenceList and
            // recentThrows are mapped and sliced; spinRpm and coachReply are
            // rendered straight into the tree, where an object makes React throw.
            // A bare {} passed the old object check and then threw on
            // lr.outcome.plateT / .trial. A partial result is not usable:
            // require the fields every consumer reads, or fall back to null,
            // which every call site already handles.
            lastResult: (storedThrowLab.lastResult && typeof storedThrowLab.lastResult === 'object' && !Array.isArray(storedThrowLab.lastResult)
              && storedThrowLab.lastResult.outcome && typeof storedThrowLab.lastResult.outcome === 'object'
              && typeof storedThrowLab.lastResult.location === 'string') ? storedThrowLab.lastResult : null,
            referenceList: Array.isArray(storedThrowLab.referenceList) ? storedThrowLab.referenceList : [],
            recentThrows: Array.isArray(storedThrowLab.recentThrows) ? storedThrowLab.recentThrows : [],
            spinRpm: _tlNum(storedThrowLab.spinRpm, 0, 10000, THROWLAB_DEFAULTS.spinRpm),
            coachReply: typeof storedThrowLab.coachReply === 'string' ? storedThrowLab.coachReply : ''
          })
        : THROWLAB_DEFAULTS;
      // Every *Count key is a per-sport tally rendered directly into the tree,
      // where an object makes React throw. There are at least nine of them and
      // two (wicketCount, golfGreenCount) are read without being declared in
      // THROWLAB_DEFAULTS, so normalise by SHAPE rather than by a hand list
      // that goes stale the next time a sport is added.
      if (storedThrowLab) {
        Object.keys(d).forEach(function(k) {
          if (/Count$/.test(k) && typeof d[k] !== 'number') d[k] = _tlCount(d[k]);
        });
      }
      var upd = function(key, val) {
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab); next[key] = val;
          return Object.assign({}, prev, { throwlab: next });
        });
      };

      // ── Pitch Locker: cross-session mastery of pitch types thrown for strikes ──
      // The StemLab host's localStorage block does not include throwlab, so the
      // tool resets every reload by default. Layer our own:
      //   - Hydrate `pitchLocker` from window slot → localStorage on mount
      //   - Mirror back on every change for executeSaveFile pickup
      //   - Hot-reload on `alloflow-throwlab-restored` event
      var React = ctx.React;
      var _tlHydrated = React.useRef(false);
      if (!_tlHydrated.current) {
        _tlHydrated.current = true;
        try {
          var winSt = (typeof window !== 'undefined' && window.__alloflowThrowLab) || null;
          var lsSt = null;
          try { lsSt = JSON.parse(localStorage.getItem('throwlab.state.v1') || 'null'); } catch (e) {}
          var seed = winSt || lsSt || null;
          if (seed && typeof seed === 'object' && seed.pitchLocker && !d.pitchLocker) {
            setLabToolData(function (prev) {
              return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, { pitchLocker: seed.pitchLocker }) });
            });
          }
        } catch (e) {}
      }

      // First-strike celebration state — fires when a pitch type is thrown for
      // a strike for the first time. Mirrors the BirdLab lifer / OpticsLab
      // first-correct pattern. Auto-clears after 3.5s.
      var _tlCeleb = React.useState(null);
      var tlCeleb = _tlCeleb[0];
      var setTlCeleb = _tlCeleb[1];

      // Keep delayed celebrations and announcements inside the component
      // lifecycle. This prevents stale callbacks from updating a Throw Lab
      // that has already been closed or switched away.
      var _tlMounted = React.useRef(true);
      var _tlTimers = React.useRef([]);
      var _tlRevealQueue = React.useRef([]);
      var _tlSkipAt = React.useRef(0);
      React.useEffect(function() {
        _tlMounted.current = true;
        return function() {
          _tlMounted.current = false;
          _tlTimers.current.forEach(function(timerId) { clearTimeout(timerId); });
          _tlTimers.current = [];
        };
      }, []);
      // revealExtra marks a timer that waits for the ball to arrive: it is "extra" milliseconds
      // after the reveal. Those timers can be brought forward when the student skips the replay.
      function scheduleTl(callback, delay, revealExtra) {
        var entry = null;
        var timerId = setTimeout(function() {
          _tlTimers.current = _tlTimers.current.filter(function(id) { return id !== timerId; });
          if (entry) _tlRevealQueue.current = _tlRevealQueue.current.filter(function(item) { return item !== entry; });
          if (_tlMounted.current) callback();
        }, delay);
        _tlTimers.current.push(timerId);
        if (typeof revealExtra === 'number') {
          entry = { id: timerId, fn: callback, extra: revealExtra };
          _tlRevealQueue.current.push(entry);
        }
        return timerId;
      }
      // Skipping the replay IS the reveal: the sounds, toasts and XP that were waiting run now,
      // in the same order and with the same gaps between them.
      function flushRevealQueue() {
        var waiting = _tlRevealQueue.current;
        _tlRevealQueue.current = [];
        waiting.forEach(function(entry) {
          clearTimeout(entry.id);
          _tlTimers.current = _tlTimers.current.filter(function(id) { return id !== entry.id; });
          scheduleTl(entry.fn, Math.max(0, entry.extra));
        });
      }

      // Mirror to window slot + localStorage.
      React.useEffect(function () {
        try {
          var snapshot = { pitchLocker: d.pitchLocker || {}, _ts: Date.now() };
          window.__alloflowThrowLab = snapshot;
          try { localStorage.setItem('throwlab.state.v1', JSON.stringify(snapshot)); }
          catch (e) { console.warn('[ThrowLab] localStorage save failed (quota or permission); session state will not persist on refresh:', e.message || e); }
        } catch (e) { console.warn('[ThrowLab] snapshot failed:', e.message || e); }
      }, [d.pitchLocker]);

      // Hot-reload listener.
      React.useEffect(function () {
        function onRestore() {
          try {
            var w = window.__alloflowThrowLab || {};
            if (w.pitchLocker) {
              setLabToolData(function (prev) {
                return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, { pitchLocker: w.pitchLocker }) });
              });
            }
          } catch (e) {}
        }
        window.addEventListener('alloflow-throwlab-restored', onRestore);
        return function () { window.removeEventListener('alloflow-throwlab-restored', onRestore); };
      }, []);

      // ── Helpers ─────────────────────────────────────────
      function applyPitchPreset(pid) {
        var pt = PITCH_TYPES.find(function(p) { return p.id === pid; });
        if (!pt) return;
        setLabToolData(function(prev) {
          var patch = {
            pitchType: pid,
            speedMph: pt.speedMph,
            spinRpm: pt.spinRpm,
            spinAxisDeg: pt.spinAxisDeg,
            aimDegH: pt.aimDegH || 0
          };
          // Apr 30 2026: pitches now carry per-pitch aimDegV + releaseHeight too,
          // so picking a preset sets those sliders the same way other modes do.
          if (pt.aimDegV != null) patch.aimDegV = pt.aimDegV;
          if (pt.releaseHeight != null) patch.releaseHeight = pt.releaseHeight;
          var next = Object.assign({}, prev.throwlab, patch);
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected pitch: ' + pt.label + '. Speed ' + pt.speedMph + ' mph, ' + pt.spinRpm + ' rpm.');
      }

      function applyShotPreset(sid) {
        var st = SHOT_TYPES.find(function(s) { return s.id === sid; });
        if (!st) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            shotType: sid,
            speedMph: st.speedMph,
            spinRpm: st.spinRpm,
            spinAxisDeg: st.spinAxisDeg,
            aimDegV: st.aimDegV,
            aimDegH: st.aimDegH || 0,
            releaseHeight: st.releaseHeight
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected shot: ' + st.label + '. Release angle ' + st.aimDegV + ' degrees, height ' + st.releaseHeight + ' meters.');
      }

      function applyKickPreset(kid) {
        var kt = KICK_TYPES.find(function(k) { return k.id === kid; });
        if (!kt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            kickType: kid,
            speedMph: kt.speedMph,
            spinRpm: kt.spinRpm,
            spinAxisDeg: kt.spinAxisDeg,
            aimDegV: kt.aimDegV,
            aimDegH: kt.aimDegH || 0,
            releaseHeight: kt.releaseHeight
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected kick: ' + kt.label + '. Speed ' + kt.speedMph + ' mph, spin axis ' + kt.spinAxisDeg + ' degrees.');
      }

      function applyBowlPreset(bid) {
        var bt = CRICKET_DELIVERIES.find(function(b) { return b.id === bid; });
        if (!bt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            bowlType: bid,
            speedMph: bt.speedMph,
            spinRpm: bt.spinRpm,
            spinAxisDeg: bt.spinAxisDeg,
            aimDegV: bt.aimDegV,
            aimDegH: bt.aimDegH || 0,
            releaseHeight: bt.releaseHeight
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected delivery: ' + bt.label + '. Speed ' + bt.speedMph + ' mph, spin axis ' + bt.spinAxisDeg + ' degrees.');
      }

      function applyGolfPreset(gid) {
        var gt = GOLF_TYPES.find(function(g) { return g.id === gid; });
        if (!gt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            golfClub: gid,
            speedMph: gt.speedMph,
            spinRpm: gt.spinRpm,
            spinAxisDeg: gt.spinAxisDeg,
            aimDegV: gt.aimDegV,
            aimDegH: gt.aimDegH || 0,
            releaseHeight: gt.releaseHeight
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected club: ' + gt.label + '. Carry ' + gt.carryYd + ' yards, ' + gt.aimDegV + ' degree launch.');
      }

      // ── Custom scenarios ──
      // Save the current setup (mode + preset + gravity + wind) as a
      // personalized scenario. Persisted in toolData.customScenarios.
      // Capped at 12 entries (FIFO) so the toolData blob doesn't grow
      // unbounded across sessions. Each custom scenario carries the
      // same parameter shape as the built-in SCENARIOS, plus a
      // `custom: true` flag so the UI can mark + offer delete.
      var MAX_CUSTOM_SCENARIOS = 12;

      // AlloFlowUX.prompt can fall back to window.prompt during startup.
      // Require the real accessible module and return an explicit outcome so
      // callers do not mistake startup/error failure for user cancellation.
      async function requestThrowLabText(message, defaultValue, options, unavailableMessage, failedMessage) {
        var dialogModule = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.PromptDialog && window.AlloModules.PromptDialog.PromptDialog;
        var promptApi = typeof window !== 'undefined' && window.AlloFlowUX && window.AlloFlowUX.prompt;
        if (typeof dialogModule !== 'function' || typeof promptApi !== 'function') {
          if (addToast) addToast(unavailableMessage, 'warning');
          tlAnnounce(unavailableMessage);
          return { status: 'unavailable', value: null };
        }
        try {
          var value = await promptApi(message, defaultValue, options || {});
          return { status: value === null ? 'cancelled' : 'submitted', value: value };
        } catch (err) {
          if (addToast) addToast(failedMessage, 'warning');
          tlAnnounce(failedMessage);
          return { status: 'failed', value: null };
        }
      }

      async function saveCustomScenario() {
        var defaultName;
        var modeLbl = (MODES[d.mode] || {}).label || d.mode;
        var presetId = d.mode === 'pitching' ? d.pitchType
                     : d.mode === 'freethrow' ? d.shotType
                     : d.mode === 'freekick' ? d.kickType
                     : d.mode === 'fieldgoal' ? d.goalType
                     : d.mode === 'bowling' ? d.bowlType
                     : d.mode === 'golf' ? d.golfClub
                     : d.serveType;
        var presetList = d.mode === 'pitching' ? PITCH_TYPES
                       : d.mode === 'freethrow' ? SHOT_TYPES
                       : d.mode === 'freekick' ? KICK_TYPES
                       : d.mode === 'fieldgoal' ? GOAL_TYPES
                       : d.mode === 'bowling' ? CRICKET_DELIVERIES
                       : d.mode === 'golf' ? GOLF_TYPES
                       : VOLLEYBALL_TYPES;
        var preset = presetList.find(function(p) { return p.id === presetId; });
        var gravLbl = (GRAVITY_PRESETS.find(function(g) { return g.id === (d.gravityId || 'earth'); }) || {}).label || 'Earth';
        defaultName = (preset ? preset.label : modeLbl) + ' on ' + gravLbl
                    + (d.windMph ? ' + ' + d.windMph + ' mph wind' : '');
        var promptResult = await requestThrowLabText(
          __alloT('stem.throwlab.name_scenario_message', 'Name this scenario.'),
          defaultName,
          {
            title: __alloT('stem.throwlab.save_scenario_title', 'Save custom scenario'),
            placeholder: __alloT('stem.throwlab.scenario_name_placeholder', 'Scenario name'),
            confirmText: __alloT('stem.throwlab.save_scenario_confirm', 'Save scenario'),
            cancelText: __alloT('common.cancel', 'Cancel'),
            maxLength: 60
          },
          __alloT('stem.throwlab.scenario_dialog_unavailable', 'The scenario-name dialog is unavailable, so this scenario was not saved.'),
          __alloT('stem.throwlab.scenario_dialog_failed', 'The scenario-name dialog could not open, so this scenario was not saved.')
        );
        if (promptResult.status === 'cancelled') {
          tlAnnounce(__alloT('stem.throwlab.scenario_save_cancelled', 'Scenario save cancelled.'));
          return;
        }
        if (promptResult.status !== 'submitted') return;
        var name = String(promptResult.value).trim().slice(0, 60);
        if (!name) {
          tlAnnounce(__alloT('stem.throwlab.scenario_name_required', 'Enter a name before saving this scenario.'));
          return;
        }
        var newScenario = {
          id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          label: name,
          icon: '⭐',
          mode: d.mode,
          presetId: presetId,
          gravityId: d.gravityId || 'earth',
          windMph: d.windMph || 0,
          windDirDeg: d.windDirDeg || 0,
          aimDegV: d.aimDegV,
          aimDegH: d.aimDegH || 0,
          releaseHeight: d.releaseHeight,
          // v 2: the whole setup is saved, so a later retune of a preset cannot change it.
          v: 2, speedMph: d.speedMph, spinRpm: d.spinRpm, spinAxisDeg: d.spinAxisDeg,
          fgDistanceYd: d.mode === 'fieldgoal' ? d.fgDistanceYd : undefined, flutterSeed: d.flutterSeed || 1,
          custom: true,
          createdAt: Date.now(),
          teach: 'Custom scenario you saved on ' + new Date().toLocaleDateString() + '. Adjust any parameter and re-throw to compare against the saved baseline.'
        };
        setLabToolData(function(prev) {
          var existing = (prev.throwlab.customScenarios || []).slice();
          existing.push(newScenario);
          while (existing.length > MAX_CUSTOM_SCENARIOS) existing.shift(); // FIFO eviction
          var next = Object.assign({}, prev.throwlab, { customScenarios: existing });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Saved custom scenario: ' + name);
        if (addToast) addToast('⭐ Saved: ' + name);
      }

      function deleteCustomScenario(scenarioId) {
        setLabToolData(function(prev) {
          var existing = (prev.throwlab.customScenarios || []).filter(function(s) { return s.id !== scenarioId; });
          var next = Object.assign({}, prev.throwlab, { customScenarios: existing });
          // If the active scenario was the one deleted, clear the briefing
          if (prev.throwlab.activeScenarioId === scenarioId) {
            next.activeScenarioId = null;
          }
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce(__alloT('stem.throwlab.sr_custom_scenario_removed', 'Custom scenario removed.'));
      }

      // ── Trading Card export (engagement layer) ──
      // Generate a Topps-style baseball card from the student\'s latest
      // throw + their stats + earned badges. Prompts for a player name
      // on first use; cached in toolData so subsequent exports just go.
      // Alternative to the academic activity-sheet PDF — a printable
      // shareable artifact a kid would actually pin to their wall.
      async function exportTradingCard() {
        if (!d.lastResult) {
          tlAnnounce(__alloT('stem.throwlab.sr_throw_something_first_then_export_a_trading_card', 'Throw something first, then export a trading card.'));
          if (addToast) addToast('Throw first — card needs a result');
          return;
        }
        var name = d.playerName;
        if (!name) {
          var playerPromptResult = await requestThrowLabText(
            __alloT('stem.throwlab.player_name_message', 'What is your player name? It will be saved for next time.'),
            __alloT('stem.throwlab.default_player_name', 'Lab Athlete'),
            {
              title: __alloT('stem.throwlab.player_name_title', 'Name your trading card'),
              placeholder: __alloT('stem.throwlab.player_name_placeholder', 'Player name'),
              confirmText: __alloT('stem.throwlab.create_card_confirm', 'Create card'),
              cancelText: __alloT('common.cancel', 'Cancel'),
              maxLength: 30
            },
            __alloT('stem.throwlab.player_dialog_unavailable', 'The player-name dialog is unavailable, so the trading card was not created.'),
            __alloT('stem.throwlab.player_dialog_failed', 'The player-name dialog could not open, so the trading card was not created.')
          );
          if (playerPromptResult.status === 'cancelled') {
            tlAnnounce(__alloT('stem.throwlab.card_export_cancelled', 'Trading card export cancelled.'));
            return;
          }
          if (playerPromptResult.status !== 'submitted') return;
          name = String(playerPromptResult.value).trim().slice(0, 30);
          if (!name) {
            tlAnnounce(__alloT('stem.throwlab.player_name_required', 'Enter a player name before creating the trading card.'));
            return;
          }
          // Persist for future exports
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, { playerName: name })});
          });
        }
        var lr = d.lastResult;
        var trial = lr.trial || buildTrialSnapshot(d, lr.location);
        var stats = d.drillStats || {};
        var modeLbl = (MODES[trial.mode] || {}).label || trial.mode;
        var modeIcon = (MODES[trial.mode] || {}).icon || '🏆';
        var presetLbl = trial.presetLabel || trial.shotKind || 'throw';
        // Build a tiny inline SVG trajectory of the last throw
        var allSamples = lr.samples || [];
        var cardStep = Math.max(1, Math.ceil(allSamples.length / 60));
        var samples = allSamples.filter(function(s, i) { return i % cardStep === 0 || i === allSamples.length - 1; });
        var maxZ = Math.max.apply(null, samples.map(function(s) { return s.z; })) || 1;
        var maxY = Math.max(2, Math.max.apply(null, samples.map(function(s) { return s.y; })) || 1);
        var pts = samples.map(function(s) {
          var px = (s.z / maxZ) * 280;
          var py = 120 - (s.y / maxY) * 110;
          return px.toFixed(1) + ',' + py.toFixed(1);
        }).join(' ');
        // Compose stat line per sport
        var statLine;
        if (isPitching) statLine = 'Strikes: ' + (d.strikeCount || 0) + ' · Streak: ' + (stats.streakStrikes || 0) + ' · Pitch types used: ' + Object.keys(stats.strikeTypes || {}).length;
        else if (isFreeThrow) statLine = 'Makes: ' + (d.shotMakeCount || 0) + ' · Hot streak: ' + (stats.hotStreak || 0) + ' · Different swish heights: ' + (stats.swishHeights || 0);
        else if (isFreeKick) statLine = 'Goals: ' + (d.goalCount || 0) + ' · Kick types scored: ' + Object.keys(stats.goalKickTypes || {}).length;
        else if (isFieldGoal) statLine = 'FGs made: ' + (d.fgMakeCount || 0) + ' · Distances cleared: ' + Object.keys(stats.fgMadeByDist || {}).length;
        else if (isBowling) statLine = 'Wickets: ' + (d.wicketCount || 0) + ' · Delivery types used: ' + Object.keys(stats.bowlTypes || {}).length;
        else if (isGolf) statLine = 'Greens hit: ' + (d.golfGreenCount || 0) + ' · Fairways hit: ' + (stats.golfFairwaysHit || 0);
        else if (isVolleyball) statLine = 'Aces: ' + (d.volleyAceCount || 0) + ' · In-court serves: ' + (stats.volleyInCount || 0);
        else statLine = 'Throws: ' + (d.throwCount || 0);
        // Earned badges (top 5)
        var earnedBadges = BADGES.filter(function(b) { return d.badgesEarned && d.badgesEarned[b.id]; }).slice(0, 5);
        var badgesHtml = earnedBadges.length
          ? earnedBadges.map(function(b) { return '<span class="badge">' + escapeHtml(b.emoji) + ' ' + escapeHtml(b.label) + '</span>'; }).join('')
          : '<span class="badge-empty">No badges yet — keep throwing!</span>';
        var cardHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
          + '<title>ThrowLab Trading Card — ' + escapeHtml(name) + '</title>'
          + '<style>'
          + '*{box-sizing:border-box} body{margin:30px;font-family:Georgia,serif;background:#0f172a;color:#f8fafc;display:flex;justify-content:center}'
          + '.card{width:380px;border:8px solid #fbbf24;border-radius:18px;background:linear-gradient(135deg,#fef3c7,#fde68a);color:#1a1a1a;padding:0;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.3)}'
          + '.banner{background:linear-gradient(135deg,#1e293b,#334155);color:#fbbf24;padding:14px 20px;text-align:center}'
          + '.banner .icon{font-size:32px;display:block;margin-bottom:4px}'
          + '.banner .name{font-size:24px;font-weight:bold;margin:0;letter-spacing:1px}'
          + '.banner .sport{font-size:11px;color:#cbd5e1;text-transform:uppercase;letter-spacing:2px;margin-top:4px}'
          + '.body{padding:18px}'
          + '.preset{background:#1e293b;color:#fbbf24;padding:6px 12px;border-radius:6px;display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}'
          + '.svg-frame{background:#0f172a;border-radius:8px;padding:8px;margin-bottom:10px}'
          + '.svg-frame svg{display:block}'
          + '.params{font-family:ui-monospace,monospace;font-size:11px;color:#475569;margin-bottom:8px}'
          + '.stat-line{font-size:12px;color:#1a1a1a;font-weight:bold;margin-bottom:10px;padding:8px;background:rgba(30,41,59,0.05);border-radius:6px;border-left:3px solid #fbbf24}'
          + '.badges{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}'
          + '.badge{background:#1e293b;color:#fbbf24;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:bold}'
          + '.badge-empty{color:#475569;font-style:italic;font-size:10px}'
          + '.footer{text-align:center;font-size:9px;color:#666;border-top:1px dashed #94a3b8;padding-top:6px;margin-top:8px}'
          + '@media print{body{background:white;margin:0}.card{box-shadow:none}}'
          + '</style></head><body>'
          + '<div class="card">'
          + '  <div class="banner">'
          + '    <span class="icon">' + escapeHtml(modeIcon) + '</span>'
          + '    <div class="name">' + escapeHtml(name) + '</div>'
          + '    <div class="sport">' + escapeHtml(modeLbl) + '</div>'
          + '  </div>'
          + '  <div class="body">'
          + '    <div class="preset">' + escapeHtml(presetLbl) + ' — ' + escapeHtml(String(lr.location || 'result').toUpperCase()) + '</div>'
          + '    <div class="svg-frame"><svg width="100%" height="120" viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg">'
          + '      <line x1="0" y1="120" x2="280" y2="120" stroke="#475569" stroke-width="1"/>'
          + '      <polyline points="' + escapeHtml(pts) + '" fill="none" stroke="#fbbf24" stroke-width="2.5"/>'
          + '    </svg></div>'
          + '    <div class="params">' + trial.speedMph + ' mph · ' + trial.spinRpm + ' rpm @ ' + trial.spinAxisDeg + '° axis · launch ' + trial.angleV.toFixed(1) + '°</div>'
          + (lr.whereText ? '    <div class="params">' + escapeHtml(lr.whereText) + '</div>' : '')
          + '    <div class="stat-line">' + escapeHtml(statLine) + '</div>'
          + '    <div class="badges">' + badgesHtml + '</div>'
          + '    <div class="footer">ThrowLab — Sports Physics Lab · AlloFlow · ' + escapeHtml(new Date().toLocaleDateString()) + '</div>'
          + '  </div>'
          + '</div>'
          + '</body></html>';
        try {
          var win = window.open('', '_blank');
          if (win) {
            win.opener = null;
            win.document.write(cardHtml);
            win.document.close();
            setTimeout(function() { try { win.print(); } catch(e) {} }, 400);
          } else if (addToast) addToast('Pop-up blocked — allow pop-ups to print', 'error');
        } catch(e) {
          if (addToast) addToast('Card export failed', 'error');
        }
        tlAnnounce('Trading card exported for ' + name + '.');
        if (addToast) addToast('📇 Trading card!');
      }

      // Open a printable activity sheet listing every ThrowLab
      // scenario with its teach + 3 discussion questions, formatted
      // for in-class handout. Triggers window.print() so the teacher
      // can print or save as PDF.
      function printThrowLabActivitySheet() {
        if (!SCENARIOS.length) return;
        var dateStr = new Date().toLocaleDateString();
        var sheetHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
          + '<title>ThrowLab Activity Sheet</title>'
          + '<style>'
          + 'body{font-family:Georgia,serif;max-width:780px;margin:30px auto;padding:0 20px;color:#1a1a1a;line-height:1.5}'
          + 'h1{font-size:22px;border-bottom:3px solid #1a1a1a;padding-bottom:6px;margin-bottom:6px}'
          + '.meta{color:#666;font-size:11px;margin-bottom:24px}'
          + '.scenario{margin-bottom:32px;page-break-inside:avoid;border:1px solid #cbd5e1;border-radius:6px;padding:14px}'
          + '.scenario h2{font-size:16px;margin:0 0 4px 0}'
          + '.scenario .icon{margin-right:6px}'
          + '.scenario .setup{font-size:11px;color:#666;margin:2px 0 4px 0}'
          + '.scenario .teach{font-size:12px;color:#334155;margin:6px 0 10px 0;font-style:italic}'
          + '.scenario .qhead{font-weight:bold;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-top:10px}'
          + '.scenario ol{margin:6px 0 0 22px;padding:0;font-size:12px}'
          + '.scenario ol li{margin-bottom:4px}'
          + '.answer-line{border-bottom:1px solid #94a3b8;height:18px;margin:4px 0}'
          + 'footer{font-size:10px;color:#94a3b8;text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #cbd5e1}'
          + '@media print{.scenario{break-inside:avoid}}'
          + '</style></head><body>'
          + '<h1>ThrowLab Activity Sheet — Sports Physics</h1>'
          + '<div class="meta">Name: ____________________________________  Date: ' + escapeHtml(dateStr) + '</div>';
        SCENARIOS.forEach(function(sc) {
          var modeLbl = (MODES[sc.mode] || {}).label || sc.mode;
          var gravLbl = (GRAVITY_PRESETS.find(function(g) { return g.id === sc.gravityId; }) || {}).label || 'Earth';
          var setup = modeLbl + ' · gravity: ' + gravLbl
            + (sc.windMph ? ' · wind: ' + sc.windMph + ' mph @ ' + sc.windDirDeg + '°' : '');
          sheetHtml += '<div class="scenario">'
            + '<h2><span class="icon">' + escapeHtml(sc.icon) + '</span>' + escapeHtml(sc.label) + '</h2>'
            + '<div class="setup">Setup: ' + escapeHtml(setup) + '</div>'
            + '<div class="teach">' + escapeHtml(sc.teach) + '</div>'
            + '<div class="qhead">Discussion Questions</div>'
            + '<ol>';
          (sc.questions || []).forEach(function(q) {
            sheetHtml += '<li>' + escapeHtml(q)
              + '<div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div>'
              + '</li>';
          });
          sheetHtml += '</ol></div>';
        });
        sheetHtml += '<footer>ThrowLab — STEAM Lab tool for sports physics · AlloFlow</footer>'
          + '</body></html>';
        try {
          var win = window.open('', '_blank');
          if (win) {
            win.opener = null;
            win.document.write(sheetHtml);
            win.document.close();
            setTimeout(function() { try { win.print(); } catch(e) {} }, 300);
          } else if (addToast) addToast('Pop-up blocked — allow pop-ups to print', 'error');
        } catch(e) {
          if (addToast) addToast('Print failed', 'error');
        }
        tlAnnounce('Activity sheet opened with ' + SCENARIOS.length + ' scenarios.');
      }

      // Quick-Play: pick a random scenario from built-ins + customs and
      // apply it. Targets the athletic kid who arrives and doesn\'t want
      // to read setup — one click and they\'re throwing something fun.
      function runRandomScenario() {
        var pool = SCENARIOS.concat(d.customScenarios || []);
        if (!pool.length) return;
        var pick = pool[Math.floor(Math.random() * pool.length)];
        applyScenario(pick.id);
      }

      function applyScenario(scenarioId) {
        var s = SCENARIOS.find(function(sc) { return sc.id === scenarioId; });
        if (!s) {
          // Fall back to custom scenarios
          s = (d.customScenarios || []).find(function(sc) { return sc.id === scenarioId; });
        }
        if (!s) return;
        var presetList = s.mode === 'pitching' ? PITCH_TYPES
                       : s.mode === 'freethrow' ? SHOT_TYPES
                       : s.mode === 'freekick' ? KICK_TYPES
                       : s.mode === 'fieldgoal' ? GOAL_TYPES
                       : s.mode === 'bowling' ? CRICKET_DELIVERIES
                       : s.mode === 'golf' ? GOLF_TYPES
                       : VOLLEYBALL_TYPES;
        var preset = presetList.find(function(p) { return p.id === s.presetId; });
        if (!preset) return;
        // A custom scenario saved before the 2026-11-23 physics update kept its own aim and
        // release height but takes speed and spin from the preset, and the presets have been
        // retuned since. If that mix now misses while the preset's own numbers work, load the
        // preset's numbers and say so, instead of handing the student a miss they did not build.
        var useSavedAim = true, staleNote = '';
        if (s.custom && !s.v) {
          var presetSetup = Object.assign({ mode: s.mode, throwerHand: d.throwerHand, gravityId: s.gravityId || 'earth' }, presetPatch(s.mode, s.presetId), { windMph: s.windMph || 0, windDirDeg: s.windDirDeg || 0 });
          var savedSetup = Object.assign({}, presetSetup);
          if (s.aimDegV != null) savedSetup.aimDegV = s.aimDegV;
          if (s.aimDegH != null) savedSetup.aimDegH = s.aimDegH;
          if (s.releaseHeight != null) savedSetup.releaseHeight = s.releaseHeight;
          if (!isMakeOutcome(evaluateThrow(savedSetup).location)) {
            if (isMakeOutcome(evaluateThrow(presetSetup).location)) {
              useSavedAim = false;
              staleNote = __alloT('stem.throwlab.stale_scenario_updated', 'This scenario was saved before the lab\'s physics was updated, and its old aim would now miss. Today\'s aim for this preset was loaded instead. Your wind and gravity were kept.');
            } else {
              staleNote = __alloT('stem.throwlab.stale_scenario_kept', 'This scenario was saved before the lab\'s physics was updated, so it may fly differently now.');
            }
          }
        }
        var presetIdField = s.mode === 'pitching' ? 'pitchType'
                          : s.mode === 'freethrow' ? 'shotType'
                          : s.mode === 'freekick' ? 'kickType'
                          : s.mode === 'fieldgoal' ? 'goalType'
                          : s.mode === 'bowling' ? 'bowlType'
                          : s.mode === 'golf' ? 'golfClub'
                          : 'serveType';
        setLabToolData(function(prev) {
          var nextThrowlab = Object.assign({}, prev.throwlab, {
            mode: s.mode,
            speedMph: (s.v === 2 && typeof s.speedMph === 'number') ? s.speedMph : preset.speedMph,
            spinRpm: (s.v === 2 && typeof s.spinRpm === 'number') ? s.spinRpm : preset.spinRpm,
            spinAxisDeg: (s.v === 2 && typeof s.spinAxisDeg === 'number') ? s.spinAxisDeg : preset.spinAxisDeg,
            aimDegV: (useSavedAim && s.aimDegV != null) ? s.aimDegV : preset.aimDegV,
            // Built-in scenarios carry no aim of their own: use the preset's. It used to be reset to 0,
            // so Mariano's Cutter loaded as a pitch that just missed the zone.
            aimDegH: (useSavedAim && s.aimDegH != null) ? s.aimDegH : (preset.aimDegH || 0),
            releaseHeight: (useSavedAim && s.releaseHeight != null) ? s.releaseHeight : preset.releaseHeight,
            flutterSeed: (s.v === 2 && s.flutterSeed) ? s.flutterSeed : 1,
            windMph: s.windMph || 0,
            windDirDeg: s.windDirDeg || 0,
            gravityId: s.gravityId || 'earth',
            lastResult: null, replayActive: false, replayT: 0,
            coachReply: '', coachError: '',
            activeScenarioId: scenarioId,
            referenceList: [], referenceResult: null, referenceLabel: ''
          });
          nextThrowlab[presetIdField] = s.presetId;
          if (s.mode === 'fieldgoal' && preset.distanceYd) nextThrowlab.fgDistanceYd = (s.v === 2 && s.fgDistanceYd) ? s.fgDistanceYd : preset.distanceYd;
          return Object.assign({}, prev, { throwlab: nextThrowlab });
        });
        tlAnnounce('Scenario loaded: ' + s.label + '. ' + s.teach + (((d.referenceList || []).length || d.referenceResult) ? ' Saved comparison trajectories were cleared for this new setup.' : ''));
        try {
          scenarioOpenerRef.current = document.activeElement;
        } catch (e) {}

        setScenarioIntro({
          id: s.id, label: s.label, icon: s.icon, mode: s.mode,
          teach: s.teach + (staleNote ? ' ' + staleNote : ''), questions: s.questions || []
        });
      }

      function applyVolleyPreset(vid) {
        var vt = VOLLEYBALL_TYPES.find(function(v) { return v.id === vid; });
        if (!vt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            serveType: vid,
            speedMph: vt.speedMph,
            spinRpm: vt.spinRpm,
            spinAxisDeg: vt.spinAxisDeg,
            aimDegV: vt.aimDegV,
            aimDegH: vt.aimDegH || 0,
            releaseHeight: vt.releaseHeight
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected serve: ' + vt.label + '. Speed ' + vt.speedMph + ' mph, ' + vt.spinRpm + ' rpm.');
      }

      // ── Compare Mode helpers ──
      // Pin the most recent trajectory as a "reference ghost" — drawn behind
      // the next throw in a faded color so students can change one parameter
      // and see its isolated effect.
      // Multi-ghost compare — students can save up to 4 reference
      // trajectories at distinct colors and overlay them all. The
      // existing single-reference fields (referenceResult / referenceLabel)
      // are kept for backwards compatibility — first-saved trajectory
      // also writes to those so older saved sessions still render.
      var REFERENCE_COLORS = [
        { color: '#d946ef', name: __alloT('stem.throwlab.fuchsia', 'Fuchsia') },  // ref #1 — original
        { color: '#22d3ee', name: __alloT('stem.throwlab.cyan', 'Cyan') },     // ref #2
        { color: '#a3e635', name: __alloT('stem.throwlab.lime', 'Lime') },     // ref #3
        { color: '#fb923c', name: __alloT('stem.throwlab.orange', 'Orange') }    // ref #4
      ];
      var MAX_REFERENCES = 4;

      function buildRefLabel(result) {
        var trial = result && result.trial ? result.trial : buildTrialSnapshot(d, result && result.location);
        var modeLabel = trial.presetLabel || trial.shotKind || 'throw';
        return trial.speedMph + ' mph · ' + modeLabel
             + (trial.mode === 'pitching' || trial.mode === 'freekick' || trial.mode === 'bowling' || trial.mode === 'volleyball' ? ' · ' + trial.spinRpm + ' rpm @ ' + trial.spinAxisDeg + '°' : '')
             + (trial.mode === 'freethrow' || trial.mode === 'fieldgoal' || trial.mode === 'golf' ? ' · ' + Number(trial.angleV).toFixed(1) + '°' : '');
      }

      function saveReference() {
        if (!d.lastResult) {
          tlAnnounce(__alloT('stem.throwlab.sr_throw_a_pitch_first_then_you_can_save_it_as_a_ref', 'Throw a pitch first, then you can save it as a reference.'));
          if (addToast) addToast('No throw to save yet');
          return;
        }
        var label = buildRefLabel(d.lastResult);
        setLabToolData(function(prev) {
          var existingList = prev.throwlab.referenceList || [];
          // Hydrate from legacy single-reference if list is empty + legacy is set
          if (!existingList.length && prev.throwlab.referenceResult) {
            existingList = [{ result: prev.throwlab.referenceResult, label: prev.throwlab.referenceLabel || 'reference', color: REFERENCE_COLORS[0].color }];
          }
          var nextList;
          if (existingList.length >= MAX_REFERENCES) {
            // Cap reached — replace the oldest (FIFO)
            nextList = existingList.slice(1).concat([{
              result: prev.throwlab.lastResult,
              mode: prev.throwlab.mode,
              label: label,
              color: REFERENCE_COLORS[(existingList.length) % REFERENCE_COLORS.length].color
            }]);
          } else {
            nextList = existingList.concat([{
              result: prev.throwlab.lastResult,
              mode: prev.throwlab.mode,
              label: label,
              color: REFERENCE_COLORS[existingList.length % REFERENCE_COLORS.length].color
            }]);
          }
          var next = Object.assign({}, prev.throwlab, {
            referenceList: nextList,
            // Keep legacy fields synced to the FIRST entry for back-compat
            referenceResult: nextList[0].result,
            referenceLabel: nextList[0].label
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Saved as reference: ' + label + '. Change one parameter and throw again to compare.');
        if (addToast) addToast('📌 Reference saved');
      }

      function clearReference() {
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            referenceList: [],
            referenceResult: null,
            referenceLabel: ''
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce(__alloT('stem.throwlab.sr_all_references_cleared', 'All references cleared.'));
      }

      function removeReferenceAt(idx) {
        setLabToolData(function(prev) {
          var list = (prev.throwlab.referenceList || []).slice();
          list.splice(idx, 1);
          var next = Object.assign({}, prev.throwlab, {
            referenceList: list,
            referenceResult: list.length ? list[0].result : null,
            referenceLabel: list.length ? list[0].label : ''
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce(__alloT('stem.throwlab.sr_reference_removed', 'Reference removed.'));
      }

      // ── Coach Mode (Gemini) ──
      // Sends the recent-throws history + last-throw context to Gemini for
      // conversational, history-aware feedback. Falls back gracefully if
      // callGemini isn't available (host harness without API access).
      function askCoach() {
        if (!d.lastResult) {
          tlAnnounce(__alloT('stem.throwlab.sr_throw_a_pitch_first_then_ask_the_coach_for_feedba', 'Throw a pitch first, then ask the coach for feedback.'));
          if (addToast) addToast('Throw something first');
          return;
        }
        if (typeof callGemini !== 'function') {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
              coachError: 'Coach is offline (AI not available in this build).'
            })});
          });
          tlAnnounce(__alloT('stem.throwlab.sr_coach_is_offline', 'Coach is offline.'));
          return;
        }
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
            coachLoading: true, coachReply: '', coachError: ''
          })});
        });
        var tier = d.scaffoldTier || 3;
        var tierHint = tier === 1
          ? 'a young or beginner student — only mention SPEED, not angles or spin'
          : tier === 2
          ? 'an upper-elementary student — speed and angle are fair game, but go easy on spin'
          : 'a high-school physics student — full equations, spin axis, drag, Magnus all fair game';
        var coachTrial = d.lastResult.trial || buildTrialSnapshot(d, d.lastResult.location);
        var coachPreset = findPresetForTrial(coachTrial);
        var modeLabel = (MODES[coachTrial.mode] || {}).label || coachTrial.mode;
        var lastSummary = JSON.stringify((d.recentThrows || []).slice(-5));
        var lastLoc = d.lastResult.location;
        // Per-sport physics anchor — reminds the coach about what's
        // distinctive about THIS sport so feedback uses the right
        // vocabulary and references the right geometry.
        var sportAnchor = coachTrial.mode === 'pitching'
          ? 'Strike zone is ~17 in wide × ~25 in tall at home plate (60 ft 6 in). Spin axis controls break: 0° = backspin lift (4-seam), 180° = topspin drop (curveball), 90° = sidespin (slider). Outcomes: strike / borderline / ball / wild.'
          : coachTrial.mode === 'freethrow'
          ? 'Rim center is 4.19 m from the free throw line at 3.05 m height (NBA); other shots are taken from their own distance. Backspin softens rim contact; higher arc is more forgiving but needs more speed. Pass variants (bounce/chest) target a teammate at 6 m. Outcomes: swish / made / rim / backboard / air / caught / wrongbounce.'
          : coachTrial.mode === 'freekick'
          ? 'Goal is 7.32 m wide × 2.44 m tall at 22 m. Defender wall at 9.15 m, ~1.7 m tall. Sidespin (axis ~90°) curls the ball laterally: about 600 rpm bends this 22 m kick about 2.8 m. A kick with almost no spin darts unpredictably. Outcomes: goal / post / over / wide / blocked / short.'
          : coachTrial.mode === 'fieldgoal'
          ? 'Crossbar at 3.05 m; uprights ±2.82 m. Each preset is a situation: 20 yd in calm air, 35 yd with an 18 mph crosswind, 50 yd into a 10 mph headwind, 60 yd with an 8 mph tailwind. The preset kicks only just clear the bar, so small changes matter. A spiral barely makes lift, so wind and drag are the story. Outcomes: good / doink / shortbar / wideclose / wide / short.'
          : coachTrial.mode === 'bowling'
          ? 'Stumps are 0.71 m tall × 0.23 m wide at 20.12 m. The ball bounces once on the pitch (a good length is about 4-7 m in front of the stumps); the bounce takes pace off through friction, and side spin turns the ball off the pitch, the opposite way to its drift in the air. A full toss below the waist is legal. Outcomes: wicket / shaved / bouncer (chest high, Bouncer preset only) / dot / wide / overhead / beamer (full toss above the waist) / short (bounced twice).'
          : coachTrial.mode === 'golf'
          ? 'Target distance is preset-driven (~85-250 yd carry). Backspin generates Magnus lift = airtime; dimples trip airflow into a turbulent boundary layer that doubles range vs a smooth ball. Loft + clubhead speed determine carry. Outcomes: green / fairway / rough / woods / short / long / topped.'
          : coachTrial.mode === 'volleyball'
          ? 'Net at 9 m midcourt, height 2.43 m (men). Receiving court is 9 m wide × 9 m deep beyond the net. Topspin drops the ball past the net (jump serve); no-spin "float" wobbles unpredictably from drag asymmetry. Outcomes: ace (deep corner) / in / net / out / long / short.'
          : '';
        var presetTeach = (coachPreset && coachPreset.teach) ? coachPreset.teach : '';
        // Coach personality — prepended so the same physics anchors come
        // through in different voices (Analyst / Old School / Hype Man / Zen)
        var personaId = d.coachPersona || 'analyst';
        var persona = COACH_PERSONAS.find(function(p) { return p.id === personaId; }) || COACH_PERSONAS[0];
        var prompt = (persona.prepend ? persona.prepend + ' ' : '')
          + 'You are coaching a student in a sports physics simulator (ThrowLab). '
          + 'The student is in ' + modeLabel + ' mode. They are ' + tierHint + '. '
          + (sportAnchor ? 'Sport context: ' + sportAnchor + ' ' : '')
          + (presetTeach ? 'Active preset (' + (coachTrial.presetLabel || coachTrial.shotKind || '') + '): ' + presetTeach + ' ' : '')
          + 'Their last throw outcome: ' + lastLoc + '. '
          + (d.lastResult.whereText ? 'What the simulator measured (use these numbers and do not invent others): ' + d.lastResult.whereText + ' ' : '')
          + 'Last 5 throws history (JSON): ' + lastSummary + '. '
          + 'Launched parameters: speed ' + coachTrial.speedMph + ' mph, vertical aim ' + (coachTrial.angleV || 0).toFixed(1) + '°, '
          + 'horizontal aim ' + (coachTrial.angleH || 0).toFixed(1) + '°, spin ' + coachTrial.spinRpm + ' rpm at axis ' + coachTrial.spinAxisDeg + '°, '
          + 'gravity ' + coachTrial.gravityId + ', wind ' + (coachTrial.windMph || 0) + ' mph @ ' + (coachTrial.windDirDeg || 0) + '°. '
          + 'Give 2-3 sentences of warm, specific coaching: (1) acknowledge what just happened using the sport\'s actual vocabulary (wicket / ace / doink / etc.), (2) suggest ONE concrete change tied to the sport\'s SPECIFIC geometry above, '
          + '(3) tie it to the underlying physics in a way the student can use next throw. '
          + 'Plain prose, no markdown, no bullets, no headings.';
        callGemini(prompt, false, false, 0.7).then(function(resp) {
          var reply = String(resp || '').trim();
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
              coachLoading: false, coachReply: reply, coachError: ''
            })});
          });
          tlAnnounce('Coach: ' + reply);
        }).catch(function() {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
              coachLoading: false, coachError: 'Could not reach the coach. Try again in a moment.'
            })});
          });
        });
      }

      function applyGoalPreset(gid) {
        var gt = GOAL_TYPES.find(function(g) { return g.id === gid; });
        if (!gt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            goalType: gid,
            fgDistanceYd: gt.distanceYd,
            speedMph: gt.speedMph,
            spinRpm: gt.spinRpm,
            spinAxisDeg: gt.spinAxisDeg,
            aimDegV: gt.aimDegV,
            aimDegH: gt.aimDegH || 0,
            releaseHeight: gt.releaseHeight,
            windMph: gt.windMph || 0,
            windDirDeg: gt.windDirDeg || 0,
            lastResult: null            // distance change → invalidate previous result
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected field goal: ' + gt.label + '. Distance ' + gt.distanceYd + ' yards, launch angle ' + gt.aimDegV + ' degrees' + (gt.windMph ? ', wind ' + gt.windMph + ' miles per hour' : ', calm air') + '.');
      }

      function switchMode(newMode) {
        var modeMeta = MODES[newMode];
        // Clicking the selected tab is a no-op. Reapplying mode defaults here
        // would otherwise erase the current result and saved comparisons.
        if (!modeMeta || newMode === d.mode) return;
        setLabToolData(function(prev) {
          var defaults = presetPatch(newMode, modeMeta.defaultPreset);
          var next = Object.assign({}, prev.throwlab, { windMph: 0, windDirDeg: 0 }, defaults, {
            mode: newMode, lastResult: null, replayActive: false, replayT: 0,
            referenceList: [], referenceResult: null, referenceLabel: '', predictionKey: null
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Switched to ' + modeMeta.label + ' mode.' + (((d.referenceList || []).length || d.referenceResult) ? ' Saved comparison trajectories were cleared because sport scales are not compatible.' : ''));
      }

      // Plain-language trajectory shape for screen-reader narration.
      // WCAG 1.1.1 Non-text Content: the canvas trajectory has no SR
      // equivalent without this — describes apex height + distance + duration
      // so a blind student gets the same shape information a sighted student
      // sees in the line. ~1 sentence, appended to outcome-specific text.
      function describeShape(rs) {
        if (!rs || !rs.samples || rs.samples.length < 2) return '';
        var apex = Math.max.apply(null, rs.samples.map(function(s) { return s.y; }));
        var maxZ = Math.max.apply(null, rs.samples.map(function(s) { return s.z; }));
        var hangT = rs.samples[rs.samples.length - 1].t || 0;
        return ' Trajectory peaked at ' + apex.toFixed(1) + ' meters, traveled ' + maxZ.toFixed(1) + ' meters forward over ' + hangT.toFixed(2) + ' seconds.';
      }

      function trialShotKind(data) {
        return data.mode === 'pitching' ? data.pitchType
          : data.mode === 'freekick' ? data.kickType
          : data.mode === 'fieldgoal' ? data.goalType
          : data.mode === 'bowling' ? data.bowlType
          : data.mode === 'golf' ? data.golfClub
          : data.mode === 'volleyball' ? data.serveType
          : data.shotType;
      }

      function findPresetForTrial(trial) {
        if (!trial) return null;
        var list = trial.mode === 'pitching' ? PITCH_TYPES
          : trial.mode === 'freethrow' ? SHOT_TYPES
          : trial.mode === 'freekick' ? KICK_TYPES
          : trial.mode === 'fieldgoal' ? GOAL_TYPES
          : trial.mode === 'bowling' ? CRICKET_DELIVERIES
          : trial.mode === 'golf' ? GOLF_TYPES
          : trial.mode === 'volleyball' ? VOLLEYBALL_TYPES : [];
        return list.find(function(preset) { return preset.id === trial.shotKind; }) || null;
      }

      function buildTrialSnapshot(data, location) {
        var shotKind = trialShotKind(data);
        var preset = findPresetForTrial({ mode: data.mode, shotKind: shotKind });
        var predictionOption = getPredictionOptions(data.mode, shotKind).find(function(option) {
          return option.key === data.predictionKey;
        });
        return {
          mode: data.mode, shotKind: shotKind,
          presetLabel: preset ? preset.label : shotKind,
          speedMph: data.speedMph, releaseHeight: data.releaseHeight,
          angleV: data.aimDegV, angleH: data.aimDegH,
          spinRpm: data.spinRpm, spinAxisDeg: data.spinAxisDeg,
          throwerHand: data.throwerHand,
          flutterSeed: data.flutterSeed || 1,
          gravityId: data.gravityId, windMph: data.windMph, windDirDeg: data.windDirDeg,
          targetDistanceYd: data.mode === 'fieldgoal' ? data.fgDistanceYd : data.mode === 'golf' && preset ? preset.carryYd : null,
          location: location,
          predictionKey: predictionOption ? predictionOption.key : null,
          predictionLabel: predictionOption ? predictionOption.label : null
        };
      }

      function findPreviousTrial(history, mode) {
        return (history || []).slice().reverse().find(function(trial) {
          return trial && trial.mode === mode;
        });
      }

      var TRIAL_COMPARISON_FIELDS = [
        ['shotKind', 'preset'], ['speedMph', 'speed'], ['releaseHeight', 'release height'],
        ['angleV', 'release angle'], ['angleH', 'aim'], ['spinRpm', 'spin rate'],
        ['spinAxisDeg', 'spin axis'], ['gravityId', 'gravity'], ['windMph', 'wind speed'],
        ['windDirDeg', 'wind direction'], ['flutterSeed', 'air pattern']
      ];

      function changedTrialVariables(previous, current) {
        if (!previous || !current) return [];
        return TRIAL_COMPARISON_FIELDS.filter(function(pair) {
          if (!Object.prototype.hasOwnProperty.call(previous, pair[0])) return false;
          if (pair[0] === 'windDirDeg' && !(Number(previous.windMph) || Number(current.windMph))) return false;
          return String(previous[pair[0]]) !== String(current[pair[0]]);
        }).map(function(pair) { return pair[1]; });
      }

      function buildFairTestFeedback(previous, current, modeLabel) {
        if (!previous) {
          return { level: 'first', label: 'First trial', changed: [], summary: 'No earlier ' + String(modeLabel || 'sport').toLowerCase() + ' trial yet. Establish a baseline, then repeat it or change one variable.' };
        }
        var changed = changedTrialVariables(previous, current);
        if (!changed.length) return { level: 'repeat', label: 'Repeat trial', changed: changed, summary: 'The setup stayed the same, which helps check consistency.' };
        if (changed.length === 1) return { level: 'fair', label: 'Fair test', changed: changed, summary: 'Only ' + changed[0] + ' changed. Compare the outcomes to isolate its effect.' };
        var visibleChanges = changed.slice(0, 3).join(', ');
        var remaining = changed.length > 3 ? ' and ' + (changed.length - 3) + ' more' : '';
        return { level: 'multiple', label: 'Multiple variables changed', changed: changed, summary: 'Changed ' + changed.length + ' variables: ' + visibleChanges + remaining + '. Change one variable next for clearer evidence.' };
      }

      // Three plain-language outcome buckets keep prediction quick while still
      // using authentic vocabulary for every sport. A prediction is optional:
      // it earns a confirmation or surprise message, never a penalty.
      function getPredictionOptions(mode, shotKind) {
        var shotPreset = mode === 'freethrow'
          ? SHOT_TYPES.find(function(preset) { return preset.id === shotKind; })
          : null;
        if (mode === 'pitching') return [
          { key: 'target', label: 'Strike', detail: 'Inside the zone' },
          { key: 'close', label: 'Borderline', detail: 'On the edge' },
          { key: 'off', label: 'Outside', detail: 'Ball or wild pitch' }
        ];
        if (mode === 'freethrow' && shotPreset && shotPreset.kind === 'pass') return [
          { key: 'target', label: 'Complete', detail: 'Caught cleanly' },
          { key: 'close', label: 'Reachable', detail: 'High or low' },
          { key: 'off', label: 'Off target', detail: 'Short, wide, or wrong bounce' }
        ];
        if (mode === 'freethrow') return [
          { key: 'target', label: 'Make', detail: 'Swish or score' },
          { key: 'close', label: 'Close', detail: 'Rim or backboard' },
          { key: 'off', label: 'Miss', detail: 'Off target' }
        ];
        if (mode === 'freekick') return [
          { key: 'target', label: 'Goal', detail: 'Inside the goal' },
          { key: 'close', label: 'Post or bar', detail: 'Hits the frame of the goal' },
          { key: 'off', label: 'No goal', detail: 'Blocked, high, wide, or short' }
        ];
        if (mode === 'fieldgoal') return [
          { key: 'target', label: 'Good', detail: 'Through the uprights' },
          { key: 'close', label: 'Close', detail: 'Doink or barely wide' },
          { key: 'off', label: 'No good', detail: 'Short or wide' }
        ];
        if (mode === 'bowling' && shotKind === 'bouncer') return [
          { key: 'target', label: 'Chest high', detail: 'Short ball, rises at the batter' },
          { key: 'close', label: 'Too low', detail: 'Stump or waist height' },
          { key: 'off', label: 'No-ball', detail: 'Over the head, or bounces twice' }
        ];
        if (mode === 'bowling') return [
          { key: 'target', label: 'Wicket', detail: 'Hit the stumps' },
          { key: 'close', label: 'Dot ball', detail: 'Playable line' },
          { key: 'off', label: 'Miss', detail: 'Wide, high, or short' }
        ];
        if (mode === 'golf') return [
          { key: 'target', label: 'Green', detail: 'Pin-high target' },
          { key: 'close', label: 'Fairway', detail: 'Safe landing' },
          { key: 'off', label: 'Off target', detail: 'Short, long, rough, or woods' }
        ];
        return [
          { key: 'target', label: 'Ace', detail: 'Deep corner' },
          { key: 'close', label: 'In court', detail: 'Playable serve' },
          { key: 'off', label: 'Service error', detail: 'Net, short, long, or out' }
        ];
      }

      function predictionBucket(mode, location, shotKind) {
        var shotPreset = mode === 'freethrow'
          ? SHOT_TYPES.find(function(preset) { return preset.id === shotKind; })
          : null;
        if (mode === 'pitching') return location === 'strike' ? 'target' : location === 'borderline' ? 'close' : 'off';
        if (mode === 'freethrow' && shotPreset && shotPreset.kind === 'pass') {
          return location === 'caught' ? 'target' : (location === 'highpass' || location === 'lowpass') ? 'close' : 'off';
        }
        if (mode === 'freethrow') return (location === 'swish' || location === 'made') ? 'target' : (location === 'rim' || location === 'backboard') ? 'close' : 'off';
        if (mode === 'freekick') return location === 'goal' ? 'target' : location === 'post' ? 'close' : 'off';
        if (mode === 'fieldgoal') return location === 'good' ? 'target' : (location === 'doink' || location === 'wideclose') ? 'close' : 'off';
        if (mode === 'bowling' && shotKind === 'bouncer') return location === 'bouncer' ? 'target' : (location === 'dot' || location === 'wicket' || location === 'shaved') ? 'close' : 'off';
        if (mode === 'bowling') return (location === 'wicket' || location === 'shaved') ? 'target' : location === 'dot' ? 'close' : 'off';
        if (mode === 'golf') return location === 'green' ? 'target' : location === 'fairway' ? 'close' : 'off';
        return location === 'ace' ? 'target' : location === 'in' ? 'close' : 'off';
      }

      function predictionFeedback(result) {
        var trial = result && result.trial;
        if (!trial || !trial.predictionKey) return null;
        var options = getPredictionOptions(trial.mode, trial.shotKind);
        var actualKey = predictionBucket(trial.mode, result.location, trial.shotKind);
        var actual = options.find(function(option) { return option.key === actualKey; });
        var matched = actualKey === trial.predictionKey;
        return {
          matched: matched,
          title: matched ? 'Evidence matched your call' : 'Evidence differed from your call',
          summary: matched
            ? 'You called ' + trial.predictionLabel + ', and the result landed there. Change one variable and test whether the pattern repeats.'
            : 'You called ' + trial.predictionLabel + '; the evidence landed in ' + (actual ? actual.label : cleanOutcomeText(result)) + '. Surprises are useful data—use the next rep to test why.'
        };
      }

      function clampToStep(value, min, max, step) {
        var bounded = Math.max(min, Math.min(max, Number(value)));
        var snapped = Math.round(bounded / step) * step;
        return Number(snapped.toFixed(step < 1 ? 2 : 0));
      }

      function verticalRangeForMode(mode) {
        return (MODES[mode] && MODES[mode].verticalAimRange) || [-8, 70];
      }

      function buildNextRepRecommendation(result) {
        var trial = result && result.trial;
        if (!trial) return null;
        var cfg = MODES[trial.mode] || MODES.pitching;
        var loc = result.location;
        var samples = result.samples || [];
        var finalSample = samples[samples.length - 1] || { x: 0 };
        var finalX = result.outcome && typeof result.outcome.plateX === 'number' ? result.outcome.plateX : (finalSample.x || 0);
        function rec(stateKey, value, label, reason) {
          return { stateKey: stateKey, value: value, label: label, reason: reason };
        }
        function speed(delta, label, reason) {
          var speedStep = cfg.speedStep || 1;
          var next = clampToStep((Number(trial.speedMph) || 0) + delta * (speedStep < 1 ? 0.5 : 1), cfg.speedRange[0], cfg.speedRange[1], speedStep);
          return rec('speedMph', next, label + ' to ' + next + ' mph', reason);
        }
        function vertical(delta, label, reason) {
          var range = verticalRangeForMode(trial.mode);
          var next = clampToStep((Number(trial.angleV) || 0) + delta, range[0], range[1], 0.5);
          return rec('aimDegV', next, label + ' to ' + next.toFixed(1) + '°', reason);
        }
        function horizontal(amount, reason) {
          var direction = finalX >= 0 ? -1 : 1;
          var aimRange = cfg.aimHRange || [-5, 5];
          var next = clampToStep((Number(trial.angleH) || 0) + direction * amount, aimRange[0], aimRange[1], cfg.aimHRange ? 0.5 : 0.1);
          return rec('aimDegH', next, 'Aim ' + Math.abs(next - (Number(trial.angleH) || 0)).toFixed(1) + '° back toward center', reason);
        }
        function spin(delta, reason) {
          var range = cfg.spinRange || [0, 3500];
          var step = cfg.spinStep || 50;
          var current = Number(trial.spinRpm) || 0;
          var signedDelta = current + delta > range[1] ? -Math.abs(delta) : delta;
          var next = clampToStep(current + signedDelta, range[0], range[1], step);
          return rec('spinRpm', next, (next >= current ? 'Increase' : 'Reduce') + ' spin to ' + next + ' rpm', reason);
        }
        if (trial.mode === 'pitching') {
          if (loc === 'strike') return spin(200, 'Keep every other setting fixed to isolate how spin changes break.');
          if (result.outcome && result.outcome.plateY > STRIKE_ZONE.yMax) return vertical(-0.5, 'Lower vertical aim', 'The pitch crossed above the zone. A small angle change creates a clean fair test.');
          if (result.outcome && result.outcome.plateY < STRIKE_ZONE.yMin) return vertical(0.5, 'Raise vertical aim', 'The pitch crossed below the zone. Test a slightly higher line.');
          if (Math.abs(finalX) > STRIKE_ZONE.xMax) return horizontal(0.3, 'The pitch missed laterally. Keep speed and spin fixed while you correct its line.');
          return vertical(0.5, 'Raise vertical aim', 'The pitch did not reach the zone cleanly. Test one small angle change.');
        }
        if (trial.mode === 'freethrow') {
          var shotPreset = findPresetForTrial(trial);
          if (shotPreset && shotPreset.kind === 'pass') {
            // A bounce pass comes up steeper when it goes down steeper, so its fixes run the other way.
            var isBounce = shotPreset.id === 'bouncepass', bHops = (result.read && result.read.hops) || [];
            if (loc === 'highpass' && isBounce) return speed(-1, 'Take off speed', 'The pass came off the floor too fast. Test one mph less and keep the angle the same.');
            if (loc === 'highpass') return vertical(-2, 'Lower the pass angle', 'The pass arrived high; change only its vertical aim.');
            if (loc === 'lowpass' && isBounce && bHops.length === 1 && bHops[0].z > PASS_RECEIVER_Z * 2 / 3) return vertical(-1, 'Aim down a little more', 'It bounced close to your teammate. Bounce it a little closer to you and keep the speed the same.');
            if (loc === 'lowpass' || loc === 'short') return speed(1, 'Add speed', 'Test whether one more mph brings the pass into the catch window.');
            if (loc === 'wide') return horizontal(0.4, 'Keep height and speed fixed while correcting the pass line.');
            return speed(1, 'Add speed', 'A completed pass is a strong baseline for a one-variable speed test.');
          }
          if (loc === 'air' || loc === 'miss') return speed(1, 'Add speed', 'The shot needs more range; hold its angle and spin constant.');
          if (loc === 'backboard') return speed(-1, 'Soften the shot', 'Reduce only speed to test whether the ball reaches the rim instead of the glass.');
          if (loc === 'rim') return vertical(1, 'Raise the arc', 'A slightly steeper entry angle may open the effective rim target.');
          return spin(20, 'Use the make as a baseline and test how a little more backspin changes the finish.');
        }
        if (trial.mode === 'freekick') {
          if (loc === 'blocked') return vertical(2, 'Raise the launch angle', 'The wall blocked the path; hold speed and spin fixed while testing clearance.');
          if (loc === 'over') return vertical(-2, 'Lower the launch angle', 'The ball cleared the bar, so isolate a smaller launch angle.');
          if (loc === 'wide') return horizontal(0.5, 'Correct the line while keeping curl and power unchanged.');
          if (loc === 'short') return speed(3, 'Add speed', 'Test whether extra speed reaches the goal without changing the arc.');
          // Off the frame: the model says which piece it touched, so the next rep fixes that one.
          var hitPart = (loc === 'post' && result.read && result.read.frame) ? result.read.frame.part : null;
          if (hitPart === 'bar' || hitPart === 'corner') return vertical(-0.5, 'Lower the launch angle', 'The ball clipped the crossbar. Test a slightly lower launch and keep everything else the same.');
          if (hitPart === 'post') return horizontal(0.5, 'The ball clipped the post. Move the line in a little and keep curl and power the same.');
          return spin(100, 'Use this near-target result to isolate how sidespin changes curl.');
        }
        if (trial.mode === 'fieldgoal') {
          if (loc === 'short' || loc === 'shortbar') return speed(3, 'Add power', 'Keep the launch angle fixed and test whether speed clears the bar.');
          if (loc === 'wide' || loc === 'wideclose') return horizontal(0.4, 'Correct the line without changing power or launch angle.');
          // Off the frame: the model says which piece it touched (read.frame), so the next rep fixes that one.
          var fgPiece = (loc === 'doink' && result.read && result.read.frame) ? result.read.frame.part : null;
          if (fgPiece === 'bar') return speed(1, 'Add a little power', 'The ball hit the crossbar. Test one more mph and keep the angle and aim the same.');
          if (fgPiece === 'upright' || fgPiece === 'corner') return horizontal(0.4, 'The ball hit the ' + (fgPiece === 'upright' ? 'upright' : 'end of the crossbar') + '. Move the line in a little and keep power and angle the same.');
          return vertical(1, 'Raise the launch angle', 'Use this kick as a baseline for a one-degree trajectory test.');
        }
        if (trial.mode === 'bowling') {
          if (loc === 'overhead' || loc === 'beamer') return vertical(-1, 'Lower the release angle', 'The ball reached the batter too high; test one degree lower.');
          if (loc === 'wide') return horizontal(0.3, 'Tighten the line while keeping pace and spin fixed.');
          if (loc === 'short') return speed(2, 'Add pace', 'Test whether a small speed increase carries the same line farther.');
          return spin(100, 'Use the current line as a baseline and isolate a small spin change.');
        }
        if (trial.mode === 'golf') {
          if (loc === 'short') return speed(4, 'Add club speed', 'Hold launch and spin fixed while testing four more mph.');
          if (loc === 'long') return speed(-4, 'Take off speed', 'Hold the flight shape fixed while testing less carry.');
          if (loc === 'rough' || loc === 'woods') return horizontal(0.4, 'Correct the start line without changing carry variables.');
          return spin(500, 'Use this safe landing as a baseline and isolate how backspin changes carry.');
        }
        if (loc === 'net') return vertical(2, 'Raise the launch angle', 'The serve hit the net; change only the angle to test clearance.');
        if (loc === 'short') return speed(2, 'Add speed', 'Hold aim and spin fixed while testing more range.');
        if (loc === 'long') return speed(-3, 'Reduce speed', 'The serve crossed safely but carried too far.');
        if (loc === 'out') return horizontal(0.4, 'Correct the line while preserving its depth and spin.');
        return spin(50, 'Use this in-court serve as a baseline and isolate a small topspin change.');
      }

      function applyNextRepRecommendation(recommendation, result) {
        var trial = result && result.trial;
        if (!recommendation || !trial || trial.mode !== d.mode) return;
        var patch = {
          speedMph: trial.speedMph, releaseHeight: trial.releaseHeight,
          aimDegV: trial.angleV, aimDegH: trial.angleH,
          spinRpm: trial.spinRpm, spinAxisDeg: trial.spinAxisDeg,
          throwerHand: trial.throwerHand, gravityId: trial.gravityId,
          windMph: trial.windMph, windDirDeg: trial.windDirDeg, flutterSeed: trial.flutterSeed || 1,
          replayActive: false, replayT: 1, predictionKey: null
        };
        if (trial.mode === 'pitching') patch.pitchType = trial.shotKind;
        else if (trial.mode === 'freethrow') patch.shotType = trial.shotKind;
        else if (trial.mode === 'freekick') patch.kickType = trial.shotKind;
        else if (trial.mode === 'fieldgoal') { patch.goalType = trial.shotKind; patch.fgDistanceYd = trial.targetDistanceYd; }
        else if (trial.mode === 'bowling') patch.bowlType = trial.shotKind;
        else if (trial.mode === 'golf') patch.golfClub = trial.shotKind;
        else patch.serveType = trial.shotKind;
        patch[recommendation.stateKey] = recommendation.value;
        setReplayPaused(false);
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, patch) });
        });
        tlAnnounce('Next rep loaded as a fair test. ' + recommendation.label + '. Make a new prediction, then launch.');
      }

      function loadFixMiss() {
        var miss = fixMissSetup(d.mode);
        if (!miss) return;
        setReplayPaused(false);
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, miss, {
            lastResult: null, replayActive: false, replayT: 0, predictionKey: null,
            referenceList: [], referenceResult: null, referenceLabel: '', activeScenarioId: null,
            coachReply: '', coachError: '',
            fixMiss: { mode: miss.mode, setup: miss, tried: false, done: false }
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce(__alloT('stem.throwlab.sr_fix_miss_loaded', 'A setup that just misses is loaded. Launch it to see what goes wrong. Then change one control to fix it.'));
      }
      function setSkillTier(tier) {
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, { scaffoldTier: tier });
          if (tier === 4) next.showFormulas = true;
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Skill level: ' + TIER_NAMES[tier] + '. ' + questText(questFor(d.mode, tier)));
      }
      // Progress on the tier question, in words. Never shows the answer before it is found.
      function questStatus(quest, prog) {
        var p = prog || {};
        var mph = function(v) { return v + ' mph'; };
        if (quest.type === 'slowest') {
          if (p.done) return 'Answered: ' + mph(p.answer) + ' is the slowest. One step slower misses.';
          if (p.best === null || p.best === undefined) return 'Launch to start. Every other control stays as it is.';
          var under = (p.misses || []).filter(function(v) { return v < p.best; });
          var topMiss = under.length ? Math.max.apply(null, under) : null;
          return 'Slowest score so far: ' + mph(p.best) + '. ' + (topMiss !== null ? 'It missed at ' + mph(topMiss) + '. The answer is between them, or it is ' + mph(p.best) + '.' : 'Try slower until it misses.');
        }
        if (quest.type === 'slowMake') return p.done ? 'Answered with a strike at ' + mph(p.at) + '.' : (p.tries ? 'Slow tries so far: ' + p.tries + '. Read where each one crossed.' : 'Lower the speed first, then fix the aim.');
        if (quest.type === 'twoAngles') {
          if (p.done && p.pair) return 'Answered: ' + p.pair[0].a + '° and ' + p.pair[1].a + '° both scored at ' + mph(p.pair[0].s) + '.';
          var lastMk = (p.makes || [])[(p.makes || []).length - 1];
          return lastMk ? 'Last score: ' + mph(lastMk.s) + ' at ' + lastMk.a + '°. Keep the speed. Find a second angle at least ' + quest.gap + '° away.' : 'Score once, then keep that speed and hunt for a second angle.';
        }
        if (quest.type === 'bounceAndFull') {
          if (p.done) return 'Answered: one speed, two ways to the stumps.';
          var lastW = (p.makes || [])[(p.makes || []).length - 1];
          return lastW ? 'Last wicket: ' + mph(lastW.s) + (lastW.full ? ', a full toss. Now one that bounces.' : ', with a bounce. Now a full toss.') : 'Take a wicket, then keep that speed.';
        }
        if (quest.type === 'bankAndSwish') {
          if (p.done) return 'Answered: straight in and off the glass.';
          var lastS = (p.makes || [])[(p.makes || []).length - 1];
          return lastS ? (lastS.banked ? 'One off the glass. Now the same shot straight in.' : 'One straight in. Now the same shot off the glass.') : 'Make a shot, then make the same shot the other way.';
        }
        if (quest.type === 'spinMove') {
          var show = function(v) {
            return quest.measure === 'turn' ? Math.round(v * 100) + ' cm' : quest.measure === 'carry' ? Math.round(v / 0.9144) + ' yd'
              : (quest.measure === 'side' && quest.mode === 'pitching') ? Math.round(v * 39.37) + ' in' : v.toFixed(1) + ' m';
          };
          if (p.done) return 'Answered: spin moved it ' + show(p.best) + ' and it still scored.';
          return (typeof p.best === 'number') ? 'Most spin movement on a score so far: ' + show(p.best) + '.' : 'Add spin, then re-aim until it scores.';
        }
        if (quest.type === 'windKick') return p.done ? 'Answered: good, into the wind.' : 'Set the wind first (0° is a headwind), then find the speed.';
        if (p.done) return 'Answered: ' + quest.need + ' correct calls in a row.';
        var runLen = (p.run || []).length;
        return 'Correct calls in a row: ' + runLen + ' of ' + quest.need + '.' + (runLen >= quest.need ? ' Now call a miss and be right.' : '');
      }
      function focusLaunchControls() {
        var launchZone = document.getElementById('throwlab-launch-controls');
        if (!launchZone) return;
        if (typeof launchZone.scrollIntoView === 'function') launchZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof launchZone.focus === 'function') launchZone.focus({ preventScroll: true });
        tlAnnounce(__alloT('stem.throwlab.sr_launch_controls_call_the_outcome_review_the_fair', 'Launch controls. Call the outcome, review the fair-test check, then launch.'));
      }

      function throwPitch() {
        // A press while a replay is running ends the replay. It never starts a second throw, and
        // a quick double press cannot do both.
        if (d.replayActive) { skipReplayToResult(); return; }
        if (Date.now() - (_tlSkipAt.current || 0) < 450) return;
        setReplayPaused(false);
        var modeMeta = MODES[d.mode] || MODES.pitching;
        // One call simulates, judges and measures the throw (see evaluateThrow). The path it
        // returns already stops where the ball was stopped, so the picture matches the verdict.
        var result = evaluateThrow(d);
        var loc = result.location;
        var activeShotPreset = SHOT_TYPES.find(function(s) { return s.id === d.shotType; });
        var isPassKind = activeShotPreset && activeShotPreset.kind === 'pass';
        sfxThrow();
        var newThrowCount = (d.throwCount || 0) + 1;
        var newModeThrowCounts = Object.assign({}, d.modeThrowCounts || {});
        newModeThrowCounts[d.mode] = (newModeThrowCounts[d.mode] || 0) + 1;
        // Unified "make" predicate across all sports — feeds the
        // cross-sport Hot-Hand streak counter so a great cricket bowl
        // followed by a great golf shot keeps the flame lit.
        var madeIt = isMakeOutcome(loc);
        // XP for a make is paid once per exact setup. Repeating a throw that already worked
        // is fine practice, but it is not new evidence, so it earns nothing more.
        var throwKey = setupKey(d);
        var firstMakeOfSetup = madeIt && !((d.xpSetups || {})[throwKey]);
        var newXpSetups = d.xpSetups || {};
        if (firstMakeOfSetup && Object.keys(newXpSetups).length < 400) {
          newXpSetups = Object.assign({}, newXpSetups); newXpSetups[throwKey] = true;
        }
        function makeXP(points, reason) { if (firstMakeOfSetup && awardXP) awardXP('throwlab', points, reason); }
        // The verdict is held until the ball arrives: how long the flight is shown on screen.
        var tlMotionOff = false;
        try { tlMotionOff = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
        var pathEndT = result.samples.length ? result.samples[result.samples.length - 1].t : 0;
        result.pathTime = pathEndT;
        result.modelVersion = 2;
        result.revealAt = (pathEndT > 0 && result.flightTime > 0) ? Math.min(1, result.flightTime / pathEndT) : 1;
        var revealMs = tlMotionOff ? 0 : Math.round(replaySeconds(result.flightTime, pathEndT) * result.revealAt * 1000 / Math.max(0.25, replaySpeed || 1));
        var newStrikeCount = (d.mode === 'pitching' && loc === 'strike') ? (d.strikeCount || 0) + 1 : (d.strikeCount || 0);
        var newMakeCount = (d.mode === 'freethrow' && (loc === 'swish' || loc === 'made' || loc === 'caught')) ? (d.shotMakeCount || 0) + 1 : (d.shotMakeCount || 0);
        var newGoalCount = (d.mode === 'freekick' && loc === 'goal') ? (d.goalCount || 0) + 1 : (d.goalCount || 0);
        var newFgMakeCount = (d.mode === 'fieldgoal' && loc === 'good') ? (d.fgMakeCount || 0) + 1 : (d.fgMakeCount || 0);
        var newWicketCount = (d.mode === 'bowling' && (loc === 'wicket' || loc === 'shaved')) ? (d.wicketCount || 0) + 1 : (d.wicketCount || 0);
        var newGolfGreenCount = (d.mode === 'golf' && loc === 'green') ? (d.golfGreenCount || 0) + 1 : (d.golfGreenCount || 0);
        var newVolleyAceCount = (d.mode === 'volleyball' && loc === 'ace') ? (d.volleyAceCount || 0) + 1 : (d.volleyAceCount || 0);
        var newTypesUsed = Object.assign({}, d.pitchTypesUsed || {});
        if (d.mode === 'pitching') newTypesUsed[d.pitchType] = true;

        // ── Pitch Locker: per-pitch-type strike mastery (cross-session) ──
        // First time a pitch type is thrown for a strike, log it permanently
        // and fire a celebration. Subsequent strikes increment the count but
        // do not re-fire the celebration.
        var newPitchLocker = Object.assign({}, d.pitchLocker || {});
        var firedNewLifter = null;
        if (d.mode === 'pitching' && loc === 'strike' && d.pitchType) {
          var prevEntry = newPitchLocker[d.pitchType];
          var nowIso = new Date().toISOString();
          if (prevEntry) {
            newPitchLocker[d.pitchType] = Object.assign({}, prevEntry, {
              lastStrikeAt: nowIso,
              strikeCount: (prevEntry.strikeCount || 0) + 1,
              bestSpeedMph: Math.max(prevEntry.bestSpeedMph || 0, Number(d.speedMph) || 0),
              bestSpinRpm: Math.max(prevEntry.bestSpinRpm || 0, Number(d.spinRpm) || 0)
            });
          } else {
            var ptInfo = PITCH_TYPES.find(function (p) { return p.id === d.pitchType; }) || { label: d.pitchType, icon: '⚾' };
            newPitchLocker[d.pitchType] = {
              firstStrikeAt: nowIso,
              lastStrikeAt: nowIso,
              strikeCount: 1,
              bestSpeedMph: Number(d.speedMph) || 0,
              bestSpinRpm: Number(d.spinRpm) || 0,
              label: ptInfo.label,
              icon: ptInfo.icon
            };
            firedNewLifter = { pitchType: d.pitchType, label: ptInfo.label, icon: ptInfo.icon, total: Object.keys(newPitchLocker).length };
          }
        }
        // Roll a compact history entry for Coach Mode — last 5 throws.
        // We only keep the fields a coach would need (mode, parameters,
        // outcome) so this object stays small even if the user throws
        // hundreds of times.
        var currentTrial = buildTrialSnapshot(d, loc);
        currentTrial.launchedAt = Date.now();
        result.trial = currentTrial;
        var currentPredictionFeedback = predictionFeedback(result);
        var newPredictionStats = Object.assign({ attempts: 0, matches: 0 }, d.predictionStats || {});
        if (currentPredictionFeedback) {
          newPredictionStats.attempts += 1;
          if (currentPredictionFeedback.matched) newPredictionStats.matches += 1;
        }
        var previousTrial = findPreviousTrial(d.recentThrows, d.mode);
        result.fairTest = buildFairTestFeedback(previousTrial, currentTrial, modeMeta.label);
        var newRecent = (d.recentThrows || []).slice(-4);
        newRecent.push(currentTrial);
        // ── Challenges: judged from this same model run, announced when the ball arrives ──
        var chalEvents = [];
        var newFixMiss = d.fixMiss || null, newFixDone = d.fixMissDone || {};
        if (newFixMiss && !newFixMiss.done && newFixMiss.mode === d.mode) {
          var fixJudged = judgeFixMiss(newFixMiss, d, madeIt);
          newFixMiss = fixJudged.state;
          if (fixJudged.event === 'fixed') {
            var firstFix = !newFixDone[d.mode];
            newFixDone = Object.assign({}, newFixDone); newFixDone[d.mode] = true;
            chalEvents.push({ say: 'Miss fixed. You changed only the ' + newFixMiss.fixedBy + '.', toast: '🔧 Miss fixed with one change', xp: firstFix ? 10 : 0, reason: 'Fixed a miss', celebrate: firstFix });
          } else if (fixJudged.event === 'toomany') {
            chalEvents.push({ say: 'It worked, but you changed ' + newFixMiss.lastChanged + ' controls. Load the miss again and fix it with one.', toast: null, xp: 0 });
          }
        }
        var tierNow = Math.max(1, Math.min(4, d.scaffoldTier || 3));
        var questKey = d.mode + ':' + tierNow;
        var questNow = questFor(d.mode, tierNow);
        var newQuests = d.quests || {};
        var questBefore = newQuests[questKey] || null;
        var questAfter = advanceQuest(questNow, questBefore, d, result, {
          called: !!currentPredictionFeedback,
          matched: !!(currentPredictionFeedback && currentPredictionFeedback.matched),
          bucket: predictionBucket(d.mode, loc, trialShotKind(d))
        });
        newQuests = Object.assign({}, newQuests); newQuests[questKey] = questAfter;
        if (questAfter.done && !(questBefore && questBefore.done)) {
          chalEvents.push({ say: TIER_NAMES[tierNow] + ' question answered.', toast: '🧩 ' + TIER_NAMES[tierNow] + ' question answered', xp: 15, reason: TIER_NAMES[tierNow] + ' question', celebrate: true });
        }
        // ── Drill stat updates ──
        // We compute the new drillStats here (synchronously, off d) and
        // include it in the same setLabToolData so the active task's
        // test() function sees up-to-date counters.
        // The same tally runs twice: once over every throw (badges, the hot streak, the stats card) and,
        // while a drill runs, once over the throws that came after a call (the drill's own tasks).
        var accumulateThrowStats = function(prevStats) {
        var stats = drillStatsWithDefaults(prevStats);
        // Cross-sport Hot Hand — increment / reset on the unified make
        // outcome so every sport feeds the same streak meter.
        if (madeIt) {
          stats.hotStreak = (stats.hotStreak || 0) + 1;
        } else {
          stats.hotStreak = 0;
        }
        // The simulation gives the same result for the same setup every time, so pressing launch
        // again proves nothing new. Drill tallies and streak badges count a make only when the
        // setup differs from the throw before it. (A new air pattern alone is not a new setup.)
        var repeatOfLast = throwKey === d.lastThrowKey;
        if (!madeIt) { stats.variedStreak = 0; stats.vStrikeStreak = 0; }
        else if (!repeatOfLast) {
          stats.variedStreak = (stats.variedStreak || 0) + 1;
          if (d.mode === 'pitching') stats.vStrikeStreak = (stats.vStrikeStreak || 0) + 1;
          if (d.mode === 'freethrow') stats.vMakes = (stats.vMakes || 0) + 1;
          if (d.mode === 'freekick' && loc === 'goal') stats.vGoals = (stats.vGoals || 0) + 1;
          if (d.mode === 'bowling' && (loc === 'wicket' || loc === 'shaved')) stats.vWickets = (stats.vWickets || 0) + 1;
          if (d.mode === 'volleyball') stats.vServesIn = (stats.vServesIn || 0) + 1;
          if (d.mode === 'golf' && d.golfClub === 'driver') stats.vFairways = (stats.vFairways || 0) + 1;
        }
        // Pitching streak + type-coverage
        if (d.mode === 'pitching') {
          if (loc === 'strike') {
            stats.streakStrikes = (stats.streakStrikes || 0) + 1;
            stats.strikeTypes = Object.assign({}, stats.strikeTypes); stats.strikeTypes[d.pitchType] = true;
            if (d.spinRpm < 200) stats.strikeWithLowSpin = true;
          } else {
            stats.streakStrikes = 0;
          }
        }
        // Free throw makes + multi-height swishes + bounce-pass completion
        if (d.mode === 'freethrow') {
          if (loc === 'caught' && d.shotType === 'bouncepass') stats.completedBouncePass = true;
          if (loc === 'swish' || loc === 'made' || loc === 'caught') {
            stats.makeCount = (stats.makeCount || 0) + 1;
            // Track makes per shot-type so the floater / step-back drills can complete
            stats.shotsMadeByType = Object.assign({}, stats.shotsMadeByType);
            stats.shotsMadeByType[d.shotType] = true;
          }
          // Half-court heave drill — counts ANY attempt that reaches the rim
          // (rim / made / swish / backboard / bouncepass-style 'caught').
          // Per the drill tip: NBA players make only a few heaves in a hundred, so we don't gate on a
          // make. Just need the ball to get there.
          if (d.shotType === 'halfcourt' && (loc === 'rim' || loc === 'backboard' || loc === 'made' || loc === 'swish')) {
            stats.attemptedHalfCourt = true;
          }
          if (loc === 'swish') {
            var hKey = d.releaseHeight.toFixed(1);
            stats.swishHeightSet = Object.assign({}, stats.swishHeightSet);
            if (!stats.swishHeightSet[hKey]) {
              stats.swishHeightSet[hKey] = true;
              stats.swishHeights = Object.keys(stats.swishHeightSet).length;
            }
          }
        }
        // Free kick goals + per-kick-style coverage
        if (d.mode === 'freekick' && loc === 'goal') {
          stats.goalKickTypes = Object.assign({}, stats.goalKickTypes);
          stats.goalKickTypes[d.kickType] = true;
          stats.totalGoals = (stats.totalGoals || 0) + 1;
        }
        // Field goal makes by distance
        if (d.mode === 'fieldgoal' && loc === 'good') {
          stats.fgMadeByDist = Object.assign({}, stats.fgMadeByDist);
          stats.fgMadeByDist[String(d.fgDistanceYd)] = true;
        }
        // Bowling wickets + per-delivery-style coverage
        if (d.mode === 'bowling' && (loc === 'wicket' || loc === 'shaved')) {
          stats.bowlTypes = Object.assign({}, stats.bowlTypes);
          stats.bowlTypes[d.bowlType] = true;
          stats.totalWickets = (stats.totalWickets || 0) + 1;
        }
        // Golf: track green hits per club + total fairway hits
        if (d.mode === 'golf') {
          if (loc === 'green') {
            stats.golfClubsOnGreen = Object.assign({}, stats.golfClubsOnGreen);
            stats.golfClubsOnGreen[d.golfClub] = true;
          }
          if (loc === 'fairway' || loc === 'green') {
            stats.golfFairwaysHit = (stats.golfFairwaysHit || 0) + 1;
          }
        }
        // Volleyball: track in-court serves per type + ace + total-in counter
        if (d.mode === 'volleyball') {
          if (loc === 'in' || loc === 'ace') {
            stats.volleyServesIn = Object.assign({}, stats.volleyServesIn);
            stats.volleyServesIn[d.serveType] = true;
            stats.volleyInCount = (stats.volleyInCount || 0) + 1;
          }
          if (loc === 'ace') {
            stats.volleyAceCount = (stats.volleyAceCount || 0) + 1;
          }
        }
        return stats;
        };
        var stats = accumulateThrowStats(d.drillStats);
        // Drills count a throw only when the student made a call first. A throw without one still plays.
        var drillCalled = !!d.predictionKey;
        var newDrillCallStats = d.drillCallStats || {};
        if (d.drillActive && drillCalled) newDrillCallStats = accumulateThrowStats(d.drillCallStats);
        // ── Personal Best check ──
        // Walk the per-sport metrics; if any record was broken, queue
        // an announcement + persist the new best to toolData.
        var pbResult = checkPersonalBests(d, result, stats);
        var newPersonalBests = pbResult.personalBests;
        var newPbRecords = pbResult.newRecords;

        // ── Daily Challenge completion check ──
        // If the student loaded today's daily challenge AND just landed
        // a make outcome, mark the challenge complete (idempotent — set
        // once per date). Fires a celebratory toast + small XP reward.
        var dailyKey = todayKey();
        var newDailyCompleted = d.dailyCompleted || null;
        var dailyJustCompleted = false;
        // The daily challenge counts only when the student made a call before launching.
        if (d.activeScenarioId && madeIt && d.predictionKey) {
          var daily = getDailyChallenge();
          if (daily && d.activeScenarioId === daily.id && newDailyCompleted !== dailyKey) {
            newDailyCompleted = dailyKey;
            dailyJustCompleted = true;
          }
        }
        // ── Achievement / Badge earn-detection ──
        // Walk BADGES, awarding any whose `check` returns true that
        // the student hasn\'t earned yet. Each earn fires a toast +
        // tlAnnounce + small XP bonus; the earned set persists in
        // toolData so badges stay lit across reloads.
        var earnedSet = Object.assign({}, d.badgesEarned || {});
        var newlyEarned = [];
        BADGES.forEach(function(b) {
          if (earnedSet[b.id]) return;
          try {
            if (b.check(d, result, stats)) {
              earnedSet[b.id] = Date.now();
              newlyEarned.push(b);
            }
          } catch (e) { /* defensive — never let a bad check break the throw flow */ }
        });
        // ── Drill task progression ──
        var newDrillTaskIdx = d.drillTaskIdx || 0;
        var taskJustCompleted = null;
        if (d.drillActive) {
          var modeDrills = DRILLS[d.mode];
          if (modeDrills && newDrillTaskIdx < modeDrills.tasks.length) {
            var task = modeDrills.tasks[newDrillTaskIdx];
            if (drillCalled && task && task.test(drillStatsWithDefaults(newDrillCallStats))) {
              taskJustCompleted = task;
              newDrillTaskIdx = newDrillTaskIdx + 1;
            }
          }
        }
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            lastResult: result,
            replayActive: true,
            replayT: 0,
            throwCount: newThrowCount,
            strikeCount: newStrikeCount,
            modeThrowCounts: newModeThrowCounts,
            shotMakeCount: newMakeCount,
            goalCount: newGoalCount,
            fgMakeCount: newFgMakeCount,
            wicketCount: newWicketCount,
            golfGreenCount: newGolfGreenCount,
            volleyAceCount: newVolleyAceCount,
            badgesEarned: earnedSet,
            dailyCompleted: newDailyCompleted,
            personalBests: newPersonalBests,
            pitchTypesUsed: newTypesUsed,
            pitchLocker: newPitchLocker,
            recentThrows: newRecent,
            predictionKey: null,
            predictionStats: newPredictionStats,
            drillStats: stats,
            drillCallStats: newDrillCallStats,
            drillLastUncalled: !!d.drillActive && !drillCalled,
            drillIdxAtLaunch: d.drillTaskIdx || 0,
            drillTaskIdx: newDrillTaskIdx,
            xpSetups: newXpSetups,
            lastThrowKey: throwKey,
            fixMiss: newFixMiss, fixMissDone: newFixDone, quests: newQuests,
            // Throwing again invalidates the current coaching reply.
            coachReply: '', coachError: ''
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        if (firedNewLifter) {
          // The banner says "strike", so it waits for the ball to reach the plate (or a skip), like every verdict.
          scheduleTl(function() {
            try {
              setTlCeleb(Object.assign({}, firedNewLifter, { at: Date.now() }));
              scheduleTl(function () { setTlCeleb(null); }, 3500);
            } catch (e) {}
            if (addToast) addToast('🏅 Pitch Locker: ' + firedNewLifter.label + ' added (' + firedNewLifter.total + '/' + PITCH_TYPES.length + ')');
          }, revealMs + 300, 300);
        }
        if (taskJustCompleted) {
          var modeDrills2 = DRILLS[d.mode];
          var allDone = modeDrills2 && newDrillTaskIdx >= modeDrills2.tasks.length;
          scheduleTl(function() {
            if (allDone) {
              tlAnnounce('Drill complete! All ' + modeDrills2.tasks.length + ' tasks finished.');
              if (addToast) addToast('🏆 Drill complete!');
              if (awardXP) awardXP('throwlab', 25, 'Drill complete');
              if (celebrate) celebrate();
            } else {
              tlAnnounce('Task done. New goal: ' + modeDrills2.tasks[newDrillTaskIdx].goal);
              if (addToast) addToast('✅ Task ' + (newDrillTaskIdx) + ' complete');
              if (awardXP) awardXP('throwlab', 12, 'Drill task');
            }
          }, revealMs + 800, 800);
        } else if (d.drillActive && !drillCalled) {
          scheduleTl(function() {
            tlAnnounce(__alloT('stem.throwlab.sr_drill_uncalled', 'This throw did not count for the drill. Make a call first.'));
          }, revealMs + 800, 800);
        }
        // Newly-earned badges — fire toast + tlAnnounce + XP per badge,
        // staggered so multiple earns don\'t pile on top of each other
        if (newlyEarned.length) {
          newlyEarned.forEach(function(b, i) {
            scheduleTl(function() {
              tlAnnounce('Badge unlocked: ' + b.label + '. ' + b.hint + '.');
              if (addToast) addToast('🏅 ' + b.emoji + ' ' + b.label + '!');
              if (awardXP) awardXP('throwlab', 8, 'Badge: ' + b.label);
              if (celebrate && i === 0) celebrate();
            }, revealMs + 1200 + (i * 800), 1200 + (i * 800));
          });
        }
        // Personal Best announcements — fire each as its own toast +
        // tlAnnounce + small XP, staggered after badges so they don\'t
        // collide. PBs are rarer than badges so 12 XP each.
        if (newPbRecords.length) {
          newPbRecords.forEach(function(r, i) {
            scheduleTl(function() {
              tlAnnounce('NEW PERSONAL BEST: ' + r.label + ' — ' + r.value);
              if (addToast) addToast('🏆 New PB: ' + r.label + ' (' + r.value + ')');
              makeXP(12, 'Personal Best: ' + r.label);
              if (celebrate && i === 0) celebrate();
            }, revealMs + 1800 + (i * 700), 1800 + (i * 700));
          });
        }
        // Daily Challenge celebration — separate from drill / badge so
        // it stacks rather than getting drowned out
        if (dailyJustCompleted) {
          var dailyName = (getDailyChallenge() || {}).label || 'Today\'s Challenge';
          scheduleTl(function() {
            tlAnnounce('Daily Challenge complete: ' + dailyName + '!');
            if (addToast) addToast('🌟 Daily Challenge done!');
            if (awardXP) awardXP('throwlab', 15, 'Daily Challenge');
            if (celebrate) celebrate();
          }, revealMs + 600, 600);
        }
        if (currentPredictionFeedback && addToast) {
          scheduleTl(function() { addToast('🔬 Call compared with the evidence'); }, revealMs + 950, 950);
        }
        chalEvents.forEach(function(chal, ci) {
          scheduleTl(function() {
            tlAnnounce(chal.say);
            if (chal.toast && addToast) addToast(chal.toast);
            if (chal.xp && awardXP) awardXP('throwlab', chal.xp, chal.reason);
            if (chal.celebrate && celebrate) celebrate();
          }, revealMs + 700 + ci * 500, 700 + ci * 500);
        });
        // Outcome SFX + announcement after a tiny delay so it doesn't talk over the throw
        scheduleTl(function() {
          if (d.mode === 'pitching') {
            if (loc === 'strike') {
              sfxStrike();
              tlAnnounce('Strike! Pitch crossed the plate ' + Math.round((result.outcome.plateY || 0) * 39.37) + ' inches up.' + describeShape(result));
              if (addToast) addToast('🎯 STRIKE!');
              makeXP(5, 'Strike thrown');
            } else if (loc === 'borderline') {
              sfxCatch();
              tlAnnounce(__alloT('stem.throwlab.sr_borderline_pitch_just_outside_the_strike_zone', 'Borderline pitch. Just outside the strike zone.'));
              if (addToast) addToast('⚪ Borderline pitch');
            } else if (loc === 'ball') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_ball_pitch_missed_the_strike_zone', 'Ball. Pitch missed the strike zone.'));
              if (addToast) addToast('Ball — outside the zone');
            } else {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_wild_pitch_bounced_or_sailed_past_the_catcher', 'Wild pitch. Bounced or sailed past the catcher.'));
              if (addToast) addToast('Wild pitch!');
            }
            if (newStrikeCount === 3 && (d.strikeCount || 0) < 3 && celebrate) celebrate();
          } else if (d.mode === 'freethrow') {
            // Pass-kind outcomes (Bounce / Chest pass) come through here too,
            // routed by classifyPassResult instead of classifyShotResult.
            if (loc === 'caught') {
              sfxStrike();
              tlAnnounce('Caught! The pass arrived in the catch zone, 0.6 to 1.6 m off the floor.' + describeShape(result));
              if (addToast) addToast('🏀 CAUGHT');
              makeXP(6, 'Pass completed');
              if (celebrate) celebrate();
            } else if (loc === 'highpass') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_sailed_high_your_teammate_had_to_jump_for_it', 'Sailed high — your teammate had to jump for it.'));
              if (addToast) addToast('Too high');
            } else if (loc === 'lowpass') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_worm_burner_below_catch_zone', 'Worm-burner. The pass arrived below the catch zone, under 0.6 m.'));
              if (addToast) addToast('Too low');
            } else if (loc === 'wrongbounce') {
              sfxBall();
              tlAnnounce(d.shotType === 'bouncepass' ? 'No bounce — that was a chest pass, not a bounce pass.' : 'Bounced — chest passes should NOT bounce. Use less downward angle.');
              if (addToast) addToast(d.shotType === 'bouncepass' ? 'Need more downward angle' : 'Don\'t bounce a chest pass');
            } else if (loc === 'short') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_short_pass_didn_t_reach_the_teammate', 'Short — pass didn\'t reach the teammate.'));
              if (addToast) addToast('Short');
            } else if (loc === 'wide') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_wide_of_the_teammate_adjust_horizontal_aim', 'Wide of the teammate — adjust horizontal aim.'));
              if (addToast) addToast('Wide');
            } else if (loc === 'swish') {
              sfxStrike(); sfxStrike();
              tlAnnounce('Swish! Clean shot through the center of the rim.' + describeShape(result));
              if (addToast) addToast('🏀 SWISH!');
              makeXP(8, 'Swish');
              if (celebrate) celebrate();
            } else if (loc === 'made') {
              sfxStrike();
              tlAnnounce(__alloT('stem.throwlab.sr_made_it_ball_kissed_the_rim_and_dropped_through', 'Made it! Ball kissed the rim and dropped through.'));
              if (addToast) addToast('🏀 SCORE!');
              makeXP(5, 'Shot made');
            } else if (loc === 'rim') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_off_the_rim_close_adjust_your_arc', 'Off the rim. Close — adjust your arc.'));
              if (addToast) addToast('Rim out');
            } else if (loc === 'backboard') {
              sfxCatch();
              tlAnnounce(__alloT('stem.throwlab.sr_off_the_backboard_try_a_softer_shot_or_shorter_ar', 'Off the backboard. Try a softer shot or shorter arc.'));
              if (addToast) addToast('Off the backboard');
            } else if (loc === 'air') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_airball_short_of_the_rim_entirely', 'Airball — short of the rim entirely.'));
              if (addToast) addToast('Airball');
            } else {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_missed_the_rim', 'Missed the rim.'));
              if (addToast) addToast('Miss');
            }
          } else if (d.mode === 'fieldgoal') {
            if (loc === 'good') {
              sfxStrike(); sfxStrike();
              tlAnnounce('GOOD! Field goal from ' + d.fgDistanceYd + ' yards is up and through.' + describeShape(result));
              if (addToast) addToast('🏈 GOOD!');
              makeXP(10, 'Field goal made');
              if (celebrate) celebrate();
            } else if (loc === 'doink') {
              sfxStrike();
              // Which piece it hit comes from the model (read.frame), like the free kick's post or bar.
              var fgPart = (result.read && result.read.frame) ? result.read.frame.part : 'bar';
              tlAnnounce(fgPart === 'upright'
                ? __alloT('stem.throwlab.sr_doink_off_the_upright', 'Doink! It hit the upright. No good, but very close.')
                : fgPart === 'corner'
                  ? __alloT('stem.throwlab.sr_doink_off_the_bar_end', 'Doink! It hit the end of the crossbar. No good, but very close.')
                  : __alloT('stem.throwlab.sr_doink_off_the_crossbar', 'Doink! It hit the crossbar. No good, but very close.'));
              if (addToast) addToast(fgPart === 'upright' ? '🥁 DOINK off the upright' : '🥁 DOINK off the crossbar');
            } else if (loc === 'shortbar') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_short_kick_failed_to_clear_the_crossbar_needs_mor', 'Short. Kick failed to clear the crossbar — needs more power or steeper angle.'));
              if (addToast) addToast('Short — under the bar');
            } else if (loc === 'wideclose') {
              sfxBall();
              // 'wideclose' runs from just past the frame to 2 m outside the upright, so not "by inches".
              tlAnnounce(__alloT('stem.throwlab.sr_no_good_just_wide_of_the_upright', 'No good. It missed just outside the upright.'));
              if (addToast) addToast('Wide — close');
            } else if (loc === 'wide') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_no_good_wide_of_the_goalposts', 'No good — wide of the goalposts.'));
              if (addToast) addToast('Wide');
            } else {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_short_kick_didn_t_reach_the_goal_line', 'Short — kick didn\'t reach the goal line.'));
              if (addToast) addToast('Short of the line');
            }
          } else if (d.mode === 'freekick') {
            if (loc === 'goal') {
              sfxStrike(); sfxStrike();
              tlAnnounce('GOAL! Free kick found the back of the net.' + describeShape(result));
              if (addToast) addToast('⚽ GOAL!');
              makeXP(10, 'Free kick goal');
              if (celebrate) celebrate();
            } else if (loc === 'post') {
              sfxStrike();
              var hitBar = !!(result.read && result.read.frame && result.read.frame.part !== 'post');
              tlAnnounce(hitBar ? __alloT('stem.throwlab.sr_off_the_bar_inches_from_a_goal', 'Off the crossbar! Inches from a goal.') : __alloT('stem.throwlab.sr_off_the_post_inches_from_a_goal', 'Off the post! Inches from a goal.'));
              if (addToast) addToast(hitBar ? '🥅 Off the crossbar' : '🥅 Off the post');
            } else if (loc === 'over') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_over_the_bar_reduce_your_launch_angle', 'Over the bar. Reduce your launch angle.'));
              if (addToast) addToast('Over the bar');
            } else if (loc === 'wide') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_wide_of_the_goal_adjust_your_aim_or_curl', 'Wide of the goal. Adjust your aim or curl.'));
              if (addToast) addToast('Wide');
            } else if (loc === 'blocked') {
              sfxCatch();
              tlAnnounce(__alloT('stem.throwlab.sr_blocked_by_the_wall_add_more_curl_or_arc', 'Blocked by the wall. Add more curl or arc.'));
              if (addToast) addToast('Wall block');
            } else {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_short_kick_didn_t_reach_the_goal_line', 'Short — kick didn\'t reach the goal line.'));
              if (addToast) addToast('Short');
            }
          } else if (d.mode === 'bowling') {
            if (loc === 'wicket') {
              sfxStrike(); sfxStrike();
              tlAnnounce('HOWZAT! Wicket — ball clattered into the stumps.' + describeShape(result));
              if (addToast) addToast('🏏 WICKET!');
              makeXP(10, 'Wicket taken');
              if (celebrate) celebrate();
            } else if (loc === 'shaved') {
              sfxStrike();
              tlAnnounce(__alloT('stem.throwlab.sr_bail_trembler_ball_just_clipped_the_stumps_count', 'Bail-trembler! Ball just clipped the stumps — count it.'));
              if (addToast) addToast('🏏 Bail-trembler');
              makeXP(7, 'Wicket (bail-shaver)');
            } else if (loc === 'bouncer') {
              sfxStrike();
              tlAnnounce(__alloT('stem.throwlab.sr_bouncer_chest_high', 'Bouncer! It bounced short and reached the batter at chest height.') + describeShape(result));
              if (addToast) addToast('🏏 Bouncer — chest high');
              makeXP(8, 'Bouncer bowled');
            } else if (loc === 'beamer') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_beamer_no_ball', 'Beamer. A full toss above the waist is a no-ball. Lower your aim.'));
              if (addToast) addToast('Beamer — no-ball');
            } else if (loc === 'overhead') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_over_the_bails_head_height_ball_is_a_no_ball_pena', 'Over the bails — head-height ball is a no-ball penalty in test cricket. Reduce launch angle.'));
              if (addToast) addToast('Overhead — no-ball');
            } else if (loc === 'wide') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_wide_outside_the_wide_line_adjust_your_line_tight', 'Wide. Outside the wide line — adjust your line tighter to off-stump.'));
              if (addToast) addToast('Wide call');
            } else if (loc === 'dot') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_dot_ball_passes_the_bat_without_hitting_stumps_de', 'Dot ball — passes the bat without hitting stumps. Defensible delivery.'));
              if (addToast) addToast('Dot ball');
            } else {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_short_of_a_length_ball_bounced_too_far_in_front_o_v2', 'It bounced twice before the batter. That is a no-ball. Add pace, or aim a little higher.'));
              if (addToast) addToast('Bounced twice');
            }
          } else if (d.mode === 'volleyball') {
            if (loc === 'ace') {
              sfxStrike(); sfxStrike();
              tlAnnounce('ACE! Serve landed in the deep corner — untouchable.' + describeShape(result));
              if (addToast) addToast('🏐 ACE!');
              makeXP(12, 'Service ace');
              if (celebrate) celebrate();
            } else if (loc === 'in') {
              sfxStrike();
              tlAnnounce(__alloT('stem.throwlab.sr_serve_in_receivable_but_landed_in_court_point_sta', 'Serve in. Receivable, but landed in court — point stays in play.'));
              if (addToast) addToast('🏐 In');
              makeXP(5, 'Serve in');
            } else if (loc === 'net') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_net_hit_the_tape_service_error_add_launch_angle_b', 'Net! Hit the tape — service error. Add launch angle by 2-4°.'));
              if (addToast) addToast('Net');
            } else if (loc === 'out') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_out_wide_of_the_sideline_adjust_horizontal_aim', 'Out wide of the sideline — adjust horizontal aim.'));
              if (addToast) addToast('Out');
            } else if (loc === 'long') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_long_past_the_back_line_reduce_speed_by_5_8_mph_o', 'Long — past the back line. Reduce speed by 5-8 mph or steepen launch slightly.'));
              if (addToast) addToast('Long');
            } else {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_short_landed_on_your_side_of_the_net_add_power', 'Short — landed on your side of the net. Add power.'));
              if (addToast) addToast('Short');
            }
          } else if (d.mode === 'golf') {
            if (loc === 'green') {
              sfxStrike(); sfxStrike();
              tlAnnounce('On the green! Pin-high approach.' + describeShape(result));
              if (addToast) addToast('⛳ ON THE GREEN!');
              makeXP(10, 'Green in regulation');
              if (celebrate) celebrate();
            } else if (loc === 'fairway') {
              sfxStrike();
              tlAnnounce(__alloT('stem.throwlab.sr_fairway_solid_strike_in_the_short_grass', 'Fairway! Solid strike, in the short grass.'));
              if (addToast) addToast('⛳ Fairway');
              makeXP(6, 'Fairway hit');
            } else if (loc === 'rough') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_in_the_rough_playable_but_the_next_shot_is_harder', 'In the rough. Playable, but the next shot is harder out of long grass.'));
              if (addToast) addToast('Rough');
            } else if (loc === 'woods') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_in_the_trees_way_off_line_check_your_horizontal_a', 'In the trees! Way off-line — check your horizontal aim or spin axis.'));
              if (addToast) addToast('Woods');
            } else if (loc === 'short') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_short_of_the_green_need_more_clubhead_speed_or_a', 'Short of the green. Need more clubhead speed or a longer club.'));
              if (addToast) addToast('Short');
            } else if (loc === 'long') {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_long_flew_the_green_same_club_ease_back_on_speed', 'Long — flew the green. Same club, ease back on speed by 5-10 mph.'));
              if (addToast) addToast('Over the green');
            } else {
              sfxBall();
              tlAnnounce(__alloT('stem.throwlab.sr_topped_or_shanked_barely_got_airborne', 'Topped or shanked — barely got airborne.'));
              if (addToast) addToast('Topped');
            }
          }
        }, revealMs + 60, 60);
      }

      // ── Scenario intro card (port of SkateLab SK3 pattern) ──────
      // When a famous-throw chip is clicked, applyScenario sets this so
      // a modal pops with the scenario's teach paragraph + discussion
      // questions, plus buttons to run it now or explore the controls
      // first. All scenarios already have rich `teach` text and most
      // have `questions` arrays — this surfaces what was previously
      // only visible as a hover tooltip.
      var scenarioIntroState = React.useState(null);
      var scenarioIntro = scenarioIntroState[0];
      var setScenarioIntro = scenarioIntroState[1];
      var scenarioDialogRef = React.useRef(null);
      var scenarioCloseRef = React.useRef(null);
      var scenarioOpenerRef = React.useRef(null);
      var fullscreenState = React.useState(false);
      var isWorkspaceFullscreen = fullscreenState[0];
      var setWorkspaceFullscreen = fullscreenState[1];
      // Optional Canvas 2D perspective view. Keeping this independent of WebGL
      // avoids a heavy runtime dependency while still providing spatial depth.
      var immersiveState = React.useState(false);
      var showImmersive3D = immersiveState[0];
      var setShowImmersive3D = immersiveState[1];
      var immersiveYawState = React.useState(-28);
      var immersiveYaw = immersiveYawState[0];
      var setImmersiveYaw = immersiveYawState[1];
      var immersivePitchState = React.useState(24);
      var immersivePitch = immersivePitchState[0];
      var setImmersivePitch = immersivePitchState[1];
      var immersiveGuidesState = React.useState(true);
      var showImmersiveGuides = immersiveGuidesState[0];
      var setShowImmersiveGuides = immersiveGuidesState[1];
      var immersiveTimeState = React.useState(false);
      var showImmersiveTimeMarkers = immersiveTimeState[0];
      var setShowImmersiveTimeMarkers = immersiveTimeState[1];
      var immersiveReferencesState = React.useState(true);
      var showImmersiveReferences = immersiveReferencesState[0];
      var setShowImmersiveReferences = immersiveReferencesState[1];
      var immersiveFollowState = React.useState(false);
      var followImmersiveBall = immersiveFollowState[0];
      var setFollowImmersiveBall = immersiveFollowState[1];
      var immersiveVectorState = React.useState({ velocity: true, gravity: false, wind: false, spin: false, magnus: false });
      var immersiveVectors = immersiveVectorState[0];
      var setImmersiveVectors = immersiveVectorState[1];
      var replaySpeedState = React.useState(1);
      var replaySpeed = replaySpeedState[0];
      var setReplaySpeed = replaySpeedState[1];
      var replayPausedState = React.useState(false);
      var replayPaused = replayPausedState[0];
      var setReplayPaused = replayPausedState[1];
      var immersiveVisibilityState = React.useState(true);
      var immersiveInView = immersiveVisibilityState[0];
      var setImmersiveInView = immersiveVisibilityState[1];
      var compactAnalysisState = React.useState(false);
      var compactAnalysis = compactAnalysisState[0];
      var setCompactAnalysis = compactAnalysisState[1];
      var immersiveCanvasRef = React.useRef(null);
      var immersiveDragRef = React.useRef(null);

      // Keep the fullscreen toggle's accessible name and pressed state in sync
      // even when fullscreen exits through Escape or the browser's own UI.
      React.useEffect(function() {
        function syncWorkspaceFullscreen() {
          var active = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
          setWorkspaceFullscreen(!!(active && active.id === 'throwlab-fs-workspace'));
        }
        var events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'];
        events.forEach(function(eventName) { document.addEventListener(eventName, syncWorkspaceFullscreen); });
        syncWorkspaceFullscreen();
        return function() {
          events.forEach(function(eventName) { document.removeEventListener(eventName, syncWorkspaceFullscreen); });
        };
      }, []);

      // ── Side-view canvas (Z = horizontal axis = mound→plate, Y = vertical) ──
      React.useEffect(function() {
        if (!showImmersive3D || !immersiveCanvasRef.current) return;
        var intersecting = true;
        function syncImmersiveVisibility() {
          setImmersiveInView(intersecting && (typeof document === 'undefined' || document.visibilityState !== 'hidden'));
        }
        function onVisibilityChange() { syncImmersiveVisibility(); }
        document.addEventListener('visibilitychange', onVisibilityChange);
        var observer = null;
        if (typeof IntersectionObserver === 'function') {
          observer = new IntersectionObserver(function(entries) {
            if (entries && entries[0]) { intersecting = entries[0].isIntersecting !== false; syncImmersiveVisibility(); }
          }, { rootMargin: '120px' });
          observer.observe(immersiveCanvasRef.current);
        } else syncImmersiveVisibility();
        return function() {
          document.removeEventListener('visibilitychange', onVisibilityChange);
          if (observer) observer.disconnect();
        };
      }, [showImmersive3D]);

      React.useEffect(function() {
        if (typeof window.matchMedia !== 'function') return;
        var query = window.matchMedia('(max-width: 1100px)');
        function syncCompactAnalysis(event) { setCompactAnalysis(!!event.matches); }
        syncCompactAnalysis(query);
        if (query.addEventListener) query.addEventListener('change', syncCompactAnalysis);
        else if (query.addListener) query.addListener(syncCompactAnalysis);
        return function() {
          if (query.removeEventListener) query.removeEventListener('change', syncCompactAnalysis);
          else if (query.removeListener) query.removeListener(syncCompactAnalysis);
        };
      }, []);

      var canvasRef = React.useRef(null);
      var tlViewState = React.useState(0);
      var tlViewTick = tlViewState[0];
      var setTlViewTick = tlViewState[1];
      React.useEffect(function() {
        var timer = null;
        function onResize() {
          if (timer) clearTimeout(timer);
          timer = setTimeout(function() { timer = null; setTlViewTick(function(n) { return n + 1; }); }, 150);
        }
        window.addEventListener('resize', onResize);
        return function() { window.removeEventListener('resize', onResize); if (timer) clearTimeout(timer); };
      }, []);
      // Pre-allocated zero-GC impact micro-burst pool (18 dust/turf/chalk particles)
      var impactPoolRef = React.useRef(null);
      var impactSeenRef = React.useRef(null);
      var impactSnapRef = React.useRef(null);
      if (!impactPoolRef.current) {
        var _pool = [];
        for (var _pi = 0; _pi < 18; _pi++) {
          _pool.push({ vx: 0, vy: 0, size: 1.8, alpha: 0.5, shade: 0, phase: (_pi / 18) * Math.PI * 2 });
        }
        impactPoolRef.current = _pool;
      }
      function _tlIsReducedMotion() {
        try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
      }
      function _tlIsHighContrast(node) {
        try {
          var root = document.documentElement;
          if (root && (root.classList.contains('theme-contrast') || root.getAttribute('data-theme') === 'high-contrast')) return true;
          if (node && typeof node.closest === 'function' && node.closest('.theme-contrast,[data-theme="high-contrast"]')) return true;
          if (document.querySelector && document.querySelector('main.theme-contrast')) return true;
          return !!(window.matchMedia && window.matchMedia('(forced-colors: active)').matches);
        } catch (e) { return false; }
      }
      function _tlSafeEllipse(ctx, x, y, rx, ry, rot, sa, ea) {
        if (typeof ctx.ellipse === 'function') {
          ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, sa || 0, ea == null ? Math.PI * 2 : ea);
        } else {
          ctx.save();
          ctx.translate(x, y);
          if (rot) ctx.rotate(rot);
          ctx.scale(Math.max(0.1, rx), Math.max(0.1, ry));
          ctx.arc(0, 0, 1, sa || 0, ea == null ? Math.PI * 2 : ea);
          ctx.restore();
        }
      }
      function closeScenarioIntro(focusCanvas) {
        setScenarioIntro(null);
        scheduleTl(function() {
          var target = focusCanvas ? canvasRef.current : scenarioOpenerRef.current;
          if (target && target.isConnected && typeof target.focus === 'function') target.focus();
        }, 0);
      }
      React.useEffect(function() {
        if (!scenarioIntro) return;
        var previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        var dialog = scenarioDialogRef.current;
        var closeButton = scenarioCloseRef.current;
        if (closeButton) closeButton.focus(); else if (dialog) dialog.focus();
        function onScenarioKeyDown(event) {
          if (event.key === 'Escape') {
            event.preventDefault();
            closeScenarioIntro(false);
            return;
          }
          if (event.key !== 'Tab' || !dialog) return;
          var selector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
          var focusable = Array.prototype.slice.call(dialog.querySelectorAll(selector)).filter(function(node) {
            return !node.hidden && node.getAttribute('aria-hidden') !== 'true';
          });
          if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
          var first = focusable[0];
          var last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
        document.addEventListener('keydown', onScenarioKeyDown);
        return function() {
          document.removeEventListener('keydown', onScenarioKeyDown);
          document.body.style.overflow = previousBodyOverflow;
        };
      }, [scenarioIntro]);
      // PL6: HiDPI canvas setup (same pattern as PlayLab _plSetupHiDPI).
      // Without this, the canvas renders at 720x360 internal pixels and
      // gets CSS-scaled up to fill container — text + curves blur on
      // retina displays. Resize the internal buffer to dpr * logical
      // dims, set CSS dims back to logical, and apply setTransform so
      // existing draw code operates in CSS px (no math changes needed).
      function _tlSetupHiDPI(canvas, logicalW, logicalH) {
        var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        if (!(canvas._tlDpr === dpr && canvas._tlLogicalW === logicalW && canvas._tlLogicalH === logicalH)) {
          canvas.width = Math.round(logicalW * dpr);
          canvas.height = Math.round(logicalH * dpr);
          // ★ Cap at the logical size instead of PINNING it. The element's own
          // style prop already says `width:'100%', height:'auto'` (the author
          // wanted a responsive canvas); pinning `style.width = '640px'` here
          // overrode that, so on a 640px viewport the canvas painted at 640
          // inside a 592px shell and spilled 38px past the tool column. On any
          // screen wide enough this is identical to before (max-width = 640);
          // below that the bitmap scales down uniformly, aspect kept. Safe: the
          // trajectory canvas is keyboard-driven and the 3D canvas drags by
          // clientX/clientY DELTAS, so neither maps pointer px to bitmap px.
          canvas.style.width = '100%';
          canvas.style.maxWidth = logicalW + 'px';
          canvas.style.height = 'auto';
          canvas.style.aspectRatio = logicalW + ' / ' + logicalH;
          canvas._tlDpr = dpr;
          canvas._tlLogicalW = logicalW;
          canvas._tlLogicalH = logicalH;
        }
        var ctx = null;
        try { ctx = canvas.getContext('2d'); } catch (e) { ctx = null; }
        if (!ctx) return null;
        if (typeof ctx.setTransform === 'function') ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
        return ctx;
      }
      React.useEffect(function() {
        var canvas = canvasRef.current; if (!canvas) return;
        var gfx = _tlSetupHiDPI(canvas, 640, 360);
        if (!gfx) return;
        var W = canvas._tlLogicalW;
        var H = canvas._tlLogicalH;
        var tlReduced = _tlIsReducedMotion();
        var tlHC = _tlIsHighContrast(canvas);
        gfx.clearRect(0, 0, W, H);
        // Text is drawn in bitmap pixels, so on a narrow screen it has to be drawn bigger to
        // come out at 12 px. lk is "bitmap pixels per screen pixel" (1 on a desktop).
        var tlShownW = 0;
        try { tlShownW = canvas.getBoundingClientRect().width; } catch (e) { tlShownW = 0; }
        var lk = tlShownW > 0 ? Math.min(1.9, Math.max(1, W / tlShownW)) : 1;
        function tlFont(px, weight) { return (weight ? weight + ' ' : '') + Math.round(Math.max(12, px) * lk) + 'px system-ui, sans-serif'; }

        var modeMeta = MODES[d.mode] || MODES.pitching;
        var displayTrial = d.lastResult && d.lastResult.trial ? d.lastResult.trial : buildTrialSnapshot(d, null);
        // FREE KICK uses a TOP-DOWN view (z forward / x lateral) so the curl
        // around the wall is visible. Pitching + Free Throw + Field Goal stay
        // side-view (z forward / y vertical) so the arc reads.
        var isTopDown = d.mode === 'freekick';
        // For field goal mode the goal line is preset-driven (20-60 yd).
        var fgGoalZ = d.mode === 'fieldgoal' ? (displayTrial.targetDistanceYd || 35) * 0.9144 : 0;
        // Layout
        var marginL = 40, marginR = 80, marginT = 30, marginB = 60;
        var fieldW = W - marginL - marginR;
        var fieldH = H - marginT - marginB;
        // Two rows of labels under the ground line. Baseball and cricket use the space for the
        // "seen from above" strip, so they get one row at the very bottom.
        var stripOn = d.mode === 'pitching' || d.mode === 'bowling';
        var tlRowA = stripOn ? H - 7 : marginT + fieldH + 9 + Math.round(12 * lk);
        var tlRowB = stripOn ? H - 7 : tlRowA + Math.round(14 * lk);
        var stripTop = marginT + fieldH + 6, stripH = 28, stripHalfM = 0.35;
        function stripY(x) { return stripTop + stripH / 2 - Math.max(-1, Math.min(1, x / stripHalfM)) * (stripH / 2 - 2); }
        // Render-window Z extent — pitching shows the full 60.5 ft, free throw
        // zooms in on the much shorter 15-ft court so the arc reads clearly,
        // free kick shows ~25m so the goal mouth fits with margin, field goal
        // adds ~5m beyond the goalposts so a missed-over kick is still visible.
        // Golf needs the longest renderMaxZ — driver carry is 250 yd ≈ 228 m,
        // plus a margin so the landing zone is visible past the carry point.
        var golfTargetZ = d.mode === 'golf' ? (function() {
          var p = GOLF_TYPES.find(function(g) { return g.id === displayTrial.shotKind; }) || GOLF_TYPES[0];
          return p.carryYd * 0.9144;
        })() : 0;
        var shotRim = d.mode === 'freethrow' ? shotRimZ(displayTrial.shotKind) : 0;
        var renderMaxZ = d.mode === 'pitching' ? modeMeta.targetZ
                       : d.mode === 'freekick' ? 25
                       : d.mode === 'fieldgoal' ? (fgGoalZ + 5)
                       : d.mode === 'bowling' ? modeMeta.targetZ
                       : d.mode === 'golf' ? (golfTargetZ + 30)
                       : d.mode === 'volleyball' ? (modeMeta.targetZ + 2)
                       : Math.max(6.5, shotRim + 2.3);
        // For top-down: maxB = lateral half-width × 2 ≈ 12m so a curling shot
        // with 1.5m of curl + the 7.32m goal both fit. Field goal apex can hit
        // 15m+ on a 60-yd kick so we need extra vertical room. Bowling stays
        // tight (~3m vertical) so the stumps are tall enough to read. Golf
        // apex can reach ~50 m on a wedge — needs the most vertical room.
        var maxB = isTopDown ? 6.0
                 : d.mode === 'pitching' ? 3.0
                 : d.mode === 'fieldgoal' ? 18
                 : d.mode === 'bowling' ? 3.2
                 : d.mode === 'golf' ? 60
                 : d.mode === 'volleyball' ? 6.0
                 : (shotRim > 8 ? 7.5 : shotRim > 5.3 ? 5.6 : 4.5);
        // For top-down, B is symmetrical around 0 (lateral X); we map [-maxB, +maxB] to canvas height.
        // For side-view, B is from 0 (ground) up to +maxB.
        // World (z, b) → canvas (px, py). b = y for side-view, b = x for top-down.
        function worldToCanvas(z, b) {
          var px = marginL + (z / renderMaxZ) * fieldW;
          var py;
          if (isTopDown) {
            // Center 0 vertically; +x maps to top of canvas, -x to bottom (so the
            // curling shot bending +X visually bends UP on screen).
            py = (marginT + fieldH / 2) - (b / maxB) * (fieldH / 2);
          } else {
            py = (marginT + fieldH) - (b / maxB) * fieldH;
          }
          return [px, py];
        }
        // Helper: pull the right "b" component from a sample for the active view.
        function sampleB(s) { return isTopDown ? s.x : s.y; }
        if (isTopDown) {
          // Top-down pitch view: rich mowed turf gradient + evening stadium floodlight pools
          var turfGrad = gfx.createLinearGradient(0, 0, 0, H);
          turfGrad.addColorStop(0, '#2a6220');
          turfGrad.addColorStop(0.5, '#3a7a26');
          turfGrad.addColorStop(1, '#26591d');
          gfx.fillStyle = turfGrad;
          gfx.fillRect(0, 0, W, H);
          // Mowing stripes for top-down readability — alternating bands
          gfx.fillStyle = 'rgba(255, 255, 255, 0.045)';
          for (var ms = 0; ms < W; ms += 60) gfx.fillRect(ms, 0, 30, H);
          // Subtle stadium corner floodlight pools
          if (typeof gfx.createRadialGradient === 'function') {
            [[0, 0], [W, 0], [0, H], [W, H]].forEach(function(pt) {
              var fg = gfx.createRadialGradient(pt[0], pt[1], 8, pt[0], pt[1], W * 0.42);
              fg.addColorStop(0, 'rgba(254, 249, 195, 0.14)');
              fg.addColorStop(0.5, 'rgba(186, 230, 253, 0.05)');
              fg.addColorStop(1, 'rgba(0, 0, 0, 0)');
              gfx.fillStyle = fg;
              gfx.fillRect(0, 0, W, H);
            });
          }
        } else {
          // Side view: rich stadium/field twilight sky gradient + floodlight ambiance + ground band
          var isIndoor = d.mode === 'freethrow' || d.mode === 'volleyball';
          var skyGrad = gfx.createLinearGradient(0, 0, 0, marginT + fieldH);
          if (isIndoor) {
            skyGrad.addColorStop(0, d.mode === 'volleyball' ? '#141c42' : '#1b171b');
            skyGrad.addColorStop(0.55, d.mode === 'volleyball' ? '#2c3975' : '#3a2d2b');
            skyGrad.addColorStop(1, d.mode === 'volleyball' ? '#4f5ea1' : '#634d3e');
          } else if (d.mode === 'golf') {
            skyGrad.addColorStop(0, '#0d2542');
            skyGrad.addColorStop(0.42, '#1f4e73');
            skyGrad.addColorStop(0.76, '#5c8ea8');
            skyGrad.addColorStop(1, '#d8a679');
          } else {
            // Evening stadium twilight (pitching, fieldgoal, bowling)
            skyGrad.addColorStop(0, '#0a162e');
            skyGrad.addColorStop(0.38, '#1b355c');
            skyGrad.addColorStop(0.74, '#435e87');
            skyGrad.addColorStop(1, '#c48365');
          }
          gfx.fillStyle = skyGrad;
          gfx.fillRect(0, 0, W, marginT + fieldH);

          // Stadium floodlight radial cones / indoor arena spotlights
          if (typeof gfx.createRadialGradient === 'function') {
            var lights = isIndoor ? [[W * 0.28, 12], [W * 0.72, 12]] : [[W * 0.18, 18], [W * 0.82, 18]];
            lights.forEach(function(lt) {
              var lg = gfx.createRadialGradient(lt[0], lt[1], 3, lt[0], lt[1], isIndoor ? 190 : 210);
              lg.addColorStop(0, isIndoor ? 'rgba(254, 243, 199, 0.26)' : 'rgba(254, 249, 195, 0.28)');
              lg.addColorStop(0.35, isIndoor ? 'rgba(251, 191, 36, 0.08)' : 'rgba(186, 230, 253, 0.10)');
              lg.addColorStop(1, 'rgba(0, 0, 0, 0)');
              gfx.fillStyle = lg;
              gfx.fillRect(0, 0, W, marginT + fieldH);
            });
            // Warm twilight horizon glow band for outdoor modes
            if (!isIndoor) {
              var horGlow = gfx.createRadialGradient(W * 0.52, marginT + fieldH, 10, W * 0.52, marginT + fieldH, W * 0.55);
              horGlow.addColorStop(0, 'rgba(251, 146, 60, 0.22)');
              horGlow.addColorStop(0.55, 'rgba(244, 114, 182, 0.06)');
              horGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
              gfx.fillStyle = horGlow;
              gfx.fillRect(0, marginT + fieldH * 0.35, W, fieldH * 0.65);
            }
          }

          // Distant stadium deck / treeline silhouette along the horizon
          gfx.fillStyle = isIndoor ? 'rgba(15, 23, 42, 0.22)' : 'rgba(15, 23, 42, 0.28)';
          gfx.beginPath();
          gfx.moveTo(0, marginT + fieldH);
          for (var sx = 0; sx <= W; sx += 32) {
            var sh = isIndoor
              ? 16 + ((sx / 32) % 2) * 5
              : (d.mode === 'golf' ? 10 + Math.sin(sx * 0.04) * 7 + Math.cos(sx * 0.09) * 4 : 18 + Math.sin(sx * 0.025) * 6);
            gfx.lineTo(sx, marginT + fieldH - sh);
          }
          gfx.lineTo(W, marginT + fieldH);
          gfx.closePath();
          gfx.fill();

          // Ground band with subtle depth gradient
          var gTopCol = d.mode === 'pitching' || d.mode === 'fieldgoal' ? '#3d8128' : d.mode === 'bowling' ? '#ad8253' : d.mode === 'golf' ? '#58a336' : d.mode === 'volleyball' ? '#be894f' : '#cc995d';
          var gBotCol = d.mode === 'pitching' || d.mode === 'fieldgoal' ? '#1f4b16' : d.mode === 'bowling' ? '#6d4c2c' : d.mode === 'golf' ? '#2e661d' : d.mode === 'volleyball' ? '#7a522a' : '#855c31';
          var gGrad = gfx.createLinearGradient(0, marginT + fieldH, 0, H);
          gGrad.addColorStop(0, gTopCol);
          gGrad.addColorStop(1, gBotCol);
          gfx.fillStyle = gGrad;
          gfx.fillRect(0, marginT + fieldH, W, H - (marginT + fieldH));
          // Horizon crisp rim line
          gfx.strokeStyle = isIndoor ? 'rgba(255,255,255,0.22)' : 'rgba(254, 243, 199, 0.28)';
          gfx.lineWidth = 1;
          gfx.beginPath(); gfx.moveTo(0, marginT + fieldH); gfx.lineTo(W, marginT + fieldH); gfx.stroke();
          if (d.mode === 'freethrow') {
            // Hardwood plank lines + soft arena floor sheen
            gfx.strokeStyle = 'rgba(0,0,0,0.18)';
            gfx.lineWidth = 1;
            for (var hp = 0; hp < W; hp += 22) {
              gfx.beginPath();
              gfx.moveTo(hp, marginT + fieldH);
              gfx.lineTo(hp, H);
              gfx.stroke();
            }
          }
        }

        if (d.mode === 'pitching') {
          var plateZ = modeMeta.targetZ;
          // Pitcher's mound (small bump on left)
          gfx.fillStyle = '#a16207';
          var moundPts = worldToCanvas(0, 0);
          gfx.beginPath();
          gfx.moveTo(moundPts[0] - 22, moundPts[1]);
          gfx.lineTo(moundPts[0] + 22, moundPts[1]);
          gfx.lineTo(moundPts[0] + 30, moundPts[1] + 10);
          gfx.lineTo(moundPts[0] - 30, moundPts[1] + 10);
          gfx.closePath();
          gfx.fill();
          // Home plate (white)
          gfx.fillStyle = '#ffffff';
          var plPts = worldToCanvas(plateZ, 0);
          gfx.fillRect(plPts[0] - 10, plPts[1] - 4, 20, 8);
          // Strike zone (dashed box ABOVE the plate)
          var szTop = worldToCanvas(plateZ, STRIKE_ZONE.yMax);
          var szBot = worldToCanvas(plateZ, STRIKE_ZONE.yMin);
          gfx.strokeStyle = '#fbbf24';
          gfx.lineWidth = 2;
          gfx.setLineDash([6, 4]);
          gfx.strokeRect(plPts[0] - 14, szTop[1], 28, szBot[1] - szTop[1]);
          gfx.setLineDash([]);
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = tlFont(12);
          gfx.textAlign = 'center';
          gfx.fillText(__alloT('stem.throwlab.canvas_from_above_pitching', 'Seen from above ↑ · 60 ft 6 in'), (moundPts[0] + plPts[0]) / 2, tlRowA);
          gfx.fillText('Mound', moundPts[0], tlRowA);
          gfx.fillText('Plate', plPts[0], tlRowB);
        } else if (d.mode === 'freethrow' && (function() {
          var sp = SHOT_TYPES.find(function(s) { return s.id === displayTrial.shotKind; });
          return sp && sp.kind === 'pass';
        })()) {
          // Passing court — passer on left, receiver silhouette on right at z=6m.
          // Same hardwood + plank lines from the free-throw scene; receiver is a
          // simple stick figure with a chest-band marker so students see the
          // target zone. The bounce-pass landing zone is shaded between
          // passer + receiver.
          var passReceiverZ = 6.0;
          var passerPts = worldToCanvas(0, 0);
          var receiverPts = worldToCanvas(passReceiverZ, 0);
          // Shaded bounce zone: at the current speed, height and spin, where a bounce pass can hit the
          // floor once and still be caught. From the model (bouncePassZone), not a fixed fraction.
          var bpZone = displayTrial.shotKind === 'bouncepass' ? bouncePassZone(d) : null;
          var bzStart = bpZone ? worldToCanvas(bpZone.zMin, 0) : null;
          var bzEnd = bpZone ? worldToCanvas(bpZone.zMax, 0) : null;
          if (bpZone) {
            gfx.fillStyle = 'rgba(251, 191, 36, 0.18)';
            gfx.fillRect(bzStart[0], bzStart[1] - 6, Math.max(4, bzEnd[0] - bzStart[0]), 12);
          }
          // Passer stick figure (you)
          gfx.strokeStyle = '#fbbf24';
          gfx.fillStyle = '#fbbf24';
          gfx.lineWidth = 2;
          var pHead = worldToCanvas(0, 1.7);
          var pHip = worldToCanvas(0, 1.0);
          var pFeet = worldToCanvas(0, 0);
          gfx.beginPath(); gfx.arc(pHead[0], pHead[1], 6, 0, Math.PI * 2); gfx.fill();
          gfx.beginPath();
          gfx.moveTo(pHead[0], pHead[1] + 6); gfx.lineTo(pHip[0], pHip[1]);
          gfx.moveTo(pHip[0], pHip[1]); gfx.lineTo(pFeet[0] - 6, pFeet[1]);
          gfx.moveTo(pHip[0], pHip[1]); gfx.lineTo(pFeet[0] + 6, pFeet[1]);
          gfx.stroke();
          // Receiver stick figure (teammate)
          gfx.strokeStyle = '#60a5fa';
          gfx.fillStyle = '#60a5fa';
          var rHead = worldToCanvas(passReceiverZ, 1.7);
          var rHip = worldToCanvas(passReceiverZ, 1.0);
          var rFeet = worldToCanvas(passReceiverZ, 0);
          gfx.beginPath(); gfx.arc(rHead[0], rHead[1], 6, 0, Math.PI * 2); gfx.fill();
          gfx.beginPath();
          gfx.moveTo(rHead[0], rHead[1] + 6); gfx.lineTo(rHip[0], rHip[1]);
          gfx.moveTo(rHip[0], rHip[1]); gfx.lineTo(rFeet[0] - 6, rFeet[1]);
          gfx.moveTo(rHip[0], rHip[1]); gfx.lineTo(rFeet[0] + 6, rFeet[1]);
          // Outstretched receiving arms (chest band marker)
          var rChestL = worldToCanvas(passReceiverZ - 0.4, 1.2);
          var rChestR = worldToCanvas(passReceiverZ + 0.4, 1.2);
          gfx.moveTo(rHip[0], pHead[1] + 8); gfx.lineTo(rChestL[0], rChestL[1]);
          gfx.moveTo(rHip[0], pHead[1] + 8); gfx.lineTo(rChestR[0], rChestR[1]);
          gfx.stroke();
          // Chest-band target zone (dashed box at receiver, y in [0.6, 1.6])
          var cbTop = worldToCanvas(passReceiverZ, 1.6);
          var cbBot = worldToCanvas(passReceiverZ, 0.6);
          gfx.strokeStyle = '#60a5fa';
          gfx.setLineDash([4, 3]);
          gfx.strokeRect(cbTop[0] - 12, cbTop[1], 24, cbBot[1] - cbTop[1]);
          gfx.setLineDash([]);
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = tlFont(12);
          gfx.textAlign = 'center';
          gfx.fillText('You', passerPts[0], tlRowA);
          gfx.fillText('6 m to teammate →', (passerPts[0] + receiverPts[0]) / 2, tlRowA);
          gfx.fillText('Teammate', receiverPts[0], tlRowB);
          if (displayTrial.shotKind === 'bouncepass') {
            gfx.fillStyle = 'rgba(251, 191, 36, 0.85)';
            if (bpZone) gfx.fillText('Bounce here', (bzStart[0] + bzEnd[0]) / 2, bzStart[1] - 12);
            else gfx.fillText('No launch angle works at this speed', (passerPts[0] + receiverPts[0]) / 2, passerPts[1] - 12);
          }
        } else if (d.mode === 'freethrow') {
          // Free Throw rendering: shooter on left, hoop + backboard on right
          var rimZ = shotRim || modeMeta.rimZ;
          var boardZ = rimZ + (modeMeta.backboardZ - modeMeta.rimZ);
          var ftLineZ = boardZ;
          var rimY = modeMeta.rimY;
          var rimRadius = modeMeta.rimRadius;
          // Free throw line marker on the floor
          var ftLinePts = worldToCanvas(0, 0);
          var ftPlPts = worldToCanvas(ftLineZ, 0);
          gfx.strokeStyle = '#fafafa';
          gfx.lineWidth = 2;
          gfx.beginPath();
          gfx.moveTo(ftLinePts[0] - 18, ftLinePts[1]);
          gfx.lineTo(ftLinePts[0] + 18, ftLinePts[1]);
          gfx.stroke();
          // Backboard (white rectangle behind rim)
          var bbBot = worldToCanvas(boardZ, rimY - 0.30);
          var bbTop = worldToCanvas(boardZ, rimY + 1.05);
          gfx.fillStyle = '#fafafa';
          gfx.fillRect(bbBot[0] - 1, bbTop[1], 6, bbBot[1] - bbTop[1]);
          // Backboard square (small painted target on glass)
          gfx.strokeStyle = '#dc2626';
          gfx.lineWidth = 2;
          var sqL = worldToCanvas(boardZ - 0.01, rimY + 0.45);
          var sqR = worldToCanvas(boardZ - 0.01, rimY + 0.05);
          gfx.strokeRect(sqL[0] - 12, sqL[1], 24, sqR[1] - sqL[1]);
          // Rim (orange horizontal bar at rim height) + net hash
          var rimLeft = worldToCanvas(rimZ - rimRadius, rimY);
          var rimRight = worldToCanvas(rimZ + rimRadius, rimY);
          gfx.strokeStyle = '#f97316';
          gfx.lineWidth = 4;
          gfx.beginPath();
          gfx.moveTo(rimLeft[0], rimLeft[1]);
          gfx.lineTo(rimRight[0], rimRight[1]);
          gfx.stroke();
          // Net (dashed lines hanging down from rim)
          gfx.strokeStyle = 'rgba(255,255,255,0.7)';
          gfx.lineWidth = 1;
          gfx.setLineDash([3, 3]);
          var netBot = worldToCanvas(rimZ, rimY - 0.35);
          gfx.beginPath();
          gfx.moveTo(rimLeft[0], rimLeft[1]); gfx.lineTo(netBot[0] - 4, netBot[1]);
          gfx.moveTo(rimRight[0], rimRight[1]); gfx.lineTo(netBot[0] + 4, netBot[1]);
          gfx.moveTo((rimLeft[0] + rimRight[0]) / 2, rimLeft[1]); gfx.lineTo(netBot[0], netBot[1]);
          gfx.stroke();
          gfx.setLineDash([]);
          // Pole (gray vertical from floor to backboard top)
          gfx.fillStyle = '#475569';
          var poleX = bbTop[0] + 6;
          var poleBot = worldToCanvas(boardZ, 0);
          gfx.fillRect(poleX, bbTop[1], 4, poleBot[1] - bbTop[1]);
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = tlFont(12);
          gfx.textAlign = 'center';
          var isFtShot = displayTrial.shotKind === 'freethrow';
          gfx.fillText(isFtShot ? 'FT line' : 'Shooter', ftLinePts[0], tlRowA);
          gfx.fillText(isFtShot ? '15 ft to backboard →' : (rimZ.toFixed(1) + ' m to the hoop →'), (ftLinePts[0] + ftPlPts[0]) / 2, tlRowA);
          gfx.fillText('Hoop', ftPlPts[0], tlRowB);
        } else if (d.mode === 'fieldgoal') {
          // Side-view field goal scene: kicker on left (z=0), goalposts at fgGoalZ.
          // Hash-marked field every 10 yards so distance reads at a glance.
          var hashCb = modeMeta.crossbarHeight;
          // Hash marks on the field (every 10 yd, in m: 10yd ≈ 9.14m)
          gfx.fillStyle = 'rgba(255,255,255,0.4)';
          gfx.font = tlFont(12);
          gfx.textAlign = 'center';
          for (var hyd = 10; hyd < displayTrial.targetDistanceYd + 6; hyd += 10) {
            var hzm = hyd * 0.9144;
            if (hzm > renderMaxZ) break;
            var hpos = worldToCanvas(hzm, 0);
            // The tick must end above the label: on a phone it ran through the text ("10'yd").
            var hTickTop = hpos[1] - 4;
            var hTickBot = Math.min(hpos[1] + 4, tlRowA - Math.round(12 * lk) - 3);
            if (hTickBot > hTickTop) gfx.fillRect(hpos[0] - 0.5, hTickTop, 1, hTickBot - hTickTop);
            gfx.fillText(hyd + ' yd', hpos[0], tlRowA);
          }
          // Tee + ball spot at z=0
          var teePts = worldToCanvas(0, 0);
          gfx.fillStyle = '#fef3c7';
          gfx.beginPath(); _tlSafeEllipse(gfx, teePts[0], teePts[1], 6, 3, 0, 0, Math.PI * 2); gfx.fill();
          // Goalposts: vertical uprights at fgGoalZ rising to (canvas) above crossbar.
          // Side view: only one upright is visible from the side, but we draw a small
          // depth offset so both posts read as a "Y" frame.
          var postBase = worldToCanvas(fgGoalZ, 0);
          var crossbar = worldToCanvas(fgGoalZ, hashCb);
          var postTop = worldToCanvas(fgGoalZ, hashCb + 4);
          gfx.strokeStyle = '#fde047';
          gfx.lineWidth = 4;
          gfx.beginPath();
          // Single base post (gooseneck base)
          gfx.moveTo(postBase[0], postBase[1]); gfx.lineTo(crossbar[0], crossbar[1]);
          // Crossbar (a short horizontal stub since this is side view; the whole
          // crossbar + uprights extend toward + away from the camera)
          gfx.moveTo(crossbar[0] - 14, crossbar[1]); gfx.lineTo(crossbar[0] + 14, crossbar[1]);
          // Two uprights rising from the crossbar (front + back)
          gfx.moveTo(crossbar[0] - 14, crossbar[1]); gfx.lineTo(crossbar[0] - 14, postTop[1]);
          gfx.moveTo(crossbar[0] + 14, crossbar[1]); gfx.lineTo(crossbar[0] + 14, postTop[1]);
          gfx.stroke();
          // Crossbar height label (10 ft)
          gfx.fillStyle = '#fde047';
          gfx.font = tlFont(12);
          gfx.textAlign = 'right';
          gfx.fillText('10 ft →', crossbar[0] - 18, crossbar[1] + 3);
          // Distance label (centered between tee + posts)
          gfx.fillStyle = '#cbd5e1';
          gfx.font = tlFont(12);
          gfx.textAlign = 'center';
          gfx.fillText(displayTrial.targetDistanceYd + ' yd kick', (teePts[0] + postBase[0]) / 2, tlRowB);
        } else if (d.mode === 'freekick') {
          // Top-down free-kick scene: ball at left (z=0), wall at z=9.15m,
          // goal at z=22m. Centerline = canvas vertical center.
          var goalLineZ = modeMeta.targetZ;
          // Pitch markings — penalty area arc and centerline
          gfx.strokeStyle = 'rgba(255,255,255,0.55)';
          gfx.lineWidth = 1;
          // Centerline (helps reading lateral curve)
          var cl = worldToCanvas(0, 0);
          var clEnd = worldToCanvas(renderMaxZ, 0);
          gfx.setLineDash([4, 4]);
          gfx.beginPath();
          gfx.moveTo(cl[0], cl[1]); gfx.lineTo(clEnd[0], clEnd[1]);
          gfx.stroke();
          gfx.setLineDash([]);
          // Ball spot (small white circle at z=0, x=0)
          var ballSpot = worldToCanvas(0, 0);
          gfx.fillStyle = '#fafafa';
          gfx.beginPath(); gfx.arc(ballSpot[0], ballSpot[1], 4, 0, Math.PI * 2); gfx.fill();
          // Defender wall — 4 silhouettes shoulder-to-shoulder at z = wallZ.
          // Each defender ~ 0.5m wide; total wall ~ 2m (centered).
          var wallLeftEdge = worldToCanvas(modeMeta.wallZ, -modeMeta.wallHalfWidth);
          var wallRightEdge = worldToCanvas(modeMeta.wallZ, modeMeta.wallHalfWidth);
          gfx.fillStyle = '#1e293b';
          gfx.fillRect(wallLeftEdge[0] - 2, wallRightEdge[1], 4, wallLeftEdge[1] - wallRightEdge[1]);
          // Defender heads (4 small circles along the wall)
          gfx.fillStyle = '#cbd5e1';
          for (var di = 0; di < 4; di++) {
            var dt = (di + 0.5) / 4;
            var dx = -modeMeta.wallHalfWidth + dt * (modeMeta.wallHalfWidth * 2);
            var dpos = worldToCanvas(modeMeta.wallZ, dx);
            gfx.beginPath(); gfx.arc(dpos[0], dpos[1], 5, 0, Math.PI * 2); gfx.fill();
          }
          // Goal mouth — white posts at z=22m, x=±3.66m (FIFA goal)
          var postL = worldToCanvas(goalLineZ, -modeMeta.goalHalfWidth);
          var postR = worldToCanvas(goalLineZ, modeMeta.goalHalfWidth);
          gfx.strokeStyle = '#fafafa';
          gfx.lineWidth = 4;
          gfx.beginPath();
          gfx.moveTo(postL[0], postL[1] - 12); gfx.lineTo(postL[0], postL[1] + 12);
          gfx.moveTo(postR[0], postR[1] - 12); gfx.lineTo(postR[0], postR[1] + 12);
          // Crossbar (between posts, drawn as a single horizontal line on top-down)
          gfx.moveTo(postL[0], postL[1]); gfx.lineTo(postR[0], postR[1]);
          gfx.stroke();
          // Net (subtle hatch behind the goal line)
          gfx.strokeStyle = 'rgba(255,255,255,0.25)';
          gfx.lineWidth = 1;
          for (var nh = -2; nh <= 2; nh++) {
            var nh1 = worldToCanvas(goalLineZ, nh * 1.5);
            var nh2 = worldToCanvas(goalLineZ + 1.5, nh * 1.5);
            gfx.beginPath(); gfx.moveTo(nh1[0], nh1[1]); gfx.lineTo(nh2[0], nh2[1]); gfx.stroke();
          }
          // Distance + label
          gfx.fillStyle = '#fafafa';
          gfx.font = tlFont(12);
          gfx.textAlign = 'center';
          gfx.fillText('Ball', ballSpot[0], ballSpot[1] + 16);
          gfx.fillText('Wall (10 yd)', (wallLeftEdge[0] + wallRightEdge[0]) / 2, tlRowA);
          gfx.fillText('Goal — 7.32 m wide', (postL[0] + postR[0]) / 2, tlRowA);
        } else if (d.mode === 'volleyball') {
          // Volleyball court (side view): server's line at z=0, net at z=9m,
          // far end-line at z=18m. Receiving court (z=9 to z=18) shaded
          // light blue. Ace zone (deep ~15% of court) shaded brighter.
          var serverPts = worldToCanvas(0, 0);
          var netBase = worldToCanvas(modeMeta.netZ, 0);
          var netTop = worldToCanvas(modeMeta.netZ, modeMeta.netHeight);
          var farLine = worldToCanvas(modeMeta.targetZ, 0);
          var aceStart = worldToCanvas(modeMeta.targetZ - (modeMeta.targetZ - modeMeta.netZ) * 0.15, 0);
          // Receiving court band — light blue
          gfx.fillStyle = 'rgba(96,165,250,0.20)';
          gfx.fillRect(netBase[0], netBase[1] - 3, farLine[0] - netBase[0], 6);
          // Ace zone (deep section, brighter)
          gfx.fillStyle = 'rgba(34,197,94,0.30)';
          gfx.fillRect(aceStart[0], aceStart[1] - 4, farLine[0] - aceStart[0], 8);
          // Net (vertical line) + tape at the top
          gfx.strokeStyle = '#1a1a1a';
          gfx.lineWidth = 2;
          gfx.beginPath();
          gfx.moveTo(netBase[0], netBase[1]); gfx.lineTo(netTop[0], netTop[1]);
          gfx.stroke();
          gfx.fillStyle = '#fafafa';
          gfx.fillRect(netTop[0] - 3, netTop[1] - 2, 6, 4);
          // Server's end-line + far end-line (white floor markings)
          gfx.strokeStyle = '#fafafa';
          gfx.lineWidth = 2;
          gfx.beginPath();
          gfx.moveTo(serverPts[0] - 14, serverPts[1]); gfx.lineTo(serverPts[0] + 14, serverPts[1]);
          gfx.moveTo(farLine[0] - 14, farLine[1]); gfx.lineTo(farLine[0] + 14, farLine[1]);
          gfx.stroke();
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = tlFont(12);
          gfx.textAlign = 'center';
          gfx.fillText('Server', serverPts[0], tlRowA);
          gfx.fillText('Net (2.43 m)', netBase[0], tlRowA);
          gfx.fillText('End line', farLine[0], tlRowA);
          gfx.fillStyle = 'rgba(34,197,94,0.85)';
          gfx.font = tlFont(12);
          gfx.fillText('Ace zone', (aceStart[0] + farLine[0]) / 2, aceStart[1] - 8);
        } else if (d.mode === 'golf') {
          // Golf side view: tee on left at z=0, fairway zone (light green
          // band) from ~75% target distance to the green, flagstick at the
          // exact target carry distance. Layered rings shade out into the
          // rough at the edges of the fairway. We draw the green as a
          // small disc and put a flag on top of it.
          var teePts = worldToCanvas(0, 0);
          // Tee marker (small triangle peg + ball on top)
          gfx.fillStyle = '#fef3c7';
          gfx.beginPath();
          gfx.moveTo(teePts[0] - 4, teePts[1] + 2);
          gfx.lineTo(teePts[0] + 4, teePts[1] + 2);
          gfx.lineTo(teePts[0], teePts[1] - 4);
          gfx.closePath();
          gfx.fill();
          gfx.fillStyle = '#fafafa';
          gfx.beginPath();
          gfx.arc(teePts[0], teePts[1] - 6, 3, 0, Math.PI * 2);
          gfx.fill();
          // Fairway zone: from ~10% to 100% of target distance, shaded brighter green
          var fwStart = worldToCanvas(golfTargetZ * 0.10, 0);
          var fwEnd = worldToCanvas(golfTargetZ + 13.7, 0); // +15 yd past target = top of fairway
          gfx.fillStyle = 'rgba(95, 168, 58, 0.55)';
          gfx.fillRect(fwStart[0], fwStart[1] - 4, fwEnd[0] - fwStart[0], 8);
          // Green disc at target distance — circular blob in plan, drawn as
          // a flat ellipse here (since side view) of radius ~4.5 m
          var greenCenter = worldToCanvas(golfTargetZ, 0);
          gfx.fillStyle = '#86efac';
          gfx.beginPath();
          _tlSafeEllipse(gfx, greenCenter[0], greenCenter[1], 14, 5, 0, 0, Math.PI * 2);
          gfx.fill();
          // Flagstick (vertical pole with red triangular flag)
          var flagBase = worldToCanvas(golfTargetZ, 0);
          var flagTop = worldToCanvas(golfTargetZ, 2.1);
          gfx.strokeStyle = '#fafafa';
          gfx.lineWidth = 1.5;
          gfx.beginPath();
          gfx.moveTo(flagBase[0], flagBase[1]); gfx.lineTo(flagTop[0], flagTop[1]);
          gfx.stroke();
          gfx.fillStyle = '#dc2626';
          gfx.beginPath();
          gfx.moveTo(flagTop[0], flagTop[1]);
          gfx.lineTo(flagTop[0] + 14, flagTop[1] + 4);
          gfx.lineTo(flagTop[0], flagTop[1] + 8);
          gfx.closePath();
          gfx.fill();
          // Distance markers — every 50 yards from tee, faint dashed verticals
          gfx.strokeStyle = 'rgba(255,255,255,0.20)';
          gfx.setLineDash([2, 4]);
          gfx.lineWidth = 1;
          var distMarks = [50, 100, 150, 200, 250];
          for (var dm = 0; dm < distMarks.length; dm++) {
            var dz = distMarks[dm] * 0.9144;
            if (dz > golfTargetZ + 25) break;
            var dpTop = worldToCanvas(dz, maxB * 0.5);
            var dpBot = worldToCanvas(dz, 0);
            gfx.beginPath();
            gfx.moveTo(dpTop[0], dpTop[1]); gfx.lineTo(dpBot[0], dpBot[1]);
            gfx.stroke();
            gfx.fillStyle = 'rgba(203, 213, 225, 0.6)';
            gfx.font = tlFont(12);
            gfx.textAlign = 'center';
            gfx.fillText(distMarks[dm] + 'y', dpTop[0], dpTop[1] - 4);
          }
          gfx.setLineDash([]);
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = tlFont(12);
          gfx.textAlign = 'center';
          gfx.fillText('Tee', teePts[0], tlRowA);
          gfx.fillText(Math.round(golfTargetZ / 0.9144) + ' yd target →', (teePts[0] + greenCenter[0]) / 2, tlRowA);
          gfx.fillStyle = '#86efac';
          gfx.fillText('Green', greenCenter[0], tlRowB);
        } else if (d.mode === 'bowling') {
          // Cricket pitch (side view): bowler's crease at z=0, batter's stumps
          // at z=20.12. Brown rectangle for the pitch strip ("the wicket").
          // Stumps drawn as 3 vertical sticks at the far end (71 cm tall).
          // "Good length" zone shaded between the bowler and batter — that's
          // where you WANT to pitch the ball for a good delivery.
          var pitchEnd = worldToCanvas(modeMeta.targetZ, 0);
          var bowlerCrease = worldToCanvas(0, 0);
          // "Good length" zone: 5-8 m from the batter's stumps = 12-15 m from bowler.
          // (Pitching the ball there = ball reaches batter at knee/thigh height.)
          var goodLenStart = worldToCanvas(modeMeta.targetZ - 7, 0);
          var goodLenEnd = worldToCanvas(modeMeta.targetZ - 3.5, 0);
          // Pitch strip — slightly darker than the surrounding ground
          gfx.fillStyle = '#7a5837';
          gfx.fillRect(bowlerCrease[0], bowlerCrease[1] - 3, pitchEnd[0] - bowlerCrease[0], 6);
          // Good-length zone shading
          gfx.fillStyle = 'rgba(251, 191, 36, 0.22)';
          gfx.fillRect(goodLenStart[0], goodLenStart[1] - 6, goodLenEnd[0] - goodLenStart[0], 12);
          // Bowler's popping crease (white horizontal mark at z=0)
          gfx.strokeStyle = '#fafafa';
          gfx.lineWidth = 2;
          gfx.beginPath();
          gfx.moveTo(bowlerCrease[0] - 14, bowlerCrease[1]);
          gfx.lineTo(bowlerCrease[0] + 14, bowlerCrease[1]);
          gfx.stroke();
          // Batter's popping crease at z=targetZ-1.22 (the 4-foot batter zone)
          var batterCrease = worldToCanvas(modeMeta.targetZ - 1.22, 0);
          gfx.beginPath();
          gfx.moveTo(batterCrease[0] - 14, batterCrease[1]);
          gfx.lineTo(batterCrease[0] + 14, batterCrease[1]);
          gfx.stroke();
          // Stumps at z=targetZ — three vertical sticks rising 71.1 cm
          var stumpsTop = worldToCanvas(modeMeta.targetZ, modeMeta.stumpsHeight);
          gfx.strokeStyle = '#e5e5e5';
          gfx.lineWidth = 3;
          gfx.beginPath();
          gfx.moveTo(pitchEnd[0] - 6, pitchEnd[1]); gfx.lineTo(pitchEnd[0] - 6, stumpsTop[1]);
          gfx.moveTo(pitchEnd[0],     pitchEnd[1]); gfx.lineTo(pitchEnd[0],     stumpsTop[1]);
          gfx.moveTo(pitchEnd[0] + 6, pitchEnd[1]); gfx.lineTo(pitchEnd[0] + 6, stumpsTop[1]);
          gfx.stroke();
          // Bails on top — two thin horizontal lines bridging the stumps
          gfx.strokeStyle = '#d4a574';
          gfx.lineWidth = 1.5;
          gfx.beginPath();
          gfx.moveTo(pitchEnd[0] - 7, stumpsTop[1]); gfx.lineTo(pitchEnd[0] + 1, stumpsTop[1]);
          gfx.moveTo(pitchEnd[0] - 1, stumpsTop[1]); gfx.lineTo(pitchEnd[0] + 7, stumpsTop[1]);
          gfx.stroke();
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = tlFont(12);
          gfx.textAlign = 'center';
          gfx.fillText('Bowler', bowlerCrease[0], tlRowA);
          gfx.fillText(__alloT('stem.throwlab.canvas_from_above_bowling', 'Seen from above ↑ · 22 yd pitch'), (bowlerCrease[0] + pitchEnd[0]) / 2, tlRowA);
          gfx.fillText('Stumps', pitchEnd[0], tlRowB);
          gfx.fillStyle = 'rgba(251, 191, 36, 0.85)';
          gfx.font = tlFont(12);
          gfx.fillText('Good length', (goodLenStart[0] + goodLenEnd[0]) / 2, goodLenStart[1] - 10);
        }

        // ── "Seen from above" strip (baseball and cricket) ──
        // The side view cannot show sideways movement, and sideways movement is the whole story
        // of a slider, a knuckleball or a spin bowler's turn. The strip is the same throw from
        // above, lined up with the picture: 0.7 m wide, the thrower's left at the top.
        if (stripOn) {
          var stL = worldToCanvas(0, 0)[0], stR = worldToCanvas(modeMeta.targetZ, 0)[0];
          gfx.save();
          gfx.fillStyle = tlHC ? '#000000' : 'rgba(2,6,23,0.62)';
          gfx.strokeStyle = tlHC ? '#ffffff' : 'rgba(226,232,240,0.45)';
          gfx.lineWidth = 1;
          gfx.beginPath();
          if (typeof gfx.roundRect === 'function') gfx.roundRect(stL - 6, stripTop, stR - stL + 16, stripH, 5); else gfx.rect(stL - 6, stripTop, stR - stL + 16, stripH);
          gfx.fill(); gfx.stroke();
          // the straight line from the hand to the middle of the target
          gfx.setLineDash([3, 4]);
          gfx.strokeStyle = tlHC ? '#ffffff' : 'rgba(226,232,240,0.38)';
          gfx.beginPath(); gfx.moveTo(stL, stripY(0)); gfx.lineTo(stR, stripY(0)); gfx.stroke();
          gfx.setLineDash([]);
          // the width of the target: the strike zone, or the three stumps
          var tgtHalf = d.mode === 'pitching' ? STRIKE_ZONE.xMax : modeMeta.stumpsHalfWidth;
          gfx.strokeStyle = tlHC ? '#ffff00' : '#fbbf24';
          gfx.lineWidth = 4;
          gfx.beginPath(); gfx.moveTo(stR, stripY(tgtHalf)); gfx.lineTo(stR, stripY(-tgtHalf)); gfx.stroke();
          gfx.restore();
        }

        // ── Wind indicator (outdoor modes only, when wind is on) ──
        // A small card with an arrow and the speed. It sits under the fullscreen button (44 px
        // on screen) so the two never overlap, and it grows with the label scale.
        if ((d.mode === 'freekick' || d.mode === 'fieldgoal' || d.mode === 'bowling' || d.mode === 'golf') && (displayTrial.windMph || 0) > 0) {
          var wk = Math.min(1.5, lk);
          var wIndW = Math.round(64 * wk), wIndH = Math.round(64 * wk);
          var wcx = W - 8 - wIndW / 2;
          var wcy = Math.round(56 * lk) + 8 + wIndH / 2;
          wIndW = Math.round(96 * wk); wcx = W - 8 - wIndW / 2;
          gfx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          gfx.strokeStyle = tlHC ? '#ffffff' : '#475569';
          gfx.lineWidth = 1;
          gfx.beginPath();
          if (typeof gfx.roundRect === 'function') gfx.roundRect(wcx - wIndW / 2, wcy - wIndH / 2, wIndW, wIndH, 6); else gfx.rect(wcx - wIndW / 2, wcy - wIndH / 2, wIndW, wIndH);
          gfx.fill(); gfx.stroke();
          // 0° is a headwind (blowing toward the thrower), 180° a tailwind, 90° blows to the thrower's left.
          var wDeg = ((Number(displayTrial.windDirDeg) || 0) % 360 + 360) % 360;
          var wSin = Math.sin(wDeg * Math.PI / 180), wCos = Math.cos(wDeg * Math.PI / 180);
          // From above every direction can be drawn. In a side view a crosswind blows into or out
          // of the picture, so it is named in words instead of being drawn as an arrow pointing up.
          var wCross = Math.abs(wSin) > 0.5;
          var wWord = wCross ? (wSin > 0 ? 'to your left' : 'to your right') : (wCos > 0 ? 'headwind' : 'tailwind');
          gfx.fillStyle = '#e2e8f0';
          gfx.textAlign = 'center';
          gfx.font = 'bold ' + Math.round(12 * wk) + 'px system-ui, sans-serif';
          gfx.fillText('Wind ' + displayTrial.windMph + ' mph', wcx, wcy - wIndH / 2 + Math.round(15 * wk));
          gfx.font = Math.round(12 * wk) + 'px system-ui, sans-serif';
          gfx.fillText(wWord, wcx, wcy + wIndH / 2 - Math.round(7 * wk));
          gfx.strokeStyle = tlHC ? '#ffff00' : '#60a5fa';
          gfx.fillStyle = tlHC ? '#ffff00' : '#60a5fa';
          gfx.lineWidth = 2.5;
          var wMidY = wcy + Math.round(2 * wk);
          if (wCross && !isTopDown) {
            var wR = Math.round(7 * wk);
            gfx.beginPath(); gfx.arc(wcx, wMidY, wR, 0, Math.PI * 2); gfx.stroke();
            gfx.beginPath();
            gfx.moveTo(wcx - wR * 0.6, wMidY - wR * 0.6); gfx.lineTo(wcx + wR * 0.6, wMidY + wR * 0.6);
            gfx.moveTo(wcx + wR * 0.6, wMidY - wR * 0.6); gfx.lineTo(wcx - wR * 0.6, wMidY + wR * 0.6);
            gfx.stroke();
          } else {
            var arx = -wCos, ary = isTopDown ? -wSin : 0;
            var arN = Math.sqrt(arx * arx + ary * ary) || 1; arx /= arN; ary /= arN;
            var arLen = Math.round(22 * wk), ahead = arLen / 2, perpX = -ary, perpY = arx;
            gfx.beginPath();
            gfx.moveTo(wcx - arx * ahead, wMidY - ary * ahead);
            gfx.lineTo(wcx + arx * ahead, wMidY + ary * ahead);
            gfx.stroke();
            gfx.beginPath();
            gfx.moveTo(wcx + arx * (ahead + 3), wMidY + ary * (ahead + 3));
            gfx.lineTo(wcx + arx * (ahead - 5) + perpX * 5, wMidY + ary * (ahead - 5) + perpY * 5);
            gfx.lineTo(wcx + arx * (ahead - 5) - perpX * 5, wMidY + ary * (ahead - 5) - perpY * 5);
            gfx.closePath();
            gfx.fill();
          }
        }

        // ── Saved REFERENCE trajectories (multi-ghost Compare Mode) ──
        // Drawn FIRST so they sit behind the current trajectory + no-spin
        // guide. Each ghost gets its own color from the saved entry; the
        // tag is "REF1" / "REF2" / etc. so students can map the colored
        // line to the entry in the saved list. Backwards compat: if no
        // referenceList but a legacy referenceResult exists, render that.
        var refList = activeReferenceList();
        refList.forEach(function(ref, refIdx) {
          var rrSamples = ref.result && ref.result.samples;
          if (!rrSamples || rrSamples.length < 2) return;
          gfx.strokeStyle = ref.color || '#d946ef';
          gfx.globalAlpha = 0.55;
          gfx.lineWidth = 2;
          gfx.setLineDash([6, 5]);
          gfx.beginPath();
          for (var ri = 0; ri < rrSamples.length; ri++) {
            var rs = rrSamples[ri];
            if (rs.z > renderMaxZ + 0.5) break;
            var rp = worldToCanvas(rs.z, sampleB(rs));
            if (ri === 0) gfx.moveTo(rp[0], rp[1]); else gfx.lineTo(rp[0], rp[1]);
          }
          gfx.stroke();
          gfx.setLineDash([]);
          gfx.globalAlpha = 1.0;
          // "REF1" / "REF2" tag near the trajectory's end-of-render point
          var lastRef = rrSamples[rrSamples.length - 1];
          for (var rj = rrSamples.length - 1; rj >= 0; rj--) {
            if (rrSamples[rj].z <= renderMaxZ + 0.5) { lastRef = rrSamples[rj]; break; }
          }
          var refTagPos = worldToCanvas(lastRef.z, sampleB(lastRef));
          gfx.fillStyle = ref.color || '#d946ef';
          gfx.font = tlFont(12, 'bold');
          gfx.textAlign = 'left';
          gfx.fillText('REF' + (refIdx + 1), refTagPos[0] + 6, refTagPos[1] + 3);
        });

        // Athletes: simple side-view figures drawn in world meters (feet at z, standing `tall`
        // meters high), with the throwing arm reaching the real release point so the ball
        // visibly leaves the hand. Static shapes: nothing here moves, so reduced motion is unaffected.
        if (!isTopDown) {
          var drawFigure = function(zFeet, tall, hand, faint) {
            var feet = worldToCanvas(zFeet, 0), top = worldToCanvas(zFeet, tall);
            var hpx = feet[1] - top[1];
            if (!(hpx > 5)) return;
            var headR = Math.max(1.6, hpx * 0.07);
            var lean = hand ? Math.max(-hpx * 0.12, Math.min(hpx * 0.12, (worldToCanvas(hand[0], 0)[0] - feet[0]) * 0.25)) : 0;
            var hipX = feet[0], hipY = feet[1] - hpx * 0.48;
            var shX = feet[0] + lean, shY = top[1] + headR * 2 + hpx * 0.06;
            gfx.save();
            gfx.lineCap = 'round'; gfx.lineJoin = 'round';
            gfx.globalAlpha = tlHC ? 1 : (faint ? 0.4 : 0.9);
            gfx.strokeStyle = tlHC ? '#ffffff' : '#e2e8f0';
            gfx.fillStyle = tlHC ? '#ffffff' : '#e2e8f0';
            gfx.lineWidth = Math.max(1.6, hpx * 0.055);
            gfx.beginPath();
            gfx.moveTo(hipX - hpx * 0.1, feet[1]); gfx.lineTo(hipX, hipY); gfx.lineTo(hipX + hpx * 0.13, feet[1]);
            gfx.moveTo(hipX, hipY); gfx.lineTo(shX, shY);
            if (hand) { var hp = worldToCanvas(hand[0], hand[1]); gfx.moveTo(shX, shY); gfx.lineTo(hp[0], hp[1]); }
            gfx.moveTo(shX, shY); gfx.lineTo(shX - hpx * 0.1, shY + hpx * 0.26);
            gfx.stroke();
            gfx.beginPath(); gfx.arc(shX + lean * 0.2, top[1] + headR, headR, 0, Math.PI * 2); gfx.fill();
            gfx.restore();
          };
          var relH = Number(displayTrial.releaseHeight) || 0;
          var stride = modeMeta.releaseStrideDefault || 0;
          if (d.mode === 'pitching') {
            drawFigure(0.35, 1.88, [stride, relH], false);
            drawFigure(modeMeta.targetZ + 0.25, 1.83, [modeMeta.targetZ - 0.25, 1.25], true);
          } else if (d.mode === 'bowling') {
            drawFigure(0.25, 1.88, [stride, relH], false);
            drawFigure(modeMeta.targetZ - 1.22, 1.8, [modeMeta.targetZ - 1.6, 0.9], true);
          } else if (d.mode === 'freethrow') {
            drawFigure(-0.22, Math.min(2.0, Math.max(1.5, relH - 0.35)), [0, relH], false);
            if (displayTrial.shotKind === 'bouncepass' || displayTrial.shotKind === 'chestpass') drawFigure(PASS_RECEIVER_Z + 0.25, 1.85, [PASS_RECEIVER_Z, 1.2], true);
          } else if (d.mode === 'volleyball') {
            drawFigure(-0.3, 1.9, [0, Math.max(0.6, relH)], false);
          } else if (d.mode === 'fieldgoal' || d.mode === 'golf') {
            drawFigure(-renderMaxZ * 0.012, 1.85, null, false);
          }
        }

        // No-spin reference trajectory (gray, dashed) — only when there's a result
        var lr = d.lastResult;
        var noSpinRef = null;
        if (lr && d.showPhysics) {
          var noSpin = simulatePitch({
            ball: modeMeta.ball,
            speedMph: displayTrial.speedMph, releaseHeight: displayTrial.releaseHeight,
            aimDegV: displayTrial.angleV, aimDegH: displayTrial.angleH,
            spinRpm: 0, spinAxisDeg: 0,
            throwerHand: displayTrial.throwerHand,
            targetZ: modeMeta.targetZ,
            releaseStride: modeMeta.releaseStrideDefault,
            windMph: displayTrial.windMph || 0, windDirDeg: displayTrial.windDirDeg || 0,
            truncateAtTarget: d.mode === 'pitching' || d.mode === 'bowling',
            surface: d.mode === 'bowling' ? CRICKET_SURFACE : undefined,
            gravity: (function() {
              var p = GRAVITY_PRESETS.find(function(g) { return g.id === (displayTrial.gravityId || 'earth'); });
              return p ? p.g : G;
            })()
          });
          noSpinRef = noSpin;
          gfx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
          gfx.lineWidth = 1.5;
          gfx.setLineDash([4, 4]);
          gfx.beginPath();
          for (var i = 0; i < noSpin.samples.length; i++) {
            var s = noSpin.samples[i];
            if (s.z > renderMaxZ) break;
            var p = worldToCanvas(s.z, sampleB(s));
            if (i === 0) gfx.moveTo(p[0], p[1]); else gfx.lineTo(p[0], p[1]);
          }
          gfx.stroke();
          gfx.setLineDash([]);
        }

        // Actual trajectory — glowing spin-colored Magnus ribbon, multi-lane Karman-vortex wake, spin-coupled ball & zero-GC impact burst
        var burstRafId = null;
        if (lr) {
          var tlRevealNow = !d.replayActive || (d.replayT || 0) >= (lr.revealAt || 1) - 0.001;
          var trajColor = outcomeColor(lr.location);
          // In flight the trail stays neutral: the outcome color would give the verdict away.
          if (!tlRevealNow) trajColor = '#f8fafc';
          var spinRpmVal = Number(displayTrial.spinRpm) || 0;
          var spinAxisVal = ((Number(displayTrial.spinAxisDeg) || 0) % 360 + 360) % 360;
          var spinNorm = Math.min(1, spinRpmVal / 2600);
          // Spin-colored Magnus accent: cyan = backspin/lift, magenta = topspin/drop, violet = curve/sidespin, gold = low-spin
          var spinGlowCol = spinRpmVal < 200 ? '#fbbf24'
            : (spinAxisVal <= 45 || spinAxisVal >= 315) ? '#38bdf8'
            : (spinAxisVal >= 135 && spinAxisVal <= 225) ? '#f472b6'
            : '#a78bfa';
          var renderUpTo = d.replayActive ? Math.floor(lr.samples.length * Math.min(1, d.replayT)) : lr.samples.length;
          var visPts = [];
          for (var j = 0; j < renderUpTo; j++) {
            var sj = lr.samples[j];
            if (sj.z > renderMaxZ + 0.5) break;
            visPts.push({ s: sj, p: worldToCanvas(sj.z, sampleB(sj)) });
          }

          // Translucent glowing Magnus deflection ribbon between curved path & no-spin path
          if (!tlHC && noSpinRef && noSpinRef.samples && noSpinRef.samples.length > 2 && visPts.length > 2 && spinRpmVal >= 120) {
            var nsPts = [];
            for (var ni = 0; ni < noSpinRef.samples.length; ni++) {
              var ns = noSpinRef.samples[ni];
              if (ns.z > visPts[visPts.length - 1].s.z + 0.15 || ns.z > renderMaxZ + 0.5) break;
              nsPts.push(worldToCanvas(ns.z, sampleB(ns)));
            }
            if (nsPts.length > 2) {
              gfx.save();
              if (typeof gfx.createLinearGradient === 'function') {
                var ribGrad = gfx.createLinearGradient(visPts[0].p[0], visPts[0].p[1], visPts[visPts.length - 1].p[0], visPts[visPts.length - 1].p[1]);
                ribGrad.addColorStop(0, spinGlowCol + '08');
                ribGrad.addColorStop(0.5, spinGlowCol + '24');
                ribGrad.addColorStop(1, spinGlowCol + '42');
                gfx.fillStyle = ribGrad;
              } else {
                gfx.fillStyle = spinGlowCol + '24';
              }
              gfx.beginPath();
              gfx.moveTo(visPts[0].p[0], visPts[0].p[1]);
              for (var vi = 1; vi < visPts.length; vi++) gfx.lineTo(visPts[vi].p[0], visPts[vi].p[1]);
              for (var nri = nsPts.length - 1; nri >= 0; nri--) gfx.lineTo(nsPts[nri][0], nsPts[nri][1]);
              gfx.closePath();
              gfx.fill();
              gfx.restore();
            }
          }

          // Outer spin-tinted luminous ribbon + crisp outcome core trace
          if (visPts.length > 1) {
            gfx.save();
            gfx.lineCap = 'round'; gfx.lineJoin = 'round';
            // Outer Magnus ribbon glow (bypassed in high-contrast)
            if (!tlHC) {
              gfx.strokeStyle = spinGlowCol;
              gfx.globalAlpha = 0.24 + spinNorm * 0.14;
              gfx.lineWidth = 8 + spinNorm * 3;
              gfx.beginPath();
              for (var r0 = 0; r0 < visPts.length; r0++) { if (r0 === 0) gfx.moveTo(visPts[r0].p[0], visPts[r0].p[1]); else gfx.lineTo(visPts[r0].p[0], visPts[r0].p[1]); }
              gfx.stroke();
            }
            // Mid luminous core
            gfx.globalAlpha = 0.96;
            gfx.strokeStyle = trajColor;
            gfx.lineWidth = tlHC ? 3.2 : 2.8;
            if (!tlHC) {
              gfx.shadowColor = spinGlowCol;
              gfx.shadowBlur = 8;
            }
            gfx.beginPath();
            for (var r1 = 0; r1 < visPts.length; r1++) { if (r1 === 0) gfx.moveTo(visPts[r1].p[0], visPts[r1].p[1]); else gfx.lineTo(visPts[r1].p[0], visPts[r1].p[1]); }
            gfx.stroke();
            gfx.shadowBlur = 0;
            // Subtle specular inner filament along the ribbon
            if (!tlHC) {
              gfx.strokeStyle = 'rgba(255,255,255,0.48)';
              gfx.lineWidth = 1;
              gfx.beginPath();
              for (var r2 = 0; r2 < visPts.length; r2++) { if (r2 === 0) gfx.moveTo(visPts[r2].p[0], visPts[r2].p[1]); else gfx.lineTo(visPts[r2].p[0], visPts[r2].p[1]); }
              gfx.stroke();
            }
            gfx.restore();
          }

          if (stripOn && visPts.length > 1) {
            gfx.save();
            gfx.lineCap = 'round'; gfx.lineJoin = 'round';
            gfx.strokeStyle = trajColor; gfx.lineWidth = 2;
            gfx.beginPath();
            for (var sv = 0; sv < visPts.length; sv++) { var svY = stripY(visPts[sv].s.x); if (sv === 0) gfx.moveTo(visPts[sv].p[0], svY); else gfx.lineTo(visPts[sv].p[0], svY); }
            gfx.stroke();
            var svLast = visPts[visPts.length - 1];
            gfx.fillStyle = '#ffffff'; gfx.strokeStyle = tlHC ? '#ffff00' : '#dc2626'; gfx.lineWidth = 1;
            gfx.beginPath(); gfx.arc(svLast.p[0], stripY(svLast.s.x), 3.2, 0, Math.PI * 2); gfx.fill(); gfx.stroke();
            gfx.restore();
          }
          // Where the ball bounced (cricket): a mark on the pitch in both views.
          if (d.mode === 'bowling') {
            for (var gb = 0; gb < visPts.length; gb++) {
              if (!visPts[gb].s.ground) continue;
              gfx.save();
              gfx.strokeStyle = tlHC ? '#ffffff' : '#fde68a'; gfx.lineWidth = 1.5;
              gfx.beginPath(); _tlSafeEllipse(gfx, visPts[gb].p[0], visPts[gb].p[1], 9, 3.2, 0, 0, Math.PI * 2); gfx.stroke();
              gfx.beginPath(); gfx.arc(visPts[gb].p[0], stripY(visPts[gb].s.x), 4.5, 0, Math.PI * 2); gfx.stroke();
              gfx.restore();
              break;
            }
          }
          // Free kick: a ring where each bounce touched the grass, and a label where it began to roll.
          var rollLblPt = null;
          if (d.mode === 'freekick') {
            var rollAt = null, rollSlope = 0;
            gfx.save();
            gfx.strokeStyle = tlHC ? '#ffffff' : '#fde68a'; gfx.lineWidth = 1.5;
            for (var fb = 0; fb < visPts.length; fb++) {
              if (!visPts[fb].s.ground) continue;
              gfx.beginPath(); gfx.arc(visPts[fb].p[0], visPts[fb].p[1], visPts[fb].s.rollStart ? 6 : 4, 0, Math.PI * 2); gfx.stroke();
              if (visPts[fb].s.rollStart) {
                rollAt = visPts[fb].p;
                var rpA = visPts[Math.max(0, fb - 3)].p, rpB = visPts[Math.min(visPts.length - 1, fb + 3)].p;
                rollSlope = (rpB[0] - rpA[0]) !== 0 ? (rpB[1] - rpA[1]) / (rpB[0] - rpA[0]) : 0;
              }
            }
            if (rollAt) {
              // On the side of the trail away from the centerline (and so away from the wall), moved
              // clear by how steeply the trail runs across the label's width.
              var rollTxt = __alloT('stem.throwlab.canvas_rolls_from_here', 'rolls from here');
              gfx.font = tlFont(12, '700'); gfx.textAlign = 'center';
              var rollHalfW = (gfx.measureText ? gfx.measureText(rollTxt).width : 90) / 2;
              var rollClear = Math.min(40, Math.abs(rollSlope) * rollHalfW);
              var rollBelow = rollAt[1] > worldToCanvas(0, 0)[1] + 2;
              var rollY = rollBelow ? rollAt[1] + 10 + Math.round(12 * lk) + rollClear : rollAt[1] - 10 - rollClear;
              gfx.lineWidth = 3; gfx.strokeStyle = tlHC ? '#000000' : 'rgba(2,6,23,0.85)';
              gfx.strokeText(rollTxt, rollAt[0], rollY);
              gfx.fillStyle = tlHC ? '#ffff00' : '#fde68a';
              gfx.fillText(rollTxt, rollAt[0], rollY);
              rollLblPt = [rollAt[0], rollY - Math.round(12 * lk)];
            }
            gfx.restore();
          }
          var atImpactEnd = visPts.length > 1 && (!d.replayActive || renderUpTo >= lr.samples.length - 1);
          if (!atImpactEnd) {
            impactSeenRef.current = null;
          }

          // Compute ball kinematics once for Karman-vortex wake, vectors & spin-coupled ball
          var lastVis = visPts.length > 0 ? visPts[visPts.length - 1] : null;
          var prevVis = visPts.length > 2 ? visPts[visPts.length - 3] : (visPts.length > 0 ? visPts[0] : null);
          var bp = lastVis ? lastVis.p : null;
          var velAng = (bp && prevVis) ? Math.atan2(bp[1] - prevVis.p[1], bp[0] - prevVis.p[0]) : 0;
          var wakeDir = velAng + Math.PI;
          var perpAng = velAng + Math.PI / 2;
          var magnusSign = (spinAxisVal > 90 && spinAxisVal < 270) ? 1 : -1;
          var flightTime = lastVis ? (Number(lastVis.s.t) || 0) : 0;

          // Multi-lane Karman-vortex swirling wake trails bending smoothly with Magnus force
          if (bp && visPts.length > 2) {
            gfx.save();
            gfx.lineCap = 'round';
            var wakeLen = 28 + spinNorm * 22;
            var magnusBend = spinRpmVal >= 160 ? magnusSign * (5 + spinNorm * 11) : 0;
            var laneOffsets = [-2, -1, 0, 1, 2];
            for (var li = 0; li < laneOffsets.length; li++) {
              var lane = laneOffsets[li];
              var off = lane * 5.2;
              var isLowP = (lane * magnusSign) > 0;
              var asym = isLowP ? 0.68 : (lane === 0 ? 1 : 1.18);
              var startX = bp[0] + Math.cos(velAng) * 6.5 + Math.cos(perpAng) * (off * asym);
              var startY = bp[1] + Math.sin(velAng) * 6.5 + Math.sin(perpAng) * (off * asym);
              var swirlOsc = tlReduced ? 0 : Math.sin(flightTime * (9 + spinNorm * 10) + lane * 1.15) * (1.4 + spinNorm * 2.1);
              var cp1X = bp[0] + Math.cos(wakeDir) * (wakeLen * 0.42) + Math.cos(perpAng) * (off * 1.08 + magnusBend * 0.35 + swirlOsc);
              var cp1Y = bp[1] + Math.sin(wakeDir) * (wakeLen * 0.42) + Math.sin(perpAng) * (off * 1.08 + magnusBend * 0.35 + swirlOsc);
              var cp2X = bp[0] + Math.cos(wakeDir) * (wakeLen * 0.78) + Math.cos(perpAng) * (off * 1.24 + magnusBend * 0.82 - swirlOsc * 0.8);
              var cp2Y = bp[1] + Math.sin(wakeDir) * (wakeLen * 0.78) + Math.sin(perpAng) * (off * 1.24 + magnusBend * 0.82 - swirlOsc * 0.8);
              var endX = bp[0] + Math.cos(wakeDir) * wakeLen + Math.cos(perpAng) * (off * 1.38 + magnusBend + lane * 2.2);
              var endY = bp[1] + Math.sin(wakeDir) * wakeLen + Math.sin(perpAng) * (off * 1.38 + magnusBend + lane * 2.2);
              if (tlHC) {
                gfx.strokeStyle = lane === 0 ? '#ffffff' : '#ffff00';
                gfx.globalAlpha = Math.abs(lane) === 2 ? 0.35 : 0.7;
              } else {
                gfx.strokeStyle = lane === 0 ? 'rgba(224,242,254,0.52)' : (spinGlowCol + (isLowP ? '99' : '50'));
                gfx.globalAlpha = Math.abs(lane) === 2 ? (0.42 + spinNorm * 0.22) : 0.85;
              }
              gfx.lineWidth = isLowP ? 1.55 : (lane === 0 ? 1.15 : 0.95);
              gfx.beginPath();
              gfx.moveTo(startX, startY);
              gfx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
              gfx.stroke();
            }
            // Alternating Karman vortex street eddies shedding along the wake (static arc under reduced motion)
            if (spinRpmVal >= 320 && !tlHC) {
              var eddyCount = tlReduced ? 1 : (spinRpmVal >= 1200 ? 4 : 3);
              for (var ei = 0; ei < eddyCount; ei++) {
                var eFrac = (ei + 1) / (eddyCount + 0.5);
                var eDist = 14 + eFrac * (wakeLen * 0.88);
                var sideAlt = (ei % 2 === 0 ? 1 : -1) * magnusSign;
                var eLat = sideAlt * (4.2 + eFrac * 4.5) + magnusBend * eFrac * 0.72;
                var ex = bp[0] + Math.cos(wakeDir) * eDist + Math.cos(perpAng) * eLat;
                var ey = bp[1] + Math.sin(wakeDir) * eDist + Math.sin(perpAng) * eLat;
                var eR = (3.2 + eFrac * 3.1) * (0.85 + spinNorm * 0.35);
                var eSpin = tlReduced ? wakeDir : (wakeDir + sideAlt * (flightTime * (8 + spinNorm * 12) + ei * 1.4));
                gfx.strokeStyle = spinGlowCol;
                gfx.globalAlpha = Math.max(0.14, (0.58 - eFrac * 0.38) * (0.7 + spinNorm * 0.4));
                gfx.lineWidth = Math.max(0.75, 1.35 - eFrac * 0.5);
                gfx.beginPath();
                gfx.arc(ex, ey, eR, eSpin, eSpin + Math.PI * 1.45);
                gfx.stroke();
                // Inner vortex spiral hook
                gfx.beginPath();
                gfx.arc(ex, ey, eR * 0.52, eSpin + Math.PI * 0.45, eSpin + Math.PI * 1.65);
                gfx.stroke();
              }
            }
            gfx.restore();
          }

          // Crisp dynamic 2D velocity / spin / Magnus vector bloom when physics overlay is enabled
          if (bp && d.showPhysics && visPts.length > 2) {
            var draw2DVector = function(ox, oy, dx, dy, col, lbl) {
              var len = Math.hypot(dx, dy);
              if (len < 6) return;
              var ang = Math.atan2(dy, dx);
              var ex2 = ox + dx, ey2 = oy + dy;
              gfx.save();
              gfx.lineCap = 'round';
              if (!tlHC) {
                gfx.strokeStyle = col;
                gfx.globalAlpha = 0.28;
                gfx.lineWidth = 6;
                gfx.beginPath(); gfx.moveTo(ox, oy); gfx.lineTo(ex2, ey2); gfx.stroke();
              }
              gfx.globalAlpha = 0.96;
              gfx.strokeStyle = col;
              gfx.fillStyle = col;
              gfx.lineWidth = 2.1;
              gfx.beginPath(); gfx.moveTo(ox, oy); gfx.lineTo(ex2, ey2); gfx.stroke();
              gfx.beginPath();
              gfx.moveTo(ex2, ey2);
              gfx.lineTo(ex2 - 7.5 * Math.cos(ang - 0.44), ey2 - 7.5 * Math.sin(ang - 0.44));
              gfx.lineTo(ex2 - 7.5 * Math.cos(ang + 0.44), ey2 - 7.5 * Math.sin(ang + 0.44));
              gfx.closePath();
              gfx.fill();
              if (lbl) {
                gfx.font = tlFont(12, '800');
                gfx.textAlign = 'left';
                var lx = Math.max(8, Math.min(W - 44, ex2 + 5));
                var ly = Math.max(14, Math.min(H - 8, ey2 - 4));
                gfx.fillText(lbl, lx, ly);
              }
              gfx.restore();
            };
            // Velocity vector along flight tangent
            draw2DVector(bp[0], bp[1], Math.cos(velAng) * 32, Math.sin(velAng) * 32, '#22d3ee', 'v');
            // Magnus force vector perpendicular to velocity (scaled with spin rate)
            if (spinRpmVal >= 180) {
              var mLen = 14 + spinNorm * 22;
              var mDir = perpAng + (magnusSign > 0 ? 0 : Math.PI);
              draw2DVector(bp[0], bp[1], Math.cos(mDir) * mLen, Math.sin(mDir) * mLen, '#c084fc', 'Fₘ');
            }
          }

          // Helper: render spin-rate-coupled rotating ball with 3D specular highlight & spin blur
          var drawSpinningBall = function() {
            if (!bp) return;
            gfx.save();
            // Outer spin-tinted bloom halo (bypassed in High-Contrast)
            if (!tlHC && typeof gfx.createRadialGradient === 'function') {
              var haloR = 13 + spinNorm * 5;
              var bGlow = gfx.createRadialGradient(bp[0], bp[1], 1, bp[0], bp[1], haloR);
              bGlow.addColorStop(0, spinGlowCol + (spinNorm > 0.35 ? '9a' : '7a'));
              bGlow.addColorStop(0.5, trajColor + '33');
              bGlow.addColorStop(1, 'rgba(0,0,0,0)');
              gfx.fillStyle = bGlow;
              gfx.beginPath(); gfx.arc(bp[0], bp[1], haloR, 0, Math.PI * 2); gfx.fill();
            }
            // Spin-rate specular motion-blur orbit ring around fast-spinning ball
            var spinAngle = tlReduced ? 0.35 : (magnusSign * flightTime * (spinRpmVal / 60) * Math.PI * 0.55);
            if (!tlHC && !tlReduced && spinRpmVal >= 350) {
              gfx.strokeStyle = spinGlowCol;
              gfx.globalAlpha = 0.28 + spinNorm * 0.42;
              gfx.lineWidth = 1.25 + spinNorm * 0.85;
              gfx.beginPath();
              gfx.arc(bp[0], bp[1], 7.4, spinAngle, spinAngle + Math.PI * (0.75 + spinNorm * 0.6));
              gfx.stroke();
              gfx.globalAlpha = 0.16 + spinNorm * 0.22;
              gfx.beginPath();
              gfx.arc(bp[0], bp[1], 7.4, spinAngle + Math.PI, spinAngle + Math.PI * (1.55 + spinNorm * 0.35));
              gfx.stroke();
              gfx.globalAlpha = 1;
            }
            // 3D specular shaded ball body
            var ballR = 5.6;
            if (!tlHC && typeof gfx.createRadialGradient === 'function') {
              var bodyGrad = gfx.createRadialGradient(bp[0] - 1.8, bp[1] - 1.8, 0.6, bp[0], bp[1], ballR);
              bodyGrad.addColorStop(0, '#ffffff');
              bodyGrad.addColorStop(0.65, '#f1f5f9');
              bodyGrad.addColorStop(1, '#cbd5e1');
              gfx.fillStyle = bodyGrad;
            } else {
              gfx.fillStyle = '#fafafa';
            }
            gfx.beginPath(); gfx.arc(bp[0], bp[1], ballR, 0, Math.PI * 2); gfx.fill();
            gfx.strokeStyle = tlHC ? '#ffff00' : '#dc2626'; gfx.lineWidth = 1.15; gfx.stroke();
            // Rotating spin-coupled dual curved seams with motion-blur ghost at high RPM
            gfx.save();
            gfx.beginPath(); gfx.arc(bp[0], bp[1], ballR - 0.5, 0, Math.PI * 2); gfx.clip();
            gfx.translate(bp[0], bp[1]);
            gfx.rotate(spinAngle);
            if (!tlHC && !tlReduced && spinNorm > 0.25) {
              // Subtle trailing specular seam motion-blur smear
              gfx.strokeStyle = 'rgba(220,38,38,' + (0.22 + spinNorm * 0.22).toFixed(3) + ')';
              gfx.lineWidth = 2.0;
              gfx.beginPath(); gfx.arc(-2.6, 0, 3.6, -0.85, 0.85); gfx.stroke();
              gfx.beginPath(); gfx.arc(2.6, 0, 3.6, Math.PI - 0.85, Math.PI + 0.85); gfx.stroke();
            }
            gfx.strokeStyle = tlHC ? '#000000' : 'rgba(220,38,38,0.86)';
            gfx.lineWidth = 0.95;
            gfx.beginPath(); gfx.arc(-2.4, 0, 3.5, -0.85, 0.85); gfx.stroke();
            gfx.beginPath(); gfx.arc(2.4, 0, 3.5, Math.PI - 0.85, Math.PI + 0.85); gfx.stroke();
            gfx.restore();
            // Crisp upper-left specular glint
            if (!tlHC) {
              gfx.fillStyle = 'rgba(255,255,255,0.82)';
              gfx.beginPath(); gfx.arc(bp[0] - 1.9, bp[1] - 1.9, 1.35, 0, Math.PI * 2); gfx.fill();
            }
            gfx.restore();
          };

          // Helper: render pre-allocated zero-GC impact shockwave & turf/dust micro-burst particles
          var drawImpactBurst = function(burstT, isLive) {
            if (!atImpactEnd) return;
            var impPt = visPts[visPts.length - 1];
            var ix = impPt.p[0], iy = impPt.p[1];
            var isGroundImpact = isTopDown || impPt.s.y <= 0.35;
            var dustCol = isTopDown || d.mode === 'golf' || d.mode === 'fieldgoal' ? '#d9f99d'
              : d.mode === 'pitching' || d.mode === 'bowling' ? '#fde68a' : '#e0f2fe';
            var dustCol2 = isTopDown || d.mode === 'golf' || d.mode === 'fieldgoal' ? '#86efac'
              : d.mode === 'pitching' || d.mode === 'bowling' ? '#fbbf24' : '#bae6fd';
            gfx.save();
            // Concentric target impact shockwave rings (guarded ellipse)
            var ease = 1 - Math.pow(1 - Math.max(0, Math.min(1, burstT)), 3);
            var rx1 = (isGroundImpact ? 14 : 11) * (isLive ? (0.45 + ease * 0.72) : 1);
            var ry1 = (isGroundImpact ? 5.5 : 11) * (isLive ? (0.45 + ease * 0.72) : 1);
            var rx2 = (isGroundImpact ? 24 : 18) * (isLive ? (0.35 + ease * 1.05) : 1);
            var ry2 = (isGroundImpact ? 9.5 : 18) * (isLive ? (0.35 + ease * 1.05) : 1);
            if (!tlHC && isLive && burstT < 0.75 && typeof gfx.createRadialGradient === 'function') {
              var swR = Math.max(rx2, 16);
              var swG = gfx.createRadialGradient(ix, iy, 1, ix, iy, swR);
              swG.addColorStop(0, trajColor + Math.round((1 - burstT / 0.75) * 95).toString(16).padStart(2, '0'));
              swG.addColorStop(1, trajColor + '00');
              gfx.fillStyle = swG;
              gfx.beginPath(); _tlSafeEllipse(gfx, ix, iy, swR, isGroundImpact ? swR * 0.42 : swR, 0, 0, Math.PI * 2); gfx.fill();
            }
            gfx.strokeStyle = trajColor;
            gfx.globalAlpha = isLive ? Math.max(0.55, 0.92 - burstT * 0.25) : 0.72;
            gfx.lineWidth = isLive ? (2.4 - burstT * 0.7) : 1.8;
            gfx.beginPath(); _tlSafeEllipse(gfx, ix, iy, rx1, ry1, 0, 0, Math.PI * 2); gfx.stroke();
            gfx.globalAlpha = isLive ? Math.max(0.28, (1 - burstT * 0.62) * 0.72) : 0.36;
            gfx.lineWidth = 1.2;
            gfx.beginPath(); _tlSafeEllipse(gfx, ix, iy, rx2, ry2, 0, 0, Math.PI * 2); gfx.stroke();
            // Pre-allocated zero-GC turf/chalk/dust micro-burst particles
            var pool = impactPoolRef.current;
            if (isLive && pool) {
              var fade = Math.max(0, 1 - Math.pow(burstT, 1.5));
              for (var pp = 0; pp < pool.length; pp++) {
                var pt = pool[pp];
                var dragT = 1 - Math.exp(-burstT * 2.6);
                var px2 = ix + pt.vx * dragT;
                var py2 = iy + pt.vy * dragT + (isGroundImpact && !isTopDown ? (burstT * burstT * 18) : 0);
                var pRad = Math.max(0.5, pt.size * (1 - burstT * 0.45));
                gfx.fillStyle = pt.shade === 0 ? dustCol : dustCol2;
                gfx.globalAlpha = Math.max(0.06, pt.alpha * fade + (burstT > 0.85 ? 0.14 : 0));
                gfx.beginPath(); gfx.arc(px2, py2, pRad, 0, Math.PI * 2); gfx.fill();
              }
            } else {
              // Crisp static settled turf/chalk dust puffs (reduced motion or post-burst)
              for (var dp = 0; dp < 8; dp++) {
                var da = (dp / 8) * Math.PI * 2 + ((ix + iy) % 1.2);
                var dr = 8 + (dp % 3) * 5;
                var dpx = ix + Math.cos(da) * dr * (isGroundImpact ? 1.25 : 0.9);
                var dpy = iy + Math.sin(da) * dr * (isGroundImpact ? 0.48 : 0.9) - (isGroundImpact && !isTopDown ? 3 : 0);
                gfx.fillStyle = dp % 2 === 0 ? dustCol : dustCol2;
                gfx.globalAlpha = 0.38 - (dp % 3) * 0.08;
                gfx.beginPath(); gfx.arc(dpx, dpy, 2.4 - (dp % 2) * 0.6, 0, Math.PI * 2); gfx.fill();
              }
            }
            gfx.restore();
          };

          // Verdict on the canvas itself: the outcome, then one line saying where the ball went.
          // Both strings come from the model run (lr.location, lr.whereText). Drawn only after
          // the ball has arrived, and it does not depend on any animation.
          if (tlRevealNow) {
            var bannerTitle = outcomeLabel(lr.location, lr).replace(/^[^A-Za-z]+/, '');
            var bannerLine = lr.whereText || '';
            var shownW = 0;
            try { shownW = canvas.getBoundingClientRect().width; } catch (e) { shownW = 0; }
            var bk = shownW > 0 ? Math.min(1.9, Math.max(1, W / shownW)) : 1;
            var titlePx = Math.round(16 * bk), linePx = Math.round(12 * bk), lineGap = Math.round(16 * bk);
            // keep clear of the fullscreen button in the top right corner (44 px on screen)
            var boxMax = W - Math.round(56 * bk) - 16;
            gfx.save();
            gfx.textAlign = 'center'; gfx.textBaseline = 'middle';
            gfx.font = '900 ' + titlePx + 'px system-ui, sans-serif';
            var titleW = gfx.measureText(bannerTitle).width || 80;
            gfx.font = '600 ' + linePx + 'px system-ui, sans-serif';
            var words = bannerLine.split(' '), lines = [], cur = '';
            for (var bw = 0; bw < words.length; bw++) {
              var tryLine = cur ? cur + ' ' + words[bw] : words[bw];
              if ((gfx.measureText(tryLine).width || 0) > boxMax - 28 && cur) { lines.push(cur); cur = words[bw]; } else cur = tryLine;
            }
            if (cur) lines.push(cur);
            var maxBannerLines = bk > 1.3 ? 3 : 2;
            // Cut text gets an ellipsis, so a sentence never just stops (the full text is in the result card).
            if (lines.length > maxBannerLines) { lines = lines.slice(0, maxBannerLines); lines[maxBannerLines - 1] = lines[maxBannerLines - 1].replace(/[\s.,;:]*$/, '') + '…'; }
            var lineW = 0;
            for (var bl = 0; bl < lines.length; bl++) lineW = Math.max(lineW, gfx.measureText(lines[bl]).width || 0);
            var boxW = Math.min(boxMax, Math.max(titleW, lineW) + 28), boxH = Math.round(titlePx * 1.9) + lines.length * lineGap;
            var boxX = Math.max(8, Math.min((W - boxW) / 2, boxMax + 8 - boxW)), boxY = 8;
            // Where the ball ended up must stay visible: if it lies under the banner, the banner moves to the bottom.
            var underBox = function(pt) { return !!pt && pt[0] >= boxX - 8 && pt[0] <= boxX + boxW + 8 && pt[1] <= boxY + boxH + 8; };
            if (underBox(bp) || underBox(rollLblPt)) boxY = H - boxH - 8;
            // At the bottom it sits over the distance labels, so there it is solid.
            gfx.fillStyle = boxY > 8 ? '#020617' : 'rgba(2,6,23,0.86)';
            gfx.strokeStyle = tlHC ? '#ffffff' : outcomeColor(lr.location);
            gfx.lineWidth = 2;
            gfx.beginPath();
            if (typeof gfx.roundRect === 'function') gfx.roundRect(boxX, boxY, boxW, boxH, 10); else gfx.rect(boxX, boxY, boxW, boxH);
            gfx.fill(); gfx.stroke();
            gfx.fillStyle = tlHC ? '#ffffff' : outcomeColor(lr.location);
            gfx.font = '900 ' + titlePx + 'px system-ui, sans-serif';
            gfx.fillText(bannerTitle, boxX + boxW / 2, boxY + titlePx);
            gfx.fillStyle = '#f1f5f9';
            gfx.font = '600 ' + linePx + 'px system-ui, sans-serif';
            for (var bt = 0; bt < lines.length; bt++) gfx.fillText(lines[bt], boxX + boxW / 2, boxY + Math.round(titlePx * 2.05) + bt * lineGap);
            gfx.restore();
          }

          // Trigger a bounded 650ms canvas-only impact shockwave & turf/dust micro-burst on fresh impact
          var shouldAnimateBurst = atImpactEnd && !tlReduced && !tlHC && impactSeenRef.current !== lr && typeof requestAnimationFrame === 'function';
          var snapOk = false;
          if (shouldAnimateBurst && typeof document !== 'undefined' && typeof gfx.drawImage === 'function' && canvas.width > 0 && canvas.height > 0) {
            try {
              var snap = impactSnapRef.current;
              if (!snap) {
                snap = document.createElement('canvas');
                impactSnapRef.current = snap;
              }
              if (snap.width !== canvas.width || snap.height !== canvas.height) {
                snap.width = canvas.width;
                snap.height = canvas.height;
              }
              var snapCtx = snap.getContext('2d');
              if (snapCtx && typeof snapCtx.drawImage === 'function') {
                snapCtx.clearRect(0, 0, snap.width, snap.height);
                snapCtx.drawImage(canvas, 0, 0);
                snapOk = true;
              }
            } catch (e) { snapOk = false; }
          }

          if (shouldAnimateBurst && snapOk) {
            impactSeenRef.current = lr;
            // Seed pre-allocated zero-GC particle pool in-place
            var poolRef = impactPoolRef.current;
            var impSeedPt = visPts[visPts.length - 1];
            var isGroundSeed = isTopDown || impSeedPt.s.y <= 0.35;
            var seedHash = Math.abs(Math.sin(impSeedPt.p[0] * 0.13 + impSeedPt.p[1] * 0.29 + spinRpmVal * 0.01));
            for (var sp = 0; sp < poolRef.length; sp++) {
              var pObj = poolRef[sp];
              var ang = (sp / poolRef.length) * Math.PI * 2 + seedHash * 1.7 + (sp % 3) * 0.18;
              var spd = 12 + ((sp * 7) % 15) + spinNorm * 8;
              pObj.vx = Math.cos(ang) * spd * (isGroundSeed ? 1.35 : 0.95);
              pObj.vy = isGroundSeed && !isTopDown
                ? (-Math.abs(Math.sin(ang)) * spd * 0.72 - 5)
                : (Math.sin(ang) * spd * (isGroundSeed ? 0.55 : 0.95));
              pObj.size = 1.4 + (sp % 4) * 0.48;
              pObj.alpha = 0.52 + (sp % 3) * 0.14;
              pObj.shade = sp % 2;
            }
            var burstStart = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
            var burstDur = 640;
            drawImpactBurst(0.05, true);
            drawSpinningBall();
            var stepBurst = function(nowTs) {
              var elapsedMs = (nowTs || Date.now()) - burstStart;
              var bT = Math.max(0, Math.min(1, elapsedMs / burstDur));
              gfx.clearRect(0, 0, W, H);
              gfx.drawImage(impactSnapRef.current, 0, 0, W, H);
              drawImpactBurst(bT, bT < 1);
              drawSpinningBall();
              if (bT < 1) {
                burstRafId = requestAnimationFrame(stepBurst);
              } else {
                burstRafId = null;
              }
            };
            burstRafId = requestAnimationFrame(stepBurst);
          } else {
            if (atImpactEnd) impactSeenRef.current = lr;
            drawImpactBurst(1, false);
            drawSpinningBall();
          }
        }
        return function() {
          if (burstRafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(burstRafId);
        };
      }, [
        d.lastResult, d.replayActive, d.replayT,
        d.speedMph, d.releaseHeight, d.aimDegV, d.aimDegH,
        d.spinRpm, d.spinAxisDeg, d.throwerHand, d.showPhysics,
        d.referenceList, d.referenceResult, d.mode, d.fgDistanceYd,
        d.windMph, d.windDirDeg, d.gravityId, tlViewTick
      ]);

      // ── Space-key hotkey for throw/shoot/kick ──
      // Optional immersive perspective zone. It projects the exact same samples
      // as the side view and deliberately avoids a Three.js/WebGL dependency.
      React.useEffect(function() {
        if (!showImmersive3D || !immersiveInView || !immersiveCanvasRef.current) return;
        var canvas = immersiveCanvasRef.current;
        var W = 640, H = 340;
        var gfx = _tlSetupHiDPI(canvas, W, H);
        if (!gfx) return;
        var immReduced = _tlIsReducedMotion();
        var immHC = _tlIsHighContrast(canvas);
        gfx.clearRect(0, 0, W, H);
        if (!immHC && typeof gfx.createLinearGradient === 'function') {
          var bg = gfx.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#050d1f'); bg.addColorStop(0.42, '#0f2342'); bg.addColorStop(0.66, '#383a56'); bg.addColorStop(0.76, '#183726'); bg.addColorStop(1, '#0d2217');
          gfx.fillStyle = bg;
        } else {
          gfx.fillStyle = immHC ? '#000000' : '#0f2342';
        }
        gfx.fillRect(0, 0, W, H);
        if (!immHC && typeof gfx.createRadialGradient === 'function') {
          [[W * 0.22, 24], [W * 0.78, 24]].forEach(function(fl) {
            var fg = gfx.createRadialGradient(fl[0], fl[1], 4, fl[0], fl[1], 200);
            fg.addColorStop(0, 'rgba(254, 249, 195, 0.20)');
            fg.addColorStop(0.45, 'rgba(56, 189, 248, 0.06)');
            fg.addColorStop(1, 'rgba(0, 0, 0, 0)');
            gfx.fillStyle = fg; gfx.fillRect(0, 0, W, H * 0.72);
          });
        }

        var references = showImmersiveReferences ? activeReferenceList() : [];
        var sampleSets = [];
        references.forEach(function(ref) {
          if (ref && ref.result && ref.result.samples && ref.result.samples.length) sampleSets.push(ref.result.samples);
        });
        if (d.lastResult && d.lastResult.samples && d.lastResult.samples.length) sampleSets.push(d.lastResult.samples);
        // Label scale (bitmap pixels per screen pixel) and a list of the boxes already used by a
        // label. A new label that would land on an old one moves up a line, or below if the top
        // of the canvas is in the way.
        var immShownW = 0;
        try { immShownW = canvas.getBoundingClientRect().width; } catch (e) { immShownW = 0; }
        var lk3 = immShownW > 0 ? Math.min(1.9, Math.max(1, W / immShownW)) : 1;
        var placed3 = [];
        function immPx(px) { return Math.round(Math.max(12, px) * lk3); }
        function placeLabel(x, y, text, color, px, align) {
          var size = immPx(px || 12), lineH = size + 2;
          gfx.save();
          gfx.font = '700 ' + size + 'px system-ui, sans-serif';
          var w = gfx.measureText(text).width || text.length * size * 0.55;
          var left = Math.max(4, Math.min(W - w - 4, align === 'center' ? x - w / 2 : x));
          var start = Math.max(lineH + 2, Math.min(H - 4, y));
          // Try the natural spot, then one, two and three lines above and below it. A label that
          // still has no free spot is left out: a missing label is better than an unreadable pile.
          var offsets = [0, -1, 1, -2, 2, -3, 3], top = null;
          for (var oi = 0; oi < offsets.length; oi++) {
            var tryTop = start + offsets[oi] * lineH;
            if (tryTop < lineH + 2 || tryTop > H - 4) continue;
            var hit = placed3.some(function(r) { return left < r.x + r.w + 4 && left + w + 4 > r.x && tryTop - lineH < r.y && tryTop > r.y - r.h; });
            if (!hit) { top = tryTop; break; }
          }
          if (top === null) { gfx.restore(); return; }
          placed3.push({ x: left, y: top, w: w, h: lineH });
          gfx.fillStyle = color || '#fde68a';
          gfx.textAlign = 'left';
          gfx.fillText(text, left, top);
          gfx.restore();
        }
        var immTitle = '3D VIEW · SAME PHYSICS DATA';
        var trailLegend = d.lastResult ? (references.length ? 'Solid: this throw · Dashed: saved' : 'Solid: this throw') : (references.length ? 'Dashed: saved throw' : 'Launch to see the path here.');
        gfx.font = '700 ' + immPx(12) + 'px system-ui, sans-serif';
        var immHeadW = Math.max(gfx.measureText(immTitle).width || 0, gfx.measureText(trailLegend).width || 0) + 20;
        var immHeadH = immPx(12) * 2 + 18;
        placed3.push({ x: 8, y: 8 + immHeadH, w: immHeadW, h: immHeadH });
        var immersiveTrial = d.lastResult && d.lastResult.trial ? d.lastResult.trial : buildTrialSnapshot(d, null);
        var immersiveShotPreset = d.mode === 'freethrow' ? SHOT_TYPES.find(function(item) { return item.id === immersiveTrial.shotKind; }) : null;
        var isImmersivePass = !!(immersiveShotPreset && immersiveShotPreset.kind === 'pass');
        var landmarkZ = modeMeta.targetZ;
        if (d.mode === 'fieldgoal') landmarkZ = (immersiveTrial.targetDistanceYd || d.fgDistanceYd || 35) * 0.9144;
        if (d.mode === 'golf') {
          var immersiveClub = GOLF_TYPES.find(function(item) { return item.id === immersiveTrial.shotKind; }) || GOLF_TYPES[0];
          landmarkZ = immersiveClub.carryYd * 0.9144;
        }
        if (isImmersivePass) landmarkZ = 6.0;
        var maxZ = Math.max(6, landmarkZ * 1.15), maxY = 4, maxX = 2;
        sampleSets.forEach(function(samples) { samples.forEach(function(sample) {
          maxZ = Math.max(maxZ, Math.abs(Number(sample.z) || 0));
          maxY = Math.max(maxY, Number(sample.y) || 0);
          maxX = Math.max(maxX, Math.abs(Number(sample.x) || 0));
        }); });
        var sportHalfWidth = d.mode === 'volleyball' ? modeMeta.courtHalfWidth
          : d.mode === 'freekick' ? modeMeta.goalHalfWidth + 1.4
          : d.mode === 'fieldgoal' ? modeMeta.goalHalfWidth + 1.4
          : d.mode === 'golf' ? modeMeta.fairwayHalfYd * 0.9144
          : d.mode === 'bowling' ? 1.5 : 3;
        var halfWidth = Math.max(sportHalfWidth, Math.min(maxZ * 0.22, maxX * 1.7 + 2));
        var yaw = immersiveYaw * Math.PI / 180, pitch = immersivePitch * Math.PI / 180;
        var target = { x: 0, y: maxY * 0.18, z: maxZ * 0.47 };
        if(followImmersiveBall&&d.lastResult&&d.lastResult.samples&&d.lastResult.samples.length){
          var followIndex=d.replayActive?Math.min(d.lastResult.samples.length-1,Math.floor((d.lastResult.samples.length-1)*Math.max(0,Math.min(1,d.replayT||0)))):d.lastResult.samples.length-1;
          var followSample=d.lastResult.samples[followIndex];
          target={x:Number(followSample.x)||0,y:Math.max(0.3,(Number(followSample.y)||0)*0.65),z:Number(followSample.z)||0};
        }
        var radius = followImmersiveBall ? Math.max(8,Math.min(26,maxZ*0.18)) : Math.max(16, maxZ * 1.02);
        var camera = { x: target.x + Math.sin(yaw) * radius, y: target.y + Math.sin(pitch) * radius, z: target.z - Math.cos(yaw) * radius };
        var projector=TL_PERSPECTIVE.createProjector(camera,target,W,H);
        var project=projector.project;
        function drawSegment(a,b){ var pa=project(a),pb=project(b); if(!pa||!pb)return; gfx.beginPath();gfx.moveTo(pa[0],pa[1]);gfx.lineTo(pb[0],pb[1]);gfx.stroke(); }
        function drawPolyline(points,color,width,dashed){
          gfx.save();gfx.strokeStyle=color;gfx.lineWidth=width||2;gfx.setLineDash(dashed||[]);gfx.beginPath();var started=false;
          points.forEach(function(point){var p=project(point);if(!p)return;if(!started){gfx.moveTo(p[0],p[1]);started=true;}else gfx.lineTo(p[0],p[1]);});
          if(started)gfx.stroke();gfx.restore();
        }
        function drawRing(cx,y,cz,radius,color){
          var points=[];for(var ri=0;ri<=24;ri++){var angle=Math.PI*2*ri/24;points.push({x:cx+Math.cos(angle)*radius,y:y,z:cz+Math.sin(angle)*radius});}
          drawPolyline(points,color,2,[]);
        }
        function drawLandmarkLabel(point,label,color){
          var p=project(point);if(!p)return;placeLabel(p[0],p[1]-7,label,color||'#fde68a',12,'center');
        }
        function drawTargetLandmarks(){
          var gold='#fbbf24', white='rgba(241,245,249,0.9)', cyan='#7dd3fc';
          if(d.mode==='pitching'){
            drawPolyline([{x:-0.24,y:0.48,z:landmarkZ},{x:-0.24,y:1.04,z:landmarkZ},{x:0.24,y:1.04,z:landmarkZ},{x:0.24,y:0.48,z:landmarkZ},{x:-0.24,y:0.48,z:landmarkZ}],gold,3,[6,4]);
            drawLandmarkLabel({x:0,y:1.18,z:landmarkZ},'STRIKE ZONE',gold);return;
          }
          if(d.mode==='freethrow'&&isImmersivePass){
            drawRing(0,1.35,landmarkZ,0.38,cyan);drawLandmarkLabel({x:0,y:1.9,z:landmarkZ},'RECEIVING TARGET',cyan);return;
          }
          if(d.mode==='freethrow'){
            drawPolyline([{x:-0.9,y:2.55,z:modeMeta.targetZ},{x:-0.9,y:3.85,z:modeMeta.targetZ},{x:0.9,y:3.85,z:modeMeta.targetZ},{x:0.9,y:2.55,z:modeMeta.targetZ},{x:-0.9,y:2.55,z:modeMeta.targetZ}],white,2,[]);
            var rimZ3=shotRimZ((d.lastResult&&d.lastResult.trial&&d.lastResult.trial.shotKind)||d.shotType);drawRing(0,modeMeta.rimY,rimZ3,modeMeta.rimRadius,'#f97316');drawLandmarkLabel({x:0,y:4.05,z:rimZ3+(modeMeta.backboardZ-modeMeta.rimZ)},'BACKBOARD + RIM','#fdba74');return;
          }
          if(d.mode==='freekick'){
            drawPolyline([{x:-modeMeta.goalHalfWidth,y:0,z:landmarkZ},{x:-modeMeta.goalHalfWidth,y:modeMeta.goalHeight,z:landmarkZ},{x:modeMeta.goalHalfWidth,y:modeMeta.goalHeight,z:landmarkZ},{x:modeMeta.goalHalfWidth,y:0,z:landmarkZ}],white,3,[]);
            drawPolyline([{x:-modeMeta.wallHalfWidth,y:0,z:modeMeta.wallZ},{x:-modeMeta.wallHalfWidth,y:modeMeta.wallHeight,z:modeMeta.wallZ},{x:modeMeta.wallHalfWidth,y:modeMeta.wallHeight,z:modeMeta.wallZ},{x:modeMeta.wallHalfWidth,y:0,z:modeMeta.wallZ}],gold,2,[5,4]);drawLandmarkLabel({x:0,y:modeMeta.goalHeight+0.35,z:landmarkZ},'GOAL',white);return;
          }
          if(d.mode==='fieldgoal'){
            drawPolyline([{x:-modeMeta.goalHalfWidth,y:modeMeta.crossbarHeight,z:landmarkZ},{x:modeMeta.goalHalfWidth,y:modeMeta.crossbarHeight,z:landmarkZ}],gold,4,[]);
            drawPolyline([{x:-modeMeta.goalHalfWidth,y:modeMeta.crossbarHeight,z:landmarkZ},{x:-modeMeta.goalHalfWidth,y:modeMeta.crossbarHeight+4.5,z:landmarkZ}],gold,4,[]);
            drawPolyline([{x:modeMeta.goalHalfWidth,y:modeMeta.crossbarHeight,z:landmarkZ},{x:modeMeta.goalHalfWidth,y:modeMeta.crossbarHeight+4.5,z:landmarkZ}],gold,4,[]);drawLandmarkLabel({x:0,y:modeMeta.crossbarHeight+4.8,z:landmarkZ},'UPRIGHTS',gold);return;
          }
          if(d.mode==='bowling'){
            [-0.076,0,0.076].forEach(function(stumpX){drawPolyline([{x:stumpX,y:0,z:landmarkZ},{x:stumpX,y:modeMeta.stumpsHeight,z:landmarkZ}],white,3,[]);});
            drawPolyline([{x:-0.12,y:modeMeta.stumpsHeight,z:landmarkZ},{x:0.12,y:modeMeta.stumpsHeight,z:landmarkZ}],gold,2,[]);drawLandmarkLabel({x:0,y:1.0,z:landmarkZ},'WICKET',white);return;
          }
          if(d.mode==='golf'){
            drawRing(0,0.02,landmarkZ,Math.min(8,modeMeta.fairwayHalfYd*0.45),cyan);drawPolyline([{x:0,y:0,z:landmarkZ},{x:0,y:3,z:landmarkZ}],white,2,[]);
            drawPolyline([{x:0,y:3,z:landmarkZ},{x:1.1,y:2.65,z:landmarkZ},{x:0,y:2.35,z:landmarkZ}],gold,2,[]);drawLandmarkLabel({x:0,y:3.5,z:landmarkZ},'TARGET GREEN',gold);return;
          }
          if(d.mode==='volleyball'){
            drawPolyline([{x:-modeMeta.courtHalfWidth,y:0,z:modeMeta.netZ},{x:-modeMeta.courtHalfWidth,y:modeMeta.netHeight,z:modeMeta.netZ},{x:modeMeta.courtHalfWidth,y:modeMeta.netHeight,z:modeMeta.netZ},{x:modeMeta.courtHalfWidth,y:0,z:modeMeta.netZ}],white,2,[]);
            drawPolyline([{x:-modeMeta.courtHalfWidth,y:0,z:modeMeta.netZ},{x:-modeMeta.courtHalfWidth,y:0,z:landmarkZ},{x:modeMeta.courtHalfWidth,y:0,z:landmarkZ},{x:modeMeta.courtHalfWidth,y:0,z:modeMeta.netZ}],cyan,2,[]);drawLandmarkLabel({x:0,y:modeMeta.netHeight+0.4,z:modeMeta.netZ},'NET',white);
          }
        }

        for(var zi=0;zi<=10;zi++){
          var z=maxZ*zi/10; gfx.lineWidth=1; gfx.strokeStyle=zi===0?'rgba(251,191,36,0.58)':'rgba(148,163,184,0.19)';
          drawSegment({x:-halfWidth,y:0,z:z},{x:halfWidth,y:0,z:z});
        }
        for(var xi=-4;xi<=4;xi++){
          var x=halfWidth*xi/4; gfx.strokeStyle=xi===0?'rgba(125,211,252,0.48)':'rgba(148,163,184,0.16)';
          drawSegment({x:x,y:0,z:0},{x:x,y:0,z:maxZ});
        }
        drawTargetLandmarks();
        function drawTrajectory(result,color,dashed,width,current){
          if(!result||!result.samples||!result.samples.length)return;
          var samples=result.samples, visible=samples.length;
          if(current&&d.replayActive)visible=Math.max(1,Math.floor(samples.length*Math.max(0,Math.min(1,d.replayT||0))));
          // Projected ground shadow trace & translucent flight curtain for 3D depth
          if(current&&visible>1){
            gfx.save();
            gfx.strokeStyle='rgba(15,23,42,0.55)';gfx.lineWidth=3;gfx.beginPath();var sStarted=false;
            for(var gi=0;gi<visible;gi++){var gs=samples[gi],gp=project({x:Number(gs.x)||0,y:0.01,z:Number(gs.z)||0});if(!gp)continue;if(!sStarted){gfx.moveTo(gp[0],gp[1]);sStarted=true;}else gfx.lineTo(gp[0],gp[1]);}
            if(sStarted)gfx.stroke();
            var dropStep=Math.max(2,Math.floor(visible/10));
            gfx.strokeStyle=color;gfx.globalAlpha=0.18;gfx.lineWidth=1;
            for(var di=dropStep;di<visible;di+=dropStep){var ds=samples[di];drawSegment({x:Number(ds.x)||0,y:0.01,z:Number(ds.z)||0},{x:Number(ds.x)||0,y:Math.max(0,Number(ds.y)||0),z:Number(ds.z)||0});}
            gfx.restore();
            // Outer Magnus ribbon glow underlay
            gfx.save();gfx.strokeStyle=color;gfx.globalAlpha=0.26;gfx.lineWidth=width+6;gfx.lineCap='round';gfx.lineJoin='round';gfx.beginPath();var rStarted=false;
            for(var ri=0;ri<visible;ri++){var rs=samples[ri],rp=project({x:Number(rs.x)||0,y:Math.max(0,Number(rs.y)||0),z:Number(rs.z)||0});if(!rp)continue;if(!rStarted){gfx.moveTo(rp[0],rp[1]);rStarted=true;}else gfx.lineTo(rp[0],rp[1]);}
            if(rStarted)gfx.stroke();gfx.restore();
          }
          gfx.save();gfx.strokeStyle=color;gfx.lineWidth=width;gfx.setLineDash(dashed?[8,6]:[]);gfx.lineCap='round';gfx.lineJoin='round';gfx.shadowColor=color;gfx.shadowBlur=current?9:2;gfx.beginPath();
          var drew=false;
          for(var si=0;si<visible;si++){var s=samples[si],p=project({x:Number(s.x)||0,y:Math.max(0,Number(s.y)||0),z:Number(s.z)||0});if(!p)continue;if(!drew){gfx.moveTo(p[0],p[1]);drew=true;}else gfx.lineTo(p[0],p[1]);}
          if(drew)gfx.stroke();gfx.restore();
          if(current&&visible>0){
            var ball=samples[Math.min(visible-1,samples.length-1)],bp=project({x:Number(ball.x)||0,y:Math.max(0,Number(ball.y)||0),z:Number(ball.z)||0});
            if(bp){
              var immSpinRpm=Number(immersiveTrial.spinRpm)||0;
              var immSpinNorm=Math.min(1,immSpinRpm/2600);
              var immSpinAng=immReduced?0.3:((Number(ball.t)||0)*(immSpinRpm/60)*Math.PI*0.55);
              if(!immHC&&typeof gfx.createRadialGradient==='function'){
                var bg3=gfx.createRadialGradient(bp[0],bp[1],1,bp[0],bp[1],14+immSpinNorm*4);
                bg3.addColorStop(0,color+'96');bg3.addColorStop(1,'rgba(0,0,0,0)');
                gfx.fillStyle=bg3;gfx.beginPath();gfx.arc(bp[0],bp[1],14+immSpinNorm*4,0,Math.PI*2);gfx.fill();
              }
              if(!immHC&&!immReduced&&immSpinRpm>=350){
                gfx.save();gfx.strokeStyle=color;gfx.globalAlpha=0.32+immSpinNorm*0.38;gfx.lineWidth=1.3;
                gfx.beginPath();gfx.arc(bp[0],bp[1],7.4,immSpinAng,immSpinAng+Math.PI*0.95);gfx.stroke();gfx.restore();
              }
              gfx.fillStyle='#fff';gfx.strokeStyle=immHC?'#ffff00':color;gfx.lineWidth=1.8;gfx.beginPath();gfx.arc(bp[0],bp[1],5.4,0,Math.PI*2);gfx.fill();gfx.stroke();
              gfx.save();gfx.beginPath();gfx.arc(bp[0],bp[1],4.8,0,Math.PI*2);gfx.clip();
              gfx.translate(bp[0],bp[1]);gfx.rotate(immSpinAng);
              gfx.strokeStyle=immHC?'#000':'rgba(220,38,38,0.82)';gfx.lineWidth=0.95;
              gfx.beginPath();gfx.arc(-2.3,0,3.4,-0.8,0.8);gfx.stroke();
              gfx.beginPath();gfx.arc(2.3,0,3.4,Math.PI-0.8,Math.PI+0.8);gfx.stroke();
              gfx.restore();
            }
            if(!d.replayActive||visible>=samples.length-1){
              var endS=samples[samples.length-1];
              drawRing(Number(endS.x)||0,0.03,Number(endS.z)||0,Math.max(0.28,maxZ*0.011),color);
              drawRing(Number(endS.x)||0,0.03,Number(endS.z)||0,Math.max(0.52,maxZ*0.02),'rgba(254,240,138,0.55)');
            }
          }
        }
        function drawPhysicsAnnotations(result){
          if(!result||!result.samples||!result.samples.length)return;
          var samples=result.samples,visible=samples.length;
          if(d.replayActive)visible=Math.max(1,Math.floor(samples.length*Math.max(0,Math.min(1,d.replayT||0))));
          var visibleSamples=samples.slice(0,visible);
          if(showImmersiveGuides&&visibleSamples.length){
            var apex=visibleSamples.reduce(function(best,item){return (Number(item.y)||0)>(Number(best.y)||0)?item:best;},visibleSamples[0]);
            var apexPoint={x:Number(apex.x)||0,y:Math.max(0,Number(apex.y)||0),z:Number(apex.z)||0};
            drawPolyline([{x:apexPoint.x,y:0,z:apexPoint.z},apexPoint],'rgba(125,211,252,0.72)',1,[4,4]);
            drawRing(apexPoint.x,0.02,apexPoint.z,Math.max(0.16,maxZ*0.006),'rgba(125,211,252,0.7)');
            var projectedApex=project(apexPoint);if(projectedApex){gfx.fillStyle='#7dd3fc';gfx.beginPath();gfx.arc(projectedApex[0],projectedApex[1],4,0,Math.PI*2);gfx.fill();}
            drawLandmarkLabel({x:apexPoint.x,y:apexPoint.y+Math.max(0.18,maxY*0.035),z:apexPoint.z},'APEX '+apexPoint.y.toFixed(1)+' m','#7dd3fc');
            if(!d.replayActive){
              var end=samples[samples.length-1],endPoint={x:Number(end.x)||0,y:Math.max(0,Number(end.y)||0),z:Number(end.z)||0};
              drawRing(endPoint.x,0.025,endPoint.z,Math.max(0.2,maxZ*0.008),'#fbbf24');
              drawLandmarkLabel({x:endPoint.x,y:Math.max(0.22,endPoint.y+0.2),z:endPoint.z},'END · '+cleanOutcomeText(result).toUpperCase(),'#fde68a');
            }
          }
          if(showImmersiveTimeMarkers&&visibleSamples.length>2){
            var markerStep=Math.max(1,Math.floor(visibleSamples.length/5)),timeLabelPositions=[];
            gfx.save();gfx.font='700 9px system-ui, sans-serif';gfx.textAlign='left';
            for(var mi=markerStep;mi<visibleSamples.length;mi+=markerStep){
              var marker=visibleSamples[mi],markerPoint=project({x:Number(marker.x)||0,y:Math.max(0,Number(marker.y)||0),z:Number(marker.z)||0});
              if(!markerPoint)continue;gfx.fillStyle='#f8fafc';gfx.beginPath();gfx.arc(markerPoint[0],markerPoint[1],3,0,Math.PI*2);gfx.fill();
              var labelX=markerPoint[0]+5,labelY=markerPoint[1]-4,attempt=0;
              while(timeLabelPositions.some(function(pos){return Math.abs(pos.x-labelX)<34&&Math.abs(pos.y-labelY)<13;})&&attempt<3){labelY-=12;attempt++;}
              timeLabelPositions.push({x:labelX,y:labelY});placeLabel(labelX,labelY,(Number(marker.t)||0).toFixed(1)+'s','#bae6fd',12);
            }
            gfx.restore();
          }
        }
        function drawVectorArrow(origin, vector, color, label) {
          var end={x:origin.x+vector.x,y:origin.y+vector.y,z:origin.z+vector.z},a=project(origin),b=project(end);if(!a||!b)return;
          var angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
          gfx.save();
          gfx.lineCap='round';
          // Crisp luminous vector bloom underlay (bypassed in High-Contrast)
          if(!immHC){
            gfx.strokeStyle=color;gfx.globalAlpha=0.28;gfx.lineWidth=6.5;
            gfx.beginPath();gfx.moveTo(a[0],a[1]);gfx.lineTo(b[0],b[1]);gfx.stroke();
            if(typeof gfx.createRadialGradient==='function'){
              var tipG=gfx.createRadialGradient(b[0],b[1],1,b[0],b[1],12);
              tipG.addColorStop(0,color+'88');tipG.addColorStop(1,'rgba(0,0,0,0)');
              gfx.globalAlpha=1;gfx.fillStyle=tipG;gfx.beginPath();gfx.arc(b[0],b[1],12,0,Math.PI*2);gfx.fill();
            }
          }
          gfx.globalAlpha=1;gfx.strokeStyle=color;gfx.fillStyle=color;gfx.lineWidth=2.5;
          gfx.beginPath();gfx.moveTo(a[0],a[1]);gfx.lineTo(b[0],b[1]);gfx.stroke();
          gfx.beginPath();gfx.moveTo(b[0],b[1]);gfx.lineTo(b[0]-9.5*Math.cos(angle-0.44),b[1]-9.5*Math.sin(angle-0.44));gfx.lineTo(b[0]-9.5*Math.cos(angle+0.44),b[1]-9.5*Math.sin(angle+0.44));gfx.closePath();gfx.fill();
          // Subtle white inner filament for vector crispness
          if(!immHC){
            gfx.strokeStyle='rgba(255,255,255,0.55)';gfx.lineWidth=0.9;
            gfx.beginPath();gfx.moveTo(a[0],a[1]);gfx.lineTo(b[0]-6*Math.cos(angle),b[1]-6*Math.sin(angle));gfx.stroke();
          }
          gfx.restore();placeLabel(b[0]+6,b[1]-6,label,color,12);
        }
        function drawPhysicsVectors(result) {
          if(!result||!result.samples||!result.samples.length)return;
          var vectorIndex=d.replayActive?Math.min(result.samples.length-1,Math.floor((result.samples.length-1)*Math.max(0,Math.min(1,d.replayT||0)))):result.samples.length-1;
          var sample=result.samples[vectorIndex],origin={x:Number(sample.x)||0,y:Math.max(0.08,Number(sample.y)||0),z:Number(sample.z)||0};
          var velocity={x:Number(sample.vx)||0,y:Number(sample.vy)||0,z:Number(sample.vz)||0},velocityUnit=projector.unit(velocity),scale=Math.max(0.8,Math.min(8,maxZ*0.08));
          if(immersiveVectors.velocity&&(velocity.x||velocity.y||velocity.z))drawVectorArrow(origin,{x:velocityUnit.x*scale,y:velocityUnit.y*scale,z:velocityUnit.z*scale},'#22d3ee','VELOCITY');
          if(immersiveVectors.gravity)drawVectorArrow(origin,{x:0,y:-Math.max(0.7,maxY*0.16),z:0},'#facc15','GRAVITY');
          if(immersiveVectors.wind&&(Number(immersiveTrial.windMph)||0)>0){var windRad=(Number(immersiveTrial.windDirDeg)||0)*Math.PI/180;drawVectorArrow(origin,{x:Math.sin(windRad)*scale*0.8,y:0,z:-Math.cos(windRad)*scale*0.8},'#a7f3d0','WIND');}
          var spin=spinAxisVector(Number(immersiveTrial.spinAxisDeg)||0,immersiveTrial.throwerHand||'right');
          if(immersiveVectors.spin&&(Number(immersiveTrial.spinRpm)||0)>0)drawVectorArrow(origin,{x:spin.x*scale*0.72,y:spin.y*scale*0.72,z:0},'#f472b6','SPIN AXIS');
          if(immersiveVectors.magnus&&(Number(immersiveTrial.spinRpm)||0)>0){var lift=projector.unit(projector.cross(spin,velocityUnit));drawVectorArrow(origin,{x:lift.x*scale*0.82,y:lift.y*scale*0.82,z:lift.z*scale*0.82},'#c084fc','MAGNUS');}
        }
        references.forEach(function(ref){ drawTrajectory(ref.result,outcomeColor(ref.result&&ref.result.location),true,2,false); });
        if(d.lastResult){drawTrajectory(d.lastResult,outcomeColor(d.lastResult.location),false,3,true);drawPhysicsAnnotations(d.lastResult);drawPhysicsVectors(d.lastResult);}
        gfx.fillStyle='rgba(7,20,38,0.82)';gfx.fillRect(8,8,immHeadW,immHeadH);
        gfx.textAlign='left';
        gfx.fillStyle='#fde68a';gfx.font='700 '+immPx(12)+'px system-ui, sans-serif';gfx.fillText(immTitle,18,8+immPx(12)+5);
        gfx.fillStyle='#cbd5e1';gfx.font=immPx(12)+'px system-ui, sans-serif';gfx.fillText(trailLegend,18,8+immPx(12)*2+10);
      }, [showImmersive3D, immersiveInView, immersiveYaw, immersivePitch, followImmersiveBall, immersiveVectors, showImmersiveGuides, showImmersiveTimeMarkers, showImmersiveReferences, d.lastResult, d.referenceList, d.referenceResult, d.mode, d.replayActive, d.replayT, d.fgDistanceYd, d.golfClub, d.shotType, tlViewTick]);

      // WCAG 2.1.1 Keyboard: Space is scoped to the focusable trajectory.
      // Native Space behavior on buttons, sliders, summaries, and fields remains intact.

      // Controlled replay analysis: play, pause, scrub, step, and speed changes.
      function writeReplayState(active, progress) {
        var nextProgress = Math.max(0, Math.min(1, Number(progress) || 0));
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, { replayActive: !!active, replayT: nextProgress }) });
        });
      }
      function startReplayAt(progress) {
        setReplayPaused(false);
        writeReplayState(true, progress >= 1 ? 0 : progress);
      }
      function scrubReplay(progress) {
        var next = Math.max(0, Math.min(1, progress));
        setReplayPaused(true);
        writeReplayState(next < 1, next);
      }
      function stepReplay(direction) {
        if (!d.lastResult || !d.lastResult.samples || !d.lastResult.samples.length) return;
        var step = 1 / Math.max(1, d.lastResult.samples.length - 1);
        var current = d.replayActive ? (d.replayT || 0) : 1;
        scrubReplay(current + direction * step);
        tlAnnounce(direction < 0 ? 'Replay stepped backward one sample.' : 'Replay stepped forward one sample.');
      }
      function skipReplayToResult() {
        if (!d.replayActive) return;
        var wasInFlight = tlInFlight;
        _tlSkipAt.current = Date.now();
        setReplayPaused(false);
        writeReplayState(false, 1);
        flushRevealQueue();
        if (!wasInFlight) tlAnnounce(__alloT('stem.throwlab.sr_replay_ended', 'Replay ended. Full path shown.'));
      }
      function finishReplayAnalysis() {
        setReplayPaused(false);
        writeReplayState(false, 1);
        flushRevealQueue();
        tlAnnounce(__alloT('stem.throwlab.sr_replay_analysis_finished_full_trajectory_shown', 'Replay analysis finished. Full trajectory shown.'));
      }
      React.useEffect(function() {
        if (!d.replayActive || replayPaused) return;
        var prefersReduced = false;
        try { prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
        if (prefersReduced) {
          writeReplayState(false, 1);
          tlAnnounce(__alloT('stem.throwlab.sr_replay_shown_without_animation_because_reduced_mo', 'Replay shown without animation because reduced motion is enabled. Use the timeline or step controls to inspect frames.'));
          return;
        }
        var lrNow = d.lastResult || {};
        var duration = replaySeconds(lrNow.flightTime, lrNow.pathTime) / Math.max(0.25, replaySpeed || 1);
        var initial = Math.max(0, Math.min(1, d.replayT || 0));
        var startTime = performance.now() - initial * duration * 1000;
        var raf, lastPaint = -1;
        function step() {
          var progress = Math.min(1, (performance.now() - startTime) / 1000 / duration);
          if (progress >= 1 || lastPaint < 0 || progress - lastPaint >= 0.025) { lastPaint = progress; upd('replayT', progress); }
          if (progress < 1) raf = requestAnimationFrame(step);
          else { writeReplayState(false, 1); tlAnnounce(__alloT('stem.throwlab.sr_replay_complete', 'Replay complete.')); }
        }
        raf = requestAnimationFrame(step);
        return function() { if (raf) cancelAnimationFrame(raf); };
      }, [d.replayActive, replayPaused, replaySpeed]);

      // ── UI ──────────────────────────────────────────────
      var currentPitch = PITCH_TYPES.find(function(p) { return p.id === d.pitchType; }) || PITCH_TYPES[0];
      var modeIds = Object.keys(MODES);
      function onModeTabKeyDown(event, currentMode) {
        var index = Math.max(0, modeIds.indexOf(currentMode));
        var nextIndex = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % modeIds.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + modeIds.length) % modeIds.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = modeIds.length - 1;
        else return;
        event.preventDefault();
        var nextMode = modeIds[nextIndex];
        switchMode(nextMode);
        scheduleTl(function() {
          var nextTab = document.getElementById('throwlab-mode-tab-' + nextMode);
          if (nextTab) nextTab.focus();
        }, 0);
      }

      function slider(label, value, min, max, step, onChange, suffix) {
        // WCAG 1.3.1 Info & Relationships: keep the concise visible label
        // separate from its live visual output. aria-labelledby supplies the
        // control name while aria-valuetext supplies the current value + unit,
        // avoiding duplicate announcements such as "Speed 92 mph, 92 mph."
        var inputId = 'tl-' + d.mode + '-slider-' + label.replace(/\s+/g, '-').toLowerCase();
        var labelId = inputId + '-label';
        return h('div', { style: { marginBottom: 10 } },
          h('div', {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: 12, marginBottom: 4 }
          },
            h('label', {
              id: labelId,
              htmlFor: inputId,
              style: { color: 'var(--allo-stem-text, #cbd5e1)', cursor: 'pointer' }
            }, label),
            h('output', {
              htmlFor: inputId,
              'aria-live': 'off',
              style: { color: '#fbbf24', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }
            }, value + (suffix || ''))
          ),
          h('input', {
            id: inputId,
            'data-tl-focusable': 'true',
            type: 'range', min: min, max: max, step: step, value: value,
            'aria-labelledby': labelId,
            'aria-valuetext': value + (suffix || ''),
            onChange: function(e) { onChange(parseFloat(e.target.value)); },
            style: { width: '100%', accentColor: '#fbbf24' }
          })
        );
      }

      var lr = d.lastResult;
      // Predict, then watch: the verdict and numbers stay hidden until the replay reaches the
      // target. Once a result has been shown it stays shown (scrubbing the timeline later does
      // not hide it again). With reduced motion the replay is skipped, so it shows at once.
      var revealRef = React.useRef(null);
      if (lr && (!d.replayActive || (d.replayT || 0) >= (lr.revealAt || 1) - 0.001)) revealRef.current = lr;
      var tlInFlight = !!lr && revealRef.current !== lr;
      var modeMeta = MODES[d.mode] || MODES.pitching;
      var isPitching = d.mode === 'pitching';
      var isFreeThrow = d.mode === 'freethrow';
      var isFreeKick = d.mode === 'freekick';
      var isFieldGoal = d.mode === 'fieldgoal';
      var isBowling = d.mode === 'bowling';
      var isGolf = d.mode === 'golf';
      var isVolleyball = d.mode === 'volleyball';
      // Active preset for the bottom-of-canvas teach blurb
      var currentShot = SHOT_TYPES.find(function(s) { return s.id === d.shotType; }) || SHOT_TYPES[0];
      var currentKick = KICK_TYPES.find(function(k) { return k.id === d.kickType; }) || KICK_TYPES[0];
      var currentGoal = GOAL_TYPES.find(function(g) { return g.id === d.goalType; }) || GOAL_TYPES[0];
      var currentBowl = CRICKET_DELIVERIES.find(function(b) { return b.id === d.bowlType; }) || CRICKET_DELIVERIES[0];
      var currentGolfClub = GOLF_TYPES.find(function(g) { return g.id === d.golfClub; }) || GOLF_TYPES[0];
      var currentVolley = VOLLEYBALL_TYPES.find(function(v) { return v.id === d.serveType; }) || VOLLEYBALL_TYPES[0];
      var activePreset = isPitching ? currentPitch
                       : isFreeThrow ? currentShot
                       : isFreeKick ? currentKick
                       : isFieldGoal ? currentGoal
                       : isBowling ? currentBowl
                       : isGolf ? currentGolfClub
                       : isVolleyball ? currentVolley
                       : currentGolfClub;
      var pendingTrialSnapshot = buildTrialSnapshot(d, null);
      var previousModeTrial = findPreviousTrial(d.recentThrows, d.mode);
      var nextTrialCheck = buildFairTestFeedback(previousModeTrial, pendingTrialSnapshot, modeMeta.label);
      var resultTrial = lr && lr.trial ? lr.trial : pendingTrialSnapshot;
      var resultPreset = findPresetForTrial(resultTrial) || activePreset;
      var resultChangedVariables = lr && lr.trial ? changedTrialVariables(lr.trial, pendingTrialSnapshot) : [];
      var resultControlsChanged = resultChangedVariables.length > 0;

      function activeReferenceList() {
        return (d.referenceList && d.referenceList.length)
          ? d.referenceList
          : (d.referenceResult ? [{ result: d.referenceResult, label: d.referenceLabel, color: '#d946ef' }] : []);
      }

      function cleanOutcomeText(result) {
        return result ? outcomeLabel(result.location, result).replace(/^[^A-Za-z]+/, '') : 'Unknown outcome';
      }

      function referenceComparisonText(ref, index) {
        var result = ref && ref.result;
        var label = (ref && ref.label) || (result ? buildRefLabel(result) : 'saved trajectory');
        return 'Reference ' + (index + 1) + ': ' + label + '. Outcome: ' + cleanOutcomeText(result) + '.' + describeShape(result);
      }

      function referenceComparisonDescription() {
        var refs = activeReferenceList();
        return refs.length ? ' Saved comparison overlays. ' + refs.map(referenceComparisonText).join(' ') : '';
      }

      function canvasSceneDescription() {
        if (isPitching) return 'Baseball side view. The pitcher\'s mound is on the left, home plate is on the right, and a dashed yellow strike zone sits above the plate 60 feet 6 inches away.';
        if (isFreeThrow && resultPreset && resultPreset.kind === 'pass') return 'Basketball passing side view. The passer is on the left, a teammate is 6 meters to the right, and the chest-height receiving target is marked. Bounce passes also show an ideal floor-bounce zone.';
        if (isFreeThrow) return 'Basketball court side view. The free-throw line is on the left and the hoop, backboard, 10-foot rim, and net are on the right.';
        if (isFreeKick) return 'Soccer pitch top-down view. The ball is on the left, a four-defender wall is 10 yards away, and a 7.32-meter goal is on the right. Lateral spin curves the trajectory around the wall. Yellow rings mark where a low kick bounces, and a label marks where it starts to roll.';
        if (isFieldGoal) return 'Football field side view. The tee is on the left, yard markers cross the field, and yellow goalposts with a 10-foot crossbar are ' + (resultTrial.targetDistanceYd || d.fgDistanceYd) + ' yards away.';
        if (isBowling) return 'Cricket pitch side view. The bowler is on the left, the good-length bounce zone is highlighted, and three stumps stand at the far end of the 22-yard pitch. A strip under the picture shows the same delivery from above, so the turn off the pitch can be seen.';
        if (isGolf) return 'Golf-hole side view. The tee is on the left, distance markers cross the fairway, and a flagged green marks the ' + (resultTrial.targetDistanceYd || currentGolfClub.carryYd) + '-yard target for the selected club.';
        if (isVolleyball) return 'Volleyball court side view. The server is on the left, a 2.43-meter net divides the court, and the receiving court and deep ace zone are highlighted on the right.';
        return 'Interactive sports trajectory simulation.';
      }

      function immersiveTargetDescription() {
        if (isPitching) return 'A strike-zone target plane marks home plate.';
        if (isFreeThrow && resultPreset && resultPreset.kind === 'pass') return 'A chest-height receiving target marks the teammate.';
        if (isFreeThrow) return 'A backboard and rim mark the basket target.';
        if (isFreeKick) return 'The defender wall and full goal frame are shown.';
        if (isFieldGoal) return 'The crossbar and both uprights mark the goal.';
        if (isBowling) return 'Three stumps and their bails mark the wicket.';
        if (isGolf) return 'A flag and landing ring mark the selected club target.';
        if (isVolleyball) return 'The regulation net and receiving court are shown.';
        return 'The sport target is shown in perspective.';
      }

      function trajectoryMetrics(result) {
        if (!result || !result.samples || !result.samples.length) return null;
        var samples = result.samples, last = samples[samples.length - 1];
        return { apex: Math.max.apply(null, samples.map(function(sample) { return Number(sample.y) || 0; })), distance: Math.max.apply(null, samples.map(function(sample) { return Number(sample.z) || 0; })), duration: Number(last.t) || 0, lateral: Number(last.x) || 0, endpointHeight: Number(last.y) || 0 };
      }
      function formatMetricDelta(value, unit) { var rounded = Math.abs(value) < 0.005 ? 0 : value; return (rounded > 0 ? '+' : '') + rounded.toFixed(unit === 's' ? 2 : 1) + ' ' + unit; }
      function immersiveComparisonRows() {
        var current = trajectoryMetrics(d.lastResult); if (!current) return [];
        return activeReferenceList().map(function(ref, index) { var metrics = trajectoryMetrics(ref.result); if (!metrics) return null; return { index: index, label: ref.label || ('Reference ' + (index + 1)), color: ref.color || '#d946ef', apex: current.apex - metrics.apex, distance: current.distance - metrics.distance, duration: current.duration - metrics.duration, lateral: current.lateral - metrics.lateral }; }).filter(Boolean);
      }
      function immersiveObservationPrompts() {
        var prompts = ['Scrub to the apex. What is the vertical velocity doing just before and just after it?', 'Turn on velocity and gravity together. Which vector changes direction during flight?'];
        if (d.mode === 'pitching' || d.mode === 'bowling') prompts.push('Where does spin create the largest visible break relative to the no-spin direction?');
        else if (d.mode === 'freekick' || d.mode === 'fieldgoal' || d.mode === 'golf') prompts.push('Turn on wind and Magnus vectors. Do they push the ball in the same direction or compete?');
        else prompts.push('How does launch angle trade forward speed for peak height and flight time?');
        if (activeReferenceList().length) prompts.push('Use the delta table: which single measured change best explains the different outcome?');
        return prompts.slice(0, 4);
      }
      function triggerThrowLabDownload(filename, blob, fallbackText, mimeType) {
        var link = document.createElement('a'), objectUrl = '';
        try {
          if (blob && window.URL && typeof window.URL.createObjectURL === 'function') { objectUrl = window.URL.createObjectURL(blob); link.href = objectUrl; }
          else link.href = 'data:' + (mimeType || 'text/plain') + ';charset=utf-8,' + encodeURIComponent(fallbackText || '');
          link.download = filename; link.style.display = 'none'; document.body.appendChild(link); link.click(); link.remove();
          if (objectUrl) scheduleTl(function() { try { window.URL.revokeObjectURL(objectUrl); } catch (e) {} }, 1000);
        } catch (error) { if (addToast) addToast('Download failed', 'error'); }
      }
      function exportImmersivePng() {
        var canvas = immersiveCanvasRef.current; if (!canvas) return; var filename = 'throwlab-' + d.mode + '-perspective.png';
        if (typeof canvas.toBlob === 'function') canvas.toBlob(function(blob) { if (blob) triggerThrowLabDownload(filename, blob, '', 'image/png'); else if (addToast) addToast('Snapshot could not be created', 'error'); }, 'image/png');
        else { try { var link = document.createElement('a'); link.download = filename; link.href = canvas.toDataURL('image/png'); link.click(); } catch (error) { if (addToast) addToast('Snapshot could not be created', 'error'); } }
        tlAnnounce(__alloT('stem.throwlab.sr_immersive_perspective_snapshot_prepared', 'Immersive perspective snapshot prepared.'));
      }
      function exportTrajectoryCsv() {
        if (!d.lastResult) return;
        var rows = [['series','label','time_s','x_m','y_m','z_m','vx_mps','vy_mps','vz_mps','outcome']];
        function addSeries(result, series, label) { (result.samples || []).forEach(function(sample) { rows.push([series,label,Number(sample.t||0).toFixed(4),Number(sample.x||0).toFixed(4),Number(sample.y||0).toFixed(4),Number(sample.z||0).toFixed(4),Number(sample.vx||0).toFixed(4),Number(sample.vy||0).toFixed(4),Number(sample.vz||0).toFixed(4),cleanOutcomeText(result)]); }); }
        addSeries(d.lastResult, 'current', buildRefLabel(d.lastResult)); activeReferenceList().forEach(function(ref,index) { addSeries(ref.result, 'reference_' + (index + 1), ref.label || ('Reference ' + (index + 1))); });
        var quote=String.fromCharCode(34); var csv = rows.map(function(row) { return row.map(function(value) { return quote + String(value).replace(new RegExp(quote,'g'),quote+quote) + quote; }).join(','); }).join('\r\n');
        var blob = typeof Blob === 'function' ? new Blob([csv], { type: 'text/csv;charset=utf-8' }) : null; triggerThrowLabDownload('throwlab-' + d.mode + '-trajectory.csv', blob, csv, 'text/csv'); tlAnnounce('Trajectory CSV prepared with ' + (rows.length - 1) + ' samples.');
      }
      function resetImmersiveAnalysis() {
        setFollowImmersiveBall(false); setImmersiveYaw(-28); setImmersivePitch(24); setShowImmersiveGuides(true); setShowImmersiveTimeMarkers(false); setShowImmersiveReferences(true); setImmersiveVectors({ velocity: true, gravity: false, wind: false, spin: false, magnus: false }); setReplaySpeed(1); setReplayPaused(false); if (d.replayActive) writeReplayState(false, 1); tlAnnounce(__alloT('stem.throwlab.sr_immersive_camera_overlays_vectors_and_replay_sett', 'Immersive camera, overlays, vectors, and replay settings reset.'));
      }

      function launchActionLabel() {
        var action = isPitching ? 'THROW PITCH'
          : isFreeKick ? 'STRIKE'
          : isFieldGoal ? 'KICK'
          : isBowling ? 'BOWL'
          : isGolf ? 'TEE OFF'
          : isVolleyball ? 'SERVE'
          : 'SHOOT';
        return modeMeta.icon + ' ' + action;
      }

      function sessionSummaryItems() {
        var modeAttempts = (d.modeThrowCounts && d.modeThrowCounts[d.mode]) || 0;
        if (isPitching) return ['Pitches: ' + modeAttempts, 'Strikes: ' + (d.strikeCount || 0), 'Types: ' + Object.keys(d.pitchTypesUsed || {}).length + '/' + PITCH_TYPES.length];
        if (isFreeKick) return ['Kicks: ' + modeAttempts, 'Goals: ' + (d.goalCount || 0), 'Kick: ' + currentKick.label];
        if (isFieldGoal) return ['Field goals: ' + modeAttempts, 'Made: ' + (d.fgMakeCount || 0), 'Distance: ' + d.fgDistanceYd + ' yd'];
        if (isBowling) return ['Deliveries: ' + modeAttempts, 'Wickets: ' + (d.wicketCount || 0), 'Delivery: ' + currentBowl.label];
        if (isGolf) return ['Shots: ' + modeAttempts, 'Greens: ' + (d.golfGreenCount || 0), 'Club: ' + currentGolfClub.label];
        if (isVolleyball) return ['Serves: ' + modeAttempts, 'Aces: ' + (d.volleyAceCount || 0), 'Serve: ' + currentVolley.label];
        return ['Shots: ' + modeAttempts, 'Made: ' + (d.shotMakeCount || 0), 'Shot: ' + currentShot.label];
      }

      // Outcome label + color (mode-specific)
      function outcomeLabel(loc, res) {
        // A free kick that touched the frame says which piece (read.frame, from the model).
        var framePart = (res && res.read && res.read.frame) ? res.read.frame.part : 'post';
        if (isPitching) {
          return loc === 'strike' ? '🎯 STRIKE'
               : loc === 'borderline' ? '⚪ Borderline'
               : loc === 'ball' ? '⚾ Ball (outside zone)'
               : '😬 Wild pitch';
        }
        if (isFreeKick) {
          return loc === 'goal' ? '⚽ GOAL'
               : loc === 'post' ? (framePart === 'bar' ? '🥅 Off the crossbar' : framePart === 'corner' ? '🥅 Off the corner of the frame' : '🥅 Off the post')
               : loc === 'over' ? '⬆️ Over the bar'
               : loc === 'wide' ? '↔️ Wide of the goal'
               : loc === 'blocked' ? '🧱 Blocked by the wall'
               : '😬 Short';
        }
        if (isFieldGoal) {
          return loc === 'good' ? '🏈 IT IS GOOD'
               : loc === 'doink' ? (framePart === 'upright' ? '🥁 DOINK off the upright' : framePart === 'corner' ? '🥁 DOINK off the end of the bar' : '🥁 DOINK off the crossbar')
               : loc === 'shortbar' ? '⬇️ Short — under the bar'
               : loc === 'wideclose' ? '↔️ No good — just wide'
               : loc === 'wide' ? '↔️ No good — wide'
               : '😬 Short of the line';
        }
        if (isBowling) {
          return loc === 'wicket' ? '🏏 WICKET — howzat!'
               : loc === 'shaved' ? '🏏 Bail-trembler (still out)'
               : loc === 'bouncer' ? '🏏 BOUNCER — chest high'
               : loc === 'beamer' ? '⛔ Beamer (no-ball)'
               : loc === 'overhead' ? '⬆️ Over the head (no-ball)'
               : loc === 'wide' ? '↔️ Wide call'
               : loc === 'dot' ? '⚪ Dot ball — defended'
               : '😬 Bounced twice (no-ball)';
        }
        if (isGolf) {
          return loc === 'green' ? '⛳ ON THE GREEN'
               : loc === 'fairway' ? '🌱 Fairway'
               : loc === 'rough' ? '🌾 In the rough'
               : loc === 'woods' ? '🌳 In the trees'
               : loc === 'short' ? '😬 Short of the green'
               : loc === 'long' ? '↔️ Over the green'
               : '😬 Topped';
        }
        if (isVolleyball) {
          return loc === 'ace' ? '🏐 ACE'
               : loc === 'in' ? '✅ In'
               : loc === 'net' ? '🪤 Net (service error)'
               : loc === 'long' ? '↔️ Long (past back line)'
               : loc === 'out' ? '↔️ Out wide'
               : '😬 Short';
        }
        // Pass outcomes (kind: 'pass' shot types) reuse this same function.
        return loc === 'swish' ? '🌊 SWISH (clean center)'
             : loc === 'made' ? '🏀 MADE IT'
             : loc === 'caught' ? '🤝 CAUGHT (in the catch zone)'
             : loc === 'highpass' ? '⬆️ Sailed high'
             : loc === 'lowpass' ? '⬇️ Worm-burner'
             : loc === 'wrongbounce' ? '〰️ Wrong bounce style'
             : loc === 'rim' ? '〰️ Off the rim'
             : loc === 'backboard' ? '🪞 Off the backboard'
             : loc === 'short' ? '😬 Short'
             : loc === 'wide' ? '↔️ Wide'
             : loc === 'air' ? '💨 Airball (short)'
             : '😬 Miss';
      }
      // Dynamic explainer — generates outcome-specific feedback after a throw.
      // Combines what JUST happened (location, parameters) with the underlying
      // physics so the student gets coaching without needing a Gemini call.
      // Returns null when there's no result yet (we fall back to the static
      // grip/teach blurb of the active preset).
      function explainResult(lr) {
        if (!lr) return null;
        var loc = lr.location;
        var trial = lr.trial || buildTrialSnapshot(d, loc);
        var trialPreset = findPresetForTrial(trial);
        // Where the ball went comes from the model (evaluateThrow -> describeWhere). The second
        // sentence says why, using the same run: what spin changed, compared with no spin.
        var read = lr.read || {};
        var shift = read.spinShift || {};
        var cross = read.cross || {};
        var where = lr.whereText ? lr.whereText + ' ' : '';
        var aimBack = 'Move your left/right aim back toward the middle.';
        // What the low-spin dart did, from the same run with the dart switched off.
        var dart = read.dart, dartLine = '';
        if (dart) {
          var atTarget = dart.side !== null && dart.side !== undefined;
          var dSide = atTarget ? dart.side : dart.landSide;
          var dUp = atTarget ? dart.up : null;
          var dCarry = atTarget ? null : dart.landCarry;
          var fmtDart = isPitching ? function(v) { return Math.round(Math.abs(v) * 39.37) + ' in'; } : function(v) { return Math.round(Math.abs(v) * 100) + ' cm'; };
          var dartBits = [];
          if (typeof dSide === 'number' && Math.abs(dSide) >= 0.02) dartBits.push(fmtDart(dSide) + ' to the ' + (dSide > 0 ? 'left' : 'right'));
          if (typeof dUp === 'number' && Math.abs(dUp) >= 0.02) dartBits.push(fmtDart(dUp) + (dUp > 0 ? ' up' : ' down'));
          if (typeof dCarry === 'number' && Math.abs(dCarry) >= 0.02) dartBits.push(fmtDart(dCarry) + (dCarry > 0 ? ' longer' : ' shorter'));
          dartLine = dartBits.length
            ? 'With almost no spin the ball darted ' + dartBits.join(' and ') + ' (air pattern #' + dart.seed + '). In real life nobody can predict which way.'
            : 'With almost no spin the ball can dart, but this air pattern barely moved it.';
        }
        if (isPitching) {
          var upIn = (shift.up === null || shift.up === undefined) ? null : shift.up * 39.37;
          var sideIn = (shift.side === null || shift.side === undefined) ? null : shift.side * 39.37;
          var spinLine = (upIn !== null && Math.abs(upIn) >= 3)
            ? 'Spin moved the ball ' + Math.abs(upIn).toFixed(0) + ' in ' + (upIn > 0 ? 'up' : 'down') + ' compared with the same throw with no spin. ' + (upIn > 0 ? 'Backspin makes lift that fights gravity.' : 'Topspin pushes the ball down, on top of gravity.')
            : (sideIn !== null && Math.abs(sideIn) >= 3)
              ? 'Side spin moved the ball ' + Math.abs(sideIn).toFixed(0) + ' in to the ' + (sideIn > 0 ? 'left' : 'right') + ' compared with no spin.'
              : 'With this little spin, gravity and drag did almost all the work.';
          if (dartLine) spinLine = dartLine;
          if (loc === 'strike') return where + spinLine;
          if (loc === 'borderline') return where + 'It caught the edge of the zone. ' + spinLine;
          if (loc === 'ball') {
            return where + (cross.y < STRIKE_ZONE.yMin ? 'Aim a little higher, or add backspin to hold it up.'
              : cross.y > STRIKE_ZONE.yMax ? 'Aim a little lower, or take some backspin off.'
              : aimBack);
          }
          return where + 'Raise your aim so the ball stays in the air all the way to the plate.';
        }
        if (isFreeThrow) {
          var passKind = !!(trialPreset && trialPreset.kind === 'pass');
          if (passKind) {
            if (loc === 'caught') return where + 'A pass that arrives between the waist and the chest is easy to catch.';
            // Bounce pass advice follows the model: the floor sends the ball up at e times the speed it came
            // down with, so a steeper bounce comes up higher. A far bounce (past ⅔ of the way) is too shallow.
            var bpHops = read.hops || [];
            var bpFar = !!(bpHops.length === 1 && bpHops[0].z > PASS_RECEIVER_Z * 2 / 3);
            if (loc === 'highpass') return where + (trialPreset.id === 'bouncepass' ? 'Too high: it came down steeply, so it bounced up steeply. Throw softer, or aim a little less down so it bounces farther away.' : 'Too high. Aim lower or throw softer.');
            if (loc === 'lowpass') return where + 'Too low. ' + (trialPreset.id !== 'bouncepass' ? 'Aim a little higher.'
              : bpHops.length > 1 ? 'It was so slow that it bounced twice. Throw harder.'
              : bpFar ? 'It bounced close to your teammate, so it had no room to come back up. Aim down a little more so it bounces closer to you.'
              : 'Throw harder. A faster pass comes off the floor faster, too.');
            if (loc === 'wrongbounce') return where + (trialPreset.id === 'bouncepass' ? 'A bounce pass has to hit the floor once. Aim down more.' : 'A chest pass must not touch the floor. Aim higher or throw harder.');
            if (loc === 'wide') return where + aimBack;
            return where + 'It needs more speed.';
          }
          if (loc === 'swish') return where + 'Nothing but net. The ball is 24 cm wide and the rim is 46 cm wide, so it fit without touching.';
          if (loc === 'made') return where + (cross.banked ? 'The glass took speed off the ball and sent it down into the hoop.' : 'It brushed the rim and still dropped in.');
          if (loc === 'rim') return where + 'It caught the iron. ' + (cross.dz < 0 ? 'A touch more speed will carry it over the front of the rim.' : 'A touch less speed will keep it off the back of the rim.');
          if (loc === 'backboard') return where + 'Use less speed, or a higher arc, so it drops in front of the glass.';
          if (loc === 'air') return where + 'It needs more speed to reach the hoop.';
          return where + ((cross.dz !== null && cross.dz !== undefined && Math.abs(cross.dz) >= Math.abs(cross.dx || 0)) ? 'That is too much speed for this launch angle.' : aimBack);
        }
        if (isFreeKick) {
          var curl = (shift.side === null || shift.side === undefined) ? null : shift.side;
          var curlLine = (curl !== null && Math.abs(curl) >= 0.2) ? 'Side spin bent the ball ' + Math.abs(curl).toFixed(1) + ' m to the ' + (curl > 0 ? 'left' : 'right') + ' compared with no spin.' : '';
          // Spin's bend is measured at the line in the air only; after a bounce there is no in-air number to give.
          var kickBounced = curl === null && !!read.land && typeof read.targetZ === 'number' && read.land.z < read.targetZ;
          // A kick that rolled: what the bounces and the grass did to its speed, from the same run.
          var rollFrom = read.roll ? (read.roll.speed * MPH_PER_MPS).toFixed(0) : null;
          var rollAtLine = (read.rolledAtCross && typeof cross.vz === 'number') ? (Math.sqrt(cross.vx * cross.vx + cross.vz * cross.vz) * MPH_PER_MPS).toFixed(0) : null;
          if (loc === 'goal' && rollFrom && rollAtLine) return where + 'The bounces left it rolling at ' + rollFrom + ' mph. Rolling resistance on the grass slowed it to ' + rollAtLine + ' mph by the line, but it still got there.';
          if (loc === 'short' && rollFrom && read.rollStop) return where + 'The bounces left it rolling at ' + rollFrom + ' mph, and rolling resistance on the grass used up the rest of its speed before the line. Kick it harder.';
          if (loc === 'blocked' && read.rolledAtCross) return where + 'A ball on the ground cannot get over the wall. Raise the launch angle, or aim around the wall.';
          if (loc === 'goal') return where + (curlLine || dartLine || (kickBounced ? 'It bounced first, so the bend from spin is not measured at the line.' : 'Almost no curl: speed and aim did the work.'));
          if (loc === 'post') return where + (dartLine ? dartLine + ' Another air pattern may send it in.' : 'So close. A small change in aim or spin will do it.');
          if (loc === 'over') return where + (dartLine ? dartLine + ' ' : '') + 'Lower the launch angle, or add topspin so the ball dips.';
          if (loc === 'wide') return where + (curlLine ? curlLine + ' Aim further the other way to allow for the curl.' : 'Move your left/right aim toward the goal.');
          if (loc === 'blocked') return where + 'Go over the wall with more launch angle, or around it with left/right aim and side spin.';
          return where + 'It needs more speed or a higher launch angle.';
        }
        // What the wind did, from the same kick or shot in calm air.
        var ws = read.windShift, windLine = '';
        if (ws && typeof ws.side === 'number' && typeof ws.up === 'number') {
          var windBits = [];
          if (Math.abs(ws.side) >= 0.2) windBits.push(Math.abs(ws.side).toFixed(1) + ' m to the ' + (ws.side > 0 ? 'left' : 'right'));
          if (Math.abs(ws.up) >= 0.2) windBits.push(Math.abs(ws.up).toFixed(1) + ' m ' + (ws.up > 0 ? 'higher' : 'lower'));
          if (windBits.length) windLine = 'Compared with calm air, the wind moved it ' + windBits.join(' and ') + (isFieldGoal ? ' at the posts. ' : '. ');
        } else if (ws && typeof ws.carry === 'number' && Math.abs(ws.carry) >= 0.9) {
          windLine = 'Compared with calm air, the wind ' + (ws.carry < 0 ? 'took away ' : 'added ') + Math.round(Math.abs(ws.carry) / 0.9144) + ' yd of carry. ';
        }
        if (isFieldGoal) {
          if (loc === 'good') return where + windLine + 'Peak height ' + (typeof read.apex === 'number' ? read.apex.toFixed(1) : '?') + ' m. The ball has to be above the 3.05 m crossbar when it gets to the posts.';
          if (loc === 'doink') {
            var fgHit = read.frame ? read.frame.part : 'bar';
            return where + windLine + (fgHit === 'upright' ? 'It was high enough but not inside the uprights. A small aim change moves it in.'
              : fgHit === 'corner' ? 'It was a little low and a little wide. Move the aim in, then check it still clears the bar.'
              : 'It was in line but still a little low at the posts. A bit more speed lifts it over the bar.');
          }
          if (loc === 'shortbar') return where + windLine + 'It was already coming down. Add speed, or change the launch angle and compare.';
          if (loc === 'wideclose' || loc === 'wide') return where + windLine + (windLine ? 'Aim into the wind to allow for it.' : aimBack);
          return where + windLine + 'It needs more speed to carry that far.';
        }
        if (isVolleyball) {
          if (loc === 'ace') return where + 'That is the deep corner, the hardest spot to reach.';
          if (loc === 'in') return where + ((trial.spinRpm >= 200 && Math.abs(trial.spinAxisDeg - 180) <= 45) ? 'Topspin pushed the ball down, so a hard serve still dropped in.' : (dartLine || 'A legal serve. Deep corners are harder to return.'));
          if (loc === 'net') return where + 'Raise the launch angle a little, or serve from higher up.';
          if (loc === 'out') return where + aimBack;
          if (loc === 'long') return where + 'Use less speed, a lower angle, or topspin to bring it down sooner.';
          return where + 'It needs more speed or a higher launch angle.';
        }
        if (isGolf) {
          var carryYd = (shift.carry === null || shift.carry === undefined) ? null : shift.carry / 0.9144;
          var carryLine = (carryYd !== null && Math.abs(carryYd) >= 2) ? 'Backspin ' + (carryYd > 0 ? 'added ' : 'took away ') + Math.abs(carryYd).toFixed(0) + ' yd of carry compared with no spin. A spinning ball makes lift.' : '';
          if (loc === 'green' || loc === 'fairway') return where + carryLine + (windLine ? ' ' + windLine : '');
          if (loc === 'short') return where + 'Add ball speed, or pick a longer club. ' + carryLine;
          if (loc === 'long') return where + 'Use less ball speed, or pick a shorter club.';
          if (loc === 'rough' || loc === 'woods') return where + 'It finished off line. Set the spin axis and left/right aim back to 0 for a straight shot.';
          return where + 'Raise the launch angle so the ball gets into the air.';
        }
        if (isBowling) {
          var swing = (shift.side === null || shift.side === undefined) ? null : shift.side;
          var bnc = read.bounce;
          var mph = function(v) { return Math.round(v * MPH_PER_MPS); };
          var airLine = (swing !== null && Math.abs(swing) >= 0.05) ? 'In the air it moved ' + Math.round(Math.abs(swing) * 100) + ' cm to the ' + (swing > 0 ? 'left' : 'right') + '. ' : '';
          var turnLine = (typeof read.turn === 'number' && Math.abs(read.turn) >= 0.03) ? 'Off the pitch the spin turned it ' + Math.round(Math.abs(read.turn) * 100) + ' cm to the ' + (read.turn > 0 ? 'left' : 'right') + '. ' : '';
          var paceLine = bnc ? 'The bounce slowed it from ' + mph(bnc.speedIn) + ' to ' + mph(bnc.speedOut) + ' mph: friction with the pitch.' : 'With no bounce it lost no pace to the pitch.';
          if (loc === 'wicket' || loc === 'shaved') return where + airLine + turnLine + paceLine;
          if (loc === 'bouncer') return where + paceLine + ' A shorter, steeper ball bounces higher.';
          if (loc === 'beamer') return where + 'Aim lower so the ball bounces first.';
          if (loc === 'overhead') return where + 'Bounce it closer to the batter, or use less pace.';
          if (loc === 'wide') return where + airLine + turnLine + 'Bring the line back toward the stumps.';
          if (loc === 'dot') return where + airLine + turnLine + (resultPreset && resultPreset.kind === 'bouncer' ? 'For a bouncer, aim down more so it bounces shorter and climbs higher.' : 'A batter could leave or block this one.');
          return where + 'Add pace, or aim higher, so it reaches the batter after one bounce.';
        }
        return null;
      }

      // ── Math view: physics formulas + values for the last throw ──
      // Renders a small panel of the actual equations the simulator runs
      // with the current ball / wind / gravity numbers slotted in. WCAG
      // 1.1.1: each formula is text (not an image), so screen readers can
      // announce them. Only renders when d.showFormulas is true.
      function formulasPanel(lr) {
        if (!d.showFormulas) return null;
        var ball = BALLS[modeMeta.ball] || BALLS.baseball;
        var area = Math.PI * ball.radius * ball.radius;
        var gp = GRAVITY_PRESETS.find(function(g) { return g.id === (d.gravityId || 'earth'); });
        var gV = gp ? gp.g : G;
        var v0 = d.speedMph / MPH_PER_MPS;
        var dragF = 0.5 * 1.225 * v0 * v0 * ball.cd * area;
        var liftNow = liftCoefficient(ball, d.spinRpm * 2 * Math.PI / 60, v0);
        var spinFactor = v0 > 0 ? ball.radius * (d.spinRpm * 2 * Math.PI / 60) / v0 : 0;
        var magnusF = 0.5 * 1.225 * v0 * v0 * liftNow * area;
        // Ideal no-drag range: R = v²·sin(2θ)/g (assumes y0 = 0, only valid
        // when launch + landing are at the same height — close enough for a
        // teaching estimate).
        var thetaRad = d.aimDegV * Math.PI / 180;
        var idealRange = (v0 * v0) * Math.sin(2 * Math.abs(thetaRad)) / gV;
        var actualRange = (lr && lr.read && lr.read.land) ? lr.read.land.z : null;
        var rowStyle = { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', marginBottom: 4, fontFamily: 'system-ui' };
        var eqStyle = { fontSize: 12, color: '#fafafa', fontFamily: 'monospace', overflowWrap: 'anywhere' };
        var headStyle = { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 4, fontWeight: 600 };
        return h('section', {
          'aria-labelledby': 'tl-formulas-heading',
          style: { marginTop: 10, padding: 12, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10 }
        },
          h('h3', {
            id: 'tl-formulas-heading',
            style: { fontSize: 12, margin: 0, marginBottom: 6, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
          }, __alloT('stem.throwlab.math_behind_the_throw', 'Math behind the throw')),
          // Gravity + ball params
          h('div', { style: rowStyle },
            __alloT('stem.throwlab.g', 'g = '),
            h('span', { style: { color: '#fbbf24', fontWeight: 700 } }, gV.toFixed(2)),
            __alloT('stem.throwlab.m_s', ' m/s² ('), gp ? gp.label : 'Earth', ')'),
          h('div', { style: rowStyle },
            __alloT('stem.throwlab.ball_m', 'Ball: m = '), h('span', { style: { color: '#fbbf24' } }, ball.mass), ' kg, ',
            __alloT('stem.throwlab.r', 'r = '), h('span', { style: { color: '#fbbf24' } }, ball.radius), ' m, ',
            __alloT('stem.throwlab.cd', 'Cd = '), h('span', { style: { color: '#fbbf24' } }, ball.cd.toFixed(2)), ', ',
            __alloT('stem.throwlab.lift_coefficient_now', 'lift C_L = '), h('span', { style: { color: '#fbbf24' } }, liftNow.toFixed(3)), __alloT('stem.throwlab.at_spin_factor', ' at spin factor S = '), h('span', { style: { color: '#fbbf24' } }, spinFactor.toFixed(3))),
          h('div', { style: rowStyle },
            __alloT('stem.throwlab.a_r', 'A = πr² = '), h('span', { style: { color: '#fbbf24' } }, area.toExponential(2)), ' m²'),
          // Drag
          h('div', { style: headStyle }, __alloT('stem.throwlab.drag_force', 'Drag force')),
          h('div', { style: eqStyle }, __alloT('stem.throwlab.f_drag_v_rel_cd_a', 'F_drag = ½·ρ·|v_rel|²·Cd·A')),
          h('div', { style: rowStyle, 'aria-label': 'At release, drag force is ' + dragF.toFixed(2) + ' newtons' },
            '  ≈ ', h('span', { style: { color: '#fbbf24' } }, dragF.toFixed(2)), __alloT('stem.throwlab.n_at_release', ' N at release')),
          // Magnus
          h('div', { style: headStyle }, __alloT('stem.throwlab.magnus_lift_force', 'Magnus (lift) force')),
          h('div', { style: eqStyle }, __alloT('stem.throwlab.f_mag_v_rel_cm_a_v_v2', 'F_lift = ½·ρ·|v_rel|²·C_L·A   C_L = k·S / (0.4 + 2.32·S)   S = r·ω / v')),
          h('div', { style: rowStyle, 'aria-label': 'At release, Magnus force magnitude is ' + magnusF.toFixed(2) + ' newtons' },
            '  ≈ ', h('span', { style: { color: '#fbbf24' } }, magnusF.toFixed(2)), __alloT('stem.throwlab.n_at_release_this_spin', ' N at release with this spin')),
          // Ideal vs actual range
          h('div', { style: headStyle }, __alloT('stem.throwlab.ideal_no_drag_range', 'Ideal (no-drag) range')),
          h('div', { style: eqStyle }, __alloT('stem.throwlab.r_v_sin_2_g', 'R = v²·sin(2θ)/g')),
          h('div', { style: rowStyle },
            '  ≈ ', h('span', { style: { color: '#fbbf24' } }, idealRange.toFixed(1)), __alloT('stem.throwlab.m_at', ' m at θ = '), d.aimDegV.toFixed(1), '°',
            actualRange !== null ? h('span', null, __alloT('stem.throwlab.actual', ' · actual: '),
              h('span', { style: { color: '#fbbf24' } }, actualRange.toFixed(1)), ' m') : null,
            actualRange !== null && idealRange > 0
              ? h('span', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic' } },
                  ' (' + (((actualRange - idealRange) / idealRange) * 100).toFixed(0) + '% drag/Magnus delta)')
              : null
          ),
          // Bounce — coefficient of restitution
          h('div', { style: headStyle }, __alloT('stem.throwlab.bounce_coefficient_of_restitution', 'Bounce (coefficient of restitution)')),
          h('div', { style: eqStyle }, __alloT('stem.throwlab.v_after_e_v_before_ke_after_e_ke_befor', '|v_after| = e · |v_before|     KE_after = e²·KE_before')),
          h('div', { style: rowStyle },
            __alloT('stem.throwlab.e', 'e = '), h('span', { style: { color: '#fbbf24' } }, (ball.cor || 0).toFixed(2)),
            __alloT('stem.throwlab.for_a', ' for a '), ball.label, __alloT('stem.throwlab.on_a_regulation_surface', ' on a regulation surface. '),
            h('span', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic' } },
              __alloT('stem.throwlab.a_1m_drop_bounces_back', 'A 1m drop bounces back '), ((ball.cor || 0) * (ball.cor || 0)).toFixed(2), __alloT('stem.throwlab.m_of_height_energy_retained', ' m of height (energy retained).'))),
          // Free kick: each bounce on the grass (GRASS_SURFACE, the rule the simulation runs)
          isFreeKick ? h('div', { style: headStyle }, __alloT('stem.throwlab.formula_grass_bounce', 'Bouncing on the grass')) : null,
          isFreeKick ? h('div', { style: eqStyle }, __alloT('stem.throwlab.formula_grass_bounce_eq', 'v_up = e·|v_down|     speed lost along the ground ≈ μ·(1 + e)·|v_down|')) : null,
          isFreeKick ? h('div', { style: rowStyle, 'data-throwlab-formula-hops': 'true' },
            'μ = ', h('span', { style: { color: '#fbbf24' } }, GRASS_SURFACE.mu.toFixed(2)),
            __alloT('stem.throwlab.formula_grass_bounce_note', ' (a model choice). A low, skimming hop comes down slowly, so it loses little speed. A steep landing loses more, but never more than 40% of its speed along the ground, because by then the ball grips the grass and rolls.'),
            (lr && lr.read && lr.read.hops && lr.read.hops.length)
              ? ' Last kick: ' + lr.read.hops.map(function(hp) { return (hp.levelIn * MPH_PER_MPS).toFixed(0) + ' → ' + (hp.levelOut * MPH_PER_MPS).toFixed(0); }).join(', ') + ' mph along the ground at ' + (lr.read.hops.length === 1 ? 'its bounce.' : 'its ' + lr.read.hops.length + ' bounces.')
              : null) : null,
          // Basketball: each bounce on the hardwood (HARDWOOD_SURFACE, the rule the simulation runs)
          isFreeThrow ? h('div', { style: headStyle }, __alloT('stem.throwlab.formula_floor_bounce', 'Bouncing on the hardwood')) : null,
          isFreeThrow ? h('div', { style: eqStyle }, __alloT('stem.throwlab.formula_grass_bounce_eq', 'v_up = e·|v_down|     speed lost along the ground ≈ μ·(1 + e)·|v_down|')) : null,
          isFreeThrow ? h('div', { style: rowStyle, 'data-throwlab-formula-floor': 'true' },
            'μ = ', h('span', { style: { color: '#fbbf24' } }, HARDWOOD_SURFACE.mu.toFixed(2)),
            __alloT('stem.throwlab.formula_floor_bounce_note', ' (a model choice). A steep bounce loses more forward speed than a shallow one, but never more than 40%, because by then the ball grips the floor.'),
            (lr && lr.read && lr.read.hops && lr.read.hops.length)
              ? ' Last pass: ' + lr.read.hops.map(function(hp) { return (hp.levelIn * MPH_PER_MPS).toFixed(0) + ' → ' + (hp.levelOut * MPH_PER_MPS).toFixed(0); }).join(', ') + ' mph going forward at ' + (lr.read.hops.length === 1 ? 'its bounce.' : 'its ' + lr.read.hops.length + ' bounces.')
              : null) : null,
          // Free kick: rolling on the grass (the same numbers the simulation uses, MODES.freekick)
          isFreeKick ? h('div', { style: headStyle }, __alloT('stem.throwlab.formula_roll', 'Rolling on the grass')) : null,
          isFreeKick ? h('div', { style: eqStyle }, __alloT('stem.throwlab.formula_roll_eq', 'v² = v₀² − 2·a_roll·d   (a_roll grows with g)')) : null,
          isFreeKick ? h('div', { style: rowStyle, 'data-throwlab-formula-roll': 'true' },
            'a_roll = ', h('span', { style: { color: '#fbbf24' } }, modeMeta.rollDecel.toFixed(2)), ' m/s² ',
            __alloT('stem.throwlab.formula_roll_note', 'on Earth grass. This is a model choice, not a measured value: real grass changes with its length and how wet it is. A bounce lower than 1.5 cm counts as rolling, and drag still acts.'),
            gV !== G ? ' With this gravity: ' + (modeMeta.rollDecel * gV / G).toFixed(2) + ' m/s².' : null,
            (lr && lr.read && lr.read.roll && !(lr.read.cross && lr.read.roll.t > lr.read.cross.t))
              ? (lr.read.rollStop
                ? ' Last kick: rolled from ' + (lr.read.roll.speed * MPH_PER_MPS).toFixed(0) + ' mph to a stop in ' + Math.hypot(lr.read.rollStop.x - lr.read.roll.x, lr.read.rollStop.z - lr.read.roll.z).toFixed(1) + ' m.'
                : ' Last kick: started rolling at ' + (lr.read.roll.speed * MPH_PER_MPS).toFixed(0) + ' mph, ' + lr.read.roll.z.toFixed(1) + ' m out.')
              : null) : null,
          // Cricket: what the pitch does to the ball (the same pitchBounce the simulation runs)
          isBowling ? h('div', { style: headStyle }, __alloT('stem.throwlab.formula_pitch_bounce', 'Bounce off the pitch')) : null,
          isBowling ? h('div', { style: eqStyle }, __alloT('stem.throwlab.formula_pitch_bounce_eq', 'v_up = e·|v_down|     pace lost ≈ μ·(1 + e)·|v_down|')) : null,
          isBowling ? h('div', { style: rowStyle },
            'μ = ', h('span', { style: { color: '#fbbf24' } }, CRICKET_SURFACE.mu.toFixed(2)),
            (lr && lr.read && lr.read.bounce)
              ? __alloT('stem.throwlab.formula_pitch_bounce_last', '. Last ball: ') + (lr.read.bounce.speedIn * MPH_PER_MPS).toFixed(0) + ' → ' + (lr.read.bounce.speedOut * MPH_PER_MPS).toFixed(0) + ' mph, turned ' + Math.abs(lr.read.bounce.turnDeg).toFixed(1) + '°.'
              : __alloT('stem.throwlab.formula_pitch_bounce_none', '. Friction pushes against the way the bottom of the ball slides, so side spin turns the ball.')) : null,
          // Low-spin dart (baseball, soccer, volleyball)
          ball.knuckle ? h('div', { style: headStyle }, __alloT('stem.throwlab.formula_dart', 'Low-spin dart')) : null,
          ball.knuckle ? h('div', { style: eqStyle }, __alloT('stem.throwlab.formula_dart_eq', 'F_dart = ½·ρ·v²·A·C_k·w     w = (1 − rpm / cut)²')) : null,
          ball.knuckle ? h('div', { style: rowStyle },
            'C_k = ', h('span', { style: { color: '#fbbf24' } }, ball.knuckle.toFixed(2)),
            ', cut = ', h('span', { style: { color: '#fbbf24' } }, ball.knuckleCutRpm), ' rpm, w = ',
            h('span', { style: { color: '#fbbf24' } }, knuckleWeight(ball, d.spinRpm).toFixed(2)),
            __alloT('stem.throwlab.formula_dart_note', ' at this spin. The push changes direction as the ball slowly turns. Its starting direction is the numbered air pattern.')) : null
        );
      }

      // ── Ball regulations + materials panel ──
      // Surfaced under the formulas panel when showFormulas is on. Each ball
      // spec is real (MLB / NBA / NFL / FIFA published rules) + a one-line
      // physics explanation tying the spec to its on-field consequence.
      function ballSpecsPanel() {
        if (!d.showFormulas) return null;
        var ball = BALLS[modeMeta.ball] || BALLS.baseball;
        var regs = ball.regs;
        if (!regs) return null;
        var rowStyle = { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', marginBottom: 6 };
        var labelStyle = { color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 600, marginRight: 6 };
        return h('section', {
          'aria-labelledby': 'tl-regs-heading',
          style: { marginTop: 10, padding: 12, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10 }
        },
          h('h3', {
            id: 'tl-regs-heading',
            style: { fontSize: 12, margin: 0, marginBottom: 6, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
          }, ball.icon + ' ' + ball.label + ' regulations & materials'),
          h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 8, fontStyle: 'italic' } }, regs.league),
          h('div', { style: rowStyle }, h('span', { style: labelStyle }, 'Mass:'), regs.massSpec),
          h('div', { style: rowStyle }, h('span', { style: labelStyle }, 'Diameter:'), regs.diameterSpec),
          h('div', { style: rowStyle }, h('span', { style: labelStyle }, 'Pressure:'), regs.pressureSpec),
          h('div', { style: rowStyle }, h('span', { style: labelStyle }, 'Material:'), regs.material),
          h('div', { style: { marginTop: 8, padding: 8, background: 'var(--allo-stem-panel, #1e293b)', borderRadius: 6, fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)' } },
            h('span', { style: { color: '#fbbf24', fontWeight: 700, marginRight: 6 } }, __alloT('stem.throwlab.why_it_matters', 'Why it matters:')),
            regs.physics)
        );
      }

      function outcomeColor(loc) {
        if (isPitching) {
          return loc === 'strike' ? '#10b981' : loc === 'borderline' ? '#fbbf24' : loc === 'ball' ? '#94a3b8' : '#ef4444';
        }
        if (isFreeKick) {
          return loc === 'goal' ? '#10b981' : loc === 'post' ? '#fbbf24' : loc === 'blocked' ? '#94a3b8' : '#ef4444';
        }
        if (isFieldGoal) {
          return loc === 'good' ? '#10b981' : loc === 'doink' ? '#fbbf24' : loc === 'wideclose' ? '#f97316' : '#ef4444';
        }
        if (isBowling) {
          return loc === 'bouncer' ? '#10b981'
               : loc === 'wicket' || loc === 'shaved' ? '#10b981'
               : loc === 'dot' ? '#3b82f6'
               : loc === 'overhead' || loc === 'beamer' ? '#f97316'
               : '#ef4444';
        }
        if (isGolf) {
          return loc === 'green' ? '#10b981'
               : loc === 'fairway' ? '#3b82f6'
               : loc === 'rough' ? '#fbbf24'
               : loc === 'short' || loc === 'long' ? '#f97316'
               : '#ef4444';
        }
        if (isVolleyball) {
          return loc === 'ace' ? '#10b981'
               : loc === 'in' ? '#3b82f6'
               : loc === 'net' ? '#f97316'
               : '#ef4444';
        }
        // Basketball shot and pass outcomes.
        return loc === 'swish' ? '#10b981'
             : loc === 'made' ? '#3b82f6'
             : loc === 'caught' ? '#10b981'
             : loc === 'highpass' || loc === 'lowpass' ? '#fbbf24'
             : loc === 'wrongbounce' ? '#f97316'
             : loc === 'rim' ? '#fbbf24'
             : loc === 'backboard' ? '#94a3b8'
             : '#ef4444';
      }

      function throwActionLabel() {
        return isPitching ? __alloT('stem.throwlab.throw_pitch_action', 'THROW PITCH')
             : isFreeKick ? __alloT('stem.throwlab.strike_action', 'STRIKE')
             : isFieldGoal ? __alloT('stem.throwlab.kick_action', 'KICK')
             : isBowling ? __alloT('stem.throwlab.bowl_action', 'BOWL')
             : isGolf ? __alloT('stem.throwlab.tee_off_action', 'TEE OFF')
             : isVolleyball ? __alloT('stem.throwlab.serve_action', 'SERVE')
             : __alloT('stem.throwlab.shoot_action', 'SHOOT');
      }

      function readyPrompt() {
        if (isPitching) return 'Choose a pitch, call Strike / Borderline / Outside, then launch.';
        if (isFreeThrow) return 'Choose a shot or pass, call the outcome, then launch.';
        if (isFreeKick) return 'Choose a kick, predict Goal / Post / No goal, then strike.';
        if (isFieldGoal) return 'Choose a distance, predict Good / Close / No good, then kick.';
        if (isBowling) return 'Choose a delivery, predict Wicket / Dot ball / Miss, then bowl.';
        if (isGolf) return 'Choose a club, predict Green / Fairway / Off target, then tee off.';
        return 'Choose a serve, predict Ace / In court / Service error, then serve.';
      }

      function renderThrowRunFocus() {
        // Success rate is sport-specific. Using the all-sports throw total here
        // made a learner's pitching rate collapse after trying basketball.
        var throws = (d.modeThrowCounts && d.modeThrowCounts[d.mode]) || 0;
        var made = isPitching ? (d.strikeCount || 0)
                 : isFreeKick ? (d.goalCount || 0)
                 : isFieldGoal ? (d.fgMakeCount || 0)
                 : isBowling ? (d.wicketCount || 0)
                 : isGolf ? (d.golfGreenCount || 0)
                 : isVolleyball ? (d.volleyAceCount || 0)
                 : (d.shotMakeCount || 0);
        var madeLabel = isPitching ? __alloT('stem.throwlab.strikes', 'Strikes')
                      : isFreeKick ? __alloT('stem.throwlab.goals', 'Goals')
                      : isFieldGoal ? __alloT('stem.throwlab.made', 'Made')
                      : isBowling ? __alloT('stem.throwlab.wickets', 'Wickets')
                      : isGolf ? __alloT('stem.throwlab.greens', 'Greens')
                      : isVolleyball ? __alloT('stem.throwlab.aces', 'Aces')
                      : __alloT('stem.throwlab.successful_basketball_reps', 'Successful reps');
        var successPct = throws ? Math.round((made / throws) * 100) : 0;
        var gp = GRAVITY_PRESETS.find(function(g) { return g.id === (d.gravityId || 'earth'); }) || GRAVITY_PRESETS[0];
        var windText = (d.windMph || 0)
          ? (d.windMph + ' mph wind')
          : __alloT('stem.throwlab.calm_air', 'Calm air');
        var shown = tlInFlight ? null : lr; // nothing about this throw is shown until it lands
        var flightLoc = (tlInFlight && lr) ? lr.location : '';
        var flightCounted = isPitching ? flightLoc === 'strike' : isFreeKick ? flightLoc === 'goal' : isFieldGoal ? flightLoc === 'good'
          : isBowling ? (flightLoc === 'wicket' || flightLoc === 'shaved') : isGolf ? flightLoc === 'green' : isVolleyball ? flightLoc === 'ace'
          : (flightLoc === 'swish' || flightLoc === 'made' || flightLoc === 'caught');
        if (flightCounted) made = Math.max(0, made - 1);
        var outcomeText = shown
          ? outcomeLabel(shown.location, shown).replace(/^[^A-Za-z]+/, '')
          : tlInFlight ? __alloT('stem.throwlab.in_flight', 'In flight') : __alloT('stem.throwlab.ready_to_launch', 'Ready to launch');
        var nextRep = shown ? buildNextRepRecommendation(shown) : null;
        var guideText = shown
          ? (nextRep
              ? __alloT('stem.throwlab.next_rep_prefix', 'Next rep:') + ' ' + nextRep.label + '. ' + nextRep.reason
              : (explainResult(shown) || activePreset.teach || __alloT('stem.throwlab.tune_one_variable_and_try_again', 'Tune one variable and try again.')))
          : tlInFlight ? __alloT('stem.throwlab.ball_in_the_air', 'The ball is in the air. Watch where it goes.') : __alloT('stem.throwlab.choose_a_setup_launch_then_compare_the', 'Choose a setup, launch, then compare the arc as you tune one variable.');
        if (guideText && guideText.length > 150) guideText = guideText.slice(0, 147) + '...';
        var progressWidth = throws ? Math.max(8, successPct) : 0;
        var trajectoryShape = d.aimDegV < 5 ? 'direct' : d.aimDegV > 40 ? 'high' : 'arc';
        var metricBg = 'rgba(15,23,42,0.58)';
        var targetText = isPitching ? __alloT('stem.throwlab.zone_target', 'Strike zone')
          : isFreeKick ? __alloT('stem.throwlab.goal_target', 'Goal mouth')
          : isFieldGoal ? __alloT('stem.throwlab.uprights_target', 'Uprights')
          : isBowling ? __alloT('stem.throwlab.stumps_target', 'Stumps')
          : isGolf ? __alloT('stem.throwlab.green_target', 'Green')
          : isVolleyball ? __alloT('stem.throwlab.deep_corner_target', 'Deep court')
          : __alloT('stem.throwlab.hoop_target', 'Hoop');
        function metric(label, value, detail, color) {
          return h('div', {
            style: {
              minHeight: 72,
              padding: 8,
              borderRadius: 12,
              background: metricBg,
              border: '1px solid rgba(148,163,184,0.18)'
            }
          },
            h('div', { style: { fontSize: 10, fontWeight: 800, color: '#fcd34d', textTransform: 'uppercase', letterSpacing: 0 } }, label),
            h('div', { style: { fontSize: 18, fontWeight: 900, color: color || '#f8fafc', lineHeight: 1.1 } }, value),
            h('div', { style: { fontSize: 11, color: '#cbd5e1' } }, detail)
          );
        }
        return h('section', {
          'data-throwlab-run-focus': 'true',
          'aria-label': __alloT('stem.throwlab.launch_focus', 'Launch focus'),
          className: 'throwlab-run-focus-grid',
          style: {
            marginBottom: 14,
            padding: 14,
            borderRadius: 16,
            background: 'linear-gradient(135deg,rgba(251,191,36,0.16),rgba(14,165,233,0.10) 48%,rgba(124,58,237,0.12)),#0f172a',
            border: '1px solid rgba(251,191,36,0.34)',
            boxShadow: '0 18px 38px rgba(15,23,42,0.28)'
          }
        },
          h('div', null,
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 } },
              h('span', { style: { fontSize: 20 }, 'aria-hidden': 'true' }, modeMeta.icon),
              h('span', {
                style: {
                  padding: '4px 9px',
                  borderRadius: 20,
                  background: 'rgba(251,191,36,0.16)',
                  color: '#fde68a',
                  border: '1px solid rgba(251,191,36,0.34)',
                  fontSize: 11,
                  fontWeight: 900
                }
              }, outcomeText),
              h('span', { style: { color: '#cbd5e1', fontSize: 11, fontWeight: 700 } }, modeMeta.label + ' - ' + (activePreset.label || 'custom setup'))
            ),
            h('div', { style: { color: '#f8fafc', fontSize: 17, fontWeight: 900, lineHeight: 1.18 } },
              throws ? madeLabel + ': ' + made + ' of ' + throws : __alloT('stem.throwlab.first_launch_ready', 'First launch ready')),
            h('div', { style: { marginTop: 5, color: '#dbeafe', fontSize: 12, lineHeight: 1.45 } }, guideText),
            h('div', {
              className: 'throwlab-launch-arc',
              role: 'img',
              'data-trajectory-shape': trajectoryShape,
              'aria-label': 'Setup summary, not a predicted trajectory. Release ' + d.releaseHeight.toFixed(2) + ' meters, vertical angle ' + d.aimDegV.toFixed(1) + ' degrees, spin ' + d.spinRpm + ' rpm, target ' + targetText + '.'
            },
              h('span', { className: 'throwlab-arc-point', style: { left: '7%', bottom: 12 } },
                __alloT('stem.throwlab.release', 'Release'), ' ', d.releaseHeight.toFixed(2), ' m'),
              h('span', { className: 'throwlab-arc-point', style: { left: '38%', top: 14 } },
                d.aimDegV.toFixed(1), '° / ', d.spinRpm, ' rpm'),
              h('span', { className: 'throwlab-arc-point', style: { right: '7%', bottom: 12 } },
                targetText)
            ),
            h('div', {
              role: 'progressbar',
              'aria-valuenow': Math.round(successPct),
              'aria-valuemin': 0,
              'aria-valuemax': 100,
              style: { marginTop: 12, height: 9, borderRadius: 20, overflow: 'hidden', background: 'rgba(15,23,42,0.72)' },
              'aria-label': modeMeta.label + ' success rate: ' + successPct + ' percent from ' + throws + ' attempts',
              'data-throwlab-mode-attempts': String(throws)
            },
              h('div', {
                style: {
                  width: progressWidth + '%',
                  height: '100%',
                  background: successPct >= 50 ? 'linear-gradient(90deg,#22c55e,#84cc16)' : 'linear-gradient(90deg,#fbbf24,#f97316)',
                  boxShadow: '0 0 12px rgba(251,191,36,0.5)'
                }
              })
            )
          ),
          h('div', null,
            h('div', { className: 'throwlab-metric-grid' },
              metric(__alloT('stem.throwlab.speed', 'Speed'), d.speedMph + ' mph', __alloT('stem.throwlab.launch_power', 'Launch power'), '#fbbf24'),
              metric(__alloT('stem.throwlab.success_rate', 'Success rate'), successPct + '%', madeLabel + ' / ' + __alloT('stem.throwlab.throws', 'throws'), successPct >= 50 ? '#22c55e' : '#38bdf8'),
              metric(__alloT('stem.throwlab.gravity', 'Gravity'), gp.label, windText, '#a78bfa')
            ),
            h('button', {
              onClick: focusLaunchControls,
              'aria-controls': 'throwlab-launch-controls',
              'data-tl-focusable': 'true',
              style: {
                marginTop: 10,
                width: '100%',
                padding: '11px 14px',
                borderRadius: 12,
                cursor: 'pointer',
                border: '1px solid rgba(251,191,36,0.55)',
                background: 'linear-gradient(90deg,#f59e0b,#ef4444)',
                color: '#111827',
                fontSize: 14,
                fontWeight: 900,
                boxShadow: '0 12px 24px rgba(245,158,11,0.22)'
              }
            }, throws ? __alloT('stem.throwlab.set_up_next_rep', 'SET UP NEXT REP') : __alloT('stem.throwlab.set_up_first_rep', 'SET UP FIRST REP'))
          )
        );
      }

      // width + minWidth: as a flex item the root used to grow to its widest child's natural
      // size (544 px on a 390 px phone), which pushed the target off the right edge.
      return h('div', { 'data-throwlab-root': 'true', style: { padding: 16, color: 'var(--allo-stem-text, #f1f5f9)', width: '100%', minWidth: 0, boxSizing: 'border-box', maxWidth: '68rem', margin: '0 auto' } },
        // Scenario intro card — pops when a one-click teaching demo loads.
        // Surfaces the scenario's `teach` paragraph + discussion questions
        // before the simulation runs (previously hover-only on the chip).
        // Port of SkateLab SK3 pattern: "Run it now" fires synchronously
        // (no setTimeout — caused stale-closure / canvas-race in SK3).
        scenarioIntro && h('div', {
          onClick: function(e) { if (e.target === e.currentTarget) closeScenarioIntro(false); },
          style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                   zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center',
                   padding: 16 }
        },
          h('div', {
            ref: scenarioDialogRef,
            role: 'dialog', 'aria-modal': 'true',
            tabIndex: -1,
            'aria-labelledby': 'tl-scenario-intro-title',
            'aria-describedby': 'tl-scenario-intro-description',
            'data-throwlab-scenario-dialog': 'true',
            style: { background: 'var(--allo-stem-canvas, #0f172a)', border: '2px solid var(--allo-stem-border, #334155)', borderRadius: 14,
                     maxWidth: 560, width: '100%', maxHeight: '85vh', overflow: 'auto',
                     padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }
          },
            // Header
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 36 } }, scenarioIntro.icon || '🎬'),
              h('h2', { id: 'tl-scenario-intro-title',
                style: { flex: 1, margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--allo-stem-text, #f1f5f9)' } },
                scenarioIntro.label),
              h('button', {
                ref: scenarioCloseRef,
                onClick: function() { closeScenarioIntro(false); },
                'aria-label': __alloT('stem.throwlab.close_scenario_intro', 'Close scenario intro'),
                style: { background: 'transparent', border: '1px solid var(--allo-stem-border, #475569)', color: 'var(--allo-stem-text, #cbd5e1)',
                         width: 32, height: 32, borderRadius: 6, cursor: 'pointer',
                         fontSize: 16, lineHeight: 1, fontWeight: 700 }
              }, '×')
            ),
            // The story
            h('div', { style: { marginBottom: 14 } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24',
                                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 } },
                __alloT('stem.throwlab.the_story', '📜 The story')),
              h('p', { id: 'tl-scenario-intro-description', style: { margin: 0, color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 14, lineHeight: 1.5 } },
                scenarioIntro.teach)
            ),
            // Discussion questions (only if present)
            scenarioIntro.questions && scenarioIntro.questions.length > 0 && h('div', {
              style: { marginBottom: 16 }
            },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#a78bfa',
                                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 } },
                __alloT('stem.throwlab.try_these_before_you_run_it', '🤔 Try these before you run it')),
              h('ul', { style: { margin: 0, paddingLeft: 20, color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 13, lineHeight: 1.5 } },
                scenarioIntro.questions.map(function(q, i) {
                  return h('li', { key: 'tl-sq-' + i, style: { marginBottom: 6 } }, q);
                })
              )
            ),
            // Buttons
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 } },
              h('button', {
                onClick: function() { closeScenarioIntro(true); throwPitch(); },
                'data-tl-focusable': 'true',
                style: { flex: '1 1 200px', padding: '10px 14px', borderRadius: 8,
                         border: 'none', background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                         color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                         boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }
              }, __alloT('stem.throwlab.run_it_now', '🎯 Run it now')),
              h('button', {
                onClick: function() { closeScenarioIntro(false); },
                'data-tl-focusable': 'true',
                style: { flex: '1 1 160px', padding: '10px 14px', borderRadius: 8,
                         border: '1px solid var(--allo-stem-border, #475569)', background: 'var(--allo-stem-panel, #1e293b)',
                         color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
              }, __alloT('stem.throwlab.explore_controls_first', '🔧 Explore controls first'))
            )
          )
        ),
        // (The Pitch Locker banner is drawn in the page flow just below the launch button.)
        // Bespoke Sports Physics & Ballistics Workbench Hero Header
        (function() {
          var gravMeta = GRAVITY_PRESETS.filter(function(g) { return g.id === d.gravityId; })[0] || GRAVITY_PRESETS[0];
          var throwEmblem = h('svg', {
            className: 'throwlab-hero-extra',
            width: 42, height: 42, viewBox: '0 0 42 42', 'aria-hidden': 'true',
            style: { flexShrink: 0, display: 'block' }
          },
            h('rect', { x: 1.5, y: 1.5, width: 39, height: 39, rx: 10, fill: 'rgba(2,6,23,0.78)', stroke: 'rgba(251,191,36,0.58)', strokeWidth: 1.5 }),
            h('line', { x1: 7, y1: 33, x2: 35, y2: 33, stroke: 'rgba(148,163,184,0.55)', strokeWidth: 1.4 }),
            h('path', { d: 'M9 31 Q20 7 33 25', fill: 'none', stroke: '#fbbf24', strokeWidth: 2.2, strokeDasharray: '3 2.5', strokeLinecap: 'round' }),
            h('circle', { cx: 21, cy: 16, r: 4.2, fill: '#f97316', stroke: '#fef3c7', strokeWidth: 1.3 }),
            h('path', { d: 'M18 11 A5.5 5.5 0 0 1 25 11', fill: 'none', stroke: '#38bdf8', strokeWidth: 1.4, strokeLinecap: 'round' }),
            h('circle', { cx: 33, cy: 25, r: 2.5, fill: '#22c55e' })
          );
          var pillStyle = {
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(148,163,184,0.38)',
            color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums'
          };
          return h('header', {
            className: 'throwlab-hero-card',
            style: {
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
              padding: '9px 14px', marginBottom: 10, borderRadius: 16,
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 52%, #172554 100%)',
              border: '1px solid rgba(251,191,36,0.38)',
              boxShadow: '0 10px 28px rgba(2,6,23,0.42)'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 240px', flexWrap: 'wrap' } },
              ArrowLeft && h('button', {
                onClick: function() { setStemLabTool && setStemLabTool(null); },
                'data-tl-focusable': 'true',
                'aria-label': __alloT('stem.throwlab.back_to_stem_lab', 'Back to STEAM Lab'),
                style: { background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid var(--allo-stem-border, #475569)', color: 'var(--allo-stem-text, #f1f5f9)', padding: '6px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }
              }, __alloT('stem.throwlab.back', '← Back')),
              throwEmblem,
              h('div', { style: { minWidth: 0, flex: '1 1 160px' } },
                h('div', { className: 'throwlab-hero-extra', style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 } },
                  h('span', { className: 'throwlab-telemetry-pill', style: Object.assign({}, pillStyle, { textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fde68a', borderColor: 'rgba(251,191,36,0.48)' }) },
                    __alloT('stem.throwlab.subject_badge', 'Physics · Sports Ballistics')),
                  h('span', { className: 'throwlab-telemetry-pill', style: pillStyle },
                    gravMeta.icon + ' ' + gravMeta.label + ' (' + gravMeta.g + ' m/s²)')
                ),
                h('h2', { style: { margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--allo-stem-text, #f8fafc)', lineHeight: 1.2 } }, modeMeta.icon + ' ThrowLab — ' + modeMeta.label),
                h('span', { className: 'throwlab-hero-extra', style: { display: 'block', marginTop: 2, fontSize: 12, color: 'var(--allo-stem-text-soft, #cbd5e1)' } }, __alloT('stem.throwlab.evidence_loop_tagline', 'Build evidence one throw at a time.'))
              )
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 } },
              h('span', { className: 'throwlab-telemetry-pill', style: pillStyle },
                __alloT('stem.throwlab.telemetry_throws', 'Throws:') + ' ' + (Number(d.throwCount) || 0)),
              d.mode === 'pitching' && h('span', { className: 'throwlab-telemetry-pill', style: Object.assign({}, pillStyle, { color: '#86efac', borderColor: 'rgba(74,222,128,0.45)' }) },
                __alloT('stem.throwlab.telemetry_strikes', 'Strikes:') + ' ' + Math.max(0, (Number(d.strikeCount) || 0) - ((tlInFlight && lr && lr.location === 'strike') ? 1 : 0))),
              (Number(d.windMph) || 0) > 0 && h('span', { className: 'throwlab-telemetry-pill', style: Object.assign({}, pillStyle, { color: '#7dd3fc', borderColor: 'rgba(56,189,248,0.45)' }) },
                '💨 ' + Math.round(Number(d.windMph) || 0) + ' mph')
            )
          );
        })(),
        // Mode picker — pill row, prominent under header. role=tablist makes
        // assistive-tech treat it as a single-select control group.
        h('div', {
          className: 'throwlab-mode-tabs',
          role: 'tablist',
          'aria-label': __alloT('stem.throwlab.sport_modes', 'Sport modes'),
          'aria-orientation': 'horizontal',
          style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }
        },
          modeIds.map(function(mid) {
            var mm = MODES[mid];
            var sel = d.mode === mid;
            return h('button', {
              key: mid,
              id: 'throwlab-mode-tab-' + mid,
              className: 'throwlab-mode-tab',
              tabIndex: sel ? 0 : -1,
              onKeyDown: function(event) { onModeTabKeyDown(event, mid); },
              role: 'tab',
              onClick: function() { switchMode(mid); },
              'aria-selected': sel,
              'aria-controls': 'throwlab-fs-workspace',
              'data-tl-focusable': 'true',
              style: {
                padding: '8px 14px', borderRadius: 22, cursor: 'pointer',
                border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 13, fontWeight: 600
              }
            }, mm.icon + ' ' + mm.label);
          })
        ),

        // Two-column layout
        h('div', {
          id: 'throwlab-fs-workspace',
          className: 'throwlab-play-grid',
          'data-throwlab-play-grid': 'true',
          'data-throwlab-fullscreen-workspace': 'true',
          role: 'tabpanel',
          'aria-labelledby': 'throwlab-mode-tab-' + d.mode
        },

          // LEFT: side-view canvas (wrapped for fullscreen) + result panel
          h('div', null,
            h('div', { className: 'throwlab-sim-toolbar', 'data-throwlab-canvas-toolbar': 'true' },
              h('div', { 'data-throwlab-goal': d.mode, style: { fontSize: 13, fontWeight: 900, color: '#fde68a', flex: '1 1 180px', minWidth: 0 } },
                isPitching ? __alloT('stem.throwlab.goal_short_pitching', 'Goal: throw it through the strike zone')
                : isFreeThrow ? ((activePreset && activePreset.kind === 'pass') ? __alloT('stem.throwlab.goal_short_pass_v2', 'Goal: reach your teammate between the waist and the chest') : __alloT('stem.throwlab.goal_short_freethrow', 'Goal: drop it through the hoop'))
                : isFreeKick ? __alloT('stem.throwlab.goal_short_freekick', 'Goal: get past the wall and into the net')
                : isFieldGoal ? __alloT('stem.throwlab.goal_short_fieldgoal', 'Goal: over the crossbar, between the posts')
                : isBowling ? ((activePreset && activePreset.kind === 'bouncer') ? __alloT('stem.throwlab.goal_short_bouncer', 'Goal: bounce it short and reach the batter chest high') : __alloT('stem.throwlab.goal_short_bowling_v2', 'Goal: bounce it once and hit the stumps'))
                : isGolf ? __alloT('stem.throwlab.goal_short_golf', 'Goal: land on the green by the flag')
                : __alloT('stem.throwlab.goal_short_volleyball', 'Goal: over the net and inside the court')),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11, fontWeight: 700 } },
                h('span', {
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '5px 10px',
                    borderRadius: 18,
                    lineHeight: 1.2,
                    background: 'rgba(14,165,233,0.14)',
                    color: '#bae6fd',
                    border: '1px solid rgba(56,189,248,0.26)'
                  }
                }, lr ? (resultTrial.presetLabel || resultTrial.shotKind || modeMeta.label) : (activePreset.label || modeMeta.label)),
                h('span', {
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '5px 10px',
                    borderRadius: 18,
                    lineHeight: 1.2,
                    background: 'rgba(251,191,36,0.14)',
                    color: '#fde68a',
                    border: '1px solid rgba(251,191,36,0.28)'
                  }
                }, (lr ? resultTrial.speedMph : d.speedMph) + ' mph'),
                // First-screen way into the challenge: loads the near miss (or jumps to the card).
                (function() {
                  var fmNow = (d.fixMiss && d.fixMiss.mode === d.mode && !d.fixMiss.done) ? d.fixMiss : null;
                  var fixWasDone = !!((d.fixMissDone || {})[d.mode]);
                  var label = fmNow ? __alloT('stem.throwlab.challenge_fix_active', '🔧 Fix it: change ONE control')
                    : !fixWasDone ? __alloT('stem.throwlab.challenge_fix_start', '🔧 Challenge: fix a miss')
                    : '🧩 ' + TIER_NAMES[Math.max(1, Math.min(4, d.scaffoldTier || 3))] + ' ' + __alloT('stem.throwlab.challenge_word', 'challenge');
                  return h('button', {
                    type: 'button',
                    'data-tl-focusable': 'true',
                    className: 'throwlab-challenge-entry',
                    'data-throwlab-challenge-entry': fmNow ? 'active' : !fixWasDone ? 'start' : 'question',
                    disabled: !!d.replayActive && !fmNow && !fixWasDone,
                    onClick: function() {
                      if (!fmNow && !fixWasDone) { loadFixMiss(); return; }
                      var cardEl = document.querySelector('[data-throwlab-challenge]');
                      if (cardEl && typeof cardEl.scrollIntoView === 'function') cardEl.scrollIntoView({ behavior: _tlIsReducedMotion() ? 'auto' : 'smooth', block: 'center' });
                      var statusEl = cardEl && cardEl.querySelector('p');
                      tlAnnounce(statusEl ? statusEl.textContent : 'Challenge');
                    },
                    style: {
                      minHeight: 44, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                      border: '1px solid rgba(52,211,153,0.6)', background: 'rgba(16,185,129,0.16)', color: '#a7f3d0', fontWeight: 800
                    }
                  }, label);
                })(),
                h('button', {
                  type: 'button',
                  'aria-expanded': showImmersive3D,
                  'aria-controls': 'throwlab-immersive-zone',
                  'data-tl-focusable': 'true',
                  onClick: function() {
                    var next = !showImmersive3D;
                    setShowImmersive3D(next);
                    tlAnnounce(next ? 'Immersive 3D perspective opened.' : 'Immersive 3D perspective closed.');
                  },
                  style: {
                    minHeight: 44, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                    border: showImmersive3D ? '2px solid #fbbf24' : '1px solid rgba(125,211,252,0.42)',
                    background: showImmersive3D ? 'rgba(251,191,36,0.18)' : 'rgba(14,165,233,0.12)',
                    color: showImmersive3D ? '#fde68a' : '#bae6fd', fontWeight: 800
                  }
                }, showImmersive3D ? 'Hide 3D zone' : 'Open 3D zone')
              )
            ),
            h('div', { id: 'throwlab-fs-wrap', className: 'throwlab-sim-shell', 'data-throwlab-sim-surface': 'true', style: { position: 'relative' } },
            h('span', { id: 'throwlab-canvas-help',
              style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }
            }, 'Focus this trajectory simulation and press Space to launch. All settings and the Launch button are also available beside the canvas.'),
            h('canvas', {
              ref: canvasRef, width: 640, height: 360,
              role: 'application',
              'aria-roledescription': __alloT('stem.throwlab.interactive_trajectory_simulation','interactive trajectory simulation'),
              tabIndex: 0,
              'data-tl-focusable': 'true',
              'data-throwlab-canvas': 'true',
              'aria-describedby': 'throwlab-canvas-help',
              'aria-keyshortcuts': 'Space',
              onKeyDown: function(event) {
                if (event.repeat || (event.key !== ' ' && event.code !== 'Space')) return;
                event.preventDefault();
                if (d.replayActive) skipReplayToResult(); else throwPitch();
              },
              'aria-label': canvasSceneDescription()
                + (lr ? ' Last throw outcome: ' + cleanOutcomeText(lr) + '.' + describeShape(lr) : '')
                + referenceComparisonDescription(),
              style: { width: '100%', maxWidth: 640, height: 'auto', borderRadius: 12, border: '1px solid rgba(148,163,184,0.26)', background: 'var(--allo-stem-canvas, #0f172a)', boxShadow: 'inset 0 0 44px rgba(14,165,233,0.07)' }
            }),
            // Fullscreen toggle (top-right of canvas wrapper)
            h('button', {
              'aria-label': isWorkspaceFullscreen
                ? __alloT('stem.throwlab.exit_fullscreen_workspace', 'Exit fullscreen for the Throw Lab workspace')
                : __alloT('stem.throwlab.enter_fullscreen_workspace', 'Enter fullscreen for the Throw Lab workspace'),
              'aria-pressed': isWorkspaceFullscreen,
              title: isWorkspaceFullscreen
                ? __alloT('stem.throwlab.exit_fullscreen', 'Exit fullscreen')
                : __alloT('stem.throwlab.enter_fullscreen', 'Enter fullscreen'),
              onClick: function() {
                var el = document.getElementById('throwlab-fs-workspace');
                if (!el) return;
                var inFull = document.fullscreenElement === el || document.webkitFullscreenElement === el || document.mozFullScreenElement === el;
                if (inFull) { var ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen; if (ex) ex.call(document); }
                else { if (window.__alloStemFS) window.__alloStemFS(el); }
              },
              style: {
                position: 'absolute', top: 8, right: 8, zIndex: 5,
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                border: '1px solid rgba(245,158,11,0.5)', color: '#fbbf24',
                fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
              }
            }, '⛶')
            ),
            h('section', {
              id: 'throwlab-launch-controls',
              tabIndex: -1,
              'aria-labelledby': 'throwlab-launch-controls-heading',
              style: {
                marginBottom: 12, padding: 12, borderRadius: 12,
                background: 'linear-gradient(145deg,rgba(30,41,59,0.96),rgba(15,23,42,0.98))',
                border: '1px solid rgba(251,191,36,0.42)',
                boxShadow: '0 10px 24px rgba(2,6,23,0.22)'
              }
            },
            h('h3', {
              id: 'throwlab-launch-controls-heading',
              style: { margin: '0 0 9px', color: '#fde68a', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }
            }, __alloT('stem.throwlab.call_and_launch_v2', 'Call it and launch')),
            h('div', { className: 'throwlab-launch-row' },
            (function() {
              var options = getPredictionOptions(d.mode, trialShotKind(d));
              var predictionStats = Object.assign({ attempts: 0, matches: 0 }, d.predictionStats || {});
              // While a drill is running, a throw counts for it only after a call, so the call is not optional.
              var callDrill = DRILLS[d.mode];
              var callNeeded = !!d.drillActive && !!callDrill && (d.drillTaskIdx || 0) < callDrill.tasks.length;
              return h('fieldset', {
                'data-throwlab-prediction': 'true',
                style: { margin: '0 0 9px', padding: 9, borderRadius: 9, border: '1px solid rgba(167,139,250,0.42)', background: 'rgba(124,58,237,0.08)' }
              },
                h('legend', { style: { padding: '0 5px', color: '#ddd6fe', fontSize: 12, fontWeight: 900 } },
                  __alloT('stem.throwlab.call_your_shot', 'Call your shot'),
                  callNeeded
                    ? h('span', { 'data-throwlab-call-needed': 'true', style: { color: '#fde68a', fontWeight: 700 } }, __alloT('stem.throwlab.call_needed_for_drill_v2', ' · needed for the drill to count'))
                    : h('span', { style: { color: '#94a3b8', fontWeight: 600 } }, ' · ungraded hypothesis · optional')
                ),
                h('div', { className: 'throwlab-call-grid' },
                  options.map(function(option) {
                    var selected = d.predictionKey === option.key;
                    return h('button', {
                      key: option.key,
                      type: 'button',
                      'aria-pressed': selected,
                      'data-tl-focusable': 'true',
                      onClick: function() {
                        var nextKey = selected ? null : option.key;
                        upd('predictionKey', nextKey);
                        tlAnnounce(nextKey
                          ? (callNeeded ? __alloT('stem.throwlab.sr_call_counts_for_drill_v2', 'Call made: ') + option.label + '. This throw will count for the drill.' : 'Ungraded call: ' + option.label + '. Launch when ready.')
                          : (callNeeded ? __alloT('stem.throwlab.sr_call_cleared_drill_v2', 'Call cleared. Without a call this throw will not count for the drill.') : 'Call cleared.'));
                      },
                      style: {
                        padding: '8px 7px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                        border: selected ? '2px solid #c4b5fd' : '1px solid #475569',
                        background: selected ? 'rgba(124,58,237,0.28)' : 'rgba(15,23,42,0.62)',
                        color: '#f8fafc'
                      }
                    },
                      h('strong', { style: { display: 'block', fontSize: 13 } }, option.label),
                      h('span', { style: { display: 'block', marginTop: 2, color: '#cbd5e1', fontSize: 12, lineHeight: 1.25 } }, option.detail)
                    );
                  })
                ),
                h('p', { 'data-throwlab-call-body': callNeeded ? 'drill' : 'free', style: { margin: '7px 0 0', color: '#cbd5e1', fontSize: 12, lineHeight: 1.4 } },
                  callNeeded
                    ? __alloT('stem.throwlab.prediction_drill_body_v2', 'Pick a call before you launch, or this throw will not count for the drill. A wrong call still counts: a surprise is useful evidence too.')
                    : __alloT('stem.throwlab.prediction_no_penalty', 'Make an ungraded call before launch. A match is not a score; both matches and surprises can guide the next test.')),
                predictionStats.attempts ? h('div', { style: { marginTop: 6, color: '#c4b5fd', fontSize: 12 } },
                  'Calls compared: ' + predictionStats.attempts + ' · Evidence matches: ' + predictionStats.matches + ' · descriptive, not scored') : null
              );
            })(),
            // Throw / Shoot button — mode-aware label
            // Throw / Shoot button. While the replay runs it becomes "skip to the result": the
            // student is never locked out, and skipping is the reveal (the verdict, the sounds
            // and the XP all arrive at that moment, never before).
            h('button', {
              onClick: throwPitch,
              'aria-label': d.replayActive ? (tlInFlight ? 'Skip the replay and show the result' : 'End the replay') : launchActionLabel(),
              'data-tl-focusable': 'true',
              'data-throwlab-launch': 'true',
              'data-throwlab-launch-state': d.replayActive ? 'skip' : 'ready',
              style: {
                width: '100%', minHeight: 64, padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                border: '1px solid #fbbf24', background: d.replayActive ? 'linear-gradient(135deg, #334155, #1e293b)' : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: d.replayActive ? '#fde68a' : '#1a1a2e', fontSize: 18, fontWeight: 900, boxShadow: '0 10px 22px rgba(245,158,11,0.28)'
              }
            }, d.replayActive ? (tlInFlight ? __alloT('stem.throwlab.skip_to_result', '⏭ Skip to the result') : __alloT('stem.throwlab.end_replay', '⏭ End the replay')) : launchActionLabel()),
            // Pitch Locker banner: the first strike with a NEW pitch type. It sits in the page flow
            // under the launch button, so it never covers the button or the canvas. Clears after 3.5 s.
            tlCeleb && h('div', {
              role: 'status', 'aria-live': 'polite', 'data-throwlab-locker-banner': 'true',
              style: { marginTop: 8, pointerEvents: 'none', animation: 'throwlab-celeb-fade 3.5s ease-out forwards' }
            },
              h('div', { style: { background: 'linear-gradient(135deg, #b45309 0%, #b91c1c 50%, #6d28d9 100%)',
                                  color: '#fff', padding: '10px 14px', borderRadius: 12,
                                  border: '2px solid #fff', display: 'flex', alignItems: 'center', gap: 12 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 26 } }, tlCeleb.icon || '⚾'),
                h('div', null,
                  h('div', { style: { fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, __alloT('stem.throwlab.pitch_added_to_your_locker', 'Pitch added to your locker')),
                  h('div', { style: { fontSize: 14, fontWeight: 800, lineHeight: 1.3 } }, tlCeleb.label || tlCeleb.pitchType),
                  h('div', { style: { fontSize: 12, marginTop: 2 } }, tlCeleb.total + ' / ' + PITCH_TYPES.length + ' pitch types thrown for strikes')
                )
              )
            )
            ),
            // ── Low spin: the numbered air pattern ──
            // Shown only when this ball, at this spin, will dart. The number is part of the setup:
            // the same number gives the same path every time. A new number is a new dart.
            (function() {
              var dartWeight = knuckleWeight(BALLS[modeMeta.ball], d.spinRpm);
              if (!(dartWeight > 0)) return null;
              var seed = d.flutterSeed || 1;
              return h('div', {
                'data-throwlab-air-pattern': String(seed),
                style: { marginBottom: 8, padding: '8px 10px', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
                  background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.5)', color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 12, lineHeight: 1.4 }
              },
                h('div', { style: { flex: '1 1 210px', minWidth: 0 } },
                  h('strong', { style: { color: '#fde68a' } }, __alloT('stem.throwlab.low_spin_dart', 'Low spin: this ball will dart.') + ' '),
                  __alloT('stem.throwlab.air_pattern_explain', 'Air pattern') + ' #' + seed + '. ' + __alloT('stem.throwlab.air_pattern_repeat', 'The same number always gives the same path. A real ball never repeats.')),
                h('button', {
                  type: 'button',
                  'data-tl-focusable': 'true',
                  'data-throwlab-new-air': 'true',
                  disabled: !!d.replayActive,
                  'aria-label': 'Throw another one: change to air pattern ' + (seed % 99 + 1),
                  onClick: function() {
                    var next = seed % 99 + 1;
                    upd('flutterSeed', next);
                    tlAnnounce('Air pattern ' + next + '. The same throw will now dart a different way.');
                  },
                  style: { padding: '8px 12px', borderRadius: 8, cursor: d.replayActive ? 'not-allowed' : 'pointer', border: '1px solid #fbbf24', background: 'rgba(251,191,36,0.16)', color: '#fde68a', fontSize: 12, fontWeight: 800 }
                }, __alloT('stem.throwlab.new_air_pattern', '🎲 Throw another one (new air pattern)'))
              );
            })(),
            // ── Challenge card: something to solve on the first screen ──
            // First "fix this miss" for the sport, then the question for the current skill tier.
            // Both are judged by the model at launch. While the ball is in the air the card
            // shows nothing new, so it cannot give the result away.
            (function() {
              var fm = (d.fixMiss && d.fixMiss.mode === d.mode) ? d.fixMiss : null;
              var fixDone = !!((d.fixMissDone || {})[d.mode]);
              var fixActive = !!fm && !fm.done;
              var tier = Math.max(1, Math.min(4, d.scaffoldTier || 3));
              var quest = questFor(d.mode, tier);
              var prog = (d.quests || {})[d.mode + ':' + tier] || null;
              var showFix = fixActive || !fixDone;
              var questDone = !!(prog && prog.done) && !tlInFlight;
              var title, body, status;
              if (showFix) {
                title = __alloT('stem.throwlab.fix_miss_title', '🔧 Start here: fix this miss');
                body = __alloT('stem.throwlab.fix_miss_body', 'Load a setup that just misses. See what goes wrong. Then change ONE control to make it work.');
                status = !fixActive ? ''
                  : tlInFlight ? __alloT('stem.throwlab.challenge_watching', 'Watching this throw...')
                  : !fm.tried ? __alloT('stem.throwlab.fix_miss_loaded', 'The miss is loaded. Launch it and read where the ball goes.')
                  : (fm.lastChanged > 1 ? 'That try changed ' + fm.lastChanged + ' controls. ' : '') + __alloT('stem.throwlab.fix_miss_now_change', 'Now change ONE control and launch again.');
              } else {
                title = '🧩 ' + TIER_NAMES[tier] + ' ' + __alloT('stem.throwlab.challenge_word', 'challenge');
                body = questText(quest);
                status = tlInFlight ? __alloT('stem.throwlab.challenge_watching', 'Watching this throw...') : questStatus(quest, prog);
              }
              var smallBtn = { padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 800 };
              return h('section', {
                'data-throwlab-challenge': showFix ? 'fix' : quest.type,
                'data-throwlab-challenge-done': (!showFix && questDone) ? 'true' : 'false',
                'aria-label': __alloT('stem.throwlab.challenge_region', 'Challenge'),
                style: { marginBottom: 8, padding: '9px 11px', borderRadius: 10, background: 'rgba(16,185,129,0.09)', border: '1px solid rgba(52,211,153,0.5)', color: 'var(--allo-stem-text, #e2e8f0)' }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
                  h('strong', { style: { color: '#6ee7b7', fontSize: 13 } }, title + ((!showFix && questDone) ? ' ✓' : '')),
                  (!showFix) ? h('button', {
                    type: 'button', 'data-tl-focusable': 'true', 'data-throwlab-fix-again': 'true', disabled: !!d.replayActive,
                    onClick: loadFixMiss,
                    style: Object.assign({}, smallBtn, { border: '1px solid #475569', background: 'rgba(15,23,42,0.6)', color: '#cbd5e1', fontWeight: 700 })
                  }, __alloT('stem.throwlab.fix_a_miss_again', '🔧 Fix a miss')) : null
                ),
                h('p', { style: { margin: '4px 0 0', fontSize: 12, lineHeight: 1.45 } }, body),
                status ? h('p', { 'data-throwlab-challenge-status': 'true', role: 'status', style: { margin: '5px 0 0', fontSize: 12, lineHeight: 1.45, color: '#a7f3d0', fontWeight: 700 } }, status) : null,
                h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: (showFix || (questDone && tier < 4)) ? 8 : 0 } },
                  showFix ? h('button', {
                    type: 'button', 'data-tl-focusable': 'true', 'data-throwlab-load-miss': 'true', disabled: !!d.replayActive,
                    onClick: loadFixMiss,
                    style: Object.assign({}, smallBtn, { border: '1px solid #34d399', background: 'rgba(16,185,129,0.22)', color: '#d1fae5' })
                  }, fixActive ? __alloT('stem.throwlab.load_miss_again', 'Load the miss again') : __alloT('stem.throwlab.load_the_miss', 'Load the miss')) : null,
                  (showFix && !fixActive) ? h('button', {
                    type: 'button', 'data-tl-focusable': 'true', 'data-throwlab-skip-fix': 'true',
                    onClick: function() {
                      setLabToolData(function(prev) {
                        var doneMap = Object.assign({}, prev.throwlab.fixMissDone || {}); doneMap[prev.throwlab.mode] = 'skipped';
                        return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, { fixMissDone: doneMap }) });
                      });
                      tlAnnounce(questText(quest));
                    },
                    style: Object.assign({}, smallBtn, { border: '1px solid #475569', background: 'rgba(15,23,42,0.6)', color: '#cbd5e1', fontWeight: 700 })
                  }, __alloT('stem.throwlab.skip_to_question', 'Skip to the question')) : null,
                  (!showFix && questDone && tier < 4) ? h('button', {
                    type: 'button', 'data-tl-focusable': 'true', 'data-throwlab-next-tier': String(tier + 1),
                    onClick: function() { setSkillTier(tier + 1); },
                    style: Object.assign({}, smallBtn, { border: '1px solid #34d399', background: 'rgba(16,185,129,0.22)', color: '#d1fae5' })
                  }, 'Next: the ' + TIER_NAMES[tier + 1] + ' question (' + (tier === 1 ? 'adds angle and aim' : tier === 2 ? 'adds spin' : 'adds formulas') + ')') : null
                )
              );
            })(),
            h('div', {
              'data-throwlab-next-trial-check': nextTrialCheck.level,
              'aria-label': 'Next trial check. ' + nextTrialCheck.label + '. ' + nextTrialCheck.summary,
              style: {
                marginBottom: 8, padding: '8px 10px', borderRadius: 8,
                background: nextTrialCheck.level === 'fair' ? 'rgba(16,185,129,0.12)' : nextTrialCheck.level === 'multiple' ? 'rgba(245,158,11,0.12)' : 'rgba(56,189,248,0.10)',
                border: '1px solid ' + (nextTrialCheck.level === 'fair' ? 'rgba(52,211,153,0.55)' : nextTrialCheck.level === 'multiple' ? 'rgba(251,191,36,0.55)' : 'rgba(125,211,252,0.45)'),
                color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 11, lineHeight: 1.4
              }
            },
              h('strong', { style: { display: 'block', marginBottom: 2, color: nextTrialCheck.level === 'fair' ? '#6ee7b7' : nextTrialCheck.level === 'multiple' ? '#fde68a' : '#bae6fd' } }, 'Next trial - ' + nextTrialCheck.label),
              h('span', null, nextTrialCheck.summary)
            ),
            // ── Hot Hand + Hype HUD (engagement layer) ──
            // Sits directly above the throw button so the streak status
            // and pre-throw motivator are inline with where the student's
            // attention already is. Both auto-derive from existing state:
            // Hot Hand comes from drillStats.hotStreak. The hype phrase is
            // stable for each sport and attempt, so slider changes do not
            // unexpectedly replace it before the learner launches a trial.
            (function() {
              if (tlInFlight) return null; // the streak would tell the student the result early
              var hot = getHotHand((d.drillStats || {}).hotStreak);
              var showHype = !d.lastResult && !d.replayActive;
              if (!hot && !showHype) return null;
              return h('div', {
                role: 'status', 'aria-live': 'polite',
                style: {
                  marginBottom: 8, padding: '6px 10px', borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  background: hot ? 'rgba(220,38,38,0.10)' : 'rgba(167,139,250,0.10)',
                  border: '1px solid ' + (hot ? hot.color : '#a78bfa'),
                  fontSize: 12
                }
              },
                hot ? h('span', { style: { color: hot.color, fontWeight: 700 } },
                  hot.emoji + ' ' + hot.label + ' (streak: ' + d.drillStats.hotStreak + ')'
                ) : h('span', { style: { color: '#a78bfa', fontStyle: 'italic' } },
                  '🎙️ ' + pickHypePhrase(d.mode, ((d.modeThrowCounts || {})[d.mode] || 0))
                )
              );
            })()
            ),
            showImmersive3D ? h('section', {
              id: 'throwlab-immersive-zone',
              'data-throwlab-immersive-zone': 'true',
              'aria-labelledby': 'throwlab-immersive-heading',
              style: { marginTop: 12, padding: 12, borderRadius: 14, border: '1px solid rgba(125,211,252,0.34)', background: 'linear-gradient(145deg, rgba(8,24,43,0.98), rgba(20,42,55,0.98))', boxShadow: '0 12px 28px rgba(2,6,23,0.26)' }
            },
              h('div', { 'data-throwlab-immersive-header': 'true', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 } },
                h('div', null,
                  h('h3', { id: 'throwlab-immersive-heading', style: { margin: 0, color: '#f8fafc', fontSize: 15 } }, '3D Immersive Zone'),
                  h('div', { style: { marginTop: 2, color: '#bae6fd', fontSize: 11 } }, 'Perspective projection · same trial data')
                ),
                h('output', { 'aria-live': 'polite', style: { color: '#fde68a', fontSize: 11, fontWeight: 800 } }, 'Camera: yaw ' + immersiveYaw + '° · height ' + immersivePitch + '°' + (followImmersiveBall ? ' · following ball' : ''))
              ),
              h('div', { role: 'group', 'aria-label': __alloT('stem.throwlab.a11y_3d_view_presets', '3D view presets'), 'data-throwlab-view-presets': 'true', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 } },
                h('button', { type: 'button', 'aria-pressed': immersiveYaw === 0 && immersivePitch === 18, 'data-tl-focusable': 'true', onClick: function() { setFollowImmersiveBall(false); setImmersiveYaw(0); setImmersivePitch(18); tlAnnounce(__alloT('stem.throwlab.sr_behind_launch_3d_view_selected', 'Behind-launch 3D view selected.')); }, style: { minHeight: 44, padding: '8px 12px', flex: '1 1 110px', borderRadius: 18, cursor: 'pointer', border: immersiveYaw === 0 && immersivePitch === 18 ? '2px solid #fbbf24' : '1px solid rgba(125,211,252,0.42)', background: immersiveYaw === 0 && immersivePitch === 18 ? 'rgba(251,191,36,0.18)' : 'rgba(15,23,42,0.72)', color: '#e0f2fe', fontWeight: 800 } }, 'Behind launch'),
                h('button', { type: 'button', 'aria-pressed': immersiveYaw === -90 && immersivePitch === 22, 'data-tl-focusable': 'true', onClick: function() { setFollowImmersiveBall(false); setImmersiveYaw(-90); setImmersivePitch(22); tlAnnounce(__alloT('stem.throwlab.sr_sideline_3d_view_selected', 'Sideline 3D view selected.')); }, style: { minHeight: 44, padding: '8px 12px', flex: '1 1 110px', borderRadius: 18, cursor: 'pointer', border: immersiveYaw === -90 && immersivePitch === 22 ? '2px solid #fbbf24' : '1px solid rgba(125,211,252,0.42)', background: immersiveYaw === -90 && immersivePitch === 22 ? 'rgba(251,191,36,0.18)' : 'rgba(15,23,42,0.72)', color: '#e0f2fe', fontWeight: 800 } }, 'Sideline'),
                h('button', { type: 'button', 'aria-pressed': immersivePitch === 55 && !followImmersiveBall, 'data-tl-focusable': 'true', onClick: function() { setFollowImmersiveBall(false); setImmersiveYaw(-28); setImmersivePitch(55); tlAnnounce(__alloT('stem.throwlab.sr_overhead_3d_view_selected', 'Overhead 3D view selected.')); }, style: { minHeight: 44, padding: '8px 12px', flex: '1 1 110px', borderRadius: 18, cursor: 'pointer', border: immersivePitch === 55 && !followImmersiveBall ? '2px solid #fbbf24' : '1px solid rgba(125,211,252,0.42)', background: immersivePitch === 55 && !followImmersiveBall ? 'rgba(251,191,36,0.18)' : 'rgba(15,23,42,0.72)', color: '#e0f2fe', fontWeight: 800 } }, 'Overhead'),
                h('button', { type: 'button', 'aria-pressed': followImmersiveBall, disabled: !lr, 'data-tl-focusable': 'true', onClick: function() { setFollowImmersiveBall(!followImmersiveBall); tlAnnounce(followImmersiveBall ? 'Follow-ball camera off.' : 'Follow-ball camera on. Replay to track the ball in flight.'); }, style: { minHeight: 44, padding: '8px 12px', flex: '1 1 110px', borderRadius: 18, cursor: lr ? 'pointer' : 'not-allowed', border: followImmersiveBall ? '2px solid #fbbf24' : '1px solid rgba(125,211,252,0.42)', background: followImmersiveBall ? 'rgba(251,191,36,0.18)' : 'rgba(15,23,42,0.72)', color: lr ? '#e0f2fe' : '#64748b', fontWeight: 800 } }, 'Follow ball')
              ),
              h('canvas', {
                ref: immersiveCanvasRef, width: 640, height: 340, role: 'img',
                'data-throwlab-immersive-canvas': 'true',
                'aria-describedby': 'throwlab-immersive-help',
                onPointerDown: function(event) {
                  if (event.button !== undefined && event.button !== 0) return;
                  setFollowImmersiveBall(false);
                  immersiveDragRef.current = { x: event.clientX, y: event.clientY, yaw: immersiveYaw, pitch: immersivePitch, pointerId: event.pointerId };
                  if (event.currentTarget.setPointerCapture && event.pointerId !== undefined) event.currentTarget.setPointerCapture(event.pointerId);
                },
                onPointerMove: function(event) {
                  var drag = immersiveDragRef.current; if (!drag) return;
                  setImmersiveYaw(TL_PERSPECTIVE.normalizeYaw(drag.yaw + (event.clientX - drag.x) * 0.35));
                  setImmersivePitch(TL_PERSPECTIVE.clampPitch(drag.pitch - (event.clientY - drag.y) * 0.25));
                },
                onPointerUp: function(event) {
                  immersiveDragRef.current = null;
                  if (event.currentTarget.releasePointerCapture && event.pointerId !== undefined && event.currentTarget.hasPointerCapture && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                },
                onPointerCancel: function() { immersiveDragRef.current = null; },
                'aria-label': '3D perspective view. ' + canvasSceneDescription() + ' ' + immersiveTargetDescription()
                  + (lr ? ' Current outcome: ' + cleanOutcomeText(lr) + '.' + describeShape(lr) : ' No trial has been launched yet.')
                  + (showImmersiveGuides ? ' Apex and endpoint guides are visible.' : ' Apex and endpoint guides are hidden.')
                  + (showImmersiveTimeMarkers ? ' Time markers are visible.' : '')
                  + (Object.keys(immersiveVectors).filter(function(key) { return immersiveVectors[key]; }).length ? ' Physics vectors visible: ' + Object.keys(immersiveVectors).filter(function(key) { return immersiveVectors[key]; }).join(', ') + '.' : '')
                  + (showImmersiveReferences ? referenceComparisonDescription() : (activeReferenceList().length ? ' Saved comparison overlays are hidden.' : '')),
                style: { width: '100%', height: 'auto', display: 'block', touchAction: 'none', cursor: 'grab', borderRadius: 10, border: '1px solid rgba(148,163,184,0.3)', background: '#071426' }
              }),
              h('div', { 'data-throwlab-spatial-readout': 'true', role: 'note', style: { display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', marginTop: 8, padding: '7px 9px', borderRadius: 8, background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(125,211,252,0.22)', color: '#cbd5e1', fontSize: 11 } },
                h('strong', { style: { color: '#7dd3fc' } }, 'Spatial readout:'),
                lr ? describeShape(lr).replace(/^ /, '') : 'Launch a trial to measure peak height, flight time, and lateral movement.'
              ),
              h('fieldset', { 'aria-label': __alloT('stem.throwlab.a11y_3d_learning_overlays', '3D learning overlays'), 'data-throwlab-learning-overlays': 'true', style: { margin: '10px 0 0', padding: '8px 9px 9px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.28)' } },
                h('legend', { style: { padding: '0 5px', color: '#fde68a', fontSize: 11, fontWeight: 800 } }, 'Learning overlays'),
                h('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap' } },
                  h('label', { htmlFor: 'throwlab-overlay-guides', style: { minHeight: 44, padding: '7px 10px', flex: '1 1 145px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 9, cursor: 'pointer', background: showImmersiveGuides ? 'rgba(14,165,233,0.16)' : 'rgba(15,23,42,0.58)', border: showImmersiveGuides ? '1px solid rgba(125,211,252,0.58)' : '1px solid rgba(148,163,184,0.25)', color: '#e2e8f0', fontSize: 11, fontWeight: 700 } },
                    h('input', { id: 'throwlab-overlay-guides', type: 'checkbox', checked: showImmersiveGuides, 'data-tl-focusable': 'true', onChange: function(event) { setShowImmersiveGuides(event.target.checked); tlAnnounce(event.target.checked ? 'Apex and endpoint guides shown.' : 'Apex and endpoint guides hidden.'); }, style: { width: 20, height: 20, accentColor: '#0ea5e9' } }),
                    'Apex + endpoint'
                  ),
                  h('label', { htmlFor: 'throwlab-overlay-time', style: { minHeight: 44, padding: '7px 10px', flex: '1 1 130px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 9, cursor: 'pointer', background: showImmersiveTimeMarkers ? 'rgba(14,165,233,0.16)' : 'rgba(15,23,42,0.58)', border: showImmersiveTimeMarkers ? '1px solid rgba(125,211,252,0.58)' : '1px solid rgba(148,163,184,0.25)', color: '#e2e8f0', fontSize: 11, fontWeight: 700 } },
                    h('input', { id: 'throwlab-overlay-time', type: 'checkbox', checked: showImmersiveTimeMarkers, 'data-tl-focusable': 'true', onChange: function(event) { setShowImmersiveTimeMarkers(event.target.checked); tlAnnounce(event.target.checked ? 'Trajectory time markers shown.' : 'Trajectory time markers hidden.'); }, style: { width: 20, height: 20, accentColor: '#0ea5e9' } }),
                    'Time markers'
                  ),
                  h('label', { htmlFor: 'throwlab-overlay-references', style: { minHeight: 44, padding: '7px 10px', flex: '1 1 165px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 9, cursor: 'pointer', background: showImmersiveReferences ? 'rgba(14,165,233,0.16)' : 'rgba(15,23,42,0.58)', border: showImmersiveReferences ? '1px solid rgba(125,211,252,0.58)' : '1px solid rgba(148,163,184,0.25)', color: '#e2e8f0', fontSize: 11, fontWeight: 700 } },
                    h('input', { id: 'throwlab-overlay-references', type: 'checkbox', checked: showImmersiveReferences, 'data-tl-focusable': 'true', onChange: function(event) { setShowImmersiveReferences(event.target.checked); tlAnnounce(event.target.checked ? 'Saved comparison trajectories shown.' : 'Saved comparison trajectories hidden.'); }, style: { width: 20, height: 20, accentColor: '#0ea5e9' } }),
                    'Saved comparisons (' + activeReferenceList().length + ')'
                  )
                )
              ),
              h('div', { className: 'throwlab-immersive-controls', role: 'group', 'aria-label': __alloT('stem.throwlab.a11y_3d_camera_controls', '3D camera controls'), style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 10 } },
                h('button', { type: 'button', 'data-tl-focusable': 'true', onClick: function() { setFollowImmersiveBall(false); setImmersiveYaw(function(v) { return TL_PERSPECTIVE.normalizeYaw(v - 15); }); }, 'aria-label': __alloT('stem.throwlab.a11y_rotate_camera_left_15_degrees', 'Rotate camera left 15 degrees'), style: { minHeight: 44, padding: '8px 10px', border: '1px solid rgba(125,211,252,0.42)', background: 'rgba(15,23,42,0.82)', color: '#e0f2fe', fontWeight: 800, flex: '1 1 104px', borderRadius: 9, cursor: 'pointer' } }, '↶ Rotate left'),
                h('button', { type: 'button', 'data-tl-focusable': 'true', onClick: function() { setFollowImmersiveBall(false); setImmersiveYaw(function(v) { return TL_PERSPECTIVE.normalizeYaw(v + 15); }); }, 'aria-label': __alloT('stem.throwlab.a11y_rotate_camera_right_15_degrees', 'Rotate camera right 15 degrees'), style: { minHeight: 44, padding: '8px 10px', border: '1px solid rgba(125,211,252,0.42)', background: 'rgba(15,23,42,0.82)', color: '#e0f2fe', fontWeight: 800, flex: '1 1 104px', borderRadius: 9, cursor: 'pointer' } }, 'Rotate right ↷'),
                h('button', { type: 'button', 'data-tl-focusable': 'true', onClick: function() { setFollowImmersiveBall(false); setImmersivePitch(function(v) { return TL_PERSPECTIVE.clampPitch(v - 7); }); }, 'aria-label': __alloT('stem.throwlab.a11y_lower_camera', 'Lower camera'), style: { minHeight: 44, padding: '8px 10px', border: '1px solid rgba(125,211,252,0.42)', background: 'rgba(15,23,42,0.82)', color: '#e0f2fe', fontWeight: 800, flex: '1 1 90px', borderRadius: 9, cursor: 'pointer' } }, '↓ Lower'),
                h('button', { type: 'button', 'data-tl-focusable': 'true', onClick: function() { setFollowImmersiveBall(false); setImmersivePitch(function(v) { return TL_PERSPECTIVE.clampPitch(v + 7); }); }, 'aria-label': __alloT('stem.throwlab.a11y_raise_camera', 'Raise camera'), style: { minHeight: 44, padding: '8px 10px', border: '1px solid rgba(125,211,252,0.42)', background: 'rgba(15,23,42,0.82)', color: '#e0f2fe', fontWeight: 800, flex: '1 1 90px', borderRadius: 9, cursor: 'pointer' } }, '↑ Raise'),
                h('button', { type: 'button', 'data-tl-focusable': 'true', onClick: function() { setFollowImmersiveBall(false); setImmersiveYaw(-28); setImmersivePitch(24); tlAnnounce(__alloT('stem.throwlab.sr_3d_camera_reset', '3D camera reset.')); }, 'aria-label': __alloT('stem.throwlab.a11y_reset_3d_camera', 'Reset 3D camera'), style: { minHeight: 44, padding: '8px 10px', border: '1px solid rgba(125,211,252,0.42)', background: 'rgba(15,23,42,0.82)', color: '#e0f2fe', fontWeight: 800, flex: '1 1 90px', borderRadius: 9, cursor: 'pointer' } }, 'Reset view')
              ),
              h('details', { className: 'throwlab-analysis-details', 'data-throwlab-analysis-details': 'true', open: isWorkspaceFullscreen && !compactAnalysis ? true : undefined, style: { marginTop: 10, borderRadius: 11, border: '1px solid rgba(192,132,252,0.35)', background: 'rgba(15,23,42,0.62)' } },
                h('summary', { 'data-tl-focusable': 'true', style: { padding: '10px 12px', cursor: 'pointer', color: '#e9d5ff', fontWeight: 900, fontSize: 12 } }, 'Analysis tools · vectors, comparisons, exports'),
                h('div', { className: 'throwlab-analysis-grid', style: { padding: '0 10px 10px', display: 'grid', gap: 10 } },
                  h('section', { 'aria-labelledby': 'throwlab-fine-camera-heading', style: { padding: 9, borderRadius: 9, background: 'rgba(30,41,59,0.72)' } },
                    h('h4', { id: 'throwlab-fine-camera-heading', style: { margin: '0 0 6px', color: '#bae6fd', fontSize: 11 } }, 'Fine camera tuning'),
                    h('label', { htmlFor: 'throwlab-camera-yaw', style: { display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', fontSize: 11 } }, h('span', null, 'Orbit'), h('output', { htmlFor: 'throwlab-camera-yaw', style: { color: '#fde68a' } }, immersiveYaw + '°')),
                    h('input', { id: 'throwlab-camera-yaw', type: 'range', min: -180, max: 180, step: 1, value: immersiveYaw, 'data-tl-focusable': 'true', 'aria-valuetext': immersiveYaw + ' degrees', onChange: function(event) { setFollowImmersiveBall(false); setImmersiveYaw(TL_PERSPECTIVE.normalizeYaw(event.target.value)); }, style: { width: '100%', accentColor: '#38bdf8' } }),
                    h('label', { htmlFor: 'throwlab-camera-pitch', style: { display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', fontSize: 11 } }, h('span', null, 'Elevation'), h('output', { htmlFor: 'throwlab-camera-pitch', style: { color: '#fde68a' } }, immersivePitch + '°')),
                    h('input', { id: 'throwlab-camera-pitch', type: 'range', min: 10, max: 55, step: 1, value: immersivePitch, 'data-tl-focusable': 'true', 'aria-valuetext': immersivePitch + ' degrees', onChange: function(event) { setFollowImmersiveBall(false); setImmersivePitch(TL_PERSPECTIVE.clampPitch(event.target.value)); }, style: { width: '100%', accentColor: '#38bdf8' } })
                  ),
                  h('fieldset', { 'aria-label': __alloT('stem.throwlab.a11y_physics_vector_overlays', 'Physics vector overlays'), 'data-throwlab-vector-controls': 'true', style: { margin: 0, padding: 9, borderRadius: 9, border: '1px solid rgba(192,132,252,0.3)' } },
                    h('legend', { style: { padding: '0 5px', color: '#e9d5ff', fontSize: 11, fontWeight: 800 } }, 'Physics vectors'),
                    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 } },
                      [{ key: 'velocity', label: 'Velocity' }, { key: 'gravity', label: 'Gravity' }, { key: 'wind', label: 'Wind' }, { key: 'spin', label: 'Spin axis' }, { key: 'magnus', label: 'Magnus force' }].map(function(item) {
                        return h('label', { key: item.key, style: { minHeight: 44, display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', background: immersiveVectors[item.key] ? 'rgba(192,132,252,0.16)' : 'rgba(15,23,42,0.45)', color: '#e2e8f0', fontSize: 11 } },
                          h('input', { type: 'checkbox', checked: !!immersiveVectors[item.key], 'data-vector-key': item.key, 'data-tl-focusable': 'true', onChange: function(event) { var checked=event.target.checked; setImmersiveVectors(function(previous) { var next=Object.assign({},previous); next[item.key]=checked; return next; }); tlAnnounce(item.label + ' vector ' + (checked ? 'shown.' : 'hidden.')); }, style: { width: 20, height: 20, accentColor: '#a855f7' } }), item.label
                        );
                      })
                    )
                  ),
                  immersiveComparisonRows().length ? h('div', { className: 'throwlab-comparison-deltas', 'data-throwlab-comparison-deltas': 'true', style: { overflowX: 'auto', borderRadius: 9, border: '1px solid rgba(217,70,239,0.32)' } },
                    h('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 500, color: '#e2e8f0', fontSize: 10 } },
                      h('caption', { style: { textAlign: 'left', padding: '8px 9px', color: '#f5d0fe', fontWeight: 900 } }, 'Current trajectory minus each saved reference'),
                      h('thead', null, h('tr', null, ['Reference','Apex Δ','Distance Δ','Time Δ','Lateral Δ'].map(function(label) { return h('th', { key: label, scope: 'col', style: { padding: 7, textAlign: 'left', borderTop: '1px solid rgba(148,163,184,0.2)' } }, label); }))),
                      h('tbody', null, immersiveComparisonRows().map(function(row) { return h('tr', { key: row.index }, h('th', { scope: 'row', style: { padding: 7, textAlign: 'left', color: row.color } }, 'Ref ' + (row.index + 1)), h('td', { style: { padding: 7 } }, formatMetricDelta(row.apex,'m')), h('td', { style: { padding: 7 } }, formatMetricDelta(row.distance,'m')), h('td', { style: { padding: 7 } }, formatMetricDelta(row.duration,'s')), h('td', { style: { padding: 7 } }, formatMetricDelta(row.lateral,'m'))); }))
                    )
                  ) : h('div', { role: 'note', style: { padding: 9, borderRadius: 9, background: 'rgba(217,70,239,0.08)', color: '#e9d5ff', fontSize: 11 } }, 'Save a trajectory, change one variable, and launch again to unlock quantitative comparison deltas.'),
                  h('aside', { 'aria-labelledby': 'throwlab-observation-heading', style: { padding: 9, borderRadius: 9, background: 'rgba(14,165,233,0.09)', color: '#dbeafe' } },
                    h('h4', { id: 'throwlab-observation-heading', style: { margin: '0 0 5px', color: '#7dd3fc', fontSize: 11 } }, 'Observation prompts'),
                    h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 11, lineHeight: 1.5 } }, immersiveObservationPrompts().map(function(prompt,index) { return h('li', { key: index }, prompt); }))
                  ),
                  h('div', { role: 'group', 'aria-label': __alloT('stem.throwlab.a11y_immersive_analysis_exports_and_reset', 'Immersive analysis exports and reset'), style: { display: 'flex', gap: 7, flexWrap: 'wrap' } },
                    h('button', { type: 'button', disabled: !lr, 'data-tl-focusable': 'true', onClick: exportImmersivePng, style: { minHeight: 44, flex: '1 1 110px', borderRadius: 8, cursor: lr ? 'pointer' : 'not-allowed' } }, 'Download PNG'),
                    h('button', { type: 'button', disabled: !lr, 'data-tl-focusable': 'true', onClick: exportTrajectoryCsv, style: { minHeight: 44, flex: '1 1 110px', borderRadius: 8, cursor: lr ? 'pointer' : 'not-allowed' } }, 'Export CSV'),
                    h('button', { type: 'button', 'data-tl-focusable': 'true', onClick: resetImmersiveAnalysis, style: { minHeight: 44, flex: '1 1 110px', borderRadius: 8, cursor: 'pointer' } }, 'Reset immersive')
                  )
                )
              ),
              h('p', { id: 'throwlab-immersive-help', style: { margin: '8px 2px 0', color: '#cbd5e1', fontSize: 11, lineHeight: 1.45 } }, 'Drag the scene to rotate, or use the camera buttons for keyboard-equivalent control. The accessible side-view simulation and all launch controls remain available.')
            ) : null,
            // Result panel — given an h3 so AT users tabbing into the section
            // know what they're reading. region role makes the panel announce
            // its label when entered.
            h('section', {
              'aria-labelledby': 'tl-result-heading',
              role: 'region',
              style: { marginTop: 10, padding: 12, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10 }
            },
              h('h3', {
                id: 'tl-result-heading',
                style: { fontSize: 12, margin: 0, marginBottom: 8, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
              }, lr ? 'Evidence from last throw' : 'Launch to collect evidence'),
              lr && resultControlsChanged && h('div', {
                'data-throwlab-result-stale': 'true',
                role: 'note',
                style: {
                  margin: '0 0 9px', padding: '7px 9px', borderRadius: 7,
                  background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(251,191,36,0.55)',
                  color: '#fde68a', fontSize: 11, lineHeight: 1.4
                }
              },
                h('strong', null, 'Controls changed. '),
                h('span', { style: { color: 'var(--allo-stem-text, #e2e8f0)' } },
                  'This result stays pinned to the launched settings. Changed since launch: ' + resultChangedVariables.slice(0, 3).join(', ') + (resultChangedVariables.length > 3 ? ' and ' + (resultChangedVariables.length - 3) + ' more' : '') + '.')
              ),
              (lr && tlInFlight) ? h('div', {
                'data-throwlab-in-flight': 'true',
                style: { textAlign: 'center', padding: '18px 8px', color: '#fde68a', fontSize: 14, fontWeight: 800 }
              }, __alloT('stem.throwlab.ball_in_the_air', 'The ball is in the air. Watch where it goes.')) : lr ? (
                h('div', null,
                  h('div', {
                    'data-throwlab-outcome': lr.location,
                    style: { fontSize: 14, fontWeight: 700, color: outcomeColor(lr.location), marginBottom: 6 }
                  }, outcomeLabel(lr.location, lr)),
                  h('div', { className: 'throwlab-result-grid', style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)' } },
                    h('div', null, h('div', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)', fontSize: 11 } }, __alloT('stem.throwlab.speed', 'Speed')), h('div', { style: { fontWeight: 700 } }, resultTrial.speedMph + ' mph')),
                    h('div', null,
                      h('div', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)', fontSize: 11 } },
                        isPitching ? 'Time to plate'
                        : isFreeKick ? (lr.location === 'blocked' ? __alloT('stem.throwlab.time_to_wall', 'Time to wall') : (lr.location === 'short' && lr.read && lr.read.rollStop) ? __alloT('stem.throwlab.time_until_it_stopped', 'Time until it stopped') : 'Time to goal')
                        : (isFreeThrow && (lr.location === 'swish' || lr.location === 'made')) ? __alloT('stem.throwlab.time_to_hoop', 'Time to hoop')
                        : __alloT('stem.throwlab.time_in_air', 'Time in the air')),
                      // Time of flight from the model: release to the target, the obstacle or the first landing.
                      h('div', { style: { fontWeight: 700 }, 'data-throwlab-flight-time': 'true' }, typeof lr.flightTime === 'number' ? lr.flightTime.toFixed(2) + ' s' : '—')),
                    h('div', null, h('div', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)', fontSize: 11 } },
                        isPitching ? __alloT('stem.throwlab.spin_moved_it_updown', 'Spin moved it (up/down)') : isFreeKick ? __alloT('stem.throwlab.curl_from_spin', 'Curl from spin') : isFieldGoal ? 'Peak height' : 'Apex'),
                      h('div', { style: { fontWeight: 700 } }, isPitching
                        ? (lr.vBreakIn !== null && lr.vBreakIn !== undefined ? Math.abs(lr.vBreakIn).toFixed(1) + ' in ' + (lr.vBreakIn < 0 ? 'up' : 'down') : '—')
                        : isFreeKick
                          ? ((lr.read && lr.read.spinShift && lr.read.spinShift.side !== null) ? Math.abs(lr.read.spinShift.side).toFixed(2) + ' m ' + (lr.read.spinShift.side > 0 ? 'left' : 'right') : '—')
                          : ((lr.read && typeof lr.read.apex === 'number') ? lr.read.apex.toFixed(2) + ' m' : '—'))),
                    h('div', null, h('div', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)', fontSize: 11 } },
                        isPitching ? __alloT('stem.throwlab.spin_moved_it_sideways', 'Spin moved it (sideways)') : isFreeKick ? 'Spin axis' : isFieldGoal ? 'Launch ∠' : 'Release ∠'),
                      h('div', { style: { fontWeight: 700 } }, isPitching
                        ? (lr.hBreakIn !== null && lr.hBreakIn !== undefined ? Math.abs(lr.hBreakIn).toFixed(1) + ' in' + (Math.abs(lr.hBreakIn) < 0.05 ? '' : lr.hBreakIn > 0 ? ' left' : ' right') : '—')
                        : isFreeKick
                          ? (resultTrial.spinAxisDeg + '°')
                          : (resultTrial.angleV.toFixed(1) + '°')))
                  ),
                  // Dynamic explainer — outcome-specific feedback after a throw,
                  // generated from the actual physics result. Falls through to
                  // the active preset's static teach blurb if there's no result.
                  h('div', { style: { marginTop: 8, fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', fontStyle: 'italic' } },
                    explainResult(lr) || resultPreset.teach),
                  (function() {
                    var feedback = predictionFeedback(lr);
                    if (!feedback) return null;
                    return h('div', {
                      'data-throwlab-prediction-result': feedback.matched ? 'matched' : 'surprised',
                      role: 'status',
                      style: {
                        marginTop: 10, padding: '9px 10px', borderRadius: 8,
                        background: 'rgba(56,189,248,0.10)',
                        border: '1px solid rgba(125,211,252,0.45)',
                        color: '#e2e8f0', fontSize: 11, lineHeight: 1.45
                      }
                    },
                      h('strong', { style: { display: 'block', marginBottom: 2, color: '#bae6fd' } },
                        '🔬 ' + feedback.title),
                      feedback.summary
                    );
                  })(),
                  lr.fairTest && h('div', {
                    'data-throwlab-fair-test': lr.fairTest.level,
                    role: 'status',
                    style: {
                      marginTop: 10, padding: '9px 10px', borderRadius: 8,
                      display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap',
                      background: lr.fairTest.level === 'fair' ? 'rgba(16,185,129,0.12)' : lr.fairTest.level === 'multiple' ? 'rgba(245,158,11,0.12)' : 'rgba(56,189,248,0.10)',
                      border: '1px solid ' + (lr.fairTest.level === 'fair' ? 'rgba(52,211,153,0.55)' : lr.fairTest.level === 'multiple' ? 'rgba(251,191,36,0.55)' : 'rgba(125,211,252,0.45)'),
                      color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 11, lineHeight: 1.45
                    }
                  },
                    h('strong', { style: { color: lr.fairTest.level === 'fair' ? '#6ee7b7' : lr.fairTest.level === 'multiple' ? '#fde68a' : '#bae6fd' } }, lr.fairTest.label + ':'),
                    h('span', { style: { flex: '1 1 230px' } }, lr.fairTest.summary)
                  ),
                  (function() {
                    var recommendation = buildNextRepRecommendation(lr);
                    if (!recommendation) return null;
                    return h('div', { className: 'throwlab-next-rep', 'data-throwlab-next-rep': recommendation.stateKey },
                      h('div', { style: { color: '#7dd3fc', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 } },
                        __alloT('stem.throwlab.next_rep', 'Next rep')),
                      h('div', { style: { marginTop: 2, color: '#f8fafc', fontSize: 12, fontWeight: 800 } }, recommendation.label),
                      h('p', { style: { margin: '4px 0 8px', color: '#cbd5e1', fontSize: 11, lineHeight: 1.45 } }, recommendation.reason),
                      h('button', {
                        type: 'button',
                        onClick: function() { applyNextRepRecommendation(recommendation, lr); },
                        'data-tl-focusable': 'true',
                        'aria-label': 'Load the suggested one-variable next rep: ' + recommendation.label,
                        style: {
                          width: '100%', padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
                          border: '1px solid #38bdf8', background: 'rgba(14,165,233,0.18)', color: '#e0f2fe',
                          fontSize: 11, fontWeight: 900
                        }
                      }, __alloT('stem.throwlab.load_one_change_rep', 'Load one-change next rep')),
                      h('div', { style: { marginTop: 5, color: '#94a3b8', fontSize: 9, lineHeight: 1.35 } },
                        __alloT('stem.throwlab.next_rep_keeps_baseline', 'This restores the launched setup, changes only the named control, and keeps the result visible for comparison.'))
                    );
                  })()
                )
              ) : h('div', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)', fontSize: 13, textAlign: 'center', padding: 16 } }, readyPrompt())
            ),
            // "Show physics" + "Show formulas" toggles + keyboard shortcuts hint.
            // Bumped to slate-300 (#cbd5e1) for AA contrast on dark panel.
            h('div', { style: { marginTop: 10, fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 } },
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                h('label', { style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } },
                  h('input', {
                    type: 'checkbox',
                    'data-tl-focusable': 'true',
                    checked: !!d.showPhysics,
                    onChange: function(e) { upd('showPhysics', e.target.checked); }
                  }),
                  __alloT('stem.throwlab.show_physics_overlays_no_spin_referenc', 'Show physics overlays (no-spin reference trajectory)')),
                h('label', { style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } },
                  h('input', {
                    type: 'checkbox',
                    'data-tl-focusable': 'true',
                    checked: !!d.showFormulas,
                    onChange: function(e) { upd('showFormulas', e.target.checked); }
                  }),
                  __alloT('stem.throwlab.show_formulas_math_behind_the_throw', 'Show formulas (math behind the throw)'))
              ),
              h('span', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } },
                'Trajectory shortcut: ',
                h('kbd', { style: { padding: '1px 5px', borderRadius: 3, border: '1px solid var(--allo-stem-border, #475569)', background: 'var(--allo-stem-canvas, #0f172a)', color: 'var(--allo-stem-text, #cbd5e1)', fontFamily: 'monospace' } }, __alloT('stem.throwlab.space', 'Space')),
                __alloT('stem.throwlab.to_throw', ' while focused'))
            ),
            // ── Coach Mode bubble ──
            // Sits between the toggles and the formulas panel so it always
            // appears prominently when there's a reply or an error. The
            // button itself is rendered inside the right panel near the
            // throw button (further down) so it's adjacent to the action.
            (d.coachReply || d.coachError || d.coachLoading) ? h('section', {
              'aria-labelledby': 'tl-coach-heading',
              'aria-busy': !!d.coachLoading,
              style: { marginTop: 10, padding: 12, background: 'linear-gradient(135deg, rgba(217,70,239,0.10), rgba(124,58,237,0.10))', border: '1px solid #d946ef', borderRadius: 10 }
            },
              h('h3', { id: 'tl-coach-heading',
                style: { fontSize: 12, margin: 0, marginBottom: 6, color: '#d946ef', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
              }, __alloT('stem.throwlab.coach', '🤖 Coach')),
              d.coachLoading
                ? h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, fontStyle: 'italic' } }, 'Thinking…')
                : d.coachError
                ? h('div', { style: { color: '#ef4444', fontSize: 12 } }, d.coachError)
                : h('div', { style: { color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 13, lineHeight: 1.5 } }, d.coachReply)
            ) : null,
            // Math view + ball regulations appear below the toggles when enabled
            formulasPanel(lr),
            ballSpecsPanel()
          ),

          // RIGHT: preset picker + sliders + throw button
          h('div', null,
            // Preset picker (pitches OR shots, mode-driven)
            h('section', {
              'aria-labelledby': 'tl-preset-picker-heading',
              style: { background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: 12, marginBottom: 12 }
            },
              h('h3', {
                id: 'tl-preset-picker-heading',
                style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
              }, 'Choose ' + (isPitching ? 'a pitch' : isFreeKick ? 'a kick style' : isFieldGoal ? 'a distance' : isBowling ? 'a delivery' : isGolf ? 'a club' : isVolleyball ? 'a serve' : 'a shot or pass')),
              h('div', { className: 'throwlab-preset-grid' },
                modeMeta.presets.map(function(pt) {
                  var sel = isPitching ? d.pitchType === pt.id
                          : isFreeKick ? d.kickType === pt.id
                          : isFieldGoal ? d.goalType === pt.id
                          : isBowling ? d.bowlType === pt.id
                          : isGolf ? d.golfClub === pt.id
                          : isVolleyball ? d.serveType === pt.id
                          : d.shotType === pt.id;
                  return h('button', {
                    key: pt.id,
                    onClick: function() {
                      if (isPitching) applyPitchPreset(pt.id);
                      else if (isFreeKick) applyKickPreset(pt.id);
                      else if (isFieldGoal) applyGoalPreset(pt.id);
                      else if (isBowling) applyBowlPreset(pt.id);
                      else if (isGolf) applyGolfPreset(pt.id);
                      else if (isVolleyball) applyVolleyPreset(pt.id);
                      else applyShotPreset(pt.id);
                    },
                    'aria-pressed': sel,
                    'data-tl-focusable': 'true',
                    style: {
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                      background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                      color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 12, textAlign: 'left'
                    }
                  }, h('div', { style: { fontSize: 14 } }, pt.icon + ' ' + pt.label),
                     h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)' } },
                       pt.speedMph + ' mph' + (isPitching ? ' · ' + pt.spinRpm + ' rpm'
                                              : isFreeKick ? ' · spin ' + pt.spinAxisDeg + '°'
                                              : isFieldGoal ? ' · ' + pt.aimDegV + '°' + (pt.windMph ? ' · ' + pt.windMph + ' mph ' + (pt.windDirDeg === 0 ? 'headwind' : pt.windDirDeg === 180 ? 'tailwind' : 'crosswind') : ' · calm')
                                              : isBowling ? ' · spin ' + pt.spinAxisDeg + '°'
                                              : isGolf ? ' · ' + pt.carryYd + ' yd carry'
                                              : isVolleyball ? ' · ' + pt.spinRpm + ' rpm'
                                              : ' · ' + pt.aimDegV + '° arc')));
                })
              ),
              h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', marginTop: 8, padding: 8, background: 'var(--allo-stem-panel, #1e293b)', borderRadius: 6 } },
                h('div', { style: { fontWeight: 700, marginBottom: 2 } }, 'Grip:'),
                activePreset.grip)
            ),
            // ── Preset Compendium (study table) ──
            // A side-by-side comparison of EVERY preset in the active
            // sport — speed / spin / axis / launch / release height (+
            // carry distance for golf). Lets students see how the
            // presets relate to each other parameter-by-parameter without
            // flipping back and forth. Each row exposes a clearly named load
            // button in its first column. Collapsed by default to stay compact.
            h('details', {
              style: { background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }
            },
              h('summary', {
                style: { cursor: 'pointer', fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', fontWeight: 600 }
              }, '📋 Preset compendium — compare every ' + (isPitching ? 'pitch' : isFreeKick ? 'kick' : isFieldGoal ? 'distance' : isBowling ? 'delivery' : isGolf ? 'club' : isVolleyball ? 'serve' : 'shot') + ' in this sport'),
              h('div', {
                className: 'throwlab-compendium-scroll',
                role: 'region',
                tabIndex: 0,
                'aria-label': 'Scrollable preset comparison for ' + modeMeta.label,
                style: { marginTop: 8 }
              },
                h('table', {
                  style: {
                    width: '100%', minWidth: 430, borderCollapse: 'separate', borderSpacing: 0,
                    fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)'
                  }
                },
                  h('caption', {
                    style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }
                  }, 'Preset comparison for ' + modeMeta.label + '. Use the button in the first column to load a preset.'),
                  h('thead', null,
                    h('tr', null,
                      h('th', { scope: 'col', style: { width: 130, padding: '5px 6px', textAlign: 'left', borderBottom: '1px solid var(--allo-stem-border, #334155)', color: 'var(--allo-stem-text-soft, #94a3b8)' } }, __alloT('stem.throwlab.preset', 'Preset')),
                      h('th', { scope: 'col', style: { width: 58, padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid var(--allo-stem-border, #334155)', color: 'var(--allo-stem-text-soft, #94a3b8)' } }, __alloT('stem.throwlab.speed_2', 'Speed')),
                      h('th', { scope: 'col', style: { width: 64, padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid var(--allo-stem-border, #334155)', color: 'var(--allo-stem-text-soft, #94a3b8)' } }, __alloT('stem.throwlab.spin', 'Spin')),
                      h('th', { scope: 'col', style: { width: 52, padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid var(--allo-stem-border, #334155)', color: 'var(--allo-stem-text-soft, #94a3b8)' } }, __alloT('stem.throwlab.axis', 'Axis')),
                      h('th', { scope: 'col', style: { width: 58, padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid var(--allo-stem-border, #334155)', color: 'var(--allo-stem-text-soft, #94a3b8)' } }, __alloT('stem.throwlab.launch', 'Launch')),
                      h('th', { scope: 'col', style: { width: 62, padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid var(--allo-stem-border, #334155)', color: 'var(--allo-stem-text-soft, #94a3b8)' } }, isGolf ? 'Carry' : 'Height')
                    )
                  ),
                  h('tbody', null,
                    modeMeta.presets.map(function(pt) {
                      var activePresetId = isPitching ? d.pitchType
                                         : isFreeThrow ? d.shotType
                                         : isFreeKick ? d.kickType
                                         : isFieldGoal ? d.goalType
                                         : isBowling ? d.bowlType
                                         : isGolf ? d.golfClub
                                         : d.serveType;
                      var sel = pt.id === activePresetId;
                      var rowBg = sel ? 'rgba(251,191,36,0.10)' : 'transparent';
                      return h('tr', {
                        key: 'comp-' + pt.id,
                        'data-throwlab-preset-selected': sel ? 'true' : 'false',
                        style: { background: rowBg }
                      },
                        h('th', { scope: 'row', style: { padding: 2, textAlign: 'left', borderBottom: '1px solid rgba(51,65,85,0.55)' } },
                          h('button', {
                            onClick: function() {
                              if (isPitching) applyPitchPreset(pt.id);
                              else if (isFreeKick) applyKickPreset(pt.id);
                              else if (isFieldGoal) applyGoalPreset(pt.id);
                              else if (isBowling) applyBowlPreset(pt.id);
                              else if (isGolf) applyGolfPreset(pt.id);
                              else if (isVolleyball) applyVolleyPreset(pt.id);
                              else applyShotPreset(pt.id);
                            },
                            'aria-label': 'Load ' + pt.label + ' preset',
                            'aria-pressed': sel,
                            'data-tl-focusable': 'true',
                            style: {
                              width: '100%', padding: '6px 7px', borderRadius: 5, textAlign: 'left',
                              border: sel ? '1px solid #fbbf24' : '1px solid transparent',
                              background: sel ? 'rgba(251,191,36,0.08)' : 'transparent',
                              color: sel ? '#fbbf24' : '#cbd5e1', cursor: 'pointer',
                              fontSize: 11, fontWeight: sel ? 700 : 500
                            }
                          }, pt.icon + ' ' + pt.label)
                        ),
                        h('td', { style: { padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid rgba(51,65,85,0.55)', fontFamily: 'ui-monospace, monospace' } }, pt.speedMph + ' mph'),
                        h('td', { style: { padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid rgba(51,65,85,0.55)', fontFamily: 'ui-monospace, monospace' } }, pt.spinRpm + ' rpm'),
                        h('td', { style: { padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid rgba(51,65,85,0.55)', fontFamily: 'ui-monospace, monospace' } }, pt.spinAxisDeg + '\u00b0'),
                        h('td', { style: { padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid rgba(51,65,85,0.55)', fontFamily: 'ui-monospace, monospace' } }, (pt.aimDegV != null ? pt.aimDegV : '\u2014') + '\u00b0'),
                        h('td', { style: { padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid rgba(51,65,85,0.55)', fontFamily: 'ui-monospace, monospace' } }, isGolf ? ((pt.carryYd != null ? pt.carryYd : '\u2014') + ' yd') : ((pt.releaseHeight != null ? pt.releaseHeight.toFixed(2) : '\u2014') + ' m'))
                      );
                    })
                  )
                )
              )
            ),

            // Sliders — ranges scale with mode
            h('section', {
              'aria-labelledby': 'tl-release-controls-heading',
              style: { background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: 12, marginBottom: 12 }
            },
              h('h3', {
                id: 'tl-release-controls-heading',
                style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
              }, __alloT('stem.throwlab.tune_release_controls_v2', 'Tune the release')),
              slider('Speed', d.speedMph, modeMeta.speedRange[0], modeMeta.speedRange[1], modeMeta.speedStep || 1, function(v) { upd('speedMph', v); }, ' mph'),
              // Tier 2+: release height + angles. Tier 1 hides them so the
              // student can focus on the speed-distance relationship alone.
              (d.scaffoldTier || 3) >= 2 && modeMeta.releaseHeightRange[0] !== modeMeta.releaseHeightRange[1] ? slider('Release height', d.releaseHeight.toFixed(2), modeMeta.releaseHeightRange[0], modeMeta.releaseHeightRange[1], 0.05, function(v) { upd('releaseHeight', v); }, ' m') : null,
              (d.scaffoldTier || 3) >= 2 ? slider(isPitching ? 'Vertical aim' : 'Launch angle', d.aimDegV.toFixed(1),
                modeMeta.verticalAimRange[0], modeMeta.verticalAimRange[1],
                0.5, function(v) { upd('aimDegV', v); }, '°') : null,
              (d.scaffoldTier || 3) >= 2 ? slider('Left/right aim', d.aimDegH.toFixed(1), (modeMeta.aimHRange || [-5, 5])[0], (modeMeta.aimHRange || [-5, 5])[1], modeMeta.aimHRange ? 0.5 : 0.1, function(v) { upd('aimDegH', v); }, '°') : null,
              // Tier 3: spin (the full physics surface).
              (d.scaffoldTier || 3) >= 3 ? slider('Spin rate', d.spinRpm, modeMeta.spinRange[0], modeMeta.spinRange[1], modeMeta.spinStep, function(v) { upd('spinRpm', v); }, ' rpm') : null,
              (d.scaffoldTier || 3) >= 3 ? slider('Spin axis', d.spinAxisDeg, modeMeta.spinAxisRange[0], modeMeta.spinAxisRange[1], 5, function(v) { upd('spinAxisDeg', v); }, '°') : null
            ),
            // ── Wind (outdoor modes only, Tier 2+) ──
            // Free kick + field goal + bowling + golf happen outdoors so
            // wind is part of the physics. Indoor modes (basketball is
            // indoor; volleyball typically indoor) keep the panel hidden
            // so the UI doesn't clutter with irrelevant sliders.
            // Tier 1 students stick to "more speed = more distance"; wind
            // joins at Tier 2 once they've grasped the basic relationship.
            ((isFreeKick || isFieldGoal || isBowling || isGolf) && (d.scaffoldTier || 3) >= 2) ? h('section', {
              'aria-labelledby': 'tl-wind-controls-heading',
              style: { background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: 12, marginBottom: 12 }
            },
              h('h3', {
                id: 'tl-wind-controls-heading',
                style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
              }, __alloT('stem.throwlab.wind_relative_to_throw', 'Wind (relative to throw)')),
              // Quick-pick wind presets — calm / tailwind / headwind / cross / tornado
              h('div', { role: 'group', 'aria-label': __alloT('stem.throwlab.wind_presets', 'Wind presets'),
                style: { display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' } },
                WIND_PRESETS.map(function(wp) {
                  var sel = (d.windMph || 0) === wp.mph && (d.windDirDeg || 0) === wp.dirDeg;
                  return h('button', {
                    key: 'wp-' + wp.id,
                    onClick: function() {
                      setLabToolData(function(prev) {
                        return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
                          windMph: wp.mph, windDirDeg: wp.dirDeg
                        })});
                      });
                      tlAnnounce('Wind preset: ' + wp.label + (wp.mph ? ' (' + wp.mph + ' mph)' : ''));
                    },
                    'aria-pressed': sel,
                    'data-tl-focusable': 'true',
                    style: {
                      padding: '4px 9px', borderRadius: 18, cursor: 'pointer',
                      border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                      background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                      color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 11, fontWeight: 600
                    }
                  }, wp.icon + ' ' + wp.label);
                })
              ),
              slider('Wind speed', d.windMph || 0, 0, 40, 1, function(v) { upd('windMph', v); }, ' mph'),
              // Wind direction: 0° head, 90° R, 180° tail, 270° L
              slider('Wind direction', d.windDirDeg || 0, 0, 359, 5, function(v) { upd('windDirDeg', v); }, '°'),
              h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text, #cbd5e1)', marginTop: 4 } },
                (function() {
                  var deg = d.windDirDeg || 0;
                  if (deg < 22 || deg >= 338) return '↓ Headwind (slows the ball)';
                  if (deg < 68) return '↘ Quartering head/right';
                  if (deg < 112) return '→ Crosswind from left';
                  if (deg < 158) return '↗ Quartering tail/right';
                  if (deg < 202) return '↑ Tailwind (extends range)';
                  if (deg < 248) return '↖ Quartering tail/left';
                  if (deg < 292) return '← Crosswind from right';
                  return '↙ Quartering head/left';
                })())
            ) : null,
            // === H7b'' inquiry widget: throw angle discovery ===
            (function() {
              var iq = d._throwHunt || { angle: 45, velocity: 30, spin: 0, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
              function setIQ(patch) { upd('_throwHunt', Object.assign({}, iq, patch)); }
              var range = (iq.velocity * iq.velocity * Math.sin(iq.angle * Math.PI / 90)) / 9.8;
              var spinEffect = Math.abs(iq.spin) * 0.5;
              var state;
              if (Math.abs(iq.angle - 45) < 5 && Math.abs(iq.spin) < 20) state = 'optimal';
              else if (range > 80) state = 'long';
              else if (range > 30) state = 'medium';
              else state = 'short';
              var sm = {
                optimal: { label: __alloT('stem.throwlab.optimal_trajectory', '🎯 Optimal trajectory'), color: '#047857', bg: '#ecfdf5', border: '#86efac', desc: __alloT('stem.throwlab.45_near_no_spin_max_distance', '45° near no-spin → max distance.') },
                long:    { label: __alloT('stem.throwlab.long_throw', '🟡 Long throw'), color: '#b45309', bg: '#fffbeb', border: '#fcd34d', desc: __alloT('stem.throwlab.high_range_but_off_axis', 'High range but off-axis.') },
                medium:  { label: __alloT('stem.throwlab.medium_throw', '🟠 Medium throw'), color: '#c2410c', bg: '#fff7ed', border: '#fdba74', desc: __alloT('stem.throwlab.acceptable_range', 'Acceptable range.') },
                short:   { label: __alloT('stem.throwlab.short_throw', '🔴 Short throw'), color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', desc: __alloT('stem.throwlab.sub_optimal_angle_or_low_velocity', 'Sub-optimal angle or low velocity.') }
              }[state];
              return React.createElement('details', { className: 'mt-3 p-3 rounded-xl bg-slate-800 text-slate-100 border border-cyan-700 space-y-2', 'data-throwlab-inquiry-panel': 'true' },
                React.createElement('summary', { className: 'text-sm font-black text-cyan-300', style: { cursor: 'pointer' } }, __alloT('stem.throwlab.throw_angle_discovery_summary', 'Throw angle discovery')),
                React.createElement('h3', { className: 'text-sm font-black text-cyan-300' }, __alloT('stem.throwlab.throw_angle_discovery', '🎯 Throw angle discovery')),
                React.createElement('p', { className: 'text-[0.6875rem] text-slate-300' }, __alloT('stem.throwlab.sliders_for_angle_velocity_spin_discre', 'Sliders for angle, velocity, spin. Discrete 4-state trajectory. No score, no reveal.')),
                React.createElement('div', { className: 'p-2 rounded text-center bg-white', style: { background: sm.bg, border: '1px solid ' + sm.border } },
                  React.createElement('div', { className: 'text-sm font-black', style: { color: sm.color } }, sm.label),
                  React.createElement('div', { className: 'text-[0.625rem] mt-1', style: { color: '#334155' } }, sm.desc),
                  React.createElement('div', { className: 'text-[0.625rem] font-mono mt-1', style: { color: '#475569' } }, 'Range ≈ ' + range.toFixed(1) + ' m')
                ),
                React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-2' },
                  [{ k: 'angle', l: 'Angle (°)', mn: 10, mx: 80, st: 1 },
                   { k: 'velocity', l: 'Velocity (m/s)', mn: 5, mx: 50, st: 1 },
                   { k: 'spin', l: 'Spin (rpm)', mn: -200, mx: 200, st: 5 }].map(function(s) {
                    return React.createElement('div', { key: s.k },
                      React.createElement('label', { htmlFor: 'th-' + s.k, className: 'block text-[0.625rem] font-bold text-slate-200' }, s.l + ': ', React.createElement('span', { className: 'font-mono text-cyan-300' }, iq[s.k])),
                      React.createElement('input', { id: 'th-' + s.k, type: 'range', min: s.mn, max: s.mx, step: s.st, value: iq[s.k],
                        onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                        className: 'w-full', 'aria-label': s.l }));
                  })
                ),
                React.createElement('div', { className: 'flex gap-2 items-center flex-wrap' },
                  React.createElement('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ a: iq.angle, v: iq.velocity, s: iq.spin, r: range.toFixed(1), st: state }]).slice(-8) }); }, className: 'px-3 py-1 rounded bg-slate-700 text-[0.6875rem] font-bold text-slate-200 border border-slate-600' }, __alloT('stem.throwlab.log', '📋 Log')),
                  React.createElement('button', { onClick: function() { setIQ({ angle: 45, velocity: 30, spin: 0, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-3 py-1 rounded bg-transparent text-[0.6875rem] font-semibold text-slate-300 border border-slate-600' }, __alloT('stem.throwlab.reset', '↺ Reset'))
                ),
                React.createElement('textarea', { 'aria-label': __alloT('stem.throwlab.hypothesis_label', 'Hypothesis about the throw trajectory'), value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.throwlab.hypothesis_why_is_45_special_what_abou', 'Hypothesis: Why is 45° special? What about with spin?'),
                  className: 'w-full text-[0.6875rem] bg-slate-900 text-slate-100 border border-slate-500 rounded p-1 font-mono', rows: 2 }),
                !iq.stuckRevealed && React.createElement('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-3 py-1 rounded bg-amber-700/30 text-[0.6875rem] font-bold text-amber-300 border border-amber-700' }, __alloT('stem.throwlab.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
                iq.stuckRevealed && React.createElement('div', { className: 'p-2 rounded bg-amber-900/20 border border-amber-700 text-[0.6875rem] text-slate-200' },
                  React.createElement('ul', { className: 'list-disc pl-4 space-y-0.5' },
                    React.createElement('li', null, __alloT('stem.throwlab.real_quarterbacks_throw_at_lower_angle', 'Real quarterbacks throw at lower angles. Why?')),
                    React.createElement('li', null, __alloT('stem.throwlab.how_does_spin_magnus_effect_alter_traj', 'How does spin (Magnus effect) alter trajectory?')))),
                React.createElement('label', { className: 'flex items-center gap-2 text-[0.6875rem] font-bold text-emerald-300 cursor-pointer' },
                  React.createElement('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-3 h-3' }),
                  __alloT('stem.throwlab.i_understand_explain_in_own_words', 'I understand — explain in own words')),
                iq.understood && React.createElement('textarea', { 'aria-label': __alloT('stem.throwlab.explanation_label', 'Explain the throw trajectory physics'), value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.throwlab.explain_throw_trajectory_physics', 'Explain throw trajectory physics.'),
                  className: 'w-full text-[0.6875rem] bg-slate-900 text-slate-100 border border-emerald-700 rounded p-1 font-mono mt-1', rows: 3 }),
                React.createElement('div', { className: 'text-[0.625rem] italic text-slate-300' }, __alloT('stem.throwlab.design_note_discrete_4_state_trajector', 'Design note: discrete 4-state trajectory marker; no distance score; no reveal — by design.'))
              );
            })(),
            // Replay analysis controls: a native timeline plus equivalent buttons.
            d.lastResult ? h('section', { 'data-throwlab-replay-analysis': 'true', 'aria-labelledby': 'throwlab-replay-heading', style: { marginTop: 8, padding: 9, borderRadius: 10, border: '1px solid rgba(134,239,172,0.32)', background: 'rgba(15,23,42,0.5)' } },
              h('h4', { id: 'throwlab-replay-heading', style: { margin: '0 0 7px', color: '#bbf7d0', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Replay analysis'),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                h('button', { type: 'button', 'data-tl-focusable': 'true', 'aria-label': d.replayActive && !replayPaused ? 'Pause trajectory replay' : d.replayActive ? 'Resume trajectory replay' : 'Replay trajectory from start', onClick: function() { if (d.replayActive && !replayPaused) { setReplayPaused(true); tlAnnounce(__alloT('stem.throwlab.sr_replay_paused', 'Replay paused.')); } else startReplayAt(d.replayActive ? (d.replayT || 0) : 0); }, style: { minHeight: 44, flex: '1 1 115px', borderRadius: 8, cursor: 'pointer', border: '1px solid #22c55e', background: d.replayActive && !replayPaused ? 'rgba(34,197,94,0.24)' : '#1e293b', color: '#bbf7d0', fontWeight: 800 } }, d.replayActive && !replayPaused ? 'Pause' : d.replayActive ? 'Resume' : 'Replay'),
                h('button', { type: 'button', 'data-tl-focusable': 'true', 'aria-label': __alloT('stem.throwlab.a11y_step_replay_backward_one_physics_sample', 'Step replay backward one physics sample'), onClick: function() { stepReplay(-1); }, style: { minHeight: 44, flex: '1 1 92px', borderRadius: 8, cursor: 'pointer' } }, 'Step back'),
                h('button', { type: 'button', 'data-tl-focusable': 'true', 'aria-label': __alloT('stem.throwlab.a11y_step_replay_forward_one_physics_sample', 'Step replay forward one physics sample'), onClick: function() { stepReplay(1); }, style: { minHeight: 44, flex: '1 1 92px', borderRadius: 8, cursor: 'pointer' } }, 'Step ahead'),
                h('button', { type: 'button', 'data-tl-focusable': 'true', disabled: !d.replayActive, onClick: finishReplayAnalysis, 'aria-label': __alloT('stem.throwlab.a11y_finish_replay_analysis_and_show_the_full_trajec', 'Finish replay analysis and show the full trajectory'), style: { minHeight: 44, flex: '1 1 80px', borderRadius: 8, cursor: d.replayActive ? 'pointer' : 'not-allowed' } }, 'Done')
              ),
              h('label', { htmlFor: 'throwlab-replay-scrubber', style: { display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 7, color: '#cbd5e1', fontSize: 11 } }, h('span', null, 'Timeline'), h('output', { htmlFor: 'throwlab-replay-scrubber', style: { color: '#86efac', fontVariantNumeric: 'tabular-nums', fontWeight: 800 } }, ((d.lastResult.samples[d.lastResult.samples.length - 1].t || 0) * (d.replayActive ? (d.replayT || 0) : 1)).toFixed(2) + ' s')),
              h('input', { id: 'throwlab-replay-scrubber', type: 'range', min: 0, max: 100, step: 1, value: Math.round((d.replayActive ? (d.replayT || 0) : 1) * 100), 'aria-label': __alloT('stem.throwlab.a11y_trajectory_replay_timeline', 'Trajectory replay timeline'), 'aria-valuetext': Math.round((d.replayActive ? (d.replayT || 0) : 1) * 100) + ' percent of the trajectory', 'data-tl-focusable': 'true', onChange: function(event) { scrubReplay(Number(event.target.value) / 100); }, style: { width: '100%', accentColor: '#22c55e' } }),
              h('div', { role: 'progressbar', 'aria-label': __alloT('stem.throwlab.a11y_replay_progress', 'Replay progress'), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round((d.replayActive ? (d.replayT || 0) : 1) * 100), style: { height: 6, overflow: 'hidden', borderRadius: 999, background: '#334155', border: '1px solid #475569' } }, h('span', { 'aria-hidden': 'true', style: { display: 'block', height: '100%', width: ((d.replayActive ? (d.replayT || 0) : 1) * 100) + '%', background: '#86efac', transition: 'width 80ms linear' } })),
              h('div', { role: 'group', 'aria-label': __alloT('stem.throwlab.a11y_replay_speed', 'Replay speed'), style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 7 } },
                h('span', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 800 } }, 'Speed'),
                [0.25, 0.5, 1].map(function(speed) { return h('button', { key: speed, type: 'button', 'aria-pressed': replaySpeed === speed, 'data-tl-focusable': 'true', onClick: function() { setReplaySpeed(speed); tlAnnounce('Replay speed ' + speed + ' times.'); }, style: { minHeight: 44, padding: '7px 11px', borderRadius: 18, cursor: 'pointer', border: replaySpeed === speed ? '2px solid #86efac' : '1px solid #475569', background: replaySpeed === speed ? 'rgba(34,197,94,0.18)' : '#1e293b', color: '#d1fae5', fontWeight: 800 } }, speed + '×'); })
              )
            ) : null,
            // ── Compare Mode controls ──
            // Save the latest trajectory as a reference ghost for the next throw,
            // OR clear the existing reference. Sits between the throw button and
            // the stats so it reads as a secondary action.
            (function() {
              var refList = activeReferenceList();
              var atCap = refList.length >= MAX_REFERENCES;
              return h('div', { style: { marginTop: 8 } },
                h('div', { style: { display: 'flex', gap: 6 } },
                  h('button', {
                    onClick: saveReference,
                    'aria-label': atCap
                      ? 'Save current throw as reference (oldest will be replaced; ' + MAX_REFERENCES + ' max)'
                      : 'Save current throw as reference (' + refList.length + ' of ' + MAX_REFERENCES + ' saved)',
                    'data-tl-focusable': 'true',
                    style: {
                      flex: 1, padding: '10px 12px', minHeight: 44, borderRadius: 6, cursor: 'pointer',
                      border: '1px solid #d946ef',
                      background: refList.length ? 'rgba(217,70,239,0.18)' : '#1e293b',
                      color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 11, fontWeight: 600
                    }
                  }, refList.length === 0 ? '📌 Save as reference'
                     : atCap ? '📌 Replace oldest (' + refList.length + '/' + MAX_REFERENCES + ')'
                     : '📌 Save reference (' + refList.length + '/' + MAX_REFERENCES + ')'),
                  refList.length ? h('button', {
                    onClick: clearReference,
                    'aria-label': __alloT('stem.throwlab.clear_all_saved_reference_trajectories', 'Clear all saved reference trajectories'),
                    'data-tl-focusable': 'true',
                    style: {
                      minWidth: 32, minHeight: 32, padding: '10px 12px',
                      borderRadius: 6, cursor: 'pointer',
                      border: '1px solid var(--allo-stem-border, #475569)', background: 'var(--allo-stem-panel, #1e293b)', color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12
                    }
                  }, __alloT('stem.throwlab.clear', 'Clear')) : null
                ),
                // Match the canvas encoding: current trajectory is solid;
                // saved references are dashed, numbered, and outcome-labeled.
                refList.length && d.lastResult ? h('div', {
                  'data-throwlab-current-legend': 'true',
                  role: 'note',
                  'aria-label': 'Current trajectory: ' + buildRefLabel(d.lastResult) + '. Outcome: ' + cleanOutcomeText(d.lastResult) + '.' + describeShape(d.lastResult),
                  style: {
                    marginTop: 7, display: 'grid', gridTemplateColumns: '24px auto minmax(0,1fr)',
                    alignItems: 'center', gap: 6, fontSize: 10
                  }
                },
                  h('span', {
                    'data-throwlab-current-line': 'true',
                    'aria-hidden': 'true',
                    style: { width: 24, height: 0, borderTop: '3px solid ' + outcomeColor(d.lastResult.location) }
                  }),
                  h('span', { style: { color: outcomeColor(d.lastResult.location), fontWeight: 800 } }, 'CURRENT'),
                  h('span', { style: { color: 'var(--allo-stem-text, #cbd5e1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, cleanOutcomeText(d.lastResult))
                ) : null,
                refList.length ? h('div', {
                  role: 'list',
                  'aria-label': __alloT('stem.throwlab.a11y_saved_comparison_trajectories', 'Saved comparison trajectories'),
                  style: { marginTop: 5, display: 'flex', flexDirection: 'column', gap: 4 }
                },
                  refList.map(function(ref, idx) {
                    var refOutcome = cleanOutcomeText(ref.result);
                    return h('div', {
                      key: 'ref-' + idx,
                      role: 'listitem',
                      'aria-label': referenceComparisonText(ref, idx),
                      style: {
                        display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) auto',
                        alignItems: 'center', gap: 6, fontSize: 10
                      }
                    },
                      h('span', {
                        'data-throwlab-reference-line': 'true',
                        'aria-hidden': 'true',
                        style: { width: 24, height: 0, borderTop: '3px dashed ' + (ref.color || '#d946ef') }
                      }),
                      h('div', { style: { minWidth: 0 } },
                        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
                          h('span', { style: { color: ref.color || '#d946ef', fontWeight: 800, flexShrink: 0 } }, 'REF' + (idx + 1)),
                          h('span', { style: { color: 'var(--allo-stem-text, #e2e8f0)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, refOutcome)
                        ),
                        h('div', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (ref.label || 'reference') + ((ref.result && !ref.result.modelVersion) ? ' · saved before the physics update' : ''))
                      ),
                      h('button', {
                        onClick: (function(i) { return function() { removeReferenceAt(i); }; })(idx),
                        'aria-label': 'Remove reference ' + (idx + 1) + ': ' + (ref.label || ''),
                        'data-tl-focusable': 'true',
                        style: {
                          minWidth: 24, minHeight: 24, padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
                          border: '1px solid var(--allo-stem-border, #475569)', background: 'transparent', color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 11
                        }
                      }, '\u2715')
                    );
                  })
                ) : null
              );
            })(),
            // Coach Mode button — only renders if Gemini is available AND
            // there's been at least one throw, so we don't tease a button
            // that wouldn't do anything useful yet.
            (typeof callGemini === 'function' && d.lastResult) ? h('div', { style: { marginTop: 8 } },
              // Coach persona picker — pill row of 4 voice options
              h('div', { role: 'group', 'aria-label': __alloT('stem.throwlab.coach_voice', 'Coach voice'),
                style: { display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' } },
                COACH_PERSONAS.map(function(p) {
                  var sel = (d.coachPersona || 'analyst') === p.id;
                  return h('button', {
                    key: 'coachp-' + p.id,
                    onClick: function() {
                      upd('coachPersona', p.id);
                      tlAnnounce('Coach voice: ' + p.label);
                    },
                    'aria-pressed': sel,
                    'aria-label': 'Coach voice: ' + p.label,
                    'data-tl-focusable': 'true',
                    title: p.prepend,
                    style: {
                      padding: '4px 9px', borderRadius: 18, cursor: 'pointer',
                      border: '1px solid ' + (sel ? '#d946ef' : '#334155'),
                      background: sel ? 'rgba(217,70,239,0.18)' : '#1e293b',
                      color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 11, fontWeight: sel ? 700 : 500
                    }
                  }, p.icon + ' ' + p.label);
                })
              ),
              h('button', {
                onClick: askCoach,
                disabled: !!d.coachLoading,
                'aria-busy': !!d.coachLoading,
                'aria-label': d.coachLoading ? 'Coach is thinking' : 'Ask the coach for feedback on your last throw',
                'data-tl-focusable': 'true',
                style: {
                  width: '100%', padding: '10px 14px', minHeight: 36,
                  borderRadius: 6, cursor: d.coachLoading ? 'wait' : 'pointer',
                  border: '1px solid #d946ef',
                  background: d.coachLoading ? '#1e293b' : 'rgba(217, 70, 239, 0.18)',
                  color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 12, fontWeight: 600
                }
              }, d.coachLoading ? '🤖 Coach is thinking…' : '🤖 Ask the coach')
            ) : null,
            // Stats line — mode-aware. Bumped slate-400 → slate-300 (#cbd5e1)
            // for AA contrast on the dark panel background.
            h('div', { role: 'list', 'aria-label': __alloT('stem.throwlab.a11y_current_throw_lab_session_summary', 'Current Throw Lab session summary'),
              style: { marginTop: 12, fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px 12px' }
            }, sessionSummaryItems().map(function(item, index) {
              return h('span', { key: 'session-stat-' + index, role: 'listitem' }, item);
            }))
          )
        ),
        // ── Mode-accent hero band (sport-flavored, dark-themed) ──
        (function() {
          var MODE_META = {
            pitching:   { accent: '#fbbf24', soft: 'rgba(251,191,36,0.14)', icon: '⚾', title: __alloT('stem.throwlab.pitcher_s_mound_60_ft_6_in_to_home_pla', "Pitcher's Mound \u2014 60 ft 6 in to home plate"),     hint: __alloT('stem.throwlab.pitching_learning_goal', 'Goal: cross the strike zone. Speed changes reaction time; spin rate and spin axis shape late break. Start with a preset, then change one control.') },
            freethrow:  { accent: '#f97316', soft: 'rgba(249,115,22,0.14)', icon: '🏀', title: __alloT('stem.throwlab.free_throw_15_ft_from_line_to_hoop_v2', 'Basketball \u2014 shots and passes'),          hint: __alloT('stem.throwlab.basketball_learning_goal', 'Goal: reach the rim or teammate with control. Launch angle shapes the arc; speed sets range; backspin changes the finish.') },
            freekick:   { accent: '#22c55e', soft: 'rgba(34,197,94,0.14)',  icon: '⚽', title: __alloT('stem.throwlab.free_kick_22m_a_4_defender_wall_v2', 'Free Kick \u2014 22 m plus a defender wall'),          hint: __alloT('stem.throwlab.freekick_learning_goal', 'Goal: clear the wall and find the goal. Vertical angle creates clearance; horizontal aim sets the line; sidespin creates curl.') },
            fieldgoal:  { accent: '#ea580c', soft: 'rgba(234,88,12,0.14)',  icon: '🏈', title: __alloT('stem.throwlab.field_goal_18_5_ft_wide_10_ft_up', 'Field Goal \u2014 18.5 ft wide, 10 ft up'),          hint: __alloT('stem.throwlab.fieldgoal_learning_goal', 'Goal: clear the crossbar between the uprights. Test how launch angle, speed, distance, and wind trade height for range.') },
            bowling:    { accent: '#dc2626', soft: 'rgba(220,38,38,0.14)',  icon: '🏏', title: __alloT('stem.throwlab.bowler_s_crease_22_yd_to_the_stumps', "Bowler's Crease \u2014 22 yd to the stumps"),       hint: __alloT('stem.throwlab.bowling_learning_goal', 'Goal: hit the stumps after the bounce. Release angle controls length; horizontal aim controls line; spin changes movement.') },
            golf:       { accent: '#16a34a', soft: 'rgba(22,163,74,0.14)',  icon: '⛳', title: __alloT('stem.throwlab.golf_tee_shot_driver_to_wedge_v2', 'Golf Flight \u2014 driver to wedge'),                  hint: __alloT('stem.throwlab.golf_learning_goal', 'Goal: match carry to the target. Club speed sets range while loft and backspin trade forward motion for lift and stopping power.') },
            volleyball: { accent: '#3b82f6', soft: 'rgba(59,130,246,0.14)', icon: '🏐', title: __alloT('stem.throwlab.server_s_line_over_a_2_43m_net_in_9_9m_v2', "Server's Line \u2014 over a 2.43 m net, into a 9 × 9 m court"),   hint: __alloT('stem.throwlab.volleyball_learning_goal', 'Goal: clear the net and land in court. Speed creates depth; launch angle creates clearance; topspin helps the ball dive.') }
          };
          var meta = MODE_META[d.mode] || MODE_META.pitching;
          var launchAngleClamped = Math.max(-15, Math.min(60, Number(d.aimDegV) || 0));
          var vecRad = launchAngleClamped * Math.PI / 180;
          var vecLen = 34;
          var vx2 = 22 + Math.cos(vecRad) * vecLen;
          var vy2 = 40 - Math.sin(vecRad) * vecLen;
          var speedDisplay = Math.round(Number(d.speedMph) || 0);
          var spinDisplay = Math.round(Number(d.spinRpm) || 0);
          return h('div', {
            className: 'throwlab-mode-band',
            style: {
              margin: '0 0 14px',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(15,23,42,0) 100%), #0f172a',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 220px', minWidth: 0 } },
              h('div', { style: { fontSize: 30, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('h3', { style: { color: 'rgb(' + [16, 8, 0].map(function (s) { return Math.round((parseInt(meta.accent.slice(1), 16) >> s & 255) * 0.55 + 115); }).join(',') + ')', fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
              )
            ),
            // Live reactive launch-vector schematic SVG (speed, angle, spin)
            h('svg', {
              width: 146, height: 56, viewBox: '0 0 146 56', 'aria-hidden': 'true',
              style: { flexShrink: 0, display: 'block', borderRadius: 8, background: 'rgba(2,6,23,0.6)', border: '1px solid rgba(148,163,184,0.28)' }
            },
              h('line', { x1: 12, y1: 42, x2: 72, y2: 42, stroke: 'rgba(148,163,184,0.45)', strokeWidth: 1.2, strokeDasharray: '3 2' }),
              h('circle', { cx: 22, cy: 40, r: 4, fill: meta.accent }),
              h('line', { x1: 22, y1: 40, x2: vx2, y2: vy2, stroke: '#fbbf24', strokeWidth: 2.2, strokeLinecap: 'round' }),
              h('circle', { cx: vx2, cy: vy2, r: 2.5, fill: '#fef3c7' }),
              h('text', { x: 80, y: 20, fill: '#f8fafc', fontSize: 10, fontWeight: 800 }, speedDisplay + ' mph'),
              h('text', { x: 80, y: 34, fill: '#93c5fd', fontSize: 10, fontWeight: 700 }, launchAngleClamped.toFixed(1) + '°'),
              h('text', { x: 80, y: 48, fill: '#fcd34d', fontSize: 10, fontWeight: 700 }, spinDisplay + ' rpm')
            )
          );
        })(),
        renderThrowRunFocus(),
        // ── Pitch Locker compact summary (only shown in pitching mode) ──
        // Sticky band under the header showing how many pitch types you have
        // thrown for strikes across all sessions. Click expands the locker
        // detail. Surfaces engagement-by-glance: kids see they have 4/6 and
        // want the missing two.
        d.mode === 'pitching' && (function () {
          var locker = (d.pitchLocker && typeof d.pitchLocker === 'object') ? d.pitchLocker : {};
          var got = Object.keys(locker).filter(function (k) { return PITCH_TYPES.some(function (p) { return p.id === k; }); }).length;
          var total = PITCH_TYPES.length;
          var pct = total > 0 ? Math.round((got / total) * 100) : 0;
          return h('div', {
            style: {
              marginBottom: 12, padding: '10px 14px', borderRadius: 12,
              background: 'linear-gradient(110deg, rgba(245,158,11,0.10) 0%, rgba(239,68,68,0.18) 50%, rgba(124,58,237,0.10) 100%)',
              border: '1px solid rgba(245,158,11,0.50)',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 22, lineHeight: 1, flexShrink: 0 } }, '🏅'),
            h('div', { style: { flex: '1 1 180px', minWidth: 0 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' } },
                h('strong', { style: { fontSize: 13, fontWeight: 800, color: '#fef3c7' } }, __alloT('stem.throwlab.pitch_locker', 'Pitch Locker')),
                h('span', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)' } }, got + ' / ' + total + ' types thrown for strikes'),
                h('span', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic' } },
                  got === 0 ? 'Hit the strike zone with a new pitch type to lock it in.'
                  : got === total ? '🏆 Full repertoire — every pitch type strike-tested.'
                  : 'Hit a strike with a new type to add it.')
              ),
              h('div', { style: { marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' } },
                PITCH_TYPES.map(function (p) {
                  var locked = !!locker[p.id];
                  return h('span', { key: p.id,
                    title: p.label + (locked ? ' — locked in (' + (locker[p.id].strikeCount || 1) + ' strikes)' : ' — not yet'),
                    'aria-label': p.label + (locked ? ' locked in' : ' not yet'),
                    style: {
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: locked ? 'rgba(34,197,94,0.20)' : 'rgba(15,23,42,0.35)',
                      color: locked ? '#86efac' : '#94a3b8',
                      border: '1px solid ' + (locked ? 'rgba(34,197,94,0.55)' : '#334155'),
                      filter: locked ? 'none' : 'grayscale(100%)'
                    }
                  },
                    h('span', { 'aria-hidden': 'true' }, p.icon),
                    p.label.replace(/^(.+?)( \(.+\))?$/, '$1')
                  );
                })
              )
            )
          );
        })(),

        h('section', {
          className: 'throwlab-learning-loop',
          'aria-label': __alloT('stem.throwlab.how_the_lab_works', 'How Throw Lab works')
        },
          [
            ['1', __alloT('stem.throwlab.loop_choose', 'Choose'), __alloT('stem.throwlab.loop_choose_detail', 'Pick a sport and setup')],
            ['2', __alloT('stem.throwlab.loop_predict', 'Hypothesize'), __alloT('stem.throwlab.loop_predict_detail', 'Make an ungraded call')],
            ['3', __alloT('stem.throwlab.loop_launch', 'Launch'), __alloT('stem.throwlab.loop_launch_detail', 'Watch the evidence')],
            ['4', __alloT('stem.throwlab.loop_compare', 'Compare'), __alloT('stem.throwlab.loop_compare_detail', 'Change one variable')]
          ].map(function(step) {
            return h('div', { key: step[0], className: 'throwlab-loop-step' },
              h('span', { className: 'throwlab-loop-number', 'aria-hidden': 'true' }, step[0]),
              h('span', null, h('strong', null, step[1]), step[2])
            );
          })
        ),
        // Optional depth stays available without interrupting the core
        // Choose -> Predict -> Launch -> Compare path.
        h('details', {
          className: 'throwlab-explore-drawer',
          'data-throwlab-explore-drawer': 'true',
          style: {
            marginBottom: 14, borderRadius: 12, overflow: 'hidden',
            border: '1px solid rgba(148,163,184,0.30)',
            background: 'rgba(15,23,42,0.72)'
          }
        },
          h('summary', {
            'data-tl-focusable': 'true',
            style: {
              padding: '11px 13px', cursor: 'pointer', color: '#e2e8f0',
              fontSize: 12, fontWeight: 800
            }
          },
            __alloT('stem.throwlab.lab_extensions', 'Extend the lab'),
            h('span', {
              style: { display: 'block', marginTop: 3, color: '#94a3b8', fontSize: 10, fontWeight: 500, lineHeight: 1.35 }
            }, __alloT('stem.throwlab.lab_extensions_detail', 'Optional scenarios, gravity, skill levels, drills, rewards, and session stats.'))
          ),
          h('div', { style: { padding: '1px 12px 12px' } },

        // ── Scenarios ──
        // One-click teaching demos. Each pill snaps mode + preset +
        // gravity + wind into a configured setup. Useful as a warm-up
        // for class discussion: pick a scenario, throw it, talk about
        // the physics. Hidden behind a collapsed details so it doesn't
        // dominate the UI for students who want to free-explore.
        h('details', {
          style: { marginBottom: 14, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: '8px 12px' }
        },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', fontWeight: 600 }
          }, '🎬 Scenarios — one-click teaching demos (' + SCENARIOS.length + ' built-in' + ((d.customScenarios || []).length ? ' + ' + (d.customScenarios || []).length + ' custom' : '') + ')'),
          h('div', {
            role: 'group', 'aria-label': __alloT('stem.throwlab.scenarios', 'Scenarios'),
            style: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }
          },
            SCENARIOS.map(function(sc) {
              return h('button', {
                key: 'sc-' + sc.id,
                onClick: function() { applyScenario(sc.id); },
                'aria-label': sc.label + ' scenario: ' + sc.teach,
                'data-tl-focusable': 'true',
                title: sc.teach,
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid var(--allo-stem-border, #334155)',
                  background: 'var(--allo-stem-panel, #1e293b)',
                  color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 11, fontWeight: 600
                }
              }, sc.icon + ' ' + sc.label);
            }).concat(
              // Custom scenarios — same pill style + small delete button
              (d.customScenarios || []).map(function(sc) {
                return h('span', {
                  key: 'csc-' + sc.id,
                  style: { display: 'inline-flex', alignItems: 'stretch', borderRadius: 6, overflow: 'hidden' }
                },
                  h('button', {
                    onClick: function() { applyScenario(sc.id); },
                    'aria-label': sc.label + ' (custom): ' + (sc.teach || ''),
                    'data-tl-focusable': 'true',
                    title: sc.teach || sc.label,
                    style: {
                      padding: '6px 11px', cursor: 'pointer',
                      border: '1px solid #a78bfa',
                      borderRight: 'none',
                      background: 'rgba(167,139,250,0.10)',
                      color: '#a78bfa', fontSize: 11, fontWeight: 600
                    }
                  }, sc.icon + ' ' + sc.label),
                  h('button', {
                    onClick: function() { deleteCustomScenario(sc.id); },
                    'aria-label': 'Delete custom scenario: ' + sc.label,
                    'data-tl-focusable': 'true',
                    title: __alloT('stem.throwlab.delete_this_custom_scenario', 'Delete this custom scenario'),
                    style: {
                      padding: '6px 8px', cursor: 'pointer',
                      border: '1px solid #a78bfa',
                      background: 'rgba(167,139,250,0.10)',
                      color: '#a78bfa', fontSize: 11
                    }
                  }, '✕')
                );
              })
            ).concat([
              // Quick-Play — random scenario, one click
              h('button', {
                key: 'sc-random',
                onClick: runRandomScenario,
                'aria-label': __alloT('stem.throwlab.run_a_random_scenario_go_straight_to_t', 'Run a random scenario — go straight to throwing without reading setup'),
                'data-tl-focusable': 'true',
                title: __alloT('stem.throwlab.pick_a_random_scenario_and_start_immed', 'Pick a random scenario and start immediately — no setup, just throw'),
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px dashed #6366f1', background: 'rgba(99,102,241,0.10)',
                  color: '#a5b4fc', fontSize: 11, fontWeight: 700
                }
              }, __alloT('stem.throwlab.run_something_cool', '🎲 Run something cool')),
              // Save current as scenario
              h('button', {
                key: 'sc-save',
                onClick: saveCustomScenario,
                'aria-label': __alloT('stem.throwlab.save_current_setup_as_a_custom_scenari', 'Save current setup as a custom scenario'),
                'data-tl-focusable': 'true',
                title: __alloT('stem.throwlab.save_the_current_mode_preset_gravity_w', 'Save the current mode + preset + gravity + wind as a personalized scenario'),
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px dashed #a78bfa', background: 'transparent',
                  color: '#a78bfa', fontSize: 11, fontWeight: 700
                }
              }, __alloT('stem.throwlab.save_current', '⭐ Save current')),
              h('button', {
                key: 'sc-print',
                onClick: printThrowLabActivitySheet,
                'aria-label': __alloT('stem.throwlab.print_activity_sheet_for_all_scenarios', 'Print activity sheet for all scenarios'),
                'data-tl-focusable': 'true',
                title: __alloT('stem.throwlab.open_a_printable_activity_sheet_with_a', 'Open a printable activity sheet with all scenarios + discussion questions'),
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #fbbf24', background: 'rgba(251,191,36,0.10)',
                  color: '#fbbf24', fontSize: 11, fontWeight: 700, marginLeft: 4
                }
              }, __alloT('stem.throwlab.print_activity_sheet', '📄 Print activity sheet')),
              h('button', {
                key: 'sc-card',
                onClick: exportTradingCard,
                'aria-label': __alloT('stem.throwlab.export_your_last_throw_as_a_printable_', 'Export your last throw as a printable trading card'),
                'data-tl-focusable': 'true',
                title: __alloT('stem.throwlab.make_a_topps_style_trading_card_from_y', 'Make a Topps-style trading card from your last throw + stats + badges'),
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.10)',
                  color: '#fbbf24', fontSize: 11, fontWeight: 700
                }
              }, __alloT('stem.throwlab.trading_card', '📇 Trading card'))
            ])
          )
        ),

        // ── Daily Challenge (engagement layer) ──
        // Deterministic-by-date scenario, prominent above the scenarios
        // row. State has 3 visual modes: NEW (today, untried), GO
        // (loaded but not yet made), DONE (already completed today).
        (function() {
          var daily = getDailyChallenge();
          if (!daily) return null;
          var key = todayKey();
          var done = d.dailyCompleted === key;
          var loaded = d.activeScenarioId === daily.id;
          var bg = done ? 'rgba(34,197,94,0.15)' : loaded ? 'rgba(251,191,36,0.18)' : 'rgba(167,139,250,0.10)';
          var border = done ? '#22c55e' : loaded ? '#fbbf24' : '#a78bfa';
          var label = done ? '✅ Today\'s Challenge complete!' : loaded ? '🎯 In progress: ' + daily.label : '🌟 Today\'s Challenge: ' + daily.label;
          return h('button', {
            onClick: function() {
              if (done) {
                tlAnnounce(__alloT('stem.throwlab.sr_daily_challenge_already_complete_come_back_tomorr', 'Daily Challenge already complete. Come back tomorrow for a new one.'));
                return;
              }
              applyScenario(daily.id);
            },
            'aria-label': label,
            'data-tl-focusable': 'true',
            title: daily.teach,
            style: {
              display: 'block', width: '100%', marginBottom: 14,
              padding: '10px 14px', borderRadius: 8,
              border: '1px solid ' + border, background: bg,
              color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 12, fontWeight: 600,
              textAlign: 'left', cursor: done ? 'default' : 'pointer'
            }
          },
            h('div', { style: { fontSize: 11, color: border, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, label),
            h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', marginTop: 2, fontWeight: 400 } },
              done ? 'Earned 15 XP. Try again tomorrow.' : daily.teach.slice(0, 110) + (daily.teach.length > 110 ? '…' : ''))
          );
        })(),

        // ── Achievements / Badges (engagement layer) ──
        // Collection mechanic for athletic students. All badges shown
        // dimmed; earned badges glow with their color. Tooltip shows the
        // hint so students can see how to unlock unearned ones — turns
        // it into a checklist rather than a mystery box.
        h('details', {
          style: { marginBottom: 14, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: '8px 12px' }
        },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', fontWeight: 600 }
          }, '🏅 Achievements (' + Object.keys(d.badgesEarned || {}).length + ' / ' + BADGES.length + ')'),
          h('div', {
            role: 'list', 'aria-label': __alloT('stem.throwlab.badge_achievements', 'Badge achievements'),
            style: { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }
          },
            BADGES.map(function(b) {
              var earned = !!(d.badgesEarned && d.badgesEarned[b.id]);
              return h('span', {
                key: 'badge-' + b.id,
                role: 'listitem',
                'aria-label': b.label + (earned ? ' (earned)' : ' (locked)') + ': ' + b.hint,
                title: b.hint,
                style: {
                  padding: '5px 10px', borderRadius: 20,
                  border: '1px solid ' + (earned ? '#fbbf24' : '#475569'),
                  background: earned ? 'rgba(251,191,36,0.18)' : '#172033',
                  color: earned ? '#fbbf24' : '#cbd5e1',
                  fontSize: 11, fontWeight: earned ? 700 : 500,
                  opacity: earned ? 1 : 0.82
                }
              }, b.emoji + ' ' + b.label);
            })
          )
        ),

        // ── Stats Card (engagement layer) ──
        // Baseball-card-style "your numbers" surface. Pulls from the
        // same drillStats / throwCount / per-sport counters the badges
        // and trading card already use; formats them as a 2-column
        // grid the way fantasy sports apps display stat lines.
        h('details', {
          style: { marginBottom: 14, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: '8px 12px' }
        },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', fontWeight: 600 }
          }, '📊 Your Numbers — ' + (d.playerName || 'session stats')),
          h('dl', {
            'aria-label': __alloT('stem.throwlab.session_stats', 'Session stats'),
            style: { margin: '10px 0 0', display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: 12 }
          },
            getStatsRows(d).reduce(function(acc, row) {
              acc.push(h('dt', {
                key: 'sl-' + row.label,
                style: { color: 'var(--allo-stem-text-soft, #94a3b8)' }
              }, row.label));
              acc.push(h('dd', {
                key: 'sv-' + row.label,
                style: {
                  margin: 0, color: '#fbbf24', fontWeight: 700,
                  fontFamily: 'ui-monospace, monospace', textAlign: 'right'
                }
              }, row.value));
              return acc;
            }, [])
          )
        ),

        // ── Active Scenario Briefing ──
        // When a scenario was just loaded, surface its teach blurb +
        // discussion questions in a dedicated panel above the main
        // controls. Persists until the user dismisses it OR loads a
        // different scenario. Useful for teachers in front of a class —
        // gives them ready-made physics-discussion prompts.
        (function() {
          var active = d.activeScenarioId
            ? (SCENARIOS.find(function(sc) { return sc.id === d.activeScenarioId; })
               || (d.customScenarios || []).find(function(sc) { return sc.id === d.activeScenarioId; }))
            : null;
          if (!active) return null;
          return h('section', {
            'aria-label': __alloT('stem.throwlab.scenario_briefing', 'Scenario briefing'),
            style: {
              padding: 12, borderRadius: 10, marginBottom: 14,
              background: 'rgba(167,139,250,0.10)',
              border: '1px solid rgba(167,139,250,0.45)',
              color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 13, lineHeight: 1.5
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 } },
              h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, active.icon),
              h('div', { style: { flex: 1 } },
                h('div', { style: { fontWeight: 700, color: '#a78bfa', fontSize: 13, marginBottom: 2 } },
                  '🎬 Scenario: ' + active.label),
                h('div', null, active.teach)
              ),
              h('button', {
                onClick: function() { upd('activeScenarioId', null); },
                'aria-label': __alloT('stem.throwlab.dismiss_scenario_briefing', 'Dismiss scenario briefing'),
                'data-tl-focusable': 'true',
                style: {
                  padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid var(--allo-stem-border, #475569)', background: 'transparent',
                  color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 11
                }
              }, __alloT('stem.throwlab.dismiss', '✕ Dismiss'))
            ),
            (active.questions && active.questions.length) ? h('div', {
              style: { marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(167,139,250,0.30)' }
            },
              h('div', { style: { fontSize: 11, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
                __alloT('stem.throwlab.discussion', '💭 Discussion')),
              h('ol', { style: { margin: '4px 0 0 18px', padding: 0, color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.5 } },
                active.questions.map(function(q, i) {
                  return h('li', { key: 'q-' + i, style: { marginBottom: 4 } }, q);
                })
              )
            ) : null
          );
        })(),

        // Difficulty / scaffold tier selector — IEP / UDL onramp.
        // Tier 1 = speed only (early elementary, "more push = farther").
        // Tier 2 = + release height + angle (when angle starts mattering).
        // Tier 3 = + spin (full physics, MS / HS / AP).
        // Wind controls follow tier 2+ so the wind panel doesn't confuse a
        // Tier 1 student. Stored on d.scaffoldTier; defaults to 3.
        // Difficulty selector — re-skinned in athlete language.
        // Internally still scaffoldTier 1/2/3/4 (same data model), but
        // UI reads as career progression: Rookie → Pro → All-Star → HOF.
        // Tier 4 (Hall of Fame) auto-toggles showFormulas for the
        // physics-deep-dive student. Same simulation underneath.
        h('div', { role: 'group', 'aria-label': __alloT('stem.throwlab.skill_level', 'Skill level'),
          style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap', fontSize: 12 }
        },
          h('span', { style: { color: 'var(--allo-stem-text, #cbd5e1)' } }, 'Skill:'),
          [
            { tier: 1, label: __alloT('stem.throwlab.rookie', '🏆 Rookie'),     sub: 'Speed only' },
            { tier: 2, label: __alloT('stem.throwlab.pro', '🏆 Pro'),        sub: '+ Angle' },
            { tier: 3, label: __alloT('stem.throwlab.all_star', '🏆 All-Star'),   sub: '+ Spin' },
            { tier: 4, label: __alloT('stem.throwlab.hall_of_fame', '🏆 Hall of Fame'), sub: 'Full physics + formulas' }
          ].map(function(opt) {
            var sel = (d.scaffoldTier || 3) === opt.tier;
            return h('button', {
              key: 'tier' + opt.tier,
              onClick: function() {
                setLabToolData(function(prev) {
                  var next = Object.assign({}, prev.throwlab, { scaffoldTier: opt.tier });
                  // HOF tier auto-shows the physics formulas overlay
                  if (opt.tier === 4) next.showFormulas = true;
                  return Object.assign({}, prev, { throwlab: next });
                });
                tlAnnounce('Skill level: ' + opt.label.replace(/^\S+\s/, '') + ' — ' + opt.sub);
              },
              'aria-pressed': sel,
              'aria-label': opt.label.replace(/^\S+\s/, '') + ': ' + opt.sub,
              'data-tl-focusable': 'true',
              title: opt.sub,
              style: {
                padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 12, fontWeight: sel ? 700 : 500
              }
            }, opt.label);
          })
        ),

        // Gravity preset selector — "what would this look like on Mars?"
        // Available at any tier since it's the most concrete scientific
        // teaching moment in the tool: g changes, every trajectory changes
        // proportionally, and students can reason about WHY.
        h('div', { role: 'group', 'aria-label': __alloT('stem.throwlab.gravity_preset', 'Gravity preset'),
          style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap', fontSize: 12 }
        },
          h('span', { style: { color: 'var(--allo-stem-text, #cbd5e1)' } }, 'Gravity:'),
          GRAVITY_PRESETS.map(function(gp) {
            var sel = (d.gravityId || 'earth') === gp.id;
            return h('button', {
              key: 'g-' + gp.id,
              onClick: function() {
                upd('gravityId', gp.id);
                tlAnnounce('Gravity set to ' + gp.label + ', ' + gp.g.toFixed(2) + ' meters per second squared.');
              },
              'aria-pressed': sel,
              'aria-label': gp.label + ' gravity, ' + gp.g.toFixed(2) + ' m/s squared',
              'data-tl-focusable': 'true',
              style: {
                padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 12
              }
            }, gp.icon + ' ' + gp.label + ' (' + gp.g.toFixed(1) + ')');
          })
        ),

        // ── Drills panel ──
        // Toggle + active goal display. When inactive, shows a small "Start
        // drill" pill; when active, shows the current task goal + progress
        // + restart. Per-mode drills come from the DRILLS const.
        (function() {
          var modeDrills = DRILLS[d.mode];
          if (!modeDrills) return null;
          // While the ball is in the air the card keeps the task it had at launch, so it cannot tell
          // the result before the ball arrives.
          var drillFlying = !!tlInFlight && typeof d.drillIdxAtLaunch === 'number';
          var taskIdx = drillFlying ? d.drillIdxAtLaunch : (d.drillTaskIdx || 0);
          var allDone = taskIdx >= modeDrills.tasks.length;
          var task = modeDrills.tasks[Math.min(taskIdx, modeDrills.tasks.length - 1)];
          // Drill progress reads only the throws that came after a call.
          var stats = drillStatsWithDefaults(d.drillCallStats);
          if (!d.drillActive) {
            return h('div', { style: { marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
              h('button', {
                onClick: function() {
                  // Reset drill state on start
                  setLabToolData(function(prev) {
                    return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
                      drillActive: true, drillTaskIdx: 0,
                      drillStats: {
                        streakStrikes: 0, strikeTypes: {}, strikeWithLowSpin: false,
                        makeCount: 0, swishHeights: 0, swishHeightSet: {}, completedBouncePass: false,
                        goalKickTypes: {}, totalGoals: 0,
                        fgMadeByDist: {}
                      },
                      drillCallStats: {}, drillLastUncalled: false
                    })});
                  });
                  tlAnnounce('Drill started: ' + modeDrills.tasks[0].goal);
                },
                'data-tl-focusable': 'true',
                style: {
                  padding: '8px 14px', borderRadius: 22, cursor: 'pointer',
                  border: '1px solid #10b981', background: 'rgba(16,185,129,0.18)',
                  color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 12, fontWeight: 600
                }
              }, '🎯 Start ' + modeDrills.label),
              h('span', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } },
                modeDrills.tasks.length + ' tasks · make a call before each throw · a repeat of the throw before it does not count'));
          }
          // Active drill panel
          return h('section', {
            'aria-labelledby': 'tl-drill-heading',
            style: { marginBottom: 14, padding: 12,
              background: allDone ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.06)',
              border: '1px solid #10b981', borderRadius: 10 }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6, flexWrap: 'wrap' } },
              h('h3', { id: 'tl-drill-heading', style: { margin: 0, fontSize: 12, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 } },
                allDone ? '🏆 Drill complete · ' + modeDrills.label : '🎯 ' + modeDrills.label + ' · Task ' + (taskIdx + 1) + ' of ' + modeDrills.tasks.length),
              h('button', {
                onClick: function() {
                  setLabToolData(function(prev) {
                    return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
                      drillActive: false, drillTaskIdx: 0
                    })});
                  });
                  tlAnnounce(__alloT('stem.throwlab.sr_drill_stopped', 'Drill stopped.'));
                },
                'aria-label': __alloT('stem.throwlab.stop_the_current_drill', 'Stop the current drill'),
                'data-tl-focusable': 'true',
                style: { padding: '4px 8px', minHeight: 24, borderRadius: 4, cursor: 'pointer',
                  border: '1px solid var(--allo-stem-border, #475569)', background: 'var(--allo-stem-panel, #1e293b)', color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 11 }
              }, allDone ? 'Close' : 'Stop')),
            allDone
              ? h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #cbd5e1)' } },
                  'You finished all ' + modeDrills.tasks.length + ' tasks. Try another sport mode\'s drills, or hit Stop to return to sandbox.')
              : h('div', null,
                  h('div', { style: { fontSize: 14, color: 'var(--allo-stem-text, #f1f5f9)', fontWeight: 600, marginBottom: 4 } }, task.goal),
                  h('div', { 'data-throwlab-drill-call-rule': 'true', style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', marginBottom: 4, lineHeight: 1.4 } },
                    __alloT('stem.throwlab.drill_call_rule', 'Make a call before each throw. Only throws with a call count for the drill.')),
                  d.drillLastUncalled && h('div', { 'data-throwlab-drill-uncalled': 'true', style: { fontSize: 12, color: 'var(--allo-stem-text, #f1f5f9)', borderLeft: '3px solid #f59e0b', paddingLeft: 6, marginBottom: 4, lineHeight: 1.4 } },
                    __alloT('stem.throwlab.drill_last_uncalled', 'Your last throw had no call, so it did not count. Make a call, then throw.')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', marginBottom: 4 } },
                    h('span', { style: { color: '#10b981', fontWeight: 700, marginRight: 6 } }, 'Progress:'),
                    drillFlying ? __alloT('stem.throwlab.drill_in_flight', 'The ball is in the air. Progress updates when it lands.') : task.progress(stats)),
                  task.tip ? h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic' } },
                    h('span', { style: { color: '#fbbf24' } }, '💡 '), task.tip) : null)
          );
        })()
          )
        )
      );
    }
  });

})();
