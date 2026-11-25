// ═══════════════════════════════════════════
// stem_tool_playlab.js — Sports Play & Coverage Lab
// Headline: American Football play-design — geometry of routes,
// defensive coverages, and "open receiver" detection.
// "Every play is a coordinated math problem on a fixed grid."
// ═══════════════════════════════════════════

// ── PlayLab keyframes (Play Catalog celebration) ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('playlab-celeb-css')) return;
  var st = document.createElement('style');
  st.id = 'playlab-celeb-css';
  st.textContent = [
    '@keyframes playlab-celeb-rise {',
    '  0%   { transform: translate(-50%, -120%); opacity: 0; }',
    '  10%  { transform: translate(-50%, 0%);    opacity: 1; }',
    '  88%  { transform: translate(-50%, 0%);    opacity: 1; }',
    '  100% { transform: translate(-50%, -10%);  opacity: 0; }',
    '}'
  ].join('');
  if (document.head) document.head.appendChild(st);
})();

// ═══ Defensive StemLab guard ═══
if (typeof window !== 'undefined') window.StemLab = window.StemLab || {
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
  if (typeof window === 'undefined' || !window.StemLab) return;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // ── Reduced-motion CSS (WCAG 2.3.3) — shared across STEAM Lab tools ──
  // Contrast theme: hovered buttons, owned by this tool (allo-playlab-hc-extra-css).
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-playlab-hc-extra-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-playlab-hc-extra-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"playlab\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h){background-color:#00ff00!important;background-image:none!important;color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"playlab\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *{color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"playlab\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *:not(:empty):not(svg,svg *,canvas,img,video){background-color:#00ff00!important;background-image:none!important}";
    document.head.appendChild(st);
  })();
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Focus-visible outline (WCAG 2.4.7) ──
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-playlab-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-playlab-focus-css';
    st.textContent = '[data-pl-focusable]:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px!important;border-radius:6px}';
    document.head.appendChild(st);
  })();

  // ── ARIA live region ──
  // PlayLab field-first polish: stronger live surface, responsive layout, stable controls.
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-playlab-field-polish-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-playlab-field-polish-css';
    st.textContent = [
      '.playlab-gameplan-card{margin-bottom:14px;padding:14px;border:1px solid rgba(56,189,248,.35);border-radius:16px;background:linear-gradient(135deg,#0f172a,#0e2c47);box-shadow:0 18px 42px rgba(2,6,23,.28)}',
      '.playlab-gameplan-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.playlab-kicker{font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#7dd3fc}',
      '.playlab-gameplan-title{margin:2px 0 0;font-size:18px;font-weight:900;color:#f8fafc;line-height:1.2}',
      '.playlab-gameplan-copy{margin:5px 0 0;color:#cbd5e1;font-size:12px;line-height:1.45;max-width:720px}',
      '.playlab-status-pill{border:1px solid rgba(16,185,129,.55);background:rgba(16,185,129,.16);color:#bbf7d0;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:900;white-space:nowrap}',
      '.playlab-metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}',
      '.playlab-metric{border:1px solid rgba(148,163,184,.24);background:rgba(15,23,42,.64);border-radius:12px;padding:9px;min-height:64px}',
      '.playlab-metric span{display:block;color:#cbd5e1;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}',
      '.playlab-metric b{display:block;color:#f8fafc;font-size:13px;line-height:1.25;margin-top:3px}',
      '.playlab-setup-panel{margin-bottom:12px;padding:12px;border:1px solid #64748b;border-radius:14px;background:#0f172a}',
      '.playlab-setup-header{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}',
      '.playlab-setup-title{margin:0;color:#f8fafc;font-size:14px;font-weight:900;line-height:1.2}',
      '.playlab-setup-note{color:#e2e8f0;font-size:12px;font-weight:700}',
      '.playlab-setup-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
      '.playlab-choice-group{min-width:0;border:1px solid rgba(148,163,184,.45);border-radius:12px;background:rgba(2,6,23,.34);padding:9px}',
      '.playlab-choice-group-wide{grid-column:1/-1}',
      '.playlab-choice-label{display:block;color:#f8fafc;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;margin-bottom:7px}',
      '.playlab-choice-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.playlab-native-control{min-height:44px;border:1px solid #94a3b8!important;background:#0f172a!important;color:#f8fafc!important;border-radius:6px}',
      '.playlab-field-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(290px,320px);gap:16px;align-items:start}',
      '.playlab-field-column,.playlab-info-column{min-width:0}',
      '.playlab-field-shell{position:relative;overflow:hidden;border:1px solid #64748b;border-radius:18px;background:linear-gradient(180deg,#020617,#0f172a);padding:8px 10px 10px;box-shadow:0 18px 42px rgba(2,6,23,.34)}',
      '.playlab-field-shell:before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(56,189,248,.12),transparent 38%),linear-gradient(300deg,rgba(251,191,36,.10),transparent 34%);pointer-events:none}',
      '.playlab-field-topbar{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:9px}',
      '.playlab-field-title{margin:0;color:#f8fafc;font-size:14px;font-weight:900;line-height:1.2}',
      '.playlab-chip-row{display:flex;gap:6px;flex-wrap:wrap}',
      '.playlab-chip{border:1px solid #94a3b8;background:rgba(15,23,42,.86);color:#f8fafc;border-radius:999px;padding:5px 8px;font-size:12px;font-weight:800}',
      // Round 3: the model-true note, the labelled real-game aside (theme-following cards), and
      // Mystery defense (the film-room card is dark in every theme, like the verdict).
      '.playlab-teach-body{font-size:13px;line-height:1.5;color:var(--allo-stem-text,#e2e8f0)}',
      '.playlab-real-aside{margin-top:8px;padding:8px 10px;border-left:3px solid var(--allo-stem-border,#94a3b8);border-radius:6px;background:rgba(148,163,184,.10);font-size:13px;line-height:1.5;color:var(--allo-stem-text,#e2e8f0)}',
      '.playlab-real-aside>b{color:var(--allo-stem-text,#f8fafc)}',
      '.playlab-mystery-row .playlab-target-label{flex:0 0 auto}',
      '.playlab-mystery-hint{flex:1 1 220px;color:#cbd5e1;font-size:12px;line-height:1.4}',
      '.playlab-target-chip.is-guess{min-width:96px}',
      '.playlab-mystery-status{color:#fde68a;font-size:13px;font-weight:800}',
      '.playlab-mystery-tips{margin:8px 0 0 18px;padding:0;font-size:13px;line-height:1.5;color:var(--allo-stem-text,#e2e8f0)}',
      '.playlab-mystery-card{margin-top:10px;padding:10px 12px;border-radius:12px;border:1px solid #a78bfa;background:rgba(46,16,101,.55);color:#f8fafc;font-size:13px;line-height:1.45}',
      '.playlab-mystery-card.is-good{border-color:#4ade80}',
      '.playlab-mystery-card strong{display:block;font-size:15px;font-weight:900;margin-top:2px}',
      '.playlab-mystery-card p{margin:4px 0 0}',
      '.playlab-mystery-card .playlab-kicker{color:#c4b5fd}',
      '.playlab-mystery-svg{display:block;width:100%;max-width:420px;height:auto;margin:8px 0 0;border-radius:8px;border:1px solid #94a3b8}',
      '.theme-contrast .playlab-mystery-card,.theme-contrast .playlab-real-aside{background:#000!important;border:2px solid #fff!important;color:#fff!important}',
      // 9:5 on a wide screen, 4:3 on a phone (see the max-width:560px rule below): the
      // play-art view needs height, and the drawing buffer follows the box (canvasSize).
      '.playlab-field-canvas{position:relative;z-index:1;width:100%;max-width:760px;height:auto;aspect-ratio:9/5;border-radius:12px;border:1px solid #94a3b8;background:#0b1f14;cursor:pointer;touch-action:none;display:block;margin:0 auto;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}',
      '.playlab-run-rack{position:relative;z-index:1;margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.playlab-root{padding:16px}',
      // Every control in the tool is at least 44 px tall (touch target floor).
      '.playlab-root button,.playlab-root select,.playlab-root summary{min-height:44px}',
      '.playlab-root summary{display:flex;align-items:center}',
      '.playlab-sport-tabs{float:left;margin:0 14px 10px 0}',
      '.playlab-workspace-panel{clear:both}',
      '.playlab-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}',
      '.playlab-goal{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;padding:8px 12px;border:1px solid #10b981;border-radius:12px;background:#053b2e}',
      '.playlab-goal-main{flex:1 1 240px;min-width:0}',
      '.playlab-goal-text{color:#f8fafc;font-size:15px;font-weight:800;line-height:1.3}',
      '.playlab-goal-sub{color:#d1fae5;font-size:12px;line-height:1.4;margin-top:2px}',
      '.playlab-goal-side{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.playlab-streak{border:1px solid;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800}',
      '.playlab-goal-btn{min-height:44px;padding:8px 14px;border-radius:999px;cursor:pointer;border:1px solid #94a3b8;background:#0f172a;color:#f8fafc;font-size:13px;font-weight:800}',
      '.playlab-goal-btn.is-start{border-color:#6ee7b7;background:#064e3b;color:#ecfdf5}',
      '.playlab-target-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.playlab-target-label{color:#f8fafc;font-size:13px;font-weight:800}',
      '.playlab-target-chip{min-width:56px;min-height:48px;padding:4px 8px;border-radius:12px;cursor:pointer;border:2px solid #94a3b8;background:#0f172a;color:#f8fafc;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.15}',
      '.playlab-target-chip b{font-size:15px;font-weight:900}',
      '.playlab-target-chip span{font-size:12px;font-weight:700;color:#cbd5e1}',
      '.playlab-target-chip[aria-pressed="true"]{background:#fde047;border-color:#fef9c3;color:#111827}',
      '.playlab-target-chip[aria-pressed="true"] span{color:#111827}',
      '.playlab-target-chip:disabled{opacity:.65;cursor:wait}',
      '.playlab-need-target{margin-top:8px;padding:8px 12px;border-radius:10px;border:1px solid #fbbf24;background:#451a03;color:#fef3c7;font-size:13px;font-weight:800}',
      '.playlab-verdict{margin-top:10px;padding:10px 12px;border-radius:12px;border:1px solid #94a3b8;background:rgba(15,23,42,.7);color:#f8fafc;font-size:13px;line-height:1.45}',
      '.playlab-verdict strong{display:block;font-size:15px;font-weight:900}',
      '.playlab-verdict p{margin:4px 0 0}',
      '.playlab-verdict.is-good{border-color:#4ade80;background:rgba(20,83,45,.55)}',
      '.playlab-verdict.is-bad{border-color:#fb923c;background:rgba(124,45,18,.5)}',
      '.playlab-note{margin:8px 0 0;color:#cbd5e1;font-size:12px;line-height:1.45}',
      '.playlab-film{margin-top:10px;overflow-x:auto}',
      '.playlab-film-table{width:100%;border-collapse:collapse;font-size:13px;color:#f8fafc}',
      '.playlab-film-table caption{text-align:left;color:#cbd5e1;font-size:12px;font-weight:700;padding-bottom:4px}',
      '.playlab-film-table th,.playlab-film-table td{text-align:left;padding:5px 6px;border-bottom:1px solid rgba(148,163,184,.3);white-space:nowrap}',
      '.playlab-film-table thead th{color:#cbd5e1;font-size:12px;font-weight:800}',
      '.playlab-film-table tr.is-open td:last-child{color:#86efac;font-weight:800}',
      '.playlab-film-table tr.is-covered td:last-child{color:#fdba74;font-weight:800}',
      '.playlab-film-table tr.is-mine{background:rgba(253,224,71,.12)}',
      '.playlab-more{margin-top:12px;border:1px solid #64748b;border-radius:14px;background:#0f172a;padding:4px 12px}',
      '.playlab-more>summary{cursor:pointer;min-height:44px;display:flex;align-items:center;color:#f8fafc;font-size:13px;font-weight:800}',
      '.playlab-more[open]{padding-bottom:12px}',
      '.playlab-teach-more>summary{cursor:pointer;min-height:44px;display:flex;align-items:center;color:var(--allo-stem-text-soft,#cbd5e1);font-size:12px;font-weight:700}',
      // These cards follow the theme (white in the light look), so their small print does too.
      '.playlab-teach-note{margin:8px 0 0;color:var(--allo-stem-text-soft,#cbd5e1);font-size:12px;line-height:1.45}',
      '.playlab-words dl{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:4px 16px}',
      '.playlab-word{display:flex;gap:8px;font-size:12px;line-height:1.4;color:#e2e8f0}',
      '.playlab-word dt{font-weight:900;color:#fde68a;min-width:74px}',
      '.playlab-word dd{margin:0}',
      '.playlab-setup-panel .playlab-pick-row{display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap;font-size:12px}',
      '.theme-contrast .playlab-goal,.theme-contrast .playlab-verdict,.theme-contrast .playlab-more,.theme-contrast .playlab-need-target{background:#000!important;border:2px solid #fff!important;color:#fff!important}',
      '.theme-contrast .playlab-target-chip[aria-pressed="true"]{background:#000!important;border-color:#ffff00!important;color:#ffff00!important}',
      '.theme-contrast .playlab-target-chip[aria-pressed="true"] span{color:#ffff00!important}',
      '.playlab-run-button{padding:11px 18px;min-height:44px;border-radius:999px;cursor:pointer;border:1px solid #86efac;background:linear-gradient(135deg,#86efac,#22c55e);color:#052e16;font-size:14px;font-weight:900;box-shadow:0 10px 22px rgba(16,185,129,.22)}',
      '.playlab-run-button:disabled{cursor:wait;background:#334155;color:#e2e8f0;box-shadow:none;border-color:#94a3b8}',
      '.theme-contrast [data-stem-tool-shell="playlab"] .playlab-run-button:not(:disabled){background:#000!important}',
      '.playlab-last-result{font-size:12px;color:#cbd5e1;font-style:italic}',
      '.playlab-target-chip.is-soccer{min-width:0;max-width:220px;text-align:left}',
      '@media (max-width:560px){.playlab-field-canvas.is-soccer{aspect-ratio:1/1}}',
      '.playlab-toggle-rack{margin-top:9px;display:flex;gap:8px;font-size:12px;color:#f8fafc;flex-wrap:wrap;align-items:center;padding:9px 10px;border:1px solid #64748b;border-radius:12px;background:rgba(15,23,42,.78)}',
      '.playlab-toggle-rack label{cursor:pointer;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 6px}',
      '.playlab-toggle-rack input[type=checkbox]{width:18px;height:18px;min-height:0;accent-color:#22c55e}',
      '@media (max-width:920px){.playlab-field-layout{grid-template-columns:1fr}.playlab-metric-grid,.playlab-setup-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.playlab-info-column{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.playlab-info-column>section,.playlab-info-column>div{margin-bottom:0!important}}',
      '@media (max-width:560px){.playlab-root{padding:8px}.playlab-gameplan-card,.playlab-setup-panel{border-radius:14px;padding:11px}.playlab-field-shell{border-radius:12px;padding:5px}.playlab-field-canvas{aspect-ratio:4/3;border-radius:8px}.playlab-metric-grid,.playlab-info-column,.playlab-setup-grid{grid-template-columns:1fr}.playlab-gameplan-title{font-size:16px}.playlab-run-button{flex:1 1 140px}.playlab-hero-deck{padding:8px 10px;margin-bottom:8px}.playlab-hero-badge,.playlab-hero-tagline,.playlab-hero-pills{display:none!important}.playlab-hero-deck h2{font-size:17px!important}.playlab-sport-tabs{float:none;margin-right:0}.playlab-target-row{flex:1 1 100%}.playlab-target-label{flex:1 1 100%}.playlab-target-chip{flex:1 1 0;min-width:0;padding:4px 2px}.playlab-goal{padding:6px 10px}.playlab-goal-text{font-size:14px}}'
    ].join('');
    document.head.appendChild(st);
  })();

  // PlayLab workbench visual identity, starter presets & contrast parity
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-playlab-workbench-polish-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-playlab-workbench-polish-css';
    st.textContent = [
      '.playlab-hero-deck{position:relative;overflow:hidden;border-radius:18px;border:1px solid rgba(56,189,248,.38);background:linear-gradient(135deg,#091529 0%,#0f2942 54%,#0a362c 100%);box-shadow:0 16px 34px rgba(2,6,23,.28);color:#f8fafc;padding:9px 14px;margin-bottom:8px}',
      '.playlab-hero-deck.is-soccer{border-color:rgba(52,211,153,.42);background:linear-gradient(135deg,#071d18 0%,#0b3527 54%,#0f2942 100%)}',
      '.playlab-hero-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between}',
      '.playlab-hero-main{display:flex;align-items:center;gap:12px;min-width:0;flex:1 1 280px}',
      '.playlab-hero-badge{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;background:rgba(56,189,248,.18);border:1px solid rgba(125,211,252,.45);color:#e0f2fe}',
      '.playlab-hero-deck.is-soccer .playlab-hero-badge{background:rgba(16,185,129,.20);border-color:rgba(110,231,183,.5);color:#d1fae5}',
      '.playlab-hero-pills{display:flex;flex-wrap:wrap;align-items:center;gap:6px}',
      '.playlab-telemetry-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(15,23,42,.68);border:1px solid rgba(148,163,184,.42);color:#e2e8f0}',
      '.playlab-telemetry-pill strong{color:#fde68a;font-weight:900}',
      '.playlab-starter-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 10px;margin-bottom:10px;border-radius:12px;background:rgba(15,23,42,.82);border:1px solid rgba(56,189,248,.34)}',
      '.playlab-starter-label{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;color:#bae6fd;margin-right:2px}',
      '.playlab-starter-chip{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:44px;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:800;background:#0f172a;border:1px solid #64748b;color:#f8fafc;cursor:pointer;transition:background-color .15s,border-color .15s,color .15s}',
      '.playlab-starter-chip:hover:not(:disabled){background:#1e293b;border-color:#7dd3fc;color:#ffffff}',
      '.playlab-starter-chip[aria-pressed="true"]{background:#0369a1;border-color:#bae6fd;color:#ffffff}',
      '.playlab-starter-chip:disabled{opacity:.6;cursor:not-allowed}',
      '.playlab-stage-legend{position:relative;z-index:1;margin-top:8px;padding:7px 10px;border-radius:10px;background:rgba(2,6,23,.62);border:1px solid rgba(148,163,184,.34);display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;font-size:12px;color:#e2e8f0}',
      '.playlab-legend-item{display:inline-flex;align-items:center;gap:6px;font-weight:700;min-width:0}',
      '.playlab-analysis-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;font-size:12px}',
      '.theme-contrast .playlab-hero-deck,.theme-contrast .playlab-gameplan-card,.theme-contrast .playlab-setup-panel,.theme-contrast .playlab-field-shell,.theme-contrast .playlab-toggle-rack,.theme-contrast .playlab-starter-bar,.theme-contrast .playlab-stage-legend{background:#000000!important;border:2px solid #ffffff!important;box-shadow:none!important;color:#ffffff!important}',
      '.theme-contrast .playlab-hero-deck{border-color:#00ff00!important}',
      '.theme-contrast .playlab-hero-badge,.theme-contrast .playlab-telemetry-pill,.theme-contrast .playlab-chip,.theme-contrast .playlab-status-pill,.theme-contrast .playlab-metric{background:#000000!important;border:1px solid #ffff00!important;color:#ffff00!important}',
      '.theme-contrast .playlab-telemetry-pill strong,.theme-contrast .playlab-metric b,.theme-contrast .playlab-starter-label{color:#00ff00!important}',
      '.theme-contrast .playlab-starter-chip{background:#000000!important;border:2px solid #00ff00!important;color:#ffffff!important}',
      '.theme-contrast .playlab-starter-chip[aria-pressed="true"]{background:#000000!important;border:2px solid #ffff00!important;color:#ffff00!important}'
    ].join('');
    document.head.appendChild(st);
  })();

  (function() {
    if (typeof document === 'undefined' || !document.body || document.getElementById('allo-live-playlab')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-playlab';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();
  function plAnnounce(msg) {
    if (typeof document === 'undefined') return;
    var lr = document.getElementById('allo-live-playlab');
    if (lr) lr.textContent = msg;
  }

  // ── Zero-GC Canvas Primitives & Pre-Allocated Motion Pools ──
  function _plIsHighContrast() {
    if (typeof document === 'undefined') return false;
    var root = document.documentElement;
    if (root && root.classList && root.classList.contains('theme-contrast')) return true;
    return !!(document.body && document.body.classList && document.body.classList.contains('theme-contrast'));
  }
  function _plSafeEllipse(g, x, y, rx, ry, rot, sAng, eAng) {
    if (!g) return;
    if (typeof g.ellipse === 'function') {
      g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, sAng == null ? 0 : sAng, eAng == null ? Math.PI * 2 : eAng);
      return;
    }
    g.arc(x, y, Math.max(0.1, (rx + ry) * 0.5), sAng == null ? 0 : sAng, eAng == null ? Math.PI * 2 : eAng);
  }
  var _PL_FLOOD_NORM_X = new Float32Array([0, 1, 0, 1]);
  var _PL_FLOOD_NORM_Y = new Float32Array([0, 0, 1, 1]);
  var _PL_YARD_LABELS = new Uint8Array([10, 20, 30, 40, 50, 40, 30, 20, 10]);
  var _PL_XG_LEGEND = ['rgba(30,80,200,0.8)', 'rgba(60,180,60,0.8)', 'rgba(230,200,30,0.8)', 'rgba(230,50,30,0.8)'];
  var _PL_DUST_COUNT = 6;
  var _PL_DUST_ANG = new Float32Array(_PL_DUST_COUNT);
  var _PL_DUST_RAD = new Float32Array(_PL_DUST_COUNT);
  var _PL_BURST_COUNT = 10;
  var _PL_BURST_ANG = new Float32Array(_PL_BURST_COUNT);
  var _PL_BURST_SPD = new Float32Array(_PL_BURST_COUNT);
  (function _initPlPools() {
    for (var di = 0; di < _PL_DUST_COUNT; di++) {
      _PL_DUST_ANG[di] = (di / _PL_DUST_COUNT) * Math.PI * 2 + 0.35;
      _PL_DUST_RAD[di] = 0.65 + (di % 3) * 0.28;
    }
    for (var bi = 0; bi < _PL_BURST_COUNT; bi++) {
      _PL_BURST_ANG[bi] = (bi / _PL_BURST_COUNT) * Math.PI * 2 + 0.18;
      _PL_BURST_SPD[bi] = 0.72 + (bi % 4) * 0.18;
    }
  })();

  // ═══════════════════════════════════════════
  // FIELD MODEL — football (yards) + soccer (meters)
  // ═══════════════════════════════════════════
  // FOOTBALL world coordinates (yards):
  //   x: 0 (offense end zone back) → 120 (defense end zone back)
  //      Field is 100 yards between goal lines + 10-yard end zones each side.
  //   y: 0 (right sideline) → 53.33 (left sideline)
  // Line of scrimmage (LOS) defaults to x = 35 (offense at own 25-yard line).
  // Hash marks (NFL): inset 23.58 yards from sideline → y = 23.58 and y = 29.75.
  var FIELD_LENGTH = 120;     // yd, includes both end zones
  var FIELD_WIDTH = 53.33;    // yd
  var END_ZONE_DEPTH = 10;    // yd
  var LOS_DEFAULT = 35;       // x at line of scrimmage
  var HASH_LEFT = 23.58;      // y of left hash
  var HASH_RIGHT = 29.75;     // y of right hash

  // SOCCER world coordinates (meters), per FIFA Laws of the Game:
  //   x: 0 (defending goal line) → 105 (attacking goal line). Attack
  //      moves to the right.
  //   y: 0 (top sideline) → 68 (bottom sideline)
  // Halfway line at x = 52.5. Penalty mark at x = 11 (from each goal line).
  var PITCH_LENGTH = 105;            // m
  var PITCH_WIDTH = 68;              // m
  var SOCCER_GOAL_WIDTH = 7.32;      // m (used to align rendering)
  var PENALTY_AREA_DEPTH = 16.5;     // m, "18-yard box"
  var PENALTY_AREA_WIDTH = 40.32;    // m
  var GOAL_AREA_DEPTH = 5.5;         // m, "6-yard box"
  var GOAL_AREA_WIDTH = 18.32;       // m
  var CENTER_CIRCLE_R = 9.15;        // m (= 10 yd legacy)
  var PENALTY_SPOT_X = 11;           // m from goal line
  var PENALTY_ARC_R = 9.15;          // m

  // Offense roles. We use abbreviations in the data and full labels for SR.
  var OFFENSE_ROLES = {
    QB: 'Quarterback',
    RB: 'Running Back',
    LT: 'Left Tackle', LG: 'Left Guard', C: 'Center', RG: 'Right Guard', RT: 'Right Tackle',
    TE: 'Tight End',
    WR1: 'Wide Receiver (X)',
    WR2: 'Wide Receiver (Z)',
    SLOT: 'Slot Receiver'
  };

  // Default I-Form / 11 personnel formation. Coordinates are at LOS_DEFAULT
  // baseline; specific plays may override individual positions.
  function defaultFormation(losX) {
    losX = losX !== undefined ? losX : LOS_DEFAULT;
    return [
      // Offensive line — 5 across the LOS, splits ~ 1 yd
      { id: 'LT', role: 'OL', x: losX, y: FIELD_WIDTH / 2 + 2.5, route: null },
      { id: 'LG', role: 'OL', x: losX, y: FIELD_WIDTH / 2 + 1.0, route: null },
      { id: 'C',  role: 'OL', x: losX, y: FIELD_WIDTH / 2,        route: null },
      { id: 'RG', role: 'OL', x: losX, y: FIELD_WIDTH / 2 - 1.0, route: null },
      { id: 'RT', role: 'OL', x: losX, y: FIELD_WIDTH / 2 - 2.5, route: null },
      // QB: 5 yards behind the C (shotgun)
      { id: 'QB', role: 'QB', x: losX - 5, y: FIELD_WIDTH / 2, route: null },
      // RB: alongside the QB
      { id: 'RB', role: 'RB', x: losX - 5, y: FIELD_WIDTH / 2 - 3.5, route: null },
      // TE: outside the RT
      { id: 'TE', role: 'TE', x: losX, y: FIELD_WIDTH / 2 - 4, route: null },
      // Wideouts split wide
      { id: 'WR1',  role: 'WR', x: losX, y: 4,                  route: null },
      { id: 'WR2',  role: 'WR', x: losX, y: FIELD_WIDTH - 4,    route: null },
      { id: 'SLOT', role: 'WR', x: losX, y: FIELD_WIDTH - 9,    route: null }
    ];
  }

  // ═══════════════════════════════════════════
  // PLAY LIBRARY — famous concepts every football fan recognizes
  // ═══════════════════════════════════════════
  // Each play stores DELTA positions (relative to LOS) for non-OL players + a
  // route per eligible receiver. Routes are arrays of waypoints in (Δx, Δy)
  // from the player's snap position; the geometry helpers below convert them
  // to absolute field coords.
  //
  // The route tree (NFL standard):
  //   0 = stop / hitch         5 = curl
  //   1 = quick out            6 = in (dig)
  //   2 = slant                7 = corner
  //   3 = comeback             8 = post
  //   4 = curl                 9 = fly / go (deep)
  // ── Engagement layer: Hot-Hand + Hype + Badges (sports re-skin) ──
  // Sports broadcasting language scaffolding for athletic students who
  // bounce off academic framing. Mirrors the ThrowLab engagement layer
  // so both tools have parallel feel. Tied to existing drill-stat
  // tracking; no new state machinery needed beyond a hot-streak counter
  // and a badgesEarned set.
  var HYPE_PHRASES = [
    'Money time',
    'Show me what you got',
    'Lights, camera, clutch',
    "Let's see it",
    'In the zone',
    'Run it',
    'Time to cook',
    'Make the read',
    'Stay locked in',
    'Trust your reps',
    'One more rep',
    'Show out',
    'Let it rip',
    'Take what they give',
    'Find the open man'
  ];
  function pickHypePhrase() {
    return HYPE_PHRASES[Math.floor(Math.random() * HYPE_PHRASES.length)];
  }
  function getHotHand(streak) {
    if (!streak || streak < 2) return null;
    // bg/text are theme-INDEPENDENT (solid pill) so the streak label stays
    // AA-readable on both light and dark host surfaces. color = accent used
    // for the border + the on-field ember tint.
    if (streak === 2) return { emoji: '🟧', label: 'Warming up', color: '#fb923c', bg: '#7c2d12', text: '#fed7aa' };
    if (streak <= 4) return { emoji: '🔥', label: "He's heating up!", color: '#ef4444', bg: '#7f1d1d', text: '#fecaca' };
    return { emoji: '🔥🔥', label: 'ON FIRE', color: '#dc2626', bg: '#7f1d1d', text: '#fee2e2' };
  }

  // ── Engagement layer: Personal Bests ──
  // Per-sport "career highs" tracked across sessions. Mirrors the
  // ThrowLab personal-bests pattern — kid sees their own all-time
  // best stat and wants to top it. Surfaced in the Stats Card panel
  // and announced via toast + XP when a record falls.
  function checkPlayLabPersonalBests(d, outcome, stats) {
    var pbs = Object.assign({}, d.personalBests || {});
    var sportKey = d.sport || 'football';
    pbs[sportKey] = pbs[sportKey] || {};
    var sport = pbs[sportKey];
    var newRecords = [];
    function tryPB(metricKey, candidate, label, formatVal) {
      if (typeof candidate !== 'number' || isNaN(candidate)) return;
      var prev = sport[metricKey];
      if (prev == null || candidate > prev) {
        sport[metricKey] = candidate;
        // Quiet for the very first value and for plain counters; a toast + XP only when
        // a measured best (gap, xG) beats an earlier one.
        if (prev != null && (metricKey === 'biggestOpenness' || metricKey === 'highestXG')) {
          newRecords.push({ label: label, value: formatVal ? formatVal(candidate) : candidate });
        }
      }
    }
    if (sportKey === 'football' && outcome && outcome.location === 'caught') {
      if (typeof outcome.opennessYd === 'number') {
        tryPB('biggestOpenness', +outcome.opennessYd.toFixed(1), 'Biggest gap at the catch', function(v) { return v.toFixed(1) + ' yd'; });
      }
      tryPB('mostCoveragesBeaten', stats.coveragesBeaten || 0, 'Most coverages beaten');
      tryPB('mostPlaysCompleted', Object.keys(stats.completionsByPlay || {}).length, 'Most plays completed');
      tryPB('longestStreak', stats.hotStreak || 0, 'Longest hot streak');
    }
    if (sportKey === 'soccer' && outcome && typeof outcome.xG === 'number') {
      tryPB('highestXG', +outcome.xG.toFixed(2), 'Highest single-sequence xG', function(v) { return v.toFixed(2); });
      tryPB('mostConcepts', Object.keys(stats.conceptsRun || {}).length, 'Most concepts run');
      tryPB('mostSetPieceTypes', Object.keys(stats.setPieceTypesRun || {}).length, 'Most set-piece types tried');
      tryPB('longestStreak', stats.hotStreak || 0, 'Longest hot streak');
    }
    return { personalBests: pbs, newRecords: newRecords };
  }

  // ── Engagement layer: Daily Challenge ──
  // Deterministic-by-date pick from PLAYLAB_SCENARIOS so every student
  // in the same class sees the same challenge today. Picks within the
  // active sport so a football class doesn\'t get a soccer scenario.
  function todayKey() {
    var dt = new Date();
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  }
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }
  function getPlayLabDailyChallenge(sport) {
    var pool = PLAYLAB_SCENARIOS.filter(function(sc) { return sc.sport === (sport || 'football'); });
    if (!pool.length) return null;
    var idx = hashStr(todayKey() + ':' + sport) % pool.length;
    return pool[idx];
  }

  // ── Engagement layer: Stats Card builder ──
  // Returns rows of {label, value} per sport — a fantasy-sports
  // stat-line a kid recognizes from their phone screen. Pure data
  // formatting; no new state. Pulls from drillStats already tracked.
  function getPlayLabStatsRows(d) {
    var s = d.drillStats || {};
    var rows = [];
    rows.push({ label: 'Hot streak', value: s.hotStreak || 0 });
    if (d.sport === 'soccer' || (d.sport == null && false)) {
      rows.push({ label: 'Real chance made (xG 0.10+)', value: s.highXgShot ? '✓' : '—' });
      rows.push({ label: 'Concepts run', value: Object.keys(s.conceptsRun || {}).length + ' / ' + SOCCER_CONCEPTS.length });
      rows.push({ label: 'Defensive shapes faced', value: Object.keys(s.shapesPlayed || {}).length + ' / ' + SOCCER_SHAPES.length });
      rows.push({ label: 'Shapes beaten (fair chance)', value: Object.keys(s.shapesChance || {}).length + ' / ' + SOCCER_SHAPES.length });
      rows.push({ label: 'Best pass picked', value: s.bestPasses || 0 });
      rows.push({ label: 'Offside Trap beaten', value: s.trapBeaten ? '✓' : '—' });
      rows.push({ label: 'Set-piece run', value: s.setPieceRun ? '✓' : '—' });
      rows.push({ label: 'Set-piece types', value: Object.keys(s.setPieceTypesRun || {}).length + ' / 5' });
      rows.push({ label: 'Fair chance against the Low Block', value: s.lowBlockChance ? '✓' : '—' });
    } else {
      rows.push({ label: 'Coverages beaten', value: (s.coveragesBeaten || 0) + ' / ' + COVERAGES.length });
      rows.push({ label: 'Plays completed', value: Object.keys(s.completionsByPlay || {}).length + ' / ' + PLAYS.length });
      rows.push({ label: 'Smash vs Cover 2', value: s.smashVsCover2 ? '✓' : '—' });
      rows.push({ label: 'Hot route vs Cover 0', value: s.c0WithHot ? '✓' : '—' });
      rows.push({ label: 'Trips vs Cover 6', value: s.c6WithTrips ? '✓' : '—' });
      rows.push({ label: 'Mesh vs Robber', value: s.robberWithMesh ? '✓' : '—' });
      rows.push({ label: 'Custom play completed', value: s.completedCustomPlay ? '✓' : '—' });
    }
    rows.push({ label: 'Badges earned', value: Object.keys(d.badgesEarned || {}).length + ' / ' + PLAYLAB_BADGES.length });
    rows.push({ label: 'Saved plays', value: (Array.isArray(d.savedPlays) ? d.savedPlays : []).length });
    // Career Highs — sport-specific PBs
    var sportKey = d.sport || 'football';
    var pbs = (d.personalBests && d.personalBests[sportKey]) || {};
    var pbKeys = Object.keys(pbs);
    if (pbKeys.length) {
      rows.push({ label: '── Career Highs ──', value: '' });
      var pbLabels = {
        biggestOpenness: 'Biggest gap at the catch (yd)',
        mostCoveragesBeaten: 'Most coverages beaten',
        mostPlaysCompleted: 'Most plays completed',
        highestXG: 'Highest single-sequence xG',
        mostConcepts: 'Most concepts run',
        mostSetPieceTypes: 'Most set-piece types',
        longestStreak: 'Longest hot streak'
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
  // matches the persona's tone. Persisted in toolData.coachPersona;
  // defaults to 'analyst'.
  var COACH_PERSONAS = [
    { id: 'analyst', label: 'Analyst', icon: '🎙️',
      prepend: 'Use a calm, analytical voice — present the tactics like a broadcast color commentator. Educational but warm.' },
    { id: 'oldschool', label: 'Old School', icon: '🧢',
      prepend: 'Use a terse, demanding old-school coach voice. No frills. Short sentences. Tell the student what they did well, then exactly what to fix. "Good call, kid. Now move your slot inside" energy.' },
    { id: 'hype', label: 'Hype Man', icon: '🔥',
      prepend: 'Use an energetic, encouraging hype-man voice. Pump the student up. Use exclamation points sparingly but enthusiastically. "THERE YOU GO" / "THAT\'S WHAT I\'M TALKING ABOUT" energy. Stay specific and tactics-grounded.' },
    { id: 'zen', label: 'Zen', icon: '🧘',
      prepend: 'Use a calm, reflective Phil Jackson zen-coach voice. Speak in measured rhythm. Connect the play to a deeper principle. "Notice the geometry. Notice where the defense conceded space." Present-tense, observational.' }
  ];

  // Named badges unlocked from drill-stat criteria. Each first-earn
  // fires toast + plAnnounce + small XP bonus. Persisted in
  // toolData.badgesEarned so badges stay lit across reloads.
  var PLAYLAB_BADGES = [
    { id: 'smash-hit', emoji: '🎯', label: 'Smash Hit',
      hint: 'Beat Cover 2 with the Smash concept',
      check: function(d, outcome, stats) { return d.sport === 'football' && stats && stats.smashVsCover2; } },
    { id: 'hot-route', emoji: '⚡', label: 'Hot Route',
      hint: 'Beat Cover 0 with a hot concept (Slant / Bubble / Stick)',
      check: function(d, outcome, stats) { return d.sport === 'football' && stats && stats.c0WithHot; } },
    { id: 'iso-pep', emoji: '🔁', label: 'Iso Pep',
      hint: 'Run Tiki-Taka against a Low Block successfully',
      check: function(d, outcome, stats) {
        return d.sport === 'soccer' && d.conceptId === 'tikitaka' && d.shapeId === 'lowblock'
          && outcome && typeof outcome.xG === 'number' && outcome.xG >= PL_SOCCER.FAIR_XG;
      } },
    { id: 'top-bins', emoji: '⚽', label: 'Top Bins',
      hint: 'Run a Direct Free Kick set-piece',
      check: function(d, outcome, stats) {
        return d.sport === 'soccer' && d.conceptId === 'freekick-direct' && stats && stats.setPieceRun;
      } },
    { id: 'delap', emoji: '🪂', label: 'Delap',
      hint: 'Run a Long Throw-In set-piece',
      check: function(d, outcome, stats) {
        return d.sport === 'soccer' && d.conceptId === 'throwin-long' && stats && stats.setPieceRun;
      } },
    { id: 'triple-threat', emoji: '🏈', label: 'Triple-Threat',
      hint: 'Complete with 3 different plays',
      check: function(d, outcome, stats) {
        return d.sport === 'football' && stats && Object.keys(stats.completionsByPlay || {}).length >= 3;
      } },
    { id: 'coordinator', emoji: '🏆', label: 'Coordinator',
      hint: 'Beat 5 different coverages',
      check: function(d, outcome, stats) {
        return d.sport === 'football' && stats && (stats.coveragesBeaten || 0) >= 5;
      } },
    { id: 'triangle', emoji: '⫷', label: 'Triangle',
      hint: 'Complete the Trips Bunch concept',
      check: function(d, outcome, stats) {
        return d.sport === 'football' && d.playId === 'trips' && stats && stats.completionsByPlay && stats.completionsByPlay.trips;
      } },
    // ── Stretch / mastery badges ──
    { id: 'streak-hunter-pl', emoji: '🎯', label: 'Streak Hunter',
      hint: '10-play hot streak (any sport)',
      check: function(d, outcome, stats) { return (stats.hotStreak || 0) >= 10; } },
    { id: 'legendary-pl', emoji: '👑', label: 'Legendary',
      hint: '25-play hot streak — Hall of Fame territory',
      check: function(d, outcome, stats) { return (stats.hotStreak || 0) >= 25; } },
    { id: 'all-pro', emoji: '🏆', label: 'All-Pro',
      hint: 'Beat all 8 football coverages',
      check: function(d, outcome, stats) {
        return d.sport === 'football' && stats && (stats.coveragesBeaten || 0) >= 8;
      } },
    { id: 'set-piece-master', emoji: '🪂', label: 'Set-Piece Master',
      hint: 'Run all 5 soccer set-piece TYPES (corner / freekick / throwin / penalty / goalkick)',
      check: function(d, outcome, stats) {
        return d.sport === 'soccer' && stats && Object.keys(stats.setPieceTypesRun || {}).length >= 5;
      } },
    { id: 'tactician', emoji: '📋', label: 'Tactician',
      hint: 'Save 5 custom plays',
      check: function(d) { return (Array.isArray(d.savedPlays) ? d.savedPlays : []).length >= 5; } },
    { id: 'globetrotter-pl', emoji: '🌍', label: 'Globetrotter',
      hint: 'Complete a pass in football AND make a real chance in soccer',
      check: function(d, outcome, stats) {
        // Tracked via the universal hotStreak / saved plays — completion in both sports
        var football = stats && Object.keys(stats.completionsByPlay || {}).length >= 1;
        // For soccer, any high-xG sequence counts
        var soccer = stats && stats.highXgShot;
        // Stats are sport-specific so this needs a session-level OR. We reach
        // for savedPlays as a proxy: if a play has been saved in BOTH sports.
        var savedSports = {};
        (Array.isArray(d.savedPlays) ? d.savedPlays : []).forEach(function(sp) { savedSports[sp.sport] = true; });
        return !!(football && soccer);
      } }
  ];

  var PLAYS = [
    {
      id: 'slant',
      label: 'Slant (West Coast)',
      icon: '↗️',
      teach: "The slot receiver (SL) runs 3 yards, then cuts toward the middle. The ball can leave at {snap} s, the soonest any throw leaves in this lab, so it is gone long before the rush arrives. The two wide receivers run 12 yards straight ahead. The tight end and the back run short routes.",
      real: "The slant is a basic route of the \"West Coast\" passing style, which is built on short, quick, accurate throws.",
      beats: ['cover1', 'cover0'], struggles: ['cover4'],
      routes: {
        SLOT: [{ dx: 3, dy: 0 }, { dx: 9, dy: -6 }], // 3 yd up, then a hard cut inside
        WR1:  [{ dx: 12, dy: 0 }],          // hitch / clear-out
        WR2:  [{ dx: 12, dy: 0 }],
        TE:   [{ dx: 4, dy: 0 }],           // chip-and-release flat
        RB:   [{ dx: 0, dy: -3 }, { dx: 6, dy: -1 }] // check-down
      }
    },
    {
      id: 'fourverts',
      label: '4 Verticals (Air Coryell)',
      icon: '🎯',
      teach: "Four receivers run deep, straight up the field: 22 yards (the tight end 18). The slot bends toward the middle near the end. Deep routes take almost 3 seconds, so the ball is in the air a long time and deep defenders have time to get to it.",
      real: "\"Air Coryell\" is the deep-passing style named after the coach who made it famous. Sending four receivers deep tries to give the deep defenders more routes than they can cover.",
      beats: ['cover1', 'cover3'], struggles: ['cover4'],
      routes: {
        WR1:  [{ dx: 22, dy: 0 }],
        WR2:  [{ dx: 22, dy: 0 }],
        SLOT: [{ dx: 12, dy: 0 }, { dx: 22, dy: -4 }],     // bend to post
        TE:   [{ dx: 18, dy: 0 }],
        RB:   [{ dx: 8, dy: 2 }]                            // swing
      }
    },
    {
      id: 'mesh',
      label: 'Mesh (Air Raid)',
      icon: '✕',
      teach: "The slot (SL) and the tight end (TE) cross the field in opposite directions, close to the line. The two wide receivers run 14 yards, then cut in. A man defender copies his receiver a moment late, so a long run across the field can leave him behind. A zone defender stays in his area and waits for the throw.",
      real: "Mesh is a favorite play of the \"Air Raid\" passing style that coach Hal Mumme made popular in the 1990s. In real games the two crossers pass so close that a defender following one can run into the other. This lab does not model that.",
      beats: ['cover1', 'cover0', 'robber'], struggles: ['tampa2'],
      routes: {
        SLOT: [{ dx: 5, dy: -18 }],         // shallow cross from the slot, toward the far side
        TE:   [{ dx: 6, dy: 18 }],          // crossing the other way, one yard deeper
        WR1:  [{ dx: 14, dy: 0 }, { dx: 14, dy: 5 }],   // dig
        WR2:  [{ dx: 14, dy: 0 }, { dx: 14, dy: -5 }],
        RB:   [{ dx: 0, dy: 6 }, { dx: 6, dy: 6 }]      // arrow
      }
    },
    {
      id: 'rpo',
      label: 'RPO Glance',
      icon: '🔁',
      teach: "The slot (SL) runs a short angle toward the middle, the wide receivers run 8 yards, and the back (RB) runs 5 yards up the middle as a short target. The tight end stays in to block. In this lab the quarterback always throws.",
      real: "RPO means run-pass option. In a real RPO the quarterback watches one defender after the snap and then hands off or throws. This lab does not model that choice.",
      beats: ['cover1', 'cover3'], struggles: ['cover4'],
      routes: {
        SLOT: [{ dx: 6, dy: -3 }],          // glance route
        WR1:  [{ dx: 8, dy: 1 }],           // bubble
        WR2:  [{ dx: 8, dy: -1 }],
        TE:   null,                          // blocking
        RB:   [{ dx: 5, dy: 0 }]            // run mesh
      }
    },
    {
      id: 'smash',
      label: 'Smash (Hi-Lo Corner)',
      icon: '🌽',
      teach: "On the left side, the wide receiver (W2) stops after 5 yards and the slot (SL) runs 15 yards toward the corner: one short, one deep, on the same side. W1 also stops at 5 yards on the right.",
      real: "Coaches call this a \"high-low\" read: the quarterback watches one defender and throws to the receiver he does not cover. Smash is a common call against Cover 2.",
      beats: ['cover2', 'tampa2'], struggles: ['cover4'],
      routes: {
        WR1:  [{ dx: 5, dy: 0 }],           // hitch underneath
        SLOT: [{ dx: 7, dy: 0 }, { dx: 15, dy: 6 }], // corner route over the top, to the same sideline
        WR2:  [{ dx: 5, dy: 0 }],           // backside hitch (mirror)
        TE:   [{ dx: 4, dy: 1 }],
        RB:   [{ dx: 0, dy: 4 }, { dx: 6, dy: 4 }]
      }
    },
    {
      id: 'stick',
      label: 'Stick (3rd-and-3)',
      icon: '📏',
      teach: "The tight end (TE) runs 5 yards and turns around. It is one of the shortest throws in the lab: the ball can leave at {snap} s and arrives about half a second later. The wide receivers run 18 yards straight ahead, and the back runs out to the side.",
      real: "In real games the stick is a common call on third down when only a few yards are needed.",
      beats: ['cover3', 'cover4'], struggles: ['cover0'],
      routes: {
        TE:   [{ dx: 5, dy: -1 }],          // 5-yd stick
        RB:   [{ dx: 0, dy: -3 }, { dx: 6, dy: -3 }], // arrow / flat
        WR1:  [{ dx: 18, dy: 0 }],          // clear-out vertical
        WR2:  [{ dx: 18, dy: 0 }],
        SLOT: [{ dx: 6, dy: 5 }]            // option underneath
      }
    },
    {
      id: 'wildcat',
      label: 'Wildcat (Direct Snap)',
      icon: '🐯',
      teach: "A run. The ball is snapped straight to the back (RB), who runs ahead and then angles toward the right sideline. Everyone else blocks. A blocked defender is out of the play; any free defender who can reach the runner's path first makes the tackle.",
      real: "The 2008 Miami Dolphins made the Wildcat famous, snapping the ball straight to running back Ronnie Brown.",
      beats: ['cover0', 'cover1'], struggles: ['cover4'],
      run: true,
      routes: {
        RB:   [{ dx: 4, dy: 0 }, { dx: 9, dy: -4 }, { dx: 19, dy: -6 }],  // power off-tackle
        WR1:  [{ dx: 4, dy: 0 }],           // crack block
        WR2:  [{ dx: 4, dy: 0 }],
        SLOT: [{ dx: 3, dy: 4 }],           // motion across
        TE:   null                           // pull and lead
      }
    },
    {
      id: 'hailmary',
      label: 'Hail Mary',
      icon: '🙏',
      teach: "Everyone runs 45 yards straight down the field (the tight end 40). The routes take about 5.6 seconds, so the ball is thrown at about 3 seconds and is in the air for more than 2.5 seconds. That is a long time for defenders to get to the ball, and the pocket has to hold until the throw.",
      real: "A real Hail Mary is a last-second throw into the end zone, hoping a teammate comes down with the ball. It rarely works, but when time is running out there is often nothing better to try.",
      beats: ['cover0'], struggles: ['cover4', 'cover6', 'cover3'],
      routes: {
        WR1:  [{ dx: 45, dy: 5 }],          // streak to corner of end zone
        WR2:  [{ dx: 45, dy: -5 }],
        SLOT: [{ dx: 45, dy: 0 }],          // streak to middle of end zone
        TE:   [{ dx: 40, dy: 2 }],
        RB:   [{ dx: 8, dy: 4 }]            // outlet
      }
    },
    {
      // ── Counter Trey: classic Joe Gibbs power-running play. RB takes a
      // jab-step right to influence the LBs, then cuts back left behind two
      // pulling guards leading through the C-gap. Geometry: defenders flow
      // right with the jab, then have to redirect — every step they take
      // the wrong way is yardage gained.
      id: 'counter',
      label: 'Counter Trey (Power Run)',
      icon: '🔁',
      teach: "A run. The back (RB) steps back and to the left, then cuts the other way and runs ahead. The other players block the defenders near them. In this lab the defenders do not fall for the first step: any free defender who can reach the runner's path first makes the tackle.",
      real: "Coach Joe Gibbs's teams of the 1980s made the counter trey famous: the back fakes one way while two blockers pull across the line to lead him the other way.",
      beats: ['cover0', 'cover1'], struggles: ['cover4'],
      run: true,
      routes: {
        RB:   [{ dx: -2, dy: 1 }, { dx: 5, dy: -3 }, { dx: 19, dy: -5 }],   // jab one way, cut back for the hole
        WR1:  [{ dx: 4, dy: 0 }],                        // crack block to playside
        WR2:  [{ dx: 4, dy: 0 }],                        // backside seal block
        SLOT: [{ dx: 3, dy: 1 }],                        // edge / kick-out
        TE:   null                                       // base block
      }
    },
    {
      // ── Bootleg: QB rolls AWAY from the run-action. After a hard play-fake
      // to the RB going one way, the QB sprints out the other way. LBs and
      // safeties bite on the run, leaving the boot side wide open. Mike +
      // Kyle Shanahan + Sean McVay built entire offenses around this concept.
      id: 'bootleg',
      label: 'Bootleg (PA)',
      icon: '🎭',
      teach: "Receivers run to three depths: short (the tight end at 4 yards, the back in the flat), middle (the slot at 8 yards, W1 coming back to 10) and deep (W2 at 18). In this lab the quarterback stays where he is: there is no fake handoff and no roll-out.",
      real: "On a real bootleg the quarterback fakes a handoff one way and runs out the other way. Defenders who chase the fake leave space on the side he runs to.",
      beats: ['cover1', 'cover3'], struggles: ['cover0'],
      routes: {
        TE:   [{ dx: 4, dy: 6 }],                        // drag across to boot side
        RB:   [{ dx: 0, dy: 5 }, { dx: 4, dy: 5 }],     // flat to boot side
        WR1:  [{ dx: 12, dy: 0 }, { dx: 10, dy: 1 }],   // comeback at 12 (primary read)
        WR2:  [{ dx: 18, dy: 1 }],                       // backside post (decoy clears safety)
        SLOT: [{ dx: 8, dy: 6 }]                         // out-route at 8
      }
    },
    {
      // ── Wheel: RB releases out of the backfield like he\'s running a flat
      // route, then turns up the sideline at full speed. Linebackers chase
      // expecting the flat — when the RB turns up, the LB is in trail
      // position with no leverage. Pair with a clearing route from the
      // outside WR to vacate the corner.
      id: 'wheel',
      label: 'Wheel Route',
      icon: '🎡',
      teach: "The back (RB) runs out to the left, then turns and runs about 20 yards up the field. It is a long route for a back, so the ball leaves at about 2.5 seconds. The other receivers run short routes.",
      real: "In real games the wheel works when a linebacker follows the back toward the sideline and then has to turn and chase him up the field.",
      beats: ['cover1', 'cover3'], struggles: ['cover2'],
      routes: {
        RB:   [{ dx: 4, dy: 6 }, { dx: 25, dy: 6 }],    // out then up the sideline
        WR1:  [{ dx: 6, dy: 4 }],                        // shallow dig — clears the corner
        SLOT: [{ dx: 8, dy: -2 }],                       // pivot underneath
        WR2:  [{ dx: 12, dy: -2 }],                      // backside curl
        TE:   [{ dx: 4, dy: 1 }]                         // chip-and-release
      }
    },
    {
      // ── Y-Cross: high-percentage 3rd-down concept. The Y (TE/slot)
      // releases vertical 6 yards, then crosses the field at intermediate
      // depth (~15 yd). Behind a vertical clear-out by the X (WR1), the
      // crosser eats the soft underbelly of zone coverage right at the
      // first-down marker. Andy Reid / Doug Pederson staple.
      id: 'ycross',
      label: 'Y-Cross (3rd-and-Long)',
      icon: '✗',
      teach: "The tight end (TE) runs 6 yards up, then angles across the field to about 16 yards deep. W1 runs 22 yards straight ahead, and the slot (SL) and W2 cut in at 14 yards. The crossing route is long, so the ball leaves at about 2 seconds.",
      real: "Coaches like crossing routes on long third downs, because the crosser can run all the way to the first-down marker.",
      beats: ['cover3', 'cover6', 'robber'], struggles: ['cover0'],
      routes: {
        TE:   [{ dx: 6, dy: 0 }, { dx: 16, dy: 12 }],   // 6 vertical, then across the field
        SLOT: [{ dx: 14, dy: 4 }, { dx: 14, dy: 1 }],   // bender → dig
        WR1:  [{ dx: 22, dy: 0 }],                       // vertical clear (pulls deep safety)
        WR2:  [{ dx: 14, dy: 1 }],                       // backside dig (cleanup read)
        RB:   [{ dx: 0, dy: 4 }, { dx: 5, dy: 4 }]      // checkdown
      }
    },
    {
      // ── Outside Zone (Sweep / Toss): perimeter run. Whole O-line steps
      // playside on the snap; RB sprints to the sideline, reading the
      // defensive flow. If the edge holds → cut back inside. If the edge
      // breaks → bounce wide. Mike Shanahan, Sean McVay, Kyle Shanahan
      // entire offenses are built on this single play with different
      // window dressing.
      id: 'sweep',
      label: 'Outside Zone (Sweep)',
      icon: '🏃',
      teach: "A run. The back (RB) takes the handoff and runs wide toward the right sideline, then turns up the field. The other players block the defenders near them; any free defender who reaches his path first makes the tackle.",
      real: "In a real outside-zone run the whole line steps the same way and the back picks his gap as he goes. This lab gives the back one fixed path instead of a choice.",
      beats: ['cover0', 'cover1'], struggles: ['cover4'],
      run: true,
      routes: {
        RB:   [{ dx: 1, dy: -3 }, { dx: 5, dy: -10 }, { dx: 19, dy: -13 }],    // press inside, then bounce wide
        WR1:  [{ dx: 6, dy: -2 }],                        // crackback block (nearside)
        SLOT: [{ dx: 4, dy: -1 }],                        // edge seal
        TE:   [{ dx: 3, dy: -2 }],                        // reach block on playside DE
        WR2:  [{ dx: 4, dy: 0 }]                          // backside cutoff
      }
    },
    {
      // ── Bubble Screen: quick perimeter pass to slot WR with two
      // teammates blocking. Defeats off-coverage and stacked boxes — if
      // the corner is 8 yards off, that's a free 5-yard gain. Combines
      // with run action so it functions as a quasi-RPO.
      id: 'bubble',
      label: 'Bubble Screen',
      icon: '🫧',
      teach: "The slot receiver (SL) steps back and out to the left, and the ball comes right away. He catches it about 1 yard past the line, so the gain is small, and a short defender may already be close. W1 and the tight end take a couple of steps; W2 runs 18 yards.",
      real: "In real football the receivers near a bubble screen block for the catcher. This lab does not model those blocks, so here they run short routes.",
      beats: ['cover4', 'cover3'], struggles: ['cover2'],
      routes: {
        SLOT: [{ dx: -1, dy: 3 }, { dx: 1, dy: 6 }],     // step back, catch, sprint to the sideline
        WR1:  [{ dx: 3, dy: -2 }],                        // lead block #1
        WR2:  [{ dx: 18, dy: 0 }],                        // backside vertical (clear-out / decoy)
        TE:   [{ dx: 2, dy: -2 }],                        // chip then lead block #2
        RB:   [{ dx: 4, dy: 0 }]                          // run-action fake
      }
    },
    {
      // ── Drive Concept: shallow cross + dig combo. Classic Erhardt-Perkins
      // 3rd-and-medium answer. Shallow crosser (under) and dig (over) attack
      // the SAME zone defender — he can only carry one. Everyone uses this
      // because it works against both man AND zone.
      id: 'drive',
      label: 'Drive (Shallow + Dig)',
      icon: '🏎️',
      teach: "The slot (SL) crosses short, about 3 yards past the line, and W2 runs 12 yards and cuts in: one short and one deeper. W1 runs 18 yards straight ahead. A defender in the middle can stay near the short route or the deeper one, not both.",
      real: "In real football a short crossing route is a common answer to man coverage, because it is hard to follow a receiver running across the whole field.",
      beats: ['cover1', 'cover2', 'cover3'], struggles: ['cover0'],
      routes: {
        SLOT: [{ dx: 3, dy: -14 }],                       // shallow crosser, left to right
        WR2:  [{ dx: 12, dy: -3 }],                       // dig route at 12 yd, opposite side
        WR1:  [{ dx: 18, dy: 0 }],                        // vertical clear
        TE:   [{ dx: 4, dy: 1 }],                         // chip-release flat
        RB:   [{ dx: 0, dy: -4 }, { dx: 4, dy: -4 }]     // arrow / checkdown
      }
    },
    {
      // ── Trips Bunch (Spot Concept): 3 receivers stacked tightly on one
      // side. Inside man runs corner, middle man runs flat, outside man
      // runs hitch — together it's a triangle that flooods one zone. Best
      // 4th-and-short / red-zone play in football. Cover 2 has no answer:
      // the corner can\'t cover three depths at once.
      id: 'trips',
      label: 'Trips Bunch (Spot)',
      icon: '⫷',
      teach: "Three receivers start close together on the right: W1, the slot (SL) and the tight end (TE). The slot runs to the flat, W1 stops at 6 yards and the TE runs 12 yards toward the corner: three depths. On the other side W2 runs 14 yards and cuts in.",
      real: "Bunch formations are popular near the goal line, because defenders can get in each other's way following receivers through the crowd. This lab does not model that crowding.",
      beats: ['cover2', 'cover6', 'robber'], struggles: ['cover0'],
      // The bunch: three receivers line up close together on the right side.
      align: { WR1: { y: 8 }, SLOT: { y: 10.5, dx: -1 }, TE: { y: 13 } },
      routes: {
        WR1:  [{ dx: 6, dy: -1 }],                        // hitch at 6 (middle of triangle)
        SLOT: [{ dx: 3, dy: -5 }],                        // flat (low corner)
        TE:   [{ dx: 12, dy: -7 }],                       // corner route (high corner)
        WR2:  [{ dx: 14, dy: 0 }, { dx: 14, dy: -5 }],    // backside dig (cleanup)
        RB:   [{ dx: 0, dy: 3 }, { dx: 4, dy: 3 }]       // arrow opposite the trips side
      }
    }
  ];

  // ═══════════════════════════════════════════
  // COVERAGE LIBRARY — defensive zones as polygons
  // ═══════════════════════════════════════════
  // Zones are polygons in field coords (yards). Each zone has a label so
  // SR users can hear "deep half left" etc. The drawing layer fills each
  // zone with a translucent color; the open-receiver detector checks each
  // receiver against the zone they're standing in + nearest defender.
  //
  // For MVP we draw zones STATIC at the LOS+ position. Real coverages flex
  // based on play side; we'll punt on that until Tier 3 / animated mode.
  function buildZones(coverageId, losX) {
    losX = losX !== undefined ? losX : LOS_DEFAULT;
    var W = FIELD_WIDTH;
    var deepStart = losX + 12;     // most coverages start their deep zones ~12 yd past LOS
    var midStart = losX + 5;
    var deepEnd = losX + 35;       // we render deep zones up to 35 yd past LOS
    if (coverageId === 'cover1') {
      // Single-high safety + man underneath. We paint ONE deep zone (the
      // FS over the top) and don't paint the man assignments — they'd
      // clutter the field.
      return [
        { label: 'Free safety (deep middle)', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 0], [deepStart, W], [deepEnd, W], [deepEnd, 0]] }
      ];
    }
    if (coverageId === 'cover2') {
      return [
        { label: 'Deep half — right', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 0], [deepStart, W / 2], [deepEnd, W / 2], [deepEnd, 0]] },
        { label: 'Deep half — left', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, W / 2], [deepStart, W], [deepEnd, W], [deepEnd, W / 2]] },
        { label: 'Flat — right', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, 0], [losX, 12], [midStart + 5, 12], [midStart + 5, 0]] },
        { label: 'Flat — left', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, W - 12], [losX, W], [midStart + 5, W], [midStart + 5, W - 12]] },
        { label: 'Hook — middle', color: 'rgba(34,197,94,0.16)',
          poly: [[midStart, 18], [midStart, W - 18], [deepStart, W - 18], [deepStart, 18]] }
      ];
    }
    if (coverageId === 'cover3') {
      var third = W / 3;
      return [
        { label: 'Deep third — right', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 0], [deepStart, third], [deepEnd, third], [deepEnd, 0]] },
        { label: 'Deep third — middle', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, third], [deepStart, 2 * third], [deepEnd, 2 * third], [deepEnd, third]] },
        { label: 'Deep third — left', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 2 * third], [deepStart, W], [deepEnd, W], [deepEnd, 2 * third]] },
        { label: 'Curl-flat — right', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, 0], [losX, 18], [deepStart, 18], [deepStart, 0]] },
        { label: 'Curl-flat — left', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, W - 18], [losX, W], [deepStart, W], [deepStart, W - 18]] },
        { label: 'Hook — middle', color: 'rgba(34,197,94,0.16)',
          poly: [[midStart, 18], [midStart, W - 18], [deepStart, W - 18], [deepStart, 18]] }
      ];
    }
    if (coverageId === 'cover4') {
      // Cover 4 / Quarters — four deep zones split into quarters of the field.
      // Three underneath defenders. Modern college + Saban Alabama staple
      // because EVERY deep route gets a defender. Beat with: short-and-quick
      // (Stick, Slant) since the underneath is light. Hard to beat deep.
      var quarter = W / 4;
      return [
        { label: 'Deep quarter — right outside', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 0], [deepStart, quarter], [deepEnd, quarter], [deepEnd, 0]] },
        { label: 'Deep quarter — right inside', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, quarter], [deepStart, 2 * quarter], [deepEnd, 2 * quarter], [deepEnd, quarter]] },
        { label: 'Deep quarter — left inside', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 2 * quarter], [deepStart, 3 * quarter], [deepEnd, 3 * quarter], [deepEnd, 2 * quarter]] },
        { label: 'Deep quarter — left outside', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 3 * quarter], [deepStart, W], [deepEnd, W], [deepEnd, 3 * quarter]] },
        { label: 'Hook — right', color: 'rgba(34,197,94,0.16)',
          poly: [[losX, 0], [losX, 18], [deepStart, 18], [deepStart, 0]] },
        { label: 'Hook — middle', color: 'rgba(34,197,94,0.16)',
          poly: [[midStart, 18], [midStart, W - 18], [deepStart, W - 18], [deepStart, 18]] },
        { label: 'Hook — left', color: 'rgba(34,197,94,0.16)',
          poly: [[losX, W - 18], [losX, W], [deepStart, W], [deepStart, W - 18]] }
      ];
    }
    if (coverageId === 'tampa2') {
      // Cover 2 but the MLB drops deep into the middle hole — closes the
      // seam that beats traditional Cover 2.
      return [
        { label: 'Deep half — right', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 0], [deepStart, W / 2 - 6], [deepEnd, W / 2 - 6], [deepEnd, 0]] },
        { label: 'Deep half — left', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, W / 2 + 6], [deepStart, W], [deepEnd, W], [deepEnd, W / 2 + 6]] },
        { label: 'MLB deep middle (Tampa hole-fill)', color: 'rgba(168,85,247,0.20)',
          poly: [[deepStart - 4, W / 2 - 6], [deepStart - 4, W / 2 + 6], [deepEnd, W / 2 + 6], [deepEnd, W / 2 - 6]] },
        { label: 'Flat — right', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, 0], [losX, 12], [midStart + 5, 12], [midStart + 5, 0]] },
        { label: 'Flat — left', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, W - 12], [losX, W], [midStart + 5, W], [midStart + 5, W - 12]] }
      ];
    }
    if (coverageId === 'cover0') {
      // Cover 0 — ALL-OUT BLITZ. No deep safety, no help over the top. 7+
      // rushers, everyone else in man. Pure pressure look. We paint a thin
      // "blitz alley" to communicate the rush vs leaving the field open
      // (no zone shading because there are NO zones — pure man).
      return [
        { label: 'Blitz alley — A-gap (no help over the top)', color: 'rgba(220,38,38,0.18)',
          poly: [[losX - 4, W / 2 - 4], [losX - 4, W / 2 + 4], [midStart, W / 2 + 4], [midStart, W / 2 - 4]] }
      ];
    }
    if (coverageId === 'cover6') {
      // Cover 6 / "Quarter-Quarter-Half" — split-field. One side (we paint
      // the RIGHT side) plays Cover 4 quarters, the other side plays Cover
      // 2 halves. The check-down on the field side. Pittsburgh / Saban
      // staple to balance a 3x1 trips set: quarters into trips, halves to
      // the single-receiver side.
      var quarter6 = W / 4;
      return [
        // Cover 4 side (right): two deep quarters
        { label: 'Deep quarter — far right', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 0], [deepStart, quarter6], [deepEnd, quarter6], [deepEnd, 0]] },
        { label: 'Deep quarter — right inside', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, quarter6], [deepStart, 2 * quarter6], [deepEnd, 2 * quarter6], [deepEnd, quarter6]] },
        // Cover 2 side (left): one deep half
        { label: 'Deep half — left', color: 'rgba(168,85,247,0.20)',
          poly: [[deepStart, 2 * quarter6], [deepStart, W], [deepEnd, W], [deepEnd, 2 * quarter6]] },
        // Hooks underneath
        { label: 'Hook — right (quarters side)', color: 'rgba(34,197,94,0.16)',
          poly: [[losX, 0], [losX, 18], [deepStart, 18], [deepStart, 0]] },
        { label: 'Hook — middle', color: 'rgba(34,197,94,0.16)',
          poly: [[midStart, 18], [midStart, W - 18], [deepStart, W - 18], [deepStart, 18]] },
        { label: 'Flat — left (halves side)', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, W - 12], [losX, W], [midStart + 5, W], [midStart + 5, W - 12]] }
      ];
    }
    if (coverageId === 'robber') {
      // Robber coverage — Cover 1 (man-free with single high safety) PLUS
      // a "robber" defender lurking in the middle hole at ~10-12 yd. The
      // robber's job is to bait the QB into throwing a dig / over route,
      // then break on it for a pick. Patrick Peterson + Tyrann Mathieu
      // were elite robbers. Beat with: anything that pulls the robber out
      // of position (mesh, crossing routes that occupy the middle).
      return [
        { label: 'Free safety (deep middle, over the top)', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart + 5, 0], [deepStart + 5, W], [deepEnd, W], [deepEnd, 0]] },
        { label: 'Robber (middle hole — baiting digs)', color: 'rgba(220,38,38,0.20)',
          poly: [[midStart + 6, W / 2 - 9], [midStart + 6, W / 2 + 9], [deepStart + 4, W / 2 + 9], [deepStart + 4, W / 2 - 9]] }
      ];
    }
    return [];
  }

  // ═══════════════════════════════════════════
  // SOCCER MODEL — formations, plays, defensive shapes
  // ═══════════════════════════════════════════
  // Soccer plays don't break down into discrete "plays" the way football
  // does — the closest analog is a CONCEPT (tiki-taka, counter-attack)
  // played out of a FORMATION (4-3-3, 4-4-2, etc.). For the MVP we ship
  // 3 formations × 3 concepts × 3 defensive shapes = a teachable matrix.
  //
  // Roles use FIFA-standard codes: GK / RB / CB / LB / CDM / CM / CAM /
  // RW / LW / ST / SS. Player IDs include the role + jersey-style number
  // so SR users hear "RB2 right back" cleanly.
  function soccerFormation433() {
    var L = PITCH_LENGTH, W = PITCH_WIDTH;
    return [
      { id: 'GK',   role: 'GK',  x: 5,        y: W / 2 },
      { id: 'RB',   role: 'DEF', x: 18,       y: W * 0.20 },
      { id: 'RCB',  role: 'DEF', x: 16,       y: W * 0.40 },
      { id: 'LCB',  role: 'DEF', x: 16,       y: W * 0.60 },
      { id: 'LB',   role: 'DEF', x: 18,       y: W * 0.80 },
      { id: 'CDM',  role: 'MID', x: 35,       y: W / 2 },
      { id: 'RCM',  role: 'MID', x: 45,       y: W * 0.35 },
      { id: 'LCM',  role: 'MID', x: 45,       y: W * 0.65 },
      { id: 'RW',   role: 'FWD', x: 78,       y: W * 0.18 },
      { id: 'ST',   role: 'FWD', x: 85,       y: W / 2 },
      { id: 'LW',   role: 'FWD', x: 78,       y: W * 0.82 }
    ];
  }
  function soccerFormation442() {
    var L = PITCH_LENGTH, W = PITCH_WIDTH;
    return [
      { id: 'GK',   role: 'GK',  x: 5,        y: W / 2 },
      { id: 'RB',   role: 'DEF', x: 18,       y: W * 0.18 },
      { id: 'RCB',  role: 'DEF', x: 16,       y: W * 0.40 },
      { id: 'LCB',  role: 'DEF', x: 16,       y: W * 0.60 },
      { id: 'LB',   role: 'DEF', x: 18,       y: W * 0.82 },
      { id: 'RM',   role: 'MID', x: 50,       y: W * 0.15 },
      { id: 'RCM',  role: 'MID', x: 45,       y: W * 0.40 },
      { id: 'LCM',  role: 'MID', x: 45,       y: W * 0.60 },
      { id: 'LM',   role: 'MID', x: 50,       y: W * 0.85 },
      { id: 'RST',  role: 'FWD', x: 80,       y: W * 0.40 },
      { id: 'LST',  role: 'FWD', x: 80,       y: W * 0.60 }
    ];
  }
  function soccerFormation4231() {
    var L = PITCH_LENGTH, W = PITCH_WIDTH;
    return [
      { id: 'GK',   role: 'GK',  x: 5,        y: W / 2 },
      { id: 'RB',   role: 'DEF', x: 18,       y: W * 0.20 },
      { id: 'RCB',  role: 'DEF', x: 16,       y: W * 0.40 },
      { id: 'LCB',  role: 'DEF', x: 16,       y: W * 0.60 },
      { id: 'LB',   role: 'DEF', x: 18,       y: W * 0.80 },
      { id: 'RDM',  role: 'MID', x: 32,       y: W * 0.42 },
      { id: 'LDM',  role: 'MID', x: 32,       y: W * 0.58 },
      { id: 'RW',   role: 'MID', x: 60,       y: W * 0.18 },
      { id: 'CAM',  role: 'MID', x: 60,       y: W / 2 },
      { id: 'LW',   role: 'MID', x: 60,       y: W * 0.82 },
      { id: 'ST',   role: 'FWD', x: 85,       y: W / 2 }
    ];
  }
  // ── 3-4-3 (back-three) ──
  // Conte / Tuchel modern back-three system. Three CBs cover the central
  // channels; wing-backs (RWB / LWB) cover BOTH the touchline AND the
  // attacking side of the field — they're effectively wide midfielders
  // when the team has the ball, full-backs when they don't. Two central
  // mids (we use RCM/LCM IDs for concept compatibility) anchor the
  // middle. Front three of RW / ST / LW.
  function soccerFormation343() {
    var L = PITCH_LENGTH, W = PITCH_WIDTH;
    return [
      { id: 'GK',   role: 'GK',  x: 5,        y: W / 2 },
      { id: 'RCB',  role: 'DEF', x: 16,       y: W * 0.30 },
      { id: 'CB',   role: 'DEF', x: 14,       y: W / 2 },
      { id: 'LCB',  role: 'DEF', x: 16,       y: W * 0.70 },
      { id: 'RWB',  role: 'MID', x: 35,       y: W * 0.10 },
      { id: 'RCM',  role: 'MID', x: 40,       y: W * 0.40 },
      { id: 'LCM',  role: 'MID', x: 40,       y: W * 0.60 },
      { id: 'LWB',  role: 'MID', x: 35,       y: W * 0.90 },
      { id: 'RW',   role: 'FWD', x: 78,       y: W * 0.20 },
      { id: 'ST',   role: 'FWD', x: 85,       y: W / 2 },
      { id: 'LW',   role: 'FWD', x: 78,       y: W * 0.80 }
    ];
  }
  // ── 3-5-2 (Italian classic) ──
  // Famous Italian 1990s formation (Sacchi, Conte). Three CBs + two
  // wing-backs that stretch the field, three central midfielders anchored
  // by a CDM (defensive mid) flanked by two box-to-box mids. Two strikers
  // up top — the modern variant uses a SS (second striker) drifting
  // slightly deeper than the main ST.
  function soccerFormation352() {
    var L = PITCH_LENGTH, W = PITCH_WIDTH;
    return [
      { id: 'GK',   role: 'GK',  x: 5,        y: W / 2 },
      { id: 'RCB',  role: 'DEF', x: 16,       y: W * 0.30 },
      { id: 'CB',   role: 'DEF', x: 14,       y: W / 2 },
      { id: 'LCB',  role: 'DEF', x: 16,       y: W * 0.70 },
      { id: 'RWB',  role: 'MID', x: 35,       y: W * 0.10 },
      { id: 'RCM',  role: 'MID', x: 45,       y: W * 0.35 },
      { id: 'CDM',  role: 'MID', x: 35,       y: W / 2 },
      { id: 'LCM',  role: 'MID', x: 45,       y: W * 0.65 },
      { id: 'LWB',  role: 'MID', x: 35,       y: W * 0.90 },
      { id: 'SS',   role: 'FWD', x: 75,       y: W / 2 },     // second striker (deeper)
      { id: 'ST',   role: 'FWD', x: 85,       y: W * 0.42 }   // main striker (advanced)
    ];
  }

  var SOCCER_FORMATIONS = [
    { id: '433',  label: '4-3-3 (Barcelona)',   icon: '🔺', build: soccerFormation433,
      teach: "Four defenders, three midfielders and three forwards: a right winger (RW), a striker (ST) and a left winger (LW). In this lab the formation decides where your players start and who makes each run. If a move needs a player this shape does not have, the nearest player with a similar job makes the run instead.",
      real: "Pep Guardiola's Barcelona played a 4-3-3, with wide forwards to stretch the field and three midfielders passing in triangles." },
    { id: '442',  label: '4-4-2 (Classic)',     icon: '🔄', build: soccerFormation442,
      teach: "Four defenders, four midfielders in a flat line (RM, RCM, LCM, LM) and two strikers (RST, LST). There is no attacking midfielder, so in moves that need one, a central midfielder makes that run instead.",
      real: "The 4-4-2 was the standard formation in English soccer for many years: two flat lines of four, simple to organize." },
    { id: '4231', label: '4-2-3-1 (Modern)',    icon: '👑', build: soccerFormation4231,
      teach: "Four defenders, two defensive midfielders (RDM, LDM), three attacking midfielders (RW, CAM, LW) and one striker (ST). It is the only shape here with a central attacking midfielder (CAM), a player many moves pass through.",
      real: "The 4-2-3-1 became one of the most-used formations in top soccer in the 2000s and 2010s." },
    { id: '343',  label: '3-4-3 (Tuchel/Conte)', icon: '🔻', build: soccerFormation343,
      teach: "Three center backs, two wing-backs (RWB, LWB) who start wide, two central midfielders and three forwards (RW, ST, LW). With only three at the back, a wing-back makes the run when a move needs a full-back.",
      real: "Antonio Conte and Thomas Tuchel both won major titles using a back three and wing-backs who run the whole touchline." },
    { id: '352',  label: '3-5-2 (Italian)',     icon: '🛡️', build: soccerFormation352,
      teach: "Three center backs, two wing-backs, three central midfielders (RCM, CDM, LCM) and two strikers: ST up front and a second striker (SS) a little deeper. In moves that need an attacking midfielder, the SS plays that part.",
      // "has a long history in Italian soccer" had no source (2026-11-23); Inter's 2020-21 Serie A title under Conte's 3-5-2 is sourced (inter.it, theScore).
      real: "Antonio Conte's Inter won Serie A in 2021 playing a 3-5-2." }
  ];

  // Soccer "concepts" — passing-network patterns that overlay the formation.
  // Each concept's `passes` is an array of [fromId, toId] pairs that get
  // drawn as arrows on the field, illustrating the team's preferred ball
  // movement out of the formation.
  var SOCCER_CONCEPTS = [
    { id: 'tikitaka',
      label: 'Tiki-Taka',
      icon: '🔁',
      teach: "Two short passes along the ground move the ball to a player just in front of their back line. Then you choose the last pass: a run in behind, a run inside from the wing, or a late run from midfield. A runner must be onside when the pass is played, and a pass is cut out if a defender or the keeper can reach its path first.",
      real: "Tiki-taka is the short-passing style of Pep Guardiola's Barcelona around 2008 to 2012. Teams keep the ball for long spells and wait for a gap.",
      beats: ['lowblock', 'midblock'], struggles: ['highpress'],
      passes: [
        ['CDM', 'RCM'], ['RCM', 'RW'], ['RW', 'ST'],
        ['CDM', 'LCM'], ['LCM', 'LW'], ['LW', 'ST'],
        ['RCM', 'LCM'], ['CDM', 'CAM'], ['RCM', 'CAM'], ['LCM', 'CAM']
      ] },
    { id: 'counter',
      label: 'Counter-Attack',
      icon: '⚡',
      teach: "You win the ball in your own half, and one long pass goes forward at once: over the top to the striker, or out to a winger. A long pass takes time, so it only works if the runner gets there before a defender can.",
      real: "Fast counter-attacks were a strength of Jürgen Klopp's Liverpool and of José Mourinho's teams.",
      beats: ['highpress'], struggles: ['lowblock'],
      passes: [
        ['GK', 'CDM'], ['CDM', 'RW'], ['RW', 'ST'],
        ['CDM', 'LW'], ['LW', 'ST']
      ] },
    { id: 'gegenpress',
      label: 'Gegenpress (Counter-Press)',
      icon: '🔥',
      teach: "You win the ball back high up the pitch, just in front of their back line, and the next pass comes at once: a quick pass in behind, a pass out wide, or a shot straight away.",
      real: "Gegenpressing (\"counter-pressing\") means winning the ball back right after losing it; Jürgen Klopp's teams made it famous. In real games the idea is that the other team is not organized yet. This lab does not model that: their players stand in their normal shape, so the shape you pick still matters.",
      beats: ['highpress', 'midblock'], struggles: ['lowblock'],
      passes: [
        // Recovery + immediate attack — passes drawn from the press point
        ['CDM', 'CAM'], ['CAM', 'ST'], ['CAM', 'RW'], ['CAM', 'LW']
      ] },
    // ─────────────────────────────────────────────────────────
    // Set-piece library — restarts of play from a dead ball.
    // (The old "~30% of all goals" breakdown here had no source and was removed in the 2026-11-23 audit.)
    // The math behind them is geometry: where the ball starts, the
    // angle of approach, and the running paths into the box.
    // ─────────────────────────────────────────────────────────
    { id: 'corner-in',
      label: 'Corner — In-Swinger',
      icon: '↪️',
      setPiece: true,
      teach: "A corner from the left that curls toward the goal. Three teammates run to three spots: the near post, the far post and the penalty spot. A header counts half as much as a shot with the foot, and the keeper comes for a ball dropping into his six-yard box.",
      real: "Corners that curl toward the goal are hard for keepers, because the ball bends into a crowd of players.",
      passes: [
        ['LW', 'ST'],     // primary: in-swung header at near post
        ['LW', 'RCB'],    // secondary: aerial threat — CB pushed up for the set piece
        ['LW', 'RCM']     // recycled clear → outside shot
      ] },
    { id: 'corner-out',
      label: 'Corner — Out-Swinger',
      icon: '↩️',
      setPiece: true,
      teach: "A corner from the right that curls away from the goal. Runners attack the penalty spot, the edge of the box and the far post. Every finish is a header, which counts half.",
      real: "Out-swinging corners give attackers a ball they can run onto, while the keeper has to come a long way to reach it.",
      passes: [
        ['RW', 'CAM'],    // primary: penalty-spot run
        ['RW', 'CDM'],    // edge-of-box volley setup
        ['RW', 'LW']      // far-post header
      ] },
    { id: 'corner-short',
      label: 'Corner — Short',
      icon: '↔️',
      setPiece: true,
      teach: "A short pass from the corner to a teammate close by. From there: a pass back to the edge of the box, a cross to the middle, or a pass to the corner-taker running past on the outside. The other team still packs its box.",
      real: "Teams use short corners to change the angle of the cross or to pull a defender out of the box.",
      passes: [
        ['LW', 'LCM'],    // short to overlapping mid
        ['LCM', 'CAM'],   // build to 18-yard line
        ['CAM', 'ST']     // pull-back finish
      ] },
    { id: 'freekick-direct',
      label: 'Free Kick — Direct Strike',
      icon: '🎯',
      setPiece: true,
      teach: "A free kick 22 m out, straight in front of goal, with a wall of four defenders 9.15 m from the ball. In this lab a shot over the wall counts half. You can also pass sideways for a shot, or chip the ball to the far post for a header.",
      real: "Free-kick specialists practice for years to bend or dip the ball over the wall. This lab does not model spin or swerve.",
      passes: [
        ['CAM', 'ST'],    // direct strike toward goal (modeled as CAM→ST)
        ['CAM', 'CDM']    // recycled second phase if blocked
      ] },
    { id: 'freekick-cross',
      label: 'Free Kick — Cross to Box',
      icon: '🪂',
      setPiece: true,
      teach: "A free kick from wide on the left, crossed to runners at the near post, the penalty spot and the far post. Offside still counts at a free kick, so the runners start onside. Every finish is a header.",
      real: "From out wide, a free kick works much like a corner: the aim is a header, not a direct shot.",
      passes: [
        ['LW', 'ST'],     // cross to striker on near post run
        ['LW', 'CAM'],    // cross to penalty-spot run
        ['LW', 'RCB']     // back-post header target — CB up for FK
      ] },
    { id: 'throwin-long',
      label: 'Throw-In — Long (Delap)',
      icon: '🪂',
      setPiece: true,
      teach: "A long throw from the right sideline into the box. There is no offside from a throw-in, so runners can start close to goal. Every finish is a header.",
      real: "Rory Delap of Stoke City became known for throw-ins so long that they worked like corner kicks.",
      passes: [
        ['RW', 'ST'],     // long throw to near post — striker flicks on
        ['RW', 'RCB'],    // CB run to back post
        ['RW', 'CAM']     // mid-box volley
      ] },
    { id: 'throwin-buildup',
      label: 'Throw-In — Build-Up',
      icon: '🤝',
      setPiece: true,
      teach: "A short throw to a teammate, then a pass forward: a one-two back to the thrower down the line, a run into the middle, or a run in behind. Offside counts on that second pass.",
      real: "Many teams now plan their throw-ins carefully, as a chance to keep the ball rather than just restart play.",
      passes: [
        ['LW', 'LCM'],    // short throw to receiving mid
        ['LCM', 'LW'],    // give-and-go return
        ['LW', 'CAM']     // turn and play forward
      ] },
    { id: 'penalty',
      label: 'Penalty Kick',
      icon: '⚽',
      setPiece: true,
      teach: "A shot from the penalty spot, 11 m out, with only the keeper to beat. This lab does not work this chance out on the pitch: it uses {pen} goals in 100, about how often penalties score in real top leagues.",
      real: "A firmly struck penalty reaches the goal in about half a second, less time than a keeper needs to react and dive, so keepers often guess and dive early.",
      passes: [
        ['CAM', 'ST'],    // run-up coordination — CAM (or whoever) sets the kick
        ['ST', 'CAM']     // rebound option if keeper saves (fastest player to 2nd ball wins)
      ] },
    { id: 'goalkick-long',
      label: 'Goal Kick — Long Ball',
      icon: '⚡',
      setPiece: true,
      beats: ['highpress'], struggles: ['midblock'],
      teach: "The keeper kicks it long to the striker. Then the striker flicks it on to a winger running in, or lays it back to a midfielder.",
      real: "Direct teams use long goal kicks to skip past a high press and fight for the ball near the halfway line.",
      passes: [
        ['GK', 'ST'],     // long boomed ball to the striker
        ['ST', 'CAM']     // flick-on / second-ball winner
      ] },
    { id: 'goalkick-short',
      label: 'Goal Kick — Build From Back',
      icon: '🧩',
      setPiece: true,
      beats: ['lowblock'], struggles: ['highpress'],
      teach: "Short passes from the keeper to a center back and then a midfielder. From there, the last pass: a run in behind, or a run down either wing.",
      real: "Since a 2019 rule change, a goal kick may be passed to a teammate inside the penalty area, and many teams now build up short from the back.",
      passes: [
        ['GK', 'RCB'],    // short to right CB
        ['RCB', 'CDM'],   // CB breaks press to defensive mid
        ['CDM', 'CAM']    // mid switches to attacking mid → forward play
      ] }
  ];

  var SOCCER_SHAPES = [
    { id: 'highpress',
      label: 'High Press (Klopp)',
      teach: "Their back line is high up the pitch, so there is a lot of space behind it. A runner in behind has room, but he must be onside when the pass is played, and a long pass gives their defenders time to turn and chase ({sdef} m each second, after {sreact} s).",
      real: "Jürgen Klopp's teams pressed high to win the ball close to the other team's goal." },
    { id: 'midblock',
      label: 'Mid-Block',
      teach: "Their back line stands between the halfway line and their goal, with the midfield just in front of it. There is some space behind it and some in front.",
      real: "The mid-block is a common shape in real soccer: a team waits around the middle of the pitch and presses when the ball comes near." },
    { id: 'lowblock',
      label: 'Low Block (Park the Bus)',
      teach: "Everyone stands deep and narrow near their own goal: the back four are only 27 m wide. There is almost no space behind them, and the keeper can reach a ball played into his penalty area. The space is in front of them and out wide.",
      real: "\"Parking the bus\" is what fans call a team that defends this deep, often to protect a lead." },
    { id: 'offsidetrap',
      label: 'Offside Trap',
      teach: "A flat back line, all four defenders level. As a pass is played, the whole line steps up {step} m together, so a runner who waits right on the line is caught offside. A runner who starts a few meters behind the line stays onside.",
      // Corrected 2026-11-23 to IFAB Law 11: offside position also needs the player in the opponents' half, and being in
      // that position is not itself an offence.
      real: "Under the offside law, a player is in an offside position if he is in the other team's half and nearer their goal line than both the ball and the second-last defender when a teammate plays the ball. It is only an offense if he then takes part in the play. A trap only works if the whole line moves together." }
  ];

  // Soccer defenders — 11 markers placed by defensive shape. Returns the
  // same { id, role, x, y } shape as football's buildDefenders so the
  // renderer + analysis don't need to special-case sport.
  function buildSoccerDefenders(shapeId) {
    var W = PITCH_WIDTH;
    // The defending team attacks toward x = 0 and guards the goal at x = 105. In every
    // shape the two center-backs are the deepest outfield players (or level with the full-
    // backs): the old data had the full-backs deeper, so the offside line was set by a
    // full-back and a striker could wait goal-side of both center-backs.
    if (shapeId === 'highpress') {
      return [
        { id: 'dGK',   role: 'GK',  x: 100,      y: W / 2 },
        { id: 'dRB',   role: 'DEF', x: 70,       y: W * 0.20 },
        { id: 'dRCB',  role: 'DEF', x: 72,       y: W * 0.40 },
        { id: 'dLCB',  role: 'DEF', x: 72,       y: W * 0.60 },
        { id: 'dLB',   role: 'DEF', x: 70,       y: W * 0.80 },
        { id: 'dCDM',  role: 'MID', x: 55,       y: W / 2 },
        { id: 'dRCM',  role: 'MID', x: 50,       y: W * 0.35 },
        { id: 'dLCM',  role: 'MID', x: 50,       y: W * 0.65 },
        { id: 'dRW',   role: 'FWD', x: 30,       y: W * 0.20 },
        { id: 'dST',   role: 'FWD', x: 25,       y: W / 2 },
        { id: 'dLW',   role: 'FWD', x: 30,       y: W * 0.80 }
      ];
    }
    if (shapeId === 'lowblock') {
      // Whole team inside its own third and NARROW: the back four stand 27 m wide (the
      // other shapes: 41 m), so there is little room between them.
      return [
        { id: 'dGK',   role: 'GK',  x: 100,      y: W / 2 },
        { id: 'dRB',   role: 'DEF', x: 88,       y: W * 0.30 },
        { id: 'dRCB',  role: 'DEF', x: 89,       y: W * 0.43 },
        { id: 'dLCB',  role: 'DEF', x: 89,       y: W * 0.57 },
        { id: 'dLB',   role: 'DEF', x: 88,       y: W * 0.70 },
        { id: 'dRM',   role: 'MID', x: 80,       y: W * 0.27 },
        { id: 'dRCM',  role: 'MID', x: 78,       y: W * 0.43 },
        { id: 'dLCM',  role: 'MID', x: 78,       y: W * 0.57 },
        { id: 'dLM',   role: 'MID', x: 80,       y: W * 0.73 },
        { id: 'dRST',  role: 'FWD', x: 70,       y: W * 0.42 },
        { id: 'dLST',  role: 'FWD', x: 70,       y: W * 0.58 }
      ];
    }
    if (shapeId === 'offsidetrap') {
      // A flat high line: all four defenders on ONE line, 41 m from their goal, with the
      // midfield and the forwards in front of it and the keeper off his line to sweep. (It
      // used to put the midfield and the forwards BEHIND the back four, between them and
      // their own goal, which no team does.)
      return [
        { id: 'dGK',   role: 'GK',  x: 92,       y: W / 2 },
        { id: 'dRB',   role: 'DEF', x: 64,       y: W * 0.20 },
        { id: 'dRCB',  role: 'DEF', x: 64,       y: W * 0.40 },
        { id: 'dLCB',  role: 'DEF', x: 64,       y: W * 0.60 },
        { id: 'dLB',   role: 'DEF', x: 64,       y: W * 0.80 },
        { id: 'dCDM',  role: 'MID', x: 55,       y: W / 2 },
        { id: 'dRCM',  role: 'MID', x: 52,       y: W * 0.33 },
        { id: 'dLCM',  role: 'MID', x: 52,       y: W * 0.67 },
        { id: 'dRW',   role: 'FWD', x: 42,       y: W * 0.20 },
        { id: 'dST',   role: 'FWD', x: 40,       y: W / 2 },
        { id: 'dLW',   role: 'FWD', x: 42,       y: W * 0.80 }
      ];
    }
    // Default: midblock
    return [
      { id: 'dGK',   role: 'GK',  x: 100,      y: W / 2 },
      { id: 'dRB',   role: 'DEF', x: 78,       y: W * 0.20 },
      { id: 'dRCB',  role: 'DEF', x: 80,       y: W * 0.40 },
      { id: 'dLCB',  role: 'DEF', x: 80,       y: W * 0.60 },
      { id: 'dLB',   role: 'DEF', x: 78,       y: W * 0.80 },
      { id: 'dCDM',  role: 'MID', x: 65,       y: W / 2 },
      { id: 'dRCM',  role: 'MID', x: 62,       y: W * 0.35 },
      { id: 'dLCM',  role: 'MID', x: 62,       y: W * 0.65 },
      { id: 'dRW',   role: 'FWD', x: 50,       y: W * 0.20 },
      { id: 'dST',   role: 'FWD', x: 45,       y: W / 2 },
      { id: 'dLW',   role: 'FWD', x: 50,       y: W * 0.80 }
    ];
  }

  // ═══════════════════════════════════════════
  // FOOTBALL EPA MODEL — simplified expected-points lookup
  // ═══════════════════════════════════════════
  // Real EPA models (nflfastR, ESPN) are gradient-boosted classifiers fit
  // to ~500K plays with features for down, distance, score, time, field
  // position, etc. Our textbook model uses ONLY field position + down,
  // calibrated against published nflfastR averages so the numbers are
  // recognizable to anyone who's read a football analytics article.
  //
  // expectedPoints(yardsToGoal, down) → expected next-score value (in
  // points, can be negative if the opponent is more likely to score
  // next from this state).
  //
  // Calibration (what the function below RETURNS; tests/playlab_model.test.js pins it):
  //   1st down, own 25 (75 yd to goal)         = +1.3
  //   1st down, midfield (50 yd to goal)       = +2.4
  //   1st down, opp 25 (25 yd to goal)         = +4.7
  //   1st down, opp 5                          = +5.8
  //   1st down, opp 1                          = +5.9
  //   3rd down, own 10 (90 yd to goal)         = +0.2
  // (The old curve returned 2.35 / 3.75 / 5.15 for the first three rows while this
  // table promised 1.4 / 2.4 / 4.6, so the number on screen did not match the note.)
  function expectedPoints(yardsToGoal, down, toGo) {
    // Field-position component — closer to goal = higher EP. Approximated
    // as a sigmoid that peaks near 6 (touchdown ≈ 7 with point-after) at
    // the goal line and goes asymptotic at ~+1.0 from the team's own end.
    var ytg = Math.max(1, Math.min(99, yardsToGoal));
    var fieldComponent = 6.2 - 5.2 / (1 + Math.exp((37 - ytg) * 0.075));
    // Down penalty — each later down sheds a bit of EP because remaining
    // attempts shrink. Calibrated so 1st down ≈ baseline, 4th down on
    // your side of midfield is near zero.
    // It also scales with the yards still needed for a first down (toGo, default 10):
    // 2nd-and-1 costs almost nothing, 2nd-and-17 costs more than 2nd-and-10.
    var need = (typeof toGo === 'number' && isFinite(toGo)) ? Math.max(0, Math.min(15, toGo)) : 10;
    var downPenalty = (down - 1) * 0.45 * (need / 10);
    return Math.max(-2, fieldComponent - downPenalty);
  }
  // Translate a Run Play outcome into ΔEPA. We need yards-gained, which
  // we approximate from the receiver's route end-point distance from the
  // line of scrimmage; the next play would start there if the catch was
  // clean. Turnovers (broken-up + intercepted) flip sign and use ~50 yd
  // as the opponent's typical post-INT field position.
  function computeEPA(yardsToGoal, down, outcome) {
    var preEP = expectedPoints(yardsToGoal, down);
    if (!outcome) return { preEP: preEP, postEP: preEP, dEPA: 0, yardsGained: 0 };
    // Yards come from the play result (the model's outcome), so a 14-yard catch is 14
    // yards wherever the ball was snapped. (It used to subtract a fixed x = 35.)
    var yards = Number(outcome.yards) || 0;
    var newYTG = yardsToGoal - yards;
    if (newYTG <= 0) return { preEP: preEP, postEP: 7, dEPA: 7 - preEP, yardsGained: yards, touchdown: true };
    var gotFirst = yards >= Math.min(10, yardsToGoal);
    var postEP = gotFirst ? expectedPoints(Math.min(99, newYTG), 1)
                          : expectedPoints(Math.min(99, newYTG), Math.min(4, down + 1), 10 - yards);
    return { preEP: preEP, postEP: postEP, dEPA: postEP - preEP, yardsGained: yards, firstDown: gotFirst };
  }

  // ═══════════════════════════════════════════
  // SOCCER xG MODEL — simplified expected-goals lookup
  // ═══════════════════════════════════════════
  // Real xG models (StatsBomb, Opta) are machine-learned models fit to
  // large shot data sets, with features for body part, defender pressure,
  // pre-shot pass type, etc. We use the textbook "geometric xG": only
  // distance + angle subtended by the goal. (The "~1M shots" and "~70% of
  // the variance" figures had no source and were removed, 2026-11-23.)
  //
  // angle θ = the visible angle of the goal from the shooting position
  //           (atan2 between left post and right post, capped at π).
  // distance d = straight-line distance from shot location to goal center
  //           (in meters; goal at x=PITCH_LENGTH for the attacking team).
  // xG ≈ sin(θ) / (1 + (d/12)^1.5)
  // What it returns (tests/playlab_model.test.js pins the first): an OPEN-PLAY shot from
  // the penalty spot (11 m, central) = 0.32; from 20 m central = 0.11; a tight angle
  // near the goal line approaches 0. (This is a shot in open play, not a penalty kick:
  // real penalties score about 3 times in 4 because nobody may stand in the way.)
  function computeXG(shotX, shotY) {
    var goalLineX = PITCH_LENGTH;
    var halfGoal = SOCCER_GOAL_WIDTH / 2;
    var goalCenterY = PITCH_WIDTH / 2;
    // Angle subtended by the goal from the shot
    var leftPostY = goalCenterY - halfGoal;
    var rightPostY = goalCenterY + halfGoal;
    var dxGoal = goalLineX - shotX;
    if (dxGoal <= 0.5) return 0; // behind / on the goal line — no shot
    var aL = Math.atan2(leftPostY - shotY, dxGoal);
    var aR = Math.atan2(rightPostY - shotY, dxGoal);
    var theta = Math.abs(aR - aL);
    // Distance to goal center
    var dx = goalCenterY - shotY;
    var d = Math.sqrt(dxGoal * dxGoal + dx * dx);
    // The model
    var xg = Math.sin(theta) / (1 + Math.pow(d / 12, 1.5));
    return Math.max(0, Math.min(1, xg));
  }

  // ── Defender layout per coverage ──
  // Returns 11 defender positions for the active coverage. The four down
  // linemen (DL) sit just past LOS regardless of coverage. The back 7
  // (3 LB + 4 DB) move based on the coverage. We position zone defenders
  // at their zone centroid so the visual matches the open-receiver
  // analysis math; man defenders (Cover 1) sit ON the receivers they're
  // covering for a clear "X covers Y" read.
  // Near the goal line the deep spots would land behind the end zone: keep everyone on the field.
  function plOnField(list) {
    list.forEach(function(p) { p.x = Math.max(0.5, Math.min(FIELD_LENGTH - 1, p.x)); p.y = Math.max(0.5, Math.min(FIELD_WIDTH - 0.5, p.y)); });
    return list;
  }
  function buildDefenders(coverageId, losX, offense) {
    losX = losX !== undefined ? losX : LOS_DEFAULT;
    var W = FIELD_WIDTH;
    // 4-man front, on the LOS just past it
    var dl = [
      { id: 'DE1', role: 'DL', x: losX + 1, y: W / 2 + 4 },
      { id: 'DT1', role: 'DL', x: losX + 1, y: W / 2 + 1 },
      { id: 'DT2', role: 'DL', x: losX + 1, y: W / 2 - 1 },
      { id: 'DE2', role: 'DL', x: losX + 1, y: W / 2 - 4 }
    ];
    // The back 7 — coverage-specific
    if (coverageId === 'cover1') {
      // 1 deep safety + 3 LBs + 3 man corners (one slot/nickel)
      var wr1 = (offense || []).find(function(p) { return p.id === 'WR1'; });
      var wr2 = (offense || []).find(function(p) { return p.id === 'WR2'; });
      var slot = (offense || []).find(function(p) { return p.id === 'SLOT'; });
      var te = (offense || []).find(function(p) { return p.id === 'TE'; });
      return plOnField(dl.concat([
        { id: 'FS', role: 'S', x: losX + 25, y: W / 2, zoneName: 'Free safety' },             // deep middle
        { id: 'CB1', role: 'CB', assign: 'WR1', x: (wr1 ? wr1.x : losX) + 5, y: (wr1 ? wr1.y : 4) + 1 },     // shadows WR1
        { id: 'CB2', role: 'CB', assign: 'WR2', x: (wr2 ? wr2.x : losX) + 5, y: (wr2 ? wr2.y : W - 4) - 1 }, // shadows WR2
        { id: 'NB',  role: 'CB', assign: 'SLOT', x: (slot ? slot.x : losX) + 5, y: (slot ? slot.y : W - 9) }, // shadows slot
        { id: 'SLB', role: 'LB', assign: 'TE', x: losX + 5, y: (te ? te.y : W / 2 - 4) + 1 },               // shadows TE
        { id: 'MLB', role: 'LB', assign: 'RB', x: losX + 6, y: W / 2 },                                     // shadows the back
        { id: 'WLB', role: 'LB', x: losX + 5, y: W / 2 + 4, zoneName: 'Hook' }                // weakside helper
      ]));
    }
    if (coverageId === 'cover0') {
      // Pure man, no FS. Same WR/slot/TE shadowing as Cover 1, but the
      // single high safety becomes an EXTRA RUSHER at the LOS — the
      // signature blitz look. 5-man front + 5 in man + 1 alley filler.
      var wr1c0 = (offense || []).find(function(p) { return p.id === 'WR1'; });
      var wr2c0 = (offense || []).find(function(p) { return p.id === 'WR2'; });
      var slotc0 = (offense || []).find(function(p) { return p.id === 'SLOT'; });
      var tec0 = (offense || []).find(function(p) { return p.id === 'TE'; });
      var rb = (offense || []).find(function(p) { return p.id === 'RB'; });
      return plOnField(dl.concat([
        { id: 'BZR', role: 'LB', mode: 'rush', x: losX + 1, y: W / 2 },                       // 5th rusher (free safety blitzing)
        { id: 'CB1', role: 'CB', assign: 'WR1', x: (wr1c0 ? wr1c0.x : losX) + 1.5, y: (wr1c0 ? wr1c0.y : 4) },   // press: 1.5 yd off
        { id: 'CB2', role: 'CB', assign: 'WR2', x: (wr2c0 ? wr2c0.x : losX) + 1.5, y: (wr2c0 ? wr2c0.y : W - 4) },
        { id: 'NB',  role: 'CB', assign: 'SLOT', x: (slotc0 ? slotc0.x : losX) + 1.5, y: (slotc0 ? slotc0.y : W - 9) },
        { id: 'SLB', role: 'LB', assign: 'TE', x: losX + 4, y: (tec0 ? tec0.y : W / 2 - 4) },  // shadows TE
        { id: 'MLB', role: 'LB', assign: 'RB', x: losX + 4, y: (rb ? rb.y : W / 2) - 2 },      // shadows RB
        { id: 'WLB', role: 'LB', mode: 'rush', x: losX + 2, y: W / 2 + 6 }                     // 6th rusher off the edge
      ]));
    }
    if (coverageId === 'robber') {
      // Cover 1 + a robber lurker. Same man shadows as cover1 but the
      // strong-side LB becomes the ROBBER, sitting in the middle hole at
      // ~10-12 yards.
      var wr1r = (offense || []).find(function(p) { return p.id === 'WR1'; });
      var wr2r = (offense || []).find(function(p) { return p.id === 'WR2'; });
      var slotr = (offense || []).find(function(p) { return p.id === 'SLOT'; });
      var ter = (offense || []).find(function(p) { return p.id === 'TE'; });
      return plOnField(dl.concat([
        { id: 'FS',  role: 'S',  x: losX + 28, y: W / 2, zoneName: 'Free safety' },           // deep middle (deeper than C1)
        { id: 'ROB', role: 'S',  x: losX + 11, y: W / 2, zoneName: 'Robber' },                // robber in the middle hole
        { id: 'CB1', role: 'CB', assign: 'WR1', x: (wr1r ? wr1r.x : losX) + 5, y: (wr1r ? wr1r.y : 4) + 1 },
        { id: 'CB2', role: 'CB', assign: 'WR2', x: (wr2r ? wr2r.x : losX) + 5, y: (wr2r ? wr2r.y : W - 4) - 1 },
        { id: 'NB',  role: 'CB', assign: 'SLOT', x: (slotr ? slotr.x : losX) + 5, y: (slotr ? slotr.y : W - 9) },
        { id: 'SLB', role: 'LB', assign: 'TE', x: losX + 5, y: (ter ? ter.y : W / 2 - 4) + 1 },
        { id: 'WLB', role: 'LB', assign: 'RB', x: losX + 5, y: W / 2 + 4 }
      ]));
    }
    // Zone coverages — place each back-7 defender at the centroid of
    // their assigned zone (matches the open-receiver analysis math).
    var zones = buildZones(coverageId, losX);
    var back7 = zones.map(function(z) {
      var c = polyCentroid(z.poly);
      // Use the zone label to pick a role tag — matches "S" / "CB" / "LB"
      var role = z.label.indexOf('Deep') === 0 ? (z.label.indexOf('half') !== -1 ? 'S' : (z.label.indexOf('third') !== -1 ? 'CB' : 'S'))
               : z.label.indexOf('Hook') === 0 ? 'LB'
               : z.label.indexOf('Flat') === 0 ? 'LB'
               : z.label.indexOf('Curl') === 0 ? 'LB'
               : z.label.indexOf('MLB') === 0 ? 'LB'
               : 'DB';
      var zy0 = Infinity, zy1 = -Infinity;
      z.poly.forEach(function(pt) { if (pt[1] < zy0) zy0 = pt[1]; if (pt[1] > zy1) zy1 = pt[1]; });
      return { id: 'Z' + (zones.indexOf(z) + 1), role: role, x: c.x, y: c.y, zoneName: z.label, halfWidth: (zy1 - zy0) / 2 };
    });
    // If the coverage produced fewer than 7 zones (e.g., only the FS zone
    // for Cover 1), pad with generic LB positions in the box. We hit this
    // path only for malformed coverages — the case is defensive.
    // Pad to seven with hook defenders on either side of the middle (they used to be
    // stacked on one spot, so two defenders looked like one).
    var padSide = -1;
    while (back7.length < 7) {
      back7.push({ id: 'LB' + back7.length, role: 'LB', x: losX + 6, y: W / 2 + padSide * 9, zoneName: 'Hook' });
      padSide = -padSide;
    }
    return plOnField(dl.concat(back7));
  }

  var COVERAGES = [
    { id: 'cover1', label: 'Cover 1 (Man)', short: 'C1',
      teach: "Man coverage. Five defenders line up across from W1, W2, the slot, the tight end and the back, and each one copies his receiver. One safety starts deep in the middle. Four defenders rush, so the pocket lasts {pocket} s. A man defender reacts {react} s late and covers {mirror}% of his receiver's steps, so a sharp cut or a long run can leave him behind.",
      real: "Cover 1 is often called \"man-free\": man coverage with one free safety deep." },
    { id: 'cover2', label: 'Cover 2', short: 'C2',
      teach: "Zone. Two safeties start deep, one on each half of the field. Five defenders guard short areas. A zone defender waits in his area until the ball is thrown, then runs at it. A deep one also backs up to stay deeper than any receiver near him.",
      real: "Teams play Cover 2 to keep the ball in front of them and to stop short throws to the sidelines." },
    { id: 'cover3', label: 'Cover 3', short: 'C3',
      teach: "Zone. Three defenders split the deep field into thirds, and four guard short areas. Zone defenders wait until the throw, then run at the ball; the deep ones back up to stay deeper than any receiver near them.",
      real: "Cover 3 is one of the most common defenses in real football, at every level." },
    { id: 'tampa2', label: 'Tampa 2', short: 'T2',
      teach: "Like Cover 2, but a linebacker starts deep in the middle, between the two safeties. That makes three deep defenders and four short ones.",
      real: "In real games the middle linebacker starts near the line and runs deep after the snap. In this lab he starts deep, so before the snap Tampa 2 looks a lot like Cover 3." },
    { id: 'cover4', label: 'Cover 4 (Quarters)', short: 'C4',
      teach: "Zone. Four defenders split the deep field into quarters, and three guard short areas. Every deep part of the field has a defender, but there are fewer short defenders than in the other zones.",
      // Corrected 2026-11-23: coaching analyses (e.g. Throw Deep Publishing, "Nick Saban's Alabama Pass Coverages") describe
      // pattern-matched Cover 3 as Saban's signature, with Cover 4 quarters as his other main family.
      real: "Cover 4 is also called \"quarters\". Quarters was one of the main coverage families of Nick Saban's Alabama teams." },
    { id: 'cover0', label: 'Cover 0 (All-Out Blitz)', short: 'C0',
      teach: "A blitz. Six defenders rush the quarterback, so the pocket lasts only {pocket0} s instead of {pocket}. The other five play man coverage, starting close to their receivers, with nobody deep to help.",
      real: "Real defenses blitz like this to force a fast throw. If a receiver gets past his defender, there is nobody behind him." },
    { id: 'cover6', label: 'Cover 6 (Quarter-Quarter-Half)', short: 'C6',
      teach: "Half and half. On the right, two defenders split the deep field into quarters; on the left, one defender takes the whole deep half. Four defenders guard short areas.",
      real: "Cover 6 is also called \"quarter-quarter-half\". Real teams use it to play the two sides of the field differently, for example with more help on the side with more receivers." },
    { id: 'robber', label: 'Robber (C1 + Lurker)', short: 'RB',
      teach: "Man coverage like Cover 1: defenders copy W1, W2, the slot, the tight end and the back, and one safety stays deep. One more defender, the robber, waits about 11 yards back in the middle and runs at the ball once it is thrown.",
      real: "In real football the robber tries to read the quarterback's eyes and jump in front of a pass over the middle." }
  ];

  // ═══════════════════════════════════════════
  // DRILLS — challenge sequences
  // ═══════════════════════════════════════════
  // Same pattern as ThrowLab drills: each task has goal + test(stats) +
  // progress(stats). Tasks complete in order; the active task shows above
  // the canvas. Stats accumulate from "Run Play" outcomes — drills only
  // count animated runs, not just toggling between coverages, so the
  // student has to actually execute the play to advance.
  // Every task is checked against the soccer model in tests/playlab_soccer_model.test.js:
  // each one can be finished with some formation, move and pass, and none by doing nothing.
  // (Ids kept from round 1 where the goal is the same idea, so saved progress still counts.)
  var PLAYLAB_SOCCER_DRILLS = {
    label: 'Tactical Drills',
    tasks: [
      { id: 'highxg-shot',
        goal: 'Make a real chance: pick the pass that ends in a shot worth xG 0.10 or more.',
        test: function(s) { return !!s.highXgShot; },
        progress: function(s) { return s.highXgShot ? 'Done!' : 'Pick a pass under the pitch, then Run Play'; },
        tip: 'xG 0.10 means about 1 goal in every 10 shots like it. Close to goal, near the middle, and nobody within 3 m is best.' },
      { id: 'best-pass',
        goal: 'Pick the best pass on a move: the one that makes the biggest chance.',
        test: function(s) { return (s.bestPasses || 0) >= 1; },
        progress: function(s) { return (s.bestPasses || 0) >= 1 ? 'Done!' : 'After a move, the film room shows every pass'; },
        tip: 'Look at the red line (offside) and at the defenders near each run before you choose.' },
      { id: 'crack-low-block',
        goal: 'Make a fair chance (xG 0.05 or more) against the Low Block.',
        test: function(s) { return !!s.lowBlockChance; },
        progress: function(s) { return s.lowBlockChance ? 'Done!' : 'Pick Low Block, then find a move and a pass that still gets a shot'; },
        tip: 'The Low Block stands deep and narrow, so there is no space behind it. Look for space in front of it, or use a set piece.' },
      { id: 'beat-the-trap',
        goal: 'Beat the Offside Trap: make a fair chance (xG 0.05 or more) against it.',
        test: function(s) { return !!s.trapBeaten; },
        progress: function(s) { return s.trapBeaten ? 'Done!' : 'Pick Offside Trap. A runner who waits on the line gets caught'; },
        tip: 'The trap steps up 3 m as the pass is played. A runner who starts a few meters behind the line is still onside.' },
      { id: 'try-a-set-piece',
        goal: 'Make a fair chance (xG 0.05 or more) from a set piece: a corner, free kick, throw-in, penalty or goal kick.',
        test: function(s) { return !!s.setPieceChance; },
        progress: function(s) { return s.setPieceChance ? 'Done!' : 'Pick a corner, free kick, throw-in, penalty or goal kick'; },
        tip: 'A set piece starts from a dead ball, so the team can plan every run.' },
      { id: 'four-set-piece-types',
        goal: 'Try 4 different set-piece TYPES (corner, free kick, throw-in, penalty, goal kick).',
        test: function(s) { return Object.keys(s.setPieceTypesRun || {}).length >= 4; },
        progress: function(s) { return Object.keys(s.setPieceTypesRun || {}).length + ' / 4 set-piece types tried'; },
        tip: 'There are five types. Any four will do.' },
      { id: 'beat-each-shape',
        goal: 'Make a fair chance against each of the 4 defensive shapes.',
        test: function(s) { return Object.keys(s.shapesChance || {}).length >= 4; },
        progress: function(s) { return Object.keys(s.shapesChance || {}).length + ' / 4 shapes beaten'; },
        tip: 'High Press, Mid-Block, Low Block, Offside Trap. The space is in a different place against each one.' },
      { id: 'six-concepts',
        goal: 'Try 6 different moves.',
        test: function(s) { return Object.keys(s.conceptsRun || {}).length >= 6; },
        progress: function(s) { return Object.keys(s.conceptsRun || {}).length + ' / 6 moves run'; },
        tip: '13 moves: 3 from open play (Tiki-Taka, Counter, Gegenpress) and 10 set pieces.' }
    ]
  };

  // Every task is checked against the model in tests/playlab_model.test.js: each one
  // can be finished with the stock plays, and none is finished by doing nothing.
  var PLAYLAB_DRILLS = {
    label: 'Coordinator Drills',
    tasks: [
      { id: 'first-completion',
        goal: 'Complete a pass. Pick the receiver you think will be open, then run the play.',
        test: function(s) { return (s.completions || 0) >= 1; },
        progress: function(s) { return (s.completions || 0) >= 1 ? 'Done!' : 'No completion yet'; },
        tip: 'Open means the nearest defender is at least 1.5 yards away when the ball arrives.' },
      { id: 'first-down',
        goal: 'Get a first down: gain 10 yards or more on one play.',
        test: function(s) { return (s.firstDowns || 0) >= 1; },
        progress: function(s) { return (s.firstDowns || 0) >= 1 ? 'Done!' : 'Reach the yellow line'; },
        tip: 'The yellow line is 10 yards past the blue line. A short catch is safe but may not reach it.' },
      { id: 'best-read',
        goal: 'Make the best read: throw to the open receiver who gains the most yards.',
        test: function(s) { return (s.bestReads || 0) >= 1; },
        progress: function(s) { return (s.bestReads || 0) >= 1 ? 'Done!' : 'After a play, the film room shows every receiver'; },
        tip: 'Run a play once to see the film room. Then try a new play or defense and use what you learned.' },
      { id: 'beat-each-coverage',
        goal: 'Complete a pass or gain yards on a run against 6 different defenses',
        test: function(s) { return s.coveragesBeaten >= 6; },
        progress: function(s) { return (s.coveragesBeaten || 0) + ' / 6 defenses beaten ✓'; },
        tip: 'Switch the defense after each success. There are 8 defenses. Different plays beat different defenses.' },
      { id: 'three-different-plays',
        goal: 'Succeed with 3 DIFFERENT plays',
        test: function(s) { return Object.keys(s.completionsByPlay || {}).length >= 3; },
        progress: function(s) { return Object.keys(s.completionsByPlay || {}).length + ' / 3 different plays'; },
        tip: 'A good offense has more than one idea.' },
      { id: 'beat-cover-2-with-smash',
        goal: 'Get a first down against Cover 2 with the Smash play',
        test: function(s) { return s.smashVsCover2; },
        progress: function(s) { return s.smashVsCover2 ? 'Done!' : 'Pick Smash + Cover 2, then find the receiver who gains 10 or more'; },
        tip: 'Smash sends one receiver short and one deep on the same side. One of them is far from every defender.' },
      { id: 'beat-cover-0-with-hot',
        goal: 'Beat Cover 0 (the blitz) with a quick play: Slant, Bubble, or Stick',
        test: function(s) { return s.c0WithHot; },
        progress: function(s) { return s.c0WithHot ? 'Done!' : 'Pick Slant / Bubble / Stick + Cover 0, then Run Play'; },
        tip: 'Six defenders rush in Cover 0, so the ball must be thrown within 2 seconds. Short routes finish in time.' },
      { id: 'beat-cover-6-with-trips',
        goal: 'Beat Cover 6 with the Trips Bunch play',
        test: function(s) { return s.c6WithTrips; },
        progress: function(s) { return s.c6WithTrips ? 'Done!' : 'Pick Trips Bunch + Cover 6, then Run Play'; },
        tip: 'Cover 6 plays the two sides of the field differently. Check the receiver on the far side from the bunch.' },
      { id: 'beat-robber-with-mesh',
        goal: 'Beat Robber coverage with the Mesh play',
        test: function(s) { return s.robberWithMesh; },
        progress: function(s) { return s.robberWithMesh ? 'Done!' : 'Pick Mesh + Robber, then Run Play'; },
        tip: 'In man coverage a defender copies his receiver a moment late. A sharp cut leaves him behind.' },
      { id: 'design-and-complete',
        goal: 'Design your own play: move at least 2 players, then complete a pass',
        test: function(s) { return s.completedCustomPlay; },
        progress: function(s) { return s.completedCustomPlay ? 'Done!' : 'Move 2 or more players, then Run Play'; },
        tip: 'Drag a player, or tap him and then tap the field. His route moves with him.' }
    ]
  };

  // ═══════════════════════════════════════════
  // GEOMETRY HELPERS — convert play data → absolute field coords
  // ═══════════════════════════════════════════
  // Apply a play's routes to a formation, returning a new players array
  // with `route: [{x, y}, ...]` populated for each receiver.
  // ═══════════════════════════════════════════
  // SCENARIOS — one-click teaching demos
  // ═══════════════════════════════════════════
  // Each scenario sets sport + play/concept + coverage/shape + (optional)
  // line of scrimmage for football, in a single batched state update.
  // Scenarios are how a teacher demos a tactical idea in front of a
  // class without manually dialing 4-5 settings.
  var PLAYLAB_SCENARIOS = [
    // ── Football ──
    { id: 'patriots-2828', label: 'Patriots 28-3 Comeback', icon: '🏆',
      sport: 'football', playId: 'stick', coverageId: 'cover3', losX: 25,
      teach: "Your own 15-yard line. You need a short gain. The defense plays Cover 3: three deep, four short. Stick sends the tight end 5 yards and turns him around, while the wide receivers run deep.",
      // Super Bowl LI, 5 Feb 2017: 28-3 to a 34-28 overtime win, the largest Super Bowl comeback (nfl.com "28-3"). "Many of their
      // throws were short and quick" had no source (Brady threw for 466 yards) and was removed, 2026-11-23.
      real: "In Super Bowl LI (February 2017) the New England Patriots came back from 28-3 down to win in overtime, the biggest comeback in Super Bowl history.",
      questions: [
        "Before you run it: which receiver do you think will be open? Look at where the four short defenders stand.",
        "The tight end catches the ball about half a second after it is thrown. A defender runs 7 yards each second. How far can he run in half a second?",
        "Switch the defense to Cover 1 (man) and run Stick again. What changes for the tight end, and why?"
      ] },
    { id: 'greatest-show', label: '"Greatest Show on Turf"', icon: '🚀',
      sport: 'football', playId: 'fourverts', coverageId: 'cover1', losX: 50,
      teach: "From your own 40, four receivers run deep against Cover 1: one deep safety, and a man defender on every receiver.",
      real: "Mike Martz's Rams offense of 1999 to 2001 was nicknamed \"The Greatest Show on Turf\" for its deep passing.",
      questions: [
        "There are 4 deep routes and only 1 deep safety. Does that mean a deep receiver must be open? Who else is covering them?",
        "A man defender copies his receiver a moment late. After a 22-yard route, how far behind him is he? Check the gaps in the film room.",
        "Against Cover 0 the pocket lasts only {pocket0} s. Deep routes take almost 3 seconds. Predict: sack or catch? Then try it."
      ] },
    { id: 'bradys-drive', label: "Brady's 3rd-Down Drive", icon: '🎯',
      sport: 'football', playId: 'drive', coverageId: 'cover2', losX: 30,
      teach: "Your own 20 against Cover 2. The slot crosses short, W2 cuts in at 12 yards, and W1 runs deep on the outside. Which receiver ends up farthest from a defender?",
      real: "Plays that put one receiver short and another deeper in the same part of the field are a common answer on third down.",
      questions: [
        "A short defender in the middle can stay near the short route or the deeper one. Which would you guard, and what does that leave open?",
        "Cover 2 has two deep safeties. When the ball arrives, how far is W1 from the nearest one? Check the film room.",
        "The short cross gains about 3 yards. When is a sure short gain better than a riskier long one?"
      ] },
    { id: 'wildcat-special', label: 'Wildcat Goal-Line', icon: '🐯',
      sport: 'football', playId: 'wildcat', coverageId: 'cover1', losX: 105,   // 5 yards from the goal line, as the story says (was 95 = 15 yards out)
      teach: "5 yards from the goal line. The ball is snapped straight to the back, and everyone else blocks. Count the defenders who could still reach the runner's path.",
      real: "The 2008 Miami Dolphins surprised defenses with the Wildcat, snapping the ball straight to running back Ronnie Brown.",
      questions: [
        "In this lab a blocker takes the free defender nearest the end of his path. Which defenders are blocked on this play? Who is left to make a tackle?",
        "In Cover 1, man defenders follow their own receivers. Why does that help a run?",
        "Set \"Yards to goal\" to 75 (your own 25) and run it again. Does the run gain the same number of yards? Why or why not?"
      ] },
    { id: 'hail-mary', label: 'Hail Mary at 0:00', icon: '🙏',
      sport: 'football', playId: 'hailmary', coverageId: 'cover4', losX: 65,   // their 45: the 45-yard routes end on the goal line (was 40 = own 30)
      teach: "Last play of the game, from their 45-yard line. Everyone runs 45 yards, all the way to the goal line, against Cover 4: four deep defenders. The ball has to be thrown at about 3 seconds.",
      real: "A real Hail Mary is a last-second throw into the end zone. It rarely works, but when time runs out there is often nothing better to try.",
      questions: [
        "Four deep defenders against four deep receivers. Predict: will any deep receiver be open? Run it, then check the gaps.",
        "The ball is in the air for about 2.6 seconds. A defender waits 0.3 s, then runs 7 yards each second. How far can he run while the ball is in the air?",
        "A short pass gains only a few yards. On the last play of a game, is that a good choice? Why or why not?"
      ] },
    { id: 'beat-c0-blitz', label: 'Slant vs All-Out Blitz', icon: '⚡',
      sport: 'football', playId: 'slant', coverageId: 'cover0', losX: 35,
      teach: "Cover 0: six defenders rush, so the pocket lasts only {pocket0} s, and the other five play man with nobody deep. The slant lets the ball leave early. Which receiver can catch it before his defender gets there?",
      real: "Real quarterbacks look for a quick throw when a blitz is coming: every extra rusher is one fewer defender in coverage.",
      questions: [
        "Six rushers, five in coverage, nobody deep. What is the defense giving up to get to the quarterback faster?",
        "The ball can leave at {snap} s, and the slot catches it at about 1.5 s. Does that beat a {pocket0}-second pocket?",
        "Try 4 Verticals against Cover 0. Predict first: sack or catch?"
      ] },
    { id: 'trips-bunch-rz', label: 'Trips Bunch in the Red Zone', icon: '⫷',
      sport: 'football', playId: 'trips', coverageId: 'cover2', losX: 92,
      teach: "18 yards from the goal line against Cover 2. Three receivers start bunched on the right and split to three depths; W2 cuts in on the other side. Which one gets open?",
      real: "Bunch formations are popular near the goal line, because defenders can get in each other's way following receivers through the crowd. This lab does not model that crowding.",
      questions: [
        "Count the defenders on the bunch side before the snap. Are there enough to guard all three bunch routes?",
        "Predict: one of the bunch receivers, or W2 on the other side? Run it and check the film room.",
        "Near the goal line, a catch in the end zone counts only to the goal line. How does that change which routes are worth throwing?"
      ] },

    // ── Soccer ──
    { id: 'pep-tikitaka', label: "Pep's Tiki-Taka vs Burnley", icon: '🔁',
      sport: 'soccer', formationId: '433', conceptId: 'tikitaka', shapeId: 'lowblock',
      teach: "Your 4-3-3 against a low block: the whole team deep and narrow near their goal. Short passes get the ball to a midfielder just in front of them. Which last pass still gets a shot?",
      real: "Manchester City under Pep Guardiola often faced teams that defended this deep. Keeping the ball was easy; finding a gap was the hard part.",
      questions: [
        "Their back line is only 16 m from their goal. How much room is there for a run in behind?",
        "The keeper can come for a ball played into his penalty area. Predict which passes he can reach first.",
        "Keeping the ball does not score goals by itself. What else does a team need?"
      ] },
    { id: 'klopp-counter', label: 'Klopp Counter-Attack', icon: '⚡',
      sport: 'soccer', formationId: '433', conceptId: 'counter', shapeId: 'highpress',
      teach: "You win the ball deep in your own half while they press high, with their back line 33 m from their goal. One long pass goes forward at once. Will the runner get there before their defenders?",
      real: "Jürgen Klopp's Liverpool around 2019, with Salah, Mané and Firmino up front, was famous for fast counter-attacks. In real games a high press leaves space behind it. In this lab a long ball from deep has far to travel, so their defenders have time to get back: compare it with the Mid-Block.",
      questions: [
        "A ball in the air travels 18 m each second. How long does a 50 m pass take?",
        "Their defenders wait half a second, then run 6.5 m each second. How far can they run while that pass is in the air?",
        "Try the same counter against the Mid-Block. Predict first: a better chance or a worse one?"
      ] },
    { id: 'conte-352', label: 'Conte 3-5-2 Defense', icon: '🛡️',
      sport: 'soccer', formationId: '352', conceptId: 'gegenpress', shapeId: 'midblock',
      teach: "Your 3-5-2 wins the ball back high up the pitch against a mid-block. The second striker (SS) has it. Pass in behind to the striker, out wide to the wing-back, or shoot at once?",
      real: "Antonio Conte used the 3-5-2 at Inter. In real games, pressing right after losing the ball stops the other team from breaking out.",
      questions: [
        "Which pass do you predict makes the best chance? Say why before you run it.",
        "A shot from 34 m has a very small xG. Why does distance matter so much?",
        "Switch to the Low Block and try again. Where is the space now?"
      ] },
    { id: 'pirlo-fk', label: 'Pirlo Free Kick', icon: '🎯',
      sport: 'soccer', formationId: '4231', conceptId: 'freekick-direct', shapeId: 'midblock',
      teach: "A free kick 22 m out, straight in front of goal, with a four-man wall. Shoot over the wall, pass sideways for a shot, or chip it to the far post for a header?",
      // Corrected 2026-11-23: accounts of Pirlo's "maledetta" (Goal.com; Virgilio Sport) describe a ball struck with three toes that
      // rose over the wall and dropped fast; none says "almost no spin".
      real: "Andrea Pirlo was famous for free kicks that rose over the wall and then dropped quickly toward the goal. This lab does not model spin or swerve.",
      questions: [
        "In this lab a shot over the wall counts half, and a header counts half. Which do you predict is the better chance, and why?",
        "The wall must stand 9.15 m from the ball. Why do the rules set a distance?",
        "A ball struck at 25 m each second travels 22 m. How long does it take?"
      ] },
    { id: 'corner-out-equalizer', label: 'Late Out-Swinger Equalizer', icon: '↩️',
      sport: 'soccer', formationId: '4231', conceptId: 'corner-out', shapeId: 'lowblock',
      teach: "Late in the game, one goal down. An out-swinging corner from the right, with runners attacking the penalty spot, the edge of the box and the far post. Which runner gets the best header?",
      real: "Teams chasing a late goal often send tall defenders forward for corners, even though it leaves fewer players back.",
      questions: [
        "A header counts half. If a shot with the foot from a spot is worth 0.20, what is a header from the same spot worth?",
        "A chance worth xG 0.07 scores about 7 times in 100. If you get 4 corners like this, about how many goals would you expect?",
        "Why might the far-post run be cut out? Look at where their defenders stand at a corner."
      ] }
  ];

  // ═══════════════════════════════════════════
  // MATCHUP INTELLIGENCE — play vs coverage compatibility
  // ═══════════════════════════════════════════
  // Each PLAY entry carries `beats` (coverages it exploits) and
  // `struggles` (coverages it has trouble with). We derive a 3-tier
  // grade for the active play vs the active coverage, plus a one-line
  // reason that ties the grade to the underlying geometry. Used by
  // the matchup badge in the football UI so students see whether
  // their call is favorable BEFORE they run the play.
  function getMatchup(play, coverage) {
    if (!play || !coverage) return null;
    // The grade is the MODEL's result for this play against this defense with nobody
    // moved (plGradeMatchup). The old grade came from hand-written beats / struggles
    // lists, which disagreed with what the field then showed.
    var g = plGradeMatchup(play.id, coverage.id);
    var who = g.isRun ? 'the run' : ('the throw to ' + (PL_SHORT[g.bestId] || g.bestId));
    if (g.grade === 'great') {
      return {
        grade: 'great', emoji: '✅', color: '#16a34a', bg: 'rgba(22,163,74,0.12)',
        label: 'Great match',
        // The grade is measured from the usual spot (your own 25, nobody moved), so it says
        // so: at the goal line a run can score for 5 yards while the grade says 11.
        reason: 'From your own 25, ' + play.label + ' can gain ' + g.bestYards + ' yards against ' + coverage.label + ' (' + who + ').'
      };
    }
    if (g.grade === 'tough') {
      return {
        grade: 'tough', emoji: '⚠️', color: '#dc2626', bg: 'rgba(220,38,38,0.12)',
        label: 'Tough match',
        reason: (g.bestId && g.bestYards > 0)
          ? ('From your own 25, the best this play gets against ' + coverage.label + ' is ' + g.bestYards + ' yards. Pick a different play, or move players.')
          : ('From your own 25, nothing gains yards against ' + coverage.label + '. Pick a different play, or move players.')
      };
    }
    return {
      grade: 'okay', emoji: '👍', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',
      label: 'Workable',
      reason: 'From your own 25, the best this play gets against ' + coverage.label + ' is ' + g.bestYards + ' yards (' + who + '). Short of a first down.'
    };
  }

  // Suggest plays that the MODEL says gain a first down against this coverage (up to 3,
  // in library order). Shown only after a run that did not work.
  function suggestPlaysForCoverage(coverage) {
    if (!coverage) return [];
    return PLAYS.filter(function(p) {
      return plGradeMatchup(p.id, coverage.id).grade === 'great';
    }).slice(0, 3);
  }

  // Moves the MODEL says make a real chance against this shape, from this formation (up to
  // 3, in library order). Shown only after a run that did not work.
  function suggestConceptsForShape(shape, formationId) {
    if (!shape) return [];
    return SOCCER_CONCEPTS.filter(function(c) {
      return plSoccerGrade(formationId || '433', c.id, shape.id).grade === 'great';
    }).slice(0, 3);
  }

  // Soccer matchup: the MODEL's best pass for this formation, move and shape (the old grade
  // came from hand-written beats / struggles lists the pitch did not agree with).
  function getSoccerMatchup(concept, shape, formationId) {
    if (!concept || !shape) return null;
    var g = plSoccerGrade(formationId || '433', concept.id, shape.id);
    var tail = g.shapeMatters ? '' : ' At a set piece the defense packs its own box, so the shape does not change this.';
    var who = g.bestRunnerId ? ('the pass to ' + g.bestRunnerId) : '';
    if (g.grade === 'great') {
      return { grade: 'great', emoji: '✅', color: '#16a34a', bg: 'rgba(22,163,74,0.12)', label: 'Great match',
        reason: 'The best pass (' + who + ') makes a shot worth xG ' + g.bestXG.toFixed(2) + '.' + tail };
    }
    if (g.grade === 'tough') {
      return { grade: 'tough', emoji: '⚠️', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', label: 'Tough match',
        reason: (g.bestRunnerId ? ('The best this move gets against ' + shape.label + ' is xG ' + g.bestXG.toFixed(2) + ' (' + who + ').')
          : ('Every pass in this move is cut out or offside against ' + shape.label + '.')) + tail };
    }
    return { grade: 'okay', emoji: '👍', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Workable',
      reason: 'The best pass (' + who + ') makes a fair chance: xG ' + g.bestXG.toFixed(2) + '.' + tail };
  }

  function applyPlayToFormation(formation, play) {
    if (!play || !play.routes) return formation;
    return formation.map(function(p) {
      var routeDeltas = play.routes[p.id];
      if (!routeDeltas) return p;
      // Each waypoint is an offset from the SNAP spot (see the PLAY LIBRARY note), so a
      // "dig" of [{14,0},{14,5}] means "14 up, then 5 across at that depth". Clamped to
      // the field so a route can never leave it.
      var route = [{ x: p.x, y: p.y }];
      routeDeltas.forEach(function(d) {
        route.push({
          x: Math.max(0.5, Math.min(FIELD_LENGTH - 0.5, p.x + d.dx)),
          y: Math.max(0.5, Math.min(FIELD_WIDTH - 0.5, p.y + d.dy))
        });
      });
      return Object.assign({}, p, { route: route });
    });
  }

  // (The old static "most open" estimate lived here: route END to a defender's STARTING
  // spot, with no time in it. plSimulate below replaced it; there is one model now.)
  function polyCentroid(poly) {
    var sx = 0, sy = 0;
    poly.forEach(function(pt) { sx += pt[0]; sy += pt[1]; });
    return { x: sx / poly.length, y: sy / poly.length };
  }
  // ═══════════════════════════════════════════
  // PLAY MODEL — ONE function for the field, the verdict, the readouts and the drills
  // ═══════════════════════════════════════════
  // Everything a student sees after the snap comes from plSimulate(). Two races, both
  // distance = speed x time, in yards and seconds:
  //   1. THE POCKET RACE: can the ball leave before the rush arrives?
  //        release time (route time - ball flight time)  vs  pocket time
  //   2. THE CATCH RACE: can the ball get to the receiver before a defender does?
  //        gap at the catch = defender's distance from the catch spot - yards he closes
  // A MAN defender watches his receiver: he copies the receiver's steps a moment late
  // and a little short. A ZONE defender watches the QB: he holds his spot until the ball
  // is thrown, then runs at the catch spot. Nothing here is random.
  var PL_MODEL = {
    SPEED: { WR: 8, TE: 7, RB: 7.5 },  // yd/s running a route
    BALL_SPEED: 20,                     // yd/s
    DEF_SPEED: 7,                       // yd/s, a defender running at the ball
    REACT: 0.3,                         // s before a defender moves
    MIRROR: 0.9,                        // a man defender covers 90% of his receiver's steps
    SNAP_TO_THROW: 0.6,                 // s, the soonest the ball can leave the QB's hand
    HANDOFF: 0.4,                       // s, snap to the runner having the ball
    BLOCK_REACH: 6,                     // yd a blocker can reach a defender from the end of his path
    OPEN_YD: 1.5,                       // gap (yd) the receiver needs at the catch
    DEEP_CUSHION: 2,                    // yd a deep zone defender stays behind the deepest receiver
    FIRST_DOWN: 10,                     // yd to the yellow line
    SACK_LOSS: 7,                       // yd lost when the rush gets home first
    POCKET: { cover0: 2.0, zone: 3.5 }  // s until the rush reaches the QB: six rushers, or four
  };
  var PL_SHORT = { WR1: 'W1', WR2: 'W2', SLOT: 'SL', TE: 'TE', RB: 'RB', QB: 'QB' };
  function plPocketTime(coverageId) {
    var v = PL_MODEL.POCKET[coverageId];
    return (typeof v === 'number') ? v : PL_MODEL.POCKET.zone;
  }
  function plDist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function plRouteLength(route) {
    var total = 0;
    for (var i = 1; i < (route || []).length; i++) total += plDist(route[i], route[i - 1]);
    return total;
  }
  // Point `dist` yards along a route (clamped to its two ends).
  function plPointAlong(route, dist) {
    if (!route || !route.length) return null;
    if (route.length === 1 || dist <= 0) return { x: route[0].x, y: route[0].y };
    var acc = 0;
    for (var i = 1; i < route.length; i++) {
      var seg = plDist(route[i], route[i - 1]);
      if (seg > 0 && acc + seg >= dist) {
        var f = (dist - acc) / seg;
        return { x: route[i - 1].x + (route[i].x - route[i - 1].x) * f, y: route[i - 1].y + (route[i].y - route[i - 1].y) * f };
      }
      acc += seg;
    }
    var last = route[route.length - 1];
    return { x: last.x, y: last.y };
  }
  function plSpeedOf(p) { return PL_MODEL.SPEED[p.role] || PL_MODEL.SPEED.WR; }
  // Where an offensive player is `t` seconds after the snap.
  function plPlayerAt(p, t, delay) {
    if (!p.route || p.route.length < 2) return { x: p.x, y: p.y };
    return plPointAlong(p.route, Math.max(0, t - (delay || 0)) * plSpeedOf(p));
  }
  // The offense for a play: default spots, then the play's own alignment, then the
  // student's moves (which win), then routes from wherever each player now stands.
  function plBuildOffense(play, losX, customPositions) {
    var custom = (customPositions && typeof customPositions === 'object' && !Array.isArray(customPositions)) ? customPositions : {};
    var align = (play && play.align) || {};
    var base = defaultFormation(losX).map(function(p) {
      var o = custom[p.id], a = align[p.id];
      if (o && typeof o === 'object' && Number.isFinite(Number(o.x)) && Number.isFinite(Number(o.y))) {
        return Object.assign({}, p, {
          x: Math.max(0.5, Math.min(FIELD_LENGTH - 0.5, Number(o.x))),
          y: Math.max(0.5, Math.min(FIELD_WIDTH - 0.5, Number(o.y)))
        });
      }
      if (a) return Object.assign({}, p, { x: p.x + (a.dx || 0), y: (typeof a.y === 'number') ? a.y : p.y });
      return p;
    });
    return applyPlayToFormation(base, play);
  }
  function plEligible(offense) {
    return offense.filter(function(p) { return (p.role === 'WR' || p.role === 'TE' || p.role === 'RB') && p.route && p.route.length > 1; });
  }
  // A defender's job this play. 'rush' chases the QB, 'man' mirrors one receiver,
  // 'zone' guards a spot. A man defender whose receiver stays in to block is free to help.
  function plIsDeepZone(def) {
    var n = String(def.zoneName || '');
    return n.indexOf('Deep') === 0 || n.indexOf('Free safety') === 0 || n.indexOf('MLB deep') === 0;
  }
  function plDefenderMode(def, offense) {
    if (def.role === 'DL' || def.mode === 'rush') return 'rush';
    if (def.assign) {
      var man = offense.filter(function(p) { return p.id === def.assign; })[0];
      if (man && man.route && man.route.length > 1) return 'man';
    }
    return 'zone';
  }
  // Where a defender is `t` seconds after the snap. `thrown` = { release, catchT, spot }
  // once a ball is in the air (or a runner has it), else null.
  function plDefenderAt(def, t, offense, thrown, pocket) {
    var mode = plDefenderMode(def, offense);
    if (mode === 'rush') {
      var qb = offense.filter(function(p) { return p.id === 'QB'; })[0];
      if (!qb || !pocket) return { x: def.x, y: def.y };
      var f = Math.max(0, Math.min(1, t / pocket)) * 0.8;
      return { x: def.x + (qb.x - def.x) * f, y: def.y + (qb.y - def.y) * f };
    }
    if (mode === 'man') {
      var man = offense.filter(function(p) { return p.id === def.assign; })[0];
      var now = plPlayerAt(man, t - PL_MODEL.REACT, man.runDelay);
      var at = { x: def.x + (now.x - man.x) * PL_MODEL.MIRROR, y: def.y + (now.y - man.y) * PL_MODEL.MIRROR };
      // Once his receiver has STOPPED (end of the route), the defender sees it one
      // reaction later and closes on him at running speed. A late throw gets covered.
      var since = t - (plRouteLength(man.route) / plSpeedOf(man) + PL_MODEL.REACT);
      if (since > 0) {
        var endPt = man.route[man.route.length - 1];
        var left = plDist(at, endPt);
        var close = Math.min(left, since * PL_MODEL.DEF_SPEED);
        if (left > 0.001) at = { x: at.x + (endPt.x - at.x) * (close / left), y: at.y + (endPt.y - at.y) * (close / left) };
      }
      // He cannot follow his man off the field (near the goal line his mirrored steps
      // carried him past the back of the end zone and above the drawn field).
      at.x = Math.max(0.5, Math.min(FIELD_LENGTH - 0.5, at.x));
      at.y = Math.max(0.5, Math.min(FIELD_WIDTH - 0.5, at.y));
      return at;
    }
    // A ZONE defender holds his spot. A DEEP one also backs up so that no receiver in
    // his part of the field gets behind him ("stay on top").
    var tHold = thrown ? Math.min(t, thrown.release + PL_MODEL.REACT) : t;
    var hold = { x: def.x, y: def.y };
    if (plIsDeepZone(def)) {
      plEligible(offense).forEach(function(r) {
        var at = plPlayerAt(r, tHold);
        if (Math.abs(at.y - def.y) <= (def.halfWidth || FIELD_WIDTH) && at.x + PL_MODEL.DEEP_CUSHION > hold.x) hold.x = at.x + PL_MODEL.DEEP_CUSHION;
      });
      hold.x = Math.min(hold.x, FIELD_LENGTH - 1);
    }
    if (!thrown) return hold;
    var go = t - thrown.release - PL_MODEL.REACT;
    if (go <= 0) return hold;
    var gap = plDist(hold, thrown.spot);
    var run = Math.min(gap, go * PL_MODEL.DEF_SPEED);
    if (gap < 0.001) return hold;
    return { x: hold.x + (thrown.spot.x - hold.x) * (run / gap), y: hold.y + (thrown.spot.y - hold.y) * (run / gap) };
  }
  // One receiver's read: both races, in numbers.
  function plReadFor(rcv, offense, defenders, losX, pocket) {
    var qb = offense.filter(function(p) { return p.id === 'QB'; })[0] || { x: losX - 5, y: FIELD_WIDTH / 2 };
    var routeYd = plRouteLength(rcv.route);
    var speed = plSpeedOf(rcv);
    var routeT = routeYd / speed;
    var spot = rcv.route[rcv.route.length - 1];
    var throwYd = plDist(qb, spot);
    var flight = throwYd / PL_MODEL.BALL_SPEED;
    var release = Math.max(PL_MODEL.SNAP_TO_THROW, routeT - flight);
    var catchT = release + flight;
    var thrown = { release: release, catchT: catchT, spot: spot };
    var nearest = null;
    defenders.forEach(function(def) {
      var mode = plDefenderMode(def, offense);
      if (mode === 'rush') return;
      var at = plDefenderAt(def, catchT, offense, thrown, pocket);
      var gap = plDist(at, spot);
      if (!nearest || gap < nearest.gap) {
        var from = plDefenderAt(def, release, offense, null, pocket);
        var startGap = plDist(from, spot);
        nearest = { id: def.id, role: def.role, mode: mode, zoneName: def.zoneName || null, assign: def.assign || null,
                    gap: gap, at: at, from: from, startGap: startGap,
                    closed: mode === 'zone' ? Math.max(0, startGap - gap) : null };
      }
    });
    var sacked = release > pocket + 1e-9;
    var gapYd = nearest ? nearest.gap : Infinity;
    return {
      id: rcv.id, role: rcv.role, speed: speed, routeYd: routeYd, routeT: routeT, spot: { x: spot.x, y: spot.y },
      throwYd: throwYd, flight: flight, release: release, catchT: catchT, pocket: pocket, sacked: sacked,
      gapYd: gapYd, nearest: nearest, open: !sacked && gapYd >= PL_MODEL.OPEN_YD,
      // A catch in the end zone gains the yards to the goal line, no more.
      yards: Math.round(Math.min(spot.x, FIELD_LENGTH - END_ZONE_DEPTH) - losX)
    };
  }
  // A run: the back carries the ball along his path. Any free defender who can get to
  // a spot on that path first makes the tackle there.
  function plRunRead(rb, offense, defenders, losX, pocket) {
    var total = plRouteLength(rb.route);
    var speed = plSpeedOf(rb);
    var stop = null;
    // BLOCKS. The five linemen take the four rushers plus the nearest free defender.
    // Every other teammate blocks the free defender nearest the end of his own path, if
    // one is within reach. A blocked defender is out of the play. Count them: that is
    // the "numbers" a run play is built on.
    var blocked = {};
    function nearestFree(pt, reach) {
      var pick = null, pd = Infinity;
      defenders.forEach(function(def) {
        if (blocked[def.id] || plDefenderMode(def, offense) === 'rush') return;
        if (plDefenderMode(def, offense) === 'man' && def.assign !== rb.id) return;
        var dd = plDist(def, pt);
        if (dd <= reach && dd < pd) { pd = dd; pick = def; }
      });
      return pick;
    }
    var center = offense.filter(function(p) { return p.id === 'C'; })[0];
    if (center) { var olPick = nearestFree({ x: center.x + 4, y: center.y }, 9); if (olPick) blocked[olPick.id] = 'OL'; }
    offense.forEach(function(p) {
      if (p.id === rb.id || p.role === 'OL' || p.role === 'QB') return;
      var endPt = (p.route && p.route.length > 1) ? p.route[p.route.length - 1] : { x: p.x + 2, y: p.y };
      var pick = nearestFree(endPt, PL_MODEL.BLOCK_REACH);
      if (pick) blocked[pick.id] = p.id;
    });
    // The run is over the moment the ball crosses the goal line: a defender who would
    // have met the runner deeper in the end zone is too late.
    var goalX = FIELD_LENGTH - END_ZONE_DEPTH;
    var goal = null;
    for (var dist = 0; dist <= total + 1e-9 && !stop && !goal; dist += 0.25) {
      var pt = plPointAlong(rb.route, dist);
      var tRb = PL_MODEL.HANDOFF + dist / speed;
      if (pt.x >= goalX) { goal = { dist: dist, spot: pt, t: tRb }; break; }
      for (var i = 0; i < defenders.length; i++) {
        var def = defenders[i];
        var mode = plDefenderMode(def, offense);
        if (mode === 'rush') continue;                     // the line is blocked
        if (mode === 'man' && def.assign !== rb.id) continue; // chasing his own receiver
        if (blocked[def.id]) continue;                        // a teammate has him
        var tDef = PL_MODEL.HANDOFF + PL_MODEL.REACT + plDist(def, pt) / PL_MODEL.DEF_SPEED;
        if (tDef <= tRb) { stop = { dist: dist, spot: pt, t: tRb, tackler: def.id, tacklerRole: def.role, tacklerStart: { x: def.x, y: def.y } }; break; }
      }
    }
    var end = stop ? stop.spot : goal ? goal.spot : rb.route[rb.route.length - 1];
    var endT = stop ? stop.t : goal ? goal.t : PL_MODEL.HANDOFF + total / speed;
    var runYards = Math.round(Math.min(end.x, goalX) - losX);
    return {
      id: rb.id, role: rb.role, run: true, speed: speed, routeYd: stop ? stop.dist : goal ? goal.dist : total, routeT: endT,
      spot: { x: end.x, y: end.y }, catchT: endT, release: PL_MODEL.HANDOFF, flight: 0, pocket: pocket, sacked: false,
      tackled: !!stop, scored: !!goal, tackler: stop ? stop.tackler : null, tacklerRole: stop ? stop.tacklerRole : null, blocked: blocked,
      tacklerStart: stop ? stop.tacklerStart : null,
      yards: runYards, open: runYards > 0, gapYd: stop ? 0 : Infinity, nearest: null
    };
  }
  // The whole play. opts: { playId, coverageId, losX, customPositions, targetId }.
  // reads = every receiver's two races, best first. outcome = what happens when the
  // ball goes to opts.targetId (null until a target is named; run plays need none).
  function plSimulate(opts) {
    opts = opts || {};
    var play = PLAYS.filter(function(p) { return p.id === opts.playId; })[0] || PLAYS[0];
    var coverage = COVERAGES.filter(function(c) { return c.id === opts.coverageId; })[0] || COVERAGES[0];
    var losX = Number.isFinite(Number(opts.losX)) ? Math.max(END_ZONE_DEPTH, Math.min(FIELD_LENGTH - END_ZONE_DEPTH, Number(opts.losX))) : LOS_DEFAULT;
    var offense = plBuildOffense(play, losX, opts.customPositions);
    var defenders = buildDefenders(coverage.id, losX, offense);
    var pocket = plPocketTime(coverage.id);
    var isRun = !!play.run;
    var reads;
    if (isRun) {
      var rb = offense.filter(function(p) { return p.id === 'RB'; })[0];
      reads = (rb && rb.route && rb.route.length > 1) ? [plRunRead(rb, offense, defenders, losX, pocket)] : [];
    } else {
      reads = plEligible(offense).map(function(r) { return plReadFor(r, offense, defenders, losX, pocket); });
    }
    // Best first: open before covered, then more yards, then a bigger gap.
    reads.sort(function(a, b) {
      if (a.open !== b.open) return a.open ? -1 : 1;
      if (a.open && b.yards !== a.yards) return b.yards - a.yards;
      if (b.gapYd !== a.gapYd) return b.gapYd - a.gapYd;
      return a.id < b.id ? -1 : 1;
    });
    var best = (reads.length && reads[0].open) ? reads[0] : null;
    var targetId = isRun ? (reads[0] ? reads[0].id : null) : (opts.targetId || null);
    var read = targetId ? reads.filter(function(r) { return r.id === targetId; })[0] : null;
    var outcome = null;
    if (read) {
      var type = read.run ? 'run' : read.sacked ? 'sack' : read.open ? 'complete' : 'brokenup';
      var yards = type === 'sack' ? -PL_MODEL.SACK_LOSS : (type === 'brokenup' ? 0 : read.yards);
      outcome = {
        type: type, receiverId: read.id, yards: yards,
        success: type === 'complete' || (type === 'run' && read.yards > 0),
        firstDown: (type === 'complete' || type === 'run') && read.yards >= PL_MODEL.FIRST_DOWN,
        // The ball crossed the goal line (the far end zone starts at x = 110).
        touchdown: (type === 'complete' || type === 'run') && read.spot.x >= FIELD_LENGTH - END_ZONE_DEPTH,
        gapYd: read.gapYd, endT: type === 'sack' ? pocket : read.catchT,
        bestId: best ? best.id : null, bestYards: best ? best.yards : null,
        isBest: !!(best && best.id === read.id)
      };
    }
    return {
      playId: play.id, coverageId: coverage.id, losX: losX, isRun: isRun, pocket: pocket,
      offense: offense, defenders: defenders, reads: reads, best: best, targetId: targetId, read: read, outcome: outcome
    };
  }
  // Positions of everyone `t` seconds after the snap, for the animation and the
  // frozen "catch moment" frame. Same functions the verdict used.
  function plFrameAt(sim, t) {
    var read = sim.read;
    var thrown = (read && !read.sacked && t >= read.release) ? { release: read.release, catchT: read.catchT, spot: read.spot } : null;
    var cap = read ? (read.sacked ? sim.pocket : read.catchT) : Infinity;
    var tt = Math.min(t, cap);
    var offense = sim.offense.map(function(p) {
      var at;
      if (read && read.run && p.id === read.id) at = plPointAlong(p.route, Math.min(read.routeYd, Math.max(0, tt - PL_MODEL.HANDOFF) * read.speed));
      else at = plPlayerAt(p, tt);
      return { id: p.id, role: p.role, x: at.x, y: at.y };
    });
    var defenders = sim.defenders.map(function(def) {
      var at;
      if (read && read.run) {
        if (read.tackler === def.id) {
          var go = Math.max(0, tt - PL_MODEL.HANDOFF - PL_MODEL.REACT) * PL_MODEL.DEF_SPEED;
          var gap = plDist(def, read.spot);
          var k = gap > 0 ? Math.min(1, go / gap) : 1;
          at = { x: def.x + (read.spot.x - def.x) * k, y: def.y + (read.spot.y - def.y) * k };
        } else at = plDefenderAt(def, tt, sim.offense, null, sim.pocket);
      } else at = plDefenderAt(def, tt, sim.offense, thrown, sim.pocket);
      return { id: def.id, role: def.role, mode: plDefenderMode(def, sim.offense), x: at.x, y: at.y };
    });
    var ball = null;
    if (read && read.run) {
      var carrier = offense.filter(function(p) { return p.id === read.id; })[0];
      if (tt >= PL_MODEL.HANDOFF && carrier) ball = { x: carrier.x, y: carrier.y, held: true };
    } else if (thrown) {
      var qb = sim.offense.filter(function(p) { return p.id === 'QB'; })[0];
      var f = Math.max(0, Math.min(1, (tt - read.release) / Math.max(0.001, read.flight)));
      ball = { x: qb.x + (read.spot.x - qb.x) * f, y: qb.y + (read.spot.y - qb.y) * f, f: f, held: false };
    }
    return { t: tt, offense: offense, defenders: defenders, ball: ball };
  }
  // How a play does against a coverage with nobody moved: the model's own grade.
  var _plGradeMemo = {};
  function plGradeMatchup(playId, coverageId) {
    var key = playId + '|' + coverageId;
    if (_plGradeMemo[key]) return _plGradeMemo[key];
    var sim = plSimulate({ playId: playId, coverageId: coverageId });
    var best = sim.best;
    var openCount = sim.reads.filter(function(r) { return r.open; }).length;
    var grade = !best ? 'tough' : (best.yards >= PL_MODEL.FIRST_DOWN ? 'great' : (best.yards >= 3 ? 'okay' : 'tough'));
    var out = { grade: grade, bestId: best ? best.id : null, bestYards: best ? best.yards : 0, openCount: openCount, isRun: sim.isRun };
    _plGradeMemo[key] = out;
    return out;
  }

  // ═══════════════════════════════════════════
  // SOCCER MOVE MODEL — one function for the pitch, the verdict, the film room, the Scout map and the missions
  // ═══════════════════════════════════════════
  // A move is a few build-up passes, then ONE final pass that the student chooses. Each
  // option is a teammate who runs into space. Distance = speed x time, in meters and
  // seconds, with no dice. The passer times the ball so that it and the runner arrive
  // together (or plays it at once if the ball is the slower one).
  //   1. OFFSIDE is judged when the pass is played: a runner in the other team's half who is
  //      nearer their goal than both the ball and the second-last defender is offside.
  //   2. THE LANE: a defender who can reach the ball's path before the ball cuts the pass
  //      out. A ball in the air can only be won where it comes down. Defenders hold their
  //      shape until the pass, react, then run at the ball. The keeper comes only for a ball
  //      in his penalty area (a ball in the air: only in his six-yard box).
  //   3. THE SHOT: xG from distance and angle (computeXG), halved for each outfield defender
  //      within 3 m when the shot is taken, and halved for a header.
  var PL_SOCCER = {
    RUN: 7,            // m/s, an attacker running into space
    DEF: 6.5,          // m/s, a defender running at the ball (he has to turn first)
    REACT: 0.5,        // s before a defender moves once the pass is played
    BALL: 20,          // m/s, a firm pass along the ground
    AIR: 18,           // m/s, a chipped pass, a cross or a long throw
    CONTROL: 1,        // m: the last meter of a pass is the receiver's (see "the spot")
    CARRY: 6,          // m/s, running with the ball at his feet
    SHOOT_M: 12,       // m from goal: close enough, he shoots
    ONSIDE: 1,         // m: before the move, attackers wait this far on the safe side of the line
    TRAP_STEP: 3,      // m the offside trap steps up, all together, as the pass is played
    TRAP_TURN: 0.3,    // s more for that back line to react: it was stepping the other way
    PRESS_M: 3,        // m: each outfield defender this close when the shot is taken...
    PRESS_FACTOR: 0.5, // ...halves the chance
    HEADER: 0.5,       // a header counts half
    WALL: 0.5,         // a direct free kick has to get over the wall: half
    // NOT computed. Corrected 2026-11-23 from 0.76: CIES Football Observatory (football-observatory.com, "Penalty stats across
    // Europe") found teams in 31 European leagues scored 78.6% of penalties awarded since 2018/19.
    PENALTY_XG: 0.79,
    HALFWAY: 52.5,
    SHOT_T: 0.5,       // s the shot takes to reach the goal (animation only)
    GOOD_XG: 0.10,     // a real chance: about 1 goal in 10 shots
    FAIR_XG: 0.05
  };
  var PL_SOCCER_STANDINS = {
    CDM: ['RDM', 'LDM', 'RCM', 'LCM', 'CB'], CAM: ['SS', 'RCM', 'LCM', 'RST', 'CDM', 'RDM'],
    RCM: ['RDM', 'CDM', 'RM'], LCM: ['LDM', 'CDM', 'LM'],
    RW: ['RM', 'RWB', 'RST'], LW: ['LM', 'LWB', 'LST'], ST: ['RST', 'LST', 'SS'],
    RCB: ['CB'], LCB: ['CB'], RB: ['RWB', 'RCB'], LB: ['LWB', 'LCB']
  };
  function plSoccerPlayer(formation, id) {
    function find(x) { return formation.filter(function(p) { return p.id === x; })[0] || null; }
    var p = find(id);
    if (p) return p;
    var alts = PL_SOCCER_STANDINS[id] || [];
    for (var i = 0; i < alts.length; i++) { p = find(alts[i]); if (p) return p; }
    return null;
  }
  // Each concept's move. A spot is { x, y } in meters, or { lx, y }: lx meters past the
  // other team's offside line (negative = in front of it), so "in behind" means the same
  // thing against every shape. The ball goes toward x = 105; small y is the right wing.
  var SOCCER_MOVES = {
    tikitaka: { place: { CAM: { lx: -11, y: 30 }, LCM: { lx: -4, y: 42 } }, build: [['CDM', 'LCM'], ['LCM', 'CAM']], options: [
      { id: 'behind', runner: 'ST', to: { lx: 8, y: 36 } },
      { id: 'inside', runner: 'LW', to: { lx: 4, y: 46 } },
      { id: 'late', runner: 'LCM', to: { lx: 10, y: 34 }, early: true } ] },
    counter: { build: [['GK', 'CDM']], options: [
      { id: 'over', runner: 'ST', to: { lx: 12, y: 34 }, air: true },
      { id: 'right', runner: 'RW', to: { lx: 10, y: 17 } },
      { id: 'left', runner: 'LW', to: { lx: 10, y: 51 }, air: true } ] },
    gegenpress: { place: { CAM: { lx: -9, y: 30 } }, build: [['CDM', 'CAM']], options: [
      { id: 'quick', runner: 'ST', to: { lx: 6, y: 36 } },
      { id: 'wide', runner: 'RW', to: { lx: 5, y: 20 } },
      { id: 'shoot', runner: 'CAM', direct: true } ] },
    'corner-in': { defense: 'corner-L', offside: false,
      place: { LW: { x: 104.5, y: 67.5 }, ST: { x: 93, y: 39 }, RCB: { x: 92, y: 29 }, CAM: { x: 87, y: 35 } },
      build: [], passer: 'LW', options: [
        { id: 'near', runner: 'ST', to: { x: 98, y: 38 }, air: true, header: true },
        { id: 'far', runner: 'RCB', to: { x: 98, y: 29 }, air: true, header: true },
        { id: 'spot', runner: 'CAM', to: { x: 94, y: 34 }, air: true, header: true } ] },
    'corner-out': { defense: 'corner-R', offside: false,
      place: { RW: { x: 104.5, y: 0.5 }, CAM: { x: 89, y: 33 }, CDM: { x: 84, y: 38 }, LW: { x: 92, y: 45 } },
      build: [], passer: 'RW', options: [
        { id: 'spot', runner: 'CAM', to: { x: 93, y: 32 }, air: true, header: true },
        { id: 'edge', runner: 'CDM', to: { x: 87, y: 40 }, air: true, header: true },
        { id: 'far', runner: 'LW', to: { x: 98, y: 41 }, air: true, header: true } ] },
    'corner-short': { defense: 'corner-L', offside: false,
      place: { LW: { x: 104.5, y: 67.5 }, LCM: { x: 101, y: 61 }, ST: { x: 93, y: 37 }, CAM: { x: 86, y: 40 } },
      build: [['LW', 'LCM']], options: [
        { id: 'cutback', runner: 'CAM', to: { x: 90, y: 41 } },
        { id: 'cross', runner: 'ST', to: { x: 97, y: 33 }, air: true, header: true },
        { id: 'overlap', runner: 'LW', to: { x: 101, y: 52 } } ] },
    'freekick-direct': { defense: 'fk-direct',
      place: { CAM: { x: 83, y: 34 }, CDM: { x: 81, y: 24 }, RCB: { x: 94, y: 26 }, ST: { x: 94, y: 42 } },
      build: [], passer: 'CAM', options: [
        { id: 'direct', runner: 'CAM', direct: true, wall: true },
        { id: 'square', runner: 'CDM', to: { x: 84, y: 25 } },
        { id: 'chip', runner: 'RCB', to: { x: 98, y: 27 }, air: true, header: true } ] },
    'freekick-cross': { defense: 'fk-wide',
      place: { LW: { x: 78, y: 60 }, ST: { x: 89, y: 37 }, CAM: { x: 89, y: 32 }, RCB: { x: 89, y: 27 } },
      build: [], passer: 'LW', options: [
        { id: 'near', runner: 'ST', to: { x: 97, y: 38 }, air: true, header: true },
        { id: 'spot', runner: 'CAM', to: { x: 94, y: 33 }, air: true, header: true },
        { id: 'far', runner: 'RCB', to: { x: 98, y: 27 }, air: true, header: true } ] },
    'throwin-long': { defense: 'corner-R', offside: false,
      place: { RW: { x: 90, y: 0.5 }, ST: { x: 94, y: 31 }, RCB: { x: 93, y: 38 }, CAM: { x: 87, y: 33 } },
      build: [], passer: 'RW', options: [
        { id: 'near', runner: 'ST', to: { x: 98, y: 30 }, air: true, header: true },
        { id: 'far', runner: 'RCB', to: { x: 98, y: 39 }, air: true, header: true },
        { id: 'spot', runner: 'CAM', to: { x: 93, y: 34 }, air: true, header: true } ] },
    'throwin-buildup': { place: { LW: { lx: -14, y: 67.5, maxX: 80 }, LCM: { lx: -17, y: 61, maxX: 77 } }, build: [['LW', 'LCM']], options: [
      { id: 'giveandgo', runner: 'LW', to: { lx: 4, y: 58 } },
      { id: 'middle', runner: 'CAM', to: { lx: 2, y: 40 } },
      { id: 'behind', runner: 'ST', to: { lx: 8, y: 34 } } ] },
    penalty: { defense: 'penalty', offside: false, place: { ST: { x: 94, y: 34 } }, build: [], passer: 'ST', options: [
      { id: 'spot', runner: 'ST', direct: true, penalty: true } ] },
    'goalkick-long': { place: { ST: { lx: -1, y: 34, maxX: 60 } }, build: [['GK', 'ST']], options: [
      { id: 'right', runner: 'RW', to: { lx: 10, y: 24 }, air: true },
      { id: 'left', runner: 'LW', to: { lx: 10, y: 44 }, air: true },
      { id: 'layoff', runner: 'CAM', to: { lx: -8, y: 30 } } ] },
    'goalkick-short': { place: { CDM: { lx: -20, y: 34, maxX: 70 } }, build: [['GK', 'RCB'], ['RCB', 'CDM']], options: [
      { id: 'behind', runner: 'ST', to: { lx: 8, y: 34 } },
      { id: 'right', runner: 'RW', to: { lx: 6, y: 18 } },
      { id: 'left', runner: 'LW', to: { lx: 6, y: 50 } } ] }
  };
  // How the other team stands. Open play and goal kicks use the chosen shape. At a corner,
  // a free kick or a penalty every team packs its own box, so the shape does not change it.
  function plSoccerDefense(kind, shapeId) {
    if (!kind || kind === 'shape') return buildSoccerDefenders(shapeId);
    var c = PITCH_WIDTH / 2, L = [];
    function add(id, role, x, y) { L.push({ id: id, role: role, x: x, y: y }); }
    if (kind === 'corner-L' || kind === 'corner-R') {
      var s = kind === 'corner-L' ? 1 : -1;   // +1: the ball is on the left (y = 68)
      add('dGK', 'GK', 104, c);
      add('dNP', 'DEF', 103.5, c + s * 4.5);
      add('dZ1', 'DEF', 99.5, c - 4.5); add('dZ2', 'DEF', 99.5, c); add('dZ3', 'DEF', 99.5, c + 4.5);
      add('dM1', 'DEF', 95.5, c - 7); add('dM2', 'DEF', 95.5, c + 1); add('dM3', 'DEF', 95.5, c + 8);
      add('dE1', 'MID', 88.5, c - 6); add('dE2', 'MID', 88.5, c + 6);
      add('dSC', 'MID', 100, c + s * 25);
      return L;
    }
    if (kind === 'fk-direct') {          // the ball is 22 m out, straight in front of goal
      add('dGK', 'GK', 104, 35.5);
      add('dW1', 'DEF', 92.2, 31.6); add('dW2', 'DEF', 92.2, 32.6); add('dW3', 'DEF', 92.2, 33.6); add('dW4', 'DEF', 92.2, 34.6);
      add('dM1', 'DEF', 96.5, 25); add('dM2', 'DEF', 96.5, 43); add('dM3', 'DEF', 99, 30); add('dM4', 'DEF', 99, 38);
      add('dE1', 'MID', 87, 22); add('dE2', 'MID', 87, 46);
      return L;
    }
    if (kind === 'fk-wide') {            // the ball is wide on the left, 30 m out; one flat line
      add('dGK', 'GK', 102, 36);
      add('dW1', 'DEF', 84.6, 53.2); add('dW2', 'DEF', 84.0, 53.8);
      add('dL1', 'DEF', 91, 26); add('dL2', 'DEF', 91, 30); add('dL3', 'DEF', 91, 34); add('dL4', 'DEF', 91, 38); add('dL5', 'DEF', 91, 42);
      add('dE1', 'MID', 83, 34); add('dE2', 'MID', 80, 44);
      return L;
    }
    // A penalty: only the keeper may stand in the box or the arc.
    add('dGK', 'GK', 105, c);
    [14, 18, 22, 26, 42, 46, 50, 54].forEach(function(y, i) { add('dP' + i, 'DEF', 87, y); });
    add('dP8', 'MID', 84, 30); add('dP9', 'MID', 84, 38);
    return L;
  }
  // The offside line: the second-last defender (the keeper usually being the last).
  function plSoccerLine(defs) {
    var xs = defs.map(function(dd) { return dd.x; }).sort(function(a, b) { return b - a; });
    return xs.length > 1 ? xs[1] : PITCH_LENGTH;
  }
  function plSoccerSpot(spec, line) {
    var x = (typeof spec.x === 'number') ? spec.x : line + (spec.lx || 0);
    if (typeof spec.maxX === 'number') x = Math.min(x, spec.maxX);
    return { x: Math.max(1, Math.min(104.5, x)), y: Math.max(0.5, Math.min(PITCH_WIDTH - 0.5, spec.y)) };
  }
  function plToward(a, b, m) {
    var dd = plDist(a, b);
    if (dd < 1e-9 || m <= 0) return { x: a.x, y: a.y };
    var f = Math.min(1, m / dd);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }
  function plInBox(p, six) {
    var halfW = (six ? GOAL_AREA_WIDTH : PENALTY_AREA_WIDTH) / 2;
    return p.x >= PITCH_LENGTH - (six ? GOAL_AREA_DEPTH : PENALTY_AREA_DEPTH) && Math.abs(p.y - PITCH_WIDTH / 2) <= halfW;
  }
  // The set-piece TYPE of a concept (corner / freekick / throwin / penalty / goalkick).
  function plSoccerSetType(conceptId) {
    var id = String(conceptId || '');
    var types = ['corner', 'freekick', 'throwin', 'penalty', 'goalkick'];
    for (var i = 0; i < types.length; i++) if (id.indexOf(types[i]) === 0) return types[i];
    return null;
  }
  function plSoccerReact(m, dd) { return PL_SOCCER.REACT + ((m.trap && dd.role === 'DEF') ? PL_SOCCER.TRAP_TURN : 0); }
  // Defenders at the moment of the pass: the offside trap's back line steps up.
  function plSoccerDefAtPass(defs, trap) {
    return defs.map(function(dd) {
      return (trap && dd.role === 'DEF') ? Object.assign({}, dd, { x: dd.x - PL_SOCCER.TRAP_STEP }) : dd;
    });
  }
  // One option: offside, the lane, then the shot.
  function plSoccerRead(opt, m) {
    var K = PL_SOCCER;
    var runner = plSoccerPlayer(m.attackers, opt.runner);
    if (!runner) return null;
    var direct = !!opt.direct;
    if (!direct && runner.id === m.passer.id) return null;
    var start = { x: runner.x, y: runner.y };
    var to = direct ? { x: m.passer.x, y: m.passer.y } : plSoccerSpot(opt.to, m.line);
    var air = !direct && !!opt.air;
    var runM = direct ? 0 : plDist(start, to), runT = runM / K.RUN;
    var passM = direct ? 0 : plDist(m.passer, to);
    var speed = air ? K.AIR : K.BALL;
    var flight = passM / speed;
    // The passer times it so ball and runner arrive together, but never later than the
    // moment the runner reaches the offside line (he waits on it before the move).
    // ("early": the ball is played at once into the space, and waits there for him.)
    var release = (direct || opt.early) ? 0 : Math.max(0, runT - flight);
    var crossT = null;
    if (!direct && !opt.early && m.offsideOn && runM > 1e-9 && to.x > m.line && start.x <= m.line) {
      crossT = (m.line - start.x) / ((to.x - start.x) / runM * K.RUN);
      release = Math.max(0, Math.min(release, crossT));
    }
    // The runner has the ball when both he and the ball are there.
    var catchT = release + Math.max(flight, runT - release);
    var atPass = plToward(start, to, release * K.RUN);
    var defs = plSoccerDefAtPass(m.defenders, m.trap);
    var lineAtPass = plSoccerLine(defs);
    var read = {
      id: opt.id, runnerId: runner.id, start: start, to: to, air: air, direct: direct, penalty: !!opt.penalty, wall: !!opt.wall,
      runM: runM, runT: runT, passM: passM, speed: speed, flight: flight, release: release, catchT: catchT, crossT: crossT,
      atPass: atPass, lineAtPass: lineAtPass, offside: null, cut: null, closer: null, nearest: null, pressers: [],
      baseXG: 0, xG: 0, type: 'shot'
    };
    if (!direct && m.offsideOn) {
      var beyond = atPass.x - Math.max(lineAtPass, m.passer.x);
      if (atPass.x > K.HALFWAY && beyond > 0.05) {
        read.offside = { by: beyond, lineX: lineAtPass, runnerX: atPass.x, t: release };
        read.type = 'offside';
        return read;
      }
    }
    if (!direct) {
      // Times below are seconds after the pass is played.
      var runnerArrives = runT - release;
      defs.forEach(function(dd) {
        var isGK = dd.role === 'GK';
        // (a) THE LANE: a ball along the ground can be reached on its way. A ball in the air
        //     flies over everyone.
        if (!air) {
          for (var s = 0; s <= passM - K.CONTROL + 1e-9; s += 0.5) {
            var pt = plToward(m.passer, to, s);
            if (isGK && !plInBox(pt, false)) continue;
            var tB = s / K.BALL, tD = plSoccerReact(m, dd) + plDist(dd, pt) / K.DEF;
            if (tD <= tB + 1e-9) {
              if (!read.cut || s < read.cut.s) read.cut = { id: dd.id, role: dd.role, at: pt, s: s, tBall: tB, tDef: tD, from: { x: dd.x, y: dd.y }, distM: plDist(dd, pt), lane: true };
              return;
            }
          }
        }
        // (b) THE SPOT: whoever gets to where the ball arrives first wins it. The keeper
        //     comes for a ball in the air only in his six-yard box.
        if (isGK && !plInBox(to, air)) return;
        var tSpot = plSoccerReact(m, dd) + plDist(dd, to) / K.DEF;
        if (tSpot < runnerArrives - 1e-9 && (!read.cut || (!read.cut.lane && tSpot < read.cut.tDef))) {
          read.cut = { id: dd.id, role: dd.role, at: { x: to.x, y: to.y }, s: passM, tBall: flight, tDef: tSpot, from: { x: dd.x, y: dd.y }, distM: plDist(dd, to), lane: false, runnerT: runnerArrives };
        }
      });
      if (read.cut) { read.type = 'cut'; return read; }
    }
    // He has the ball (whichever of ball and runner got there later). Until then only the
    // NEAREST outfield defender runs at him; the others hold their places.
    var tGet = direct ? 0 : catchT - release;
    defs.forEach(function(dd) {
      if (dd.role === 'GK') return;
      var d0 = plDist(dd, to);
      if (!read.closer || d0 < read.closer.startGap) read.closer = { id: dd.id, role: dd.role, startGap: d0, from: { x: dd.x, y: dd.y }, react: plSoccerReact(m, dd) };
    });
    if (read.closer) {
      read.closer.gapAtCatch = Math.max(0, read.closer.startGap - Math.max(0, tGet - read.closer.react) * K.DEF);
      read.closer.closed = read.closer.startGap - read.closer.gapAtCatch;
    }
    // THE RUN AT GOAL: with the ball at his feet he keeps going toward goal at CARRY m/s,
    // and now every defender chases him. He shoots as soon as a defender (or the keeper,
    // inside the box) gets within PRESS_M of him, or when he is SHOOT_M from goal. A header,
    // a penalty or a direct free kick is shot at once.
    var goalC = { x: PITCH_LENGTH, y: PITCH_WIDTH / 2 };
    var chasers = defs.map(function(dd) {
      var isNear = read.closer && dd.id === read.closer.id;
      var from = isNear ? plToward(dd, to, read.closer.closed) : { x: dd.x, y: dd.y };
      return { id: dd.id, role: dd.role, from: from, wait: isNear ? 0 : plSoccerReact(m, dd) };
    });
    function gapAt(c, at, t) { return Math.max(0, plDist(c.from, at) - Math.max(0, t - c.wait) * K.DEF); }
    var canCarry = !direct && !opt.header;
    var maxCarry = canCarry ? Math.max(0, plDist(to, goalC) - K.SHOOT_M) : 0;
    var carryT = 0, shotAt = { x: to.x, y: to.y }, stoppedBy = null;
    for (var ct = 0; ct <= maxCarry / K.CARRY + 1e-9; ct += 0.05) {
      var cAt = plToward(to, goalC, Math.min(maxCarry, ct * K.CARRY));
      var stop = null;
      chasers.forEach(function(c) {
        if (stop) return;
        if (c.role === 'GK' && !plInBox(cAt, false)) return;
        if (gapAt(c, cAt, ct) <= K.PRESS_M + 1e-9) stop = c;
      });
      carryT = ct; shotAt = cAt;
      if (stop) { stoppedBy = stop.id; break; }
    }
    read.shotAt = shotAt; read.carryT = carryT; read.carryM = plDist(to, shotAt); read.stoppedBy = stoppedBy;
    read.shotT = catchT + carryT;
    read.chasers = chasers;
    // Pressure at the shot: outfield defenders within PRESS_M.
    read.nearest = null;
    chasers.forEach(function(c) {
      if (c.role === 'GK') return;
      var g = gapAt(c, shotAt, carryT);
      if (g <= K.PRESS_M + 1e-9) read.pressers.push(c.id);
      if (!read.nearest || g < read.nearest.gap) read.nearest = { id: c.id, role: c.role, gap: g, from: c.from };
    });
    read.header = !!opt.header;
    if (read.penalty) {
      read.baseXG = K.PENALTY_XG; read.xG = K.PENALTY_XG; read.pressers = [];
    } else {
      read.baseXG = computeXG(shotAt.x, shotAt.y);
      // Kept to the 2 decimals the screen shows, so the number, the words ("a fair chance")
      // and the missions can never disagree (0.046 would show as 0.05 but count as weak).
      read.xGRaw = read.baseXG * (read.header ? K.HEADER : 1) * (read.wall ? K.WALL : 1) * Math.pow(K.PRESS_FACTOR, read.pressers.length);
      read.xG = Math.round(read.xGRaw * 100) / 100;
    }
    read.goalDist = plDist(shotAt, goalC);
    return read;
  }
  // The whole move. optionId = the pass the student chose (null until chosen).
  function plSoccerMove(formationId, conceptId, shapeId, optionId) {
    var K = PL_SOCCER;
    var fdef = SOCCER_FORMATIONS.filter(function(f) { return f.id === formationId; })[0] || SOCCER_FORMATIONS[0];
    var cdef = SOCCER_CONCEPTS.filter(function(c) { return c.id === conceptId; })[0] || SOCCER_CONCEPTS[0];
    var sdef = SOCCER_SHAPES.filter(function(s) { return s.id === shapeId; })[0] || SOCCER_SHAPES[0];
    var mv = SOCCER_MOVES[cdef.id] || SOCCER_MOVES.tikitaka;
    var defKind = mv.defense || 'shape';
    var defenders = plSoccerDefense(defKind, sdef.id);
    var line = plSoccerLine(defenders);
    var attackers = fdef.build().map(function(p) { return Object.assign({}, p); });
    // Set-piece and build-up spots first.
    var placed = {};
    Object.keys(mv.place || {}).forEach(function(id) {
      var p = plSoccerPlayer(attackers, id);
      if (!p) return;
      var at = plSoccerSpot(mv.place[id], line);
      p.x = at.x; p.y = at.y; placed[p.id] = true;
    });
    // The build-up, with stand-ins for missing positions; repeats and self-passes dropped.
    var build = [];
    (mv.build || []).forEach(function(pair) {
      var a = plSoccerPlayer(attackers, pair[0]), b = plSoccerPlayer(attackers, pair[1]);
      if (!a || !b || a.id === b.id) return;
      if (build.length && build[build.length - 1][1] !== a.id) return;
      build.push([a.id, b.id]);
    });
    var passerP = build.length ? plSoccerPlayer(attackers, build[build.length - 1][1]) : plSoccerPlayer(attackers, mv.passer || 'CAM');
    var offsideOn = mv.offside !== false;
    // Before the move, attackers wait on the safe side of the offside line.
    if (offsideOn) {
      attackers.forEach(function(p) {
        if (p === passerP || placed[p.id] || p.role === 'GK') return;
        if (p.x > line - K.ONSIDE) p.x = line - K.ONSIDE;
      });
    }
    var m = {
      formationId: fdef.id, conceptId: cdef.id, shapeId: sdef.id, defKind: defKind, setType: plSoccerSetType(cdef.id),
      shapeMatters: defKind === 'shape', offsideOn: offsideOn, trap: defKind === 'shape' && sdef.id === 'offsidetrap',
      attackers: attackers, defenders: defenders, line: line, build: build,
      passer: { id: passerP.id, x: passerP.x, y: passerP.y }
    };
    var reads = [];
    (mv.options || []).forEach(function(opt) {
      var r = plSoccerRead(opt, m);
      if (r) reads.push(r);
    });
    m.reads = reads;
    var best = null;
    reads.forEach(function(r) { if (r.type === 'shot' && (!best || r.xG > best.xG + 1e-12)) best = r; });
    m.best = best;
    m.read = optionId ? (reads.filter(function(r) { return r.id === optionId; })[0] || null) : null;
    m.buildT = build.reduce(function(acc, q) {
      var a = plSoccerPlayer(attackers, q[0]), b = plSoccerPlayer(attackers, q[1]);
      return acc + plDist(a, b) / K.BALL;
    }, 0);
    m.outcome = null;
    if (m.read) {
      var r = m.read;
      var endT = r.type === 'offside' ? r.release + 0.3
        : r.type === 'cut' ? r.release + Math.max(r.cut.tBall, r.cut.lane ? 0 : r.cut.tDef)
        : r.shotT + K.SHOT_T;
      m.outcome = {
        type: r.type, optionId: r.id, runnerId: r.runnerId, xG: r.type === 'shot' ? r.xG : 0, cutRole: r.cut ? r.cut.role : null,
        baseXG: r.baseXG, pressers: r.pressers.length, goalDist: r.goalDist || null,
        isBest: !!(best && best.id === r.id), bestId: best ? best.id : null, bestRunnerId: best ? best.runnerId : null, bestXG: best ? best.xG : 0,
        endT: endT
      };
    }
    return m;
  }
  // Where everyone is `t` seconds after the decision (t = 0: the passer has the ball). The
  // same numbers as the verdict: the runs, the one defender who closes before the catch,
  // then the run at goal with every defender chasing, then the shot.
  function plSoccerFrameAt(m, t) {
    var K = PL_SOCCER;
    var read = m.read;
    var cap = (read && m.outcome) ? m.outcome.endT : Infinity;
    var tt = Math.max(0, Math.min(t, cap));
    var runs = {};
    m.reads.forEach(function(r) { if (!r.direct && (!runs[r.runnerId] || (read && read.id === r.id))) runs[r.runnerId] = r; });
    var shot = read && read.type === 'shot' && !read.direct;
    var tCarry = shot ? Math.max(0, tt - read.catchT) : 0;
    var carrierAt = shot ? plToward(read.to, read.shotAt, tCarry * K.CARRY) : null;
    var attackers = m.attackers.map(function(p) {
      var r = runs[p.id];
      var at = r ? plToward(r.start, r.to, tt * K.RUN) : { x: p.x, y: p.y };
      if (shot && p.id === read.runnerId && tt > read.catchT) at = carrierAt;
      return { id: p.id, role: p.role, x: at.x, y: at.y };
    });
    var release = read ? read.release : Infinity;
    var stepped = plSoccerDefAtPass(m.defenders, m.trap);
    var defenders = m.defenders.map(function(dd, i) {
      var hold = { x: dd.x, y: dd.y };
      if (read && m.trap && dd.role === 'DEF') {
        var k = Math.max(0, Math.min(1, (tt - (release - 0.4)) / 0.4));
        hold = { x: dd.x - K.TRAP_STEP * k, y: dd.y };
      }
      var at = hold;
      if (read && read.type === 'cut' && dd.id === read.cut.id) {
        at = plToward(stepped[i], read.cut.at, Math.max(0, tt - release - plSoccerReact(m, dd)) * K.DEF);
      } else if (shot && read.closer && dd.id === read.closer.id && tt <= read.catchT) {
        at = plToward(stepped[i], read.to, Math.min(read.closer.closed, Math.max(0, tt - release - read.closer.react) * K.DEF));
      } else if (shot && tt > read.catchT) {
        // Every defender chases him; the picture freezes at the shot, so the gap drawn is
        // the gap in the verdict.
        var c = read.chasers[i];
        at = plToward(c.from, carrierAt, Math.max(0, Math.min(tCarry, read.carryT) - c.wait) * K.DEF);
      }
      return { id: dd.id, role: dd.role, x: at.x, y: at.y };
    });
    var ball = { x: m.passer.x, y: m.passer.y, air: 0 };
    if (read && read.type !== 'offside') {
      var goalC = { x: PITCH_LENGTH, y: PITCH_WIDTH / 2 };
      if (read.direct) {
        var fd = Math.max(0, Math.min(1, tt / K.SHOT_T));
        var bd = plToward(read.shotAt, goalC, fd * plDist(read.shotAt, goalC));
        ball = { x: bd.x, y: bd.y, air: 0, shot: fd > 0 };
      } else if (tt >= release) {
        var dist = Math.min((tt - release) * read.speed, read.cut ? read.cut.s : read.passM);
        var bp = plToward(m.passer, read.to, dist);
        ball = { x: bp.x, y: bp.y, air: read.air ? Math.sin(Math.PI * Math.min(1, dist / Math.max(0.001, read.passM))) : 0 };
        if (shot && tt > read.catchT) ball = { x: carrierAt.x, y: carrierAt.y, air: 0, held: true };
        if (shot && tt > read.shotT) {
          var f2 = Math.max(0, Math.min(1, (tt - read.shotT) / K.SHOT_T));
          var bs = plToward(read.shotAt, goalC, f2 * plDist(read.shotAt, goalC));
          ball = { x: bs.x, y: bs.y, air: 0, shot: true };
        }
      }
    }
    return { t: tt, attackers: attackers, defenders: defenders, ball: ball };
  }
  // Scout grade for a concept against a shape (this formation, best pass): the model's own.
  var _plSoccerGradeMemo = {};
  function plSoccerGrade(formationId, conceptId, shapeId) {
    var key = formationId + '|' + conceptId + '|' + shapeId;
    if (_plSoccerGradeMemo[key]) return _plSoccerGradeMemo[key];
    var m = plSoccerMove(formationId, conceptId, shapeId, null);
    var bx = m.best ? m.best.xG : 0;
    var out = { grade: bx >= PL_SOCCER.GOOD_XG ? 'great' : (bx >= PL_SOCCER.FAIR_XG ? 'okay' : 'tough'), bestXG: bx,
      bestId: m.best ? m.best.id : null, bestRunnerId: m.best ? m.best.runnerId : null, shapeMatters: m.shapeMatters };
    _plSoccerGradeMemo[key] = out;
    return out;
  }
  // Camera: the slice of the pitch this move needs (meters toward the goal, x0..x1).
  function plSoccerCamera(m) {
    var minX = m.passer.x;
    m.reads.forEach(function(r) { minX = Math.min(minX, r.start.x, r.to.x); });
    var x0 = Math.max(0, Math.min(minX - 6, PITCH_LENGTH - 32));
    return { x0: x0, x1: PITCH_LENGTH + 2 };
  }
  // Pitch meters <-> canvas pixels: the goal is at the top, the right wing (small y) on the right.
  function plPitchMap(W, H, cam) {
    var span = Math.max(1, cam.x1 - cam.x0);
    var roomH = H - PL_MAP_PAD.top - PL_MAP_PAD.bottom;
    var s = Math.max(0.5, Math.min((W - 2 * PL_MAP_PAD.x) / PITCH_WIDTH, roomH / span));
    var ox = (W - PITCH_WIDTH * s) / 2;
    var oy = PL_MAP_PAD.top + (roomH - span * s) / 2 + span * s;
    return {
      s: s, ox: ox, oy: oy,
      px: function(y) { return ox + (PITCH_WIDTH - y) * s; },
      py: function(x) { return oy - (x - cam.x0) * s; }
    };
  }

  // A setup's fingerprint: same play, defense, ball spot and player spots = same setup.
  function plSetupSig(playId, coverageId, losX, customPositions) {
    var c = (customPositions && typeof customPositions === 'object') ? customPositions : {};
    var parts = Object.keys(c).sort().map(function(k) {
      return k + ':' + Math.round(Number(c[k] && c[k].x)) + ',' + Math.round(Number(c[k] && c[k].y));
    });
    return playId + '|' + coverageId + '|' + Math.round(losX) + '|' + parts.join(';');
  }
  // Camera: the slice of the field this play needs, in yards downfield (x0..x1).
  function plCamera(sim) {
    var maxX = sim.losX + 26, minX = sim.losX - 9;
    sim.offense.forEach(function(p) {
      [{ x: p.x, y: p.y }].concat(p.route || []).forEach(function(pt) {
        if (pt.x > maxX) maxX = pt.x;
        if (pt.x - 2 < minX) minX = pt.x - 2;
      });
    });
    sim.defenders.forEach(function(def) { if (def.x > maxX) maxX = def.x; });
    return { x0: Math.max(0, minX), x1: Math.min(FIELD_LENGTH, maxX + 3) };
  }
  // Field yards <-> canvas pixels for a W x H canvas. Play-art view: the offense is at
  // the bottom, downfield is up, and the left sideline (y = 53.33) is on the left. One
  // scale for both directions, so a yard is a yard everywhere on the picture.
  var PL_MAP_PAD = { x: 6, top: 34, bottom: 8 };
  function plFieldMap(W, H, cam) {
    var span = Math.max(1, cam.x1 - cam.x0);
    var roomH = H - PL_MAP_PAD.top - PL_MAP_PAD.bottom;
    var s = Math.max(0.5, Math.min((W - 2 * PL_MAP_PAD.x) / FIELD_WIDTH, roomH / span));
    var ox = (W - FIELD_WIDTH * s) / 2;
    var oy = PL_MAP_PAD.top + (roomH - span * s) / 2 + span * s;   // canvas y of cam.x0
    return {
      s: s, ox: ox, oy: oy,
      px: function(y) { return ox + (FIELD_WIDTH - y) * s; },
      py: function(x) { return oy - (x - cam.x0) * s; },
      toField: function(cx, cy) { return { x: cam.x0 + (oy - cy) / s, y: FIELD_WIDTH - (cx - ox) / s }; }
    };
  }
  // Short on-field name for a zone ("Deep half — right" -> "Deep half").
  function plZoneShort(name) {
    var n = String(name || '');
    if (n.indexOf('MLB deep') === 0) return 'Deep middle';
    if (n.indexOf('Blitz alley') === 0) return 'Blitz';
    return n.split(' — ')[0].split(' (')[0];
  }

  // What the tool exports for tests: the same functions the screen uses.
  window.StemLab.PlayLabModel = {
    constants: PL_MODEL,
    plays: PLAYS,
    coverages: COVERAGES,
    simulate: plSimulate,
    frameAt: plFrameAt,
    gradeMatchup: plGradeMatchup,
    buildOffense: plBuildOffense,
    routeLength: plRouteLength,
    pocketTime: plPocketTime,
    setupSig: plSetupSig,
    camera: plCamera,
    fieldMap: plFieldMap,
    expectedPoints: expectedPoints,
    computeEPA: computeEPA,
    drills: function() { return PLAYLAB_DRILLS; },
    soccer: function() { return { formations: SOCCER_FORMATIONS, concepts: SOCCER_CONCEPTS, shapes: SOCCER_SHAPES, moves: SOCCER_MOVES, constants: PL_SOCCER, move: plSoccerMove, frameAt: plSoccerFrameAt, grade: plSoccerGrade, camera: plSoccerCamera, pitchMap: plPitchMap, defense: plSoccerDefense, offsideLine: plSoccerLine, computeXG: computeXG, drills: PLAYLAB_SOCCER_DRILLS }; }
  };

  // One plain sentence per play and per defense, for students who do not follow the
  // sport. Each one describes what THIS model draws (tests/playlab_model.test.js checks
  // the counts and the two-second blitz against the model). The longer football notes
  // stay available under "More about this ... in real football".
  var PL_SIMPLE = {
    plays: {
      slant: 'The slot receiver (SL) runs 3 yards, then cuts hard toward the middle. A quick throw.',
      fourverts: 'Four receivers run deep, straight down the field. Look for the one a deep defender cannot reach.',
      mesh: 'Two receivers (SL and TE) cross the field in opposite directions, close to the line.',
      rpo: 'The slot receiver (SL) runs a short route toward the middle while the back runs up the middle.',
      smash: 'On the left side, one receiver stops short (W2) and one runs deep toward the corner (SL). One low, one high.',
      stick: 'The tight end (TE) runs 5 yards and turns around. A short, safe throw.',
      wildcat: 'A run. The back (RB) takes the ball and follows his blockers.',
      hailmary: 'Everyone runs as far as they can. It takes a long time, so the rush may get there first.',
      counter: 'A run. The back (RB) steps one way, then cuts the other way.',
      bootleg: 'Receivers run to three depths: short, middle and deep.',
      wheel: 'The back (RB) runs sideways, then turns up the field.',
      ycross: 'The tight end (TE) runs up 6 yards, then angles deep across the field.',
      sweep: 'A run. The back (RB) runs wide toward the sideline.',
      bubble: 'A very short, quick throw to the slot receiver (SL) near the sideline.',
      drive: 'One receiver crosses short (SL) and another cuts across deeper (W2).',
      trips: 'Three receivers start close together on the right side and split to three depths.'
    },
    coverages: {
      cover1: 'Man coverage: five defenders each copy one receiver. One safety waits deep in the middle.',
      cover2: 'Zone: two safeties split the deep field in half. Five defenders guard short areas.',
      cover3: 'Zone: three defenders split the deep field in thirds. Four guard short areas.',
      tampa2: 'Like Cover 2, but one more defender drops into the deep middle.',
      cover4: 'Zone: four defenders split the deep field. Three guard short areas.',
      cover0: 'A blitz: six defenders rush the quarterback, so the ball must be thrown within ' + PL_MODEL.POCKET.cover0 + ' seconds. The other five play man with no deep help.',
      cover6: 'Half and half: two deep defenders on the right side, one deep defender on the left.',
      robber: 'Man coverage with a deep safety, plus one extra defender waiting in the middle.'
    }
  };
  window.StemLab.PlayLabModel.simple = PL_SIMPLE;
  // Soccer in plain words, true to the soccer model. {line} = meters from their goal to
  // their offside line, {step} = how far the trap steps up: both filled in from the model.
  // The longer notes (real teams and coaches) stay under "More about this in real soccer".
  var PL_SOCCER_WORDS = {
    concepts: {
      tikitaka: 'Short passes get the ball to a playmaker just in front of their back line. Then you choose the last pass.',
      counter: 'You win the ball deep in your own half. One long pass forward, at once, before they get back.',
      gegenpress: 'You win the ball back close to their goal. Pass at once to a runner, or shoot.',
      'corner-in': 'A corner from the left that curls toward the goal. Three teammates run to three spots. A header counts half.',
      'corner-out': 'A corner from the right that curls away from the goal. Runners arrive from outside the box.',
      'corner-short': 'A short pass from the corner to a teammate close by, then a cross or a pass back.',
      'freekick-direct': 'A free kick 22 m out, in front of goal. Shoot over the wall, pass sideways, or chip it to the far post.',
      'freekick-cross': 'A free kick from wide on the left. Cross it to a runner. Offside still counts at a free kick.',
      'throwin-long': 'A long throw from the right sideline into the box. There is no offside from a throw-in.',
      'throwin-buildup': 'A short throw to a teammate, then a pass forward. Offside counts on that pass.',
      penalty: 'A shot from the penalty spot, 11 m out, with only the keeper to beat.',
      'goalkick-long': 'The keeper kicks it long to the striker, who heads it on to a runner.',
      'goalkick-short': 'Short passes from the keeper through the defenders to a midfielder, then a pass forward.'
    },
    shapes: {
      highpress: 'Their back line stands {line} m from their goal, so there is a lot of space behind it.',
      midblock: 'Their back line stands {line} m from their goal, with the midfield in front of it.',
      lowblock: 'Everyone is back near their own goal. The back four stand {line} m out, close together.',
      offsidetrap: 'A flat back line {line} m from their goal. As a pass is played, the line steps up {step} m together to catch runners offside.'
    },
    // The words on each pass button (by option id; "concept:option" wins over "option").
    options: {
      behind: 'runs in behind', inside: 'cuts inside', late: 'late run from midfield', over: 'long ball over the top',
      right: 'runs down the right', left: 'runs down the left', quick: 'quick pass in behind', wide: 'runs wide',
      shoot: 'shoots at once', near: 'near post', far: 'far post', spot: 'penalty spot', edge: 'edge of the box',
      cutback: 'pass back to the edge of the box', cross: 'cross to the middle', overlap: 'runs past on the outside',
      direct: 'shoots over the wall', square: 'short pass sideways', chip: 'chip to the far post',
      giveandgo: 'one-two down the line', middle: 'runs into the middle', layoff: 'lay-off to midfield',
      'penalty:spot': 'takes the penalty', 'goalkick-long:right': 'flick-on to the right', 'goalkick-long:left': 'flick-on to the left'
    }
  };
  function plSoccerOptWord(conceptId, optId) {
    return PL_SOCCER_WORDS.options[conceptId + ':' + optId] || PL_SOCCER_WORDS.options[optId] || optId;
  }
  function plSoccerShapeWords(shapeId) {
    var line = plSoccerLine(buildSoccerDefenders(shapeId));
    return String(PL_SOCCER_WORDS.shapes[shapeId] || '').split('{line}').join(String(Math.round(PITCH_LENGTH - line)))
      .split('{step}').join(String(PL_SOCCER.TRAP_STEP));
  }
  window.StemLab.PlayLabModel.soccerWords = { words: PL_SOCCER_WORDS, option: plSoccerOptWord, shape: plSoccerShapeWords };

  // Notes ("teach") describe what THIS model does; "real" holds the real-game history, shown
  // only under an "In real football / soccer" label. {name} = a number taken from the model.
  function plNote(text) {
    var map = {
      pocket: PL_MODEL.POCKET.zone.toFixed(1), pocket0: PL_MODEL.POCKET.cover0.toFixed(1),
      snap: PL_MODEL.SNAP_TO_THROW.toFixed(1), react: PL_MODEL.REACT.toFixed(1),
      mirror: String(Math.round(PL_MODEL.MIRROR * 100)), def: String(PL_MODEL.DEF_SPEED),
      sdef: String(PL_SOCCER.DEF), sreact: PL_SOCCER.REACT.toFixed(1), step: String(PL_SOCCER.TRAP_STEP),
      pen: String(Math.round(PL_SOCCER.PENALTY_XG * 100))
    };
    return String(text == null ? '' : text).replace(/\{(\w+)\}/g, function(m, k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : m; });
  }

  // ── MYSTERY DEFENSE: the pre-snap read ──
  // What a quarterback can see before the snap, measured on the model's own starting spots:
  // which receivers have a defender lined up right in front of them (within OVER_Y yards to
  // the side and OVER_X yards downfield), how many defenders start DEEP yards or more past the
  // line, and how many line up to rush. In man coverage every receiver has one (the defender
  // lines up on his man); zone defenders line up on areas, so at most two by chance
  // (tests/playlab_round3.test.js checks all 16 plays x 8 defenses).
  var PL_PRESNAP = { OVER_Y: 1.5, OVER_X: 7, DEEP: 15 };
  var _plFamilyMemo = {};
  function plCoverageFamily(coverageId) {
    if (!_plFamilyMemo[coverageId]) {
      _plFamilyMemo[coverageId] = buildDefenders(coverageId, LOS_DEFAULT, defaultFormation(LOS_DEFAULT))
        .some(function(dd) { return !!dd.assign; }) ? 'man' : 'zone';
    }
    return _plFamilyMemo[coverageId];
  }
  function plPreSnapRead(sim) {
    var los = sim.losX;
    var over = sim.offense.filter(function(p) { return p.id === 'WR1' || p.id === 'WR2' || p.id === 'SLOT' || p.id === 'TE'; }).map(function(r) {
      var best = null;
      sim.defenders.forEach(function(dd) {
        if (plDefenderMode(dd, sim.offense) === 'rush') return;   // the rushers line up on the blockers
        var dy = Math.abs(dd.y - r.y), dx = dd.x - r.x;
        if (dx > 0 && dx <= PL_PRESNAP.OVER_X && dy <= PL_PRESNAP.OVER_Y && (!best || dy < best.dy || (dy === best.dy && dx < best.dx))) {
          best = { id: dd.id, dx: dx, dy: dy, x: dd.x, y: dd.y };
        }
      });
      return { id: r.id, x: r.x, y: r.y, def: best };
    });
    var deep = sim.defenders.filter(function(dd) { return dd.x - los >= PL_PRESNAP.DEEP; });
    var lurkers = sim.defenders.filter(function(dd) { var k = dd.x - los; return k >= 9 && k < PL_PRESNAP.DEEP && Math.abs(dd.y - FIELD_WIDTH / 2) <= 6; });
    var rushers = sim.defenders.filter(function(dd) { return plDefenderMode(dd, sim.offense) === 'rush'; }).length;
    return {
      coverageId: sim.coverageId, family: plCoverageFamily(sim.coverageId), over: over,
      overCount: over.filter(function(o) { return !!o.def; }).length, receivers: over.length,
      deep: deep, deepCount: deep.length, lurkers: lurkers, rushers: rushers, losX: los
    };
  }
  // What gives each defense away before the snap, in this lab's own alignments.
  var PL_MYSTERY_CUES = {
    cover1: 'Man: a defender lined up right in front of each receiver, and one safety deep in the middle.',
    cover0: 'Man, and close: the defenders stand only a step or two in front of the wide receivers and the slot, nobody is deep, and six defenders line up to rush.',
    robber: 'Man: a defender in front of each receiver and one safety deep, plus one more defender waiting in the middle about 11 yards back.',
    cover2: 'Zone: the defenders spread out to guard areas instead of lining up on receivers, and two safeties start deep, one on each half.',
    cover3: 'Zone: the defenders spread out to guard areas, and three start deep, evenly spaced: one in each third.',
    tampa2: 'Zone: the defenders spread out to guard areas, and three start deep: two safeties on the halves and a linebacker between them, a little closer. Before the snap it looks a lot like Cover 3.',
    cover6: 'Zone: the defenders spread out to guard areas, and three start deep but not evenly: two close together on the right, one alone on the left.',
    cover4: 'Zone: the defenders spread out to guard areas, and four start deep, side by side.'
  };

  // ── Labels that stay off the players ──
  // The first candidate box ({ cx, cy } = its center) that fits inside `bounds` and touches no
  // obstacle (all { x, y, w, h } in canvas pixels), or null: a label with nowhere to go is left
  // off the picture (its words are in the key under the field).
  function plRectsOverlap(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
  function plFreeSpot(cands, w, h, obstacles, bounds) {
    for (var i = 0; i < cands.length; i++) {
      var r = { x: cands[i].cx - w / 2, y: cands[i].cy - h / 2, w: w, h: h };
      if (bounds && (r.x < bounds.x || r.y < bounds.y || r.x + w > bounds.x + bounds.w || r.y + h > bounds.y + bounds.h)) continue;
      var hit = false;
      for (var j = 0; j < obstacles.length && !hit; j++) if (plRectsOverlap(r, obstacles[j])) hit = true;
      if (!hit) return r;
    }
    return null;
  }
  window.StemLab.PlayLabModel.scenarios = PLAYLAB_SCENARIOS;
  window.StemLab.PlayLabModel.note = plNote;
  window.StemLab.PlayLabModel.presnap = plPreSnapRead;
  window.StemLab.PlayLabModel.family = plCoverageFamily;
  window.StemLab.PlayLabModel.mysteryCues = PL_MYSTERY_CUES;
  window.StemLab.PlayLabModel.freeSpot = plFreeSpot;

  // ═══════════════════════════════════════════
  // TOOL REGISTRATION
  // ═══════════════════════════════════════════
  // ── Accents that follow the SUBSTRATE ──────────────────────────────────────
  // The accent hues are bright, tuned for the dark canvas. Their panels are ALPHA
  // tints over the tool root, so they composite dark in dark theme and pale in light
  // -- rgba(16,185,129,0.18) becomes #d4f2e8 on white. That left #fbbf24 at 1.59:1,
  // #10b981 at 2.13:1, #a78bfa at 2.48:1 and #16a34a at 2.88:1 on the light side,
  // while dark measured clean. Map each to a deeper partner when the substrate is
  // light; contrast mode collapses to the theme's yellow.
  var PLAYLAB_LIGHT_INK = {
    '#fbbf24': '#b45309', '#f59e0b': '#b45309', '#10b981': '#047857',
    '#34d399': '#047857', '#a78bfa': '#6d28d9', '#16a34a': '#166534',
    '#dc2626': '#b91c1c', '#22c55e': '#166534', '#a5b4fc': '#4338ca',
    '#d946ef': '#a21caf', '#ef4444': '#b91c1c'
  };
  var PLAYLAB_DARK_INK = { '#dc2626': '#f87171', '#d946ef': '#f0abfc', '#ef4444': '#fca5a5' };
  function playlabInk(hex, isDark, isContrast) {
    if (isContrast) return '#ffff00';
    if (typeof hex !== 'string') return hex;
    if (isDark) return PLAYLAB_DARK_INK[hex.toLowerCase()] || hex;
    return PLAYLAB_LIGHT_INK[hex.toLowerCase()] || hex;
  }

  function _plAiUsable(kind, fn) {
    if (typeof fn !== 'function') return false;
    if (fn._alloQrBlocked) return false;
    if (typeof window !== 'undefined') {
      if (window.__alloStudentAiDisabled || window.__alloAiSecretsLocked) return false;
      if (typeof window.__alloAiUsable === 'function') {
        try { if (!window.__alloAiUsable(kind || 'text', fn)) return false; } catch (e) { return false; }
      }
    }
    return true;
  }

  function _plExtractAiText(resp) {
    if (resp == null) return '';
    if (typeof resp === 'string') return resp.trim();
    if (typeof resp === 'object') {
      if (typeof resp.text === 'string') return resp.text.trim();
      if (resp.candidates && resp.candidates[0] && resp.candidates[0].content && Array.isArray(resp.candidates[0].content.parts)) {
        var joined = resp.candidates[0].content.parts.map(function(part) {
          return (part && typeof part.text === 'string') ? part.text : '';
        }).join('').trim();
        if (joined) return joined;
      }
      if (typeof resp.output === 'string') return resp.output.trim();
      if (typeof resp.message === 'string') return resp.message.trim();
    }
    return '';
  }

  window.StemLab.registerTool('playlab', {
    icon: '🏈',
    label: 'PlayLab',
    desc: 'Football play-design: route geometry, coverage zones, open-receiver analysis',
    color: 'lime',
    category: 'science',
    gradeRange: '5-12',
    questHooks: [
      { id: 'pl_load_3_plays',
        label: 'Study 3 different plays',
        icon: '📋',
        check: function(d) { return (d.playsViewed && Object.keys(d.playsViewed).length >= 3); },
        progress: function(d) { return ((d.playsViewed && Object.keys(d.playsViewed).length) || 0) + ' / 3 plays'; } },
      { id: 'pl_try_each_coverage',
        label: 'See every coverage',
        icon: '🛡️',
        check: function(d) { return (d.coveragesViewed && Object.keys(d.coveragesViewed).length >= COVERAGES.length); },
        progress: function(d) { return ((d.coveragesViewed && Object.keys(d.coveragesViewed).length) || 0) + ' / ' + COVERAGES.length + ' coverages'; } }
    ],
    render: function(ctx) {
      var tint = function (c) { return playlabInk(c, !!ctx.isDark, !!ctx.isContrast); };
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var addToast = ctx.addToast;
      var callGemini = ctx.callGemini;
      var awardXP = ctx.awardXP;
      // Never bound, yet used in 12 places as `if (celebrate) celebrate()`.
      // That reads as defensive but is not: a bare reference to an undeclared
      // name throws inside the if() itself — only typeof tolerates one. So the
      // celebration paths threw instead of silently skipping.
      var celebrate = ctx.celebrate;

      // State init
      // Seed defaults, but DO NOT early-return a Loading screen: this render calls
      // hooks (useRef/useState/useEffect) below, so a conditional early-return changes
      // the hook count between the empty and seeded renders and throws "Rendered more
      // hooks than during the previous render" on that transition (the bucket is not
      // persisted, so it is empty on every reload). Seed and fall through; the body
      // reads state only via the local `d`. (Rules-of-Hooks fix, 2026-06-20.)
      var PLAYLAB_DEFAULTS = {
            // Sport mode — toggle between American football + soccer.
            // Each sport has its own field, formations/plays, defensive
            // shapes, and visual scale (yards vs meters). State for both
            // sports lives in the same object since switching modes is
            // expected to be common (a coach explores both).
            sport: 'football',
            // Soccer state
            formationId: '433',
            conceptId: 'tikitaka',
            shapeId: 'midblock',
            showXG: false,             // expected-goals heatmap overlay (soccer only)
            // Saved plays — student-designed plays (drag-edited or
            // formation/concept tweaks) named and stored. Each entry
            // captures sport + base preset + custom positions so loading
            // restores the exact view. Lives in d so the harness's
            // localStorage persists it across sessions automatically.
            savedPlays: [],
            savePromptOpen: false,
            savePromptName: '',
            // Football state
            playId: 'slant',
            coverageId: 'cover1',
            // Who the student has chosen to throw to (null = not chosen yet). Picking a
            // target IS the prediction: it is made before the play runs.
            targetId: null,
            // revealSig: the setup whose film room is unlocked. seenRuns: calls already
            // credited (a repeat earns nothing). scouted: matchups run, for the Scout map.
            revealSig: '',
            seenRuns: {},
            scouted: {},
            // Down + distance — fed into the EPA calculation. Defaults to
            // 1st-and-10 from the offense's own 25-yard line (75 yd to goal,
            // 1.4 EP) which is the textbook starting point.
            down: 1,
            yardsToGoal: 75,
            losX: LOS_DEFAULT,
            showZones: true,
            showRoutes: true,
            showOpen: true,
            playsViewed: { slant: true },
            coveragesViewed: { cover1: true },
            // Custom-play overrides — when the student drags players,
            // their new (x, y) positions land here keyed by player id.
            // null entry = follow the play's preset position. Cleared
            // when a different play preset is loaded.
            customPositions: {},
            // Coach Mode — Gemini-powered analysis of the active play
            // against the active coverage. Same shape as ThrowLab's coach.
            coachLoading: false,
            coachReply: '',
            coachError: '',
            // Animated simulation — driven by an rAF loop in a separate
            // useEffect. runT is seconds since the snap, on the model's own clock
            // (the play ends at sim.outcome.endT: the catch, the tackle or the sack).
            runActive: false,
            runT: 0,
            runOutcome: null,           // { receiverId, location: 'caught' | 'broken-up' | 'incomplete', etc. }
            // Drills — coordinator challenge sequence. Stats accumulate
            // from animated "Run Play" outcomes so the student has to
            // actually execute, not just stare at the field.
            drillActive: false,
            drillTaskIdx: 0,
            drillStats: {
              // Football
              coveragesBeaten: 0,
              coveragesBeatenSet: {},
              completionsByPlay: {},
              smashVsCover2: false,
              c0WithHot: false,
              c6WithTrips: false,
              robberWithMesh: false,
              completedCustomPlay: false,
              // Soccer
              highXgShot: false,
              conceptsRun: {},
              shapesPlayed: {},
              customHighXg: false,
              setPieceRun: false,
              setPieceTypesRun: {}
            }
          };
      var rawPl = (labToolData && typeof labToolData === 'object') ? labToolData.playlab : null;
      var needsSeed = !rawPl || typeof rawPl !== 'object' || Array.isArray(rawPl);
      var d = !needsSeed ? rawPl : PLAYLAB_DEFAULTS;
      var workspaceTab = (d.workspaceTab === 'scout' || d.workspaceTab === 'field') ? d.workspaceTab : 'field';
      // Missions are ON by default for a student and OFF (free play) for a teacher. The
      // student's own switch (missionsChoice) wins; an older save with missions running stays on.
      var missionsOn = d.missionsChoice === 'on' || (d.missionsChoice !== 'off' && (!!d.drillActive || ctx.isTeacherMode !== true));
      // The current mission is the first one not done yet (progress lives in drillStats, so
      // switching sports or turning missions off and on never loses it).
      function plFirstOpenTask(set, stats) {
        var i = 0;
        while (i < set.tasks.length && set.tasks[i].test(stats || {})) i++;
        return i;
      }
      var plAiOn = ctx.aiAvailable !== false && _plAiUsable('text', callGemini);
      var patchPlayLab = function(updaterOrPatch) {
        if (typeof setLabToolData !== 'function') return;
        setLabToolData(function(prev) {
          var basePrev = (prev && typeof prev === 'object' && !Array.isArray(prev)) ? prev : {};
          var prevPl = (basePrev.playlab && typeof basePrev.playlab === 'object' && !Array.isArray(basePrev.playlab)) ? basePrev.playlab : PLAYLAB_DEFAULTS;
          var nextPl = (typeof updaterOrPatch === 'function')
            ? updaterOrPatch(prevPl)
            : Object.assign({}, prevPl, updaterOrPatch);
          return Object.assign({}, basePrev, { playlab: nextPl });
        });
      };
      var upd = function(key, val) {
        patchPlayLab(function(prevPl) {
          var next = Object.assign({}, prevPl); next[key] = val;
          return next;
        });
      };

      // ── Play Catalog: cross-session mastery of plays run for completions ──
      // Like ThrowLab's Pitch Locker — persistent across reloads / Canvas
      // sessions. First-completion of each play (by id) locks it in with a
      // timestamp + sport tag. Subsequent completions increment counts but
      // don't re-fire the celebration.
      var _plHydrated = React.useRef(false);
      var mountedRef = React.useRef(true);
      var plTimersRef = React.useRef([]);
      var hypePhraseRef = React.useRef(null);
      if (hypePhraseRef.current === null) hypePhraseRef.current = pickHypePhrase();
      function schedulePlTimer(fn, ms) {
        var id = setTimeout(function() {
          var idx = plTimersRef.current.indexOf(id);
          if (idx !== -1) plTimersRef.current.splice(idx, 1);
          if (!mountedRef.current) return;
          fn();
        }, ms);
        plTimersRef.current.push(id);
        return id;
      }
      React.useEffect(function() {
        mountedRef.current = true;
        return function() {
          mountedRef.current = false;
          plTimersRef.current.forEach(function(id) { clearTimeout(id); });
          plTimersRef.current = [];
        };
      }, []);
      React.useEffect(function() {
        if (needsSeed) {
          patchPlayLab(function(prevPl) {
            return (prevPl && prevPl !== PLAYLAB_DEFAULTS) ? prevPl : PLAYLAB_DEFAULTS;
          });
        }
        if (!_plHydrated.current) {
          _plHydrated.current = true;
          try {
            var winSt = (typeof window !== 'undefined' && window.__alloflowPlayLab) || null;
            var lsSt = null;
            try { lsSt = JSON.parse(localStorage.getItem('playlab.state.v1') || 'null'); } catch (e) {}
            var seed = winSt || lsSt || null;
            if (seed && typeof seed === 'object' && seed.playCatalog && !d.playCatalog) {
              patchPlayLab({ playCatalog: seed.playCatalog });
            }
          } catch (e) {}
        }
      }, []);
      // First-completion celebration state.
      var _plCeleb = React.useState(null);
      var plCeleb = _plCeleb[0];
      var setPlCeleb = _plCeleb[1];
      // Mirror persistent slice to window slot + localStorage.
      React.useEffect(function () {
        try {
          var snapshot = { playCatalog: d.playCatalog || {}, _ts: Date.now() };
          window.__alloflowPlayLab = snapshot;
          try { localStorage.setItem('playlab.state.v1', JSON.stringify(snapshot)); } catch (e) {}
        } catch (e) {}
      }, [d.playCatalog]);
      // Hot-reload from project-JSON load mid-session.
      React.useEffect(function () {
        function onRestore() {
          try {
            var w = window.__alloflowPlayLab || {};
            if (w.playCatalog) {
              patchPlayLab({ playCatalog: w.playCatalog });
            }
          } catch (e) {}
        }
        window.addEventListener('alloflow-playlab-restored', onRestore);
        return function () { window.removeEventListener('alloflow-playlab-restored', onRestore); };
      }, []);

      var isSoccer = d.sport === 'soccer';
      // Soccer-derived vars (only meaningful when isSoccer === true). They
      // shadow into the same `formation` / `defenders` slots so downstream
      // code (canvas, etc.) reads from one source of truth.
      var formationDef = SOCCER_FORMATIONS.find(function(f) { return f.id === d.formationId; }) || SOCCER_FORMATIONS[0];
      var concept = SOCCER_CONCEPTS.find(function(c) { return c.id === d.conceptId; }) || SOCCER_CONCEPTS[0];
      var soccerShape = SOCCER_SHAPES.find(function(s) { return s.id === d.shapeId; }) || SOCCER_SHAPES[0];
      // ONE soccer model call per render. The pitch, the pass buttons, the verdict, the film
      // room, the Scout map and the missions all read soccerMove.
      var soccerMove = plSoccerMove(formationDef.id, concept.id, soccerShape.id, d.soccerOptId || null);
      var soccerKey = 'soccer|' + formationDef.id + '|' + concept.id + '|' + soccerShape.id;
      var soccerRunKey = soccerKey + '|' + (soccerMove.read ? soccerMove.read.id : '');
      // The film room (every pass, with its numbers) opens only for a setup already run.
      var soccerRevealed = isSoccer && d.revealSig === soccerKey;
      // The result on screen belongs to this exact setup and pass.
      var soccerLive = (isSoccer && d.runOutcome && d.runOutcome.sport === 'soccer' && d.runOutcome.runKey === soccerRunKey && soccerMove.outcome) ? d.runOutcome : null;
      var play = PLAYS.find(function(p) { return p.id === d.playId; }) || PLAYS[0];
      // Mystery defense: the play runs against a hidden defense (d.mysteryCovId). The student's
      // own pick (d.coverageId) is kept for when the mode is turned off. Until the round's play
      // has been run (mysterySolved), nothing on screen may name or draw that defense.
      var mysteryCov = (!isSoccer && d.mysteryOn) ? COVERAGES.find(function(c) { return c.id === d.mysteryCovId; }) : null;
      var mysteryOn = !!mysteryCov;
      var mysteryHidden = mysteryOn && !d.mysterySolved;
      var coverage = mysteryCov || COVERAGES.find(function(c) { return c.id === d.coverageId; }) || COVERAGES[0];
      var covName = mysteryHidden ? __alloT('stem.playlab.mystery_def_name', 'the mystery defense') : coverage.label;
      var safeLosX = Number.isFinite(Number(d.losX))
        ? Math.max(END_ZONE_DEPTH, Math.min(FIELD_LENGTH - END_ZONE_DEPTH, Number(d.losX)))
        : LOS_DEFAULT;
      // Build the base formation, apply any custom drag overrides FIRST,
      // then run the play's routes against the (possibly moved) snap
      // positions — so a dragged WR's route still starts from where they
      // are now.
      var safeCustomPositions = (d.customPositions && typeof d.customPositions === 'object' && !Array.isArray(d.customPositions)) ? d.customPositions : {};
      // ONE model call per render. The field, the verdict, the film room, the missions
      // and the coach prompt all read `sim`; nothing else decides who is open.
      var sim = plSimulate({ playId: play.id, coverageId: coverage.id, losX: safeLosX, customPositions: safeCustomPositions, targetId: d.targetId });
      var rawFormation = sim.offense;
      var formation = isSoccer ? soccerMove.attackers : sim.offense;
      var zones = isSoccer ? [] : buildZones(coverage.id, safeLosX);
      var defenders = isSoccer ? soccerMove.defenders : sim.defenders;
      // A setup = play + defense + ball spot + where the players stand. The film room
      // (who was open, by how much) unlocks only for a setup the student has run, so the
      // answer is never on screen before the throw.
      var setupSig = plSetupSig(play.id, coverage.id, safeLosX, safeCustomPositions);
      var runKey = setupSig + '|' + (sim.outcome ? sim.outcome.receiverId : '');
      var revealed = !isSoccer && d.revealSig === setupSig;
      var analysis = isSoccer ? [] : sim.reads;
      var openReceiverId = (revealed && sim.best) ? sim.best.id : null;
      // Yards to the goal line come from where the ball is, so the field and the
      // "yards to goal" box can never disagree.
      var ytgNow = Math.max(1, Math.round(FIELD_LENGTH - END_ZONE_DEPTH - safeLosX));
      // The result on screen belongs to this exact call (same setup, same target).
      var liveOutcome = (!isSoccer && d.runOutcome && d.runOutcome.runKey === runKey && sim.outcome) ? d.runOutcome : null;
      // The pre-snap picture, measured (Mystery defense: the cue, and the words for the field's
      // text alternative, which describe what the picture shows, never the defense's name).
      var mysteryRead = mysteryOn ? plPreSnapRead(sim) : null;
      var mysteryPictureText = mysteryRead ? plFill(__alloT('stem.playlab.mystery_picture', 'Before the snap, {over} of {n} receivers have a defender lined up right in front of them, {deep} defenders stand 15 or more yards deep, and {rush} line up to rush'),
        { over: mysteryRead.overCount, n: mysteryRead.receivers, deep: mysteryRead.deepCount, rush: mysteryRead.rushers }) : '';
      var PL_CODE = PL_SHORT;
      var PL_NAME = {
        WR1: __alloT('stem.playlab.name_wr1', 'wide receiver, right side'),
        WR2: __alloT('stem.playlab.name_wr2', 'wide receiver, left side'),
        SLOT: __alloT('stem.playlab.name_slot', 'slot receiver'),
        TE: __alloT('stem.playlab.name_te', 'tight end'),
        RB: __alloT('stem.playlab.name_rb', 'running back'),
        QB: __alloT('stem.playlab.name_qb', 'quarterback')
      };
      function plFill(text, map) {
        var out = String(text);
        Object.keys(map).forEach(function(k) { out = out.split('{' + k + '}').join(String(map[k])); });
        return out;
      }
      function plNum(v) { return (Math.round(Number(v) * 10) / 10).toFixed(1); }
      function plWho(id) { return (PL_CODE[id] || id); }
      function plDefName(n) {
        if (!n) return __alloT('stem.playlab.def_nobody', 'no defender');
        if (n.mode === 'man') return plFill(__alloT('stem.playlab.def_man', 'the defender covering {who}'), { who: plWho(n.assign) });
        return plFill(__alloT('stem.playlab.def_zone', 'the {zone} defender'), { zone: plZoneShort(n.zoneName || 'zone').toLowerCase() });
      }
      // One sentence: what happened. Built from the model outcome only.
      function plVerdictText(o) {
        if (!o) return '';
        var who = plWho(o.receiverId);
        if (o.type === 'sack') return plFill(__alloT('stem.playlab.verdict_sack', 'Sack. The rush got to the quarterback first. Loss of {yards} yards.'), { yards: Math.abs(o.yards) });
        if (o.type === 'brokenup') return plFill(__alloT('stem.playlab.verdict_covered', 'Covered. The pass to {who} is knocked away.'), { who: who });
        if (o.type === 'run') {
          return o.yards > 0
            ? plFill(__alloT('stem.playlab.verdict_run', '{who} runs for {yards} yards.'), { who: who, yards: o.yards }) + (o.touchdown ? ' ' + __alloT('stem.playlab.verdict_touchdown', 'Touchdown!') : (o.firstDown ? ' ' + __alloT('stem.playlab.verdict_first_down', 'First down!') : ''))
            : plFill(__alloT('stem.playlab.verdict_run_stopped', '{who} is stopped for no gain.'), { who: who });
        }
        return (o.yards > 0
          ? plFill(__alloT('stem.playlab.verdict_complete', 'Complete to {who} for {yards} yards.'), { who: who, yards: o.yards })
          : plFill(__alloT('stem.playlab.verdict_complete_no_gain', 'Complete to {who}, but no gain.'), { who: who }))
          + (o.touchdown ? ' ' + __alloT('stem.playlab.verdict_touchdown', 'Touchdown!') : (o.firstDown ? ' ' + __alloT('stem.playlab.verdict_first_down', 'First down!') : ''));
      }
      // One or two sentences: WHY, in yards and seconds. Same numbers the field drew.
      function plWhyText(read) {
        if (!read) return '';
        if (read.run) {
          if (read.scored) {
            return plFill(__alloT('stem.playlab.why_run_scored', 'The runner crossed the goal line {yards} yards from where the play started, before any free defender could reach his path. Blockers took {blocked} defenders out of the play.'),
              { yards: Math.max(0, read.yards), blocked: Object.keys(read.blocked || {}).length });
          }
          return read.tackled
            ? plFill(__alloT('stem.playlab.why_run_tackled', 'A free defender ({role}) reached the runner’s path first, {yards} yards past the line. Blockers took {blocked} defenders out of the play.'),
                { role: read.tacklerRole, yards: Math.max(0, read.yards), blocked: Object.keys(read.blocked || {}).length })
            : plFill(__alloT('stem.playlab.why_run_free', 'Every defender who could reach the path was blocked or too far away. Blockers took {blocked} defenders out of the play.'),
                { blocked: Object.keys(read.blocked || {}).length });
        }
        if (read.sacked) {
          return plFill(__alloT('stem.playlab.why_sack', 'This route is {route} yards. The ball could not leave until {release} s, but the rush arrives in {pocket} s.'),
            { route: plNum(read.routeYd), release: plNum(read.release), pocket: plNum(read.pocket) });
        }
        var n = read.nearest;
        var need = plNum(PL_MODEL.OPEN_YD);
        if (n && n.mode === 'man') {
          return plFill(__alloT('stem.playlab.why_man', 'The ball flew {throw} yards in {flight} s. {def} copies each step {react} s late, so the gap at the catch was {gap} yards. A catch needs {need}.'),
            { 'throw': plNum(read.throwYd), flight: plNum(read.flight), def: plDefName(n).replace(/^t/, 'T'), react: plNum(PL_MODEL.REACT), gap: plNum(read.gapYd), need: need });
        }
        return plFill(__alloT('stem.playlab.why_zone', 'The ball flew {throw} yards in {flight} s. {def} was {start} yards away at the throw and closed {closed} yards, so the gap at the catch was {gap} yards. A catch needs {need}.'),
          { 'throw': plNum(read.throwYd), flight: plNum(read.flight), def: plDefName(n).replace(/^t/, 'T'), start: plNum(n ? n.startGap : 0), closed: plNum(n && n.closed ? n.closed : 0), gap: plNum(read.gapYd), need: need });
      }
      // The read the student did not make (shown only after the play).
      function plBestText(o) {
        if (!o || sim.isRun) return '';
        if (o.isBest) return __alloT('stem.playlab.best_was_yours', 'That was the best read on this play.');
        if (o.bestId) return plFill(__alloT('stem.playlab.best_other', 'Best read: {who} was open for {yards} yards.'), { who: plWho(o.bestId), yards: o.bestYards });
        return __alloT('stem.playlab.best_none', 'No receiver was open on this play. Try a different play against this defense.');
      }
      // ── Soccer: the same three sentences, from soccerMove only ──
      function plSoccerRole(role) {
        return role === 'GK' ? __alloT('stem.playlab.s_role_gk', 'keeper') : role === 'MID' ? __alloT('stem.playlab.s_role_mid', 'midfielder')
          : role === 'FWD' ? __alloT('stem.playlab.s_role_fwd', 'forward') : __alloT('stem.playlab.s_role_def', 'defender');
      }
      function plSoccerVerdict(o) {
        if (!o) return '';
        if (o.type === 'offside') return plFill(__alloT('stem.playlab.s_verdict_offside', 'Offside! {who} was past the line when the pass was played. No shot.'), { who: o.runnerId });
        if (o.type === 'cut') return plFill(__alloT('stem.playlab.s_verdict_cut', 'Cut out. The {def} got to the ball before {who}.'), { def: plSoccerRole(o.cutRole), who: o.runnerId });
        return plFill(__alloT('stem.playlab.s_verdict_shot', '{who} shoots: a chance worth xG {xg}.'), { who: o.runnerId, xg: o.xG.toFixed(2) });
      }
      function plSoccerWhy(r) {
        if (!r) return '';
        var K = PL_SOCCER;
        if (r.type === 'offside') {
          return plFill(__alloT('stem.playlab.s_why_offside', 'When {passer} passed ({t} s), {who} was {by} m nearer their goal than the second-last defender{trap}. In their half, a runner must not be nearer their goal than both the ball and that defender.'),
            { passer: soccerMove.passer.id, t: plNum(r.release), who: r.runnerId, by: plNum(r.offside.by),
              trap: soccerMove.trap ? plFill(__alloT('stem.playlab.s_why_trap', ' (the trap had just stepped up {step} m)'), { step: K.TRAP_STEP }) : '' });
        }
        if (r.type === 'cut') {
          var c = r.cut;
          return c.lane
            ? plFill(__alloT('stem.playlab.s_why_cut_lane', 'The ball needed {tb} s to reach the spot where the {def} cut it out. He got there in {td} s: {react} s to react, then {dist} m at {spd} m/s.'),
                { tb: plNum(c.tBall), def: plSoccerRole(c.role), td: plNum(c.tDef), react: plNum(c.tDef - c.distM / K.DEF), dist: plNum(c.distM), spd: K.DEF })
            : plFill(__alloT('stem.playlab.s_why_cut_spot', '{who} needed {rt} s to reach the ball after the pass. The {def} needed only {td} s: {react} s to react, then {dist} m at {spd} m/s.'),
                { who: r.runnerId, rt: plNum(c.runnerT), def: plSoccerRole(c.role), td: plNum(c.tDef), react: plNum(c.tDef - c.distM / K.DEF), dist: plNum(c.distM), spd: K.DEF });
        }
        var parts = [];
        if (r.penalty) {
          parts.push(plFill(__alloT('stem.playlab.s_why_penalty', 'In real top leagues about {n} penalties in 100 score. This lab uses that number; it is not worked out on the pitch.'), { n: Math.round(K.PENALTY_XG * 100) }));
          return parts.join(' ');
        }
        if (!r.direct) {
          parts.push(plFill(__alloT('stem.playlab.s_why_run', '{who} ran {run} m in {rt} s. The pass flew {pass} m in {fl} s.'),
            { who: r.runnerId, run: plNum(r.runM), rt: plNum(r.runT), pass: plNum(r.passM), fl: plNum(r.flight) }));
        }
        if (r.carryM > 0.5) {
          var stopper = null;
          (r.chasers || []).forEach(function(cc) { if (cc.id === r.stoppedBy) stopper = cc; });
          parts.push(plFill(stopper
            ? __alloT('stem.playlab.s_why_carry_stop', 'Then he ran {carry} m with the ball, until a {def} came within {r} m.')
            : __alloT('stem.playlab.s_why_carry_free', 'Then he ran {carry} m with the ball, to {sm} m from goal.'),
            { carry: plNum(r.carryM), def: stopper ? plSoccerRole(stopper.role) : '', r: K.PRESS_M, sm: K.SHOOT_M }));
        }
        parts.push(plFill(__alloT('stem.playlab.s_why_spot', 'He shot from {dist} m out, where a shot is worth {base}.'), { dist: plNum(r.goalDist), base: r.baseXG.toFixed(2) }));
        if (r.header) parts.push(__alloT('stem.playlab.s_why_header', 'A header counts half.'));
        if (r.wall) parts.push(__alloT('stem.playlab.s_why_wall', 'The wall counts half.'));
        if (r.pressers.length) parts.push(plFill(__alloT('stem.playlab.s_why_press', 'Defenders within {r} m of him: {n}. Each one halves the chance.'), { r: K.PRESS_M, n: r.pressers.length }));
        else parts.push(plFill(__alloT('stem.playlab.s_why_free', 'No defender was within {r} m of him.'), { r: K.PRESS_M }));
        return parts.join(' ');
      }
      // "In real football:" / "In real soccer:": the real-game history, set apart from the
      // model-true text, because this lab's model does not produce those facts.
      function plRealAside(text, soccerSide, key) {
        if (!text) return null;
        return h('aside', { key: key, className: 'playlab-real-aside', 'data-playlab-real': 'true' },
          h('b', null, soccerSide ? __alloT('stem.playlab.in_real_soccer', 'In real soccer:') : __alloT('stem.playlab.in_real_football', 'In real football:')), ' ', text,
          h('div', { className: 'playlab-teach-note' }, __alloT('stem.playlab.real_note_v2', 'This part is about real games. The lab uses a simple model, so its results can differ.')));
      }
      // "More about this ...": the longer note in the model's own terms, then the real-game aside.
      function plMoreNote(summary, item, soccerSide) {
        return h('details', { className: 'playlab-teach-more' },
          h('summary', null, summary),
          h('div', { className: 'playlab-teach-body' }, plNote(item.teach)),
          plRealAside(item.real, soccerSide));
      }
      // Mystery defense, film room: everyone where they stood before the snap, with the cue drawn
      // on it. Drawn in yards (1 unit = 1 yard; your team at the bottom, as on the field), so it
      // scales to any width. Fixed field colors, like the field itself.
      function plMysterySvg(mr, s, label) {
        var hc = !!ctx.isContrast;
        var top = mr.losX + 31, depth = 38, Wd = FIELD_WIDTH;
        var X = function(y) { return Wd - y; };
        var Y = function(x) { return top - x; };
        var hi = hc ? '#ffff00' : '#fde047';
        var kids = [h('rect', { key: 'bg', x: 0, y: 0, width: Wd, height: depth, fill: hc ? '#000000' : '#2b6a40' })];
        var dY = Y(mr.losX + PL_PRESNAP.DEEP);
        kids.push(h('line', { key: 'deep', x1: 0, y1: dY, x2: Wd, y2: dY, stroke: hc ? '#ffffff' : 'rgba(255,255,255,0.75)', strokeWidth: 0.25, strokeDasharray: '1 1' }));
        kids.push(h('text', { key: 'deept', x: 0.8, y: dY - 0.9, fill: '#ffffff', fontSize: 2.3, fontWeight: 700 }, __alloT('stem.playlab.mystery_svg_15', '15 yards')));
        kids.push(h('line', { key: 'los', x1: 0, y1: Y(mr.losX), x2: Wd, y2: Y(mr.losX), stroke: hc ? '#00ffff' : '#60a5fa', strokeWidth: 0.5 }));
        mr.over.forEach(function(ov, i) {
          if (!ov.def) return;
          kids.push(h('line', { key: 'ov' + i, x1: X(ov.y), y1: Y(ov.x), x2: X(ov.def.y), y2: Y(ov.def.x), stroke: hi, strokeWidth: 0.7 }));
        });
        s.offense.forEach(function(p) {
          var r = p.role === 'OL' ? 0.7 : 1.3;
          kids.push(h('circle', { key: 'o' + p.id, cx: X(p.y), cy: Y(p.x), r: r, fill: hc ? '#ffffff' : (p.role === 'OL' ? '#94a3b8' : '#f8fafc'), stroke: '#0f172a', strokeWidth: 0.25 }));
        });
        // A defender lined up on a receiver gets a yellow edge too: in a press (1.5 yards) the
        // line between them is too short to see.
        var overIds = {};
        mr.over.forEach(function(ov) { if (ov.def) overIds[ov.def.id] = true; });
        s.defenders.forEach(function(dd) {
          var rush = plDefenderMode(dd, s.offense) === 'rush';
          var half = rush ? 0.7 : 1.1;
          kids.push(h('rect', { key: 'd' + dd.id, x: X(dd.y) - half, y: Y(dd.x) - half, width: half * 2, height: half * 2, rx: 0.3,
            fill: hc ? '#000000' : (rush ? '#7f1d1d' : '#dc2626'), stroke: overIds[dd.id] ? hi : (hc ? '#ff5555' : '#fecaca'), strokeWidth: overIds[dd.id] ? 0.55 : 0.25 }));
        });
        mr.deep.forEach(function(dd) {
          kids.push(h('circle', { key: 'dp' + dd.id, cx: X(dd.y), cy: Y(dd.x), r: 2.3, fill: 'none', stroke: hi, strokeWidth: 0.5 }));
        });
        return h('svg', { viewBox: '0 0 ' + Wd.toFixed(2) + ' ' + depth, role: 'img', 'aria-label': label, className: 'playlab-mystery-svg', focusable: 'false' }, kids);
      }
      function plSoccerBest(o) {
        if (!o) return '';
        if (o.isBest) return __alloT('stem.playlab.s_best_yours', 'That was the best pass on this move.');
        if (o.bestId) return plFill(__alloT('stem.playlab.s_best_other', 'Best pass: to {who} ({how}), a chance worth xG {xg}.'), { who: o.bestRunnerId, how: plSoccerOptWord(concept.id, o.bestId), xg: o.bestXG.toFixed(2) });
        return __alloT('stem.playlab.s_best_none', 'No pass worked on this move: each one was cut out or offside. Try another move against this defense.');
      }

      // ── Trading Card export (engagement layer) ──
      // Generate a sports-card-style printable from the student\'s active
      // play / concept + matchup grade + earned badges. Mirrors the
      // ThrowLab trading-card pattern. Player name prompted on first use,
      // cached in toolData.playerName.
      async function exportPlayLabTradingCard() {
        var name = d.playerName;
        if (!name) {
          var promptModule = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.PromptDialog && window.AlloModules.PromptDialog.PromptDialog;
          var promptApi = typeof window !== 'undefined' && window.AlloFlowUX && window.AlloFlowUX.prompt;
          var unavailable = 'Trading card export is unavailable, so no card was created.';
          if (typeof promptModule !== 'function' || typeof promptApi !== 'function') {
            if (typeof addToast === 'function') addToast(unavailable, 'warning');
            plAnnounce(unavailable);
            return;
          }
          try {
            name = await promptApi('What\'s your player name? (Saved for next time)', isSoccer ? 'Lab Striker' : 'Lab QB', {
              title: 'Name your trading card',
              placeholder: 'Enter your player name',
              confirmText: 'Create card',
              cancelText: 'Cancel',
              maxLength: 30
            });
          } catch (e) {
            if (typeof addToast === 'function') addToast(unavailable, 'warning');
            plAnnounce(unavailable);
            return;
          }
          if (name === null) { plAnnounce(__alloT('stem.playlab.sr_trading_card_export_cancelled', 'Trading card export cancelled.')); return; }
          name = String(name).trim().slice(0, 30);
          if (!name) { plAnnounce(__alloT('stem.playlab.sr_enter_a_player_name_to_create_the_trading_card', 'Enter a player name to create the trading card.')); return; }
          patchPlayLab({ playerName: name });
        }
        var stats = d.drillStats || {};
        var sportLbl = isSoccer ? 'Soccer Coach' : 'Offensive Coordinator';
        var sportIcon = isSoccer ? '⚽' : '🏈';
        var presetLbl = isSoccer
          ? formationDef.label + ' · ' + concept.label
          : play.label;
        var defLbl = isSoccer ? soccerShape.label : (mysteryHidden ? 'Mystery defense' : coverage.label);
        // Matchup grade: the model's answer (it names the best receiver or pass), so only for a
        // setup the student has already run, like the film room.
        var matchup = isSoccer
          ? (soccerRevealed ? getSoccerMatchup(concept, soccerShape, formationDef.id) : null)
          : (revealed ? getMatchup(play, coverage) : null);
        var matchupLine = matchup
          ? matchup.emoji + ' ' + matchup.label + ': ' + (matchup.reason || '')
          : 'Run this matchup once to grade it.';
        // Stat line per sport
        var statLine;
        if (isSoccer) {
          statLine = 'High-xG sequences: ' + (stats.highXgShot ? 1 : 0) + ' · Concepts run: ' + Object.keys(stats.conceptsRun || {}).length + ' · Set-piece types: ' + Object.keys(stats.setPieceTypesRun || {}).length;
        } else {
          statLine = 'Coverages beaten: ' + (stats.coveragesBeaten || 0) + ' · Plays completed: ' + Object.keys(stats.completionsByPlay || {}).length + ' · Hot streak: ' + (stats.hotStreak || 0);
        }
        var earnedBadges = PLAYLAB_BADGES.filter(function(b) { return d.badgesEarned && d.badgesEarned[b.id]; }).slice(0, 5);
        var badgesHtml = earnedBadges.length
          ? earnedBadges.map(function(b) { return '<span class="badge">' + escapeHtml(b.emoji) + ' ' + escapeHtml(b.label) + '</span>'; }).join('')
          : '<span class="badge-empty">No badges yet — keep running plays!</span>';
        var fieldColor = isSoccer ? '#10b981' : '#16a34a';
        var matchupColor = matchup ? matchup.color: 'var(--allo-stem-text-soft, #94a3b8)';
        var cardHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
          + '<title>PlayLab Trading Card — ' + escapeHtml(name) + '</title>'
          + '<style>'
          + '*{box-sizing:border-box} body{margin:30px;font-family:Georgia,serif;background:#0f172a;color:#f8fafc;display:flex;justify-content:center}'
          + '.card{width:380px;border:8px solid #fbbf24;border-radius:18px;background:linear-gradient(135deg,#fef3c7,#fde68a);color:#1a1a1a;padding:0;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.3)}'
          + '.banner{background:linear-gradient(135deg,#1e293b,#334155);color:#fbbf24;padding:14px 20px;text-align:center}'
          + '.banner .icon{font-size:32px;display:block;margin-bottom:4px}'
          + '.banner .name{font-size:24px;font-weight:bold;margin:0;letter-spacing:1px}'
          + '.banner .sport{font-size:11px;color:#cbd5e1;text-transform:uppercase;letter-spacing:2px;margin-top:4px}'
          + '.body{padding:18px}'
          + '.preset{background:#1e293b;color:#fbbf24;padding:6px 12px;border-radius:6px;display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}'
          + '.field-frame{background:' + fieldColor + ';border-radius:8px;padding:12px;margin-bottom:10px;text-align:center;color:#052e16;font-size:11px}'
          + '.field-frame .vs{font-size:14px;margin:4px 0;font-weight:bold}'
          + '.matchup{padding:8px;border-radius:6px;margin-bottom:8px;border-left:3px solid ' + escapeHtml(matchupColor) + ';background:rgba(0,0,0,0.04);font-size:11px}'
          + '.stat-line{font-size:12px;color:#1a1a1a;font-weight:bold;margin-bottom:10px;padding:8px;background:rgba(30,41,59,0.05);border-radius:6px;border-left:3px solid #fbbf24}'
          + '.badges{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}'
          + '.badge{background:#1e293b;color:#fbbf24;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:bold}'
          + '.badge-empty{color:#475569;font-style:italic;font-size:10px}'
          + '.footer{text-align:center;font-size:9px;color:#666;border-top:1px dashed #94a3b8;padding-top:6px;margin-top:8px}'
          + '@media print{body{background:white;margin:0}.card{box-shadow:none}}'
          + '</style></head><body>'
          + '<div class="card">'
          + '  <div class="banner">'
          + '    <span class="icon">' + escapeHtml(sportIcon) + '</span>'
          + '    <div class="name">' + escapeHtml(name) + '</div>'
          + '    <div class="sport">' + escapeHtml(sportLbl) + '</div>'
          + '  </div>'
          + '  <div class="body">'
          + '    <div class="preset">' + escapeHtml(presetLbl) + '</div>'
          + '    <div class="field-frame">'
          + '      <div>OFFENSE</div>'
          + '      <div class="vs">' + escapeHtml(presetLbl) + '</div>'
          + '      <div>vs</div>'
          + '      <div class="vs">' + escapeHtml(defLbl) + '</div>'
          + '      <div>DEFENSE</div>'
          + '    </div>'
          + '    <div class="matchup"><strong>' + escapeHtml(matchupLine) + '</strong></div>'
          + '    <div class="stat-line">' + escapeHtml(statLine) + '</div>'
          + '    <div class="badges">' + badgesHtml + '</div>'
          + '    <div class="footer">PlayLab — Tactical Play Design · AlloFlow · ' + escapeHtml(new Date().toLocaleDateString()) + '</div>'
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
        plAnnounce('Trading card exported for ' + name + '.');
        if (addToast) addToast('📇 Trading card!');
      }

      // Open a printable activity sheet with all scenarios for the
      // active sport — title + teach + numbered questions with blank
      // lines for student answers. Triggers window.print() so the
      // teacher can print or save as PDF directly.
      function printPlayLabActivitySheet() {
        var activeSport = d.sport || 'football';
        var sportLabel = activeSport === 'soccer' ? 'Soccer' : 'American Football';
        var scenarios = PLAYLAB_SCENARIOS.filter(function(sc) { return sc.sport === activeSport; });
        if (!scenarios.length) {
          plAnnounce('No scenarios available for ' + sportLabel + '.');
          return;
        }
        var dateStr = new Date().toLocaleDateString();
        var sheetHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
          + '<title>PlayLab Activity Sheet — ' + escapeHtml(sportLabel) + '</title>'
          + '<style>'
          + 'body{font-family:Georgia,serif;max-width:780px;margin:30px auto;padding:0 20px;color:#1a1a1a;line-height:1.5}'
          + 'h1{font-size:22px;border-bottom:3px solid #1a1a1a;padding-bottom:6px;margin-bottom:6px}'
          + '.meta{color:#666;font-size:11px;margin-bottom:24px}'
          + '.scenario{margin-bottom:32px;page-break-inside:avoid;border:1px solid #cbd5e1;border-radius:6px;padding:14px}'
          + '.scenario h2{font-size:16px;margin:0 0 4px 0}'
          + '.scenario .icon{margin-right:6px}'
          + '.scenario .teach{font-size:12px;color:#334155;margin:6px 0 10px 0;font-style:italic}'
          + '.scenario .real{font-size:12px;color:#334155;margin:0 0 10px 0;padding:6px 8px;border-left:3px solid #94a3b8;background:#f8fafc}'
          + '.scenario .qhead{font-weight:bold;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-top:10px}'
          + '.scenario ol{margin:6px 0 0 22px;padding:0;font-size:12px}'
          + '.scenario ol li{margin-bottom:4px}'
          + '.answer-line{border-bottom:1px solid #94a3b8;height:18px;margin:4px 0}'
          + 'footer{font-size:10px;color:#94a3b8;text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #cbd5e1}'
          + '@media print{.scenario{break-inside:avoid}}'
          + '</style></head><body>'
          + '<h1>PlayLab Activity Sheet — ' + escapeHtml(sportLabel) + '</h1>'
          + '<div class="meta">Name: ____________________________________  Date: ' + escapeHtml(dateStr) + '</div>';
        scenarios.forEach(function(sc) {
          sheetHtml += '<div class="scenario">'
            + '<h2><span class="icon">' + escapeHtml(sc.icon) + '</span>' + escapeHtml(sc.label) + '</h2>'
            + '<div class="teach">' + escapeHtml(plNote(sc.teach)) + '</div>'
            // The real-game history, labelled as such: this lab's model does not produce it.
            + (sc.real ? '<div class="real"><b>' + escapeHtml(activeSport === 'soccer' ? __alloT('stem.playlab.in_real_soccer', 'In real soccer:') : __alloT('stem.playlab.in_real_football', 'In real football:')) + '</b> ' + escapeHtml(sc.real) + '</div>' : '')
            + '<div class="qhead">Discussion Questions</div>'
            + '<ol>';
          (sc.questions || []).forEach(function(q) {
            sheetHtml += '<li>' + escapeHtml(plNote(q))
              + '<div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div>'
              + '</li>';
          });
          sheetHtml += '</ol></div>';
        });
        sheetHtml += '<footer>PlayLab — STEAM Lab tool for tactical play design · AlloFlow</footer>'
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
        plAnnounce('Activity sheet opened for ' + sportLabel + ' with ' + scenarios.length + ' scenarios.');
      }

      // Quick-Play: pick a random scenario from built-ins (current sport)
      // and saved plays. Targets the athletic kid who arrives and doesn\'t
      // want to read setup — one click and they\'re running something.
      function runRandomPlayLabScenario() {
        var activeSport = d.sport || 'football';
        var pool = PLAYLAB_SCENARIOS.filter(function(sc) { return sc.sport === activeSport; })
          .concat((Array.isArray(d.savedPlays) ? d.savedPlays : []).filter(function(sp) { return sp.sport === activeSport; }));
        if (!pool.length) return;
        var pick = pool[Math.floor(Math.random() * pool.length)];
        // Built-in vs saved-play apply path
        if (pick.sport && (pick.playId || pick.conceptId) && (pick.coverageId || pick.shapeId) && pick.id && pick.id.indexOf('custom_') === 0) {
          loadSavedPlay(pick);
        } else {
          applyPlayLabScenario(pick.id);
        }
      }

      function applyPlayLabScenario(scenarioId) {
        var s = PLAYLAB_SCENARIOS.find(function(sc) { return sc.id === scenarioId; });
        if (!s) return;
        patchPlayLab(function(prevPl) {
          var nextPlaylab = Object.assign({}, prevPl, {
            sport: s.sport,
            customPositions: {},
            targetId: null,
            soccerOptId: null,
            runActive: false,
            runT: 0,
            runOutcome: null,
            coachReply: '', coachError: '',
            workspaceTab: 'field',
            activeScenarioId: scenarioId,
            // A story names its defense, so it ends a Mystery defense round.
            mysteryOn: false, mysteryGuess: null, mysterySolved: false
          });
          if (s.sport === 'soccer') {
            nextPlaylab.formationId = s.formationId;
            nextPlaylab.conceptId = s.conceptId;
            nextPlaylab.shapeId = s.shapeId;
          } else {
            nextPlaylab.playId = s.playId;
            nextPlaylab.coverageId = s.coverageId;
            if (s.losX != null) nextPlaylab.losX = s.losX;
          }
          return nextPlaylab;
        });
        plAnnounce('Scenario loaded: ' + s.label + '. ' + plNote(s.teach));
        setScenarioIntro({
          id: s.id, label: s.label, icon: s.icon, sport: s.sport,
          teach: plNote(s.teach), real: s.real || '', questions: (s.questions || []).map(plNote)
        });
      }

      function loadPlay(pid) {
        var seen = Object.assign({}, d.playsViewed || {}); seen[pid] = true;
        // Loading a new preset wipes any custom drag positions — students
        // get a clean slate for the new play. Their previous edits are
        // gone unless they save first (future feature).
        // A new play is a new prediction: the target is cleared and any run stops.
        var leaveScenario = d.activeScenarioId ? { activeScenarioId: null, losX: LOS_DEFAULT } : {};
        patchPlayLab(Object.assign({
          playId: pid, playsViewed: seen, customPositions: {},
          targetId: null, runActive: false, runT: 0, runOutcome: null
        }, leaveScenario));
        var p = PLAYS.find(function(P) { return P.id === pid; });
        plAnnounce('Loaded play: ' + (p ? p.label : pid) + '. ' + (p ? (PL_SIMPLE.plays[p.id] || '') : ''));
      }
      function resetPositions() {
        patchPlayLab({ customPositions: {} });
        plAnnounce(__alloT('stem.playlab.sr_player_positions_reset_to_preset', 'Player positions reset to preset.'));
      }

      // ── Saved plays ──
      // Capture the current sport + preset + custom positions as a named
      // entry. Loading restores the entire view; deleting removes from
      // the list. Capped at 24 entries (FIFO eviction) so the toolData
      // blob doesn't grow unbounded across sessions.
      function openSavePrompt() {
        // Suggest a default name from the active preset + custom-edit count
        var basePresetLabel = isSoccer
          ? formationDef.label + ' · ' + concept.label
          : play.label;
        var customCount = Object.keys(d.customPositions || {}).length;
        var defaultName = basePresetLabel + (customCount ? ' (' + customCount + ' edit' + (customCount === 1 ? '' : 's') + ')' : '');
        patchPlayLab({
          savePromptOpen: true, savePromptName: defaultName
        });
      }
      function cancelSavePrompt() {
        patchPlayLab({
          savePromptOpen: false, savePromptName: ''
        });
      }
      function commitSavePlay() {
        var name = (d.savePromptName || '').trim();
        if (!name) {
          plAnnounce(__alloT('stem.playlab.sr_please_give_the_play_a_name', 'Please give the play a name.'));
          return;
        }
        var entry = {
          id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          name: name,
          sport: d.sport,
          createdAt: Date.now(),
          customPositions: Object.assign({}, d.customPositions || {})
        };
        if (isSoccer) {
          entry.formationId = d.formationId;
          entry.conceptId = d.conceptId;
          entry.shapeId = d.shapeId;
        } else {
          entry.playId = d.playId;
          entry.coverageId = d.coverageId;
        }
        var saved = (Array.isArray(d.savedPlays) ? d.savedPlays : []).concat([entry]);
        // FIFO eviction at 24 entries
        if (saved.length > 24) saved = saved.slice(saved.length - 24);
        // XP once per distinct setup: saving the same thing again is still allowed, it
        // just is not paid again.
        var saveSig = (isSoccer ? ('soccer|' + d.formationId + '|' + d.conceptId + '|' + d.shapeId) : setupSig);
        var savedSigs = Object.assign({}, d.savedSigs || {});
        var newSave = !savedSigs[saveSig];
        savedSigs[saveSig] = 1;
        patchPlayLab({
          savedPlays: saved, savePromptOpen: false, savePromptName: '', savedSigs: savedSigs
        });
        plAnnounce('Saved play: ' + name + '.');
        if (addToast) addToast('💾 Saved: ' + name);
        if (newSave && awardXP) awardXP('playlab', 4, 'Saved play');
      }
      function loadSavedPlay(entry) {
        if (!entry) return;
        patchPlayLab(function(prevPl) {
          var next = Object.assign({}, prevPl, {
            sport: entry.sport,
            customPositions: Object.assign({}, entry.customPositions || {}),
            targetId: null, soccerOptId: null,
            workspaceTab: 'field',
            // Clear in-flight animation + ephemeral state on load
            runActive: false, runT: 0, runOutcome: null, coachReply: '', coachError: '',
            mysteryOn: false, mysteryGuess: null, mysterySolved: false
          });
          if (entry.sport === 'soccer') {
            if (entry.formationId) next.formationId = entry.formationId;
            if (entry.conceptId) next.conceptId = entry.conceptId;
            if (entry.shapeId) next.shapeId = entry.shapeId;
          } else {
            if (entry.playId) next.playId = entry.playId;
            if (entry.coverageId) next.coverageId = entry.coverageId;
          }
          return next;
        });
        plAnnounce('Loaded saved play: ' + entry.name + '.');
      }
      function deleteSavedPlay(id) {
        patchPlayLab(function(prevPl) {
          var saved = (Array.isArray(prevPl.savedPlays) ? prevPl.savedPlays : []).filter(function(e) { return e && e.id !== id; });
          return Object.assign({}, prevPl, { savedPlays: saved });
        });
        plAnnounce(__alloT('stem.playlab.sr_deleted_saved_play', 'Deleted saved play.'));
      }

      // ── Coach Mode (Gemini) ──
      // Sends the active play, the active coverage, the open-receiver
      // analysis, and any custom-position edits to Gemini for tactical
      // feedback. Coaches a specific adjustment for THIS play vs THIS
      // defense, not generic advice.
      function askCoach() {
        if (!plAiOn) {
          patchPlayLab({
            coachError: 'Coach is offline (AI not available in this build).'
          });
          plAnnounce(__alloT('stem.playlab.sr_coach_is_offline', 'Coach is offline.'));
          return;
        }
        // Mystery defense: the coach would have to be told the defense, so he waits for the snap.
        if (mysteryHidden) {
          var waitMsg = __alloT('stem.playlab.coach_mystery_wait', 'In Mystery defense the coach waits until after the snap. Run the play first.');
          patchPlayLab({ coachError: waitMsg, coachReply: '' });
          plAnnounce(waitMsg);
          return;
        }
        patchPlayLab({
          coachLoading: true, coachReply: '', coachError: ''
        });
        // One coach XP per distinct setup (asking again about the same call is free).
        var coachSig = isSoccer ? ('soccer|' + d.formationId + '|' + d.conceptId + '|' + d.shapeId) : setupSig;
        var coachIsNew = !(d.coachAsked && d.coachAsked[coachSig]);
        // Compact representation of the formation so the prompt is small.
        // Round to whole units (yd or m) to keep numbers human-readable.
        var prompt;
        // Pull the live matchup grade + suggestions so the AI's coaching
        // is anchored in the same diagnosis the student already sees on
        // the matchup badge — coach acknowledges the grade, then explains
        // WHY in geometric terms instead of contradicting the badge.
        var liveMatchup = isSoccer
          ? (soccerRevealed ? getSoccerMatchup(concept, soccerShape, formationDef.id) : null)
          // Football too: the grade names the best receiver, so it waits for the run.
          : ((revealed && play && coverage) ? getMatchup(play, coverage) : null);
        var liveSuggestions = (liveMatchup && liveMatchup.grade === 'tough')
          ? (isSoccer ? suggestConceptsForShape(soccerShape, formationDef.id) : suggestPlaysForCoverage(coverage))
          : [];
        var matchupDigest = liveMatchup
          ? 'Matchup grade for this call: ' + liveMatchup.label + ' — ' + liveMatchup.reason
            + (liveSuggestions.length ? ' Suggested alternatives: ' + liveSuggestions.map(function(s) { return s.label; }).join(', ') + '.' : '')
            + ' '
          : '';
        // Coach personality — prepended so the same tactical anchors come
        // through in different voices (Analyst / Old School / Hype Man / Zen)
        var personaId = d.coachPersona || 'analyst';
        var personaDef = COACH_PERSONAS.find(function(p) { return p.id === personaId; }) || COACH_PERSONAS[0];
        var personaPrepend = personaDef.prepend || '';
        if (isSoccer) {
          // Soccer-flavored prompt: formation + concept + defensive shape +
          // optional xG context. No route end-points (soccer plays don't
          // have routes); we describe player positions instead.
          var posDigest = formation.map(function(p) {
            return p.id + '(' + p.role + ') @ (' + p.x.toFixed(0) + ',' + p.y.toFixed(0) + ')';
          }).join(', ');
          var passDigest = soccerMove.build.map(function(pair) {
            return pair[0] + '→' + pair[1];
          }).join(', ');
          // The model's numbers for each final pass (the same ones the film room shows).
          var optDigest = soccerMove.reads.map(function(r) {
            return r.runnerId + ' ' + plSoccerOptWord(concept.id, r.id) + ': ' + (r.type === 'shot' ? ('shot, xG ' + r.xG.toFixed(2)) : r.type === 'cut' ? 'cut out' : 'offside');
          }).join('; ');
          var lead = null;
          var leadXG = (soccerMove.best ? soccerMove.best.xG : 0).toFixed(2);
          prompt = (personaPrepend ? personaPrepend + ' ' : '')
            + 'You are a soccer (football) tactical coach analyzing a student\'s setup. '
            + 'Formation: "' + formationDef.label + '". ' + plNote(formationDef.teach) + ' '
            + 'Concept: "' + concept.label + '". ' + plNote(concept.teach) + ' '
            + 'Defending team is in: ' + soccerShape.label + '. ' + plNote(soccerShape.teach) + ' '
            + matchupDigest
            + 'Pitch is 105×68 m; the student\'s team attacks the goal at x = 105. '
            + 'Attacker positions: ' + posDigest + '. '
            + 'Build-up passes: ' + (passDigest || '(none, a set piece)') + '. The ball is with ' + soccerMove.passer.id + '. '
            + (soccerRevealed
              ? ('The lab\'s model for each final pass: ' + optDigest + '. Best xG on this move: ' + leadXG + '. ')
              : 'The student has not run this move yet. Do NOT say which final pass works; help them reason about the offside line, the space behind it and the defenders near each run. ')
            + (soccerRevealed
              ? 'Give 3-4 sentences of warm, specific coaching: (1) ACKNOWLEDGE the matchup grade (don\'t contradict it — if it\'s tough, agree it\'s tough and explain WHY geometrically), (2) name the player or zone with the best opportunity and WHY in geometric terms, (3) suggest ONE concrete adjustment (move a player N meters, swap a passing lane, OR pick one of the suggested alternative concepts above), (4) tie the suggestion to the math the student can see (xG, passing-triangle geometry, line of confrontation). '
              : 'Give 3-4 sentences of warm, specific coaching that help the student predict: (1) what to look at on the pitch (the offside line, the space behind it, the defenders near each run), (2) one question to ask about each pass, (3) a reminder to choose a pass and run the move to find out. Never name the best pass. ')
            + 'Plain prose, no markdown, no bullets, no headings.';
        } else {
          // Football-flavored prompt (original)
          var formationDigest = formation.filter(function(p) {
            return p.role === 'WR' || p.role === 'TE' || p.role === 'RB' || p.role === 'QB';
          }).map(function(p) {
            var endX = p.route ? p.route[p.route.length - 1].x : p.x;
            var endY = p.route ? p.route[p.route.length - 1].y : p.y;
            return p.id + ' starts (' + p.x.toFixed(0) + ',' + p.y.toFixed(0) + ')'
              + (p.route && p.route.length > 1 ? ' → route ends (' + endX.toFixed(0) + ',' + endY.toFixed(0) + ')' : ' [no route]');
          }).join('; ');
          var topOpen = analysis.slice(0, 5).map(function(r) {
            if (r.run) return r.id + ' runs for ' + r.yards + ' yd';
            return r.id + ' (' + (r.sacked ? 'sack: route too slow for the rush' : (plNum(r.gapYd) + ' yd gap at the catch, ' + (r.open ? 'open' : 'covered') + ', ' + r.yards + ' yd gain')) + ')';
          }).join(', ');
          var customEdits = Object.keys(d.customPositions || {}).length;
          // Before the student has run this call, the coach gets no model answer (who is open,
          // the gaps, the grade) and is told not to guess one: predict first, then test.
          prompt = (personaPrepend ? personaPrepend + ' ' : '')
            + 'You are a football coach analyzing a student\'s play call. '
            + 'Active play: "' + play.label + '". Concept: ' + plNote(play.teach) + ' '
            + 'Active defense: ' + coverage.label + '. Note: ' + plNote(coverage.teach) + ' '
            + matchupDigest
            + 'Field is 100×53.33 yards. ' + ytgNow + ' yards to the goal line. '
            + 'Eligible receivers + their routes: ' + formationDigest + '. '
            + (revealed
              ? 'The lab\'s model for each receiver (top 5): ' + topOpen + '. '
              : 'The student has not run this play yet. Do NOT say which receiver will be open or which throw works; help them reason about where each defender starts, who he watches, and how long each route takes. ')
            + (Object.keys(d.customPositions || {}).length ? 'Student has made ' + Object.keys(d.customPositions).length + ' custom position edits to the preset. ' : '')
            + (revealed
              ? 'Give 3-4 sentences of warm, specific coaching: (1) ACKNOWLEDGE the matchup grade (don\'t contradict it — if it\'s tough, agree it\'s tough and explain WHY geometrically), (2) name the most-open receiver and explain WHY they\'re open in geometric terms (not just "no defender nearby"), (3) suggest ONE concrete adjustment (move a player N yards, change a route depth, OR pick one of the suggested alternative plays above), (4) tie the suggestion to the math the student can see on the field. '
              : 'Give 3-4 sentences of warm, specific coaching that help the student predict: (1) what to look at on the field before the snap, (2) one question to ask about the receiver they picked (or are thinking of), (3) a reminder to pick a receiver and run the play to find out. Never name the open receiver. ')
            + 'Plain prose, no markdown, no bullets, no headings.';
        }
        Promise.resolve().then(function() {
          return callGemini(prompt, false, false, 0.7);
        }).then(function(resp) {
          if (!mountedRef.current) return;
          var reply = _plExtractAiText(resp);
          if (!reply) {
            patchPlayLab({
              coachLoading: false, coachError: 'Could not reach the coach. Try again in a moment.'
            });
            return;
          }
          patchPlayLab(function(prevPl) {
            var asked = Object.assign({}, (prevPl && prevPl.coachAsked) || {});
            asked[coachSig] = 1;
            return Object.assign({}, prevPl, { coachLoading: false, coachReply: reply, coachError: '', coachAsked: asked });
          });
          plAnnounce('Coach: ' + reply);
          if (coachIsNew && awardXP) awardXP('playlab', 5, 'Asked the coach');
        }).catch(function() {
          if (!mountedRef.current) return;
          patchPlayLab({
            coachLoading: false, coachError: 'Could not reach the coach. Try again in a moment.'
          });
        });
      }
      function loadCoverage(cid) {
        var seen = Object.assign({}, d.coveragesViewed || {}); seen[cid] = true;
        // Picking a defense by name ends a Mystery defense round.
        patchPlayLab({
          coverageId: cid, coveragesViewed: seen,
          runActive: false, runT: 0, runOutcome: null,
          mysteryOn: false, mysteryGuess: null, mysterySolved: false
        });
        var cv = COVERAGES.find(function(c) { return c.id === cid; });
        plAnnounce('Defense changed to: ' + (cv ? cv.label : cid) + '. ' + (cv ? (PL_SIMPLE.coverages[cv.id] || '') : ''));
      }

      // ── Play simulation engine ──
      // Football runs on the model's own clock: sim.outcome.endT seconds of play (the
      // catch, the tackle, or the sack), then RESULT_HOLD seconds before the verdict.
      // The verdict is never shown before the animation gets there.
      var RESULT_HOLD = 0.9;
      var footballEndT = sim.outcome ? sim.outcome.endT : 0;
      var TOTAL_DURATION = footballEndT + RESULT_HOLD;
      // Soccer runs on the model's clock too: the build-up passes (at ball speed), then the
      // chosen pass from t = 0 to soccerMove.outcome.endT, then a short hold before the verdict.
      var SOCCER_OUTCOME_HOLD = 0.9;
      var soccerBuildT = soccerMove.buildT;
      var SOCCER_TOTAL = soccerBuildT + (soccerMove.outcome ? soccerMove.outcome.endT : 0) + SOCCER_OUTCOME_HOLD;

      // "Pick a receiver first" nudge (football pass plays need a target before the snap).
      var _plNeedTargetState = React.useState(false);
      var needTarget = _plNeedTargetState[0];
      var setNeedTarget = _plNeedTargetState[1];
      // "Man or zone first" nudge (Mystery defense).
      var _plNeedGuessState = React.useState(false);
      var needGuess = _plNeedGuessState[0];
      var setNeedGuess = _plNeedGuessState[1];

      function pickTarget(id) {
        if (d.runActive) return;
        setNeedTarget(false);
        patchPlayLab({ targetId: id, runOutcome: null, runT: 0 });
        plAnnounce(plFill(__alloT('stem.playlab.sr_target_picked', 'Throwing to {who}, the {name}. Now run the play.'), { who: plWho(id), name: PL_NAME[id] || id }));
      }

      // ── Mystery defense ──
      // A random defense the student cannot see named until the play is over. Players go back
      // to the play's own spots at the usual line, so the read is of the real alignment.
      function startMystery() {
        var prev = d.mysteryOn ? d.mysteryCovId : d.coverageId;
        var pool = COVERAGES.filter(function(c) { return c.id !== prev; });
        var pick = pool[Math.min(pool.length - 1, Math.floor(Math.random() * pool.length))];
        setNeedGuess(false); setNeedTarget(false);
        patchPlayLab({
          mysteryOn: true, mysteryCovId: pick.id, mysteryGuess: null, mysterySolved: false,
          targetId: null, runActive: false, runT: 0, runOutcome: null, revealSig: '',
          customPositions: {}, losX: LOS_DEFAULT, activeScenarioId: null, coachReply: '', coachError: ''
        });
        plAnnounce(__alloT('stem.playlab.sr_mystery_on', 'Mystery defense. The defense is hidden until the snap. Look at where the defenders line up, then choose man or zone.'));
      }
      function stopMystery() {
        setNeedGuess(false);
        patchPlayLab({ mysteryOn: false, mysteryGuess: null, mysterySolved: false, targetId: null, runActive: false, runT: 0, runOutcome: null, revealSig: '' });
        plAnnounce(plFill(__alloT('stem.playlab.sr_mystery_off', 'Mystery defense off. Defense: {def}.'), { def: (COVERAGES.find(function(c) { return c.id === d.coverageId; }) || COVERAGES[0]).label }));
      }
      function pickGuess(g) {
        if (d.runActive || !mysteryHidden) return;
        setNeedGuess(false);
        patchPlayLab({ mysteryGuess: g, runOutcome: null, runT: 0 });
        plAnnounce(g === 'man' ? __alloT('stem.playlab.sr_guess_man', 'Your read: man coverage.') : __alloT('stem.playlab.sr_guess_zone', 'Your read: zone coverage.'));
      }

      // Soccer: choosing the final pass IS the prediction, made before the move runs.
      function pickSoccerOption(id) {
        if (d.runActive) return;
        setNeedTarget(false);
        patchPlayLab({ soccerOptId: id, runOutcome: null, runT: 0 });
        var r = soccerMove.reads.filter(function(x) { return x.id === id; })[0];
        plAnnounce(plFill(__alloT('stem.playlab.sr_soccer_pick', 'Pass to {who}: {how}. Now run the move.'), { who: r ? r.runnerId : id, how: plSoccerOptWord(concept.id, id) }));
      }
      // Any change to the formation, the move or the defense is a new prediction.
      function setSoccerSetup(patch, msg) {
        patchPlayLab(Object.assign({ soccerOptId: null, runActive: false, runT: 0, runOutcome: null }, patch));
        if (msg) plAnnounce(msg);
      }

      function startRun() {
        if (d.runActive) return;
        // Mystery defense: the read (man or zone) is the first prediction.
        if (mysteryHidden && d.mysteryGuess !== 'man' && d.mysteryGuess !== 'zone') {
          setNeedGuess(true);
          plAnnounce(__alloT('stem.playlab.sr_pick_guess_first', 'Choose man or zone first. Then run the play.'));
          return;
        }
        setNeedGuess(false);
        if ((!isSoccer && !sim.outcome) || (isSoccer && !soccerMove.outcome)) {
          setNeedTarget(true);
          plAnnounce(isSoccer ? __alloT('stem.playlab.sr_pick_pass_first', 'Pick the pass first. Then run the move.')
            : __alloT('stem.playlab.sr_pick_target_first', 'Pick who gets the ball first. Then run the play.'));
          return;
        }
        setNeedTarget(false);
        patchPlayLab({
          runActive: true, runT: 0, runOutcome: null
        });
        if (isSoccer) {
          plAnnounce('Running the move. ' + concept.label + ' from ' + formationDef.label + ', pass to ' + soccerMove.read.runnerId + '.');
        } else {
          plAnnounce('Running play. ' + play.label + ' against ' + covName + '.');
        }
      }
      function lineUpAgain() {
        patchPlayLab({ runActive: false, runT: 0, runOutcome: null });
        plAnnounce(__alloT('stem.playlab.sr_lined_up', 'Players are back at the line.'));
      }

      // Score one finished football play. Called when the animation reaches the end, or at
      // once when motion is reduced: both paths give the same result and the same credit.
      function resolveFootballRun() {
        var o = sim.outcome;
        if (!o) { patchPlayLab({ runActive: false, runT: 0 }); return; }
        var success = !!o.success;
        // A call counts ONCE. Running the same play, defense, player spots and target
        // again replays it, but earns no XP, streak, badge or mission credit.
        var counted = !(d.seenRuns && d.seenRuns[runKey]);
        var customCount = Object.keys(safeCustomPositions).length;
        var outcome = {
          type: o.type, receiverId: o.receiverId, yards: o.yards,
          gapYd: isFinite(o.gapYd) ? o.gapYd : null,
          firstDown: !!o.firstDown, touchdown: !!o.touchdown, isBest: !!o.isBest, bestId: o.bestId, bestYards: o.bestYards,
          success: success, counted: counted,
          location: success ? 'caught' : (o.type === 'sack' ? 'sack' : 'brokenup'),
          opennessYd: (o.type === 'complete' && isFinite(o.gapYd)) ? o.gapYd : undefined,
          sig: setupSig, runKey: runKey, endT: o.endT
        };
        var newStats = Object.assign({
          coveragesBeaten: 0, coveragesBeatenSet: {},
          completionsByPlay: {}, smashVsCover2: false,
          c0WithHot: false, c6WithTrips: false, robberWithMesh: false,
          completedCustomPlay: false, hotStreak: 0,
          completions: 0, firstDowns: 0, bestReads: 0
        }, d.drillStats || {});
        var catalogPrev = (d.playCatalog && typeof d.playCatalog === 'object') ? d.playCatalog : {};
        var catalogNext = catalogPrev;
        var firedNew = null;
        var newEarned = Object.assign({}, d.badgesEarned || {});
        var newlyEarnedBadges = [];
        var newPersonalBests = d.personalBests;
        var newPbRecords = [];
        var newDailyCompleted = d.dailyCompleted || null;
        var dailyJustCompleted = false;
        var newDrillTaskIdx = d.drillTaskIdx || 0;
        var taskJustCompleted = null;
        if (counted) {
          if (success) {
            var playKey = 'football:' + play.id;
            var existingCat = catalogPrev[playKey];
            var nowIso = new Date().toISOString();
            catalogNext = Object.assign({}, catalogPrev);
            if (existingCat) {
              catalogNext[playKey] = Object.assign({}, existingCat, { lastSuccessAt: nowIso, successCount: (existingCat.successCount || 0) + 1 });
            } else {
              catalogNext[playKey] = { firstSuccessAt: nowIso, lastSuccessAt: nowIso, successCount: 1, label: play.label, icon: play.icon || '🏈', sport: 'football' };
              firedNew = { key: playKey, label: play.label, icon: play.icon || '🏈', sport: 'football', total: Object.keys(catalogNext).length };
            }
            newStats.completions = (newStats.completions || 0) + 1;
            if (o.firstDown) newStats.firstDowns = (newStats.firstDowns || 0) + 1;
            // A handoff is not a read: only a pass to the best open receiver counts here.
            if (o.isBest && o.type === 'complete') newStats.bestReads = (newStats.bestReads || 0) + 1;
            if (!newStats.coveragesBeatenSet[coverage.id]) {
              newStats.coveragesBeatenSet = Object.assign({}, newStats.coveragesBeatenSet);
              newStats.coveragesBeatenSet[coverage.id] = true;
              newStats.coveragesBeaten = Object.keys(newStats.coveragesBeatenSet).length;
            }
            newStats.completionsByPlay = Object.assign({}, newStats.completionsByPlay);
            newStats.completionsByPlay[play.id] = true;
            if (play.id === 'smash' && coverage.id === 'cover2' && o.firstDown) newStats.smashVsCover2 = true;
            if (coverage.id === 'cover0' && (play.id === 'slant' || play.id === 'bubble' || play.id === 'stick')) newStats.c0WithHot = true;
            if (coverage.id === 'cover6' && play.id === 'trips') newStats.c6WithTrips = true;
            if (coverage.id === 'robber' && play.id === 'mesh') newStats.robberWithMesh = true;
            if (customCount >= 2) newStats.completedCustomPlay = true;
            newStats.hotStreak = (newStats.hotStreak || 0) + 1;
          } else {
            newStats.hotStreak = 0;
          }
          var statD = Object.assign({}, d, { playId: play.id, coverageId: coverage.id, sport: 'football' });
          PLAYLAB_BADGES.forEach(function(b) {
            if (newEarned[b.id]) return;
            try {
              if (b.check(statD, outcome, newStats)) { newEarned[b.id] = Date.now(); newlyEarnedBadges.push(b); }
            } catch (e) { /* defensive */ }
          });
          var pbResult = checkPlayLabPersonalBests(statD, outcome, newStats);
          newPersonalBests = pbResult.personalBests;
          newPbRecords = pbResult.newRecords;
          if (d.activeScenarioId && success) {
            var daily = getPlayLabDailyChallenge('football');
            if (daily && d.activeScenarioId === daily.id && newDailyCompleted !== todayKey()) {
              newDailyCompleted = todayKey();
              dailyJustCompleted = true;
            }
          }
          // Missions move on past every task this play finished (sometimes more than one).
          var openBefore = plFirstOpenTask(PLAYLAB_DRILLS, d.drillStats);
          var openAfter = plFirstOpenTask(PLAYLAB_DRILLS, newStats);
          if (missionsOn && openAfter > openBefore) taskJustCompleted = PLAYLAB_DRILLS.tasks[openBefore];
          newDrillTaskIdx = openAfter;
        }
        var seen = Object.assign({}, d.seenRuns || {});
        if (Object.keys(seen).length >= 400) seen = {};
        seen[runKey] = 1;
        // The matchup map (Scout tab) fills in one square per matchup the student has run.
        var scouted = d.scouted || {};
        if (!customCount) {
          scouted = Object.assign({}, scouted);
          scouted[play.id + '|' + coverage.id] = plGradeMatchup(play.id, coverage.id).grade;
        }
        // Mystery defense: the snap reveals the defense. The read is checked against the model's
        // own man / zone split, and pays once per hidden defense (a lucky guess on a defense
        // already read pays nothing more).
        var mysteryPatch = {};
        var mysteryMsg = '';
        var mysteryPay = false;
        if (mysteryHidden) {
          var fam = plCoverageFamily(coverage.id);
          var right = d.mysteryGuess === fam;
          var ms = Object.assign({ tries: 0, right: 0, paid: {} }, d.mysteryStats || {});
          ms = { tries: (ms.tries || 0) + 1, right: (ms.right || 0) + (right ? 1 : 0), paid: Object.assign({}, ms.paid || {}) };
          mysteryPay = right && !ms.paid[coverage.id];
          if (mysteryPay) ms.paid[coverage.id] = true;
          mysteryPatch = { mysterySolved: true, mysteryStats: ms,
            mysteryLast: { covId: coverage.id, guess: d.mysteryGuess, family: fam, right: right, playId: play.id } };
          mysteryMsg = plFill(right ? __alloT('stem.playlab.sr_mystery_right', 'The defense was {def}, a {fam} defense. Your read was right.')
            : __alloT('stem.playlab.sr_mystery_wrong', 'The defense was {def}, a {fam} defense. You said {guess}: not this time.'),
            { def: coverage.label, fam: fam, guess: d.mysteryGuess }) + ' ';
        }
        patchPlayLab(Object.assign({
          runActive: false, runT: o.endT + RESULT_HOLD, runOutcome: outcome,
          drillStats: newStats, drillTaskIdx: newDrillTaskIdx,
          badgesEarned: newEarned,
          dailyCompleted: newDailyCompleted,
          personalBests: newPersonalBests,
          playCatalog: catalogNext,
          seenRuns: seen, scouted: scouted, revealSig: setupSig
        }, mysteryPatch));
        plAnnounce(mysteryMsg + plVerdictText(o) + ' ' + plWhyText(sim.read) + ' ' + plBestText(o)
          + (counted ? '' : ' ' + __alloT('stem.playlab.repeat_no_credit', 'You already ran this exact call, so it does not count again. Change the play, the defense or the target.')));
        if (mysteryPay && awardXP) awardXP('playlab', 6, 'Mystery defense read');
        if (!counted) return;
        if (firedNew) {
          try {
            setPlCeleb(Object.assign({}, firedNew, { at: Date.now() }));
            schedulePlTimer(function () { setPlCeleb(null); }, 3500);
          } catch (e) {}
          if (addToast) addToast('🏅 Play Catalog: ' + firedNew.label + ' added (' + firedNew.total + ')');
        }
        if (success && awardXP) {
          if (o.type === 'run') awardXP('playlab', 8, 'Run gain');
          else awardXP('playlab', o.isBest ? 12 : 8, o.isBest ? 'Best read' : 'Completion');
        }
        newlyEarnedBadges.forEach(function(b, i) {
          schedulePlTimer(function() {
            plAnnounce('Badge unlocked: ' + b.label + '. ' + b.hint + '.');
            if (addToast) addToast('🏅 ' + b.emoji + ' ' + b.label + '!');
            if (awardXP) awardXP('playlab', 8, 'Badge: ' + b.label);
            if (celebrate && i === 0) celebrate();
          }, 1200 + (i * 800));
        });
        newPbRecords.forEach(function(r, i) {
          schedulePlTimer(function() {
            plAnnounce('NEW PERSONAL BEST: ' + r.label + ' — ' + r.value);
            if (addToast) addToast('🏆 New PB: ' + r.label + ' (' + r.value + ')');
            if (awardXP) awardXP('playlab', 12, 'Personal Best: ' + r.label);
            if (celebrate && i === 0) celebrate();
          }, 1800 + (i * 700));
        });
        if (dailyJustCompleted) {
          var dailyName = (getPlayLabDailyChallenge('football') || {}).label || 'Today\'s Challenge';
          schedulePlTimer(function() {
            plAnnounce('Daily Challenge complete: ' + dailyName + '!');
            if (addToast) addToast('🌟 Daily Challenge done!');
            if (awardXP) awardXP('playlab', 15, 'Daily Challenge');
            if (celebrate) celebrate();
          }, 600);
        }
        if (taskJustCompleted) {
          var allDone = newDrillTaskIdx >= PLAYLAB_DRILLS.tasks.length;
          schedulePlTimer(function() {
            if (allDone) {
              plAnnounce('Drill complete! All ' + PLAYLAB_DRILLS.tasks.length + ' coordinator tasks finished.');
              if (addToast) addToast('🏆 Coordinator Drills complete!');
              if (awardXP) awardXP('playlab', 25, 'Drill complete');
            } else {
              plAnnounce('Task done. Next goal: ' + PLAYLAB_DRILLS.tasks[newDrillTaskIdx].goal);
              if (addToast) addToast('✅ Drill task ' + (newDrillTaskIdx) + ' complete');
              if (awardXP) awardXP('playlab', 12, 'Drill task');
            }
          }, 800);
        }
      }

      // rAF loop — runs only while d.runActive is true. WCAG 2.3.3:
      // honor prefers-reduced-motion by snapping straight to the outcome
      // instead of animating.
      React.useEffect(function() {
        if (!d.runActive) return;
        var prefersReduced = false;
        try { prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

        // ── Soccer branch ──
        // The build-up passes, then the chosen pass on the model's clock, then the verdict.
        // With reduced motion the result comes at once: same result, same credit.
        if (isSoccer) {
          var so = soccerMove.outcome;
          var sRead = soccerMove.read;
          if (!so || !sRead) { patchPlayLab({ runActive: false, runT: 0 }); return; }
          var sCounted = !(d.seenRuns && d.seenRuns[soccerRunKey]);
          var finalXG = so.xG;
          var isShot = so.type === 'shot';
          var soccerOutcome = { sport: 'soccer', type: so.type, xG: finalXG, baseXG: so.baseXG, pressers: so.pressers,
            goalDist: so.goalDist, finalReceiverId: so.runnerId, runnerId: so.runnerId, optionId: so.optionId, isBest: so.isBest,
            bestId: so.bestId, bestRunnerId: so.bestRunnerId, bestXG: so.bestXG, cutRole: so.cutRole,
            counted: sCounted, key: soccerKey, runKey: soccerRunKey, endT: so.endT };
          var sQualOf = function(x) { return x >= PL_SOCCER.GOOD_XG ? 'a real chance' : x >= PL_SOCCER.FAIR_XG ? 'a fair chance' : 'a weak chance'; };
          var sSay = function(extra) {
            plAnnounce(plSoccerVerdict(so) + ' ' + plSoccerWhy(sRead) + ' ' + plSoccerBest(so)
              + (isShot ? ' ' + plFill(__alloT('stem.playlab.sr_soccer_quality', 'That is {q}.'), { q: sQualOf(finalXG) }) : '') + (extra ? ' ' + extra : ''));
          };
          // The Scout map fills in one square per setup run (this formation).
          var sScouted = Object.assign({}, d.scouted || {});
          sScouted['soccer|' + formationDef.id + '|' + concept.id + '|' + soccerShape.id] = plSoccerGrade(formationDef.id, concept.id, soccerShape.id).grade;
          var sSeen = Object.assign({}, d.seenRuns || {});
          if (Object.keys(sSeen).length >= 400) sSeen = {};
          sSeen[soccerRunKey] = 1;
          var resolveSoccerRun = function() {
            if (!sCounted) {
              patchPlayLab({ runActive: false, runT: SOCCER_TOTAL, runOutcome: soccerOutcome, revealSig: soccerKey, scouted: sScouted });
              sSay(__alloT('stem.playlab.repeat_no_credit_soccer_v2', 'You already ran this exact pass, so it does not count again. Change the pass, the move, the formation or the defense.'));
              return;
            }
            var good = isShot && finalXG >= PL_SOCCER.GOOD_XG;
            var fair = isShot && finalXG >= PL_SOCCER.FAIR_XG;
            var sStats = Object.assign({
              highXgShot: false, conceptsRun: {}, shapesPlayed: {}, shapesChance: {}, customHighXg: false,
              setPieceRun: false, setPieceTypesRun: {}, setPieceChance: false, bestPasses: 0, trapBeaten: false,
              hotStreak: 0
            }, d.drillStats || {});
            sStats.conceptsRun = Object.assign({}, sStats.conceptsRun); sStats.conceptsRun[concept.id] = true;
            sStats.shapesPlayed = Object.assign({}, sStats.shapesPlayed); sStats.shapesPlayed[soccerShape.id] = true;
            if (good) sStats.highXgShot = true;
            if (fair && soccerShape.id === 'lowblock') sStats.lowBlockChance = true;
            if (fair && soccerShape.id === 'offsidetrap' && soccerMove.shapeMatters) sStats.trapBeaten = true;
            if (fair) { sStats.shapesChance = Object.assign({}, sStats.shapesChance); sStats.shapesChance[soccerShape.id] = true; }
            if (fair && so.isBest) sStats.bestPasses = (sStats.bestPasses || 0) + 1;
            // Hot streak: a real chance keeps it going; anything else resets it.
            sStats.hotStreak = good ? (sStats.hotStreak || 0) + 1 : 0;
            if (soccerMove.setType) {
              sStats.setPieceRun = true;
              sStats.setPieceTypesRun = Object.assign({}, sStats.setPieceTypesRun); sStats.setPieceTypesRun[soccerMove.setType] = true;
              if (fair) sStats.setPieceChance = true;
            }
            // Missions: the first task not done yet, before and after this move.
            var sOpenBefore = plFirstOpenTask(PLAYLAB_SOCCER_DRILLS, d.drillStats);
            var sOpenAfter = plFirstOpenTask(PLAYLAB_SOCCER_DRILLS, sStats);
            var sTaskJustCompleted = (missionsOn && sOpenAfter > sOpenBefore) ? PLAYLAB_SOCCER_DRILLS.tasks[sOpenBefore] : null;
            var statD = Object.assign({}, d, { sport: 'soccer', conceptId: concept.id, shapeId: soccerShape.id, formationId: formationDef.id });
            var sNewEarned = Object.assign({}, d.badgesEarned || {});
            var sNewlyEarnedBadges = [];
            PLAYLAB_BADGES.forEach(function(b) {
              if (sNewEarned[b.id]) return;
              try {
                if (b.check(statD, soccerOutcome, sStats)) { sNewEarned[b.id] = Date.now(); sNewlyEarnedBadges.push(b); }
              } catch (e) { /* defensive */ }
            });
            var pbResultS = checkPlayLabPersonalBests(statD, soccerOutcome, sStats);
            var newDailyCompletedS = d.dailyCompleted || null;
            var dailyJustCompletedS = false;
            if (d.activeScenarioId && good) {
              var dailyS = getPlayLabDailyChallenge('soccer');
              if (dailyS && d.activeScenarioId === dailyS.id && newDailyCompletedS !== todayKey()) {
                newDailyCompletedS = todayKey();
                dailyJustCompletedS = true;
              }
            }
            // Play Catalog: the first real chance (xG 0.10 or more) from each move.
            var sCatPrev = (d.playCatalog && typeof d.playCatalog === 'object') ? d.playCatalog : {};
            var sCatNext = sCatPrev;
            var sFiredNew = null;
            if (good) {
              var sKey = 'soccer:' + concept.id;
              var sNowIso = new Date().toISOString();
              sCatNext = Object.assign({}, sCatPrev);
              if (sCatPrev[sKey]) {
                sCatNext[sKey] = Object.assign({}, sCatPrev[sKey], { lastSuccessAt: sNowIso, successCount: (sCatPrev[sKey].successCount || 0) + 1, bestXG: Math.max(sCatPrev[sKey].bestXG || 0, finalXG) });
              } else {
                sCatNext[sKey] = { firstSuccessAt: sNowIso, lastSuccessAt: sNowIso, successCount: 1, bestXG: finalXG, label: concept.label, icon: concept.icon || '⚽', sport: 'soccer' };
                sFiredNew = { key: sKey, label: concept.label, icon: concept.icon || '⚽', sport: 'soccer', total: Object.keys(sCatNext).length };
              }
            }
            patchPlayLab({
              runActive: false, runT: SOCCER_TOTAL, runOutcome: soccerOutcome,
              drillStats: sStats, drillTaskIdx: sOpenAfter,
              badgesEarned: sNewEarned, dailyCompleted: newDailyCompletedS,
              personalBests: pbResultS.personalBests, playCatalog: sCatNext,
              seenRuns: sSeen, scouted: sScouted, revealSig: soccerKey
            });
            sSay('');
            if (sFiredNew) {
              try {
                setPlCeleb(Object.assign({}, sFiredNew, { at: Date.now() }));
                schedulePlTimer(function () { setPlCeleb(null); }, 3500);
              } catch (e) {}
              if (addToast) addToast('🏅 Play Catalog: ' + sFiredNew.label + ' added (' + sFiredNew.total + ')');
            }
            if (good && awardXP) awardXP('playlab', so.isBest ? 12 : 8, so.isBest ? 'Best pass' : 'Real chance made');
            sNewlyEarnedBadges.forEach(function(b, i) {
              schedulePlTimer(function() {
                plAnnounce('Badge unlocked: ' + b.label + '. ' + b.hint + '.');
                if (addToast) addToast('🏅 ' + b.emoji + ' ' + b.label + '!');
                if (awardXP) awardXP('playlab', 8, 'Badge: ' + b.label);
                if (celebrate && i === 0) celebrate();
              }, 1200 + (i * 800));
            });
            pbResultS.newRecords.forEach(function(r, i) {
              schedulePlTimer(function() {
                plAnnounce('NEW PERSONAL BEST: ' + r.label + ' — ' + r.value);
                if (addToast) addToast('🏆 New PB: ' + r.label + ' (' + r.value + ')');
                if (awardXP) awardXP('playlab', 12, 'Personal Best: ' + r.label);
                if (celebrate && i === 0) celebrate();
              }, 1800 + (i * 700));
            });
            if (dailyJustCompletedS) {
              var dailyNameS = (getPlayLabDailyChallenge('soccer') || {}).label || 'Today\'s Challenge';
              schedulePlTimer(function() {
                plAnnounce('Daily Challenge complete: ' + dailyNameS + '!');
                if (addToast) addToast('🌟 Daily Challenge done!');
                if (awardXP) awardXP('playlab', 15, 'Daily Challenge');
                if (celebrate) celebrate();
              }, 600);
            }
            if (sTaskJustCompleted) {
              var sAllDone = sOpenAfter >= PLAYLAB_SOCCER_DRILLS.tasks.length;
              schedulePlTimer(function() {
                if (sAllDone) {
                  plAnnounce('Tactical Drills complete! All ' + PLAYLAB_SOCCER_DRILLS.tasks.length + ' tasks finished.');
                  if (addToast) addToast('🏆 Tactical Drills complete!');
                  if (awardXP) awardXP('playlab', 25, 'Drill complete');
                } else {
                  plAnnounce('Task done. Next goal: ' + PLAYLAB_SOCCER_DRILLS.tasks[sOpenAfter].goal);
                  if (addToast) addToast('✅ Drill task ' + sOpenAfter + ' complete');
                  if (awardXP) awardXP('playlab', 12, 'Drill task');
                }
              }, 800);
            }
          };
          if (prefersReduced) { resolveSoccerRun(); return; }
          var sStart = performance.now();
          var sRaf;
          function sStep() {
            var sElapsed = (performance.now() - sStart) / 1000;
            if (sElapsed >= SOCCER_TOTAL) { resolveSoccerRun(); return; }
            patchPlayLab({ runT: sElapsed });
            sRaf = requestAnimationFrame(sStep);
          }
          sRaf = requestAnimationFrame(sStep);
          return function() { if (sRaf) cancelAnimationFrame(sRaf); };
        }

        // ── Football branch ──
        if (prefersReduced) {
          resolveFootballRun();
          return;
        }
        var start = performance.now();
        var raf;
        function step() {
          var elapsed = (performance.now() - start) / 1000;
          if (elapsed >= TOTAL_DURATION) {
            resolveFootballRun();
            return;
          }
          patchPlayLab({
            runT: elapsed
          });
          raf = requestAnimationFrame(step);
        }
        raf = requestAnimationFrame(step);
        return function() { if (raf) cancelAnimationFrame(raf); };
      }, [d.runActive]);

      // ── Drag-to-place player editing ──
      // dragRef tracks the in-flight drag (playerId + last canvas coords).
      // mousedown picks the closest player within a generous radius;
      // mousemove updates customPositions (snapped to whole-yard grid);
      // mouseup ends the drag. Live region announces the start + end so
      // SR users know what changed and can read the new yard line.
      var dragRef = React.useRef({ playerId: null });
      // WCAG 2.5.7: a tap (press + release without moving) on a player picks
      // them up; the next tap on open field places them there. No drag needed.
      var _plPickedState = React.useState(null);
      var pickedPlayerId = _plPickedState[0];
      var setPickedPlayerId = _plPickedState[1];
      // WCAG 2.1.1: keyboard route for repositioning (same customPositions write as a drag).
      var _plKeyMoveState = React.useState('WR1');
      var keyMovePid = _plKeyMoveState[0];
      var setKeyMovePid = _plKeyMoveState[1];
      // The name a student sees is the one on the field and on the buttons (W1, SL), not the id (WR1, SLOT).
      function plWithPlayer(text, pid) { return String(text).split('{player}').join(String(PL_CODE[pid] || pid)); }
      function placePlayerAt(pid, yardX, yardY) {
        if (!Number.isFinite(yardX) || !Number.isFinite(yardY)) return null;
        var snappedX = Math.max(0.5, Math.min(FIELD_LENGTH - 0.5, Math.round(yardX)));
        var snappedY = Math.max(0.5, Math.min(FIELD_WIDTH - 0.5, Math.round(yardY)));
        patchPlayLab(function(prevPl) {
          var existing = Object.assign({}, (prevPl && prevPl.customPositions && typeof prevPl.customPositions === 'object') ? prevPl.customPositions : {});
          existing[pid] = { x: snappedX, y: snappedY };
          return Object.assign({}, prevPl, { customPositions: existing });
        });
        return { x: snappedX, y: snappedY };
      }
      function canvasYardCoords(evt) {
        var canvas = canvasRef.current; if (!canvas) return null;
        var rect = canvas.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return null;
        // The picture is drawn in logical (CSS) pixels; scale the pointer into them,
        // then use the SAME camera and map as the renderer so a tap lands where the eye says.
        var lW = canvas._plLogicalW || canvas.width;
        var lH = canvas._plLogicalH || canvas.height;
        if (!(lW > 0) || !(lH > 0)) return null;
        var nx = (evt.clientX - rect.left) * (lW / rect.width);
        var ny = (evt.clientY - rect.top) * (lH / rect.height);
        var cam = (dragRef.current && dragRef.current.cam) || plCamera(sim);
        var at = plFieldMap(lW, lH, cam).toField(nx, ny);
        if (!Number.isFinite(at.x) || !Number.isFinite(at.y)) return null;
        return { yardX: at.x, yardY: at.y };
      }
      function nearestPlayer(yardX, yardY, players) {
        var best = null, bestD = Infinity;
        players.forEach(function(p) {
          var dx = p.x - yardX, dy = p.y - yardY;
          var dist = Math.sqrt(dx * dx + dy * dy);
          // Within 4 yards = a generous click target since players render as 6px circles
          if (dist < 4 && dist < bestD) { bestD = dist; best = p; }
        });
        return best;
      }
      function handleMouseDown(evt) {
        // Drag editing is football-only: soccer formations are preset
        // (formationDef.build() ignores customPositions) and ids collide
        // across sports ('RB' = Running Back AND Right Back), so a soccer
        // drag would silently corrupt the football formation.
        if (isSoccer) return;
        if (d.runActive) return;   // no moving players while the play is live
        var c = canvasYardCoords(evt); if (!c) return;
        var p = nearestPlayer(c.yardX, c.yardY, formation);
        if (!p) {
          // Tap on open field while a player is picked up: place them here.
          if (pickedPlayerId) {
            placePlayerAt(pickedPlayerId, c.yardX, c.yardY);
            plAnnounce(plWithPlayer(__alloT('stem.playlab.sr_placed_player', 'Placed {player}. Position saved.'), pickedPlayerId));
            setPickedPlayerId(null);
          }
          return;
        }
        // The camera is frozen for the length of a drag, so the field does not rescale
        // under the finger when a player is pulled past the edge of the view.
        dragRef.current = { playerId: p.id, startX: c.yardX, startY: c.yardY, moved: false, cam: plCamera(sim) };
        plAnnounce('Dragging ' + p.id + '. Move to reposition.');
      }
      function handleMouseMove(evt) {
        if (!dragRef.current || !dragRef.current.playerId) return;
        var c = canvasYardCoords(evt); if (!c) return;
        // Snap to whole-yard grid + clamp to inside the field of play
        var dr = dragRef.current;
        if (!dr.moved && Math.abs(c.yardX - dr.startX) + Math.abs(c.yardY - dr.startY) > 0.75) dr.moved = true;
        placePlayerAt(dr.playerId, c.yardX, c.yardY);
      }
      function handleMouseUp(evt, leaving) {
        var dr = dragRef.current || {};
        var pid = dr.playerId;
        if (pid && (dr.moved || leaving)) {
          plAnnounce('Released ' + pid + '. Position saved.');
          if (pickedPlayerId) setPickedPlayerId(null);
        } else if (pid) {
          // Press and release in place = a tap: toggle the picked-up player.
          if (pickedPlayerId === pid) {
            setPickedPlayerId(null);
            plAnnounce(plWithPlayer(__alloT('stem.playlab.sr_player_put_down', '{player} put down.'), pid));
          } else if (pickedPlayerId) {
            // Already carrying a player: this tap places them, even beside a teammate.
            placePlayerAt(pickedPlayerId, dr.startX, dr.startY);
            plAnnounce(plWithPlayer(__alloT('stem.playlab.sr_placed_player', 'Placed {player}. Position saved.'), pickedPlayerId));
            setPickedPlayerId(null);
          } else {
            setPickedPlayerId(pid);
            plAnnounce(plWithPlayer(__alloT('stem.playlab.sr_picked_up_player', 'Picked up {player}. Tap the field where {player} should line up.'), pid));
          }
        }
        dragRef.current = { playerId: null };
      }

      // ── Scenario intro card (port of SkateLab SK3 / ThrowLab pattern) ──
      // When a one-click teaching demo loads, surface the scenario's
      // teach paragraph + discussion questions in a modal before
      // running the simulation. Replaces the previous hover-only
      // tooltip on the chip.
      var _plScenarioIntroState = React.useState(null);
      var scenarioIntro = _plScenarioIntroState[0];
      var setScenarioIntro = _plScenarioIntroState[1];
      React.useEffect(function() {
        if (!scenarioIntro || typeof window === 'undefined') return;
        function onEsc(e) {
          if (e.isComposing || e.keyCode === 229) return;
          if (e.key === 'Escape') {
            e.preventDefault();
            setScenarioIntro(null);
          }
        }
        window.addEventListener('keydown', onEsc);
        return function() { window.removeEventListener('keydown', onEsc); };
      }, [scenarioIntro]);

      // ── Field canvas ──
      var canvasRef = React.useRef(null);
      // PL5: HiDPI canvas setup. Without this, the canvas renders at
      // its attribute width (720) and gets scaled up by CSS to fill the
      // container — text on a retina display becomes blurry. We resize
      // the internal pixel buffer to match the device pixel ratio while
      // keeping the CSS size at the logical W/H, then setTransform every
      // frame so all draw calls operate in CSS px (no math changes).
      // Idempotent: only re-allocates when DPR or logical dims change.
      function _plSetupHiDPI(canvas, logicalW, logicalH) {
        var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        if (canvas._plDpr === dpr && canvas._plLogicalW === logicalW && canvas._plLogicalH === logicalH) return;
        canvas.width = Math.round(logicalW * dpr);
        canvas.height = Math.round(logicalH * dpr);
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas._plDpr = dpr;
        canvas._plLogicalW = logicalW;
        canvas._plLogicalH = logicalH;
      }
      // The canvas is drawn at its real on-screen size (CSS pixels), so 12 px text is
      // 12 px on a phone too. A ResizeObserver bumps this state when the box changes.
      var _plCanvasSizeState = React.useState({ w: 0, h: 0 });
      var canvasSize = _plCanvasSizeState[0];
      var setCanvasSize = _plCanvasSizeState[1];
      React.useEffect(function() {
        var canvas = canvasRef.current;
        if (!canvas || typeof window === 'undefined') return;
        function measure() {
          var w = Math.round(canvas.clientWidth || 0), hh = Math.round(canvas.clientHeight || 0);
          setCanvasSize(function(prev) { return (prev.w === w && prev.h === hh) ? prev : { w: w, h: hh }; });
        }
        measure();
        var ro = null;
        if (typeof window.ResizeObserver === 'function') {
          try { ro = new window.ResizeObserver(measure); ro.observe(canvas); } catch (e) { ro = null; }
        }
        window.addEventListener('resize', measure);
        return function() {
          window.removeEventListener('resize', measure);
          if (ro) { try { ro.disconnect(); } catch (e) {} }
        };
      }, []);
      // Reduced motion is read LIVE: a student who turns it on mid-session gets it at once.
      var _plReducedState = React.useState(false);
      var plReducedLive = _plReducedState[0];
      var setPlReducedLive = _plReducedState[1];
      React.useEffect(function() {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        var mq;
        try { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { return; }
        if (!mq) return;
        function onChange() { setPlReducedLive(!!mq.matches); }
        onChange();
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else if (mq.addListener) mq.addListener(onChange);
        return function() {
          if (mq.removeEventListener) mq.removeEventListener('change', onChange);
          else if (mq.removeListener) mq.removeListener(onChange);
        };
      }, []);
      React.useEffect(function() {
        var canvas = canvasRef.current; if (!canvas) return;
        // Logical size = the size on screen (fallback 720 x 400 before layout, e.g. in tests).
        var logicalW = Math.round(canvas.clientWidth || 0) || 720;
        var logicalH = Math.round(canvas.clientHeight || 0) || Math.round(logicalW * 5 / 9);
        _plSetupHiDPI(canvas, logicalW, logicalH);
        var gfx = canvas.getContext && canvas.getContext('2d');
        if (!gfx) return;
        // Apply the DPR scale every frame so all subsequent draw calls
        // are in logical (CSS) pixels regardless of the internal buffer.
        gfx.setTransform(canvas._plDpr, 0, 0, canvas._plDpr, 0, 0);
        // Crisper text on hidpi screens
        gfx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in gfx) gfx.imageSmoothingQuality = 'high';
        var W = canvas._plLogicalW;
        var H = canvas._plLogicalH;
        var plIsContrast = _plIsHighContrast();
        var hasRadial = !plIsContrast && typeof gfx.createRadialGradient === 'function';
        var hasLinear = !plIsContrast && typeof gfx.createLinearGradient === 'function';
        var plReduced = !!plReducedLive;
        try {
          plReduced = plReduced || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) {}
        var plMotionOn = !plReduced && !plIsContrast;
        var runT = d.runT || 0;
        function _plRoundRectPath(x, y, rw, rh, rad) {
          var r = Math.min(rad, rw / 2, rh / 2);
          gfx.beginPath();
          gfx.moveTo(x + r, y);
          gfx.lineTo(x + rw - r, y);
          if (typeof gfx.arcTo === 'function') {
            gfx.arcTo(x + rw, y, x + rw, y + r, r);
            gfx.lineTo(x + rw, y + rh - r);
            gfx.arcTo(x + rw, y + rh, x + rw - r, y + rh, r);
            gfx.lineTo(x + r, y + rh);
            gfx.arcTo(x, y + rh, x, y + rh - r, r);
            gfx.lineTo(x, y + r);
            gfx.arcTo(x, y, x + r, y, r);
          } else {
            gfx.lineTo(x + rw, y + rh);
            gfx.lineTo(x, y + rh);
            gfx.lineTo(x, y);
          }
          gfx.closePath();
        }
        function _plDrawActorToken(ax, ay, rad, baseColor, highlightColor, strokeColor, label, textColor, fontPx) {
          gfx.save();
          // Grounded elliptical contact shadow (bypassed in high contrast)
          if (!plIsContrast) {
            gfx.fillStyle = 'rgba(2,6,23,0.42)';
            gfx.beginPath();
            _plSafeEllipse(gfx, ax + 1.4, ay + rad * 0.62, rad * 0.96, rad * 0.48, 0, 0, Math.PI * 2);
            gfx.fill();
          }
          if (hasRadial) {
            var sg = gfx.createRadialGradient(ax - rad * 0.34, ay - rad * 0.34, rad * 0.12, ax, ay, rad);
            sg.addColorStop(0, highlightColor);
            sg.addColorStop(0.7, baseColor);
            sg.addColorStop(1, baseColor);
            gfx.fillStyle = sg;
          } else {
            gfx.fillStyle = baseColor;
          }
          gfx.beginPath();
          gfx.arc(ax, ay, rad, 0, Math.PI * 2);
          gfx.fill();
          gfx.strokeStyle = plIsContrast ? '#ffffff' : strokeColor;
          gfx.lineWidth = plIsContrast ? 1.8 : 1.5;
          gfx.stroke();
          if (label) {
            gfx.fillStyle = textColor;
            gfx.font = 'bold ' + fontPx + 'px system-ui';
            gfx.textAlign = 'center';
            gfx.textBaseline = 'middle';
            gfx.fillText(label, ax, ay + 0.5);
            gfx.textBaseline = 'alphabetic';
          }
          gfx.restore();
        }
        // PL: "Hot Hand" momentum made visible ON THE FIELD. When the student
        // is on a 3+ completion streak ("ON FIRE"), the ball's motion trail
        // burns ember-orange and a warm vignette frames the field — so the
        // HUD streak label pays off as on-field juice, not just a text pill.
        var _hotStreak = (d.drillStats || {}).hotStreak || 0;
        var _onFire = _hotStreak >= 3;
        function _plDrawOnFire() {
          if (!_onFire || plIsContrast) return;
          var _emberPulse = (d.runActive && !plReduced) ? (0.42 + 0.26 * Math.abs(Math.sin((runT || 0) * 3))) : 0.5;
          gfx.save();
          gfx.lineWidth = _hotStreak >= 5 ? 6 : 4;
          gfx.strokeStyle = 'rgba(239,68,68,' + _emberPulse.toFixed(2) + ')';
          gfx.shadowColor = 'rgba(251,146,60,0.9)';
          gfx.shadowBlur = 16;
          gfx.strokeRect(gfx.lineWidth / 2, gfx.lineWidth / 2, W - gfx.lineWidth, H - gfx.lineWidth);
          gfx.restore();
        }
        // The result line in the 28 px strip above the field (both sports). Dark tones, so the
        // white text stays above 4.5:1; the clock on the left stays visible.
        function _plResultStrip(text, tone) {
          gfx.fillStyle = plIsContrast ? '#000000' : (tone === 'good' ? '#166534' : tone === 'bad' ? '#991b1b' : '#92400e');
          gfx.fillRect(56, 0, W - 56, 28);
          gfx.font = 'bold 13px system-ui'; gfx.textAlign = 'left'; gfx.textBaseline = 'middle';
          gfx.fillStyle = plIsContrast ? '#ffff00' : '#ffffff';
          gfx.fillText(text, 64, 14.5, Math.max(40, W - 64 - 54));
          gfx.textBaseline = 'alphabetic';
        }
        gfx.clearRect(0, 0, W, H);

        if (!isSoccer) {
          // ═══ FOOTBALL: play-art view. Offense at the bottom, downfield is up. ═══
          // Every position comes from plFrameAt(sim, t): the same model the verdict uses.
          var cam = (dragRef.current && dragRef.current.cam) || plCamera(sim);
          var map = plFieldMap(W, H, cam);
          var S = map.s;
          var fL = map.px(FIELD_WIDTH), fR = map.px(0);
          var yTop = map.py(cam.x1), yBot = map.py(cam.x0);
          var o = sim.outcome;
          var read = sim.read;
          // Clock: live during a run, frozen on the catch moment after it, zero before.
          var showT = d.runActive ? Math.min(runT, o ? o.endT : 0) : (liveOutcome ? liveOutcome.endT : 0);
          var frame = plFrameAt(sim, showT);
          var done = !!liveOutcome || (d.runActive && o && runT >= o.endT);
          var R = Math.max(11, Math.min(14, S * 1.25));        // receiver / QB token radius
          var colLine = plIsContrast ? '#ffffff' : 'rgba(255,255,255,0.42)';
          // Apron + turf
          gfx.fillStyle = plIsContrast ? '#000000' : '#0b1f14';
          gfx.fillRect(0, 0, W, H);
          gfx.fillStyle = plIsContrast ? '#000000' : '#2b6a40';
          gfx.fillRect(fL, yTop, fR - fL, yBot - yTop);
          if (!plIsContrast) {
            gfx.fillStyle = 'rgba(0,0,0,0.075)';
            for (var band = Math.floor(cam.x0 / 10) * 10; band < cam.x1; band += 10) {
              var b0 = Math.max(cam.x0, band), b1 = Math.min(cam.x1, band + 5);
              if (b1 > b0) gfx.fillRect(fL, map.py(b1), fR - fL, map.py(b0) - map.py(b1));
            }
          }
          // End zones (only when the camera reaches them)
          [[0, END_ZONE_DEPTH], [FIELD_LENGTH - END_ZONE_DEPTH, FIELD_LENGTH]].forEach(function(ez) {
            var e0 = Math.max(cam.x0, ez[0]), e1 = Math.min(cam.x1, ez[1]);
            if (e1 <= e0) return;
            gfx.fillStyle = plIsContrast ? '#000000' : '#1b4a2c';
            gfx.fillRect(fL, map.py(e1), fR - fL, map.py(e0) - map.py(e1));
            if ((e1 - e0) * S >= 16) {
              gfx.fillStyle = plIsContrast ? '#ffffff' : 'rgba(255,255,255,0.62)';
              gfx.font = 'bold 12px system-ui'; gfx.textAlign = 'center'; gfx.textBaseline = 'middle';
              gfx.fillText('END ZONE', (fL + fR) / 2, (map.py(e0) + map.py(e1)) / 2);
              gfx.textBaseline = 'alphabetic';
            }
          });
          // Yard lines every 5, numbers every 10 (NFL style: 10 20 30 40 50 40 30 20 10)
          var fbNumBoxes = [];
          for (var yd = Math.ceil(cam.x0 / 5) * 5; yd <= cam.x1; yd += 5) {
            if (yd < END_ZONE_DEPTH || yd > FIELD_LENGTH - END_ZONE_DEPTH) continue;
            var ly = map.py(yd);
            gfx.strokeStyle = colLine;
            gfx.lineWidth = (yd % 10 === 0) ? 1.6 : 0.8;
            gfx.beginPath(); gfx.moveTo(fL, ly); gfx.lineTo(fR, ly); gfx.stroke();
            if (yd % 10 === 0 && yd > END_ZONE_DEPTH && yd < FIELD_LENGTH - END_ZONE_DEPTH) {
              var num = yd <= 60 ? yd - 10 : 110 - yd;
              gfx.fillStyle = plIsContrast ? '#ffffff' : 'rgba(255,255,255,0.6)';
              gfx.font = 'bold 12px system-ui'; gfx.textAlign = 'center';
              gfx.fillText(String(num), fL + 16, ly - 4);
              gfx.fillText(String(num), fR - 16, ly - 4);
              fbNumBoxes.push({ x: fL + 4, y: ly - 16, w: 24, h: 14 }, { x: fR - 28, y: ly - 16, w: 24, h: 14 });
            }
          }
          // Hash marks: one tick per yard
          gfx.strokeStyle = plIsContrast ? '#ffffff' : 'rgba(255,255,255,0.3)';
          gfx.lineWidth = 1;
          for (var hd = Math.max(END_ZONE_DEPTH + 1, Math.ceil(cam.x0)); hd < Math.min(FIELD_LENGTH - END_ZONE_DEPTH, cam.x1); hd++) {
            var hy = map.py(hd);
            gfx.beginPath(); gfx.moveTo(map.px(HASH_LEFT) - 3, hy); gfx.lineTo(map.px(HASH_LEFT) + 3, hy); gfx.stroke();
            gfx.beginPath(); gfx.moveTo(map.px(HASH_RIGHT) - 3, hy); gfx.lineTo(map.px(HASH_RIGHT) + 3, hy); gfx.stroke();
          }
          // Sidelines
          gfx.strokeStyle = plIsContrast ? '#ffffff' : 'rgba(255,255,255,0.8)';
          gfx.lineWidth = 2;
          gfx.beginPath(); gfx.moveTo(fL, yTop); gfx.lineTo(fL, yBot); gfx.moveTo(fR, yTop); gfx.lineTo(fR, yBot); gfx.stroke();
          // Coverage zones (the patch each zone defender guards). Mystery defense: not drawn
          // until the snap has shown the defense (zones, links and names would give it away).
          var zonesOn = !!d.showZones && !mysteryHidden;
          if (zonesOn) {
            for (var zi = 0; zi < zones.length; zi++) {
              var z = zones[zi];
              var zx0 = Infinity, zx1 = -Infinity, zy0 = Infinity, zy1 = -Infinity;
              z.poly.forEach(function(pt) { zx0 = Math.min(zx0, pt[0]); zx1 = Math.max(zx1, pt[0]); zy0 = Math.min(zy0, pt[1]); zy1 = Math.max(zy1, pt[1]); });
              zx0 = Math.max(cam.x0, zx0); zx1 = Math.min(cam.x1, zx1);
              if (zx1 <= zx0) continue;
              gfx.fillStyle = plIsContrast ? 'rgba(255,255,0,0.14)' : z.color;
              gfx.fillRect(map.px(zy1), map.py(zx1), map.px(zy0) - map.px(zy1), map.py(zx0) - map.py(zx1));
              gfx.strokeStyle = plIsContrast ? '#ffff00' : z.color.replace(/[\d.]+\)$/, '0.6)');
              gfx.lineWidth = plIsContrast ? 1.5 : 1;
              gfx.strokeRect(map.px(zy1), map.py(zx1), map.px(zy0) - map.px(zy1), map.py(zx0) - map.py(zx1));
            }
          }
          // Line of scrimmage (blue) and first-down line (yellow)
          var losY = map.py(sim.losX);
          gfx.strokeStyle = plIsContrast ? '#00ffff' : '#60a5fa';
          gfx.lineWidth = 3;
          gfx.beginPath(); gfx.moveTo(fL, losY); gfx.lineTo(fR, losY); gfx.stroke();
          var fdX = sim.losX + PL_MODEL.FIRST_DOWN;
          if (fdX < FIELD_LENGTH - END_ZONE_DEPTH && fdX <= cam.x1) {
            gfx.strokeStyle = plIsContrast ? '#ffff00' : '#facc15';
            gfx.lineWidth = 3;
            gfx.beginPath(); gfx.moveTo(fL, map.py(fdX)); gfx.lineTo(fR, map.py(fdX)); gfx.stroke();
          }
          // Routes. The chosen target's route is drawn bold; the rest stay thin.
          if (d.showRoutes) {
            for (var rfi = 0; rfi < sim.offense.length; rfi++) {
              var rp = sim.offense[rfi];
              if (!rp.route || rp.route.length < 2) continue;
              var isTgt = !!(read && read.id === rp.id);
              gfx.save();
              gfx.lineCap = 'round'; gfx.lineJoin = 'round';
              gfx.globalAlpha = (read && !isTgt) ? 0.6 : 1;
              gfx.strokeStyle = plIsContrast ? '#ffff00' : (isTgt ? '#fde047' : '#fbbf24');
              gfx.lineWidth = isTgt ? 4.5 : 2.4;
              gfx.beginPath();
              for (var rpi = 0; rpi < rp.route.length; rpi++) {
                var rx0 = map.px(rp.route[rpi].y), ry0 = map.py(rp.route[rpi].x);
                if (rpi === 0) gfx.moveTo(rx0, ry0); else gfx.lineTo(rx0, ry0);
              }
              gfx.stroke();
              var ra = rp.route[rp.route.length - 2], rb = rp.route[rp.route.length - 1];
              var rang = Math.atan2(map.py(rb.x) - map.py(ra.x), map.px(rb.y) - map.px(ra.y));
              var ah = isTgt ? 12 : 9;
              gfx.fillStyle = gfx.strokeStyle;
              gfx.beginPath();
              gfx.moveTo(map.px(rb.y), map.py(rb.x));
              gfx.lineTo(map.px(rb.y) - ah * Math.cos(rang - 0.45), map.py(rb.x) - ah * Math.sin(rang - 0.45));
              gfx.lineTo(map.px(rb.y) - ah * Math.cos(rang + 0.45), map.py(rb.x) - ah * Math.sin(rang + 0.45));
              gfx.closePath(); gfx.fill();
              gfx.restore();
            }
          }
          // Man-coverage links before the snap: who is copying whom.
          if (zonesOn && showT === 0) {
            gfx.save();
            gfx.strokeStyle = plIsContrast ? '#ff5555' : 'rgba(252,165,165,0.75)';
            gfx.lineWidth = 1.4;
            if (typeof gfx.setLineDash === 'function') gfx.setLineDash([3, 4]);
            sim.defenders.forEach(function(def) {
              if (plDefenderMode(def, sim.offense) !== 'man') return;
              var man = sim.offense.filter(function(p) { return p.id === def.assign; })[0];
              if (!man) return;
              gfx.beginPath(); gfx.moveTo(map.px(def.y), map.py(def.x)); gfx.lineTo(map.px(man.y), map.py(man.x)); gfx.stroke();
            });
            if (typeof gfx.setLineDash === 'function') gfx.setLineDash([]);
            gfx.restore();
          }
          // Zone names, next to each zone defender's starting spot. Every player on the field (as
          // drawn now), the yard numbers, the fullscreen button and the names already placed are
          // obstacles: a name goes above, below or beside its defender where it touches none of
          // them, and is left off when there is no room (on a phone; the key under the field
          // says what the shading means). Names used to sit on top of defenders and each other.
          var fbTokens = [];
          frame.defenders.forEach(function(D) {
            var hw0 = D.mode === 'rush' ? 6 : R;
            fbTokens.push({ x: map.px(D.y) - hw0, y: map.py(D.x) - hw0, w: hw0 * 2, h: hw0 * 2 });
          });
          frame.offense.forEach(function(p) {
            var r0 = p.role === 'OL' ? 6.5 : R + 1;
            fbTokens.push({ x: map.px(p.y) - r0, y: map.py(p.x) - r0, w: r0 * 2, h: r0 * 2 });
          });
          var fbLabels = [];
          if (zonesOn) {
            gfx.font = 'bold 12px system-ui'; gfx.textAlign = 'center'; gfx.textBaseline = 'middle';
            var fbObs = fbTokens.concat(fbNumBoxes, [{ x: W - 56, y: 0, w: 56, h: 54 }]);
            var fbBounds = { x: fL + 2, y: Math.max(30, yTop + 1), w: fR - fL - 4, h: Math.min(H, yBot) - Math.max(30, yTop + 1) - 1 };
            sim.defenders.forEach(function(def) {
              if (plDefenderMode(def, sim.offense) !== 'zone' || !def.zoneName) return;
              if (def.x > cam.x1 || def.x < cam.x0) return;
              var label = plZoneShort(def.zoneName);
              var lw = gfx.measureText(label).width + 6, lh = 15;
              var cx = map.px(def.y), cy = map.py(def.x);
              var spot = plFreeSpot([
                { cx: cx, cy: cy - R - 9 }, { cx: cx, cy: cy + R + 9 },
                { cx: cx + R + 4 + lw / 2, cy: cy }, { cx: cx - R - 4 - lw / 2, cy: cy },
                { cx: cx + lw / 2, cy: cy - R - 9 }, { cx: cx - lw / 2, cy: cy - R - 9 },
                { cx: cx + lw / 2, cy: cy + R + 9 }, { cx: cx - lw / 2, cy: cy + R + 9 }
              ], lw, lh, fbObs.concat(fbLabels), fbBounds);
              if (!spot) return;
              spot.text = label;
              fbLabels.push(spot);
              if (!plIsContrast) { gfx.fillStyle = 'rgba(2,6,23,0.55)'; _plRoundRectPath(spot.x, spot.y, spot.w, spot.h, 4); gfx.fill(); }
              gfx.fillStyle = plIsContrast ? '#ffff00' : 'rgba(255,255,255,0.95)';
              gfx.fillText(label, spot.x + spot.w / 2, spot.y + spot.h / 2 + 0.5);
            });
            gfx.textBaseline = 'alphabetic';
          }
          canvas._plLayout = { labels: fbLabels, tokens: fbTokens };
          // Defenders: red squares (zone / man) and small dark squares (rushers).
          frame.defenders.forEach(function(D) {
            var dx0 = map.px(D.y), dy0 = map.py(D.x);
            if (D.mode === 'rush') {
              gfx.fillStyle = plIsContrast ? '#000000' : '#7f1d1d';
              gfx.strokeStyle = plIsContrast ? '#ff5555' : '#fca5a5';
              gfx.lineWidth = 1.4;
              gfx.fillRect(dx0 - 5.5, dy0 - 5.5, 11, 11);
              gfx.strokeRect(dx0 - 5.5, dy0 - 5.5, 11, 11);
              return;
            }
            var hw = R - 1;
            if (!plIsContrast) { gfx.fillStyle = 'rgba(2,6,23,0.4)'; gfx.fillRect(dx0 - hw + 2, dy0 - hw + 3, hw * 2, hw * 2); }
            _plRoundRectPath(dx0 - hw, dy0 - hw, hw * 2, hw * 2, 4);
            gfx.fillStyle = plIsContrast ? '#000000' : '#dc2626';
            gfx.fill();
            gfx.strokeStyle = plIsContrast ? '#ff5555' : '#fecaca';
            gfx.lineWidth = 1.5;
            gfx.stroke();
            gfx.fillStyle = '#ffffff';
            gfx.font = 'bold 12px system-ui'; gfx.textAlign = 'center'; gfx.textBaseline = 'middle';
            gfx.fillText(D.role, dx0, dy0 + 0.5);
            gfx.textBaseline = 'alphabetic';
          });
          // Offense: small grey dots for the line, labelled circles for the six who matter.
          frame.offense.forEach(function(p) {
            var ox0 = map.px(p.y), oy0 = map.py(p.x);
            if (p.role === 'OL') {
              gfx.fillStyle = plIsContrast ? '#ffffff' : '#94a3b8';
              gfx.strokeStyle = '#0f172a'; gfx.lineWidth = 1;
              gfx.beginPath(); gfx.arc(ox0, oy0, 5.5, 0, Math.PI * 2); gfx.fill(); gfx.stroke();
              if (p.id === pickedPlayerId && !d.runActive) {
                gfx.strokeStyle = '#facc15'; gfx.lineWidth = 2.5;
                gfx.beginPath(); gfx.arc(ox0, oy0, 9, 0, Math.PI * 2); gfx.stroke();
              }
              return;
            }
            var isTarget = !!(read && read.id === p.id);
            var rd = null;
            for (var ri = 0; ri < sim.reads.length; ri++) if (sim.reads[ri].id === p.id) rd = sim.reads[ri];
            // After the play: green ring = was open, on every receiver (the film room).
            if (revealed && d.showOpen && rd && rd.open && !d.runActive) {
              gfx.strokeStyle = plIsContrast ? '#00ff00' : '#4ade80';
              gfx.lineWidth = 3;
              gfx.beginPath(); gfx.arc(ox0, oy0, R + 6, 0, Math.PI * 2); gfx.stroke();
            }
            if (isTarget) {
              gfx.strokeStyle = plIsContrast ? '#ffff00' : '#fde047';
              gfx.lineWidth = 3;
              gfx.beginPath(); gfx.arc(ox0, oy0, R + 3, 0, Math.PI * 2); gfx.stroke();
            }
            if (p.id === pickedPlayerId && !d.runActive) {
              gfx.save();
              gfx.strokeStyle = '#facc15'; gfx.lineWidth = 2.5;
              if (typeof gfx.setLineDash === 'function') gfx.setLineDash([4, 3]);
              gfx.beginPath(); gfx.arc(ox0, oy0, R + 8, 0, Math.PI * 2); gfx.stroke();
              gfx.restore();
            }
            var fill = p.role === 'QB' ? '#fbbf24' : p.role === 'RB' ? '#fb923c' : '#f8fafc';
            var hi = p.role === 'QB' ? '#fef9c3' : p.role === 'RB' ? '#fed7aa' : '#ffffff';
            _plDrawActorToken(ox0, oy0, R, plIsContrast ? '#ffffff' : fill, plIsContrast ? '#ffffff' : hi, '#0f172a', PL_CODE[p.id] || p.id, '#0f172a', 12);
          });
          // The ball
          if (frame.ball) {
            var bx0 = map.px(frame.ball.y), by0 = map.py(frame.ball.x);
            var lift = frame.ball.held ? 0 : Math.sin((frame.ball.f || 0) * Math.PI) * Math.min(22, (read ? read.throwYd : 10) * S * 0.09);
            if (!frame.ball.held && plMotionOn && read) {
              var qbp = sim.offense.filter(function(p) { return p.id === 'QB'; })[0];
              for (var ti = 1; ti <= 6; ti++) {
                var tf = (frame.ball.f || 0) - ti * 0.045;
                if (tf <= 0) break;
                var tx0 = map.px(qbp.y + (read.spot.y - qbp.y) * tf);
                var ty0 = map.py(qbp.x + (read.spot.x - qbp.x) * tf) - Math.sin(tf * Math.PI) * Math.min(22, read.throwYd * S * 0.09);
                gfx.fillStyle = (_onFire ? 'rgba(251,146,60,' : 'rgba(254,226,182,') + ((1 - ti / 7) * 0.55).toFixed(3) + ')';
                gfx.beginPath(); gfx.arc(tx0, ty0, Math.max(1.2, 4 - ti * 0.4), 0, Math.PI * 2); gfx.fill();
              }
            }
            if (!plIsContrast && !frame.ball.held) {
              gfx.fillStyle = 'rgba(2,6,23,0.35)';
              gfx.beginPath(); _plSafeEllipse(gfx, bx0, by0 + 2, 5, 2.4, 0, 0, Math.PI * 2); gfx.fill();
            }
            gfx.fillStyle = plIsContrast ? '#ffff00' : '#92400e';
            gfx.strokeStyle = '#ffffff'; gfx.lineWidth = 1.2;
            gfx.beginPath();
            _plSafeEllipse(gfx, bx0 + (frame.ball.held ? R * 0.7 : 0), by0 - lift - (frame.ball.held ? R * 0.7 : 0), 6, 3.8, -0.6, 0, Math.PI * 2);
            gfx.fill(); gfx.stroke();
          }
          // The catch moment: the gap between the receiver and the nearest defender,
          // drawn to scale and labelled in yards. This picture stays up after the play,
          // so the result never depends on having watched the motion.
          if (done && read && o) {
            var sx0 = map.px(read.spot.y), sy0 = map.py(read.spot.x);
            var good = !!o.success;
            var ink = plIsContrast ? (good ? '#00ff00' : '#ff5555') : (good ? '#4ade80' : '#f87171');
            if (o.type === 'sack') {
              var qbf = frame.offense.filter(function(p) { return p.id === 'QB'; })[0];
              var qx = map.px(qbf.y), qy = map.py(qbf.x);
              gfx.strokeStyle = ink; gfx.lineWidth = 3;
              gfx.beginPath(); gfx.arc(qx, qy, R + 9, 0, Math.PI * 2); gfx.stroke();
            } else if (read.run) {
              gfx.strokeStyle = ink; gfx.lineWidth = 3;
              gfx.beginPath(); gfx.arc(sx0, sy0, R + 9, 0, Math.PI * 2); gfx.stroke();
            } else if (read.nearest) {
              var nd = null;
              frame.defenders.forEach(function(D) { if (D.id === read.nearest.id) nd = D; });
              if (nd) {
                var nx0 = map.px(nd.y), ny0 = map.py(nd.x);
                gfx.strokeStyle = ink; gfx.lineWidth = 3;
                gfx.beginPath(); gfx.moveTo(sx0, sy0); gfx.lineTo(nx0, ny0); gfx.stroke();
                gfx.beginPath(); gfx.arc(sx0, sy0, R + 9, 0, Math.PI * 2); gfx.stroke();
                var gapLabel = plNum(read.gapYd) + ' yd';
                gfx.font = 'bold 13px system-ui';
                var gw = gfx.measureText(gapLabel).width + 12;
                var gx = Math.max(fL + gw / 2 + 2, Math.min(fR - gw / 2 - 2, sx0));
                var gy = Math.max(yTop + 12, sy0 - R - 22);
                _plRoundRectPath(gx - gw / 2, gy - 11, gw, 22, 6);
                gfx.fillStyle = plIsContrast ? '#000000' : 'rgba(2,6,23,0.9)';
                gfx.fill();
                gfx.strokeStyle = ink; gfx.lineWidth = 1.5; gfx.stroke();
                gfx.fillStyle = ink; gfx.textAlign = 'center'; gfx.textBaseline = 'middle';
                gfx.fillText(gapLabel, gx, gy + 0.5);
                gfx.textBaseline = 'alphabetic';
              }
            }
          }
          // Top strip: the clock and the pocket (time until the rush arrives).
          gfx.fillStyle = plIsContrast ? '#000000' : 'rgba(2,6,23,0.86)';
          gfx.fillRect(0, 0, W, 28);
          gfx.font = 'bold 13px ui-monospace, monospace'; gfx.textAlign = 'left'; gfx.textBaseline = 'middle';
          gfx.fillStyle = plIsContrast ? '#ffff00' : '#fde68a';
          gfx.fillText(plNum(showT) + ' s', 8, 14.5);
          var barX = 62, barW = Math.max(60, Math.min(170, W - 62 - 150));
          var left = Math.max(0, 1 - showT / sim.pocket);
          gfx.fillStyle = plIsContrast ? '#000000' : '#1e293b';
          gfx.fillRect(barX, 9, barW, 10);
          gfx.fillStyle = plIsContrast ? '#00ff00' : (left > 0.4 ? '#4ade80' : left > 0.15 ? '#fbbf24' : '#f87171');
          gfx.fillRect(barX, 9, barW * left, 10);
          gfx.strokeStyle = plIsContrast ? '#ffffff' : '#94a3b8'; gfx.lineWidth = 1;
          gfx.strokeRect(barX, 9, barW, 10);
          gfx.font = 'bold 12px system-ui';
          gfx.fillStyle = plIsContrast ? '#ffffff' : '#e2e8f0';
          // Mystery defense: the pocket time would give a blitz away, so it shows at the snap.
          gfx.fillText(sim.isRun ? 'Run play' : ((mysteryHidden && !d.runActive) ? 'Pocket ? s' : ('Pocket ' + plNum(sim.pocket) + ' s')), barX + barW + 8, 14.5);
          gfx.textBaseline = 'alphabetic';
          // The result, once the play is over, takes the strip. The strip is outside the field,
          // so it never covers a player (the banner used to sit on the field: at the goal line it
          // covered the deep defenders and the "Free safety" label).
          if (liveOutcome) {
            var bannerText = liveOutcome.type === 'sack' ? ('Sack: lose ' + Math.abs(liveOutcome.yards) + ' yd')
              : liveOutcome.type === 'brokenup' ? ('Covered: pass to ' + plWho(liveOutcome.receiverId) + ' knocked away')
              : liveOutcome.type === 'run' ? (plWho(liveOutcome.receiverId) + ' runs: ' + (liveOutcome.yards > 0 ? '+' : '') + liveOutcome.yards + ' yd')
              : ('Complete to ' + plWho(liveOutcome.receiverId) + ': ' + (liveOutcome.yards > 0 ? '+' : '') + liveOutcome.yards + ' yd');
            if (liveOutcome.touchdown) bannerText += ' · TOUCHDOWN';
            else if (liveOutcome.firstDown) bannerText += ' · First down';
            _plResultStrip(bannerText, liveOutcome.success ? 'good' : (liveOutcome.type === 'sack' ? 'bad' : 'meh'));
          }
          _plDrawOnFire();
          return;
        }

        // ═══ SOCCER: play-art view like football. Their goal at the top, your team going up. ═══
        // Every position comes from soccerMove / plSoccerFrameAt: the same model as the verdict.
        var sm = soccerMove;
        var sCam = plSoccerCamera(sm);
        var pm = plPitchMap(W, H, sCam);
        var sS = pm.s;
        var pL = pm.px(PITCH_WIDTH), pR = pm.px(0);
        var pTop = pm.py(PITCH_LENGTH), pBot = pm.py(sCam.x0);
        var so = sm.outcome, sRead = sm.read;
        var sBuildT = sm.buildT;
        // Clock: the build-up first, then the move from t = 0. Frozen on the end after the run.
        var animT = d.runActive ? runT : (soccerLive ? sBuildT + so.endT : 0);
        var inBuild = d.runActive && animT < sBuildT;
        var modelT = Math.max(0, animT - sBuildT);
        var running = d.runActive || !!soccerLive;
        var sFrame = running && !inBuild ? plSoccerFrameAt(sm, modelT)
          : { t: 0, attackers: sm.attackers, defenders: sm.defenders, ball: { x: sm.passer.x, y: sm.passer.y, air: 0 } };
        var sDone = !!soccerLive || (d.runActive && so && modelT >= so.endT);
        var lineCol = plIsContrast ? '#ffffff' : 'rgba(255,255,255,0.78)';
        function sLine(x1, y1, x2, y2) { gfx.beginPath(); gfx.moveTo(pm.px(y1), pm.py(x1)); gfx.lineTo(pm.px(y2), pm.py(x2)); gfx.stroke(); }
        function sArrowHead(x1, y1, x2, y2, size) {
          var ax1 = pm.px(y1), ay1 = pm.py(x1), ax2 = pm.px(y2), ay2 = pm.py(x2);
          var an = Math.atan2(ay2 - ay1, ax2 - ax1);
          gfx.beginPath();
          gfx.moveTo(ax2, ay2);
          gfx.lineTo(ax2 - size * Math.cos(an - 0.45), ay2 - size * Math.sin(an - 0.45));
          gfx.lineTo(ax2 - size * Math.cos(an + 0.45), ay2 - size * Math.sin(an + 0.45));
          gfx.closePath(); gfx.fill();
        }
        // Apron + turf (only the slice the camera shows)
        gfx.fillStyle = plIsContrast ? '#000000' : '#0b1f14';
        gfx.fillRect(0, 0, W, H);
        gfx.save();
        gfx.beginPath(); gfx.rect(0, 28, W, H - 28); gfx.clip();
        gfx.fillStyle = plIsContrast ? '#000000' : '#277738';
        gfx.fillRect(pL, pTop, pR - pL, pBot - pTop);
        if (!plIsContrast) {
          gfx.fillStyle = 'rgba(0,0,0,0.07)';
          for (var band = Math.floor(sCam.x0 / 10) * 10; band < PITCH_LENGTH; band += 10) {
            var bb0 = Math.max(sCam.x0, band), bb1 = Math.min(PITCH_LENGTH, band + 5);
            if (bb1 > bb0) gfx.fillRect(pL, pm.py(bb1), pR - pL, pm.py(bb0) - pm.py(bb1));
          }
        }
        // Markings: touchlines, goal line, halfway line + circle, the box, the six-yard box,
        // the penalty spot and arc, the goal, the corner arcs.
        gfx.strokeStyle = lineCol; gfx.lineWidth = 2;
        sLine(sCam.x0, 0, PITCH_LENGTH, 0); sLine(sCam.x0, PITCH_WIDTH, PITCH_LENGTH, PITCH_WIDTH);
        sLine(PITCH_LENGTH, 0, PITCH_LENGTH, PITCH_WIDTH);
        if (sCam.x0 <= PITCH_LENGTH / 2) {
          sLine(PITCH_LENGTH / 2, 0, PITCH_LENGTH / 2, PITCH_WIDTH);
          gfx.beginPath(); gfx.arc(pm.px(PITCH_WIDTH / 2), pm.py(PITCH_LENGTH / 2), CENTER_CIRCLE_R * sS, 0, Math.PI * 2); gfx.stroke();
        }
        var boxY0 = (PITCH_WIDTH - PENALTY_AREA_WIDTH) / 2, boxY1 = boxY0 + PENALTY_AREA_WIDTH;
        var boxX = PITCH_LENGTH - PENALTY_AREA_DEPTH;
        sLine(boxX, boxY0, boxX, boxY1); sLine(boxX, boxY0, PITCH_LENGTH, boxY0); sLine(boxX, boxY1, PITCH_LENGTH, boxY1);
        var sixY0 = (PITCH_WIDTH - GOAL_AREA_WIDTH) / 2, sixY1 = sixY0 + GOAL_AREA_WIDTH;
        var sixX = PITCH_LENGTH - GOAL_AREA_DEPTH;
        sLine(sixX, sixY0, sixX, sixY1); sLine(sixX, sixY0, PITCH_LENGTH, sixY0); sLine(sixX, sixY1, PITCH_LENGTH, sixY1);
        var psX = PITCH_LENGTH - PENALTY_SPOT_X;
        gfx.fillStyle = lineCol;
        gfx.beginPath(); gfx.arc(pm.px(PITCH_WIDTH / 2), pm.py(psX), 2.2, 0, Math.PI * 2); gfx.fill();
        // The arc: the part of the circle around the spot that lies outside the box.
        gfx.beginPath();
        var arcOn = false;
        for (var ai = 0; ai <= 60; ai++) {
          var aa = Math.PI / 2 + (ai / 60) * Math.PI;   // the half facing the halfway line
          var axm = psX + PENALTY_ARC_R * Math.cos(aa);
          var aym = PITCH_WIDTH / 2 + PENALTY_ARC_R * Math.sin(aa);
          if (axm > boxX) { arcOn = false; continue; }
          if (!arcOn) { gfx.moveTo(pm.px(aym), pm.py(axm)); arcOn = true; } else gfx.lineTo(pm.px(aym), pm.py(axm));
        }
        gfx.stroke();
        var gY0 = (PITCH_WIDTH - SOCCER_GOAL_WIDTH) / 2, gY1 = gY0 + SOCCER_GOAL_WIDTH;
        gfx.fillStyle = plIsContrast ? '#ffffff' : 'rgba(255,255,255,0.88)';
        gfx.fillRect(pm.px(gY1), pm.py(PITCH_LENGTH) - Math.max(4, 1.6 * sS), pm.px(gY0) - pm.px(gY1), Math.max(4, 1.6 * sS));
        [0, PITCH_WIDTH].forEach(function(cy) {
          gfx.beginPath();
          gfx.arc(pm.px(cy), pm.py(PITCH_LENGTH), Math.max(4, sS * 1), cy === 0 ? Math.PI / 2 : 0, cy === 0 ? Math.PI : Math.PI / 2);
          gfx.stroke();
        });
        // xG heatmap (under More): the chance a shot from each spot scores. Its key is in the
        // HTML legend under the pitch.
        if (d.showXG) {
          var xgStep = 1.5;
          for (var hx = Math.max(sCam.x0, PITCH_LENGTH - 35); hx < PITCH_LENGTH - 0.5; hx += xgStep) {
            for (var hy = 2; hy < PITCH_WIDTH - 2; hy += xgStep) {
              var hxg = computeXG(hx + xgStep / 2, hy + xgStep / 2);
              if (hxg < 0.01) continue;
              var hc = hxg < 0.05 ? '30,80,200' : hxg < 0.10 ? '60,180,60' : hxg < 0.25 ? '230,200,30' : '230,50,30';
              gfx.fillStyle = 'rgba(' + hc + ',' + Math.min(0.55, 0.18 + hxg).toFixed(3) + ')';
              gfx.fillRect(pm.px(hy + xgStep), pm.py(hx + xgStep), xgStep * sS + 0.5, xgStep * sS + 0.5);
            }
          }
        }
        // The offside line: the second-last defender. It moves when the trap steps up.
        var sOffLabelY = null;
        if (sm.offsideOn) {
          // Before the pass it is the defenders' line (the trap's step shows as it happens);
          // from the pass on it stays where it was judged, whoever chases the ball later.
          var lineNow = (running && !inBuild && sRead) ? (modelT < sRead.release ? plSoccerLine(sFrame.defenders) : sRead.lineAtPass) : sm.line;
          var lyOff = pm.py(lineNow);
          gfx.save();
          gfx.strokeStyle = plIsContrast ? '#ff5555' : '#fb7185';
          gfx.lineWidth = 2.5;
          if (typeof gfx.setLineDash === 'function') gfx.setLineDash([8, 6]);
          gfx.beginPath(); gfx.moveTo(pL, lyOff); gfx.lineTo(pR, lyOff); gfx.stroke();
          gfx.restore();
          sOffLabelY = lyOff;
        }
        var sfind = function(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };
        // Build-up passes (thin gold), then each possible final pass: the runner's run
        // (white dashes) to where he would get the ball. The chosen one is bold gold.
        if (d.showRoutes !== false) {
          gfx.save(); gfx.lineCap = 'round';
          sm.build.forEach(function(q) {
            var a = sfind(sm.attackers, q[0]), b = sfind(sm.attackers, q[1]);
            if (!a || !b) return;
            gfx.strokeStyle = plIsContrast ? '#ffff00' : 'rgba(251,191,36,0.75)'; gfx.lineWidth = 2;
            if (typeof gfx.setLineDash === 'function') gfx.setLineDash([]);
            sLine(a.x, a.y, b.x, b.y);
            gfx.fillStyle = gfx.strokeStyle; sArrowHead(a.x, a.y, b.x, b.y, 8);
          });
          sm.reads.forEach(function(r) {
            if (r.direct) return;
            var mine = !!(sRead && sRead.id === r.id);
            gfx.strokeStyle = plIsContrast ? '#ffffff' : (mine ? '#fde047' : 'rgba(255,255,255,0.8)');
            gfx.lineWidth = mine ? 3.5 : 2;
            if (typeof gfx.setLineDash === 'function') gfx.setLineDash(mine ? [] : [5, 5]);
            sLine(r.start.x, r.start.y, r.to.x, r.to.y);
            if (typeof gfx.setLineDash === 'function') gfx.setLineDash([]);
            gfx.fillStyle = gfx.strokeStyle; sArrowHead(r.start.x, r.start.y, r.to.x, r.to.y, mine ? 11 : 8);
            if (mine) {
              // The pass itself: dotted from the passer to the spot.
              gfx.strokeStyle = plIsContrast ? '#ffff00' : 'rgba(253,224,71,0.9)'; gfx.lineWidth = 2;
              if (typeof gfx.setLineDash === 'function') gfx.setLineDash([2, 5]);
              sLine(sm.passer.x, sm.passer.y, r.to.x, r.to.y);
              if (typeof gfx.setLineDash === 'function') gfx.setLineDash([]);
            }
          });
          gfx.restore();
        }
        // The frozen end picture (stays up, so the result never depends on watching motion).
        var sGapLabel = null;
        if (sDone && sRead && so) {
          var inkS = plIsContrast ? (so.type === 'shot' ? '#00ff00' : '#ff5555') : (so.type === 'shot' && so.xG >= PL_SOCCER.FAIR_XG ? '#4ade80' : '#f87171');
          gfx.save();
          gfx.strokeStyle = inkS; gfx.lineWidth = 3;
          if (so.type === 'offside') {
            gfx.beginPath(); gfx.arc(pm.px(sRead.atPass.y), pm.py(sRead.atPass.x), 15, 0, Math.PI * 2); gfx.stroke();
            gfx.strokeStyle = plIsContrast ? '#ff5555' : '#fb7185'; gfx.lineWidth = 2;
            if (typeof gfx.setLineDash === 'function') gfx.setLineDash([3, 3]);
            sLine(sRead.atPass.x, sRead.atPass.y, sRead.lineAtPass, sRead.atPass.y);
          } else if (so.type === 'cut') {
            var cx0 = pm.px(sRead.cut.at.y), cy0 = pm.py(sRead.cut.at.x);
            gfx.beginPath(); gfx.moveTo(cx0 - 8, cy0 - 8); gfx.lineTo(cx0 + 8, cy0 + 8); gfx.moveTo(cx0 + 8, cy0 - 8); gfx.lineTo(cx0 - 8, cy0 + 8); gfx.stroke();
            gfx.beginPath(); gfx.arc(cx0, cy0, 15, 0, Math.PI * 2); gfx.stroke();
          } else {
            var shx = pm.px(sRead.shotAt.y), shy = pm.py(sRead.shotAt.x);
            // The pressure ring: an outfield defender inside it halves the chance.
            if (!sRead.direct || sRead.wall) {
              gfx.lineWidth = 1.6;
              if (typeof gfx.setLineDash === 'function') gfx.setLineDash([5, 4]);
              gfx.strokeStyle = plIsContrast ? '#ffff00' : 'rgba(255,255,255,0.85)';
              gfx.beginPath(); gfx.arc(shx, shy, PL_SOCCER.PRESS_M * sS, 0, Math.PI * 2); gfx.stroke();
              if (typeof gfx.setLineDash === 'function') gfx.setLineDash([]);
            }
            // The shot line to the middle of the goal.
            gfx.strokeStyle = inkS; gfx.lineWidth = 2.5;
            sLine(sRead.shotAt.x, sRead.shotAt.y, PITCH_LENGTH, PITCH_WIDTH / 2);
            // The nearest defender when he shot, and the gap in meters.
            var nd = sRead.nearest ? sfind(sFrame.defenders, sRead.nearest.id) : null;
            if (nd && !sRead.penalty) {
              var nx0 = pm.px(nd.y), ny0 = pm.py(nd.x);
              gfx.lineWidth = 2; gfx.strokeStyle = inkS;
              gfx.beginPath(); gfx.moveTo(shx, shy); gfx.lineTo(nx0, ny0); gfx.stroke();
              // The label goes on top of the players (drawn below).
              sGapLabel = { text: plNum(sRead.nearest.gap) + ' m', x: (shx + nx0) / 2, y: (shy + ny0) / 2, ink: inkS };
            }
          }
          gfx.restore();
        }
        // Your team: white name tags (12 px). The passer has a gold ring; the chosen runner a gold edge.
        // Every defender disc is an obstacle, and so is every tag already placed. A tag sits on its
        // player when it touches none of them. Otherwise the player keeps a white dot at his true
        // spot and his tag moves below, above or beside it, wherever it is clear (on a phone the
        // tags used to land on defender discs, and the right winger's tag sat under one).
        var dR = Math.max(6, Math.min(9, sS * 1.2));
        var scTokens = sFrame.defenders.map(function(D) {
          var rr = (D.role === 'GK' ? 11 : dR) + 1;
          return { x: pm.px(D.y) - rr, y: pm.py(D.x) - rr, w: rr * 2, h: rr * 2 };
        });
        var scLabels = [];
        var scBounds = { x: 0, y: 30, w: W, h: H - 30 };
        var scFsBtn = { x: W - 56, y: 0, w: 56, h: 54 };
        // Each teammate's true spot (where his dot goes if his tag moves) and the ball at the
        // passer's feet are obstacles too, so a moved tag never covers a dot or the ball.
        var scDots = sFrame.attackers.map(function(p) { return { id: p.id, x: pm.px(p.y) - 6, y: pm.py(p.x) - 6, w: 12, h: 12 }; });
        var ballAtFeet = !inBuild && (!running || !sRead || modelT < sRead.release) && !(sRead && sRead.direct && modelT > 0);
        var scBallBox = ballAtFeet ? [{ x: pm.px(sm.passer.y) + 24 - 7, y: pm.py(sm.passer.x) + 4 - 7, w: 14, h: 14 }] : [];
        gfx.font = 'bold 12px system-ui';
        sFrame.attackers.forEach(function(p) {
          if (p.role === 'GK' && p.x < sCam.x0) return;
          var ax0 = pm.px(p.y), ay0 = pm.py(p.x);
          if (ay0 < 20 || ay0 > H + 20) return;
          var isPasser = p.id === sm.passer.id;
          var isRunner = !!(sRead && sRead.runnerId === p.id);
          var tw = gfx.measureText(p.id).width + 10, th = 20;
          var otherDots = scDots.filter(function(dt) { return dt.id !== p.id; });
          var obs = scTokens.concat(scLabels, [scFsBtn], otherDots, scBallBox);
          var onSpot = plFreeSpot([{ cx: ax0, cy: ay0 }], tw, th, obs, scBounds);
          obs = obs.concat(scDots.filter(function(dt) { return dt.id === p.id; }));
          var cands = [
            { cx: ax0, cy: ay0 + 9 + th / 2 }, { cx: ax0, cy: ay0 - 9 - th / 2 },
            { cx: ax0 + 8 + tw / 2, cy: ay0 }, { cx: ax0 - 8 - tw / 2, cy: ay0 },
            { cx: ax0 + tw / 2, cy: ay0 + 9 + th / 2 }, { cx: ax0 - tw / 2, cy: ay0 + 9 + th / 2 },
            { cx: ax0 + tw / 2, cy: ay0 - 9 - th / 2 }, { cx: ax0 - tw / 2, cy: ay0 - 9 - th / 2 }
          ];
          // A crowded spot (a low block): try a ring farther out before giving up.
          [26, 36, 48].forEach(function(rad) {
            for (var ang = 0; ang < 8; ang++) {
              var aa = Math.PI / 2 + ang * Math.PI / 4;
              cands.push({ cx: ax0 + Math.cos(aa) * (rad + tw / 2 - 8), cy: ay0 + Math.sin(aa) * rad });
            }
          });
          var tag = onSpot || plFreeSpot(cands, tw, th, obs, scBounds) || { x: ax0 - tw / 2, y: ay0 + 9, w: tw, h: th };
          tag.text = p.id;
          scLabels.push(tag);
          if (!onSpot) {
            var tcx = tag.x + tw / 2, tcy = tag.y + th / 2;
            gfx.fillStyle = plIsContrast ? '#ffffff' : '#f8fafc'; gfx.strokeStyle = '#0f172a'; gfx.lineWidth = 1.5;
            gfx.beginPath(); gfx.arc(ax0, ay0, 4.5, 0, Math.PI * 2); gfx.fill(); gfx.stroke();
            // A short leader from the dot to the edge of its tag.
            var ldx = tcx - ax0, ldy = tcy - ay0, ld = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
            var edge = Math.min(Math.abs(ldx) > 0.01 ? (tw / 2) / Math.abs(ldx) : Infinity, Math.abs(ldy) > 0.01 ? (th / 2) / Math.abs(ldy) : Infinity);
            var ex = tcx - ldx * Math.min(1, edge), ey = tcy - ldy * Math.min(1, edge);
            gfx.strokeStyle = plIsContrast ? '#ffffff' : 'rgba(248,250,252,0.9)'; gfx.lineWidth = 1.5;
            gfx.beginPath(); gfx.moveTo(ax0 + (ldx / ld) * 4.5, ay0 + (ldy / ld) * 4.5); gfx.lineTo(ex, ey); gfx.stroke();
          }
          ax0 = tag.x + tw / 2; ay0 = tag.y + th / 2;
          if (isPasser && !(running && !inBuild && sRead && modelT > sRead.release)) {
            gfx.strokeStyle = plIsContrast ? '#ffff00' : '#fbbf24'; gfx.lineWidth = 3;
            gfx.beginPath(); gfx.arc(ax0, ay0, tw / 2 + 5, 0, Math.PI * 2); gfx.stroke();
          }
          if (!plIsContrast) { gfx.fillStyle = 'rgba(2,6,23,0.4)'; _plRoundRectPath(ax0 - tw / 2 + 1.5, ay0 - th / 2 + 2.5, tw, th, 9); gfx.fill(); }
          _plRoundRectPath(ax0 - tw / 2, ay0 - th / 2, tw, th, 9);
          gfx.fillStyle = plIsContrast ? '#ffffff' : '#f8fafc'; gfx.fill();
          gfx.strokeStyle = isRunner ? (plIsContrast ? '#ffff00' : '#ca8a04') : '#0f172a';
          gfx.lineWidth = isRunner ? 3 : 1.5; gfx.stroke();
          gfx.fillStyle = '#0f172a'; gfx.textAlign = 'center'; gfx.textBaseline = 'middle';
          gfx.fillText(p.id, ax0, ay0 + 0.5);
          gfx.textBaseline = 'alphabetic';
        });
        // Defenders: red discs (the keeper is labelled), drawn over the name tags so the
        // defense is never hidden behind a teammate standing next to it.
        sFrame.defenders.forEach(function(D) {
          var dx0 = pm.px(D.y), dy0 = pm.py(D.x);
          // High contrast: solid red discs (black ones with a white edge read as empty rings,
          // like the pressure ring and a teammate's dot), with black "GK" (6.3:1 on #ff5555).
          if (D.role === 'GK') {
            _plDrawActorToken(dx0, dy0, 11, plIsContrast ? '#ff5555' : '#b91c1c', plIsContrast ? '#ff5555' : '#f87171', plIsContrast ? '#ff5555' : '#fecaca', 'GK', plIsContrast ? '#000000' : '#ffffff', 12);
            return;
          }
          _plDrawActorToken(dx0, dy0, dR, plIsContrast ? '#ff5555' : '#dc2626', plIsContrast ? '#ff5555' : '#f87171', plIsContrast ? '#ff5555' : '#fecaca', '', '#ffffff', 12);
        });
        // The ball. During the build-up it travels pass by pass at ball speed.
        var sBall = sFrame.ball;
        if (inBuild) {
          var acc = 0;
          sBall = { x: sm.passer.x, y: sm.passer.y, air: 0 };
          for (var bi = 0; bi < sm.build.length; bi++) {
            var qa = sfind(sm.attackers, sm.build[bi][0]), qb = sfind(sm.attackers, sm.build[bi][1]);
            var segT = plDist(qa, qb) / PL_SOCCER.BALL;
            if (animT <= acc + segT) { var bpt = plToward(qa, qb, (animT - acc) * PL_SOCCER.BALL); sBall = { x: bpt.x, y: bpt.y, air: 0 }; break; }
            acc += segT;
          }
        }
        // While a player has it, the ball sits at his feet, beside his name tag.
        var ballWithPasser = !inBuild && (!running || !sRead || modelT < sRead.release) && !(sRead && sRead.direct && modelT > 0);
        if (sBall && ballWithPasser) sBall = { x: sBall.x, y: sBall.y, air: 0, feet: true };
        if (sBall && !sBall.held) {
          var bpx = pm.px(sBall.y) + (sBall.feet ? 24 : 0), bpy = pm.py(sBall.x) + (sBall.feet ? 4 : 0);
          var blift = (sBall.air || 0) * Math.min(18, 10 + sS);
          if (!plIsContrast) { gfx.fillStyle = 'rgba(2,6,23,0.4)'; gfx.beginPath(); _plSafeEllipse(gfx, bpx + 1, bpy + 3, 5, 2.4, 0, 0, Math.PI * 2); gfx.fill(); }
          gfx.fillStyle = plIsContrast ? '#ffff00' : '#ffffff';
          gfx.strokeStyle = '#111827'; gfx.lineWidth = 1.4;
          gfx.beginPath(); gfx.arc(bpx, bpy - blift, 5.5, 0, Math.PI * 2); gfx.fill(); gfx.stroke();
        } else if (sBall && sBall.held) {
          gfx.fillStyle = plIsContrast ? '#ffff00' : '#ffffff'; gfx.strokeStyle = '#111827'; gfx.lineWidth = 1.4;
          gfx.beginPath(); gfx.arc(pm.px(sBall.y) + 24, pm.py(sBall.x) + 4, 5, 0, Math.PI * 2); gfx.fill(); gfx.stroke();
        }
        // The offside line's name: in the margin beside the pitch when there is room (desktop).
        // On a phone it goes on the pitch, just above or below the line at either end, wherever
        // no tag or defender is (it used to be cut off by a name tag). With no clear spot it is
        // left off: the key under the pitch names the dashed red line.
        if (sOffLabelY != null) {
          gfx.font = 'bold 12px system-ui'; gfx.textAlign = 'left'; gfx.textBaseline = 'middle';
          var offTxt = __alloT('stem.playlab.s_offside_line', 'Offside line');
          var otw = gfx.measureText(offTxt).width + 8, oth = 16;
          // Candidates: both ends first, then every spot along the line, above it, then below it.
          var offCands = [
            { cx: pL + 2 + otw / 2, cy: sOffLabelY - 10 }, { cx: pR - 2 - otw / 2, cy: sOffLabelY - 10 },
            { cx: pL + 2 + otw / 2, cy: sOffLabelY + 10 }, { cx: pR - 2 - otw / 2, cy: sOffLabelY + 10 }
          ];
          [-10, 10, -19, 19].forEach(function(dy) {
            for (var oi = 0; oi <= 16; oi++) offCands.push({ cx: pL + 2 + otw / 2 + (pR - pL - 4 - otw) * oi / 16, cy: sOffLabelY + dy });
          });
          var offBox = (pL >= otw + 6)
            ? { x: pL - otw - 3, y: sOffLabelY - 8, w: otw, h: oth }
            : plFreeSpot(offCands, otw, oth, scTokens.concat(scLabels, [scFsBtn], scDots, scBallBox), scBounds);
          if (offBox) {
            offBox.text = offTxt;
            if (pL < otw + 6) scLabels.push(offBox);
            gfx.fillStyle = plIsContrast ? '#000000' : 'rgba(76,5,25,0.92)';
            gfx.fillRect(offBox.x, offBox.y, otw, oth);
            gfx.fillStyle = plIsContrast ? '#ff5555' : '#fecdd3';
            gfx.fillText(offTxt, offBox.x + 4, offBox.y + 8.5);
          }
          gfx.textBaseline = 'alphabetic';
        }
        canvas._plLayout = { labels: scLabels, tokens: scTokens };
        if (sGapLabel) {
          gfx.font = 'bold 13px system-ui';
          var glw = gfx.measureText(sGapLabel.text).width + 12;
          var glx = Math.max(pL + glw / 2 + 2, Math.min(pR - glw / 2 - 2, sGapLabel.x + glw / 2 + 14));
          var gly = Math.max(40, Math.min(H - 14, sGapLabel.y));
          _plRoundRectPath(glx - glw / 2, gly - 10, glw, 20, 6);
          gfx.fillStyle = plIsContrast ? '#000000' : 'rgba(2,6,23,0.92)'; gfx.fill();
          gfx.strokeStyle = sGapLabel.ink; gfx.lineWidth = 1.5; gfx.stroke();
          gfx.fillStyle = sGapLabel.ink; gfx.textAlign = 'center'; gfx.textBaseline = 'middle';
          gfx.fillText(sGapLabel.text, glx, gly + 0.5);
          gfx.textBaseline = 'alphabetic';
        }
        gfx.restore();
        // Top strip: the clock, and (once the move is over) the result. The strip is outside
        // the pitch, so the result never covers a player.
        gfx.fillStyle = plIsContrast ? '#000000' : 'rgba(2,6,23,0.86)';
        gfx.fillRect(0, 0, W, 28);
        gfx.font = 'bold 13px ui-monospace, monospace'; gfx.textAlign = 'left'; gfx.textBaseline = 'middle';
        gfx.fillStyle = plIsContrast ? '#ffff00' : '#fde68a';
        gfx.fillText((inBuild ? '-' + plNum(sBuildT - animT) : plNum(modelT)) + ' s', 8, 14.5);
        var stripTxt, stripCol = plIsContrast ? '#ffffff' : '#e2e8f0';
        if (soccerLive && so) {
          stripTxt = so.type === 'offside' ? __alloT('stem.playlab.s_strip_offside', 'Offside: no shot')
            : so.type === 'cut' ? __alloT('stem.playlab.s_strip_cut', 'Cut out: no shot')
            : plFill(__alloT('stem.playlab.s_strip_shot', '{who} shoots: xG {xg}'), { who: so.runnerId, xg: so.xG.toFixed(2) });
          gfx.textBaseline = 'alphabetic';
          _plResultStrip(stripTxt, so.type === 'shot' && so.xG >= PL_SOCCER.GOOD_XG ? 'good' : so.type === 'shot' && so.xG >= PL_SOCCER.FAIR_XG ? 'meh' : 'bad');
          stripTxt = null;
        } else if (inBuild) {
          stripTxt = __alloT('stem.playlab.s_strip_build', 'Build-up passes');
        } else if (d.runActive && sRead) {
          stripTxt = modelT < sRead.release ? plFill(__alloT('stem.playlab.s_strip_wait', '{who} waits for the run'), { who: sm.passer.id })
            : __alloT('stem.playlab.s_strip_pass', 'Pass played');
        } else {
          stripTxt = sRead ? plFill(__alloT('stem.playlab.s_strip_ready', 'Pass to {who}: press Run Play'), { who: sRead.runnerId })
            : __alloT('stem.playlab.s_strip_pick', 'Pick a pass under the pitch');
        }
        if (stripTxt) {
          gfx.font = 'bold 13px system-ui'; gfx.textAlign = 'left'; gfx.textBaseline = 'middle';
          gfx.fillStyle = stripCol;
          gfx.fillText(stripTxt, 64, 14.5, Math.max(40, W - 64 - 54));
        }
        gfx.textBaseline = 'alphabetic';
        _plDrawOnFire();
      }, [play.id, coverage.id, safeLosX, d.showZones, d.showRoutes, d.showOpen,
          d.customPositions, d.runActive, d.runT, d.runOutcome, d.targetId, d.revealSig,
          d.sport, d.formationId, d.conceptId, d.shapeId, d.showXG, d.soccerOptId,
          d.down, d.drillStats, pickedPlayerId, canvasSize.w, canvasSize.h, plReducedLive, ctx.isContrast, mysteryHidden]);

      // ── UI ──
      function playLabChoiceButtonStyle(sel, opts) {
        opts = opts || {};
        var accent = opts.accent || '#facc15';
        var activeText = opts.activeText || '#111827';
        return {
          padding: opts.small ? '6px 10px' : (opts.compact ? '7px 13px' : '8px 14px'),
          borderRadius: opts.square ? 8 : 999,
          cursor: 'pointer',
          minHeight: 44,
          border: '1px solid ' + (sel ? (opts.activeBorder || '#fde68a') : '#94a3b8'),
          background: sel ? accent : '#0f172a',
          color: sel ? activeText : '#f8fafc',
          fontSize: opts.small ? 11 : (opts.compact ? 12 : 13),
          fontWeight: sel ? 900 : 700,
          boxShadow: sel ? '0 0 0 2px rgba(250,204,21,0.18)' : 'none'
        };
      }

      function playLabSecondaryButtonStyle(extra) {
        return Object.assign({
          padding: '6px 12px',
          minHeight: 44,
          borderRadius: 6,
          cursor: 'pointer',
          border: '1px solid #94a3b8',
          background: '#0f172a',
          color: '#f8fafc',
          fontSize: 12,
          fontWeight: 700
        }, extra || {});
      }

      function playLabNativeControlStyle(extra) {
        return Object.assign({
          padding: '5px 8px',
          minHeight: 44,
          borderRadius: 6,
          border: '1px solid #94a3b8',
          background: '#0f172a',
          color: '#f8fafc',
          fontSize: 12
        }, extra || {});
      }

      var PLAYLAB_SPORT_TABS = ['football', 'soccer'];
      function playLabSportTabKeyDown(e, index) {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229) return;
        var key = e.key;
        if (key !== 'ArrowRight' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
        e.preventDefault();
        var nextIndex = index;
        if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (index + 1) % PLAYLAB_SPORT_TABS.length;
        if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (index - 1 + PLAYLAB_SPORT_TABS.length) % PLAYLAB_SPORT_TABS.length;
        if (key === 'Home') nextIndex = 0;
        if (key === 'End') nextIndex = PLAYLAB_SPORT_TABS.length - 1;
        var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
        var nextTab = tabs[nextIndex];
        if (nextTab) { nextTab.focus(); nextTab.click(); }
      }

      var PLAYLAB_WORKSPACE_TABS = ['field', 'scout'];
      function playLabWorkspaceTabKeyDown(e, index) {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229) return;
        var key = e.key;
        if (key !== 'ArrowRight' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
        e.preventDefault();
        var nextIndex = index;
        if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (index + 1) % PLAYLAB_WORKSPACE_TABS.length;
        if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (index - 1 + PLAYLAB_WORKSPACE_TABS.length) % PLAYLAB_WORKSPACE_TABS.length;
        if (key === 'Home') nextIndex = 0;
        if (key === 'End') nextIndex = PLAYLAB_WORKSPACE_TABS.length - 1;
        var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
        var nextTab = tabs[nextIndex];
        if (nextTab) { nextTab.focus(); nextTab.click(); }
      }

      function pillBtn(label, sel, onClick, opts) {
        opts = opts || {};
        return h('button', {
          key: opts.key,
          type: 'button',
          onClick: onClick, 'aria-pressed': sel, 'data-pl-focusable': 'true',
          style: playLabChoiceButtonStyle(sel, opts)
        }, label);
      }

      // Play Catalog celebration: shown for 3.5 s the first time a play succeeds. It sits
      // IN the film room (in flow), so it never covers the tabs, the field or a button.
      var plCelebNode = plCeleb ? h('div', {
        role: 'status', 'aria-live': 'polite', 'data-playlab-celeb': 'true',
        style: { marginTop: 10, padding: '8px 12px', borderRadius: 12, border: '2px solid #fde68a',
                 background: plCeleb.sport === 'soccer' ? '#065f46' : '#7c2d12', color: '#ffffff',
                 display: 'flex', alignItems: 'center', gap: 10 }
      },
        h('span', { 'aria-hidden': 'true', style: { fontSize: 24 } }, plCeleb.icon || (plCeleb.sport === 'soccer' ? '⚽' : '🏈')),
        h('div', null,
          h('div', { style: { fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' } }, __alloT('stem.playlab.play_added_to_your_catalog', 'Play added to your catalog')),
          h('div', { style: { fontSize: 14, fontWeight: 800, lineHeight: 1.3 } }, plCeleb.label + ' · ' + plCeleb.total + ' ' + __alloT('stem.playlab.in_your_catalog', 'in your catalog'))
        )
      ) : null;

      return h('div', { className: 'playlab-root', style: { background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 12, color: 'var(--allo-stem-text, #f1f5f9)', maxWidth: 1100, margin: '0 auto' } },
        // Scenario intro card — pops when a one-click teaching demo loads.
        // Surfaces the scenario's `teach` paragraph + discussion questions
        // before the play runs (previously hover-only on the chip).
        // Port of SkateLab SK3 / ThrowLab pattern: "Run it now" fires
        // synchronously (no setTimeout — caused stale closures in SK3).
        scenarioIntro && h('div', {
          role: 'dialog', 'aria-modal': 'true',
          'aria-labelledby': 'pl-scenario-intro-title',
          onKeyDown: function(e) {
            if (e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229) return;
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setScenarioIntro(null); }
          },
          onClick: function(e) { if (e.target === e.currentTarget) setScenarioIntro(null); },
          style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                   zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center',
                   padding: 16 }
        },
          h('div', {
            style: { background: 'var(--allo-stem-canvas, #0f172a)', border: '2px solid var(--allo-stem-border, #334155)', borderRadius: 14,
                     maxWidth: 560, width: '100%', maxHeight: '85vh', overflow: 'auto',
                     padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 36 } }, scenarioIntro.icon || '🎬'),
              h('h2', { id: 'pl-scenario-intro-title',
                style: { flex: 1, margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--allo-stem-text, #f1f5f9)' } },
                scenarioIntro.label),
              h('button', {
                type: 'button',
                onClick: function() { setScenarioIntro(null); },
                'aria-label': __alloT('stem.playlab.close_scenario_intro', 'Close scenario intro'),
                style: { background: '#0f172a', border: '1px solid #94a3b8', color: '#f8fafc',
                         width: 44, height: 44, borderRadius: 6, cursor: 'pointer',
                         fontSize: 16, lineHeight: 1, fontWeight: 700 }
              }, '×')
            ),
            h('div', { style: { marginBottom: 14 } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: tint('#fbbf24'),
                                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 } },
                __alloT('stem.playlab.the_story', '📜 The story')),
              h('p', { style: { margin: 0, color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 14, lineHeight: 1.5 } },
                scenarioIntro.teach),
              plRealAside(scenarioIntro.real, scenarioIntro.sport === 'soccer')
            ),
            scenarioIntro.questions && scenarioIntro.questions.length > 0 && h('div', {
              style: { marginBottom: 16 }
            },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: tint('#a78bfa'),
                                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 } },
                __alloT('stem.playlab.try_these_before_you_run_it', '🤔 Try these before you run it')),
              h('ul', { style: { margin: 0, paddingLeft: 20, color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 13, lineHeight: 1.5 } },
                scenarioIntro.questions.map(function(q, i) {
                  return h('li', { key: 'pl-sq-' + i, style: { marginBottom: 6 } }, q);
                })
              )
            ),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 } },
              h('button', {
                type: 'button',
                onClick: function() { setScenarioIntro(null); },
                'data-pl-focusable': 'true',
                style: { flex: '1 1 200px', padding: '10px 14px', borderRadius: 8,
                         border: '1px solid #86efac', background: 'linear-gradient(135deg, #86efac, #22c55e)',
                         color: '#052e16', fontSize: 14, fontWeight: 900, cursor: 'pointer',
                         boxShadow: '0 4px 12px rgba(34,197,94,0.25)' }
              }, __alloT('stem.playlab.go_to_the_field', '▶ Go to the field')),
              h('button', {
                type: 'button',
                onClick: function() { setScenarioIntro(null); },
                'data-pl-focusable': 'true',
                style: playLabSecondaryButtonStyle({ flex: '1 1 160px', padding: '10px 14px', borderRadius: 8, fontSize: 13 })
              }, __alloT('stem.playlab.explore_the_field_first', '🔧 Explore the field first'))
            )
          )
        ),
        // (The Play Catalog celebration renders inside the film room: see plCelebNode.)
        // Header — Bespoke Tactical Playbook Hero Deck
        h('div', { className: 'playlab-hero-deck' + (isSoccer ? ' is-soccer' : ''), 'data-playlab-hero': 'true' },
          h('div', { className: 'playlab-hero-row' },
            h('div', { className: 'playlab-hero-main' },
              ArrowLeft && h('button', {
                type: 'button',
                onClick: function() { setStemLabTool && setStemLabTool(null); },
                'data-pl-focusable': 'true', 'aria-label': __alloT('stem.playlab.back_to_stem_lab', 'Back to STEAM Lab'),
                style: playLabSecondaryButtonStyle({ padding: '6px 10px', minHeight: 44 })
              }, __alloT('stem.playlab.back', '← Back')),
              h('svg', { width: 46, height: 46, viewBox: '0 0 64 64', style: { flexShrink: 0 }, 'aria-hidden': 'true', focusable: 'false' },
                !ctx.isContrast && h('defs', null,
                  h('radialGradient', { id: 'pl-hero-emblem-bg', cx: '35%', cy: '30%', r: '72%' },
                    h('stop', { offset: '0%', stopColor: isSoccer ? '#047857' : '#1e3a5f' }),
                    h('stop', { offset: '100%', stopColor: isSoccer ? '#022c22' : '#090f1d' })
                  )
                ),
                h('rect', { x: 2, y: 2, width: 60, height: 60, rx: 14, fill: ctx.isContrast ? '#000000' : 'url(#pl-hero-emblem-bg)', stroke: ctx.isContrast ? '#00ff00' : (isSoccer ? '#34d399' : '#38bdf8'), strokeWidth: 2 }),
                isSoccer
                  ? h('g', null,
                      h('rect', { x: 10, y: 14, width: 44, height: 36, rx: 3, fill: 'none', stroke: ctx.isContrast ? '#ffffff' : 'rgba(255,255,255,0.45)', strokeWidth: 1.5 }),
                      h('line', { x1: 32, y1: 14, x2: 32, y2: 50, stroke: ctx.isContrast ? '#ffffff' : 'rgba(255,255,255,0.4)', strokeWidth: 1.4 }),
                      h('circle', { cx: 32, cy: 32, r: 7, fill: 'none', stroke: ctx.isContrast ? '#ffffff' : 'rgba(255,255,255,0.4)', strokeWidth: 1.4 }),
                      !ctx.isContrast && h('path', { d: 'M18 40 Q28 24 44 22', fill: 'none', stroke: '#fde047', strokeWidth: 5.5, opacity: 0.25, strokeLinecap: 'round' }),
                      h('path', { d: 'M18 40 Q28 24 44 22', fill: 'none', stroke: '#fde047', strokeWidth: 2.2, strokeDasharray: '3 2', strokeLinecap: 'round' }),
                      h('circle', { cx: 18, cy: 40, r: 3.5, fill: '#38bdf8' }),
                      h('circle', { cx: 44, cy: 22, r: 3.5, fill: '#4ade80' }),
                      h('circle', { cx: 44, cy: 22, r: 6.8, fill: 'none', stroke: '#4ade80', strokeWidth: 1.5, opacity: 0.85 })
                    )
                  : h('g', null,
                      h('line', { x1: 10, y1: 42, x2: 54, y2: 42, stroke: ctx.isContrast ? '#ffffff' : 'rgba(148,163,184,0.55)', strokeWidth: 1.6, strokeDasharray: '4 3' }),
                      !ctx.isContrast && h('path', { d: 'M18 42 L18 26 L30 18', fill: 'none', stroke: '#fbbf24', strokeWidth: 6, opacity: 0.24, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                      h('path', { d: 'M18 42 L18 26 L30 18', fill: 'none', stroke: '#fbbf24', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                      !ctx.isContrast && h('path', { d: 'M46 42 L46 22', fill: 'none', stroke: '#34d399', strokeWidth: 6, opacity: 0.24, strokeLinecap: 'round' }),
                      h('path', { d: 'M46 42 L46 22', fill: 'none', stroke: '#34d399', strokeWidth: 2.4, strokeLinecap: 'round' }),
                      h('circle', { cx: 18, cy: 42, r: 3.4, fill: '#38bdf8' }),
                      h('circle', { cx: 46, cy: 42, r: 3.4, fill: '#38bdf8' }),
                      h('path', { d: 'M29 27 L35 33 M35 27 L29 33', stroke: '#f87171', strokeWidth: 2.2, strokeLinecap: 'round' }),
                      h('circle', { cx: 46, cy: 20, r: 5.5, fill: 'none', stroke: '#34d399', strokeWidth: 1.6 })
                    )
              ),
              h('div', { style: { minWidth: 0 } },
                h('span', { className: 'playlab-hero-badge' },
                  isSoccer
                    ? __alloT('stem.playlab.hero_badge_soccer', 'Tactical Geometry · Pitch & xG')
                    : __alloT('stem.playlab.hero_badge_football', 'Sports Analytics · Routes & Coverage')),
                h('h2', { style: { margin: '3px 0 0', fontSize: 20, lineHeight: 1.2, color: '#ffffff' } },
                  (isSoccer ? '⚽ PlayLab — Soccer Tactics' : '🏈 PlayLab — Football Play & Coverage')),
                h('span', { className: 'playlab-hero-tagline', style: { display: 'block', marginTop: 2, fontSize: 12, color: '#cbd5e1' } }, __alloT('stem.playlab.every_play_is_a_coordinated_math_probl', 'Every play is a coordinated math problem on a fixed grid.'))
              )
            ),
            h('div', { className: 'playlab-hero-pills', 'aria-label': __alloT('stem.playlab.hero_telemetry', 'Active playbook telemetry') },
              h('span', { className: 'playlab-telemetry-pill' },
                isSoccer ? __alloT('stem.playlab.pill_formation', 'Shape') : __alloT('stem.playlab.pill_matchup', 'Call'),
                ' ', h('strong', null, isSoccer ? formationDef.label : (play.label.split(' (')[0] + ' vs ' + (mysteryHidden ? '?' : coverage.label.split(' (')[0])))),
              !isSoccer && h('span', { className: 'playlab-telemetry-pill' },
                __alloT('stem.playlab.pill_explored', 'Studied'), ' ',
                h('strong', null, String(Object.keys(d.playsViewed || {}).length) + '/' + PLAYS.length)),
              missionsOn && h('span', { className: 'playlab-telemetry-pill' },
                '🎯 ', h('strong', null, __alloT('stem.playlab.pill_drill_active', 'Drill Active')))
            )
          )
        ),
        // ── Play Catalog summary band ──
        // Sticky band under the header. Shows count of unique plays/concepts
        // run successfully for the current sport, plus chips for each.
        // Football: counts plays with first-completion. Soccer: counts
        // concepts with first xG ≥ 0.20.
        workspaceTab === 'scout' && (function () {
          var catalog = (d.playCatalog && typeof d.playCatalog === 'object') ? d.playCatalog : {};
          var sportPrefix = isSoccer ? 'soccer:' : 'football:';
          var sportEntries = Object.keys(catalog).filter(function (k) { return k.indexOf(sportPrefix) === 0; });
          var sportTotal = isSoccer
            ? ((typeof SOCCER_CONCEPTS !== 'undefined' && SOCCER_CONCEPTS) ? SOCCER_CONCEPTS.length : 0)
            : PLAYS.length;
          var got = sportEntries.length;
          if (sportTotal === 0) return null;
          return h('div', {
            style: {
              marginBottom: 12, padding: '10px 14px', borderRadius: 12,
              background: isSoccer
                ? 'linear-gradient(110deg, rgba(22,163,74,0.10) 0%, rgba(6,182,212,0.18) 50%, rgba(99,102,241,0.10) 100%)'
                : 'linear-gradient(110deg, rgba(245,158,11,0.10) 0%, rgba(239,68,68,0.18) 50%, rgba(124,58,237,0.10) 100%)',
              border: '1px solid ' + (isSoccer ? 'rgba(22,163,74,0.50)' : 'rgba(245,158,11,0.50)'),
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 22, lineHeight: 1, flexShrink: 0 } }, '🏅'),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' } },
                h('strong', { style: { fontSize: 13, fontWeight: 800, color: 'var(--allo-stem-text, #fef3c7)' } }, __alloT('stem.playlab.play_catalog', 'Play Catalog')),
                h('span', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)' } }, got + ' / ' + sportTotal + (isSoccer ? (' moves with a real chance (xG ' + PL_SOCCER.GOOD_XG.toFixed(2) + ' or more)') : ' plays completed')),
                h('span', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic' } },
                  got === 0
                    ? (isSoccer ? ('Make a chance worth xG ' + PL_SOCCER.GOOD_XG.toFixed(2) + ' or more to lock in a move.') : 'Complete a pass to lock in a play.')
                    : got === sportTotal ? '🏆 Full catalog — every play locked in.'
                    : 'Run a new one to add it.')
              )
            )
          );
        })(),

        // Sport picker — football vs soccer. role=tablist so AT treats it
        // as a single-select group. Switching sports preserves separate
        // state for each (football presets stay set even when you flip
        // to soccer and back).
        h('div', { role: 'tablist', 'aria-label': __alloT('stem.playlab.sport', 'Sport'),
          className: 'playlab-sport-tabs',
          style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          [
            { id: 'football', label: __alloT('stem.playlab.american_football', '🏈 American Football') },
            { id: 'soccer', label: __alloT('stem.playlab.soccer', '⚽ Soccer') }
          ].map(function(sp) {
            var sel = (d.sport || 'football') === sp.id;
            return h('button', {
              type: 'button',
              key: 'sport-' + sp.id,
              id: 'playlab-sport-tab-' + sp.id,
              role: 'tab',
              'aria-controls': 'playlab-sport-panel-' + sp.id,
              'aria-selected': sel ? 'true' : 'false',
              tabIndex: sel ? 0 : -1,
              onKeyDown: function(e) { playLabSportTabKeyDown(e, PLAYLAB_SPORT_TABS.indexOf(sp.id)); },
              onClick: function() {
                upd('sport', sp.id);
                plAnnounce('Switched to ' + sp.label.replace(/^\S+\s/, '') + ' mode.');
              },
              'data-pl-focusable': 'true',
              style: playLabChoiceButtonStyle(sel)
            }, sp.label);
          })
        ),

        h('div', {
          role: 'tabpanel',
          id: 'playlab-sport-panel-' + (d.sport || 'football'),
          'aria-labelledby': 'playlab-sport-tab-' + (d.sport || 'football'),
          tabIndex: 0
        },

        // ── Sport-accent hero band (sport-flavored, dark-themed) ──
        // Workspace switch: default to the live field, keep scenario/stats extras opt-in.
        h('div', { role: 'tablist', 'aria-label': __alloT('stem.playlab.workspace', 'PlayLab workspace'),
          style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
          [
            { id: 'field', label: __alloT('stem.playlab.field_tab', 'Field'), title: __alloT('stem.playlab.field_tab_title', 'Run the active play and adjust the tactical setup') },
            { id: 'scout', label: __alloT('stem.playlab.scout_tab', 'Scout'), title: __alloT('stem.playlab.scout_tab_title', 'Choose scenarios, daily challenges, achievements, and session numbers') }
          ].map(function(wt) {
            var sel = workspaceTab === wt.id;
            return h('button', {
              type: 'button',
              key: 'pl-workspace-' + wt.id,
              id: 'playlab-workspace-tab-' + wt.id,
              role: 'tab',
              'aria-controls': 'playlab-workspace-panel-' + wt.id,
              'aria-selected': sel ? 'true' : 'false',
              tabIndex: sel ? 0 : -1,
              onKeyDown: function(e) { playLabWorkspaceTabKeyDown(e, PLAYLAB_WORKSPACE_TABS.indexOf(wt.id)); },
              onClick: function() {
                upd('workspaceTab', wt.id);
                plAnnounce(wt.label + ' workspace.');
              },
              'data-pl-focusable': 'true',
              title: wt.title,
              style: playLabChoiceButtonStyle(sel, { compact: true, square: true, accent: '#7dd3fc', activeBorder: '#bae6fd', activeText: '#082f49' })
            }, wt.label);
          })
        ),

        h('div', {
          role: 'tabpanel',
          id: 'playlab-workspace-panel-' + (workspaceTab || 'field'),
          'aria-labelledby': 'playlab-workspace-tab-' + (workspaceTab || 'field'),
          className: 'playlab-workspace-panel',
          tabIndex: 0
        },

        workspaceTab === 'scout' && (function() {
          var SPORT_META = {
            football: { accent: '#ea580c', soft: 'rgba(234,88,12,0.14)', icon: '🏈', title: __alloT('stem.playlab.american_football_chess_at_4_4_yds_sec', 'American Football \u2014 chess at 4.4 yds/sec'),  hint: __alloT('stem.playlab.11_vs_11_100_yd_field_4_downs_to_gain_', '11 vs 11, 100 yd field, 4 downs to gain 10. Cover-2, Cover-3, man-press, blitz pickup. Every play is a designed answer to a defense \u2014 and good QBs read the answer pre-snap.') },
            soccer:   { accent: '#16a34a', soft: 'rgba(22,163,74,0.14)', icon: '⚽', title: __alloT('stem.playlab.soccer_the_beautiful_game_on_a_105_68m', 'Soccer \u2014 the beautiful game, on a 105\u00d768m grid'), hint: __alloT('stem.playlab.4_3_3_vs_4_4_2_vs_3_5_2_pep_s_position', '4-3-3 vs 4-4-2 vs 3-5-2. Pep\u2019s positional play, Klopp\u2019s gegenpress, Italian catenaccio. Width creates space, the 10 finds it, the false-9 drops to make it. Tactics are the second player.') }
          };
          var meta = SPORT_META[d.sport || 'football'] || SPORT_META.football;
          return h('div', {
            style: {
              margin: '0 0 12px',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(15,23,42,0) 100%), #0f172a',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 30, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: '#cbd5e1', fontSize: 12, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // ── Scenarios ──
        // One-click teaching demos. Each pill snaps sport + play/concept +
        // coverage/shape (and optionally LOS for football) into a
        // configured tactical setup. Useful as a warm-up for class
        // discussion. Filtered to the active sport so students don't see
        // 5 football scenarios when they're in soccer mode.
        workspaceTab === 'scout' && h('details', {
          style: { marginBottom: 10, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: '8px 12px' }
        },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', fontWeight: 600 }
          }, '🎬 Scenarios — one-click teaching demos (' + PLAYLAB_SCENARIOS.filter(function(sc) { return sc.sport === (d.sport || 'football'); }).length + ' built-in' + ((Array.isArray(d.savedPlays) ? d.savedPlays : []).filter(function(sp) { return sp.sport === (d.sport || 'football'); }).length ? ' + ' + (Array.isArray(d.savedPlays) ? d.savedPlays : []).filter(function(sp) { return sp.sport === (d.sport || 'football'); }).length + ' custom' : '') + ' for ' + (isSoccer ? 'soccer' : 'football') + ')'),
          h('div', {
            role: 'group', 'aria-label': __alloT('stem.playlab.tactical_scenarios', 'Tactical scenarios'),
            style: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }
          },
            PLAYLAB_SCENARIOS.filter(function(sc) {
              return sc.sport === (d.sport || 'football');
            }).map(function(sc) {
              return h('button', {
                type: 'button',
                key: 'plsc-' + sc.id,
                onClick: function() { applyPlayLabScenario(sc.id); },
                'aria-label': sc.label + ' scenario: ' + plNote(sc.teach),
                'data-pl-focusable': 'true',
                title: plNote(sc.teach),
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #94a3b8',
                  background: '#0f172a',
                  color: '#f8fafc', fontSize: 12, fontWeight: 700
                }
              }, sc.icon + ' ' + sc.label);
            }).concat(
              // Custom scenarios — saved plays for the current sport
              (Array.isArray(d.savedPlays) ? d.savedPlays : [])
                .filter(function(sp) { return sp.sport === (d.sport || 'football'); })
                .slice().reverse()
                .map(function(sp) {
                  return h('span', {
                    key: 'plcsc-' + sp.id,
                    style: { display: 'inline-flex', alignItems: 'stretch', borderRadius: 6, overflow: 'hidden' }
                  },
                    h('button', {
                      type: 'button',
                      onClick: function() { loadSavedPlay(sp); },
                      'aria-label': sp.name + ' (custom scenario)',
                      'data-pl-focusable': 'true',
                      title: 'Custom scenario: ' + sp.name + ' — saved ' + new Date(sp.createdAt).toLocaleDateString(),
                      style: {
                        padding: '6px 11px', cursor: 'pointer',
                        border: '1px solid #a78bfa',
                        borderRight: 'none',
                        background: 'rgba(167,139,250,0.10)',
                        color: tint('#a78bfa'), fontSize: 12, fontWeight: 600
                      }
                    }, '⭐ ' + (sp.name.length > 22 ? sp.name.slice(0, 22) + '…' : sp.name)),
                    h('button', {
                      type: 'button',
                      onClick: function() { deleteSavedPlay(sp.id); },
                      'aria-label': 'Delete custom scenario: ' + sp.name,
                      'data-pl-focusable': 'true',
                      title: __alloT('stem.playlab.delete_this_custom_scenario', 'Delete this custom scenario'),
                      style: {
                        padding: '6px 8px', cursor: 'pointer',
                        border: '1px solid #a78bfa',
                        background: 'rgba(167,139,250,0.10)',
                        color: tint('#a78bfa'), fontSize: 11
                      }
                    }, '✕')
                  );
                })
            ).concat([
              // Quick-Play — random scenario, one click
              h('button', {
                type: 'button',
                key: 'plsc-random',
                onClick: runRandomPlayLabScenario,
                'aria-label': __alloT('stem.playlab.run_a_random_scenario_go_straight_to_e', 'Run a random scenario — go straight to executing without reading setup'),
                'data-pl-focusable': 'true',
                title: __alloT('stem.playlab.pick_a_random_scenario_and_start_immed', 'Pick a random scenario and start immediately — no setup, just run it'),
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px dashed #6366f1', background: 'rgba(99,102,241,0.10)',
                  color: tint('#a5b4fc'), fontSize: 12, fontWeight: 700
                }
              }, __alloT('stem.playlab.run_something_cool', '🎲 Run something cool')),
              h('button', {
                type: 'button',
                key: 'plsc-save',
                onClick: openSavePrompt,
                'aria-label': __alloT('stem.playlab.save_current_setup_as_a_custom_scenari', 'Save current setup as a custom scenario'),
                'data-pl-focusable': 'true',
                title: __alloT('stem.playlab.save_the_current_sport_play_concept_co', 'Save the current sport + play/concept + coverage/shape + custom edits as a personalized scenario'),
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px dashed #c4b5fd', background: 'rgba(30,41,59,0.78)',
                  color: '#ddd6fe', fontSize: 12, fontWeight: 800
                }
              }, __alloT('stem.playlab.save_current', '⭐ Save current')),
              h('button', {
                type: 'button',
                key: 'plsc-print',
                onClick: printPlayLabActivitySheet,
                'aria-label': 'Print activity sheet for ' + (isSoccer ? 'soccer' : 'football') + ' scenarios',
                'data-pl-focusable': 'true',
                title: __alloT('stem.playlab.open_a_printable_activity_sheet_with_a', 'Open a printable activity sheet with all scenarios + discussion questions'),
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #fbbf24', background: 'rgba(251,191,36,0.10)',
                  color: tint('#fbbf24'), fontSize: 12, fontWeight: 700, marginLeft: 4
                }
              }, __alloT('stem.playlab.print_activity_sheet', '📄 Print activity sheet')),
              h('button', {
                type: 'button',
                key: 'plsc-card',
                onClick: exportPlayLabTradingCard,
                'aria-label': __alloT('stem.playlab.export_the_current_play_concept_as_a_p', 'Export the current play / concept as a printable trading card'),
                'data-pl-focusable': 'true',
                title: __alloT('stem.playlab.make_a_topps_style_trading_card_from_y', 'Make a Topps-style trading card from your active play + matchup grade + badges'),
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.10)',
                  color: tint('#fbbf24'), fontSize: 12, fontWeight: 700
                }
              }, __alloT('stem.playlab.trading_card', '📇 Trading card'))
            ])
          )
        ),

        // ── Daily Challenge (engagement layer) ──
        // Per-sport deterministic-by-date scenario. Football class sees
        // today\'s football pick, soccer class sees today\'s soccer pick.
        // Three states: untried (lavender) / in-progress (gold) /
        // complete (green). Click → applies the scenario.
        workspaceTab === 'scout' && (function() {
          var daily = getPlayLabDailyChallenge(d.sport || 'football');
          if (!daily) return null;
          var key = todayKey();
          var done = d.dailyCompleted === key;
          var loaded = d.activeScenarioId === daily.id;
          var bg = done ? 'rgba(34,197,94,0.15)' : loaded ? 'rgba(251,191,36,0.18)' : 'rgba(167,139,250,0.10)';
          var border = done ? '#22c55e' : loaded ? '#fbbf24' : '#a78bfa';
          var label = done ? '✅ Today\'s Challenge complete!' : loaded ? '🎯 In progress: ' + daily.label : '🌟 Today\'s Challenge: ' + daily.label;
          return h('button', {
            type: 'button',
            onClick: function() {
              if (done) {
                plAnnounce(__alloT('stem.playlab.sr_daily_challenge_already_complete_come_back_tomorr', 'Daily Challenge already complete. Come back tomorrow.'));
                return;
              }
              applyPlayLabScenario(daily.id);
            },
            'aria-label': label,
            'data-pl-focusable': 'true',
            title: plNote(daily.teach),
            style: {
              display: 'block', width: '100%', marginBottom: 12,
              padding: '10px 14px', borderRadius: 8,
              border: '1px solid ' + border, background: bg,
              color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 12, fontWeight: 600,
              textAlign: 'left', cursor: done ? 'default' : 'pointer'
            }
          },
            h('div', { style: { fontSize: 12, color: tint(border), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, label),
            h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', marginTop: 2, fontWeight: 400 } },
              done ? 'Earned 15 XP. Try again tomorrow.' : (function() { var dt = plNote(daily.teach); return dt.slice(0, 110) + (dt.length > 110 ? '…' : ''); })())
          );
        })(),

        // ── Achievements / Badges (engagement layer) ──
        // Collection mechanic for athletic students. Earned badges glow
        // with their color; unearned are dimmed with the hint as tooltip
        // so students see how to unlock them.
        workspaceTab === 'scout' && h('details', {
          style: { marginBottom: 12, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: '8px 12px' }
        },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', fontWeight: 600 }
          }, '🏅 Achievements (' + Object.keys(d.badgesEarned || {}).length + ' / ' + PLAYLAB_BADGES.length + ')'),
          h('div', {
            role: 'list', 'aria-label': __alloT('stem.playlab.badge_achievements', 'Badge achievements'),
            style: { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }
          },
            PLAYLAB_BADGES.map(function(b) {
              var earned = !!(d.badgesEarned && d.badgesEarned[b.id]);
              return h('span', {
                key: 'plbadge-' + b.id,
                role: 'listitem',
                'aria-label': b.label + (earned ? ' (earned)' : ' (locked)') + ': ' + b.hint,
                title: b.hint,
                style: {
                  padding: '5px 10px', borderRadius: 999,
                  border: '1px solid ' + (earned ? '#fbbf24' : '#94a3b8'),
                  background: earned ? 'rgba(251,191,36,0.18)' : '#0f172a',
                  color: earned ? '#facc15' : '#cbd5e1',
                  fontSize: 12, fontWeight: earned ? 800 : 700,
                  opacity: 1
                }
              }, b.emoji + ' ' + b.label);
            })
          )
        ),

        // ── Stats Card (engagement layer) ──
        // Baseball-card-style "your numbers" surface for PlayLab. Sport-
        // aware: football shows coverages-beaten / plays completed / drill
        // flags; soccer shows xG / concepts run / set-piece types.
        workspaceTab === 'scout' && h('details', {
          style: { marginBottom: 12, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: '8px 12px' }
        },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', fontWeight: 600 }
          }, '📊 Your Numbers — ' + (d.playerName || (isSoccer ? 'soccer session' : 'football session'))),
          h('div', {
            role: 'table', 'aria-label': __alloT('stem.playlab.session_stats', 'Session stats'),
            style: { marginTop: 10, display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: 12 }
          },
            getPlayLabStatsRows(d).map(function(row) {
              return h('div', { key: 'plsr-' + row.label, role: 'row', style: { display: 'contents' } },
                h('span', {
                  role: 'rowheader',
                  style: { color: 'var(--allo-stem-text-soft, #94a3b8)' }
                }, row.label),
                h('span', {
                  role: 'cell',
                  style: {
                    color: tint('#fbbf24'), fontWeight: 700,
                    fontFamily: 'ui-monospace, monospace', textAlign: 'right'
                  }
                }, row.value));
            })
          )
        ),

        // ── Matchup Matrix (heatmap of plays × coverages) ──
        // A compact grid showing every (play, coverage) or (concept, shape)
        // combination colored by the matchup grade. Cells are click-to-
        // load — instant combo-swap. Active row + column highlighted so
        // students can see HOW the current call sits within the broader
        // tactical landscape. Collapsed by default to keep the layout
        // tight for free-explore.
        workspaceTab === 'scout' && h('details', {
          style: { marginBottom: 12, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: '8px 12px' }
        },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', fontWeight: 600 }
          }, isSoccer
            ? ('📊 Matchup map (' + formationDef.label + ') — ' + Object.keys(d.scouted || {}).filter(function(k) { return k.indexOf('soccer|' + formationDef.id + '|') === 0; }).length + ' of ' + (SOCCER_CONCEPTS.length * SOCCER_SHAPES.length) + ' run. Run a move to fill in its square.')
            : ('📊 Matchup map — ' + Object.keys(d.scouted || {}).filter(function(k) { return k.indexOf('soccer|') !== 0; }).length + ' of ' + (PLAYS.length * COVERAGES.length) + ' matchups run. Run a play to fill in its square.')),
          h('div', {
            role: 'table',
            'aria-label': 'Matchup grades — rows = ' + (isSoccer ? 'concepts' : 'plays') + ', columns = ' + (isSoccer ? 'shapes' : 'coverages'),
            style: { marginTop: 10, overflowX: 'auto' }
          },
            (function() {
              var rows = isSoccer ? SOCCER_CONCEPTS : PLAYS;
              var cols = isSoccer ? SOCCER_SHAPES : COVERAGES;
              var activeRowId = isSoccer ? d.conceptId : d.playId;
              var activeColId = isSoccer ? d.shapeId : d.coverageId;
              var matchupFn = isSoccer ? getSoccerMatchup : getMatchup;
              return h('div', { style: { display: 'inline-block', minWidth: '100%' } },
                // Header row — coverage / shape labels
                h('div', { role: 'row', style: { display: 'flex', alignItems: 'flex-end', gap: 2 } },
                  [h('div', { key: 'corner-' + 'h', style: { width: 90, flexShrink: 0 } }, '')]
                  .concat(cols.map(function(c) {
                    return h('div', {
                      key: 'col-h-' + c.id, role: 'columnheader',
                      style: {
                        width: 44, flexShrink: 0, textAlign: 'center', fontSize: 12,
                        // The matrix panel paints --allo-stem-canvas: white in light,
                        // #0f172a in dark, so the header inks follow the theme too
                        // (#475569 / #b45309 measured 2.35:1 / 3.55:1 on the dark panel).
                        // ★ In the contrast theme app_styles_module.js rewrites inline
                        // light backgrounds to #000 !important, so these inks needed the other end.
                        color: ctx.isContrast ? (c.id === activeColId ? '#ffff00' : '#ffffff') : (c.id === activeColId ? tint('#fbbf24') : 'var(--allo-stem-text-soft, #475569)'),
                        fontWeight: c.id === activeColId ? 700 : 500,
                        padding: '2px 0'
                      }
                    }, c.short || c.label.split(' ')[0]);
                  }))
                ),
                // Data rows — one per play / concept
                rows.map(function(r) {
                  return h('div', {
                    key: 'row-' + r.id, role: 'row',
                    style: { display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }
                  },
                    [h('div', {
                      key: 'row-h-' + r.id, role: 'rowheader',
                      style: {
                        width: 90, flexShrink: 0, textAlign: 'right', fontSize: 12,
                        color: ctx.isContrast ? (r.id === activeRowId ? '#ffff00' : '#ffffff') : (r.id === activeRowId ? tint('#fbbf24') : 'var(--allo-stem-text-soft, #475569)'),
                        fontWeight: r.id === activeRowId ? 700 : 500,
                        paddingRight: 4
                      }
                    }, r.label.length > 14 ? r.label.slice(0, 14) + '…' : r.label)]
                    .concat(cols.map(function(c) {
                      // Football squares fill in as the student runs each matchup, so the
                      // map is a record of what they found out, not an answer key.
                      // Soccer squares too (per formation): the grade is the model's, shown
                      // only once the student has run that move against that shape.
                      var known = isSoccer ? !!(d.scouted && d.scouted['soccer|' + formationDef.id + '|' + r.id + '|' + c.id])
                        : !!(d.scouted && d.scouted[r.id + '|' + c.id]);
                      var m = known ? matchupFn(r, c, formationDef.id) : null;
                      var isActive = (r.id === activeRowId && c.id === activeColId);
                      return h('button', {
                        type: 'button',
                        key: 'cell-' + r.id + '-' + c.id,
                        role: 'cell',
                        onClick: function() {
                          if (isSoccer) {
                            setSoccerSetup({ conceptId: r.id, shapeId: c.id }, r.label + ' against ' + c.label + '.');
                          } else {
                            loadPlay(r.id);
                            loadCoverage(c.id);
                          }
                        },
                        'aria-label': r.label + ' vs ' + c.label + (m ? ': ' + m.label : (known ? '' : ': not run yet')),
                        title: r.label + ' vs ' + c.label + (m ? ' — ' + m.label : (known ? '' : ' — not run yet')),
                        'data-pl-focusable': 'true',
                        style: {
                          width: 44, height: 44, flexShrink: 0,
                          border: isActive ? '2px solid #fbbf24' : '1px solid rgba(15,23,42,0.5)',
                          background: m ? m.bg.replace('0.12', '0.45') : 'rgba(100,116,139,0.20)',
                          cursor: 'pointer', padding: 0, fontSize: 12,
                          color: m ? m.color: '#cbd5e1'
                        }
                      }, m ? m.emoji : (known ? '·' : '?'));
                    }))
                  );
                })
              );
            })()
          ),
          h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 8 } },
            '✅ Great match · 👍 Workable · ⚠️ Tough match · ? not run yet · Click any cell to load that combination.' + (isSoccer ? ' Each square is the best pass on that move.' : ''))
        ),

        // ── Goal strip: one line above the field that says what to do next ──
        // Holds the mission (when missions are on), the streak, and the start / stop
        // button. It replaces three stacked bands (hype line, drill panel, matchup badge)
        // that used to push the field far below the fold.
        (function() {
          var DRILL_SET = isSoccer ? PLAYLAB_SOCCER_DRILLS : PLAYLAB_DRILLS;
          var total = DRILL_SET.tasks.length;
          var taskIdx = plFirstOpenTask(DRILL_SET, d.drillStats);
          var allDone = taskIdx >= total;
          var task = DRILL_SET.tasks[Math.min(taskIdx, total - 1)];
          var stats = d.drillStats || {};
          var hot = getHotHand(stats.hotStreak);
          var kicker, goalText, progressText = null, tipText = null;
          if (missionsOn) {
            kicker = allDone
              ? __alloT('stem.playlab.goal_all_done_kicker', '🏆 Missions complete')
              : plFill(__alloT('stem.playlab.goal_mission_kicker', '🎯 Mission {n} of {total}'), { n: taskIdx + 1, total: total });
            goalText = allDone
              ? plFill(__alloT('stem.playlab.goal_all_done', 'You finished all {total} missions. Keep trying new plays and defenses.'), { total: total })
              : task.goal;
            if (!allDone) { progressText = task.progress(stats); tipText = task.tip || null; }
          } else {
            kicker = __alloT('stem.playlab.goal_kicker', '🎯 Goal');
            goalText = isSoccer
              ? __alloT('stem.playlab.goal_soccer_v2', 'Which pass makes the best chance? Pick one, then run the move.')
              : sim.isRun
                ? __alloT('stem.playlab.goal_run', 'This is a run. Run the play and see how far the back gets.')
                : __alloT('stem.playlab.goal_pass', 'Who will be open? Pick a receiver, then run the play.');
          }
          return h('section', { className: 'playlab-goal', 'data-playlab-goal': 'true', 'aria-labelledby': 'pl-drill-heading' },
            h('div', { className: 'playlab-goal-main' },
              h('h3', { id: 'pl-drill-heading', className: 'playlab-kicker', style: { margin: 0 } }, kicker),
              h('div', { className: 'playlab-goal-text' }, goalText),
              progressText ? h('div', { className: 'playlab-goal-sub' },
                h('b', null, __alloT('stem.playlab.goal_progress', 'Progress:') + ' '), progressText) : null,
              tipText ? h('div', { className: 'playlab-goal-sub' }, '💡 ' + tipText) : null
            ),
            h('div', { className: 'playlab-goal-side' },
              hot ? h('span', { className: 'playlab-streak', role: 'status', 'aria-live': 'polite',
                style: { background: hot.bg, color: hot.text, borderColor: hot.color } },
                hot.emoji + ' ' + hot.label + ' (' + plFill(__alloT('stem.playlab.streak_n', 'streak: {n}'), { n: stats.hotStreak }) + ')') : null,
              missionsOn
                ? h('button', {
                    type: 'button',
                    onClick: function() {
                      // Free play keeps every mission's progress (it lives in drillStats).
                      patchPlayLab({ drillActive: false, missionsChoice: 'off' });
                      plAnnounce(__alloT('stem.playlab.sr_free_play', 'Free play. Your mission progress is kept.'));
                    },
                    'aria-label': __alloT('stem.playlab.free_play_aria', 'Switch to free play. Mission progress is kept.'),
                    'data-pl-focusable': 'true', 'data-playlab-free-play': 'true',
                    className: 'playlab-goal-btn'
                  }, __alloT('stem.playlab.goal_free_play', 'Free play'))
                : h('button', {
                    type: 'button',
                    onClick: function() {
                      // Missions pick up at the first task not done yet. Progress is not
                      // wiped, so starting and stopping cannot be used to earn XP twice.
                      var first = plFirstOpenTask(DRILL_SET, stats);
                      patchPlayLab({ drillActive: true, drillTaskIdx: first, missionsChoice: 'on' });
                      plAnnounce('Drill started: ' + (first < total ? DRILL_SET.tasks[first].goal : 'all tasks already done'));
                    },
                    'data-pl-focusable': 'true', 'data-playlab-missions-on': 'true',
                    className: 'playlab-goal-btn is-start'
                  }, plFill(__alloT('stem.playlab.goal_missions_btn', '🎯 Missions ({done} of {total} done)'), { done: taskIdx, total: total }))
            )
          );
        })(),

        // Two-column layout: the field and its action come first.
        h('div', { className: 'playlab-field-layout', 'data-playlab-field-layout': 'true' },

          // LEFT: field canvas, the action row, the film room
          h('div', { className: 'playlab-field-column' },
            h('section', {
              className: 'playlab-field-shell',
              'data-playlab-field-shell': 'true',
              'data-allo-fs-stage': 'true',
              ref: function (node) { if (node && typeof window.__alloStemFsBind === 'function') window.__alloStemFsBind(node.querySelector('[data-allo-fs-btn]'), node); },
              style: { position: 'relative' },
              'aria-labelledby': 'pl-live-field-heading'
            },
              h('button', {
                type: 'button',
                'data-allo-fs-btn': 'true',
                'aria-pressed': 'false',
                'aria-label': __alloT('stem.playlab.enter_fullscreen', 'View the play diagram fullscreen'),
                'data-fs-out': __alloT('stem.playlab.enter_fullscreen', 'View the play diagram fullscreen'),
                'data-fs-in': __alloT('stem.playlab.exit_fullscreen', 'Exit fullscreen play diagram (Escape)'),
                style: { position: 'absolute', top: 6, right: 6, zIndex: 20, width: 44, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.88)', border: '1px solid ' + 'rgba(148,163,184,0.55)', color: '#e2e8f0', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
              }, h('span', { 'aria-hidden': 'true' }, '⛶')),
              h('h3', { id: 'pl-live-field-heading', className: 'playlab-sr-only' },
                isSoccer ? formationDef.label + ' - ' + concept.label : play.label + ' - ' + covName),
              h('canvas', {
                            ref: canvasRef,
              // The 2:1 CSS aspect ratio reserves space before HiDPI setup.
              // The effect sets the internal 720x360 drawing buffer only.
              role: 'img', tabIndex: 0, 'data-pl-focusable': 'true',
              'data-playlab-canvas': 'true',
              className: 'playlab-field-canvas' + (isSoccer ? ' is-soccer' : ''),
              'aria-label': isSoccer
                ? ('Soccer pitch, ' + formationDef.label + ', ' + concept.label + ' against ' + soccerShape.label + '. The ball is with ' + soccerMove.passer.id + '.'
                  + (soccerMove.offsideOn ? ' Their offside line is ' + Math.round(PITCH_LENGTH - soccerMove.line) + ' m from their goal.' : ' No offside on this restart.')
                  + (soccerMove.read ? ' Your pass: ' + soccerMove.read.runnerId + ', ' + plSoccerOptWord(concept.id, soccerMove.read.id) + '.' : ' Pick a pass below the pitch.')
                  + (soccerLive ? ' ' + plSoccerVerdict(soccerLive) : ''))
                : ('Football field, ' + play.label + ' against ' + covName
                  // Mystery defense: what the picture shows, in words (not the answer it leads to).
                  + (mysteryHidden ? '. ' + mysteryPictureText : '')
                  + (sim.read && !sim.isRun ? '. Throwing to ' + plWho(sim.read.id) : '')
                  + (liveOutcome ? '. ' + plVerdictText(liveOutcome) : '')
                  + '. ' + __alloT('stem.playlab.canvas_move_hint', 'Click and drag a player to reposition them, or tap a player and then tap the field.')
                  + (pickedPlayerId ? ' ' + plWithPlayer(__alloT('stem.playlab.canvas_picked_up', 'Picked up: {player}.'), pickedPlayerId) : '')),
              onMouseDown: handleMouseDown,
              onMouseMove: handleMouseMove,
              onMouseUp: handleMouseUp,
              onMouseLeave: function(e) { handleMouseUp(e, true); },
              // Touch parity: repositioning populates customPositions (and completes
              // 2 of the 4 football drills), and the pilot device is a touchscreen
              // Chromebook. Mirror the mouse handlers (drag, or tap-then-tap),
              // forwarding the single-touch point through the same clientX/Y math.
              // touchAction:'none' (below) already declares this a non-scroll surface,
              // so preventDefault won't fight a scroll the page wasn't doing here.
              // (React listens for touchstart / touchmove passively, so preventDefault there
              // only logged a console error on every tap. touch-action:none already stops the
              // scroll; touchend below still cancels the ghost mouse events.)
              onTouchStart: function(e) { if (e.touches && e.touches[0]) { handleMouseDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }); } },
              onTouchMove: function(e) { if (e.touches && e.touches[0]) { handleMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }); } },
              onTouchEnd: function(e) { e.preventDefault(); handleMouseUp(); },
              onTouchCancel: function() { handleMouseUp(null, true); }
              }),
              (!isSoccer && pickedPlayerId) ? h('div', { 'data-playlab-picked': pickedPlayerId, className: 'playlab-chip-row', style: { marginTop: 6, alignItems: 'center' } },
                h('span', { className: 'playlab-chip' }, plWithPlayer(__alloT('stem.playlab.picked_up_chip', 'Picked up {player}: tap the field to place'), pickedPlayerId)),
                h('button', { type: 'button', 'data-pl-focusable': 'true', onClick: function() { setPickedPlayerId(null); plAnnounce(plWithPlayer(__alloT('stem.playlab.sr_player_put_down', '{player} put down.'), pickedPlayerId)); },
                  style: { minHeight: 44, padding: '2px 14px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.7)', background: 'rgba(15,23,42,0.88)', color: '#e2e8f0', fontWeight: 700, cursor: 'pointer' } },
                  __alloT('stem.playlab.cancel', 'Cancel'))
              ) : null,
              // ── The action: pick who gets the ball (the prediction), then run it ──
              h('div', { className: 'playlab-run-rack' },
                // Mystery defense: read the defense first. Two choices, man or zone (three of the
                // eight defenses are man), checked against the model once the play has run.
                mysteryHidden ? h('div', { role: 'group', 'aria-label': __alloT('stem.playlab.mystery_guess_group', 'Mystery defense: man or zone?'), className: 'playlab-target-row playlab-mystery-row', 'data-playlab-mystery-guess': 'true' },
                  h('span', { className: 'playlab-target-label' }, __alloT('stem.playlab.mystery_guess_label', '🕵️ Man or zone?')),
                  [['man', __alloT('stem.playlab.guess_man', 'Man'), __alloT('stem.playlab.guess_man_sub', 'each follows one')],
                   ['zone', __alloT('stem.playlab.guess_zone', 'Zone'), __alloT('stem.playlab.guess_zone_sub', 'each guards an area')]].map(function(g) {
                    var sel = d.mysteryGuess === g[0];
                    return h('button', {
                      key: 'guess-' + g[0], type: 'button', className: 'playlab-target-chip is-guess',
                      'data-pl-focusable': 'true', 'data-playlab-guess': g[0], 'aria-pressed': sel ? 'true' : 'false',
                      disabled: !!d.runActive, onClick: function() { pickGuess(g[0]); }
                    }, h('b', null, g[1]), h('span', null, g[2]));
                  }),
                  h('span', { className: 'playlab-mystery-hint' }, __alloT('stem.playlab.mystery_hint', 'Look before you choose: who lines up right in front of each receiver? How many defenders stand far back?'))
                ) : null,
                (!isSoccer && !sim.isRun) ? h('div', { role: 'group', 'aria-label': __alloT('stem.playlab.throw_to_group', 'Who gets the ball'), className: 'playlab-target-row', 'data-playlab-targets': 'true' },
                  h('span', { className: 'playlab-target-label' }, __alloT('stem.playlab.throw_to', 'Throw to:')),
                  sim.reads.slice().sort(function(a, b) {
                    var pa = sim.offense.filter(function(p) { return p.id === a.id; })[0];
                    var pb = sim.offense.filter(function(p) { return p.id === b.id; })[0];
                    return (pb ? pb.y : 0) - (pa ? pa.y : 0);   // left to right, as on the field
                  }).map(function(r) {
                    var sel = !!(sim.read && sim.read.id === r.id);
                    var cap = r.id === 'SLOT' ? __alloT('stem.playlab.cap_slot', 'slot')
                      : r.id === 'TE' ? __alloT('stem.playlab.cap_te', 'tight end')
                      : r.id === 'RB' ? __alloT('stem.playlab.cap_rb', 'back')
                      : __alloT('stem.playlab.cap_wr', 'wide');
                    return h('button', {
                      key: 'tgt-' + r.id, type: 'button',
                      className: 'playlab-target-chip',
                      'data-pl-focusable': 'true', 'data-playlab-target': r.id,
                      'aria-pressed': sel ? 'true' : 'false',
                      'aria-label': plFill(__alloT('stem.playlab.throw_to_label', 'Throw to {who}, the {name}'), { who: plWho(r.id), name: PL_NAME[r.id] || r.id }),
                      disabled: !!d.runActive,
                      onClick: function() { pickTarget(r.id); }
                    }, h('b', null, plWho(r.id)), h('span', null, cap));
                  })
                ) : null,
                (!isSoccer && sim.isRun) ? h('span', { className: 'playlab-target-label' },
                  __alloT('stem.playlab.run_play_note', 'Run play: the running back (RB) carries the ball.')) : null,
                // Soccer: the prediction is the final pass. One button per run, left to right
                // as the runs end on the pitch.
                isSoccer ? h('div', { role: 'group', 'aria-label': __alloT('stem.playlab.s_pass_group', 'Which pass'), className: 'playlab-target-row', 'data-playlab-passes': 'true' },
                  h('span', { className: 'playlab-target-label' }, plFill(__alloT('stem.playlab.s_pass_from', '{who} passes to:'), { who: soccerMove.passer.id })),
                  soccerMove.reads.slice().sort(function(a, b) { return b.to.y - a.to.y; }).map(function(r) {
                    var sel = !!(soccerMove.read && soccerMove.read.id === r.id);
                    var how = plSoccerOptWord(concept.id, r.id);
                    return h('button', {
                      key: 'pass-' + r.id, type: 'button',
                      className: 'playlab-target-chip is-soccer',
                      'data-pl-focusable': 'true', 'data-playlab-pass': r.id,
                      'aria-pressed': sel ? 'true' : 'false',
                      'aria-label': r.direct ? plFill(__alloT('stem.playlab.s_pass_label_direct', '{who} {how}'), { who: r.runnerId, how: how })
                        : plFill(__alloT('stem.playlab.s_pass_label', 'Pass to {who}: {how}'), { who: r.runnerId, how: how }),
                      disabled: !!d.runActive,
                      onClick: function() { pickSoccerOption(r.id); }
                    }, h('b', null, r.runnerId), h('span', null, how));
                  })
                ) : null,
                h('button', {
                  type: 'button',
                  onClick: startRun,
                  disabled: !!d.runActive,
                  'aria-busy': !!d.runActive,
                  'data-pl-focusable': 'true',
                  'aria-label': d.runActive ? 'Running play animation' : 'Run Play — animate the active play',
                  className: 'playlab-run-button'
                }, d.runActive ? '⏱ Running…' : '▶ Run Play'),
                (!isSoccer && liveOutcome && !d.runActive) ? h('button', {
                  type: 'button', onClick: lineUpAgain, 'data-pl-focusable': 'true',
                  className: 'playlab-goal-btn'
                }, __alloT('stem.playlab.line_up_again', '↺ Line up again')) : null,
                (!isSoccer && Object.keys(safeCustomPositions).length > 0 && !d.runActive) ? h('button', {
                  type: 'button', onClick: resetPositions, 'data-pl-focusable': 'true',
                  className: 'playlab-goal-btn'
                }, __alloT('stem.playlab.reset_players', '↺ Put players back')) : null,
                (isSoccer && soccerLive && !d.runActive) ? h('button', {
                  type: 'button', onClick: lineUpAgain, 'data-pl-focusable': 'true',
                  className: 'playlab-goal-btn'
                }, __alloT('stem.playlab.line_up_again', '↺ Line up again')) : null
              ),
              (needGuess && mysteryHidden && d.mysteryGuess !== 'man' && d.mysteryGuess !== 'zone') ? h('div', { role: 'alert', className: 'playlab-need-target' },
                __alloT('stem.playlab.need_guess', 'Choose man or zone first. Tap one of the buttons above.')) : null,
              (needTarget && !isSoccer && !sim.outcome) ? h('div', { role: 'alert', className: 'playlab-need-target' },
                __alloT('stem.playlab.need_target', 'Pick who gets the ball first. Tap one of the buttons above.')) : null,
              (needTarget && isSoccer && !soccerMove.outcome) ? h('div', { role: 'alert', className: 'playlab-need-target' },
                __alloT('stem.playlab.s_need_pass', 'Pick the pass first. Tap one of the buttons above.')) : null,
              // Key under the picture (HTML, so it is real text: readable, translatable,
              // and never smaller than 12 px on a phone).
              h('div', { className: 'playlab-stage-legend', 'aria-label': __alloT('stem.playlab.stage_legend_aria', 'Field diagram key') },
                isSoccer ? h('span', { className: 'playlab-legend-item' },
                  h('svg', { width: 20, height: 12, viewBox: '0 0 20 12', 'aria-hidden': 'true', focusable: 'false' },
                    h('line', { x1: 2, y1: 6, x2: 14, y2: 6, stroke: '#fbbf24', strokeWidth: 2.2, strokeLinecap: 'round' }),
                    h('path', { d: 'M12 2.5 L17 6 L12 9.5', fill: 'none', stroke: '#fbbf24', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
                  ),
                  __alloT('stem.playlab.s_leg_build', 'Pass before the choice')
                ) : null,
                isSoccer ? h('span', { className: 'playlab-legend-item' },
                  h('svg', { width: 20, height: 12, viewBox: '0 0 20 12', 'aria-hidden': 'true', focusable: 'false' },
                    h('line', { x1: 1, y1: 6, x2: 14, y2: 6, stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '3 3' }),
                    h('path', { d: 'M12 2.5 L17 6 L12 9.5', fill: 'none', stroke: '#e2e8f0', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
                  ),
                  __alloT('stem.playlab.s_leg_run', 'Run into space')
                ) : null,
                (isSoccer && soccerMove.offsideOn) ? h('span', { className: 'playlab-legend-item' },
                  h('svg', { width: 20, height: 12, viewBox: '0 0 20 12', 'aria-hidden': 'true', focusable: 'false' },
                    h('line', { x1: 1, y1: 6, x2: 19, y2: 6, stroke: '#fb7185', strokeWidth: 2.5, strokeDasharray: '5 3' })),
                  __alloT('stem.playlab.s_leg_offside', 'Offside line (second-last defender)')
                ) : null,
                h('span', { className: 'playlab-legend-item' },
                  h('svg', { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': 'true', focusable: 'false' },
                    isSoccer ? h('rect', { x: 0.75, y: 3, width: 12.5, height: 8, rx: 4, fill: '#f8fafc', stroke: '#0f172a', strokeWidth: 1.5 })
                             : h('circle', { cx: 7, cy: 7, r: 5.5, fill: '#f8fafc', stroke: '#0f172a', strokeWidth: 1.5 })),
                  isSoccer ? __alloT('stem.playlab.leg_attack', 'Your team') : __alloT('stem.playlab.leg_offense', 'Offense (your team)')),
                h('span', { className: 'playlab-legend-item' },
                  h('svg', { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': 'true', focusable: 'false' },
                    isSoccer ? h('circle', { cx: 7, cy: 7, r: 5.5, fill: '#dc2626', stroke: '#fecaca', strokeWidth: 1.5 })
                             : h('rect', { x: 1.5, y: 1.5, width: 11, height: 11, rx: 2.5, fill: '#dc2626', stroke: '#fecaca', strokeWidth: 1.5 })),
                  __alloT('stem.playlab.leg_defense', 'Defense')),
                !isSoccer ? h('span', { className: 'playlab-legend-item' },
                  h('svg', { width: 20, height: 12, viewBox: '0 0 20 12', 'aria-hidden': 'true', focusable: 'false' },
                    h('line', { x1: 1, y1: 6, x2: 19, y2: 6, stroke: '#60a5fa', strokeWidth: 3 })),
                  __alloT('stem.playlab.leg_los', 'Where the play starts')) : null,
                !isSoccer ? h('span', { className: 'playlab-legend-item' },
                  h('svg', { width: 20, height: 12, viewBox: '0 0 20 12', 'aria-hidden': 'true', focusable: 'false' },
                    h('line', { x1: 1, y1: 6, x2: 19, y2: 6, stroke: '#facc15', strokeWidth: 3 })),
                  __alloT('stem.playlab.leg_first_down', 'First down (10 yards)')) : null,
                !isSoccer ? h('span', { className: 'playlab-legend-item' },
                  h('svg', { width: 20, height: 12, viewBox: '0 0 20 12', 'aria-hidden': 'true', focusable: 'false' },
                    h('line', { x1: 2, y1: 6, x2: 14, y2: 6, stroke: '#fbbf24', strokeWidth: 2.2, strokeLinecap: 'round' }),
                    h('path', { d: 'M12 2.5 L17 6 L12 9.5', fill: 'none', stroke: '#fbbf24', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })),
                  __alloT('stem.playlab.leg_route', 'Route (where he runs)')) : null,
                (isSoccer && d.showXG) ? h('span', { className: 'playlab-legend-item' },
                  h('svg', { width: 44, height: 12, viewBox: '0 0 44 12', 'aria-hidden': 'true', focusable: 'false' },
                    h('rect', { x: 0, y: 1, width: 11, height: 10, fill: 'rgb(30,80,200)' }), h('rect', { x: 11, y: 1, width: 11, height: 10, fill: 'rgb(60,180,60)' }),
                    h('rect', { x: 22, y: 1, width: 11, height: 10, fill: 'rgb(230,200,30)' }), h('rect', { x: 33, y: 1, width: 11, height: 10, fill: 'rgb(230,50,30)' })),
                  __alloT('stem.playlab.s_leg_xg', 'xG: under 0.05, 0.05 to 0.10, 0.10 to 0.25, over 0.25')) : null,
                isSoccer ? h('span', { className: 'playlab-legend-item', style: { marginLeft: 'auto' } },
                  plFill(__alloT('stem.playlab.s_leg_scale', 'Their goal is at the top. Showing the last {m} m of a 105 m pitch.'), { m: Math.round(PITCH_LENGTH - plSoccerCamera(soccerMove).x0) })) : null
              )
            ),

            // ── Film room: the verdict, the reason in yards and seconds, and (only after
            // the play has been run once) every receiver's numbers ──
            (function() {
              if (isSoccer) {
                var so = soccerLive;
                var sGood = so && so.type === 'shot' && so.xG >= PL_SOCCER.FAIR_XG;
                var sMatch = soccerRevealed ? getSoccerMatchup(concept, soccerShape, formationDef.id) : null;
                var sSugs = (so && !sGood && sMatch && sMatch.grade !== 'great') ? suggestConceptsForShape(soccerShape, formationDef.id).filter(function(c) { return c.id !== concept.id; }) : [];
                var sRowWord = function(r) {
                  return r.type === 'offside' ? plFill(__alloT('stem.playlab.s_film_offside', 'Offside by {m} m'), { m: plNum(r.offside.by) })
                    : r.type === 'cut' ? plFill(__alloT('stem.playlab.s_film_cut', 'Cut out ({def})'), { def: plSoccerRole(r.cut.role) })
                    : plFill(__alloT('stem.playlab.s_film_shot', 'Shot from {m} m'), { m: plNum(r.goalDist) });
                };
                return h('section', { className: 'playlab-gameplan-card', 'data-playlab-gameplan': 'true', 'aria-labelledby': 'pl-gameplan-heading' },
                  h('div', { className: 'playlab-gameplan-top' },
                    h('div', null,
                      h('div', { className: 'playlab-kicker' }, soccerRevealed ? __alloT('stem.playlab.film_room', 'Film room') : __alloT('stem.playlab.chance_analysis', 'Chance analysis')),
                      h('h3', { id: 'pl-gameplan-heading', className: 'playlab-gameplan-title' }, concept.label + ' vs ' + soccerShape.label)),
                    h('div', { className: 'playlab-status-pill', role: 'status', 'aria-live': 'polite' },
                      d.runActive ? __alloT('stem.playlab.status_live', 'Live now') : (so ? __alloT('stem.playlab.s_status_over', 'Move over') : __alloT('stem.playlab.status_ready', 'Ready to run')))
                  ),
                  plCelebNode,
                  so ? h('div', { className: 'playlab-verdict ' + (sGood ? 'is-good' : 'is-bad'), 'data-playlab-verdict': 'soccer', 'data-playlab-soccer-result': so.type },
                      h('strong', null, (so.type === 'shot' ? (sGood ? '✅ ' : '🟡 ') : (so.type === 'offside' ? '🚩 ' : '✋ ')) + plSoccerVerdict(so)),
                      h('p', null, plSoccerWhy(soccerMove.read)),
                      so.type === 'shot' ? h('p', null, plFill(__alloT('stem.playlab.soccer_xg_per_100', 'That means about {n} goals in every 100 shots from that spot.'), { n: Math.round(so.xG * 100) })
                        + ' ' + (so.xG >= PL_SOCCER.GOOD_XG ? __alloT('stem.playlab.soccer_xg_good', 'A real chance.')
                          : so.xG >= PL_SOCCER.FAIR_XG ? __alloT('stem.playlab.s_xg_fair', 'A fair chance.')
                          : __alloT('stem.playlab.s_xg_weak', 'A weak chance.'))) : null,
                      h('p', null, plSoccerBest(so)),
                      so.counted === false ? h('p', { className: 'playlab-note' }, __alloT('stem.playlab.repeat_no_credit_soccer_v2', 'You already ran this exact pass, so it does not count again. Change the pass, the move, the formation or the defense.')) : null)
                    : h('p', { className: 'playlab-gameplan-copy' },
                        d.runActive ? __alloT('stem.playlab.s_watch', 'Watch the runner and the nearest defender when the ball arrives.')
                          : soccerMove.read ? plFill(__alloT('stem.playlab.s_prompt_ready', 'You chose the pass to {who}. Will he be onside when the pass is played? Will he get there before a defender? Run the move to test it.'), { who: soccerMove.read.runnerId })
                          : __alloT('stem.playlab.s_prompt_pick', 'Each white dashed arrow is a run. Pick the pass you think makes the best chance. Watch the red offside line: a runner past it when the ball is played is offside.')),
                  soccerRevealed
                    ? h('div', { className: 'playlab-film', 'data-playlab-film': 'true' },
                        h('table', { className: 'playlab-film-table' },
                          h('caption', null, __alloT('stem.playlab.s_film_caption', 'What happens with each pass.')),
                          h('thead', null, h('tr', null,
                            h('th', { scope: 'col' }, __alloT('stem.playlab.s_film_pass', 'Pass')),
                            h('th', { scope: 'col' }, __alloT('stem.playlab.s_film_run', 'Run')),
                            h('th', { scope: 'col' }, __alloT('stem.playlab.s_film_out', 'Ball out')),
                            h('th', { scope: 'col' }, __alloT('stem.playlab.film_result', 'Result')),
                            h('th', { scope: 'col' }, 'xG'))),
                          h('tbody', null, soccerMove.reads.map(function(r) {
                            var mine = !!(soccerMove.read && soccerMove.read.id === r.id);
                            var ok = r.type === 'shot' && r.xG >= PL_SOCCER.FAIR_XG;
                            return h('tr', { key: 'sfilm-' + r.id, className: (ok ? 'is-open' : 'is-covered') + (mine ? ' is-mine' : '') },
                              h('th', { scope: 'row' }, r.runnerId + ' · ' + plSoccerOptWord(concept.id, r.id) + (mine ? ' ←' : '')),
                              h('td', null, r.direct ? '—' : (plNum(r.runM) + ' m')),
                              h('td', null, r.direct ? '—' : (plNum(r.release) + ' s')),
                              h('td', null, sRowWord(r)),
                              h('td', null, r.type === 'shot' ? r.xG.toFixed(2) : '—'));
                          }))),
                        h('p', { className: 'playlab-note' }, plFill(__alloT('stem.playlab.s_film_speeds', 'Speeds in this model: a runner {run} m each second, a pass along the ground {ball}, a ball in the air {air}, a defender {def} (after {react} s to react). With the ball at his feet a player runs {carry}.'),
                          { run: PL_SOCCER.RUN, ball: PL_SOCCER.BALL, air: PL_SOCCER.AIR, def: PL_SOCCER.DEF, react: plNum(PL_SOCCER.REACT), carry: PL_SOCCER.CARRY })),
                        sMatch ? h('p', { className: 'playlab-note', 'data-playlab-matchup': sMatch.grade },
                          h('b', { style: { color: playlabInk(sMatch.color === '#16a34a' ? '#4ade80' : sMatch.color, true, !!ctx.isContrast) } }, sMatch.emoji + ' ' + sMatch.label + ': '), sMatch.reason) : null,
                        sSugs.length ? h('div', { className: 'playlab-choice-row', style: { marginTop: 8 } },
                          h('span', { className: 'playlab-note', style: { margin: 0 } }, __alloT('stem.playlab.try_instead', '💡 Try instead:')),
                          sSugs.map(function(c) {
                            return h('button', {
                              type: 'button', key: 'ssug-' + c.id, 'data-pl-focusable': 'true',
                              onClick: function() { setSoccerSetup({ conceptId: c.id }, 'Move: ' + c.label + '.'); },
                              'aria-label': 'Try ' + c.label + ' instead',
                              className: 'playlab-goal-btn'
                            }, (c.icon || '') + ' ' + c.label);
                          })) : null)
                    : h('p', { className: 'playlab-note' }, __alloT('stem.playlab.s_film_locked', 'Run this move once to open the film room: every pass, with its numbers.'))
                );
              }
              var o = liveOutcome;
              // Mystery defense, after the snap: the defense by name, the student's read, the cue
              // that gave it away (in the model's own alignment), and a picture of it.
              var mLast = d.mysteryLast;
              var mysteryResultNode = (mysteryOn && d.mysterySolved && mLast && mLast.covId === coverage.id && mysteryRead) ? (function() {
                var mr = mysteryRead;
                var fam = mr.family;
                var famWord = fam === 'man' ? __alloT('stem.playlab.fam_man', 'man') : __alloT('stem.playlab.fam_zone', 'zone');
                var guessWord = mLast.guess === 'man' ? __alloT('stem.playlab.fam_man', 'man') : __alloT('stem.playlab.fam_zone', 'zone');
                var cueSummary = plFill(__alloT('stem.playlab.mystery_count', 'On this play, {over} of {n} receivers had a defender lined up right in front of them, {deep} defenders started 15 or more yards deep, and {rush} lined up to rush.'),
                  { over: mr.overCount, n: mr.receivers, deep: mr.deepCount, rush: mr.rushers });
                var stats = d.mysteryStats || {};
                return h('div', { className: 'playlab-mystery-card ' + (mLast.right ? 'is-good' : 'is-bad'), 'data-playlab-mystery-result': mLast.right ? 'right' : 'wrong' },
                  h('div', { className: 'playlab-kicker' }, __alloT('stem.playlab.mystery_kicker', '🕵️ Mystery defense')),
                  h('strong', null, plFill(__alloT('stem.playlab.mystery_was', 'It was {def}: a {fam} defense.'), { def: coverage.label, fam: famWord })),
                  h('p', null, mLast.right
                    ? plFill(__alloT('stem.playlab.mystery_you_right', 'You said {guess}: right!'), { guess: guessWord })
                    : plFill(__alloT('stem.playlab.mystery_you_wrong', 'You said {guess}: not this time.'), { guess: guessWord })),
                  h('p', null, h('b', null, __alloT('stem.playlab.mystery_cue', 'What gave it away: ')), plNote(PL_MYSTERY_CUES[coverage.id] || '')),
                  h('p', null, cueSummary),
                  plMysterySvg(mr, sim, cueSummary),
                  h('p', { className: 'playlab-note' }, __alloT('stem.playlab.mystery_svg_key', 'The picture shows where everyone stood before the snap. Yellow edge and line: a defender lined up right in front of a receiver. Yellow ring: a defender who started deep.')),
                  h('div', { className: 'playlab-choice-row', style: { marginTop: 8 } },
                    h('button', { type: 'button', className: 'playlab-goal-btn is-start', 'data-pl-focusable': 'true', 'data-playlab-mystery-next': 'true', disabled: !!d.runActive, onClick: startMystery },
                      __alloT('stem.playlab.mystery_next', '🕵️ Next mystery')),
                    h('span', { className: 'playlab-note', style: { margin: 0 } },
                      plFill(__alloT('stem.playlab.mystery_stats', 'Reads right: {right} of {tries}'), { right: stats.right || 0, tries: stats.tries || 0 }))));
              })() : null;
              var matchup = (revealed && !Object.keys(safeCustomPositions).length) ? getMatchup(play, coverage) : null;
              var suggestions = (o && !o.success && matchup && matchup.grade !== 'great') ? suggestPlaysForCoverage(coverage).filter(function(s) { return s.id !== play.id; }) : [];
              var epa = (o && revealed) ? computeEPA(ytgNow, d.down || 1, o) : null;
              return h('section', { className: 'playlab-gameplan-card', 'data-playlab-gameplan': 'true', 'aria-labelledby': 'pl-gameplan-heading' },
                h('div', { className: 'playlab-gameplan-top' },
                  h('div', null,
                    h('div', { className: 'playlab-kicker' }, revealed ? __alloT('stem.playlab.film_room', 'Film room') : __alloT('stem.playlab.your_call', 'Your call')),
                    h('h3', { id: 'pl-gameplan-heading', className: 'playlab-gameplan-title' }, play.label + ' vs ' + (mysteryHidden ? __alloT('stem.playlab.mystery_title_def', 'Mystery defense') : coverage.label))),
                  h('div', { className: 'playlab-status-pill', role: 'status', 'aria-live': 'polite' },
                    d.runActive ? __alloT('stem.playlab.status_live', 'Live now') : (o ? __alloT('stem.playlab.status_over', 'Play over') : __alloT('stem.playlab.status_ready', 'Ready to run')))
                ),
                plCelebNode,
                mysteryResultNode,
                o ? h('div', { className: 'playlab-verdict ' + (o.success ? 'is-good' : 'is-bad'), 'data-playlab-verdict': o.type },
                    h('strong', null, (o.success ? '✅ ' : (o.type === 'sack' ? '🚨 ' : '✋ ')) + plVerdictText(o)),
                    h('p', null, plWhyText(sim.read)),
                    plBestText(o) ? h('p', null, plBestText(o)) : null,
                    !o.counted ? h('p', { className: 'playlab-note' }, __alloT('stem.playlab.repeat_no_credit', 'You already ran this exact call, so it does not count again. Change the play, the defense or the target.')) : null)
                  : h('p', { className: 'playlab-gameplan-copy' },
                      d.runActive ? __alloT('stem.playlab.watch_the_gap', 'Watch the gap between the receiver and the nearest defender when the ball arrives.')
                        : sim.isRun ? __alloT('stem.playlab.prompt_run', 'Blockers take defenders out of the play. Any free defender who reaches the runner’s path first makes the tackle.')
                        : sim.read ? plFill(__alloT('stem.playlab.prompt_ready', 'You chose {who}. A catch needs a gap of {need} yards from the nearest defender when the ball arrives. Run the play to test it.'), { who: plWho(sim.read.id), need: plNum(PL_MODEL.OPEN_YD) })
                        : plFill(__alloT('stem.playlab.prompt_pick', 'Each receiver runs the yellow route. Defenders (red) try to get to the ball first. A catch needs a gap of {need} yards.'), { need: plNum(PL_MODEL.OPEN_YD) })),
                revealed
                  ? h('div', { className: 'playlab-film', 'data-playlab-film': 'true' },
                      h('table', { className: 'playlab-film-table' },
                        h('caption', null, sim.isRun
                          ? __alloT('stem.playlab.film_caption_run', 'The run, in numbers')
                          : plFill(__alloT('stem.playlab.film_caption_v2', 'What happens if the ball goes to each receiver. The ball must be thrown within {pocket} s.'), { pocket: plNum(sim.pocket) })),
                        h('thead', null, h('tr', null,
                          h('th', { scope: 'col' }, sim.isRun ? __alloT('stem.playlab.film_runner', 'Runner') : __alloT('stem.playlab.film_receiver', 'Receiver')),
                          h('th', { scope: 'col' }, __alloT('stem.playlab.film_route', 'Route')),
                          h('th', { scope: 'col' }, sim.isRun ? __alloT('stem.playlab.film_time', 'Time') : __alloT('stem.playlab.film_ball_out', 'Ball out')),
                          h('th', { scope: 'col' }, __alloT('stem.playlab.film_gap', 'Gap')),
                          h('th', { scope: 'col' }, __alloT('stem.playlab.film_result', 'Result')))),
                        h('tbody', null, sim.reads.map(function(r) {
                          var mine = !!(sim.read && sim.read.id === r.id);
                          var result = r.run ? ((r.yards > 0 ? '+' : '') + r.yards + ' yd')
                            : r.sacked ? __alloT('stem.playlab.film_too_slow', 'Too slow: sack')
                            : r.open ? (__alloT('stem.playlab.film_open', 'Open') + ' · ' + (r.yards > 0 ? '+' : '') + r.yards + ' yd')
                            : __alloT('stem.playlab.film_covered', 'Covered');
                          return h('tr', { key: 'film-' + r.id, className: (r.open ? 'is-open' : 'is-covered') + (mine ? ' is-mine' : '') },
                            h('th', { scope: 'row' }, plWho(r.id) + (mine ? ' ←' : '')),
                            h('td', null, plNum(r.routeYd) + ' yd'),
                            h('td', null, plNum(r.run ? r.routeT : r.release) + ' s'),
                            h('td', null, (r.run || r.sacked || !isFinite(r.gapYd)) ? '—' : (plNum(r.gapYd) + ' yd')),
                            h('td', null, result));
                        }))),
                      !sim.isRun ? h('p', { className: 'playlab-note' }, plFill(__alloT('stem.playlab.film_speeds', 'Speeds in this model: receivers {wr} yards each second, the ball {ball}, a defender running at the ball {def} (after a {react} s reaction).'),
                        { wr: PL_MODEL.SPEED.WR, ball: PL_MODEL.BALL_SPEED, def: PL_MODEL.DEF_SPEED, react: plNum(PL_MODEL.REACT) })) : null,
                      matchup ? h('p', { className: 'playlab-note', 'data-playlab-matchup': matchup.grade },
                        h('b', { style: { color: playlabInk(matchup.color === '#16a34a' ? '#4ade80' : matchup.color, true, !!ctx.isContrast) } }, matchup.emoji + ' ' + matchup.label + ': '), matchup.reason) : null,
                      epa ? h('p', { className: 'playlab-note' }, plFill(__alloT('stem.playlab.film_epa', 'Expected points: {pre} before the play, {post} after ({delta}).'),
                        { pre: epa.preEP.toFixed(1), post: epa.postEP.toFixed(1), delta: (epa.dEPA >= 0 ? '+' : '') + epa.dEPA.toFixed(1) })) : null,
                      suggestions.length ? h('div', { className: 'playlab-choice-row', style: { marginTop: 8 } },
                        h('span', { className: 'playlab-note', style: { margin: 0 } }, __alloT('stem.playlab.try_instead', '💡 Try instead:')),
                        suggestions.map(function(s) {
                          return h('button', {
                            type: 'button', key: 'sug-' + s.id, 'data-pl-focusable': 'true',
                            onClick: function() { loadPlay(s.id); },
                            'aria-label': 'Try ' + s.label + ' instead',
                            className: 'playlab-goal-btn'
                          }, (s.icon || '') + ' ' + s.label);
                        })) : null)
                  : h('p', { className: 'playlab-note' }, __alloT('stem.playlab.film_locked', 'Run this play once to open the film room: every receiver, with times and gaps.'))
              );
            })(),
            // Save prompt — inline form below the toggle row
            d.savePromptOpen ? h('div', {
              role: 'dialog', 'aria-label': __alloT('stem.playlab.save_play_2', 'Save play'),
              onKeyDown: function(e) {
                if (e.key === 'Escape' && !(e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229)) {
                  e.preventDefault();
                  e.stopPropagation();
                  cancelSavePrompt();
                }
              },
              style: { marginTop: 8, padding: 12, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid #d946ef', borderRadius: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
            },
              h('label', { htmlFor: 'pl-save-name', style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)' } }, __alloT('stem.playlab.play_name', 'Play name:')),
              h('input', {
                id: 'pl-save-name', type: 'text',
                value: d.savePromptName || '',
                onChange: function(e) { upd('savePromptName', e.target.value); },
                onKeyDown: function(e) {
                  if (e.key === 'Enter' && !(e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229)) commitSavePlay();
                },
                'data-pl-focusable': 'true', autoFocus: true,
                className: 'playlab-native-control',
                style: playLabNativeControlStyle({ flex: 1, minWidth: 200 })
              }),
              h('button', {
                type: 'button',
                onClick: commitSavePlay, 'data-pl-focusable': 'true',
                style: { padding: '6px 14px', minHeight: 44, borderRadius: 4, cursor: 'pointer', border: '1px solid #d946ef', background: 'rgba(217,70,239,0.18)', color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 12, fontWeight: 600 }
              }, __alloT('stem.playlab.save', 'Save')),
              h('button', {
                type: 'button',
                onClick: cancelSavePrompt, 'data-pl-focusable': 'true',
                style: playLabSecondaryButtonStyle({ padding: '6px 14px', minHeight: 44, borderRadius: 4, fontSize: 12 })
              }, __alloT('stem.playlab.cancel', 'Cancel'))
            ) : null,
            // ── Coach Mode bubble ──
            // Renders only when there's a reply, error, or in-flight request.
            // Sits between the toggles and the analysis panel so coaching
            // appears prominently right under the field.
            // Truthiness lets an object open the panel, and the object then
            // reaches a React child below.
            ((typeof d.coachReply === 'string' && d.coachReply) || (typeof d.coachError === 'string' && d.coachError) || d.coachLoading) ? h('section', {
              'aria-labelledby': 'pl-coach-heading',
              'aria-busy': !!d.coachLoading,
              style: { marginTop: 10, padding: 12, background: 'linear-gradient(135deg, rgba(217,70,239,0.10), rgba(124,58,237,0.10))', border: '1px solid #d946ef', borderRadius: 10 }
            },
              h('h3', { id: 'pl-coach-heading',
                style: { fontSize: 12, margin: 0, marginBottom: 6, color: tint('#d946ef'), textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
              }, __alloT('stem.playlab.coach_analysis', '🤖 Coach analysis')),
              d.coachLoading
                ? h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, fontStyle: 'italic' } }, __alloT('stem.playlab.analyzing_the_play_vs_the_coverage', 'Analyzing the play vs the coverage…'))
                : d.coachError
                ? h('div', { style: { color: tint('#ef4444'), fontSize: 12 } }, typeof d.coachError === 'string' ? d.coachError : '')
                : h('div', { style: { color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 13, lineHeight: 1.5 } }, typeof d.coachReply === 'string' ? d.coachReply : '')
            ) : null,
          ),

          // RIGHT: teach + coverage info + stats
          h('div', { className: 'playlab-info-column' },
        // ── Active Scenario Briefing ──
        // When a scenario was just loaded, surface its teach blurb +
        // discussion questions in a dedicated panel above the main
        // controls. Persists until the user dismisses it OR loads a
        // different scenario / play. Useful for teachers in front of
        // a class — gives them ready-made discussion prompts.
        (function() {
          var active = d.activeScenarioId
            ? PLAYLAB_SCENARIOS.find(function(sc) { return sc.id === d.activeScenarioId; })
            : null;
          if (!active) return null;
          return h('section', {
            'aria-label': __alloT('stem.playlab.scenario_briefing', 'Scenario briefing'),
            style: {
              padding: 12, borderRadius: 10, marginBottom: 12,
              background: 'rgba(167,139,250,0.10)',
              border: '1px solid rgba(167,139,250,0.45)',
              color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 13, lineHeight: 1.5
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 } },
              h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, active.icon),
              h('div', { style: { flex: 1 } },
                h('div', { style: { fontWeight: 700, color: tint('#a78bfa'), fontSize: 13, marginBottom: 2 } },
                  '🎬 Scenario: ' + active.label),
                h('div', null, plNote(active.teach)),
                plRealAside(active.real, active.sport === 'soccer')
              ),
              h('button', {
                type: 'button',
                onClick: function() { upd('activeScenarioId', null); },
                'aria-label': __alloT('stem.playlab.dismiss_scenario_briefing', 'Dismiss scenario briefing'),
                'data-pl-focusable': 'true',
                style: {
                  padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #94a3b8', background: '#0f172a',
                  color: '#f8fafc', fontSize: 12, fontWeight: 700
                }
              }, __alloT('stem.playlab.dismiss', '✕ Dismiss'))
            ),
            (active.questions && active.questions.length) ? h('div', {
              style: { marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(167,139,250,0.30)' }
            },
              h('div', { style: { fontSize: 12, color: tint('#a78bfa'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
                __alloT('stem.playlab.discussion', '💭 Discussion')),
              h('ol', { style: { margin: '4px 0 0 18px', padding: 0, color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.5 } },
                active.questions.map(function(q, i) {
                  return h('li', { key: 'q-' + i, style: { marginBottom: 4 } }, plNote(q));
                })
              )
            ) : null
          );
        })(),
            h('section', {
              'aria-labelledby': 'pl-play-heading',
              style: { background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: 12, marginBottom: 10 }
            },
              h('h3', { id: 'pl-play-heading', style: { fontSize: 12, margin: 0, marginBottom: 6, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 } },
                isSoccer ? (formationDef.icon + ' ' + formationDef.label) : (play.icon + ' ' + play.label)),
              isSoccer
                ? h('div', null,
                    h('div', { style: { fontSize: 14, color: 'var(--allo-stem-text, #f1f5f9)', lineHeight: 1.5 } },
                      plFill(__alloT('stem.playlab.s_formation_simple', 'Your team’s shape. In this move the ball goes to {passer}, and the runs come from {runners}.'),
                        { passer: soccerMove.passer.id, runners: soccerMove.reads.filter(function(r) { return !r.direct; }).map(function(r) { return r.runnerId; }).join(', ') || soccerMove.passer.id })),
                    plMoreNote(__alloT('stem.playlab.s_more_formation_v2', 'More about this formation'), formationDef, true))
                : h('div', null,
                    h('div', { style: { fontSize: 14, color: 'var(--allo-stem-text, #f1f5f9)', lineHeight: 1.5 } }, PL_SIMPLE.plays[play.id] || ''),
                    plMoreNote(__alloT('stem.playlab.more_about_play_v2', 'More about this play'), play, false))
            ),
            // Soccer-only: concept teach blurb (the passing-network pattern)
            isSoccer ? h('section', {
              'aria-labelledby': 'pl-concept-heading',
              style: { background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: 12, marginBottom: 10 }
            },
              h('h3', { id: 'pl-concept-heading', style: { fontSize: 12, margin: 0, marginBottom: 6, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 } },
                concept.icon + ' ' + concept.label),
              h('div', { style: { fontSize: 14, color: 'var(--allo-stem-text, #f1f5f9)', lineHeight: 1.5 } }, PL_SOCCER_WORDS.concepts[concept.id] || ''),
              plMoreNote(__alloT('stem.playlab.s_more_concept_v2', 'More about this move'), concept, true)
            ) : null,
            h('section', {
              'aria-labelledby': 'pl-cov-heading',
              style: { background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: 12, marginBottom: 10 }
            },
              h('h3', { id: 'pl-cov-heading', style: { fontSize: 12, margin: 0, marginBottom: 6, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 } },
                '🛡️ ' + (isSoccer ? soccerShape.label : (mysteryHidden ? __alloT('stem.playlab.mystery_title_def', 'Mystery defense') : coverage.label))),
              isSoccer
                ? h('div', null,
                    h('div', { style: { fontSize: 14, color: 'var(--allo-stem-text, #f1f5f9)', lineHeight: 1.5 } },
                      plSoccerShapeWords(soccerShape.id) + (soccerMove.shapeMatters ? '' : ' ' + __alloT('stem.playlab.s_shape_setpiece', 'At this set piece they pack their own box instead, so the shape does not matter here.'))),
                    plMoreNote(__alloT('stem.playlab.s_more_shape_v2', 'More about this defense'), soccerShape, true))
                : mysteryHidden
                  // Before the snap: how to read a defense, never which one this is.
                  ? h('div', { 'data-playlab-mystery-help': 'true' },
                      h('div', { style: { fontSize: 14, color: 'var(--allo-stem-text, #f1f5f9)', lineHeight: 1.5 } },
                        __alloT('stem.playlab.mystery_help', 'This defense stays hidden until the snap, as it would in a real game. Read it from where the defenders line up.')),
                      h('ul', { className: 'playlab-mystery-tips' },
                        h('li', null, __alloT('stem.playlab.mystery_tip_man', 'Man coverage: each defender follows one receiver, so he lines up where that receiver is.')),
                        h('li', null, __alloT('stem.playlab.mystery_tip_zone', 'Zone coverage: each defender guards an area, so he lines up where his area is.')),
                        h('li', null, __alloT('stem.playlab.mystery_tip_deep', 'Count the defenders far back (15 yards or more): 0, 1, 2, 3 or 4.'))))
                  : h('div', null,
                    h('div', { style: { fontSize: 14, color: 'var(--allo-stem-text, #f1f5f9)', lineHeight: 1.5 } }, PL_SIMPLE.coverages[coverage.id] || ''),
                    plMoreNote(__alloT('stem.playlab.more_about_defense_v2', 'More about this defense'), coverage, false))
            ),
            // Coach button — only renders if Gemini is available. The
            // analysis itself appears in the bubble under the field canvas
            // (left column) so it doesn't squeeze the narrow right column.
            plAiOn ? h('div', { style: { marginBottom: 10 } },
              // Coach persona picker — pill row of 4 voice options
              h('div', { role: 'group', 'aria-label': __alloT('stem.playlab.coach_voice', 'Coach voice'),
                style: { display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' } },
                COACH_PERSONAS.map(function(p) {
                  var sel = (d.coachPersona || 'analyst') === p.id;
                  return h('button', {
                    type: 'button',
                    key: 'plcoachp-' + p.id,
                    onClick: function() {
                      upd('coachPersona', p.id);
                      plAnnounce('Coach voice: ' + p.label);
                    },
                    'aria-pressed': sel,
                    'aria-label': 'Coach voice: ' + p.label,
                    'data-pl-focusable': 'true',
                    title: p.prepend,
                    style: {
                      padding: '4px 9px', borderRadius: 999, cursor: 'pointer',
                      border: '1px solid ' + (sel ? '#f5d0fe' : '#94a3b8'),
                      background: sel ? '#f0abfc' : '#0f172a',
                      color: sel ? '#3b0764' : '#f8fafc', fontSize: 12, fontWeight: sel ? 900 : 700
                    }
                  }, p.icon + ' ' + p.label);
                })
              ),
              h('button', {
                type: 'button',
                onClick: askCoach,
                disabled: !!d.coachLoading,
                'aria-busy': !!d.coachLoading,
                'aria-label': d.coachLoading ? 'Coach is thinking' : 'Ask the coach to analyze this play vs the active coverage',
                'data-pl-focusable': 'true',
                style: {
                  width: '100%',
                  padding: '10px 14px', minHeight: 44, borderRadius: 6,
                  cursor: d.coachLoading ? 'wait' : 'pointer',
                  border: '1px solid #d946ef',
                  background: d.coachLoading ? 'var(--allo-stem-panel, #1e293b)' : 'rgba(217, 70, 239, 0.18)',
                  color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 12, fontWeight: 600
                }
              }, d.coachLoading ? '🤖 Coach is analyzing…' : '🤖 Ask the coach')
            ) : null,
            // ── Saved plays list ──
            // Only renders when at least one play has been saved. Each row
            // shows the name + sport icon + load + delete. Clicking the
            // row label loads the play; clicking the X deletes it.
            (d.savedPlays && d.savedPlays.length) ? h('section', {
              'aria-labelledby': 'pl-saved-heading',
              style: { background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)', borderRadius: 10, padding: 12, marginBottom: 10 }
            },
              h('h3', { id: 'pl-saved-heading',
                style: { fontSize: 12, margin: 0, marginBottom: 6, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
              }, '💾 My Plays (' + d.savedPlays.length + ')'),
              h('ul', { style: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 } },
                (Array.isArray(d.savedPlays) ? d.savedPlays : []).slice().reverse().map(function(entry) {
                  return h('li', {
                    key: entry.id,
                    style: { display: 'flex', gap: 6, alignItems: 'center', padding: '4px 6px', borderRadius: 4, background: '#0f172a', border: '1px solid #64748b' }
                  },
                    h('span', { style: { fontSize: 14 } }, entry.sport === 'soccer' ? '⚽' : '🏈'),
                    h('button', {
                      type: 'button',
                      onClick: function() { loadSavedPlay(entry); },
                      'aria-label': 'Load saved play ' + entry.name,
                      'data-pl-focusable': 'true',
                      style: { flex: 1, padding: '4px 6px', borderRadius: 4, cursor: 'pointer',
                        border: '1px solid #94a3b8', background: '#0f172a',
                        color: '#f8fafc', fontSize: 12, textAlign: 'left' }
                    }, entry.name),
                    h('button', {
                      type: 'button',
                      onClick: async function() {
                        var confirmModule = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.ConfirmDialog && window.AlloModules.ConfirmDialog.ConfirmDialog;
                        var confirmApi = typeof window !== 'undefined' && window.AlloFlowUX && window.AlloFlowUX.confirm;
                        var unavailable = 'Saved-play deletion is unavailable right now, so the play was kept.';
                        if (typeof confirmModule !== 'function' || typeof confirmApi !== 'function') {
                          if (typeof addToast === 'function') addToast(unavailable, 'warning');
                          plAnnounce(unavailable);
                          return;
                        }
                        var confirmed = false;
                        try {
                          confirmed = await confirmApi('Delete saved play "' + entry.name + '"?', { title: 'Delete saved play', confirmText: 'Delete play', cancelText: 'Keep play', tone: 'warning' });
                        } catch (e) {
                          if (typeof addToast === 'function') addToast(unavailable, 'warning');
                          plAnnounce(unavailable);
                          return;
                        }
                        if (confirmed) deleteSavedPlay(entry.id);
                        else plAnnounce(__alloT('stem.playlab.sr_saved_play_kept', 'Saved play kept.'));
                      },                      'aria-label': 'Delete saved play ' + entry.name,
                      'data-pl-focusable': 'true',
                      style: playLabSecondaryButtonStyle({ padding: '4px 8px', minHeight: 44, minWidth: 44, borderRadius: 4, fontSize: 12 })
                    }, '✕')
                  );
                })
              )
            ) : null,
            !isSoccer ? h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
              h('span', null, 'Plays seen: ' + Object.keys(d.playsViewed || {}).length + ' / ' + PLAYS.length),
              h('span', null, 'Coverages seen: ' + Object.keys(d.coveragesViewed || {}).length + ' / ' + COVERAGES.length)
            ) : null
          ),
        ),

        // ── Setup: choose the play and the defense ──
        h('section', {
          className: 'playlab-setup-panel',
          'data-playlab-setup': 'true',
          'aria-labelledby': 'pl-setup-heading',
          style: { marginTop: 12 }
        },
          h('div', { className: 'playlab-setup-header' },
            h('h3', { id: 'pl-setup-heading', className: 'playlab-setup-title' },
              isSoccer ? 'Soccer setup' : 'Football setup'),
            h('span', { className: 'playlab-setup-note' },
              isSoccer ? (formationDef.label + ' / ' + concept.label + ' / ' + soccerShape.label)
                : (play.label + ' / ' + (mysteryHidden ? __alloT('stem.playlab.mystery_title_def', 'Mystery defense') : coverage.label)))
          ),
        // Quick Starter Matchup Presets (hidden during drills, disabled during live runs)
        !missionsOn && (function() {
          var starters = isSoccer ? [
            { id: 'soc-tiki', label: __alloT('stem.playlab.starter_soc_tiki', '🔺 4-3-3 Tiki-Taka vs Mid-Block'), formationId: '433', conceptId: 'tikitaka', shapeId: 'midblock' },
            { id: 'soc-cnt', label: __alloT('stem.playlab.starter_soc_counter', '⚡ 4-4-2 Counter vs High Press'), formationId: '442', conceptId: 'counter', shapeId: 'highpress' },
            { id: 'soc-ggp', label: __alloT('stem.playlab.starter_soc_press', '🔥 4-2-3-1 Press vs Low Block'), formationId: '4231', conceptId: 'gegenpress', shapeId: 'lowblock' },
            { id: 'soc-cor', label: __alloT('stem.playlab.starter_soc_corner', '🚩 3-4-3 In-Swinger Corner'), formationId: '343', conceptId: 'corner-in', shapeId: 'lowblock' }
          ] : [
            { id: 'fb-smash', label: __alloT('stem.playlab.starter_fb_smash', '🎯 Smash vs Cover 2'), playId: 'smash', coverageId: 'cover2' },
            { id: 'fb-verts', label: __alloT('stem.playlab.starter_fb_verts', '🚀 4 Verts vs Cover 3'), playId: 'fourverts', coverageId: 'cover3' },
            { id: 'fb-mesh', label: __alloT('stem.playlab.starter_fb_mesh', '🔥 Mesh vs Cover 1'), playId: 'mesh', coverageId: 'cover1' },
            { id: 'fb-slant', label: __alloT('stem.playlab.starter_fb_slant', '⚡ Slant vs Blitz'), playId: 'slant', coverageId: 'cover0' }
          ];
          return h('div', {
            className: 'playlab-starter-bar',
            role: 'group',
            'aria-label': __alloT('stem.playlab.starter_matchups_aria', 'Starter tactical matchups')
          },
            h('span', { className: 'playlab-starter-label' }, __alloT('stem.playlab.starter_matchups_label', 'Quick Matchups:')),
            starters.map(function(st) {
              var active = isSoccer
                ? (d.formationId === st.formationId && d.conceptId === st.conceptId && d.shapeId === st.shapeId)
                : (d.playId === st.playId && d.coverageId === st.coverageId);
              return h('button', {
                key: st.id,
                type: 'button',
                className: 'playlab-starter-chip',
                disabled: !!d.runActive,
                'aria-pressed': active ? 'true' : 'false',
                'data-pl-focusable': 'true',
                onClick: function() {
                  if (isSoccer) {
                    setSoccerSetup({ formationId: st.formationId, conceptId: st.conceptId, shapeId: st.shapeId, customPositions: {} }, 'Loaded soccer matchup: ' + st.label);
                  } else {
                    loadPlay(st.playId);
                    loadCoverage(st.coverageId);
                  }
                }
              }, st.label);
            })
          );
        })(),

        // Play / Formation picker
        h('div', { role: 'group', 'aria-label': isSoccer ? 'Formation library' : 'Play library',
          style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap', fontSize: 12 } },
          h('span', { style: { color: '#e2e8f0' } }, isSoccer ? 'Formation:' : 'Play:'),
          (isSoccer ? SOCCER_FORMATIONS : PLAYS).map(function(p) {
            var sel = isSoccer ? d.formationId === p.id : d.playId === p.id;
            return pillBtn(p.icon + ' ' + p.label, sel, function() {
              if (isSoccer) {
                setSoccerSetup({ formationId: p.id }, 'Formation: ' + p.label + '.');
              } else {
                loadPlay(p.id);
              }
            }, { key: (isSoccer ? 'formation-' : 'play-') + p.id });
          })
        ),

        // Concept picker — soccer only
        isSoccer ? h('div', { role: 'group', 'aria-label': __alloT('stem.playlab.tactical_concept', 'Tactical concept'),
          style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap', fontSize: 12 } },
          h('span', { style: { color: '#e2e8f0' } }, 'Concept:'),
          SOCCER_CONCEPTS.map(function(c) {
            return pillBtn(c.icon + ' ' + c.label, d.conceptId === c.id, function() {
              setSoccerSetup({ conceptId: c.id }, 'Move: ' + c.label + '. ' + (PL_SOCCER_WORDS.concepts[c.id] || ''));
            }, { key: 'concept-' + c.id });
          })
        ) : null,

        // Coverage / Defensive shape picker
        h('div', { role: 'group', 'aria-label': isSoccer ? 'Defensive shape' : 'Defensive coverage',
          style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap', fontSize: 12 } },
          h('span', { style: { color: '#e2e8f0' } }, 'Defense:'),
          // Mystery defense on: the defense list is replaced by the mode's own controls (a
          // highlighted chip would name the hidden defense).
          mysteryOn ? h('span', { className: 'playlab-mystery-status', 'data-playlab-mystery-status': 'true' },
              mysteryHidden ? __alloT('stem.playlab.mystery_status_hidden', '🕵️ Mystery defense: hidden until the snap.')
                : plFill(__alloT('stem.playlab.mystery_status_shown', '🕵️ Mystery defense: it was {def}.'), { def: coverage.label })) : null,
          mysteryOn ? h('button', { type: 'button', className: 'playlab-goal-btn', 'data-pl-focusable': 'true', 'data-playlab-mystery-off': 'true', disabled: !!d.runActive, onClick: stopMystery },
              __alloT('stem.playlab.mystery_off', 'Pick the defense myself')) : null,
          mysteryOn ? null : (isSoccer ? SOCCER_SHAPES : COVERAGES).map(function(c) {
            var sel = isSoccer ? d.shapeId === c.id : d.coverageId === c.id;
            return pillBtn(c.label, sel, function() {
              if (isSoccer) {
                setSoccerSetup({ shapeId: c.id }, 'Defensive shape: ' + c.label + '. ' + plSoccerShapeWords(c.id));
              } else {
                loadCoverage(c.id);
              }
            }, { key: (isSoccer ? 'shape-' : 'coverage-') + c.id });
          }),
          // The way in: a hidden defense to read before the snap (football only).
          (!isSoccer && !mysteryOn) ? h('button', { type: 'button', className: 'playlab-goal-btn is-start', 'data-pl-focusable': 'true', 'data-playlab-mystery-on': 'true', disabled: !!d.runActive, onClick: startMystery,
              title: __alloT('stem.playlab.mystery_on_title', 'The defense stays hidden until the snap. Read it from where the defenders line up.') },
              __alloT('stem.playlab.mystery_on', '🕵️ Mystery defense')) : null
        ),
        ),

        // ── More: everything secondary, behind ONE disclosure ──
        h('details', { className: 'playlab-more', 'data-playlab-more': 'true' },
          h('summary', { 'data-pl-focusable': 'true' },
            isSoccer ? __alloT('stem.playlab.more_summary_soccer', '⚙️ More: overlays and the xG heatmap')
              : __alloT('stem.playlab.more_summary', '⚙️ More: move players with buttons, overlays, down and distance, football words')),
        // Down + Distance picker — football only. Drives the EPA math
        // shown in the post-play banner. 1st-and-10 from own 25 (75 yd
        // to goal) is the default; students can tweak to see how the
        // value of the same play changes by situation.
        !isSoccer ? h('div', { role: 'group', 'aria-label': __alloT('stem.playlab.down_and_field_position', 'Down and field position'),
          style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap', fontSize: 12 } },
          h('span', { style: { color: '#e2e8f0' } }, 'Situation:'),
          h('label', { htmlFor: 'pl-down', style: { color: '#e2e8f0' } }, 'Down:'),
          h('select', {
            id: 'pl-down', value: String(d.down || 1),
            onChange: function(e) { upd('down', parseInt(e.target.value, 10) || 1); },
            'data-pl-focusable': 'true',
            className: 'playlab-native-control',
            style: playLabNativeControlStyle()
          },
            [1, 2, 3, 4].map(function(n) { return h('option', { key: n, value: String(n) }, n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th')); })
          ),
          h('label', { htmlFor: 'pl-ytg', style: { color: '#e2e8f0' } }, __alloT('stem.playlab.yards_to_goal', 'Yards to goal:')),
          h('input', {
            id: 'pl-ytg', type: 'number', min: 1, max: 99,
            value: ytgNow,
            onChange: function(e) {
              // Moving this number moves the ball: the blue line on the field follows it.
              var v = Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 75));
              patchPlayLab({ yardsToGoal: v, losX: FIELD_LENGTH - END_ZONE_DEPTH - v, runActive: false, runT: 0, runOutcome: null });
            },
            'data-pl-focusable': 'true',
            className: 'playlab-native-control',
            style: playLabNativeControlStyle({ width: 72 })
          }),
          h('span', { style: { fontSize: 12, color: '#cbd5e1' } },
            __alloT('stem.playlab.ep_at_this_state_v2', 'Expected points from here: '), h('span', { style: { color: playlabInk('#fbbf24', true, !!ctx.isContrast), fontWeight: 700 } },
              expectedPoints(ytgNow, d.down || 1).toFixed(1)),
            ' ', __alloT('stem.playlab.ep_meaning', '(the points a team scores next, on average, from this spot)'))
        ) : null,
            // Toggle row + reset positions
            h('div', { className: 'playlab-toggle-rack' },
              !isSoccer ? h('label', null,
                h('input', { type: 'checkbox', checked: !!d.showZones, 'data-pl-focusable': 'true',
                  onChange: function(e) { upd('showZones', e.target.checked); } }),
                __alloT('stem.playlab.coverage_zones_v2', 'Coverage zones and who covers whom')) : null,
              h('label', null,
                h('input', { type: 'checkbox', checked: !!d.showRoutes, 'data-pl-focusable': 'true',
                  onChange: function(e) { upd('showRoutes', e.target.checked); } }),
                __alloT('stem.playlab.route_lines', 'Route lines')),
              !isSoccer ? h('label', null,
                h('input', { type: 'checkbox', checked: !!d.showOpen, 'data-pl-focusable': 'true',
                  onChange: function(e) { upd('showOpen', e.target.checked); } }),
                __alloT('stem.playlab.show_open_after', 'Green ring on open receivers (after the play)')) : null,
              // Soccer-only: xG heatmap toggle. Lives next to the open-halo
              // toggle so all visualization options sit together.
              isSoccer ? h('label', null,
                h('input', { type: 'checkbox', checked: !!d.showXG, 'data-pl-focusable': 'true',
                  onChange: function(e) { upd('showXG', e.target.checked); } }),
                __alloT('stem.playlab.xg_heatmap', 'xG heatmap')) : null,
              // "Custom edits" indicator + Reset button. Only renders when the
              // student has actually moved a player, so the UI stays clean
              // when running stock plays.
              Object.keys(d.customPositions || {}).length > 0 ? h('span', {
                style: { marginLeft: 'auto', fontSize: 12, color: playlabInk('#fbbf24', true, !!ctx.isContrast), fontStyle: 'italic' }
              }, '✎ ' + Object.keys(d.customPositions).length + ' custom position' + (Object.keys(d.customPositions).length === 1 ? '' : 's')) : null,
              Object.keys(d.customPositions || {}).length > 0 ? h('button', {
                type: 'button',
                onClick: resetPositions,
                'data-pl-focusable': 'true',
                'aria-label': __alloT('stem.playlab.reset_all_custom_player_positions_to_t', 'Reset all custom player positions to the play preset'),
                style: playLabSecondaryButtonStyle({ padding: '4px 12px', minHeight: 44, borderRadius: 4, fontSize: 12 })
              }, __alloT('stem.playlab.reset_positions', 'Reset positions')) : null,
              // Save play — only renders when there's something custom to save
              Object.keys(d.customPositions || {}).length > 0 ? h('button', {
                type: 'button',
                onClick: openSavePrompt,
                'data-pl-focusable': 'true',
                'aria-label': __alloT('stem.playlab.save_the_current_custom_play_with_a_na', 'Save the current custom play with a name'),
                style: {
                  padding: '4px 12px', minHeight: 44, borderRadius: 4, cursor: 'pointer',
                  border: '1px solid #d946ef', background: 'rgba(217,70,239,0.18)',
                  color: '#f1f5f9', fontSize: 12, fontWeight: 600
                }
              }, __alloT('stem.playlab.save_play', '💾 Save play')) : null
            ),
              !isSoccer ? (function() {
                var movePlayer = rawFormation.filter(function(p) { return p.id === keyMovePid; })[0] || rawFormation[0];
                if (!movePlayer) return null;
                var moveBtnStyle = { minHeight: 44, minWidth: 44, padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.7)', background: 'rgba(15,23,42,0.88)', color: '#e2e8f0', fontWeight: 700, cursor: 'pointer' };
                return h('div', { 'data-playlab-key-move': movePlayer.id, role: 'group', 'aria-label': __alloT('stem.playlab.key_move_group', 'Move a player with buttons'), className: 'playlab-chip-row', style: { marginTop: 6, alignItems: 'center' } },
                  h('label', { className: 'playlab-chip' }, __alloT('stem.playlab.key_move_player', 'Player to move') + ' ',
                    h('select', { value: movePlayer.id, 'data-pl-focusable': 'true', onChange: function(e) { setKeyMovePid(e.target.value); }, style: { marginLeft: 4, minHeight: 44, background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(148,163,184,0.7)', borderRadius: 4 } },
                      rawFormation.map(function(p) { return h('option', { key: p.id, value: p.id }, PL_CODE[p.id] || p.id); }))),
                  [['left', 0, 1, '←', 'Move {player} one yard left'], ['right', 0, -1, '→', 'Move {player} one yard right'], ['up', 1, 0, '↑', 'Move {player} one yard up'], ['down', -1, 0, '↓', 'Move {player} one yard down']].map(function(m) {
                    return h('button', { key: m[0], type: 'button', 'data-pl-focusable': 'true', 'data-playlab-key-move-dir': m[0], disabled: !!d.runActive,
                      'aria-label': plWithPlayer(__alloT('stem.playlab.key_move_' + m[0], m[4]), movePlayer.id),
                      onClick: function() {
                        var spot = placePlayerAt(movePlayer.id, movePlayer.x + m[1], movePlayer.y + m[2]);
                        if (pickedPlayerId) setPickedPlayerId(null);
                        plAnnounce(plWithPlayer(__alloT('stem.playlab.sr_placed_player', 'Placed {player}. Position saved.'), movePlayer.id) + ' (' + spot.x + ', ' + spot.y + ')');
                      }, style: moveBtnStyle }, m[3]);
                  }));
              })() : null,
            // Drag hint — only on first load (no custom edits yet) so it
            // doesn't nag returning students
            (!isSoccer && !Object.keys(d.customPositions || {}).length) ? h('div', {
              style: { marginTop: 6, fontSize: 12, color: '#cbd5e1' }
            }, __alloT('stem.playlab.tip_click_and_drag_any_player_on_the_f', '💡 Tip: click and drag any player on the field to reposition them. The route stays attached so you can design your own play.')) : null,
              // Words: plain meanings for students who do not follow football.
              !isSoccer ? h('div', { className: 'playlab-words', 'data-playlab-words': 'true' },
                h('h4', { className: 'playlab-kicker', style: { margin: '0 0 6px' } }, __alloT('stem.playlab.words_heading', 'Football words')),
                h('dl', null,
                  [
                    ['QB', __alloT('stem.playlab.word_qb', 'Quarterback. He throws the ball.')],
                    ['W1, W2', __alloT('stem.playlab.word_wr', 'Wide receivers. They line up near the sidelines and catch passes.')],
                    ['SL', __alloT('stem.playlab.word_slot', 'Slot receiver. A receiver who lines up between the line and a wide receiver.')],
                    ['TE', __alloT('stem.playlab.word_te', 'Tight end. He lines up next to the blockers. He can block or catch.')],
                    ['RB', __alloT('stem.playlab.word_rb', 'Running back. He starts next to the quarterback. He can run with the ball or catch it.')],
                    [__alloT('stem.playlab.word_route_t', 'Route'), __alloT('stem.playlab.word_route', 'The path a receiver runs.')],
                    [__alloT('stem.playlab.word_los_t', 'Line of scrimmage'), __alloT('stem.playlab.word_los', 'The blue line. Every play starts there.')],
                    [__alloT('stem.playlab.word_fd_t', 'First down'), __alloT('stem.playlab.word_fd', 'Gain 10 yards (the yellow line) and your team keeps the ball with a new set of tries.')],
                    [__alloT('stem.playlab.word_man_t', 'Man coverage'), __alloT('stem.playlab.word_man', 'Each defender follows one receiver.')],
                    [__alloT('stem.playlab.word_zone_t', 'Zone coverage'), __alloT('stem.playlab.word_zone', 'Each defender guards one part of the field and watches the quarterback.')],
                    [__alloT('stem.playlab.word_pocket_t', 'Pocket'), __alloT('stem.playlab.word_pocket', 'The safe space the blockers make around the quarterback. It only lasts a few seconds.')],
                    [__alloT('stem.playlab.word_blitz_t', 'Blitz'), __alloT('stem.playlab.word_blitz', 'Extra defenders rush the quarterback, so the pocket lasts a shorter time.')],
                    [__alloT('stem.playlab.word_sack_t', 'Sack'), __alloT('stem.playlab.word_sack', 'The rush tackles the quarterback before he can throw.')]
                  ].map(function(w, i) {
                    return h('div', { key: 'word-' + i, className: 'playlab-word' }, h('dt', null, w[0]), h('dd', null, w[1]));
                  })
                )
              ) : null

        )
        )
        )
      );
    }
  });

})();
