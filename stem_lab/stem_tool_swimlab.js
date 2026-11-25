// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════════════════════════════════════
// stem_tool_watersafety.js — SwimLab
// Education-only water safety, drowning prevention, and aquatic emergency response.
// 8 modules + Resources tab covering: cold water shock + 1-1-10 rule, rip currents,
// reach/throw/row/don't go bystander rescue, life jackets (PFDs), ice safety + self-
// rescue, hypothermia recognition, pool drain entrapment, and autism + water safety
// (children: ~160x higher drowning risk, Guan & Li 2017, Columbia University / Am J Public Health).
//
// All concrete claims cite primary sources: CDC, USCG, AAP, NAA, ASAN, DAN, NOAA,
// US Lifesaving Association, Cold Water Boot Camp / Mario Vittone, Maine Department
// of Inland Fisheries & Wildlife, CPSC (Pool Safely), Virginia Graeme Baker Act,
// USA Swimming Foundation, Special Olympics, NOLS Wilderness First Aid.
//
// PRACTICE LABS (2026-11-23): Rip Escape, Cold Water 1-1-10, Rescue Ladder, Why You
// Float and Stroke Efficiency. Each lab teaches what its module already cites; every
// number comes from window.StemLab.SwimLabModel (tests/swimlab_model.test.js). A lab
// never rewards the dangerous choice, and progress is counted from saved results.
//
// EDUCATIONAL ONLY. Does NOT teach swimming. For swim instruction find a certified
// Water Safety Instructor (WSI) at your local Red Cross or YMCA. In a real emergency:
// call 911 (text 911 in Maine).
//
// Framing: "Whoever saves a single soul, scripture considers it as if they saved
// an entire world." (Mishnah Sanhedrin 4:5 / Pirkei Avot)
// ═══════════════════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('swimLab'))) {

(function() {
  'use strict';

  // Print stylesheet — teachers print modules as classroom handouts. Hide UI
  // chrome (back/print buttons, "Try again", AI input controls); print white
  // background. Note: scenario answers stay hidden if not revealed before
  // printing — that is acceptable since the bulk of each module (key points,
  // callouts, sources) prints as a clean handout. Discussion-style scenarios
  // are then run live in class.
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('swimlab-print-css')) return;
    var st = document.createElement('style');
    st.id = 'swimlab-print-css';
    st.textContent = [
      '@media print {',
      '  .swimlab-no-print { display: none !important; }',
      '  body { background: white !important; }',
      // Force-expand teacher notes on print so handouts include standards,
      // discussion questions, and misconceptions even if the user did not
      // expand the <details> block on screen.
      '  details.swimlab-teacher-notes { display: block !important; }',
      '  details.swimlab-teacher-notes > summary { list-style: none; cursor: default; }',
      '  details.swimlab-teacher-notes[open] > *,',
      '  details.swimlab-teacher-notes > * { display: block !important; }',
      '}'
    ].join('\n');
    if (document.head) document.head.appendChild(st);
  })();

  if (typeof document !== 'undefined' && !document.getElementById('swimlab-readiness-css')) {
    var swimReadinessStyle = document.createElement('style');
    swimReadinessStyle.id = 'swimlab-readiness-css';
    swimReadinessStyle.textContent = [
      // ★The shell declared an INK (#e6f4ff) but no GROUND, and this whole stylesheet is
      // dark-only: .swimlab-section is rgba(15,23,42,.65) and .swimlab-action-note is
      // #bae6fd. Over the light page those composited to a mid-grey #5e6675 carrying
      // light text -- 2.25:1 and 4.35:1. The tool's INLINE styles are correctly
      // theme-aware through T; only this block was not, so give it the dark ground its
      // alphas and inks were written against.
      '.swimlab-menu-shell{width:min(100%,1080px);margin:0 auto;padding:8px;color:#e6f4ff;background:#0c2233;border-radius:16px;display:grid;gap:14px;}',
      '.swimlab-menu-shell *{box-sizing:border-box;}',
      '.swimlab-command{padding:20px;border:1px solid rgba(56,189,248,.42);border-radius:20px;background:radial-gradient(circle at 90% 10%,rgba(14,165,233,.24),transparent 34%),linear-gradient(135deg,rgba(7,89,133,.72),rgba(2,6,23,.98) 66%);box-shadow:0 18px 44px rgba(2,6,23,.28);}',
      '.swimlab-command-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}',
      '.swimlab-eyebrow{margin:0 0 7px;color:#bae6fd;font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;}',
      '.swimlab-title{margin:0;color:#f8fafc;font-size:clamp(22px,3vw,31px);line-height:1.12;}',
      '.swimlab-subtitle{max-width:720px;margin:8px 0 0;color:#dbeafe;font-size:13px;line-height:1.55;}',
      '.swimlab-status{flex:0 0 auto;padding:8px 11px;border:1px solid rgba(125,211,252,.34);border-radius:999rem;background:rgba(2,6,23,.62);color:#bae6fd;font-size:12px;font-weight:800;white-space:nowrap;}',
      '.swimlab-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:17px;}',
      '.swimlab-metric{min-width:0;padding:10px;border:1px solid rgba(148,163,184,.18);border-radius:12px;background:rgba(15,23,42,.7);}',
      '.swimlab-metric-label{display:block;color:#94a3b8;font-size:12px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;}',
      '.swimlab-metric-value{display:block;margin-top:3px;color:#f8fafc;font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.swimlab-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:15px;}',
      '.swimlab-primary{min-height:44px;padding:10px 16px;border:1px solid rgba(224,242,254,.4);border-radius:12px;background:linear-gradient(135deg,#0369a1,#075985);color:#fff;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(2,132,199,.23);transition:transform .18s,box-shadow .18s;}',
      '.swimlab-primary:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(2,132,199,.3);}',
      '.swimlab-action-note{color:#bae6fd;font-size:12px;line-height:1.4;}',
      '.swimlab-section{padding:16px;border:1px solid #334155;border-radius:16px;background:rgba(15,23,42,.65);}',
      '.swimlab-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px;}',
      '.swimlab-section-head h3{margin:0;color:#f8fafc;font-size:15px;}',
      '.swimlab-section-head p{margin:3px 0 0;color:#94a3b8;font-size:12px;line-height:1.45;}',
      '.swimlab-essential-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;}',
      '.swimlab-tile-wrap{min-width:0;}',
      '.swimlab-menu-tile{width:100%;height:100%;min-height:132px;transition:transform .18s,border-color .18s,box-shadow .18s;}',
      '.swimlab-menu-tile:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(2,6,23,.24);}',
      '.swimlab-menu-tile--compact{min-height:108px;}',
      '.swimlab-catalog{border:1px solid #334155;border-radius:16px;background:rgba(15,23,42,.72);overflow:hidden;}',
      '.swimlab-catalog summary{min-height:50px;padding:14px 16px;cursor:pointer;color:#e0f2fe;font-size:12px;font-weight:900;}',
      '.swimlab-catalog-body{display:grid;gap:16px;padding:0 14px 14px;}',
      '.swimlab-catalog-section h3{margin:0 0 4px;color:#7dd3fc;font-size:12px;text-transform:uppercase;letter-spacing:.06em;}',
      '.swimlab-catalog-section p{margin:0 0 9px;color:#94a3b8;font-size:12px;line-height:1.45;}',
      '.swimlab-catalog-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;}',
      '.swimlab-badges{padding:13px;border:1px solid #334155;border-radius:14px;background:#0f172a;}',
      '.swimlab-quote{padding:13px 15px;border-left:3px solid #38bdf8;border-radius:0 12px 12px 0;background:rgba(14,165,233,.07);color:#94a3b8;font-size:12px;font-style:italic;line-height:1.55;}',
      '@media(max-width:820px){.swimlab-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}.swimlab-essential-grid,.swimlab-catalog-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media(max-width:560px){.swimlab-menu-shell{padding:0;}.swimlab-command{padding:14px;border-radius:16px;}.swimlab-command-top{flex-direction:column;}.swimlab-status{white-space:normal;}.swimlab-essential-grid,.swimlab-catalog-grid{grid-template-columns:1fr;}.swimlab-primary{width:100%;}.swimlab-actions{align-items:stretch;}.swimlab-action-note{width:100%;}.swimlab-menu-tile{min-height:100px;}}',
      // Practice labs
      '.swimlab-lab{padding:20px;}',
      '.swimlab-lab *{box-sizing:border-box;}',
      '.swimlab-lab-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start;}',
      '.swimlab-lab-cards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;}',
      '.swimlab-lab-card{display:flex;flex-direction:column;align-items:flex-start;gap:5px;width:100%;height:100%;min-height:112px;padding:12px;border-radius:14px;border:1px solid rgba(125,211,252,.5);background:rgba(2,6,23,.55);color:#f8fafc;text-align:left;cursor:pointer;font:inherit;transition:transform .18s,border-color .18s;}',
      '.swimlab-lab-card:hover{transform:translateY(-2px);border-color:#7dd3fc;}',
      '.swimlab-lab-card-name{font-size:14px;font-weight:900;line-height:1.25;}',
      '.swimlab-lab-card-blurb{font-size:12px;line-height:1.4;color:#dbeafe;}',
      '.swimlab-lab-card-state{margin-top:auto;font-size:12px;font-weight:800;color:#bae6fd;}',
      '.swimlab-lab-card-state--done{color:#86efac;}',
      '.swimlab-brand{display:flex;align-items:flex-start;gap:14px;flex:1 1 280px;min-width:0;}',
      '.swimlab-tl-narrow{display:none;}',
      '.sw-swimmer{transition:transform .5s ease-out;}',
      '@media(max-width:980px){.swimlab-lab-cards{grid-template-columns:repeat(3,minmax(0,1fr));}}',
      '@media(max-width:760px){.swimlab-lab-grid{grid-template-columns:minmax(0,1fr);}}',
      '@media(max-width:560px){.swimlab-lab{padding:12px;}.swimlab-lab-cards{grid-template-columns:repeat(2,minmax(0,1fr));}.swimlab-lab-card{min-height:96px;}.swimlab-brand{flex:0 0 auto;}.swimlab-tl-wide{display:none!important;}.swimlab-tl-narrow{display:block;}}',
      '.theme-contrast .swimlab-lab-card{background:#000!important;color:#fff!important;border:2px solid #ffff00!important;}',
      '.theme-contrast .swimlab-lab-card-blurb,.theme-contrast .swimlab-lab-card-state{color:#fff!important;}',
      '@keyframes swStreamAdvect{from{stroke-dashoffset:0;}to{stroke-dashoffset:-36;}}',
      '@keyframes swStreamAdvectRev{from{stroke-dashoffset:0;}to{stroke-dashoffset:36;}}',
      '@keyframes swRipAdvect{from{stroke-dashoffset:0;}to{stroke-dashoffset:-28;}}',
      '@keyframes swCausticShimmer{0%,100%{opacity:.22;transform:translateX(-3px);}50%{opacity:.46;transform:translateX(4px);}}',
      '@keyframes swCausticFloor{0%,100%{opacity:.18;transform:translateX(0px);}50%{opacity:.42;transform:translateX(-6px);}}',
      '@keyframes swSurfaceRipple{0%,100%{transform:translateY(0px);}50%{transform:translateY(1.6px);}}',
      '@keyframes swEddyCW{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}',
      '@keyframes swEddyCCW{from{transform:rotate(0deg);}to{transform:rotate(-360deg);}}',
      '@keyframes swBubbleRise{0%{opacity:0;transform:translate(0px,6px);}25%{opacity:.72;}80%{opacity:.55;}100%{opacity:0;transform:translate(-14px,-22px);}}',
      '@keyframes swRipFoam{0%{opacity:0;transform:translateY(16px);}25%{opacity:.85;}80%{opacity:.65;}100%{opacity:0;transform:translateY(-64px);}}',
      '@keyframes swSurfWash{0%,100%{opacity:.72;transform:translateY(0px);}50%{opacity:.95;transform:translateY(3.5px);}}',
      '.sw-stream-advect{animation:swStreamAdvect var(--sw-flow-dur,1.8s) linear infinite;}',
      '.sw-stream-advect-rev{animation:swStreamAdvectRev var(--sw-flow-dur,1.8s) linear infinite;}',
      '.sw-rip-flow{animation:swRipAdvect 1.35s linear infinite;}',
      '.sw-escape-flow{animation:swRipAdvect 2.1s linear infinite;}',
      '.sw-caustic-shaft{animation:swCausticShimmer 4.2s ease-in-out infinite;}',
      '.sw-caustic-floor{animation:swCausticFloor 3.6s ease-in-out infinite;}',
      '.sw-surface-ripple{animation:swSurfaceRipple 2.8s ease-in-out infinite;}',
      '.sw-eddy-cw{transform-box:fill-box;transform-origin:center;animation:swEddyCW var(--sw-eddy-dur,2.4s) linear infinite;}',
      '.sw-eddy-ccw{transform-box:fill-box;transform-origin:center;animation:swEddyCCW var(--sw-eddy-dur,2.4s) linear infinite;}',
      '.sw-bubble-rise{animation:swBubbleRise var(--sw-bub-dur,2.6s) ease-out infinite;}',
      '.sw-rip-foam{animation:swRipFoam 2.8s linear infinite;}',
      '.sw-surf-wash{animation:swSurfWash 3.2s ease-in-out infinite;}',
      '@media(prefers-reduced-motion:reduce){.swimlab-primary,.swimlab-menu-tile,.swimlab-lab-card,.sw-swimmer{transition:none!important;}.swimlab-primary:hover,.swimlab-menu-tile:hover,.swimlab-lab-card:hover{transform:none;}.sw-stream-advect,.sw-stream-advect-rev,.sw-rip-flow,.sw-escape-flow,.sw-caustic-shaft,.sw-caustic-floor,.sw-surface-ripple,.sw-eddy-cw,.sw-eddy-ccw,.sw-bubble-rise,.sw-rip-foam,.sw-surf-wash{animation:none!important;transform:none!important;}}',
      '.theme-contrast .sw-caustic-shaft,.theme-contrast .sw-caustic-floor{display:none!important;}',
      '.theme-contrast .swimlab-menu-shell{background:#000!important;color:#fff!important;border:2px solid #ffff00!important;}',
      '.theme-contrast .swimlab-command,.theme-contrast .swimlab-section,.theme-contrast .swimlab-catalog,.theme-contrast .swimlab-badges,.theme-contrast .swimlab-metric,.theme-contrast .swimlab-status,.theme-contrast .swimlab-quote{background:#000!important;background-image:none!important;color:#fff!important;border-color:#ffff00!important;box-shadow:none!important;border-width:2px!important;}',
      '.theme-contrast .swimlab-eyebrow,.theme-contrast .swimlab-title,.theme-contrast .swimlab-metric-label,.theme-contrast .swimlab-action-note,.theme-contrast .swimlab-section-head h3,.theme-contrast .swimlab-catalog summary,.theme-contrast .swimlab-catalog-section h3{color:#ffff00!important;}',
      '.theme-contrast .swimlab-subtitle,.theme-contrast .swimlab-metric-value,.theme-contrast .swimlab-section-head p,.theme-contrast .swimlab-catalog-section p{color:#fff!important;}',
      '.theme-contrast .swimlab-primary{background:#000!important;background-image:none!important;color:#ffff00!important;border:2px solid #ffff00!important;box-shadow:none!important;}',
      '.theme-contrast .swimlab-preset-btn{background:#000!important;color:#ffff00!important;border:1.5px solid #ffff00!important;}'
    ].join('\n');
    if (document.head) document.head.appendChild(swimReadinessStyle);
  }

  // ── Stable view identities (module scope) ──
  // Components defined inside render() get a new function identity every host
  // re-render, so React unmounts/remounts them on ANY toolData write, tearing
  // DOM and dropping keyboard focus (see dev-tools/scan_render_scoped_components.cjs).
  // stableType() hands React a stable wrapper type and swaps the fresh closure
  // in each render. Gate: tests/stem_component_identity_gates.test.js.
  var _stableViewTypes = {};
  function stableType(name, impl) {
    var slot = _stableViewTypes[name];
    if (!slot) {
      slot = _stableViewTypes[name] = { impl: null, Type: null };
      slot.Type = function StableView(props) { return slot.impl(props); };
    }
    slot.impl = impl;
    return slot.Type;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SWIMLAB MODEL — the one source of every number and verdict the practice
  // labs show. Exported as window.StemLab.SwimLabModel so tests run the same
  // functions the screen uses (tests/swimlab_model.test.js).
  //
  // Safety content rule: a lab teaches the guidance its module already cites
  // and nothing else. Values marked "model setting" are simulation settings,
  // not real-world statistics, and the screen labels them that way.
  // ═══════════════════════════════════════════════════════════════════════

  // ── Rip current escape ──
  // Sourced in the Rip Currents module (NOAA / USLA): channel 10 to 30 ft
  // wide, speed up to 8 ft per second, ends 50 to 100 yards (150 to 300 ft)
  // offshore. Model settings: the swimmer's pace and the energy budget.
  var SW_RIP = {
    swimFt: 2,          // model setting: steady swimming pace, ft per second
    stepSec: 5,         // one decision = 5 seconds
    startFt: 60,        // model setting: distance from the beach at the start
    energyStart: 100,
    costSteady: 0.5,    // model setting: energy per second at a steady pace
    costFight: 2,       // model setting: energy per second swimming hard against the current
    floatGain: 0.25,    // model setting: energy regained per second while floating
    bufferFt: 10,       // "swim back at an angle": stay this far clear of the channel
    angleDeg: 30,
    halfSceneFt: 60,
    maxSec: 300,
    scenarios: [
      { id: 'narrow', widthFt: 10, currentFt: 2, endFt: 150 },
      { id: 'medium', widthFt: 20, currentFt: 4, endFt: 225 },
      { id: 'wide',   widthFt: 30, currentFt: 8, endFt: 300 }
    ]
  };
  function swRound1(n) { return Math.round(n * 10) / 10; }
  function swRipScenario(id) {
    for (var i = 0; i < SW_RIP.scenarios.length; i++) if (SW_RIP.scenarios[i].id === id) return SW_RIP.scenarios[i];
    return SW_RIP.scenarios[0];
  }
  function swRipInCurrent(sc, x, y) { return Math.abs(x) < sc.widthFt / 2 && y > 0 && y < sc.endFt; }
  function swRipStart(scId) {
    var sc = swRipScenario(scId);
    return { sc: sc.id, t: 0, x: 0, y: SW_RIP.startFt, e: SW_RIP.energyStart, fightSec: 0, outcome: null, last: null,
      hist: [{ t: 0, x: 0, y: SW_RIP.startFt, e: SW_RIP.energyStart }] };
  }
  // action: 'in' (toward the beach), 'left' / 'right' (along the beach), 'float'.
  function swRipStep(state, action) {
    if (!state || state.outcome) return state;
    var sc = swRipScenario(state.sc);
    var half = sc.widthFt / 2;
    var x = state.x, y = state.y, e = state.e;
    var fight = 0, carried = 0, sec = 0, outcome = null;
    var rad = SW_RIP.angleDeg * Math.PI / 180;
    for (var i = 0; i < SW_RIP.stepSec; i++) {
      var inCur = swRipInCurrent(sc, x, y);
      var cur = inCur ? sc.currentFt : 0;
      var vx = 0, vy = 0, cost = 0;
      if (action === 'in') {
        if (Math.abs(x) < half) {
          // Still in the rip's lane: swimming in means swimming against it.
          vy = -SW_RIP.swimFt; cost = inCur ? SW_RIP.costFight : SW_RIP.costSteady; if (inCur) fight++;
        } else if (Math.abs(x) < half + SW_RIP.bufferFt) {
          // Just outside: angle away from the channel while heading in.
          vx = (x >= 0 ? 1 : -1) * SW_RIP.swimFt * Math.sin(rad); vy = -SW_RIP.swimFt * Math.cos(rad); cost = SW_RIP.costSteady;
        } else { vy = -SW_RIP.swimFt; cost = SW_RIP.costSteady; }
      } else if (action === 'left' || action === 'right') {
        vx = (action === 'left' ? -1 : 1) * SW_RIP.swimFt; cost = SW_RIP.costSteady;
      }
      x = Math.max(-SW_RIP.halfSceneFt, Math.min(SW_RIP.halfSceneFt, x + vx));
      y = y + vy + cur;
      carried += cur;
      e = cost > 0 ? e - cost : Math.min(SW_RIP.energyStart, e + SW_RIP.floatGain);
      sec++;
      if (e < 0) e = 0;
      if (y <= 0) { y = 0; outcome = 'shore'; break; }
      if (e <= 0) { outcome = 'spent'; break; }
    }
    var t = state.t + sec;
    if (!outcome && t >= SW_RIP.maxSec) outcome = 'afloat';
    x = swRound1(x); y = swRound1(y); e = swRound1(e);
    return {
      sc: sc.id, t: t, x: x, y: y, e: e, fightSec: state.fightSec + fight, outcome: outcome,
      last: { action: action, sec: sec, dx: swRound1(x - state.x), dy: swRound1(y - state.y), carried: carried, fight: fight, de: swRound1(e - state.e),
        inCurrentNow: swRipInCurrent(sc, x, y), wasInCurrent: swRipInCurrent(sc, state.x, state.y) },
      hist: state.hist.concat([{ t: t, x: x, y: y, e: e }])
    };
  }
  // A whole run under one plan. 'against': always swim in. 'parallel': swim
  // along the beach until out of the lane, then in. 'float': float until the
  // current lets go, then along the beach, then in.
  function swRipPolicy(strategy, state) {
    var sc = swRipScenario(state.sc);
    var inLane = Math.abs(state.x) < sc.widthFt / 2;
    if (strategy === 'against') return 'in';
    if (strategy === 'float' && swRipInCurrent(sc, state.x, state.y)) return 'float';
    return inLane ? 'right' : 'in';
  }
  function swRipRun(scId, strategy) {
    var s = swRipStart(scId);
    var guard = 0;
    while (!s.outcome && guard++ < 400) s = swRipStep(s, swRipPolicy(strategy, s));
    return s;
  }
  // The safe decision, not speed: back on the beach (or still afloat) without
  // ever swimming against the current.
  function swRipIsSafe(state) { return !!state && (state.outcome === 'shore' || state.outcome === 'afloat') && state.fightSec === 0; }
  // A saved run is input: reject anything a step could not have produced.
  function swRipValid(run, scId) {
    var num = function (v) { return typeof v === 'number' && isFinite(v); };
    if (!run || typeof run !== 'object' || Array.isArray(run) || run.sc !== scId) return false;
    if (!num(run.t) || !num(run.x) || !num(run.y) || !num(run.e) || !num(run.fightSec)) return false;
    if (run.outcome !== null && ['shore', 'spent', 'afloat'].indexOf(run.outcome) === -1) return false;
    if (!Array.isArray(run.hist) || run.hist.length < 1 || run.hist.length > 400) return false;
    return run.hist.every(function (p) { return p && num(p.t) && num(p.x) && num(p.y) && num(p.e); });
  }

  // ── Cold water 1-1-10 decisions ──
  // Stage 0 = first minute, stage 1 = the ~10 minutes of useful arm strength,
  // stage 2 = the wait (up to about an hour). The near / far examples are the
  // module's own: shore ~50 ft away (swim slowly), shore 200 ft away with a
  // floating kayak (stay with it and signal).
  var SW_COLD = {
    nearExitFt: 50,
    scenarios: [
      { id: 'dock',  exitFt: 20,  pfd: false, group: false },
      { id: 'kayak', exitFt: 200, pfd: true,  group: false },
      { id: 'canoe', exitFt: 200, pfd: true,  group: true }
    ]
  };
  function swColdScenario(id) {
    for (var i = 0; i < SW_COLD.scenarios.length; i++) if (SW_COLD.scenarios[i].id === id) return SW_COLD.scenarios[i];
    return SW_COLD.scenarios[0];
  }
  function swColdBest(scId, stage) {
    var sc = swColdScenario(scId);
    var near = sc.exitFt <= SW_COLD.nearExitFt;
    if (stage === 0) return 'float';
    if (stage === 1) return near ? 'exit' : 'stay';
    return near ? 'warm' : (sc.group ? 'huddle' : 'help');
  }

  // ── Reach / Throw / Row / Don't Go ──
  // The first rung of the ladder that the scene makes possible. band:
  // 'reach' (within reach of solid ground), 'throw' (too far to reach, close
  // enough to throw), 'far' (too far to throw).
  var SW_RESCUE_SCENES = [
    { id: 'pool',   band: 'reach', throwable: true,  boat: false },
    { id: 'dock',   band: 'reach', throwable: false, boat: false },
    { id: 'beach',  band: 'throw', throwable: true,  boat: false },
    { id: 'river',  band: 'throw', throwable: true,  boat: false },
    { id: 'lake',   band: 'far',   throwable: true,  boat: true },
    { id: 'pond',   band: 'throw', throwable: false, boat: true },
    { id: 'surf',   band: 'far',   throwable: false, boat: false },
    { id: 'ice',    band: 'throw', throwable: true,  boat: false },
    { id: 'quarry', band: 'throw', throwable: false, boat: false }
  ];
  function swRescueBest(scene) {
    if (!scene) return 'dontgo';
    if (scene.band === 'reach') return 'reach';
    if (scene.band === 'throw' && scene.throwable) return 'throw';
    if (scene.boat) return 'row';
    return 'dontgo';
  }
  // Why a pick is or is not the safe one. 'ok' or the reason code the screen words.
  function swRescueWhy(scene, pick) {
    var best = swRescueBest(scene);
    if (pick === best) return 'ok';
    if (pick === 'swim') return 'swim';
    if (pick === 'reach') return 'tooFarReach';
    if (pick === 'throw') return scene.band === 'far' ? 'tooFarThrow' : (!scene.throwable ? 'nothingToThrow' : 'earlierRung');
    if (pick === 'row') return !scene.boat ? 'noBoat' : 'earlierRung';
    return 'canHelp';
  }
  // A round passes on 5 safe first choices AND no "swim out" pick: the lab must
  // never reward entering the water, even once.
  function swRescueGrade(ids, picks) {
    var score = 0, swam = 0;
    (ids || []).forEach(function (id, k) {
      if (picks[k] === swRescueBest(swRescueScene(id))) score++;
      if (picks[k] === 'swim') swam++;
    });
    return { score: score, swam: swam, of: (ids || []).length, pass: score >= 5 && swam === 0 };
  }
  // Which scenes a round shows: 6 of the 9, starting point moves each round.
  function swRescueRound(round) {
    var n = SW_RESCUE_SCENES.length, out = [], start = ((round | 0) * 4) % n;
    for (var i = 0; i < 6; i++) out.push(SW_RESCUE_SCENES[(start + i * 2) % n].id);
    return out;
  }
  function swRescueScene(id) {
    for (var i = 0; i < SW_RESCUE_SCENES.length; i++) if (SW_RESCUE_SCENES[i].id === id) return SW_RESCUE_SCENES[i];
    return SW_RESCUE_SCENES[0];
  }

  // ── Why you float (Archimedes) ──
  // You float when the water you push aside weighs more than you do. One
  // liter of water weighs one kilogram. Model settings: a 60 kg swimmer whose
  // body takes up 56 liters with empty lungs. Full lungs add 5 liters (the
  // module says roughly 4 to 6). Foam is treated as weightless volume.
  var SW_FLOAT = { massKg: 60, bodyL: 56, airMaxL: 5, foamMaxL: 8 };
  function swFloat(airL, foamL) {
    var a = Math.max(0, Math.min(SW_FLOAT.airMaxL, Number(airL) || 0));
    var f = Math.max(0, Math.min(SW_FLOAT.foamMaxL, Number(foamL) || 0));
    var vol = SW_FLOAT.bodyL + a + f;
    var floats = vol > SW_FLOAT.massKg;
    return {
      airL: a, foamL: f, massKg: SW_FLOAT.massKg, volL: vol, pushKg: vol,
      spareKg: swRound1(vol - SW_FLOAT.massKg), floats: floats, level: vol === SW_FLOAT.massKg,
      abovePct: floats ? swRound1((1 - SW_FLOAT.massKg / vol) * 100) : 0
    };
  }
  function swFloatMinFoam(airL) {
    for (var f = 0; f <= SW_FLOAT.foamMaxL; f++) if (swFloat(airL, f).floats) return f;
    return null;
  }

  // ── Stroke physics ──
  // speed = stroke rate x distance per stroke. Drag = k x speed x speed.
  // Power = drag x speed. k = 30 is a model setting for a streamlined adult;
  // letting the hips sink doubles drag (the Backstroke card's own claim).
  var SW_STROKE = { k: 30, lowHipsFactor: 2, lapM: 25, spmMin: 20, spmMax: 70, dpsMin: 0.6, dpsMax: 2.2 };
  function swStroke(spm, dps, hipsLow) {
    var r = Math.max(SW_STROKE.spmMin, Math.min(SW_STROKE.spmMax, Number(spm) || SW_STROKE.spmMin));
    var l = Math.max(SW_STROKE.dpsMin, Math.min(SW_STROKE.dpsMax, Number(dps) || SW_STROKE.dpsMin));
    // Drag and power use the speed as SHOWN (2 decimals), so a student who
    // checks k x speed x speed on a calculator gets the number on screen.
    var v = Math.round(r / 60 * l * 100) / 100;
    var k = SW_STROKE.k * (hipsLow ? SW_STROKE.lowHipsFactor : 1);
    var drag = k * v * v;
    return {
      spm: r, dps: l, hipsLow: !!hipsLow, k: k, speed: v, drag: Math.round(drag * 10000) / 10000, power: Math.round(drag * v * 10000) / 10000,
      lapSec: swRound1(SW_STROKE.lapM / v), lapStrokes: Math.round(SW_STROKE.lapM / l), lapEnergy: Math.round(drag * SW_STROKE.lapM)
    };
  }

  // How a force or power is printed: about 3 significant figures (396, 30.1, 3.75, 0.365).
  function swFmt(n) {
    var a = Math.abs(n);
    if (a >= 100) return String(Math.round(n));
    if (a >= 10) return String(Math.round(n * 10) / 10);
    if (a >= 1) return String(Math.round(n * 100) / 100);
    return String(Math.round(n * 1000) / 1000);
  }

  // ── What counts as a lab passed (saved results only, never a page visit) ──
  function swLabStatus(d) {
    var isObj = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
    var r = isObj(d && d.labResults) ? d.labResults : {};
    var any = function (o, test) { return isObj(o) && Object.keys(o).some(function (k) { return isObj(o[k]) && test(o[k]); }); };
    var iq = isObj(d && d.strokeHunt) ? d.strokeHunt : {};
    return {
      rip: any(r.rip, function (v) { return v.safe === true; }),
      cold: any(r.cold, function (v) { return v.firstTry === 3; }),
      rescue: isObj(r.rescue) && r.rescue.pass === true,
      float: isObj(r.float) && r.float.found === true,
      stroke: !!iq.understood && typeof iq.explanation === 'string' && iq.explanation.trim().length >= 40
    };
  }
  function swLabsPassed(d) { var s = swLabStatus(d); return Object.keys(s).filter(function (k) { return s[k]; }).length; }

  // ── Quiz option order ──
  // 79% of the authored quiz keys sat in slot B. Display order is rotated by a
  // deterministic hash of the question key (stable across renders, different
  // across questions). order[p] = the authored index shown at position p, so
  // grading and saved picks keep using authored indexes.
  function swOptionOrder(key, n) {
    var seed = 0, k = String(key);
    for (var i = 0; i < k.length; i++) seed = (seed * 31 + k.charCodeAt(i)) % 997;
    var shift = ((seed * 7) + 3) % n;
    var order = [];
    for (var p = 0; p < n; p++) order.push(((p - shift) % n + n) % n);
    return order;
  }

  window.StemLab.SwimLabModel = {
    rip: SW_RIP, ripStart: swRipStart, ripStep: swRipStep, ripRun: swRipRun, ripIsSafe: swRipIsSafe, ripValid: swRipValid, ripInCurrent: swRipInCurrent, ripScenario: swRipScenario,
    cold: SW_COLD, coldBest: swColdBest,
    rescueScenes: SW_RESCUE_SCENES, rescueBest: swRescueBest, rescueGrade: swRescueGrade, rescueWhy: swRescueWhy, rescueRound: swRescueRound, rescueScene: swRescueScene, coldScenario: swColdScenario,
    float: SW_FLOAT, floatAt: swFloat, floatMinFoam: swFloatMinFoam,
    stroke: SW_STROKE, strokeAt: swStroke, fmt: swFmt,
    optionOrder: swOptionOrder, labStatus: swLabStatus, labsPassed: swLabsPassed
  };

  window.StemLab.registerTool('swimLab', {
    name: 'SwimLab',
    icon: '🏊',
    category: 'life-skills',
    gradeRange: '5-12',
    // No quest hooks existed, so nothing outside the badge system defined success.
    // The mini-quizzes already award a per-module mastery badge only at >=80%
    // (badges['mod_<id>'], see miniQuizBlock), so the mastery hooks below are
    // understanding-gated for free; the stroke-hunt hook requires the student's own
    // written explanation, not just the checkbox.
    questDataKey: 'swimLab',
    questHooks: [
      // Was "Visit 3 modules": opening three pages completed it. Now it needs two
      // saved lab results (a safe rip escape, a clean 1-1-10 run, ...).
      { id: 'ws_first_module', label: 'Finish 2 practice labs with a safe result', icon: '📖',
        check: function (d) { return swLabsPassed(d) >= 2; },
        progress: function (d) { return Math.min(2, swLabsPassed(d)) + '/2'; } },
      { id: 'ws_mastery', label: 'Score 80%+ on 2 module quizzes', icon: '🏅',
        check: function (d) { var b = (d && d.badges) || {}; return Object.keys(b).filter(function (k) { return k.indexOf('mod_') === 0; }).length >= 2; },
        progress: function (d) { var b = (d && d.badges) || {}; return Math.min(2, Object.keys(b).filter(function (k) { return k.indexOf('mod_') === 0; }).length) + '/2'; } },
      { id: 'ws_stroke_hunt', label: 'Explain the stroke trade-off in your own words', icon: '💡',
        check: function (d) { var iq = (d && d.strokeHunt) || {}; return !!iq.understood && typeof iq.explanation === 'string' && iq.explanation.trim().length >= 40; },
        progress: function (d) { var iq = (d && d.strokeHunt) || {}; return iq.understood ? (((iq.explanation || '').trim().length >= 40) ? 'Explained' : 'Say more') : 'Experiment first'; } },
      { id: 'ws_mastery_any', label: 'Reach mastery on any safety module', icon: '🌊',
        check: function (d) { var b = (d && d.badges) || {}; return Object.keys(b).some(function (k) { return k.indexOf('mod_') === 0; }); },
        progress: function (d) { var b = (d && d.badges) || {}; return Object.keys(b).some(function (k) { return k.indexOf('mod_') === 0; }) ? 'Mastered' : 'Not yet'; } }
    ],
    description: 'How swimming works (stroke physics + survival skills) plus what every swimmer should know about cold water, rip currents, ice, life jackets, and rescue. Visual stroke breakdowns, the science of buoyancy and propulsion, and the survival skills (back float, eggbeater, HELP, huddle) that actually save lives. Sources cited inline (CDC, USCG, AAP, NAA, ASAN, NOAA, USA Swimming, Cold Water Boot Camp). Educational only — find a Water Safety Instructor for actual swim training.',
    tags: ['swim', 'swimming', 'stroke-physics', 'buoyancy', 'survival-swim', 'cold-water', 'rip-currents', 'ice-safety', 'pfd', 'autism-water', 'maine', 'life-skills'],

    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      try {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;

      // State persistence via ctx.toolData (system-managed; survives reload).
      var _isPlainObj = function(v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
      var d = (ctx.toolData && _isPlainObj(ctx.toolData['swimLab'])) ? ctx.toolData['swimLab'] : {};
      var upd = function(key, val) { if (typeof ctx.update === 'function') ctx.update('swimLab', key, val); };
      var updMulti = function(obj) {
        if (typeof ctx.updateMulti === 'function') ctx.updateMulti('swimLab', obj);
        else Object.keys(obj || {}).forEach(function(k) { upd(k, obj[k]); });
      };
      var addToast = ctx.addToast || function(msg) { console.log('[SwimLab]', msg); };
      // Student AI-off: null unless text AI is usable, so "Ask the Lifeguard" hides.
      var _aiUsable = function (kind, fn) {
        try { if (typeof window !== 'undefined' && typeof window.__alloAiUsable === 'function') return !!window.__alloAiUsable(kind, fn); } catch (_) {}
        return typeof fn === 'function' && !fn._alloQrBlocked && !(typeof window !== 'undefined' && (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true));
      };
      var callGemini = (ctx.aiAvailable !== false && typeof ctx.callGemini === 'function' && !ctx.callGemini._alloQrBlocked && (!!ctx.isTeacherMode || _aiUsable('text', ctx.callGemini))) ? ctx.callGemini : null;

      var gradeBand = (ctx.gradeBand || 'g68').toLowerCase();
      if (['k2','g35','g68','g912'].indexOf(gradeBand) === -1) gradeBand = 'g68';

      // ── State schema ──
      // No entry consent gate. Modules with heavier content (cold water, ice, autism)
      // surface their own inline content notes. Default view is the menu.
      var view = (d.view === 'askLifeguard' && !callGemini) ? 'menu' : (typeof d.view === 'string' && d.view ? d.view : 'menu');
      var consentAccepted = true;  // retained as a no-op flag for compatibility with old saved state
      var modulesVisited = _isPlainObj(d.modulesVisited) ? d.modulesVisited : {};
      var quizResults = _isPlainObj(d.quizResults) ? d.quizResults : {};
      var badges = _isPlainObj(d.badges) ? d.badges : {};
      // Saved lab results: the only thing "labs passed" and lab XP are built on.
      var labResults = _isPlainObj(d.labResults) ? d.labResults : {};
      var labStatus = swLabStatus(d);
      var awardXP = typeof ctx.awardXP === 'function' ? ctx.awardXP : null;
      function swFill(s, map) {
        var out = String(s);
        Object.keys(map || {}).forEach(function(k) { out = out.split('{' + k + '}').join(String(map[k])); });
        return out;
      }
      // A saved file is input: a non-object or a bad idx crashed the cumulative quiz.
      var bigQuizState = (d.bigQuizState && _isPlainObj(d.bigQuizState) && Number.isInteger(d.bigQuizState.idx) && d.bigQuizState.idx >= 0)
        ? Object.assign({ score: 0, answered: false, lastChoice: null, picks: {} }, d.bigQuizState, {
            score: Number.isFinite(Number(d.bigQuizState.score)) ? Number(d.bigQuizState.score) : 0,
            picks: _isPlainObj(d.bigQuizState.picks) ? d.bigQuizState.picks : {}
          })
        : { idx: 0, score: 0, answered: false, lastChoice: null, picks: {} };

      // ── Hydration: window slot → localStorage → host state (post-commit effect) ──
      var _wsHydrated = useRef(false);
      useEffect(function() {
        if (_wsHydrated.current) return;
        _wsHydrated.current = true;
        try {
          var winState = (typeof window !== 'undefined' && window.__alloflowSwimLab) || null;
          var lsState = null;
          try { lsState = JSON.parse(localStorage.getItem('swimLab.state.v1') || 'null'); } catch (e) {}
          var seed = winState || lsState || null;
          if (seed && _isPlainObj(seed)) {
            var merge = {};
            if (seed.consentAccepted && d.consentAccepted === undefined) merge.consentAccepted = seed.consentAccepted;
            if (_isPlainObj(seed.badges) && d.badges === undefined) merge.badges = seed.badges;
            if (_isPlainObj(seed.modulesVisited) && d.modulesVisited === undefined) merge.modulesVisited = seed.modulesVisited;
            if (_isPlainObj(seed.quizResults) && d.quizResults === undefined) merge.quizResults = seed.quizResults;
            if (_isPlainObj(seed.labResults) && d.labResults === undefined) merge.labResults = seed.labResults;
            if (Object.keys(merge).length > 0) updMulti(merge);
          }
        } catch (e) {}
      }, []);

      // Persist on change
      useEffect(function() {
        try {
          var snap = {
            consentAccepted: !!d.consentAccepted,
            badges: d.badges || {},
            modulesVisited: d.modulesVisited || {},
            quizResults: d.quizResults || {},
            labResults: d.labResults || {}
          };
          window.__alloflowSwimLab = snap;
          localStorage.setItem('swimLab.state.v1', JSON.stringify(snap));
        } catch (e) {}
      }, [d.consentAccepted, d.badges, d.modulesVisited, d.quizResults, d.labResults]);

      // ── SR live region + lifecycle refs (fixed hook budget) ──
      var _wsLiveRef = useRef(null);
      var _wsLiveTimerRef = useRef(null);
      var _wsMountedRef = useRef(true);
      useEffect(function() {
        _wsMountedRef.current = true;
        return function() {
          _wsMountedRef.current = false;
          if (_wsLiveTimerRef.current) {
            clearTimeout(_wsLiveTimerRef.current);
            _wsLiveTimerRef.current = null;
          }
        };
      }, []);
      function wsAnnounce(msg) {
        if (_wsLiveRef.current) {
          _wsLiveRef.current.textContent = '';
          if (_wsLiveTimerRef.current) clearTimeout(_wsLiveTimerRef.current);
          _wsLiveTimerRef.current = setTimeout(function() {
            _wsLiveTimerRef.current = null;
            if (_wsLiveRef.current) _wsLiveRef.current.textContent = msg;
          }, 30);
        }
      }

      // ── Fixed hook budget (Rules of Hooks) ──────────────────────────────
      // The VIEW DISPATCH at the bottom of render() is a conditional chain, and
      // the render* branches used to call their own useState/useEffect. Every
      // hook in this file belongs to the host component (StemPluginBridge), so
      // navigating menu → module → Ask the Lifeguard changed its hook count and
      // React threw "Rendered more hooks than during the previous render."
      // Every hook a branch needs is now allocated HERE, unconditionally, and
      // handed down. Do not add a hook call inside a render* branch.
      //
      // Each slot stores { k: ownerKey, v: value } so state resets when you move
      // between modules instead of bleeding across them (module B would
      // otherwise open with module A's revealed scenarios).
      var _scnSlot0 = useState(null);
      var _scnSlot1 = useState(null);
      // Only two scenario cards per module today — extend this list (and add a
      // matching useState above) if a module ever needs a third.
      var _scnSlots = [_scnSlot0, _scnSlot1];
      var _mqIdxSlot = useState(null);
      var _mqResSlot = useState(null);
      var _askQSlot = useState('');
      var _askAnsSlot = useState(null);
      var _askLoadingSlot = useState(false);

      // Badges earned inside a conditional branch are queued during render and
      // granted by one unconditional effect. awardBadge is a no-op once the
      // badge is held, so the re-render it triggers settles immediately.
      var _pendingAwards = useRef([]);
      _pendingAwards.current = [];
      // Finished mini-quizzes are queued the same way and saved to quizResults
      // (best first-try score per module). Nothing wrote that field before, so
      // a quiz score vanished the moment the student left the module.
      var _pendingQuizSaves = useRef([]);
      _pendingQuizSaves.current = [];
      useEffect(function() {
        var queued = _pendingAwards.current || [];
        for (var i = 0; i < queued.length; i++) awardBadge(queued[i].id, queued[i].label, queued[i].xp, queued[i].reason);
        var saves = _pendingQuizSaves.current || [];
        var nextQuiz = null;
        for (var j = 0; j < saves.length; j++) {
          var cur = (nextQuiz || quizResults)[saves[j].id];
          if (_isPlainObj(cur) && Number(cur.pct) >= saves[j].pct) continue;
          if (!nextQuiz) nextQuiz = Object.assign({}, quizResults);
          nextQuiz[saves[j].id] = { correct: saves[j].correct, total: saves[j].total, pct: saves[j].pct, at: new Date().toISOString() };
        }
        if (nextQuiz) upd('quizResults', nextQuiz);
      });

      // xp / reason are optional: points credited once, with the badge, never
      // for opening a screen. ctx.awardXP is (id, points, reason).
      function awardBadge(id, label, xp, reason) {
        if (badges[id]) return;
        var next = Object.assign({}, badges);
        next[id] = { label: label, earnedAt: new Date().toISOString() };
        upd('badges', next);
        // Two awards in one handler each rebuilt from the same render-time copy
        // and the last save won; carry the new map forward.
        badges = next;
        addToast('🏅 Badge earned: ' + label, 'success');
        if (xp && awardXP) { try { awardXP('swimLab', xp, reason || label); } catch (_) {} }
      }

      // Save one lab result (labResults[lab][key] = value) from a click handler.
      function saveLabResult(lab, key, value) {
        var next = Object.assign({}, labResults);
        if (key == null) next[lab] = value;
        else { next[lab] = Object.assign({}, _isPlainObj(next[lab]) ? next[lab] : {}); next[lab][key] = value; }
        upd('labResults', next);
        labResults = next;
      }

      function markVisited(modId) {
        if (modulesVisited[modId]) return;
        var nextVisited = Object.assign({}, modulesVisited);
        nextVisited[modId] = new Date().toISOString();
        upd('modulesVisited', nextVisited);
      }

      // ── Theme (deep-water palette) ──
      var isContrast = !!ctx.isContrast;
      var isDark = !!ctx.isDark;
      var T = isContrast ? {
        bg: '#000000', card: '#000000', cardAlt: '#0a0a0a', border: '#fbbf24',
        text: '#ffffff', muted: '#ffffff', dim: '#ffffff',
        accent: '#fbbf24', accentHi: '#ffff00', ok: '#00ff66',
        warn: '#ffff00', danger: '#ff6b6b', link: '#00ffff',
        water: '#00ffff', ice: '#ffffff', sand: '#ffff00'
      } : isDark ? {
        bg: '#0c2233', card: '#163a52', cardAlt: '#0a1d2e', border: '#234d6e',
        text: '#f0f9ff', muted: '#cbd5e1', dim: '#94a3b8',
        accent: '#0ea5e9', accentHi: '#7dd3fc', ok: '#22c55e',
        warn: '#f59e0b', danger: '#ef4444', link: '#bae6fd',
        water: '#0284c7', ice: '#cffafe', sand: '#fde68a'
      } : {
        bg: '#f0f9ff', card: '#ffffff', cardAlt: '#e0f2fe', border: '#52748c',
        text: '#082f49', muted: '#334155', dim: '#475569',
        accent: '#0369a1', accentHi: '#075985', ok: '#047857',
        warn: '#b45309', danger: '#b91c1c', link: '#075985',
        water: '#0369a1', ice: '#cffafe', sand: '#a16207'
      };

      function btn(extra) {
        // minHeight 44: answer buttons were 36-38 px tall and Menu / Print 32 px.
        return Object.assign({
          padding: '10px 16px', borderRadius: 10, border: '1px solid ' + T.border,
          background: T.card, color: T.text, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', textAlign: 'left', minHeight: 44
        }, extra || {});
      }
      function btnPrimary(extra) {
        var primaryColors = isContrast
          ? { background: '#000000', color: '#ffff00', border: '2px solid #ffff00' }
          : isDark
            ? { background: T.accent, color: '#0c2233', border: '1px solid ' + T.accent }
            : { background: T.accent, color: '#ffffff', border: '1px solid ' + T.accent };
        return Object.assign(btn(primaryColors), extra || {});
      }

      // ── Persistent emergency banner ──
      function emergencyBanner() {
        return h('div', { role: 'region', 'aria-label': __alloT('stem.swimlab.emergency_reminder', 'Emergency reminder'),
          style: { margin: '0 0 14px', padding: '10px 14px', borderRadius: 10, background: '#7f1d1d', border: '1px solid #dc2626', color: '#fde2e2', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
          h('span', { 'aria-hidden': 'true' }, '🚑'),
          h('span', null,
            h('strong', null, __alloT('stem.swimlab.in_a_real_emergency_call_911', 'In a real emergency: call 911')),
            __alloT('stem.swimlab.in_maine_you_can_text_911_this_tool_is', ' — in Maine you can text 911. This tool is educational only and does not teach swimming.'))
        );
      }

      function disclaimerFooter() {
        return h('div', { role: 'note', 'aria-label': __alloT('stem.swimlab.educational_disclaimer', 'Educational disclaimer'),
          style: { marginTop: 18, padding: '10px 14px', borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.border, color: T.dim, fontSize: 12, textAlign: 'center', lineHeight: 1.55 } },
          __alloT('stem.swimlab.educational_only_to_learn_to_swim_find', 'Educational only. To learn to swim, find a certified Water Safety Instructor at '),
          h('a', { href: 'https://www.redcross.org/take-a-class/swimming', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, __alloT('stem.swimlab.red_cross', 'Red Cross')),
          __alloT('stem.swimlab.or_your_local_ymca_real_emergencies', ' or your local YMCA. Real emergencies → '),
          h('strong', { style: { color: T.accentHi } }, '911'),
          '.'
        );
      }

      // ─────────────────────────────────────────
      // CONSENT SCREEN — one-time gate with content note
      // ─────────────────────────────────────────
      function renderConsent() {
        return h('div', { style: { padding: 24, maxWidth: 760, margin: '0 auto', color: T.text } },
          h('div', { role: 'region', 'aria-label': __alloT('stem.swimlab.swimlab_consent_and_educational_scope', 'SwimLab consent and educational scope'),
            style: { background: isContrast ? '#000000' : (isDark ? '#082f49' : '#e0f2fe'), border: '1px solid ' + T.water, borderRadius: 14, padding: 24 } },
            h('h2', { style: { margin: '0 0 12px', fontSize: 22, color: T.accentHi } },
              __alloT('stem.swimlab.swimlab_is_an_educational_tool', '🛟 SwimLab is an EDUCATIONAL tool.')),
            h('p', { style: { margin: '0 0 12px', lineHeight: 1.55 } },
              __alloT('stem.swimlab.it_teaches_you_to', 'It teaches you to '),
              h('strong', null, 'recognize'),
              __alloT('stem.swimlab.water_hazards', ' water hazards, '),
              h('strong', null, 'respond'),
              __alloT('stem.swimlab.to_aquatic_emergencies_and_reduce_drow', ' to aquatic emergencies, and reduce drowning risk. It is '),
              h('strong', null, 'NOT'),
              __alloT('stem.swimlab.a_way_to_learn_how_to_swim_watching_a_', ' a way to learn how to swim. Watching a screen cannot teach you to float, breathe, or move through water. Those skills only come from time in the water with a qualified instructor.')),
            h('p', { style: { margin: '0 0 12px', lineHeight: 1.55 } },
              __alloT('stem.swimlab.to_learn_to_swim_or_get_certified_find', 'To learn to swim or get certified, find a Water Safety Instructor (WSI) at the '),
              h('a', { href: 'https://www.redcross.org/take-a-class/swimming', target: '_blank', rel: 'noopener', style: { color: T.accentHi, fontWeight: 700 } }, __alloT('stem.swimlab.american_red_cross', 'American Red Cross')),
              __alloT('stem.swimlab.your_local', ', your local '),
              h('a', { href: 'https://www.ymca.org/what-we-do/healthy-living/swimming-aquatics', target: '_blank', rel: 'noopener', style: { color: T.accentHi, fontWeight: 700 } }, 'YMCA'),
              __alloT('stem.swimlab.or_community_pool_the', ', or community pool. The '),
              h('a', { href: 'https://www.usaswimming.org/foundation', target: '_blank', rel: 'noopener', style: { color: T.accentHi, fontWeight: 700 } }, __alloT('stem.swimlab.usa_swimming_foundation', 'USA Swimming Foundation')),
              __alloT('stem.swimlab.offers_scholarships_for_families_who_c', ' offers scholarships for families who cannot afford lessons.')),
            h('div', { style: { background: '#7c2d12', border: '1px solid #c2410c', borderRadius: 8, padding: 12, margin: '14px 0', color: '#fed7aa' } },
              h('strong', null, __alloT('stem.swimlab.content_note', '⚠️ Content note: ')),
              __alloT('stem.swimlab.this_tool_talks_about_drowning_near_dr', 'This tool talks about drowning, near-drowning, and cold water emergencies. The content is matter-of-fact, not graphic, but the topic is serious. If you have lost someone to a water emergency, this material may bring difficult feelings up. You can step away at any point.')),
            h('p', { style: { margin: '0 0 12px', lineHeight: 1.55 } },
              h('strong', null, __alloT('stem.swimlab.in_a_real_emergency_call_911_2', 'In a real emergency, call 911.')),
              __alloT('stem.swimlab.in_maine_you_can', ' In Maine, you can '),
              h('strong', null, __alloT('stem.swimlab.text_911', 'text 911')),
              __alloT('stem.swimlab.if_you_cannot_speak', ' if you cannot speak.')),
            h('div', { style: { margin: '16px 0', padding: '12px 14px', borderLeft: '3px solid ' + T.accent, background: 'rgba(14,165,233,0.06)', fontSize: 13, fontStyle: 'italic', color: T.muted, lineHeight: 1.55 } },
              __alloT('stem.swimlab.whoever_saves_a_single_soul_scripture_', '"Whoever saves a single soul, scripture considers it as if they saved an entire world."'),
              h('br'),
              h('span', { style: { fontSize: 12, color: T.dim, fontStyle: 'normal' } }, __alloT('stem.swimlab.mishnah_sanhedrin_4_5_pirkei_avot', '— Mishnah Sanhedrin 4:5 (Pirkei Avot)'))
            ),
            h('button', { type: 'button',
              'aria-label': __alloT('stem.swimlab.i_understand_show_me_the_lab', 'I understand. Show me the lab.'),
              onClick: function() {
                updMulti({ consentAccepted: true, consentDate: new Date().toISOString(), view: 'menu' });
                awardBadge('swimlab_starter', 'SwimLab Starter');
                wsAnnounce(__alloT('stem.swimlab.sr_consent_accepted_welcome_to_swimlab', 'Consent accepted. Welcome to SwimLab.'));
              },
              style: { padding: '12px 22px', borderRadius: 10, border: isContrast ? '2px solid #ffff00' : 'none', background: isContrast ? '#000000' : T.accent, color: isContrast ? '#ffff00' : (isDark ? '#0c2233' : '#ffffff'), fontSize: 15, fontWeight: 700, cursor: 'pointer' }
            }, __alloT('stem.swimlab.i_understand_show_me_the_lab_2', 'I understand — show me the lab'))
          ),
          h('p', { style: { marginTop: 14, fontSize: 12, color: T.dim, fontStyle: 'italic' } },
            __alloT('stem.swimlab.acknowledging_this_screen_is_a_one_tim', 'Acknowledging this screen is a one-time gate. Your acknowledgment is saved with your profile so you do not see it again.'))
        );
      }

      // ─────────────────────────────────────────
      // BACK BUTTON
      // ─────────────────────────────────────────
      function backBar(title) {
        return h('div', { className: 'swimlab-back-bar', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' } },
          h('button', { type: 'button',
            className: 'swimlab-no-print',
            'aria-label': __alloT('stem.swimlab.back_to_swimlab_menu', 'Back to SwimLab menu'),
            onClick: function() { upd('view', 'menu'); wsAnnounce(__alloT('stem.swimlab.sr_back_to_menu', 'Back to menu')); },
            style: btn({ padding: '6px 12px', fontSize: 12 })
          }, __alloT('stem.swimlab.menu', '← Menu')),
          h('h2', { style: { margin: 0, fontSize: 18, color: T.text, flex: 1 } }, title),
          h('button', { type: 'button',
            className: 'swimlab-no-print',
            'aria-label': __alloT('stem.swimlab.print_this_module_as_a_classroom_hando', 'Print this module as a classroom handout'),
            onClick: function() { try { window.print(); } catch (_) {} },
            style: btn({ padding: '6px 12px', fontSize: 12 })
          }, __alloT('stem.swimlab.print', '🖨️ Print'))
        );
      }

      // ─────────────────────────────────────────
      // MENU
      // ─────────────────────────────────────────
      // Tiles carry a `section` field so the menu can group them. Picking the
      // right starting modules matters for a topic where one teacher session
      // may be all the exposure a student gets in a year. The "start" lane is
      // the three modules statistically most likely to actually save a life
      // (cold water shock per Mario Vittone / Cold Water Boot Camp; PFDs per
      // USCG 86% statistic; bystander rescue per US Lifesaving Association
      // would-be rescuer death data). Order within section is the order shown.
      var MENU_TILES = [
        // Start Here — life-saving fundamentals
        { id: 'coldShock',    icon: '🥶', label: __alloT('stem.swimlab.cold_water_survival', 'Cold Water Survival'),         section: 'start',     desc: __alloT('stem.swimlab.the_gasp_reflex_the_mammalian_dive_res', 'The gasp reflex, the mammalian dive response, and the 1-1-10 timeline that beats panic.'), ready: true },
        { id: 'pfd',          icon: '🦺', label: __alloT('stem.swimlab.why_life_jackets_work', 'Why Life Jackets Work'),       section: 'start',     desc: __alloT('stem.swimlab.the_physics_of_buoyancy_five_pfd_types', 'The physics of buoyancy. Five PFD types. Fit check that actually works. The 86% statistic.'), ready: true },
        { id: 'reachThrow',   icon: '🪢', label: __alloT('stem.swimlab.help_without_drowning_yourself', 'Help Without Drowning Yourself'), section: 'start',  desc: __alloT('stem.swimlab.reach_throw_row_don_t_go_why_untrained', 'Reach / Throw / Row / Don\'t Go. Why untrained rescuers die. Bystander effect cuts.'), ready: true },
        // Modules — the deeper content
        { id: 'howSwimming',  icon: '🏊', label: __alloT('stem.swimlab.how_swimming_works', 'How Swimming Works'),          section: 'modules',   desc: __alloT('stem.swimlab.the_physics_of_every_major_stroke_plus', 'The physics of every major stroke, plus the survival skills (back float, eggbeater, HELP, huddle) that actually save lives.'), ready: true },
        { id: 'ripCurrents',  icon: '🌊', label: __alloT('stem.swimlab.rip_currents', 'Rip Currents'),                section: 'modules',   desc: __alloT('stem.swimlab.spot_them_from_shore_the_parallel_to_s', 'Spot them from shore. The parallel-to-shore escape. Why fighting the current kills.'), ready: true },
        { id: 'iceSafety',    icon: '🧊', label: __alloT('stem.swimlab.falling_through_ice', 'Falling Through Ice'),         section: 'modules',   desc: __alloT('stem.swimlab.the_swim_and_roll_self_rescue_picks_of', 'The swim-and-roll self-rescue. Picks of Life. Maine ice color cues. Snowmobile through-ice.'), ready: true },
        { id: 'hypothermia',  icon: '🌡️', label: __alloT('stem.swimlab.cold_body_cold_brain', 'Cold Body, Cold Brain'),       section: 'modules',   desc: __alloT('stem.swimlab.how_the_body_fails_in_cold_the_umbles_', 'How the body fails in cold. The UMBLES rule. What NOT to do. Why "not dead until warm and dead."'), ready: true },
        { id: 'drainEntrap',  icon: '🌀', label: __alloT('stem.swimlab.pool_drain_risks', 'Pool Drain Risks'),            section: 'modules',   desc: __alloT('stem.swimlab.the_virginia_graeme_baker_act_five_ent', 'The Virginia Graeme Baker Act. Five entrapment types. The emergency shut-off.'), ready: true },
        { id: 'autismWater',  icon: '♾️', label: __alloT('stem.swimlab.autism_water', 'Autism + Water'),              section: 'modules',   desc: __alloT('stem.swimlab.the_160x_drowning_risk_defense_in_dept', 'The 160x drowning risk. Defense-in-depth prevention. Adapted swim instruction. Swimsuit color visibility.'), ready: true },
        // Practice
        { id: 'cumulative',   icon: '🎯', label: __alloT('stem.swimlab.cumulative_quiz', 'Cumulative Quiz'),             section: 'practice',  desc: __alloT('stem.swimlab.15_questions_across_all_nine_modules_m', '15 questions across all nine modules. Missed answers link you straight back to the module you need to review.'), ready: true },
        callGemini && { id: 'askLifeguard', icon: '🤖', label: __alloT('stem.swimlab.ask_the_lifeguard_ai', 'Ask the Lifeguard (AI)'),      section: 'practice',  desc: __alloT('stem.swimlab.type_a_swimming_or_water_question_ai_r', 'Type a swimming or water question; AI returns a sourced answer. Educational only.'), ready: true },
        // Resources
        { id: 'resources',    icon: '📚', label: __alloT('stem.swimlab.resources', 'Resources'),                   section: 'resources', desc: __alloT('stem.swimlab.every_org_cited_in_this_tool_plus_adap', 'Every org cited in this tool, plus adaptive swim programs and Maine-specific links.'), ready: true }
      ].filter(Boolean);

      // Section metadata. Order in this array is render order. The "start"
      // section gets a heavier treatment to draw the eye for first-time users.
      var MENU_SECTIONS = [
        { id: 'start',     label: __alloT('stem.swimlab.start_here', 'Start here'),        emoji: '🆘', blurb: 'If you only do three modules, do these. Each one addresses the cause of a large share of real US drowning deaths.', accent: T.danger, emphasized: true },
        { id: 'modules',   label: __alloT('stem.swimlab.modules', 'Modules'),           emoji: '📖', blurb: 'The full lab. Take them in any order, or follow the cumulative quiz back to whichever ones you want to revisit.', accent: T.accent },
        { id: 'practice',  label: __alloT('stem.swimlab.practice_and_ask', 'Practice and ask'),  emoji: '🎯', blurb: 'Test your understanding, or ask the AI lifeguard a sourced question.', accent: T.accent },
        { id: 'resources', label: __alloT('stem.swimlab.resources_2', 'Resources'),         emoji: '📚', blurb: 'Where to learn to actually swim, find an adaptive program, or look up the source on any cited claim.', accent: T.accent }
      ];

      function renderMenu() {
        var educationalTiles = MENU_TILES.filter(function(tile) { return tile.section === 'start' || tile.section === 'modules'; });
        var safetyTiles = MENU_TILES.filter(function(tile) { return tile.section === 'start'; });
        var catalogSections = MENU_SECTIONS.filter(function(section) { return section.id !== 'start'; });
        var visitedCount = educationalTiles.filter(function(tile) { return !!modulesVisited[tile.id]; }).length;
        var safetyCompleted = safetyTiles.filter(function(tile) { return !!modulesVisited[tile.id]; }).length;
        var nextTile = safetyTiles.filter(function(tile) { return !modulesVisited[tile.id]; })[0]
          || educationalTiles.filter(function(tile) { return !modulesVisited[tile.id]; })[0]
          || MENU_TILES.filter(function(tile) { return tile.id === 'cumulative'; })[0];
        // EARNED progress. "Modules explored" and the readiness ring used to count
        // page visits, so opening nine pages read as 100% ready. Labs passed and
        // quizzes passed come from saved results only; "opened" is shown as opened.
        var quizPassed = educationalTiles.filter(function(tile) { return !!badges['mod_' + tile.id]; }).length;
        var safetyPassed = safetyTiles.filter(function(tile) { return !!badges['mod_' + tile.id]; }).length;
        var labsPassed = LAB_ORDER.filter(function(id) { return !!labStatus[LAB_META[id].pass]; }).length;
        var nextLab = LAB_ORDER.filter(function(id) { return !labStatus[LAB_META[id].pass]; })[0] || null;
        var earnedTotal = LAB_ORDER.length + educationalTiles.length;

        function openTile(tile) {
          if (!tile) return;
          upd('view', tile.id);
          markVisited(tile.id);
          wsAnnounce('Opening ' + tile.label);
        }

        function metric(label, value) {
          return h('div', { className: 'swimlab-metric', role: 'listitem' },
            h('span', { className: 'swimlab-metric-label' }, label),
            h('strong', { className: 'swimlab-metric-value' }, value));
        }

        function renderTile(tile, emphasized, compact) {
          var visited = !!modulesVisited[tile.id];
          var passed = !!badges['mod_' + tile.id];
          var borderColor = passed ? T.ok : (emphasized ? T.danger : T.border);
          return h('div', { key: tile.id, role: 'listitem', className: 'swimlab-tile-wrap' },
            h('button', {
              type: 'button',
              className: 'swimlab-menu-tile' + (compact ? ' swimlab-menu-tile--compact' : ''),
              'aria-label': tile.label + (passed ? ' (quiz passed)' : (visited ? ' (opened)' : '')) + (emphasized ? ' - start here' : ''),
              onClick: function() { openTile(tile); },
              style: btn({
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                padding: 14, background: emphasized ? T.cardAlt : T.card,
                borderColor: borderColor, borderWidth: emphasized ? 2 : 1, borderStyle: 'solid'
              })
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%' } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, tile.icon),
                h('span', { style: { fontWeight: 700, fontSize: compact ? 13 : 15, flex: 1, color: T.text } }, tile.label),
                passed && h('span', { 'aria-hidden': 'true', style: { color: T.ok, fontSize: 14 } }, '\u2713')),
              h('div', { style: { fontSize: compact ? 12 : 13, color: T.muted, lineHeight: 1.45 } }, tile.desc),
              (passed || visited) && h('div', { 'aria-hidden': 'true', style: { marginTop: 'auto', fontSize: 12, fontWeight: 700, color: passed ? T.ok : T.dim } },
                passed ? __alloT('stem.swimlab.tile_quiz_passed', 'Quiz passed') : __alloT('stem.swimlab.tile_opened', 'Opened'))
            )
          );
        }

        return h('main', { className: 'swimlab-menu-shell', 'data-swimlab-readiness': 'true' },
          h('header', { className: 'swimlab-command' },
            h('div', { className: 'swimlab-command-top' },
              h('div', { className: 'swimlab-brand' },
                /* Bespoke Aquatic Safety & Hydrodynamics Rescue Emblem SVG */
                h('svg', {
                  width: 52, height: 52, viewBox: '0 0 52 52',
                  'aria-hidden': 'true',
                  style: { flexShrink: 0, display: 'block', marginTop: 2 }
                },
                  h('rect', {
                    x: 1, y: 1, width: 50, height: 50, rx: 14,
                    fill: isContrast ? '#000000' : 'rgba(2,6,23,0.58)',
                    stroke: isContrast ? '#ffff00' : 'rgba(125,211,252,0.55)',
                    strokeWidth: 1.5
                  }),
                  /* Rescue Lifebuoy Ring */
                  h('circle', {
                    cx: 26, cy: 23, r: 12,
                    fill: 'none',
                    stroke: isContrast ? '#ffff00' : '#f8fafc',
                    strokeWidth: 4.5
                  }),
                  /* 4 High-Vis Safety Quadrants */
                  h('line', { x1: 26, y1: 8.5, x2: 26, y2: 13.5, stroke: isContrast ? '#00ffff' : '#f97316', strokeWidth: 4.5, strokeLinecap: 'butt' }),
                  h('line', { x1: 26, y1: 32.5, x2: 26, y2: 37.5, stroke: isContrast ? '#00ffff' : '#f97316', strokeWidth: 4.5, strokeLinecap: 'butt' }),
                  h('line', { x1: 11.5, y1: 23, x2: 16.5, y2: 23, stroke: isContrast ? '#00ffff' : '#f97316', strokeWidth: 4.5, strokeLinecap: 'butt' }),
                  h('line', { x1: 35.5, y1: 23, x2: 40.5, y2: 23, stroke: isContrast ? '#00ffff' : '#f97316', strokeWidth: 4.5, strokeLinecap: 'butt' }),
                  /* Buoyancy Up-Vector inside ring */
                  h('path', {
                    d: 'M26 28 L26 19 M22.5 22 L26 18 L29.5 22',
                    fill: 'none',
                    stroke: isContrast ? '#00ff66' : '#38bdf8',
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                  }),
                  /* Hydrodynamic Wave Streamlines */
                  h('path', {
                    d: 'M8 42 Q17 38 26 42 T44 42',
                    fill: 'none',
                    stroke: isContrast ? '#00ffff' : '#38bdf8',
                    strokeWidth: 2,
                    strokeLinecap: 'round'
                  })
                ),
                h('div', { style: { minWidth: 0 } },
                  h('p', { className: 'swimlab-eyebrow' }, __alloT('stem.swimlab.readiness_label', 'Water safety & hydrodynamics studio')),
                  h('h2', { className: 'swimlab-title' }, __alloT('stem.swimlab.swimlab', 'SwimLab')),
                  h('p', { className: 'swimlab-subtitle' }, __alloT('stem.swimlab.readiness_blurb', 'Learn the physiology, physics, and decisions behind safer swimming, cold-water survival, and bystander rescue.'))
                )
              ),
              h('div', { className: 'swimlab-status', role: 'status' }, __alloT('stem.swimlab.education_status', 'Education only - in an emergency, call 911'))),
            h('div', { className: 'swimlab-metrics', role: 'list', 'aria-label': __alloT('stem.swimlab.progress_label', 'SwimLab progress') },
              metric(__alloT('stem.swimlab.labs_passed', 'Labs passed'), labsPassed + ' / ' + LAB_ORDER.length),
              metric(__alloT('stem.swimlab.quizzes_passed', 'Quizzes passed'), quizPassed + ' / ' + educationalTiles.length),
              metric(__alloT('stem.swimlab.modules_opened', 'Modules opened'), visitedCount + ' / ' + educationalTiles.length),
              metric(__alloT('stem.swimlab.badges', 'Badges'), String(Object.keys(badges).length))),
            h('div', { className: 'swimlab-actions' },
              nextLab
                ? h('button', { type: 'button', className: 'swimlab-primary', 'data-swimlab-start': nextLab, onClick: function() { openLab(nextLab); } },
                    __alloT('stem.swimlab.start_practice', 'Start practice: ') + LAB_META[nextLab].label)
                : h('button', { type: 'button', className: 'swimlab-primary', onClick: function() { openTile(nextTile); } },
                    __alloT('stem.swimlab.continue_learning', 'Continue learning')),
              h('span', { className: 'swimlab-action-note' },
                nextLab ? __alloT('stem.swimlab.start_practice_note', 'A few minutes. You choose, then see what happens.')
                  : (nextTile ? nextTile.label : __alloT('stem.swimlab.choose_review', 'Choose a module to review')))),
            /* Practice labs: the first thing a student can DO, one tap from here.
               (The four "Quick Labs" pills were 29 px tall and three of them opened
               reading pages. "Stroke Physics" is still in the module list below.) */
            h('div', { style: { marginTop: 14 } },
              h('h3', { id: 'swimlab-labs-heading', style: { margin: '0 0 8px', fontSize: 14, fontWeight: 900, color: isContrast ? '#ffff00' : '#f8fafc' } },
                __alloT('stem.swimlab.practice_labs', 'Practice labs: learn by doing')),
              h('div', { className: 'swimlab-lab-cards', role: 'list', 'aria-labelledby': 'swimlab-labs-heading' },
                LAB_ORDER.map(function(labId) {
                  var meta = LAB_META[labId];
                  var done = !!labStatus[meta.pass];
                  return h('div', { key: labId, role: 'listitem', style: { minWidth: 0 } },
                    h('button', { type: 'button', className: 'swimlab-lab-card', 'data-swimlab-lab': labId,
                      'aria-label': meta.label + '. ' + meta.blurb + ' ' + (done ? __alloT('stem.swimlab.lab_state_done_sr', 'Passed.') : __alloT('stem.swimlab.lab_state_new_sr', 'Not passed yet.')),
                      onClick: function() { openLab(labId); } },
                      h('span', { className: 'swimlab-lab-card-name' }, h('span', { 'aria-hidden': 'true' }, meta.icon + ' '), meta.label),
                      h('span', { className: 'swimlab-lab-card-blurb' }, meta.blurb),
                      h('span', { className: 'swimlab-lab-card-state' + (done ? ' swimlab-lab-card-state--done' : '') },
                        done ? __alloT('stem.swimlab.lab_state_done', '\u2713 Passed') : __alloT('stem.swimlab.lab_state_new', 'Try it'))));
                })))
          ),

          /* Bespoke 1-1-10 Cold-Water Survival Timeline & Readiness Telemetry Visual Stage */
          (function() {
            var readinessPct = earnedTotal > 0 ? Math.round(((labsPassed + quizPassed) / earnedTotal) * 100) : 0;
            var ringR = 32;
            var ringC = 2 * Math.PI * ringR;
            var ringOffset = ringC * (1 - readinessPct / 100);
            return h('section', {
              className: 'swimlab-section',
              'aria-label': __alloT('stem.swimlab.visual_timeline_aria', '1-1-10 Cold-Water Survival Timeline and Readiness Gauge'),
              style: { padding: 14 }
            },
              /* Phone: the 640-wide drawing shrank to 7 px text, so a 330-wide
                 version of the same timeline is shown instead (CSS swaps them). */
              h('svg', { className: 'swimlab-tl-narrow', viewBox: '0 0 330 132', role: 'img',
                'aria-label': __alloT('stem.swimlab.timeline_narrow_aria', '1-1-10 cold water survival rule: 1 minute to control breathing, 10 minutes of meaningful movement, 1 hour before hypothermia unconsciousness.'),
                style: { width: '100%', height: 'auto' } },
                h('rect', { x: 0, y: 0, width: 330, height: 132, rx: 12, fill: isContrast ? '#000000' : '#081a2c', stroke: isContrast ? '#ffff00' : '#1e3a5f', strokeWidth: 1.4 }),
                h('text', { x: 14, y: 24, fill: isContrast ? '#ffff00' : '#7dd3fc', fontSize: 13, fontWeight: 900, fontFamily: 'system-ui, sans-serif' }, 'COLD WATER: THE 1-1-10 RULE'),
                h('line', { x1: 50, y1: 58, x2: 280, y2: 58, stroke: isContrast ? '#ffff00' : '#475569', strokeWidth: 4, strokeLinecap: 'round' }),
                [{ x: 50, t: '1m', a: 'Control', b: 'breathing', c: isContrast ? '#00ffff' : '#0369a1' }, { x: 165, t: '10m', a: 'Useful', b: 'movement', c: isContrast ? '#ffff00' : '#b45309' }, { x: 280, t: '1hr', a: 'Float,', b: 'save heat', c: isContrast ? '#ff6b6b' : '#991b1b' }].map(function(n, ni) {
                  return h('g', { key: ni },
                    h('circle', { cx: n.x, cy: 58, r: 17, fill: isContrast ? '#000000' : n.c, stroke: isContrast ? n.c : '#f8fafc', strokeWidth: 2 }),
                    h('text', { x: n.x, y: 63, textAnchor: 'middle', fill: '#ffffff', fontSize: 13, fontWeight: 900, fontFamily: 'system-ui, sans-serif' }, n.t),
                    h('text', { x: n.x, y: 98, textAnchor: 'middle', fill: isContrast ? '#ffffff' : '#e0f2fe', fontSize: 13, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }, n.a),
                    h('text', { x: n.x, y: 116, textAnchor: 'middle', fill: isContrast ? '#ffffff' : '#e0f2fe', fontSize: 13, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }, n.b));
                })),
              h('svg', {
                className: 'swimlab-tl-wide',
                viewBox: '0 0 640 124',
                role: 'img',
                'aria-label': __alloT('stem.swimlab.timeline_svg_aria', '1-1-10 cold water survival rule: 1 minute to control breathing, 10 minutes of meaningful movement, 1 hour before hypothermia unconsciousness. Current readiness: {pct} percent.')
                  .replace('{pct}', String(readinessPct)),
                style: { width: '100%', height: 'auto', display: 'block' }
              },
                /* Aquatic depth gradient & sunlit caustic sheen defs */
                !isContrast && h('defs', null,
                  h('linearGradient', { id: 'sw-tl-water', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                    h('stop', { offset: '0%', stopColor: '#0c2740' }),
                    h('stop', { offset: '55%', stopColor: '#081a2c' }),
                    h('stop', { offset: '100%', stopColor: '#04101d' })),
                  h('linearGradient', { id: 'sw-tl-ray', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
                    h('stop', { offset: '0%', stopColor: '#7dd3fc', stopOpacity: 0.16 }),
                    h('stop', { offset: '100%', stopColor: '#38bdf8', stopOpacity: 0 }))),
                /* Backdrop */
                h('rect', { x: 0, y: 0, width: 640, height: 124, rx: 12, fill: isContrast ? '#000000' : 'url(#sw-tl-water)', stroke: isContrast ? '#ffff00' : '#1e3a5f', strokeWidth: 1.4 }),
                !isContrast && h('g', { opacity: 0.85 },
                  h('polygon', { points: '42,0 116,0 74,124 14,124', fill: 'url(#sw-tl-ray)' }),
                  h('polygon', { points: '205,0 282,0 236,124 176,124', fill: 'url(#sw-tl-ray)' }),
                  h('path', { d: 'M16,42 Q90,34 166,42 T320,42 T436,42', fill: 'none', stroke: '#38bdf8', strokeWidth: 1, opacity: 0.22 }),
                  h('path', { d: 'M24,78 Q106,70 188,78 T352,78 T434,78', fill: 'none', stroke: '#7dd3fc', strokeWidth: 0.9, opacity: 0.15 })),
                /* Left: 1-1-10 Cold Water Survival Rule Visual */
                h('text', { x: 18, y: 24, fill: isContrast ? '#ffff00' : '#7dd3fc', fontSize: 11, fontWeight: 900, fontFamily: 'system-ui, sans-serif', letterSpacing: '0.06em' },
                  'COLD-WATER 1-1-10 SURVIVAL TIMELINE'),
                h('text', { x: 432, y: 24, textAnchor: 'end', fill: isContrast ? '#ffffff' : '#94a3b8', fontSize: 10, fontWeight: 700, fontFamily: 'system-ui, sans-serif' },
                  'Float first \u00B7 Control breath'),
                /* Timeline track + subtle luminous glow underlay */
                h('line', { x1: 32, y1: 62, x2: 416, y2: 62, stroke: isContrast ? '#ffff00' : '#334155', strokeWidth: 4, strokeLinecap: 'round' }),
                !isContrast && h('line', { x1: 32, y1: 62, x2: 158, y2: 62, stroke: '#38bdf8', strokeWidth: 9, opacity: 0.18, strokeLinecap: 'round' }),
                !isContrast && h('line', { x1: 158, y1: 62, x2: 296, y2: 62, stroke: '#f59e0b', strokeWidth: 9, opacity: 0.16, strokeLinecap: 'round' }),
                !isContrast && h('line', { x1: 296, y1: 62, x2: 416, y2: 62, stroke: '#ef4444', strokeWidth: 9, opacity: 0.16, strokeLinecap: 'round' }),
                h('line', { x1: 32, y1: 62, x2: 158, y2: 62, stroke: isContrast ? '#00ffff' : '#38bdf8', strokeWidth: 4, strokeLinecap: 'round' }),
                h('line', { x1: 158, y1: 62, x2: 296, y2: 62, stroke: isContrast ? '#ffff00' : '#f59e0b', strokeWidth: 4, strokeLinecap: 'round' }),
                h('line', { x1: 296, y1: 62, x2: 416, y2: 62, stroke: isContrast ? '#ff6b6b' : '#ef4444', strokeWidth: 4, strokeLinecap: 'round' }),
                /* Node 1: 1 MIN */
                !isContrast && h('circle', { cx: 64, cy: 62, r: 20, fill: '#38bdf8', opacity: 0.16 }),
                h('circle', { cx: 64, cy: 62, r: 14, fill: isContrast ? '#000000' : '#0369a1', stroke: isContrast ? '#00ffff' : '#7dd3fc', strokeWidth: 2 }),
                h('text', { x: 64, y: 66, textAnchor: 'middle', fill: '#ffffff', fontSize: 10.5, fontWeight: 900, fontFamily: 'system-ui, sans-serif' }, '1m'),
                h('text', { x: 64, y: 92, textAnchor: 'middle', fill: isContrast ? '#00ffff' : '#e0f2fe', fontSize: 10.5, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, 'Control Breath'),
                h('text', { x: 64, y: 107, textAnchor: 'middle', fill: isContrast ? '#ffffff' : '#94a3b8', fontSize: 10, fontFamily: 'system-ui, sans-serif' }, 'Gasp reflex passes'),
                /* Node 2: 10 MIN */
                !isContrast && h('circle', { cx: 224, cy: 62, r: 20, fill: '#f59e0b', opacity: 0.15 }),
                h('circle', { cx: 224, cy: 62, r: 14, fill: isContrast ? '#000000' : '#b45309', stroke: isContrast ? '#ffff00' : '#fde68a', strokeWidth: 2 }),
                h('text', { x: 224, y: 66, textAnchor: 'middle', fill: '#ffffff', fontSize: 10.5, fontWeight: 900, fontFamily: 'system-ui, sans-serif' }, '10m'),
                h('text', { x: 224, y: 92, textAnchor: 'middle', fill: isContrast ? '#ffff00' : '#fef3c7', fontSize: 10.5, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, 'Self-Rescue Window'),
                h('text', { x: 224, y: 107, textAnchor: 'middle', fill: isContrast ? '#ffffff' : '#94a3b8', fontSize: 10, fontFamily: 'system-ui, sans-serif' }, 'Meaningful motion'),
                /* Node 3: 1 HR */
                !isContrast && h('circle', { cx: 378, cy: 62, r: 20, fill: '#ef4444', opacity: 0.15 }),
                h('circle', { cx: 378, cy: 62, r: 14, fill: isContrast ? '#000000' : '#991b1b', stroke: isContrast ? '#ff6b6b' : '#fca5a5', strokeWidth: 2 }),
                h('text', { x: 378, y: 66, textAnchor: 'middle', fill: '#ffffff', fontSize: 10.5, fontWeight: 900, fontFamily: 'system-ui, sans-serif' }, '1hr'),
                h('text', { x: 378, y: 92, textAnchor: 'middle', fill: isContrast ? '#ff6b6b' : '#fecaca', fontSize: 10.5, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, 'HELP + Float'),
                h('text', { x: 378, y: 107, textAnchor: 'middle', fill: isContrast ? '#ffffff' : '#94a3b8', fontSize: 10, fontFamily: 'system-ui, sans-serif' }, 'Conserve core heat'),

                /* Vertical Divider */
                h('line', { x1: 450, y1: 16, x2: 450, y2: 108, stroke: isContrast ? '#ffff00' : '#1e3a5f', strokeWidth: 1.2 }),

                /* Right: Live Readiness Arc Gauge */
                h('circle', { cx: 506, cy: 62, r: ringR, fill: 'none', stroke: isContrast ? '#333333' : '#1e293b', strokeWidth: 7 }),
                h('circle', {
                  cx: 506, cy: 62, r: ringR, fill: 'none',
                  stroke: isContrast ? '#00ff66' : '#38bdf8',
                  strokeWidth: 7,
                  strokeLinecap: 'round',
                  strokeDasharray: ringC.toFixed(1),
                  strokeDashoffset: ringOffset.toFixed(1),
                  transform: 'rotate(-90 506 62)'
                }),
                h('text', { x: 506, y: 66, textAnchor: 'middle', fill: isContrast ? '#ffff00' : '#f8fafc', fontSize: 13, fontWeight: 900, fontFamily: 'system-ui, sans-serif' }, readinessPct + '%'),
                h('text', { x: 552, y: 46, fill: isContrast ? '#ffff00' : '#f8fafc', fontSize: 11.5, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, 'Lab Readiness'),
                h('text', { x: 552, y: 64, fill: isContrast ? '#ffffff' : '#bae6fd', fontSize: 10.5, fontWeight: 700, fontFamily: 'system-ui, sans-serif' },
                  labsPassed + ' / ' + LAB_ORDER.length + ' labs passed'),
                h('text', { x: 552, y: 80, fill: isContrast ? '#00ff66' : '#86efac', fontSize: 10.5, fontWeight: 700, fontFamily: 'system-ui, sans-serif' },
                  quizPassed + ' / ' + educationalTiles.length + ' quizzes'),
                h('text', { x: 552, y: 96, fill: isContrast ? '#ffff00' : '#fde68a', fontSize: 10, fontWeight: 700, fontFamily: 'system-ui, sans-serif' },
                  Object.keys(badges).length + ' badges earned')
              )
            );
          })(),

          h('section', { className: 'swimlab-section', 'aria-labelledby': 'swimlab-essential-heading' },
            h('div', { className: 'swimlab-section-head' },
              h('div', null,
                h('h3', { id: 'swimlab-essential-heading' }, __alloT('stem.swimlab.essential_route', 'Three life-saving essentials')),
                h('p', null, __alloT('stem.swimlab.essential_route_blurb', 'Start with the modules most likely to change a real-world decision.'))),
              h('span', { className: 'swimlab-action-note' }, swFill(__alloT('stem.swimlab.essentials_passed', '{n} / {t} quizzes passed'), { n: safetyPassed, t: safetyTiles.length }))),
            h('div', { className: 'swimlab-essential-grid', role: 'list' },
              safetyTiles.map(function(tile) { return renderTile(tile, true, false); }))),

          h('details', { className: 'swimlab-catalog', open: safetyCompleted === safetyTiles.length },
            h('summary', null, __alloT('stem.swimlab.full_catalog', 'Explore all modules, practice, and resources') + ' (' + (MENU_TILES.length - safetyTiles.length) + ')'),
            h('div', { className: 'swimlab-catalog-body' },
              catalogSections.map(function(section) {
                var sectionTiles = MENU_TILES.filter(function(tile) { return tile.section === section.id; });
                if (!sectionTiles.length) return null;
                return h('section', { key: section.id, className: 'swimlab-catalog-section', 'aria-label': section.label },
                  h('h3', null, h('span', { 'aria-hidden': 'true' }, section.emoji + ' '), section.label),
                  section.blurb && h('p', null, section.blurb),
                  h('div', { className: 'swimlab-catalog-grid', role: 'list' },
                    sectionTiles.map(function(tile) { return renderTile(tile, false, true); })));
              }))),

          Object.keys(badges).length > 0 && h('section', { className: 'swimlab-badges', 'aria-label': __alloT('stem.swimlab.badges_earned', 'Badges earned') },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: isContrast ? '#ffff00' : '#cbd5e1', marginBottom: 6 } }, __alloT('stem.swimlab.badges_earned', 'Badges earned')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              Object.keys(badges).map(function(bid) {
                // Older saves hold the raw id ("Module: coldShock"); show the module's name.
                var blabel = bid.indexOf('mod_') === 0 && MODULE_LABELS[bid.slice(4)] ? 'Module: ' + MODULE_LABELS[bid.slice(4)] : ((badges[bid] && badges[bid].label) || bid);
                return h('span', { key: bid, style: { fontSize: 12, padding: '4px 10px', borderRadius: '999rem', background: '#075985', color: '#e0f2fe', border: '1px solid ' + T.water } }, blabel);
              }))),

          h('div', { className: 'swimlab-quote' },
            __alloT('stem.swimlab.whoever_saves_a_single_soul_scripture__2', '"Whoever saves a single soul, scripture considers it as if they saved an entire world."'),
            h('br'),
            h('span', { style: { fontSize: 12, fontStyle: 'normal' } }, __alloT('stem.swimlab.mishnah_sanhedrin_4_5_pirkei_avot_2', '- Mishnah Sanhedrin 4:5 (Pirkei Avot)'))),
          disclaimerFooter()
        );
      }

      // Shared module components
      function sectionHeader(emoji, title) {
        return h('h3', { style: { margin: '18px 0 8px', fontSize: 15, color: T.accentHi, display: 'flex', alignItems: 'center', gap: 6 } },
          h('span', { 'aria-hidden': 'true' }, emoji), title);
      }

      function keyPointBlock(intro, points) {
        return h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
          intro && h('p', { style: { margin: '0 0 10px', color: T.text, lineHeight: 1.55, fontSize: 14 } }, intro),
          h('ul', { style: { margin: 0, paddingLeft: 18, color: T.muted, fontSize: 13, lineHeight: 1.7 } },
            points.map(function(p, i) {
              return h('li', { key: i }, typeof p === 'string' ? p : (
                h(React.Fragment, null,
                  h('strong', { style: { color: T.text } }, p.k + ': '),
                  p.v
                )
              ));
            })
          )
        );
      }

      function calloutBox(kind, title, body) {
        var palette = {
          warn: { bg: '#7c2d12', border: '#c2410c', fg: '#fed7aa', label: '⚠️' },
          info: { bg: '#075985', border: T.water, fg: '#e0f2fe', label: 'ℹ️' },
          danger: { bg: '#7f1d1d', border: '#dc2626', fg: '#fde2e2', label: '🚨' },
          ok: { bg: '#14532d', border: '#16a34a', fg: '#bbf7d0', label: '✅' }
        }[kind] || { bg: T.cardAlt, border: T.border, fg: T.text, label: '•' };
        return h('div', { style: { background: palette.bg, border: '1px solid ' + palette.border, borderRadius: 10, padding: 12, margin: '12px 0', color: palette.fg, fontSize: 13, lineHeight: 1.55 } },
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start' } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, palette.label),
            h('div', null,
              title && h('strong', { style: { display: 'block', marginBottom: 4 } }, title),
              body
            )
          )
        );
      }

      function scenarioCard(modId, idx, scenario) {
        var key = modId + '-scn-' + idx;
        // The authored scenarios put 94% of correct answers in slot 2
        // (measured 0/17/1/0 by the position-bias scanner). The configs are
        // inline literals recreated on every render, so rotate HERE with a
        // deterministic seed from the card key: stable across renders for a
        // given card, different across cards. Grading is by index
        // (ci === scenario.correct), so `correct` moves with the choices;
        // `explain` is one string.
        if (scenario && Array.isArray(scenario.choices) && scenario.choices.length > 1 && typeof scenario.correct === 'number') {
          var _n = scenario.choices.length;
          var _seed = 0;
          for (var _si = 0; _si < key.length; _si++) _seed = (_seed * 31 + key.charCodeAt(_si)) % 997;
          var _shift = ((_seed * 7) + 3) % _n;
          if (_shift !== 0) {
            var _moved = new Array(_n);
            for (var _i = 0; _i < _n; _i++) _moved[(_i + _shift) % _n] = scenario.choices[_i];
            scenario = Object.assign({}, scenario, { choices: _moved, correct: (scenario.correct + _shift) % _n });
          }
        }
        // Hook-free: takes a pre-allocated slot from the fixed hook budget.
        var slot = _scnSlots[idx] || _scnSlot0;
        var raw = slot[0], setRaw = slot[1];
        var setLocalState = function(next) { setRaw(next ? { k: key, v: next } : null); };
        var localState = (raw && raw.k === key) ? raw.v : null;
        var revealed = !!localState;
        return h('div', { key: key, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 10, padding: 14, marginBottom: 10 } },
          h('div', { style: { fontSize: 12, color: T.dim, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '🎭 Scenario ' + (idx + 1)),
          h('p', { style: { margin: '0 0 12px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, scenario.prompt),
          !revealed && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
            scenario.choices.map(function(c, ci) {
              return h('button', { type: 'button', key: ci,
                onClick: function() { setLocalState({ choice: ci }); wsAnnounce('Choice selected. ' + (ci === scenario.correct ? 'Correct.' : 'See explanation.')); },
                style: btn({ padding: '8px 12px', fontSize: 12 }) }, c);
            })
          ),
          revealed && h('div', null,
            h('div', { style: { fontSize: 12, color: localState.choice === scenario.correct ? T.ok : T.warn, marginBottom: 8 } },
              localState.choice === scenario.correct ? '✓ Correct.' : '✗ Reconsider — see why below.'),
            h('p', { style: { margin: '0 0 6px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', null, __alloT('stem.swimlab.right_answer', 'Right answer: ')),
              scenario.choices[scenario.correct]),
            h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 12, lineHeight: 1.55 } }, scenario.explain),
            h('button', { type: 'button',
              onClick: function() { setLocalState(null); },
              style: btn({ padding: '6px 10px', fontSize: 12, marginTop: 6 }) }, __alloT('stem.swimlab.try_again', 'Try again'))
          )
        );
      }

      function miniQuizBlock(modId, questions) {
        var keyPrefix = 'miniquiz_' + modId + '_';
        // Hook-free: takes pre-allocated slots from the fixed hook budget, keyed
        // by modId so switching modules starts that module's quiz at question 1.
        var qIdxRaw = _mqIdxSlot[0];
        var qIdx = (qIdxRaw && qIdxRaw.k === modId) ? qIdxRaw.v : 0;
        var setQIdx = function(v) { _mqIdxSlot[1]({ k: modId, v: v }); };
        var resultsRaw = _mqResSlot[0];
        var results = (resultsRaw && resultsRaw.k === modId) ? resultsRaw.v : {};
        var setResults = function(v) { _mqResSlot[1]({ k: modId, v: v }); };
        var done = qIdx >= questions.length;
        // FIRST TRY is what counts. A wrong pick shows the right answer in green,
        // and "Try again" then let the student click it for full credit, so the
        // mastery badge could be earned with no knowledge at all. Try again is
        // still there for practice; the score keeps the first pick.
        var correct = questions.filter(function(_q, i) { return results['first_' + i] === true; }).length;
        var pct = questions.length ? Math.round((correct / questions.length) * 100) : 0;
        // Award the per-module mastery badge once on completion at ≥80%. Queued
        // rather than granted in a useEffect here — this function runs inside a
        // conditional view branch, so it may not call hooks at all.
        if (done && pct >= 80 && !badges['mod_' + modId]) {
          _pendingAwards.current.push({ id: 'mod_' + modId, label: 'Module: ' + (MODULE_LABELS[modId] || modId), xp: 2, reason: 'Module quiz passed' });
        }
        if (done) _pendingQuizSaves.current.push({ id: modId, correct: correct, total: questions.length, pct: pct });
        if (done) {
          return h('div', { style: { background: T.card, border: '1px solid ' + (pct >= 80 ? T.ok : T.warn), borderRadius: 12, padding: 14, marginTop: 12 } },
            h('div', { style: { fontSize: 14, fontWeight: 700, color: pct >= 80 ? T.ok : T.warn, marginBottom: 6 } },
              pct >= 80 ? '🏅 Mastery' : '📖 Review recommended'),
            h('p', { style: { margin: 0, color: T.text, fontSize: 13 } },
              __alloT('stem.swimlab.score_first_tries', 'Score (first tries): '), h('strong', null, correct + ' / ' + questions.length + ' (' + pct + '%)')),
            pct < 80 && h('p', { style: { margin: '6px 0 0', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              __alloT('stem.swimlab.mastery_needs_80', 'Mastery needs 80% on first tries. Read the Why notes, then retry.')),
            h('button', { type: 'button', onClick: function() { setQIdx(0); setResults({}); }, style: btn({ marginTop: 10, padding: '6px 12px', fontSize: 12 }) }, __alloT('stem.swimlab.retry', 'Retry'))
          );
        }
        var q = questions[qIdx];
        var answered = results[qIdx] !== undefined;
        return h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 14, marginTop: 12 } },
          h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 6 } }, 'Mini-quiz · ' + (qIdx + 1) + ' / ' + questions.length),
          h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 14, fontWeight: 600 } }, q.q),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            swOptionOrder('mq-' + modId + '-' + qIdx, q.opts.length).map(function(oi) {
              var opt = q.opts[oi];
              var isCorrect = oi === q.ans;
              var picked = answered && results[qIdx + '_pick'] === oi;
              var style = btn({ padding: '8px 12px', fontSize: 13 });
              if (answered) {
                if (isCorrect) style = Object.assign({}, style, { background: '#14532d', borderColor: T.ok, color: '#bbf7d0' });
                else if (picked) style = Object.assign({}, style, { background: '#7f1d1d', borderColor: T.danger, color: '#fde2e2' });
              }
              return h('button', { type: 'button', key: oi, disabled: answered,
                onClick: function() {
                  var newResults = Object.assign({}, results);
                  newResults[qIdx] = (oi === q.ans);
                  newResults[qIdx + '_pick'] = oi;
                  if (newResults['first_' + qIdx] === undefined) newResults['first_' + qIdx] = (oi === q.ans);
                  setResults(newResults);
                  wsAnnounce(oi === q.ans ? 'Correct.' : 'Incorrect. The correct answer is shown.');
                }, style: style },
                answered && isCorrect && h('span', { 'aria-hidden': 'true' }, '✓ '),
                answered && picked && !isCorrect && h('span', { 'aria-hidden': 'true' }, '✗ '),
                opt);
            })
          ),
          answered && h('div', { style: { marginTop: 10, padding: 10, background: T.cardAlt, borderRadius: 8, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.text } }, 'Why: '), q.explain),
          // Action row: "Try again" (clears the result for THIS question so
          // the user can re-pick) is only shown for wrong answers — there's
          // nothing to retry on a correct one. "Next →" advances regardless.
          answered && h('div', { style: { marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' } },
            results[qIdx] === false && h('button', { type: 'button',
              onClick: function() {
                var nr = Object.assign({}, results);
                delete nr[qIdx];
                delete nr[qIdx + '_pick'];
                setResults(nr);
                wsAnnounce(__alloT('stem.swimlab.sr_question_reset_try_again', 'Question reset. Try again.'));
              },
              style: btn({ padding: '8px 14px', fontSize: 13 }) }, __alloT('stem.swimlab.try_again_2', '↺ Try again')),
            h('button', { type: 'button',
              onClick: function() { setQIdx(qIdx + 1); },
              style: btnPrimary({ padding: '8px 14px', fontSize: 13 }) },
              qIdx + 1 < questions.length ? 'Next →' : 'See score')
          )
        );
      }

      function sourcesBlock(sources) {
        return h('div', { style: { marginTop: 14, padding: 12, background: T.cardAlt, border: '1px dashed ' + T.border, borderRadius: 8 } },
          h('div', { style: { fontSize: 12, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, __alloT('stem.swimlab.sources', '📖 Sources')),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.6 } },
            sources.map(function(src, i) {
              return h('li', { key: i },
                src.url ? h('a', { href: src.url, target: '_blank', rel: 'noopener', style: { color: T.link } }, src.label) : src.label,
                src.note ? ' — ' + src.note : ''
              );
            })
          )
        );
      }

      // ─────────────────────────────────────────
      // TEACHER NOTES — per-module standards, discussion prompts,
      // misconceptions, and extension activity. Collapsed by default
      // (students see a single line); expands on click and force-expands
      // on print so a teacher gets a usable handout. Standards lean on
      // the National Health Education Standards (NHES) since water
      // safety is primarily a health-education domain; physics/biology
      // modules also cite NGSS where relevant.
      // ─────────────────────────────────────────
      function TeacherNotes(props) {
        return h('details', { className: 'swimlab-teacher-notes',
          style: { background: '#3b2a08', border: '2px solid #d97706', borderRadius: 12, padding: 14, marginTop: 14 } },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fed7aa', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 44 },
            'aria-label': __alloT('stem.swimlab.teacher_notes_for_this_module', 'Teacher Notes for this module')
          },
            h('span', null, __alloT('stem.swimlab.teacher_notes_click_to_expand', '🍎 Teacher Notes — click to expand')),
            h('span', {
              className: 'swimlab-no-print',
              role: 'button', tabIndex: 0,
              'aria-label': __alloT('stem.swimlab.print_this_module_page', 'Print this module page'),
              onClick: function(e) { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} },
              onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} } },
              style: { fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: '#fef3c7', color: '#7c2d12', border: '1px solid #d97706' }
            }, __alloT('stem.swimlab.print_2', '🖨️ Print'))
          ),
          h('div', { style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 } },
            props.standards && h('div', null,
              h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, __alloT('stem.swimlab.aligned_standards', 'Aligned standards')),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                props.standards.map(function(s, i) {
                  return h('span', { key: i, style: { fontSize: 12, padding: '3px 8px', background: '#fef3c7', color: '#7c2d12', border: '1px solid #d97706', borderRadius: 6, fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace', fontWeight: 600 } }, s);
                })
              )
            ),
            props.discussion && h('div', null,
              h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, __alloT('stem.swimlab.discussion_questions', 'Discussion questions')),
              h('ol', { style: { margin: 0, paddingLeft: 20, fontSize: 13, color: '#fde68a', lineHeight: 1.65 } },
                props.discussion.map(function(q, i) { return h('li', { key: i, style: { marginBottom: 4 } }, q); })
              )
            ),
            props.misconceptions && h('div', null,
              h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, __alloT('stem.swimlab.common_misconceptions', 'Common misconceptions')),
              h('ul', { style: { margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 } },
                props.misconceptions.map(function(m, i) {
                  return h('li', { key: i, style: { fontSize: 13, color: '#fde68a', lineHeight: 1.55, display: 'flex', gap: 8, alignItems: 'flex-start' } },
                    h('span', { 'aria-hidden': 'true', style: { color: '#dc2626', fontWeight: 800, flex: 'none' } }, '⚠'),
                    h('span', null,
                      h('em', null, m.wrong),
                      ' — ',
                      m.right
                    )
                  );
                })
              )
            ),
            props.extension && h('div', null,
              h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, __alloT('stem.swimlab.extension_activity', 'Extension activity')),
              h('div', { style: { fontSize: 13, color: '#fde68a', fontStyle: 'italic', lineHeight: 1.55 } }, props.extension)
            )
          )
        );
      }

      // Per-module teacher-notes content. NHES = National Health Education
      // Standards; NGSS = Next Generation Science Standards; CEC = Council
      // for Exceptional Children Special Education Standards (autism module).
      // Discussion questions favor "why" over "what" because the recall is
      // already in the module body — what the conversation needs is the
      // physics, the physiology, the policy reasoning behind the rules.
      var TEACHER_NOTES = {
        howSwimming: {
          standards: ['NHES 1.8.1', 'NHES 7.8.1', 'NGSS MS-PS2-2', 'NGSS MS-LS1-3'],
          discussion: [
            'Why does back float work physically? Tie the answer to Archimedes\' principle, lung air density, and the body\'s buoyant center.',
            'Drag-based propulsion (paddling) versus lift-based propulsion (S-shaped pull). Which one matters more in slow strokes vs fast strokes?',
            'Body composition affects floating. What does this mean for swim instruction with body-diverse students, and how would you talk about it without weight stigma?'
          ],
          misconceptions: [
            { wrong: 'Strong swimmers do not drown.', right: 'Many people who drown know how to swim. Cold water, rip currents, panic, and exhaustion close the gap fast.' },
            { wrong: 'Take heavy clothes off so you can swim better.', right: 'In cold water, wet clothes trap insulating air and slow heat loss. Keep them on. The exception is heavy boots that are pulling you vertical.' },
            { wrong: 'Treading water is the safest survival posture.', right: 'Floating is. Treading burns calories and heat fast; floating uses lung air as built-in flotation and costs nothing.' }
          ],
          extension: 'Time the eggbeater kick versus the flutter kick in a pool. Have students measure how long they can hold a vertical position with each. Connect the difference back to Newton\'s third law and the geometry of the leg sweep.'
        },
        coldShock: {
          standards: ['NHES 1.8.1', 'NHES 7.8.2', 'NGSS MS-LS1-3'],
          discussion: [
            'Why does the gasp reflex exist evolutionarily, and why does the same reflex that protects mammals from suffocation become deadly when triggered by cold water on the human face?',
            'The mammalian dive response slows the heart and shunts blood to the brain. Why is this protective in near-drowning, and why is it stronger in children?',
            'Why is "I will just swim to shore" the most dangerous response to falling in cold water?'
          ],
          misconceptions: [
            { wrong: 'People die from drowning, not cold.', right: 'Drowning is the cause of death, but the gasp reflex from cold shock is what often makes them inhale water. Cold shock kills more cold-water victims than slow hypothermia does.' },
            { wrong: 'Hypothermia kills you within minutes.', right: 'In 50°F water, unconsciousness is roughly an hour out. Cold incapacitation arrives faster (~10 min) and is what disables rescue self-help. Knowing the timeline fights panic.' },
            { wrong: 'Swim hard to keep yourself warm.', right: 'Movement burns heat faster than it generates in cold water. Float, breathe through the gasp reflex, then move purposefully if you have a destination.' }
          ],
          extension: 'Watch the Cold Water Boot Camp video series with Mario Vittone. Have students log the timeline of cold shock effects on the volunteer subjects. Discuss why this kind of demonstration only works with safety divers in attendance.'
        },
        ripCurrents: {
          standards: ['NHES 1.8.1', 'NHES 5.8.3', 'NGSS MS-ESS2-2', 'NGSS MS-PS2-2'],
          discussion: [
            'How does a rip current form? Tie the answer to wave-driven shoreward water flow, the bathymetry of sand bars, and the pressure gradient that pushes the return flow seaward through gaps.',
            'The parallel-to-shore escape works because rip currents are narrow channels. How would you sketch this on a chalkboard for a student who has never seen one?',
            'Why do drowning rates spike on holiday weekends? What does that say about the role of crowds, alcohol, and unfamiliar beaches?'
          ],
          misconceptions: [
            { wrong: 'Rip tides pull you under the water.', right: 'Rip currents pull you out, not down. The danger is exhaustion from fighting the current, not being dragged below the surface. (And "rip tide" is a misnomer — they are not tidal.)' },
            { wrong: 'A strong swimmer can fight a rip current head-on.', right: 'A rip current usually moves 1 to 2 feet per second and has been measured at 8 feet per second, faster than an Olympic swimmer. Fighting it only wears you out. The escape is geometric, not athletic.' },
            { wrong: 'Calm water in the surf zone is safer than the breaking waves.', right: 'Calm water in a surf zone is a textbook sign of a rip current. The waves break where there is sand below; the calm is where the water is funneling back out.' }
          ],
          extension: 'Have students draw a top-down beach diagram with sand bars, rip channels, and feeder currents. Add the parallel-escape vector. Optional: pair with a NOAA rip-current statement from the local forecast office.'
        },
        iceSafety: {
          standards: ['NHES 1.8.1', 'NHES 7.8.2', 'Maine Learning Results — Health Education D'],
          discussion: [
            'Why is white "snow" ice weaker than clear blue ice? Tie the answer to the crystal structure formed during slow refreezing of slush versus slow lake-water freezing.',
            'Inlets, outlets, and underwater springs keep ice thinner even in cold weather. What does this mean for ice fishers, snowmobilers, and kids exploring a frozen pond?',
            'Why is "swim and roll out" better than "stand up and walk away" once you are back on the ice?'
          ],
          misconceptions: [
            { wrong: 'Cold water under the ice will kill you in minutes.', right: 'The 1-1-10 rule applies. You have a minute to control breathing, ten minutes of useful arm strength, and roughly an hour before unconsciousness in 35°F water.' },
            { wrong: 'Heavy winter clothing will drag you down.', right: 'Wet winter clothing actually traps air and provides insulation. Removing it during ice self-rescue removes both buoyancy and warmth.' },
            { wrong: 'Once the ice breaks, you cannot get back on it.', right: 'You usually can — if you turn back the way you came (the ice that just held you), get horizontal, kick hard, and slide out. Ice picks make this dramatically easier.' }
          ],
          extension: 'Invite a Maine Warden Service game warden as a guest speaker on ice safety and through-ice rescue. Many wardens will visit schools by appointment. Pair with a Picks of Life demonstration.'
        },
        hypothermia: {
          standards: ['NHES 1.8.1', 'NHES 7.8.1', 'NGSS MS-LS1-3', 'NGSS HS-PS3-3'],
          discussion: [
            'Why is "not dead until WARM and dead" medically true? Discuss documented cold-water full-recovery cases (Anna Bagenholm, Michelle Funk). What does this tell us about the brain\'s metabolic response to cold?',
            'Severe hypothermia patients can have an extremely slow pulse that is hard to detect. Why does this matter for the no-CPR-if-pulse rule?',
            'After-drop: rewarming the surface of a severely hypothermic patient too fast can drop core temperature further and trigger cardiac arrest. Why does this happen, and what does it imply for first-responder protocols?'
          ],
          misconceptions: [
            { wrong: 'Rub the skin and limbs to warm a hypothermic person.', right: 'Do not rub. Rubbing pushes cold peripheral blood toward the core, which can drop core temperature and induce cardiac arrest (after-drop).' },
            { wrong: 'Give them coffee or alcohol to warm up.', right: 'Both are vasodilators that move warm blood to the cold periphery, accelerating heat loss. Alcohol is also cardiotoxic in this context. Warm sweet fluids are okay only if the patient is fully alert.' },
            { wrong: 'A patient with no pulse and no breathing in cold water is dead.', right: 'Cold dramatically protects the brain. Continue CPR through transport and rewarming. People have recovered from hour-plus cardiac arrests at very low core temperatures.' }
          ],
          extension: 'Have students research the recovery of Anna Bagenholm (Norwegian skier resuscitated from 13.7°C / 56.7°F core temperature in 2000). Discuss what made her recovery possible and what the case taught wilderness medicine.'
        },
        pfd: {
          standards: ['NHES 1.8.1', 'NHES 7.8.2', 'NGSS MS-PS2-2', 'USCG 33 CFR 175 Subpart B'],
          discussion: [
            'A Type II PFD is rated for "calm inland waters" and a Type I for "rough open ocean." What is the buoyancy and turning-from-face-down difference between them, and why does it matter?',
            'Why does fit matter as much as type? Tie the answer to the lift test (does it ride up over the chin?) and what happens to a poorly-fitted PFD when the wearer hits the water hard.',
            'Per USCG data, about 86% of boating drowning victims were not wearing a life jacket (85 to 87% in recent yearly reports). Most boats are required to carry one for each person. What does that tell us about the gap between "having safety equipment" and "using it"?'
          ],
          misconceptions: [
            { wrong: 'I am a strong swimmer, so a PFD is optional.', right: 'Many people who drown know how to swim. PFDs save the strong swimmers who get cold, panicked, knocked out, or trapped under a hull.' },
            { wrong: 'Modern inflatable PFDs are unreliable.', right: 'Modern inflatables are USCG-approved, very reliable, and far more comfortable than foam vests. They require manual or auto inflation and need an annual check.' },
            { wrong: 'Adult PFDs work fine for kids if you tighten the straps.', right: 'Adult PFDs ride up over a child\'s head in water and trap the airway under the buoyancy. Children must wear PFDs sized for their current weight, replaced as they grow.' }
          ],
          extension: 'Have students inspect their family\'s or school\'s PFDs against the USCG checklist (intact straps, no faded fabric, working buckles, correct size, USCG-approved label). Recommend replacement of any PFD that fails.'
        },
        reachThrow: {
          standards: ['NHES 1.8.1', 'NHES 4.8.3', 'NHES 7.8.1', 'CASEL — Responsible Decision-Making'],
          discussion: [
            'Why does the bystander effect happen, and why does pointing at one specific person and saying "YOU. CALL 911." cut through it?',
            'The four-step ladder ends with "Don\'t Go" instead of "Go bravely." Why is bravery the wrong frame for water rescue, and how do you teach that to students who want to be heroes?',
            'A drowning person\'s nervous system has one priority: get above water. Why does this make them dangerous to an untrained rescuer, and how do trained lifeguards handle the approach differently?'
          ],
          misconceptions: [
            { wrong: 'Drowning looks like the movies — yelling, waving, splashing.', right: 'Drowning is silent and vertical. Mario Vittone\'s Instinctive Drowning Response: head low, mouth at water level, eyes empty, arms pressing down on the surface, no kick. The whole event lasts 20-60 seconds.' },
            { wrong: 'A strong swimmer can rescue anyone.', right: 'People who swim out to save someone often drown themselves, and most of them were trying to save a family member. Reach or throw; do not go in.' },
            { wrong: 'Calling 911 wastes time you should spend rescuing.', right: 'Professional rescue takes time to arrive. The clock starts the moment you recognize the emergency. Have someone else call while you reach or throw — both happen in parallel.' }
          ],
          extension: 'Practice the REACH technique with a pool noodle in pairs (dry land first, then waist-deep pool with a lifeguard present). Have one student play the panicked victim and grab whatever the rescuer extends. Debrief on how it felt to be anchored.'
        },
        drainEntrap: {
          standards: ['NHES 1.8.1', 'NHES 7.8.2', 'CPSC 16 CFR Part 1450', 'Virginia Graeme Baker Pool & Spa Safety Act'],
          discussion: [
            'Why was the Virginia Graeme Baker Act needed? What gap in pool safety did it address, and why was Graeme Baker\'s death the catalyst?',
            'How does an anti-vortex (multi-functional) drain cover work physically? Why is a flat single drain so much more dangerous?',
            'Why is the emergency pump shut-off the first action in a drain entrapment, not 911? What does this say about the mechanics of suction versus rescue physiology?'
          ],
          misconceptions: [
            { wrong: 'Drains can only catch hair.', right: 'Five entrapment types: hair, body, limb, evisceration, mechanical. Each requires different prevention. Body and evisceration are the deadliest.' },
            { wrong: 'All US pools are now VGBA-compliant.', right: 'VGBA covers commercial pools and spas. Many residential pools have not been retrofitted. A residential inspection is on the family.' },
            { wrong: 'You can pull someone off a drain by hand.', right: 'Active drain suction can exceed 500 lbs of force. Pulling against it can cause serious injury or evisceration. The shut-off switch is the rescue.' }
          ],
          extension: 'Have students audit a community pool against the VGBA checklist (anti-vortex covers visible, emergency shut-off labeled and accessible, no missing covers). Bring findings to the pool manager.'
        },
        autismWater: {
          standards: ['NHES 1.8.1', 'CEC Special Education Standards 1, 2, 6', 'IDEA — IEP planning', 'CASEL — Self-Awareness, Relationship Skills'],
          discussion: [
            'The 160x drowning-risk statistic is alarming. Why is it actionable rather than fatalistic? What does layered prevention look like in concrete IEP terms?',
            'How would you adapt swim instruction for an autistic student with sensory regulation challenges (cold water, drain noise, deep-end pressure changes)? What accommodations are reasonable and what should be in the lesson plan?',
            'Identity-first language ("autistic student") versus person-first ("student with autism") — what does the autistic-community research say (Bury 2020, Kenny 2016, Taboas 2023), and why does language choice matter for trust with families?'
          ],
          misconceptions: [
            { wrong: 'Autistic students cannot learn to swim.', right: 'They can. Many autistic students become competent swimmers and some compete (Special Olympics, mainstream swim teams). The pace and accommodations differ; the outcome is achievable.' },
            { wrong: 'Standard supervision is enough; no need for a special plan.', right: 'For an autistic student with elopement history, defense-in-depth (fence + alarm + adapted swim + bright suit + GPS + community awareness) is what reduces risk. No single layer is sufficient.' },
            { wrong: 'Bringing this up will scare the family.', right: 'Most families want this conversation and are relieved when the school initiates it. The 160x statistic is well-known in the autism parenting community; what families often need is a partner in planning, not protection from the data.' }
          ],
          extension: 'Have students draft an IEP water-safety addendum for a hypothetical autistic 8-year-old with elopement history living near a small pond. Optional: interview a Special Olympics aquatics coach or an adaptive swim instructor about real practice.'
        }
      };

      // ─────────────────────────────────────────
      // SVG STROKE DIAGRAM HELPERS
      // ─────────────────────────────────────────
      // Each stroke gets a small SVG showing one cycle as 4 phase frames.
      // Stick-figure side-view; arrows for force vectors; water surface as
      // a wavy line. Designed to be readable in a 720px-wide card.
      function svgFrame(opts) {
        // opts: { phase, body: [{type, ...}], arrows: [{x1,y1,x2,y2,color,label}], caption }
        var W = 160, H = 90;
        var uid = 'sw-' + String(opts.caption || opts.phase || 'f').replace(/[^a-z0-9]/gi, '').slice(0, 12);
        var surfY = H * 0.52;
        var children = [];
        // Translucent sunlit water volume + animated diagonal caustic shafts + shimmering caustic floor ripples
        if (!isContrast) {
          children.push(h('rect', { key: 'water', x: 0, y: surfY, width: W, height: H - surfY, fill: 'url(#' + uid + '-w)' }));
          children.push(h('polygon', { key: 'ray1', className: 'sw-caustic-shaft', points: '24,' + surfY + ' 54,' + surfY + ' 38,' + H + ' 8,' + H, fill: 'url(#' + uid + '-r)' }));
          children.push(h('polygon', { key: 'ray2', className: 'sw-caustic-shaft', style: { animationDelay: '-1.9s' }, points: '88,' + surfY + ' 124,' + surfY + ' 106,' + H + ' 72,' + H, fill: 'url(#' + uid + '-r)' }));
          children.push(h('path', { key: 'caust1', className: 'sw-caustic-floor', d: 'M10,74 Q36,68 62,74 T114,74 T154,74', fill: 'none', stroke: isDark ? '#7dd3fc' : '#ffffff', strokeWidth: 1.1, opacity: isDark ? 0.28 : 0.44 }));
          children.push(h('path', { key: 'caust2', className: 'sw-caustic-floor', style: { animationDelay: '-1.6s' }, d: 'M18,83 Q48,78 78,83 T138,83', fill: 'none', stroke: isDark ? '#38bdf8' : '#e0f2fe', strokeWidth: 0.9, opacity: isDark ? 0.24 : 0.38 }));
          // Live advecting laminar hydrodynamic flow streamlines & alternating shedding vortex eddies + rising bubble trails
          children.push(h('path', { key: 'lam1', className: 'sw-stream-advect', style: { '--sw-flow-dur': '2.4s' }, d: 'M14,57 Q52,53 86,58 T148,57', fill: 'none', stroke: isDark ? '#38bdf8' : '#0284c7', strokeWidth: 0.95, strokeDasharray: '7 5', opacity: 0.42 }));
          children.push(h('path', { key: 'lam2', className: 'sw-stream-advect', style: { '--sw-flow-dur': '2.8s', animationDelay: '-0.8s' }, d: 'M18,67 Q58,64 96,68 T146,66', fill: 'none', stroke: isDark ? '#67e8f9' : '#0369a1', strokeWidth: 0.85, strokeDasharray: '6 6', opacity: 0.34 }));
          children.push(h('path', { key: 'eddy1', className: 'sw-eddy-cw', style: { '--sw-eddy-dur': '3.0s' }, d: 'M122,63 A5,5 0 1,1 117,68', fill: 'none', stroke: isDark ? '#a5f3fc' : '#0284c7', strokeWidth: 1.0, opacity: 0.48 }));
          children.push(h('path', { key: 'eddy2', className: 'sw-eddy-ccw', style: { '--sw-eddy-dur': '2.6s' }, d: 'M134,58 A4,4 0 1,0 130,62', fill: 'none', stroke: isDark ? '#7dd3fc' : '#0369a1', strokeWidth: 0.9, opacity: 0.40 }));
          [[112, 64, 1.5], [118, 57, 1.2], [126, 52, 1.6], [104, 69, 1.1], [44, 62, 1.2]].forEach(function(bb, bbi) {
            children.push(h('circle', { key: 'bub' + bbi, className: 'sw-bubble-rise', style: { '--sw-bub-dur': (2.2 + (bbi % 3) * 0.55) + 's', animationDelay: (-bbi * 0.48) + 's' }, cx: bb[0], cy: bb[1], r: bb[2], fill: 'rgba(224,242,254,0.45)', stroke: '#bae6fd', strokeWidth: 0.5 }));
          });
        } else {
          children.push(h('rect', { key: 'water', x: 0, y: surfY, width: W, height: H - surfY, fill: '#000000', opacity: 0.5 }));
        }
        // Dual-pass glowing water meniscus surface wave
        children.push(h('path', { key: 'waveGlow', className: isContrast ? '' : 'sw-surface-ripple',
          d: 'M0,' + surfY + ' Q' + (W * 0.25) + ',' + (surfY - 4) + ' ' + (W * 0.5) + ',' + surfY + ' T' + W + ',' + surfY,
          stroke: isContrast ? '#00ffff' : '#38bdf8', strokeWidth: 3.4, fill: 'none', opacity: isContrast ? 0.35 : 0.28 }));
        children.push(h('path', { key: 'wave', className: isContrast ? '' : 'sw-surface-ripple',
          d: 'M0,' + surfY + ' Q' + (W * 0.25) + ',' + (surfY - 4) + ' ' + (W * 0.5) + ',' + surfY + ' T' + W + ',' + surfY,
          stroke: isContrast ? '#00ffff' : (isDark ? '#bae6fd' : '#0284c7'), strokeWidth: 1.3, fill: 'none', opacity: 0.88 }));
        // Body parts with subtle silhouette contrast halo
        (opts.body || []).forEach(function(b, bi) {
          if (b.type === 'line') children.push(h('line', { key: 'b' + bi, x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, stroke: b.color || '#f0f9ff', strokeWidth: b.width || 2.5, strokeLinecap: 'round' }));
          else if (b.type === 'circle') children.push(h('circle', { key: 'b' + bi, cx: b.cx, cy: b.cy, r: b.r, fill: b.color || '#f0f9ff', stroke: b.stroke || (isDark ? 'rgba(8,24,38,0.6)' : 'rgba(15,23,42,0.28)'), strokeWidth: b.strokeWidth || 0.7 }));
          else if (b.type === 'ellipse') children.push(h('ellipse', { key: 'b' + bi, cx: b.cx, cy: b.cy, rx: b.rx, ry: b.ry, fill: b.color || '#f0f9ff', stroke: b.stroke || (isDark ? 'rgba(8,24,38,0.6)' : 'rgba(15,23,42,0.28)'), strokeWidth: b.strokeWidth || 0.7, transform: b.transform || '' }));
          else if (b.type === 'path') children.push(h('path', { key: 'b' + bi, d: b.d, stroke: b.color || '#f0f9ff', strokeWidth: b.width || 2.5, fill: b.fill || 'none', strokeLinecap: 'round', transform: b.transform || undefined }));
        });
        // Glowing thrust / buoyancy / drag force arrows
        (opts.arrows || []).forEach(function(a, ai) {
          var aCol = a.color || '#fbbf24';
          if (!isContrast) {
            children.push(h('line', { key: 'ag' + ai, x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, stroke: aCol, strokeWidth: 4.5, strokeLinecap: 'round', opacity: 0.28 }));
          }
          children.push(h('line', { key: 'a' + ai, x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, stroke: aCol, strokeWidth: 1.7, strokeLinecap: 'round', markerEnd: 'url(#' + uid + '-arr)' }));
          if (a.label) {
            var lx = (a.x1 + a.x2) / 2 + (a.labelDx || 4);
            var ly = (a.y1 + a.y2) / 2 + (a.labelDy || -3);
            children.push(h('text', { key: 'al' + ai, x: lx, y: ly, fontSize: 10, fontWeight: 700, fill: isContrast ? '#ffff00' : (isDark ? aCol : '#0f172a'), fontFamily: 'system-ui, sans-serif',
              stroke: isContrast ? '#000000' : (isDark ? 'rgba(5,17,29,0.9)' : 'rgba(255,255,255,0.9)'), strokeWidth: 2.6, paintOrder: 'stroke', strokeLinejoin: 'round' }, a.label));
          }
        });
        return h('div', { style: { textAlign: 'center' } },
          h('svg', {
            width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
            role: 'img',
            'aria-label': __alloT('stem.swimlab.stroke_phase_diagram', 'Swimming stroke phase diagram') + (opts.caption ? ': ' + opts.caption : ''),
            style: { background: isContrast ? '#000000' : (isDark ? 'linear-gradient(180deg, #0d2438 0%, #091b2c 52%, #05111d 100%)' : 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 52%, #7dd3fc 100%)'), borderRadius: 8, border: '1px solid ' + T.border }
          },
            h('defs', null,
              h('linearGradient', { id: uid + '-w', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                h('stop', { offset: '0%', stopColor: isDark ? '#0284c7' : '#38bdf8', stopOpacity: isDark ? 0.34 : 0.28 }),
                h('stop', { offset: '100%', stopColor: isDark ? '#082f49' : '#0284c7', stopOpacity: isDark ? 0.62 : 0.42 })),
              h('linearGradient', { id: uid + '-r', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                h('stop', { offset: '0%', stopColor: '#e0f2fe', stopOpacity: isDark ? 0.24 : 0.42 }),
                h('stop', { offset: '100%', stopColor: '#7dd3fc', stopOpacity: 0 })),
              h('marker', { id: uid + '-arr', markerWidth: 6, markerHeight: 6, refX: 5, refY: 3, orient: 'auto', markerUnits: 'strokeWidth' },
                h('path', { d: 'M0,0 L0,6 L6,3 z', fill: '#fbbf24' }))
            ),
            children
          ),
          h('div', { style: { fontSize: 12, color: T.dim, marginTop: 4, fontStyle: 'italic' } }, opts.caption)
        );
      }

      function strokeCard(opts) {
        // opts: { id, emoji, name, intro, frames: [svgFrame opts], physics: 'string', takeaway: 'string', survival?: bool }
        return h('div', { key: opts.id, style: { background: T.card, border: '1px solid ' + (opts.survival ? T.ok : T.border), borderRadius: 12, padding: 14, marginBottom: 14 } },
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, opts.emoji),
            h('h4', { style: { margin: 0, fontSize: 16, fontWeight: 800, color: T.text } }, opts.name),
            opts.survival && h('span', { style: { fontSize: 12, fontWeight: 700, padding: '2px 8px', background: '#14532d', color: '#bbf7d0', borderRadius: 999, border: '1px solid ' + T.ok } }, __alloT('stem.swimlab.survival_skill', 'SURVIVAL SKILL'))
          ),
          h('p', { style: { margin: '0 0 10px', fontSize: 13, color: T.muted, lineHeight: 1.55 } }, opts.intro),
          opts.frames && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 10 } },
            opts.frames.map(function(fr, fi) { return h('div', { key: fi }, svgFrame(fr)); })
          ),
          h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.55, padding: '8px 10px', background: T.cardAlt, borderRadius: 6, marginBottom: 8 } },
            h('strong', { style: { color: T.accentHi } }, __alloT('stem.swimlab.physics', '⚙ Physics: ')), opts.physics),
          h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.55, padding: '8px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: 6, borderLeft: '3px solid ' + T.ok } },
            h('strong', { style: { color: T.ok } }, __alloT('stem.swimlab.key_takeaway', '🎯 Key takeaway: ')), opts.takeaway),
          opts.crossRef && h('div', { className: 'swimlab-no-print', style: { marginTop: 8, fontSize: 12, lineHeight: 1.5 } },
            h('button', { type: 'button',
              onClick: function() { upd('view', opts.crossRef.id); markVisited(opts.crossRef.id); wsAnnounce(__alloT('stem.swimlab.sr_opening_cross_referenced_module', 'Opening cross-referenced module')); },
              style: { background: 'none', border: 'none', padding: 0, color: T.accentHi, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }
            }, opts.crossRef.label)
          )
        );
      }

      // ─────────────────────────────────────────
      // MODULE — HOW SWIMMING WORKS (stroke physics + survival skills)
      // ─────────────────────────────────────────
      function renderHowSwimming() {
        // Survival skills (lead with these — they save lives)
        var survivalCards = [
          {
            id: 'backFloat', emoji: '🛌', name: __alloT('stem.swimlab.back_float', 'Back Float'), survival: true,
            intro: __alloT('stem.swimlab.the_single_most_life_saving_skill_in_c', 'The single most life-saving skill in cold water. Lungs full of air make you naturally buoyant. Tilting the head back keeps the airway out of the water without effort. Costs no energy, can be held for hours, and beats panicking every single time.'),
            frames: [
              {
                phase: 'Float position',
                body: [
                  // Side-view person on back, ears in water, face up
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 6, color: '#fde68a' }, // body horizontal
                  { type: 'circle', cx: 50, cy: 48, r: 5, color: '#fde68a' }, // head tilted back
                  { type: 'line', x1: 105, y1: 51, x2: 122, y2: 53, color: '#fde68a', width: 3 }, // legs
                  { type: 'line', x1: 75, y1: 50, x2: 85, y2: 45, color: '#fde68a', width: 2 }, // arms relaxed at sides
                ],
                arrows: [
                  { x1: 80, y1: 70, x2: 80, y2: 56, color: '#22c55e', label: __alloT('stem.swimlab.buoyant_force', 'Buoyant force') }
                ],
                caption: __alloT('stem.swimlab.lungs_full_head_back_arms_relaxed', 'Lungs full · head back · arms relaxed')
              }
            ],
            physics: 'Archimedes\' principle: an object floats when displaced water weighs more than the object. Lung air is less dense than water, so a relaxed body with full lungs has average density just below 1.0 g/mL — barely positive buoyancy. Tilting the head back pivots the body around the chest (the buoyant center), which lifts the face out of the water without muscular effort.',
            takeaway: 'The first 60 seconds in cold water are about NOT fighting your body. Float on your back, tilt your head back, breathe through the gasp reflex. Then think about what comes next.',
            crossRef: { id: 'coldShock', label: __alloT('stem.swimlab.see_why_this_is_the_1_cold_water_survi', 'See why this is the #1 cold-water survival skill →') }
          },
          {
            id: 'eggbeater', emoji: '🥚', name: __alloT('stem.swimlab.eggbeater_kick_treading_water', 'Eggbeater Kick (Treading Water)'),  survival: true,
            intro: __alloT('stem.swimlab.used_by_water_polo_players_lifeguards_', 'Used by water polo players, lifeguards, and anyone needing to stay vertical in deep water for a long time. Each leg traces a circle in the opposite direction, generating continuous upward thrust without the up-and-down bobbing of a flutter kick.'),
            frames: [
              {
                phase: 'Right leg sweeps clockwise, left leg counter-clockwise',
                body: [
                  // Vertical figure, head above water, arms sculling at sides
                  { type: 'circle', cx: 80, cy: 30, r: 5, color: '#fde68a' }, // head
                  { type: 'line', x1: 80, y1: 35, x2: 80, y2: 56, color: '#fde68a', width: 4 }, // torso
                  { type: 'line', x1: 80, y1: 42, x2: 70, y2: 50, color: '#fde68a', width: 2 }, // arm L sculling
                  { type: 'line', x1: 80, y1: 42, x2: 90, y2: 50, color: '#fde68a', width: 2 }, // arm R
                  { type: 'path', d: 'M80,56 Q70,65 75,75', color: '#fde68a', width: 3 }, // leg L circling
                  { type: 'path', d: 'M80,56 Q90,65 85,75', color: '#fde68a', width: 3 }, // leg R circling opposite
                ],
                arrows: [
                  { x1: 70, y1: 68, x2: 75, y2: 80, color: '#fbbf24', label: '↻' },
                  { x1: 90, y1: 68, x2: 85, y2: 80, color: '#fbbf24', label: '↺' },
                  { x1: 80, y1: 25, x2: 80, y2: 18, color: '#22c55e', label: __alloT('stem.swimlab.lift', 'Lift') }
                ],
                caption: __alloT('stem.swimlab.counter_rotating_legs_constant_lift', 'Counter-rotating legs · constant lift')
              }
            ],
            physics: 'Each leg sweep displaces water downward via drag. Newton\'s third law: the water pushes you up with equal force. By alternating directions, the two legs are always in different parts of their cycle, so the upward push is steady instead of coming in bursts. That steady lift is why water polo players and lifeguards use it to stay up with their hands free.',
            takeaway: 'When you need to stay vertical in deep water for a long time (treading until rescue, holding a victim above water), eggbeater is the sustainable choice. Flutter kicking exhausts you fast.'
          },
          {
            id: 'help', emoji: '🤗', name: __alloT('stem.swimlab.help_position_heat_escape_lessening_po', 'HELP Position (Heat Escape Lessening Posture)'), survival: true,
            intro: __alloT('stem.swimlab.for_solo_cold_water_survival_while_wea', 'For solo cold-water survival while wearing a life jacket. Knees pulled to chest, arms crossed over chest, body curled. Reduces heat loss through the body\'s biggest blood-flow zones (groin, armpits, sides of chest).'),
            frames: [
              {
                phase: 'HELP position (life jacket required)',
                body: [
                  // Curled fetal-ish position floating
                  { type: 'circle', cx: 70, cy: 45, r: 5, color: '#fde68a' }, // head
                  { type: 'ellipse', cx: 80, cy: 52, rx: 10, ry: 7, color: '#fbbf24', transform: '' }, // PFD bulk on chest
                  { type: 'line', x1: 75, y1: 52, x2: 90, y2: 56, color: '#fde68a', width: 3 }, // torso
                  { type: 'path', d: 'M88,55 Q98,55 95,46 Q88,42 82,48', color: '#fde68a', width: 2.5, fill: 'none' }, // knees pulled up
                  { type: 'line', x1: 78, y1: 50, x2: 86, y2: 56, color: '#fde68a', width: 2 }, // arms crossed across chest
                ],
                arrows: [
                  { x1: 105, y1: 45, x2: 96, y2: 50, color: '#dc2626', label: __alloT('stem.swimlab.heat_loss', '−Heat loss') }
                ],
                caption: __alloT('stem.swimlab.knees_up_arms_crossed_groin_armpit_clo', 'Knees up · arms crossed · groin/armpit closed off')
              }
            ],
            physics: 'In cold water you lose heat fastest from the head and neck, the sides of the chest, and the groin, where blood flows close to the skin. Pulling your knees up and your arms in covers the chest and groin. Holding still in a life jacket also keeps a layer of warmer water next to you, while swimming or treading pumps cold water past the skin. That is why HELP slows cooling. It only works with a life jacket holding you up.',
            takeaway: 'If you are alone in cold water with a life jacket and no immediate way out, get into HELP position. Conserve heat. Wait for rescue. Movement burns heat faster than it generates.'
          },
          {
            id: 'huddle', emoji: '👥', name: __alloT('stem.swimlab.group_huddle', 'Group Huddle'), survival: true,
            intro: __alloT('stem.swimlab.multiple_people_in_cold_water_with_lif', 'Multiple people in cold water with life jackets cluster chest-to-chest, arms around each other. Children go in the middle. The group functions as a single warmer body and is much more visible to rescuers than scattered individuals.'),
            frames: [
              {
                phase: '3 people huddled (top-down view)',
                body: [
                  { type: 'circle', cx: 60, cy: 50, r: 8, color: '#fbbf24' },
                  { type: 'circle', cx: 80, cy: 45, r: 8, color: '#fbbf24' },
                  { type: 'circle', cx: 100, cy: 50, r: 8, color: '#fbbf24' },
                  { type: 'circle', cx: 80, cy: 55, r: 5, color: '#fde68a' } // child in middle
                ],
                arrows: [
                  { x1: 80, y1: 25, x2: 80, y2: 35, color: '#22c55e', label: '+Warmth' }
                ],
                caption: __alloT('stem.swimlab.adults_around_children_in_middle_facin', 'Adults around · children in middle · facing in')
              }
            ],
            physics: 'Multiple bodies share warmth at their points of contact (chest-to-chest). Combined surface area exposed to cold water drops per-person; combined visible silhouette to rescuers grows. Children placed in the center benefit most because they have higher surface-area-to-body-mass ratios and lose heat faster.',
            takeaway: 'If multiple people end up in cold water together, huddle. Everyone in life jackets, chest to chest, kids in the middle, faces in toward each other to retain breath warmth. Wait for rescue.'
          }
        ];

        // Competitive strokes (physics demos)
        var strokeCards = [
          {
            id: 'freestyle', emoji: '🏊', name: __alloT('stem.swimlab.freestyle_front_crawl', 'Freestyle (Front Crawl)'),
            intro: __alloT('stem.swimlab.the_fastest_stroke_long_axis_rotation_', 'The fastest stroke. Long-axis rotation: the body rolls 30-45° per arm cycle to reduce frontal cross-section and let the recovering arm clear the water. Bilateral breathing alternates breath sides every 3 strokes.'),
            frames: [
              {
                phase: '1. Catch',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 110, cy: 49, r: 4, color: '#fde68a' },
                  { type: 'line', x1: 80, y1: 48, x2: 50, y2: 40, color: '#fde68a', width: 2.5 }, // lead arm extended forward
                  { type: 'line', x1: 80, y1: 52, x2: 100, y2: 60, color: '#fde68a', width: 2 } // recovering arm under
                ],
                arrows: [{ x1: 50, y1: 45, x2: 50, y2: 55, color: '#fbbf24', label: '↓' }],
                caption: __alloT('stem.swimlab.hand_enters_water_forearm_sets_vertica', 'Hand enters water · forearm sets vertical')
              },
              {
                phase: '2. Pull',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 110, cy: 49, r: 4, color: '#fde68a' },
                  { type: 'line', x1: 60, y1: 50, x2: 70, y2: 60, color: '#fde68a', width: 2.5 } // arm pulling under body
                ],
                arrows: [{ x1: 70, y1: 60, x2: 95, y2: 60, color: '#22c55e', label: __alloT('stem.swimlab.thrust', 'Thrust →') }],
                caption: __alloT('stem.swimlab.arm_pulls_water_back_body_moves_forwar', 'Arm pulls water back · body moves forward')
              },
              {
                phase: '3. Push',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 110, cy: 49, r: 4, color: '#fde68a' },
                  { type: 'line', x1: 80, y1: 52, x2: 100, y2: 65, color: '#fde68a', width: 2.5 } // arm finishing push at hip
                ],
                arrows: [{ x1: 100, y1: 65, x2: 115, y2: 65, color: '#22c55e', label: '→' }],
                caption: __alloT('stem.swimlab.hand_pushes_past_hip_maximum_thrust', 'Hand pushes past hip · maximum thrust')
              },
              {
                phase: '4. Recovery',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 110, cy: 49, r: 4, color: '#fde68a' },
                  { type: 'path', d: 'M105,50 Q90,30 70,38', color: '#fde68a', width: 2.5, fill: 'none' } // arm over water
                ],
                arrows: [],
                caption: __alloT('stem.swimlab.arm_over_water_body_rolls_to_opposite_', 'Arm over water · body rolls to opposite side')
              }
            ],
            physics: 'Most propulsion comes from the PULL phase under the body (Newton\'s third law: pushing water backward propels you forward). Rolling the body from side to side lets the shoulders and core add power to the pull and makes the arm recovery and breathing easier. The "high elbow catch" lets the forearm act as a paddle through the most water; dropping the elbow loses propulsion.',
            takeaway: 'Freestyle speed comes from streamlining as much as from strength. Elite swimmers spend more energy on body position than on pulling harder.'
          },
          {
            id: 'backstroke', emoji: '🛌', name: __alloT('stem.swimlab.backstroke', 'Backstroke'),
            intro: __alloT('stem.swimlab.freestyle_inverted_same_long_axis_rota', 'Freestyle inverted — same long-axis rotation, alternating arms, flutter kick. The single most important detail: head position. A neutral head with ears in the water and eyes up keeps the hips up and the body streamlined. Looking down sinks the hips and doubles drag.'),
            frames: [
              {
                phase: 'Pull phase (one arm under, one arm over)',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 50, cy: 49, r: 4, color: '#fde68a' }, // head
                  { type: 'line', x1: 80, y1: 52, x2: 100, y2: 62, color: '#fde68a', width: 2.5 }, // arm pulling under
                  { type: 'path', d: 'M80,48 Q90,30 105,38', color: '#fde68a', width: 2.5, fill: 'none' } // arm over (recovery)
                ],
                arrows: [{ x1: 100, y1: 62, x2: 75, y2: 62, color: '#22c55e', label: __alloT('stem.swimlab.thrust_2', '← thrust') }],
                caption: __alloT('stem.swimlab.pinky_enters_first_s_shaped_pull', 'Pinky enters first · S-shaped pull')
              }
            ],
            physics: 'Same propulsion mechanics as freestyle but inverted. Head position is everything: tilting the chin to the chest sinks the hips, increasing wetted surface area and drag dramatically. Elite backstrokers keep their ears just below the surface and eyes pointed straight up.',
            takeaway: 'In any survival situation where you can swim on your back, keeping your head neutral (ears down, eyes up) makes the difference between making progress and exhausting yourself.'
          },
          {
            id: 'breaststroke', emoji: '🐸', name: __alloT('stem.swimlab.breaststroke', 'Breaststroke'),
            intro: __alloT('stem.swimlab.the_oldest_competitive_stroke_and_the_', 'The oldest competitive stroke and the slowest of the four. Symmetric arm pull and frog-kick legs separated by a long glide phase. Visible head out of water makes it good for staying oriented.'),
            frames: [
              {
                phase: '1. Pull (heart-shaped sweep)',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 110, cy: 47, r: 4, color: '#fde68a' },
                  { type: 'path', d: 'M70,48 Q60,55 70,60', color: '#fde68a', width: 2.5, fill: 'none' },
                  { type: 'path', d: 'M70,48 Q60,55 70,60', color: '#fde68a', width: 2.5, fill: 'none', transform: 'translate(20 0) scale(-1 1) translate(-160 0)' }
                ],
                arrows: [{ x1: 50, y1: 60, x2: 70, y2: 55, color: '#22c55e', label: __alloT('stem.swimlab.pull', 'Pull') }],
                caption: __alloT('stem.swimlab.arms_sweep_heart_shape_head_lifts_to_b', 'Arms sweep heart-shape · head lifts to breathe')
              },
              {
                phase: '2. Kick + Glide',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 50, cy: 49, r: 4, color: '#fde68a' },
                  { type: 'line', x1: 110, y1: 50, x2: 122, y2: 47, color: '#fde68a', width: 2 },
                  { type: 'line', x1: 110, y1: 52, x2: 122, y2: 55, color: '#fde68a', width: 2 }
                ],
                arrows: [{ x1: 122, y1: 51, x2: 135, y2: 51, color: '#fbbf24', label: __alloT('stem.swimlab.frog_kick', '↺ frog kick') }],
                caption: __alloT('stem.swimlab.frog_kick_long_glide_streamlined', 'Frog kick · long glide · streamlined')
              }
            ],
            physics: 'Propulsion is concentrated in two short pulses (the pull and the kick) separated by a long glide. Most of the cycle is spent in the glide, where the body decelerates from drag. Optimal breaststroke maximizes glide distance per kick — you propel hard, then minimize losses while coasting.',
            takeaway: 'Breaststroke is the easiest stroke to learn and the slowest to swim. The visible head makes it useful for situational awareness (looking around for boats, the shore, or a rescuer).'
          },
          {
            id: 'butterfly', emoji: '🦋', name: __alloT('stem.swimlab.butterfly', 'Butterfly'),
            intro: __alloT('stem.swimlab.the_most_physically_demanding_competit', 'The most physically demanding competitive stroke. Symmetric over-water arm recovery, dolphin kick (legs together undulating), and a body undulation that drives propulsion through the chest and hips.'),
            frames: [
              {
                phase: 'Body undulation (side view)',
                body: [
                  { type: 'path', d: 'M40,55 Q60,45 80,55 Q100,65 120,55', color: '#fde68a', width: 4, fill: 'none' }, // wave-shaped body
                  { type: 'circle', cx: 35, cy: 55, r: 4, color: '#fde68a' }, // head
                  { type: 'line', x1: 60, y1: 48, x2: 50, y2: 35, color: '#fde68a', width: 2 }, // arm reaching forward
                  { type: 'line', x1: 60, y1: 48, x2: 70, y2: 35, color: '#fde68a', width: 2 }, // other arm
                  { type: 'line', x1: 120, y1: 55, x2: 130, y2: 60, color: '#fde68a', width: 2 } // feet
                ],
                arrows: [{ x1: 130, y1: 60, x2: 130, y2: 50, color: '#fbbf24', label: __alloT('stem.swimlab.dolphin', '↕ dolphin') }],
                caption: __alloT('stem.swimlab.body_undulates_arms_recover_symmetric_', 'Body undulates · arms recover symmetric · feet whip')
              }
            ],
            physics: 'The dolphin kick is a traveling wave from chest to feet. Each undulation pushes a packet of water backward (Newton\'s third law again), so propulsion is continuous through the kick rather than pulsed. The double-arm symmetric pull adds a powerful but brief thrust burst. Butterfly is fast but tiring: it is very hard to keep up for long, so it is no stroke for survival.',
            takeaway: 'Butterfly is the closest a human gets to dolphin-style swimming. The undulation IS the propulsion; the arms add to it but the wave through the body is the engine.'
          },
          {
            id: 'sidestroke', emoji: '🚤', name: __alloT('stem.swimlab.sidestroke', 'Sidestroke'),
            intro: __alloT('stem.swimlab.historically_the_rescue_stroke_one_arm', 'Historically THE rescue stroke. One arm free for towing a victim, head above water, scissor kick, slow but sustainable. Not raced today but taught in lifeguard certification.'),
            frames: [
              {
                phase: 'Side position with scissor kick',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 50, cy: 48, r: 4, color: '#fde68a' }, // head turned up
                  { type: 'line', x1: 50, y1: 50, x2: 35, y2: 50, color: '#fde68a', width: 2.5 }, // lead arm extended
                  { type: 'line', x1: 100, y1: 52, x2: 90, y2: 60, color: '#fde68a', width: 2 }, // trailing arm pulling at side
                  { type: 'line', x1: 110, y1: 50, x2: 125, y2: 45, color: '#fde68a', width: 2 }, // top leg up
                  { type: 'line', x1: 110, y1: 52, x2: 125, y2: 60, color: '#fde68a', width: 2 } // bottom leg down
                ],
                arrows: [{ x1: 125, y1: 53, x2: 110, y2: 53, color: '#fbbf24', label: __alloT('stem.swimlab.scissor_close', 'Scissor close') }],
                caption: __alloT('stem.swimlab.side_position_scissor_kick_head_out_on', 'Side position · scissor kick · head out · one arm free')
              }
            ],
            physics: 'Less efficient than freestyle but vastly more sustainable because the head stays out of water (no breathing rhythm to manage) and one arm can hold a victim or float. The scissor kick (open then snap closed) generates propulsion when the legs come back together — the closing motion accelerates a column of water rearward.',
            takeaway: 'If you ever take a lifeguard course, you will learn sidestroke first. It is what every rescue tow uses because it leaves an arm free and the head up.'
          }
        ];

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🏊 How Swimming Works'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 16px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.swimming_is_applied_physics_buoyancy_p', 'Swimming is applied physics: buoyancy + propulsion + drag, modulated by body position. This module breaks each stroke into phases with the physics labeled, then explains the underlying forces. '),
            h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.reading_this_is_not_a_substitute_for_s', 'Reading this is not a substitute for swim instruction. ')),
            __alloT('stem.swimlab.you_cannot_learn_to_swim_from_a_screen', 'You cannot learn to swim from a screen. Find a Water Safety Instructor at Red Cross or YMCA.')),

          labLink('strokeHunt'),

          sectionHeader('🆘', 'Survival skills (these actually save lives)'),
          h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            __alloT('stem.swimlab.these_four_are_the_highest_leverage_sk', 'These four are the highest-leverage skills in the whole module. They cost no athletic talent. They have saved more lives than fancy strokes ever will.')),
          survivalCards.map(strokeCard),

          sectionHeader('🏊', 'The competitive strokes (physics demos)'),
          h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            __alloT('stem.swimlab.these_are_taught_in_swim_lessons_and_u', 'These are taught in swim lessons and used in racing. Reading the physics will help you understand what your instructor is asking you to do, but it does NOT replace time in the water.')),
          strokeCards.map(strokeCard),

          sectionHeader('🔬', 'The underlying physics'),
          keyPointBlock(
            'Three forces govern every moment in water: buoyancy (up), drag (against motion), and propulsion (whatever you generate to move forward). Strokes are different ways to optimize the relationship between these three.',
            [
              { k: 'Buoyancy (Archimedes)', v: 'You float when the water you displace weighs more than you do. Lung volume is the biggest variable a person can change in real time. Full lungs add roughly 4-6 liters of displaced water = 4-6 kg of upward force, enough to make almost anyone positively buoyant. This is why "take a deep breath and float" works.' },
              { k: 'Drag (3 types)', v: 'Form drag (your body\'s shape pushing through water — minimized by streamlining), friction drag (skin against water — small for humans), and wave drag (energy lost making waves at the surface — why elite swimmers swim deep underwater after pushoffs). At human swimming speeds, form drag dominates; streamlining matters more than strength.' },
              { k: 'Propulsion (Newton\'s third law)', v: 'Every stroke moves water backward; the water pushes you forward by an equal force. The most efficient strokes use the WHOLE forearm as a paddle (not just the hand), pull water as far as possible, and avoid letting water "slip" past the limb without being moved.' },
              { k: 'Lift theory', v: 'Modern stroke instruction adds lift forces (similar to airplane wings) generated by the hand sculling at angles. The hand acts like a hydrofoil — moving through water generates perpendicular force, not just drag. This is why the "S-shaped pull" came into freestyle in the 1970s.' },
              { k: 'Reynolds number at human scale', v: 'Reynolds number describes whether flow is smooth (laminar) or chaotic (turbulent). A swimmer\'s Reynolds number is high — flow around the body is turbulent. This is why elite swimmers wear smooth-textured suits (reduces friction drag in turbulent flow) and why holding the body straight matters (broken posture creates extra turbulence).' },
              { k: 'Body composition', v: 'Body fat is less dense than water; muscle and bone are denser. Lean swimmers naturally sink without active flotation; people with higher body fat float more easily. This is biology, not effort. Lean swimmers compensate with constant motion or air in the lungs.' }
            ]
          ),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('howSwimming', 0, {
            prompt: 'You fall into a Maine lake in October (water ~55°F). You are wearing jeans and a t-shirt. You can swim a little. The shore is about 50 feet away. What is the survival-physics-best play?',
            choices: [
              'Try to swim freestyle to shore as fast as possible.',
              'Float on your back, control breathing for ~60 seconds, then swim slowly with sidestroke or breaststroke (head out, sustainable) toward shore.',
              'Take off the wet jeans and shirt right away so nothing drags, then swim freestyle to shore before the cold has time to build up in your arms and legs.',
              'Tread water until someone notices.'
            ],
            correct: 1,
            explain: 'Float-and-breathe first (gasp reflex passes). Then move slowly with a head-out stroke so you can see, breathe, and conserve energy. Wet clothes trap insulating air; do not remove them. Swimming hard exhausts you and triggers cold incapacitation faster. Sidestroke or slow breaststroke is the survival pace.'
          }),
          scenarioCard('howSwimming', 1, {
            prompt: 'You are tested on a swim lesson and asked to demonstrate a survival skill that lets you stay vertical for 10+ minutes without exhausting yourself. Which kick do you use?',
            choices: [
              'Flutter kick (alternating up-down)',
              'Eggbeater kick (legs trace counter-rotating circles)',
              'Dolphin kick (both legs together, undulating from the hips)',
              'No kick, just arms'
            ],
            correct: 1,
            explain: 'Eggbeater. The counter-rotating circles produce continuous lift rather than pulsed lift, so you do not bob up and down. This is what water polo players and lifeguards use to stay up with their hands free.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('howSwimming', [
            { q: 'The most life-saving skill in cold water is:', opts: ['Freestyle to shore', 'Back float', 'Treading water indefinitely', 'Diving underwater'], ans: 1, explain: 'Back float costs no energy and keeps your face out of the water through the gasp reflex. It works for almost anyone and can be held for hours. Freestyle exhausts you fast in cold water; treading is harder than floating.' },
            { q: 'Eggbeater kick is more efficient than flutter kick for staying vertical because:', opts: ['It looks fancier', 'Counter-rotating legs produce constant lift instead of pulsed lift', 'It uses less leg muscle because only one leg works at a time while the other rests', 'It is faster forward'], ans: 1, explain: 'Each leg is in a different part of its circular cycle, so net upward force is continuous rather than pulsed. A flutter kick mostly pushes you forward, not up.' },
            { q: 'In freestyle, the body roll (rotating 30-45° per stroke) primarily reduces:', opts: ['Friction drag (skin and water contact)', 'Form drag (frontal cross-section)', 'Wave drag', 'Buoyancy'], ans: 1, explain: 'A flat body presents the largest cross-section to the water. Rolling 30-45° narrows the silhouette, dropping form drag substantially. Body roll is one of the biggest drag-reduction techniques in competitive swimming.' },
            { q: 'Why do people with higher body fat float more easily?', opts: ['Body fat has lower density than water', 'They have more muscle', 'They have larger lungs that hold more air', 'It is unrelated'], ans: 0, explain: 'Body fat has density ~0.9 g/mL (less than water at 1.0 g/mL); muscle and bone are denser than water. Higher fat percentage means lower average body density, which translates to easier floating. This is physics, not effort or fitness.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.usa_swimming_foundation_2', 'USA Swimming Foundation'), url: 'https://www.usaswimming.org/foundation' },
            { label: __alloT('stem.swimlab.american_red_cross_swim_water_safety', 'American Red Cross — Swim & Water Safety'), url: 'https://www.redcross.org/take-a-class/swimming' },
            { label: __alloT('stem.swimlab.ymca_aquatics_programs', 'YMCA — Aquatics Programs'), url: 'https://www.ymca.org/what-we-do/healthy-living/swimming-aquatics' },
            { label: __alloT('stem.swimlab.cold_water_boot_camp_help_and_huddle', 'Cold Water Boot Camp — HELP and Huddle'), url: 'https://coldwaterbootcamp.com' },
            { label: __alloT('stem.swimlab.counsilman_counsilman_the_science_of_s', 'Counsilman & Counsilman, "The Science of Swimming" (classic reference for stroke biomechanics)') },
            { label: __alloT('stem.swimlab.maglischo_swimming_fastest_modern_stro', 'Maglischo, "Swimming Fastest" (modern stroke physics)') }
          ]),
          h(stableType('TeacherNotes', TeacherNotes), TEACHER_NOTES.howSwimming),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 1 — COLD WATER SHOCK & 1-1-10
      // ─────────────────────────────────────────
      function renderColdShock() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🥶 Cold Water Survival'),
          emergencyBanner(),
          h('div', { role: 'note', style: { padding: '10px 14px', background: T.cardAlt, border: '1px dashed ' + T.warn, borderRadius: 8, fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 12 } },
            h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.heads_up', 'Heads up: ')),
            __alloT('stem.swimlab.this_module_talks_about_drowning_and_n', 'this module talks about drowning and near-drowning matter-of-factly. If you have lost someone to a water emergency, the content may bring difficult feelings up. You can step away or skip ahead at any time.')),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.most_cold_water_deaths_happen_in_the_f', 'Most cold water deaths happen in the first 60 seconds — not from drowning by inability to swim, but from involuntary breathing and panic. This module teaches the physiology and the response that saves lives.')),

          labLink('coldLab'),

          sectionHeader('🫁', 'What happens to your body in cold water'),
          keyPointBlock(
            'Your body has automatic, hard-wired reactions to sudden cold water. Knowing them lets you ride them out instead of fighting them.',
            [
              { k: 'Cold shock response (0-60 seconds)', v: 'A massive involuntary gasp followed by 1-3 minutes of hyperventilation. This is the gasp reflex. If your face goes under during the gasp, you inhale water.' },
              { k: 'Mammalian dive response', v: 'Cold water on the face triggers slowed heart rate (bradycardia) and shunts blood to brain and heart. This protective reflex is stronger in children and can sometimes preserve neurological function during near-drowning.' },
              { k: 'Cold incapacitation (3-30 minutes)', v: 'Your hands and arms lose strength and coordination. Even strong swimmers cannot swim or hold a rope after about 10 minutes in 50°F water.' },
              { k: 'Hypothermia (30-60 minutes)', v: 'Core body temperature drops below 95°F. This is what eventually kills if you are still in the water, but it is much slower than people think.' }
            ]
          ),

          sectionHeader('⏱️', 'The 1-1-10 Rule'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.water, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 10px', color: T.text, lineHeight: 1.55, fontSize: 14, fontWeight: 600 } },
              __alloT('stem.swimlab.if_you_fall_into_cold_water_you_have', 'If you fall into cold water, you have:')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 10 } },
              [
                { num: '1', unit: 'minute', label: __alloT('stem.swimlab.to_control_your_breathing', 'to control your breathing'), detail: __alloT('stem.swimlab.do_nothing_else_float_on_your_back_let', 'Do nothing else. Float on your back. Let the gasp reflex pass. Do not try to swim yet.') },
                { num: '10', unit: 'minutes', label: __alloT('stem.swimlab.of_meaningful_movement', 'of meaningful movement'), detail: __alloT('stem.swimlab.after_the_gasp_passes_you_have_10_minu', 'After the gasp passes, you have ~10 minutes of useful arm/hand strength to swim to safety, climb out, or signal for help.') },
                { num: '1', unit: 'hour', label: __alloT('stem.swimlab.before_unconsciousness', 'before unconsciousness'), detail: __alloT('stem.swimlab.hypothermia_takes_about_an_hour_to_mak', 'Hypothermia takes about an hour to make you unconscious in 50°F water. This means rescuers have time. People who appear "drowned" from cold water can sometimes be revived.') }
              ].map(function(stage, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 10, padding: 12 } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
                    h('span', { style: { fontSize: 28, fontWeight: 800, color: T.accentHi } }, stage.num),
                    h('span', { style: { fontSize: 13, color: T.muted } }, stage.unit)),
                  h('div', { style: { fontSize: 13, fontWeight: 600, color: T.text, marginTop: 4 } }, stage.label),
                  h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5, marginTop: 6 } }, stage.detail)
                );
              })
            )
          ),

          calloutBox('warn', 'Why this matters in Maine',
            'Maine surface water is below 60°F most months of the year, including parts of summer. Even on warm July days, lake temperatures at depth and ocean temperatures everywhere on the coast trigger cold water shock. Cold water kills people who could swim a mile in a heated pool.'),

          calloutBox('info', 'The float-on-your-back trick',
            h(React.Fragment, null,
              __alloT('stem.swimlab.when_you_fall_in_cold_water_v2', 'When you fall in cold water, the worst thing is to try to swim immediately. Tilt your head back, fill your lungs, and float. Your gasp reflex will pass in 60 seconds or so. Then you can swim or signal. '),
              h('button', { type: 'button',
                className: 'swimlab-no-print',
                onClick: function() { upd('view', 'howSwimming'); markVisited('howSwimming'); wsAnnounce(__alloT('stem.swimlab.sr_opening_how_swimming_works', 'Opening How Swimming Works')); },
                style: { background: 'none', border: 'none', padding: 0, color: T.accentHi, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }
              }, __alloT('stem.swimlab.see_the_back_float_physics_in_how_swim', 'See the Back Float physics in How Swimming Works →'))
            )),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('coldShock', 0, {
            prompt: 'You are walking next to a frozen lake in February. The ice gives way and you fall through. The water is about 35°F. You can swim in a pool. What do you do FIRST?',
            choices: [
              'Swim hard for the nearest shore.',
              'Float on your back, tilt head back, and breathe through the gasp reflex for one minute.',
              'Try to take off your jacket and boots right away so nothing weighs you down, then swim for the edge.',
              'Yell for help while treading water.'
            ],
            correct: 1,
            explain: 'The gasp reflex makes you inhale uncontrollably for the first ~60 seconds. If you try to swim or yell during that window, you will likely inhale water and drown. Floating on your back keeps your face out of the water until the gasp passes. THEN you can think about swimming or self-rescue. Heavy clothes (jackets, boots) actually trap insulating air in cold water — taking them off makes you colder and exhausts you. Keep them on until you are out of the water.'
          }),
          scenarioCard('coldShock', 1, {
            prompt: __alloT('stem.swimlab.a_friend_falls_off_a_kayak_into_a_main', 'A friend falls off a kayak into a Maine lake in October (water ~55°F). They are wearing a life jacket. They start swimming hard for shore about 200 feet away. What is the biggest risk?'),
            choices: [
              'Their life jacket will fail.',
              'They will get hypothermia within the next 5 minutes and lose consciousness.',
              'Cold incapacitation will kill their arm strength before they reach shore.',
              'A boat will hit them.'
            ],
            correct: 2,
            explain: 'In 55°F water, most people lose useful arm/hand strength within 5-15 minutes (cold incapacitation). 200 feet is a long swim once your arms stop working. The life jacket keeps them floating once they tire — that is exactly its purpose. The better choice is often to stay with the kayak (it floats and is visible), signal, and wait for rescue rather than swim a marginal distance.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('coldShock', [
            { q: 'What is the FIRST physiological reaction when you fall in cold water?', opts: ['Hypothermia', 'A massive involuntary gasp', 'Loss of consciousness from the shock', 'Cardiac arrest'], ans: 1, explain: 'The cold shock response is an involuntary gasp followed by 1-3 minutes of hyperventilation. If your face is underwater during the gasp, you inhale water. Floating face-up for the first minute is the highest-leverage thing you can do.' },
            { q: 'In the 1-1-10 rule, the "10" stands for:', opts: ['10 seconds before drowning', '10 minutes of meaningful arm/hand strength', '10°F drop in body temperature within the first minute', '10 strokes to safety'], ans: 1, explain: 'After the gasp reflex passes (~1 minute), you have roughly 10 minutes of useful arm and hand function before cold incapacitation makes meaningful movement impossible. Use that window deliberately.' },
            { q: 'Why should you NOT remove a heavy jacket if you fall in cold water?', opts: ['It is illegal to undress in public, even in an emergency on the water', 'The jacket traps insulating air and slows heat loss', 'You cannot swim with one arm', 'It will float away'], ans: 1, explain: 'Wet clothes (especially jackets and wool layers) trap a small amount of insulating water and air against your skin. Taking them off accelerates heat loss and exhausts you. Keep them on until you are out of the water.' },
            { q: 'A child falls into cold water and is pulled out 15 minutes later, apparently lifeless. What is the medically appropriate response?', opts: ['Pronounce dead at scene', 'Begin CPR and continue until medical professionals arrive — children have been revived after long cold-water immersion', 'Wait for rigor mortis to confirm', 'Wrap them warmly in blankets, keep them still, and let them recover on their own, because rewarming is what restarts breathing in cold-water victims'], ans: 1, explain: 'The mammalian dive response is stronger in children. There are documented cases of full neurological recovery after 30+ minutes of cold-water submersion. The medical maxim is: "Not dead until WARM and dead." Begin CPR immediately and continue until medical professionals take over.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.cold_water_boot_camp_mario_vittone', 'Cold Water Boot Camp (Mario Vittone)'), url: 'https://coldwaterbootcamp.com', note: __alloT('stem.swimlab.the_1_1_10_rule_mammalian_dive_respons', 'The 1-1-10 rule, mammalian dive response, cold incapacitation timelines') },
            { label: __alloT('stem.swimlab.cdc_drowning_prevention', 'CDC: Drowning prevention'), url: 'https://www.cdc.gov/drowning' },
            { label: __alloT('stem.swimlab.national_drowning_prevention_alliance_', 'National Drowning Prevention Alliance (NDPA)'), url: 'https://ndpa.org' },
            { label: __alloT('stem.swimlab.mario_vittone_if_a_child_is_drowning', 'Mario Vittone — "If a child is drowning"'), url: 'https://mariovittone.com' },
            { label: __alloT('stem.swimlab.aap_policy_statement_prevention_of_dro', 'AAP Policy Statement: Prevention of Drowning (2019, reaffirmed)'), url: 'https://publications.aap.org/pediatrics/article/143/5/e20190850/76998' }
          ]),
          h(stableType('TeacherNotes', TeacherNotes), TEACHER_NOTES.coldShock),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 2 — RIP CURRENTS
      // ─────────────────────────────────────────
      function renderRipCurrents() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🌊 Rip Currents'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.rip_currents_pull_swimmers_v2', 'Rip currents pull swimmers away from shore on US coasts, including Maine. The escape technique is counterintuitive: people who panic try to swim straight back to the beach.')),

          labLink('ripLab'),

          sectionHeader('❓', 'What is a rip current?'),
          keyPointBlock(
            'A rip current is a narrow, fast-moving channel of water flowing AWAY from shore through the surf zone. It forms when waves pile water on the beach and that water finds a low spot to escape back to deeper water.',
            [
              { k: 'Speed', v: 'Usually 1 to 2 feet per second, measured as fast as 8 feet per second (about 5.5 mph): faster than an Olympic swimmer can sprint.' },
              { k: 'Width', v: 'Usually 10 to 30 feet wide. They are narrow.' },
              { k: 'Length', v: 'Most rip currents end just past the breaking waves (50-100 yards offshore). They do NOT pull you "out to sea" forever.' },
              { k: 'Frequency', v: 'Cause about 80% of beach lifeguard rescues per the US Lifesaving Association (USLA).' }
            ]
          ),

          /* Hydrodynamic Rip Current & Parallel Escape Vector Diagram */
          h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 12, marginBottom: 14 } },
            h('svg', {
              viewBox: '0 0 560 190',
              role: 'img',
              'aria-label': __alloT('stem.swimlab.rip_hydrodynamics_diagram', 'Top-down rip current hydrodynamics diagram showing breaking surf bars on left and right, a narrow dark-blue offshore rip neck flowing out to sea, and a green parallel-to-shore escape path returning safely through the breakers.'),
              style: { width: '100%', maxWidth: 560, height: 'auto', display: 'block', margin: '0 auto', borderRadius: 8 }
            },
              h('defs', null,
                h('linearGradient', { id: 'sw-rip-sea', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                  h('stop', { offset: '0%', stopColor: isContrast ? '#000000' : '#082f49' }),
                  h('stop', { offset: '58%', stopColor: isContrast ? '#000000' : '#0e7490' }),
                  h('stop', { offset: '84%', stopColor: isContrast ? '#000000' : '#22d3ee', stopOpacity: 0.75 }),
                  h('stop', { offset: '100%', stopColor: isContrast ? '#000000' : '#d6b685' })),
                h('radialGradient', { id: 'sw-rip-head', cx: '50%', cy: '50%', r: '50%' },
                  h('stop', { offset: '0%', stopColor: '#38bdf8', stopOpacity: 0.42 }),
                  h('stop', { offset: '100%', stopColor: '#0284c7', stopOpacity: 0 })),
                h('marker', { id: 'sw-rip-out', markerWidth: 6, markerHeight: 6, refX: 5, refY: 3, orient: 'auto' },
                  h('path', { d: 'M0,0 L0,6 L6,3 z', fill: isContrast ? '#ff6b6b' : '#fb7185' })),
                h('marker', { id: 'sw-rip-esc', markerWidth: 6, markerHeight: 6, refX: 5, refY: 3, orient: 'auto' },
                  h('path', { d: 'M0,0 L0,6 L6,3 z', fill: isContrast ? '#00ff66' : '#34d399' }))),
              h('rect', { x: 0, y: 0, width: 560, height: 190, rx: 8, fill: isContrast ? '#000000' : 'url(#sw-rip-sea)', stroke: isContrast ? '#ffff00' : '#1e3a5f', strokeWidth: 1.2 }),
              /* Sandy shoreline at bottom */
              h('path', { d: 'M0,158 Q140,152 280,158 T560,154 L560,190 L0,190 Z', fill: isContrast ? '#111111' : '#c8a978' }),
              /* Breaking surf wave crests on left & right sandbars (with calm dark rip gap in center) */
              [78, 104, 130].map(function(wy, wi) {
                return h('g', { key: 'brk' + wi, className: isContrast ? '' : 'sw-surf-wash', style: isContrast ? undefined : { animationDelay: (-wi * 0.85) + 's' } },
                  h('path', { d: 'M14,' + wy + ' Q78,' + (wy - 5) + ' 142,' + wy + ' T224,' + wy, fill: 'none', stroke: isContrast ? '#ffffff' : 'rgba(240,249,255,0.84)', strokeWidth: 3 - wi * 0.4, strokeLinecap: 'round' }),
                  h('path', { d: 'M336,' + wy + ' Q400,' + (wy - 5) + ' 466,' + wy + ' T546,' + wy, fill: 'none', stroke: isContrast ? '#ffffff' : 'rgba(240,249,255,0.84)', strokeWidth: 3 - wi * 0.4, strokeLinecap: 'round' }));
              }),
              /* Deeper rip neck channel & mushrooming rip head with dissipating lateral eddies */
              !isContrast && h('ellipse', { cx: 280, cy: 36, rx: 66, ry: 24, fill: 'url(#sw-rip-head)' }),
              !isContrast && h('path', { className: 'sw-eddy-ccw', style: { '--sw-eddy-dur': '3.6s' }, d: 'M242,40 A11,11 0 1,0 232,31', fill: 'none', stroke: 'rgba(186,230,253,0.48)', strokeWidth: 1.4, strokeLinecap: 'round' }),
              !isContrast && h('path', { className: 'sw-eddy-cw', style: { '--sw-eddy-dur': '3.6s' }, d: 'M318,40 A11,11 0 1,1 328,31', fill: 'none', stroke: 'rgba(186,230,253,0.48)', strokeWidth: 1.4, strokeLinecap: 'round' }),
              h('path', { d: 'M242,155 Q252,102 248,50 Q280,32 312,50 Q308,102 318,155 Z', fill: isContrast ? 'none' : 'rgba(7,34,56,0.52)', stroke: isContrast ? '#00ffff' : 'rgba(125,211,252,0.35)', strokeWidth: 1.2, strokeDasharray: '4 4' }),
              /* Animated directional feeder & offshore rip neck current streamlines */
              h('path', { d: 'M164,148 Q252,145 266,118 L266,46', fill: 'none', stroke: isContrast ? '#ff6b6b' : 'rgba(251,113,133,0.34)', strokeWidth: 3.4, strokeLinecap: 'round' }),
              h('path', { className: 'sw-rip-flow', d: 'M164,148 Q252,145 266,118 L266,46', fill: 'none', stroke: isContrast ? '#ff6b6b' : '#fb7185', strokeWidth: 2.1, strokeDasharray: '10 6', markerEnd: 'url(#sw-rip-out)' }),
              h('path', { d: 'M396,148 Q308,145 294,118 L294,46', fill: 'none', stroke: isContrast ? '#ff6b6b' : 'rgba(251,113,133,0.34)', strokeWidth: 3.4, strokeLinecap: 'round' }),
              h('path', { className: 'sw-rip-flow', style: { animationDelay: '-0.45s' }, d: 'M396,148 Q308,145 294,118 L294,46', fill: 'none', stroke: isContrast ? '#ff6b6b' : '#fb7185', strokeWidth: 2.1, strokeDasharray: '10 6', markerEnd: 'url(#sw-rip-out)' }),
              !isContrast && h('path', { d: 'M280,144 L280,34', fill: 'none', stroke: '#fda4af', strokeWidth: 5.5, opacity: 0.24, strokeLinecap: 'round' }),
              h('path', { className: 'sw-rip-flow', style: { animationDuration: '1.05s' }, d: 'M280,144 L280,34', fill: 'none', stroke: isContrast ? '#ff6b6b' : '#fb7185', strokeWidth: 2.3, strokeDasharray: '11 5', markerEnd: 'url(#sw-rip-out)' }),
              /* Seaward-drifting foam & churned sediment specks along the rip channel */
              !isContrast && [[273, 126, 1.8, '0s'], [286, 118, 1.5, '-0.7s'], [279, 134, 2.0, '-1.4s'], [271, 110, 1.4, '-2.0s'], [288, 130, 1.6, '-2.4s']].map(function(fm, fi) {
                return h('circle', { key: 'rfm' + fi, className: 'sw-rip-foam', style: { animationDelay: fm[3] }, cx: fm[0], cy: fm[1], r: fm[2], fill: 'rgba(240,249,255,0.75)' });
              }),
              /* Glowing emerald parallel escape vector & angled return to shore with directional flow */
              !isContrast && h('path', { d: 'M280,96 L388,96 Q430,98 446,148', fill: 'none', stroke: '#34d399', strokeWidth: 6.5, opacity: 0.26, strokeLinecap: 'round' }),
              h('path', { d: 'M280,96 L388,96 Q430,98 446,148', fill: 'none', stroke: isContrast ? '#00ff66' : '#34d399', strokeWidth: 2.6, strokeLinecap: 'round', markerEnd: 'url(#sw-rip-esc)' }),
              !isContrast && h('path', { className: 'sw-escape-flow', d: 'M284,96 L388,96 Q428,98 444,142', fill: 'none', stroke: '#d1fae5', strokeWidth: 1.5, strokeDasharray: '6 12', strokeLinecap: 'round', opacity: 0.88 }),
              h('circle', { cx: 280, cy: 96, r: 4.5, fill: '#fef08a', stroke: '#0f172a', strokeWidth: 1.2 }),
              /* Clean labels */
              h('text', { x: 280, y: 18, textAnchor: 'middle', fill: isContrast ? '#00ffff' : '#bae6fd', fontSize: 10.5, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, 'RIP HEAD (current dissipates offshore)'),
              h('text', { x: 104, y: 60, textAnchor: 'middle', fill: '#f8fafc', fontSize: 10, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }, 'Breaking waves'),
              h('text', { x: 422, y: 84, textAnchor: 'middle', fill: isContrast ? '#00ff66' : '#6ee7b7', fontSize: 10.5, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, 'Swim parallel → exit'),
              h('text', { x: 280, y: 178, textAnchor: 'middle', fill: isContrast ? '#ffff00' : '#1e293b', fontSize: 11, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, 'SHORELINE / BEACH')
            )
          ),

          sectionHeader('👁️', 'How to spot one from shore'),
          keyPointBlock(
            'Look for breaks in the wave pattern. A rip current shows up as a quiet patch in an otherwise breaking line of waves.',
            [
              'A noticeable gap or channel of darker water cutting through the line of breaking waves',
              'Foam, seaweed, or sand visibly moving away from shore in a single line',
              'Water that looks calmer than the water on either side (deceptive — it looks "safer")',
              'Discolored water (sand churned up) extending past the surf line'
            ]
          ),

          calloutBox('warn', 'The deceptive calm',
            'A rip current looks like a peaceful break in the surf. Many people deliberately swim into one because it looks like the easy spot. This is exactly backwards. Calm water in a surf zone is suspicious water.'),

          sectionHeader('🆘', 'If you are caught in one'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.water, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('ol', { style: { margin: 0, paddingLeft: 20, color: T.text, lineHeight: 1.7, fontSize: 14 } },
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, 'Do NOT swim against the current.'),
                __alloT('stem.swimlab.you_will_exhaust_yourself_and_drown_th', ' You will exhaust yourself and drown. The current is faster than you can swim.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.stay_calm_float_if_you_need_to', 'Stay calm. Float if you need to.')),
                __alloT('stem.swimlab.the_current_will_not_pull_you_under_on', ' The current will not pull you under, only out. You can float through the whole thing if you have to.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.swim_parallel_to_the_shore', 'Swim PARALLEL to the shore.')),
                __alloT('stem.swimlab.rip_currents_are_narrow_after_30_100_f', ' Rip currents are narrow. After 30-100 feet of parallel swimming you will be in normal water and can swim back to shore at an angle.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.if_you_cannot_escape_signal_and_float', 'If you cannot escape, signal and float.')),
                __alloT('stem.swimlab.wave_one_arm_and_yell_a_lifeguard_or_b', ' Wave one arm and yell. A lifeguard or bystander can throw a flotation device. The current will eventually weaken (rip currents end past the breakers).')),
              h('li', null,
                h('strong', null, __alloT('stem.swimlab.if_you_see_someone_else_in_a_rip', 'If you see someone else in a rip:')),
                __alloT('stem.swimlab.do_not_swim_out_to_them_throw_flotatio', ' do NOT swim out to them. Throw flotation, alert lifeguards, call 911. Untrained rescuers drown in rip currents at high rates trying to save someone.'))
            )
          ),

          calloutBox('info', 'In Maine specifically',
            'Maine beaches with notable rip current history include Old Orchard Beach, Wells Beach, Higgins Beach, Reid State Park, and Popham Beach. The National Weather Service Caribou and Gray offices issue rip current risk forecasts. Check the surf forecast before going to the beach.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('ripCurrents', 0, {
            prompt: 'You are at a Maine beach. You notice a strip of water about 20 feet wide that looks calmer than the water around it, with foam moving steadily away from shore. A friend says "let\'s swim out there, the waves look smaller." What do you say?',
            choices: [
              '"Sure, less waves means easier swimming."',
              '"That looks like a rip current. The calm is the channel where water is flowing back to sea. Let\'s swim somewhere else."',
              '"Let\'s race out and back."',
              '"It probably is fine. The calm strip is just deeper water, and the lifeguards would have put up a flag if there were a current."'
            ],
            correct: 1,
            explain: 'A noticeably calm strip of water in an otherwise breaking surf zone, with foam or debris moving seaward, is a textbook rip current. It looks safer because there are no breaking waves on top of it — that "calm" is the surface of a fast outflow channel. Swim in the breaking-wave zones on either side instead, or pick a different beach entry point.'
          }),
          scenarioCard('ripCurrents', 1, {
            prompt: 'You are caught in a rip current. You have been swimming hard toward shore for 30 seconds and have not moved. What is the right next move?',
            choices: [
              'Swim harder.',
              'Stop swimming, float, then swim parallel to shore.',
              'Yell for help and tread water until rescued.',
              'Take a deep breath and dive under the current, since rips only run on the surface.'
            ],
            correct: 1,
            explain: 'Swimming harder against a current that is faster than you can sprint is how people drown from exhaustion. Stop. Float to recover energy. Then swim parallel to the shore (left or right, whichever feels easier) until you are out of the narrow rip channel. Then angle back to shore. Diving under does not work — the current is the entire water column, not a surface flow.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('ripCurrents', [
            { q: 'Roughly what fraction of US beach lifeguard rescues involve rip currents?', opts: ['About 10%', 'About 30%', 'About 80%', 'Almost none'], ans: 2, explain: 'The US Lifesaving Association (USLA) reports rip currents cause approximately 80% of all beach rescues. They are by far the dominant beach hazard.' },
            { q: 'You are caught in a rip current. What direction should you swim?', opts: ['Straight back to shore as fast as possible', 'Diagonally toward shore at a 45-degree angle, fighting the current the whole way', 'Parallel to the shore until you are out of the narrow channel', 'Straight out to sea so you can come around'], ans: 2, explain: 'Rip currents are narrow (10-30 feet wide). Swimming parallel to the shore for 30-100 feet gets you out of the channel and into water you can swim through. Then angle back to shore.' },
            { q: 'A rip current LOOKS like:', opts: ['A wave taller than the others that rolls straight in toward shore without breaking', 'A calm-looking channel of water that breaks the line of breaking waves', 'A patch of bright blue water', 'Whitecaps moving toward shore'], ans: 1, explain: 'The deceptive feature of a rip current is that it looks SAFER than the water around it — calm, often darker, with foam or debris moving away from shore. Do not swim into the calm patch. Calm water in a surf zone is the warning sign.' },
            { q: 'You see someone caught in a rip. What should you do?', opts: ['Swim out to grab them', 'Throw flotation, alert lifeguards, call 911 — do not swim out', 'Wait and see if they make it on their own', 'Run up the beach for help and assume someone else will rescue them'], ans: 1, explain: 'Untrained would-be rescuers drown in rip currents at high rates. Reach / Throw / Row / DON\'T GO. Throw a flotation device, get a lifeguard or trained rescuer, call 911. The next module covers this in depth.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.noaa_rip_current_safety', 'NOAA Rip Current Safety'), url: 'https://www.weather.gov/safety/ripcurrent' },
            { label: __alloT('stem.swimlab.us_lifesaving_association_usla_rip_cur', 'US Lifesaving Association (USLA) — Rip Currents'), url: 'https://www.usla.org/page/RIPCURRENTS' },
            { label: __alloT('stem.swimlab.nws_gray_maine_forecast_office_beach_h', 'NWS Gray (Maine forecast office) — Beach Hazards'), url: 'https://www.weather.gov/gyx/' },
            { label: __alloT('stem.swimlab.cdc_drowning_prevention_2', 'CDC: Drowning prevention'), url: 'https://www.cdc.gov/drowning' }
          ]),
          h(stableType('TeacherNotes', TeacherNotes), TEACHER_NOTES.ripCurrents),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 3 — REACH / THROW / ROW / DON'T GO
      // ─────────────────────────────────────────
      function renderReachThrow() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🪢 How to Help Without Drowning Yourself'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.you_cannot_help_someone_you_do_not_rea', 'You cannot help someone you do not realize is drowning. And once you realize it, the strongest urge is to jump in. Both of those instincts are wrong. This module covers '),
            h('strong', { style: { color: T.text } }, 'recognizing'),
            __alloT('stem.swimlab.drowning_it_does_not_look_like_the_mov', ' drowning (it does not look like the movies) and '),
            h('strong', { style: { color: T.text } }, 'helping'),
            __alloT('stem.swimlab.without_becoming_the_second_victim', ' without becoming the second victim.')),

          labLink('rescueLab'),

          // ── Drowning recognition (Mario Vittone framework) ──
          // This is the single most-cited piece of public-facing water safety
          // writing of the past 20 years. Vittone's "Drowning doesn't look
          // like drowning" article (originally On Scene magazine, 2006) is
          // referenced by USCG, US Lifesaving Association, and the CDC. The
          // "instinctive drowning response" framework — silent, vertical,
          // 20-60 second window, no waving, no yelling — has saved an
          // unknowable number of lives by teaching people what to look for
          // BEFORE the head goes under.
          sectionHeader('👀', 'Drowning does not look like drowning'),
          calloutBox('danger', 'Drowning is silent.',
            h(React.Fragment, null,
              __alloT('stem.swimlab.real_drowning_looks_almost_nothing_lik', 'Real drowning looks almost nothing like the movies. There is no yelling for help. There is no waving of arms. There is no thrashing. A drowning person\'s body is doing one thing: trying to keep the airway above water. Speech is secondary to breathing — they cannot call out. Arms are pressing instinctively down on the surface to lift the head — they cannot wave. The whole event lasts only '),
              h('strong', null, __alloT('stem.swimlab.20_to_60_seconds', '20 to 60 seconds')),
              __alloT('stem.swimlab.before_submersion_if_you_do_not_know_w', ' before submersion. If you do not know what to look for, you will miss it standing 10 feet away.'))),
          h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { fontSize: 14, fontWeight: 700, color: T.accentHi, marginBottom: 10 } },
              __alloT('stem.swimlab.the_instinctive_drowning_response_five', 'The Instinctive Drowning Response — five visible signs (Mario Vittone)')),
            h('ol', { style: { margin: 0, paddingLeft: 20, color: T.text, lineHeight: 1.7, fontSize: 13 } },
              h('li', { style: { marginBottom: 6 } },
                h('strong', null, __alloT('stem.swimlab.head_low_in_the_water_mouth_at_water_l', 'Head low in the water, mouth at water level. ')),
                __alloT('stem.swimlab.often_tilted_back_with_the_mouth_open_', 'Often tilted back with the mouth open. The person looks like they are trying to drink the water.')),
              h('li', { style: { marginBottom: 6 } },
                h('strong', null, __alloT('stem.swimlab.eyes_are_glassy_and_empty_or_closed', 'Eyes are glassy and empty, or closed. ')),
                __alloT('stem.swimlab.they_cannot_focus_a_person_with_eyes_c', 'They cannot focus. A person with eyes closed in the water who is not playing a game is in trouble.')),
              h('li', { style: { marginBottom: 6 } },
                h('strong', null, __alloT('stem.swimlab.hair_may_be_over_the_forehead_or_eyes', 'Hair may be over the forehead or eyes. ')),
                __alloT('stem.swimlab.they_will_not_push_it_away_their_hands', 'They will not push it away — their hands are needed elsewhere.')),
              h('li', { style: { marginBottom: 6 } },
                h('strong', null, __alloT('stem.swimlab.body_is_vertical_in_the_water_no_kick', 'Body is vertical in the water, no kick. ')),
                __alloT('stem.swimlab.swimmers_move_horizontally_drowning_pe', 'Swimmers move horizontally. Drowning people are upright, treading silently and ineffectively.')),
              h('li', null,
                h('strong', null, __alloT('stem.swimlab.ladder_climbing_pressing_down_on_the_s', '"Ladder climbing" — pressing down on the surface. ')),
                __alloT('stem.swimlab.arms_extend_laterally_and_press_down_i', 'Arms extend laterally and press down, instinctively trying to leverage the body up out of the water. From shore this looks like "playing in the water." It is not.'))
            )
          ),
          calloutBox('warn', 'What "aquatic distress" looks like (the warning sign before drowning)',
            'Aquatic distress is the precursor: a swimmer who CAN still call for help, wave, and grab a rescue device. This is the moment to throw flotation. Within 20-60 seconds it can become silent, vertical drowning. If you see someone in distress, act now — do not wait to see if it gets worse.'),
          calloutBox('info', 'Lifeguard\'s test: "Are you okay?"',
            'If you are unsure whether someone in the water is in trouble, call out to them. A normal swimmer answers, jokes, asks why. A drowning person cannot. Silence is the answer.'),

          sectionHeader('🪜', 'The four-step ladder'),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 14 } },
            [
              { step: 'REACH', icon: '🤲', desc: __alloT('stem.swimlab.lie_or_kneel_on_a_stable_surface_dock_', 'Lie or kneel on a stable surface (dock, shore, edge of pool). Extend a pole, branch, oar, towel, shirt, or even your leg. Stay anchored — do not let the victim pull you in. Pull them to safety hand-over-hand.'), when: 'Victim is within arm or pole reach of solid ground.' },
              { step: 'THROW', icon: '🎯', desc: __alloT('stem.swimlab.throw_a_flotation_device_life_ring_thr', 'Throw a flotation device — life ring, throw bag, cooler, empty milk jug with cap, even a tied-off plastic trash bag with air. Aim slightly past the victim and drag it back to them. Yell instructions: "GRAB THIS, KICK YOUR FEET, I AM PULLING YOU IN."'), when: 'Victim is too far to reach but within throw distance.' },
              { step: 'ROW', icon: '🚣', desc: __alloT('stem.swimlab.use_a_boat_kayak_canoe_paddleboard_row', 'Use a boat — kayak, canoe, paddleboard, rowboat. Approach with the bow toward the victim. Have them grab the back, not the side. NEVER let them climb in over the side — they will flip you. Tow them to shore.'), when: 'Victim is too far to throw to but a boat is available.' },
              { step: "DON'T GO", icon: '🚫', desc: __alloT('stem.swimlab.do_not_enter_the_water_v2', 'Do not enter the water unless you are a trained lifeguard or rescue swimmer. Panicked drowning victims grab anything that floats — including you — and push it under. That is how a would-be rescuer becomes a second victim.'), when: 'No reach, no throw, no boat, and you are not a trained rescuer.' }
            ].map(function(s, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + (i === 3 ? T.danger : T.border), borderRadius: 10, padding: 14 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 24 } }, s.icon),
                  h('div', { style: { fontSize: 18, fontWeight: 800, color: i === 3 ? T.accentHi : T.text, letterSpacing: '0.05em' } }, s.step)),
                h('p', { style: { margin: '0 0 6px', fontSize: 13, color: T.text, lineHeight: 1.55 } }, s.desc),
                h('div', { style: { fontSize: 12, color: T.dim, fontStyle: 'italic' } }, 'Use when: ' + s.when)
              );
            })
          ),

          calloutBox('danger', 'Why "Don\'t Go" is on the list',
            'A drowning person is not thinking clearly. Their nervous system has one priority: get above water. They will climb whatever is closest, including you. They can push a fully grown adult underwater and hold them there. Lifeguards are trained to approach with flotation between themselves and the victim, and to break holds. Without that training, you become victim number two. Studies of rescue attempts around the world find that bystanders who go into the water often drown, and most were trying to save someone in their own family.'),

          sectionHeader('📞', 'Always: call 911 first or have someone else call'),
          keyPointBlock(
            'The first action in any water emergency is activating professional rescue. Even if you have a clear reach or throw, call 911 (or have a bystander call) before or during the rescue. Lifeguards, paramedics, dive teams take time to arrive. Start that clock the moment you recognize the emergency.',
            [
              'In Maine you can text 911 if you cannot speak (cold, water, communication disability)',
              'Tell the dispatcher: WHERE (specific location), WHAT (drowning, ice break-through, etc.), WHO (how many people, ages if known)',
              'Stay on the line until told to hang up — they may give you instructions',
              'If you are coordinating multiple bystanders, point at one specific person and say "YOU. CALL 911 NOW." Bystander effect happens; named instructions cut through it.'
            ]
          ),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('reachThrow', 0, {
            prompt: 'You are walking past a public pool. A child has fallen in and is panicking near the edge — about 4 feet from where you are standing. There is no lifeguard visible. What do you do FIRST?',
            choices: [
              'Jump in and grab them.',
              'Lie flat on the deck, anchor yourself, extend a hand or pool noodle, and pull them out.',
              'Run to find a lifeguard.',
              'Kneel at the edge, lean out over the water, and grab their wrist with both hands so they cannot pull you in.'
            ],
            correct: 1,
            explain: 'REACH first when the victim is within reach. Lie or kneel on the deck so you cannot be pulled in. Extend whatever you have. Yell at someone else to call 911 and find a lifeguard. Do not jump in unless you have no other option AND you are trained.'
          }),
          scenarioCard('reachThrow', 1, {
            prompt: __alloT('stem.swimlab.a_teenager_is_struggling_about_30_feet', 'A teenager is struggling about 30 feet from shore in a Maine lake. There is a kayak with a paddle nearby on the beach. You can swim, but you have never done a water rescue. What is the right play?'),
            choices: [
              'Swim out to them, get behind them, hook an arm across their chest, and sidestroke back to shore the way lifeguards do in training, without waiting for equipment.',
              'Push out the kayak, paddle to them, have them grab the BACK of the kayak (not the side), and tow them to shore. Have someone call 911.',
              'Wait for help.',
              'Throw a sandal at them.'
            ],
            correct: 1,
            explain: 'ROW. The kayak gives you flotation between you and the panicked victim, lets you cover distance fast, and keeps both of you safe. Approach with the bow toward them, have them grab the back end, paddle them to shore. Never let a panicking victim climb in over the side of a small boat — they will flip you both.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('reachThrow', [
            { q: 'A real drowning person typically:', opts: ['Yells loudly and waves both arms overhead so rescuers can find them from the beach', 'Is silent and vertical in the water, with arms pressing down on the surface', 'Splashes wildly like in the movies', 'Calls a specific lifeguard by name'], ans: 1, explain: 'The Instinctive Drowning Response is silent. Speech is secondary to breathing — a drowning person cannot call out. Arms press down on the surface to lift the head, so they cannot wave. The whole event lasts 20-60 seconds before submersion. If you do not know what to look for, you will miss it standing 10 feet away (Mario Vittone).' },
            { q: 'What is the LAST step in the bystander rescue ladder?', opts: ['Reach', 'Throw', 'Row (take a boat, board, or kayak out to them)', "Don't Go (only enter the water if trained)"], ans: 3, explain: 'Reach, Throw, Row, then DON\'T GO. Entering the water as an untrained rescuer is the most dangerous option: a panicking swimmer can push you under.' },
            { q: 'When throwing a flotation device, where should you aim?', opts: ['Directly at the victim\'s head', 'Past the victim, then drag it to them', 'Three feet short of the victim so it drifts to them', 'Toward the lifeguard'], ans: 1, explain: 'Aim slightly past the victim. If you throw short, you have to retrieve and re-throw. If you throw long and drag it back across them, they grab it as it passes. Yell clear instructions: GRAB THIS, KICK YOUR FEET.' },
            { q: 'A panicked drowning person who climbs onto a rescuer typically:', opts: ['Calms down once they have something to hold and lets the rescuer swim them in', 'Pushes the rescuer underwater while trying to get above the surface', 'Lets the rescuer take over', 'Floats peacefully'], ans: 1, explain: 'A drowning person\'s nervous system has one priority: get above water. They will climb anything floating — including a person — and push it under. This is why entering the water without training is so dangerous.' },
            { q: 'You see a water emergency unfolding. What is the first thing you should do (or have someone else do)?', opts: ['Take a video so there is a record', 'Call 911', 'Swim out to investigate', 'Wait to see if it resolves'], ans: 1, explain: 'Call 911 (or text 911 in Maine) immediately, or point at a specific bystander and tell them to call. Professional rescue takes time to arrive. Start that clock the moment you recognize the emergency.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.mario_vittone_drowning_doesn_t_look_li', 'Mario Vittone — "Drowning Doesn\'t Look Like Drowning"'), url: 'https://mariovittone.com/2010/05/154/', note: __alloT('stem.swimlab.the_canonical_public_facing_essay_on_t', 'The canonical public-facing essay on the Instinctive Drowning Response. Originally published in On Scene magazine (2006) by Dr. Francesco A. Pia and refined by Vittone.') },
            { label: __alloT('stem.swimlab.american_red_cross_water_safety', 'American Red Cross — Water Safety'), url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/water-safety.html' },
            { label: __alloT('stem.swimlab.ymca_aquatic_standards', 'YMCA Aquatic Standards'), url: 'https://www.ymca.org/what-we-do/healthy-living/swimming-aquatics' },
            { label: __alloT('stem.swimlab.cdc_unintentional_drowning_statistics', 'CDC: Unintentional Drowning Statistics'), url: 'https://www.cdc.gov/drowning/data-research/index.html' },
            { label: __alloT('stem.swimlab.dan_divers_alert_network_in_water_resc', 'DAN (Divers Alert Network) — In-water Rescue Principles'), url: 'https://dan.org' },
            { label: __alloT('stem.swimlab.us_lifesaving_association_usla', 'US Lifesaving Association (USLA)'), url: 'https://www.usla.org' }
          ]),
          h(stableType('TeacherNotes', TeacherNotes), TEACHER_NOTES.reachThrow),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 4 — LIFE JACKETS (PFDs)
      // ─────────────────────────────────────────
      function renderPfd() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🦺 Why Life Jackets Work'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.a_properly_fitted_us_coast_guard_appro', 'A properly fitted, US Coast Guard-approved Personal Flotation Device (PFD) is the single highest-leverage piece of safety equipment in any boat or near any open water. The numbers are stark.')),

          labLink('floatLab'),

          calloutBox('danger', 'The 86% statistic',
            'Per US Coast Guard recreational boating data, approximately 86% of boating-related drowning victims were not wearing a life jacket at the time of death. Most boats must carry a life jacket for each person; the life jacket only helps if it is worn.'),

          sectionHeader('🦺', 'The five PFD types'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 14 } },
            [
              { type: 'I', name: __alloT('stem.swimlab.offshore', 'Offshore'), use: 'Open ocean, far from shore. Highest buoyancy. Will turn most unconscious wearers face-up.' },
              { type: 'II', name: __alloT('stem.swimlab.near_shore_buoyant_vest', 'Near-shore Buoyant Vest'), use: 'Calm inland water with quick rescue likely. Will turn SOME unconscious wearers face-up.' },
              { type: 'III', name: __alloT('stem.swimlab.flotation_aid', 'Flotation Aid'), use: 'Most recreational boating, kayaking, water skiing. Will NOT turn unconscious wearers face-up. Conscious wearer must position themselves.' },
              { type: 'IV', name: __alloT('stem.swimlab.throwable', 'Throwable'), use: 'Ring buoy, horseshoe buoy, throwable cushion. NOT worn — thrown to a victim. Required as backup on most boats.' },
              { type: 'V', name: __alloT('stem.swimlab.special_use', 'Special Use'), use: 'Inflatable, work vest, sailboard harness, etc. Type V only counts if worn and used as the label specifies.' }
            ].map(function(p, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: 12 } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 } },
                  h('span', { style: { fontSize: 20, fontWeight: 800, color: T.accentHi } }, 'Type ' + p.type),
                  h('span', { style: { fontSize: 12, color: T.muted, fontWeight: 600 } }, p.name)),
                h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.5 } }, p.use)
              );
            })
          ),

          sectionHeader('✋', 'The fit check that actually works'),
          keyPointBlock(
            'A life jacket that does not fit can be worse than no life jacket — it rides up over your face when you hit the water and can hold you head-down. Use this 4-step check every time, especially with kids:',
            [
              { k: 'Snug', v: 'Fasten all straps. The jacket should feel firmly hugged to your torso, not loose.' },
              { k: 'Lift test', v: 'Have someone lift the jacket straight up at the shoulders. If it rides up over your chin or ears, it is too big or too loose.' },
              { k: 'Mobility', v: 'Raise your arms over your head. Twist side to side. The jacket should move with you, not slide up.' },
              { k: 'In-water check (best)', v: 'Try the jacket in shallow water. It should keep your chin above the surface without you treading water. If it does not, the size or buoyancy is wrong.' }
            ]
          ),

          calloutBox('warn', 'Kid-specific: do not buy "to grow into"',
            'Children\'s life jackets must fit RIGHT NOW. A jacket that is too big rides up over the head in water. Buy by weight range printed on the label, replace as the child grows. Inflatable PFDs are NOT US Coast Guard approved for anyone under 16, and are meant for people over 80 lb. Use Type II or III inherent foam jackets sized for the child.'),

          sectionHeader('⚖️', 'Maine boating law (the basics)'),
          keyPointBlock(
            h(React.Fragment, null,
              __alloT('stem.swimlab.per_maine_title_12_inland_fisheries_wi', 'Per Maine Title 12 (Inland Fisheries & Wildlife) and applicable federal USCG rules. '),
              h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.always_check_the_current_statute_at_th', 'Always check the current statute at the Maine IFW link in the Sources block')),
              __alloT('stem.swimlab.boating_law_gets_updated_and_a_tool_pu', ' — boating law gets updated, and a tool published in one year is not a substitute for the current rule.')),
            [
              'Every person on board needs a US Coast Guard-approved PFD in serviceable condition, of appropriate size for the wearer (Type I, II, III, or appropriate Type V) — 12 MRS §13056',
              'Children under 13 (12 and younger) must WEAR a properly-fitting USCG-approved PFD whenever the watercraft is underway for recreation, unless below deck or in an enclosed cabin (12 MRS §13068-A, since January 1, 2026; before that the age was 10 and under) — applies to any watercraft, including kayaks, canoes and paddleboards',
              'Boats 16 feet and longer must also carry an additional throwable Type IV device (USCG 33 CFR 175.15) — Maine adopts the federal rule',
              'Personal watercraft (jet skis, wave runners): EVERY person aboard must wear a USCG-approved PFD, regardless of age — 12 MRS §13068-A',
              'Anyone being towed (water skiing, tubing, wakeboarding) must wear a USCG-approved PFD',
              'PFDs stuffed in a bow compartment "for emergencies" do not count as worn — boats can be cited if PFDs are not readily accessible',
              'Maine Game Wardens (Maine Warden Service) have enforcement authority — they can stop a boat for a safety inspection, and noncompliance carries fines'
            ]
          ),

          calloutBox('info', 'What if the water is calm and you can swim?',
            'The most common boating fatality scenario is: experienced swimmer, calm water, short trip, PFD on the boat but not worn. Then something unexpected happens (collision, capsize, person overboard). They never get to the PFD. Wear it. Always. Every time. Adults model this for kids; if you take it off "because you can swim," every kid on the boat learns the same.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('pfd', 0, {
            prompt: 'You are taking your 8-year-old cousin out in a kayak on a Maine lake. They have a life jacket but say "it\'s annoying." What is the right call, both legally and as their grown-up?',
            choices: [
              'Skip the PFD since the lake is calm.',
              'PFD must be ON. Maine law requires it for any child 10 or under whenever the watercraft is underway. And it is the right call regardless.',
              'Loosen all the straps so it is more comfortable, and tell them they can take it off once you are away from the dock and the water is calm.',
              'Let them decide.'
            ],
            correct: 1,
            explain: 'Maine law (12 MRS §13068-A, since January 1, 2026) requires children under 13 to wear a USCG-approved PFD whenever the watercraft is underway for recreation — there is no boat-size exception (you are in a kayak, which counts). It is also the right call regardless of law. Kids learn boating culture from the adult on the boat. If you wear yours and theirs is on tight (lift test it before you launch), the trip will be fine and the habit is set.'
          }),
          scenarioCard('pfd', 1, {
            prompt: __alloT('stem.swimlab.you_buy_a_child_s_life_jacket_you_do_t', 'You buy a child\'s life jacket. You do the lift test on shore: when you lift at the shoulders, the jacket comes up to the child\'s ears. The salesperson says it will be fine in the water and the child will "grow into it." What do you do?'),
            choices: [
              'Trust the salesperson.',
              'Return it. A jacket that rides up to the ears in a lift test will go over the head in the water. Get a smaller size, even if it means the child outgrows it next year.',
              'Tighten every strap as far as it will go and try the lift test again; a jacket that can be cinched down that far is fine for a growing child and will last more than one season.',
              'Use it but only in shallow water.'
            ],
            correct: 1,
            explain: 'A PFD that fails the lift test fails in the water. It can hold a child face-down. Get the right size for the current weight. Buying "to grow into" is a documented contributor to drowning deaths.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('pfd', [
            { q: 'Approximately what percentage of boating drowning victims were NOT wearing a life jacket?', opts: ['About 20%', 'About 50%', 'About 86%', 'Almost none'], ans: 2, explain: 'US Coast Guard data: ~86% of boating-related drowning victims were not wearing a PFD (85 to 87% in recent yearly reports). Wear it from the moment you launch.' },
            { q: 'A "Type IV" PFD is:', opts: ['Worn at all times by anyone under 16 aboard a moving boat', 'A throwable device (ring, cushion) — backup, not worn', 'Only for kids', 'Inflatable'], ans: 1, explain: 'Type IV = throwable. It is required as a backup on most boats, but it is NOT worn. The wearable PFDs are Types I, II, III, and V.' },
            { q: 'You do a lift test on a child\'s PFD by lifting at the shoulders. The jacket rides up to their ears. What does this mean?', opts: ['Perfect fit, since it should sit high on the chest', 'Too tight', 'Too loose or too big — get a different size', 'Defective'], ans: 2, explain: 'The lift test simulates what happens when the child hits the water. If it rides up to the ears on land, it will go over the head in the water. Wrong size — get a smaller one, sized to current weight.' },
            { q: 'Under Maine law, a child of what age must WEAR a PFD whenever a watercraft is underway?', opts: ['Under 6', '10 and under', 'Under 13', 'Only on personal watercraft'], ans: 2, explain: '12 MRS §13068-A: since January 1, 2026, any child under 13 (12 and younger) must wear a properly-fitting USCG-approved PFD whenever the watercraft is underway for recreation, unless below deck or in an enclosed cabin. The age used to be 10 and under. There is no boat-size exception. On personal watercraft (jet skis), 12 MRS §13071-A requires EVERY person aboard to wear a PFD, regardless of age.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.us_coast_guard_recreational_boating_st', 'US Coast Guard — Recreational Boating Statistics'), url: 'https://www.uscgboating.org/statistics/accident_statistics.php' },
            { label: __alloT('stem.swimlab.us_coast_guard_life_jacket_wear_inform', 'US Coast Guard — Life Jacket Wear Information'), url: 'https://www.uscgboating.org/recreational-boaters/life-jacket-wear.php' },
            { label: __alloT('stem.swimlab.maine_department_of_inland_fisheries_w', 'Maine Department of Inland Fisheries & Wildlife — Boating Laws'), url: 'https://www.maine.gov/ifw/programs-resources/boating-snowmobile-atv-laws-rules.html', note: __alloT('stem.swimlab.authoritative_source_for_current_maine', 'Authoritative source for current Maine boating PFD law; check here before relying on summaries.') },
            { label: __alloT('stem.swimlab.maine_revised_statutes_title_12_inland', 'Maine Revised Statutes Title 12 (Inland Fisheries & Wildlife)'), url: 'https://legislature.maine.gov/statutes/12/title12sec13068-A.html', note: __alloT('stem.swimlab.13068_a_children_under_13_v2', '§13068-A (children under 13 wear a PFD, since January 1, 2026), §13056 (PFDs aboard), §13071-A (personal watercraft).') },
            { label: __alloT('stem.swimlab.uscg_33_cfr_part_175_equipment_require', 'USCG 33 CFR Part 175 — Equipment requirements'), url: 'https://www.ecfr.gov/current/title-33/chapter-I/subchapter-S/part-175' },
            { label: __alloT('stem.swimlab.safe_kids_worldwide_life_jacket_safety', 'Safe Kids Worldwide — Life Jacket Safety'), url: 'https://www.safekids.org/safetytips/field_risks/water-safety' }
          ]),
          h(stableType('TeacherNotes', TeacherNotes), TEACHER_NOTES.pfd),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 5 — ICE SAFETY + SELF-RESCUE (Maine-relevant)
      // ─────────────────────────────────────────
      function renderIceSafety() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🧊 Falling Through Ice'),
          emergencyBanner(),
          h('div', { role: 'note', style: { padding: '10px 14px', background: T.cardAlt, border: '1px dashed ' + T.warn, borderRadius: 8, fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 12 } },
            h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.heads_up_2', 'Heads up: ')),
            __alloT('stem.swimlab.this_module_covers_ice_break_through_s', 'this module covers ice break-through scenarios including snowmobile incidents. Content is practical, not graphic, but the topic is serious.')),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.maine_has_more_frozen_surface_water_in', 'Maine has more frozen surface water in winter than almost any state in the lower 48. Every year, people fall through ice on lakes, ponds, and rivers — ice fishers, snowmobilers, kids playing, dogs and the people who chase them. The good news: cold water self-rescue is teachable, and the survival timeline is longer than people think.')),

          sectionHeader('🎨', 'Ice color and clarity tells you almost everything'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14 } },
            [
              { color: 'Clear blue or black ice', strength: 'STRONGEST. Formed slowly from clear lake water. Trust this ice the most.', bg: '#1e3a8a', fg: '#f8fafc' },
              { color: 'White or "snow" ice', strength: 'Half-strength. Formed from refrozen slush or compacted snow. Treat thickness rules as DOUBLE the requirement.', bg: '#cbd5e1', fg: '#0c2233' },
              { color: 'Gray ice', strength: 'WEAK. Indicates water is present in the ice. Stay off.', bg: '#475569', fg: '#f8fafc' },
              { color: 'Dark spots or running water', strength: 'NO. Inlets, outlets, springs, and current keep ice thin even in cold weather.', bg: '#7f1d1d', fg: '#f8fafc' }
            ].map(function(c, i) {
              return h('div', { key: i, style: { background: isContrast ? '#000000' : c.bg, border: (isContrast ? '2px solid ' : '1px solid ') + T.border, borderRadius: 10, padding: 12, color: isContrast ? '#ffffff' : (c.fg || T.text) } },
                h('div', { style: { fontSize: 13, fontWeight: 700, marginBottom: 4 } }, c.color),
                h('div', { style: { fontSize: 12, lineHeight: 1.5, opacity: 0.95 } }, c.strength)
              );
            })
          ),

          sectionHeader('📏', 'Thickness rules (clear blue ice; double for white ice)'),
          keyPointBlock(
            'Per Maine Department of Inland Fisheries & Wildlife and Vermont Fish & Wildlife guidance for clear blue ice. Always test thickness yourself — drill or chisel test holes as you go.',
            [
              { k: 'Under 4 inches', v: 'STAY OFF. No exceptions.' },
              { k: '4 inches', v: 'Walking, ice fishing on foot.' },
              { k: '5-7 inches', v: 'Snowmobile or ATV.' },
              { k: '8-12 inches', v: 'Small car or pickup.' },
              { k: '12-15 inches', v: 'Medium truck.' },
              'White or "snow" ice: DOUBLE all of the above.',
              'Ice strength varies across a single body of water. Inlets, outlets, springs, current, and structures (bridges, docks) make ice thinner. Test as you go.'
            ]
          ),

          sectionHeader('🆘', 'If you fall through: the swim-and-roll'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.water, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 10px', color: T.text, lineHeight: 1.55, fontSize: 14, fontWeight: 600 } },
              __alloT('stem.swimlab.you_have_time_the_1_1_10_rule_applies_', 'You have time. The 1-1-10 rule applies (1 minute to control breathing, 10 minutes of useful arm strength, 1 hour before unconsciousness). Use that first minute deliberately.')),
            h('ol', { style: { margin: 0, paddingLeft: 20, color: T.text, lineHeight: 1.7, fontSize: 14 } },
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.do_not_panic_float_face_up', 'Do not panic. Float face-up. ')),
                __alloT('stem.swimlab.the_gasp_reflex_will_pass_in_60_second', 'The gasp reflex will pass in 60 seconds. Do not try to scramble out yet. Get your breathing under control.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.turn_back_the_way_you_came', 'Turn back the way you came. ')),
                __alloT('stem.swimlab.the_ice_you_walked_on_held_you_the_ice', 'The ice you walked on held you. The ice ahead just failed. Face the direction you came from.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.get_your_forearms_flat_on_the_ice', 'Get your forearms flat on the ice. ')),
                __alloT('stem.swimlab.spread_your_weight_if_you_have_ice_pic', 'Spread your weight. If you have ice picks (Picks of Life), use them now to get traction.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.kick_hard_horizontally', 'Kick HARD horizontally. ')),
                __alloT('stem.swimlab.get_your_body_horizontal_in_the_water_', 'Get your body horizontal in the water — like you are swimming. Kick hard with your legs while pulling yourself up onto the ice. Your goal is to slide out, not climb out.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.roll_away_do_not_stand', 'Roll away. Do not stand. ')),
                __alloT('stem.swimlab.once_on_the_ice_roll_away_from_the_hol', 'Once on the ice, ROLL away from the hole, do not stand. Standing concentrates your weight at one point and you may break through again. Roll until you are on ice you know is solid.')),
              h('li', null,
                h('strong', null, __alloT('stem.swimlab.get_warm_immediately', 'Get warm immediately. ')),
                __alloT('stem.swimlab.cold_incapacitation_continues_out_of_t', 'Cold incapacitation continues out of the water. Get to shelter. Change into dry clothes. Warm core (chest, neck, groin) before extremities. See the Hypothermia module.'))
            )
          ),

          sectionHeader('🪛', 'Ice picks ("Picks of Life")'),
          keyPointBlock(
            'Two short wooden handles with a sharp metal pick on the end of each, connected by a cord that runs through your sleeves. They cost about $15. They are the difference between getting out of an ice break-through and not.',
            [
              'Wear them around your neck, threaded through your sleeves, EVERY TIME you go on ice',
              'Hands and arms lose strength fast in cold water. Without picks, your fingers cannot grip wet ice',
              'With picks, you stab the ice in front of you and pull yourself out',
              'Available at any Maine sporting-goods store; cheap; lightweight; no excuses',
              'Carry a whistle on the same lanyard for signaling rescuers'
            ]
          ),

          calloutBox('warn', 'Snowmobile through-ice — different problem',
            'A snowmobile that goes through ice sinks fast. The rider is best off being THROWN clear of the machine. If you go in with the snowmobile, the principles are the same as any ice break-through: don\'t panic, breathe, get horizontal, kick out. Snowmobile retrieval is a job for professional dive teams; do not try to recover the machine yourself. The Maine Warden Service has dive teams. Call 911.'),

          calloutBox('danger', 'Helping someone who fell through',
            'Same Reach/Throw/Row/Don\'t Go ladder. From shore: throw a rope or branch. From a boat or sled: drive close but do not put your weight near the hole. Lying flat distributes your weight if you must approach on the ice. Call 911 first. Untrained ice rescuers fall through too.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('iceSafety', 0, {
            prompt: 'You are walking across a Maine pond on a January day. You fall through. You are wearing winter clothes and a backpack. You are NOT wearing ice picks. What is your FIRST action?',
            choices: [
              'Try to climb out immediately, before the cold hits, by grabbing the ice edge and hauling yourself straight up.',
              'Float on your back, control your breathing for about 60 seconds while the gasp reflex passes.',
              'Take off your jacket and boots so you can swim.',
              'Yell as loud as you can.'
            ],
            correct: 1,
            explain: 'Float and breathe. The gasp reflex will make you inhale water if you try to scramble out in the first 60 seconds. Heavy clothes actually trap insulating air; do not remove them. After the gasp passes, turn back the way you came (the ice that held you is behind you), get horizontal, kick HARD, and try to slide out onto the ice. Roll away from the hole once on ice. Without picks, your hands cannot grip wet ice; your kicks have to do all the work.'
          }),
          scenarioCard('iceSafety', 1, {
            prompt: __alloT('stem.swimlab.you_see_a_person_fall_through_ice_on_a', 'You see a person fall through ice on a pond about 100 feet from shore. There is a long rope in your truck. You can ice skate. Two strangers are nearby. What is your best move?'),
            choices: [
              'Skate out to them quickly.',
              'Point at one stranger, say "CALL 911 NOW." Then go to your truck for the rope. Throw it from the edge of solid ice — do not approach the hole.',
              'Wait for help.',
              'Go onto the ice carefully on your skates, lie flat when you get close, and try to pull them out by hand before the cold takes their grip strength away.'
            ],
            correct: 1,
            explain: 'Point at one specific person and tell them to call 911 — bystander effect kills response time. Then fetch the rope. Throw from solid ice; the ice near the hole has just demonstrated it cannot hold weight. If you must approach, lie flat to distribute weight. Reach/Throw/Row/Don\'t Go applies on ice the same as in open water.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('iceSafety', [
            { q: 'You see clear blue ice on a Maine lake. The minimum thickness for safely walking on it is:', opts: ['2 inches', '4 inches', '8 inches', '12 inches'], ans: 1, explain: '4 inches of clear blue ice for walking, per Maine IFW. Double that for white "snow" ice. Always test thickness as you go — ice strength varies across a single lake.' },
            { q: 'You fall through ice. After 60 seconds of floating to control your breathing, your next action is:', opts: ['Climb straight up', 'Turn the direction you came from, get horizontal, and kick hard to slide onto the ice', 'Hold the edge of the ice, stay as still as you can to save heat, and wait for someone to find you', 'Take off your boots'], ans: 1, explain: 'Turn back toward where you came from — that ice held you. Get horizontal in the water. Kick hard while your forearms are flat on the ice; goal is to slide out, not climb out. Then roll away from the hole. Standing concentrates your weight and you may break through again.' },
            { q: 'Ice picks ("Picks of Life") are:', opts: ['Decorative', 'A pair of sharp picks on cords worn around the neck for self-rescue from ice', 'Required by Maine law for anyone who goes onto lake ice between December and March', 'Only for ice climbers'], ans: 1, explain: 'Two short picks connected by a cord run through your sleeves. They give you grip on wet ice when your hands have lost strength to cold. Cheap (~$15), light, no excuses. Wear them every time you are on ice.' },
            { q: 'A snowmobile goes through ice with rider aboard. Best chance of survival comes from:', opts: ['Holding tight to the snowmobile, which floats long enough to reach solid ice', 'Being thrown clear and applying ice self-rescue principles', 'Trying to float the snowmobile', 'Steering it back up'], ans: 1, explain: 'A snowmobile sinks fast. The rider\'s best chance is being clear of the machine and applying the same swim-and-roll self-rescue. Snowmobile recovery is a professional dive team job; call 911.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.maine_department_of_inland_fisheries_w_2', 'Maine Department of Inland Fisheries & Wildlife — Ice Safety'), url: 'https://www.maine.gov/ifw/programs-resources/boating-snowmobile-atv-laws-rules.html' },
            { label: __alloT('stem.swimlab.cold_water_safety_coldwatersafety_org', 'Cold Water Safety (coldwatersafety.org)'), url: 'https://www.coldwatersafety.org' },
            { label: __alloT('stem.swimlab.vermont_fish_wildlife_ice_safety_guide', 'Vermont Fish & Wildlife — Ice Safety Guidelines'), url: 'https://vtfishandwildlife.com' },
            { label: __alloT('stem.swimlab.cold_water_boot_camp_mario_vittone_2', 'Cold Water Boot Camp (Mario Vittone)'), url: 'https://coldwaterbootcamp.com' }
          ]),
          h(stableType('TeacherNotes', TeacherNotes), TEACHER_NOTES.iceSafety),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 6 — HYPOTHERMIA RECOGNITION
      // ─────────────────────────────────────────
      function renderHypothermia() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🌡️ Cold Body, Cold Brain'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.hypothermia_is_core_body_temperature_d', 'Hypothermia is core body temperature dropping below 95°F (35°C). It does not require ice or even cold weather — it can happen in 60°F water in summer or 50°F air in spring rain. Recognizing it early and treating it correctly is the difference between a story and a tragedy.')),

          sectionHeader('🧠', 'The UMBLES rule (early warning signs)'),
          keyPointBlock(
            'Watch for someone (or yourself) starting to:',
            [
              { k: 'Stumbles', v: 'Loss of coordination, clumsy movement, dropping things.' },
              { k: 'Mumbles', v: 'Slurred speech, hard to understand.' },
              { k: 'Fumbles', v: 'Cannot work zippers, buttons, fine motor tasks.' },
              { k: 'Grumbles', v: 'Withdrawal, irritability, "I just want to lie down for a minute."' },
              'When you see any UMBLES, treat as hypothermia and act. Early treatment is dramatically more effective than late treatment.'
            ]
          ),

          sectionHeader('📊', 'The three stages'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 14 } },
            [
              { stage: 'MILD', temp: '90-95°F (32-35°C)', signs: 'Shivering, cold extremities, still oriented but starting to be clumsy. UMBLES showing up.', care: 'Get out of cold/wet. Dry clothes. Warm fluids if conscious. Light physical activity.', color: T.warn },
              { stage: 'MODERATE', temp: '82-90°F (28-32°C)', signs: 'Violent shivering OR shivering may stop. Confused thinking. Slurred speech. Clumsy.', care: 'Medical emergency. Call 911. Active rewarming with warm packs to chest/neck/groin (NOT extremities). Do NOT rub. Do NOT give alcohol.', color: T.danger },
              { stage: 'SEVERE', temp: 'Below 82°F (28°C)', signs: 'Shivering stops entirely. Unconscious or barely responsive. Slow weak pulse. Skin blue/gray.', care: 'Life-threatening. 911. Handle GENTLY — rough handling can trigger cardiac arrest. CPR if no pulse. "Not dead until WARM and dead" — continue resuscitation through transport.', color: isContrast ? '#ff6b6b' : (isDark ? '#f87171' : '#991b1b') }
            ].map(function(s, i) {
              return h('div', { key: i, style: { background: T.card, border: '2px solid ' + s.color, borderRadius: 12, padding: 12 } },
                h('div', { style: { fontSize: 14, fontWeight: 800, color: s.color, marginBottom: 4 } }, s.stage),
                h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 8 } }, s.temp),
                h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.5, marginBottom: 8 } }, h('strong', null, 'Signs: '), s.signs),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5 } }, h('strong', { style: { color: T.text } }, 'Care: '), s.care)
              );
            })
          ),

          sectionHeader('❌', "What NOT to do"),
          calloutBox('danger', 'Common mistakes that make hypothermia worse',
            h('ul', { style: { margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 } },
              h('li', null, h('strong', null, 'Do NOT rub extremities. '), __alloT('stem.swimlab.rubbing_pushes_cold_blood_from_the_arm', 'Rubbing pushes cold blood from the arms and legs back to the warming core. This "afterdrop" can cause cardiac arrest.')),
              h('li', null, h('strong', null, 'Do NOT give alcohol. '), __alloT('stem.swimlab.alcohol_dilates_skin_blood_vessels_and', 'Alcohol dilates skin blood vessels and accelerates heat loss. Folk wisdom is wrong here.')),
              h('li', null, h('strong', null, 'Do NOT put a severe-hypothermia patient in a hot bath. '), __alloT('stem.swimlab.sudden_warming_of_cold_extremities_ret', 'Sudden warming of cold extremities returns cold blood to the core too fast. Slow rewarming with warm packs to chest, neck, and groin is correct.')),
              h('li', null, h('strong', null, 'Do NOT rough-handle severely hypothermic patients. '), __alloT('stem.swimlab.a_cold_heart_is_electrically_unstable_', 'A cold heart is electrically unstable. Bumping, jostling, or rough handling can trigger ventricular fibrillation. Move them gently.')),
              h('li', null, h('strong', null, 'Do NOT assume they are dead because they are cold and unresponsive. '), __alloT('stem.swimlab.the_maxim_is_not_dead_until_warm_and_d', 'The maxim is "not dead until warm and dead." Continue CPR through transport. There are documented full recoveries from core temperatures below 60°F.'))
            )
          ),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('hypothermia', 0, {
            prompt: 'You are hiking in Maine in October. Your friend who has been quiet for the last mile suddenly says "I\'m fine, just need to sit down for a minute" and starts fumbling with their jacket zipper. They are mumbling and seem irritable. What is going on and what do you do?',
            choices: [
              'They are just tired. Let them rest.',
              'UMBLES. They are entering hypothermia. Get them out of wind/wet, into dry layers, warm fluids if they can hold a cup, and head for shelter or call for help.',
              'Have them keep hiking at a faster pace to warm up, give them a snack, and push on to the summit while there is still daylight, since stopping will only make them colder.',
              'Wait until they actually shiver.'
            ],
            correct: 1,
            explain: 'Stumbles + mumbles + fumbles + grumbles is mild hypothermia, not tiredness. Acting now (dry, sheltered, warm fluids, gentle movement) reverses it easily. Letting them "rest" — especially lying down — accelerates the drop. Hypothermia in the 50-65°F temperature range is the most common kind in temperate climates because nobody expects it.'
          }),
          scenarioCard('hypothermia', 1, {
            prompt: __alloT('stem.swimlab.a_person_is_pulled_from_cold_water_unc', 'A person is pulled from cold water unconscious, not breathing, no pulse. Their core temperature is estimated below 82°F. What is the right approach?'),
            choices: [
              'Pronounce death at scene.',
              'Begin CPR. Handle gently. Continue CPR through transport. Cold patients can recover from longer arrests because cold protects the brain.',
              'Wrap warmly and wait.',
              'Put them in a hot bath or shower right away to bring the core temperature up as fast as possible, then start CPR once they are warm enough to respond to it.'
            ],
            correct: 1,
            explain: 'The maxim is "not dead until WARM and dead." Severely hypothermic patients have been resuscitated after long arrests because cold dramatically slows brain damage. Begin CPR. Handle GENTLY (rough handling can cause cardiac arrest in a cold heart). Do NOT rapidly rewarm. Continue resuscitation through transport. This is one of the most under-appreciated facts in emergency medicine.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('hypothermia', [
            { q: 'The UMBLES rule is for recognizing:', opts: ['Stroke', 'Early hypothermia', 'Heart attack', 'Allergic reaction'], ans: 1, explain: 'Stumbles, Mumbles, Fumbles, Grumbles = early signs of hypothermia. Coordination loss, slurred speech, fine-motor failure, withdrawal/irritability. Catch it here and treatment is easy.' },
            { q: 'Why should you NOT rub the arms and legs of a hypothermic person?', opts: ['It is uncomfortable', 'It pushes cold blood back to the core ("afterdrop") and can cause cardiac arrest', 'It is illegal', 'It does not help, because skin that cold cannot feel the friction or warm up from it'], ans: 1, explain: 'Cold extremities have very cold blood pooled in them. Rubbing or sudden warming returns that cold blood to the warming core, which can cause "afterdrop" — a sudden secondary core temperature drop and potential cardiac arrest. Warm the core first; let the extremities catch up slowly.' },
            { q: 'A severely hypothermic person is unresponsive with no detectable pulse. What does the medical maxim say?', opts: ['Pronounce dead immediately', 'Wait 30 minutes then declare death', '"Not dead until WARM and dead" — continue CPR through transport and rewarming', 'Hypothermia patients cannot be revived once the heart has stopped, so resuscitation is not attempted'], ans: 2, explain: 'Cold dramatically protects the brain. There are documented full recoveries after hour-plus arrests at very low core temperatures. Continue CPR. Handle gently. Do not pronounce death until the patient is rewarmed and still does not respond.' },
            { q: 'You suspect someone has mild hypothermia. They are still conscious and can swallow. What can they have?', opts: ['Strong coffee with a shot of brandy to warm them fast', 'A warm sweet drink (hot chocolate, sweetened tea)', 'Ice water', 'Nothing by mouth'], ans: 1, explain: 'Warm sweet drinks (hot chocolate, sweetened tea, soup) provide both heat and quick energy. NEVER alcohol — it dilates blood vessels and accelerates heat loss. Caffeine is also debatable for borderline cases. If the person is severely hypothermic or unconscious, give nothing by mouth.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.wilderness_medical_society_practice_gu', 'Wilderness Medical Society — Practice Guidelines for Hypothermia'), url: 'https://wms.org' },
            { label: __alloT('stem.swimlab.nols_wilderness_medicine_hypothermia', 'NOLS Wilderness Medicine — Hypothermia'), url: 'https://www.nols.edu/en/wilderness-medicine/' },
            { label: __alloT('stem.swimlab.aha_cold_emergencies', 'AHA — Cold Emergencies'), url: 'https://cpr.heart.org' },
            { label: __alloT('stem.swimlab.cold_water_boot_camp', 'Cold Water Boot Camp'), url: 'https://coldwaterbootcamp.com' }
          ]),
          h(stableType('TeacherNotes', TeacherNotes), TEACHER_NOTES.hypothermia),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 7 — POOL DRAIN ENTRAPMENT
      // ─────────────────────────────────────────
      function renderDrainEntrapment() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🌀 Pool Drain Risks'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.pool_drain_entrapment_is_rare_but_cata', 'Pool drain entrapment is rare but catastrophic. A pool pump can generate suction strong enough to hold an adult underwater. Federal law has specific requirements for drain covers since 2008, but old pools, broken covers, and home pools may not be compliant. This module teaches what to look for and what to do.')),

          sectionHeader('📜', 'The Virginia Graeme Baker Pool & Spa Safety Act (2008)'),
          keyPointBlock(
            'Named for Virginia Graeme Baker, a 7-year-old who drowned in 2002 when she was held to a hot tub drain by suction. Her grandfather, James Baker III, championed the legislation that bears her name. The law requires:',
            [
              'Anti-entrapment drain covers on all public pools and spas in the US',
              'VGB-compliant covers must be domed (not flat) and break suction if blocked',
              'Single main drains must have a secondary safety vacuum release system (SVRS) or be split into multiple drains',
              'Pool operators must maintain compliance — covers crack and need replacement'
            ]
          ),

          sectionHeader('⚠️', 'Five types of entrapment'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14 } },
            [
              { type: 'Hair entrapment', desc: __alloT('stem.swimlab.long_hair_drawn_into_the_drain_by_suct', 'Long hair drawn into the drain by suction and tangled. Common in girls and women.') },
              { type: 'Limb entrapment', desc: __alloT('stem.swimlab.arm_leg_or_finger_pulled_into_the_drai', 'Arm, leg, or finger pulled into the drain opening. Suction can break bones during extraction.') },
              { type: 'Body entrapment', desc: __alloT('stem.swimlab.torso_held_against_the_drain_by_suctio', 'Torso held against the drain by suction. The most lethal type — adult-strength forces.') },
              { type: 'Evisceration', desc: __alloT('stem.swimlab.suction_pulls_intestines_through_the_a', 'Suction pulls intestines through the anus. Catastrophic injury. Specific to flat drain covers and small bodies.') },
              { type: 'Mechanical', desc: __alloT('stem.swimlab.jewelry_swimsuit_strings_etc_caught_in', 'Jewelry, swimsuit strings, etc. caught in drain hardware.') }
            ].map(function(t, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: 12 } },
                h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, t.type),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5 } }, t.desc)
              );
            })
          ),

          sectionHeader('👀', 'What to look for in a pool or spa'),
          keyPointBlock(
            'Before you or a child enters any pool, hot tub, or spa:',
            [
              { k: 'Drain cover present and intact', v: 'No missing cover. No cracks. No flat covers in old hot tubs (those should have been replaced).' },
              { k: 'Cover shape', v: 'Domed or anti-vortex shape, not flat. Flat covers are the entrapment risk.' },
              { k: 'Emergency shut-off', v: 'Public pools are required to have a clearly marked emergency shut-off switch for pump suction. Know where it is.' },
              { k: 'Tie up long hair', v: 'Swim caps or hair ties dramatically reduce hair entrapment risk.' },
              { k: 'Avoid sitting on drains', v: 'Teach kids not to sit on or play with pool drains, even covered ones.' }
            ]
          ),

          calloutBox('warn', 'If someone is trapped on a drain',
            'Hit the emergency pump shut-off immediately if available — this releases suction. If no shut-off is reachable, several adults working together may be needed to break the seal by inserting an object between the body and the drain to introduce air. Call 911 immediately. Do not try to forcibly pull a person off a drain — suction force is enormous and can cause severe injury during extraction.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('drainEntrap', 0, {
            prompt: 'You are at a backyard pool. The hot tub drain cover is cracked and partially missing. The owner says "it\'s fine, no one ever sits on it." What do you do?',
            choices: [
              'Trust the owner.',
              'Decline to use the hot tub. Encourage owner to replace the cover before next use. The risk is small but the consequence is fatal, especially for kids.',
              'Cover it with a towel.',
              'Just stay on the other side of the tub, away from the drain, and keep the kids out of the water entirely until the owner has had a chance to look at it properly.'
            ],
            correct: 1,
            explain: 'Broken or missing drain covers are the single biggest entrapment risk. Pool/spa pumps generate enormous suction. A child, an adult sitting wrong, long hair drifting near the drain — any of these can lead to entrapment. VGB-compliant replacement covers are inexpensive and required by law for public pools (and recommended for private). Skip the spa until it is fixed.'
          }),
          scenarioCard('drainEntrap', 1, {
            prompt: 'A child is pinned to a pool drain by suction, underwater. You are the adult on scene. What is the FIRST thing you do?',
            choices: [
              'Pull the child off the drain.',
              'Find and hit the emergency pump shut-off switch — this releases the suction.',
              'Dive in and wedge your hands between the child and the drain to break the seal, then lift them straight up.',
              'Call the lifeguard.'
            ],
            correct: 1,
            explain: 'The shut-off releases the suction that is holding them. Public pools are required to have a clearly marked emergency shut-off; locate it during your first 60 seconds at any pool. Yell for someone to call 911 simultaneously. Pulling a child off an active drain by force can cause serious injury (broken bones, evisceration) — break the suction first.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('drainEntrap', [
            { q: 'The Virginia Graeme Baker Pool & Spa Safety Act (2008) requires:', opts: ['Lifeguards at all public pools and spas, plus a certified pool operator on every shift', 'Anti-entrapment drain covers and either secondary release systems or multiple drains', 'Mandatory swim lessons', 'Insurance for pool owners'], ans: 1, explain: 'VGB Act requires anti-entrapment (domed) drain covers on public pools and spas, plus a Safety Vacuum Release System (SVRS) or multiple drains for single-main-drain pools. The goal is to make hard suction-to-body seals impossible.' },
            { q: 'A child is held to a pool drain by suction. The single most important first action is:', opts: ['Pull them off', 'Hit the emergency pump shut-off switch', 'Wait for the lifeguard', 'Call 911 first before doing anything else'], ans: 1, explain: 'Releasing the suction (via the pump shut-off) is the action that resolves the entrapment. Yell for someone else to call 911 simultaneously. Forcibly pulling against active suction can cause serious injury.' },
            { q: 'Long hair in a pool can:', opts: ['Be pulled into a drain and tangled, causing hair entrapment', 'Cause itching only', 'Damage the pool filter by clogging the skimmer basket and pump impeller', 'No risk'], ans: 0, explain: 'Hair entrapment is one of five recognized entrapment types. Tying up long hair or wearing a swim cap dramatically reduces risk, especially around floor drains.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.pool_safely_cpsc', 'Pool Safely (CPSC)'), url: 'https://www.poolsafely.gov' },
            { label: __alloT('stem.swimlab.cpsc_virginia_graeme_baker_pool_and_sp', 'CPSC — Virginia Graeme Baker Pool and Spa Safety Act'), url: 'https://www.cpsc.gov/Regulations-Laws--Standards/Statutes/The-Virginia-Graeme-Baker-Pool-and-Spa-Safety-Act' },
            { label: __alloT('stem.swimlab.cdc_drowning_prevention_3', 'CDC — Drowning Prevention'), url: 'https://www.cdc.gov/drowning' }
          ]),
          h(stableType('TeacherNotes', TeacherNotes), TEACHER_NOTES.drainEntrap),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 8 — AUTISM + WATER SAFETY (highest-stakes module)
      // ─────────────────────────────────────────
      function renderAutismWater() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('♾️ Autism + Water'),
          emergencyBanner(),
          h('div', { role: 'note', style: { padding: '10px 14px', background: T.cardAlt, border: '1px dashed ' + T.warn, borderRadius: 8, fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 12 } },
            h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.heads_up_3', 'Heads up: ')),
            __alloT('stem.swimlab.this_module_discusses_elevated_drownin', 'this module discusses elevated drowning risk in autistic children and prevention strategies. Content is matter-of-fact and oriented toward action; no blame language toward families.')),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.this_module_is_shorter_than_the_others', 'This module is shorter than the others but covers the highest-stakes content. Autistic children drown at dramatically higher rates than the general pediatric population. Most schools and many parents have never heard the numbers. The intervention is layered prevention, not blame.')),

          calloutBox('danger', 'The number that should change your practice',
            'Autistic children are approximately 160 times more likely to die from drowning than children in the general pediatric population (Guan & Li, Columbia University, American Journal of Public Health, 2017). Drowning is the leading cause of death in autistic children who elope (wander). For autistic students with elopement risk, water safety is not optional curriculum — it is life safety.'),

          sectionHeader('❓', 'Why the risk is so much higher'),
          keyPointBlock(
            'Multiple factors compound. None of them are anyone\'s fault.',
            [
              { k: 'Water attraction', v: 'Many autistic children are powerfully drawn to water for sensory reasons (visual, auditory, vestibular). This is well-documented and not something to "fix" — it is part of how their nervous system works.' },
              { k: 'Elopement', v: 'Roughly half of autistic children wander/elope at some point. Water sources (ponds, pools, rivers, fountains) are common destinations.' },
              { k: 'Communication delays', v: 'May not call for help, may not respond to verbal warnings, may not recognize "danger" labels.' },
              { k: 'Risk perception differences', v: 'May not perceive depth, current, cold, or distance the way neurotypical risk-assessment expects.' },
              { k: 'Comorbid seizure disorders', v: 'Some autistic children also have epilepsy. A seizure in water is rapidly fatal.' },
              { k: 'Sensory regulation', v: 'Cold water shock, drain noise, deep-end pressure changes can be overwhelming and trigger panic or shutdown.' }
            ]
          ),

          sectionHeader('🛡️', 'Defense in depth (layered prevention)'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.water, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              __alloT('stem.swimlab.no_single_layer_is_sufficient_stack_mu', 'No single layer is sufficient. Stack multiple layers. If one fails, the others catch.')),
            h('ol', { style: { margin: 0, paddingLeft: 20, color: T.text, lineHeight: 1.7, fontSize: 13 } },
              h('li', null, h('strong', null, __alloT('stem.swimlab.physical_barriers', 'Physical barriers. ')), __alloT('stem.swimlab.pool_fences_with_self_closing_self_lat', 'Pool fences with self-closing, self-latching gates (height per local code, typically 4 ft minimum). Door alarms on every door leading outside. Pool covers when not in use. For at-risk students, additional gate locks at heights beyond the child\'s reach.')),
              h('li', null, h('strong', null, __alloT('stem.swimlab.electronic_alarms', 'Electronic alarms. ')), __alloT('stem.swimlab.door_alarms_cheap_10_20_pool_surface_a', 'Door alarms (cheap, $10-20). Pool surface alarms (motion sensors floating on the pool surface). GPS tracking devices for high-elopement-risk students (Project Lifesaver, AngelSense, similar).')),
              h('li', null, h('strong', null, __alloT('stem.swimlab.adapted_swim_instruction', 'Adapted swim instruction. ')), __alloT('stem.swimlab.survival_swim_training_adapted_for_sen', 'Survival swim training adapted for sensory needs. The goal is not "competitive swimmer" — the goal is "can roll onto back, breathe, and stay afloat for several minutes." Programs like Infant Swimming Resource (ISR) and many YMCAs offer adaptive sessions.')),
              h('li', null, h('strong', null, __alloT('stem.swimlab.bright_colored_swimsuits', 'Bright-colored swimsuits. ')), __alloT('stem.swimlab.use_neon_yellow_orange_or_pink_never_b', 'Use NEON YELLOW, ORANGE, or PINK. NEVER blue, green, white, or gray — those colors are nearly invisible against pool bottoms or lake water. This single change can mean the difference between a lifeguard spotting a submerged child in 5 seconds vs 50.')),
              h('li', null, h('strong', null, __alloT('stem.swimlab.id_jewelry_clothing', 'ID jewelry / clothing. ')), __alloT('stem.swimlab.wearable_id_with_name_diagnosis_family', 'Wearable ID with name, diagnosis, family contact. Important if the child elopes and is found by strangers who may misinterpret behavior as defiance, intoxication, or hostility.')),
              h('li', null, h('strong', null, __alloT('stem.swimlab.constant_supervision_near_water', 'Constant supervision near water. ')), __alloT('stem.swimlab.touch_supervision_within_arm_s_reach_f', 'Touch supervision (within arm\'s reach) for any child who cannot self-rescue. No phones, no looking away, no relying on other children to "watch."')),
              h('li', null, h('strong', null, __alloT('stem.swimlab.family_neighbor_school_awareness', 'Family + neighbor + school awareness. ')), __alloT('stem.swimlab.tell_neighbors_so_they_know_to_call_yo', 'Tell neighbors so they know to call you immediately if they see the child. Tell school staff. Tell first responders. The more people who know, the faster the response if the child elopes.'))
            )
          ),

          calloutBox('info', 'Identity-first language',
            'The autistic community broadly prefers "autistic person" or "autistic child" over "person/child with autism." Research from Bury et al. 2020, Kenny et al. 2016, and Taboas et al. 2023 documents this preference among autistic adults and the broader community. Identity-first language treats autism as an inherent part of the person, not something to be separated from them. Honor individual preference when known.'),

          sectionHeader('🏊', 'Adapted swim instruction — what to look for'),
          keyPointBlock(
            'A good adaptive swim program for autistic students:',
            [
              'Instructor is trained in autism-specific accommodations (sensory regulation, communication adaptation, gradual exposure)',
              'Allows non-traditional pacing (some students need 20 sessions to do what neurotypical kids do in 4)',
              'Permits accommodations like tinted goggles for light sensitivity, ear plugs for sound, slower verbal pacing',
              'Focuses first on water comfort and survival skills (back float, calm breathing, edge crawl), not stroke mechanics',
              'Communicates with family about the child\'s sensory profile and triggers',
              'Has a 1:1 or low ratio (NOT a group class with 12 kids)',
              'Local Maine options: YMCA (Casco Bay, Greater Portland, Bath, others), Special Olympics Maine, private adaptive instructors. Cost can be a barrier — USA Swimming Foundation scholarships and some YMCAs offer subsidies.'
            ]
          ),

          calloutBox('ok', 'For families and educators: this is preventable',
            'The 160x statistic is alarming, but it is also actionable. Families who layer prevention (fence + alarm + adapted swim + bright suit + supervision + community awareness) reduce the risk dramatically. Schools that include water safety in IEP planning for at-risk autistic students do real life-safety work. This is not abstract curriculum — it is the kind of work where individual decisions save individual lives.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('autismWater', 0, {
            prompt: 'You are a school psychologist meeting with a family of a 6-year-old autistic student with documented elopement history. They live near a small pond. The IEP team is reviewing safety planning. What recommendations do you bring to the table?',
            choices: [
              'Standard safety checklist plus a note in the IEP: the family should watch the child closely near water, sign them up for regular swim lessons when they are older, and call 911 if the child ever goes missing; anything more is outside the school team\'s role and risks singling the student out.',
              'Defense in depth: door alarms, GPS device (Project Lifesaver), neighbor notification, fence around the pond if feasible, adapted swim instruction starting now, bright-colored clothing, ID jewelry, and an emergency response plan if the child is missing (water sources searched FIRST).',
              'The student should be kept indoors.',
              'Wait until the next IEP cycle.'
            ],
            correct: 1,
            explain: 'Defense in depth. No single layer is enough; stack them. The "search water sources first" instruction is from NAA — when an autistic child elopes, water is statistically the most dangerous destination, so first responders search nearby water immediately, even if the child has shown no prior interest in that body of water. Time is everything.'
          }),
          scenarioCard('autismWater', 1, {
            prompt: __alloT('stem.swimlab.a_family_is_buying_their_autistic_chil', 'A family is buying their autistic child their first swimsuit for summer. The child loves blue and wants a blue one. The store has yellow, orange, pink, white, and blue available. What do you suggest?'),
            choices: [
              'Get the blue one since the child wants it. A suit color makes no measurable difference to safety; what matters is supervision, and a child who likes their suit is more willing to wear it, practice, and take lessons. Honoring the preference builds trust with the family, and the lifeguard can always be told what the child is wearing.',
              'Suggest yellow, neon orange, or hot pink. Blue and white are nearly invisible against pool bottoms and lake water. Visibility from a safety standpoint matters more than preference here, and there are ways to honor preference partially (blue rash guard under a high-vis suit, blue swim shorts with a neon top, etc.).',
              'Get white because it is cooler.',
              'It does not matter.'
            ],
            correct: 1,
            explain: 'Swim suit color visibility is one of the easiest and cheapest safety interventions. Tests by Alive Solutions document that blue, white, and gray suits become nearly invisible underwater within seconds. Neon yellow, orange, and pink stay visible. For a child at higher drowning risk, this is not a minor cosmetic choice. Where possible, find a creative compromise that honors the child\'s preference (blue accents, beloved character on a high-vis background, etc.) while keeping the primary visible color in the safe range.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('autismWater', [
            { q: 'Approximately how much higher is the drowning risk for autistic children compared to the general pediatric population?', opts: ['About 2x', 'About 20x', 'About 160x', 'No difference'], ans: 2, explain: '~160x, from a 2017 Columbia University study of US death records (Guan & Li, American Journal of Public Health). Drowning is the leading cause of death in autistic children who elope. The intervention is layered prevention.' },
            { q: 'Which swimsuit color is BEST for visibility from a safety standpoint?', opts: ['Light blue or turquoise', 'White', 'Neon yellow or hot pink', 'Pale gray'], ans: 2, explain: 'Neon colors stay visible underwater. Blue, white, and gray become nearly invisible against pool bottoms and lake water. Visibility helps lifeguards and supervising adults spot a submerged child in seconds, which is the entire window for a successful save.' },
            { q: 'When an autistic child with elopement history goes missing, first responders should search:', opts: ['Roads first', 'Water sources first, even if the child has shown no prior interest in water', 'The child\'s bedroom and favorite hiding places inside the house, before widening the search outdoors', 'Schools'], ans: 1, explain: 'Per NAA guidance, water is the statistically most dangerous destination for autistic elopement and the most time-sensitive search target. First responders should search nearby water sources immediately, regardless of whether the child has historically been drawn to water.' },
            { q: 'For an autistic student at high drowning risk, the IEP team should:', opts: ['Avoid discussing it to not stigmatize', 'Develop a layered safety plan including adapted swim instruction, GPS tracking if appropriate, family + neighbor + first-responder notification, and emergency response protocols', 'Recommend the family keep the child indoors or within arm\'s reach at all times, install locks the child cannot open, and revisit the plan at the annual IEP meeting; swim instruction and first-responder contact are outside the school\'s role', 'Defer to the family entirely'], ans: 1, explain: 'Defense in depth, with the school as one of multiple layers. This is exactly the kind of life-safety planning that belongs in IEP discussions for at-risk students. The conversation honors family expertise while bringing professional resources to the table.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.national_autism_association_autism_saf', 'National Autism Association — Autism Safety Toolkit'), url: 'https://nationalautismassociation.org/resources/autism-safety-facts/' },
            { label: __alloT('stem.swimlab.aap_prevention_of_drowning_policy_stat', 'AAP — Prevention of Drowning Policy Statement'), url: 'https://publications.aap.org/pediatrics/article/143/5/e20190850/76998' },
            { label: __alloT('stem.swimlab.autistic_self_advocacy_network_asan', 'Autistic Self-Advocacy Network (ASAN)'), url: 'https://autisticadvocacy.org' },
            { label: __alloT('stem.swimlab.project_lifesaver_international_gps_tr', 'Project Lifesaver International (GPS tracking for elopement risk)'), url: 'https://projectlifesaver.org' },
            { label: __alloT('stem.swimlab.infant_swimming_resource_isr_self_resc', 'Infant Swimming Resource (ISR) — Self-Rescue'), url: 'https://infantswim.com' },
            { label: __alloT('stem.swimlab.special_olympics_aquatics', 'Special Olympics — Aquatics'), url: 'https://www.specialolympics.org/our-work/sports/aquatics' },
            { label: __alloT('stem.swimlab.alive_solutions_swimsuit_color_visibil', 'Alive Solutions — Swimsuit Color Visibility Tests'), url: 'https://alivesolutions.com' },
            { label: __alloT('stem.swimlab.usa_swimming_foundation_make_a_splash_', 'USA Swimming Foundation — Make a Splash (scholarships)'), url: 'https://www.usaswimming.org/foundation/make-a-splash' }
          ]),
          h(stableType('TeacherNotes', TeacherNotes), TEACHER_NOTES.autismWater),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // CUMULATIVE QUIZ — 15 questions across all 9 modules
      // ─────────────────────────────────────────
      // Each question carries a `module` field naming the SwimLab module it
      // tests, so the result page can hand a student a specific "go review
      // this" jump-link instead of generic "review recommended" feedback.
      // For water safety specifically, knowing your exact knowledge gap
      // matters: a missed PFD question and a missed ice-safety question
      // need different remediation, not the same "go back to the menu."
      var CUMULATIVE_QUESTIONS = [
        { module: 'howSwimming', q: 'In cold water with no life jacket, your single most valuable survival skill is:', opts: ['Swimming hard for shore', 'Calmly floating on your back with head tilted back and lungs full of air', 'Removing heavy clothing and shoes right away so you can swim better and stay afloat', 'Treading water until rescue'], ans: 1, explain: 'Back float costs no energy and uses your lungs as built-in flotation (Archimedes\' principle). Head tilted back lifts the face clear of the water without muscular effort. Swimming and treading burn heat fast in cold water. Heavy clothing actually traps insulating air — keep it on. Float, breathe through the gasp reflex, then plan.' },
        { module: 'howSwimming', q: 'You are in 50°F water wearing a life jacket, alone, rescue ~30 minutes away. The position that most extends your survival time is:', opts: ['Swimming slowly to keep blood circulating', 'Treading water with a flutter kick', 'HELP position: knees pulled to chest, arms crossed, body curled', 'Floating with arms and legs spread out for visibility from the rescue boat'], ans: 2, explain: 'HELP (Heat Escape Lessening Posture) covers the places that lose heat fastest (the sides of the chest and the groin) and keeps you still. Swimming or treading pumps cold water past your skin, so you cool faster. Holding HELP in a life jacket buys time for rescue to arrive.' },
        { module: 'iceSafety',   q: 'You fall through ice into a Maine pond in February. Your FIRST action is to:', opts: ['Climb out immediately', 'Float face-up for ~60 seconds while the gasp reflex passes', 'Take off your jacket', 'Yell as loud as you can so that someone on shore hears you before the cold sets in'], ans: 1, explain: 'Cold water shock makes you involuntarily gasp for ~60 seconds. Floating face-up keeps your airway out of the water until the reflex passes. THEN turn back the way you came, get horizontal, kick HARD to slide onto the ice, and roll away.' },
        { module: 'coldShock',   q: 'In the 1-1-10 rule, the "10" stands for:', opts: ['10 seconds before drowning', '10 minutes of meaningful arm strength after the gasp passes', '10°F core temperature drop in the first ten minutes of immersion', '10 strokes to safety'], ans: 1, explain: 'Roughly 10 minutes of useful arm/hand function before cold incapacitation. The "1 hour" follows for unconsciousness. People have hours of survival time in cold water — knowing this fights panic.' },
        { module: 'ripCurrents', q: 'A rip current looks like:', opts: ['A taller wave', 'A calm channel cutting through breaking waves with foam moving away from shore', 'Discolored shallow water where the sand has been stirred up by the breaking waves', 'Whitecaps'], ans: 1, explain: 'The deceptive feature is the apparent calm. Calm water in a surf zone is suspicious. Foam, debris, or sand moving steadily seaward is the giveaway.' },
        { module: 'ripCurrents', q: 'You are caught in a rip current. Swim:', opts: ['Hard for shore', 'Parallel to shore until out of the channel', 'Out to sea to escape', 'Diagonally toward the beach at a 45° angle to the current'], ans: 1, explain: 'Rip currents are narrow (10-30 ft). Parallel-to-shore swimming for 30-100 ft gets you out, then angle back. Fighting the current head-on exhausts you.' },
        { module: 'reachThrow',  q: 'Bystander rescue ladder is:', opts: ['Reach, Throw, Row, Don\'t Go (only enter water if trained)', 'Jump in, Help, Swim back', 'Call 911, then enter the water and swim the victim back to shore yourself', 'Wait for professionals'], ans: 0, explain: 'Reach with a pole/branch first. Throw flotation if too far. Row a boat if too far to throw. Do NOT enter the water unless trained: a panicking swimmer can pull you under.' },
        { module: 'reachThrow',  q: 'A real drowning person looks like:', opts: ['A person yelling and waving for help', 'A silent, vertical figure with mouth at water level and arms pressing down on the surface', 'A swimmer thrashing dramatically', 'A person calling out a lifeguard\'s name and pointing toward the spot where they need help'], ans: 1, explain: 'The Instinctive Drowning Response (Mario Vittone) is silent and vertical. Speech is secondary to breathing — they cannot call out. Arms press down on the surface trying to lift the head — they cannot wave. The window from "in trouble" to submersion is 20-60 seconds. Recognition is the prerequisite for everything else in this lab.' },
        { module: 'pfd',         q: 'Approximately what fraction of boating drowning victims were NOT wearing a life jacket?', opts: ['10%', '50%', '86%', 'All wore one'], ans: 2, explain: '~86% per USCG (85 to 87% in recent yearly reports). A life jacket only helps if it is worn.' },
        { module: 'pfd',         q: 'A child\'s life jacket fits properly when:', opts: ['It rides up to the ears in a lift test, which shows there is room to grow', 'It fits snug, lift test does not let it ride above the chin/ears', 'It is loose for comfort', 'They can grow into it'], ans: 1, explain: 'Lift at the shoulders. Should NOT ride up over the chin or ears. If it does, it will go over their head in water. Right size for current weight, replace as the child grows.' },
        { module: 'iceSafety',   q: 'Minimum thickness of clear blue ice for safely walking on:', opts: ['2 inches', '4 inches', '8 inches', '12 inches'], ans: 1, explain: '4 inches clear blue ice for walking, per Maine IFW. Double for white "snow" ice. Always test as you go.' },
        { module: 'hypothermia', q: 'The UMBLES rule (stumbles, mumbles, fumbles, grumbles) signals:', opts: ['Early heart attack', 'Early hypothermia', 'Stroke', 'Anaphylaxis'], ans: 1, explain: 'Loss of coordination, slurred speech, fine-motor failure, withdrawal/irritability. Catch hypothermia here and treatment is dry-warm-fluids-shelter. Wait, and it gets harder fast.' },
        { module: 'hypothermia', q: 'A severely hypothermic patient is unresponsive with no detectable pulse. The medical maxim is:', opts: ['Pronounce dead immediately', '"Not dead until WARM and dead" — continue CPR through transport and rewarming', 'Try one round of CPR, then stop if there is no response, since cold hearts do not restart', 'Wait 30 minutes'], ans: 1, explain: 'Cold dramatically protects the brain. Documented full recoveries from hour-plus arrests at very low core temperatures. Continue CPR through transport. Handle gently — cold hearts are electrically unstable.' },
        { module: 'drainEntrap', q: 'A child is held to a pool drain by suction. The single most important first action is:', opts: ['Pull them off', 'Hit the emergency pump shut-off switch (releases the suction)', 'Wait for help', 'Call 911 first and wait for the dispatcher\'s instructions before touching the child'], ans: 1, explain: 'Releasing the suction is what resolves the entrapment. Yell for someone else to call 911 simultaneously. Pulling against active suction can cause serious injury.' },
        { module: 'autismWater', q: 'For an autistic child at high drowning risk, the right intervention is:', opts: ['No special accommodations needed', 'Layered prevention: fences, alarms, adapted swim instruction, bright-colored swimwear, GPS if appropriate, community awareness, and water-search-first protocols if elopement happens', 'Keep them indoors', 'Wait until they are older and more verbal before adding any water-safety supports; young autistic children rarely leave the house alone, and the family can add swim lessons, alarms, and fencing later once the risk is clearer'], ans: 1, explain: 'Defense in depth. No single layer is enough. The 160x risk comes from multiple compounding factors (water attraction, elopement, communication, risk perception); the response stacks multiple protective factors. Belongs in IEP planning for at-risk students.' }
      ];

      // Module id → display label, used in the targeted-feedback "Go to..."
      // jump-links on the result page. Kept inline (not in MENU_TILES) so a
      // future menu refactor doesn't quietly break the labels.
      var MODULE_LABELS = {
        howSwimming: 'How Swimming Works',
        coldShock:   'Cold Water Survival',
        ripCurrents: 'Rip Currents',
        iceSafety:   'Falling Through Ice',
        hypothermia: 'Cold Body, Cold Brain',
        pfd:         'Why Life Jackets Work',
        reachThrow:  'Help Without Drowning Yourself',
        drainEntrap: 'Pool Drain Risks',
        autismWater: 'Autism + Water'
      };

      function renderCumulative() {
        var st = bigQuizState;
        // bigQuizState now also carries `picks: { qIdx: chosenOptionIdx }` so
        // the result page can show each missed question with the user's
        // wrong choice + the right one + a jump-link to the relevant module.
        // Older saved state (pre-results-tracking) doesn't have `picks`;
        // default to {} so the result page still renders without it.
        var picks = st.picks || {};
        var done = st.idx >= CUMULATIVE_QUESTIONS.length;
        var pct = CUMULATIVE_QUESTIONS.length ? Math.round((st.score / CUMULATIVE_QUESTIONS.length) * 100) : 0;
        var earned = pct >= 80;
        // Queued, not granted in a useEffect — this function runs inside a
        // conditional view branch and so may not call hooks (see the fixed hook
        // budget near the top of render()).
        if (done && earned && !badges['cumulative_pass']) {
          _pendingAwards.current.push({ id: 'cumulative_pass', label: 'SwimLab Mastery', xp: 5, reason: 'Cumulative quiz passed' });
        }
        if (done) {
          // Identify the missed questions, group by module so a student who
          // missed two PFD questions sees one "Review Why Life Jackets Work"
          // card rather than two separate ones.
          var missedByModule = {};
          CUMULATIVE_QUESTIONS.forEach(function(qi, i) {
            var pick = picks[i];
            if (pick !== undefined && pick !== qi.ans) {
              if (!missedByModule[qi.module]) missedByModule[qi.module] = [];
              missedByModule[qi.module].push({ qIdx: i, q: qi });
            }
          });
          var missedModuleIds = Object.keys(missedByModule);
          return h('div', { style: { padding: 20, maxWidth: 760, margin: '0 auto', color: T.text } },
            backBar('🎯 Cumulative Quiz Result'),
            h('div', { style: { background: T.card, border: '2px solid ' + (earned ? T.ok : T.warn), borderRadius: 14, padding: 24, textAlign: 'center' } },
              h('div', { style: { fontSize: 48, marginBottom: 6 } }, earned ? '🏅' : '📖'),
              h('h2', { style: { margin: '0 0 8px', fontSize: 22 } }, earned ? 'Mastery achieved' : 'Review recommended'),
              h('p', { style: { margin: '0 0 14px', fontSize: 16, color: T.text } },
                'Score: ', h('strong', null, st.score + ' / ' + CUMULATIVE_QUESTIONS.length + ' (' + pct + '%)')),
              h('p', { style: { margin: '0 0 14px', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
                earned
                  ? 'You have demonstrated mastery across the nine SwimLab modules. The skills you have just rehearsed have saved real lives.'
                  : 'Below 80% on a cumulative water safety quiz means there are concepts worth revisiting. The cards below show exactly what you missed and where to review. The goal is not the score; the goal is the muscle memory.'),
              h('div', { className: 'swimlab-no-print', style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
                h('button', { type: 'button', onClick: function() {
                  upd('bigQuizState', { idx: 0, score: 0, answered: false, lastChoice: null, picks: {} });
                }, style: btn({ padding: '8px 14px', fontSize: 13 }) }, __alloT('stem.swimlab.retake_quiz', 'Retake quiz')),
                h('button', { type: 'button', onClick: function() { upd('view', 'menu'); }, style: btnPrimary({ padding: '8px 14px', fontSize: 13 }) }, __alloT('stem.swimlab.back_to_menu', '← Back to menu'))
              )
            ),
            // Targeted feedback — per-module cards listing the user's missed
            // questions, with a jump-link to that module. Only shown if there
            // are misses; a perfect score sees only the celebration above.
            missedModuleIds.length > 0 && h('div', { style: { marginTop: 18 } },
              h('h3', { style: { margin: '0 0 10px', fontSize: 16, color: T.accentHi } },
                __alloT('stem.swimlab.review_these_specific_gaps', '📍 Review these specific gaps')),
              h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                (function() {
                  var missedCount = Object.keys(picks).filter(function(k) { return CUMULATIVE_QUESTIONS[k] && picks[k] !== CUMULATIVE_QUESTIONS[k].ans; }).length;
                  return [
                    __alloT('stem.swimlab.you_missed', 'You missed '),
                    h('strong', { key: 'mc', style: { color: T.text } }, missedCount + ' question' + (missedCount === 1 ? '' : 's')),
                    ' across ',
                    h('strong', { key: 'mm', style: { color: T.text } }, missedModuleIds.length + ' module' + (missedModuleIds.length === 1 ? '' : 's')),
                    __alloT('stem.swimlab.each_card_below_names_the_module_that_', '. Each card below names the module that covers that gap.')
                  ];
                })()),
              missedModuleIds.map(function(modId) {
                var moduleMisses = missedByModule[modId];
                var modLabel = MODULE_LABELS[modId] || modId;
                return h('div', { key: modId, style: { background: T.card, border: '1px solid ' + T.warn, borderRadius: 10, padding: 14, marginBottom: 10 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em' } }, __alloT('stem.swimlab.module', 'Module')),
                      h('div', { style: { fontSize: 15, fontWeight: 700, color: T.text } }, modLabel)),
                    h('button', { type: 'button',
                      className: 'swimlab-no-print',
                      onClick: function() { upd('view', modId); markVisited(modId); wsAnnounce('Opening ' + modLabel); },
                      'aria-label': 'Open ' + modLabel + ' module to review',
                      style: btnPrimary({ padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap' })
                    }, __alloT('stem.swimlab.review', 'Review →'))
                  ),
                  moduleMisses.map(function(m, mi) {
                    return h('div', { key: mi, style: { padding: 10, background: T.cardAlt, borderRadius: 8, marginTop: 6, fontSize: 12, lineHeight: 1.55 } },
                      h('div', { style: { color: T.text, marginBottom: 4 } },
                        h('strong', null, 'Q' + (m.qIdx + 1) + ': '), m.q.q),
                      h('div', { style: { color: T.danger } },
                        h('span', { style: { fontWeight: 700 } }, __alloT('stem.swimlab.your_answer', 'Your answer: ')),
                        m.q.opts[picks[m.qIdx]]),
                      h('div', { style: { color: T.ok, marginTop: 2 } },
                        h('span', { style: { fontWeight: 700 } }, __alloT('stem.swimlab.right_answer_2', 'Right answer: ')),
                        m.q.opts[m.q.ans]),
                      h('div', { style: { color: T.muted, marginTop: 6, fontStyle: 'italic' } }, m.q.explain)
                    );
                  })
                );
              })
            )
          );
        }
        var q = CUMULATIVE_QUESTIONS[st.idx];
        return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto', color: T.text } },
          backBar('🎯 Cumulative SwimLab Quiz'),
          h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 8 } },
            __alloT('stem.swimlab.question', 'Question '), h('strong', null, (st.idx + 1)), ' of ' + CUMULATIVE_QUESTIONS.length,
            __alloT('stem.swimlab.score_first_tries_inline', ' · first-try score '), h('strong', null, st.score)),
          h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 } },
            h('p', { style: { margin: '0 0 14px', fontSize: 15, color: T.text, fontWeight: 600, lineHeight: 1.5 } }, q.q),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              swOptionOrder('cq-' + st.idx, q.opts.length).map(function(oi) {
                var opt = q.opts[oi];
                var picked = st.answered && st.lastChoice === oi;
                var isCorrect = oi === q.ans;
                var style = btn({ padding: '10px 14px', fontSize: 14 });
                if (st.answered) {
                  if (isCorrect) style = Object.assign({}, style, { background: '#14532d', borderColor: T.ok, color: '#bbf7d0' });
                  else if (picked) style = Object.assign({}, style, { background: '#7f1d1d', borderColor: T.danger, color: '#fde2e2' });
                }
                return h('button', { type: 'button', key: oi, disabled: st.answered,
                  onClick: function() {
                    // picks[] keeps the FIRST pick for each question and the score is
                    // counted from it, so "Try again" is practice, not extra credit.
                    var nextPicks = Object.assign({}, picks);
                    var firstTry = nextPicks[st.idx] === undefined;
                    if (firstTry) nextPicks[st.idx] = oi;
                    var nxt = Object.assign({}, st, { answered: true, lastChoice: oi, picks: nextPicks });
                    if (firstTry && oi === q.ans) nxt.score = st.score + 1;
                    upd('bigQuizState', nxt);
                    wsAnnounce(oi === q.ans ? 'Correct.' : 'Incorrect.');
                  },
                  style: style },
                  st.answered && isCorrect && h('span', { 'aria-hidden': 'true' }, '✓ '),
                  st.answered && picked && !isCorrect && h('span', { 'aria-hidden': 'true' }, '✗ '),
                  opt);
              })
            ),
            st.answered && h('div', { style: { marginTop: 12, padding: 12, background: T.cardAlt, borderRadius: 8, fontSize: 13, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Why: '), q.explain),
            // Action row mirrors mini-quiz: "Try again" only shown on wrong
            // answers. Resets answered state for THIS question and removes
            // the recorded pick so it doesn't show up in the missed-cards
            // section on the result page. Score is decremented only if the
            // user originally got it right (rare on a Try-again path) so
            // re-picking can't inflate the score.
            st.answered && h('div', { style: { marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' } },
              st.lastChoice !== q.ans && h('button', { type: 'button',
                onClick: function() {
                  upd('bigQuizState', Object.assign({}, st, { answered: false, lastChoice: null }));
                  wsAnnounce(__alloT('stem.swimlab.sr_question_reset_try_again', 'Question reset. Try again.'));
                },
                style: btn({ padding: '10px 16px', fontSize: 14 }) }, __alloT('stem.swimlab.try_again_3', '↺ Try again')),
              h('button', { type: 'button',
                onClick: function() {
                  upd('bigQuizState', Object.assign({}, st, { idx: st.idx + 1, answered: false, lastChoice: null }));
                },
                style: btnPrimary({ padding: '10px 16px', fontSize: 14 }) },
                st.idx + 1 < CUMULATIVE_QUESTIONS.length ? 'Next →' : 'See results')
            )
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // ASK THE LIFEGUARD (AI) — sourced answer with disclaimer
      // ─────────────────────────────────────────
      function renderAskLifeguard() {
        // Hook-free: pre-allocated slots from the fixed hook budget.
        var q = _askQSlot[0], setQ = _askQSlot[1];
        var ans = _askAnsSlot[0], setAns = _askAnsSlot[1];
        var loading = _askLoadingSlot[0], setLoading = _askLoadingSlot[1];
        // Persistent answer history. Stored in toolData (not local state) so
        // it survives navigating away to a module and back, and so it
        // persists across reloads via the same hydration path the rest of
        // SwimLab uses. Cap at 5 entries; newest first.
        var askHistory = Array.isArray(d.askHistory) ? d.askHistory : [];
        var ASK_HISTORY_MAX = 5;

        function ask() {
          if (!q.trim()) return;
          if (!callGemini) {
            setAns({ error: true, text: __alloT('stem.swimlab.ai_tutor_is_not_available_in_this_buil', 'AI tutor is not available in this build. Try the modules or Resources tab.') });
            return;
          }
          var question = q.trim();
          var srCheck = (typeof ctx.safeRehearseCheck === 'function')
            ? ctx.safeRehearseCheck
            : (typeof window !== 'undefined' && window.AlloSafeRehearse && typeof window.AlloSafeRehearse.check === 'function' ? window.AlloSafeRehearse.check : null);
          if (srCheck) {
            try {
              var verdict = srCheck(question, 'swimlab_ask_lifeguard');
              if (verdict && verdict.blocked) {
                setAns({ error: true, text: verdict.message || 'If you or someone else is in danger right now, call or text 911 (or 988 for crisis support).' });
                return;
              }
            } catch (_) {}
          }
          setLoading(true);
          setAns(null);
          var prompt = 'You are a water safety educator answering a question for a US student or teacher. ' +
            'Ground your answer in: CDC, USCG, AAP, AHA, NAA, ASAN, NOAA, US Lifesaving Association, Cold Water Boot Camp, ' +
            'Maine Department of Inland Fisheries & Wildlife, CPSC (Pool Safely / Virginia Graeme Baker Act), and Wilderness Medical Society. ' +
            'Cite source organizations inline. Use concrete numbers when known. NEVER claim to teach swimming — refer to ' +
            'Red Cross, YMCA, or a Water Safety Instructor (WSI). End every answer with "In a real emergency: call 911."  ' +
            'Use identity-first language for autistic people ("autistic students" not "students with autism"). ' +
            'Keep the answer under 250 words. ' +
            'Question: ' + question;
          Promise.resolve().then(function() { return callGemini(prompt, { maxOutputTokens: 500 }); })
            .then(function(resp) {
              if (!_wsMountedRef.current) return;
              setLoading(false);
              var rawText = (typeof resp === 'string') ? resp : (resp && typeof resp.text === 'string' ? resp.text : (resp && typeof resp.content === 'string' ? resp.content : ''));
              var text = rawText.trim();
              if (!text) {
                setAns({ error: true, text: 'No response was returned. Try again or review the SwimLab modules.' });
                return;
              }
              setAns({ error: false, text: text });
              // Save successful answers to history (newest first, capped).
              var entry = { q: question, text: text, ts: Date.now() };
              var nextHistory = [entry].concat(askHistory).slice(0, ASK_HISTORY_MAX);
              upd('askHistory', nextHistory);
            })
            .catch(function(err) {
              if (!_wsMountedRef.current) return;
              setLoading(false);
              setAns({ error: true, text: 'Could not reach the AI tutor: ' + (err && err.message || 'unknown error') });
            });
        }

        function fmtAge(ts) {
          var diff = Date.now() - ts;
          var min = Math.floor(diff / 60000);
          if (min < 1) return 'just now';
          if (min < 60) return min + ' min ago';
          var hr = Math.floor(min / 60);
          if (hr < 24) return hr + ' hr ago';
          var day = Math.floor(hr / 24);
          return day + ' day' + (day === 1 ? '' : 's') + ' ago';
        }

        return h('div', { style: { padding: 20, maxWidth: 760, margin: '0 auto', color: T.text } },
          backBar('🤖 Ask the Lifeguard (AI)'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.type_a_water_safety_question_the_ai_gr', 'Type a water safety question. The AI grounds its answer in CDC, USCG, AAP, NOAA, NAA, ASAN, and other primary sources cited throughout this lab. '),
            h('strong', null, __alloT('stem.swimlab.educational_only', 'Educational only.')),
            __alloT('stem.swimlab.real_emergencies_need_911_not_a_chatbo', ' Real emergencies need 911, not a chatbot.')),
          h('label', { htmlFor: 'wsQ', style: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 } }, __alloT('stem.swimlab.your_question', 'Your question:')),
          h('textarea', { id: 'wsQ', value: q, onChange: function(e) { setQ(e.target.value); }, rows: 3,
            placeholder: __alloT('stem.swimlab.e_g_how_long_can_a_person_survive_in_5', 'e.g. "How long can a person survive in 50°F water?" or "What\'s the safest swim suit color for my non-verbal son?"'),
            style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + T.border, background: T.cardAlt, color: T.text, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' } }),
          h('div', { className: 'swimlab-no-print', style: { marginTop: 10, display: 'flex', gap: 8 } },
            h('button', { type: 'button', onClick: ask, disabled: loading || !q.trim(),
              style: btnPrimary({ padding: '10px 18px', fontSize: 14, opacity: (loading || !q.trim()) ? 0.5 : 1 }) },
              loading ? 'Thinking…' : 'Ask'),
            h('button', { type: 'button', onClick: function() { setQ(''); setAns(null); }, style: btn({ padding: '10px 14px', fontSize: 14 }) }, __alloT('stem.swimlab.clear', 'Clear'))
          ),
          ans && h('div', { style: { marginTop: 16, padding: 14, background: T.card, border: '1px solid ' + (ans.error ? T.warn : T.water), borderRadius: 10, fontSize: 14, color: T.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' } },
            ans.text
          ),
          // Recent-answers history. Persists across navigation + reload.
          // Each entry collapsed by default; click the question to expand.
          // Tagged swimlab-no-print so the print handout shows just the
          // current Q&A, not the user's full session history.
          askHistory.length > 0 && h('div', { className: 'swimlab-no-print', style: { marginTop: 18 } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' } },
              h('h3', { style: { margin: 0, fontSize: 13, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' } },
                '🕒 Recent answers (last ' + askHistory.length + ')'),
              h('button', {
                type: 'button',
                onClick: async function() {
                  // AlloFlowUX has a native-confirm fallback during early app startup.
                  // SwimLab is destructive here, so require the real accessible dialog
                  // module and fail closed rather than invoking that fallback.
                  var dialogModule = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.ConfirmDialog && window.AlloModules.ConfirmDialog.ConfirmDialog;
                  var confirmApi = typeof window !== 'undefined' && window.AlloFlowUX && window.AlloFlowUX.confirm;
                  if (typeof dialogModule !== 'function' || typeof confirmApi !== 'function') {
                    var unavailable = __alloT('stem.swimlab.clear_history_confirmation_unavailable', 'Confirmation is unavailable, so your saved answers were not changed.');
                    addToast(unavailable, 'warning');
                    wsAnnounce(unavailable);
                    return;
                  }
                  var shouldClear = false;
                  try {
                    shouldClear = await confirmApi(
                      __alloT('stem.swimlab.clear_history_confirmation', 'Clear all saved AI answers? This cannot be undone.'),
                      {
                        title: __alloT('stem.swimlab.clear_history_confirmation_title', 'Clear saved AI answers?'),
                        confirmText: __alloT('stem.swimlab.clear_history', 'Clear history'),
                        cancelText: __alloT('stem.swimlab.keep_saved_answers', 'Keep answers'),
                        tone: 'danger'
                      }
                    );
                  } catch (err) {
                    addToast(__alloT('stem.swimlab.clear_history_confirmation_failed', 'The confirmation could not open, so your saved answers were not changed.'), 'warning');
                    return;
                  }
                  if (!shouldClear) {
                    wsAnnounce(__alloT('stem.swimlab.saved_answers_kept', 'Saved answers kept.'));
                    return;
                  }
                  upd('askHistory', []);
                  wsAnnounce(__alloT('stem.swimlab.history_cleared', 'History cleared.'));
                },
                'aria-label': __alloT('stem.swimlab.clear_all_saved_ai_answers', 'Clear all saved AI answers'),
                style: btn({ padding: '4px 10px', fontSize: 12 })
              }, __alloT('stem.swimlab.clear_history', 'Clear history'))
            ),
            askHistory.map(function(entry, i) {
              return h('details', { key: entry.ts + '-' + i,
                style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 10, marginBottom: 6 } },
                h('summary', { style: { cursor: 'pointer', fontSize: 13, color: T.text, fontWeight: 600, listStyle: 'revert', display: 'flex', alignItems: 'baseline', gap: 8 } },
                  h('span', { style: { flex: 1, lineHeight: 1.4 } }, entry.q),
                  h('span', { style: { fontSize: 12, color: T.dim, fontWeight: 400, whiteSpace: 'nowrap' } }, fmtAge(entry.ts))
                ),
                h('div', { style: { marginTop: 8, padding: 10, background: T.bg, borderRadius: 6, fontSize: 13, color: T.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap' } },
                  entry.text
                )
              );
            })
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // RESOURCES TAB
      // ─────────────────────────────────────────
      function renderResources() {
        var groups = [
          { name: __alloT('stem.swimlab.get_certified_learn_to_swim', 'Get certified / learn to swim'), items: [
            { label: __alloT('stem.swimlab.american_red_cross_swimming_water_safe', 'American Red Cross — Swimming & Water Safety classes'), url: 'https://www.redcross.org/take-a-class/swimming' },
            { label: __alloT('stem.swimlab.ymca_aquatics_programs_2', 'YMCA — Aquatics programs'), url: 'https://www.ymca.org/what-we-do/healthy-living/swimming-aquatics' },
            { label: __alloT('stem.swimlab.usa_swimming_foundation_make_a_splash__2', 'USA Swimming Foundation — Make a Splash (scholarships, find lessons)'), url: 'https://www.usaswimming.org/foundation/make-a-splash' },
            { label: __alloT('stem.swimlab.infant_swimming_resource_isr_self_resc_2', 'Infant Swimming Resource (ISR) — Self-Rescue'), url: 'https://infantswim.com' }
          ] },
          { name: __alloT('stem.swimlab.drowning_prevention_authorities', 'Drowning prevention authorities'), items: [
            { label: __alloT('stem.swimlab.cdc_drowning_prevention_4', 'CDC — Drowning Prevention'), url: 'https://www.cdc.gov/drowning' },
            { label: __alloT('stem.swimlab.national_drowning_prevention_alliance__2', 'National Drowning Prevention Alliance (NDPA)'), url: 'https://ndpa.org' },
            { label: __alloT('stem.swimlab.stop_drowning_now', 'Stop Drowning Now'), url: 'https://stopdrowningnow.org' },
            { label: __alloT('stem.swimlab.aap_policy_statement_prevention_of_dro_2', 'AAP Policy Statement — Prevention of Drowning'), url: 'https://publications.aap.org/pediatrics/article/143/5/e20190850/76998' },
            { label: __alloT('stem.swimlab.mario_vittone_drowning_doesn_t_look_li_2', 'Mario Vittone — "Drowning Doesn\'t Look Like Drowning"'), url: 'https://mariovittone.com/2010/05/154/' }
          ] },
          { name: __alloT('stem.swimlab.cold_water_ice_safety', 'Cold water + ice safety'), items: [
            { label: __alloT('stem.swimlab.cold_water_boot_camp_mario_vittone_3', 'Cold Water Boot Camp (Mario Vittone)'), url: 'https://coldwaterbootcamp.com' },
            { label: __alloT('stem.swimlab.cold_water_safety', 'Cold Water Safety'), url: 'https://www.coldwatersafety.org' },
            { label: __alloT('stem.swimlab.maine_department_of_inland_fisheries_w_3', 'Maine Department of Inland Fisheries & Wildlife — Ice Safety'), url: 'https://www.maine.gov/ifw/programs-resources/boating-snowmobile-atv-laws-rules.html' }
          ] },
          { name: __alloT('stem.swimlab.beach_open_water', 'Beach + open water'), items: [
            { label: __alloT('stem.swimlab.noaa_rip_current_safety_2', 'NOAA Rip Current Safety'), url: 'https://www.weather.gov/safety/ripcurrent' },
            { label: __alloT('stem.swimlab.us_lifesaving_association_usla_2', 'US Lifesaving Association (USLA)'), url: 'https://www.usla.org' },
            { label: __alloT('stem.swimlab.nws_gray_maine_beach_hazards', 'NWS Gray (Maine) — Beach Hazards'), url: 'https://www.weather.gov/gyx/' }
          ] },
          { name: __alloT('stem.swimlab.boating_pfds', 'Boating + PFDs'), items: [
            { label: __alloT('stem.swimlab.us_coast_guard_recreational_boating_sa', 'US Coast Guard — Recreational Boating Safety'), url: 'https://www.uscgboating.org' },
            { label: __alloT('stem.swimlab.maine_ifw_boating_laws', 'Maine IFW — Boating Laws'), url: 'https://www.maine.gov/ifw/programs-resources/boating-snowmobile-atv-laws-rules.html' },
            { label: __alloT('stem.swimlab.safe_kids_worldwide_water_safety', 'Safe Kids Worldwide — Water Safety'), url: 'https://www.safekids.org/safetytips/field_risks/water-safety' }
          ] },
          { name: __alloT('stem.swimlab.pool_spa_safety', 'Pool + spa safety'), items: [
            { label: __alloT('stem.swimlab.pool_safely_cpsc_2', 'Pool Safely (CPSC)'), url: 'https://www.poolsafely.gov' },
            { label: __alloT('stem.swimlab.virginia_graeme_baker_pool_spa_safety_', 'Virginia Graeme Baker Pool & Spa Safety Act'), url: 'https://www.cpsc.gov/Regulations-Laws--Standards/Statutes/The-Virginia-Graeme-Baker-Pool-and-Spa-Safety-Act' }
          ] },
          { name: __alloT('stem.swimlab.hypothermia_wilderness_medicine', 'Hypothermia / wilderness medicine'), items: [
            { label: __alloT('stem.swimlab.wilderness_medical_society', 'Wilderness Medical Society'), url: 'https://wms.org' },
            { label: __alloT('stem.swimlab.nols_wilderness_medicine', 'NOLS Wilderness Medicine'), url: 'https://www.nols.edu/en/wilderness-medicine/' },
            { label: __alloT('stem.swimlab.aha_cold_emergencies_2', 'AHA — Cold Emergencies'), url: 'https://cpr.heart.org' }
          ] },
          { name: __alloT('stem.swimlab.autism_water_safety', 'Autism + water safety'), items: [
            { label: __alloT('stem.swimlab.national_autism_association_autism_saf_2', 'National Autism Association — Autism Safety Toolkit'), url: 'https://nationalautismassociation.org/resources/autism-safety-facts/' },
            { label: __alloT('stem.swimlab.autistic_self_advocacy_network_asan_2', 'Autistic Self-Advocacy Network (ASAN)'), url: 'https://autisticadvocacy.org' },
            { label: __alloT('stem.swimlab.project_lifesaver_international_gps_fo', 'Project Lifesaver International (GPS for elopement)'), url: 'https://projectlifesaver.org' },
            { label: __alloT('stem.swimlab.angelsense_gps_tracking', 'AngelSense (GPS tracking)'), url: 'https://www.angelsense.com' },
            { label: __alloT('stem.swimlab.special_olympics_aquatics_2', 'Special Olympics — Aquatics'), url: 'https://www.specialolympics.org/our-work/sports/aquatics' },
            { label: __alloT('stem.swimlab.alive_solutions_swimsuit_color_visibil_2', 'Alive Solutions — Swimsuit Color Visibility Tests'), url: 'https://alivesolutions.com' }
          ] },
          { name: 'Maine-specific', items: [
            { label: __alloT('stem.swimlab.maine_ymca_chapters_find_a_pool', 'Maine YMCA chapters (find a pool)'), url: 'https://www.ymca.org/find-your-y' },
            { label: __alloT('stem.swimlab.maine_warden_service_911_for_water_eme', 'Maine Warden Service (911 for water emergencies)'), url: 'https://www.maine.gov/ifw/about-us/warden-service.html' },
            { label: __alloT('stem.swimlab.maine_marine_patrol', 'Maine Marine Patrol'), url: 'https://www.maine.gov/dmr/marine-patrol' }
          ] }
        ];
        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('📚 Resources'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            __alloT('stem.swimlab.every_organization_cited_in_this_lab_p', 'Every organization cited in this lab, plus adaptive swim resources and Maine-specific links. Bookmark the Make a Splash scholarship link if cost is a barrier to lessons.')),
          groups.map(function(g, gi) {
            return h('div', { key: gi, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: 14, marginBottom: 12 } },
              h('h3', { style: { margin: '0 0 10px', fontSize: 14, color: T.accentHi } }, g.name),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 } },
                g.items.map(function(it, ii) {
                  return h('li', { key: ii },
                    h('a', { href: it.url, target: '_blank', rel: 'noopener', style: { color: T.link } }, it.label)
                  );
                })
              )
            );
          }),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // VIEW DISPATCH
      // ─────────────────────────────────────────
      // ═════════════════════════════════════════
      // PRACTICE LABS — shared pieces
      // ═════════════════════════════════════════
      // Hook-free like every other branch: lab state lives in toolData
      // (d.ripLab, d.coldLab, d.rescueLab, d.floatLab, d.strokeHunt), and every
      // number on screen comes from the module-scope model (SwimLabModel).
      var LAB_META = {
        ripLab:     { icon: '🌊', pass: 'rip',    module: 'ripCurrents', label: __alloT('stem.swimlab.lab_rip_name', 'Rip Escape'),        blurb: __alloT('stem.swimlab.lab_rip_blurb', 'Choose a direction every 5 seconds. Watch your distance and energy.') },
        coldLab:    { icon: '🥶', pass: 'cold',   module: 'coldShock',   label: __alloT('stem.swimlab.lab_cold_name', 'Cold Water 1-1-10'), blurb: __alloT('stem.swimlab.lab_cold_blurb', 'Make the three decisions: first minute, ten minutes, one hour.') },
        rescueLab:  { icon: '🪢', pass: 'rescue', module: 'reachThrow',  label: __alloT('stem.swimlab.lab_rescue_name', 'Rescue Ladder'),   blurb: __alloT('stem.swimlab.lab_rescue_blurb', 'Six scenes. Reach, throw, row, or do not go in?') },
        floatLab:   { icon: '🦺', pass: 'float',  module: 'pfd',         label: __alloT('stem.swimlab.lab_float_name', 'Why You Float'),    blurb: __alloT('stem.swimlab.lab_float_blurb', 'Add air and foam. See what a life jacket really changes.') },
        strokeHunt: { icon: '📊', pass: 'stroke', module: 'howSwimming', label: __alloT('stem.swimlab.lab_stroke_name', 'Stroke Efficiency'), blurb: __alloT('stem.swimlab.lab_stroke_blurb', 'Speed, drag and power. Log your tries and find the pattern.') }
      };
      var LAB_ORDER = ['ripLab', 'coldLab', 'rescueLab', 'floatLab', 'strokeHunt'];

      function openLab(labId) {
        upd('view', labId);
        wsAnnounce(__alloT('stem.swimlab.sr_opening_lab', 'Opening practice lab: ') + LAB_META[labId].label);
      }

      // A "try it" card for the top of a reading module.
      function labLink(labId) {
        var meta = LAB_META[labId];
        var passed = !!labStatus[meta.pass];
        return h('div', { className: 'swimlab-no-print', style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: T.cardAlt, border: '2px solid ' + T.accent, borderRadius: 12, padding: 12, marginBottom: 14 } },
          h('span', { 'aria-hidden': 'true', style: { fontSize: 26 } }, meta.icon),
          h('div', { style: { flex: '1 1 200px', minWidth: 0 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: T.text } }, __alloT('stem.swimlab.practice_first', 'Practice first: ') + meta.label),
            h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.45 } }, meta.blurb + (passed ? ' ' + __alloT('stem.swimlab.lab_passed_note', '(You have a saved safe result.)') : ''))),
          h('button', { type: 'button', onClick: function() { openLab(labId); }, style: btnPrimary({ fontSize: 14 }) },
            __alloT('stem.swimlab.open_lab', 'Open the lab')));
      }

      function labFrame(labId, body) {
        var meta = LAB_META[labId];
        return h('div', { className: 'swimlab-lab', style: { maxWidth: 940, margin: '0 auto', color: T.text } },
          backBar(meta.icon + ' ' + meta.label),
          emergencyBanner(),
          body,
          h('p', { className: 'swimlab-no-print', style: { margin: '14px 0 0', fontSize: 13, color: T.muted } },
            __alloT('stem.swimlab.lab_read_more', 'Want the full explanation and the sources? '),
            h('button', { type: 'button',
              onClick: function() { upd('view', meta.module); markVisited(meta.module); wsAnnounce(__alloT('stem.swimlab.sr_opening_module', 'Opening the reading module')); },
              style: { background: 'none', border: 'none', padding: '10px 0', minHeight: 44, color: T.accentHi, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }
            }, __alloT('stem.swimlab.lab_read_module', 'Read the module: ') + (MODULE_LABELS[meta.module] || meta.module))),
          disclaimerFooter());
      }

      function labCard(extraStyle) {
        return Object.assign({ background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 12 }, extraStyle || {});
      }

      // Small line chart: one or more series over the same axes. Lines differ
      // by dash pattern as well as color, and the legend names each one.
      function lineChart(opts) {
        var W = 360, H = 176, pl = 46, pr = 14, pt = 12, pb = 36;
        var xMax = opts.xMax || 1, yMax = opts.yMax || 1;
        var px = function(x) { return pl + (Math.max(0, Math.min(xMax, x)) / xMax) * (W - pl - pr); };
        var py = function(y) { return pt + (1 - Math.max(0, Math.min(yMax, y)) / yMax) * (H - pt - pb); };
        var axis = isContrast ? '#ffff00' : T.dim, ink = isContrast ? '#ffffff' : T.muted;
        var kids = [];
        var yTicks = opts.yTicks || [0, Math.round(yMax / 2), yMax];
        var xTicks = opts.xTicks || [0, Math.round(xMax / 2), xMax];
        yTicks.forEach(function(yv, i) {
          kids.push(h('line', { key: 'gy' + i, x1: pl, y1: py(yv), x2: W - pr, y2: py(yv), stroke: axis, strokeWidth: yv === 0 ? 1.4 : 0.6, opacity: yv === 0 ? 1 : 0.5 }));
          kids.push(h('text', { key: 'ty' + i, x: pl - 6, y: py(yv) + 4, textAnchor: 'end', fontSize: 13, fill: ink, fontFamily: 'system-ui, sans-serif' }, String(yv)));
        });
        xTicks.forEach(function(xv, i) {
          kids.push(h('text', { key: 'tx' + i, x: px(xv), y: H - pb + 16, textAnchor: i === 0 ? 'start' : (i === xTicks.length - 1 ? 'end' : 'middle'), fontSize: 13, fill: ink, fontFamily: 'system-ui, sans-serif' }, String(xv)));
        });
        kids.push(h('line', { key: 'ax', x1: pl, y1: pt, x2: pl, y2: H - pb, stroke: axis, strokeWidth: 1.4 }));
        kids.push(h('text', { key: 'xl', x: (pl + W - pr) / 2, y: H - 5, textAnchor: 'middle', fontSize: 13, fontWeight: 700, fill: ink, fontFamily: 'system-ui, sans-serif' }, opts.xLabel));
        (opts.series || []).forEach(function(s, si) {
          if (!s.pts || !s.pts.length) return;
          if (s.dots) {
            s.pts.forEach(function(p, pi) {
              kids.push(p[2]
                ? h('rect', { key: 's' + si + 'd' + pi, x: px(p[0]) - 5, y: py(p[1]) - 5, width: 10, height: 10, fill: s.color, stroke: isContrast ? '#000000' : T.card, strokeWidth: 1.5 })
                : h('circle', { key: 's' + si + 'd' + pi, cx: px(p[0]), cy: py(p[1]), r: 5.5, fill: s.color, stroke: isContrast ? '#000000' : T.card, strokeWidth: 1.5 }));
            });
            return;
          }
          if (s.pts.length > 1) {
            kids.push(h('polyline', { key: 's' + si, fill: 'none', stroke: s.color, strokeWidth: s.width || 2.4, strokeDasharray: s.dash || undefined, strokeLinejoin: 'round', strokeLinecap: 'round',
              points: s.pts.map(function(p) { return px(p[0]).toFixed(1) + ',' + py(p[1]).toFixed(1); }).join(' ') }));
          }
          var end = s.pts[s.pts.length - 1];
          kids.push(h('circle', { key: 's' + si + 'e', cx: px(end[0]), cy: py(end[1]), r: s.width ? 4.5 : 3.5, fill: s.color, stroke: isContrast ? '#000000' : T.card, strokeWidth: 1.2 }));
        });
        return h('figure', { style: { margin: 0 } },
          h('figcaption', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 } }, opts.title),
          h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.aria,
            style: { width: '100%', height: 'auto', display: 'block', background: isContrast ? '#000000' : T.cardAlt, borderRadius: 8, border: '1px solid ' + T.border } }, kids));
      }
      function chartLegend(series) {
        return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 6, fontSize: 13, color: T.muted } },
          series.map(function(s, i) {
            return h('span', { key: i, style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
              h('svg', { width: 30, height: 10, 'aria-hidden': 'true' },
                h('line', { x1: 1, y1: 5, x2: 29, y2: 5, stroke: s.color, strokeWidth: s.width || 2.4, strokeDasharray: s.dash || undefined, strokeLinecap: 'round' })),
              s.name);
          }));
      }
      function statBox(label, value, sub) {
        return h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 10, padding: '8px 10px', minWidth: 0 } },
          h('div', { style: { fontSize: 12, color: T.muted, fontWeight: 700 } }, label),
          h('div', { style: { fontSize: 20, fontWeight: 800, color: T.text, lineHeight: 1.2 } }, value),
          sub ? h('div', { style: { fontSize: 12, color: T.muted } }, sub) : null);
      }
      // One prediction question. Options are {id, text}; nothing below it is
      // shown until the student commits.
      function predictCard(question, options, orderKey, onPick) {
        var order = swOptionOrder(orderKey, options.length);
        return h('div', { style: labCard({ border: '2px solid ' + T.accent }) },
          h('div', { style: { fontSize: 12, fontWeight: 800, color: T.accentHi, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 } },
            __alloT('stem.swimlab.predict_first', 'Predict first')),
          h('p', { style: { margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.45 } }, question),
          h('div', { style: { display: 'grid', gap: 8 } },
            order.map(function(oi) {
              var o = options[oi];
              return h('button', { key: o.id, type: 'button', onClick: function() { onPick(o.id); }, style: btn({ fontSize: 14 }) }, o.text);
            })),
          h('p', { style: { margin: '8px 0 0', fontSize: 12, color: T.muted } },
            __alloT('stem.swimlab.predict_note', 'There is no penalty for a wrong guess. You test it next.')));
      }

      // ─────────────────────────────────────────
      // LAB — RIP ESCAPE
      // ─────────────────────────────────────────
      function renderRipLab() {
        var raw = _isPlainObj(d.ripLab) ? d.ripLab : {};
        var sc = swRipScenario(typeof raw.sc === 'string' ? raw.sc : 'narrow');
        var predicted = (raw.predicted === 'against' || raw.predicted === 'parallel' || raw.predicted === 'under') ? raw.predicted : null;
        var run = swRipValid(raw.run, sc.id) ? raw.run : swRipStart(sc.id);
        function setLab(patch) { upd('ripLab', Object.assign({ sc: sc.id, predicted: predicted, run: run }, patch)); }

        var SC_NAMES = {
          narrow: __alloT('stem.swimlab.rip_sc_narrow', 'Narrow rip'),
          medium: __alloT('stem.swimlab.rip_sc_medium', 'Medium rip'),
          wide: __alloT('stem.swimlab.rip_sc_wide', 'Wide, fast rip')
        };
        var PLAN_NAMES = {
          against: __alloT('stem.swimlab.rip_plan_against', 'Swim straight back to the beach, as hard as I can'),
          parallel: __alloT('stem.swimlab.rip_plan_parallel', 'Swim along the beach first, then head in'),
          under: __alloT('stem.swimlab.rip_plan_under', 'Dive under the current and swim in below it')
        };

        // What the last 5 seconds did, in words. Every number is read from the model step.
        function stepText(s) {
          var L = s.last;
          if (!L) return swFill(__alloT('stem.swimlab.rip_start_text', 'You are in the rip current, {y} ft from the beach. Choose what to do for the next 5 seconds.'), { y: s.y });
          var out = Math.abs(L.dy), side = Math.abs(L.dx), used = Math.abs(L.de);
          if (L.action === 'in') {
            if (L.fight > 0) {
              var where = L.dy > 0 ? swFill(__alloT('stem.swimlab.rip_fight_out', 'The current still pushed you {n} ft farther out.'), { n: out })
                : (L.dy === 0 ? __alloT('stem.swimlab.rip_fight_zero', 'You did not get any closer.') : swFill(__alloT('stem.swimlab.rip_fight_in', 'You got {n} ft closer.'), { n: out }));
              return swFill(__alloT('stem.swimlab.rip_fight', 'You swam hard at the beach, against the current. {where} That cost {e} energy.'), { where: where, e: used });
            }
            if (side > 0) return swFill(__alloT('stem.swimlab.rip_in_angle', 'You swam toward the beach at an angle, away from the rip: {n} ft closer.'), { n: out });
            return swFill(__alloT('stem.swimlab.rip_in_calm', 'You swam {n} ft closer to the beach in calm water.'), { n: out });
          }
          if (L.action === 'left' || L.action === 'right') {
            if (side === 0) return __alloT('stem.swimlab.rip_edge', 'You are at the edge of this map. Swim toward the beach from here.');
            if (L.wasInCurrent && !L.inCurrentNow) return swFill(__alloT('stem.swimlab.rip_side_out', 'You swam {n} ft along the beach and you are out of the rip. The current carried you {c} ft out while you crossed. Now head for the beach.'), { n: side, c: L.carried });
            if (L.inCurrentNow) return swFill(__alloT('stem.swimlab.rip_side_in', 'You swam {n} ft along the beach. The current carried you {c} ft out. Keep going: the channel is narrow.'), { n: side, c: L.carried });
            return swFill(__alloT('stem.swimlab.rip_side_calm', 'You swam {n} ft along the beach in calm water.'), { n: side });
          }
          if (L.carried > 0) return swFill(__alloT('stem.swimlab.rip_float_carried', 'You floated and saved your energy. The current carried you {c} ft out. It pulls you out, not under.'), { c: L.carried });
          if (Math.abs(s.x) < sc.widthFt / 2) return __alloT('stem.swimlab.rip_float_head', 'You floated. The current has let go of you here, past the breaking waves. Swim along the beach before you head in, or keep floating and wave for help.');
          return __alloT('stem.swimlab.rip_float_calm', 'You floated in calm water and got a little energy back.');
        }
        function runLine(s) {
          if (s.outcome === 'shore') return swFill(__alloT('stem.swimlab.rip_line_shore', 'on the beach in {t} seconds, with {e} of 100 energy left'), { t: s.t, e: s.e });
          if (s.outcome === 'spent') return swFill(__alloT('stem.swimlab.rip_line_spent', 'energy gone after {t} seconds, still {y} ft from the beach'), { t: s.t, y: s.y });
          return swFill(__alloT('stem.swimlab.rip_line_afloat', 'still floating after {t} seconds, with {e} of 100 energy left'), { t: s.t, e: s.e });
        }
        function outcomeText(s) {
          if (s.outcome === 'shore' && s.fightSec === 0) return swFill(__alloT('stem.swimlab.rip_out_safe', 'You are back on the beach in {t} seconds with {e} of 100 energy left. You never swam against the current. That is the safe plan.'), { t: s.t, e: s.e });
          if (s.outcome === 'shore') return swFill(__alloT('stem.swimlab.rip_out_fought', 'You are back on the beach, but you spent {f} seconds swimming against the current first. That used {c} energy and did not help. Try a run with no fighting.'), { f: s.fightSec, c: s.fightSec * SW_RIP.costFight });
          if (s.outcome === 'spent') return swFill(__alloT('stem.swimlab.rip_out_spent', 'Your energy is used up after {t} seconds, and you are {y} ft from the beach. The start was {y0} ft. All that is left is to float and wave for help. This is why the rule is: do not swim against a rip current.'), { t: s.t, y: s.y, y0: SW_RIP.startFt });
          return swFill(__alloT('stem.swimlab.rip_out_afloat', 'You stayed afloat for {t} seconds with {e} of 100 energy left. Floating and waving for help is a safe choice. To get home, swim along the beach, then head in.'), { t: s.t, e: s.e });
        }

        function act(action) {
          if (run.outcome) return;
          var next = swRipStep(run, action);
          setLab({ run: next });
          wsAnnounce(stepText(next) + (next.outcome ? ' ' + outcomeText(next) : ''));
          if (!next.outcome) return;
          var prev = _isPlainObj(labResults.rip) ? labResults.rip[sc.id] : null;
          if (swRipIsSafe(next)) {
            if (!(prev && prev.safe === true)) {
              saveLabResult('rip', sc.id, { safe: true, outcome: next.outcome, energy: next.e, sec: next.t, at: new Date().toISOString() });
              if (awardXP) { try { awardXP('swimLab', 10, 'Rip Escape: safe run'); } catch (_) {} }
              awardBadge('lab_rip', 'Rip Escape: safe run');
            }
          } else if (!prev) {
            saveLabResult('rip', sc.id, { safe: false, outcome: next.outcome, at: new Date().toISOString() });
          }
        }

        // ── Scene: seen from above, one scale for both directions ──
        var SW = 360, SH = 330, shoreY = 292, topY = 14;
        var yMaxFt = sc.endFt + 40;
        var ppf = (shoreY - topY) / yMaxFt;
        var sx = function(xf) { return SW / 2 + xf * ppf; };
        var sy = function(yf) { return shoreY - yf * ppf; };
        var half = sc.widthFt / 2;
        var cSea = isContrast ? '#000000' : 'url(#sw-lab-sea)';
        var cInk = isContrast ? '#ffffff' : '#f8fafc';
        var cRip = isContrast ? '#ff6b6b' : '#fb7185';
        var scene = h('svg', { viewBox: '0 0 ' + SW + ' ' + SH, role: 'img',
          'aria-label': swFill(__alloT('stem.swimlab.rip_scene_aria', 'Map of the beach from above. A rip current {w} ft wide flows straight out from the beach and ends {end} ft out. You are {y} ft from the beach{side}.'),
            { w: sc.widthFt, end: sc.endFt, y: run.y, side: run.x === 0 ? '' : swFill(__alloT('stem.swimlab.rip_scene_side', ', {n} ft to the side of where you started'), { n: Math.abs(run.x) }) }),
          style: { width: '100%', height: 'auto', display: 'block', borderRadius: 10, border: isContrast ? '2px solid #ffff00' : '1px solid ' + T.border } },
          h('defs', null,
            h('linearGradient', { id: 'sw-lab-sea', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
              h('stop', { offset: '0%', stopColor: '#082f49' }),
              h('stop', { offset: '70%', stopColor: '#0e7490' }),
              h('stop', { offset: '100%', stopColor: '#22a3bd' })),
            h('marker', { id: 'sw-lab-out', markerWidth: 7, markerHeight: 7, refX: 5, refY: 3.5, orient: 'auto' },
              h('path', { d: 'M0,0 L0,7 L7,3.5 z', fill: cRip }))),
          h('rect', { x: 0, y: 0, width: SW, height: SH, fill: cSea }),
          h('rect', { x: 0, y: shoreY, width: SW, height: SH - shoreY, fill: isContrast ? '#111111' : '#d6b685' }),
          // Breaking waves on both sides of the channel (the rip is the calm gap).
          [0.22, 0.48, 0.74].map(function(f, wi) {
            var wy = sy(sc.endFt * f), l2 = sx(-half) - 8, r1 = sx(half) + 8;
            return h('g', { key: 'wv' + wi },
              h('path', { d: 'M50,' + wy + ' Q' + ((50 + l2) / 2) + ',' + (wy - 6) + ' ' + l2 + ',' + wy, fill: 'none', stroke: cInk, strokeWidth: 2, strokeLinecap: 'round', opacity: 0.75 }),
              h('path', { d: 'M' + r1 + ',' + wy + ' Q' + ((r1 + SW - 8) / 2) + ',' + (wy - 6) + ' ' + (SW - 8) + ',' + wy, fill: 'none', stroke: cInk, strokeWidth: 2, strokeLinecap: 'round', opacity: 0.75 }));
          }),
          // The channel, its flow arrows, and where it ends.
          h('rect', { x: sx(-half), y: sy(sc.endFt), width: sc.widthFt * ppf, height: sc.endFt * ppf, fill: isContrast ? 'none' : 'rgba(7,34,56,0.55)', stroke: isContrast ? '#00ffff' : 'rgba(186,230,253,0.6)', strokeWidth: 1.2, strokeDasharray: '4 4' }),
          h('line', { className: 'sw-rip-flow', x1: sx(0), y1: shoreY - 6, x2: sx(0), y2: sy(sc.endFt) + 10, stroke: cRip, strokeWidth: 2.4, strokeDasharray: '10 6', markerEnd: 'url(#sw-lab-out)' }),
          h('text', { x: sx(half) + 8, y: sy(sc.endFt) + 4, fill: cInk, fontSize: 13, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }, __alloT('stem.swimlab.rip_scene_end', 'rip ends here')),
          h('text', { x: sx(-half) - 8, y: sy(sc.endFt * 0.61) + 4, textAnchor: 'end', fill: isContrast ? '#ff6b6b' : '#fecdd3', fontSize: 13, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }, __alloT('stem.swimlab.rip_scene_rip', 'rip current')),
          // Distance marks.
          (function() {
            var marks = [], stepFt = yMaxFt > 250 ? 100 : 50;
            for (var f = stepFt; f < yMaxFt; f += stepFt) {
              marks.push(h('line', { key: 'm' + f, x1: 0, y1: sy(f), x2: 10, y2: sy(f), stroke: cInk, strokeWidth: 1.4 }));
              marks.push(h('text', { key: 't' + f, x: 13, y: sy(f) + 4, fill: cInk, fontSize: 13, fontFamily: 'system-ui, sans-serif' }, f + ' ft'));
            }
            return marks;
          })(),
          h('text', { x: SW / 2, y: shoreY + 24, textAnchor: 'middle', fill: isContrast ? '#ffff00' : '#1e293b', fontSize: 14, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, __alloT('stem.swimlab.rip_scene_beach', 'BEACH')),
          // The path so far, the start, and the swimmer.
          run.hist.length > 1 && h('polyline', { fill: 'none', stroke: isContrast ? '#ffff00' : '#fef08a', strokeWidth: 2, strokeDasharray: '3 3',
            points: run.hist.map(function(p) { return sx(p.x).toFixed(1) + ',' + sy(p.y).toFixed(1); }).join(' ') }),
          h('circle', { cx: sx(0), cy: sy(SW_RIP.startFt), r: 4, fill: 'none', stroke: cInk, strokeWidth: 1.4 }),
          h('g', { className: 'sw-swimmer', style: { transform: 'translate(' + sx(run.x).toFixed(1) + 'px,' + sy(run.y).toFixed(1) + 'px)' } },
            h('circle', { cx: 0, cy: 0, r: 7, fill: isContrast ? '#ffff00' : '#fef08a', stroke: '#0f172a', strokeWidth: 2 }),
            h('text', { x: run.x > 20 ? -12 : 12, y: (run.y * ppf < 30) ? -10 : 5, textAnchor: run.x > 20 ? 'end' : 'start', fill: cInk, fontSize: 13, fontWeight: 800, fontFamily: 'system-ui, sans-serif', stroke: isContrast ? 'none' : '#082f49', strokeWidth: 3, paintOrder: 'stroke' }, __alloT('stem.swimlab.rip_scene_you', 'you')))
        );

        var cYou = isContrast ? '#ffff00' : T.accentHi, cAg = isContrast ? '#ff6b6b' : T.danger, cPar = isContrast ? '#00ff66' : T.ok;
        var youSeries = { name: __alloT('stem.swimlab.rip_legend_you', 'your run'), color: cYou, width: 3.2 };
        var done = !!run.outcome;
        var agRun = done ? swRipRun(sc.id, 'against') : null;
        var parRun = done ? swRipRun(sc.id, 'parallel') : null;
        var flRun = done ? swRipRun(sc.id, 'float') : null;
        var cmp = done ? [
          { name: __alloT('stem.swimlab.rip_legend_against', 'straight at the beach'), color: cAg, dash: '7 4', run: agRun },
          { name: __alloT('stem.swimlab.rip_legend_parallel', 'along the beach, then in'), color: cPar, dash: '2 5', run: parRun }
        ] : [];
        var allRuns = [run].concat(cmp.map(function(c) { return c.run; }));
        var tMax = Math.max(20, Math.ceil(Math.max.apply(null, allRuns.map(function(r) { return r.t; })) / 20) * 20);
        var dTop = Math.max.apply(null, allRuns.map(function(r) { return Math.max.apply(null, r.hist.map(function(p) { return p.y; })); }));
        var dMax = dTop <= 100 ? 100 : Math.ceil(dTop / 100) * 100;
        function seriesOf(key) {
          // Your run first (thick, solid); the comparison plans are drawn on top as
          // thin dashed lines, so a run identical to one of them still shows both.
          return [{ color: cYou, width: 4, pts: run.hist.map(function(p) { return [p.t, p[key]]; }) }]
            .concat(cmp.map(function(c) { return { color: c.color, dash: c.dash, pts: c.run.hist.map(function(p) { return [p.t, p[key]]; }) }; }));
        }
        var charts = h('div', { style: labCard() },
          lineChart({ title: __alloT('stem.swimlab.rip_chart_dist', 'Distance from the beach (ft)'), xLabel: __alloT('stem.swimlab.rip_chart_time', 'time (seconds)'), xMax: tMax, yMax: dMax, series: seriesOf('y'),
            aria: swFill(__alloT('stem.swimlab.rip_chart_dist_aria', 'Line chart of distance from the beach over time. Your run: now {y} ft from the beach after {t} seconds.'), { y: run.y, t: run.t }) }),
          h('div', { style: { height: 10 } }),
          lineChart({ title: __alloT('stem.swimlab.rip_chart_energy', 'Energy left (out of 100)'), xLabel: __alloT('stem.swimlab.rip_chart_time', 'time (seconds)'), xMax: tMax, yMax: 100, series: seriesOf('e'),
            aria: swFill(__alloT('stem.swimlab.rip_chart_energy_aria', 'Line chart of energy left over time. Your run: {e} of 100 energy left after {t} seconds.'), { e: run.e, t: run.t }) }),
          chartLegend([youSeries].concat(cmp)));

        var eColor = run.e > 50 ? T.ok : (run.e > 20 ? T.warn : T.danger);
        var ACTIONS = [
          { id: 'in', text: __alloT('stem.swimlab.rip_act_in', '↓ Swim toward the beach') },
          { id: 'float', text: __alloT('stem.swimlab.rip_act_float', 'Float and wave for help') },
          { id: 'left', text: __alloT('stem.swimlab.rip_act_left', '← Swim along the beach') },
          { id: 'right', text: __alloT('stem.swimlab.rip_act_right', 'Swim along the beach →') }
        ];
        var safeNow = done && swRipIsSafe(run);
        var panel;
        if (!predicted) {
          panel = predictCard(
            swFill(__alloT('stem.swimlab.rip_predict_q', 'You are caught in a rip current, {y} ft from the beach. Which plan gets you back with the most energy left?'), { y: SW_RIP.startFt }),
            [{ id: 'against', text: PLAN_NAMES.against }, { id: 'parallel', text: PLAN_NAMES.parallel }, { id: 'under', text: PLAN_NAMES.under }],
            'rip-predict', function(id) { setLab({ predicted: id }); wsAnnounce(__alloT('stem.swimlab.sr_prediction_saved', 'Prediction saved. Now test it.')); });
        } else {
          panel = h('div', { style: labCard() },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 } },
              statBox(__alloT('stem.swimlab.rip_stat_dist', 'From the beach'), run.y + ' ft'),
              statBox(__alloT('stem.swimlab.rip_stat_energy', 'Energy left'), String(run.e)),
              statBox(__alloT('stem.swimlab.rip_stat_time', 'Time'), run.t + ' s')),
            h('div', { role: 'progressbar', 'aria-label': __alloT('stem.swimlab.rip_stat_energy', 'Energy left'), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(run.e),
              style: { height: 12, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.border, margin: '8px 0', overflow: 'hidden' } },
              h('div', { style: { width: run.e + '%', height: '100%', background: eColor } })),
            h('p', { style: { margin: '0 0 10px', fontSize: 14, color: T.text, lineHeight: 1.5, minHeight: 42 } }, stepText(run)),
            !done && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 } },
              ACTIONS.map(function(a) {
                return h('button', { key: a.id, type: 'button', 'data-rip-act': a.id, onClick: function() { act(a.id); }, style: btn({ fontSize: 14, textAlign: 'center', minHeight: 48, padding: '8px 10px' }) }, a.text);
              })),
            !done && h('p', { style: { margin: '8px 0 0', fontSize: 12, color: T.muted } }, __alloT('stem.swimlab.rip_step_note', 'Each choice lasts 5 seconds.')),
            done && h('div', { style: { background: safeNow ? '#14532d' : '#7c2d12', border: '1px solid ' + (safeNow ? '#16a34a' : '#c2410c'), color: safeNow ? '#bbf7d0' : '#fed7aa', borderRadius: 10, padding: 12, fontSize: 14, lineHeight: 1.5 } },
              h('strong', { style: { display: 'block', marginBottom: 4 } }, safeNow ? __alloT('stem.swimlab.rip_result_safe', '✓ Safe run') : __alloT('stem.swimlab.rip_result_retry', 'Not a safe run yet')),
              outcomeText(run)),
            done && h('div', { style: { marginTop: 10, fontSize: 13, color: T.text, lineHeight: 1.55 } },
              h('strong', null, __alloT('stem.swimlab.rip_compare_title', 'The three plans in this model:')),
              h('ul', { style: { margin: '4px 0 0', paddingLeft: 18, color: T.muted } },
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.rip_cmp_against', 'Straight at the beach: ')), runLine(agRun) + '.'),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.rip_cmp_parallel', 'Along the beach, then in: ')), runLine(parRun) + '.'),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.rip_cmp_float', 'Float until it lets go, then along the beach, then in: ')), runLine(flRun) + '.')),
              h('p', { style: { margin: '8px 0 0' } },
                h('strong', null, __alloT('stem.swimlab.you_predicted', 'You predicted: ')), PLAN_NAMES[predicted] + '. ',
                predicted === 'parallel' ? __alloT('stem.swimlab.rip_pred_right', 'The model agrees: a rip is narrow, so a short swim to the side gets you out of it.')
                  : (predicted === 'against' ? __alloT('stem.swimlab.rip_pred_against', 'In the model that plan runs out of energy before it reaches the beach. The current is as fast as the swimmer, or faster.')
                    : __alloT('stem.swimlab.rip_pred_under', 'Diving under does not work: a rip current is the whole depth of the water, not just the surface.')))),
            done && h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 } },
              h('button', { type: 'button', onClick: function() { setLab({ run: swRipStart(sc.id) }); wsAnnounce(__alloT('stem.swimlab.sr_new_run', 'New run started.')); }, style: btnPrimary({ fontSize: 14 }) }, __alloT('stem.swimlab.try_another_run', 'Try another run'))));
        }

        return labFrame('ripLab', h('div', null,
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.rip_lab_intro', 'A rip current is a narrow stream of water flowing away from the beach. Practice the choice that gets a swimmer out of one. This is a simple model for learning. It cannot teach you to swim.')),
          h('div', { role: 'group', 'aria-label': __alloT('stem.swimlab.rip_pick_scenario', 'Choose a rip current'), style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 } },
            SW_RIP.scenarios.map(function(s) {
              var on = s.id === sc.id;
              var res = _isPlainObj(labResults.rip) ? labResults.rip[s.id] : null;
              return h('button', { key: s.id, type: 'button', 'aria-pressed': on ? 'true' : 'false',
                onClick: function() { if (!on) { upd('ripLab', { sc: s.id, predicted: predicted, run: swRipStart(s.id) }); wsAnnounce(SC_NAMES[s.id]); } },
                style: btn({ fontSize: 13, padding: '8px 12px', borderWidth: 2, borderColor: on ? T.accent : T.border, background: on ? T.cardAlt : T.card }) },
                h('span', { style: { display: 'block', fontWeight: 800 } }, SC_NAMES[s.id] + (res && res.safe === true ? ' ✓' : '')),
                h('span', { style: { display: 'block', fontSize: 12, fontWeight: 500, color: T.muted } },
                  swFill(__alloT('stem.swimlab.rip_sc_detail', '{w} ft wide, flows out {c} ft each second'), { w: s.widthFt, c: s.currentFt })));
            })),
          h('div', { className: 'swimlab-lab-grid' },
            h('div', { style: labCard({ padding: 8 }) }, scene),
            h('div', { style: { display: 'grid', gap: 12, alignContent: 'start' } }, panel, predicted ? charts : null)),
          h('details', { style: labCard({ marginTop: 12 }) },
            h('summary', { style: { cursor: 'pointer', fontSize: 13, fontWeight: 700, color: T.text, padding: '12px 0' } }, __alloT('stem.swimlab.about_model', 'About this model')),
            h('ul', { style: { margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.6 } },
              h('li', null, __alloT('stem.swimlab.rip_model_1', 'From the Rip Currents module, which cites NOAA and USLA: rips are usually 10 to 30 ft wide and can flow up to 8 ft each second. Most end 50 to 100 yards out, just past the breaking waves.')),
              h('li', null, swFill(__alloT('stem.swimlab.rip_model_2', 'Model settings, not real-world statistics: the swimmer moves {v} ft each second, starts {y} ft out with 100 energy, and uses energy {k} times faster when swimming hard against the current.'), { v: SW_RIP.swimFt, y: SW_RIP.startFt, k: SW_RIP.costFight / SW_RIP.costSteady })),
              h('li', null, __alloT('stem.swimlab.rip_model_3', 'The model channel is straight. Real rips bend and change. The rule stays the same: do not swim against it. Float, swim along the beach, then head in.')))))
        );
      }

      // ─────────────────────────────────────────
      // LAB — COLD WATER 1-1-10 (three decisions on one timeline)
      // ─────────────────────────────────────────
      // The safe choice at each stage is swColdBest(); every "why" restates what
      // the Cold Water, How Swimming Works, Ice and Hypothermia modules say.
      function renderColdLab() {
        var raw = _isPlainObj(d.coldLab) ? d.coldLab : {};
        var sc = swColdScenario(typeof raw.sc === 'string' ? raw.sc : 'dock');
        var same = raw.sc === sc.id;
        var tries = (same && _isPlainObj(raw.tries)) ? raw.tries : {};
        function triesAt(s) { return Array.isArray(tries[s]) ? tries[s].filter(function(a) { return typeof a === 'string'; }) : []; }
        function solved(s) { var t = triesAt(s); return t.length > 0 && t[t.length - 1] === swColdBest(sc.id, s); }
        var stage = (same && Number.isInteger(raw.stage) && raw.stage >= 0 && raw.stage <= 3) ? raw.stage : 0;
        for (var s0 = 0; s0 < stage; s0++) { if (!solved(s0)) { stage = s0; break; } }
        function setLab(patch) { upd('coldLab', Object.assign({ sc: sc.id, stage: stage, tries: tries }, patch)); }
        var near = sc.exitFt <= SW_COLD.nearExitFt;

        var SC_NAMES = {
          dock: __alloT('stem.swimlab.cold_sc_dock', 'Off the dock'),
          kayak: __alloT('stem.swimlab.cold_sc_kayak', 'Kayak tips over'),
          canoe: __alloT('stem.swimlab.cold_sc_canoe', 'Canoe with friends')
        };
        var SETUP = {
          dock: swFill(__alloT('stem.swimlab.cold_setup_dock', 'Early spring. You slip off a dock into a very cold lake. A ladder is {ft} feet away. You are wearing a jacket and shoes, and no life jacket.'), { ft: sc.exitFt }),
          kayak: swFill(__alloT('stem.swimlab.cold_setup_kayak', 'October. Your kayak tips over in a cold lake (water about 55°F), about {ft} feet from shore. You are wearing a life jacket. The kayak is floating next to you.'), { ft: sc.exitFt }),
          canoe: swFill(__alloT('stem.swimlab.cold_setup_canoe', 'October. A canoe tips over in a cold lake (water about 55°F), about {ft} feet from shore. You and two friends are in the water. Everyone is wearing a life jacket.'), { ft: sc.exitFt })
        };
        var WHY_GASP = __alloT('stem.swimlab.cold_why_gasp', 'In the first minute your body gasps and breathes fast on its own. If your face goes under during a gasp, you breathe in water. Float first. Swim later.');
        var WHY_FLOAT = __alloT('stem.swimlab.cold_why_float', 'Yes. The gasp reflex passes in about a minute. Floating keeps your face out of the water until it does.');
        var WHY_CLOTHES = __alloT('stem.swimlab.cold_why_clothes', 'Keep them on. Wet clothes trap air that helps hold in heat. Taking them off wears you out and makes you colder.');
        var WHY_PFD = __alloT('stem.swimlab.cold_why_pfd', 'Keep it on. The life jacket keeps you floating when your arms get tired. That is exactly its job.');
        var WHY_MOVE = __alloT('stem.swimlab.cold_why_move', 'Moving does not warm you in cold water. It burns heat faster than your body makes it. Stay still.');
        var WHY_FAR = swFill(__alloT('stem.swimlab.cold_why_far', '{ft} feet is a long swim once your arms stop working. In 55°F water most people lose useful arm and hand strength within 5 to 15 minutes.'), { ft: sc.exitFt });
        var STAGES = {
          dock: [
            { ask: __alloT('stem.swimlab.cold_dock_0', 'The first minute. What do you do?'), opts: [
              { act: 'swim', t: __alloT('stem.swimlab.cold_dock_0_swim', 'Swim hard for the ladder right away'), why: WHY_GASP },
              { act: 'float', t: __alloT('stem.swimlab.cold_dock_0_float', 'Float on my back and get my breathing steady'), why: WHY_FLOAT },
              { act: 'strip', t: __alloT('stem.swimlab.cold_dock_0_strip', 'Pull off my jacket and shoes so I am lighter'), why: WHY_CLOTHES }] },
            { ask: swFill(__alloT('stem.swimlab.cold_dock_1', 'Your breathing is steady. You have about 10 minutes of useful arm and hand strength. The ladder is {ft} feet away.'), { ft: sc.exitFt }), opts: [
              { act: 'exit', t: __alloT('stem.swimlab.cold_dock_1_exit', 'Swim slowly to the ladder and climb out now'), why: __alloT('stem.swimlab.cold_dock_1_exit_why', 'Yes. Use your arms while they still work. The way out is close.') },
              { act: 'rest', t: __alloT('stem.swimlab.cold_dock_1_rest', 'Keep floating and rest a while longer first'), why: __alloT('stem.swimlab.cold_dock_1_rest_why', 'Do not wait. In about 10 minutes the cold takes the strength from your hands and arms. The way out is close: go now.') },
              { act: 'tread', t: __alloT('stem.swimlab.cold_dock_1_tread', 'Tread water in place and yell until help comes'), why: __alloT('stem.swimlab.cold_dock_1_tread_why', 'Treading water burns energy and heat fast, and your arms are on a 10 minute clock. The ladder is close: swim to it.') }] },
            { ask: __alloT('stem.swimlab.cold_dock_2', 'You are out of the water, soaked and very cold. What now?'), opts: [
              { act: 'warm', t: __alloT('stem.swimlab.cold_dock_2_warm', 'Get to shelter and change into dry clothes'), why: __alloT('stem.swimlab.cold_dock_2_warm_why', 'Yes. The cold keeps working on you after you are out. Get to shelter, get dry, and warm the chest and neck before the arms and legs.') },
              { act: 'rub', t: __alloT('stem.swimlab.cold_dock_2_rub', 'Rub my arms and legs hard to warm them up fast'), why: __alloT('stem.swimlab.cold_dock_2_rub_why', 'Do not rub. Rubbing pushes cold blood from the arms and legs back toward the heart.') },
              { act: 'sit', t: __alloT('stem.swimlab.cold_dock_2_sit', 'Sit down and rest, since I am out of the water'), why: __alloT('stem.swimlab.cold_dock_2_sit_why', 'Not yet. The cold keeps working on you out of the water. Get to shelter and into dry clothes now.') }] }
          ],
          kayak: [
            { ask: __alloT('stem.swimlab.cold_kayak_0', 'The first minute. What do you do?'), opts: [
              { act: 'swim', t: __alloT('stem.swimlab.cold_kayak_0_swim', 'Swim hard for shore right away, before I get cold'), why: WHY_GASP },
              { act: 'float', t: __alloT('stem.swimlab.cold_kayak_0_float', 'Let my life jacket hold me up and steady my breathing'), why: WHY_FLOAT },
              { act: 'strip', t: __alloT('stem.swimlab.cold_kayak_0_strip', 'Take off the life jacket so I can swim faster'), why: WHY_PFD }] },
            { ask: swFill(__alloT('stem.swimlab.cold_kayak_1', 'Your breathing is steady. Shore is about {ft} feet away. Your kayak is floating next to you.'), { ft: sc.exitFt }), opts: [
              { act: 'swimfar', t: swFill(__alloT('stem.swimlab.cold_kayak_1_swim', 'Swim the {ft} feet to shore before my arms get cold'), { ft: sc.exitFt }), why: WHY_FAR },
              { act: 'stay', t: __alloT('stem.swimlab.cold_kayak_1_stay', 'Stay with the kayak, hold on, and signal for help'), why: __alloT('stem.swimlab.cold_kayak_1_stay_why', 'Yes. The kayak floats and is easy to see. Staying with it and signaling is often the better choice than a long swim.') },
              { act: 'letgo', t: __alloT('stem.swimlab.cold_kayak_1_letgo', 'Let go of the kayak and tread water to stay warm'), why: WHY_MOVE }] },
            { ask: __alloT('stem.swimlab.cold_kayak_2', 'Help may take a while. You are floating in your life jacket beside the kayak. How do you wait?'), opts: [
              { act: 'help', t: __alloT('stem.swimlab.cold_kayak_2_help', 'Pull my knees to my chest and cross my arms'), why: __alloT('stem.swimlab.cold_kayak_2_help_why', 'Yes. This is the HELP position. Curling up covers the places where the body loses heat fastest, and cuts heat loss by roughly half.') },
              { act: 'kick', t: __alloT('stem.swimlab.cold_kayak_2_kick', 'Kick and swim in place to keep my body warm'), why: WHY_MOVE },
              { act: 'strip', t: __alloT('stem.swimlab.cold_kayak_2_strip', 'Take off my wet clothes so they do not chill me'), why: WHY_CLOTHES }] }
          ],
          canoe: [
            { ask: __alloT('stem.swimlab.cold_canoe_0', 'The first minute. What does everyone do?'), opts: [
              { act: 'swim', t: __alloT('stem.swimlab.cold_canoe_0_swim', 'Swim hard for shore right away, before we get cold'), why: WHY_GASP },
              { act: 'float', t: __alloT('stem.swimlab.cold_canoe_0_float', 'Let the life jackets hold us up and steady our breathing'), why: WHY_FLOAT },
              { act: 'strip', t: __alloT('stem.swimlab.cold_canoe_0_strip', 'Pull off jackets and shoes so everyone is lighter'), why: WHY_CLOTHES }] },
            { ask: swFill(__alloT('stem.swimlab.cold_canoe_1', 'Everyone is breathing steadily. Shore is about {ft} feet away.'), { ft: sc.exitFt }), opts: [
              { act: 'swimfar', t: __alloT('stem.swimlab.cold_canoe_1_swim', 'Each of us swims for shore on our own'), why: WHY_FAR },
              { act: 'stay', t: __alloT('stem.swimlab.cold_canoe_1_stay', 'Stay together and signal for help'), why: __alloT('stem.swimlab.cold_canoe_1_stay_why', 'Yes. A group that stays together is much easier for rescuers to see than people spread out, and it is a long swim once arms stop working.') },
              { act: 'apart', t: __alloT('stem.swimlab.cold_canoe_1_apart', 'Spread out so rescuers can spot at least one of us'), why: __alloT('stem.swimlab.cold_canoe_1_apart_why', 'A group that stays together is easier to see than people spread out. Together you can also share warmth.') }] },
            { ask: __alloT('stem.swimlab.cold_canoe_2', 'Help may take a while. All three of you are floating in life jackets. How do you wait?'), opts: [
              { act: 'huddle', t: __alloT('stem.swimlab.cold_canoe_2_huddle', 'Huddle chest to chest, arms around each other'), why: __alloT('stem.swimlab.cold_canoe_2_huddle_why', 'Yes. A huddle shares warmth where bodies touch, and a group is easier for rescuers to see. Small children go in the middle.') },
              { act: 'kick', t: __alloT('stem.swimlab.cold_canoe_2_kick', 'Everyone kicks and swims in place to stay warm'), why: WHY_MOVE },
              { act: 'apart', t: __alloT('stem.swimlab.cold_canoe_2_apart', 'Float a few feet apart so nobody bumps anybody'), why: __alloT('stem.swimlab.cold_canoe_2_apart_why', 'Close together is warmer. Bodies share warmth where they touch, and less of each person faces the cold water.') }] }
          ]
        };
        var stages = STAGES[sc.id];
        var STAGE_LABELS = [
          { big: __alloT('stem.swimlab.cold_tl_1', '1 minute'), small: __alloT('stem.swimlab.cold_tl_1s', 'breathing') },
          { big: __alloT('stem.swimlab.cold_tl_2', '10 minutes'), small: __alloT('stem.swimlab.cold_tl_2s', 'arms and hands') },
          { big: __alloT('stem.swimlab.cold_tl_3', '1 hour'), small: __alloT('stem.swimlab.cold_tl_3s', 'body heat') }
        ];
        function optOf(s, actId) { var o = stages[s].opts; for (var i = 0; i < o.length; i++) if (o[i].act === actId) return o[i]; return null; }
        function firstTryCount() { return [0, 1, 2].filter(function(s) { return triesAt(s)[0] === swColdBest(sc.id, s); }).length; }

        function pick(actId) {
          var nt = Object.assign({}, tries);
          nt[stage] = triesAt(stage).concat([actId]);
          setLab({ tries: nt });
          var o = optOf(stage, actId);
          wsAnnounce((actId === swColdBest(sc.id, stage) ? __alloT('stem.swimlab.sr_safe_choice', 'Safe choice. ') : __alloT('stem.swimlab.sr_not_safe_choice', 'Not the safe choice. ')) + (o ? o.why : ''));
        }
        function goNext() {
          var ns = stage + 1;
          setLab({ stage: ns });
          if (ns < 3) { wsAnnounce(STAGE_LABELS[ns].big + '. ' + stages[ns].ask); return; }
          var first = firstTryCount();
          wsAnnounce(swFill(__alloT('stem.swimlab.sr_cold_done', 'Timeline finished. Safe first choices: {n} of 3.'), { n: first }));
          var prev = _isPlainObj(labResults.cold) ? labResults.cold[sc.id] : null;
          if (!prev || !(Number(prev.firstTry) >= first)) {
            saveLabResult('cold', sc.id, { firstTry: first, of: 3, at: new Date().toISOString() });
            if (first === 3) {
              if (awardXP) { try { awardXP('swimLab', 8, 'Cold Water 1-1-10: three safe choices'); } catch (_) {} }
              awardBadge('lab_cold', 'Cold Water 1-1-10: three safe choices');
            }
          }
        }

        // ── Timeline ──
        var nodeX = [62, 180, 298];
        var cDone = isContrast ? '#00ff66' : T.ok, cNow = isContrast ? '#ffff00' : T.accent, cLater = isContrast ? '#ffffff' : T.dim;
        var timeline = h('svg', { viewBox: '0 0 360 108', role: 'img',
          'aria-label': swFill(__alloT('stem.swimlab.cold_tl_aria', 'The 1-1-10 timeline: 1 minute to control breathing, 10 minutes of useful arm and hand strength, about 1 hour of body heat. {where}'),
            { where: stage >= 3 ? __alloT('stem.swimlab.cold_tl_aria_done', 'All three decisions are made.') : swFill(__alloT('stem.swimlab.cold_tl_aria_now', 'You are deciding step {n} of 3.'), { n: stage + 1 }) }),
          style: { width: '100%', maxWidth: 520, height: 'auto', display: 'block', margin: '0 auto' } },
          h('line', { x1: nodeX[0], y1: 34, x2: nodeX[2], y2: 34, stroke: cLater, strokeWidth: 4, strokeLinecap: 'round', opacity: 0.5 }),
          stage > 0 && h('line', { x1: nodeX[0], y1: 34, x2: nodeX[Math.min(2, stage)], y2: 34, stroke: cDone, strokeWidth: 4, strokeLinecap: 'round' }),
          [0, 1, 2].map(function(s) {
            var isDone = s < stage, isNow = s === stage;
            var col = isDone ? cDone : (isNow ? cNow : cLater);
            return h('g', { key: s },
              isNow && h('circle', { cx: nodeX[s], cy: 34, r: 23, fill: 'none', stroke: col, strokeWidth: 2, strokeDasharray: '3 3' }),
              h('circle', { cx: nodeX[s], cy: 34, r: 17, fill: isContrast ? '#000000' : (isDone || isNow ? col : T.cardAlt), stroke: col, strokeWidth: 2.5 }),
              h('text', { x: nodeX[s], y: 39, textAnchor: 'middle', fontSize: 15, fontWeight: 900, fill: isContrast ? col : ((isDone || isNow) ? (isDark ? '#0c2233' : '#ffffff') : T.muted), fontFamily: 'system-ui, sans-serif' }, isDone ? '✓' : String(s + 1)),
              h('text', { x: nodeX[s], y: 78, textAnchor: 'middle', fontSize: 14, fontWeight: 800, fill: isContrast ? '#ffffff' : T.text, fontFamily: 'system-ui, sans-serif' }, STAGE_LABELS[s].big),
              h('text', { x: nodeX[s], y: 96, textAnchor: 'middle', fontSize: 13, fill: isContrast ? '#ffffff' : T.muted, fontFamily: 'system-ui, sans-serif' }, STAGE_LABELS[s].small));
          }));

        // What the body is doing right now (from the Cold Water module's own timeline).
        var body = [];
        body.push(stage === 0 && !solved(0)
          ? __alloT('stem.swimlab.cold_body_gasp', 'Breathing: gasping and fast. This passes in about a minute.')
          : __alloT('stem.swimlab.cold_body_steady', 'Breathing: steady.'));
        if (near && stage >= 2) body.push(__alloT('stem.swimlab.cold_body_out', 'Out of the water. The cold is still working on you.'));
        else body.push(stage <= 1 ? __alloT('stem.swimlab.cold_body_arms', 'Arms and hands: working. Cold takes their strength in about 10 minutes.') : __alloT('stem.swimlab.cold_body_arms_weak', 'Arms and hands: losing strength.'));
        if (!near && stage >= 1) body.push(__alloT('stem.swimlab.cold_body_heat', 'Body heat: dropping slowly. In 50°F water, hypothermia takes about an hour to make a person unconscious. Rescuers have time.'));

        var panel;
        if (stage >= 3) {
          var first = firstTryCount();
          panel = h('div', { style: labCard({ border: '2px solid ' + (first === 3 ? T.ok : T.warn) }) },
            h('div', { style: { fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6 } },
              swFill(__alloT('stem.swimlab.cold_result', 'Safe first choices: {n} of 3'), { n: first })),
            h('ol', { style: { margin: 0, paddingLeft: 20, fontSize: 14, color: T.text, lineHeight: 1.6 } },
              [0, 1, 2].map(function(s) {
                var best = optOf(s, swColdBest(sc.id, s));
                var firstOk = triesAt(s)[0] === swColdBest(sc.id, s);
                return h('li', { key: s, style: { marginBottom: 4 } },
                  h('strong', null, STAGE_LABELS[s].big + ': '), best.t + '. ',
                  h('span', { style: { color: firstOk ? T.ok : T.warn, fontWeight: 700 } },
                    firstOk ? __alloT('stem.swimlab.cold_first_try', '✓ first try') : __alloT('stem.swimlab.cold_second_try', 'found after another try')));
              })),
            first < 3 && h('p', { style: { margin: '8px 0 0', fontSize: 13, color: T.muted } }, __alloT('stem.swimlab.cold_retry_note', 'Run it again and aim for three safe first choices.')),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 } },
              h('button', { type: 'button', onClick: function() { upd('coldLab', { sc: sc.id, stage: 0, tries: {} }); wsAnnounce(__alloT('stem.swimlab.sr_new_run', 'New run started.')); }, style: btnPrimary({ fontSize: 14 }) }, __alloT('stem.swimlab.run_again', 'Run it again'))));
        } else {
          var st = stages[stage];
          var mine = triesAt(stage);
          var isSolved = solved(stage);
          var last = mine.length ? optOf(stage, mine[mine.length - 1]) : null;
          panel = h('div', { style: labCard({ border: '2px solid ' + T.accent }) },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: T.accentHi, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 } },
              swFill(__alloT('stem.swimlab.cold_step_of', 'Decision {n} of 3: {label}'), { n: stage + 1, label: STAGE_LABELS[stage].big })),
            h('p', { style: { margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.45 } }, st.ask),
            h('div', { style: { display: 'grid', gap: 8 } },
              swOptionOrder('cold-' + sc.id + '-' + stage, st.opts.length).map(function(oi) {
                var o = st.opts[oi];
                var tried = mine.indexOf(o.act) !== -1;
                var isBest = o.act === swColdBest(sc.id, stage);
                var style = btn({ fontSize: 14 });
                if (tried && isBest) style = Object.assign({}, style, { background: '#14532d', borderColor: T.ok, color: '#bbf7d0' });
                else if (tried) style = Object.assign({}, style, { background: '#7c2d12', borderColor: '#c2410c', color: '#fed7aa' });
                return h('button', { key: o.act, type: 'button', 'data-cold-act': o.act, disabled: tried || isSolved, onClick: function() { pick(o.act); }, style: style },
                  tried ? h('span', { 'aria-hidden': 'true' }, isBest ? '✓ ' : '✗ ') : null, o.t);
              })),
            last && h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + (isSolved ? T.ok : T.warn), fontSize: 14, color: T.text, lineHeight: 1.5 } },
              h('strong', { style: { color: isSolved ? T.ok : T.warn } }, isSolved ? __alloT('stem.swimlab.safe_choice', 'Safe choice. ') : __alloT('stem.swimlab.not_safe_choice', 'Not the safe choice. ')),
              last.why,
              !isSolved && h('div', { style: { marginTop: 4, color: T.muted, fontSize: 13 } }, __alloT('stem.swimlab.cold_choose_again', 'Choose again.'))),
            isSolved && h('button', { type: 'button', 'data-cold-next': '1', onClick: goNext, style: btnPrimary({ fontSize: 14, marginTop: 10 }) },
              stage < 2 ? __alloT('stem.swimlab.cold_next', 'Next: move along the timeline') : __alloT('stem.swimlab.cold_finish', 'See my result')));
        }

        return labFrame('coldLab', h('div', null,
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.cold_lab_intro', 'Cold water gives you 1 minute to control your breathing, about 10 minutes of useful arm and hand strength, and about 1 hour before unconsciousness. Make the safe choice at each step.')),
          h('div', { role: 'group', 'aria-label': __alloT('stem.swimlab.cold_pick_scenario', 'Choose a situation'), style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 } },
            SW_COLD.scenarios.map(function(s) {
              var on = s.id === sc.id;
              var res = _isPlainObj(labResults.cold) ? labResults.cold[s.id] : null;
              return h('button', { key: s.id, type: 'button', 'aria-pressed': on ? 'true' : 'false',
                onClick: function() { if (!on) { upd('coldLab', { sc: s.id, stage: 0, tries: {} }); wsAnnounce(SC_NAMES[s.id]); } },
                style: btn({ fontSize: 13, fontWeight: 800, padding: '8px 12px', borderWidth: 2, borderColor: on ? T.accent : T.border, background: on ? T.cardAlt : T.card }) },
                SC_NAMES[s.id] + (res && res.firstTry === 3 ? ' ✓' : ''));
            })),
          h('div', { style: labCard({ marginBottom: 12 }) },
            h('p', { style: { margin: '0 0 10px', fontSize: 15, color: T.text, lineHeight: 1.5 } }, SETUP[sc.id]),
            timeline,
            h('ul', { style: { margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.6 } },
              body.map(function(b, i) { return h('li', { key: i }, b); }))),
          panel
        ));
      }

      // ─────────────────────────────────────────
      // LAB — RESCUE LADDER (reach / throw / row / don't go)
      // ─────────────────────────────────────────
      function renderRescueLab() {
        var raw = _isPlainObj(d.rescueLab) ? d.rescueLab : {};
        var round = (Number.isInteger(raw.round) && raw.round >= 0) ? raw.round : 0;
        var ids = swRescueRound(round);
        var ACTS = ['reach', 'throw', 'row', 'dontgo', 'swim'];
        var picks = Array.isArray(raw.picks) ? raw.picks.filter(function(a) { return ACTS.indexOf(a) !== -1; }).slice(0, ids.length) : [];
        var i = (Number.isInteger(raw.i) && raw.i >= 0 && raw.i <= ids.length) ? raw.i : 0;
        if (picks.length < i || picks.length > i + 1) { i = 0; picks = []; }
        function setLab(patch) { upd('rescueLab', Object.assign({ round: round, i: i, picks: picks }, patch)); }
        var total = ids.length;

        var ACT_NAMES = {
          reach: __alloT('stem.swimlab.rescue_reach', 'Reach: hold something out from solid ground'),
          'throw': __alloT('stem.swimlab.rescue_throw', 'Throw: toss them something that floats'),
          row: __alloT('stem.swimlab.rescue_row', 'Row: take the boat out to them'),
          dontgo: __alloT('stem.swimlab.rescue_dontgo', 'Do not go in: get help from where I am'),
          swim: __alloT('stem.swimlab.rescue_swim', 'Swim out to them and bring them back')
        };
        var SCENES = {
          pool:   { place: __alloT('stem.swimlab.rescue_pool_place', 'pool deck'),  items: [__alloT('stem.swimlab.rescue_item_noodle', 'pool noodle')], ang: 112,
            text: __alloT('stem.swimlab.rescue_pool', 'A small child slips into a pool, 4 feet from the edge where you stand. A pool noodle is on the deck. No lifeguard is in sight.'),
            doIt: __alloT('stem.swimlab.rescue_pool_do', 'Lie down on the deck so you cannot be pulled in. Hold out the noodle and pull them to the edge.') },
          dock:   { place: __alloT('stem.swimlab.rescue_dock_place', 'dock'),       items: [__alloT('stem.swimlab.rescue_item_towel', 'beach towel')], ang: 68,
            text: __alloT('stem.swimlab.rescue_dock', 'A swimmer is in trouble just past arm\'s reach from a dock. You have a beach towel. Nothing else is nearby.'),
            doIt: __alloT('stem.swimlab.rescue_dock_do', 'Lie flat on the dock. Hold one end of the towel and swing the other end to them. Pull them in hand over hand.') },
          beach:  { place: __alloT('stem.swimlab.rescue_beach_place', 'lake beach'), items: [__alloT('stem.swimlab.rescue_item_throwbag', 'throw rope')], ang: 58,
            text: __alloT('stem.swimlab.rescue_beach', 'A swimmer is struggling about 30 feet from a lake beach. That is too far to reach. A rescue throw rope hangs on a post. There is no boat.'),
            doIt: __alloT('stem.swimlab.rescue_beach_do', 'Throw the rope just past them and pull it back to them. Shout: grab this and kick your feet.') },
          river:  { place: __alloT('stem.swimlab.rescue_river_place', 'river bank'), items: [__alloT('stem.swimlab.rescue_item_ring', 'ring buoy')], ang: 122,
            text: __alloT('stem.swimlab.rescue_river', 'Someone has fallen into a slow river, about 25 feet from the bank. That is too far to reach. A ring buoy hangs on a post beside you.'),
            doIt: __alloT('stem.swimlab.rescue_river_do', 'Throw the ring buoy just past them and pull it back to them. Shout: grab this and kick your feet.') },
          lake:   { place: __alloT('stem.swimlab.rescue_lake_place', 'lake beach'),  items: [__alloT('stem.swimlab.rescue_item_rowboat', 'rowboat'), __alloT('stem.swimlab.rescue_item_cushion', 'float cushion')], ang: 96,
            text: __alloT('stem.swimlab.rescue_lake', 'A swimmer is in trouble far out in a lake. It is much too far to throw anything. A rowboat with oars is on the beach.'),
            doIt: __alloT('stem.swimlab.rescue_lake_do', 'Row out with the front of the boat toward them. Have them hold the back of the boat, not the side, and tow them in.') },
          pond:   { place: __alloT('stem.swimlab.rescue_pond_place', 'pond bank'),   items: [__alloT('stem.swimlab.rescue_item_kayak', 'kayak and paddle')], ang: 74,
            text: __alloT('stem.swimlab.rescue_pond', 'A teenager is struggling about 30 feet from shore in a pond. That is too far to reach, and there is nothing to throw. A kayak and paddle are on the bank.'),
            doIt: __alloT('stem.swimlab.rescue_pond_do', 'Paddle the kayak out. Have them hold the back of it, not the side, and tow them to shore.') },
          surf:   { place: __alloT('stem.swimlab.rescue_surf_place', 'ocean beach'), items: [__alloT('stem.swimlab.rescue_item_tower', 'lifeguard tower')], ang: 102,
            text: __alloT('stem.swimlab.rescue_surf', 'At an ocean beach, a swimmer is being carried far out. It is much too far to throw anything, and there is no boat. A lifeguard tower is down the beach.'),
            doIt: __alloT('stem.swimlab.rescue_surf_do', 'Stay out of the water. Alert the lifeguard and call 911. Tell them exactly where the swimmer is.') },
          ice:    { place: __alloT('stem.swimlab.rescue_ice_place', 'solid ice'),    items: [__alloT('stem.swimlab.rescue_item_rope', 'long rope')], ang: 64,
            text: __alloT('stem.swimlab.rescue_ice', 'A skater has fallen through pond ice. You are on solid ice, too far away to reach them. A long rope is in the truck beside you.'),
            doIt: __alloT('stem.swimlab.rescue_ice_do', 'Throw the rope from solid ice. Do not walk up to the hole: that ice has just shown it cannot hold weight.') },
          quarry: { place: __alloT('stem.swimlab.rescue_quarry_place', 'rock edge'), items: [], ang: 116,
            text: __alloT('stem.swimlab.rescue_quarry', 'A swimmer is struggling about 40 feet from the rocky edge of a quarry pond. That is too far to reach. You have nothing to throw, and there is no boat.'),
            doIt: __alloT('stem.swimlab.rescue_quarry_do', 'Stay out of the water. Call 911 and tell them exactly where you are. Stay on the line until they tell you to hang up.') }
        };
        var WHY = {
          swim: __alloT('stem.swimlab.rescue_why_swim', 'Do not swim out. A panicked person grabs anything that floats, including you, and pushes it under. Without lifeguard training you become the second person in trouble.'),
          tooFarReach: __alloT('stem.swimlab.rescue_why_reach', 'They are too far away to reach from solid ground.'),
          tooFarThrow: __alloT('stem.swimlab.rescue_why_throw_far', 'They are too far away for a throw to get there.'),
          nothingToThrow: __alloT('stem.swimlab.rescue_why_throw_none', 'There is nothing here that floats and can be thrown.'),
          noBoat: __alloT('stem.swimlab.rescue_why_row', 'There is no boat here.'),
          earlierRung: __alloT('stem.swimlab.rescue_why_earlier', 'That could work, but the ladder goes in order: reach first, then throw, then row. Use the first step the scene allows.'),
          canHelp: __alloT('stem.swimlab.rescue_why_canhelp', 'You are right to stay out of the water. But here you can still help from where you are.')
        };
        var RUNG = {
          reach: __alloT('stem.swimlab.rescue_rung_reach', 'Reach'), 'throw': __alloT('stem.swimlab.rescue_rung_throw', 'Throw'),
          row: __alloT('stem.swimlab.rescue_rung_row', 'Row'), dontgo: __alloT('stem.swimlab.rescue_rung_dontgo', 'Do not go in')
        };
        var ALWAYS = __alloT('stem.swimlab.rescue_always', 'And always: call 911, or point at one person and say "YOU, call 911."');


        var panel;
        if (i >= total) {
          var grade = swRescueGrade(ids, picks);
          var score = grade.score;
          var pass = grade.pass;
          panel = h('div', { style: labCard({ border: '2px solid ' + (pass ? T.ok : T.warn) }) },
            h('div', { style: { fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6 } },
              swFill(__alloT('stem.swimlab.rescue_result', 'Safe first choices: {n} of {t}'), { n: score, t: total })),
            h('ol', { style: { margin: 0, paddingLeft: 20, fontSize: 14, color: T.text, lineHeight: 1.6 } },
              ids.map(function(id, k) {
                var best = swRescueBest(swRescueScene(id));
                var ok = picks[k] === best;
                return h('li', { key: id },
                  SCENES[id].place + ': ', h('strong', null, RUNG[best]), ' ',
                  h('span', { style: { color: ok ? T.ok : T.warn, fontWeight: 700 } }, ok ? '✓' : swFill(__alloT('stem.swimlab.rescue_you_chose', '(you chose: {a})'), { a: ACT_NAMES[picks[k]] })));
              })),
            h('p', { style: { margin: '8px 0 0', fontSize: 13, color: T.muted, lineHeight: 1.5 } },
              pass ? __alloT('stem.swimlab.rescue_pass', 'You used the ladder: the first safe step each scene allowed, and never the water.')
                : (grade.swam > 0
                  ? (grade.swam === 1
                    ? __alloT('stem.swimlab.rescue_retry_swam_once', 'You chose to swim out once. That is the choice that turns one emergency into two. A pass needs 5 safe choices and no swimming out.')
                    : swFill(__alloT('stem.swimlab.rescue_retry_swam_many', 'You chose to swim out {n} times. That is the choice that turns one emergency into two. A pass needs 5 safe choices and no swimming out.'), { n: grade.swam }))
                  : __alloT('stem.swimlab.rescue_retry', 'Aim for 5 of 6. Read each scene for two things: how far away they are, and what you have.'))),
            h('button', { type: 'button', onClick: function() { upd('rescueLab', { round: round + 1, i: 0, picks: [] }); wsAnnounce(__alloT('stem.swimlab.sr_new_round', 'New round. Scene 1.')); }, style: btnPrimary({ fontSize: 14, marginTop: 10 }) },
              __alloT('stem.swimlab.rescue_new_round', 'New round, new scenes')));
        } else {
          var scene = swRescueScene(ids[i]);
          var S = SCENES[scene.id];
          var best = swRescueBest(scene);
          var answered = picks.length > i;
          var mine = answered ? picks[i] : null;
          function choose(a) {
            if (answered) return;
            var np = picks.concat([a]);
            setLab({ picks: np });
            var why = swRescueWhy(scene, a);
            wsAnnounce((why === 'ok' ? __alloT('stem.swimlab.sr_safe_choice', 'Safe choice. ') : __alloT('stem.swimlab.sr_not_safe_choice', 'Not the safe choice. ') + WHY[why] + ' ') + S.doIt);
          }
          function next() {
            var ni = i + 1;
            setLab({ i: ni });
            if (ni < total) { wsAnnounce(swFill(__alloT('stem.swimlab.sr_scene_n', 'Scene {n} of {t}.'), { n: ni + 1, t: total })); return; }
            var grade = swRescueGrade(ids, picks);
            wsAnnounce(swFill(__alloT('stem.swimlab.sr_rescue_done', 'Round finished. Safe first choices: {n} of {t}.'), { n: grade.score, t: total }));
            var prev = _isPlainObj(labResults.rescue) ? labResults.rescue : null;
            var prevPass = !!(prev && prev.pass === true);
            var prevBest = prev ? Number(prev.best) || 0 : -1;
            // Keep the best round; a passing round always outranks one that did not pass.
            if ((grade.pass && !prevPass) || (grade.pass === prevPass && grade.score > prevBest)) {
              saveLabResult('rescue', null, { best: grade.score, of: total, swam: grade.swam, pass: grade.pass, at: new Date().toISOString() });
              if (grade.pass && !prevPass) {
                if (awardXP) { try { awardXP('swimLab', 15, 'Rescue Ladder: 5 of 6 safe choices'); } catch (_) {} }
                awardBadge('lab_rescue', 'Rescue Ladder: 5 of 6 safe choices');
              }
            }
          }
          // Scene from above: you on solid ground, a reach ring and a throw ring.
          var cx = 180, cy = 150, rReach = 34, rThrow = 92;
          var dist = scene.band === 'reach' ? 24 : (scene.band === 'throw' ? 68 : 128);
          var rad = S.ang * Math.PI / 180;
          var px = cx + dist * Math.cos(rad), py = cy - dist * Math.sin(rad);
          var cInk = isContrast ? '#ffffff' : '#f8fafc';
          var ground = scene.id === 'ice' ? (isContrast ? '#111111' : '#e2e8f0') : (scene.id === 'pool' || scene.id === 'dock' || scene.id === 'quarry' ? (isContrast ? '#111111' : '#94a3b8') : (isContrast ? '#111111' : '#d6b685'));
          var chipX = 10;
          var svg = h('svg', { viewBox: '0 0 360 204', role: 'img',
            'aria-label': swFill(__alloT('stem.swimlab.rescue_scene_aria', 'Scene from above. You stand on the {place}. The person in the water is {where}. Nearby: {items}.'), {
              place: S.place,
              where: scene.band === 'reach' ? __alloT('stem.swimlab.rescue_where_reach', 'inside the reach ring') : (scene.band === 'throw' ? __alloT('stem.swimlab.rescue_where_throw', 'past the reach ring but inside the throw ring') : __alloT('stem.swimlab.rescue_where_far', 'far outside the throw ring')),
              items: S.items.length ? S.items.join(', ') : __alloT('stem.swimlab.rescue_items_none', 'nothing') }),
            style: { width: '100%', height: 'auto', display: 'block', borderRadius: 10, border: isContrast ? '2px solid #ffff00' : '1px solid ' + T.border } },
            h('rect', { x: 0, y: 0, width: 360, height: 204, fill: isContrast ? '#000000' : '#0e7490' }),
            h('rect', { x: 0, y: cy, width: 360, height: 204 - cy, fill: ground }),
            h('path', { d: 'M' + (cx - rThrow) + ',' + cy + ' A' + rThrow + ',' + rThrow + ' 0 0 1 ' + (cx + rThrow) + ',' + cy, fill: isContrast ? 'none' : 'rgba(255,255,255,0.08)', stroke: cInk, strokeWidth: 1.6, strokeDasharray: '6 5' }),
            h('path', { d: 'M' + (cx - rReach) + ',' + cy + ' A' + rReach + ',' + rReach + ' 0 0 1 ' + (cx + rReach) + ',' + cy, fill: isContrast ? 'none' : 'rgba(255,255,255,0.14)', stroke: cInk, strokeWidth: 1.6, strokeDasharray: '3 3' }),
            h('text', { x: cx - rReach - 5, y: cy - 6, textAnchor: 'end', fill: cInk, fontSize: 13, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }, __alloT('stem.swimlab.rescue_ring_reach', 'reach')),
            h('text', { x: cx - rThrow - 5, y: cy - 6, textAnchor: 'end', fill: cInk, fontSize: 13, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }, __alloT('stem.swimlab.rescue_ring_throw', 'throw')),
            // The person in the water: a plain marker with ripples.
            h('circle', { cx: px, cy: py, r: 13, fill: 'none', stroke: cInk, strokeWidth: 1, opacity: 0.6 }),
            h('circle', { cx: px, cy: py, r: 6.5, fill: isContrast ? '#ffff00' : '#fef08a', stroke: '#0f172a', strokeWidth: 1.8 }),
            h('text', { x: px + (px > 250 ? -16 : 16), y: py + 5, textAnchor: px > 250 ? 'end' : 'start', fill: cInk, fontSize: 13, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, __alloT('stem.swimlab.rescue_person', 'person')),
            // You, on solid ground, and what is nearby.
            h('circle', { cx: cx, cy: cy + 2, r: 7, fill: isContrast ? '#00ffff' : '#0369a1', stroke: '#ffffff', strokeWidth: 2 }),
            h('text', { x: cx + 12, y: cy + 16, fill: isContrast ? '#ffffff' : '#0f172a', fontSize: 13, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, __alloT('stem.swimlab.rescue_you', 'you') + ' (' + S.place + ')'),
            (S.items.length ? S.items : [__alloT('stem.swimlab.rescue_items_none_chip', 'nothing nearby')]).map(function(it, k) {
              var w = Math.max(60, it.length * 7.6 + 18);
              var x = chipX; chipX += w + 8;
              return h('g', { key: k },
                h('rect', { x: x, y: 174, width: w, height: 24, rx: 6, fill: isContrast ? '#000000' : '#ffffff', stroke: isContrast ? '#ffff00' : '#0f172a', strokeWidth: 1.4 }),
                h('text', { x: x + w / 2, y: 191, textAnchor: 'middle', fill: isContrast ? '#ffff00' : '#0f172a', fontSize: 13, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }, it));
            }));
          var whyCode = answered ? swRescueWhy(scene, mine) : null;
          panel = h('div', { className: 'swimlab-lab-grid' },
            h('div', { style: labCard({ padding: 8 }) }, svg),
            h('div', { style: labCard({ border: '2px solid ' + T.accent }) },
              h('div', { style: { fontSize: 12, fontWeight: 800, color: T.accentHi, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 } },
                swFill(__alloT('stem.swimlab.rescue_scene_of', 'Scene {n} of {t}'), { n: i + 1, t: total })),
              h('p', { style: { margin: '0 0 8px', fontSize: 15, color: T.text, lineHeight: 1.5 } }, S.text),
              h('p', { style: { margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: T.text } }, __alloT('stem.swimlab.rescue_ask', 'You are not a trained lifeguard. What do you do?')),
              h('div', { style: { display: 'grid', gap: 8 } },
                swOptionOrder('rescue-' + scene.id, ACTS.length).map(function(oi) {
                  var a = ACTS[oi];
                  var style = btn({ fontSize: 14 });
                  if (answered && a === best) style = Object.assign({}, style, { background: '#14532d', borderColor: T.ok, color: '#bbf7d0' });
                  else if (answered && a === mine) style = Object.assign({}, style, { background: '#7c2d12', borderColor: '#c2410c', color: '#fed7aa' });
                  return h('button', { key: a, type: 'button', 'data-rescue-act': a, disabled: answered, onClick: function() { choose(a); }, style: style },
                    answered && a === best ? h('span', { 'aria-hidden': 'true' }, '✓ ') : null,
                    answered && a === mine && a !== best ? h('span', { 'aria-hidden': 'true' }, '✗ ') : null,
                    ACT_NAMES[a]);
                })),
              answered && h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + (whyCode === 'ok' ? T.ok : T.warn), fontSize: 14, color: T.text, lineHeight: 1.5 } },
                h('strong', { style: { color: whyCode === 'ok' ? T.ok : T.warn } }, whyCode === 'ok' ? __alloT('stem.swimlab.safe_choice', 'Safe choice. ') : __alloT('stem.swimlab.not_safe_choice', 'Not the safe choice. ')),
                whyCode !== 'ok' ? WHY[whyCode] + ' ' : null,
                h('strong', null, RUNG[best] + ': '), S.doIt,
                h('div', { style: { marginTop: 4, color: T.muted, fontSize: 13 } }, ALWAYS)),
              answered && h('button', { type: 'button', 'data-rescue-next': '1', onClick: next, style: btnPrimary({ fontSize: 14, marginTop: 10 }) },
                i + 1 < total ? __alloT('stem.swimlab.rescue_next', 'Next scene') : __alloT('stem.swimlab.rescue_finish', 'See my result'))));
        }

        return labFrame('rescueLab', h('div', null,
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.rescue_lab_intro', 'Someone is in trouble in the water. The rescue ladder goes in order: Reach, Throw, Row, and if none of those is possible, Do not go in. Pick the first step each scene allows.')),
          panel
        ));
      }

      // ─────────────────────────────────────────
      // LAB — WHY YOU FLOAT (buoyancy and the life jacket)
      // ─────────────────────────────────────────
      function renderFloatLab() {
        var raw = _isPlainObj(d.floatLab) ? d.floatLab : {};
        var predicted = ['lighter', 'space', 'thicker'].indexOf(raw.predicted) !== -1 ? raw.predicted : null;
        var clampInt = function(v, lo, hi, fb) { var n = (typeof v === 'number' && isFinite(v)) ? Math.round(v) : fb; return Math.max(lo, Math.min(hi, n)); };
        var air = clampInt(raw.air, 0, SW_FLOAT.airMaxL, SW_FLOAT.airMaxL);
        var foam = clampInt(raw.foam, 0, SW_FLOAT.foamMaxL, 0);
        var checked = (_isPlainObj(raw.checked) && raw.checked.air === air && raw.checked.foam === foam) ? raw.checked : null;
        var f = swFloat(air, foam);
        var found = _isPlainObj(labResults['float']) && labResults['float'].found === true;
        function setLab(patch) { upd('floatLab', Object.assign({ predicted: predicted, air: air, foam: foam, checked: checked }, patch)); }

        var PRED = {
          lighter: __alloT('stem.swimlab.float_pred_lighter', 'The vest makes their body weigh less'),
          space: __alloT('stem.swimlab.float_pred_space', 'The vest makes them take up more space'),
          thicker: __alloT('stem.swimlab.float_pred_thicker', 'The vest makes the water around them thicker')
        };
        function readout(r) {
          if (r.floats) return swFill(__alloT('stem.swimlab.float_read_floats', 'Floats. The water can push up with {p} kg and the swimmer weighs {m} kg: {s} kg to spare. About {pct}% of the swimmer rides above the water.'), { p: r.pushKg, m: r.massKg, s: r.spareKg, pct: r.abovePct });
          if (r.level) return swFill(__alloT('stem.swimlab.float_read_level', 'Just level. The up-push and the weight are both {m} kg. The swimmer hangs at the surface with nothing above it.'), { m: r.massKg });
          return swFill(__alloT('stem.swimlab.float_read_sinks', 'Sinks slowly. The water can only push up with {p} kg and the swimmer weighs {m} kg: {s} kg short. They would have to swim to stay up.'), { p: r.pushKg, m: r.massKg, s: Math.abs(r.spareKg) });
        }

        var body = null;
        if (!predicted) {
          body = predictCard(
            __alloT('stem.swimlab.float_predict_q', 'A swimmer breathes all the way out and sinks just under the surface. Then they put on a foam vest that weighs almost nothing. Now they float. Why?'),
            [{ id: 'lighter', text: PRED.lighter }, { id: 'space', text: PRED.space }, { id: 'thicker', text: PRED.thicker }],
            'float-predict', function(id) { setLab({ predicted: id }); wsAnnounce(__alloT('stem.swimlab.sr_prediction_saved', 'Prediction saved. Now test it.')); });
        } else {
          var minFoam = swFloatMinFoam(0);
          var before = swFloat(0, 0), after = swFloat(0, minFoam);
          // Side view: water line at y = 78. The swimmer is 130 px tall.
          var surf = 78, tall = 130;
          var topY = f.floats ? surf - (f.abovePct / 100) * tall : (f.level ? surf : surf + Math.min(44, Math.abs(f.spareKg) * 7));
          var bx = 96;
          var cInk = isContrast ? '#ffffff' : '#0f172a';
          var barBase = 196, kgPx = 1.9;
          var wH = f.massKg * kgPx, pH = f.pushKg * kgPx;
          var svg = h('svg', { viewBox: '0 0 360 236', role: 'img', 'aria-label': readout(f),
            style: { width: '100%', height: 'auto', display: 'block', borderRadius: 10, border: isContrast ? '2px solid #ffff00' : '1px solid ' + T.border } },
            h('rect', { x: 0, y: 0, width: 360, height: surf, fill: isContrast ? '#000000' : '#e0f2fe' }),
            h('rect', { x: 0, y: surf, width: 360, height: 236 - surf, fill: isContrast ? '#000000' : '#0e7490' }),
            h('line', { x1: 0, y1: surf, x2: 360, y2: surf, stroke: isContrast ? '#00ffff' : '#f0f9ff', strokeWidth: 2.5 }),
            h('text', { x: 8, y: surf - 8, fill: isContrast ? '#ffffff' : '#0f172a', fontSize: 13, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }, __alloT('stem.swimlab.float_surface', 'water line')),
            h('g', { className: 'sw-swimmer', style: { transform: 'translate(0px,' + topY.toFixed(1) + 'px)' } },
              h('rect', { x: bx - 20, y: 24, width: 40, height: tall - 24, rx: 16, fill: isContrast ? '#ffffff' : '#fde68a', stroke: '#0f172a', strokeWidth: 1.8 }),
              h('circle', { cx: bx, cy: 13, r: 13, fill: isContrast ? '#ffffff' : '#fde68a', stroke: '#0f172a', strokeWidth: 1.8 }),
              air > 0 && h('ellipse', { cx: bx, cy: 52, rx: 5 + air * 1.8, ry: 7 + air * 1.6, fill: isContrast ? '#00ffff' : '#bae6fd', stroke: '#0f172a', strokeWidth: 1 }),
              foam > 0 && h('rect', { x: bx - 26, y: 70, width: 52, height: 6 + foam * 5, rx: 5, fill: isContrast ? '#ffff00' : '#f97316', stroke: '#0f172a', strokeWidth: 1.4, opacity: 0.92 })),
            // Weight against up-push, both in kilograms, on their own dark panel.
            h('rect', { x: 192, y: 40, width: 152, height: 194, rx: 8, fill: isContrast ? '#000000' : '#082f49', stroke: isContrast ? '#ffff00' : 'rgba(186,230,253,0.5)', strokeWidth: 1, opacity: 0.94 }),
            h('rect', { x: 206, y: barBase - wH, width: 46, height: wH, fill: isContrast ? '#ff6b6b' : '#fdba74', stroke: cInk, strokeWidth: 1.2 }),
            h('rect', { x: 282, y: barBase - pH, width: 46, height: pH, fill: isContrast ? '#00ff66' : '#7dd3fc', stroke: cInk, strokeWidth: 1.2 }),
            h('text', { x: 229, y: barBase - wH - 6, textAnchor: 'middle', fill: '#ffffff', fontSize: 14, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, f.massKg + ' kg'),
            h('text', { x: 305, y: barBase - pH - 6, textAnchor: 'middle', fill: '#ffffff', fontSize: 14, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, f.pushKg + ' kg'),
            h('text', { x: 229, y: 214, textAnchor: 'middle', fill: '#f8fafc', fontSize: 13, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }, __alloT('stem.swimlab.float_bar_weight', 'weight')),
            h('text', { x: 229, y: 229, textAnchor: 'middle', fill: '#f8fafc', fontSize: 13, fontFamily: 'system-ui, sans-serif' }, __alloT('stem.swimlab.float_bar_down', 'pulls down')),
            h('text', { x: 305, y: 214, textAnchor: 'middle', fill: '#f8fafc', fontSize: 13, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }, __alloT('stem.swimlab.float_bar_push', 'up-push')),
            h('text', { x: 305, y: 229, textAnchor: 'middle', fill: '#f8fafc', fontSize: 13, fontFamily: 'system-ui, sans-serif' }, __alloT('stem.swimlab.float_bar_up', 'pushes up')));

          function slider(id, label, value, max, unit, onSet) {
            return h('div', null,
              h('label', { htmlFor: id, style: { display: 'block', fontSize: 14, fontWeight: 700, color: T.text } }, label + ': ', h('span', { style: { color: T.accentHi } }, value + ' ' + unit)),
              h('input', { id: id, type: 'range', min: 0, max: max, step: 1, value: value, onChange: function(e) { onSet(parseInt(e.target.value, 10) || 0); }, style: { width: '100%', height: 44, margin: 0 } }));
          }
          var checkMsg = null, checkOk = false;
          if (checked) {
            if (checked.air !== 0) checkMsg = __alloT('stem.swimlab.float_check_air', 'For this challenge the lungs must be empty. Set the air to 0 liters first.');
            else if (!swFloat(0, checked.foam).floats) checkMsg = swFill(__alloT('stem.swimlab.float_check_low', 'Not floating yet with {f} liters of foam: {s} kg short. Add foam.'), { f: checked.foam, s: Math.abs(swFloat(0, checked.foam).spareKg) });
            else if (checked.foam > minFoam) checkMsg = swFill(__alloT('stem.swimlab.float_check_high', '{f} liters floats the swimmer, but a smaller block also works. Try less foam.'), { f: checked.foam });
            else { checkOk = true; checkMsg = swFill(__alloT('stem.swimlab.float_check_ok', 'Yes: {f} liters. The body takes up {b} liters and weighs {m} kg, so it needs to push aside more than {m} liters of water. {b} + {f} = {v} liters.'), { f: minFoam, b: SW_FLOAT.bodyL, m: SW_FLOAT.massKg, v: SW_FLOAT.bodyL + minFoam }); }
          }
          body = h('div', null,
            h('div', { style: labCard({ marginBottom: 12, border: '1px solid ' + (predicted === 'space' ? T.ok : T.warn) }) },
              h('p', { style: { margin: 0, fontSize: 14, color: T.text, lineHeight: 1.55 } },
                h('strong', null, __alloT('stem.swimlab.you_predicted', 'You predicted: ')), PRED[predicted] + '. ',
                predicted === 'space' ? __alloT('stem.swimlab.float_pred_right', 'The model agrees. ')
                  : (predicted === 'lighter' ? __alloT('stem.swimlab.float_pred_lighter_no', 'Check the numbers: the weight does not change. ') : __alloT('stem.swimlab.float_pred_thicker_no', 'The water stays the same. What changes is how much of it gets pushed aside. ')),
                swFill(__alloT('stem.swimlab.float_pred_numbers', 'The swimmer weighs {m} kg before and after. With empty lungs the body takes up {v0} liters, so it can push aside only {v0} kg of water (1 liter of water weighs 1 kg): it sinks. Add {f} liters of foam and it takes up {v1} liters. Now the water pushes up with {v1} kg, more than the weight: it floats.'),
                  { m: before.massKg, v0: before.volL, f: minFoam, v1: after.volL }))),
            h('div', { className: 'swimlab-lab-grid' },
              h('div', { style: labCard({ padding: 8 }) }, svg),
              h('div', { style: { display: 'grid', gap: 12, alignContent: 'start' } },
                h('div', { style: labCard() },
                  slider('sw-float-air', __alloT('stem.swimlab.float_air', 'Air in the lungs'), air, SW_FLOAT.airMaxL, __alloT('stem.swimlab.liters', 'liters'), function(v) { setLab({ air: v, checked: null }); }),
                  slider('sw-float-foam', __alloT('stem.swimlab.float_foam', 'Foam block'), foam, SW_FLOAT.foamMaxL, __alloT('stem.swimlab.liters', 'liters'), function(v) { setLab({ foam: v, checked: null }); }),
                  h('p', { 'aria-live': 'polite', style: { margin: '6px 0 0', fontSize: 14, color: T.text, lineHeight: 1.5, minHeight: 63 } }, readout(f)),
                  h('p', { style: { margin: '6px 0 0', fontSize: 13, color: T.muted, lineHeight: 1.5 } },
                    swFill(__alloT('stem.swimlab.float_space', 'Space taken up: {b} (body) + {a} (air) + {f} (foam) = {v} liters.'), { b: SW_FLOAT.bodyL, a: air, f: foam, v: f.volL }))),
                h('div', { style: labCard({ border: '2px solid ' + (found ? T.ok : T.accent) }) },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: T.accentHi, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 } }, __alloT('stem.swimlab.challenge', 'Challenge') + (found ? ' ✓' : '')),
                  h('p', { style: { margin: '0 0 8px', fontSize: 14, color: T.text, lineHeight: 1.5 } },
                    __alloT('stem.swimlab.float_challenge', 'Breathe all the way out (air 0 liters). What is the smallest foam block that still floats the swimmer? Set the sliders, then check.')),
                  h('button', { type: 'button', 'data-float-check': '1', style: btnPrimary({ fontSize: 14 }),
                    onClick: function() {
                      setLab({ checked: { air: air, foam: foam } });
                      var ok = air === 0 && foam === minFoam;
                      wsAnnounce(ok ? __alloT('stem.swimlab.sr_float_ok', 'Correct. That is the smallest foam block that floats the swimmer.') : __alloT('stem.swimlab.sr_float_no', 'Not yet. Read the hint and try again.'));
                      if (ok && !found) {
                        saveLabResult('float', null, { found: true, foam: minFoam, at: new Date().toISOString() });
                        if (awardXP) { try { awardXP('swimLab', 8, 'Why You Float: smallest foam block'); } catch (_) {} }
                        awardBadge('lab_float', 'Why You Float: smallest foam block');
                      }
                    } }, __alloT('stem.swimlab.check_answer', 'Check my answer')),
                  checkMsg && h('p', { style: { margin: '8px 0 0', fontSize: 14, color: checkOk ? T.ok : T.text, fontWeight: checkOk ? 700 : 400, lineHeight: 1.5 } }, checkMsg)))),
            calloutBox('ok', __alloT('stem.swimlab.float_takeaway_title', 'What a life jacket really does'),
              __alloT('stem.swimlab.float_takeaway', 'A life jacket does not make you lighter. It adds space that weighs almost nothing, so you push aside more water. It keeps you floating when you are tired or cold. Wear it.')),
            h('details', { style: labCard({ marginTop: 12 }) },
              h('summary', { style: { cursor: 'pointer', fontSize: 13, fontWeight: 700, color: T.text, padding: '12px 0' } }, __alloT('stem.swimlab.about_model', 'About this model')),
              h('ul', { style: { margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.6 } },
                h('li', null, __alloT('stem.swimlab.float_model_1', 'Archimedes: you float when the water you push aside weighs more than you do. One liter of water weighs one kilogram.')),
                h('li', null, swFill(__alloT('stem.swimlab.float_model_2', 'Model settings, not measurements of a real person: a {m} kg swimmer whose body takes up {b} liters with empty lungs. Full lungs add {a} liters (the How Swimming Works module says roughly 4 to 6).'), { m: SW_FLOAT.massKg, b: SW_FLOAT.bodyL, a: SW_FLOAT.airMaxL })),
                h('li', null, __alloT('stem.swimlab.float_model_3', 'The foam block is treated as weighing nothing. This lab does not rate real life jackets: always use a US Coast Guard-approved one that fits.')))));
        }

        return labFrame('floatLab', h('div', null,
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.float_lab_intro', 'Why does a person float or sink, and what does a life jacket change? Make a prediction, then test it with air and foam.')),
          body
        ));
      }

      // ─────────────────────────────────────────
      // LAB — STROKE EFFICIENCY (speed, drag, power)
      // ─────────────────────────────────────────
      // Was an invented index (length x 0.5 + kick x 0.3 - |rate - 50| x 0.4)
      // with a chart that labeled the "optimal rate", and a Log button whose
      // rows were never shown. Now every number comes from swStroke(): speed =
      // rate x distance per stroke, drag = k x speed x speed, power = drag x
      // speed. It stays an inquiry notebook: the chart plots the student's OWN
      // logged tries, and the model is only stated after they have logged
      // evidence and written their own explanation (or for a teacher).
      function renderStrokeLab() {
        var rawIq = _isPlainObj(d.strokeHunt) ? d.strokeHunt : {};
        var numIn = function(v, lo, hi, fb) { var n = (typeof v === 'number' && isFinite(v)) ? v : fb; return Math.max(lo, Math.min(hi, n)); };
        var okRow = function(r) { return _isPlainObj(r) && typeof r.spm === 'number' && isFinite(r.spm) && typeof r.dps === 'number' && isFinite(r.dps); };
        var iq = {
          spm: numIn(rawIq.spm, SW_STROKE.spmMin, SW_STROKE.spmMax, 40),
          dps: Math.round(numIn(rawIq.dps, SW_STROKE.dpsMin, SW_STROKE.dpsMax, 1.2) * 10) / 10,
          hipsLow: !!rawIq.hipsLow,
          predicted: ['same', 'x2', 'x4', 'x8'].indexOf(rawIq.predicted) !== -1 ? rawIq.predicted : null,
          hypothesis: typeof rawIq.hypothesis === 'string' ? rawIq.hypothesis : '',
          stuckRevealed: !!rawIq.stuckRevealed,
          understood: !!rawIq.understood,
          explanation: typeof rawIq.explanation === 'string' ? rawIq.explanation : '',
          log: Array.isArray(rawIq.log) ? rawIq.log.filter(okRow).slice(-8) : []
        };
        function setIQ(patch) { upd('strokeHunt', Object.assign({}, iq, patch)); }
        var now = swStroke(iq.spm, iq.dps, iq.hipsLow);
        var rows = iq.log.map(function(r) { return swStroke(r.spm, r.dps, !!r.hipsLow); });
        var PRED = {
          same: __alloT('stem.swimlab.stroke_pred_same', 'About the same'),
          x2: __alloT('stem.swimlab.stroke_pred_x2', '2 times as hard'),
          x4: __alloT('stem.swimlab.stroke_pred_x4', '4 times as hard'),
          x8: __alloT('stem.swimlab.stroke_pred_x8', '8 times as hard')
        };
        var body;
        if (!iq.predicted) {
          body = predictCard(
            __alloT('stem.swimlab.stroke_predict_q', 'A swimmer speeds up until they are going twice as fast. How much harder does the water push back on them?'),
            [{ id: 'same', text: PRED.same }, { id: 'x2', text: PRED.x2 }, { id: 'x4', text: PRED.x4 }, { id: 'x8', text: PRED.x8 }],
            'stroke-predict', function(id) { setIQ({ predicted: id }); wsAnnounce(__alloT('stem.swimlab.sr_prediction_saved', 'Prediction saved. Now test it.')); });
        } else {
          // A pair of logged tries, same body position, one twice as fast as the other.
          var pair = null;
          for (var a = 0; a < rows.length && !pair; a++) {
            for (var b = 0; b < rows.length && !pair; b++) {
              if (a !== b && rows[a].hipsLow === rows[b].hipsLow && rows[a].speed > 0 && Math.abs(rows[b].speed - 2 * rows[a].speed) < 0.005) pair = { slow: a, fast: b };
            }
          }
          var times = function(n) { return (Math.round(n * 10) / 10).toFixed(1); };
          var fmtN = swFmt;
          var earned = (iq.understood && iq.explanation.trim().length >= 40 && rows.length >= 3) || !!ctx.isTeacherMode;
          var cInk = isContrast ? '#ffffff' : '#f8fafc';
          var arrow = Math.min(86, 10 + Math.sqrt(now.drag) * 3.8);
          var flowDur = Math.max(0.5, 2.6 - now.speed * 0.8).toFixed(2) + 's';
          var tank = h('svg', { viewBox: '0 0 360 150', role: 'img',
            'aria-label': swFill(__alloT('stem.swimlab.stroke_tank_aria', 'Side view of a swimmer moving at {v} meters per second with the hips {hips}. The water drags back with {d} newtons, and the swimmer pushes forward with the same {d} newtons to hold that speed.'),
              { v: now.speed.toFixed(2), d: fmtN(now.drag), hips: iq.hipsLow ? __alloT('stem.swimlab.stroke_hips_low_word', 'low') : __alloT('stem.swimlab.stroke_hips_high_word', 'high') }),
            style: { width: '100%', height: 'auto', display: 'block', borderRadius: 10, border: isContrast ? '2px solid #ffff00' : '1px solid ' + T.border } },
            h('defs', null,
              h('marker', { id: 'sw-st-push', markerWidth: 7, markerHeight: 7, refX: 5, refY: 3.5, orient: 'auto' }, h('path', { d: 'M0,0 L0,7 L7,3.5 z', fill: isContrast ? '#00ff66' : '#34d399' })),
              h('marker', { id: 'sw-st-drag', markerWidth: 7, markerHeight: 7, refX: 5, refY: 3.5, orient: 'auto' }, h('path', { d: 'M0,0 L0,7 L7,3.5 z', fill: isContrast ? '#ff6b6b' : '#fb923c' }))),
            h('rect', { x: 0, y: 0, width: 360, height: 150, fill: isContrast ? '#000000' : '#0b3a55' }),
            h('line', { x1: 0, y1: 30, x2: 360, y2: 30, stroke: isContrast ? '#00ffff' : '#bae6fd', strokeWidth: 2 }),
            [46, 84, 98].map(function(yy, k) {
              return h('line', { key: k, className: 'sw-stream-advect', style: { '--sw-flow-dur': flowDur, animationDelay: (-k * 0.3) + 's' }, x1: 350, y1: yy, x2: 10, y2: yy, stroke: isContrast ? '#00ffff' : '#7dd3fc', strokeWidth: 1.4, strokeDasharray: '12 8', opacity: 0.6 });
            }),
            h('g', { transform: iq.hipsLow ? 'rotate(-14 236 62)' : undefined },
              h('ellipse', { cx: 196, cy: 66, rx: 40, ry: 9, fill: isContrast ? '#ffffff' : '#fde68a', stroke: '#0c4a6e', strokeWidth: 1.2 }),
              h('circle', { cx: 242, cy: 62, r: 7.5, fill: isContrast ? '#ffffff' : '#fde68a', stroke: '#0c4a6e', strokeWidth: 1.2 }),
              h('path', { d: 'M236,62 L272,58', stroke: isContrast ? '#ffffff' : '#fde68a', strokeWidth: 4, strokeLinecap: 'round' }),
              h('path', { d: 'M158,64 L122,60 M158,69 L124,74', stroke: isContrast ? '#ffffff' : '#fde68a', strokeWidth: 4, strokeLinecap: 'round' })),
            h('line', { x1: 250, y1: 112, x2: 250 + arrow, y2: 112, stroke: isContrast ? '#00ff66' : '#34d399', strokeWidth: 4, strokeLinecap: 'round', markerEnd: 'url(#sw-st-push)' }),
            h('text', { x: 250, y: 136, fill: cInk, fontSize: 13, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, swFill(__alloT('stem.swimlab.stroke_tank_push', 'push {d} N'), { d: fmtN(now.drag) })),
            h('line', { x1: 150, y1: 112, x2: 150 - arrow, y2: 112, stroke: isContrast ? '#ff6b6b' : '#fb923c', strokeWidth: 4, strokeLinecap: 'round', markerEnd: 'url(#sw-st-drag)' }),
            h('text', { x: 150, y: 136, textAnchor: 'end', fill: cInk, fontSize: 13, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, swFill(__alloT('stem.swimlab.stroke_tank_drag', 'drag {d} N'), { d: fmtN(now.drag) })),
            h('text', { x: 10, y: 20, fill: cInk, fontSize: 13, fontWeight: 700, fontFamily: 'system-ui, sans-serif' },
              iq.hipsLow ? __alloT('stem.swimlab.stroke_tank_low', 'hips low: more of the body faces the water') : __alloT('stem.swimlab.stroke_tank_high', 'hips high: streamlined')));

          var slider = function(id, label, value, min, max, step, shown, key) {
            return h('div', null,
              h('label', { htmlFor: id, style: { display: 'block', fontSize: 14, fontWeight: 700, color: T.text } }, label + ': ', h('span', { style: { color: T.accentHi } }, shown)),
              h('input', { id: id, type: 'range', min: min, max: max, step: step, value: value,
                onChange: function(e) { var pt = {}; pt[key] = parseFloat(e.target.value); setIQ(pt); }, style: { width: '100%', height: 44, margin: 0 } }));
          };
          var PRESETS = [
            { label: __alloT('stem.swimlab.stroke_preset_short', 'Fast, short strokes'), spm: 60, dps: 1.0 },
            { label: __alloT('stem.swimlab.stroke_preset_long', 'Slow, long strokes'), spm: 30, dps: 2.0 },
            { label: __alloT('stem.swimlab.stroke_preset_both', 'Long and quick'), spm: 60, dps: 2.0 }
          ];
          var cDot = isContrast ? '#ffff00' : T.accentHi;
          var yTop = Math.max(100, Math.ceil(Math.max.apply(null, [0].concat(rows.map(function(r) { return r.drag; }))) / 100) * 100);
          var th = { textAlign: 'left', verticalAlign: 'bottom', padding: '4px 4px', fontSize: 12, color: T.muted, borderBottom: '1px solid ' + T.border };
          var td = { padding: '6px 4px', fontSize: 13, color: T.text, borderBottom: '1px solid ' + T.border, whiteSpace: 'nowrap' };
          body = h('div', null,
            h('div', { className: 'swimlab-lab-grid' },
              h('div', { style: { display: 'grid', gap: 12, alignContent: 'start' } },
                h('div', { style: labCard({ padding: 8 }) }, tank,
                  h('p', { style: { margin: '6px 4px 2px', fontSize: 13, color: T.muted, lineHeight: 1.45 } },
                    __alloT('stem.swimlab.stroke_balance', 'To hold a steady speed, the swimmer must push forward exactly as hard as the water drags back.'))),
                h('div', { style: labCard() },
                  lineChart({ title: __alloT('stem.swimlab.stroke_chart_title', 'Your logged tries: drag (N) against speed (m/s)'), xLabel: __alloT('stem.swimlab.stroke_chart_x', 'speed (m/s)'), xMax: 3, xTicks: [0, 1, 2, 3], yMax: yTop,
                    series: [{ dots: true, color: cDot, pts: rows.map(function(r) { return [r.speed, r.drag, r.hipsLow]; }) }],
                    aria: rows.length ? swFill(__alloT('stem.swimlab.stroke_chart_aria', 'Dot chart of your {n} logged tries: drag against speed. '), { n: rows.length }) + rows.map(function(r, k) { return swFill(__alloT('stem.swimlab.stroke_chart_row', 'Try {k}: {v} meters per second, {d} newtons.'), { k: k + 1, v: r.speed.toFixed(2), d: fmtN(r.drag) }); }).join(' ')
                      : __alloT('stem.swimlab.stroke_chart_empty_aria', 'Empty chart. Log a try to plot drag against speed.') }),
                  h('p', { style: { margin: '6px 0 0', fontSize: 13, color: T.muted } },
                    rows.length ? __alloT('stem.swimlab.stroke_chart_key', 'Round dot: hips high. Square: hips low.') : __alloT('stem.swimlab.stroke_chart_empty', 'Nothing logged yet. Set the sliders and press Log this try.')))),
              h('div', { style: { display: 'grid', gap: 12, alignContent: 'start' } },
                h('div', { style: labCard() },
                  h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, alignItems: 'center' } },
                    h('span', { style: { fontSize: 13, fontWeight: 700, color: T.muted } }, __alloT('stem.swimlab.presets_label_v2', 'Try:')),
                    PRESETS.map(function(pr) {
                      return h('button', { key: pr.label, type: 'button', onClick: function() { setIQ({ spm: pr.spm, dps: pr.dps }); }, style: btn({ fontSize: 13, padding: '8px 12px' }) }, pr.label);
                    })),
                  slider('sh-spm', __alloT('stem.swimlab.stroke_rate_v2', 'Stroke rate'), iq.spm, SW_STROKE.spmMin, SW_STROKE.spmMax, 5, swFill(__alloT('stem.swimlab.stroke_rate_unit', '{n} strokes each minute'), { n: iq.spm }), 'spm'),
                  slider('sh-dps', __alloT('stem.swimlab.stroke_dps', 'Distance per stroke'), iq.dps, SW_STROKE.dpsMin, SW_STROKE.dpsMax, 0.1, swFill(__alloT('stem.swimlab.stroke_dps_unit', '{n} meters'), { n: iq.dps.toFixed(1) }), 'dps'),
                  h('label', { style: { display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, fontSize: 14, fontWeight: 700, color: T.text, cursor: 'pointer' } },
                    h('input', { type: 'checkbox', checked: iq.hipsLow, onChange: function(e) { setIQ({ hipsLow: e.target.checked }); }, style: { width: 22, height: 22 } }),
                    __alloT('stem.swimlab.stroke_hips_low', 'Let the hips sink (legs drop low)')),
                  h('div', { 'aria-live': 'polite', style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 8 } },
                    statBox(__alloT('stem.swimlab.stroke_stat_speed', 'Speed'), now.speed.toFixed(2) + ' m/s', swFill(__alloT('stem.swimlab.stroke_stat_speed_sub', '{r} x {l} / 60'), { r: now.spm, l: now.dps.toFixed(1) })),
                    statBox(__alloT('stem.swimlab.stroke_stat_drag', 'Drag'), fmtN(now.drag) + ' N', __alloT('stem.swimlab.stroke_stat_drag_sub', 'the water pushing back')),
                    statBox(__alloT('stem.swimlab.stroke_stat_power', 'Power needed'), fmtN(now.power) + ' W', __alloT('stem.swimlab.stroke_stat_power_sub', 'drag x speed')),
                    statBox(__alloT('stem.swimlab.stroke_stat_lap', 'One 25 m length'), now.lapSec + ' s', swFill(__alloT('stem.swimlab.stroke_stat_lap_sub', '{n} strokes'), { n: now.lapStrokes }))),
                  h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 } },
                    h('button', { type: 'button', 'data-stroke-log': '1', style: btnPrimary({ fontSize: 14 }),
                      onClick: function() { setIQ({ log: iq.log.concat([{ spm: iq.spm, dps: iq.dps, hipsLow: iq.hipsLow }]).slice(-8) }); wsAnnounce(swFill(__alloT('stem.swimlab.sr_stroke_logged', 'Logged: speed {v} meters per second, drag {d} newtons, power {p} watts.'), { v: now.speed.toFixed(2), d: fmtN(now.drag), p: fmtN(now.power) })); } },
                      __alloT('stem.swimlab.log_v2', 'Log this try')),
                    h('button', { type: 'button', style: btn({ fontSize: 14 }),
                      onClick: function() { setIQ({ spm: 40, dps: 1.2, hipsLow: false, predicted: null, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); wsAnnounce(__alloT('stem.swimlab.sr_stroke_reset', 'Lab reset.')); } },
                      __alloT('stem.swimlab.reset', '↺ Reset')))),
                rows.length > 0 && h('div', { style: labCard({ overflowX: 'auto' }) },
                  h('table', { style: { borderCollapse: 'collapse', width: '100%' } },
                    h('caption', { style: { textAlign: 'left', fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 } }, __alloT('stem.swimlab.stroke_log_caption', 'Your log (last 8 tries)')),
                    h('thead', null, h('tr', null,
                      [__alloT('stem.swimlab.stroke_col_try', 'Try'), __alloT('stem.swimlab.stroke_col_rate_u', 'Rate (per min)'), __alloT('stem.swimlab.stroke_col_dps_u', 'Per stroke (m)'), __alloT('stem.swimlab.stroke_col_hips', 'Hips'), __alloT('stem.swimlab.stroke_col_speed_u', 'Speed (m/s)'), __alloT('stem.swimlab.stroke_col_drag_u', 'Drag (N)'), __alloT('stem.swimlab.stroke_col_power_u', 'Power (W)')]
                        .map(function(c, k) { return h('th', { key: k, scope: 'col', style: th }, c); }))),
                    h('tbody', null, rows.map(function(r, k) {
                      return h('tr', { key: k },
                        h('th', { scope: 'row', style: td }, String(k + 1)),
                        h('td', { style: td }, String(r.spm)),
                        h('td', { style: td }, r.dps.toFixed(1)),
                        h('td', { style: td }, r.hipsLow ? __alloT('stem.swimlab.stroke_hips_low_word', 'low') : __alloT('stem.swimlab.stroke_hips_high_word', 'high')),
                        h('td', { style: td }, r.speed.toFixed(2)),
                        h('td', { style: td }, fmtN(r.drag)),
                        h('td', { style: td }, fmtN(r.power)));
                    })))),
                h('div', { style: labCard({ border: '1px solid ' + (pair ? T.ok : T.border) }) },
                  h('strong', { style: { display: 'block', fontSize: 14, color: T.text, marginBottom: 4 } }, __alloT('stem.swimlab.stroke_test_title', 'Test your prediction')),
                  pair
                    ? h('p', { style: { margin: 0, fontSize: 14, color: T.text, lineHeight: 1.5 } },
                        swFill(__alloT('stem.swimlab.stroke_test_pair', 'Tries {a} and {b}: the speed went from {v1} to {v2} m/s (x 2.0). The drag went from {d1} to {d2} N (x {dr}). The power went from {p1} to {p2} W (x {pr}). '),
                          { a: pair.slow + 1, b: pair.fast + 1, v1: rows[pair.slow].speed.toFixed(2), v2: rows[pair.fast].speed.toFixed(2), d1: fmtN(rows[pair.slow].drag), d2: fmtN(rows[pair.fast].drag), dr: times(rows[pair.fast].drag / rows[pair.slow].drag), p1: fmtN(rows[pair.slow].power), p2: fmtN(rows[pair.fast].power), pr: times(rows[pair.fast].power / rows[pair.slow].power) }),
                        h('strong', null, __alloT('stem.swimlab.you_predicted', 'You predicted: ')), PRED[iq.predicted] + '.')
                    : h('p', { style: { margin: 0, fontSize: 14, color: T.muted, lineHeight: 1.5 } },
                        h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.you_predicted', 'You predicted: ')), PRED[iq.predicted] + '. ',
                        __alloT('stem.swimlab.stroke_test_hint', 'To test it, log two tries with the hips the same way, where one speed is exactly double the other.'))))),
            h('div', { style: labCard({ marginTop: 12 }) },
              h('strong', { style: { display: 'block', fontSize: 14, color: T.text, marginBottom: 6 } }, __alloT('stem.swimlab.stroke_notebook', 'Your notebook')),
              h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, 'aria-label': __alloT('stem.swimlab.hypothesis_input', 'Stroke-efficiency hypothesis'), placeholder: __alloT('stem.swimlab.hypothesis_placeholder_v2', 'What pattern do you see between speed, drag and power?'),
                style: { width: '100%', minHeight: 60, padding: 8, background: T.cardAlt, color: T.text, border: '1px solid ' + T.border, borderRadius: 8, fontSize: 14, fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box' }, rows: 2 }),
              !iq.stuckRevealed && h('button', { type: 'button', onClick: function() { setIQ({ stuckRevealed: true }); }, style: btn({ fontSize: 13, marginBottom: 8 }) }, __alloT('stem.swimlab.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
              iq.stuckRevealed && h('ul', { style: { margin: '0 0 8px', paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.6 } },
                h('li', null, __alloT('stem.swimlab.stroke_prompt_1', 'Log the same speed made two ways: fast short strokes, then slow long strokes. What happens to the drag?')),
                h('li', null, __alloT('stem.swimlab.stroke_prompt_2', 'Double the speed. Does the power needed double too?')),
                h('li', null, __alloT('stem.swimlab.stroke_prompt_3', 'Let the hips sink at the same speed. What changes, and by how much?'))),
              h('label', { style: { display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, fontSize: 14, fontWeight: 700, color: T.text, cursor: 'pointer' } },
                h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, style: { width: 22, height: 22 } }),
                __alloT('stem.swimlab.i_understand_explain_v2', 'I see the pattern. I will explain it in my own words.')),
              iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, 'aria-label': __alloT('stem.swimlab.explanation_input', 'Stroke-efficiency explanation'), placeholder: __alloT('stem.swimlab.explanation_placeholder_v2', 'Why does swimming faster cost so much more? Use your numbers.'),
                style: { width: '100%', minHeight: 70, padding: 8, background: T.cardAlt, color: T.text, border: '1px solid ' + T.border, borderRadius: 8, fontSize: 14, fontFamily: 'inherit', marginTop: 6, boxSizing: 'border-box' }, rows: 3 }),
              earned
                ? h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.ok, fontSize: 14, color: T.text, lineHeight: 1.55 } },
                    h('strong', { style: { color: T.ok } }, __alloT('stem.swimlab.stroke_reveal_title', 'The model behind this lab. ')),
                    swFill(__alloT('stem.swimlab.stroke_reveal', 'Speed = stroke rate x distance per stroke. Drag = k x speed x speed, with k = {k} here ({k2} with the hips low). Power = drag x speed. So twice the speed takes 4 times the push and 8 times the power, however the speed is made. This model leaves out the energy your muscles spend to make each stroke.'),
                      { k: SW_STROKE.k, k2: SW_STROKE.k * SW_STROKE.lowHipsFactor }))
                : h('p', { style: { margin: '8px 0 0', fontSize: 13, color: T.muted, lineHeight: 1.5 } },
                    __alloT('stem.swimlab.design_note_v2', 'No score here. The model is shown after you have logged at least 3 tries and written your own explanation.'))));
        }
        return labFrame('strokeHunt', h('div', null,
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.stroke_lab_intro', 'Why is swimming fast so tiring? Change the stroke, log your tries, and look for the pattern in your own numbers. This is physics practice. It cannot teach you to swim.')),
          body
        ));
      }

      var content;
      if (view === 'menu') content = renderMenu();
      else if (view === 'howSwimming') content = renderHowSwimming();
      else if (view === 'coldShock') content = renderColdShock();
      else if (view === 'ripCurrents') content = renderRipCurrents();
      else if (view === 'reachThrow') content = renderReachThrow();
      else if (view === 'pfd') content = renderPfd();
      else if (view === 'iceSafety') content = renderIceSafety();
      else if (view === 'hypothermia') content = renderHypothermia();
      else if (view === 'drainEntrap') content = renderDrainEntrapment();
      else if (view === 'autismWater') content = renderAutismWater();
      else if (view === 'cumulative') content = renderCumulative();
      else if (view === 'askLifeguard') content = renderAskLifeguard();
      else if (view === 'resources') content = renderResources();
      else if (view === 'ripLab') content = renderRipLab();
      else if (view === 'coldLab') content = renderColdLab();
      else if (view === 'rescueLab') content = renderRescueLab();
      else if (view === 'floatLab') content = renderFloatLab();
      else if (view === 'strokeHunt') content = renderStrokeLab();
      else content = renderMenu();

      return h('div', { style: { background: T.bg, minHeight: '100%', color: T.text, fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' } },
        // SR live region (visually hidden)
        h('div', { ref: _wsLiveRef, 'aria-live': 'polite', 'aria-atomic': 'true',
          style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 } }),
        content
      );

      } catch (err) {
        console.error('[SwimLab] render error', err);
        var React2 = (ctx && ctx.React) || window.React;
        if (!React2) return null;
        return React2.createElement('div', { style: { padding: 20, color: '#fde2e2', background: '#7f1d1d', borderRadius: 10, margin: 20 } },
          React2.createElement('strong', null, __alloT('stem.swimlab.swimlab_error', 'SwimLab error: ')),
          String(err && err.message || err)
        );
      }
    }
  });

})();

}
