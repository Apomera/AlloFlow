// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_migration.js — Migration & Wind Patterns Lab
// V-formation aerodynamics, wind currents, bird migration routes & flight physics
// Canvas-based rendering with real-ish flight physics
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};
// ═══ End Guard ═══

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('migration'))) {

(function() {
  'use strict';
  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-migration')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-migration';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  if (!document.getElementById('migration-workspace-css')) {
    var migrationStyle = document.createElement('style');
    migrationStyle.id = 'migration-workspace-css';
    migrationStyle.textContent = [
      '.migration-tool-shell{--mg-sky:#0ea5e9;--mg-green:#16a34a;--mg-text:var(--allo-stem-text,#e2e8f0);--mg-muted:var(--allo-stem-text-soft,#94a3b8);--mg-panel:var(--allo-stem-panel,#1e293b);--mg-canvas:var(--allo-stem-canvas,#0f172a);--mg-border:var(--allo-stem-border,#334155);max-width:1120px;margin:0 auto;padding:4px!important;color:var(--mg-text);}',
      '.migration-tool-shell *{box-sizing:border-box;}',
      '.migration-tool-shell button:focus-visible,.migration-tool-shell input:focus-visible,.migration-tool-shell select:focus-visible,.migration-tool-shell textarea:focus-visible,.migration-tool-shell canvas:focus-visible,.migration-flight-stage:focus-visible{outline:3px solid #38bdf8;outline-offset:3px;}',
      '.migration-command{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:17px 18px;border:1px solid rgba(14,165,233,.38);border-radius:18px;background:radial-gradient(circle at 88% 12%,rgba(14,165,233,.2),transparent 34%),linear-gradient(135deg,rgba(8,47,73,.94),rgba(15,23,42,.97));box-shadow:0 18px 42px rgba(15,23,42,.2);}',
      '.migration-command-main{display:flex;align-items:center;gap:12px;min-width:0;}',
      '.migration-command-copy{min-width:0;}',
      '.migration-eyebrow{margin:0 0 3px;color:#7dd3fc;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;}',
      '.migration-command h2{margin:0;color:#fff;font-size:clamp(20px,3vw,28px);line-height:1.15;}',
      '.migration-command p{margin:5px 0 0;color:#bae6fd;font-size:12px;line-height:1.45;}',
      '.migration-command-icon{font-size:38px;filter:drop-shadow(0 7px 14px rgba(14,165,233,.35));}',
      '.migration-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;}',
      '.migration-metric{min-width:0;border:1px solid var(--mg-border);border-radius:12px;padding:10px 12px;background:linear-gradient(180deg,var(--mg-canvas),var(--mg-panel));}',
      '.migration-metric-label{display:block;color:var(--mg-muted);font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;}',
      '.migration-metric-value{display:block;margin-top:3px;color:var(--mg-text);font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.migration-route-board{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px!important;padding:10px;border:1px solid var(--mg-border);border-radius:14px;background:var(--mg-canvas);}',
      '.migration-route-tab{display:flex!important;align-items:center;justify-content:flex-start;min-width:0;min-height:46px;padding:8px 9px!important;text-align:left;line-height:1.25;border:1px solid transparent!important;border-radius:10px!important;}',
      '.migration-route-tab[aria-selected="true"]{border-color:#38bdf8!important;background:linear-gradient(135deg,#0369a1,#0e7490)!important;box-shadow:0 8px 20px rgba(14,165,233,.2);}',
      '.migration-route-label{min-width:0;font-size:10px;font-weight:900;}',
      '.migration-active-band{border-radius:14px!important;box-shadow:0 10px 28px rgba(15,23,42,.12);}',
      '.migration-workspace{min-width:0;}',
      '.migration-workspace canvas{display:block;max-width:100%!important;border-radius:14px;box-shadow:0 12px 30px rgba(15,23,42,.2);}',
      '.migration-workspace [style*="grid-template-columns:repeat(3"]{min-width:0;}',
      '.migration-flight-deck{display:grid;grid-template-columns:minmax(0,1fr) 250px;min-height:560px;border:1px solid #075985;border-radius:18px;background:#020617;box-shadow:0 24px 58px rgba(2,6,23,.34);overflow:hidden;isolation:isolate;}',
      '.migration-flight-stage{position:relative;min-width:0;min-height:560px;background:radial-gradient(circle at 50% 22%,#1d4ed8 0,#075985 34%,#082f49 66%,#020617 100%);overflow:hidden;}',
      '.migration-flight-stage canvas{width:100%!important;height:100%!important;max-width:none!important;border-radius:0!important;box-shadow:none!important;touch-action:none;}',
      '.migration-flight-stage-status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:28px;color:#e0f2fe;font-size:13px;font-weight:800;text-align:center;background:radial-gradient(circle at 50% 30%,rgba(14,116,144,.76),rgba(2,6,23,.96));}',
      '.migration-flight-stage[data-flight-ready="true"] .migration-flight-stage-status{display:none;}',
      '.migration-flight-overlay{position:absolute;inset:0;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between;padding:14px;}',
      '.migration-flight-badge{align-self:flex-start;display:inline-flex;align-items:center;gap:7px;max-width:min(92%,420px);border:1px solid rgba(186,230,253,.58);border-radius:999px;background:rgba(2,6,23,.82);color:#f0f9ff;padding:7px 10px;font-size:10px;font-weight:900;letter-spacing:.04em;box-shadow:0 8px 24px rgba(2,6,23,.32);backdrop-filter:blur(8px);}',
      '.migration-flight-heading{align-self:center;border:1px solid rgba(125,211,252,.48);border-radius:10px;background:rgba(2,6,23,.82);color:#e0f2fe;padding:7px 10px;font-size:10px;font-weight:850;text-align:center;box-shadow:0 8px 24px rgba(2,6,23,.3);backdrop-filter:blur(8px);}',
      '.migration-flight-controls{display:flex;flex-direction:column;gap:14px;padding:16px;background:linear-gradient(180deg,#0f172a,#082f49);color:#f8fafc;overflow:auto;}',
      '.migration-flight-controls h3{margin:0;color:#fff;font-size:17px;line-height:1.2;}',
      '.migration-flight-controls p{margin:4px 0 0;color:#cbd5e1;font-size:11px;line-height:1.5;}',
      '.migration-flight-control{display:flex;flex-direction:column;gap:5px;color:#e2e8f0;font-size:10px;font-weight:900;letter-spacing:.03em;}',
      '.migration-flight-control select,.migration-flight-control input{width:100%;accent-color:#38bdf8;}',
      '.migration-flight-control select{min-height:40px;border:1px solid #64748b;border-radius:9px;background:#020617;color:#f8fafc;padding:8px;font-size:11px;font-weight:800;}',
      '.migration-flight-value{display:flex;justify-content:space-between;gap:8px;color:#e2e8f0;font-size:10px;font-weight:850;}',
      '.migration-flight-value strong{color:#7dd3fc;}',
      '.migration-flight-camera{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;}',
      '.migration-flight-camera button,.migration-flight-actions button{min-height:38px;border:1px solid #64748b;border-radius:8px;background:#0f172a;color:#f8fafc;padding:7px 6px;font-size:10px;font-weight:900;cursor:pointer;}',
      '.migration-flight-camera button[aria-pressed="true"]{border-color:#7dd3fc;background:#0369a1;color:#fff;box-shadow:0 0 0 2px rgba(125,211,252,.18);}',
      '.migration-flight-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;}',
      '.migration-flight-actions button:first-child{border-color:#38bdf8;background:#075985;}',
      '.migration-flight-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;}',
      '.migration-flight-stat{border:1px solid #475569;border-radius:9px;background:#020617;padding:8px;}',
      '.migration-flight-stat span{display:block;color:#cbd5e1;font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;}',
      '.migration-flight-stat strong{display:block;margin-top:3px;color:#f8fafc;font-size:11px;}',
      '.migration-monarch-note{border:1px solid #f59e0b;border-radius:10px;background:#451a03;color:#fffbeb;padding:10px;font-size:10px;line-height:1.45;}',
      '.migration-flight-deck:fullscreen,.migration-flight-deck:-webkit-full-screen,.migration-flight-deck[data-allo-fullscreen-active="true"]{width:100vw;height:100vh;grid-template-columns:minmax(0,1fr) minmax(250px,22vw);border:0;border-radius:0;}',
      '.migration-flight-deck:fullscreen .migration-flight-stage,.migration-flight-deck:-webkit-full-screen .migration-flight-stage,.migration-flight-deck[data-allo-fullscreen-active="true"] .migration-flight-stage{min-height:0;height:100vh;}',
      '.migration-flight-deck:fullscreen .migration-flight-controls,.migration-flight-deck:-webkit-full-screen .migration-flight-controls,.migration-flight-deck[data-allo-fullscreen-active="true"] .migration-flight-controls{padding-top:calc(16px + env(safe-area-inset-top));padding-bottom:calc(16px + env(safe-area-inset-bottom));}',
      '@media (max-width:900px){.migration-route-board{grid-template-columns:repeat(3,minmax(0,1fr));}}',
      '@media (max-width:760px){.migration-flight-deck{grid-template-columns:1fr;min-height:0;}.migration-flight-stage{min-height:430px;}.migration-flight-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));max-height:none;}.migration-flight-controls>div:first-child,.migration-monarch-note,.migration-flight-actions{grid-column:1/-1;}.migration-flight-deck:fullscreen,.migration-flight-deck:-webkit-full-screen,.migration-flight-deck[data-allo-fullscreen-active="true"]{display:flex;flex-direction:column;height:100vh;overflow:auto;}.migration-flight-deck:fullscreen .migration-flight-stage,.migration-flight-deck:-webkit-full-screen .migration-flight-stage,.migration-flight-deck[data-allo-fullscreen-active="true"] .migration-flight-stage{flex:1 0 58vh;min-height:58vh;height:auto;}.migration-flight-deck:fullscreen .migration-flight-controls,.migration-flight-deck:-webkit-full-screen .migration-flight-controls,.migration-flight-deck[data-allo-fullscreen-active="true"] .migration-flight-controls{flex:0 0 auto;}}',
      '@media (max-width:700px){.migration-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}.migration-command{align-items:flex-start;}.migration-command-icon{display:none;}}',
      '@media (max-width:520px){.migration-tool-shell{padding:0!important;}.migration-command{padding:13px;border-radius:14px;}.migration-command p{font-size:11px;}.migration-route-board{grid-template-columns:repeat(2,minmax(0,1fr));padding:7px;}.migration-route-tab{min-height:44px;}.migration-workspace [style*="grid-template-columns: repeat(3"],.migration-workspace [style*="grid-template-columns: repeat(2"]{grid-template-columns:1fr!important;}}',
      '@media (max-width:520px){.migration-flight-stage{min-height:360px;}.migration-flight-controls{grid-template-columns:1fr;}.migration-flight-controls>*{grid-column:1!important;}.migration-flight-badge{border-radius:9px;}.migration-flight-heading{display:none;}}',
      '@media (prefers-reduced-motion:reduce){.migration-route-tab{transition:none!important;}}',
      '.theme-contrast .migration-command,.theme-contrast .migration-active-band,.theme-contrast .migration-workspace canvas,.theme-contrast .migration-flight-deck{box-shadow:none;}.theme-contrast .migration-flight-controls{background:#000;}.theme-contrast .migration-flight-control select,.theme-contrast .migration-flight-camera button,.theme-contrast .migration-flight-actions button,.theme-contrast .migration-flight-stat{border-color:#fff;background:#000;color:#fff;}'
    ].join('\n');
    document.head.appendChild(migrationStyle);
  }


  // ── Audio + WCAG (auto-injected) ──
  var _migrAC = null;
  function getMigrAC() { if (!_migrAC) { try { _migrAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_migrAC && _migrAC.state==="suspended") { try { _migrAC.resume(); } catch(e) {} } return _migrAC; }
  function migrTone(f,d,tp,v) { var ac=getMigrAC(); if(!ac) return; try { var o=ac.createOscillator(); var g=ac.createGain(); o.type=tp||"sine"; o.frequency.value=f; g.gain.setValueAtTime(v||0.07,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxMigrClick() { migrTone(600,0.03,"sine",0.04); }
  function sfxMigrSuccess() { migrTone(523,0.08,"sine",0.07); setTimeout(function(){migrTone(659,0.08,"sine",0.07);},70); setTimeout(function(){migrTone(784,0.1,"sine",0.08);},140); }
  if(!document.getElementById("migr-a11y")){var _s=document.createElement("style");_s.id="migr-a11y";_s.textContent="@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}";document.head.appendChild(_s);}


  // ── Colour helpers ─────────────────────────────────────────────────────────
  // Every fill in this tool resolves to a literal colour string: a canvas
  // fillStyle set to 'var(--something)' is silently ignored by the 2D context,
  // so CSS custom properties never reach these helpers.
  function migrHexRgb(hex) {
    if (typeof hex !== 'string') return null;
    var s = hex.trim();
    if (s.charAt(0) !== '#') return null;
    if (s.length === 4) return { r: parseInt(s.charAt(1) + s.charAt(1), 16), g: parseInt(s.charAt(2) + s.charAt(2), 16), b: parseInt(s.charAt(3) + s.charAt(3), 16) };
    if (s.length === 7) return { r: parseInt(s.slice(1, 3), 16), g: parseInt(s.slice(3, 5), 16), b: parseInt(s.slice(5, 7), 16) };
    return null;
  }
  // amt > 0 lightens toward white, amt < 0 darkens toward black. Returns hex so
  // the result can be fed straight back into migrShade/migrAlpha. Anything that
  // is not a hex literal (rgba() strings, gradients) passes through untouched.
  function migrShade(color, amt) {
    var rgb = migrHexRgb(color);
    if (!rgb) return color;
    function mix(v) { var o = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt); return Math.max(0, Math.min(255, Math.round(o))); }
    function hx(v) { var s2 = v.toString(16); return s2.length < 2 ? '0' + s2 : s2; }
    return '#' + hx(mix(rgb.r)) + hx(mix(rgb.g)) + hx(mix(rgb.b));
  }
  function migrAlpha(color, a) {
    var rgb = migrHexRgb(color);
    if (!rgb) return color;
    return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + a + ')';
  }

  // ── Rounded-rectangle path (no roundRect(): Safari 15 and older WebViews
  // still ship a 2D context without it, and the desktop shell bundles one) ──
  function migrRoundPath(c, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.lineTo(x + w - rr, y); c.quadraticCurveTo(x + w, y, x + w, y + rr);
    c.lineTo(x + w, y + h - rr); c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    c.lineTo(x + rr, y + h); c.quadraticCurveTo(x, y + h, x, y + h - rr);
    c.lineTo(x, y + rr); c.quadraticCurveTo(x, y, x + rr, y);
    c.closePath();
  }

  // Shared HUD card: every on-canvas readout in this tool uses it, so the seven
  // tabs read as one instrument panel instead of seven ad-hoc grey boxes.
  function migrPanel(c, x, y, w, h, isDark, accent) {
    c.save();
    migrRoundPath(c, x, y, w, h, 8);
    c.shadowColor = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.20)';
    c.shadowBlur = 10;
    c.shadowOffsetY = 2;
    c.fillStyle = isDark ? 'rgba(2,6,23,0.86)' : 'rgba(255,255,255,0.94)';
    c.fill();
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.strokeStyle = isDark ? 'rgba(148,163,184,0.30)' : 'rgba(148,163,184,0.50)';
    c.lineWidth = 1;
    c.stroke();
    if (accent) {
      c.save();
      migrRoundPath(c, x, y, w, h, 8);
      c.clip();
      c.fillStyle = accent;
      c.fillRect(x, y, 3, h);
      c.restore();
    }
    c.restore();
  }

  // Annotated force/flow vector with a solid head — used by the aerodynamics
  // free-body diagram, the wind field and the navigation panel.
  function migrArrow(c, x1, y1, x2, y2, color, width, head) {
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var hs = head || Math.max(6, (width || 2) * 3);
    var bx = x2 - Math.cos(ang) * hs * 0.85;
    var by = y2 - Math.sin(ang) * hs * 0.85;
    c.save();
    c.strokeStyle = color;
    c.lineWidth = width || 2;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(bx, by);
    c.stroke();
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - Math.cos(ang - 0.42) * hs, y2 - Math.sin(ang - 0.42) * hs);
    c.lineTo(x2 - Math.cos(ang + 0.42) * hs, y2 - Math.sin(ang + 0.42) * hs);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.restore();
  }

  // Pill-shaped caption that stays readable over sky, map or ocean fills.
  function migrChip(c, x, y, text, fg, bgCol, font) {
    c.save();
    c.font = font || 'bold 9px system-ui';
    var w = c.measureText(text).width + 12;
    var hgt = 15;
    migrRoundPath(c, x - w / 2, y - hgt / 2, w, hgt, hgt / 2);
    c.fillStyle = bgCol;
    c.fill();
    c.fillStyle = fg;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, x, y + 0.5);
    c.restore();
  }

  // ── Bird silhouettes ───────────────────────────────────────────────────────
  // Plan view, nose at +x. `span`/`chord` scale the wing, `sweep` rakes it
  // rearward, `slots` cuts the emarginated primary "fingers" a soaring bird
  // shows, `forked` splits the tail and `legs` trails them past it.
  var BIRD_SHAPES = {
    generic:   { neck: 0.30, bill: 0.34, tail: 0.90, span: 1.55, chord: 1.00, sweep: 0.18, slots: 2, forked: 0, legs: 0 },
    goose:     { neck: 0.62, bill: 0.28, tail: 0.70, span: 1.60, chord: 1.00, sweep: 0.14, slots: 2, forked: 0, legs: 0 },
    crane:     { neck: 0.88, bill: 0.50, tail: 0.60, span: 1.88, chord: 1.05, sweep: 0.06, slots: 4, forked: 0, legs: 1.15 },
    tern:      { neck: 0.20, bill: 0.44, tail: 1.00, span: 2.00, chord: 0.58, sweep: 0.46, slots: 0, forked: 0.9, legs: 0 },
    raptor:    { neck: 0.16, bill: 0.26, tail: 0.95, span: 1.55, chord: 1.22, sweep: 0.22, slots: 4, forked: 0, legs: 0 },
    falcon:    { neck: 0.14, bill: 0.24, tail: 0.95, span: 1.62, chord: 0.66, sweep: 0.60, slots: 0, forked: 0, legs: 0 },
    shorebird: { neck: 0.34, bill: 0.72, tail: 0.70, span: 1.74, chord: 0.64, sweep: 0.48, slots: 0, forked: 0, legs: 0.75 },
    hummer:    { neck: 0.12, bill: 0.92, tail: 0.60, span: 0.95, chord: 0.52, sweep: 0.10, slots: 0, forked: 0, legs: 0, blur: 1 }
  };

  // Maps the SPECIES table onto the silhouettes above.
  var SPECIES_SILHOUETTE = {
    canada_goose: 'goose',
    snow_goose: 'goose',
    arctic_tern: 'tern',
    ruby_hummingbird: 'hummer',
    peregrine: 'falcon',
    sandhill_crane: 'crane',
    monarch: 'butterfly',
    bartailed_godwit: 'shorebird'
  };

  function drawButterfly(c, x, y, size, flapPhase, facing, color, isDark) {
    var u = size;
    var wingCol = color || '#f97316';
    var edge = migrShade(wingCol, -0.62);
    var inner = migrShade(wingCol, 0.16);
    // A butterfly's wings clap over its back, so the flap reads as the pair
    // closing toward the body rather than a bird's up-and-down stroke.
    var open = 0.30 + 0.70 * Math.abs(Math.cos(flapPhase * 0.5));
    var detail = u >= 7;
    c.save();
    c.translate(x, y);
    c.scale(facing < 0 ? -1 : 1, 1);
    for (var s = -1; s <= 1; s += 2) {
      c.save();
      c.scale(1, s * open);
      // Hindwing first so the forewing overlaps it, as in a real monarch.
      c.beginPath();
      c.moveTo(-0.12 * u, 0.02 * u);
      c.bezierCurveTo(-0.80 * u, 0.28 * u, -0.72 * u, 1.00 * u, -0.04 * u, 0.90 * u);
      c.bezierCurveTo(0.06 * u, 0.52 * u, 0.02 * u, 0.16 * u, -0.12 * u, 0.02 * u);
      c.closePath();
      c.fillStyle = migrShade(wingCol, -0.10);
      c.fill();
      c.strokeStyle = edge; c.lineWidth = Math.max(0.6, u * 0.10); c.stroke();
      // Forewing
      c.beginPath();
      c.moveTo(0.10 * u, 0.02 * u);
      c.bezierCurveTo(0.92 * u, 0.14 * u, 0.98 * u, 1.02 * u, 0.14 * u, 1.10 * u);
      c.bezierCurveTo(-0.06 * u, 0.62 * u, -0.02 * u, 0.20 * u, 0.10 * u, 0.02 * u);
      c.closePath();
      c.fillStyle = wingCol;
      c.fill();
      c.strokeStyle = edge; c.lineWidth = Math.max(0.6, u * 0.10); c.stroke();
      if (detail) {
        // Black venation and the white marginal spots that identify a monarch.
        c.strokeStyle = migrAlpha(edge, 0.8);
        c.lineWidth = Math.max(0.4, u * 0.05);
        for (var v = 0; v < 3; v++) {
          c.beginPath();
          c.moveTo(0.08 * u, 0.08 * u);
          c.quadraticCurveTo(0.45 * u, (0.30 + v * 0.22) * u, 0.62 * u - v * 0.20 * u, (0.82 + v * 0.10) * u);
          c.stroke();
        }
        c.fillStyle = '#f8fafc';
        for (var sp3 = 0; sp3 < 3; sp3++) {
          c.beginPath();
          c.arc((0.62 - sp3 * 0.20) * u, (0.90 - sp3 * 0.04) * u, Math.max(0.5, u * 0.055), 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = inner;
        c.beginPath();
        c.ellipse(0.34 * u, 0.44 * u, 0.20 * u, 0.26 * u, 0.3, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
    // Abdomen + thorax
    c.fillStyle = isDark ? '#1e293b' : '#111827';
    c.beginPath();
    c.ellipse(-0.10 * u, 0, 0.62 * u, 0.13 * u, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(0.34 * u, 0, 0.17 * u, 0, Math.PI * 2);
    c.fill();
    if (detail) {
      // Clubbed antennae
      c.strokeStyle = isDark ? '#334155' : '#111827';
      c.lineWidth = Math.max(0.4, u * 0.055);
      for (var an = -1; an <= 1; an += 2) {
        c.beginPath();
        c.moveTo(0.42 * u, an * 0.06 * u);
        c.quadraticCurveTo(0.80 * u, an * 0.30 * u, 0.92 * u, an * 0.62 * u);
        c.stroke();
        c.beginPath();
        c.arc(0.92 * u, an * 0.62 * u, Math.max(0.5, u * 0.07), 0, Math.PI * 2);
        c.fillStyle = isDark ? '#334155' : '#111827';
        c.fill();
      }
    }
    c.restore();
  }

  // Module-scoped bird drawing. `variant` keys into BIRD_SHAPES (or the string
  // 'butterfly'); omitting it keeps the previous generic silhouette.
  function drawBird(c, x, y, size, flapPhase, facing, color, isDark, variant) {
    if (variant === 'butterfly') { drawButterfly(c, x, y, size, flapPhase, facing, color, isDark); return; }
    var shape = BIRD_SHAPES[variant] || BIRD_SHAPES.generic;
    var u = size;
    var base = color || (isDark ? '#9aa8bd' : '#475569');
    var detail = u >= 7;
    var dark = migrShade(base, isDark ? -0.32 : -0.42);
    var light = migrShade(base, isDark ? 0.22 : 0.30);

    // Flap as seen from above/below: the wing swings through a dihedral arc, so
    // its projected span foreshortens toward the top and bottom of the stroke
    // and rakes rearward on the upstroke. That reads as depth, where the old
    // symmetric fore/aft sweep read as a flat kite.
    var dihedral = Math.sin(flapPhase) * 1.15;
    var span = (0.42 + 0.58 * Math.cos(dihedral)) * shape.span;
    var upstroke = Math.max(0, Math.sin(flapPhase));
    var sweep = shape.sweep + upstroke * 0.20;
    var ch = shape.chord;

    c.save();
    c.translate(x, y - Math.cos(flapPhase) * u * 0.05);
    c.scale(facing < 0 ? -1 : 1, 1);

    // ── Wings (behind the body) ──
    if (shape.blur) {
      // A hummingbird beats 50-80 times a second: far faster than the eye can
      // freeze, so paint the swept arc instead of a static wing.
      for (var hb = -1; hb <= 1; hb += 2) {
        c.save();
        c.translate(0.1 * u, hb * 0.30 * u);
        c.rotate(hb * (0.35 + Math.sin(flapPhase) * 0.30));
        c.beginPath();
        c.ellipse(-0.35 * u, hb * 0.55 * u, 0.95 * u, 0.34 * u, hb * 0.5, 0, Math.PI * 2);
        c.fillStyle = migrAlpha(base, 0.30);
        c.fill();
        c.restore();
      }
    } else {
      for (var s2 = -1; s2 <= 1; s2 += 2) {
        c.save();
        c.translate(0.18 * u, 0);
        // Mirror first, then rotate: rotating inside a reflection keeps the
        // sweep rearward on both wings without shearing the outline.
        c.scale(1, s2);
        c.rotate(sweep);
        c.beginPath();
        c.moveTo(0.20 * u, 0.06 * u);
        c.quadraticCurveTo(0.02 * u, 0.62 * u * span, -0.22 * u * ch, 1.00 * u * span);
        c.quadraticCurveTo(-0.55 * u * ch, 1.42 * u * span, -0.98 * u * ch, 1.58 * u * span);
        c.quadraticCurveTo(-1.04 * u * ch, 1.32 * u * span, -0.72 * u * ch, 1.02 * u * span);
        c.quadraticCurveTo(-0.66 * u * ch, 0.52 * u * span, -0.46 * u * ch, 0.08 * u);
        c.closePath();
        c.fillStyle = base;
        c.fill();
        // The "hand" (primaries) is darker than the arm, as on a real wing.
        c.beginPath();
        c.moveTo(-0.22 * u * ch, 1.00 * u * span);
        c.quadraticCurveTo(-0.55 * u * ch, 1.42 * u * span, -0.98 * u * ch, 1.58 * u * span);
        c.quadraticCurveTo(-1.04 * u * ch, 1.32 * u * span, -0.72 * u * ch, 1.02 * u * span);
        c.closePath();
        c.fillStyle = migrAlpha(dark, 0.55);
        c.fill();
        if (detail && shape.slots) {
          c.strokeStyle = migrAlpha(dark, 0.85);
          c.lineWidth = Math.max(0.5, u * 0.055);
          for (var f = 0; f < shape.slots; f++) {
            var ft = (f + 1) / (shape.slots + 1);
            c.beginPath();
            c.moveTo(-0.58 * u * ch, (0.98 + ft * 0.08) * u * span);
            c.lineTo(lerp(-0.98, -1.04, ft) * u * ch, lerp(1.56, 1.30, ft) * u * span);
            c.stroke();
          }
        }
        c.restore();
      }
    }

    // ── Trailing legs (cranes and shorebirds) ──
    if (shape.legs) {
      c.strokeStyle = migrShade(base, -0.48);
      c.lineWidth = Math.max(0.6, u * 0.07);
      for (var lg = -1; lg <= 1; lg += 2) {
        c.beginPath();
        c.moveTo(-0.60 * u, lg * 0.12 * u);
        c.lineTo(-(1.05 + shape.legs) * u, lg * 0.17 * u);
        c.stroke();
      }
    }

    // ── Tail ──
    var tf = shape.tail;
    var tipX = -(0.95 + tf * 0.55) * u;
    c.beginPath();
    c.moveTo(-0.55 * u, -0.20 * u);
    if (shape.forked) {
      c.lineTo(tipX - 0.35 * u * shape.forked, -0.60 * u * tf);
      c.lineTo(-1.00 * u, 0);
      c.lineTo(tipX - 0.35 * u * shape.forked, 0.60 * u * tf);
    } else {
      c.lineTo(tipX, -0.50 * u * tf);
      c.lineTo(tipX - 0.10 * u, 0);
      c.lineTo(tipX, 0.50 * u * tf);
    }
    c.lineTo(-0.55 * u, 0.20 * u);
    c.closePath();
    c.fillStyle = migrShade(base, isDark ? -0.14 : -0.20);
    c.fill();

    // ── Body ──
    c.beginPath();
    c.moveTo(1.05 * u, 0);
    c.bezierCurveTo(0.72 * u, -0.40 * u, -0.30 * u, -0.36 * u, -0.92 * u, 0);
    c.bezierCurveTo(-0.30 * u, 0.36 * u, 0.72 * u, 0.40 * u, 1.05 * u, 0);
    c.closePath();
    c.fillStyle = base;
    c.fill();
    if (detail) {
      c.beginPath();
      c.ellipse(0.15 * u, -0.10 * u, 0.60 * u, 0.12 * u, 0, 0, Math.PI * 2);
      c.fillStyle = migrAlpha(light, 0.55);
      c.fill();
    }

    // ── Neck, head and bill ──
    var headX = (1.00 + shape.neck) * u;
    if (shape.neck > 0.28) {
      c.beginPath();
      c.moveTo(0.85 * u, -0.20 * u);
      c.quadraticCurveTo(headX - 0.10 * u, -0.17 * u, headX, -0.06 * u);
      c.lineTo(headX, 0.06 * u);
      c.quadraticCurveTo(headX - 0.10 * u, 0.17 * u, 0.85 * u, 0.20 * u);
      c.closePath();
      c.fillStyle = migrShade(base, -0.08);
      c.fill();
    }
    c.beginPath();
    c.arc(headX, 0, 0.26 * u, 0, Math.PI * 2);
    c.fillStyle = migrShade(base, isDark ? 0.08 : -0.06);
    c.fill();
    var billHalf = shape.blur ? 0.05 * u : 0.10 * u;
    c.beginPath();
    c.moveTo(headX + 0.18 * u, -billHalf);
    c.lineTo(headX + (0.26 + shape.bill) * u, 0);
    c.lineTo(headX + 0.18 * u, billHalf);
    c.closePath();
    c.fillStyle = shape.blur ? migrShade(base, -0.60) : '#f59e0b';
    c.fill();
    if (detail) {
      c.fillStyle = isDark ? '#0b1220' : '#111827';
      for (var ey = -1; ey <= 1; ey += 2) {
        c.beginPath();
        c.arc(headX + 0.06 * u, ey * 0.15 * u, Math.max(0.6, u * 0.07), 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();
  }

  // ── Utility: clamp ──
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // ── Utility: lerp ──
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ── Utility: distance ──
  function dist(x1, y1, x2, y2) { return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)); }

  // ── Migration species data ──
  var SPECIES = [
    { id: 'canada_goose', name: 'Canada Goose', emoji: '\uD83E\uDEBF', flyway: 'atlantic', distance: 3000, speed: 40, altitude: 3000, breedingRange: 'Northern Canada & Alaska', winterRange: 'Southern US & Mexico', funFact: 'Canada Geese cruise at about 40 mph, but riding a strong tailwind they have been recorded covering 1,500 miles in 24 hours. They mate for life.', formation: 'V-formation' },
    { id: 'arctic_tern', name: 'Arctic Tern', emoji: '\uD83D\uDD4A\uFE0F', flyway: 'atlantic', distance: 44000, speed: 25, altitude: 1500, breedingRange: 'Arctic Circle', winterRange: 'Antarctic', funFact: 'Arctic Terns see two summers per year and more daylight than any other creature. Their migration is the longest of any animal.', formation: 'Loose flock' },
    { id: 'ruby_hummingbird', name: 'Ruby-throated Hummingbird', emoji: '\uD83D\uDC26', flyway: 'mississippi', distance: 3000, speed: 30, altitude: 500, breedingRange: 'Eastern North America', winterRange: 'Central America', funFact: 'This tiny bird weighing just 3g flies 500 miles non-stop across the Gulf of Mexico. It beats its wings 53 times per second.', formation: 'Solo' },
    { id: 'snow_goose', name: 'Snow Goose', emoji: '\uD83E\uDEBF', flyway: 'central', distance: 5000, speed: 50, altitude: 7500, breedingRange: 'Arctic tundra', winterRange: 'Southern US', funFact: 'Snow Geese have increased from 2 million to 15 million birds since the 1970s, actually damaging their Arctic breeding grounds.', formation: 'V-formation' },
    { id: 'peregrine', name: 'Peregrine Falcon', emoji: '\uD83E\uDD85', flyway: 'central', distance: 15500, speed: 60, altitude: 3500, breedingRange: 'Arctic tundra', winterRange: 'South America', funFact: 'The Peregrine Falcon is the fastest animal on Earth, reaching over 240 mph (386 km/h) in a hunting stoop (dive).', formation: 'Solo' },
    { id: 'sandhill_crane', name: 'Sandhill Crane', emoji: '\uD83E\uDDA9', flyway: 'central', distance: 6000, speed: 35, altitude: 6000, breedingRange: 'Northern US & Canada', winterRange: 'Southern US & Mexico', funFact: 'Sandhill Cranes are among the oldest living bird species, with fossils dating back 2.5 million years. They dance to bond with mates.', formation: 'V-formation' },
    { id: 'monarch', name: 'Monarch Butterfly', emoji: '\uD83E\uDD8B', flyway: 'central', distance: 3000, speed: 12, altitude: 1200, breedingRange: 'Eastern North America', winterRange: 'Central Mexico (oyamel fir forests)', funFact: 'No single Monarch makes the full round trip. It takes 4 generations to complete the cycle. Only the "super generation" migrates south.', formation: 'Swarm' },
    { id: 'bartailed_godwit', name: 'Bar-tailed Godwit', emoji: '\uD83D\uDC26', flyway: 'pacific', distance: 18000, speed: 55, altitude: 6000, breedingRange: 'Alaska', winterRange: 'New Zealand', funFact: 'In 2022 a five-month-old Bar-tailed Godwit flew 8,425 miles non-stop from Alaska to Tasmania in 11 days, without eating, drinking, or sleeping. It is the longest non-stop flight ever recorded, and the bird did it on its first migration, with no adult to follow.', formation: 'V-formation' }
  ];

  // ── Wing types for aerodynamics tab ──
  var WING_TYPES = [
    { id: 'soaring', name: 'Soaring (Eagle)', emoji: '\uD83E\uDD85', ar: 7, aspectRatio: 'High (7:1)', shape: 'Long, narrow, slotted tips', liftCoeff: 1.6, dragCoeff: 0.02, bestAngle: 5, stallAngle: 16, desc: 'Long narrow wings maximize lift-to-drag ratio for effortless soaring. Slotted wingtip feathers reduce induced drag by spreading vortices. Eagles can soar for hours without a single flap, using thermals and ridge lift.' },
    { id: 'flapping', name: 'Flapping (Goose)', emoji: '\uD83E\uDEBF', ar: 5, aspectRatio: 'Medium (5:1)', shape: 'Medium, broad, rounded', liftCoeff: 1.4, dragCoeff: 0.035, bestAngle: 6, stallAngle: 14, desc: 'Broad wings provide good lift at moderate speeds. Geese use powered flight with steady flapping for long-distance migration. A well-positioned trailing bird can cut its drag substantially via upwash exploitation (real flocks measure ~10–30% energy savings; ~65% is a theoretical per-position maximum).' },
    { id: 'hovering', name: 'Hovering (Hummingbird)', emoji: '\uD83D\uDC26', ar: 3, aspectRatio: 'Low (3:1)', shape: 'Short, figure-8 stroke', liftCoeff: 1.8, dragCoeff: 0.08, bestAngle: 40, stallAngle: 90, desc: 'Hummingbird wings rotate at the shoulder, allowing a figure-8 stroke pattern that generates lift on both the downstroke AND upstroke. They can fly backwards, sideways, and hover in place. Wing beat: 50-80 times per second.' },
    { id: 'speed', name: 'Speed (Falcon)', emoji: '\uD83E\uDD85', ar: 6, aspectRatio: 'Medium-High (6:1)', shape: 'Swept back, pointed', liftCoeff: 1.2, dragCoeff: 0.018, bestAngle: 4, stallAngle: 12, desc: 'Swept-back pointed wings minimize drag at high speeds. During a stoop (dive), Peregrines tuck their wings to form a teardrop shape, reaching 240+ mph. A small tubercle on the beak disrupts airflow to prevent suffocation at speed.' }
  ];

  // ── Navigation methods data ──
  var NAV_METHODS = [
    { id: 'magnetic', icon: '\uD83E\uDDED', name: 'Magnetic Sense', desc: 'Birds have magnetite crystals in their upper beaks connected to the trigeminal nerve. These crystals align with Earth\'s magnetic field like tiny compasses. Some species also have cryptochrome proteins in their eyes that may let them literally SEE magnetic field lines as colored overlays on their vision.' },
    { id: 'stars', icon: '\u2B50', name: 'Star Navigation', desc: 'Nocturnal migrants (warblers, thrushes) use star patterns to navigate. Experiments in planetariums showed that birds orient to the rotation center of the night sky (near Polaris). Young birds learn star patterns during their first summer — they aren\'t born knowing them.' },
    { id: 'sun', icon: '\u2600\uFE0F', name: 'Sun Compass', desc: 'Birds track the sun\'s position and use an internal circadian clock to compensate for its movement across the sky. Experiments with clock-shifted birds (kept in artificially lit rooms) showed they navigate in predictably wrong directions, proving the sun-compass mechanism.' },
    { id: 'landmarks', icon: '\uD83C\uDFD4\uFE0F', name: 'Landmarks', desc: 'Experienced migrants follow visual landmarks: coastlines, mountain ranges, rivers, and highways. Pigeons even follow roads and make turns at intersections. This "pilotage" navigation is learned over multiple migration trips and passed down through flock experience.' },
    { id: 'smell', icon: '\uD83D\uDC43', name: 'Smell Navigation', desc: 'Seabirds (petrels, albatrosses) navigate using olfactory maps of ocean scents. Dimethyl sulfide released by phytoplankton marks productive feeding areas. Homing pigeons also use smell — blocking their nostrils impairs their ability to find home.' },
    { id: 'inherited', icon: '\uD83E\uDDEC', name: 'Inherited Maps', desc: 'Some migration routes are genetically encoded. Young Cuckoos raised by foster parents of other species still migrate to the correct wintering grounds — a place they\'ve never been, following a route they were never taught. The CLOCK gene and ADCYAP1 gene are linked to migratory restlessness.' }
  ];

  // ── Beaufort scale labels ──
  var BEAUFORT = [
    { min: 0, max: 1, label: 'Calm' },
    { min: 1, max: 7, label: 'Light Breeze' },
    { min: 8, max: 18, label: 'Moderate' },
    { min: 19, max: 31, label: 'Fresh' },
    { min: 32, max: 40, label: 'Strong' },
    { min: 41, max: 50, label: 'Gale' }
  ];

  function getBeaufort(speed) {
    for (var i = 0; i < BEAUFORT.length; i++) {
      if (speed <= BEAUFORT[i].max) return BEAUFORT[i].label;
    }
    return 'Gale';
  }

  // ── Formation physics constants ──
  var FORMATION_FACTS = [
    { title: 'Upwash Zone', text: 'When a bird flaps, it creates a downward push of air (downwash) directly behind it and an upward push (upwash) at roughly 30\u00B0 to either side of the wingtip. Trailing birds position themselves in this upwash zone to get free lift.' },
    { title: 'Energy Savings', text: 'Research on pelicans (Weimerskirch et al., 2001) showed that birds in V-formation have lower heart rates and glide more often. Field studies suggest trailing birds save roughly 10–30% of their energy in real flocks; ~65% is a theoretical per-position maximum, not the typical saving.' },
    { title: 'Leader Rotation', text: 'Leading is exhausting \u2014 the front bird gets no upwash benefit and faces full air resistance. In nature, birds rotate leadership every few minutes. Each bird serves roughly equal time at the front.' },
    { title: 'Flap Timing', text: 'Birds in formation synchronize their wing beats with the bird ahead, adjusted by a phase delay. This maximizes the upwash capture. High-speed cameras show flap timing accuracy within 0.1 seconds.' },
    { title: 'Communication', text: 'Geese honk during flight to communicate position and encourage the leader. The V-shape also gives each bird an unobstructed view of the bird ahead, helping maintain spacing.' },
    { title: 'Vortex Physics', text: 'Each wingtip generates a spinning vortex of air (like a tiny tornado). The air on the outer edge of the vortex moves upward. By flying in the upwash of the preceding bird\'s wingtip vortex, trailing birds effectively surf on rising air.' }
  ];

  // ── Migration records ──
  var MIGRATION_RECORDS = [
    { species: 'Bar-tailed Godwit', record: 'Longest non-stop flight', value: '8,425 miles (Alaska to Tasmania, 11 days without rest)', year: 2022 },
    { species: 'Arctic Tern', record: 'Longest annual migration', value: '44,000 miles pole-to-pole round trip', year: 'Annual' },
    { species: 'Great Snipe', record: 'Fastest migration', value: '4,200 miles at 60 mph average', year: 2011 },
    { species: 'Ruppell\'s Griffon Vulture', record: 'Highest flight altitude', value: '37,000 feet (hit by airplane)', year: 1973 },
    { species: 'Ruby-throated Hummingbird', record: 'Smallest migrant', value: '500 miles non-stop across Gulf of Mexico at 3 grams', year: 'Annual' },
    { species: 'Common Swift', record: 'Longest continuous flight', value: '10 months airborne without landing', year: 2016 }
  ];

  // ── Threats to migratory birds ──
  var MIGRATION_THREATS = [
    { threat: 'Light Pollution', emoji: '\uD83D\uDCA1', desc: 'Artificial lights disorient nocturnal migrants, causing building collisions. Up to 1 billion birds die from building strikes annually in the US alone. Lights Out programs in major cities reduce deaths by 80%.' },
    { threat: 'Habitat Loss', emoji: '\uD83C\uDFD7\uFE0F', desc: 'Wetland drainage and deforestation destroy critical stopover sites where birds rest and refuel. Without these rest stops, birds cannot complete their journeys. 50% of North American wetlands have been lost since 1900.' },
    { threat: 'Climate Change', emoji: '\uD83C\uDF21\uFE0F', desc: 'Warming temperatures shift the timing of insect emergence and plant flowering, creating mismatches with bird arrival. Birds may arrive at breeding grounds to find their food sources have already peaked.' },
    { threat: 'Wind Turbines', emoji: '\uD83C\uDF2C\uFE0F', desc: 'Poorly sited wind farms can kill migratory birds, especially raptors. Modern solutions include radar-activated shutdown systems and careful placement away from migration corridors.' },
    { threat: 'Cat Predation', emoji: '\uD83D\uDC08', desc: 'Domestic and feral cats kill an estimated 1.3-4 billion birds per year in the US. Keeping cats indoors is one of the simplest conservation actions for birds.' }
  ];

  // ── Compass rose with a bezel, a 16-point tick ring and a wind vane ──
  // `windAngle` is in degrees with 0 = East, matching the wind-field maths, and
  // the vane points the way the air is going.
  function drawCompassRose(c, cx, cy, radius, windAngle, isDark) {
    var R = radius;
    c.save();
    c.translate(cx, cy);

    // Bezel
    c.beginPath();
    c.arc(0, 0, R, 0, Math.PI * 2);
    c.shadowColor = isDark ? 'rgba(0,0,0,0.60)' : 'rgba(15,23,42,0.22)';
    c.shadowBlur = 8;
    c.shadowOffsetY = 2;
    c.fillStyle = isDark ? 'rgba(2,6,23,0.90)' : 'rgba(255,255,255,0.95)';
    c.fill();
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.strokeStyle = isDark ? '#475569' : '#cbd5e1';
    c.lineWidth = 1.5;
    c.stroke();
    c.beginPath();
    c.arc(0, 0, R - 4, 0, Math.PI * 2);
    c.strokeStyle = isDark ? 'rgba(71,85,105,0.65)' : 'rgba(203,213,225,0.95)';
    c.lineWidth = 1;
    c.stroke();

    // 16-point tick ring, cardinals long
    for (var i = 0; i < 16; i++) {
      var a3 = i * Math.PI / 8;
      var major = i % 4 === 0;
      var inner = R - (major ? 10 : 6);
      c.beginPath();
      c.moveTo(Math.cos(a3) * inner, Math.sin(a3) * inner);
      c.lineTo(Math.cos(a3) * (R - 4), Math.sin(a3) * (R - 4));
      c.strokeStyle = major ? (isDark ? '#cbd5e1' : '#334155') : (isDark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.45)');
      c.lineWidth = major ? 1.4 : 0.8;
      c.stroke();
    }

    // Four-point star, north tinted red as on a real rose
    var star = R * 0.42;
    for (var q = 0; q < 4; q++) {
      var qa = -Math.PI / 2 + q * Math.PI / 2; // screen N, E, S, W
      for (var half = -1; half <= 1; half += 2) {
        c.beginPath();
        c.moveTo(Math.cos(qa) * star, Math.sin(qa) * star);
        c.lineTo(Math.cos(qa + half * Math.PI / 2) * star * 0.22, Math.sin(qa + half * Math.PI / 2) * star * 0.22);
        c.lineTo(0, 0);
        c.closePath();
        if (q === 0) c.fillStyle = half < 0 ? '#ef4444' : '#f87171';
        else c.fillStyle = half < 0 ? (isDark ? '#334155' : '#cbd5e1') : (isDark ? '#475569' : '#e2e8f0');
        c.fill();
      }
    }

    // Cardinal labels
    var dirs = ['E', 'N', 'W', 'S'];
    var angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    c.font = 'bold ' + Math.max(7, Math.round(R * 0.27)) + 'px system-ui';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (var di = 0; di < 4; di++) {
      var a = -angles[di];
      c.fillStyle = di === 1 ? '#ef4444' : (isDark ? '#cbd5e1' : '#334155');
      c.fillText(dirs[di], Math.cos(a) * (R - 13), Math.sin(a) * (R - 13));
    }

    // Wind vane
    c.rotate(-windAngle * Math.PI / 180);
    var vg = c.createLinearGradient(-R * 0.6, 0, R * 0.72, 0);
    vg.addColorStop(0, '#0369a1');
    vg.addColorStop(1, '#38bdf8');
    c.beginPath();
    c.moveTo(R * 0.74, 0);
    c.lineTo(R * 0.20, -R * 0.26);
    c.lineTo(R * 0.08, 0);
    c.lineTo(R * 0.20, R * 0.26);
    c.closePath();
    c.fillStyle = vg;
    c.fill();
    c.strokeStyle = isDark ? 'rgba(2,6,23,0.75)' : 'rgba(255,255,255,0.9)';
    c.lineWidth = 1;
    c.stroke();
    // Tail feather, so the vane reads as a direction rather than a blob
    c.beginPath();
    c.moveTo(R * 0.08, 0);
    c.lineTo(-R * 0.48, -R * 0.15);
    c.lineTo(-R * 0.60, 0);
    c.lineTo(-R * 0.48, R * 0.15);
    c.closePath();
    c.fillStyle = isDark ? 'rgba(148,163,184,0.9)' : 'rgba(100,116,139,0.9)';
    c.fill();
    // Hub
    c.beginPath();
    c.arc(0, 0, R * 0.09, 0, Math.PI * 2);
    c.fillStyle = isDark ? '#e2e8f0' : '#334155';
    c.fill();

    c.restore();
  }

  // ── Flyway map geometry ───────────────────────────────────────────────────
  // Rewritten 2026-08-16 to be GEOGRAPHICALLY REAL rather than hand-drawn.
  //
  // What was wrong: every landmass, flyway, stopover and label used to be
  // authored directly in the 620x400 design box by eye, while the map drew a
  // graticule claiming 60N/45N/30N/15N at fixed rows. Those two things
  // disagreed badly. Measured against the map's OWN parallels:
  //
  //     Gulf Coast stopover     drawn 37.7N   real 29.5N   +8.2 deg  (907 km)
  //     Hudson Bay south shore  drawn 59.0N   real 51.0N   +8.0 deg  (888 km)
  //     Mississippi Delta       drawn 35.3N   real 29.2N   +6.1 deg  (681 km)
  //     Florida tip             drawn 29.5N   real 24.5N   +5.0 deg  (555 km)
  //     Delaware Bay stopover   drawn 44.0N   real 39.1N   +4.9 deg  (544 km)
  //
  // Everything from the Great Lakes south sat several hundred kilometres too
  // far north, so a student reading latitude off the gridlines was reading a
  // wrong number. Alaska floated detached from the mainland, Baja floated
  // detached from Mexico, and the Mississippi Flyway did not follow the
  // Mississippi.
  //
  // Now: all geography is authored in REAL [lon, lat] degrees and projected
  // once at load. Accuracy is a property of the data, not of the drawing, and
  // it can be checked against an atlas instead of by eye.
  //
  // Projection: Lambert Conformal Conic, standard parallels 20N/60N, central
  // meridian 100W. That is the projection USFWS flyway maps use, it keeps
  // shapes true at the scale that matters here, and it makes the parallels
  // curve the way they do on a real continental map.
  var MIG_PROJ = (function() {
    var D2R = Math.PI / 180;
    var p1 = 20 * D2R, p2 = 60 * D2R, lam0 = -100 * D2R;
    var tanp = function(p) { return Math.tan(Math.PI / 4 + p / 2); };
    var n = Math.log(Math.cos(p1) / Math.cos(p2)) / Math.log(tanp(p2) / tanp(p1));
    var F = Math.cos(p1) * Math.pow(tanp(p1), n) / n;
    var rho = function(p) { return F / Math.pow(tanp(p), n); };
    var rho0 = rho(15 * D2R);
    // Raw conic coordinates. y is negated so that north is UP once this lands
    // in canvas space, where y grows downward.
    function raw(lon, lat) {
      var th = n * (lon * D2R - lam0), r = rho(lat * D2R);
      return [r * Math.sin(th), -(rho0 - r * Math.cos(th))];
    }
    // Fit is calibrated from the real data extent rather than guessed corner
    // longitudes, so the continent fills the 620x400 box no matter how the
    // source rings are edited later.
    var k = 1, ox = 0, oy = 0;
    function calibrate(ringSets, pad) {
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      ringSets.forEach(function(ring) {
        ring.forEach(function(p) {
          var r = raw(p[0], p[1]);
          if (r[0] < minX) minX = r[0];
          if (r[0] > maxX) maxX = r[0];
          if (r[1] < minY) minY = r[1];
          if (r[1] > maxY) maxY = r[1];
        });
      });
      var m = pad || 14;
      k = Math.min((620 - m * 2) / (maxX - minX), (400 - m * 2) / (maxY - minY));
      ox = (620 - (maxX - minX) * k) / 2 - minX * k;
      oy = (400 - (maxY - minY) * k) / 2 - minY * k;
    }
    function pt(lon, lat) { var r = raw(lon, lat); return [r[0] * k + ox, r[1] * k + oy]; }
    return {
      pt: pt,
      calibrate: calibrate,
      ring: function(arr) { return arr.map(function(p) { return pt(p[0], p[1]); }); },
      xy: function(lon, lat) { var p = pt(lon, lat); return { x: p[0], y: p[1] }; }
    };
  })();

  // ── Source geography, in real [longitude, latitude] ───────────────────────
  // Simplified coastline: roughly 1-2 degrees of detail, with the capes,
  // peninsulas and embayments that carry the pedagogy pinned to their true
  // positions (Point Barrow, the Mackenzie delta, Florida, the Mississippi
  // delta, Yucatan, the Isthmus of Panama, Baja and the Gulf of California,
  // Cape Mendocino, the Alaska Peninsula).
  var GEO_MAINLAND = [
    // Arctic coast of Alaska and Canada, west to east
    [-166.5, 68.3], [-163.0, 70.3], [-159.0, 71.0], [-156.5, 71.4], [-151.0, 70.5],
    [-148.0, 70.3], [-143.5, 70.1], [-141.0, 69.6], [-137.0, 69.0], [-134.5, 69.4],
    [-130.5, 70.0], [-128.0, 70.2], [-124.0, 69.9], [-120.0, 69.4], [-115.5, 68.3],
    [-111.0, 68.4], [-106.0, 68.0], [-101.0, 68.2], [-96.5, 68.4], [-92.0, 68.2],
    [-88.5, 67.0], [-86.5, 65.5],
    // Across northern Quebec to the Labrador Sea
    [-82.0, 64.2], [-78.5, 62.6], [-74.0, 62.2], [-69.5, 61.0], [-65.5, 60.5],
    [-64.0, 58.5], [-62.5, 56.5], [-60.0, 54.5], [-57.5, 53.0], [-56.0, 51.5],
    // Gulf of St Lawrence, the Gaspe, Nova Scotia, the Bay of Fundy.
    // Traced as one monotonic sweep: the earlier version doubled back on
    // itself here and the coastline crossed itself into a spike.
    [-58.5, 51.4], [-61.5, 50.2], [-64.0, 49.8], [-66.5, 49.2], [-64.5, 48.3],
    [-62.0, 47.6], [-60.0, 46.4], [-61.0, 45.3], [-63.5, 44.6], [-65.7, 43.5],
    [-66.4, 44.5], [-64.8, 45.4], [-66.0, 45.3], [-67.3, 45.1],
    // New England to the mid-Atlantic
    [-67.8, 44.8], [-69.0, 44.0], [-70.2, 43.6], [-70.6, 42.6], [-70.0, 42.0],
    [-71.5, 41.3], [-72.9, 41.1], [-74.0, 40.5], [-74.4, 39.4], [-75.1, 39.1],
    [-75.4, 38.3], [-76.0, 37.0], [-75.7, 36.0], [-75.5, 35.2], [-77.0, 34.2],
    [-78.9, 33.7], [-80.9, 32.1], [-81.4, 30.3],
    // Florida: down the Atlantic side, round the Keys, up the Gulf side
    [-80.4, 28.5], [-80.1, 26.1], [-80.4, 25.2], [-81.1, 25.1], [-81.8, 26.0],
    [-82.7, 27.8], [-83.7, 29.3], [-84.3, 30.1],
    // Gulf of Mexico: panhandle, the delta lobe, Texas
    [-86.0, 30.4], [-88.0, 30.3], [-89.2, 29.1], [-91.3, 29.3], [-93.8, 29.7],
    [-95.3, 28.9], [-97.4, 27.8], [-97.1, 25.9],
    // Mexico's Gulf coast and the Yucatan
    [-97.7, 22.3], [-97.0, 20.5], [-96.1, 19.2], [-94.5, 18.2], [-91.5, 18.6],
    [-90.5, 21.0], [-88.5, 21.6], [-87.0, 21.5], [-87.0, 19.5], [-87.8, 18.0],
    // Central America, Caribbean side, to the Isthmus of Panama
    [-88.3, 15.8], [-86.0, 16.0], [-83.5, 15.0], [-83.2, 12.5], [-83.0, 10.0],
    [-82.5, 9.5], [-80.0, 9.4], [-77.5, 8.7],
    // Back north up the Pacific side
    [-78.0, 7.5], [-80.5, 8.2], [-81.5, 7.5], [-83.5, 9.0], [-85.7, 11.0],
    [-87.0, 12.5], [-89.5, 13.5], [-91.5, 14.0], [-94.0, 15.5], [-95.5, 15.8],
    [-97.5, 16.0], [-99.5, 16.6], [-101.5, 17.5], [-104.0, 19.1], [-105.7, 21.5],
    [-105.5, 22.5], [-106.4, 23.2], [-108.9, 25.8], [-110.9, 27.9], [-112.5, 29.5],
    [-113.8, 31.2], [-114.7, 31.8],
    // Down the east side of Baja California, round the cape, back up the west
    [-114.4, 30.5], [-113.5, 29.0], [-112.5, 28.0], [-111.5, 26.7], [-110.5, 24.8],
    [-109.8, 24.2], [-109.4, 23.1], [-110.3, 23.4], [-111.5, 24.8], [-112.2, 26.0],
    [-113.5, 27.0], [-114.5, 28.0], [-115.2, 29.2], [-116.0, 30.5], [-116.8, 31.7],
    // US Pacific coast
    [-117.2, 32.5], [-118.4, 33.7], [-119.6, 34.4], [-120.6, 34.5], [-121.9, 36.6],
    [-122.5, 37.8], [-123.7, 39.0], [-124.4, 40.4], [-124.2, 43.3], [-124.0, 46.3],
    [-124.7, 48.4],
    // British Columbia and the Alaska panhandle
    [-125.5, 50.0], [-127.5, 51.5], [-128.5, 53.5], [-130.5, 54.5], [-131.5, 55.2],
    [-134.0, 57.0], [-136.5, 58.5], [-139.5, 59.6], [-142.5, 60.0], [-145.0, 60.4],
    // Prince William Sound, Cook Inlet, the Alaska Peninsula
    [-147.5, 60.6], [-149.5, 60.2], [-151.5, 59.2], [-153.5, 58.5], [-155.5, 57.5],
    [-158.0, 56.5], [-160.5, 55.5], [-162.5, 55.0],
    // Bristol Bay, the Yukon delta, Norton Sound, the Seward Peninsula.
    // Also retraced as a single sweep north; the old run reversed twice and
    // put a spike through the Alaska Peninsula.
    [-160.0, 56.2], [-158.2, 57.5], [-159.5, 58.7], [-161.8, 58.6], [-163.5, 59.6],
    [-165.0, 60.5], [-165.2, 61.5], [-164.0, 62.5], [-161.5, 63.5], [-163.5, 64.5],
    [-166.0, 65.0], [-167.5, 65.7], [-165.5, 66.4], [-163.8, 67.4]
  ];
  // Hudson Bay and James Bay, as one water body cut into the mainland.
  var GEO_HUDSON = [
    [-94.5, 58.8], [-92.5, 61.5], [-90.0, 63.2], [-87.0, 64.0], [-83.5, 63.5],
    [-80.0, 62.5], [-78.0, 60.5], [-77.3, 57.5], [-78.5, 55.0], [-79.0, 52.5],
    [-79.5, 51.2], [-81.5, 51.5], [-82.3, 53.0], [-84.5, 55.0], [-87.5, 56.0],
    [-91.0, 57.2]
  ];
  // The Great Lakes, west to east. Simplified rings, not ellipses: Michigan
  // hangs south, Superior runs east-west, Erie and Ontario are the small pair.
  var GEO_LAKES = [
    [[-92.1, 46.7], [-90.5, 47.0], [-88.0, 46.9], [-86.0, 46.7], [-84.4, 46.5],
     [-85.0, 46.9], [-87.0, 48.3], [-89.0, 48.1], [-90.8, 47.3]],
    [[-87.9, 45.8], [-86.3, 45.5], [-85.0, 44.5], [-85.6, 43.0], [-86.2, 41.7],
     [-87.3, 41.6], [-87.8, 43.0], [-88.0, 44.5]],
    [[-84.7, 45.8], [-83.4, 45.3], [-82.4, 44.5], [-81.7, 43.4], [-82.0, 43.0],
     [-83.0, 43.6], [-83.9, 44.0], [-84.0, 45.0], [-84.8, 46.0]],
    [[-83.5, 41.7], [-82.0, 41.5], [-80.5, 42.2], [-78.9, 42.9], [-80.0, 42.6],
     [-81.5, 42.3], [-83.2, 42.1]],
    [[-79.8, 43.3], [-78.0, 43.4], [-76.5, 43.8], [-76.1, 44.2], [-77.5, 44.1],
     [-79.3, 43.7]]
  ];
  var GEO_ISLANDS = [
    // Newfoundland
    [[-59.4, 47.6], [-58.0, 48.6], [-56.0, 50.5], [-55.5, 51.6], [-54.0, 49.7],
     [-52.7, 47.7], [-53.5, 46.7], [-55.5, 46.9], [-57.5, 47.5]],
    // Vancouver Island
    [[-128.4, 50.8], [-126.0, 50.2], [-124.0, 49.0], [-123.3, 48.4], [-124.7, 48.6],
     [-126.5, 49.6], [-127.8, 50.4]],
    // Haida Gwaii
    [[-133.0, 54.2], [-131.6, 53.3], [-131.0, 52.2], [-132.0, 52.9], [-132.7, 53.7]],
    // Cuba
    [[-84.9, 21.9], [-82.5, 23.0], [-80.5, 23.2], [-78.5, 22.4], [-75.6, 21.0],
     [-74.1, 20.3], [-76.5, 19.9], [-79.0, 21.5], [-82.0, 22.3]],
    // Hispaniola
    [[-74.5, 18.4], [-72.5, 19.9], [-70.0, 19.9], [-68.3, 18.6], [-70.5, 18.2],
     [-72.5, 18.2]],
    // Prince Edward Island
    [[-64.4, 46.4], [-63.0, 46.4], [-62.0, 46.4], [-63.3, 46.1], [-64.2, 46.2]]
  ];
  // The Aleutian chain, drawn as fading dots rather than a landmass.
  var GEO_ALEUTIANS = [
    [-164.5, 54.5], [-167.5, 53.5], [-170.5, 52.7], [-174.0, 52.1], [-177.5, 51.8],
    [-181.0, 51.5], [-184.5, 51.9]
  ];
  // Ridge lines migrating raptors ride for lift, drawn as relief hatching:
  // the Rockies, the Sierra Nevada / Cascades, the Appalachians, and the two
  // Sierra Madre.
  var GEO_RANGES = [
    { pts: [[-146.0, 63.5], [-135.0, 60.0], [-125.0, 55.0], [-118.0, 50.0], [-113.0, 45.0],
            [-110.5, 40.0], [-107.5, 35.5], [-106.0, 32.0]], step: 7, hgt: 3 },
    { pts: [[-121.5, 48.5], [-121.0, 44.5], [-120.5, 40.5], [-118.5, 37.0], [-116.5, 34.0]], step: 7, hgt: 2.4 },
    { pts: [[-68.5, 46.0], [-73.0, 43.5], [-77.5, 40.5], [-81.0, 36.5], [-84.5, 34.0]], step: 7, hgt: 2.4 },
    { pts: [[-108.5, 29.0], [-105.5, 25.0], [-103.5, 21.5], [-100.0, 19.5], [-97.0, 18.5]], step: 6, hgt: 2.2 },
    { pts: [[-100.0, 25.5], [-98.5, 22.5], [-97.5, 20.0]], step: 6, hgt: 2.0 }
  ];
  // Rivers birds pilot along. The Mississippi is the one the flyway is named
  // for, so it is drawn from Lake Itasca to the delta, through the cities the
  // flyway's stopovers sit near.
  var GEO_RIVERS = [
    [[-95.2, 47.2], [-93.1, 44.9], [-91.2, 43.5], [-90.6, 41.5], [-90.2, 38.6],
     [-89.5, 36.5], [-90.1, 35.1], [-91.1, 32.5], [-91.2, 30.5], [-89.4, 29.2]],
    [[-111.5, 45.9], [-104.0, 47.5], [-97.0, 42.8], [-95.9, 41.2], [-90.2, 38.6]],
    [[-134.0, 68.9], [-125.0, 65.0], [-117.0, 61.0], [-112.0, 58.5]],
    [[-106.5, 37.7], [-104.5, 33.5], [-103.0, 29.5], [-99.5, 27.5], [-97.1, 25.9]]
  ];
  // Place labels, positioned by real coordinates rather than by eye.
  var GEO_PLACES = [
    { text: 'CANADA', lon: -105, lat: 57, kind: 'land' },
    { text: 'UNITED STATES', lon: -98, lat: 39, kind: 'land' },
    { text: 'MEXICO', lon: -102, lat: 23, kind: 'land' },
    { text: 'ALASKA', lon: -152, lat: 65, kind: 'land' },
    { text: 'Gulf of Mexico', lon: -90, lat: 25, kind: 'water' },
    { text: 'Hudson Bay', lon: -85.5, lat: 59.5, kind: 'water' },
    { text: 'Atlantic Ocean', lon: -55, lat: 33, kind: 'water' },
    { text: 'Pacific Ocean', lon: -140, lat: 38, kind: 'water' },
    { text: 'Caribbean Sea', lon: -75, lat: 14.5, kind: 'water' }
  ];

  // ── Per-species routes, in real [lon, lat] ────────────────────────────────
  // Each species used to borrow the two ENDS of its flyway corridor for its
  // "Breeding" and "Wintering" markers. For the five species that winter
  // inside North America that was roughly right. For the three that do not, it
  // taught the opposite of the fact the card next to it states:
  //
  //   Arctic Tern       card says Arctic -> ANTARCTIC     map drew: Caribbean
  //   Bar-tailed Godwit card says Alaska -> NEW ZEALAND   map drew: west Mexico
  //   Peregrine Falcon  card says Arctic -> SOUTH AMERICA map drew: west Mexico
  //
  // The Arctic Tern's entire claim to fame is that it goes pole to pole, so a
  // map that stops it at Cuba is worse than no map. Those three now run to the
  // edge of the sheet and are labelled with where they carry on to, which is
  // what a real flyway map does.
  var SPECIES_ROUTES = {
    canada_goose:     { path: [[-75, 58], [-76, 52], [-76, 46], [-75.5, 42], [-76.5, 38], [-79, 34]] },
    arctic_tern:      { path: [[-75, 72], [-68, 64], [-62, 55], [-58, 45], [-52, 33], [-48, 20], [-45, 10]],
                        offMap: 'Antarctic' },
    ruby_hummingbird: { path: [[-84, 43], [-86, 38], [-88, 33], [-90, 29.5], [-90.5, 24], [-88, 18], [-85, 12]] },
    snow_goose:       { path: [[-105, 70], [-102, 62], [-100, 54], [-99, 46], [-98, 39], [-96, 33], [-94, 30]] },
    peregrine:        { path: [[-130, 69], [-118, 60], [-108, 50], [-100, 40], [-93, 31], [-86, 22], [-78, 14], [-72, 9]],
                        offMap: 'South America' },
    sandhill_crane:   { path: [[-115, 63], [-110, 56], [-105, 49], [-101, 44], [-98.5, 40.8], [-99, 35], [-100, 30], [-101, 27]] },
    monarch:          { path: [[-83, 44], [-85, 40], [-88, 36], [-92, 32], [-96, 28], [-98, 24], [-100.3, 19.6]] },
    bartailed_godwit: { path: [[-163, 62], [-166, 55], [-170, 45], [-173, 36], [-176, 28]],
                        offMap: 'New Zealand' }
  };

  // ── Projected into the 620x400 design space the drawing code uses ─────────
  // Calibrated on the mainland plus the outlying islands, so nothing that gets
  // drawn can fall outside the box.
  MIG_PROJ.calibrate([GEO_MAINLAND].concat(GEO_ISLANDS).concat([GEO_ALEUTIANS]), 14);
  var MAP_COAST = MIG_PROJ.ring(GEO_MAINLAND);
  var MAP_HUDSON = MIG_PROJ.ring(GEO_HUDSON);
  var MAP_LAKES = GEO_LAKES.map(function(r) { return MIG_PROJ.ring(r); });
  var MAP_ISLANDS = GEO_ISLANDS.map(function(r) { return MIG_PROJ.ring(r); });
  var MAP_ALEUTIANS = MIG_PROJ.ring(GEO_ALEUTIANS);
  var MAP_RIVERS = GEO_RIVERS.map(function(r) { return MIG_PROJ.ring(r); });
  var MAP_RANGES = GEO_RANGES.map(function(r) {
    return { pts: MIG_PROJ.ring(r.pts), step: r.step, hgt: r.hgt };
  });
  var MAP_PLACES = GEO_PLACES.map(function(p) {
    var xy = MIG_PROJ.pt(p.lon, p.lat);
    return { text: p.text, x: xy[0], y: xy[1], kind: p.kind };
  });
  // Species routes in design space, plus the point at which an off-map route
  // leaves the sheet, so the "carries on to ..." marker can sit on the edge.
  var MAP_SPECIES_ROUTES = (function() {
    var out = {};
    Object.keys(SPECIES_ROUTES).forEach(function(id) {
      var sr = SPECIES_ROUTES[id];
      var pts = sr.path.map(function(p) { return MIG_PROJ.xy(p[0], p[1]); });
      var lastIn = pts.length - 1;
      for (var i = 0; i < pts.length; i++) {
        if (pts[i].x < 4 || pts[i].x > 616 || pts[i].y < 4 || pts[i].y > 396) { lastIn = Math.max(0, i - 1); break; }
      }
      out[id] = { pts: pts, offMap: sr.offMap || null, exitIdx: lastIn };
    });
    return out;
  })();

  // Wind-speed colour ramp, shared by the particles and the key so the two
  // cannot drift. t = 0 is dead calm, t = 0.45 is the ambient wind the student
  // set, t = 1 is roughly twice ambient. Continuous throughout: the previous
  // ramp was flat below 0.4, which hid exactly the slowed-down air the terrain
  // objects exist to create.
  function migrWindRamp(t, isDark) {
    var stops = isDark
      ? [[100, 116, 139], [125, 211, 252], [251, 191, 36]]
      : [[100, 116, 139], [2, 132, 199], [234, 88, 12]];
    var u = Math.max(0, Math.min(1, t));
    var a, b, f;
    if (u <= 0.45) { a = stops[0]; b = stops[1]; f = u / 0.45; }
    else { a = stops[1]; b = stops[2]; f = (u - 0.45) / 0.55; }
    return [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f)
    ];
  }
  // Particle speed -> ramp position, measured against the ambient wind so the
  // colour answers "faster or slower than the wind I set?".
  function migrWindNorm(spd, ambient) {
    var amb = Math.max(0.05, ambient || 0.9);
    var ratio = spd / amb;
    return ratio <= 1 ? 0.45 * ratio : 0.45 + 0.55 * Math.min(1, (ratio - 1) / 1.1);
  }

  // Catmull-Rom through the given points, emitted as beziers so a 20-point
  // coastline reads as a coastline rather than a polygon.
  function migrSmoothPath(c, pts, sx, sy, closed, tension) {
    var n = pts.length;
    if (n < 2) return;
    var k = typeof tension === 'number' ? tension : 1 / 6;
    function P(i) {
      var j = closed ? ((i % n) + n) % n : (i < 0 ? 0 : (i > n - 1 ? n - 1 : i));
      return pts[j];
    }
    c.beginPath();
    c.moveTo(P(0)[0] * sx, P(0)[1] * sy);
    var last = closed ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      c.bezierCurveTo(
        (p1[0] + (p2[0] - p0[0]) * k) * sx, (p1[1] + (p2[1] - p0[1]) * k) * sy,
        (p2[0] - (p3[0] - p1[0]) * k) * sx, (p2[1] - (p3[1] - p1[1]) * k) * sy,
        p2[0] * sx, p2[1] * sy
      );
    }
    if (closed) c.closePath();
  }

  // Small landmass: smooth outline, fill, coast stroke.
  function migrDrawLand(c, pts, sx, sy, fill, stroke, lw) {
    migrSmoothPath(c, pts, sx, sy, true, 0.10);
    c.fillStyle = fill;
    c.fill();
    c.strokeStyle = stroke;
    c.lineWidth = lw;
    c.stroke();
  }

  // ── Wind-field terrain ────────────────────────────────────────────────────
  // These were emoji glyphs, which rendered at whatever size and style the
  // platform font chose and carried no windward side, no height and no sense of
  // scale — the three things the wind model is actually about. Drawn geometry
  // lets the picture agree with getWindAt().
  function migrDrawTerrain(c, type, x, y, time, isDark) {
    c.save();
    c.translate(x, y);
    c.lineJoin = 'round';

    if (type === 'mountain') {
      var rockL = isDark ? '#52606f' : '#a3aebd';
      var rockD = isDark ? '#333e4d' : '#6b7a8d';
      // Back ridge
      c.beginPath();
      c.moveTo(6, 22); c.lineTo(30, -16); c.lineTo(52, 22); c.closePath();
      c.fillStyle = rockD; c.fill();
      // Main peak, windward face lit
      c.beginPath();
      c.moveTo(-38, 22); c.lineTo(-2, -32); c.lineTo(30, 22); c.closePath();
      c.fillStyle = rockL; c.fill();
      // Lee face in shadow — the side the downdraft and rotor roll off
      c.beginPath();
      c.moveTo(-2, -32); c.lineTo(30, 22); c.lineTo(3, 22); c.closePath();
      c.fillStyle = rockD; c.fill();
      // Snowline
      c.beginPath();
      c.moveTo(-2, -32); c.lineTo(12, -11); c.lineTo(6, -7); c.lineTo(0, -13);
      c.lineTo(-6, -7); c.lineTo(-11, -13); c.lineTo(-15, -9); c.closePath();
      c.fillStyle = isDark ? '#cbd5e1' : '#f8fafc'; c.fill();
      c.strokeStyle = isDark ? 'rgba(2,6,23,0.55)' : 'rgba(51,65,85,0.35)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(-38, 22); c.lineTo(-2, -32); c.lineTo(30, 22); c.stroke();

    } else if (type === 'building') {
      var wall = isDark ? '#3f4550' : '#cbd5e1';
      var side = isDark ? '#272c34' : '#94a3b8';
      c.fillStyle = wall; c.fillRect(-17, -34, 27, 56);
      c.fillStyle = side; c.fillRect(10, -30, 9, 52);
      c.fillStyle = isDark ? '#525a67' : '#e2e8f0';
      c.fillRect(-19, -38, 31, 4);
      c.fillRect(12, -34, 9, 4);
      // Lit windows at night, reflective by day
      var lit = isDark ? '#fbbf24' : '#93c5fd';
      for (var wr = 0; wr < 6; wr++) {
        for (var wq = 0; wq < 3; wq++) {
          var on = (((wr * 3 + wq + 1) * 7) % 5) > 1;
          c.fillStyle = on ? lit : (isDark ? '#161a20' : '#64748b');
          c.fillRect(-13 + wq * 7, -29 + wr * 8, 5, 5);
        }
      }
      c.strokeStyle = isDark ? 'rgba(2,6,23,0.6)' : 'rgba(71,85,105,0.4)';
      c.lineWidth = 1;
      c.strokeRect(-17, -34, 27, 56);

    } else if (type === 'lake') {
      c.beginPath();
      c.ellipse(0, 10, 42, 14, 0, 0, Math.PI * 2);
      c.fillStyle = isDark ? '#0f4c5c' : '#7dd3fc';
      c.fill();
      c.strokeStyle = isDark ? '#0e7490' : '#38bdf8';
      c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = isDark ? 'rgba(125,211,252,0.55)' : 'rgba(255,255,255,0.85)';
      c.lineWidth = 1.2;
      for (var sh = 0; sh < 3; sh++) {
        var sy2 = 5 + sh * 6;
        var swid = 26 - sh * 8 + Math.sin(time * 1.6 + sh) * 4;
        c.beginPath(); c.moveTo(-swid / 2, sy2); c.lineTo(swid / 2, sy2); c.stroke();
      }
      // Convection wisps: the warm, moist air the lake sends up
      c.strokeStyle = isDark ? 'rgba(148,233,255,0.32)' : 'rgba(56,189,248,0.40)';
      c.lineWidth = 1.4;
      for (var ev = -1; ev <= 1; ev++) {
        c.beginPath();
        c.moveTo(ev * 17, -2);
        c.quadraticCurveTo(ev * 17 + Math.sin(time * 2 + ev) * 8, -18, ev * 17 + Math.sin(time * 2 + ev * 2) * 4, -34);
        c.stroke();
      }

    } else if (type === 'thermal') {
      // A column of rising warm air, widening as it climbs
      var g5 = c.createLinearGradient(0, 26, 0, -48);
      g5.addColorStop(0, isDark ? 'rgba(251,191,36,0.32)' : 'rgba(249,115,22,0.28)');
      g5.addColorStop(1, isDark ? 'rgba(251,191,36,0)' : 'rgba(249,115,22,0)');
      c.fillStyle = g5;
      c.beginPath();
      c.moveTo(-20, 26); c.lineTo(20, 26); c.lineTo(32, -48); c.lineTo(-32, -48);
      c.closePath(); c.fill();
      // Helical updraft — the spiral a soaring bird circles inside
      c.strokeStyle = isDark ? 'rgba(253,224,71,0.85)' : 'rgba(234,88,12,0.78)';
      c.lineWidth = 1.6;
      c.beginPath();
      for (var hy = 26; hy > -48; hy -= 2) {
        var hp = hy * 0.16 + time * 3;
        var hr = 8 + (26 - hy) * 0.17;
        if (hy === 26) c.moveTo(Math.sin(hp) * hr, hy);
        else c.lineTo(Math.sin(hp) * hr, hy);
      }
      c.stroke();
      migrArrow(c, 0, 22, 0, -34, isDark ? '#facc15' : '#ea580c', 2, 7);

    } else if (type === 'forest') {
      var trunk = isDark ? '#3b2a1c' : '#7c4a21';
      var leafD = isDark ? '#14532d' : '#15803d';
      var leafL = isDark ? '#166534' : '#22c55e';
      var TREES = [[-27, 0.82], [-14, 1.02], [0, 0.76], [13, 1.06], [26, 0.84]];
      for (var tr2 = 0; tr2 < TREES.length; tr2++) {
        var tx2 = TREES[tr2][0];
        var ts = TREES[tr2][1];
        // Canopy sway, strongest at the crown
        var swayBase = Math.sin(time * 1.4 + tr2) * 1.4;
        c.fillStyle = trunk;
        c.fillRect(tx2 - 1.7, 13, 3.4, 9);
        for (var tier = 0; tier < 3; tier++) {
          var ty2 = 15 - tier * 9 * ts;
          var tw2 = (11 - tier * 2.6) * ts;
          var swy = swayBase * (tier + 1) * 0.5;
          c.beginPath();
          c.moveTo(tx2 + swy, ty2 - 15 * ts);
          c.lineTo(tx2 - tw2, ty2);
          c.lineTo(tx2 + tw2, ty2);
          c.closePath();
          c.fillStyle = tier === 2 ? leafL : leafD;
          c.fill();
        }
      }
    }
    c.restore();
  }

  // ── Format large numbers ──
  function fmtNum(n) {
    if (n >= 1000) return Math.round(n / 100) / 10 + 'k';
    return String(n);
  }

  // ════════════════════════════════════════════
  // REGISTER TOOL
  // ════════════════════════════════════════════
  window.StemLab.registerTool('migration', {
    icon: '\uD83E\uDDED',
    label: 'Migration & Wind Lab',
    desc: '3D migration flight, Monarch journeys, V-formation aerodynamics, wind currents & flyways',
    color: 'sky',
    category: 'science',
    questHooks: [
      { id: 'form_v', label: 'Form a perfect V-formation', icon: '\uD83E\uDEBF', check: function(d) { return d.perfectVFormed; }, progress: function(d) { return d.perfectVFormed ? '\u2713' : '\u2014'; } },
      { id: 'plan_route', label: 'Plan a migration route', icon: '\uD83D\uDDFA\uFE0F', check: function(d) { return (d.routesPlanned || 0) >= 1; }, progress: function(d) { return (d.routesPlanned || 0) + '/1'; } },
      { id: 'ride_thermal', label: 'Help a bird ride a thermal updraft', icon: '\uD83C\uDF00', check: function(d) { return d.thermalRidden; }, progress: function(d) { return d.thermalRidden ? '\u2713' : '\u2014'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;
      var useCallback = React.useCallback;
      var d = (ctx.toolData && ctx.toolData['migration']) || {};
      var upd = function(key, val) { ctx.update('migration', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('migration', obj); };
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var t = ctx.t;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var beep = ctx.beep;
      var isDark = ctx.isDark;
      var isContrast = ctx.isContrast;
      var gradeLevel = ctx.gradeLevel;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;

      // ── Tab state ──
      var tab = d.tab || 'flight3d';
      var TABS = [
        { id: 'flight3d', label: '3D Flight', icon: '\uD83C\uDF10' },
        { id: 'vformation', label: 'V-Formation', icon: '\uD83E\uDEBF' },
        { id: 'wind', label: t('stem.migration.wind_currents', 'Wind Currents'), icon: '\uD83C\uDF2C\uFE0F' },
        { id: 'routes', label: t('stem.migration.migration_routes', 'Migration Routes'), icon: '\uD83D\uDDFA\uFE0F' },
        { id: 'aero', label: t('stem.migration.aerodynamics', 'Aerodynamics'), icon: '\u2708\uFE0F' },
        { id: 'navigate', label: t('stem.migration.weather_nav', 'Weather & Nav'), icon: '\uD83E\uDDED' },
        { id: 'inquiry', label: t('stem.migration.energy_inquiry', 'Energy Inquiry'), icon: '\uD83D\uDD2C' }
      ];

      // ── Theme helpers ──
      var bg = isDark ? 'bg-slate-900' : 'bg-white';
      var cardBg = isDark ? 'bg-slate-800' : 'bg-slate-50';
      var borderCol = isDark ? 'border-slate-700' : 'border-slate-200';
      var textPrimary = isDark ? 'text-white' : 'text-slate-900';
      var textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
      var textMuted = isDark ? 'text-slate-400' : 'text-slate-500'; // was 'text-slate-200' on both branches → ~1.6:1 on the light surface, failed WCAG AA
      var accent = 'text-sky-500';
      var accentBg = isDark ? 'bg-sky-900/40' : 'bg-sky-50';
      var btnPrimary = 'bg-sky-700 hover:bg-sky-800 text-white';
      var btnSecondary = isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700';

      // ── Reduced motion ──
      var reducedMotionRef = useRef(false);
      useEffect(function() {
        var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
        reducedMotionRef.current = mq && mq.matches;
        if (mq && mq.addEventListener) {
          var handler = function(e) { reducedMotionRef.current = e.matches; };
          mq.addEventListener('change', handler);
          return function() { mq.removeEventListener('change', handler); };
        }
      }, []);

      // ══════════════════════════════════════════
      // HOISTED HOOKS — all useRef/useEffect must be called unconditionally
      // (React Rules of Hooks: same number in same order every render)
      // ══════════════════════════════════════════
      // Tab 1: V-Formation refs
      var _vfCanvasRef = useRef(null);
      var _vfAnimRef = useRef(null);
      var _vfBirdsRef = useRef(null);
      var _vfDragRef = useRef({ active: false, idx: -1, offX: 0, offY: 0 });
      var _vfTimeRef = useRef(0);
      // Synchronous gate for "perfect V" XP award — prevents animation frames from
      // re-firing awardXP while the async toolData write propagates.
      var _vfPerfectRef = useRef(false);
      var _f3dHostRef = useRef(null);
      var _f3dEngineRef = useRef(null);
      var _f3dBootRef = useRef(0);
      // Tab 2: Wind Currents refs
      var _wcCanvasRef = useRef(null);
      var _wcAnimRef = useRef(null);
      var _wcParticlesRef = useRef(null);
      var _wcObjectsRef = useRef(null);
      var _wcBirdsRef = useRef([]);
      var _wcTimeRef = useRef(0);
      // Synchronous one-shot for the thermal award. The state write is async, so
      // between the award and the re-render every qualifying frame would fire
      // again — the same ~60-XP-per-second shape _vfPerfectRef guards against.
      var _wcThermalAwarded = useRef(false);
      // Tab 3: Routes refs
      var _rtCanvasRef = useRef(null);
      var _rtAnimRef = useRef(null);
      var _rtTimeRef = useRef(0);
      // Tab 4: Aero refs
      var _arCanvasRef = useRef(null);
      var _arAnimRef = useRef(null);
      var _arTimeRef = useRef(0);
      // Tab 5: Navigate refs
      var _nvCanvasRef = useRef(null);
      var _nvAnimRef = useRef(null);
      var _nvTimeRef = useRef(0);
      // Live values ref — updated every render so animation loops read fresh state
      var _liveVals = useRef({});
      _liveVals.current = {
        birdCount: d.vBirdCount || 9, simSpeed: d.vSpeed || 1,
        windDir: d.windDir || 0, windSpeed: d.windSpeed || 15,
        showStreamlines: d.showStreamlines, placingObj: d.placingObj,
        selectedSpecies: d.selectedSpecies, aoa: d.aoa || 5,
        flightSpecies: d.flightSpecies || d.selectedSpecies || 'canada_goose',
        flightCamera: d.flightCamera || 'chase',
        flightFormation: d.flightFormation || 'natural',
        flightWind: d.flightWind == null ? 8 : d.flightWind,
        flightPaused: !!d.flightPaused,
        flightSeason: d.flightSeason || 'fall',
        selectedWing: d.selectedWing || 'goose', isDark: isDark, tab: tab,
        // Read inside deferred canvas callbacks, so they cannot come from the
        // render closure: vLeaderRotations is both DISPLAYED and INCREMENTED
        // there, and thermalRidden gates a one-shot XP award.
        vLeaderRotations: d.vLeaderRotations || 0, thermalRidden: !!d.thermalRidden
      };

      // ══════════════════════════════════════════
      // TAB 1: V-FORMATION SIMULATOR
      // ══════════════════════════════════════════
      function findMigrationSpecies(id) {
        for (var i = 0; i < SPECIES.length; i++) {
          if (SPECIES[i].id === id) return SPECIES[i];
        }
        return SPECIES[0];
      }

      function flightFormationName(species, override) {
        if (override && override !== 'natural') return override;
        if (species.id === 'monarch') return 'swarm';
        if (species.formation === 'V-formation') return 'v';
        if (species.formation === 'Solo') return 'solo';
        return 'loose';
      }

      function disposeMigrationObject(root) {
        if (!root || !root.traverse) return;
        root.traverse(function(obj) {
          if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
          if (obj.material) {
            var mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach(function(mat) {
              if (mat.map && mat.map.dispose) mat.map.dispose();
              if (mat.dispose) mat.dispose();
            });
          }
        });
      }

      function destroyMigrationFlightEngine() {
        var engine = _f3dEngineRef.current;
        _f3dBootRef.current += 1;
        if (!engine) {
          _f3dHostRef.current = null;
          return;
        }
        engine.disposed = true;
        if (engine.raf) cancelAnimationFrame(engine.raf);
        if (engine.resizeObserver) engine.resizeObserver.disconnect();
        if (engine.resizeHandler) window.removeEventListener('resize', engine.resizeHandler);
        if (engine.scene) disposeMigrationObject(engine.scene);
        if (engine.renderer) {
          try { engine.renderer.dispose(); } catch (ignore) {}
          try { engine.renderer.forceContextLoss(); } catch (ignore2) {}
          if (engine.renderer.domElement && engine.renderer.domElement.parentNode) {
            engine.renderer.domElement.parentNode.removeChild(engine.renderer.domElement);
          }
        }
        if (engine.host) {
          engine.host.removeAttribute('data-flight-ready');
          engine.host.removeAttribute('data-flight-error');
        }
        _f3dEngineRef.current = null;
        _f3dHostRef.current = null;
      }

      // A wing planform: root chord, wrist, then a tapered tip, with a little
      // upward camber so vertex normals give the surface some form. The previous
      // version was a single flat triangle with a spur pointing forward, which
      // read as a paper dart rather than a wing at every camera angle.
      // `reach` scales span, `sweep` scales chord — same meaning as before, so
      // the monarch's inner/outer wing calls still work.
      function createMigrationWingGeometry(THREE, side, reach, sweep) {
        var s = side;
        var k = sweep;
        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
          0.04 * s, 0.000, -0.46 * k,          // 0 root, leading edge
          0.04 * s, 0.000, 0.44 * k,           // 1 root, trailing edge
          0.50 * reach * s, 0.055, -0.40 * k,  // 2 wrist, leading
          0.48 * reach * s, 0.045, 0.33 * k,   // 3 wrist, trailing
          0.78 * reach * s, 0.085, -0.24 * k,  // 4 outer, leading
          1.00 * reach * s, 0.115, 0.05 * k,   // 5 tip
          0.90 * reach * s, 0.100, 0.27 * k    // 6 tip, trailing
        ]), 3));
        geometry.setIndex([0, 2, 1, 2, 3, 1, 2, 4, 3, 4, 6, 3, 4, 5, 6]);
        geometry.computeVertexNormals();
        return geometry;
      }

      function createMigrationFlyer(THREE, species, index) {
        var flyer = new THREE.Group();
        var isMonarch = species.id === 'monarch';
        // One flat colour per species turned every bird into a grey capsule with
        // grey wings. Each entry now carries the markings that identify the
        // species in the air: back, belly, head/neck and wingtip.
        var palette = {
          canada_goose:     { body: 0x6b7583, belly: 0xd6cfc2, head: 0x111a24, cheek: 0xf8fafc, wing: 0x5a6472, tip: 0x2b323c, bill: 0x1f2937 },
          snow_goose:       { body: 0xf3f6fa, belly: 0xffffff, head: 0xf3f6fa, cheek: null,     wing: 0xe8edf3, tip: 0x1f2937, bill: 0xf472b6 },
          arctic_tern:      { body: 0xeef2f7, belly: 0xffffff, head: 0x111827, cheek: null,     wing: 0xd7dee7, tip: 0x475569, bill: 0xdc2626 },
          ruby_hummingbird: { body: 0x15803d, belly: 0xe7e5e4, head: 0x14532d, cheek: 0xb91c1c, wing: 0x166534, tip: 0x14532d, bill: 0x1f2937 },
          peregrine:        { body: 0x3f4a5a, belly: 0xe4e0d6, head: 0x1e293b, cheek: null,     wing: 0x36404e, tip: 0x1e293b, bill: 0xfbbf24 },
          sandhill_crane:   { body: 0x9aa0a6, belly: 0xb9b2a4, head: 0x9aa0a6, cheek: 0xb91c1c, wing: 0x8d939a, tip: 0x4b5563, bill: 0x44403c },
          bartailed_godwit: { body: 0xa9793f, belly: 0xe8dcc6, head: 0x8b5e2f, cheek: null,     wing: 0x96682f, tip: 0x57432a, bill: 0x1f2937 }
        };
        var sp3d = palette[species.id] || palette.canada_goose;
        var bodyColor = isMonarch ? 0x111827 : sp3d.body;
        var bodyMat = new THREE.MeshStandardMaterial({
          color: bodyColor,
          roughness: 0.68,
          metalness: 0.04
        });
        var body = new THREE.Mesh(
          isMonarch ? new THREE.CylinderGeometry(0.08, 0.12, 0.72, 10) : new THREE.CylinderGeometry(0.18, 0.29, 1.25, 12),
          bodyMat
        );
        body.rotation.x = Math.PI / 2;
        body.castShadow = true;
        flyer.add(body);

        if (!isMonarch) {
          // Pale underside: countershading is what makes a bird read as a solid
          // form against the sky instead of a flat capsule.
          var belly = new THREE.Mesh(
            new THREE.SphereGeometry(0.27, 12, 8),
            new THREE.MeshStandardMaterial({ color: sp3d.belly, roughness: 0.78 })
          );
          belly.scale.set(0.92, 0.62, 2.05);
          belly.position.y = -0.10;
          flyer.add(belly);

          // Neck, so a goose or crane is not just a head stuck to a tube
          var neckLen = species.id === 'sandhill_crane' ? 0.78 : (species.id === 'canada_goose' || species.id === 'snow_goose' ? 0.52 : 0.22);
          var neck = new THREE.Mesh(
            new THREE.CylinderGeometry(0.10, 0.15, neckLen + 0.3, 8),
            new THREE.MeshStandardMaterial({ color: sp3d.head, roughness: 0.7 })
          );
          neck.rotation.x = Math.PI / 2;
          neck.position.z = -0.62 - neckLen * 0.5;
          flyer.add(neck);
        }

        var head = new THREE.Mesh(
          new THREE.SphereGeometry(isMonarch ? 0.13 : 0.2, 12, 8),
          isMonarch ? bodyMat : new THREE.MeshStandardMaterial({ color: sp3d.head, roughness: 0.66 })
        );
        var headZ = isMonarch ? -0.39 : -0.72 - (species.id === 'sandhill_crane' ? 0.78 : (species.id === 'canada_goose' || species.id === 'snow_goose' ? 0.52 : 0.22));
        head.position.z = headZ;
        head.castShadow = true;
        flyer.add(head);

        if (!isMonarch) {
          if (sp3d.cheek) {
            // The Canada Goose's white chinstrap and the crane's red crown —
            // the field marks a student would actually use to name the bird.
            var cheekMat = new THREE.MeshStandardMaterial({ color: sp3d.cheek, roughness: 0.7 });
            for (var ck = -1; ck <= 1; ck += 2) {
              var cheek = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), cheekMat);
              cheek.scale.set(0.45, 1, 0.85);
              cheek.position.set(ck * 0.16, species.id === 'sandhill_crane' ? 0.13 : -0.02, headZ + 0.03);
              flyer.add(cheek);
            }
          }
          var beak = new THREE.Mesh(
            new THREE.ConeGeometry(0.085, species.id === 'bartailed_godwit' ? 0.62 : 0.32, 10),
            new THREE.MeshStandardMaterial({ color: sp3d.bill, roughness: 0.55 })
          );
          beak.rotation.x = -Math.PI / 2;
          beak.position.z = headZ - (species.id === 'bartailed_godwit' ? 0.34 : 0.2);
          flyer.add(beak);

          // Fanned tail
          var tail3d = new THREE.Mesh(
            new THREE.ConeGeometry(0.34, 0.62, 5),
            new THREE.MeshStandardMaterial({ color: sp3d.tip, roughness: 0.75, flatShading: true })
          );
          tail3d.rotation.x = Math.PI / 2;
          tail3d.scale.set(1, 1, 0.34);
          tail3d.position.z = 0.78;
          flyer.add(tail3d);
        }

        var leftPivot = new THREE.Group();
        var rightPivot = new THREE.Group();
        var reach = isMonarch ? 0.82 : 1.38;
        var sweep = isMonarch ? 0.62 : 0.86;
        var outerMat = new THREE.MeshStandardMaterial({
          color: isMonarch ? 0x111827 : sp3d.wing,
          roughness: 0.72,
          side: THREE.DoubleSide
        });
        var leftOuter = new THREE.Mesh(createMigrationWingGeometry(THREE, -1, reach, sweep), outerMat);
        var rightOuter = new THREE.Mesh(createMigrationWingGeometry(THREE, 1, reach, sweep), outerMat);
        leftOuter.castShadow = true;
        rightOuter.castShadow = true;
        leftPivot.add(leftOuter);
        rightPivot.add(rightOuter);

        if (isMonarch) {
          var orangeMat = new THREE.MeshStandardMaterial({
            color: 0xf97316,
            emissive: 0x431407,
            emissiveIntensity: 0.18,
            roughness: 0.64,
            side: THREE.DoubleSide
          });
          var leftInner = new THREE.Mesh(createMigrationWingGeometry(THREE, -1, reach * 0.78, sweep * 0.76), orangeMat);
          var rightInner = new THREE.Mesh(createMigrationWingGeometry(THREE, 1, reach * 0.78, sweep * 0.76), orangeMat);
          leftInner.position.y = 0.012;
          rightInner.position.y = 0.012;
          leftPivot.add(leftInner);
          rightPivot.add(rightInner);
        }

        flyer.add(leftPivot);
        flyer.add(rightPivot);
        flyer.userData.wings = [leftPivot, rightPivot];
        flyer.userData.phase = index * 0.71;
        flyer.userData.flapRate = isMonarch ? 8.5 : (species.id === 'ruby_hummingbird' ? 12 : 3.2);
        flyer.userData.flapAmount = isMonarch ? 0.92 : 0.48;
        flyer.scale.setScalar(isMonarch ? 0.68 : (species.id === 'ruby_hummingbird' ? 0.62 : 0.82));
        return flyer;
      }

      function migrationFormationPositions(species, mode) {
        var positions = [];
        var i;
        var natural = flightFormationName(species, mode);
        if (natural === 'solo') return [[0, 0, -4]];
        if (natural === 'v') {
          positions.push([0, 0.5, -5]);
          for (i = 1; i < 11; i++) {
            var row = Math.ceil(i / 2);
            var side = i % 2 ? -1 : 1;
            positions.push([side * row * 1.65, -row * 0.08, -5 + row * 1.9]);
          }
          return positions;
        }
        if (natural === 'swarm') {
          for (i = 0; i < 18; i++) {
            positions.push([
              Math.sin(i * 2.17) * (2.2 + (i % 4) * 0.7),
              Math.cos(i * 1.31) * 1.4,
              -4 + (i % 6) * 1.5
            ]);
          }
          return positions;
        }
        for (i = 0; i < 9; i++) {
          positions.push([
            Math.sin(i * 1.8) * 3.4,
            Math.cos(i * 1.27) * 0.8,
            -5 + i * 1.15
          ]);
        }
        return positions;
      }
      function initMigrationFlightScene(host, THREE, token) {
        if (!host || !THREE || token !== _f3dBootRef.current || !host.isConnected) return;
        var statusNode = host.querySelector('.migration-flight-stage-status');
        try {
          var renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
          });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = THREE.PCFSoftShadowMap;
          if (renderer.outputEncoding != null && THREE.sRGBEncoding != null) renderer.outputEncoding = THREE.sRGBEncoding;
          renderer.domElement.setAttribute('aria-hidden', 'true');
          renderer.domElement.setAttribute('role', 'presentation');
          host.insertBefore(renderer.domElement, host.firstChild);

          var scene = new THREE.Scene();
          // Horizon haze colour, shared by the sky dome's lowest stop, the fog
          // and the clear colour, so distance fades into one continuous sky
          // instead of hitting a flat teal wall.
          var HAZE = 0xbcd9e6;
          scene.background = new THREE.Color(HAZE);
          scene.fog = new THREE.FogExp2(HAZE, 0.0042);
          var camera = new THREE.PerspectiveCamera(54, 1, 0.1, 900);
          camera.position.set(0, 5, 18);

          var engine = {
            host: host,
            THREE: THREE,
            renderer: renderer,
            scene: scene,
            camera: camera,
            raf: 0,
            disposed: false,
            time: 0,
            lastFrame: 0,
            movers: [],
            flyers: [],
            speciesId: '',
            formationMode: '',
            season: ''
          };
          _f3dEngineRef.current = engine;
          _f3dHostRef.current = host;

          // ── Sky dome ──
          // A flat background colour gave the corridor no horizon and nothing to
          // read altitude against. A vertical gradient dome supplies both, and
          // is excluded from fog so it stays a sky rather than a fog wall.
          // 2048 wide rather than 4: a 4px strip can only hold a vertical
          // gradient, and the night sky needs stars, which have to be painted
          // into the texture as points rather than bands.
          //
          // The width matters. The dome is radius 420, so its circumference is
          // about 2640 world units. At 512px each texel is ~5 units across,
          // which at that distance subtends most of a degree: the first pass
          // drew stars as fat blurry SQUARES. At 2048 a texel is ~1.3 units and
          // a one-pixel star reads as a point.
          var skyCanvas = document.createElement('canvas');
          skyCanvas.width = 2048;
          skyCanvas.height = 1024;
          var skyCtx = skyCanvas.getContext('2d');
          // Day and night palettes for everything the sky drives, kept
          // together so a change to one cannot be forgotten in the others.
          var SKY_THEME = {
            day: {
              stops: [[0, '#0c3f6b'], [0.40, '#1f74a6'], [0.72, '#79bcd8'], [1, '#bcd9e6']],
              haze: 0xbcd9e6, fogD: 0.0042, stars: 0,
              hemiSky: 0xcfe6f5, hemiGround: 0x2f4a2c, hemiI: 0.72,
              sunColor: 0xfff2d0, sunI: 1.05, rimColor: 0x9fd0ec, rimI: 0.42,
              discColor: 0xfff9e0, glowColor: 0xfff2c4, glowOpacity: 0.18, discScale: 1
            },
            night: {
              stops: [[0, '#050b1d'], [0.42, '#0b1533'], [0.74, '#16244c'], [1, '#2b3a63']],
              haze: 0x2b3a63, fogD: 0.0050, stars: 900,
              // Moonlight is dim and blue, and it comes from a single direction,
              // so the hemisphere fill drops well below the daytime value.
              hemiSky: 0x415a86, hemiGround: 0x10161f, hemiI: 0.26,
              sunColor: 0xcddcff, sunI: 0.42, rimColor: 0x6f8ec6, rimI: 0.20,
              discColor: 0xeef3ff, glowColor: 0xbcd0ff, glowOpacity: 0.12, discScale: 0.72
            }
          };
          function paintSky(mode) {
            var cfg = SKY_THEME[mode];
            var SH = skyCanvas.height;
            var g = skyCtx.createLinearGradient(0, 0, 0, SH);
            for (var si = 0; si < cfg.stops.length; si++) g.addColorStop(cfg.stops[si][0], cfg.stops[si][1]);
            skyCtx.fillStyle = g;
            skyCtx.fillRect(0, 0, skyCanvas.width, SH);
            if (cfg.stars) {
              // Deterministic scatter: a seeded LCG, so the same sky is painted
              // every time and a theme toggle does not reshuffle the stars.
              var seed = 20260816;
              var rnd = function() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
              for (var st = 0; st < cfg.stars; st++) {
                var sx = rnd() * skyCanvas.width;
                // Concentrated in the upper sky; none below the horizon haze.
                var sy = Math.pow(rnd(), 1.7) * SH * 0.66;
                var mag = rnd();
                var r = mag > 0.94 ? 1.7 : mag > 0.72 ? 1.2 : 0.85;
                skyCtx.globalAlpha = 0.30 + mag * 0.65 * (1 - sy / (SH * 0.86));
                skyCtx.fillStyle = mag > 0.9 ? '#dbeafe' : '#ffffff';
                skyCtx.beginPath();
                skyCtx.arc(sx, sy, r, 0, Math.PI * 2);
                skyCtx.fill();
              }
              skyCtx.globalAlpha = 1;
            }
          }
          paintSky('day');
          var skyTex = new THREE.CanvasTexture(skyCanvas);
          skyTex.minFilter = THREE.LinearFilter;
          skyTex.magFilter = THREE.LinearFilter;
          var skyDome = new THREE.Mesh(
            new THREE.SphereGeometry(420, 24, 18),
            new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
          );
          // disposeMigrationObject walks the scene and disposes mat.map, so the
          // canvas texture is released with the dome on teardown.
          scene.add(skyDome);

          // Lighting was hot enough to blow every surface toward white: a slate
          // goose read as a paper plane and the dark green ground as pale mint.
          var hemi = new THREE.HemisphereLight(0xcfe6f5, 0x2f4a2c, 0.72);
          scene.add(hemi);
          var sun = new THREE.DirectionalLight(0xfff2d0, 1.05);
          sun.position.set(-28, 34, 18);
          sun.castShadow = true;
          sun.shadow.mapSize.set(1024, 1024);
          sun.shadow.camera.left = -35;
          sun.shadow.camera.right = 35;
          sun.shadow.camera.top = 35;
          sun.shadow.camera.bottom = -35;
          scene.add(sun);
          // Cool bounce from the sky behind the flock, so a bird's far side is
          // separated from the ground rather than sinking into it.
          var rim = new THREE.DirectionalLight(0x9fd0ec, 0.42);
          rim.position.set(22, 12, -40);
          scene.add(rim);

          var sunDisc = new THREE.Mesh(
            new THREE.SphereGeometry(3.2, 24, 16),
            new THREE.MeshBasicMaterial({ color: 0xfff9e0, fog: false })
          );
          sunDisc.position.set(-38, 34, -115);
          scene.add(sunDisc);
          var sunGlow = new THREE.Mesh(
            new THREE.SphereGeometry(9.5, 20, 14),
            new THREE.MeshBasicMaterial({ color: 0xfff2c4, transparent: true, opacity: 0.18, fog: false, depthWrite: false })
          );
          sunGlow.position.copy(sunDisc.position);
          scene.add(sunGlow);

          // ── Day / night ──
          // Called on CHANGE from the frame loop rather than read once here:
          // an _xxInit closure freezes the first render's values, which is the
          // bug class this file has already been bitten by three times.
          engine._skyMode = null;
          engine.applyTheme = function(isDarkNow) {
            var mode = isDarkNow ? 'night' : 'day';
            if (engine._skyMode === mode) return;
            engine._skyMode = mode;
            var cfg = SKY_THEME[mode];
            paintSky(mode);
            skyTex.needsUpdate = true;
            scene.background = new THREE.Color(cfg.haze);
            scene.fog = new THREE.FogExp2(cfg.haze, cfg.fogD);
            renderer.setClearColor(cfg.haze, 1);
            hemi.color.setHex(cfg.hemiSky);
            hemi.groundColor.setHex(cfg.hemiGround);
            hemi.intensity = cfg.hemiI;
            sun.color.setHex(cfg.sunColor);
            sun.intensity = cfg.sunI;
            rim.color.setHex(cfg.rimColor);
            rim.intensity = cfg.rimI;
            sunDisc.material.color.setHex(cfg.discColor);
            sunGlow.material.color.setHex(cfg.glowColor);
            sunGlow.material.opacity = cfg.glowOpacity;
            sunDisc.scale.setScalar(cfg.discScale);
            sunGlow.scale.setScalar(cfg.discScale);
          };

          // ── Ground ──
          // One flat quad read as a painted backdrop. Gentle relief plus
          // per-vertex biome colour gives the corridor a floor with depth, while
          // the flight lane itself stays level so the route ribbon and beacons
          // are never buried.
          var groundGeo = new THREE.PlaneGeometry(220, 400, 64, 116);
          var gPos = groundGeo.attributes.position;
          var gColors = new Float32Array(gPos.count * 3);
          var gTint = new THREE.Color();
          for (var gvi = 0; gvi < gPos.count; gvi++) {
            var gx = gPos.getX(gvi);
            var gy = gPos.getY(gvi);
            var flank = clamp((Math.abs(gx) - 7) / 12, 0, 1);
            var hgt3 = (Math.sin(gx * 0.075) * 1.35 + Math.cos(gy * 0.052) * 1.75 + Math.sin((gx + gy) * 0.031) * 1.05) * flank;
            // Carve the river channel the water plane sits in
            var riverD = Math.abs(gx - 31);
            if (riverD < 13) hgt3 = lerp(hgt3, -1.15, Math.pow(1 - riverD / 13, 0.7));
            gPos.setZ(gvi, hgt3);
            // Field patchwork: a cheap hash per cell so the plain reads as
            // farmland and woodlot rather than one flat green.
            var cellSeed = Math.sin(Math.floor(gx / 11) * 12.9898 + Math.floor(gy / 13) * 78.233) * 43758.5453;
            var patch = cellSeed - Math.floor(cellSeed);
            var alt = clamp((hgt3 + 2.2) / 5.2, 0, 1);
            if (riverD < 10) {
              gTint.setHSL(0.53, 0.40, 0.30);
            } else {
              gTint.setHSL(0.28 - alt * 0.06 + patch * 0.055, 0.42 - alt * 0.13 + patch * 0.16, 0.17 + alt * 0.13 + patch * 0.08);
            }
            gColors[gvi * 3] = gTint.r;
            gColors[gvi * 3 + 1] = gTint.g;
            gColors[gvi * 3 + 2] = gTint.b;
          }
          groundGeo.setAttribute('color', new THREE.BufferAttribute(gColors, 3));
          groundGeo.computeVertexNormals();
          var ground = new THREE.Mesh(
            groundGeo,
            new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 })
          );
          ground.rotation.x = -Math.PI / 2;
          ground.position.set(0, -6, -125);
          ground.receiveShadow = true;
          scene.add(ground);

          var routeRibbon = new THREE.Mesh(
            new THREE.PlaneGeometry(4.6, 310),
            new THREE.MeshStandardMaterial({
              color: 0x38bdf8,
              emissive: 0x082f49,
              emissiveIntensity: 0.30,
              transparent: true,
              opacity: 0.34,
              roughness: 0.7
            })
          );
          routeRibbon.rotation.x = -Math.PI / 2;
          routeRibbon.position.set(0, -5.88, -126);
          scene.add(routeRibbon);
          engine.routeRibbon = routeRibbon;

          var river = new THREE.Mesh(
            new THREE.PlaneGeometry(15, 300),
            new THREE.MeshStandardMaterial({
              color: 0x2f86b8,
              roughness: 0.52,
              metalness: 0.02,
              transparent: true,
              opacity: 0.88
            })
          );
          river.rotation.x = -Math.PI / 2;
          river.rotation.z = -0.08;
          river.position.set(31, -6.62, -125);
          scene.add(river);

          // ── Ridges ──
          // Pushed out past the river (they used to stand in it) and capped, so
          // the ridge line reads as the terrain raptors ride rather than as grey
          // cones scattered over the floor.
          var mountainMat = new THREE.MeshStandardMaterial({ color: 0x54606f, roughness: 0.94, flatShading: true });
          var snowMat = new THREE.MeshStandardMaterial({ color: 0xeef4f8, roughness: 0.86, flatShading: true });
          for (var mi = 0; mi < 22; mi++) {
            var height = 8 + (mi % 5) * 3.4;
            var radius = 5.5 + (mi % 3) * 1.9;
            var side = mi % 2 ? -1 : 1;
            var mx = side * (44 + (mi % 4) * 9);
            var mz = -25 - mi * 11;
            var mountain = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 7), mountainMat);
            mountain.position.set(mx, -6 + height / 2, mz);
            mountain.rotation.y = mi * 0.61;
            mountain.castShadow = true;
            mountain.receiveShadow = true;
            scene.add(mountain);
            if (height > 13) {
              var cap = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.34, height * 0.3, 7), snowMat);
              cap.position.set(mx, -6 + height - height * 0.15, mz);
              cap.rotation.y = mi * 0.61;
              scene.add(cap);
            }
          }

          // ── Woodland ──
          // Bare relief gave the eye nothing to measure forward motion against.
          // Two InstancedMeshes (trunk + canopy) cost two draw calls for ~150
          // trees, so this is affordable on the software rasteriser too.
          var TREE_N = 150;
          var trunkMesh = new THREE.InstancedMesh(
            new THREE.CylinderGeometry(0.22, 0.3, 1.5, 5),
            new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 0.95 }),
            TREE_N
          );
          var canopyMesh = new THREE.InstancedMesh(
            new THREE.ConeGeometry(1.5, 4.4, 6),
            new THREE.MeshStandardMaterial({ color: 0x27502f, roughness: 0.94, flatShading: true }),
            TREE_N
          );
          var treeM = new THREE.Matrix4();
          var treeQ = new THREE.Quaternion();
          var treeP = new THREE.Vector3();
          var treeS = new THREE.Vector3();
          var placed = 0;
          for (var ti3 = 0; ti3 < TREE_N * 3 && placed < TREE_N; ti3++) {
            var tSeed = Math.sin(ti3 * 41.7) * 43758.5453;
            tSeed = tSeed - Math.floor(tSeed);
            var tSeed2 = Math.sin(ti3 * 97.3 + 11.1) * 24634.6345;
            tSeed2 = tSeed2 - Math.floor(tSeed2);
            var tx3 = (tSeed - 0.5) * 190;
            var tz3 = -12 - tSeed2 * 300;
            // Keep the flight lane and the river channel clear
            if (Math.abs(tx3) < 11 || Math.abs(tx3 - 31) < 12) continue;
            // Follow the same relief the ground vertices use
            var tFlank = clamp((Math.abs(tx3) - 7) / 12, 0, 1);
            var tGy = -(tz3 + 125);
            var tH = (Math.sin(tx3 * 0.075) * 1.35 + Math.cos(tGy * 0.052) * 1.75 + Math.sin((tx3 + tGy) * 0.031) * 1.05) * tFlank;
            var tScale = 0.7 + tSeed2 * 0.9;
            treeP.set(tx3, -6 + tH + 0.75 * tScale, tz3);
            treeQ.set(0, 0, 0, 1);
            treeS.set(tScale, tScale, tScale);
            treeM.compose(treeP, treeQ, treeS);
            trunkMesh.setMatrixAt(placed, treeM);
            treeP.set(tx3, -6 + tH + 3.1 * tScale, tz3);
            treeM.compose(treeP, treeQ, treeS);
            canopyMesh.setMatrixAt(placed, treeM);
            placed++;
          }
          trunkMesh.count = placed;
          canopyMesh.count = placed;
          trunkMesh.instanceMatrix.needsUpdate = true;
          canopyMesh.instanceMatrix.needsUpdate = true;
          canopyMesh.castShadow = true;
          scene.add(trunkMesh);
          scene.add(canopyMesh);

          // ── Cloud decks ──
          // The old deck sat at y=4..14 with one cloud dead ahead at z=-18, so
          // white spheres filled the middle of the frame and hid the flock.
          // Clouds now belong above the corridor and out to the flanks, and are
          // flattened into cumulus rather than left as spheres.
          var cloudMat = new THREE.MeshStandardMaterial({
            color: 0xf6fbff,
            transparent: true,
            opacity: 0.72,
            roughness: 1,
            depthWrite: false
          });
          for (var ci = 0; ci < 14; ci++) {
            var cloud = new THREE.Group();
            var puffs = 4 + (ci % 3);
            for (var puff = 0; puff < puffs; puff++) {
              var ball = new THREE.Mesh(
                new THREE.SphereGeometry(1.5 + (puff % 3) * 0.6, 10, 8),
                cloudMat
              );
              ball.position.set((puff - (puffs - 1) / 2) * 1.85, Math.sin(puff * 1.7) * 0.5, Math.cos(puff * 1.3) * 0.85);
              cloud.add(ball);
            }
            cloud.scale.set(1.5 + (ci % 3) * 0.45, 0.6, 1.15);
            var cSide = ci % 2 ? -1 : 1;
            cloud.position.set(
              cSide * (17 + (ci % 5) * 8),
              13 + (ci % 4) * 4.5,
              -46 - ci * 15
            );
            cloud.userData.baseZ = cloud.position.z;
            cloud.userData.drift = 0.32 + (ci % 4) * 0.08;
            scene.add(cloud);
            engine.movers.push(cloud);
          }

          // High cirrus: a slow second layer, the strongest parallax cue in the
          // frame and the one thing that made altitude legible.
          var cirrusMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.20, depthWrite: false, side: THREE.DoubleSide
          });
          for (var xi = 0; xi < 7; xi++) {
            var cirrus = new THREE.Mesh(new THREE.PlaneGeometry(46 + (xi % 3) * 22, 13), cirrusMat);
            cirrus.rotation.x = -Math.PI / 2;
            cirrus.position.set((xi % 2 ? -1 : 1) * (10 + (xi % 4) * 13), 34 + (xi % 3) * 5, -60 - xi * 34);
            cirrus.userData.baseZ = cirrus.position.z;
            cirrus.userData.drift = 0.12 + (xi % 3) * 0.03;
            scene.add(cirrus);
            engine.movers.push(cirrus);
          }

          var beaconMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.84 });
          for (var bi = 0; bi < 10; bi++) {
            var beacon = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.12, 8, 32), beaconMat);
            beacon.rotation.x = Math.PI / 2;
            beacon.position.set(0, -5.35, -20 - bi * 18);
            beacon.userData.baseZ = beacon.position.z;
            beacon.userData.drift = 1;
            scene.add(beacon);
            engine.movers.push(beacon);
          }

          var streakData = [];
          for (var si = 0; si < 44; si++) {
            var sx = Math.sin(si * 12.47) * 22;
            var sy = -2 + (si % 8) * 1.8;
            var sz = -8 - (si % 22) * 7;
            streakData.push(sx, sy, sz, sx, sy, sz - 2.4);
          }
          var streakGeometry = new THREE.BufferGeometry();
          streakGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(streakData), 3));
          var streaks = new THREE.LineSegments(
            streakGeometry,
            new THREE.LineBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.34 })
          );
          scene.add(streaks);
          engine.streaks = streaks;

          var flockRoot = new THREE.Group();
          flockRoot.position.y = 1.2;
          scene.add(flockRoot);
          engine.flockRoot = flockRoot;

          engine.rebuildFlock = function(speciesId, formationMode, season) {
            while (flockRoot.children.length) {
              var old = flockRoot.children.pop();
              disposeMigrationObject(old);
            }
            engine.flyers = [];
            var species = findMigrationSpecies(speciesId);
            var positions = migrationFormationPositions(species, formationMode);
            for (var fi = 0; fi < positions.length; fi++) {
              var flyer = createMigrationFlyer(THREE, species, fi);
              flyer.position.set(positions[fi][0], positions[fi][1], positions[fi][2]);
              flyer.rotation.y = 0;
              flockRoot.add(flyer);
              engine.flyers.push(flyer);
            }
            engine.speciesId = species.id;
            engine.formationMode = formationMode;
            engine.season = season;
            routeRibbon.material.color.setHex(season === 'spring' ? 0x4ade80 : 0x38bdf8);
          };

          engine.resizeHandler = function() {
            if (engine.disposed || !host.isConnected) return;
            var width = Math.max(320, host.clientWidth || 720);
            var height = Math.max(320, host.clientHeight || 560);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height, false);
          };
          if (typeof ResizeObserver !== 'undefined') {
            engine.resizeObserver = new ResizeObserver(engine.resizeHandler);
            engine.resizeObserver.observe(host);
          } else {
            window.addEventListener('resize', engine.resizeHandler);
          }
          engine.resizeHandler();

          renderer.domElement.addEventListener('webglcontextlost', function(event) {
            event.preventDefault();
            host.setAttribute('data-flight-error', 'true');
            if (statusNode) statusNode.textContent = 'The 3D context paused. Switch tabs and return to restart the flight view.';
          });

          host.setAttribute('data-flight-ready', 'true');
          host.removeAttribute('data-flight-error');
        } catch (error) {
          host.setAttribute('data-flight-error', 'true');
          if (statusNode) statusNode.textContent = '3D flight is unavailable on this device. The V-Formation and Routes tabs remain fully usable.';
          return;
        }

        var engineNow = _f3dEngineRef.current;
        if (!engineNow || engineNow.host !== host) return;
        engineNow.animate = function(timestamp) {
          if (engineNow.disposed || token !== _f3dBootRef.current || !host.isConnected) return;
          var delta = engineNow.lastFrame ? Math.min(0.05, (timestamp - engineNow.lastFrame) / 1000) : 0.016;
          engineNow.lastFrame = timestamp;
          var live = _liveVals.current;
          var species = findMigrationSpecies(live.flightSpecies);
          if (engineNow.speciesId !== species.id || engineNow.formationMode !== live.flightFormation || engineNow.season !== live.flightSeason) {
            engineNow.rebuildFlock(species.id, live.flightFormation, live.flightSeason);
          }
          // Day/night follows the app theme. Read from _liveVals every frame,
          // not captured at build time; applyTheme is a no-op unless the mode
          // actually changed, so this costs one string compare per frame.
          if (engineNow.applyTheme) engineNow.applyTheme(!!live.isDark);

          var moving = !live.flightPaused && !reducedMotionRef.current;
          var visualSpeed = Math.max(4, species.speed + live.flightWind * 2.237) * 0.075;
          if (moving) {
            engineNow.time += delta;
            for (var mv = 0; mv < engineNow.movers.length; mv++) {
              var mover = engineNow.movers[mv];
              mover.position.z += visualSpeed * delta * 5.2 * mover.userData.drift;
              if (mover.position.z > 24) mover.position.z -= 176;
            }
            var streakPositions = engineNow.streaks.geometry.attributes.position.array;
            for (var pi = 0; pi < streakPositions.length; pi += 6) {
              var nextZ = streakPositions[pi + 2] + visualSpeed * delta * 8.4;
              if (nextZ > 18) nextZ -= 160;
              streakPositions[pi + 2] = nextZ;
              streakPositions[pi + 5] = nextZ - 2.4;
            }
            engineNow.streaks.geometry.attributes.position.needsUpdate = true;
          }

          for (var fl = 0; fl < engineNow.flyers.length; fl++) {
            var activeFlyer = engineNow.flyers[fl];
            var phase = engineNow.time * activeFlyer.userData.flapRate + activeFlyer.userData.phase;
            var flap = Math.sin(phase) * activeFlyer.userData.flapAmount;
            activeFlyer.userData.wings[0].rotation.z = flap;
            activeFlyer.userData.wings[1].rotation.z = -flap;
            activeFlyer.position.y += (Math.sin(phase * 0.43) * 0.004);
            activeFlyer.rotation.z = Math.sin(engineNow.time * 0.55 + fl) * 0.025;
          }
          engineNow.flockRoot.position.x = moving ? Math.sin(engineNow.time * 0.24) * 0.7 : 0;
          engineNow.flockRoot.rotation.y = Math.sin(engineNow.time * 0.18) * 0.045;

          var cameraTargets = {
            chase: [0, 5.5, 18],
            // High oblique, not straight down: at y=27/z=12 the horizon left the
            // frame entirely and the aerial view lost all sense of the corridor.
            aerial: [0, 21, 25],
            side: [24, 5.5, 5]
          };
          var target = cameraTargets[live.flightCamera] || cameraTargets.chase;
          var desired = new THREE.Vector3(target[0], target[1], target[2]);
          engineNow.camera.position.lerp(desired, reducedMotionRef.current ? 1 : 0.075);
          engineNow.camera.lookAt(0, 0, -5);
          engineNow.renderer.render(engineNow.scene, engineNow.camera);
          engineNow.raf = requestAnimationFrame(engineNow.animate);
        };

        var initial = _liveVals.current;
        engineNow.rebuildFlock(initial.flightSpecies, initial.flightFormation, initial.flightSeason);
        engineNow.raf = requestAnimationFrame(engineNow.animate);
      }
      var setMigrationFlightHost = useCallback(function(host) {
        if (!host) {
          destroyMigrationFlightEngine();
          return;
        }
        if (_f3dHostRef.current === host && _f3dEngineRef.current) return;
        destroyMigrationFlightEngine();
        _f3dHostRef.current = host;
        var token = ++_f3dBootRef.current;
        var statusNode = host.querySelector('.migration-flight-stage-status');
        if (statusNode) statusNode.textContent = 'Preparing the 3D migration corridor...';

        function start(THREE) {
          if (token !== _f3dBootRef.current || !host.isConnected) return;
          initMigrationFlightScene(host, THREE || window.THREE, token);
        }

        if (window.THREE) {
          start(window.THREE);
          return;
        }
        if (window.StemLab && typeof window.StemLab.ensureThree === 'function') {
          window.StemLab.ensureThree({
            orbit: false,
            failMessage: 'The 3D migration view could not load. The 2D formation and route investigations remain available.'
          }).then(start).catch(function() {
            if (token !== _f3dBootRef.current || !host.isConnected) return;
            host.setAttribute('data-flight-error', 'true');
            if (statusNode) statusNode.textContent = '3D flight could not load. Use the V-Formation or Migration Routes tab for the complete 2D investigations.';
          });
          return;
        }
        host.setAttribute('data-flight-error', 'true');
        if (statusNode) statusNode.textContent = 'The shared 3D engine is unavailable. Use the V-Formation or Migration Routes tab.';
      }, []);

      useEffect(function() {
        return function() { destroyMigrationFlightEngine(); };
      }, []);

      function renderFlight3D() {
        var speciesId = d.flightSpecies || d.selectedSpecies || 'canada_goose';
        var species = findMigrationSpecies(speciesId);
        var formationMode = d.flightFormation || 'natural';
        var resolvedFormation = flightFormationName(species, formationMode);
        var flightWind = d.flightWind == null ? 8 : d.flightWind;
        var cameraMode = d.flightCamera || 'chase';
        var season = d.flightSeason || 'fall';
        var groundSpeed = Math.max(1, Math.round(species.speed + flightWind * 2.237));
        var benefit = resolvedFormation === 'v' ? 22 : (resolvedFormation === 'loose' ? 7 : (resolvedFormation === 'swarm' && species.id !== 'monarch' ? 5 : 0));
        var direction = season === 'fall'
          ? species.breedingRange + ' to ' + species.winterRange
          : species.winterRange + ' to ' + species.breedingRange;
        var formationLabel = resolvedFormation === 'v' ? 'V formation' : (resolvedFormation === 'swarm' ? 'Swarm' : (resolvedFormation === 'solo' ? 'Solo' : 'Loose flock'));
        var stageLabel = 'Interactive 3D migration flight for ' + species.name + '. ' + formationLabel + ', ' + groundSpeed + ' miles per hour ground speed, traveling ' + direction + '. Press 1 for chase camera, 2 for aerial camera, 3 for side camera, or Space to pause.';

        function chooseCamera(next) {
          upd('flightCamera', next);
          if (announceToSR) announceToSR(next + ' camera selected');
        }

        function toggleFlightPause() {
          upd('flightPaused', !d.flightPaused);
          if (announceToSR) announceToSR(d.flightPaused ? '3D migration resumed' : '3D migration paused');
        }

        return h('div', {
          id: 'migration-flight-deck',
          className: 'migration-flight-deck',
          'data-migration-3d-flight': 'true',
          'data-monarch-simulation': species.id === 'monarch' ? 'active' : 'available'
        },
          h('div', {
            className: 'migration-flight-stage',
            ref: setMigrationFlightHost,
            role: 'img',
            tabIndex: 0,
            'aria-label': stageLabel,
            onKeyDown: function(event) {
              if (event.key === '1') { event.preventDefault(); chooseCamera('chase'); }
              else if (event.key === '2') { event.preventDefault(); chooseCamera('aerial'); }
              else if (event.key === '3') { event.preventDefault(); chooseCamera('side'); }
              else if (event.key === ' ') { event.preventDefault(); toggleFlightPause(); }
            }
          },
            h('div', { className: 'migration-flight-stage-status', role: 'status', 'aria-live': 'polite' }, 'Preparing the 3D migration corridor...'),
            h('div', { className: 'migration-flight-overlay', 'aria-hidden': 'true' },
              h('div', { className: 'migration-flight-badge' },
                h('span', null, species.emoji),
                h('span', null, species.name + ' - ' + formationLabel)
              ),
              h('div', { className: 'migration-flight-heading' }, (season === 'fall' ? 'Fall southbound' : 'Spring northbound') + ' - ' + groundSpeed + ' mph over ground')
            )
          ),
          h('aside', { className: 'migration-flight-controls', 'aria-label': '3D migration flight controls' },
            h('div', null,
              h('h3', null, 'Migration Flight Deck'),
              h('p', null, 'Fly a scientifically grounded corridor in three dimensions. Clouds, terrain, route beacons, wind streaks, flock spacing, and wing motion provide depth cues.')
            ),
            h('label', { className: 'migration-flight-control' },
              h('span', null, 'Focus species'),
              h('select', {
                value: species.id,
                'aria-label': '3D migration focus species',
                onChange: function(event) {
                  var nextId = event.target.value;
                  updMulti({ flightSpecies: nextId, selectedSpecies: nextId });
                  if (announceToSR) announceToSR(findMigrationSpecies(nextId).name + ' selected for the 3D flight');
                }
              },
                SPECIES.map(function(item) {
                  return h('option', { key: item.id, value: item.id }, item.name);
                })
              )
            ),
            h('label', { className: 'migration-flight-control' },
              h('span', null, 'Flight pattern'),
              h('select', {
                value: formationMode,
                'aria-label': '3D migration flight pattern',
                onChange: function(event) { upd('flightFormation', event.target.value); }
              },
                h('option', { value: 'natural' }, 'Natural for this species (' + species.formation + ')'),
                h('option', { value: 'v' }, 'V formation'),
                h('option', { value: 'loose' }, 'Loose flock'),
                h('option', { value: 'swarm' }, 'Swarm'),
                h('option', { value: 'solo' }, 'Solo')
              )
            ),
            h('label', { className: 'migration-flight-control' },
              h('span', { className: 'migration-flight-value' },
                h('span', null, 'Along-route wind'),
                h('strong', null, (flightWind >= 0 ? '+' : '') + flightWind + ' m/s')
              ),
              h('input', {
                type: 'range',
                min: -15,
                max: 25,
                step: 1,
                value: flightWind,
                'aria-label': 'Along-route wind in meters per second. Negative is headwind and positive is tailwind.',
                onChange: function(event) { upd('flightWind', parseInt(event.target.value, 10)); }
              })
            ),
            h('label', { className: 'migration-flight-control' },
              h('span', null, 'Season and direction'),
              h('select', {
                value: season,
                'aria-label': 'Migration season and direction',
                onChange: function(event) { upd('flightSeason', event.target.value); }
              },
                h('option', { value: 'fall' }, 'Fall - toward winter range'),
                h('option', { value: 'spring' }, 'Spring - toward breeding range')
              )
            ),
            h('div', { className: 'migration-flight-control' },
              h('span', null, 'Camera'),
              h('div', { className: 'migration-flight-camera' },
                [
                  { id: 'chase', label: 'Chase' },
                  { id: 'aerial', label: 'Aerial' },
                  { id: 'side', label: 'Side' }
                ].map(function(view) {
                  return h('button', {
                    key: view.id,
                    type: 'button',
                    'aria-pressed': cameraMode === view.id ? 'true' : 'false',
                    onClick: function() { chooseCamera(view.id); }
                  }, view.label);
                })
              )
            ),
            h('div', { className: 'migration-flight-stat-grid', 'aria-label': 'Current flight metrics' },
              [
                { label: 'Ground speed', value: groundSpeed + ' mph' },
                { label: 'Pattern benefit', value: benefit ? '~' + benefit + '% less drag' : 'No drafting credit' },
                { label: 'Typical altitude', value: fmtNum(species.altitude) + ' ft' },
                { label: 'Route distance', value: fmtNum(species.distance) + ' mi' }
              ].map(function(metric) {
                return h('div', { className: 'migration-flight-stat', key: metric.label },
                  h('span', null, metric.label),
                  h('strong', null, metric.value)
                );
              })
            ),
            species.id === 'monarch' && h('div', { className: 'migration-monarch-note', role: 'note' },
              h('strong', null, 'Monarch relay migration: '),
              'The fall super generation reaches central Mexico in one journey. Spring return unfolds across multiple generations, so the simulation uses a swarm rather than bird-style drafting.'
            ),
            h('div', { className: 'migration-flight-actions' },
              h('button', { type: 'button', onClick: toggleFlightPause, 'aria-pressed': d.flightPaused ? 'true' : 'false' }, d.flightPaused ? 'Resume flight' : 'Pause flight'),
              h('button', {
                type: 'button',
                onClick: function() {
                  var deck = document.getElementById('migration-flight-deck');
                  if (!deck) return;
                  if (typeof window.__alloStemFS === 'function') {
                    window.__alloStemFS(deck);
                    return;
                  }
                  var active = document.fullscreenElement || document.webkitFullscreenElement;
                  if (active) {
                    var exit = document.exitFullscreen || document.webkitExitFullscreen;
                    if (exit) exit.call(document);
                  } else {
                    var enter = deck.requestFullscreen || deck.webkitRequestFullscreen;
                    if (enter) enter.call(deck);
                  }
                },
                'aria-label': 'Toggle fullscreen for the 3D migration flight deck'
              }, 'Fullscreen')
            ),
            h('p', { role: 'note' }, direction + '. ' + species.funFact)
          )
        );
      }
      function renderVFormation() {
        var canvasRef = _vfCanvasRef;
        var animRef = _vfAnimRef;
        var birdsRef = _vfBirdsRef;
        var dragRef = _vfDragRef;
        var timeRef = _vfTimeRef;

        var birdCount = d.vBirdCount || 9;
        var simSpeed = d.vSpeed || 1;
        var leaderRotations = d.vLeaderRotations || 0;

        // Sync the perfect-V award ref with persisted state on (re)mount.
        // Without this, a returning user (d.perfectVFormed === true) could re-earn XP.
        if (d.perfectVFormed) _vfPerfectRef.current = true;

        // Initialize birds
        function getVCanvasSize() {
          var cv = canvasRef && canvasRef.current;
          return {
            W: (cv && cv.clientWidth) || 620,
            H: (cv && cv.clientHeight) || 380
          };
        }

        function makeFlock(count) {
          var birds = [];
          var size = getVCanvasSize();
          var cx = size.W * 0.54;
          var cy = size.H * 0.54;
          var spreadX = Math.min(200, Math.max(96, size.W * 0.48));
          var spreadY = Math.min(150, Math.max(88, size.H * 0.38));
          for (var i = 0; i < count; i++) {
            birds.push({
              x: Math.max(28, Math.min(size.W - 28, cx + (Math.random() - 0.5) * spreadX)),
              y: Math.max(34, Math.min(size.H - 34, cy + (Math.random() - 0.5) * spreadY)),
              vx: 0, vy: 0,
              energy: 80 + Math.random() * 20,
              flapPhase: Math.random() * Math.PI * 2,
              role: i === 0 ? 'leader' : 'follower'
            });
          }
          return birds;
        }

        function makeVFormation(count) {
          var birds = [];
          var angle = Math.PI / 6; // 30 deg
          var size = getVCanvasSize();
          var maxRank = Math.max(1, Math.ceil((count - 1) / 2));
          var spacing = Math.max(26, Math.min(42, size.W / 9));
          var neededLeft = 42 + maxRank * spacing * Math.cos(angle);
          var cx = Math.min(size.W - 34, Math.max(neededLeft, size.W * 0.62));
          var cy = Math.max(86, Math.min(size.H - 86, size.H * 0.56));
          birds.push({ x: cx, y: cy, vx: 0, vy: 0, energy: 100, flapPhase: 0, role: 'leader' });
          for (var i = 1; i < count; i++) {
            var side = (i % 2 === 0) ? 1 : -1;
            var rank = Math.ceil(i / 2);
            birds.push({
              x: cx - rank * spacing * Math.cos(angle),
              y: cy + side * rank * spacing * Math.sin(angle),
              vx: 0, vy: 0,
              energy: 100,
              flapPhase: rank * 0.4,
              role: 'follower'
            });
          }
          return birds;
        }

        // Check if formation is good
        function calcFormationEfficiency(birds) {
          if (!birds || birds.length < 2) return 0;
          var leaderIdx = -1;
          for (var i = 0; i < birds.length; i++) {
            if (birds[i].role === 'leader') { leaderIdx = i; break; }
          }
          if (leaderIdx < 0) leaderIdx = 0;
          var leader = birds[leaderIdx];
          var inUpwash = 0;
          for (var j = 0; j < birds.length; j++) {
            if (j === leaderIdx) continue;
            // Check if in upwash zone of any bird ahead
            var hasUpwash = false;
            for (var k = 0; k < birds.length; k++) {
              if (k === j) continue;
              var dx = birds[j].x - birds[k].x;
              var dy = birds[j].y - birds[k].y;
              var d2 = Math.sqrt(dx * dx + dy * dy);
              if (d2 < 5 || d2 > 80) continue;
              // Bird j is behind bird k and offset to side
              if (dx < -10) {
                var absAngle = Math.abs(Math.atan2(Math.abs(dy), Math.abs(dx)));
                if (absAngle > 0.3 && absAngle < 0.8) {
                  hasUpwash = true;
                  break;
                }
              }
            }
            if (hasUpwash) inUpwash++;
          }
          return Math.round((inUpwash / (birds.length - 1)) * 100);
        }

        // Canvas init via ref callback (avoids useEffect inside conditional render)
        var _vfInitCanvas = function(canvas) {
          if (!canvas) return;
          canvasRef.current = canvas;
          if (canvas._vfInit) return;
          canvas._vfInit = true;
          var c = canvas.getContext('2d');
          var dpr = window.devicePixelRatio || 1;
          var W = canvas.parentElement ? canvas.parentElement.clientWidth : 620;
          var H = 380;
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          canvas.style.width = W + 'px';
          canvas.style.height = H + 'px';
          c.setTransform(dpr, 0, 0, dpr, 0, 0);

          if (!birdsRef.current || birdsRef.current.length !== birdCount) {
            birdsRef.current = makeFlock(birdCount);
          }
          var birds = birdsRef.current;

          // Vortex particles
          var vortices = [];
          for (var vi = 0; vi < 80; vi++) {
            vortices.push({ x: Math.random() * W, y: Math.random() * H, vx: -1 - Math.random(), vy: (Math.random() - 0.5) * 0.3, life: Math.random() });
          }

          // Wind background particles
          var windParts = [];
          for (var wi = 0; wi < 60; wi++) {
            windParts.push({ x: Math.random() * W, y: Math.random() * H, speed: 0.5 + Math.random() * 1.5, size: 1 + Math.random() });
          }

          function frame() {
            // Always read birds from the ref so Auto-Form V / Scatter take effect immediately
            birds = birdsRef.current || birds;
            if (reducedMotionRef.current) {
              c.clearRect(0, 0, W, H);
              renderFrame(c, W, H, birds, vortices, windParts, 0);
              return;
            }
            // Read fresh values from live ref (updated every React render)
            var lv = _liveVals.current;
            var simSpeed = lv.simSpeed;
            var isDark = lv.isDark;
            // Dynamically update bird count if changed
            if (birdsRef.current && birdsRef.current.length !== lv.birdCount) {
              birdsRef.current = makeFlock(lv.birdCount);
              birds = birdsRef.current;
            }
            timeRef.current += 0.016 * lv.simSpeed;
            c.clearRect(0, 0, W, H);
            renderFrame(c, W, H, birds, vortices, windParts, timeRef.current);
            animRef.current = requestAnimationFrame(frame);
          }

          function renderFrame(c, W, H, birds, vortices, windParts, time) {
            // Sibling of frame() inside the same guarded init: it needs its own
            // alias, because a var declared in frame() does not reach here.
            var lv = _liveVals.current;
            var simSpeed = lv.simSpeed;
            var leaderRotations = lv.vLeaderRotations;
            var isDark = lv.isDark;
            // Sky gradient
            var skyGrad = c.createLinearGradient(0, 0, 0, H);
            if (isDark) {
              skyGrad.addColorStop(0, '#0f172a');
              skyGrad.addColorStop(0.5, '#1e293b');
              skyGrad.addColorStop(1, '#334155');
            } else {
              skyGrad.addColorStop(0, '#bae6fd');
              skyGrad.addColorStop(0.5, '#e0f2fe');
              skyGrad.addColorStop(1, '#f0f9ff');
            }
            c.fillStyle = skyGrad;
            c.fillRect(0, 0, W, H);

            // Clouds
            c.globalAlpha = isDark ? 0.1 : 0.3;
            c.fillStyle = isDark ? '#475569' : '#ffffff';
            var cloudOff = (time * 8) % (W + 200);
            for (var ci = 0; ci < 4; ci++) {
              var cx2 = ((ci * 180 + cloudOff) % (W + 200)) - 80;
              var cy2 = 30 + ci * 50 + Math.sin(ci * 2.1) * 20;
              c.beginPath();
              c.ellipse(cx2, cy2, 60 + ci * 10, 18 + ci * 3, 0, 0, Math.PI * 2);
              c.fill();
              c.beginPath();
              c.ellipse(cx2 + 30, cy2 - 8, 40, 14, 0, 0, Math.PI * 2);
              c.fill();
            }
            c.globalAlpha = 1;

            // Wind particles
            c.fillStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.15)';
            for (var wp = 0; wp < windParts.length; wp++) {
              var p = windParts[wp];
              p.x -= p.speed * simSpeed;
              if (p.x < -5) { p.x = W + 5; p.y = Math.random() * H; }
              c.beginPath();
              c.moveTo(p.x, p.y);
              c.lineTo(p.x + p.size * 6, p.y);
              c.lineWidth = p.size * 0.5;
              c.strokeStyle = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.12)';
              c.stroke();
            }

            // Update bird physics
            var leaderIdx = 0;
            for (var bi = 0; bi < birds.length; bi++) {
              if (birds[bi].role === 'leader') { leaderIdx = bi; break; }
            }

            for (var bi2 = 0; bi2 < birds.length; bi2++) {
              var b = birds[bi2];
              b.flapPhase += (0.06 + simSpeed * 0.03);

              // Energy depletion
              var inUpwash = false;
              if (b.role !== 'leader') {
                for (var k = 0; k < birds.length; k++) {
                  if (k === bi2) continue;
                  var ddx = b.x - birds[k].x;
                  var ddy = b.y - birds[k].y;
                  var dd = Math.sqrt(ddx * ddx + ddy * ddy);
                  if (dd < 5 || dd > 80) continue;
                  if (ddx < -10) {
                    var ang = Math.abs(Math.atan2(Math.abs(ddy), Math.abs(ddx)));
                    if (ang > 0.3 && ang < 0.8) { inUpwash = true; break; }
                  }
                }
              }

              var depletionRate = b.role === 'leader' ? 0.012 : (inUpwash ? 0.004 : 0.012);
              b.energy = Math.max(0, b.energy - depletionRate * simSpeed);

              // Leader rotation when energy low
              if (b.role === 'leader' && b.energy < 30) {
                b.role = 'follower';
                // Find next highest energy follower
                var bestIdx = -1;
                var bestE = -1;
                for (var ni = 0; ni < birds.length; ni++) {
                  if (ni === bi2) continue;
                  if (birds[ni].energy > bestE) { bestE = birds[ni].energy; bestIdx = ni; }
                }
                if (bestIdx >= 0) {
                  birds[bestIdx].role = 'leader';
                  upd('vLeaderRotations', (leaderRotations || 0) + 1);
                }
              }

              // Slow energy recovery
              b.energy = Math.min(100, b.energy + 0.003 * simSpeed);
            }

            // Vortex trail particles behind each bird's wingtips — additive so the wingtip
            // vortices glow (the upwash that following birds draft on)
            c.save();
            c.globalCompositeOperation = 'lighter';
            c.globalAlpha = 0.22;
            for (var vbi = 0; vbi < birds.length; vbi++) {
              var vb = birds[vbi];
              var vortCol = isDark ? 'rgba(125,211,252,0.3)' : 'rgba(56,189,248,0.15)';
              for (var trail = 0; trail < 3; trail++) {
                var tx = vb.x - 15 - trail * 8 + Math.sin(time * 3 + trail + vbi) * 3;
                var ty1 = vb.y - 10 + Math.cos(time * 4 + trail) * 4;
                var ty2 = vb.y + 10 + Math.cos(time * 4 + trail + 1) * 4;
                c.fillStyle = vortCol;
                c.beginPath(); c.arc(tx, ty1, 2, 0, Math.PI * 2); c.fill();
                c.beginPath(); c.arc(tx, ty2, 2, 0, Math.PI * 2); c.fill();
              }
            }
            c.restore();

            // ── Wake structure behind each bird ──
            // Flat 6%-alpha triangles read as smudges. Gradient cones that fade
            // downstream, plus chevrons that point the way the air is actually
            // moving, make the upwash a student can aim for and the downwash one
            // they can see they are stuck in.
            for (var uzi = 0; uzi < birds.length; uzi++) {
              var uzb = birds[uzi];
              // Downwash directly astern: the air the leader pushes DOWN
              var dwGrad = c.createLinearGradient(uzb.x - 5, uzb.y, uzb.x - 66, uzb.y);
              dwGrad.addColorStop(0, 'rgba(239,68,68,0.20)');
              dwGrad.addColorStop(1, 'rgba(239,68,68,0)');
              c.fillStyle = dwGrad;
              c.beginPath();
              c.moveTo(uzb.x - 4, uzb.y - 8);
              c.lineTo(uzb.x - 66, uzb.y - 15);
              c.lineTo(uzb.x - 66, uzb.y + 15);
              c.lineTo(uzb.x - 4, uzb.y + 8);
              c.closePath();
              c.fill();
              // Upwash off each wingtip, at roughly 30 degrees to the side
              for (var side2 = -1; side2 <= 1; side2 += 2) {
                var uwGrad = c.createLinearGradient(uzb.x - 5, uzb.y, uzb.x - 74, uzb.y + side2 * 34);
                uwGrad.addColorStop(0, 'rgba(34,197,94,0.30)');
                uwGrad.addColorStop(1, 'rgba(34,197,94,0)');
                c.fillStyle = uwGrad;
                c.beginPath();
                c.moveTo(uzb.x - 5, uzb.y + side2 * 10);
                c.lineTo(uzb.x - 74, uzb.y + side2 * 40);
                c.lineTo(uzb.x - 74, uzb.y + side2 * 14);
                c.closePath();
                c.fill();
                // Rising chevrons drifting down the upwash sheet
                c.strokeStyle = 'rgba(22,163,74,0.6)';
                c.lineWidth = 1.5;
                c.lineCap = 'round';
                for (var uc = 0; uc < 2; uc++) {
                  var uu = 0.18 + ((time * 0.42 + uc * 0.5 + uzi * 0.13) % 1) * 0.78;
                  var ux = uzb.x - 14 - uu * 54;
                  var uy = uzb.y + side2 * (13 + uu * 26);
                  var ufade = Math.sin(Math.PI * uu);
                  c.globalAlpha = 0.35 + ufade * 0.55;
                  c.beginPath();
                  c.moveTo(ux - 6, uy + 4.5);
                  c.lineTo(ux, uy - 4.5);
                  c.lineTo(ux + 6, uy + 4.5);
                  c.stroke();
                  c.globalAlpha = 1;
                }
                c.lineCap = 'butt';
              }
            }

            // Draw birds
            for (var di = 0; di < birds.length; di++) {
              var db = birds[di];
              var isLead = db.role === 'leader';
              var birdColor = isLead ? (isDark ? '#fbbf24' : '#d97706') : null;
              // Soft shadow disc so a dozen birds do not flatten into the sky
              c.save();
              c.globalAlpha = isDark ? 0.20 : 0.12;
              c.fillStyle = '#0f172a';
              c.beginPath();
              c.ellipse(db.x + 3, db.y + 12, 13, 3.4, 0, 0, Math.PI * 2);
              c.fill();
              c.restore();
              if (isLead) {
                // Halo marks who is paying the full cost of the front position
                var lg2 = c.createRadialGradient(db.x, db.y, 3, db.x, db.y, 26);
                lg2.addColorStop(0, 'rgba(251,191,36,0.32)');
                lg2.addColorStop(1, 'rgba(251,191,36,0)');
                c.fillStyle = lg2;
                c.beginPath();
                c.arc(db.x, db.y, 26, 0, Math.PI * 2);
                c.fill();
              }
              drawBird(c, db.x, db.y, 11, db.flapPhase, 1, birdColor, isDark, 'goose');

              // Energy bar
              var barW = 18, barH = 3;
              var barX = db.x - barW / 2;
              var barY = db.y - 17;
              var ePct = db.energy / 100;
              var eColor = ePct > 0.6 ? '#22c55e' : ePct > 0.3 ? '#eab308' : '#ef4444';
              if (ePct < 0.99 || isLead) {
                migrRoundPath(c, barX - 1, barY - 1, barW + 2, barH + 2, 3);
                c.fillStyle = isDark ? 'rgba(2,6,23,0.55)' : 'rgba(15,23,42,0.28)';
                c.fill();
                if (ePct > 0.02) {
                  migrRoundPath(c, barX, barY, barW * ePct, barH, 2);
                  c.fillStyle = eColor;
                  c.globalAlpha = 0.9;
                  c.fill();
                  c.globalAlpha = 1;
                }
              }

              // Leader star
              if (isLead) {
                c.fillStyle = isDark ? '#fbbf24' : '#b45309';
                c.font = 'bold 11px system-ui';
                c.textAlign = 'center';
                c.textBaseline = 'middle';
                c.fillText('\u2605', db.x, barY - 6);
                c.textBaseline = 'alphabetic';
              }
            }

            // ── Instrument panel ──
            var eff = calcFormationEfficiency(birds);
            var effCol = eff >= 85 ? '#22c55e' : eff >= 55 ? '#eab308' : '#ef4444';
            migrPanel(c, 8, 8, 186, 72, isDark, effCol);
            c.textAlign = 'left';
            c.textBaseline = 'alphabetic';
            c.fillStyle = isDark ? '#94a3b8' : '#475569';
            c.font = 'bold 8px system-ui';
            c.fillText(t('stem.migration.formation_efficiency_label', 'FORMATION EFFICIENCY').toUpperCase(), 18, 23);
            c.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
            c.font = 'bold 20px system-ui';
            c.fillText(eff + '%', 18, 43);
            // Meter, so the number has a scale behind it
            migrRoundPath(c, 18, 50, 160, 6, 3);
            c.fillStyle = isDark ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.35)';
            c.fill();
            if (eff > 1) {
              migrRoundPath(c, 18, 50, 160 * clamp(eff / 100, 0, 1), 6, 3);
              c.fillStyle = effCol;
              c.fill();
            }
            c.font = '9px system-ui';
            c.fillStyle = isDark ? '#94a3b8' : '#475569';
            c.fillText(t('stem.migration.energy_saved_short', 'Energy saved') + ' ' + Math.round(eff * 0.3) + '%  ·  ' +
              t('stem.migration.rotations_short', 'rotations') + ' ' + (leaderRotations || 0), 18, 70);

            // Wake key — the two colours behind the birds mean opposite things,
            // and nothing on screen said which was which.
            migrPanel(c, W - 128, 8, 120, 42, isDark, null);
            c.fillStyle = 'rgba(34,197,94,0.75)';
            c.fillRect(W - 120, 18, 12, 7);
            c.fillStyle = 'rgba(239,68,68,0.6)';
            c.fillRect(W - 120, 32, 12, 7);
            c.font = '9px system-ui';
            c.textAlign = 'left';
            c.fillStyle = isDark ? '#cbd5e1' : '#334155';
            c.fillText(t('stem.migration.upwash_lift', 'upwash · free lift'), W - 104, 25);
            c.fillText(t('stem.migration.downwash_cost', 'downwash · costly'), W - 104, 39);

            // Check for perfect V — synchronous ref prevents per-frame re-award
            // while the async setToolData write propagates (previous bug: ~60 XP/sec).
            if (eff >= 85 && !_vfPerfectRef.current) {
              _vfPerfectRef.current = true;
              upd('perfectVFormed', true);
              if (celebrate) celebrate();
              if (awardXP) awardXP('migration', 20, 'Perfect V-formation');
              if (addToast) addToast('Perfect V-formation achieved! +20 XP', 'success');
              if (announceToSR) announceToSR('Perfect V formation achieved. 20 experience points awarded.');
            }
          }

          // Mouse handlers for dragging birds
          function getMousePos(e) {
            var rect = canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
          }

          function onMouseDown(e) {
            var pos = getMousePos(e);
            var birds2 = birdsRef.current;
            if (!birds2) return;
            for (var i = 0; i < birds2.length; i++) {
              if (dist(pos.x, pos.y, birds2[i].x, birds2[i].y) < 18) {
                dragRef.current = { active: true, idx: i, offX: birds2[i].x - pos.x, offY: birds2[i].y - pos.y };
                break;
              }
            }
          }
          function onMouseMove(e) {
            if (!dragRef.current.active) return;
            var pos = getMousePos(e);
            var birds2 = birdsRef.current;
            if (birds2 && birds2[dragRef.current.idx]) {
              birds2[dragRef.current.idx].x = pos.x + dragRef.current.offX;
              birds2[dragRef.current.idx].y = pos.y + dragRef.current.offY;
            }
          }
          function onMouseUp() {
            dragRef.current.active = false;
          }

          canvas.addEventListener('mousedown', onMouseDown);
          canvas.addEventListener('mousemove', onMouseMove);
          canvas.addEventListener('mouseup', onMouseUp);
          canvas.addEventListener('mouseleave', onMouseUp);

          // Touch support
          function getTouchPos(e) {
            var rect = canvas.getBoundingClientRect();
            var touch = e.touches[0] || e.changedTouches[0];
            return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
          }
          function onTouchStart(e) {
            e.preventDefault();
            var pos = getTouchPos(e);
            var birds2 = birdsRef.current;
            if (!birds2) return;
            for (var i = 0; i < birds2.length; i++) {
              if (dist(pos.x, pos.y, birds2[i].x, birds2[i].y) < 24) {
                dragRef.current = { active: true, idx: i, offX: birds2[i].x - pos.x, offY: birds2[i].y - pos.y };
                break;
              }
            }
          }
          function onTouchMove(e) {
            e.preventDefault();
            if (!dragRef.current.active) return;
            var pos = getTouchPos(e);
            var birds2 = birdsRef.current;
            if (birds2 && birds2[dragRef.current.idx]) {
              birds2[dragRef.current.idx].x = pos.x + dragRef.current.offX;
              birds2[dragRef.current.idx].y = pos.y + dragRef.current.offY;
            }
          }
          function onTouchEnd() { dragRef.current.active = false; }

          canvas.addEventListener('touchstart', onTouchStart, { passive: false });
          canvas.addEventListener('touchmove', onTouchMove, { passive: false });
          canvas.addEventListener('touchend', onTouchEnd);

          frame();

          // Cleanup via MutationObserver (callback refs must not return a function in React 18)
          var obs = new MutationObserver(function() {
            if (!document.contains(canvas)) {
              if (animRef.current) cancelAnimationFrame(animRef.current);
              canvas.removeEventListener('mousedown', onMouseDown);
              canvas.removeEventListener('mousemove', onMouseMove);
              canvas.removeEventListener('mouseup', onMouseUp);
              canvas.removeEventListener('mouseleave', onMouseUp);
              canvas.removeEventListener('touchstart', onTouchStart);
              canvas.removeEventListener('touchmove', onTouchMove);
              canvas.removeEventListener('touchend', onTouchEnd);
              obs.disconnect();
              canvas._vfInit = false;
            }
          });
          obs.observe(document.body, { childList: true, subtree: true });
        };

        // Read aloud helper
        var vReadAloud = function() {
          if (!callTTS) return;
          callTTS('V formation simulator. Birds fly in a V shape to save energy. The lead bird works hardest because it breaks through the air first. Birds behind it ride on the upwash from the leader\'s wingtips, saving up to 65 percent of their energy. When the leader gets tired, it drops back and another bird takes over. This is called leader rotation. Drag the birds to different positions and see how formation efficiency changes.');
        };

        return h('div', { className: 'space-y-3' },
          // Read aloud button
          callTTS && h('div', { className: 'flex justify-end' },
            h('button', {
              className: 'px-2.5 py-1 rounded-lg text-[11px] font-medium ' + btnSecondary,
              'aria-label': t('stem.migration.read_v_formation_explanation_aloud', 'Read V-Formation explanation aloud'),
              onClick: vReadAloud
            }, t('stem.migration.read_aloud', '\uD83D\uDD0A Read Aloud'))
          ),

          // Canvas
          h('div', { className: 'rounded-xl overflow-hidden border ' + borderCol },
            h('canvas', {
              ref: _vfInitCanvas,
              role: 'img',
              'aria-label': t('stem.migration.v_formation_simulator_canvas_drag_bird', 'V-formation simulator canvas. Drag birds to reposition them. Leader bird shown with star. Energy bars above each bird show current energy level. Green cones behind each bird show upwash zones where trailing birds save energy. Red zone directly behind shows downwash area.'),
              tabIndex: 0,
              onKeyDown: function(e) {
                if (e.key === 'v' || e.key === 'V') {
                  birdsRef.current = makeVFormation(birdCount);
                  if (announceToSR) announceToSR('Auto-formed V formation');
                } else if (e.key === 's' || e.key === 'S') {
                  birdsRef.current = makeFlock(birdCount);
                  if (announceToSR) announceToSR('Flock scattered');
                }
              },
              style: { width: '100%', cursor: 'grab', display: 'block' }
            })
          ),

          // Controls
          h('div', { className: 'flex flex-wrap gap-2 items-center' },
            h('button', {
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + btnPrimary,
              'aria-label': t('stem.migration.auto_form_v_formation', 'Auto-form V formation'),
              onClick: function() {
                birdsRef.current = makeVFormation(birdCount);
                if (beep) beep(659, 0.12, 0.12);
                if (announceToSR) announceToSR('V formation formed automatically');
              }
            }, t('stem.migration.auto_form_v', '\uD83E\uDEBF Auto-Form V')),
            h('button', {
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + btnSecondary,
              'aria-label': t('stem.migration.scatter_birds_randomly', 'Scatter birds randomly'),
              onClick: function() {
                birdsRef.current = makeFlock(birdCount);
                if (beep) beep(880, 0.06, 0.08);
                if (announceToSR) announceToSR('Birds scattered randomly');
              }
            }, t('stem.migration.scatter', '\uD83C\uDF2A\uFE0F Scatter')),

            // Bird count slider
            h('div', { className: 'flex items-center gap-2 ml-auto' },
              h('label', { className: 'text-xs font-medium ' + textSecondary }, 'Birds:'),
              h('input', {
                type: 'range', min: 5, max: 15, value: birdCount,
                'aria-label': 'Number of birds in flock: ' + birdCount,
                className: 'w-20 accent-sky-500',
                onChange: function(e) {
                  var n = parseInt(e.target.value, 10);
                  upd('vBirdCount', n);
                  birdsRef.current = null;
                }
              }),
              h('span', { className: 'text-xs font-bold ' + textPrimary, 'aria-hidden': 'true' }, birdCount)
            ),

            // Speed slider
            h('div', { className: 'flex items-center gap-2' },
              h('label', { className: 'text-xs font-medium ' + textSecondary }, 'Speed:'),
              h('input', {
                type: 'range', min: 0.5, max: 3, step: 0.5, value: simSpeed,
                'aria-label': 'Simulation speed: ' + simSpeed + 'x',
                className: 'w-16 accent-sky-500',
                onChange: function(e) { upd('vSpeed', parseFloat(e.target.value)); }
              }),
              h('span', { className: 'text-xs font-bold ' + textPrimary, 'aria-hidden': 'true' }, simSpeed + 'x')
            )
          ),

          // Info panel
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.how_v_formation_works', '\uD83E\uDEBF How V-Formation Works')),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, t('stem.migration.when_a_bird_flaps_its_wings_it_creates', 'When a bird flaps its wings, it creates a rotating vortex of air off each wingtip. The air immediately behind and below the wingtip pushes '), h('strong', null, 'downward'), t('stem.migration.downwash_but_the_air_to_the_side_pushe', ' (downwash), but the air to the side pushes '), h('strong', null, 'upward'), ' (upwash).'),
              h('p', null, t('stem.migration.by_positioning_themselves_in_the_upwas', 'By positioning themselves in the upwash zone \u2014 roughly 30\u00B0 behind and to the side of the bird ahead \u2014 trailing birds get a free boost of rising air. In real flocks this saves roughly '), h('strong', null, '10\u201330%'), t('stem.migration.of_their_energy', ' of their energy ('), h('strong', null, '~65%'), t('stem.migration.is_a_theoretical_maximum', ' is a theoretical maximum).')),
              h('p', null, t('stem.migration.the_leader_gets_no_benefit_and_tires_f', 'The leader gets no benefit and tires faster. When its energy drops below 30%, it falls back and another bird takes the lead. This is called '), h('strong', null, t('stem.migration.leader_rotation', 'leader rotation')), t('stem.migration.in_nature_every_bird_takes_a_turn_at_t', '. In nature, every bird takes a turn at the front.')),
              h('p', null, h('em', null, t('stem.migration.try_dragging_birds_into_different_posi', 'Try dragging birds into different positions and watch how formation efficiency and energy savings change! Press V to auto-form, S to scatter.')))
            )
          ),

          // Formation science cards
          h('div', { className: 'space-y-2' },
            h('h3', { className: 'font-bold text-sm ' + textPrimary }, t('stem.migration.formation_science', '\uD83D\uDD2C Formation Science')),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
              FORMATION_FACTS.map(function(fact, fi) {
                var isExpanded = d.expandedFact === fi;
                return h('div', {
                  key: fi,
                  role: 'button',
                  tabIndex: 0,
                  'aria-expanded': isExpanded ? 'true' : 'false',
                  'aria-label': fact.title + '. ' + (isExpanded ? 'Click to collapse.' : 'Click to expand.'),
                  className: 'rounded-lg p-3 border cursor-pointer transition-all ' + (isExpanded ? 'ring-1 ring-sky-400 ' + accentBg + ' border-sky-300' : borderCol + ' ' + cardBg + ' hover:border-sky-200'),
                  onClick: function() { upd('expandedFact', isExpanded ? null : fi); },
                  onKeyDown: function(e) {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('expandedFact', isExpanded ? null : fi); }
                  }
                },
                  h('div', { className: 'flex items-center justify-between' },
                    h('span', { className: 'text-xs font-bold ' + textPrimary }, fact.title),
                    h('span', { className: 'text-[11px] ' + textMuted, 'aria-hidden': 'true' }, isExpanded ? '\u25B2' : '\u25BC')
                  ),
                  isExpanded && h('p', { className: 'text-[11px] mt-2 leading-relaxed ' + textSecondary }, fact.text)
                );
              })
            )
          ),

          // Migration records
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.migration_world_records', '\uD83C\uDFC6 Migration World Records')),
            h('div', { className: 'space-y-1.5' },
              MIGRATION_RECORDS.map(function(rec, ri) {
                return h('div', { key: ri, className: 'flex items-start gap-2 text-[11px]' },
                  h('span', { className: 'font-bold min-w-[120px] ' + accent }, rec.species),
                  h('div', null,
                    h('span', { className: 'font-medium ' + textPrimary }, rec.record + ': '),
                    h('span', { className: textSecondary }, rec.value)
                  )
                );
              })
            )
          ),

          // ── Energy Budget Calculator (Interactive) ──
          (function() {
            var ebDist = d.ebDistance || 3000;
            var ebWeight = d.ebWeight || 30; // grams
            var ebVForm = d.ebVFormation !== false;
            var ebHeadwind = d.ebHeadwind || 0;

            // Approximate energy model: base metabolic rate + flight cost
            // Flight cost ≈ 10-15x basal metabolic rate for small passerines
            // V-formation saves ~25-65% depending on position
            var basalRate = ebWeight * 0.04; // kcal/hour resting (Kleiber's law approximation)
            var flightMultiplier = 12; // flight is ~12x basal
            var flightCostPerHour = basalRate * flightMultiplier;
            var cruiseSpeed = Math.max(5, 30 - ebHeadwind); // mph effective
            var flightHours = ebDist / cruiseSpeed;
            var vFormSavings = ebVForm ? 0.35 : 0; // 35% savings
            var totalCost = flightCostPerHour * flightHours * (1 - vFormSavings);
            var fatNeeded = totalCost / 9; // 9 kcal per gram of fat
            var percentBodyWeight = (fatNeeded / ebWeight * 100);
            var foodEquivalent = Math.round(totalCost / 2); // ~2 kcal per insect

            return h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
              h('h3', { className: 'font-bold text-sm mb-3 ' + textPrimary }, t('stem.migration.energy_budget_calculator', '\u26A1 Energy Budget Calculator')),
              h('p', { className: 'text-[11px] mb-3 ' + textSecondary }, t('stem.migration.adjust_the_sliders_to_see_how_distance', 'Adjust the sliders to see how distance, body size, wind, and formation affect a bird\'s energy needs. This models the real physics of migratory flight.')),
              h('div', { className: 'grid grid-cols-2 gap-3 mb-3' },
                // Distance slider
                h('div', null,
                  h('label', { className: 'text-[11px] font-bold ' + textPrimary }, 'Distance: ' + ebDist.toLocaleString() + ' mi'),
                  h('input', { type: 'range', min: 100, max: 7000, step: 100, value: ebDist,
                    'aria-label': 'Migration distance: ' + ebDist + ' miles',
                    className: 'w-full accent-amber-500',
                    onChange: function(e) { upd('ebDistance', parseInt(e.target.value, 10)); }
                  })
                ),
                // Weight slider
                h('div', null,
                  h('label', { className: 'text-[11px] font-bold ' + textPrimary }, 'Bird weight: ' + ebWeight + 'g'),
                  h('input', { type: 'range', min: 5, max: 5000, step: 5, value: ebWeight,
                    'aria-label': 'Bird body weight: ' + ebWeight + ' grams',
                    className: 'w-full accent-amber-500',
                    onChange: function(e) { upd('ebWeight', parseInt(e.target.value, 10)); }
                  }),
                  h('div', { className: 'text-[11px] ' + textMuted }, ebWeight < 20 ? 'Hummingbird-sized' : ebWeight < 50 ? 'Warbler-sized' : ebWeight < 200 ? 'Robin-sized' : ebWeight < 1000 ? 'Duck-sized' : ebWeight < 3000 ? 'Goose-sized' : 'Swan-sized')
                ),
                // Headwind slider
                h('div', null,
                  h('label', { className: 'text-[11px] font-bold ' + textPrimary }, 'Headwind: ' + ebHeadwind + ' mph'),
                  h('input', { type: 'range', min: 0, max: 25, value: ebHeadwind,
                    'aria-label': 'Headwind speed: ' + ebHeadwind + ' miles per hour',
                    className: 'w-full accent-red-400',
                    onChange: function(e) { upd('ebHeadwind', parseInt(e.target.value, 10)); }
                  })
                ),
                // V-formation toggle
                h('div', { className: 'flex items-center gap-2' },
                  h('button', {
                    className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ' + (ebVForm ? 'bg-green-700 text-white' : (isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700')),
                    'aria-pressed': ebVForm ? 'true' : 'false',
                    'aria-label': 'V-formation: ' + (ebVForm ? 'on, saving 35% energy' : 'off'),
                    onClick: function() { upd('ebVFormation', !ebVForm); }
                  }, '\uD83E\uDEBF V-Form: ' + (ebVForm ? 'ON (-35%)' : 'OFF'))
                )
              ),
              // Results
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2', 'aria-live': 'polite' },
                h('div', { className: 'text-center p-2 rounded-lg ' + accentBg },
                  h('div', { className: 'text-lg font-black ' + accent }, Math.round(totalCost).toLocaleString()),
                  h('div', { className: 'text-[11px] font-bold ' + textMuted }, t('stem.migration.kcal_needed', 'kcal needed'))
                ),
                h('div', { className: 'text-center p-2 rounded-lg ' + accentBg },
                  h('div', { className: 'text-lg font-black ' + accent }, fatNeeded.toFixed(1) + 'g'),
                  h('div', { className: 'text-[11px] font-bold ' + textMuted }, t('stem.migration.fat_required', 'fat required'))
                ),
                h('div', { className: 'text-center p-2 rounded-lg ' + accentBg },
                  h('div', { className: 'text-lg font-black ' + (percentBodyWeight > 80 ? 'text-red-500' : accent) }, Math.round(percentBodyWeight) + '%'),
                  h('div', { className: 'text-[11px] font-bold ' + textMuted }, t('stem.migration.of_body_weight', 'of body weight'))
                ),
                h('div', { className: 'text-center p-2 rounded-lg ' + accentBg },
                  h('div', { className: 'text-lg font-black ' + accent }, foodEquivalent.toLocaleString()),
                  h('div', { className: 'text-[11px] font-bold ' + textMuted }, t('stem.migration.insects_equivalent', 'insects equivalent'))
                )
              ),
              h('div', { className: 'mt-2 text-[11px] leading-relaxed ' + textSecondary },
                h('p', null, '\uD83D\uDD2C ', h('strong', null, t('stem.migration.the_science', 'The science: ')), t('stem.migration.bird_flight_costs_12x_their_resting_me', 'Bird flight costs ~12x their resting metabolic rate (Kleiber\'s Law). Fat provides 9 kcal/g \u2014 the most energy-dense fuel in biology. Before migration, birds enter '), h('strong', null, 'hyperphagia'), t('stem.migration.a_feeding_frenzy_where_they_may_double', ' \u2014 a feeding frenzy where they may double their body weight in fat. A Bar-tailed Godwit burns through '), h('strong', null, t('stem.migration.55_of_its_body_weight', '55% of its body weight')), t('stem.migration.during_its_record_non_stop_flight_2026', ' during a record non-stop flight of 8,425 miles, Alaska to Tasmania.')),
                percentBodyWeight > 100 && h('p', { className: 'mt-1 font-bold text-red-500' }, t('stem.migration.this_journey_requires_more_fat_than_th', '\u26A0\uFE0F This journey requires more fat than the bird weighs! It would need stopovers to refuel \u2014 or V-formation to cut costs.'))
              )
            );
          })(),

          // ── Altitude Physiology (Interactive) ──
          (function() {
            var altFeet = d.altFeet || 15000;
            var oxygenPercent = Math.max(5, 100 * Math.exp(-altFeet / 27000)); // exponential decay
            var tempC = 15 - (altFeet * 0.00198); // standard lapse rate ~2°C per 1000ft
            var tempF = tempC * 9 / 5 + 32;
            var airDensity = Math.max(20, 100 * Math.exp(-altFeet / 30000));
            var windAtAlt = Math.round(10 + altFeet / 500); // winds increase with altitude

            return h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
              h('h3', { className: 'font-bold text-sm mb-3 ' + textPrimary }, t('stem.migration.altitude_physiology', '\u2708\uFE0F Altitude Physiology')),
              h('p', { className: 'text-[11px] mb-3 ' + textSecondary }, t('stem.migration.some_birds_migrate_at_extreme_altitude', 'Some birds migrate at extreme altitudes \u2014 Bar-headed Geese cross the Himalayas at 29,000 feet. Drag the slider to see how conditions change.')),
              h('div', { className: 'mb-3' },
                h('label', { className: 'text-[11px] font-bold ' + textPrimary }, '\u2B06\uFE0F Altitude: ' + altFeet.toLocaleString() + ' ft (' + Math.round(altFeet * 0.3048) + ' m)'),
                h('input', { type: 'range', min: 0, max: 37000, step: 500, value: altFeet,
                  'aria-label': 'Flight altitude: ' + altFeet + ' feet. Oxygen: ' + Math.round(oxygenPercent) + '%. Temperature: ' + Math.round(tempF) + ' degrees Fahrenheit.',
                  className: 'w-full accent-sky-500',
                  onChange: function(e) { upd('altFeet', parseInt(e.target.value, 10)); }
                })
              ),
              // Visual bars
              h('div', { className: 'grid grid-cols-4 gap-2', 'aria-live': 'polite' },
                h('div', { className: 'text-center' },
                  h('div', { className: 'h-24 rounded-lg overflow-hidden relative ' + (isDark ? 'bg-slate-700' : 'bg-slate-200') },
                    h('div', { className: 'absolute bottom-0 w-full rounded-b-lg transition-all duration-300 ' + (oxygenPercent < 50 ? 'bg-red-500' : oxygenPercent < 70 ? 'bg-amber-500' : 'bg-green-500'), style: { height: oxygenPercent + '%' } })
                  ),
                  h('div', { className: 'text-sm font-black mt-1 ' + (oxygenPercent < 50 ? 'text-red-500' : textPrimary) }, Math.round(oxygenPercent) + '%'),
                  h('div', { className: 'text-[11px] font-bold ' + textMuted }, 'O\u2082')
                ),
                h('div', { className: 'text-center' },
                  h('div', { className: 'h-24 rounded-lg overflow-hidden relative ' + (isDark ? 'bg-slate-700' : 'bg-slate-200') },
                    h('div', { className: 'absolute bottom-0 w-full rounded-b-lg transition-all duration-300 ' + (tempC < -20 ? 'bg-blue-600' : tempC < 0 ? 'bg-sky-400' : 'bg-amber-400'), style: { height: Math.max(5, ((tempC + 60) / 75 * 100)) + '%' } })
                  ),
                  h('div', { className: 'text-sm font-black mt-1 ' + textPrimary }, Math.round(tempF) + '\u00B0F'),
                  h('div', { className: 'text-[11px] font-bold ' + textMuted }, Math.round(tempC) + '\u00B0C')
                ),
                h('div', { className: 'text-center' },
                  h('div', { className: 'h-24 rounded-lg overflow-hidden relative ' + (isDark ? 'bg-slate-700' : 'bg-slate-200') },
                    h('div', { className: 'absolute bottom-0 w-full rounded-b-lg transition-all duration-300 bg-purple-500', style: { height: airDensity + '%' } })
                  ),
                  h('div', { className: 'text-sm font-black mt-1 ' + textPrimary }, Math.round(airDensity) + '%'),
                  h('div', { className: 'text-[11px] font-bold ' + textMuted }, t('stem.migration.air_density', 'Air density'))
                ),
                h('div', { className: 'text-center' },
                  h('div', { className: 'h-24 rounded-lg overflow-hidden relative ' + (isDark ? 'bg-slate-700' : 'bg-slate-200') },
                    h('div', { className: 'absolute bottom-0 w-full rounded-b-lg transition-all duration-300 bg-cyan-500', style: { height: Math.min(100, windAtAlt / 80 * 100) + '%' } })
                  ),
                  h('div', { className: 'text-sm font-black mt-1 ' + textPrimary }, windAtAlt + ' mph'),
                  h('div', { className: 'text-[11px] font-bold ' + textMuted }, t('stem.migration.wind', 'Wind'))
                )
              ),
              // Science context
              h('div', { className: 'mt-3 text-[11px] leading-relaxed ' + textSecondary },
                altFeet > 25000 ? h('p', null, '\u{1F9EC} ', h('strong', null, t('stem.migration.extreme_altitude', 'Extreme altitude! ')), t('stem.migration.bar_headed_geese_survive_here_thanks_t', 'Bar-headed Geese survive here thanks to hemoglobin that binds oxygen more tightly, larger lungs, and more efficient mitochondria. Most mammals would be unconscious at this altitude. Their blood has a special hemoglobin mutation (Pro\u2192Ala at position 119) that increases oxygen affinity by 50%.')) :
                altFeet > 15000 ? h('p', null, '\u{1F9EC} ', h('strong', null, t('stem.migration.high_altitude_zone', 'High altitude zone. ')), t('stem.migration.many_songbirds_migrate_at_this_range_w', 'Many songbirds migrate at this range, where thinner air reduces drag but oxygen is scarce. Birds compensate with more efficient breathing \u2014 their one-way airflow system extracts oxygen on both inhale and exhale, unlike mammalian lungs which only extract on inhale.')) :
                altFeet > 5000 ? h('p', null, '\uD83D\uDC26 ', h('strong', null, t('stem.migration.common_cruising_altitude', 'Common cruising altitude. ')), t('stem.migration.most_migrants_fly_between_5_000_15_000', 'Most migrants fly between 5,000-15,000 feet. Air temperature drops ~3.5\u00B0F per 1,000 feet (standard lapse rate). Birds choose altitude to find favorable winds \u2014 the same bird may fly at 2,000 feet one night and 12,000 the next.')) :
                h('p', null, '\uD83C\uDF3F ', h('strong', null, t('stem.migration.low_altitude', 'Low altitude. ')), t('stem.migration.hummingbirds_and_some_shorebirds_fly_c', 'Hummingbirds and some shorebirds fly close to the surface, especially over water. Low flight is safer from ice but means more air resistance and less wind assistance. During the 600-mile Gulf of Mexico crossing, most birds fly at 1,000-3,000 feet.'))
              )
            );
          })()
        );
      }

      // ══════════════════════════════════════════
      // TAB 2: WIND CURRENTS SANDBOX
      // ══════════════════════════════════════════
      function renderWindCurrents() {
        var canvasRef = _wcCanvasRef;
        var animRef = _wcAnimRef;
        var particlesRef = _wcParticlesRef;
        var objectsRef = _wcObjectsRef;
        var windBirdsRef = _wcBirdsRef;
        var timeRef = _wcTimeRef;

        var windDir = d.windDir || 0; // degrees, 0=East
        var windSpeed = d.windSpeed || 15;
        var showStreamlines = d.showStreamlines || false;
        var placingObj = d.placingObj || null; // 'mountain', 'building', 'lake', 'thermal', 'forest'

        var PLACEABLE = [
          { id: 'mountain', emoji: '\u26F0\uFE0F', label: t('stem.migration.mountain', 'Mountain'), desc: t('stem.migration.deflects_wind_upward_on_windward_side', 'Deflects wind upward on windward side') },
          { id: 'building', emoji: '\uD83C\uDFE2', label: t('stem.migration.building', 'Building'), desc: t('stem.migration.creates_turbulent_wake', 'Creates turbulent wake') },
          { id: 'lake', emoji: '\uD83C\uDF0A', label: t('stem.migration.lake', 'Lake'), desc: t('stem.migration.sea_breeze_thermal_effect', 'Sea breeze thermal effect') },
          { id: 'thermal', emoji: '\uD83C\uDF00', label: t('stem.migration.thermal', 'Thermal'), desc: t('stem.migration.rising_warm_air_column', 'Rising warm air column') },
          { id: 'forest', emoji: '\uD83C\uDF32', label: t('stem.migration.forest', 'Forest'), desc: t('stem.migration.friction_slows_wind_near_surface', 'Friction slows wind near surface') }
        ];

        var COMPASS_DIRS = [
          { label: 'E', angle: 0 },
          { label: 'NE', angle: 45 },
          { label: 'N', angle: 90 },
          { label: 'NW', angle: 135 },
          { label: 'W', angle: 180 },
          { label: 'SW', angle: 225 },
          { label: 'S', angle: 270 },
          { label: 'SE', angle: 315 }
        ];

        var _wcInitCanvas = function(canvas) {
          if (!canvas) return;
          canvasRef.current = canvas;
          if (canvas._wcInit) return;
          canvas._wcInit = true;
          var c = canvas.getContext('2d');
          var dpr = window.devicePixelRatio || 1;
          var W = canvas.parentElement ? canvas.parentElement.clientWidth : 620;
          var H = 380;
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          canvas.style.width = W + 'px';
          canvas.style.height = H + 'px';
          c.setTransform(dpr, 0, 0, dpr, 0, 0);

          // Init particles
          if (!particlesRef.current) {
            var parts = [];
            for (var pi = 0; pi < 300; pi++) {
              parts.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, age: Math.random() * 100 });
            }
            particlesRef.current = parts;
          }
          if (!objectsRef.current) objectsRef.current = d.windObjects || [];

          function getWindAt(x, y) {
            // Read fresh wind values from live ref (updated every React render)
            var lv = _liveVals.current;
            var windRad2 = lv.windDir * Math.PI / 180;
            var baseVx = Math.cos(windRad2) * lv.windSpeed * 0.06;
            var baseVy = -Math.sin(windRad2) * lv.windSpeed * 0.06;
            var vx = baseVx;
            var vy = baseVy;
            var objs = objectsRef.current || [];
            for (var oi = 0; oi < objs.length; oi++) {
              var obj = objs[oi];
              var dx = x - obj.x;
              var dy = y - obj.y;
              var d2 = Math.sqrt(dx * dx + dy * dy);
              if (d2 < 5) d2 = 5;
              var influence = 1;

              if (obj.type === 'mountain' && d2 < 80) {
                influence = Math.max(0, 1 - d2 / 80);
                // Windward: deflect upward
                var windward = (dx * baseVx + dy * baseVy) < 0;
                if (windward) {
                  vy -= influence * 1.5;
                } else {
                  // Leeward: downdraft + turbulence
                  vy += influence * 1.2;
                  vx += (Math.random() - 0.5) * influence * 0.8;
                }
              } else if (obj.type === 'building' && d2 < 60) {
                influence = Math.max(0, 1 - d2 / 60);
                // Turbulent wake behind building
                var behindBuilding = dx * baseVx > 0;
                if (behindBuilding) {
                  vx += (Math.random() - 0.5) * influence * 2;
                  vy += (Math.random() - 0.5) * influence * 2;
                } else if (d2 < 30) {
                  // Block wind
                  vx *= (1 - influence * 0.8);
                  vy *= (1 - influence * 0.8);
                }
              } else if (obj.type === 'lake' && d2 < 70) {
                influence = Math.max(0, 1 - d2 / 70);
                // Thermal convection: air rises over warm lake
                vy -= influence * 0.8;
                // Convergence toward center
                vx -= (dx / d2) * influence * 0.3;
              } else if (obj.type === 'thermal' && d2 < 60) {
                influence = Math.max(0, 1 - d2 / 60);
                // Strong upward spiral
                vy -= influence * 2.5;
                var spiralAngle = Math.atan2(dy, dx) + Math.PI / 2;
                vx += Math.cos(spiralAngle) * influence * 0.6;
                vy += Math.sin(spiralAngle) * influence * 0.3;
              } else if (obj.type === 'forest' && d2 < 50) {
                influence = Math.max(0, 1 - d2 / 50);
                // Friction: slow wind near surface
                vx *= (1 - influence * 0.5);
                vy *= (1 - influence * 0.3);
              }
            }
            return { vx: vx, vy: vy };
          }

          function frame() {
            timeRef.current += 0.016;
            var lv = _liveVals.current;
            // Shadow the frozen render-scope copies with the live ones.
            var isDark = lv.isDark;
            var showStreamlines = lv.showStreamlines;
            var windRad = (lv.windDir || 0) * Math.PI / 180;
            c.clearRect(0, 0, W, H);

            // Sky: a real gradient with a haze band at the horizon, so height
            // in the frame reads as height in the air column.
            var bgGrad = c.createLinearGradient(0, 0, 0, H);
            if (isDark) {
              bgGrad.addColorStop(0, '#082f49');
              bgGrad.addColorStop(0.55, '#0c4a6e');
              bgGrad.addColorStop(1, '#155e75');
            } else {
              bgGrad.addColorStop(0, '#bae6fd');
              bgGrad.addColorStop(0.55, '#e0f2fe');
              bgGrad.addColorStop(1, '#f4fbff');
            }
            c.fillStyle = bgGrad;
            c.fillRect(0, 0, W, H);

            // Drifting cloud deck at altitude — parallax that makes the wind
            // direction legible even where no particle happens to be.
            c.save();
            c.globalAlpha = isDark ? 0.10 : 0.34;
            c.fillStyle = isDark ? '#94a3b8' : '#ffffff';
            var cloudDrift = (timeRef.current * (lv.windSpeed || 15) * 0.35) % (W + 260);
            for (var cd = 0; cd < 4; cd++) {
              var ccx = ((cd * 210 + cloudDrift) % (W + 260)) - 130;
              var ccy = 26 + cd * 27 + Math.sin(cd * 2.3) * 12;
              c.beginPath();
              c.ellipse(ccx, ccy, 58 + cd * 9, 13 + cd * 2, 0, 0, Math.PI * 2);
              c.fill();
              c.beginPath();
              c.ellipse(ccx + 32, ccy - 7, 36, 11, 0, 0, Math.PI * 2);
              c.fill();
            }
            c.restore();

            // Distant ridgeline, then the ground plane
            c.beginPath();
            c.moveTo(0, H - 30);
            for (var hx = 0; hx <= W; hx += 40) {
              c.lineTo(hx, H - 34 - Math.sin(hx * 0.011) * 9 - Math.sin(hx * 0.027) * 5);
            }
            c.lineTo(W, H - 30);
            c.closePath();
            c.fillStyle = isDark ? 'rgba(30,41,59,0.75)' : 'rgba(148,163,184,0.35)';
            c.fill();
            var groundGrad = c.createLinearGradient(0, H - 30, 0, H);
            if (isDark) {
              groundGrad.addColorStop(0, '#1e3a2f');
              groundGrad.addColorStop(1, '#132620');
            } else {
              groundGrad.addColorStop(0, '#86efac');
              groundGrad.addColorStop(1, '#4ea86e');
            }
            c.fillStyle = groundGrad;
            c.fillRect(0, H - 30, W, 30);
            c.fillStyle = isDark ? '#1a5c33' : '#3fbb6a';
            c.fillRect(0, H - 30, W, 2);
            // Grass tufts, spaced so the ground plane reads as a surface
            c.strokeStyle = isDark ? 'rgba(21,128,61,0.7)' : 'rgba(22,101,52,0.35)';
            c.lineWidth = 1;
            for (var gt = 6; gt < W; gt += 17) {
              var gh = 3 + ((gt * 7) % 5);
              c.beginPath();
              c.moveTo(gt, H - 28);
              c.lineTo(gt + 2, H - 28 - gh);
              c.stroke();
            }

            // ── Terrain objects ──
            var objs = objectsRef.current || [];
            for (var oi = 0; oi < objs.length; oi++) {
              var obj = objs[oi];
              var rad = obj.type === 'mountain' ? 80 : obj.type === 'building' ? 60 : obj.type === 'forest' ? 50 : obj.type === 'thermal' ? 60 : 70;
              // Influence field: the radius getWindAt() actually uses, shown as
              // a soft tint plus a dashed edge rather than a bare hairline.
              var ig = c.createRadialGradient(obj.x, obj.y, rad * 0.25, obj.x, obj.y, rad);
              ig.addColorStop(0, obj.type === 'thermal'
                ? (isDark ? 'rgba(251,191,36,0.13)' : 'rgba(249,115,22,0.10)')
                : (isDark ? 'rgba(125,211,252,0.11)' : 'rgba(14,165,233,0.08)'));
              ig.addColorStop(1, 'rgba(0,0,0,0)');
              c.fillStyle = ig;
              c.beginPath();
              c.arc(obj.x, obj.y, rad, 0, Math.PI * 2);
              c.fill();
              c.beginPath();
              c.arc(obj.x, obj.y, rad, 0, Math.PI * 2);
              c.strokeStyle = isDark ? 'rgba(125,211,252,0.22)' : 'rgba(14,165,233,0.18)';
              c.lineWidth = 1;
              c.setLineDash([4, 5]);
              c.stroke();
              c.setLineDash([]);

              // Contact shadow only when the object is sitting on the ground —
              // objects can be placed anywhere in the air column, and a shadow
              // under a floating mountain reads as a mistake.
              if (obj.y > H - 90) {
                c.save();
                c.globalAlpha = isDark ? 0.35 : 0.18;
                c.fillStyle = '#0f172a';
                c.beginPath();
                c.ellipse(obj.x, Math.min(H - 26, obj.y + 22), 34, 5, 0, 0, Math.PI * 2);
                c.fill();
                c.restore();
              }
              migrDrawTerrain(c, obj.type, obj.x, obj.y, timeRef.current, isDark);

              // Name it, so the influence field is attributable
              var oLabel = '';
              for (var pi2 = 0; pi2 < PLACEABLE.length; pi2++) {
                if (PLACEABLE[pi2].id === obj.type) { oLabel = PLACEABLE[pi2].label; break; }
              }
              if (oLabel) {
                migrChip(c, obj.x, obj.y + 34, oLabel,
                  isDark ? '#e2e8f0' : '#0f172a',
                  isDark ? 'rgba(2,6,23,0.72)' : 'rgba(255,255,255,0.85)', 'bold 8px system-ui');
              }
            }

            // Update & draw particles
            var parts = particlesRef.current || [];
            for (var pk = 0; pk < parts.length; pk++) {
              var pp = parts[pk];
              var wind = getWindAt(pp.x, pp.y);
              pp.vx = lerp(pp.vx, wind.vx, 0.1);
              pp.vy = lerp(pp.vy, wind.vy, 0.1);
              pp.x += pp.vx;
              pp.y += pp.vy;
              pp.age += 1;

              // Toroidal wrapping
              if (pp.x < 0) pp.x += W;
              if (pp.x > W) pp.x -= W;
              if (pp.y < 0) pp.y += H;
              if (pp.y > H - 30) pp.y -= (H - 30);

              // Colour by speed. The ramp has to run against the sky it is
              // drawn on: the old light-blue/white/yellow ramp is legible on a
              // night sky and nearly invisible on the light theme's pale one.
              // Colour by speed RELATIVE to the ambient wind, so terrain
              // effects are what the colour shows.
              var spd = Math.sqrt(pp.vx * pp.vx + pp.vy * pp.vy);
              var _amb = Math.abs(lv.windSpeed || 15) * 0.06;
              var speedNorm = migrWindNorm(spd, _amb);
              var _rgb = migrWindRamp(speedNorm, isDark);
              var r2 = _rgb[0], g2 = _rgb[1], b2 = _rgb[2];
              var pCol = 'rgba(' + Math.round(r2) + ',' + Math.round(g2) + ',' + Math.round(b2) + ',';

              // Every particle carries a tail along its own velocity, so the
              // field reads as flow rather than as speckle. "Lines" simply makes
              // the tail long enough to merge into continuous streamlines.
              var tail = showStreamlines ? 22 : 9;
              var tg = c.createLinearGradient(pp.x, pp.y, pp.x - pp.vx * tail, pp.y - pp.vy * tail);
              tg.addColorStop(0, pCol + (showStreamlines ? 0.75 : 0.62) + ')');
              tg.addColorStop(1, pCol + '0)');
              c.beginPath();
              c.moveTo(pp.x, pp.y);
              c.lineTo(pp.x - pp.vx * tail, pp.y - pp.vy * tail);
              c.strokeStyle = tg;
              c.lineWidth = showStreamlines ? 1.8 : 1.4;
              c.lineCap = 'round';
              c.stroke();
              if (!showStreamlines) {
                c.fillStyle = pCol + '0.9)';
                c.beginPath();
                c.arc(pp.x, pp.y, 1.1 + speedNorm * 1.3, 0, Math.PI * 2);
                c.fill();
              }
            }

            // Draw wind birds
            var wbirds = windBirdsRef.current || [];
            for (var wbi = 0; wbi < wbirds.length; wbi++) {
              var wb = wbirds[wbi];
              var wbWind = getWindAt(wb.x, wb.y);
              wb.vx = lerp(wb.vx, wbWind.vx * 1.2, 0.05);
              wb.vy = lerp(wb.vy, wbWind.vy * 1.2, 0.05);
              wb.x += wb.vx;
              wb.y += wb.vy;
              wb.phase += 0.08;
              if (wb.x < -20) wb.x += W + 40;
              if (wb.x > W + 20) wb.x -= W + 40;
              if (wb.y < -20) wb.y += H;
              if (wb.y > H) wb.y -= H;

              // Check thermal for quest
              for (var toi = 0; toi < objs.length; toi++) {
                if (objs[toi].type === 'thermal') {
                  var tdx = wb.x - objs[toi].x;
                  var tdy = wb.y - objs[toi].y;
                  if (Math.sqrt(tdx * tdx + tdy * tdy) < 40 && wb.vy < -0.5 && !lv.thermalRidden && !_wcThermalAwarded.current) {
                    _wcThermalAwarded.current = true;
                    upd('thermalRidden', true);
                    if (celebrate) celebrate();
                    if (awardXP) awardXP('migration', 15, 'Rode a thermal updraft');
                    if (addToast) addToast('Thermal updraft ridden! +15 XP', 'success');
                    if (announceToSR) announceToSR('Bird rode a thermal updraft. 15 experience points awarded.');
                  }
                }
              }

              var faceDir = wb.vx >= 0 ? 1 : -1;
              drawBird(c, wb.x, wb.y, 9, wb.phase, faceDir, null, isDark, 'goose');
            }

            // ── Wind readout ──
            drawCompassRose(c, W - 44, 44, 30, lv.windDir || 0, isDark);
            migrPanel(c, W - 132, 82, 124, 40, isDark, '#0ea5e9');
            c.textAlign = 'left';
            c.textBaseline = 'alphabetic';
            c.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
            c.font = 'bold 15px system-ui';
            c.fillText(lv.windSpeed + ' mph', W - 122, 101);
            c.fillStyle = isDark ? '#94a3b8' : '#475569';
            c.font = '9px system-ui';
            c.fillText(getBeaufort(lv.windSpeed) + ' · ' + Math.round(lv.windDir || 0) + '°', W - 122, 114);

            // Speed key, drawn from the SAME ramp function as the particles.
            // The tick marks the ambient wind, so the two halves read as
            // "slower than the wind you set" and "faster".
            var keyW = 108;
            migrPanel(c, 8, 8, keyW + 16, 34, isDark, null);
            for (var kx = 0; kx < keyW; kx++) {
              var kcol = migrWindRamp(kx / keyW, isDark);
              c.fillStyle = 'rgb(' + kcol[0] + ',' + kcol[1] + ',' + kcol[2] + ')';
              c.fillRect(16 + kx, 16, 1.4, 7);
            }
            c.strokeStyle = isDark ? 'rgba(226,232,240,0.85)' : 'rgba(15,23,42,0.7)';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(16 + keyW * 0.45, 14.5);
            c.lineTo(16 + keyW * 0.45, 24.5);
            c.stroke();
            c.font = '8px system-ui';
            c.textAlign = 'left';
            c.fillStyle = isDark ? '#94a3b8' : '#475569';
            c.fillText(t('stem.migration.slow_air', 'slower'), 16, 34);
            c.textAlign = 'center';
            c.fillText(t('stem.migration.wind_set', 'wind set'), 16 + keyW * 0.45, 34);
            c.textAlign = 'right';
            c.fillText(t('stem.migration.fast_air', 'faster'), 16 + keyW, 34);
            c.textAlign = 'left';

            animRef.current = requestAnimationFrame(frame);
          }

          // Click to place objects
          function onClick(e) {
            // Registered once alongside frame(), so this closure is the first
            // render's: reading placingObj from render scope pinned it to null
            // and no click ever placed anything.
            var live = _liveVals.current.placingObj;
            if (!live) return;
            var rect = canvas.getBoundingClientRect();
            var mx = e.clientX - rect.left;
            var my = e.clientY - rect.top;
            if (my > H - 35) return; // Don't place on ground
            var newObjs = (objectsRef.current || []).concat([{ type: live, x: mx, y: my }]);
            objectsRef.current = newObjs;
            upd('windObjects', newObjs);
            upd('placingObj', null);
            if (beep) beep(659, 0.12, 0.12);
            if (announceToSR) announceToSR(live + ' placed on wind field');
          }

          canvas.addEventListener('click', onClick);
          frame();

          // Cleanup via MutationObserver (callback refs must not return a function in React 18)
          var obs2 = new MutationObserver(function() {
            if (!document.contains(canvas)) {
              if (animRef.current) cancelAnimationFrame(animRef.current);
              canvas.removeEventListener('click', onClick);
              obs2.disconnect();
              canvas._wcInit = false;
            }
          });
          obs2.observe(document.body, { childList: true, subtree: true });
        };

        return h('div', { className: 'space-y-3' },
          // Canvas
          h('div', { className: 'rounded-xl overflow-hidden border ' + borderCol },
            h('canvas', {
              ref: _wcInitCanvas,
              role: 'img',
              'aria-label': 'Wind currents sandbox. Click to place objects that affect wind patterns. Particles show wind speed and direction. ' + windSpeed + ' mph ' + getBeaufort(windSpeed) + ' wind.',
              tabIndex: 0,
              onKeyDown: function(e) {
                if (e.key === 'c' || e.key === 'C') {
                  objectsRef.current = [];
                  upd('windObjects', []);
                  if (announceToSR) announceToSR('All objects cleared');
                }
              },
              style: { width: '100%', cursor: placingObj ? 'crosshair' : 'default', display: 'block' }
            })
          ),

          // Controls row
          h('div', { className: 'flex flex-wrap gap-2 items-start' },
            // Object palette
            h('div', { className: 'flex flex-wrap gap-1' },
              PLACEABLE.map(function(obj) {
                var active = placingObj === obj.id;
                return h('button', {
                  key: obj.id,
                  className: 'px-2 py-1.5 rounded-lg text-xs font-bold transition-all ' + (active ? 'ring-2 ring-sky-400 ' + btnPrimary : btnSecondary),
                  'aria-label': 'Place ' + obj.label + ': ' + obj.desc,
                  'aria-pressed': active ? 'true' : 'false',
                  onClick: function() { upd('placingObj', active ? null : obj.id); }
                }, obj.emoji + ' ' + obj.label);
              })
            ),

            h('button', {
              className: 'px-2 py-1.5 rounded-lg text-xs font-bold ' + btnSecondary,
              'aria-label': t('stem.migration.add_a_bird_to_ride_the_wind_currents', 'Add a bird to ride the wind currents'),
              onClick: function() {
                var wb = windBirdsRef.current || [];
                wb.push({ x: 50, y: 100 + Math.random() * 150, vx: 0, vy: 0, phase: Math.random() * 6 });
                windBirdsRef.current = wb;
                if (beep) beep(880, 0.06, 0.08);
                if (announceToSR) announceToSR('Bird added to wind field');
              }
            }, t('stem.migration.add_bird', '\uD83D\uDC26 Add Bird')),

            h('button', {
              className: 'px-2 py-1.5 rounded-lg text-xs font-bold ' + btnSecondary,
              'aria-label': t('stem.migration.clear_all_objects_and_birds', 'Clear all objects and birds'),
              onClick: function() {
                objectsRef.current = [];
                windBirdsRef.current = [];
                upd('windObjects', []);
                if (beep) beep(880, 0.06, 0.08);
                if (announceToSR) announceToSR('All objects and birds cleared');
              }
            }, t('stem.migration.clear_all', '\uD83D\uDDD1\uFE0F Clear All')),

            h('button', {
              className: 'px-2 py-1.5 rounded-lg text-xs font-bold ' + (showStreamlines ? btnPrimary : btnSecondary),
              'aria-label': showStreamlines ? 'Switch to dot particles' : 'Switch to streamlines',
              'aria-pressed': showStreamlines ? 'true' : 'false',
              onClick: function() { upd('showStreamlines', !showStreamlines); }
            }, showStreamlines ? '\u2500 Lines' : '\u2022 Dots')
          ),

          // Wind direction + speed
          h('div', { className: 'flex flex-wrap gap-4 items-center' },
            // Compass
            h('div', {
              className: 'flex flex-wrap gap-1',
              role: 'radiogroup',
              'aria-label': t('stem.migration.wind_direction', 'Wind direction'),
              onKeyDown: function(e) {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  var nextAngle = (windDir + 45) % 360;
                  upd('windDir', nextAngle);
                  if (announceToSR) announceToSR('Wind direction: ' + nextAngle + ' degrees');
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  var prevAngle = (windDir - 45 + 360) % 360;
                  upd('windDir', prevAngle);
                  if (announceToSR) announceToSR('Wind direction: ' + prevAngle + ' degrees');
                }
              }
            },
              COMPASS_DIRS.map(function(cd) {
                var active = windDir === cd.angle;
                return h('button', {
                  key: cd.label,
                  role: 'radio',
                  'aria-checked': active ? 'true' : 'false',
                  'aria-label': 'Wind from ' + cd.label + (active ? ', selected' : ''),
                  className: 'w-10 h-10 rounded-full text-[11px] font-bold transition-all ' + (active ? 'bg-sky-700 text-white ring-2 ring-sky-300' : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300')),
                  tabIndex: active ? 0 : -1,
                  onClick: function() { upd('windDir', cd.angle); }
                }, cd.label);
              })
            ),

            // Speed slider
            h('div', { className: 'flex items-center gap-2 flex-1 min-w-[180px]' },
              h('label', { className: 'text-xs font-medium ' + textSecondary }, t('stem.migration.wind_2', '\uD83C\uDF2C\uFE0F Wind:')),
              h('input', {
                type: 'range', min: 0, max: 50, value: windSpeed,
                'aria-label': 'Wind speed: ' + windSpeed + ' mph, ' + getBeaufort(windSpeed),
                className: 'flex-1 accent-sky-500',
                onChange: function(e) { upd('windSpeed', parseInt(e.target.value, 10)); }
              }),
              h('span', { className: 'text-xs font-bold min-w-[80px] text-right ' + textPrimary }, windSpeed + ' mph'),
              h('span', { className: 'text-[11px] ' + textMuted }, getBeaufort(windSpeed))
            )
          ),

          // Wind science info
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.wind_science_for_migrators', '\uD83C\uDF2C\uFE0F Wind Science for Migrators')),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              [
                { title: t('stem.migration.thermals', 'Thermals'), emoji: '\uD83C\uDF00', text: t('stem.migration.thermals_are_columns_of_rising_warm_ai', 'Thermals are columns of rising warm air created when the sun heats the ground unevenly. Dark surfaces (parking lots, plowed fields) create stronger thermals than light surfaces (water, forests). Soaring birds like hawks and eagles ride thermals in spiraling circles, gaining altitude without flapping. They then glide to the next thermal, creating an energy-efficient "thermal street" highway in the sky.') },
                { title: t('stem.migration.orographic_lift', 'Orographic Lift'), emoji: '\u26F0\uFE0F', text: t('stem.migration.when_wind_encounters_a_mountain_it_is_', 'When wind encounters a mountain, it is forced upward along the windward slope. This creates a band of rising air that ridge-soaring birds (like golden eagles) exploit. On the leeward (downwind) side, the air descends rapidly creating a dangerous "rotor" zone of turbulent, sinking air. This is why birds and pilots avoid the lee side of mountains.') },
                { title: t('stem.migration.sea_breezes', 'Sea Breezes'), emoji: '\uD83C\uDF0A', text: t('stem.migration.land_heats_faster_than_water_during_th', 'Land heats faster than water during the day. Hot air rises over land, and cooler air flows in from the sea to replace it \u2014 creating an onshore "sea breeze." At night, the pattern reverses. Migrating birds use these predictable coastal winds to conserve energy. The convergence zone where sea breeze meets inland air often creates thermals that birds use to gain altitude.') },
                { title: t('stem.migration.jet_streams', 'Jet Streams'), emoji: '\u2708\uFE0F', text: t('stem.migration.high_altitude_jet_streams_are_narrow_b', 'High-altitude jet streams are narrow bands of very fast wind (100-200 mph) at 30,000-40,000 feet. While most birds fly far below jet streams, some migrants like the Bar-tailed Godwit climb to 20,000+ feet to catch favorable high-altitude winds. Geese have been detected by radar at 29,000 feet over the Himalayas, where oxygen is scarce and temperatures plunge to -50\u00B0F.') },
                { title: t('stem.migration.wind_shear', 'Wind Shear'), emoji: '\u26A0\uFE0F', text: t('stem.migration.wind_shear_is_a_sudden_change_in_wind_', 'Wind shear is a sudden change in wind speed or direction over a short distance. It is dangerous for both birds and aircraft. Microbursts (sudden columns of sinking air) during thunderstorms create intense wind shear near the ground. Birds sense pressure changes and will often delay migration when storm fronts approach.') },
                { title: t('stem.migration.beaufort_scale', 'Beaufort Scale'), emoji: '\uD83D\uDCCF', text: t('stem.migration.admiral_sir_francis_beaufort_created_h', 'Admiral Sir Francis Beaufort created his wind scale in 1805 based on the effect of wind on sailing ships. Modern Beaufort uses ground observations: Force 0 (Calm) = smoke rises vertically; Force 6 (Strong Breeze) = large branches sway, umbrellas turn inside out; Force 12 (Hurricane) = devastation. Most birds prefer to migrate in Force 2-4 winds (Light to Moderate Breeze).') }
              ].map(function(card) {
                return h('div', { key: card.title, className: 'rounded-lg p-3 border ' + borderCol + ' ' + (isDark ? 'bg-slate-700/50' : 'bg-white') },
                  h('div', { className: 'flex items-center gap-1.5 mb-1' },
                    h('span', { className: 'text-base', 'aria-hidden': 'true' }, card.emoji),
                    h('span', { className: 'text-[11px] font-bold ' + textPrimary }, card.title)
                  ),
                  h('p', { className: 'text-[11px] leading-relaxed ' + textSecondary }, card.text)
                );
              })
            )
          ),

          // How birds use wind
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.how_birds_use_wind', '\uD83D\uDC26 How Birds Use Wind')),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, h('strong', null, t('stem.migration.tail_winds', 'Tail Winds: ')), t('stem.migration.migrants_strongly_prefer_flying_with_t', 'Migrants strongly prefer flying with the wind at their backs. A tailwind of just 15 mph effectively doubles a bird\'s ground speed while requiring the same energy output. Studies show that migration days with favorable tail winds see 10x more bird traffic than headwind days.')),
              h('p', null, h('strong', null, t('stem.migration.dynamic_soaring', 'Dynamic Soaring: ')), t('stem.migration.albatrosses_exploit_wind_speed_gradien', 'Albatrosses exploit wind speed gradients over ocean waves. By alternating between climbing into faster wind and diving into slower wind near the surface, they extract energy from the wind shear itself. An albatross can fly thousands of miles with almost no flapping.')),
              h('p', null, h('strong', null, t('stem.migration.slope_soaring', 'Slope Soaring: ')), t('stem.migration.when_wind_hits_a_cliff_face_or_ridge_t', 'When wind hits a cliff face or ridge, the deflected air creates a "wave" of lift along the ridge line. Raptors ride these ridge lifts during migration, stringing together mountain ridges like stepping stones. Hawk Mountain in Pennsylvania is famous for this phenomenon.')),
              h('p', null, h('em', null, t('stem.migration.experiment_place_a_thermal_and_a_mount', 'Experiment: Place a thermal and a mountain on the field, then add a bird. Watch how it rides the updrafts!')))
            )
          ),

          // Weather forecasting for birds
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.birds_as_weather_forecasters', '\uD83C\uDF26\uFE0F Birds as Weather Forecasters')),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, t('stem.migration.birds_are_exquisitely_sensitive_to_wea', 'Birds are exquisitely sensitive to weather changes and have been used as "biological barometers" throughout history:')),
              h('ul', { className: 'list-disc pl-4 space-y-1' },
                h('li', null, h('strong', null, t('stem.migration.barometric_pressure', 'Barometric Pressure: ')), t('stem.migration.birds_can_detect_changes_in_barometric', 'Birds can detect changes in barometric pressure through specialized receptors in their middle ear (the paratympanic organ). When pressure drops before a storm, birds often fly lower and feed more intensely. Swallows flying low is a classic storm predictor.')),
                h('li', null, h('strong', null, 'Infrasound: '), t('stem.migration.some_birds_can_hear_infrasound_below_2', 'Some birds can hear infrasound (below 20 Hz) generated by distant storms, ocean waves, and even earthquakes. Golden-winged Warblers evacuated Tennessee 24 hours before a tornado system arrived in 2014, detected by GPS trackers. They flew 900+ miles to avoid the storms.')),
                h('li', null, h('strong', null, t('stem.migration.cold_fronts', 'Cold Fronts: ')), t('stem.migration.autumn_migration_is_strongly_correlate', 'Autumn migration is strongly correlated with cold front passage. Birds ride the northwesterly winds behind cold fronts, which provide both tailwinds and clear skies. Experienced birders watch weather maps to predict peak migration nights.')),
                h('li', null, h('strong', null, 'Fog: '), t('stem.migration.fog_is_dangerous_for_migrating_birds_b', 'Fog is dangerous for migrating birds because it obscures landmarks and celestial navigation cues. Foggy nights with low cloud ceilings cause "fallouts" where exhausted migrants land en masse at the first available habitat. These events, while stressful for birds, create spectacular birding opportunities.'))
              ),
              h('p', { className: 'mt-2 italic' }, t('stem.migration.when_the_swallows_fly_high_the_weather', '"When the swallows fly high, the weather will be dry. When the swallows fly low, rain is on the go." \u2014 This folk saying is actually scientifically accurate: insects (swallow food) fly higher in high-pressure systems and lower before storms.'))
            )
          ),

          // Particle physics legend
          h('div', { className: 'rounded-lg p-3 border ' + borderCol + ' ' + (isDark ? 'bg-slate-700/50' : 'bg-sky-50/50') },
            h('div', { className: 'text-[11px] font-bold mb-1 ' + textPrimary }, t('stem.migration.particle_color_guide', '\uD83C\uDFA8 Particle Color Guide')),
            h('div', { className: 'flex flex-wrap gap-3 text-[11px] ' + textSecondary },
              h('span', null, h('span', { style: { color: '#7dd3fc' } }, '\u25CF'), t('stem.migration.light_blue_slow_wind', ' Light blue = slow wind')),
              h('span', null, h('span', { style: { color: 'var(--allo-stem-text, #ffffff)' } }, '\u25CF'), t('stem.migration.white_moderate_wind', ' White = moderate wind')),
              h('span', null, h('span', { style: { color: '#fbbf24' } }, '\u25CF'), t('stem.migration.yellow_fast_wind', ' Yellow = fast wind')),
              h('span', null, h('span', { style: { color: '#22c55e', fontSize: '8px' } }, '\u25CF'), t('stem.migration.green_zone_upwash_rising_air', ' Green zone = upwash (rising air)')),
              h('span', null, h('span', { style: { color: '#ef4444', fontSize: '8px' } }, '\u25CF'), t('stem.migration.red_zone_downwash_sinking_air', ' Red zone = downwash (sinking air)'))
            )
          )
        );
      }

      // ══════════════════════════════════════════
      // TAB 3: MIGRATION ROUTE EXPLORER
      // ══════════════════════════════════════════
      function renderRoutes() {
        var canvasRef = _rtCanvasRef;
        var animRef = _rtAnimRef;
        var timeRef = _rtTimeRef;
        var selectedSpecies = d.selectedSpecies || null;
        var routeAnimProgress = d.routeAnimProgress || 0;
        var aiExplorerText = d.aiExplorerText || '';
        var aiExplorerLoading = d.aiExplorerLoading || false;

        // Flyway colors
        var FLYWAY_COLORS = {
          atlantic: { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.15)' },
          mississippi: { stroke: '#22c55e', fill: 'rgba(34,197,94,0.15)' },
          central: { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.15)' },
          pacific: { stroke: '#ef4444', fill: 'rgba(239,68,68,0.15)' }
        };

        // ── The four North American flyways, in real [lon, lat] ──────────
        // Traced from the corridors the flyways are actually defined by, then
        // projected. They used to be four near-parallel arcs drawn by eye in
        // design space, which put the Pacific Flyway out over the ocean and
        // ran the Mississippi Flyway nowhere near the Mississippi.
        //
        // Pacific:     Alaska and the Yukon, down the coast ranges and the
        //              Central Valley, into western Mexico.
        // Central:     the Mackenzie, the Prairie provinces, the Great Plains
        //              east of the Rockies, Texas, eastern Mexico.
        // Mississippi: western Hudson Bay and the boreal forest, the Great
        //              Lakes, then the Mississippi valley to the Gulf and on
        //              to the Yucatan.
        // Atlantic:    Ungava and Labrador, the Maritimes, the Atlantic
        //              seaboard, Florida, and into the Caribbean.
        var FLYWAY_LATLON = {
          pacific: [[-152, 67], [-145, 62], [-136, 57], [-126, 51], [-122, 45],
                    [-121, 39], [-118, 34], [-114, 30], [-109, 25], [-104, 20], [-96, 16]],
          central: [[-140, 68], [-128, 63], [-116, 57], [-110, 50], [-105, 44],
                    [-101, 38], [-99, 32], [-98, 27], [-98, 22], [-96, 18]],
          mississippi: [[-95, 64], [-95, 58], [-95, 52], [-93, 47], [-91, 43],
                        [-90, 39], [-90, 35], [-90, 31], [-89.5, 29], [-90, 25], [-89.8, 21.2]],
          atlantic: [[-70, 66], [-68, 60], [-66, 54], [-66, 48], [-70, 43],
                     [-74, 40], [-76, 36], [-79, 32], [-80.5, 28], [-80, 25], [-77, 22], [-73, 19]]
        };
        var FLYWAY_PATHS = {
          atlantic: FLYWAY_LATLON.atlantic.map(function(p) { return MIG_PROJ.xy(p[0], p[1]); }),
          mississippi: FLYWAY_LATLON.mississippi.map(function(p) { return MIG_PROJ.xy(p[0], p[1]); }),
          central: FLYWAY_LATLON.central.map(function(p) { return MIG_PROJ.xy(p[0], p[1]); }),
          pacific: FLYWAY_LATLON.pacific.map(function(p) { return MIG_PROJ.xy(p[0], p[1]); })
        };

        // ── Stopover sites, at their real coordinates ────────────────────
        // Each site is authored as [lon, lat] and projected, so a pin sits on
        // the place it names. They used to be design-space guesses: Delaware
        // Bay was drawn at 44.0N against the map's own graticule when the real
        // bay is at 39.1N, and the Gulf Coast pin was 8.2 degrees out.
        //
        // "Gulf Coast" was also filed under the Atlantic Flyway. The Gulf
        // crossing it describes is the Mississippi and Central corridors'
        // trans-Gulf route, so it is filed under Mississippi now.
        var STOPOVER_SRC = [
          { name: t('stem.migration.delaware_bay', 'Delaware Bay'), lon: -75.1, lat: 39.1, labelDy: -13, flyway: 'atlantic', fact: t('stem.migration.over_1_million_shorebirds_stop_here_to', 'Over 1 million shorebirds stop here to feast on horseshoe crab eggs') },
          { name: t('stem.migration.gulf_coast', 'Gulf Coast'), lon: -94.4, lat: 29.6, labelDy: 15, flyway: 'mississippi', fact: t('stem.migration.critical_rest_stop_after_the_500_mile_', 'Critical rest stop after the 500-mile Gulf of Mexico crossing') },
          { name: t('stem.migration.platte_river_ne', 'Platte River, NE'), lon: -98.5, lat: 40.8, flyway: 'central', fact: t('stem.migration.600_000_sandhill_cranes_gather_here_ea', '600,000 Sandhill Cranes gather here each spring \u2014 one of nature\'s greatest spectacles') },
          { name: t('stem.migration.great_salt_lake', 'Great Salt Lake'), lon: -112.5, lat: 41.1, flyway: 'pacific', fact: t('stem.migration.5_million_migratory_birds_depend_on_th', '5 million migratory birds depend on this inland sea as a refueling station') },
          { name: t('stem.migration.mississippi_delta', 'Mississippi Delta'), lon: -89.7, lat: 29.3, flyway: 'mississippi', fact: t('stem.migration.wetlands_here_support_40_of_north_amer', 'Wetlands here support 40% of North America\'s migratory waterfowl') },
          { name: t('stem.migration.chesapeake_bay', 'Chesapeake Bay'), lon: -76.2, lat: 37.8, labelDy: 15, flyway: 'atlantic', fact: t('stem.migration.largest_estuary_in_the_us_critical_win', 'Largest estuary in the US \u2014 critical wintering habitat for ducks and geese') }
        ];
        var STOPOVERS = STOPOVER_SRC.map(function(s) {
          var p = MIG_PROJ.pt(s.lon, s.lat);
          return { name: s.name, x: p[0], y: p[1], labelDy: s.labelDy, flyway: s.flyway, fact: s.fact, lon: s.lon, lat: s.lat };
        });

        var _rtInitCanvas = function(canvas) {
          if (!canvas) return;
          canvasRef.current = canvas;
          if (canvas._rtInit) return;
          canvas._rtInit = true;
          var c = canvas.getContext('2d');
          var dpr = window.devicePixelRatio || 1;
          var W = canvas.parentElement ? canvas.parentElement.clientWidth : 620;
          var H = Math.max(320, Math.min(500, Math.round(W * 0.645)));
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          canvas.style.width = W + 'px';
          canvas.style.height = H + 'px';
          c.setTransform(dpr, 0, 0, dpr, 0, 0);

          // Uniform fit of the 620x400 design box, centred; mapX/mapY are the
          // letterbox offsets applied via a translate around the map drawing.
          var mapScale = Math.min(W / 620, H / 400);
          var mapX = (W - 620 * mapScale) / 2;
          var mapY = (H - 400 * mapScale) / 2;
          var scaleX = mapScale;
          var scaleY = mapScale;

          var _flyIdlePainted = false;
          function frame() {
            // The _rtInit guard means this closure is the FIRST render's, so
            // anything read from render scope is frozen at mount. Shadow the
            // stale names with the live ref: every reference below is then live.
            var lv = _liveVals.current;
            var isDark = lv.isDark;
            var selectedSpecies = lv.selectedSpecies || null;
            // Nothing on the map animates until a species is chosen, so paint the
            // static version once and idle. A selection turns the loop back on —
            // previously the idle guard read a frozen null and never did.
            if (!selectedSpecies && _flyIdlePainted) { animRef.current = requestAnimationFrame(frame); return; }
            _flyIdlePainted = !selectedSpecies;
            timeRef.current += 0.016;
            c.clearRect(0, 0, W, H);

            // ── Ocean ──
            var oceanGrad = c.createLinearGradient(0, 0, 0, H);
            if (isDark) {
              oceanGrad.addColorStop(0, '#082f49');
              oceanGrad.addColorStop(0.55, '#0c4a6e');
              oceanGrad.addColorStop(1, '#075985');
            } else {
              oceanGrad.addColorStop(0, '#c7e9fb');
              oceanGrad.addColorStop(0.55, '#a5daf6');
              oceanGrad.addColorStop(1, '#8ccdf0');
            }
            c.fillStyle = oceanGrad;
            c.fillRect(0, 0, W, H);

            c.save();
            c.translate(mapX, mapY);

            // Graticule: parallels the land will paint over, so only the ocean
            // carries them — enough to read as a chart without adding clutter.
            c.strokeStyle = isDark ? 'rgba(186,230,253,0.10)' : 'rgba(3,105,161,0.10)';
            c.lineWidth = 0.7;
            // Graticule, drawn FROM the projection. On a conic the parallels
            // are arcs and the meridians converge toward the pole, so they are
            // sampled rather than drawn as straight rows. Both are labelled:
            // the old map drew unlabelled vertical lines that corresponded to
            // no longitude at all.
            var GRAT_LAT = [20, 30, 40, 50, 60, 70];
            var GRAT_LON = [-160, -140, -120, -100, -80, -60];
            var LON_LO = -170, LON_HI = -50, LAT_LO = 7, LAT_HI = 74;
            for (var gi = 0; gi < GRAT_LAT.length; gi++) {
              c.beginPath();
              for (var gl = LON_LO; gl <= LON_HI; gl += 4) {
                var gp = MIG_PROJ.pt(gl, GRAT_LAT[gi]);
                if (gl === LON_LO) c.moveTo(gp[0] * scaleX, gp[1] * scaleY);
                else c.lineTo(gp[0] * scaleX, gp[1] * scaleY);
              }
              c.stroke();
            }
            for (var gm = 0; gm < GRAT_LON.length; gm++) {
              c.beginPath();
              for (var gt = LAT_LO; gt <= LAT_HI; gt += 3) {
                var gq = MIG_PROJ.pt(GRAT_LON[gm], gt);
                if (gt === LAT_LO) c.moveTo(gq[0] * scaleX, gq[1] * scaleY);
                else c.lineTo(gq[0] * scaleX, gq[1] * scaleY);
              }
              c.stroke();
            }
            c.font = '7px system-ui';
            c.textBaseline = 'alphabetic';
            c.fillStyle = isDark ? 'rgba(186,230,253,0.42)' : 'rgba(3,105,161,0.42)';
            // Parallel labels sit ON their own arc at a fixed longitude out in
            // the open Pacific, with a halo so they read over water or land.
            // Labelling them at the canvas edge is geometrically correct and
            // pedagogically wrong: the arcs sweep upward toward the centre, so
            // at the far west every parallel sits far below the height it has
            // over the continent, and "20 deg N" would appear at about the
            // height of Oregon.
            // 20-50N are labelled out in the open Pacific; 60N and 70N would
            // land on Alaska there, so they are labelled on the Atlantic side.
            function migrLabelLon(lat) { return lat >= 60 ? -52 : -152; }
            function migrGratLabel(txt, px, py) {
              c.lineWidth = 2.4;
              c.strokeStyle = isDark ? 'rgba(2,20,40,0.75)' : 'rgba(255,255,255,0.80)';
              c.strokeText(txt, px, py);
              c.fillText(txt, px, py);
            }
            c.lineJoin = 'round';
            c.textAlign = 'center';
            for (var gj = 0; gj < GRAT_LAT.length; gj++) {
              var lp = MIG_PROJ.pt(migrLabelLon(GRAT_LAT[gj]), GRAT_LAT[gj]);
              migrGratLabel(GRAT_LAT[gj] + '°N', lp[0] * scaleX, lp[1] * scaleY - 3);
            }
            var edgeB = H - mapY - 4;
            for (var gk = 0; gk < GRAT_LON.length; gk++) {
              var mx = null;
              for (var mw = LAT_HI; mw >= LAT_LO; mw -= 2) {
                var mq = MIG_PROJ.pt(GRAT_LON[gk], mw);
                if (mq[1] * scaleY <= edgeB) { mx = mq[0] * scaleX; break; }
              }
              if (mx !== null) migrGratLabel(Math.abs(GRAT_LON[gk]) + '°W', mx, edgeB);
            }

            // ── North America ──
            // Biome tint: tundra grey at the pole, boreal and temperate green
            // through the mid-latitudes, arid tan toward the tropics.
            var landGrad = c.createLinearGradient(0, 0, 0, H);
            if (isDark) {
              landGrad.addColorStop(0, '#1e293b');
              landGrad.addColorStop(0.30, '#1f3030');
              landGrad.addColorStop(0.58, '#26332a');
              landGrad.addColorStop(0.82, '#2f3228');
              landGrad.addColorStop(1, '#382f24');
            } else {
              landGrad.addColorStop(0, '#dde5ec');
              landGrad.addColorStop(0.30, '#d8e6d3');
              landGrad.addColorStop(0.58, '#e2ecd6');
              landGrad.addColorStop(0.82, '#edead1');
              landGrad.addColorStop(1, '#f0e2c8');
            }
            var coastStroke = isDark ? '#64748b' : '#7c8ba1';

            // Soft surf halo so the coastline separates from the ocean.
            c.save();
            migrSmoothPath(c, MAP_COAST, scaleX, scaleY, true, 0.10);
            c.strokeStyle = isDark ? 'rgba(125,211,252,0.16)' : 'rgba(255,255,255,0.70)';
            c.lineWidth = 6;
            c.stroke();
            c.restore();

            migrSmoothPath(c, MAP_COAST, scaleX, scaleY, true, 0.10);
            c.fillStyle = landGrad;
            c.fill();
            c.strokeStyle = coastStroke;
            c.lineWidth = 1.4;
            c.stroke();

            // Relief: the cordilleras that funnel raptor migration. Clipped to
            // the mainland so no ridge mark spills into the ocean.
            c.save();
            migrSmoothPath(c, MAP_COAST, scaleX, scaleY, true, 0.10);
            c.clip();
            c.lineCap = 'round';
            var RELIEF_W = [5.0, 4.0, 3.1, 2.3, 1.5, 0.8];
            for (var mr = 0; mr < MAP_RANGES.length; mr++) {
              var rng = MAP_RANGES[mr];
              // Shaded relief has to sit DARKER than the land it crosses. A warm
              // grey satisfies that over the light theme's pale land and inverts
              // over the dark one: measured, the ridge came out 23 luminance
              // units darker than the plain in light and 27 units LIGHTER in
              // dark, so the cordilleras read as glowing bands. Shadow per theme.
              c.strokeStyle = isDark ? 'rgba(3,7,12,0.085)' : 'rgba(124,109,95,0.05)';
              for (var rw = 0; rw < RELIEF_W.length; rw++) {
                migrSmoothPath(c, rng.pts, scaleX, scaleY, false, 0.16);
                c.lineWidth = rng.hgt * RELIEF_W[rw] * scaleX;
                c.stroke();
              }
              // Sunlit north-west flank, offset and just as soft
              c.save();
              c.translate(-rng.hgt * 0.8 * scaleX, -rng.hgt * 0.6 * scaleY);
              c.strokeStyle = isDark ? 'rgba(188,199,212,0.05)' : 'rgba(255,255,255,0.11)';
              for (var rw2 = 2; rw2 < RELIEF_W.length; rw2++) {
                migrSmoothPath(c, rng.pts, scaleX, scaleY, false, 0.16);
                c.lineWidth = rng.hgt * RELIEF_W[rw2] * scaleX;
                c.stroke();
              }
              c.restore();
            }
            c.lineCap = 'butt';
            c.restore();

            // Offshore land. Alaska and Baja are no longer here: they are part of
            // the mainland ring now, which is what they are in reality.
            for (var isl = 0; isl < MAP_ISLANDS.length; isl++) {
              migrDrawLand(c, MAP_ISLANDS[isl], scaleX, scaleY, landGrad, coastStroke, 1);
            }
            // Aleutian chain as a dotted arc
            c.fillStyle = isDark ? '#334155' : '#c7d2dc';
            for (var al = 0; al < MAP_ALEUTIANS.length; al++) {
              c.beginPath();
              c.arc(MAP_ALEUTIANS[al][0] * scaleX, MAP_ALEUTIANS[al][1] * scaleY, Math.max(1.2, 2.6 - al * 0.4), 0, Math.PI * 2);
              c.fill();
            }

            // Hudson Bay — an inland sea, painted in the ocean colour.
            migrSmoothPath(c, MAP_HUDSON, scaleX, scaleY, true, 0.12);
            c.fillStyle = isDark ? '#0c4a6e' : '#a5daf6';
            c.fill();
            c.strokeStyle = isDark ? 'rgba(100,116,139,0.7)' : 'rgba(124,139,161,0.7)';
            c.lineWidth = 0.9;
            c.stroke();

            // Great Lakes, as real outlines rather than five ellipses.
            for (var lk = 0; lk < MAP_LAKES.length; lk++) {
              migrSmoothPath(c, MAP_LAKES[lk], scaleX, scaleY, true, 0.12);
              c.fillStyle = isDark ? '#0c4a6e' : '#a5daf6';
              c.fill();
              c.strokeStyle = isDark ? 'rgba(100,116,139,0.6)' : 'rgba(124,139,161,0.6)';
              c.lineWidth = 0.7;
              c.stroke();
            }

            // Rivers birds pilot along. The Mississippi is drawn first and
            // heaviest: it is the corridor its flyway is named after, and the
            // flyway line now actually follows it.
            for (var rv = 0; rv < MAP_RIVERS.length; rv++) {
              migrSmoothPath(c, MAP_RIVERS[rv], scaleX, scaleY, false, 0.16);
              c.strokeStyle = isDark ? 'rgba(56,189,248,0.40)' : 'rgba(56,141,199,0.34)';
              c.lineWidth = rv === 0 ? 1.3 : 0.85;
              c.stroke();
            }

            // ── Place names ──
            // Positioned by real longitude/latitude, so a label cannot drift
            // away from the thing it names when the coastline is edited.
            c.textAlign = 'center';
            c.textBaseline = 'alphabetic';
            for (var pl = 0; pl < MAP_PLACES.length; pl++) {
              var plc = MAP_PLACES[pl];
              if (plc.kind === 'water') {
                c.font = 'italic 7.5px system-ui';
                c.fillStyle = isDark ? 'rgba(125,211,252,0.55)' : 'rgba(3,105,161,0.50)';
              } else {
                c.font = 'bold 8px system-ui';
                c.fillStyle = isDark ? 'rgba(203,213,225,0.50)' : 'rgba(71,85,105,0.48)';
              }
              c.fillText(plc.text, plc.x * scaleX, plc.y * scaleY);
            }

            // Arc-length sample along a flyway polyline. u in [0,1] returns the
            // point plus the local heading, so chevrons and the animated bird
            // travel at a constant speed instead of accelerating through the
            // shorter segments the way a per-segment lerp does.
            function flywayPoint(pts, u) {
              var lens = [];
              var total = 0;
              for (var q = 0; q < pts.length - 1; q++) {
                var L = dist(pts[q].x, pts[q].y, pts[q + 1].x, pts[q + 1].y);
                lens.push(L);
                total += L;
              }
              var want = clamp(u, 0, 1) * total;
              var acc = 0;
              for (var q2 = 0; q2 < lens.length; q2++) {
                if (acc + lens[q2] >= want || q2 === lens.length - 1) {
                  var tt2 = lens[q2] > 0 ? clamp((want - acc) / lens[q2], 0, 1) : 0;
                  var pa = pts[q2], pb = pts[q2 + 1];
                  return {
                    x: lerp(pa.x, pb.x, tt2) * scaleX,
                    y: lerp(pa.y, pb.y, tt2) * scaleY,
                    ang: Math.atan2((pb.y - pa.y) * scaleY, (pb.x - pa.x) * scaleX)
                  };
                }
                acc += lens[q2];
              }
              return { x: pts[0].x * scaleX, y: pts[0].y * scaleY, ang: 0 };
            }

            function flywayStroke(pts) {
              c.beginPath();
              c.moveTo(pts[0].x * scaleX, pts[0].y * scaleY);
              for (var pi3 = 1; pi3 < pts.length; pi3++) {
                var prev = pts[pi3 - 1];
                var curr = pts[pi3];
                c.quadraticCurveTo(prev.x * scaleX, prev.y * scaleY, (prev.x + curr.x) / 2 * scaleX, (prev.y + curr.y) / 2 * scaleY);
              }
              c.quadraticCurveTo(pts[pts.length - 2].x * scaleX, pts[pts.length - 2].y * scaleY, pts[pts.length - 1].x * scaleX, pts[pts.length - 1].y * scaleY);
            }

            // ── Flyways: a translucent corridor, a centreline, and chevrons
            // that show which way the birds are actually travelling ──
            var flyways = ['atlantic', 'mississippi', 'central', 'pacific'];
            var activeFlyway = selectedSpecies ? getSpeciesById(selectedSpecies).flyway : null;
            for (var fi = 0; fi < flyways.length; fi++) {
              var fw = flyways[fi];
              var pts = FLYWAY_PATHS[fw];
              var col = FLYWAY_COLORS[fw];
              var isActive = activeFlyway === fw;

              c.save();
              c.lineCap = 'round';
              c.lineJoin = 'round';
              // Corridor band — a flyway is a broad region, not a wire
              flywayStroke(pts);
              c.strokeStyle = migrAlpha(col.stroke, isActive ? 0.20 : 0.09);
              c.lineWidth = isActive ? 20 : 11;
              c.stroke();
              // Centreline
              flywayStroke(pts);
              if (isActive) {
                c.shadowColor = migrAlpha(col.stroke, 0.85);
                c.shadowBlur = 9;
              }
              c.strokeStyle = migrAlpha(col.stroke, isActive ? 0.98 : 0.5);
              c.lineWidth = isActive ? 3.4 : 1.6;
              c.stroke();
              c.shadowColor = 'transparent';
              c.shadowBlur = 0;
              c.restore();

              // Direction chevrons drifting south along the corridor
              var CHEV = 8;
              var flow = (timeRef.current * 0.05) % (1 / CHEV);
              c.save();
              c.strokeStyle = migrAlpha(col.stroke, isActive ? 0.95 : 0.42);
              c.lineWidth = isActive ? 1.8 : 1.2;
              c.lineCap = 'round';
              for (var ck = 0; ck < CHEV; ck++) {
                var cu = ck / CHEV + flow;
                if (cu > 0.97) continue;
                var cp = flywayPoint(pts, cu);
                var chs = isActive ? 5 : 3.4;
                c.save();
                c.translate(cp.x, cp.y);
                c.rotate(cp.ang);
                c.beginPath();
                c.moveTo(-chs, -chs * 0.8);
                c.lineTo(chs * 0.5, 0);
                c.lineTo(-chs, chs * 0.8);
                c.stroke();
                c.restore();
              }
              c.restore();

              // Flyway name, set at a different depth on each corridor so the
              // four labels never stack, and kept legible over land or water.
              var lp = flywayPoint(pts, 0.24 + fi * 0.055);
              migrChip(c, lp.x, lp.y,
                fw.charAt(0).toUpperCase() + fw.slice(1),
                isDark ? '#f8fafc' : '#0f172a',
                migrAlpha(col.stroke, isActive ? 0.62 : 0.30),
                'bold ' + (isActive ? 9 : 8) + 'px system-ui');
            }

            // Breeding and wintering ranges for the selected species: soft
            // haloes at the two ends of its corridor.
            if (selectedSpecies) {
              var spR = getSpeciesById(selectedSpecies);
              var srR = MAP_SPECIES_ROUTES[spR.id];
              // The species' OWN route, not the two ends of its flyway.
              var ptsR = (srR && srR.pts.length > 1) ? srR.pts : FLYWAY_PATHS[spR.flyway];
              var colR = FLYWAY_COLORS[spR.flyway].stroke;
              var offMapR = srR && srR.offMap;
              // The species' own track. Without it the breeding halo, the bird
              // and the off-map arrow are three marks with nothing joining
              // them, and a route that leaves the sheet reads as a stray arrow
              // in the ocean.
              if (ptsR && ptsR.length > 1) {
                c.save();
                c.setLineDash([5, 4]);
                c.lineWidth = 2.2;
                c.lineCap = 'round';
                c.strokeStyle = migrAlpha(colR, 0.55);
                c.beginPath();
                c.moveTo(ptsR[0].x * scaleX, ptsR[0].y * scaleY);
                for (var rp = 1; rp < ptsR.length; rp++) {
                  c.lineTo(ptsR[rp].x * scaleX, ptsR[rp].y * scaleY);
                }
                c.stroke();
                c.restore();
              }
              var ends = [
                { u: 0.03, r: 42, dy: 22, label: t('stem.migration.breeding', 'Breeding'), tint: '#22c55e' }
              ];
              // Only claim a wintering ground on this sheet if the bird
              // actually winters on it.
              if (!offMapR) {
                ends.push({ u: 0.97, r: 42, dy: -22, label: t('stem.migration.wintering', 'Wintering'), tint: '#f59e0b' });
              }
              for (var en = 0; en < ends.length; en++) {
                var ep = flywayPoint(ptsR, ends[en].u);
                var rg = c.createRadialGradient(ep.x, ep.y, 2, ep.x, ep.y, ends[en].r);
                rg.addColorStop(0, migrAlpha(ends[en].tint, 0.34));
                rg.addColorStop(1, migrAlpha(ends[en].tint, 0));
                c.fillStyle = rg;
                c.beginPath();
                c.arc(ep.x, ep.y, ends[en].r, 0, Math.PI * 2);
                c.fill();
                // Set the caption BESIDE the halo, perpendicular to the route,
                // not on it. Stacked above or below it sat in the flight lane,
                // where the animated bird and its own name chip pass through
                // every cycle — "Breeding" and "Sandhill Crane" overprinted each
                // other on each lap.
                var perpX = Math.sin(ep.ang) * 52;
                var perpY = -Math.cos(ep.ang) * 52;
                migrChip(c, ep.x + perpX, ep.y + perpY + ends[en].dy * 0.25, ends[en].label,
                  isDark ? '#f8fafc' : '#0f172a', migrAlpha(ends[en].tint, 0.55), 'bold 8px system-ui');
              }
              // A route that leaves the sheet says so, on the edge, naming
              // where it carries on to.
              if (offMapR) {
                var exitP = ptsR[Math.min(srR.exitIdx, ptsR.length - 1)];
                var prevP = ptsR[Math.max(0, Math.min(srR.exitIdx, ptsR.length - 1) - 1)];
                var exAng = Math.atan2((exitP.y - prevP.y) * scaleY, (exitP.x - prevP.x) * scaleX);
                var ex = exitP.x * scaleX, ey = exitP.y * scaleY;
                c.save();
                c.translate(ex, ey);
                c.rotate(exAng);
                c.fillStyle = migrAlpha('#f59e0b', 0.92);
                c.beginPath();
                c.moveTo(10, 0); c.lineTo(-4, -5.5); c.lineTo(-4, 5.5);
                c.closePath();
                c.fill();
                c.restore();
                migrChip(c, ex + Math.cos(exAng) * 40, ey + Math.sin(exAng) * 40,
                  (t('stem.migration.continues_to', 'continues to') + ' ' + offMapR),
                  isDark ? '#f8fafc' : '#0f172a', migrAlpha('#f59e0b', 0.55), 'bold 8px system-ui');
              }
              void colR;
            }

            // ── Stopover pins ──
            for (var si = 0; si < STOPOVERS.length; si++) {
              var sp = STOPOVERS[si];
              var spActive = activeFlyway === sp.flyway;
              var px2 = sp.x * scaleX;
              var py2 = sp.y * scaleY;
              var pr = spActive ? 5 : 3.4;
              if (spActive) {
                // Radar pulse marks the sites the selected species depends on
                var pulse = (timeRef.current * 0.6) % 1;
                c.beginPath();
                c.arc(px2, py2, 6 + pulse * 16, 0, Math.PI * 2);
                c.strokeStyle = 'rgba(251,191,36,' + (0.5 * (1 - pulse)).toFixed(3) + ')';
                c.lineWidth = 1.6;
                c.stroke();
              }
              var pinFill = spActive ? '#fbbf24' : (isDark ? '#64748b' : '#94a3b8');
              c.save();
              c.shadowColor = 'rgba(15,23,42,0.35)';
              c.shadowBlur = 4;
              c.shadowOffsetY = 1;
              c.beginPath();
              c.moveTo(px2, py2);
              c.lineTo(px2 - pr * 0.76, py2 - pr * 1.95);
              c.lineTo(px2 + pr * 0.76, py2 - pr * 1.95);
              c.closePath();
              c.fillStyle = pinFill;
              c.fill();
              c.beginPath();
              c.arc(px2, py2 - pr * 2.3, pr, 0, Math.PI * 2);
              c.fill();
              c.restore();
              c.strokeStyle = spActive ? '#b45309' : (isDark ? '#334155' : '#64748b');
              c.lineWidth = 0.9;
              c.stroke();
              c.beginPath();
              c.arc(px2, py2 - pr * 2.3, pr * 0.38, 0, Math.PI * 2);
              c.fillStyle = spActive ? '#7c2d12' : (isDark ? '#0f172a' : '#f8fafc');
              c.fill();
              if (spActive) {
                migrChip(c, px2, py2 - pr * 2.3 + (sp.labelDy != null ? sp.labelDy : -13), sp.name,
                  isDark ? '#fef3c7' : '#78350f',
                  isDark ? 'rgba(2,6,23,0.85)' : 'rgba(254,243,199,0.95)', 'bold 8px system-ui');
              }
            }

            // ── The species itself, flying its route ──
            if (selectedSpecies) {
              var sp2 = getSpeciesById(selectedSpecies);
              var sr2 = MAP_SPECIES_ROUTES[sp2.id];
              var pts2 = (sr2 && sr2.pts.length > 1) ? sr2.pts : FLYWAY_PATHS[sp2.flyway];
              if (pts2 && pts2.length > 1) {
                var prog = (timeRef.current * 0.09) % 1;
                var here = flywayPoint(pts2, prog);
                var trailCol = FLYWAY_COLORS[sp2.flyway].stroke;
                // Fading track behind the bird: the distance already flown
                c.save();
                c.lineCap = 'round';
                for (var tr = 1; tr <= 10; tr++) {
                  var tu = prog - tr * 0.012;
                  if (tu < 0) break;
                  var tp = flywayPoint(pts2, tu);
                  c.beginPath();
                  c.arc(tp.x, tp.y, 2.6 - tr * 0.2, 0, Math.PI * 2);
                  c.fillStyle = migrAlpha(trailCol, 0.42 * (1 - tr / 11));
                  c.fill();
                }
                c.restore();

                // Heading down-route: the silhouette is drawn nose-first along
                // the local tangent rather than always pointing left.
                c.save();
                c.translate(here.x, here.y);
                c.rotate(here.ang);
                drawBird(c, 0, 0, sp2.id === 'ruby_hummingbird' ? 7 : 9, timeRef.current * 5, 1,
                  migrShade(trailCol, isDark ? 0.10 : -0.05), isDark,
                  SPECIES_SILHOUETTE[sp2.id] || 'generic');
                c.restore();
                migrChip(c, here.x, here.y - 20, sp2.name,
                  isDark ? '#f8fafc' : '#0f172a',
                  migrAlpha(trailCol, 0.55), 'bold 8px system-ui');
              }
            }

            // ── Legend ──
            c.restore(); // end map transform - the HUD below is in canvas pixels

            var legendItems = [
              { color: '#3b82f6', label: t('stem.migration.atlantic', 'Atlantic') },
              { color: '#22c55e', label: t('stem.migration.mississippi', 'Mississippi') },
              { color: '#f59e0b', label: t('stem.migration.central', 'Central') },
              { color: '#ef4444', label: t('stem.migration.pacific', 'Pacific') }
            ];
            var lgW = 128;
            var lgH = 26 + legendItems.length * 12 + 14;
            var lgX = W - lgW - 8;
            var lgY = H - lgH - 8;
            migrPanel(c, lgX, lgY, lgW, lgH, isDark, '#0ea5e9');
            c.textAlign = 'left';
            c.textBaseline = 'alphabetic';
            c.font = 'bold 9px system-ui';
            c.fillStyle = isDark ? '#e2e8f0' : '#0f172a';
            c.fillText(t('stem.migration.flyways_legend', 'Flyways'), lgX + 10, lgY + 15);
            for (var li2 = 0; li2 < legendItems.length; li2++) {
              var ly = lgY + 27 + li2 * 12;
              c.beginPath();
              c.moveTo(lgX + 10, ly);
              c.lineTo(lgX + 26, ly);
              c.strokeStyle = legendItems[li2].color;
              c.lineWidth = 3;
              c.lineCap = 'round';
              c.stroke();
              c.lineCap = 'butt';
              c.fillStyle = isDark ? '#cbd5e1' : '#334155';
              c.font = '8px system-ui';
              c.fillText(legendItems[li2].label, lgX + 32, ly + 3);
            }
            // Stopover swatch, drawn as the same pin used on the map
            var swY = lgY + lgH - 8;
            c.beginPath();
            c.moveTo(lgX + 17, swY);
            c.lineTo(lgX + 14, swY - 6);
            c.lineTo(lgX + 20, swY - 6);
            c.closePath();
            c.fillStyle = '#fbbf24';
            c.fill();
            c.beginPath();
            c.arc(lgX + 17, swY - 7.5, 3, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = isDark ? '#cbd5e1' : '#334155';
            c.font = '8px system-ui';
            c.fillText(t('stem.migration.stopover_site', 'Stopover site'), lgX + 32, swY - 2);

            // ── Title (bottom-left: the top-left corner is Alaska) ──
            migrPanel(c, 8, H - 34, 208, 26, isDark, '#0ea5e9');
            c.fillStyle = isDark ? '#e2e8f0' : '#0f172a';
            c.font = 'bold 11px system-ui';
            c.textAlign = 'left';
            c.textBaseline = 'alphabetic';
            c.fillText('\uD83D\uDDFA\uFE0F North American Flyways', 17, H - 17);

            animRef.current = requestAnimationFrame(frame);
          }

          frame();

          // Cleanup via MutationObserver (callback refs must not return a function in React 18)
          var obs3 = new MutationObserver(function() {
            if (!document.contains(canvas)) {
              if (animRef.current) cancelAnimationFrame(animRef.current);
              obs3.disconnect();
              canvas._rtInit = false;
            }
          });
          obs3.observe(document.body, { childList: true, subtree: true });
        };

        function getSpeciesById(id) {
          for (var i = 0; i < SPECIES.length; i++) {
            if (SPECIES[i].id === id) return SPECIES[i];
          }
          return SPECIES[0];
        }

        function handleAIExplorer() {
          if (!selectedSpecies || !callGemini || d.aiExplorerLoading) return; // prevent double-click
          var sp = getSpeciesById(selectedSpecies);
          var reqId = Date.now();
          updMulti({ aiExplorerLoading: true, aiExplorerReqId: reqId });
          var prompt = 'You are a wildlife biologist teaching grade ' + (gradeLevel || 5) + ' students. Tell me 3 fascinating facts about ' + sp.name + ' migration that most people don\'t know. Include one fact about their navigation, one about their physical adaptations, and one about conservation. Keep each fact to 1-2 sentences. Format as numbered list.';
          callGemini(prompt).then(function(result) {
            // Only update if this is still the latest request
            if (d.aiExplorerReqId === reqId || !d.aiExplorerReqId) {
              updMulti({ aiExplorerText: result, aiExplorerLoading: false });
            }
          }).catch(function() {
            updMulti({ aiExplorerText: 'Could not load AI facts. Try again later.', aiExplorerLoading: false });
          });
        }

        return h('div', { className: 'space-y-3' },
          // Map canvas
          h('div', { className: 'rounded-xl overflow-hidden border ' + borderCol },
            h('canvas', {
              ref: _rtInitCanvas,
              role: 'img',
              'aria-label': 'Migration route map of North America showing four flyways: Atlantic, Mississippi, Central, and Pacific. ' + (selectedSpecies ? 'Currently tracking ' + getSpeciesById(selectedSpecies).name : 'Select a species to see its route.'),
              tabIndex: 0,
              onKeyDown: function(e) {
                // Arrow keys to cycle species
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  var idx = 0;
                  for (var i = 0; i < SPECIES.length; i++) {
                    if (SPECIES[i].id === selectedSpecies) { idx = i; break; }
                  }
                  var next = (idx + 1) % SPECIES.length;
                  updMulti({ selectedSpecies: SPECIES[next].id, aiExplorerText: '' });
                  if (announceToSR) announceToSR('Selected ' + SPECIES[next].name);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  var idx2 = 0;
                  for (var i2 = 0; i2 < SPECIES.length; i2++) {
                    if (SPECIES[i2].id === selectedSpecies) { idx2 = i2; break; }
                  }
                  var prev = (idx2 - 1 + SPECIES.length) % SPECIES.length;
                  updMulti({ selectedSpecies: SPECIES[prev].id, aiExplorerText: '' });
                  if (announceToSR) announceToSR('Selected ' + SPECIES[prev].name);
                }
              },
              style: { width: '100%', display: 'block' }
            })
          ),

          // Species selector
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
            SPECIES.map(function(sp) {
              var active = selectedSpecies === sp.id;
              var fwColor = FLYWAY_COLORS[sp.flyway];
              return h('button', {
                key: sp.id,
                className: 'p-2 rounded-lg text-left transition-all border ' + (active ? 'ring-2 ring-sky-400 border-sky-400 ' + accentBg : borderCol + ' ' + cardBg + ' hover:border-sky-600'),
                'aria-label': sp.name + ', ' + sp.flyway + ' flyway, ' + sp.distance + ' miles',
                'aria-pressed': active ? 'true' : 'false',
                onClick: function() {
                  updMulti({ selectedSpecies: sp.id, routeAnimProgress: 0, aiExplorerText: '', routesPlanned: (d.routesPlanned || 0) + (active ? 0 : 1) });
                  if (beep) beep(880, 0.06, 0.08);
                  if (announceToSR) announceToSR('Selected ' + sp.name + '. ' + sp.flyway + ' flyway.');
                }
              },
                h('div', { className: 'flex items-center gap-1.5' },
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, sp.emoji),
                  h('div', null,
                    h('div', { className: 'text-[11px] font-bold ' + textPrimary }, sp.name),
                    h('div', { className: 'text-[11px] ' + textMuted },
                      h('span', { style: { color: fwColor.stroke } }, '\u25CF'),
                      ' ' + sp.flyway.charAt(0).toUpperCase() + sp.flyway.slice(1) + ' \u2022 ' + sp.distance.toLocaleString() + ' mi'
                    )
                  )
                )
              );
            })
          ),

          // Species info card
          selectedSpecies && (function() {
            var sp = getSpeciesById(selectedSpecies);
            return h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg + ' space-y-2' },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-2xl', 'aria-hidden': 'true' }, sp.emoji),
                h('div', null,
                  h('h3', { className: 'font-bold text-sm ' + textPrimary }, sp.name),
                  h('div', { className: 'text-[11px] ' + textMuted }, sp.formation + ' \u2022 ' + sp.flyway.charAt(0).toUpperCase() + sp.flyway.slice(1) + ' Flyway')
                )
              ),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 text-center' },
                [
                  { label: t('stem.migration.distance', 'Distance'), value: sp.distance.toLocaleString() + ' mi' },
                  { label: t('stem.migration.speed', 'Speed'), value: sp.speed + ' mph' },
                  { label: t('stem.migration.altitude', 'Altitude'), value: sp.altitude.toLocaleString() + ' ft' },
                  { label: t('stem.migration.formation', 'Formation'), value: sp.formation }
                ].map(function(stat) {
                  return h('div', { key: stat.label, className: 'rounded-lg p-2 ' + (isDark ? 'bg-slate-700' : 'bg-white') },
                    h('div', { className: 'text-xs font-bold ' + accent }, stat.value),
                    h('div', { className: 'text-[11px] ' + textMuted }, stat.label)
                  );
                })
              ),
              h('div', { className: 'text-xs ' + textSecondary },
                h('div', { className: 'mb-1' }, h('strong', null, 'Breeding: '), sp.breedingRange),
                h('div', { className: 'mb-1' }, h('strong', null, 'Wintering: '), sp.winterRange),
                h('div', null, h('strong', null, t('stem.migration.fun_fact', 'Fun Fact: ')), sp.funFact)
              ),

              // AI Explorer
              h('div', { className: 'flex items-center gap-2 mt-2' },
                h('button', {
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + btnPrimary,
                  'aria-label': 'Ask AI for more facts about ' + sp.name,
                  disabled: aiExplorerLoading,
                  onClick: handleAIExplorer
                }, aiExplorerLoading ? '\u23F3 Loading...' : '\u2728 AI Explorer')
              ),
              aiExplorerText && h('div', { className: 'text-xs p-3 rounded-lg ' + (isDark ? 'bg-slate-700' : 'bg-sky-50') + ' ' + textSecondary + ' whitespace-pre-wrap', 'aria-live': 'polite', 'aria-atomic': 'true' }, aiExplorerText)
            );
          })(),

          // Flyway comparison table
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.the_four_north_american_flyways', '\uD83D\uDDFA\uFE0F The Four North American Flyways')),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
              [
                { name: t('stem.migration.atlantic_2', 'Atlantic'), color: '#3b82f6', emoji: '\uD83C\uDF0A', birds: '~500 species', terrain: 'Coastal marshes, barrier islands, estuaries', key: 'Delaware Bay, Chesapeake Bay stopover sites' },
                { name: t('stem.migration.mississippi_2', 'Mississippi'), color: '#22c55e', emoji: '\uD83C\uDF3F', birds: '~325 species', terrain: 'River bottomlands, wetlands, delta marshes', key: 'Mississippi River acts as a north-south highway' },
                { name: t('stem.migration.central_2', 'Central'), color: '#f59e0b', emoji: '\uD83C\uDF3E', birds: '~300 species', terrain: 'Great Plains, prairies, playas', key: 'Platte River hosts 600,000 Sandhill Cranes each spring' },
                { name: t('stem.migration.pacific_2', 'Pacific'), color: '#ef4444', emoji: '\uD83C\uDF0B', birds: '~350 species', terrain: 'Coastline, mountains, inland valleys', key: 'Pacific Coast provides continuous north-south corridor' }
              ].map(function(fw) {
                return h('div', { key: fw.name, className: 'rounded-lg p-3 border ' + borderCol + ' ' + (isDark ? 'bg-slate-700/50' : 'bg-white') },
                  h('div', { className: 'flex items-center gap-1.5 mb-1.5' },
                    h('div', { className: 'w-2.5 h-2.5 rounded-full', style: { backgroundColor: fw.color } }),
                    h('span', { className: 'text-xs font-bold ' + textPrimary }, fw.name)
                  ),
                  h('div', { className: 'space-y-1 text-[11px] ' + textSecondary },
                    h('div', null, h('strong', null, 'Species: '), fw.birds),
                    h('div', null, h('strong', null, 'Terrain: '), fw.terrain),
                    h('div', null, h('strong', null, 'Key: '), fw.key)
                  )
                );
              })
            )
          ),

          // Migration timing
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.when_do_birds_migrate', '\uD83D\uDCC5 When Do Birds Migrate?')),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, t('stem.migration.migration_timing_varies_dramatically_b', 'Migration timing varies dramatically by species:')),
              h('div', { className: 'grid grid-cols-2 gap-2 mt-2' },
                [
                  { period: 'Feb-Mar', desc: t('stem.migration.early_spring_waterfowl_ducks_geese_hea', 'Early spring: Waterfowl (ducks, geese) head north following ice melt. Red-winged Blackbirds return to marshes.') },
                  { period: 'Apr-May', desc: t('stem.migration.peak_spring_warblers_vireos_tanagers_f', 'Peak spring: Warblers, vireos, tanagers flood northward. Most songbirds migrate at night. Peak nights see 500+ million birds in the air.') },
                  { period: 'Jul-Aug', desc: t('stem.migration.shorebirds_start_south_some_species_fa', 'Shorebirds start south \u2014 some species "fail" on breeding grounds and begin returning in early July. Adults often leave before juveniles.') },
                  { period: 'Sep-Nov', desc: t('stem.migration.peak_fall_raptors_ride_thermals_along_', 'Peak fall: Raptors ride thermals along mountain ridges. Songbirds follow cold fronts south. Geese fly in V-formation at night.') }
                ].map(function(time) {
                  return h('div', { key: time.period, className: 'rounded-lg p-2 ' + (isDark ? 'bg-slate-700/50' : 'bg-sky-50') },
                    h('div', { className: 'text-[11px] font-bold ' + accent + ' mb-0.5' }, time.period),
                    h('p', { className: 'text-[11px] ' + textSecondary }, time.desc)
                  );
                })
              ),
              h('p', { className: 'mt-2 italic' }, t('stem.migration.photoperiod_day_length_is_the_primary_', 'Photoperiod (day length) is the primary trigger for migration. As days shorten in autumn, hormones trigger "Zugunruhe" \u2014 migratory restlessness \u2014 and birds begin adding fat stores (hyperphagia), sometimes doubling their body weight.'))
            )
          ),

          // Stopover ecology
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.stopover_ecology', '\u26FA Stopover Ecology')),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, t('stem.migration.stopovers_are_not_just_rest_stops_they', 'Stopovers are not just rest stops \u2014 they are '), h('strong', null, t('stem.migration.refueling_stations', 'refueling stations')), t('stem.migration.critical_to_survival_a_migrating_warbl', ' critical to survival. A migrating warbler may spend 75% of its migration time at stopovers, eating frantically to rebuild fat stores. Quality stopover habitat can mean the difference between life and death.')),
              h('p', null, t('stem.migration.at_delaware_bay_over_1_million_shorebi', 'At Delaware Bay, over 1 million shorebirds (Red Knots, Ruddy Turnstones, Sanderlings) depend on horseshoe crab eggs laid in May. The timing must be perfect: the birds arrive exactly when crabs spawn. If crab populations decline (from overharvesting for bait), the entire migration chain collapses.')),
              h('p', null, h('em', null, t('stem.migration.conservation_success_story_after_horse', 'Conservation success story: After horseshoe crab harvest limits were imposed in 2012, Red Knot populations began slowly recovering from a critical low of 15,000 to over 50,000 by 2025.')))
            )
          ),

          // Migration physiology
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.migration_physiology', '\uD83E\uDDB4 Migration Physiology')),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, t('stem.migration.migration_is_one_of_the_most_physicall', 'Migration is one of the most physically demanding activities in the animal kingdom. Birds undergo remarkable physiological transformations before departure:')),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2' },
                [
                  { title: t('stem.migration.hyperphagia', 'Hyperphagia'), emoji: '\uD83C\uDF57', text: t('stem.migration.before_migration_birds_enter_a_feeding', 'Before migration, birds enter a feeding frenzy called hyperphagia, consuming food at 2-3 times their normal rate. A Blackpoll Warbler (12g) adds 8-12g of fat stores, nearly doubling its body weight. This fat is the fuel for non-stop flights of 2,000+ miles.') },
                  { title: t('stem.migration.organ_shrinkage', 'Organ Shrinkage'), emoji: '\uD83E\uDEC1', text: t('stem.migration.to_reduce_weight_migrating_birds_actua', 'To reduce weight, migrating birds actually shrink their digestive organs (intestines, liver, gizzard) by up to 40% before departure. Upon arrival at stopovers, they rapidly regrow these organs to refuel. This "phenotypic flexibility" is unique among vertebrates.') },
                  { title: t('stem.migration.hemoglobin', 'Hemoglobin'), emoji: '\uD83E\uDE78', text: t('stem.migration.high_altitude_migrants_like_bar_headed', 'High-altitude migrants like Bar-headed Geese (which fly over the Himalayas at 29,000 ft) have special hemoglobin with higher oxygen affinity. Their muscles contain extra myoglobin, and their capillary density is double that of lowland species.') },
                  { title: t('stem.migration.sleep_in_flight', 'Sleep in Flight'), emoji: '\uD83D\uDE34', text: t('stem.migration.some_birds_can_sleep_while_flying_usin', 'Some birds can sleep while flying using "unihemispheric sleep" \u2014 shutting down one brain hemisphere at a time. Frigate birds have been recorded sleeping for 42 minutes per day during 10-day transoceanic flights, taking micro-naps of 12 seconds each.') },
                  { title: t('stem.migration.navigation_clock', 'Navigation Clock'), emoji: '\u23F0', text: t('stem.migration.birds_maintain_an_internal_circadian_c', 'Birds maintain an internal circadian clock with extraordinary precision. This clock compensates for the sun\'s movement across the sky (time-compensated sun compass) and tracks seasonal changes in day length that trigger migration hormones.') },
                  { title: t('stem.migration.zugunruhe', 'Zugunruhe'), emoji: '\uD83C\uDF19', text: t('stem.migration.zugunruhe_migration_restlessness_is_a_', 'Zugunruhe ("migration restlessness") is a behavioral state where caged migratory birds flutter in the direction they would naturally migrate, at the time they would migrate. It is hormonally driven and genetically encoded. Even hand-raised birds with no migratory experience display Zugunruhe.') }
                ].map(function(phys) {
                  return h('div', { key: phys.title, className: 'rounded-lg p-2.5 border ' + borderCol + ' ' + (isDark ? 'bg-slate-700/50' : 'bg-white') },
                    h('div', { className: 'flex items-center gap-1.5 mb-1' },
                      h('span', { className: 'text-base', 'aria-hidden': 'true' }, phys.emoji),
                      h('span', { className: 'text-[11px] font-bold ' + textPrimary }, phys.title)
                    ),
                    h('p', { className: 'text-[11px] leading-relaxed ' + textSecondary }, phys.text)
                  );
                })
              )
            )
          ),

          // Species comparison table
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.species_comparison', '\uD83D\uDCCA Species Comparison')),
            h('div', { className: 'overflow-x-auto' },
              h('table', { className: 'w-full text-[11px] ' + textSecondary, role: 'table' },
                h('thead', null,
                  h('tr', { className: 'border-b ' + borderCol },
                    ['Species', 'Distance', 'Speed', 'Altitude', 'Weight', 'Flyway', 'Formation'].map(function(col) {
                      return h('th', { key: col, scope: 'col', className: 'text-left py-1.5 px-1 font-bold ' + textPrimary }, col);
                    })
                  )
                ),
                h('tbody', null,
                  [
                    { name: t('stem.migration.canada_goose', 'Canada Goose'), dist: '3,000 mi', spd: '40 mph', alt: t('stem.migration.3_000_ft', '3,000 ft'), wt: '3.5-6 kg', fw: 'Atlantic', form: 'V-formation' },
                    { name: t('stem.migration.arctic_tern', 'Arctic Tern'), dist: '44,000 mi', spd: '25 mph', alt: t('stem.migration.1_500_ft', '1,500 ft'), wt: '100 g', fw: 'Atlantic', form: 'Loose flock' },
                    { name: t('stem.migration.ruby_thr_hummingbird', 'Ruby-thr. Hummingbird'), dist: '3,000 mi', spd: '30 mph', alt: t('stem.migration.500_ft', '500 ft'), wt: '3.5 g', fw: 'Mississippi', form: 'Solo' },
                    { name: t('stem.migration.snow_goose', 'Snow Goose'), dist: '5,000 mi', spd: '50 mph', alt: t('stem.migration.7_500_ft', '7,500 ft'), wt: '2.5-3.5 kg', fw: 'Central', form: 'V-formation' },
                    { name: t('stem.migration.peregrine_falcon', 'Peregrine Falcon'), dist: '15,500 mi', spd: '60 mph', alt: t('stem.migration.3_500_ft', '3,500 ft'), wt: '0.5-1.5 kg', fw: 'Pacific', form: 'Solo' },
                    { name: t('stem.migration.sandhill_crane', 'Sandhill Crane'), dist: '6,000 mi', spd: '35 mph', alt: t('stem.migration.6_000_ft', '6,000 ft'), wt: '3-5 kg', fw: 'Central', form: 'V-formation' },
                    { name: t('stem.migration.monarch_butterfly', 'Monarch Butterfly'), dist: '3,000 mi', spd: '12 mph', alt: t('stem.migration.1_200_ft', '1,200 ft'), wt: '0.5 g', fw: 'Central', form: 'Swarm' },
                    { name: t('stem.migration.bar_tailed_godwit', 'Bar-tailed Godwit'), dist: '7,000 mi', spd: '55 mph', alt: t('stem.migration.6_000_ft_2', '6,000 ft'), wt: '300 g', fw: 'Pacific', form: 'V-formation' }
                  ].map(function(row, ri2) {
                    return h('tr', { key: ri2, className: 'border-b ' + borderCol + ' ' + (ri2 % 2 === 0 ? (isDark ? 'bg-slate-800/30' : 'bg-slate-50/50') : '') },
                      h('td', { className: 'py-1 px-1 font-medium ' + textPrimary }, row.name),
                      h('td', { className: 'py-1 px-1' }, row.dist),
                      h('td', { className: 'py-1 px-1' }, row.spd),
                      h('td', { className: 'py-1 px-1' }, row.alt),
                      h('td', { className: 'py-1 px-1' }, row.wt),
                      h('td', { className: 'py-1 px-1' }, row.fw),
                      h('td', { className: 'py-1 px-1' }, row.form)
                    );
                  })
                )
              )
            ),
            h('p', { className: 'text-[11px] mt-2 italic ' + textMuted }, t('stem.migration.distances_are_approximate_annual_migra', 'Distances are approximate annual migration distances. Speeds are typical cruising speeds. Altitude is typical migration altitude.'))
          ),

          // Technology & tracking
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.how_scientists_track_migration', '\uD83D\uDCE1 How Scientists Track Migration')),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, t('stem.migration.our_understanding_of_migration_has_bee', 'Our understanding of migration has been revolutionized by technology:')),
              h('ul', { className: 'list-disc pl-4 space-y-1.5 mt-1' },
                h('li', null, h('strong', null, t('stem.migration.bird_banding', 'Bird Banding: ')), t('stem.migration.since_1920_over_80_million_birds_have_', 'Since 1920, over 80 million birds have been banded in North America. Each band has a unique number. When a banded bird is recaptured, scientists learn about survival, routes, and timing. Recovery rates are low (1-5%) but the dataset is enormous.')),
                h('li', null, h('strong', null, t('stem.migration.gps_trackers', 'GPS Trackers: ')), t('stem.migration.solar_powered_gps_tags_2026', 'Solar-powered GPS tags (now as small as 1g) transmit location data via satellite. They reveal exact routes, stopover timing, and flight altitude. The record 8,425-mile non-stop Godwit flight, Alaska to Tasmania in 2022, was tracked this way.')),
                h('li', null, h('strong', null, 'Geolocators: '), t('stem.migration.light_level_geolocators_0_5g_record_su', 'Light-level geolocators (0.5g) record sunrise/sunset times. When the bird is recaptured, scientists download the data and calculate latitude (from day length) and longitude (from solar noon timing). Accuracy: ~200 km.')),
                h('li', null, h('strong', null, t('stem.migration.weather_radar', 'Weather Radar: ')), t('stem.migration.nexrad_weather_radar_stations_across_t', 'NEXRAD weather radar stations across the US detect massive flocks of migrating birds. BirdCast (Cornell Lab) uses machine learning to predict and visualize real-time migration from radar data. On peak nights, radar shows enormous green blobs of bird migration.')),
                h('li', null, h('strong', null, 'eBird: '), t('stem.migration.citizen_scientists_submit_100_million_', 'Citizen scientists submit 100+ million bird observations per year through eBird, creating the largest biodiversity database in the world. These data reveal continent-scale patterns in migration timing and distribution that no research team could collect alone.')),
                h('li', null, h('strong', null, t('stem.migration.motus_wildlife_tracking', 'Motus Wildlife Tracking: ')), t('stem.migration.a_network_of_1_500_automated_radio_tel', 'A network of 1,500+ automated radio telemetry stations across the Americas detects tagged birds as they fly by. Each station listens for unique radio frequencies, creating a continental-scale detection network. A tagged bird flying from Canada to Brazil is detected at dozens of stations along the way.'))
              )
            )
          )
        );
      }

      // ══════════════════════════════════════════
      // TAB 4: AERODYNAMICS LAB
      // ══════════════════════════════════════════
      function renderAero() {
        var canvasRef = _arCanvasRef;
        var animRef = _arAnimRef;
        var timeRef = _arTimeRef;

        var aoa = typeof d.aoa === 'number' ? d.aoa : 5; // angle of attack
        var selectedWing = d.selectedWing || 'flapping';

        function getWingType(id) {
          for (var i = 0; i < WING_TYPES.length; i++) {
            if (WING_TYPES[i].id === id) return WING_TYPES[i];
          }
          return WING_TYPES[1];
        }

        var wing = getWingType(selectedWing);

        // ── Aerofoil coefficients ────────────────────────────────────────
        // ONE implementation, because this used to be written out at four call
        // sites and they had already drifted apart: the drag curve computed Cl
        // without the stall branch, so past the stall angle the lift curve and
        // the drag curve disagreed about what Cl was.
        //
        // The old model was cl = liftCoeff * sin(2a) with the aspect ratio
        // HARD-CODED to 5. Two things were wrong with that:
        //
        //  1. It is the flat-plate formula, which peaks at 45 deg. Every wing
        //     reached only about half its stated liftCoeff before stalling, and
        //     the hovering wing (stall 90 deg) reached sin(180 deg) = ZERO lift
        //     at its own stall angle, having peaked at 45 and fallen away.
        //  2. Hard-coding the aspect ratio meant the four wing types were
        //     aerodynamically IDENTICAL in the induced-drag term, even though
        //     the whole panel is about how their shapes differ, and each card
        //     advertises a different aspect ratio.
        //
        // Now: lift rises linearly to liftCoeff at stallAngle (so the number on
        // the card is the number the wing actually reaches), drops away past
        // the stall, and induced drag uses the wing's OWN aspect ratio. Drag
        // also rises through the stall, which it did not before.
        function migrAeroCoeffs(w, aoaDeg) {
          var stalled = aoaDeg > w.stallAngle;
          var cl;
          if (!stalled) {
            cl = w.liftCoeff * (aoaDeg / w.stallAngle);
          } else {
            // continuous at the stall angle, then a clear drop over a few degrees
            cl = w.liftCoeff * (0.45 + 0.55 * Math.exp(-(aoaDeg - w.stallAngle) * 0.8));
          }
          var ar = w.ar || 5;
          var cd = w.dragCoeff + (cl * cl) / (Math.PI * ar * 0.85);
          // Past the stall the induced-drag formula no longer applies: it
          // assumes attached flow. Adding a separation term on top of it made
          // total drag FALL through the stall, because the collapsing lift took
          // the induced term down faster than the penalty came up. So beyond
          // the stall angle drag is anchored at its value AT the stall and
          // separation drag is added to that, which can only rise.
          if (stalled) {
            var cdAtStall = w.dragCoeff + (w.liftCoeff * w.liftCoeff) / (Math.PI * ar * 0.85);
            cd = cdAtStall + 0.05 * (1 - Math.exp(-(aoaDeg - w.stallAngle) * 0.35));
          }
          return { cl: cl, cd: cd, ld: cd > 0.001 ? cl / cd : 0, stalling: stalled };
        }
        // The angle of best lift-to-drag, derived from the model rather than
        // stored beside it, so the label and the curve can never disagree.
        function migrBestLD(w) {
          var bestA = 0, bestV = -1;
          for (var a = 0.25; a <= w.stallAngle; a += 0.25) {
            var r = migrAeroCoeffs(w, a).ld;
            if (r > bestV) { bestV = r; bestA = a; }
          }
          return { angle: bestA, ld: bestV };
        }

        // Lift & drag calculations
        var aoaRad = aoa * Math.PI / 180;
        var _coef = migrAeroCoeffs(wing, aoa);
        var cl = _coef.cl;
        var cd = _coef.cd;
        var isStalling = _coef.stalling;
        var ldRatio = _coef.ld;

        var _arInitCanvas = function(canvas) {
          if (!canvas) return;
          canvasRef.current = canvas;
          if (canvas._arInit) return;
          canvas._arInit = true;
          var c = canvas.getContext('2d');
          var dpr = window.devicePixelRatio || 1;
          var W = canvas.parentElement ? canvas.parentElement.clientWidth : 620;
          var H = 320;
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          canvas.style.width = W + 'px';
          canvas.style.height = H + 'px';
          c.setTransform(dpr, 0, 0, dpr, 0, 0);

          function frame() {
            timeRef.current += 0.016;
            c.clearRect(0, 0, W, H);

            // Read fresh values from live ref
            var lv = _liveVals.current;
            var isDark = lv.isDark;
            var _aoa = lv.aoa;
            var _selWing = lv.selectedWing;
            var _wing = getWingType(_selWing);
            var _aoaRad = _aoa * Math.PI / 180;
            var _c = migrAeroCoeffs(_wing, _aoa);
            var _cl = _c.cl;
            var _cd = _c.cd;
            var _isStalling = _c.stalling;
            var aoaRad = _aoaRad;
            var isStalling = _isStalling;

            // Background
            c.fillStyle = lv.isDark ? '#0f172a' : '#f8fafc';
            c.fillRect(0, 0, W, H);

            var cx = W * 0.32;
            var cy = H * 0.48;
            var chordLen = clamp(W * 0.32, 140, 250);
            var halfC = chordLen * 0.5;

            // The section is drawn with the leading edge to the LEFT and the
            // free stream arriving from the left, so a positive angle of attack
            // must pitch the nose UP. Canvas y grows downward, so that is a
            // positive rotation; the previous -aoaRad pitched it nose-down and
            // the picture contradicted the lift arrow it was drawn beside.
            function airfoilPath(ctx2) {
              ctx2.beginPath();
              ctx2.moveTo(-halfC, 0);
              // Upper surface: rounded leading edge, peak camber near 30% chord
              ctx2.bezierCurveTo(-halfC * 0.94, -chordLen * 0.15, -halfC * 0.10, -chordLen * 0.115, halfC, -chordLen * 0.004);
              // Lower surface: much flatter, closing at a sharp trailing edge
              ctx2.bezierCurveTo(halfC * 0.2, chordLen * 0.045, -halfC * 0.45, chordLen * 0.045, -halfC, 0);
              ctx2.closePath();
            }

            // Point on the mean line at chord fraction f (0 = LE, 1 = TE), in
            // canvas space, so annotations can be pinned to the real section.
            function chordPt(f, above) {
              var lx = -halfC + f * chordLen;
              var ly = (above || 0);
              return {
                x: cx + lx * Math.cos(aoaRad) + ly * Math.sin(aoaRad),
                y: cy + lx * Math.sin(aoaRad) - ly * Math.cos(aoaRad)
              };
            }

            c.save();
            c.translate(cx, cy);
            c.rotate(aoaRad);

            // Pressure fields: suction above, compression below. Both fade to
            // nothing once the flow separates.
            var sucA = isStalling ? 0.05 : 0.22;
            var topGrad = c.createLinearGradient(0, -chordLen * 0.34, 0, 0);
            topGrad.addColorStop(0, 'rgba(59,130,246,0)');
            topGrad.addColorStop(1, 'rgba(59,130,246,' + sucA + ')');
            c.fillStyle = topGrad;
            c.beginPath();
            c.ellipse(-chordLen * 0.06, -chordLen * 0.05, halfC * 1.08, chordLen * 0.27, 0, Math.PI, 0);
            c.fill();

            var botGrad = c.createLinearGradient(0, 0, 0, chordLen * 0.26);
            botGrad.addColorStop(0, 'rgba(239,68,68,0.22)');
            botGrad.addColorStop(1, 'rgba(239,68,68,0)');
            c.fillStyle = botGrad;
            c.beginPath();
            c.ellipse(0, chordLen * 0.02, halfC * 1.02, chordLen * 0.16, 0, 0, Math.PI);
            c.fill();

            // Chord line, so the angle of attack has something to be measured from
            c.save();
            c.setLineDash([4, 4]);
            c.strokeStyle = isDark ? 'rgba(203,213,225,0.55)' : 'rgba(71,85,105,0.5)';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(-halfC - 10, 0);
            c.lineTo(halfC + 26, 0);
            c.stroke();
            c.restore();

            // Section
            airfoilPath(c);
            var foilGrad = c.createLinearGradient(0, -chordLen * 0.14, 0, chordLen * 0.06);
            foilGrad.addColorStop(0, isDark ? '#94a3b8' : '#cbd5e1');
            foilGrad.addColorStop(1, isDark ? '#334155' : '#64748b');
            c.fillStyle = foilGrad;
            c.fill();
            c.strokeStyle = isDark ? '#cbd5e1' : '#334155';
            c.lineWidth = 1.4;
            c.stroke();

            // Surface pressure arrows: outward where the flow pulls (suction),
            // inward where it pushes. This is what actually makes the lift, and
            // the diagram never showed it.
            if (!isStalling) {
              for (var cp = 0; cp < 9; cp++) {
                var f2 = 0.08 + cp * 0.10;
                var xs = -halfC + f2 * chordLen;
                // Suction peaks just behind the leading edge and recovers aft
                var suction = Math.exp(-Math.pow((f2 - 0.16) * 2.6, 2)) * (0.55 + _cl * 0.55);
                var upY = -chordLen * 0.115 * Math.sin(Math.PI * Math.min(1, f2 * 1.05));
                var aLen = 6 + suction * 34;
                migrArrow(c, xs, upY - 5, xs, upY - 5 - aLen, 'rgba(37,99,235,0.8)', 1.3, 4.5);
                var press = Math.max(0, Math.sin(aoaRad) * 1.5 + 0.18) * (1 - f2 * 0.55);
                var loY = chordLen * 0.04 * Math.sin(Math.PI * Math.min(1, f2 * 1.05));
                var bLen = 4 + press * 34;
                migrArrow(c, xs, loY + 5 + bLen, xs, loY + 5, 'rgba(239,68,68,0.7)', 1.3, 4.5);
              }
            }

            c.restore();

            // Angle of attack, opened ahead of the nose where there is room:
            // the angle between the extended chord line and the free stream.
            var lePt = chordPt(0, 0);
            if (_aoa > 0.5) {
              var aoaR2 = Math.max(34, Math.min(72, chordLen * 0.34));
              c.save();
              c.translate(lePt.x, lePt.y);
              c.setLineDash([3, 3]);
              c.lineWidth = 1;
              c.strokeStyle = isDark ? 'rgba(251,191,36,0.65)' : 'rgba(180,83,9,0.6)';
              // Free-stream reference, straight ahead
              c.beginPath();
              c.moveTo(0, 0);
              c.lineTo(-aoaR2 - 20, 0);
              c.stroke();
              // Chord line, extended forward
              c.beginPath();
              c.moveTo(0, 0);
              c.lineTo(-(aoaR2 + 20) * Math.cos(aoaRad), -(aoaR2 + 20) * Math.sin(aoaRad));
              c.stroke();
              c.setLineDash([]);
              c.strokeStyle = isDark ? '#fbbf24' : '#b45309';
              c.lineWidth = 1.6;
              c.beginPath();
              c.arc(0, 0, aoaR2, Math.PI, Math.PI + aoaRad);
              c.stroke();
              c.restore();
              migrChip(c,
                lePt.x + Math.cos(Math.PI + aoaRad / 2) * (aoaR2 + 20),
                lePt.y + Math.sin(Math.PI + aoaRad / 2) * (aoaR2 + 20),
                'α = ' + Math.round(_aoa) + '°',
                '#fff', 'rgba(180,83,9,0.92)', 'bold 10px system-ui');
            }

            // Free-stream velocity, labelled where the flow enters. Clamped
            // into the frame: at a long chord it used to sit off the top edge.
            var vInfY = clamp(cy - chordLen * 0.62, isStalling ? 52 : 22, H - 22);
            migrArrow(c, 14, vInfY, 66, vInfY, isDark ? '#94a3b8' : '#475569', 2, 7);
            c.fillStyle = isDark ? '#cbd5e1' : '#334155';
            c.font = 'bold 10px system-ui';
            c.textAlign = 'left';
            c.textBaseline = 'alphabetic';
            c.fillText('V∞', 16, vInfY - 6);

            // ── Streamlines ──
            // The old version nudged each line by distance-to-centre alone, so
            // the flow never actually bent around the section: it drew twelve
            // near-straight lines, blue above and red below. This displaces each
            // line by a thickness term (pushed away from the body) plus a
            // circulation term (upwash ahead, downwash behind), which is the
            // shape a lifting section really produces.
            var streamCount = 15;
            var circK = _cl * chordLen * 0.20;
            var thickK = chordLen * 0.26;
            var streamRight = W * 0.655;
            var sepStart = 0.30;
            for (var si2 = 0; si2 < streamCount; si2++) {
              var sy = 10 + (si2 / (streamCount - 1)) * (H - 20);
              var dy0 = (sy - cy) / chordLen;
              var isAbove = dy0 < -0.02;
              // Only the lines close enough to be deflected get tinted
              var working = Math.abs(dy0) < 0.40;
              // A separated line detaches over the rear of the section and never
              // closes back down — that is what "stalled" looks like.
              var separated = isStalling && isAbove && Math.abs(dy0) < 0.75;

              var pts = [];
              for (var sx = -6; sx < streamRight; sx += 5) {
                var dxn = (sx - cx) / chordLen;
                var dyn = dy0;
                var rr = Math.sqrt(dxn * dxn + dyn * dyn * 2.4) + 0.30;
                var decay = Math.exp(-rr * rr * 1.15);
                var side = dyn < 0 ? -1 : 1;
                var py = sy;
                // Thickness pushes the line clear of the body
                py += side * thickK * decay * 0.72;
                // Circulation: air rises ahead of the wing and is left with a
                // downwash behind it
                py += -circK * decay * Math.tanh(-dxn * 1.7);
                // Persistent downwash in the wake
                if (dxn > 0) py += circK * 0.35 * Math.exp(-dyn * dyn * 5) * Math.min(1, dxn * 0.7);
                if (separated && dxn > sepStart) {
                  // Detached shear layer: lifts away and breaks into eddies
                  var t3 = Math.min(1.6, dxn - sepStart);
                  py -= t3 * chordLen * 0.10;
                  py += Math.sin(dxn * 5.5 - timeRef.current * 4 + si2) * t3 * chordLen * 0.075;
                }
                pts.push({ x: sx, y: py });
              }

              c.beginPath();
              c.moveTo(pts[0].x, pts[0].y);
              for (var pk2 = 1; pk2 < pts.length; pk2++) c.lineTo(pts[pk2].x, pts[pk2].y);
              if (separated) c.strokeStyle = 'rgba(239,68,68,0.60)';
              else if (!working) c.strokeStyle = isDark ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.22)';
              else if (isAbove) c.strokeStyle = isDark ? 'rgba(125,211,252,0.60)' : 'rgba(37,99,235,0.45)';
              else c.strokeStyle = isDark ? 'rgba(248,180,180,0.45)' : 'rgba(220,38,38,0.33)';
              c.lineWidth = 1;
              c.stroke();

              // Tracer beads: motion cue, faster over the suction side, which is
              // the whole Bernoulli point of the picture.
              var spd = isAbove && working && !separated ? 1.55 : 1.0;
              var beadU = ((timeRef.current * 0.26 * spd) + si2 * 0.137) % 1;
              var bi3 = Math.floor(beadU * (pts.length - 1));
              c.beginPath();
              c.arc(pts[bi3].x, pts[bi3].y, 1.8, 0, Math.PI * 2);
              c.fillStyle = separated ? '#ef4444' : (!working ? (isDark ? '#94a3b8' : '#64748b') : (isAbove ? '#0ea5e9' : '#f87171'));
              c.fill();
            }

            // Separation bubble and the vortices shed off the trailing edge
            if (isStalling) {
              var sepX = cx - halfC + chordLen * sepStart;
              c.save();
              c.strokeStyle = 'rgba(239,68,68,0.85)';
              c.lineWidth = 1.6;
              var tePt = chordPt(1, chordLen * 0.05);
              for (var vz = 0; vz < 3; vz++) {
                var vzPhase = ((timeRef.current * 0.30 + vz * 0.34) % 1);
                var vzx = tePt.x + 14 + vzPhase * chordLen * 0.95;
                var vzy = tePt.y - chordLen * 0.08 - vzPhase * chordLen * 0.10;
                var vzr = 7 + vzPhase * 9;
                c.beginPath();
                for (var sp5 = 0; sp5 < 22; sp5++) {
                  var sa = sp5 * 0.42 + timeRef.current * 3;
                  var srr = vzr * (1 - sp5 / 26);
                  var vxp = vzx + Math.cos(sa) * srr;
                  var vyp = vzy + Math.sin(sa) * srr;
                  if (sp5 === 0) c.moveTo(vxp, vyp); else c.lineTo(vxp, vyp);
                }
                c.stroke();
              }
              // Mark where the boundary layer lets go
              var sepPt = chordPt(sepStart, chordLen * 0.13);
              c.beginPath();
              c.arc(sepPt.x, sepPt.y, 3.5, 0, Math.PI * 2);
              c.fillStyle = '#ef4444';
              c.fill();
              c.restore();
              migrChip(c, sepPt.x, sepPt.y - 15, t('stem.migration.separation_point', 'separation'),
                '#fff', 'rgba(220,38,38,0.92)', 'bold 8px system-ui');
            }

            // ── Free-body diagram ──
            // The forces act at the centre of pressure, roughly the quarter
            // chord, not at the middle of the canvas.
            var copPt = chordPt(0.27, 0);
            var liftLen = Math.min(120, 30 + Math.abs(_cl) * 70);
            var dragLen = Math.min(78, 9 + _cd * 300);
            if (_cl > 0.01) {
              migrArrow(c, copPt.x, copPt.y, copPt.x, copPt.y - liftLen, '#2563eb', 3, 9);
              c.fillStyle = '#2563eb';
              c.font = 'bold 10px system-ui';
              c.textAlign = 'center';
              c.textBaseline = 'alphabetic';
              c.fillText(t('stem.migration.lift_arrow', 'LIFT'), copPt.x, copPt.y - liftLen - 12);
            }
            if (_cd > 0.001) {
              migrArrow(c, copPt.x, copPt.y, copPt.x + dragLen, copPt.y, '#dc2626', 3, 9);
              c.fillStyle = '#dc2626';
              c.font = 'bold 10px system-ui';
              c.textAlign = 'left';
              c.fillText(t('stem.migration.drag_arrow', 'DRAG'), copPt.x + dragLen + 8, copPt.y + 4);
            }
            // Resultant, so lift and drag read as components of one force
            if (_cl > 0.01 && _cd > 0.001) {
              c.save();
              c.setLineDash([3, 3]);
              c.strokeStyle = isDark ? 'rgba(168,85,247,0.5)' : 'rgba(147,51,234,0.45)';
              c.lineWidth = 1;
              c.beginPath();
              c.moveTo(copPt.x, copPt.y - liftLen);
              c.lineTo(copPt.x + dragLen, copPt.y - liftLen);
              c.lineTo(copPt.x + dragLen, copPt.y);
              c.stroke();
              c.restore();
              migrArrow(c, copPt.x, copPt.y, copPt.x + dragLen, copPt.y - liftLen, '#9333ea', 2, 8);
            }
            // Centre-of-pressure hub, drawn last so the arrows spring from it
            c.beginPath();
            c.arc(copPt.x, copPt.y, 3.2, 0, Math.PI * 2);
            c.fillStyle = isDark ? '#f8fafc' : '#0f172a';
            c.fill();

            // Stall warning (enhanced with flashing border + red overlay)
            if (isStalling) {
              // Red screen flash (pulsing)
              var stallPulse = 0.05 + Math.sin(timeRef.current * 8) * 0.04;
              c.fillStyle = 'rgba(239,68,68,' + stallPulse + ')';
              c.fillRect(0, 0, W, H);
              // Warning banner
              c.fillStyle = 'rgba(239,68,68,0.9)';
              c.fillRect(0, 8, W, 28);
              c.fillStyle = '#fff';
              c.font = 'bold 13px system-ui';
              c.textAlign = 'center';
              c.fillText('\u26A0 STALL \u2014 Flow Separation! Lift drops dramatically above ' + _wing.stallAngle + '\u00B0', W / 2, 27);
              // Red border flash
              c.strokeStyle = 'rgba(239,68,68,' + (0.4 + Math.sin(timeRef.current * 6) * 0.3) + ')';
              c.lineWidth = 3;
              c.strokeRect(1, 1, W - 2, H - 2);
            }

            // Pressure labels, set as chips so they stay readable on top of the
            // streamlines rather than dissolving into them
            if (!isStalling) {
              migrChip(c, cx - chordLen * 0.14, cy - chordLen * 0.52,
                t('stem.migration.low_pressure_fast_air', 'Low pressure — fast air'),
                '#fff', 'rgba(37,99,235,0.88)', 'bold 9px system-ui');
              migrChip(c, cx - chordLen * 0.14, cy + chordLen * 0.42,
                t('stem.migration.high_pressure_slow_air', 'High pressure — slow air'),
                '#fff', 'rgba(220,38,38,0.88)', 'bold 9px system-ui');
            }

            // L/D curve on right side
            var graphX = W * 0.68;
            var graphY = 30;
            var graphW = W * 0.28;
            var graphH = H - 60;
            // The coefficient axis top, in one place. It was written out as a
            // bare 2 in five expressions; with the lift curve now reaching the
            // wings' real Cl max (up to 1.8) and drag peaking through the
            // stall, 2.0 clipped the curves.
            var AXIS_MAX = 2.5;

            // Graph background
            c.fillStyle = isDark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)';
            c.fillRect(graphX - 5, graphY - 5, graphW + 10, graphH + 30);
            c.strokeStyle = isDark ? '#334155' : '#e2e8f0';
            c.lineWidth = 1;
            c.strokeRect(graphX - 5, graphY - 5, graphW + 10, graphH + 30);

            // Axes
            c.strokeStyle = isDark ? '#94a3b8' : '#475569';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(graphX, graphY + graphH);
            c.lineTo(graphX + graphW, graphY + graphH);
            c.stroke();
            c.beginPath();
            c.moveTo(graphX, graphY);
            c.lineTo(graphX, graphY + graphH);
            c.stroke();

            // Draw L vs AoA curve
            c.beginPath();
            var firstPt = true;
            for (var plotAoa = 0; plotAoa <= 20; plotAoa += 0.5) {
              var plotCl = migrAeroCoeffs(_wing, plotAoa).cl;
              var plotX = graphX + (plotAoa / 20) * graphW;
              var plotY = graphY + graphH - (plotCl / AXIS_MAX) * graphH;
              if (firstPt) { c.moveTo(plotX, plotY); firstPt = false; }
              else c.lineTo(plotX, plotY);
            }
            c.strokeStyle = '#3b82f6';
            c.lineWidth = 2;
            c.stroke();

            // Draw drag curve
            c.beginPath();
            firstPt = true;
            for (var plotAoa2 = 0; plotAoa2 <= 20; plotAoa2 += 0.5) {
              var plotCd2 = migrAeroCoeffs(_wing, plotAoa2).cd;
              var plotX2 = graphX + (plotAoa2 / 20) * graphW;
              var plotY2 = graphY + graphH - (plotCd2 * 10 / AXIS_MAX) * graphH;
              if (firstPt) { c.moveTo(plotX2, plotY2); firstPt = false; }
              else c.lineTo(plotX2, plotY2);
            }
            c.strokeStyle = '#ef4444';
            c.lineWidth = 1.5;
            c.stroke();

            // Current AoA marker
            var markerX = graphX + (clamp(_aoa, 0, 20) / 20) * graphW;
            c.beginPath();
            c.setLineDash([3, 3]);
            c.moveTo(markerX, graphY);
            c.lineTo(markerX, graphY + graphH);
            c.strokeStyle = isDark ? '#fbbf24' : '#d97706';
            c.lineWidth = 1;
            c.stroke();
            c.setLineDash([]);

            // Axis ticks: an unnumbered plot cannot be read off, only admired.
            c.font = '7px system-ui';
            c.textAlign = 'center';
            c.fillStyle = isDark ? '#94a3b8' : '#475569';
            c.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.25)';
            c.lineWidth = 0.7;
            for (var xt = 0; xt <= 20; xt += 5) {
              var xtp = graphX + (xt / 20) * graphW;
              c.beginPath();
              c.moveTo(xtp, graphY + graphH);
              c.lineTo(xtp, graphY + graphH + 3);
              c.stroke();
              c.fillText(String(xt), xtp, graphY + graphH + 12);
            }
            c.textAlign = 'right';
            for (var yt = 0; yt <= AXIS_MAX; yt += 0.5) {
              var ytp = graphY + graphH - (yt / AXIS_MAX) * graphH;
              c.beginPath();
              c.moveTo(graphX - 3, ytp);
              c.lineTo(graphX, ytp);
              c.stroke();
              if (yt > 0) {
                c.beginPath();
                c.moveTo(graphX, ytp);
                c.lineTo(graphX + graphW, ytp);
                c.strokeStyle = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.10)';
                c.stroke();
                c.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.25)';
              }
              c.fillText(yt.toFixed(1), graphX - 5, ytp + 2.5);
            }

            // Graph labels
            c.fillStyle = isDark ? '#94a3b8' : '#475569';
            c.font = '8px system-ui';
            c.textAlign = 'center';
            c.fillText('Angle of Attack (\u00B0)', graphX + graphW / 2, graphY + graphH + 22);
            c.save();
            c.translate(graphX - 14, graphY + graphH / 2);
            c.rotate(-Math.PI / 2);
            c.fillText('Coefficient', 0, 0);
            c.restore();

            // Legend
            c.fillStyle = '#3b82f6';
            c.fillRect(graphX + 4, graphY + 4, 8, 2);
            c.fillStyle = isDark ? '#94a3b8' : '#475569';
            c.font = '8px system-ui';
            c.textAlign = 'left';
            c.fillText('Lift (C\u2097)', graphX + 16, graphY + 8);
            c.fillStyle = '#ef4444';
            c.fillRect(graphX + 4, graphY + 16, 8, 2);
            c.fillStyle = isDark ? '#94a3b8' : '#475569';
            // \u2091 is subscript e: the legend read "C_e" for the drag
            // coefficient, which is C_d. Unicode has no subscript d.
            c.fillText('Drag (Cd \u00D7 10)', graphX + 16, graphY + 20);
            c.strokeStyle = '#22c55e';
            c.lineWidth = 1.6;
            c.setLineDash([4, 3]);
            c.beginPath();
            c.moveTo(graphX + 4, graphY + 27);
            c.lineTo(graphX + 13, graphY + 27);
            c.stroke();
            c.setLineDash([]);
            c.fillStyle = '#22c55e';
            c.fillText('L/D \u00F7 10', graphX + 16, graphY + 30);

            // ── Lift-to-drag curve, and its true maximum ────────────────
            // The quantity the panel is named after is now actually drawn,
            // divided by 10 so it shares the 0-2 coefficient axis.
            c.beginPath();
            firstPt = true;
            for (var plotAoa3 = 0.25; plotAoa3 <= 20; plotAoa3 += 0.25) {
              var plotLd = migrAeroCoeffs(_wing, plotAoa3).ld / 10;
              var plotX3 = graphX + (plotAoa3 / 20) * graphW;
              var plotY3 = graphY + graphH - (plotLd / AXIS_MAX) * graphH;
              if (firstPt) { c.moveTo(plotX3, plotY3); firstPt = false; }
              else c.lineTo(plotX3, plotY3);
            }
            c.strokeStyle = '#22c55e';
            c.lineWidth = 1.6;
            c.setLineDash([4, 3]);
            c.stroke();
            c.setLineDash([]);

            // Best L/D marker, ON the L/D curve at the model's own maximum.
            var _best = migrBestLD(_wing);
            var bestX = graphX + (_best.angle / 20) * graphW;
            var bestY = graphY + graphH - ((_best.ld / 10) / AXIS_MAX) * graphH;
            c.strokeStyle = migrAlpha('#22c55e', 0.5);
            c.lineWidth = 1;
            c.setLineDash([2, 3]);
            c.beginPath();
            c.moveTo(bestX, bestY);
            c.lineTo(bestX, graphY + graphH);
            c.stroke();
            c.setLineDash([]);
            c.beginPath();
            c.arc(bestX, bestY, 3.4, 0, Math.PI * 2);
            c.fillStyle = '#22c55e';
            c.fill();
            c.strokeStyle = isDark ? '#0b1120' : '#ffffff';
            c.lineWidth = 1.2;
            c.stroke();
            c.fillStyle = '#22c55e';
            c.font = 'bold 7px system-ui';
            c.textAlign = 'center';
            c.fillText('Best L/D ' + _best.ld.toFixed(1) + ' @ ' + _best.angle.toFixed(1) + '\u00B0',
              Math.min(graphX + graphW - 34, bestX + 30), bestY - 6);

            animRef.current = requestAnimationFrame(frame);
          }

          frame();
          // Cleanup via MutationObserver (callback refs must not return a function in React 18)
          var obs4 = new MutationObserver(function() {
            if (!document.contains(canvas)) {
              if (animRef.current) cancelAnimationFrame(animRef.current);
              obs4.disconnect();
              canvas._arInit = false;
            }
          });
          obs4.observe(document.body, { childList: true, subtree: true });
        };

        return h('div', { className: 'space-y-3' },
          // Canvas
          h('div', { className: 'rounded-xl overflow-hidden border ' + borderCol },
            h('canvas', {
              ref: _arInitCanvas,
              role: 'img',
              'aria-label': 'Aerodynamics lab showing airfoil cross-section with streamlines. Current angle of attack: ' + aoa + ' degrees. ' + (isStalling ? 'Wing is stalling, flow separation occurring.' : 'Lift coefficient: ' + cl.toFixed(2) + ', Drag coefficient: ' + cd.toFixed(3) + ', L/D ratio: ' + ldRatio.toFixed(1)),
              tabIndex: 0,
              onKeyDown: function(e) {
                if (e.key === 'ArrowUp' && aoa < 20) { e.preventDefault(); upd('aoa', aoa + 1); }
                else if (e.key === 'ArrowDown' && aoa > 0) { e.preventDefault(); upd('aoa', aoa - 1); }
              },
              style: { width: '100%', display: 'block' }
            })
          ),

          // AoA slider
          h('div', { className: 'flex items-center gap-3' },
            h('label', { className: 'text-xs font-bold ' + textPrimary }, t('stem.migration.angle_of_attack', 'Angle of Attack:')),
            h('input', {
              type: 'range', min: 0, max: 20, value: aoa,
              'aria-label': 'Angle of attack: ' + aoa + ' degrees' + (isStalling ? '. Warning: wing is stalling.' : ''),
              className: 'flex-1 accent-sky-500',
              onChange: function(e) { upd('aoa', parseInt(e.target.value, 10)); }
            }),
            h('span', { className: 'text-sm font-bold min-w-[40px] text-right ' + (isStalling ? 'text-red-500' : accent) }, aoa + '\u00B0'),
            isStalling && h('span', { className: 'text-xs font-bold text-red-500' }, t('stem.migration.stall', '\u26A0 STALL'))
          ),

          // Stats readout
          h('div', { className: 'grid grid-cols-3 gap-2 text-center' },
            [
              { label: t('stem.migration.lift_coeff_c', 'Lift Coeff (C\u2097)'), value: cl.toFixed(3), color: '#3b82f6' },
              { label: t('stem.migration.drag_coeff_c', 'Drag Coeff (C\u2091)'), value: cd.toFixed(4), color: '#ef4444' },
              { label: t('stem.migration.l_d_ratio', 'L/D Ratio'), value: ldRatio.toFixed(1), color: '#22c55e' }
            ].map(function(s) {
              return h('div', { key: s.label, className: 'rounded-lg p-2 border ' + borderCol + ' ' + cardBg },
                h('div', { className: 'text-sm font-black', style: { color: s.color } }, s.value),
                h('div', { className: 'text-[11px] ' + textMuted }, s.label)
              );
            })
          ),

          // Wing type selector
          h('div', { className: 'space-y-2' },
            h('h3', { className: 'font-bold text-sm ' + textPrimary }, t('stem.migration.wing_type_comparison', 'Wing Type Comparison')),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              WING_TYPES.map(function(wt) {
                var active = selectedWing === wt.id;
                return h('button', {
                  key: wt.id,
                  className: 'p-3 rounded-xl text-left transition-all border ' + (active ? 'ring-2 ring-sky-400 border-sky-400 ' + accentBg : borderCol + ' ' + cardBg + ' hover:border-sky-600'),
                  'aria-label': wt.name + ' wing type. Aspect ratio: ' + wt.aspectRatio + '. ' + wt.desc,
                  'aria-pressed': active ? 'true' : 'false',
                  onClick: function() { upd('selectedWing', wt.id); }
                },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg', 'aria-hidden': 'true' }, wt.emoji),
                    h('div', null,
                      h('div', { className: 'text-xs font-bold ' + textPrimary }, wt.name),
                      h('div', { className: 'text-[11px] ' + textMuted }, wt.shape)
                    )
                  ),
                  h('div', { className: 'text-[11px] ' + textSecondary + ' leading-relaxed' }, __alloT('stem.migration.' + (wt.id) + '_desc', wt.desc)),
                  h('div', { className: 'flex gap-2 mt-1.5 text-[11px]' },
                    h('span', { className: accent }, 'AR: ' + wt.aspectRatio),
                    h('span', { className: textMuted }, 'Best AoA: ' + wt.bestAngle + '\u00B0'),
                    h('span', { className: textMuted }, 'Stall: ' + wt.stallAngle + '\u00B0')
                  )
                );
              })
            )
          ),

          // Flight physics explanation
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.flight_physics_explained', '\uD83D\uDCDA Flight Physics Explained')),
            h('div', { className: 'text-xs leading-relaxed space-y-3 ' + textSecondary },
              h('div', null,
                h('h4', { className: 'font-bold text-[11px] mb-1 ' + textPrimary }, t('stem.migration.bernoulli_s_principle', 'Bernoulli\'s Principle')),
                h('p', null, t('stem.migration.as_air_speeds_up_its_pressure_drops_a_', 'As air speeds up, its pressure drops. A wing\'s curved upper surface forces air to travel faster over the top than under the bottom. This creates '), h('strong', null, t('stem.migration.lower_pressure_above', 'lower pressure above')), ' and ', h('strong', null, t('stem.migration.higher_pressure_below', 'higher pressure below')), t('stem.migration.the_wing_generating_lift', ' the wing, generating lift.')),
                h('p', { className: 'mt-1 font-mono text-[11px] ' + accent }, t('stem.migration.p_pv_pgh_constant', 'P + \u00BDpv\u00B2 + pgh = constant'))
              ),
              h('div', null,
                h('h4', { className: 'font-bold text-[11px] mb-1 ' + textPrimary }, t('stem.migration.angle_of_attack_stall', 'Angle of Attack & Stall')),
                h('p', null, t('stem.migration.as_the_angle_of_attack_increases_lift_', 'As the angle of attack increases, lift increases \u2014 up to a point. Beyond the '), h('strong', null, t('stem.migration.critical_angle', 'critical angle')), t('stem.migration.stall_angle_airflow_separates_from_the', ' (stall angle), airflow separates from the upper surface. The wing loses its smooth airflow, lift drops dramatically, and drag spikes. This is a "stall."')),
                h('p', { className: 'mt-1' }, t('stem.migration.current_wing_s_stall_angle', 'Current wing\'s stall angle: '), h('strong', { className: 'text-red-500' }, wing.stallAngle + '\u00B0'), t('stem.migration.best_l_d_at', '. Best L/D at: '), h('strong', { className: 'text-green-500' }, wing.bestAngle + '\u00B0'), '.')
              ),
              h('div', null,
                h('h4', { className: 'font-bold text-[11px] mb-1 ' + textPrimary }, t('stem.migration.lift_to_drag_ratio_l_d', 'Lift-to-Drag Ratio (L/D)')),
                h('p', null, t('stem.migration.l_d_measures_aerodynamic_efficiency_a_', 'L/D measures aerodynamic efficiency. A higher L/D means more lift per unit of drag. Albatrosses achieve L/D ratios of '), h('strong', null, '20:1'), t('stem.migration.meaning_20_pounds_of_lift_for_every_1_', ' (meaning 20 pounds of lift for every 1 pound of drag), among the best in nature. Modern sailplanes reach '), h('strong', null, '60:1'), '.')
              ),
              h('div', null,
                h('h4', { className: 'font-bold text-[11px] mb-1 ' + textPrimary }, t('stem.migration.induced_vs_parasite_drag', 'Induced vs Parasite Drag')),
                h('p', null, h('strong', null, t('stem.migration.induced_drag', 'Induced drag')), t('stem.migration.is_a_byproduct_of_creating_lift_the_wi', ' is a byproduct of creating lift \u2014 the wingtip vortices that V-formation birds exploit. It decreases with speed. '), h('strong', null, t('stem.migration.parasite_drag', 'Parasite drag')), t('stem.migration.comes_from_the_bird_s_body_pushing_thr', ' comes from the bird\'s body pushing through air \u2014 it increases with speed\u00B2. At the intersection of these two curves lies the '), h('strong', null, t('stem.migration.minimum_drag_speed', 'minimum drag speed')), t('stem.migration.the_most_efficient_cruising_speed', ' \u2014 the most efficient cruising speed.'))
              ),
              h('div', null,
                h('h4', { className: 'font-bold text-[11px] mb-1 ' + textPrimary }, t('stem.migration.reynolds_number', 'Reynolds Number')),
                h('p', null, t('stem.migration.bird_flight_operates_at_reynolds_numbe', 'Bird flight operates at Reynolds numbers between 10,000 and 500,000 \u2014 a tricky aerodynamic regime. At these scales, the boundary layer (thin layer of air clinging to the wing surface) is partly laminar and partly turbulent. Bird feathers create micro-turbulence that actually '), h('strong', null, 'helps'), t('stem.migration.maintain_airflow_attachment_especially', ' maintain airflow attachment, especially at high angles of attack. This is something engineers are still trying to replicate in drone designs.'))
              )
            )
          ),

          // Bio-inspired engineering
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.bio_inspired_engineering', '\u2699\uFE0F Bio-Inspired Engineering')),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, t('stem.migration.bird_flight_has_inspired_countless_eng', 'Bird flight has inspired countless engineering innovations:')),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2' },
                [
                  { title: t('stem.migration.winglets', 'Winglets'), text: t('stem.migration.the_upturned_wingtips_on_modern_airlin', 'The upturned wingtips on modern airliners (Boeing 737 MAX, Airbus A350) are directly inspired by the slotted feathers at the tip of eagle wings. These "winglets" reduce induced drag by 5-7%, saving airlines billions in fuel costs annually. They work by disrupting the wingtip vortex.') },
                  { title: t('stem.migration.owl_quiet_fans', 'Owl-Quiet Fans'), text: t('stem.migration.owl_feathers_have_a_serrated_leading_e', 'Owl feathers have a serrated leading edge, a velvety surface texture, and a fringed trailing edge that together reduce aerodynamic noise to near-silence. Engineers at GE and Dyson have mimicked these features in turbine blades and fan designs, reducing noise by 10+ decibels.') },
                  { title: t('stem.migration.kingfisher_bullet_trains', 'Kingfisher Bullet Trains'), text: t('stem.migration.the_shinkansen_bullet_train_s_nose_was', 'The Shinkansen bullet train\'s nose was redesigned after engineer Eiji Nakatsu, a birdwatcher, noticed that kingfishers dive from air into water without a splash. The kingfisher-bill-shaped nose reduced the sonic boom when exiting tunnels by 30% and cut electricity use by 15%.') },
                  { title: t('stem.migration.morphing_wings', 'Morphing Wings'), text: t('stem.migration.birds_continuously_adjust_wing_shape_a', 'Birds continuously adjust wing shape, angle, and feather positions during flight \u2014 far more sophisticated than any aircraft. NASA and MIT are developing "morphing wing" technology that uses flexible materials and actuators to mimic bird-like wing adjustment, potentially improving efficiency by 8-12%.') }
                ].map(function(eng) {
                  return h('div', { key: eng.title, className: 'rounded-lg p-2.5 border ' + borderCol + ' ' + (isDark ? 'bg-slate-700/50' : 'bg-white') },
                    h('div', { className: 'text-[11px] font-bold mb-1 ' + textPrimary }, eng.title),
                    h('p', { className: 'text-[11px] leading-relaxed ' + textSecondary }, eng.text)
                  );
                })
              )
            )
          ),

          // Feather microstructure
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.feather_engineering', '\uD83E\uDEB6 Feather Engineering')),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, t('stem.migration.a_bird_feather_is_one_of_the_most_comp', 'A bird feather is one of the most complex structures in nature. A single flight feather has:')),
              h('ul', { className: 'list-disc pl-4 space-y-1' },
                h('li', null, h('strong', null, 'Rachis: '), t('stem.migration.the_central_shaft_a_hollow_tube_strong', 'The central shaft \u2014 a hollow tube stronger per weight than steel, made of beta-keratin.')),
                h('li', null, h('strong', null, 'Barbs: '), t('stem.migration.hundreds_of_branches_growing_from_the_', 'Hundreds of branches growing from the rachis, forming the feather vane.')),
                h('li', null, h('strong', null, 'Barbules: '), t('stem.migration.tiny_hook_like_structures_connecting_b', 'Tiny hook-like structures connecting barbs together like Velcro. A single pigeon feather has ~1 million barbules.')),
                h('li', null, h('strong', null, 'Hooklets: '), t('stem.migration.microscopic_hooks_on_barbules_that_zip', 'Microscopic hooks on barbules that zip barbs together, creating an airtight surface. When a feather gets ruffled, a bird can "zip" it back by preening.'))
              ),
              h('p', { className: 'mt-2' }, t('stem.migration.flight_feathers_are_asymmetric_the_lea', 'Flight feathers are asymmetric \u2014 the leading edge vane is narrower than the trailing edge. This asymmetry creates a cambered airfoil shape that generates lift, similar to an airplane wing. Primary feathers at the wingtips twist during the downstroke, acting like individual propeller blades.')),
              h('p', null, t('stem.migration.birds_have_1_000_25_000_feathers_a_swa', 'Birds have 1,000-25,000 feathers (a swan has the most). They replace all flight feathers annually during '), h('strong', null, 'molt'), t('stem.migration.typically_after_breeding_season_and_be', ', typically after breeding season and before migration. Losing too many feathers at once would ground the bird, so molt follows a precise bilateral symmetry \u2014 matching feathers on each wing are replaced simultaneously.'))
            )
          ),

          // Energy budget
          h('div', { className: 'rounded-xl p-4 border-2 border-sky-400/50 ' + accentBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.migration_energy_budget', '\u26A1 Migration Energy Budget')),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, t('stem.migration.consider_a_ruby_throated_hummingbird_c', 'Consider a Ruby-throated Hummingbird crossing the Gulf of Mexico (500 miles non-stop):')),
              h('div', { className: 'font-mono text-[11px] p-2 rounded-lg mt-1 ' + (isDark ? 'bg-slate-700' : 'bg-white') },
                h('div', null, t('stem.migration.body_mass_3_5g', 'Body mass: 3.5g')),
                h('div', null, t('stem.migration.pre_flight_fat_2g_57_body_weight', 'Pre-flight fat: +2g (57% body weight!)')),
                h('div', null, t('stem.migration.fat_energy_density_9_kcal_g', 'Fat energy density: 9 kcal/g')),
                h('div', null, t('stem.migration.available_energy_18_kcal', 'Available energy: ~18 kcal')),
                h('div', null, t('stem.migration.flight_metabolic_rate_0_8_kcal_hr', 'Flight metabolic rate: ~0.8 kcal/hr')),
                h('div', null, t('stem.migration.crossing_time_20_hours_at_25_mph', 'Crossing time: ~20 hours at 25 mph')),
                h('div', null, t('stem.migration.energy_required_16_kcal', 'Energy required: ~16 kcal')),
                h('div', { className: 'mt-1 font-bold ' + accent }, t('stem.migration.margin_of_safety_2_kcal_11', 'Margin of safety: ~2 kcal (11%)'))
              ),
              h('p', { className: 'mt-2' }, t('stem.migration.that_is_an_incredibly_thin_margin_a_st', 'That is an incredibly thin margin. A strong headwind, a cold front, or arriving at the coast 10% underweight could be fatal. This is why stopover habitat quality is '), h('strong', null, t('stem.migration.literally_life_or_death', 'literally life or death')), t('stem.migration.for_migratory_birds', ' for migratory birds.'))
            )
          )
        );
      }

      // ══════════════════════════════════════════
      // TAB 5: WEATHER & NAVIGATION
      // ══════════════════════════════════════════
      function renderNavigate() {
        var expandedNav = d.expandedNav || null;
        var navCanvasRef = _nvCanvasRef;
        var navAnimRef = _nvAnimRef;
        var navTimeRef = _nvTimeRef;

        // Navigation demo canvas (ref callback, not useEffect)
        var _nvInitCanvas = function(canvas) {
          if (!canvas) return;
          navCanvasRef.current = canvas;
          if (canvas._nvInit) return;
          canvas._nvInit = true;
          var c = canvas.getContext('2d');
          var dpr = window.devicePixelRatio || 1;
          var W = canvas.parentElement ? canvas.parentElement.clientWidth : 620;
          var H = 220;
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          canvas.style.width = W + 'px';
          canvas.style.height = H + 'px';
          c.setTransform(dpr, 0, 0, dpr, 0, 0);

          // Stars for star navigation demo
          var stars = [];
          for (var si3 = 0; si3 < 60; si3++) {
            stars.push({
              x: Math.random() * W,
              y: Math.random() * H,
              size: 0.5 + Math.random() * 1.5,
              twinkle: Math.random() * Math.PI * 2,
              brightness: 0.3 + Math.random() * 0.7
            });
          }

          // Migrating birds (small flock)
          var navBirds = [];
          for (var nbi = 0; nbi < 5; nbi++) {
            navBirds.push({
              x: W * 0.2 + nbi * 15,
              y: H * 0.5 + (nbi % 2 ? -1 : 1) * nbi * 8,
              phase: nbi * 0.5
            });
          }

          // Magnetic field lines. Eight evenly spaced near-parallel lines across
          // the full width read as ruled notepaper. Fewer of them, fanned so
          // they converge toward the pole the way real dip lines do, is both
          // better looking and closer to the thing being taught.
          var fieldLines = [];
          var poleFocusY = H * 0.20;
          for (var fl = 0; fl < 5; fl++) {
            var flStart = H * 0.16 + fl * H * 0.17;
            fieldLines.push({
              startX: 0,
              startY: flStart,
              endY: lerp(flStart, poleFocusY, 0.5),
              curve: 0.55 + Math.random() * 0.6
            });
          }

          function frame() {
            navTimeRef.current += 0.016;
            var t2 = navTimeRef.current;
            c.clearRect(0, 0, W, H);

            // Night sky gradient
            var skyGrad = c.createLinearGradient(0, 0, 0, H);
            skyGrad.addColorStop(0, '#020617');
            skyGrad.addColorStop(0.6, '#0f172a');
            skyGrad.addColorStop(1, '#1e293b');
            c.fillStyle = skyGrad;
            c.fillRect(0, 0, W, H);

            // Stars with twinkling
            for (var sk = 0; sk < stars.length; sk++) {
              var star = stars[sk];
              var twink = 0.5 + 0.5 * Math.sin(t2 * 2 + star.twinkle);
              c.globalAlpha = star.brightness * twink;
              c.fillStyle = '#ffffff';
              c.beginPath();
              c.arc(star.x, star.y, star.size, 0, Math.PI * 2);
              c.fill();
            }
            c.globalAlpha = 1;

            // ── Magnetic field lines ──
            // These were drawn at 8% alpha, which is invisible on a night sky:
            // one of the three navigation cues the panel is about simply was not
            // on screen. Now they read, and they carry direction arrows.
            for (var fli = 0; fli < fieldLines.length; fli++) {
              var fl2 = fieldLines[fli];
              c.beginPath();
              // Control points shared with the pulse maths below, so the moving
              // dot stays exactly on the curve it is meant to be travelling.
              var fc1 = fl2.startY - 62 * fl2.curve;
              var fc2 = fl2.endY + 48 * fl2.curve;
              c.moveTo(0, fl2.startY);
              c.bezierCurveTo(
                W * 0.3, fc1,
                W * 0.7, fc2,
                W, fl2.endY
              );
              c.strokeStyle = 'rgba(96,165,250,0.30)';
              c.lineWidth = 1;
              c.stroke();
              // A pulse travelling along the line shows the field's direction
              var fu = ((t2 * 0.16) + fli * 0.13) % 1;
              var fx = fu * W;
              var fy = fl2.startY * Math.pow(1 - fu, 3)
                + fc1 * 3 * fu * Math.pow(1 - fu, 2)
                + fc2 * 3 * fu * fu * (1 - fu)
                + fl2.endY * fu * fu * fu;
              c.beginPath();
              c.arc(fx, fy, 1.7, 0, Math.PI * 2);
              c.fillStyle = 'rgba(147,197,253,0.85)';
              c.fill();
            }

            // ── Polaris and the celestial pole ──
            var polarisX = W * 0.74;
            var polarisY = H * 0.16;
            // Trails: stars wheel about the pole through the night, which is
            // the cue a young bird actually learns
            for (var ri = 1; ri <= 4; ri++) {
              var trailR = ri * 22;
              c.beginPath();
              c.arc(polarisX, polarisY, trailR, 0, Math.PI * 2);
              c.strokeStyle = 'rgba(148,163,184,0.16)';
              c.lineWidth = 0.6;
              c.setLineDash([2, 5]);
              c.stroke();
              c.setLineDash([]);
              // A star riding each trail makes the rotation visible
              var sa2 = t2 * 0.28 / ri + ri * 1.7;
              c.beginPath();
              c.arc(polarisX + Math.cos(sa2) * trailR, polarisY + Math.sin(sa2) * trailR, 1.4, 0, Math.PI * 2);
              c.fillStyle = 'rgba(226,232,240,0.9)';
              c.fill();
            }

            // The Big Dipper, with its pointer stars actually aimed at Polaris.
            //
            // The previous layout claimed this in a comment but the geometry
            // said otherwise: the two stars drawn as pointers sat 117 degrees
            // off the bearing to Polaris, at 2.9x their own separation instead
            // of the real sky's ~5x, and the seven points did not form a dipper
            // (no closed bowl, handle not attached to it). A student following
            // the pointers -- the whole technique this tab teaches -- was aimed
            // nowhere near the pole.
            //
            // Rebuilt so Merak -> Dubhe extended five times over lands on
            // Polaris. Order traces the handle first, then round the bowl:
            //   Alkaid, Mizar, Alioth, Megrez | Dubhe, Merak, Phecda
            var DIPPER = [
              [-136, 78],  // Alkaid, tip of the handle
              [-117, 66],  // Mizar
              [-99, 56],   // Alioth
              [-79, 47],   // Megrez, where the handle meets the bowl
              [-86, 28],   // Dubhe   <- pointer, nearer the pole
              [-103, 33],  // Merak   <- pointer, further from the pole
              [-97, 52]    // Phecda, closing the bowl back toward Megrez
            ];
            var DIPPER_POINTERS = [4, 5];   // Dubhe, Merak
            var DIPPER_BOWL_CLOSE = [6, 3]; // Phecda -> Megrez
            c.strokeStyle = 'rgba(191,219,254,0.45)';
            c.lineWidth = 1;
            c.beginPath();
            for (var dp = 0; dp < DIPPER.length; dp++) {
              var dpx = polarisX + DIPPER[dp][0];
              var dpy = polarisY + DIPPER[dp][1];
              if (dp === 0) c.moveTo(dpx, dpy); else c.lineTo(dpx, dpy);
            }
            c.stroke();
            // The bowl is a quadrilateral; without this segment it read as a
            // bent line rather than a dipper.
            c.beginPath();
            c.moveTo(polarisX + DIPPER[DIPPER_BOWL_CLOSE[0]][0], polarisY + DIPPER[DIPPER_BOWL_CLOSE[0]][1]);
            c.lineTo(polarisX + DIPPER[DIPPER_BOWL_CLOSE[1]][0], polarisY + DIPPER[DIPPER_BOWL_CLOSE[1]][1]);
            c.stroke();
            for (var dp2 = 0; dp2 < DIPPER.length; dp2++) {
              c.beginPath();
              c.arc(polarisX + DIPPER[dp2][0], polarisY + DIPPER[dp2][1], (dp2 === DIPPER_POINTERS[0] || dp2 === DIPPER_POINTERS[1]) ? 2.2 : 1.6, 0, Math.PI * 2);
              c.fillStyle = '#e0f2fe';
              c.fill();
            }
            // Pointer line from the bowl to Polaris
            c.save();
            c.setLineDash([3, 4]);
            c.strokeStyle = 'rgba(253,230,138,0.45)';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(polarisX + DIPPER[DIPPER_POINTERS[1]][0], polarisY + DIPPER[DIPPER_POINTERS[1]][1]);
            c.lineTo(polarisX, polarisY);
            c.stroke();
            c.restore();

            // Polaris itself, with a small glow
            var pg2 = c.createRadialGradient(polarisX, polarisY, 0, polarisX, polarisY, 12);
            pg2.addColorStop(0, 'rgba(253,230,138,0.75)');
            pg2.addColorStop(1, 'rgba(253,230,138,0)');
            c.fillStyle = pg2;
            c.beginPath();
            c.arc(polarisX, polarisY, 12, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#fef3c7';
            c.beginPath();
            c.arc(polarisX, polarisY, 3, 0, Math.PI * 2);
            c.fill();
            migrChip(c, polarisX, polarisY - 15, 'Polaris', '#0f172a', 'rgba(253,230,138,0.92)', 'bold 8px system-ui');

            // ── Moon ──
            var moonX = W * 0.9;
            var moonY = H * 0.24;
            var mg = c.createRadialGradient(moonX, moonY, 6, moonX, moonY, 30);
            mg.addColorStop(0, 'rgba(226,232,240,0.28)');
            mg.addColorStop(1, 'rgba(226,232,240,0)');
            c.fillStyle = mg;
            c.beginPath();
            c.arc(moonX, moonY, 30, 0, Math.PI * 2);
            c.fill();
            // Gibbous disc clipped against the terminator, so the dark limb is
            // sky rather than a slightly-wrong dark circle painted on top
            c.save();
            c.beginPath();
            c.arc(moonX, moonY, 12, 0, Math.PI * 2);
            c.clip();
            c.fillStyle = '#e2e8f0';
            c.beginPath();
            c.arc(moonX, moonY, 12, 0, Math.PI * 2);
            c.fill();
            c.globalCompositeOperation = 'destination-out';
            c.beginPath();
            c.arc(moonX + 5, moonY - 2, 10.5, 0, Math.PI * 2);
            c.fill();
            c.globalCompositeOperation = 'source-over';
            // Maria
            c.fillStyle = 'rgba(148,163,184,0.55)';
            c.beginPath(); c.arc(moonX - 5, moonY + 2, 3, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(moonX - 8, moonY - 4, 2, 0, Math.PI * 2); c.fill();
            c.restore();

            // Compass in the corner
            drawCompassRose(c, 50, H - 52, 30, ((t2 * 3) % 360), true);

            // Migrating flock, in the V they actually hold
            for (var mbi = 0; mbi < navBirds.length; mbi++) {
              var nb = navBirds[mbi];
              nb.x += 0.35;
              nb.y += Math.sin(t2 * 2 + mbi) * 0.2;
              nb.phase += 0.09;
              if (nb.x > W + 24) nb.x = -24;
              drawBird(c, nb.x, nb.y, 7, nb.phase, 1, '#cbd5e1', true, 'goose');
            }

            // Cue key: the panel shows three navigation systems at once, and
            // nothing named them.
            var CUES = [
              { col: 'rgba(96,165,250,0.85)', label: t('stem.migration.cue_magnetic', 'magnetic field') },
              { col: 'rgba(253,230,138,0.9)', label: t('stem.migration.cue_star', 'star compass') },
              { col: 'rgba(203,213,225,0.9)', label: t('stem.migration.cue_moon', 'moonlight') }
            ];
            var cueTop = H - 26 - CUES.length * 13;
            migrPanel(c, W - 132, cueTop, 124, 12 + CUES.length * 13, true, null);
            c.textAlign = 'left';
            c.textBaseline = 'middle';
            c.font = '9px system-ui';
            for (var cu2 = 0; cu2 < CUES.length; cu2++) {
              var cuy = cueTop + 12 + cu2 * 13;
              c.fillStyle = CUES[cu2].col;
              c.beginPath();
              c.arc(W - 122, cuy, 3, 0, Math.PI * 2);
              c.fill();
              c.fillStyle = '#cbd5e1';
              c.fillText(CUES[cu2].label, W - 114, cuy);
            }
            c.textBaseline = 'alphabetic';

            // Horizon line
            c.fillStyle = '#1e293b';
            c.fillRect(0, H - 18, W, 18);
            // Distant tree silhouettes
            c.fillStyle = '#0f172a';
            for (var ti2 = 0; ti2 < 12; ti2++) {
              var tx = ti2 * (W / 12) + 20;
              var th = 8 + Math.sin(ti2 * 1.5) * 5;
              c.beginPath();
              c.moveTo(tx - 4, H - 18);
              c.lineTo(tx, H - 18 - th);
              c.lineTo(tx + 4, H - 18);
              c.closePath();
              c.fill();
            }

            // Label
            c.fillStyle = 'rgba(255,255,255,0.5)';
            c.font = '9px system-ui';
            c.textAlign = 'left';
            c.fillText('Nocturnal migration \u2014 birds navigate by stars, magnetic field, and moon', 10, H - 4);

            navAnimRef.current = requestAnimationFrame(frame);
          }

          frame();
          // Cleanup via MutationObserver (callback refs must not return a function in React 18)
          var obs5 = new MutationObserver(function() {
            if (!document.contains(canvas)) {
              if (navAnimRef.current) cancelAnimationFrame(navAnimRef.current);
              obs5.disconnect();
              canvas._nvInit = false;
            }
          });
          obs5.observe(document.body, { childList: true, subtree: true });
        };

        // Challenge state
        var challengeActive = d.challengeActive || false;
        var challengeStep = d.challengeStep || 0;
        var challengeEnergy = typeof d.challengeEnergy === 'number' ? d.challengeEnergy : 100;
        var challengeDistance = typeof d.challengeDistance === 'number' ? d.challengeDistance : 3000;
        var challengeDistRemaining = typeof d.challengeDistRemaining === 'number' ? d.challengeDistRemaining : 3000;
        var challengeWeather = d.challengeWeather || 'Clear';
        var challengeFlockSize = typeof d.challengeFlockSize === 'number' ? d.challengeFlockSize : 50;
        var challengeChoices = d.challengeChoices || null;
        var challengeResult = d.challengeResult || '';
        var challengeLoading = d.challengeLoading || false;
        var challengeScore = d.challengeScore || 0;
        var challengeComplete = d.challengeComplete || false;
        var challengeLog = d.challengeLog || [];

        function startChallenge() {
          updMulti({
            challengeActive: true,
            challengeStep: 0,
            challengeEnergy: 100,
            challengeDistance: 3000,
            challengeDistRemaining: 3000,
            challengeWeather: 'Clear',
            challengeFlockSize: 50,
            challengeChoices: null,
            challengeResult: '',
            challengeScore: 0,
            challengeComplete: false,
            challengeLog: []
          });
          generateDecision(0, 100, 3000, 'Clear', 50);
        }

        function generateDecision(step, energy, remaining, weather, flockSize) {
          if (!callGemini) return;
          upd('challengeLoading', true);
          var weathers = ['Clear', 'Overcast', 'Headwind', 'Tailwind', 'Thunderstorm', 'Fog', 'Crosswind', 'Snow Squall'];
          var newWeather = weathers[Math.floor(Math.random() * weathers.length)];
          var prompt = 'You are creating a bird migration survival game for a grade ' + (gradeLevel || 5) + ' student. The flock of ' + flockSize + ' Canada Geese is migrating south. Step ' + (step + 1) + ' of the journey. Energy: ' + energy + '%. Distance remaining: ' + remaining + ' miles. Weather: ' + newWeather + '. Create ONE decision point. Format your response EXACTLY as JSON (no markdown): {"scenario": "brief description of what the flock encounters", "choices": [{"label": "choice text", "energy_cost": number, "distance_gain": number, "flock_change": number, "result": "what happens"}]}. Give exactly 3 choices with different risk/reward tradeoffs. Energy costs should be -5 to -30. Distance gains 100-500. Flock changes -5 to +2. Make it educational about bird biology.';

          callGemini(prompt).then(function(result) {
            try {
              // Try to parse JSON from the response
              var jsonStr = result;
              var startIdx = jsonStr.indexOf('{');
              var endIdx = jsonStr.lastIndexOf('}');
              if (startIdx >= 0 && endIdx > startIdx) {
                jsonStr = jsonStr.substring(startIdx, endIdx + 1);
              }
              var parsed = JSON.parse(jsonStr);
              updMulti({
                challengeChoices: parsed,
                challengeWeather: newWeather,
                challengeLoading: false
              });
            } catch (e) {
              updMulti({
                challengeChoices: {
                  scenario: 'Your flock encounters ' + newWeather.toLowerCase() + ' conditions over a mountain range. Energy is at ' + energy + '%.',
                  choices: [
                    { label: t('stem.migration.push_through_the_weather', 'Push through the weather'), energy_cost: -20, distance_gain: 400, flock_change: -3, result: 'The flock battles through but loses some members to exhaustion.' },
                    { label: t('stem.migration.find_shelter_and_wait', 'Find shelter and wait'), energy_cost: -5, distance_gain: 0, flock_change: 0, result: 'The flock rests safely but makes no progress.' },
                    { label: t('stem.migration.detour_around', 'Detour around'), energy_cost: -12, distance_gain: 250, flock_change: -1, result: 'A longer but safer route. One bird gets separated.' }
                  ]
                },
                challengeWeather: newWeather,
                challengeLoading: false
              });
            }
          }).catch(function() {
            updMulti({
              challengeChoices: {
                scenario: 'The flock faces ' + newWeather.toLowerCase() + ' conditions. ' + remaining + ' miles remain.',
                choices: [
                  { label: t('stem.migration.keep_flying', 'Keep flying'), energy_cost: -15, distance_gain: 300, flock_change: -1, result: 'Steady progress at moderate cost.' },
                  { label: t('stem.migration.land_and_rest', 'Land and rest'), energy_cost: 10, distance_gain: 0, flock_change: 0, result: 'The flock recovers some energy.' },
                  { label: t('stem.migration.ride_thermals', 'Ride thermals'), energy_cost: -5, distance_gain: 200, flock_change: 0, result: 'Smart use of rising air currents saves energy.' }
                ]
              },
              challengeWeather: newWeather,
              challengeLoading: false
            });
          });
        }

        function makeChoice(choiceIdx) {
          if (!challengeChoices || !challengeChoices.choices) return;
          var choice = challengeChoices.choices[choiceIdx];
          if (!choice) return;

          var newEnergy = clamp(challengeEnergy + (choice.energy_cost || 0), 0, 100);
          var newRemaining = Math.max(0, challengeDistRemaining - (choice.distance_gain || 0));
          var newFlock = Math.max(1, challengeFlockSize + (choice.flock_change || 0));
          var newStep = challengeStep + 1;
          var newLog = challengeLog.concat([{
            step: challengeStep + 1,
            scenario: challengeChoices.scenario,
            choice: choice.label,
            result: choice.result,
            energy: newEnergy,
            remaining: newRemaining,
            flock: newFlock
          }]);

          var newScore = challengeScore + Math.round((choice.distance_gain || 0) / 10) + newFlock;

          // Check win/lose
          if (newRemaining <= 0) {
            updMulti({
              challengeStep: newStep,
              challengeEnergy: newEnergy,
              challengeDistRemaining: 0,
              challengeFlockSize: newFlock,
              challengeResult: choice.result,
              challengeScore: newScore + Math.round(newEnergy) + newFlock * 5,
              challengeComplete: true,
              challengeChoices: null,
              challengeLog: newLog
            });
            if (celebrate) celebrate();
            if (awardXP) awardXP('migration', 25, 'Migration complete');
            if (addToast) addToast('Migration complete! Your flock arrived safely. +25 XP', 'success');
            return;
          }

          if (newEnergy <= 0 || newFlock <= 0) {
            updMulti({
              challengeStep: newStep,
              challengeEnergy: newEnergy,
              challengeDistRemaining: newRemaining,
              challengeFlockSize: newFlock,
              challengeResult: choice.result,
              challengeScore: newScore,
              challengeComplete: true,
              challengeChoices: null,
              challengeLog: newLog
            });
            if (addToast) addToast('Your flock ran out of ' + (newEnergy <= 0 ? 'energy' : 'members') + '. Try again!', 'info');
            return;
          }

          updMulti({
            challengeStep: newStep,
            challengeEnergy: newEnergy,
            challengeDistRemaining: newRemaining,
            challengeFlockSize: newFlock,
            challengeResult: choice.result,
            challengeScore: newScore,
            challengeLog: newLog
          });

          // Generate next decision
          generateDecision(newStep, newEnergy, newRemaining, challengeWeather, newFlock);
        }

        return h('div', { className: 'space-y-4' },
          // Night sky navigation canvas
          h('div', { className: 'rounded-xl overflow-hidden border ' + borderCol },
            h('canvas', {
              ref: _nvInitCanvas,
              role: 'img',
              'aria-label': t('stem.migration.animated_night_sky_showing_nocturnal_b', 'Animated night sky showing nocturnal bird migration. Stars twinkle around Polaris, magnetic field lines curve across the sky, and a small flock migrates through the scene. Demonstrates how birds use stars and magnetic sense to navigate at night.'),
              tabIndex: 0,
              onKeyDown: function(e) {
                if (e.key === 'r' || e.key === 'R') {
                  if (callTTS) callTTS('Birds navigate using a combination of star patterns, Earth\'s magnetic field, the sun\'s position, landmarks, and even smell. Many songbirds migrate at night when the air is calmer and stars are visible.');
                }
              },
              style: { width: '100%', display: 'block' }
            })
          ),

          // Navigation methods
          h('div', { className: 'space-y-2' },
            h('h3', { className: 'font-bold text-sm ' + textPrimary }, t('stem.migration.how_birds_navigate', '\uD83E\uDDED How Birds Navigate')),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' },
              NAV_METHODS.map(function(nm) {
                var isExpanded = expandedNav === nm.id;
                return h('div', {
                  key: nm.id,
                  className: 'rounded-xl border transition-all cursor-pointer ' + (isExpanded ? 'ring-2 ring-sky-400 border-sky-400 ' + accentBg : borderCol + ' ' + cardBg + ' hover:border-sky-300'),
                  role: 'button',
                  tabIndex: 0,
                  'aria-expanded': isExpanded ? 'true' : 'false',
                  'aria-label': nm.name + '. ' + (isExpanded ? 'Click to collapse.' : 'Click to learn more.'),
                  onClick: function() { upd('expandedNav', isExpanded ? null : nm.id); },
                  onKeyDown: function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      upd('expandedNav', isExpanded ? null : nm.id);
                    }
                  }
                },
                  h('div', { className: 'p-3' },
                    h('div', { className: 'flex items-center gap-2 mb-1' },
                      h('span', { className: 'text-xl', 'aria-hidden': 'true' }, nm.icon),
                      h('span', { className: 'text-xs font-bold ' + textPrimary }, nm.name)
                    ),
                    isExpanded && h('p', { className: 'text-[11px] leading-relaxed mt-2 ' + textSecondary }, __alloT('stem.migration.' + (nm.id) + '_desc', nm.desc))
                  )
                );
              })
            )
          ),

          // Divider
          h('hr', { className: borderCol }),

          // Challenge game
          h('div', { className: 'space-y-3' },
            h('div', { className: 'flex items-center justify-between' },
              h('h3', { className: 'font-bold text-sm ' + textPrimary }, t('stem.migration.navigate_your_flock', '\uD83C\uDFAE Navigate Your Flock')),
              !challengeActive && h('button', {
                className: 'px-4 py-2 rounded-lg text-xs font-bold ' + btnPrimary,
                'aria-label': t('stem.migration.start_the_navigate_your_flock_challeng', 'Start the Navigate Your Flock challenge'),
                onClick: startChallenge
              }, t('stem.migration.start_challenge', '\uD83E\uDEBF Start Challenge'))
            ),

            !challengeActive && h('p', { className: 'text-xs ' + textSecondary },
              t('stem.migration.guide_a_flock_of_canada_geese_from_the', 'Guide a flock of Canada Geese from their breeding grounds in Northern Canada to their wintering grounds in the Southern US. Make decisions about weather, rest stops, and routes. Can you get your flock home safely?')
            ),

            // Active challenge
            challengeActive && h('div', { className: 'space-y-3' },
              // Status bar
              h('div', { className: 'grid grid-cols-4 gap-2 text-center' },
                h('div', { className: 'rounded-lg p-2 ' + cardBg + ' border ' + borderCol },
                  h('div', { className: 'text-[11px] ' + textMuted }, t('stem.migration.energy', '\u26A1 Energy')),
                  h('div', { className: 'mt-1 h-2 rounded-full ' + (isDark ? 'bg-slate-700' : 'bg-slate-200') + ' overflow-hidden' },
                    h('div', { className: 'h-full rounded-full transition-all ' + (challengeEnergy > 50 ? 'bg-green-500' : challengeEnergy > 25 ? 'bg-yellow-500' : 'bg-red-500'), style: { width: challengeEnergy + '%' } })
                  ),
                  h('div', { className: 'text-xs font-bold mt-1 ' + textPrimary }, challengeEnergy + '%')
                ),
                h('div', { className: 'rounded-lg p-2 ' + cardBg + ' border ' + borderCol },
                  h('div', { className: 'text-[11px] ' + textMuted }, t('stem.migration.distance_2', '\uD83D\uDCCD Distance')),
                  h('div', { className: 'mt-1 h-2 rounded-full ' + (isDark ? 'bg-slate-700' : 'bg-slate-200') + ' overflow-hidden' },
                    h('div', { className: 'h-full bg-sky-500 rounded-full transition-all', style: { width: ((challengeDistance - challengeDistRemaining) / challengeDistance * 100) + '%' } })
                  ),
                  h('div', { className: 'text-xs font-bold mt-1 ' + textPrimary }, challengeDistRemaining + ' mi left')
                ),
                h('div', { className: 'rounded-lg p-2 ' + cardBg + ' border ' + borderCol },
                  h('div', { className: 'text-[11px] ' + textMuted }, t('stem.migration.flock', '\uD83E\uDEBF Flock')),
                  h('div', { className: 'text-sm font-bold ' + textPrimary }, challengeFlockSize),
                  h('div', { className: 'text-[11px] ' + textMuted }, 'birds')
                ),
                h('div', { className: 'rounded-lg p-2 ' + cardBg + ' border ' + borderCol },
                  h('div', { className: 'text-[11px] ' + textMuted }, t('stem.migration.weather', '\uD83C\uDF24\uFE0F Weather')),
                  h('div', { className: 'text-[11px] font-bold ' + textPrimary }, challengeWeather),
                  h('div', { className: 'text-[11px] ' + textMuted }, 'Step ' + (challengeStep + 1))
                )
              ),

              // Last result
              challengeResult && h('div', { className: 'text-xs p-2 rounded-lg ' + (isDark ? 'bg-slate-700' : 'bg-sky-50') + ' ' + textSecondary, 'aria-live': 'polite', 'aria-atomic': 'true' },
                h('strong', null, t('stem.migration.last_result', 'Last result: ')), challengeResult
              ),

              // Decision
              challengeLoading && h('div', { className: 'text-center py-4 ' + textMuted, role: 'status', 'aria-live': 'polite' },
                h('span', { className: 'motion-reduce:animate-none animate-spin inline-block text-xl' }, '\uD83C\uDF00'),
                h('p', { className: 'text-xs mt-2' }, t('stem.migration.scouting_ahead', 'Scouting ahead...'))
              ),

              challengeChoices && !challengeComplete && h('div', { className: 'space-y-2' },
                h('div', { className: 'p-3 rounded-xl ' + cardBg + ' border ' + borderCol },
                  h('p', { className: 'text-xs font-medium ' + textPrimary }, challengeChoices.scenario)
                ),
                h('div', { className: 'grid gap-2' },
                  (challengeChoices.choices || []).map(function(ch, ci) {
                    return h('button', {
                      key: ci,
                      className: 'p-3 rounded-lg border text-left transition-all hover:ring-2 hover:ring-sky-300 ' + borderCol + ' ' + cardBg,
                      'aria-label': 'Choice ' + (ci + 1) + ': ' + ch.label,
                      onClick: function() { makeChoice(ci); }
                    },
                      h('div', { className: 'text-xs font-bold ' + textPrimary }, ch.label),
                      h('div', { className: 'flex gap-3 mt-1 text-[11px]' },
                        h('span', { className: (ch.energy_cost || 0) > 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold' }, '\u26A1 ' + (ch.energy_cost > 0 ? '+' : '') + ch.energy_cost + (ch.energy_cost > 0 ? ' gain' : ' cost')),
                        h('span', { className: 'text-sky-500 font-bold' }, '\uD83D\uDCCD +' + (ch.distance_gain || 0) + ' mi'),
                        ch.flock_change !== 0 && h('span', { className: (ch.flock_change > 0 ? 'text-green-600' : 'text-red-500') + ' font-bold' }, '\uD83E\uDEBF ' + (ch.flock_change > 0 ? '+' : '') + ch.flock_change + (ch.flock_change > 0 ? ' birds join' : ' birds lost'))
                      )
                    );
                  })
                )
              ),

              // Challenge complete
              challengeComplete && h('div', { className: 'text-center p-4 rounded-xl border ' + borderCol + ' ' + cardBg },
                challengeDistRemaining <= 0 ? h('div', null,
                  h('div', { className: 'text-3xl mb-2', 'aria-hidden': 'true' }, '\uD83C\uDF89'),
                  h('h4', { className: 'font-bold ' + textPrimary }, t('stem.migration.migration_complete', 'Migration Complete!')),
                  h('p', { className: 'text-xs ' + textSecondary + ' mt-1' }, challengeFlockSize + ' of 50 birds arrived safely.'),
                  h('p', { className: 'text-sm font-bold mt-2 ' + accent }, 'Score: ' + challengeScore)
                ) : h('div', null,
                  h('div', { className: 'text-3xl mb-2', 'aria-hidden': 'true' }, '\uD83D\uDE22'),
                  h('h4', { className: 'font-bold ' + textPrimary }, t('stem.migration.migration_failed', 'Migration Failed')),
                  h('p', { className: 'text-xs ' + textSecondary + ' mt-1' }, challengeEnergy <= 0 ? 'The flock ran out of energy.' : 'Too many birds were lost.'),
                  h('p', { className: 'text-xs ' + textSecondary }, 'You made it ' + (challengeDistance - challengeDistRemaining) + ' of ' + challengeDistance + ' miles.')
                ),
                h('button', {
                  className: 'mt-3 px-4 py-2 rounded-lg text-xs font-bold ' + btnPrimary,
                  'aria-label': t('stem.migration.try_the_migration_challenge_again', 'Try the migration challenge again'),
                  onClick: startChallenge
                }, t('stem.migration.try_again', '\uD83D\uDD04 Try Again'))
              ),

              // Journey log
              challengeLog.length > 0 && h('details', { className: 'text-xs ' + textSecondary },
                h('summary', { className: 'cursor-pointer font-bold ' + textPrimary + ' text-[11px]' }, '\uD83D\uDCDC Journey Log (' + challengeLog.length + ' steps)'),
                h('div', { className: 'mt-2 space-y-1 max-h-40 overflow-y-auto' },
                  challengeLog.map(function(entry, ei) {
                    return h('div', { key: ei, className: 'p-1.5 rounded ' + (isDark ? 'bg-slate-700/50' : 'bg-slate-100') },
                      h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'font-bold text-[11px] ' + accent }, 'Step ' + entry.step),
                        h('span', { className: 'text-[11px] ' + textMuted }, '\u26A1' + entry.energy + '% \u2022 ' + entry.remaining + 'mi \u2022 ' + entry.flock + ' birds')
                      ),
                      h('div', { className: 'text-[11px] mt-0.5' }, h('em', null, entry.choice), ' \u2014 ', entry.result)
                    );
                  })
                )
              )
            )
          ),

          // Divider
          h('hr', { className: borderCol }),

          // Threats to migratory birds
          h('div', { className: 'space-y-2' },
            h('h3', { className: 'font-bold text-sm ' + textPrimary }, t('stem.migration.threats_to_migratory_birds', '\u26A0\uFE0F Threats to Migratory Birds')),
            h('p', { className: 'text-[11px] ' + textSecondary }, t('stem.migration.migratory_birds_face_growing_dangers_u', 'Migratory birds face growing dangers. Understanding these threats is the first step toward conservation.')),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
              MIGRATION_THREATS.map(function(th, ti) {
                return h('div', { key: ti, className: 'rounded-lg p-3 border ' + borderCol + ' ' + cardBg },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg', 'aria-hidden': 'true' }, th.emoji),
                    h('span', { className: 'text-xs font-bold ' + textPrimary }, th.threat)
                  ),
                  h('p', { className: 'text-[11px] leading-relaxed ' + textSecondary }, th.desc)
                );
              })
            )
          ),

          // Conservation actions
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.what_you_can_do', '\uD83C\uDF31 What You Can Do')),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('ul', { className: 'list-disc pl-4 space-y-1' },
                h('li', null, h('strong', null, t('stem.migration.lights_out', 'Lights Out: ')), t('stem.migration.turn_off_unnecessary_lights_during_spr', 'Turn off unnecessary lights during spring and fall migration (March-May, August-November). Even a single dark building can save hundreds of birds per night.')),
                h('li', null, h('strong', null, t('stem.migration.window_decals', 'Window Decals: ')), t('stem.migration.apply_bird_safe_decals_to_windows_bird', 'Apply bird-safe decals to windows. Birds see reflections of sky and trees in glass, not the glass itself. Decals spaced 2 inches apart break up reflections.')),
                h('li', null, h('strong', null, t('stem.migration.native_plants', 'Native Plants: ')), t('stem.migration.plant_native_trees_and_shrubs_that_pro', 'Plant native trees and shrubs that produce berries and attract insects \u2014 critical fuel for migrating birds. Non-native plants often lack the insects birds need.')),
                h('li', null, h('strong', null, t('stem.migration.keep_cats_inside', 'Keep Cats Inside: ')), t('stem.migration.indoor_cats_live_longer_healthier_live', 'Indoor cats live longer, healthier lives AND save birds. Win-win.')),
                h('li', null, h('strong', null, t('stem.migration.citizen_science', 'Citizen Science: ')), t('stem.migration.use_apps_like_ebird_cornell_lab_to_rep', 'Use apps like eBird (Cornell Lab) to report bird sightings. Your data helps scientists track migration timing and population trends.')),
                h('li', null, h('strong', null, t('stem.migration.support_habitat', 'Support Habitat: ')), t('stem.migration.advocate_for_wetland_protection_and_re', 'Advocate for wetland protection and responsible wind energy siting in your community.'))
              )
            )
          ),

          // Did you know box
          h('div', { className: 'rounded-xl p-4 border-2 border-sky-400/50 ' + accentBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.did_you_know', '\uD83E\uDD14 Did You Know?')),
            h('div', { className: 'text-xs leading-relaxed space-y-2 ' + textSecondary },
              h('p', null, t('stem.migration.on_peak_migration_nights', 'On peak migration nights, '), h('strong', null, t('stem.migration.over_500_million_birds', 'over 500 million birds')), t('stem.migration.are_in_the_air_over_north_america_simu', ' are in the air over North America simultaneously. Weather radar stations detect massive clouds of migrants taking off at sunset. You can watch migration in real-time at BirdCast (birdcast.info).')),
              h('p', null, t('stem.migration.most_songbird_migration_happens_at_nig', 'Most songbird migration happens at night, when the air is calmer, predators are fewer, and stars are visible for navigation. Birds use the '), h('strong', null, t('stem.migration.setting_sun', 'setting sun')), t('stem.migration.to_calibrate_their_star_compass_at_dus', ' to calibrate their star compass at dusk.')),
              h('p', null, 'The ', h('strong', null, t('stem.migration.magnetic_sense', 'magnetic sense')), t('stem.migration.of_birds_may_work_through_quantum_mech', ' of birds may work through quantum mechanics. Cryptochrome proteins in bird eyes may use quantum entanglement to detect Earth\'s magnetic field \u2014 making bird navigation one of the few biological processes that depends on quantum physics.')),
              h('p', null, t('stem.migration.some_bird_species_can_detect_the', 'Some bird species can detect the '), h('strong', null, t('stem.migration.polarization_pattern', 'polarization pattern')), t('stem.migration.of_sunlight_even_through_heavy_cloud_c', ' of sunlight even through heavy cloud cover, using special UV-sensitive cone cells in their retinas. This means that even on overcast days, birds can determine the sun\'s position and maintain their heading.')),
              h('p', null, 'The ', h('strong', null, 'hippocampus'), t('stem.migration.the_brain_s_memory_center_is_significa', ' (the brain\'s memory center) is significantly larger in migratory bird species than in non-migratory ones. During the migration season, it actually grows in size, adding new neurons through a process called adult neurogenesis. After migration, it shrinks back. This seasonal brain plasticity is a major area of neuroscience research.'))
            )
          ),

          // Vocabulary builder
          h('div', { className: 'rounded-xl p-4 border ' + borderCol + ' ' + cardBg },
            h('h3', { className: 'font-bold text-sm mb-2 ' + textPrimary }, t('stem.migration.migration_vocabulary', '\uD83D\uDCD6 Migration Vocabulary')),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-1.5' },
              [
                { term: 'Zugunruhe', def: 'Migration restlessness; the urge to migrate' },
                { term: 'Hyperphagia', def: 'Extreme overeating before migration' },
                { term: 'Flyway', def: 'A broad migration corridor' },
                { term: 'Stopover', def: 'A rest/refueling site along the route' },
                { term: 'Philopatry', def: 'Returning to the same breeding site each year' },
                { term: 'Irruption', def: 'Irregular mass movement due to food scarcity' },
                { term: 'Austral', def: 'Southward migration (in Southern Hemisphere)' },
                { term: 'Boreal', def: 'Northward migration to breeding grounds' },
                { term: 'Diurnal', def: 'Migrating during daytime (raptors, swallows)' },
                { term: 'Nocturnal', def: 'Migrating at night (most songbirds)' },
                { term: 'Kettle', def: 'A group of birds circling in a thermal' },
                { term: 'Fallout', def: 'Mass emergency landing due to bad weather' }
              ].map(function(v) {
                return h('div', { key: v.term, className: 'rounded-lg p-2 ' + (isDark ? 'bg-slate-700/50' : 'bg-sky-50') },
                  h('div', { className: 'text-[11px] font-bold ' + accent }, v.term),
                  h('div', { className: 'text-[11px] ' + textSecondary }, v.def)
                );
              })
            )
          )
        );
      }

      // ══════════════════════════════════════════
      // MAIN RENDER
      // ══════════════════════════════════════════

      // Back button
      var backButton = h('button', {
        className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + btnSecondary,
        'aria-label': t('stem.migration.back_to_stem_lab_tool_list', 'Back to STEAM Lab tool list'),
        onClick: function() { if (setStemLabTool) setStemLabTool(null); }
      },
        ArrowLeft && h(ArrowLeft, { size: 14, 'aria-hidden': 'true' }),
        t('stem.migration.back', 'Back')
      );

      // Tab bar
      var tabBar = h('div', { className: 'migration-route-board', role: 'tablist', 'aria-label': t('stem.migration.migration_wind_lab_sections', 'Migration & Wind Lab sections') },
        TABS.map(function(tb, ti) {
          var active = tab === tb.id;
          return h('button', {
            key: tb.id,
            id: 'migration-tab-' + tb.id,
            type: 'button',
            role: 'tab',
            className: 'migration-route-tab ' + (active ? 'bg-sky-700 text-white' : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')),
            'aria-selected': active ? 'true' : 'false',
            'aria-controls': 'migration-active-panel',
            'aria-label': tb.label,
            tabIndex: active ? 0 : -1,
            onKeyDown: function(e) {
              var nextIdx = ti;
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (ti + 1) % TABS.length;
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (ti - 1 + TABS.length) % TABS.length;
              else if (e.key === 'Home') nextIdx = 0;
              else if (e.key === 'End') nextIdx = TABS.length - 1;
              else return;
              e.preventDefault();
              upd('tab', TABS[nextIdx].id);
              setTimeout(function() { var el = document.getElementById('migration-tab-' + TABS[nextIdx].id); if (el) el.focus(); }, 0);
            },
            onClick: function() { upd('tab', tb.id); }
          },
            h('span', { 'aria-hidden': 'true' }, tb.icon),
            h('span', { className: 'migration-route-label' }, tb.label)
          );
        })
      );

      // Tab content
      var tabContent = null;
      if (tab === 'flight3d') tabContent = renderFlight3D();
      else if (tab === 'vformation') tabContent = renderVFormation();
      else if (tab === 'wind') tabContent = renderWindCurrents();
      else if (tab === 'routes') tabContent = renderRoutes();
      else if (tab === 'aero') tabContent = renderAero();
      else if (tab === 'navigate') tabContent = renderNavigate();
      else if (tab === 'inquiry') tabContent = renderMigrationInquiry();

      function renderMigrationInquiry() {
        var iq = d.inquiry || { wingspan: 1.2, mass: 0.8, headwind: 0, vMode: 'V', distance: 4000, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
        function setIQ(patch) { upd('inquiry', Object.assign({}, iq, patch)); }
        function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
        // Approximate energy model. Drag ∝ mass^(2/3) / wingspan; V-formation saves ~22% drag.
        // Still-air cost per km: drag rises with mass and falls with span.
        var baseE = Math.pow(iq.mass, 0.67) / Math.max(0.1, iq.wingspan) * 8;
        // Wind, as the ground-speed ratio rather than a squared penalty.
        // The old term was (headwind * headwind) * 0.04, which charged a 10 m/s
        // TAILWIND exactly what it charged a 10 m/s headwind and made dead calm
        // the cheapest condition in the model. Energy per km over the ground
        // goes as airspeed / groundspeed, and groundspeed = airspeed - headwind,
        // so a tailwind genuinely cheapens the crossing and a headwind bites
        // hard. IQ_VAIR is a representative migrant cruising airspeed.
        var IQ_VAIR = 14;
        // Floor the groundspeed: past about 11 m/s of headwind the bird is
        // barely making ground and the ratio would run away to infinity.
        var iqGround = Math.max(IQ_VAIR * 0.2, IQ_VAIR - iq.headwind);
        var windFactor = IQ_VAIR / iqGround;
        var fmtSave = iq.vMode === 'V' ? 0.78 : iq.vMode === 'echelon' ? 0.88 : 1.0;
        var energyPerKm = baseE * fmtSave * windFactor;
        var totalKJ = energyPerKm * iq.distance;
        var fatBurnKJ = iq.mass * 1000 * 0.30 * 39; // 30% fat × 39 kJ/g
        var feasibility = fatBurnKJ / Math.max(1, totalKJ);
                // Band boundaries. 'fatal' stays at 0.5 because its own label states
        // "< 50% of distance" and the two must agree. The borderline/feasible
        // edge moves 0.9 -> 1.0: at 0.9 the bird needs 111% of its fat reserve
        // and runs out short of the destination, which is not "single-leg
        // flight realistic". Feasible now means it actually arrives.
        var state = feasibility < 0.5 ? 'fatal' : feasibility < 1.0 ? 'borderline' : feasibility < 1.5 ? 'feasible' : feasibility < 3 ? 'comfortable' : 'easy';
        // ── Panel skin ───────────────────────────────────────────────────
        // Every colour in this tab used to be a dark-theme literal, so the
        // whole card was a black slab on the light theme. The five states keep
        // their hue and swap their surface, and the ratios are matched across
        // themes rather than the luminance deltas: an equal delta on a dark
        // surface reads far heavier than on a light one.
        var IQ = isDark ? {
          text: '#e8f0f5', textDim: '#94a3b8', textSoft: '#cbd5e1',
          tile: '#0a0a1a', tileBorder: '#1e293b', track: '#0f172a', grid: '#1e293b',
          tick: '#f8fafc', hatchBg: '#1b0a0a', hatchLine: '#7f1d1d',
          onBar: '#0a0a1a', rangeInk: '#03212e', rangeInkOut: '#7dd3fc', needInkOut: '#cbd5e1'
        } : {
          text: '#0f172a', textDim: '#475569', textSoft: '#334155',
          tile: '#ffffff', tileBorder: '#cbd5e1', track: '#f1f5f9', grid: '#cbd5e1',
          tick: '#0f172a', hatchBg: '#fee2e2', hatchLine: '#fca5a5',
          onBar: '#ffffff', rangeInk: '#053345', rangeInkOut: '#0369a1', needInkOut: '#334155'
        };
        var sm = ({
          fatal: { label: t('stem.migration.fatal', 'Fatal'), color: isDark ? '#f87171' : '#b91c1c', bg: isDark ? '#2a0a0a' : '#fef2f2', border: '#dc2626', desc: t('stem.migration.energy_budget_50_of_distance_bird_woul', 'Energy budget < 50% of distance — bird would starve mid-flight. Stopover required.') },
          borderline: { label: t('stem.migration.borderline', 'Borderline'), color: isDark ? '#fb923c' : '#c2410c', bg: isDark ? '#2a1a0a' : '#fff7ed', border: '#ea580c', desc: t('stem.migration.energy_budget_near_distance_possible_w', 'Energy budget near distance — possible with perfect tailwind, otherwise stopovers mandatory.') },
          feasible: { label: t('stem.migration.feasible', 'Feasible'), color: isDark ? '#facc15' : '#a16207', bg: isDark ? '#2a2410' : '#fefce8', border: '#eab308', desc: t('stem.migration.single_leg_flight_realistic_but_tight_', 'Single-leg flight realistic but tight. Most species refuel midway anyway.') },
          comfortable: { label: t('stem.migration.comfortable', 'Comfortable'), color: isDark ? '#4ade80' : '#15803d', bg: isDark ? '#0a2e1a' : '#f0fdf4', border: '#16a34a', desc: t('stem.migration.distance_is_well_within_energy_budget_', 'Distance is well within energy budget. Bar-tailed godwit-class endurance.') },
          easy: { label: t('stem.migration.easy', 'Easy'), color: isDark ? '#22d3ee' : '#0e7490', bg: isDark ? '#0a1f2e' : '#ecfeff', border: '#0891b2', desc: t('stem.migration.3_reserve_either_short_distance_or_ove', '3×+ reserve. Either short distance or oversized fat stores.') }
        })[state];
        // Energy budget chart. The old bar clamped at 100%, so a bird needing
        // three times its fat reserve drew exactly the same picture as one that
        // just made it — the failure the whole tab is about was invisible.
        // Scale so 100% of the reserve sits at a fixed gridline and the deficit
        // runs past it into a marked overspend zone.
        var demandPct = totalKJ / Math.max(1, fatBurnKJ);
        var BAR_X = 12;
        var BAR_FULL = 200;            // x-offset of the "reserve exhausted" line
        var BAR_MAX = 296;             // hard right edge of the plot
        var demandW = Math.min(BAR_MAX - BAR_X, demandPct * BAR_FULL);
        var overspends = demandPct > 1;
        var rangeKm = energyPerKm > 0 ? fatBurnKJ / energyPerKm : 0;
        var rangeScale = Math.max(rangeKm, iq.distance, 1);
        var rangeBarW = Math.max(2, (rangeKm / rangeScale) * (BAR_MAX - BAR_X));
        var needBarW = Math.max(2, (iq.distance / rangeScale) * (BAR_MAX - BAR_X));
        return h('div', { style: { padding: 14, borderRadius: 12, background: sm.bg, border: '1px solid ' + sm.border, color: IQ.text } },
          h('h3', { style: { margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: sm.color, textTransform: 'uppercase', letterSpacing: 1 } }, t('stem.migration.energy_inquiry_can_the_bird_make_it', '🔬 Energy Inquiry — Can the bird make it?')),
          h('p', { style: { margin: '0 0 8px', fontSize: 11, opacity: 0.85, lineHeight: 1.4 } }, t('stem.migration.pick_wingspan_mass_headwind_formation_', 'Pick wingspan, mass, headwind, formation, and distance. Predict the energy state. No score, no reveal.')),
          h('div', { style: { display: 'inline-block', padding: '4px 10px', borderRadius: '999rem', background: sm.color, color: isDark ? '#000' : '#fff', fontSize: 11, fontWeight: 800, marginBottom: 6 } }, sm.label + ' · reserve ratio ' + feasibility.toFixed(2) + 'x'),
          h('p', { style: { margin: '0 0 10px', fontSize: 11, opacity: 0.8 } }, sm.desc),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 } },
            [
              { label: 'Energy/km', val: energyPerKm.toFixed(2) + ' kJ' },
              { label: t('stem.migration.total_need', 'Total need'), val: totalKJ.toFixed(0) + ' kJ' },
              { label: t('stem.migration.fat_budget', 'Fat budget'), val: fatBurnKJ.toFixed(0) + ' kJ' }
            ].map(function(m) {
              return h('div', { key: m.label, style: { padding: 6, borderRadius: 4, background: IQ.tile, border: '1px solid ' + sm.border, textAlign: 'center' } },
                h('div', { style: { fontSize: 9, opacity: 0.6 } }, m.label),
                h('div', { style: { fontSize: 11, fontWeight: 700, color: sm.color, fontFamily: 'monospace' } }, m.val)
              );
            })
          ),
          h('svg', {
            width: '100%', viewBox: '0 0 320 148', preserveAspectRatio: 'xMidYMid meet', role: 'img',
            'aria-label': t('stem.migration.fat_reserve_chart', 'Fat reserve chart showing the energy needed for the current flight.') +
              ' This flight needs ' + Math.round(demandPct * 100) + ' percent of the available fat reserve. ' +
              'Range on this fat is ' + Math.round(rangeKm) + ' kilometres against a required ' + iq.distance + ' kilometres.',
            style: { background: IQ.tile, borderRadius: 6, marginBottom: 10, display: 'block', width: '100%', maxWidth: 560, height: 'auto' }
          },
            h('defs', null,
              h('pattern', { id: 'migrDeficitHatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
                h('rect', { width: 6, height: 6, fill: IQ.hatchBg }),
                h('rect', { width: 2, height: 6, fill: IQ.hatchLine })
              )
            ),
            // ── Energy demand against the fat reserve ──
            h('text', { x: BAR_X, y: 16, fill: IQ.textDim, fontSize: 10 }, t('stem.migration.energy_demand_vs_fat', 'Energy demand vs fat reserve')),
            // Overspend zone beyond the reserve line
            h('rect', { x: BAR_X + BAR_FULL, y: 24, width: BAR_MAX - BAR_X - BAR_FULL, height: 24, fill: 'url(#migrDeficitHatch)' }),
            h('rect', { x: BAR_X, y: 24, width: BAR_FULL, height: 24, fill: IQ.track, stroke: IQ.grid }),
            // Quarter gridlines, so the bar can be read without a number
            [0.25, 0.5, 0.75].map(function(g) {
              return h('line', { key: g, x1: BAR_X + BAR_FULL * g, y1: 24, x2: BAR_X + BAR_FULL * g, y2: 48, stroke: IQ.grid, strokeWidth: 1 });
            }),
            h('rect', { x: BAR_X, y: 24, width: Math.min(BAR_FULL, demandW), height: 24, fill: sm.color, opacity: 0.85 }),
            // Whatever the flight needs beyond the reserve, drawn in the red
            overspends && h('rect', { x: BAR_X + BAR_FULL, y: 24, width: Math.max(2, demandW - BAR_FULL), height: 24, fill: '#dc2626', opacity: 0.9 }),
            // The line the bird cannot cross
            h('line', { x1: BAR_X + BAR_FULL, y1: 20, x2: BAR_X + BAR_FULL, y2: 52, stroke: IQ.tick, strokeWidth: 1.5 }),
            h('text', { x: BAR_X + BAR_FULL - 3, y: 60, fill: IQ.textSoft, fontSize: 8, textAnchor: 'end' }, t('stem.migration.fat_exhausted', 'fat exhausted (100%)')),
            h('text', { x: BAR_X + 5, y: 41, fill: IQ.onBar, fontSize: 10, fontWeight: 700 }, Math.round(demandPct * 100) + '%'),
            demandPct > 1.48 && h('text', { x: BAR_MAX + 2, y: 41, fill: '#f87171', fontSize: 11, fontWeight: 700 }, '»'),

            // ── Range achievable against the distance asked for ──
            h('text', { x: BAR_X, y: 82, fill: IQ.textDim, fontSize: 10 }, t('stem.migration.range_vs_distance', 'Range on this fat vs distance asked')),
            h('rect', { x: BAR_X, y: 88, width: rangeBarW, height: 12, fill: '#38bdf8', opacity: 0.85 }),
            h('text', {
              x: rangeBarW > 90 ? BAR_X + 4 : BAR_X + rangeBarW + 5, y: 98,
              fill: rangeBarW > 90 ? IQ.rangeInk : IQ.rangeInkOut, fontSize: 8, fontWeight: 700
            }, t('stem.migration.range_label', 'range') + ' ' + Math.round(rangeKm).toLocaleString() + ' km'),
            h('rect', { x: BAR_X, y: 104, width: needBarW, height: 12, fill: overspends ? '#dc2626' : '#4ade80', opacity: 0.85 }),
            h('text', {
              x: needBarW > 90 ? BAR_X + 4 : BAR_X + needBarW + 5, y: 114,
              fill: needBarW > 90 ? IQ.onBar : IQ.needInkOut, fontSize: 8, fontWeight: 700
            }, t('stem.migration.needed_label', 'needed') + ' ' + iq.distance.toLocaleString() + ' km'),

            h('text', { x: BAR_X, y: 138, fill: IQ.textDim, fontSize: 9 },
              'headwind ' + iq.headwind + ' m/s · ' + iq.vMode + ' (saves ' + Math.round((1 - fmtSave) * 100) + '%) · ' + energyPerKm.toFixed(2) + ' kJ/km')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 12px', marginBottom: 10 } },
            h('label', null,
              h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, t('stem.migration.wingspan', 'Wingspan')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.wingspan.toFixed(2) + ' m')),
              h('input', { type: 'range', min: 0.1, max: 3.0, step: 0.05, value: iq.wingspan, onChange: function(e) { setKey('wingspan', parseFloat(e.target.value)); }, style: { width: '100%' } })
            ),
            h('label', null,
              h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, t('stem.migration.mass', 'Mass')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.mass.toFixed(2) + ' kg')),
              h('input', { type: 'range', min: 0.05, max: 12, step: 0.05, value: iq.mass, onChange: function(e) { setKey('mass', parseFloat(e.target.value)); }, style: { width: '100%' } })
            ),
            h('label', null,
              h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, t('stem.migration.headwind', 'Headwind')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.headwind + ' m/s')),
              h('input', { type: 'range', min: -10, max: 20, step: 1, value: iq.headwind, onChange: function(e) { setKey('headwind', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
            ),
            h('label', null,
              h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, t('stem.migration.distance_3', 'Distance')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.distance + ' km')),
              h('input', { type: 'range', min: 100, max: 15000, step: 100, value: iq.distance, onChange: function(e) { setKey('distance', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
            )
          ),
          h('div', { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
            ['solo', 'echelon', 'V'].map(function(f) {
              var active = iq.vMode === f;
              return h('button', { key: f, onClick: function() { setKey('vMode', f); }, style: { padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid ' + (active ? sm.color : IQ.tileBorder), background: active ? sm.color : IQ.tile, color: active ? (isDark ? '#000' : '#fff') : IQ.textDim, cursor: 'pointer' } }, f);
            })
          ),
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
            h('button', { onClick: function() {
              var t = new Date().toISOString().slice(11, 19);
              setIQ({ log: iq.log.concat([{ t: t, w: iq.wingspan.toFixed(2), m: iq.mass.toFixed(2), hw: iq.headwind, fmt: iq.vMode, d: iq.distance, fr: feasibility.toFixed(2), state: sm.label }]) });
            }, style: { flex: 1, padding: 6, fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid ' + sm.border, background: sm.bg, color: sm.color, cursor: 'pointer' } }, t('stem.migration.log_this_profile', '📋 Log this profile')),
            h('button', { onClick: function() { setIQ({ wingspan: 1.2, mass: 0.8, headwind: 0, vMode: 'V', distance: 4000 }); }, style: { padding: '6px 10px', fontSize: 11, borderRadius: 6, border: '1px solid ' + IQ.tileBorder, background: IQ.tile, color: IQ.textDim, cursor: 'pointer' } }, t('stem.migration.reset', 'Reset'))
          ),
          iq.log.length > 0 && h('div', { style: { maxHeight: 80, overflow: 'auto', padding: 6, borderRadius: 6, background: IQ.tile, border: '1px solid ' + IQ.tileBorder, marginBottom: 10, fontSize: 10, fontFamily: 'monospace', lineHeight: 1.4 } },
            iq.log.slice(-5).map(function(e, i) { return h('div', { key: i }, e.t + '  ' + e.state + ' · w' + e.w + ' m' + e.m + ' hw' + e.hw + ' ' + e.fmt + ' d' + e.d + ' → ' + e.fr + 'x'); })
          ),
          h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.85, marginBottom: 4 } }, t('stem.migration.your_hypothesis_which_parameter_forces', 'Your hypothesis (which parameter forces the most stopovers?)')),
          h('textarea', { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, 'aria-label': t('stem.migration.hypothesis_input', 'Migration energy hypothesis'), placeholder: t('stem.migration.e_g_v_formation_savings_only_pay_off_a', 'e.g., V-formation savings only pay off above 1500 km because takeoff cost dominates...'), style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: IQ.tile, color: IQ.text, fontSize: 11, marginBottom: 10, resize: 'vertical' } }),
          !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '6px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid ' + IQ.tileBorder, background: IQ.tile, color: sm.color, cursor: 'pointer', marginBottom: 10 } }, t('stem.migration.i_m_stuck_show_open_questions', "🤔 I'm stuck — show open questions")),
          iq.stuckRevealed && h('div', { style: { padding: 10, borderRadius: 6, background: IQ.tile, border: '1px dashed ' + sm.border, fontSize: 11, marginBottom: 10, lineHeight: 1.5 } },
            h('div', { style: { fontWeight: 700, color: sm.color, marginBottom: 4 } }, t('stem.migration.open_questions_no_answer_key', 'Open questions (no answer key)')),
            h('ul', { style: { margin: 0, paddingLeft: 16 } },
              h('li', null, t('stem.migration.why_would_a_heavier_bird_necessarily_n', 'Why would a heavier bird necessarily need MORE energy per km — what does that have to do with drag?')),
              h('li', null, t('stem.migration.a_10_m_s_headwind_doubles_the_work_wha', 'A 10 m/s headwind doubles the work — what happens if half the journey has 10 m/s tailwind?')),
              h('li', null, t('stem.migration.why_is_v_formation_savings_about_22_wh', 'Why is V-formation savings about 22%? What does it cost the lead bird?')),
              h('li', null, t('stem.migration.how_does_a_hummingbird_4_g_1500_km_gul', 'How does a hummingbird (4 g, 1500 km Gulf of Mexico crossing) even survive its migration?'))
            )
          ),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: 6 } },
            h('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
            h('span', null, t('stem.migration.i_can_explain_why_this_profile_yields_', 'I can explain why this profile yields this energy state.'))
          ),
          iq.understood && h('textarea', { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, 'aria-label': t('stem.migration.explanation_input', 'Migration energy explanation'), placeholder: t('stem.migration.explain_in_your_own_words', 'Explain in your own words...'), style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: IQ.tile, color: IQ.text, fontSize: 11, marginBottom: 6, resize: 'vertical' } }),
          h('p', { style: { margin: 0, fontSize: 10, fontStyle: 'italic', opacity: 0.6 } }, t('stem.migration.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget — no score, no reveal, no answer dump. Energy model is illustrative (drag ∝ m^0.67 / wingspan). V-formation savings vary ~10–30% across species and positions (Lissaman & Shollenberger 1970 theoretical upper bound; in-flight measurements include Weimerskirch et al. 2001 on pelicans and Portugal et al. 2014 on ibises). Widget uses 22% as a midpoint estimate. For real-world stopover ecology consult primary literature.'))
        );
      }

      // Topic-accent hero band per tab
      var TAB_META = {
        flight3d:  { accent: '#38bdf8', soft: 'rgba(14,116,144,0.16)', icon: '\uD83C\uDF10', title: t('stem.migration.flight_3d_title', '3D migration flight'), hint: t('stem.migration.flight_3d_hint', 'Fly through a dimensional migration corridor with species-specific flocking, terrain, route beacons, wind, camera views, and an explicit Monarch relay simulation.') },
        vformation: { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)',  icon: '\uD83E\uDEBF', title: t('stem.migration.v_formation_flying', 'V-formation flying'),         hint: t('stem.migration.trailing_birds_catch_the_upwash_from_t', 'Trailing birds catch the upwash from the bird ahead \u2014 20\u201330% energy savings. Lead position rotates because the front bird does the most work.') },
        wind:       { accent: '#06b6d4', soft: 'rgba(6,182,212,0.10)',   icon: '\uD83C\uDF2C\uFE0F', title: t('stem.migration.wind_currents_thermals', 'Wind currents + thermals'),   hint: t('stem.migration.birds_read_pressure_gradients_we_canno', 'Birds read pressure gradients we cannot feel. Updrafts, ridge lift, and thermal columns are how raptors fly hundreds of miles burning almost no calories.') },
        routes:     { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)',   icon: '\uD83D\uDDFA\uFE0F', title: t('stem.migration.migration_routes_flyways', 'Migration routes + flyways'),  hint: t('stem.migration.four_major_north_american_flyways_paci', 'Four major North American flyways (Pacific, Central, Mississippi, Atlantic) channel billions of birds twice yearly. Maine sits at the top of the Atlantic Flyway.') },
        aero:       { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)',  icon: '\u2708\uFE0F', title: t('stem.migration.aerodynamics_of_bird_flight', 'Aerodynamics of bird flight'), hint: t('stem.migration.wing_shape_aspect_ratio_camber_tunes_l', 'Wing shape (aspect ratio + camber) tunes lift vs drag. Soaring birds = high aspect ratio, slow wingbeat. Hummingbirds = low AR, 60+ Hz wingbeat.') },
        navigate:   { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)',  icon: '\uD83E\uDDED', title: t('stem.migration.weather_navigation', 'Weather + navigation'),       hint: t('stem.migration.birds_use_multiple_cues_simultaneously', 'Birds use multiple cues simultaneously \u2014 sun compass, magnetic field via cryptochrome in the eye, star patterns, and learned landmarks. Robust against losing any single cue.') },
        inquiry:    { accent: '#ec4899', soft: 'rgba(236,72,153,0.10)', icon: '\uD83D\uDD2C', title: t('stem.migration.energy_inquiry', 'Energy inquiry'), hint: t('stem.migration.energy_inquiry_hint', 'Test how wingspan, body mass, wind, formation, and distance combine to determine whether a migration leg is feasible.') }
      };
      var meta = TAB_META[tab] || TAB_META.flight3d;
      var tabHero = h('div', {
        className: 'migration-active-band', 'data-migration-route': tab,
        style: {
          padding: '12px 14px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(15,23,42,0) 100%)',
          border: '1px solid ' + meta.accent + '55',
          borderLeft: '4px solid ' + meta.accent,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
        }
      },
        h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
        h('div', { style: { flex: 1, minWidth: 220 } },
          h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
          h('p', { style: { margin: '3px 0 0', color: (isDark || isContrast) ? '#cbd5e1' : '#475569', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
        )
      );

      var activeTab = TABS.filter(function(item) { return item.id === tab; })[0] || TABS[0];
      var species = SPECIES.filter(function(item) { return item.id === (d.flightSpecies || d.selectedSpecies || 'canada_goose'); })[0] || SPECIES[0];
      return h('main', { className: 'migration-tool-shell space-y-3 ' + bg, 'data-migration-tool': 'true' },
        h('header', { className: 'migration-command', 'data-migration-mission': 'true' },
          h('div', { className: 'migration-command-main' },
            backButton,
            h('div', { className: 'migration-command-copy' },
              h('p', { className: 'migration-eyebrow' }, t('stem.migration.field_station', 'Migration field station')),
              h('h2', null, t('stem.migration.title', 'Migration & Wind Lab')),
              h('p', null, t('stem.migration.v_formation_wind_currents_flyways_aero', '3D flight - Monarch migration - V-formation - Wind currents - Flyways - Aerodynamics - Navigation'))
            )
          ),
          h('span', { className: 'migration-command-icon', 'aria-hidden': 'true' }, '\uD83E\uDDED')
        ),
        h('section', { className: 'migration-metrics', 'aria-label': t('stem.migration.field_status', 'Migration field status') },
          [
            { label: t('stem.migration.active_activity', 'Active activity'), value: activeTab.label },
            { label: t('stem.migration.focus_species', 'Focus species'), value: species.name },
            { label: t('stem.migration.formation_status', 'Formation status'), value: tab === 'flight3d' ? flightFormationName(species, d.flightFormation || 'natural') + ' flight' : (d.perfectVFormed ? 'Perfect V formed' : 'Formation in progress') },
            { label: t('stem.migration.routes_planned', 'Routes planned'), value: String(d.routesPlanned || 0) }
          ].map(function(metric) {
            return h('div', { key: metric.label, className: 'migration-metric' },
              h('span', { className: 'migration-metric-label' }, metric.label),
              h('span', { className: 'migration-metric-value', title: metric.value }, metric.value)
            );
          })
        ),
        tabBar,
        tabHero,
        h('section', { id: 'migration-active-panel', className: 'migration-workspace', role: 'tabpanel', 'aria-labelledby': 'migration-tab-' + tab, tabIndex: 0, 'data-migration-workspace': tab }, tabContent)
      );
    }
  });

})();
} // end duplicate guard
