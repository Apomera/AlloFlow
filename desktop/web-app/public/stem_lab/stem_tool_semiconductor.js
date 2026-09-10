// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════════════════
// stem_tool_semiconductor.js — Semiconductor Lab Plugin v3.0
// Interactive semiconductor physics: band gaps, doping,
// P-N junctions, transistors (MOSFET/BJT), logic gates,
// I-V curves, circuit sandbox, wafer fab, LED spectrum,
// solar cells, Moore's Law, quantum wells, memory cells,
// signal amplifiers, and Chip Defense battle mode
// Usage: Add <script src="stem_tool_semiconductor.js"></script> after stem_lab_module.js
// ═══════════════════════════════════════════════════════

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

  // ── Audio + WCAG (auto-injected) ──
  var _semiAC = null;
  function getSemiAC() { if (!_semiAC) { try { _semiAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_semiAC && _semiAC.state==="suspended") { try { _semiAC.resume(); } catch(e) {} } return _semiAC; }
  function semiTone(f,d,tp,v) { var ac=getSemiAC(); if(!ac) return; try { var o=ac.createOscillator(); var g=ac.createGain(); o.type=tp||"sine"; o.frequency.value=f; g.gain.setValueAtTime(v||0.07,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxSemiClick() { semiTone(600,0.03,"sine",0.04); }
  function sfxSemiSuccess() { semiTone(523,0.08,"sine",0.07); setTimeout(function(){semiTone(659,0.08,"sine",0.07);},70); setTimeout(function(){semiTone(784,0.1,"sine",0.08);},140); }
  if(!document.getElementById("semi-a11y")){var _s=document.createElement("style");_s.id="semi-a11y";_s.textContent="@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}";document.head.appendChild(_s);}
  // The CSS above only reaches CSS animations/transitions. The canvas draw
  // loops below are requestAnimationFrame, which that media query cannot stop,
  // so they have to check the preference themselves and settle on one frame.
  function semiReducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }
  // High-contrast, lab-specific interaction layer. Keeping this scoped to the
  // Semiconductor Lab prevents the richer controls from changing other tools.
  if (!document.getElementById('semi-contrast-ui')) {
    var semiUiStyle = document.createElement('style');
    semiUiStyle.id = 'semi-contrast-ui';
    semiUiStyle.textContent = [
      '.semiconductor-lab{--semi-cyan:#22d3ee;--semi-cyan-bright:#67e8f9;--allo-stem-text:#e2e8f0;--allo-stem-text-soft:#cbd5e1;position:relative;isolation:isolate;min-height:100%;padding:clamp(12px,2vw,20px);border:1px solid rgba(103,232,249,.38);border-radius:18px;color:#f8fafc;color-scheme:dark;background:radial-gradient(circle at 86% -8%,rgba(34,211,238,.18),transparent 34%),radial-gradient(circle at -8% 45%,rgba(99,102,241,.14),transparent 28%),#020617;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 22px 60px rgba(2,6,23,.34);overflow:hidden}',
      '.semiconductor-lab::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.13;background-image:linear-gradient(rgba(103,232,249,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(103,232,249,.22) 1px,transparent 1px);background-size:32px 32px;mask-image:linear-gradient(to bottom,black,transparent 72%)}',
      '[data-stem-theme="dark"] [data-stem-tool-surface="semiconductor"]{background:#020617!important;color:#f8fafc!important}',
      '.semiconductor-lab button,.semiconductor-lab select,.semiconductor-lab input,.semiconductor-lab textarea{font:inherit}',
      '.semiconductor-lab button:not(:disabled){transition:transform 150ms ease,box-shadow 150ms ease,background-color 150ms ease,border-color 150ms ease,color 150ms ease}',
      '.semiconductor-lab button:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 9px 22px rgba(2,8,23,.34)}',
      '.semiconductor-lab button:not(:disabled):active{transform:translateY(0) scale(.98)}',
      '.semiconductor-lab :is(button,select,input,textarea,summary):focus-visible{outline:3px solid #f8fafc!important;outline-offset:3px!important;box-shadow:0 0 0 6px rgba(34,211,238,.34)!important}',
      '.semi-lab-header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;padding:14px;border:1px solid rgba(103,232,249,.34);border-radius:14px;background:linear-gradient(120deg,rgba(8,47,73,.9),rgba(15,23,42,.88));box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 12px 28px rgba(2,8,23,.22)}',
      '.semi-brand-mark{display:grid;place-items:center;width:48px;height:48px;flex:0 0 48px;border:2px solid rgba(103,232,249,.72);border-radius:13px;background:rgba(8,47,73,.95);font-size:26px;box-shadow:0 0 0 5px rgba(34,211,238,.09),0 0 26px rgba(34,211,238,.28);animation:semiGlow 2.8s ease-in-out infinite}',
      '.semi-header-copy{flex:1;min-width:min(100%,230px)}',
      '.semi-header-kicker{font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#67e8f9}',
      '.semi-header-subtitle{margin-top:3px;color:#e2e8f0;font-size:12px;font-weight:650}',
      '.semi-progress-card{min-width:min(100%,225px);padding:10px 12px;border:1px solid rgba(148,163,184,.52);border-radius:11px;background:rgba(2,6,23,.72)}',
      '.semi-progress-track{height:7px;margin-top:8px;overflow:hidden;border:1px solid #64748b;border-radius:999px;background:#0f172a}',
      '.semi-progress-fill{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#22d3ee,#a5f3fc);box-shadow:0 0 12px rgba(34,211,238,.65);transition:width 260ms ease}',
      '.semi-live-badge{display:inline-flex;align-items:center;gap:7px;min-height:30px;padding:5px 9px;border:1px solid rgba(74,222,128,.65);border-radius:999px;background:rgba(20,83,45,.55);color:#f0fdf4;font-size:11px;font-weight:850;white-space:nowrap}',
      '.semi-live-dot{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 4px rgba(74,222,128,.16),0 0 14px rgba(74,222,128,.75);animation:semiPulse 1.7s ease-out infinite}',
      '.semi-mode-tabs{padding:8px!important;border:1px solid #64748b!important;border-radius:13px;background:rgba(2,6,23,.72)}',
      '.semi-mode-tab{position:relative;overflow:hidden;border:1px solid #64748b!important}',
      '.semi-mode-tab[data-active="true"]{border-color:#cffafe!important;box-shadow:0 0 0 1px rgba(165,243,252,.5),0 9px 24px rgba(8,145,178,.25)!important}',
      '.semi-tab-hero{box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 10px 24px rgba(2,8,23,.2)}',
      '.semi-subtool-nav{border-width:2px!important;background:linear-gradient(135deg,rgba(15,23,42,.98),rgba(8,47,73,.82))!important;box-shadow:0 10px 25px rgba(2,8,23,.2)}',
      '.semi-simulation-select{border-width:2px!important;border-color:#67e8f9!important;background-color:#020617!important;box-shadow:inset 0 0 0 1px rgba(34,211,238,.12)}',
      '.semi-nav-step{display:grid;place-items:center;width:42px;height:42px;border:1px solid #67e8f9;border-radius:10px;background:#155e75;color:#fff;font-size:18px;font-weight:900}',
      '.semi-guided-card{border-width:2px!important;background:linear-gradient(135deg,rgba(8,47,73,.9),rgba(15,23,42,.98))!important;box-shadow:0 14px 32px rgba(2,8,23,.24)}',
      '.semi-guided-step{position:relative;min-height:92px;border-width:2px!important;transition:transform 160ms ease,border-color 160ms ease,background-color 160ms ease}',
      '.semi-guided-step[data-state="active"]{transform:translateY(-2px);box-shadow:0 0 0 1px rgba(103,232,249,.45),0 10px 24px rgba(8,145,178,.2)}',
      '.semi-guided-step[data-state="done"]{box-shadow:inset 0 0 0 1px rgba(74,222,128,.2)}',
      '.semi-action{min-height:40px;border:1px solid rgba(255,255,255,.28)!important}',
      '.semi-pill{min-height:36px;border:1px solid #64748b!important}',
      '.semi-pill[data-active="true"]{border-color:#cffafe!important;background:#0e7490!important;color:#fff!important;box-shadow:0 0 0 2px rgba(34,211,238,.2),0 7px 16px rgba(8,145,178,.22)}',
      '.semi-slider-row{min-height:44px;padding:7px 9px;border:1px solid #475569;border-radius:10px;background:rgba(2,6,23,.58)}',
      '.semi-slider-label{color:#e2e8f0!important;font-weight:750}',
      '.semi-slider-output{display:inline-flex;justify-content:flex-end;align-items:center;min-height:28px;padding:3px 7px;border:1px solid rgba(103,232,249,.48);border-radius:7px;background:#083344;color:#cffafe!important;font-weight:850}',
      '.semiconductor-lab input[type="range"]{height:9px;border:1px solid #64748b;border-radius:999px;appearance:none;-webkit-appearance:none;cursor:pointer}',
      '.semiconductor-lab input[type="range"]::-webkit-slider-thumb{width:21px;height:21px;border:3px solid #ecfeff;border-radius:50%;appearance:none;-webkit-appearance:none;background:#0891b2;box-shadow:0 0 0 3px rgba(34,211,238,.22),0 2px 7px rgba(0,0,0,.5)}',
      '.semiconductor-lab input[type="range"]::-moz-range-thumb{width:17px;height:17px;border:3px solid #ecfeff;border-radius:50%;background:#0891b2;box-shadow:0 0 0 3px rgba(34,211,238,.22),0 2px 7px rgba(0,0,0,.5)}',
      '.semiconductor-lab input[type="checkbox"]{width:18px;height:18px;flex:0 0 18px;accent-color:#22d3ee}',
      '.semi-stat-card{min-height:58px;border-color:#64748b!important;background:linear-gradient(145deg,rgba(30,41,59,.96),rgba(15,23,42,.98))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}',
      '.semiconductor-lab canvas{border:2px solid #64748b!important;background-color:#020617!important;box-shadow:0 0 0 1px rgba(103,232,249,.12),inset 0 0 28px rgba(8,145,178,.08),0 14px 30px rgba(2,8,23,.28)!important}',
      '.semi-workspace{padding:10px;border:1px solid rgba(100,116,139,.82);border-radius:14px;background:rgba(2,6,23,.48)}',
      '.semi-command-drawer,.semi-notebook-preview{border-width:2px!important}',
      '.semi-command-drawer>summary,.semi-notebook-preview>summary{min-height:44px;display:flex;align-items:center}',
      '.semi-snapshot{min-height:44px;border:1px solid rgba(207,250,254,.8)!important;box-shadow:0 10px 24px rgba(8,145,178,.24)!important}',
      '.semi-crystal{margin:12px 0;border:1px solid #475569;border-radius:14px;background:radial-gradient(ellipse at 50% 35%,#12304a,#07111f 70%);overflow:hidden}.semi-inspector-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 18px}.semi-inspector-heading h4{font-size:20px;margin:4px 0;color:#f8fafc}.semi-eyebrow{font-size:11px;letter-spacing:.12em;color:#67e8f9;font-weight:800}.semi-model-tag{font-size:12px;border:1px solid #64748b;border-radius:20px;padding:6px 10px;color:#cbd5e1}.semi-crystal svg{width:100%;max-height:430px;display:block;cursor:grab;outline-offset:-4px}.semi-crystal svg:active{cursor:grabbing}.semi-crystal svg:focus-visible{outline:3px solid #fff}.semi-inspector-controls{display:flex;flex-wrap:wrap;gap:8px;padding:8px 16px}.semi-inspector-controls button,.semi-study button{min-height:44px;padding:8px 12px;border:1px solid #64748b;border-radius:8px;background:#13263d;color:#f8fafc;font-weight:650}.semi-inspector-controls button[aria-pressed=true],.semi-study button[aria-pressed=true]{background:#155e75;border-color:#67e8f9}.semi-inspector-controls label{display:flex;align-items:center;gap:8px;min-height:44px;color:#e2e8f0}.semi-reading{font-size:14px;line-height:1.65;color:#e2e8f0;margin:10px 16px}.semi-model-note{font-size:12px;line-height:1.6;color:#cbd5e1;margin:12px 16px;padding-top:10px;border-top:1px solid #334155}.semi-study{margin:12px 0;padding:16px;border:1px solid #475569;border-radius:12px;background:#0b1729}.semi-study h4{margin:0 0 8px;font-size:16px;color:#f8fafc}.semi-study p{font-size:14px;line-height:1.6;color:#e2e8f0}.semi-study-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px}.semi-study table{width:100%;border-collapse:collapse;font-size:13px}.semi-study td,.semi-study th{text-align:left;padding:10px 6px;border-bottom:1px solid #334155;overflow-wrap:anywhere}.semi-study th{color:#a5f3fc}.semi-study a{color:#a5f3fc;text-decoration:underline}.semi-view-switch{padding:8px 0}.semiconductor-lab .semi-workspace canvas{max-width:760px}.semi-lab-header .semi-brand-mark,.semi-live-dot{animation:none!important}@media(max-width:640px){.semi-study{padding:12px}.semi-inspector-heading{padding:12px}.semi-inspector-heading h4{font-size:17px}.semi-inspector-controls{padding:8px}.semi-reading,.semi-model-note{margin:10px}.semi-study table{font-size:12px}}',
      '@keyframes semiPulse{0%{box-shadow:0 0 0 0 rgba(74,222,128,.55),0 0 14px rgba(74,222,128,.75)}70%{box-shadow:0 0 0 9px rgba(74,222,128,0),0 0 14px rgba(74,222,128,.75)}100%{box-shadow:0 0 0 0 rgba(74,222,128,0),0 0 14px rgba(74,222,128,.75)}}',
      '@keyframes semiGlow{0%,100%{box-shadow:0 0 0 5px rgba(34,211,238,.09),0 0 22px rgba(34,211,238,.22)}50%{box-shadow:0 0 0 6px rgba(34,211,238,.13),0 0 32px rgba(34,211,238,.38)}}',
      '@media(max-width:640px){.semiconductor-lab{padding:10px;border-radius:14px}.semi-lab-header{align-items:flex-start;padding:11px}.semi-brand-mark{width:42px;height:42px;flex-basis:42px}.semi-progress-card{width:100%}.semi-subtool-nav{gap:8px!important}.semi-simulation-select{order:2;min-width:calc(100% - 100px)!important}.semi-live-badge{order:3}.semi-slider-row{display:grid!important;grid-template-columns:1fr auto}.semi-slider-row input[type="range"]{grid-column:1/-1;grid-row:2}.semi-slider-label{width:auto!important}.semi-slider-output{width:auto!important}.semi-workspace{padding:7px}}',
      '@media(prefers-reduced-motion:reduce){.semi-brand-mark,.semi-live-dot{animation:none!important}.semiconductor-lab button:not(:disabled):hover,.semi-guided-step[data-state="active"]{transform:none}}',
      '@media(forced-colors:active){.semiconductor-lab,.semi-lab-header,.semi-guided-card,.semi-workspace{border:2px solid CanvasText}.semi-live-dot{background:Highlight}.semi-progress-fill{background:Highlight}.semiconductor-lab :is(button,select,input,textarea,summary):focus-visible{outline:3px solid Highlight!important}}'
    ].join('');
    document.head.appendChild(semiUiStyle);
  }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-semiconductor')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-semiconductor';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ═══ QUIZ OPTION ORDER ═══
  // Both question banks were authored with the correct answer sitting at index 1:
  // 22 of 30 in the practice bank and 8 of 12 in the boss rounds, 30 of 42 overall.
  // A student who always picked the second choice scored ~71% knowing nothing, which
  // makes the score meaningless as evidence of learning and rewards the wrong
  // strategy. (The answer is also the uniquely longest option in 16 of 30 practice
  // questions — a separate tell that needs the distractors rewritten, not reordered.)
  //
  // Deterministic on the question text rather than Math.random(): the order must be
  // stable across re-renders, or an option would move out from under the student's
  // pointer mid-answer and the selected/correct highlighting would shuffle while the
  // result is on screen. Same question always gets the same order.
  // Places the ANSWER at a hash-chosen slot rather than shuffling the whole list.
  // A blind shuffle does not actually balance a bank this small — tried it, and the
  // practice bank still peaked at 47% in one slot while the boss rounds moved to 58%
  // in another. Choosing the answer's slot directly makes the distribution depend
  // only on hash-mod-n, which is far more even. Distractor order follows.
  function orderOptions(questionText, opts, answer) {
    if (!opts || opts.length < 2) return opts || [];
    var others = [];
    var found = false;
    for (var i = 0; i < opts.length; i++) {
      if (!found && opts[i] === answer) { found = true; continue; }
      others.push(opts[i]);
    }
    // Answer not present (or duplicated) — leave the order alone rather than guess.
    if (!found) return opts.slice();

    var seed = 2166136261;
    for (var c = 0; c < questionText.length; c++) {
      seed = ((seed ^ questionText.charCodeAt(c)) * 16777619) >>> 0;
    }
    // Avalanche the hash before taking a remainder. A multiplicative hash has weak
    // LOW bits, and `seed % n` reads exactly those: without this the practice bank
    // still landed 50% in one slot and the boss rounds got worse at 75%. Measured
    // with the finaliser: 33% and 33%, which is the ideal for 3-4 options.
    seed ^= seed >>> 16; seed = (seed * 2246822507) >>> 0;
    seed ^= seed >>> 13; seed = (seed * 3266489909) >>> 0;
    seed ^= seed >>> 16;
    var target = (seed >>> 0) % opts.length;

    var out = [];
    var oi = 0;
    for (var j = 0; j < opts.length; j++) out.push(j === target ? answer : others[oi++]);
    return out;
  }
  // Spoken-friendly magnitude for transistor counts. A screen reader reading
  // "208000000000" as digits is useless; "208 billion" is what a person would say.
  // Only used in accessible descriptions, never in the plotted maths.
  function formatTransistorCount(n) {
    if (!isFinite(n) || n <= 0) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, '') + ' billion';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + ' million';
    if (n >= 1e3) return Math.round(n).toLocaleString('en-US');
    return String(Math.round(n));
  }


  // Equilibrium estimates; Varshni parameters: Ioffe NSM Si/Ge/GaAs archives.
  // Fits are anchored to the lab's rounded 300 K reference values.
  function semiBandGap(mat, temperature, key) {
    var T = Math.max(50, Math.min(800, Number(temperature) || 300));
    var fits = { silicon:[4.73e-4,636], germanium:[4.8e-4,235], gaas:[5.405e-4,204] }, f = fits[key];
    return Math.max(0, mat.bandGap + (f ? f[0]*(90000/(300+f[1])-T*T/(T+f[1])) : mat.tempCoeff*(T-300)));
  }
  function semiIntrinsic(mat, temperature, gap) {
    var T = Math.max(50, Math.min(800, Number(temperature) || 300));
    if (mat.ni <= 0 || mat.bandGap === 0) return null;
    return Math.exp(Math.max(-740, Math.min(700, Math.log(mat.ni) + 1.5*Math.log(T/300)
      + mat.bandGap/(2*8.617333262e-5*300) - gap/(2*8.617333262e-5*T))));
  }
  function semiJunction(bias) {
    var V = Math.max(-3, Math.min(3, Number(bias) || 0)), barrier = .7-V;
    return { bias:V, regime:V>0?'Forward bias':V<0?'Reverse bias':'Equilibrium', valid:barrier>.05,
      widthUm:Math.sqrt(2*11.7*8.854e-14*Math.max(0,barrier)/1.602e-19*2e-16)*1e4,
      // Illustrative ideal diode: Is=1 pA, ideality=1.5, T=300 K.
      currentA:V<.65 ? 1e-12*Math.expm1(V/(1.5*8.617333262e-5*300)) : null };
  }
  function semiCarriers(ni, donors) {
    // Fully ionized, uncompensated donors at equilibrium: n-p=ND and np=ni².
    var n = (donors + Math.hypot(donors, 2*ni))/2;
    return {n:n,p:ni*ni/n};
  }

  function semiNumber(value, fallback, min, max) {
    var n=Number(value);
    return Math.max(min,Math.min(max,value==null||!isFinite(n)?fallback:n));
  }
  function semiMOS(type, gate, drain) {
    var polarity=type==='mosfet-p'?-1:1;
    var vg=semiNumber(gate,0,-5,5),vd=semiNumber(drain,polarity*5,-10,10);
    var overdrive=polarity*vg-1.5,ds=polarity*vd,beta=polarity===1?.001:.0005;
    var valid=ds>=0,channel=overdrive>0,id=0,region='Cutoff';
    if(!valid)region='Reverse drain polarity: outside model';
    else if(channel){
      region=ds===0?'Zero drain bias':ds<overdrive?'Linear (triode)':'Saturation';
      id=ds<overdrive?beta*(overdrive*ds-ds*ds/2):beta*overdrive*overdrive/2;
    }
    return {gate:vg,drain:vd,polarity:polarity,overdrive:Math.max(0,overdrive),channel:channel,
      currentA:valid?polarity*id:null,region:region,valid:valid,beta:beta};
  }
  function semiSolar(mat, light, temperature, areaCm2, resistance, openCircuit) {
    var G=semiNumber(light,1000,0,1200),T=semiNumber(temperature,300,270,370);
    var area=semiNumber(areaCm2,100,10,500)/10000,R=semiNumber(resistance,100,0,1e5);
    // Empirical I-V shape: exponent 10; its analytic maximum calibrates efficiency.
    // This is a consistent teaching curve, not a detailed cell/MPPT device model.
    var exponent=10,xmp=Math.pow(1/(exponent+1),1/exponent),ff=xmp*exponent/(exponent+1);
    var input=G*area;
    var isc=mat.eff*1000*area/(mat.Voc*ff)*(G/1000)*(1+.0005*(T-298));
    var voc=G>0?Math.max(0,mat.Voc*(1-.0045*(T-298))+1.5*8.617333262e-5*T*Math.log(G/1000)):0;
    function current(v){return voc>0?isc*Math.max(0,1-Math.pow(Math.max(0,v)/voc,exponent)):0;}
    var vmp=xmp*voc,imp=current(vmp),pmax=vmp*imp;
    var lo=0,hi=voc;
    if(!openCircuit && R>0)for(var k=0;k<60;k++){var v=(lo+hi)/2;if(current(v)>v/R)lo=v;else hi=v;}
    var loadV=openCircuit?voc:R===0?0:(lo+hi)/2;
    var loadI=openCircuit?0:R===0?isc:loadV/R;
    return {G:G,T:T,area:area,R:R,Voc:voc,Isc:isc,Vmp:vmp,Imp:imp,Pmax:pmax,
      efficiency:input>0?pmax/input:0,FF:voc*isc>0?pmax/(voc*isc):0,
      loadV:loadV,loadI:loadI,loadPower:loadV*loadI,current:current};
  }
  function semiAmplifier(baseGain, vin, freq, supply, resistance, bias, follower) {
    var Vdd=semiNumber(supply,5,1,12),f=semiNumber(freq,1000,10,100000);
    var gain=baseGain*(follower?1:semiNumber(resistance,10000,1000,100000)/10000);
    var abs=Math.abs(gain),low=100,high=1e6/abs;
    function response(hz){return abs/Math.sqrt(1+Math.pow(low/hz,2))/Math.sqrt(1+Math.pow(hz/high,2));}
    var magnitude=response(f),phase=(gain<0?Math.PI:0)+Math.atan(low/f)-Math.atan(f/high);
    var center=semiNumber(bias,Vdd/2,0,Vdd),input=semiNumber(vin,.01,0,.2),peak=magnitude*input;
    function sample(angle){return Math.max(0,Math.min(Vdd,center+peak*Math.sin(angle+phase)));}
    return {gain:gain,magnitude:magnitude,gainDB:20*Math.log10(magnitude),phase:phase,
      f:f,low:low,high:high,supply:Vdd,bias:center,peak:peak,
      min:Math.max(0,center-peak),max:Math.min(Vdd,center+peak),
      clipped:peak>Math.min(center,Vdd-center),response:response,sample:sample};
  }
  function semiIV(device, voltage, temperature) {
    var V=semiNumber(voltage,0,-6,5),T=semiNumber(temperature,300,200,400);
    if(device==='resistor')return V/1000;
    var thermal=8.617333262e-5*T,eg=device==='led'?1.9:1.12;
    var base=device==='led'?2e-17:1e-12,rs=device==='led'?20:10;
    var isat=base*Math.pow(T/300,3)*Math.exp(eg/8.617333262e-5*(1/300-1/T));
    var Vz = -5.1;
    if(device==='zener'&&V<Vz)return -isat-(Math.abs(V)-Math.abs(Vz))/20;
    if(V<=0)return isat*Math.expm1(V/(2*thermal));
    // Solve the diode plus series resistance implicitly; current remains bounded.
    var lo=0,hi=V/rs;
    for(var k=0;k<70;k++){var i=(lo+hi)/2,drop=2*thermal*Math.log1p(i/isat)+rs*i;if(drop<V)lo=i;else hi=i;}
    return (lo+hi)/2;
  }


  // hbar²/(2 m_e), in eV nm². Equal effective mass in well and barriers.
  function semiQuantum(width, depth, mass, infinite, requested) {
    var L=semiNumber(width,5,1,20),D=semiNumber(depth,.3,.1,1),m=semiNumber(mass,.067,.01,1);
    var a=.0380998212/m,z0=L*.5*Math.sqrt(D/a),limit=Math.round(semiNumber(requested,3,1,6));
    var total=infinite?Infinity:Math.ceil(2*z0/Math.PI),states=[];
    for(var n=1;n<=Math.min(limit,total);n++){
      var k,E,kappa=0,norm,boundary=0,even=n%2===1;
      if(infinite){k=n*Math.PI/L;E=a*k*k;norm=Math.sqrt(2/L);}
      else{
        // Unified even/odd phase condition; avoids poles of tan/cot.
        var lo=(n-1)*Math.PI/2,hi=Math.min(n*Math.PI/2,z0);
        for(var j=0;j<64;j++){var z=(lo+hi)/2;if(z+Math.asin(Math.min(1,z/z0))>n*Math.PI/2)hi=z;else lo=z;}
        k=2*((lo+hi)/2)/L;E=a*k*k;kappa=Math.sqrt(Math.max(0,(D-E)/a));
        boundary=even?Math.cos(k*L/2):Math.sin(k*L/2);
        var inside=L/2+(even?1:-1)*Math.sin(k*L)/(2*k);
        norm=1/Math.sqrt(inside+boundary*boundary/kappa);
      }
      states.push({n:n,E:E,k:k,kappa:kappa,norm:norm,boundary:boundary,even:even,bound:true,
        outside:infinite?0:norm*norm*boundary*boundary/kappa,infiniteE:a*Math.pow(n*Math.PI/L,2)});
    }
    function psi(state,x){
      if(Math.abs(x)<=L/2)return state.norm*(state.even?Math.cos(state.k*x):Math.sin(state.k*x));
      if(infinite)return 0;
      return state.norm*state.boundary*Math.exp(-state.kappa*(Math.abs(x)-L/2))*(state.even||x>=0?1:-1);
    }
    return {width:L,depth:D,mass:m,infinite:!!infinite,total:total,levels:states,psi:psi};
  }
  function semiSeries(parts, voltage) {
    var V=semiNumber(voltage,5,0,12),items=Array.isArray(parts)?parts:[],rows=[],R=0,diodes=[];
    if(!items.length)return {status:'empty',message:'Add a resistor or load a starter circuit.',currentA:null};
    var unsupported=items.filter(function(p){return !p||['resistor','diode','led','capacitor'].indexOf(p.type)<0;});
    if(unsupported.length)return {status:'unsupported',message:'This series DC solver supports resistors, diodes, LEDs and capacitors. A transistor needs separate gate and drain connections; open Transistor to study it.',currentA:null};
    if(items.some(function(p){return p.type==='resistor'&&p.ohms!=null&&(String(p.ohms).trim()===''||!Number.isFinite(Number(p.ohms))||Number(p.ohms)<10||Number(p.ohms)>100000);}))return {status:'invalid',message:'Enter a resistance from 10 to 100000 Ω for each resistor to calculate the circuit.',currentA:null};
    var capacitors=items.filter(function(p){return p.type==='capacitor';});
    items.forEach(function(p,i){
      var r=p.type==='resistor'?semiNumber(p.ohms,1000,10,100000):0;R+=r;
      var row={index:i,type:p.type,ohms:r,voltage:0,power:0};rows.push(row);
      if(p.type==='diode'||p.type==='led')diodes.push(row);
    });
    if(capacitors.length)return {status:'open',message:'Steady DC: a charged ideal capacitor blocks current. Charging transients and individual capacitor voltages are not solved here.',currentA:0,powerW:0,rows:[],voltage:V,resistance:R};
    if(R===0 && diodes.length===0)return {status:'short',message:'An ideal source cannot determine current through a zero-resistance path.',currentA:null};
    function diodeV(row,i){
      var led=row.type==='led',isat=led?2e-17:1e-12,rs=led?20:10;
      return 2*8.617333262e-5*300*Math.log1p(i/isat)+rs*i;
    }
    var seriesR=R+diodes.reduce(function(sum,row){return sum+(row.type==='led'?20:10);},0),lo=0,hi=V/seriesR;
    for(var k=0;k<70;k++){var current=(lo+hi)/2,drop=current*R+diodes.reduce(function(sum,row){return sum+diodeV(row,current);},0);if(drop>V)hi=current;else lo=current;}
    var I=V===0?0:(lo+hi)/2;
    rows.forEach(function(row){row.voltage=row.type==='resistor'?I*row.ohms:diodeV(row,I);row.power=I*row.voltage;});
    return {status:'solved',message:'One series path: every component carries the same current.',currentA:I,voltage:V,powerW:V*I,resistance:R,rows:rows,
      unprotected:diodes.length>0&&R===0,ledOn:diodes.some(function(row){return row.type==='led';})&&I>1e-6};
  }


  function semiMemory(type, raw, legacyBit) {
    type=['sram','dram','flash','nand','feram'].indexOf(type)>=0?type:'sram';raw=raw||{};
    var flash=type==='flash'||type==='nand',volatile=type==='sram'||type==='dram';
    var bits=Array.from({length:16},function(_,i){
      var value=Array.isArray(raw.bits)?raw.bits[i]:i===0&&legacyBit!=null?legacyBit:flash?1:0;
      return value===0||value===1?value:null;
    });
    var power=raw.power!==false;
    if(!power&&volatile)bits=bits.map(function(){return null;});
    var ages=Array.from({length:16},function(_,i){return semiNumber((raw.ages||[])[i],0,0,1000000);});
    if(type==='dram')bits=bits.map(function(bit,i){return ages[i]>=6?null:bit;});
    return {type:type,bits:bits,ages:ages,power:power,clock:semiNumber(raw.clock,0,0,1000000),
      log:Array.isArray(raw.log)?raw.log.filter(function(event){return event&&typeof event.message==='string';}).slice(-12):[],message:typeof raw.message==='string'?raw.message:'Select an address, enable writes, then try an operation.',lastRead:raw.lastRead||null};
  }
  function semiMemoryStep(type,raw,action,options) {
    var b=semiMemory(type,raw),o=options||{},address=Math.round(semiNumber(o.address,0,0,15));
    var flash=b.type==='flash'||b.type==='nand',volatile=b.type==='sram'||b.type==='dram',message='';
    if(action==='reset'){b=semiMemory(b.type);message='Experiment reset to known '+(flash?'erased ones.':'zeros.');}
    else if(action==='power'){
      b.power=!b.power;if(!b.power&&volatile)b.bits.fill(null);
      b.lastRead=null;message=b.power?'Power restored. Unknown bits stay unknown until written.':volatile?'Power removed: volatile contents are now unknown.':'Power removed: stored contents are retained; reading needs power.';
    }else if(!b.power)message='Restore power before using the memory.';
    else if(action==='write0'||action==='write1'||action==='erase'){
      if(!o.writeEnable)message='Write protection is on. Enable writes to change stored data.';
      else if(action==='erase'){
        if(!flash)message='This memory does not use flash block erase.';
        else{b.bits.fill(1);b.ages.fill(0);message='Erased the teaching block: all 16 bits are 1.';}
      }else{
        var bit=action==='write1'?1:0;
        if(flash&&bit===1&&b.bits[address]!==1)message='Programming cannot restore a 1. Erase the block first.';
        else{b.bits[address]=bit;b.ages[address]=0;message='Address '+address+' stores '+bit+'. Other addresses are unchanged.';}
      }
    }else if(action==='read'){
      b.lastRead={address:address,value:b.bits[address]};
      message='Read address '+address+': '+(b.bits[address]==null?'unknown':b.bits[address])+'.';
      if(b.type==='dram'&&b.bits[address]!=null){b.ages[address]=0;message+=' The sense amplifier restores this valid cell after the read.';}
    }else if(action==='refresh'){
      if(b.type!=='dram')message='This memory does not need DRAM refresh.';
      else{b.ages=b.ages.map(function(age,i){return b.bits[i]==null?age:0;});message='Refreshed valid cells. Refresh cannot reconstruct bits that are already unknown.';}
    }else if(action==='advance'){
      var steps=Math.round(semiNumber(o.steps,1,1,12));
      for(var step=0;step<steps;step++){
        b.clock++;
        if(b.type==='dram')for(var i=0;i<16;i++){
          b.ages[i]++;if(b.ages[i]>=6)b.bits[i]=null;
          if(o.autoRefresh&&b.clock%2===0&&b.bits[i]!=null)b.ages[i]=0;
        }
      }
      message='Advanced '+steps+' lesson step'+(steps===1?'':'s')+'. '+(b.type==='dram'?(o.autoRefresh?'Automatic refresh runs every two steps.':'Without refresh, valid DRAM bits become unknown at six steps.'):'This model retains powered contents over lesson steps.');
    }else message='Choose a memory operation.';
    b.message=message;b.log=b.log.concat([{step:b.clock,message:message}]).slice(-12);return b;
  }
  function semiOxidation(temperature,minutes){
    var T=semiNumber(temperature,1000,800,1200),time=semiNumber(minutes,30,0,120),kelvin=T+273.15;
    // Dimensionless comparison, not calibrated oxide thickness or a process recipe.
    var B=Math.exp(-1.2/8.617333262e-5*(1/kelvin-1/1273.15));
    var linear=Math.exp(-2/8.617333262e-5*(1/kelvin-1/1273.15)),A=B/linear,hours=time/60;
    var x=2*B*hours/(Math.sqrt(A*A+4*B*hours)+A),reference=(Math.sqrt(3)-1)/2;
    return {temperature:T,minutes:time,index:x/reference,A:A,B:B,raw:x};
  }

  function semiDiamondCell() {
    var atoms=[], bonds=[], basis=[[0,0,0],[0,.5,.5],[.5,0,.5],[.5,.5,0],[.25,.25,.25],[.25,.75,.75],[.75,.25,.75],[.75,.75,.25]];
    for(var x=0;x<=1;x++) for(var y=0;y<=1;y++) for(var z=0;z<=1;z++) {
      basis.forEach(function(b){var p=[x+b[0],y+b[1],z+b[2]];if(p.every(function(v){return v<=1;}))atoms.push(p);});
    }
    atoms.forEach(function(a,i){atoms.forEach(function(b,j){
      var dist=a.reduce(function(s,v,k){return s+(v-b[k])*(v-b[k]);},0);
      if(j>i && Math.abs(dist-3/16)<1e-8)bonds.push([i,j]);
    });});
    return {atoms:atoms,bonds:bonds,focus:atoms.findIndex(function(p){return p.every(function(v){return v===.25;});})};
  }
  // Stable React component: 3D coordinates projected into SVG, no WebGL dependency.
  function SemiCrystalInspector(props) {
    var React=props.React,h=React.createElement,t=props.t;
    var vs=React.useState({yaw:-.55,pitch:.32,zoom:1}),v=vs[0],setView=vs[1];
    var bs=React.useState(true),fs=React.useState(false),drag=React.useRef(null);
    var cell=semiDiamondCell(),dp=props.dopant,doped=!!dp.type;
    function turn(dx,dy){setView(function(p){return {yaw:p.yaw+dx,pitch:Math.max(-1.3,Math.min(1.3,p.pitch+dy)),zoom:p.zoom};});}
    function zoom(d){setView(function(p){return Object.assign({},p,{zoom:Math.max(.7,Math.min(1.4,p.zoom+d))});});}
    function reset(){setView({yaw:-.55,pitch:.32,zoom:1});}
    function project(p){
      var x=p[0]-.5,y=p[1]-.5,z=p[2]-.5,rx=x*Math.cos(v.yaw)+z*Math.sin(v.yaw),rz=-x*Math.sin(v.yaw)+z*Math.cos(v.yaw);
      var ry=y*Math.cos(v.pitch)-rz*Math.sin(v.pitch),depth=y*Math.sin(v.pitch)+rz*Math.cos(v.pitch),s=180*v.zoom*3/(3+depth);
      return {x:280+rx*s,y:180+ry*s,z:depth,scale:s/180};
    }
    var near=[cell.focus],g=[],atoms=cell.atoms.map(function(p,i){return Object.assign(project(p),{id:i});});
    cell.bonds.forEach(function(b){if(b.indexOf(cell.focus)>=0)near.push(b[0]===cell.focus?b[1]:b[0]);});
    if(bs[0])cell.bonds.forEach(function(b,i){
      var active=b.indexOf(cell.focus)>=0;if(fs[0]&&!active)return;
      var a=atoms[b[0]],c=atoms[b[1]];
      var dx=c.x-a.x,dy=c.y-a.y,len=Math.max(1,Math.hypot(dx,dy));
      var ar=(b[0]===cell.focus?18:11)*a.scale,cr=(b[1]===cell.focus?18:11)*c.scale;
      var x1=a.x+dx*Math.min(.45,ar/len),y1=a.y+dy*Math.min(.45,ar/len),x2=c.x-dx*Math.min(.45,cr/len),y2=c.y-dy*Math.min(.45,cr/len);
      g.push({z:(a.z+c.z)/2,node:h('line',{key:'b'+i,x1:x1,y1:y1,x2:x2,y2:y2,stroke:active?'#a5f3fc':'#64748b',strokeWidth:active?5:3,strokeLinecap:'round',opacity:active?.9:.55})});
    });
    atoms.forEach(function(a){
      if(fs[0]&&near.indexOf(a.id)<0)return;
      var active=a.id===cell.focus,color=active?(doped?'#fbbf24':'#67e8f9'):'#94a3b8',r=(active?17:10)*a.scale;
      g.push({z:a.z-.01,node:h('g',{key:'a'+a.id},
        h('circle',{cx:a.x,cy:a.y,r:r+4,fill:color,opacity:.12}),
        h('circle',{cx:a.x,cy:a.y,r:r,fill:color,stroke:active?'#fff':'#cbd5e1',strokeWidth:active?2:1}),
        h('circle',{cx:a.x-r*.3,cy:a.y-r*.3,r:r*.28,fill:'#fff',opacity:.45}),
        active&&h('text',{x:a.x,y:a.y+4,textAnchor:'middle',fill:'#0f172a',fontSize:12,fontWeight:800},doped?dp.symbol:'Si'))});
    });
    g.sort(function(a,b){return b.z-a.z;});
    function control(key,label,fn){return h('button',{type:'button',onClick:fn},t('stem.semiconductor.'+key,label));}
    return h('section',{className:'semi-crystal','aria-label':t('stem.semiconductor.crystal_inspector','3D crystal inspector')},
      h('div',{className:'semi-inspector-heading'},h('div',null,
        h('span',{className:'semi-eyebrow'},t('stem.semiconductor.atomic_scale','ATOMIC SCALE')),
        h('h4',null,t('stem.semiconductor.silicon_3d','Silicon in three dimensions'))),
        h('span',{className:'semi-model-tag'},'Diamond cubic')),
      h('svg',{viewBox:'0 0 560 360',role:'img',tabIndex:0,'aria-label':
        'Rotatable silicon diamond cubic unit cell. The highlighted '+(doped?dp.name:'silicon atom')+' has four tetrahedral nearest neighbors. One representative site is shown. Arrow keys rotate; plus and minus zoom; Home resets.',
        style:{touchAction:'pan-y'},
        onKeyDown:function(e){
          var keys={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,-.15],ArrowDown:[0,.15]};
          if(keys[e.key]){e.preventDefault();turn(keys[e.key][0],keys[e.key][1]);}
          if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.1);}
          if(e.key==='-'){e.preventDefault();zoom(-.1);}
          if(e.key==='Home'){e.preventDefault();reset();}
        },
        onPointerDown:function(e){if(e.button!==0)return;drag.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);},
        onPointerMove:function(e){if(!drag.current)return;var dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;drag.current={x:e.clientX,y:e.clientY};turn(dx*.01,dy*.01);},
        onPointerUp:function(){drag.current=null;},onPointerCancel:function(){drag.current=null;},onLostPointerCapture:function(){drag.current=null;}
      },h('ellipse',{cx:280,cy:322,rx:145,ry:17,fill:'#0e7490',opacity:.15}),
        g.map(function(a){return a.node;}),
        h('text',{x:20,y:28,fill:'#cbd5e1',fontSize:12},t('stem.semiconductor.bond_angle','Four neighbors · 109.5° bond angle'))),
      h('div',{className:'semi-inspector-controls',role:'group','aria-label':'3D camera controls'},
        control('rotate_left','Rotate left',function(){turn(-.2,0);}),control('rotate_right','Rotate right',function(){turn(.2,0);}),
        control('tilt_up','Tilt up',function(){turn(0,-.2);}),control('tilt_down','Tilt down',function(){turn(0,.2);}),
        control('zoom_in','Zoom in',function(){zoom(.1);}),control('zoom_out','Zoom out',function(){zoom(-.1);}),control('reset_view','Reset view',reset)),
      h('div',{className:'semi-inspector-controls'},
        h('label',null,h('input',{type:'checkbox',checked:bs[0],onChange:function(){bs[1](!bs[0]);}}),t('stem.semiconductor.show_bonds','Show bonds')),
        h('label',null,h('input',{type:'checkbox',checked:fs[0],onChange:function(){fs[1](!fs[0]);}}),t('stem.semiconductor.isolate_neighbors','Isolate four neighbors'))),
      h('p',{className:'semi-reading'},t('stem.semiconductor.crystal_drag_help','Drag left or right to rotate; use the buttons to tilt and zoom. Cyan bonds connect the highlighted atom to its four neighbors. Boundary atoms continue into adjacent cells.')),
      h('p',{className:'semi-reading',role:'status'},doped
        ? dp.name+(dp.type==='n'?' is a donor: ionization leaves a mobile electron and a fixed positive donor ion.':' is an acceptor: accepting an electron leaves a mobile hole and a fixed negative acceptor ion.')
        : t('stem.semiconductor.crystal_intrinsic_help','Each silicon atom shares four covalent bonds. Thermal excitation can create equal numbers of electrons and holes.')),
      h('p',{className:'semi-model-note'},t('stem.semiconductor.crystal_scope','Geometry model: atoms are enlarged and one representative dopant site is shown, not a concentration. Carriers are delocalized; they do not orbit dopants like planets.'))
    );
  }


  function SemiMOSInspector(props) {
    var React=props.React,h=React.createElement,t=props.t,m=props.model;
    var camera=React.useState({yaw:-.5,pitch:.5}),v=camera[0],setCamera=camera[1];
    var exploded=React.useState(true),layer=React.useState('channel'),drag=React.useRef(null);
    function turn(dx,dy){setCamera(function(p){return {yaw:p.yaw+dx,pitch:Math.max(.15,Math.min(1.1,p.pitch+dy))};});}
    function project(p){
      var x=p[0]*Math.cos(v.yaw)+p[2]*Math.sin(v.yaw),z=-p[0]*Math.sin(v.yaw)+p[2]*Math.cos(v.yaw);
      var y=p[1]*Math.cos(v.pitch)+z*Math.sin(v.pitch),depth=-p[1]*Math.sin(v.pitch)+z*Math.cos(v.pitch);
      return {x:280+x*148,y:195-y*148,z:depth};
    }
    var faces=[],lift=exploded[0]?.35:0;
    function box(id,x0,x1,y0,y1,z0,z1,color){
      var pts=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]].map(project);
      [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]].forEach(function(f,i){
        faces.push({body:id==='body',z:f.reduce(function(sum,k){return sum+pts[k].z;},0)/4,
          node:h('polygon',{key:id+i,points:f.map(function(k){return pts[k].x+','+pts[k].y;}).join(' '),fill:color,
            fillOpacity:layer[0]===id?1:.8,stroke:layer[0]===id?'#f8fafc':'#64748b',strokeWidth:layer[0]===id?2:1})});
      });
    }
    box('body',-1.1,1.1,-.5,0,-.48,.48,'#1e3a5f');
    box('source',-1.08,-.58,-.12,.025,-.36,.36,m.polarity===1?'#0891b2':'#be185d');
    box('drain',.58,1.08,-.12,.025,-.36,.36,m.polarity===1?'#0891b2':'#be185d');
    if(m.channel)box('channel',-.58,.58,.01,.055,-.3,.3,'#059669');
    box('oxide',-.58,.58,.075+lift*.45,.13+lift*.45,-.33,.33,'#7c3aed');
    box('gate',-.6,.6,.15+lift,.29+lift,-.35,.35,'#d97706');
    faces.sort(function(a,b){return a.body!==b.body?(a.body?-1:1):b.z-a.z;});
    var descriptions={
      gate:'The gate voltage changes the electric field. The ideal insulating oxide prevents a steady gate current.',
      oxide:'The oxide separates the gate from the semiconductor. Electric-field control does not require electrons to cross the oxide.',
      channel:m.channel?(Math.abs(m.currentA||0)>0?'An inversion channel is present and drain bias drives current. In saturation the channel pinches off near the drain; current does not stop.':'A channel is present, but zero drain bias gives zero net drain current in this model.'):'Below threshold, no strong-inversion channel is shown. Raise the gate-to-source voltage magnitude to form one.',
      source:m.polarity===1?'The N+ source supplies electrons. With positive drain voltage, electrons move from source to drain.':'The P+ source supplies holes. With negative drain voltage, holes move from source to drain.',
      drain:'The drain-to-source voltage drives transport along the channel. Forming a channel and driving a current are separate conditions.',
      body:m.polarity===1?'An N-channel MOSFET has a P-type body. The body and source are tied to the same reference potential here.':'A P-channel MOSFET has an N-type body. The body and source are tied to the same reference potential here.'
    };
    function label(text,p){var a=project(p);return h('text',{key:text,x:a.x,y:a.y,fill:'#f8fafc',fontSize:12,textAnchor:'middle',paintOrder:'stroke',stroke:'#07111f',strokeWidth:4},text);}
    return h('section',{className:'semi-crystal','aria-label':'3D MOSFET cutaway'},
      h('div',{className:'semi-inspector-heading'},h('div',null,h('span',{className:'semi-eyebrow'},'DEVICE SCALE'),h('h4',null,m.polarity===1?'Inside an N-channel MOSFET':'Inside a P-channel MOSFET')),h('span',{className:'semi-model-tag'},m.region)),
      h('svg',{viewBox:'0 0 560 350',role:'img',tabIndex:0,'aria-label':'Rotatable MOSFET cutaway: gate above insulating oxide, source and drain inside the body. '+(m.channel?'Inversion channel present.':'No strong-inversion channel.')+' '+m.region+'. Arrow keys rotate; Home resets.',
        style:{touchAction:'pan-y'},onKeyDown:function(e){var keys={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,.1],ArrowDown:[0,-.1]};if(keys[e.key]){e.preventDefault();turn(keys[e.key][0],keys[e.key][1]);}if(e.key==='Home'){e.preventDefault();setCamera({yaw:-.5,pitch:.5});}},
        onPointerDown:function(e){if(e.button!==0)return;drag.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);},
        onPointerMove:function(e){if(!drag.current)return;var dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;drag.current={x:e.clientX,y:e.clientY};turn(dx*.01,-dy*.01);},
        onPointerUp:function(){drag.current=null;},onPointerCancel:function(){drag.current=null;},onLostPointerCapture:function(){drag.current=null;}
      },faces.map(function(f){return f.node;}),label('Gate',[0,.37+lift,0]),label('Source',[-1.25,.1,-.48]),label('Drain',[1.25,.1,-.48]),label('Body',[0,-.55,-.55])),
      h('div',{className:'semi-inspector-controls',role:'group','aria-label':'MOSFET camera controls'},
        h('button',{type:'button',onClick:function(){turn(-.2,0);}},t('stem.semiconductor.rotate_left','Rotate left')),
        h('button',{type:'button',onClick:function(){turn(.2,0);}},t('stem.semiconductor.rotate_right','Rotate right')),
        h('button',{type:'button',onClick:function(){turn(0,.1);}},t('stem.semiconductor.tilt_up','Tilt up')),
        h('button',{type:'button',onClick:function(){turn(0,-.1);}},t('stem.semiconductor.tilt_down','Tilt down')),
        h('button',{type:'button',onClick:function(){setCamera({yaw:-.5,pitch:.5});}},t('stem.semiconductor.reset_view','Reset view')),
        h('label',null,h('input',{type:'checkbox',checked:exploded[0],onChange:function(){exploded[1](!exploded[0]);}}),'Separate gate layers')),
      h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Inspect a MOSFET layer'},['gate','oxide','channel','source','drain','body'].map(function(id){return h('button',{type:'button',key:id,'aria-pressed':layer[0]===id,onClick:function(){layer[1](id);}},id.charAt(0).toUpperCase()+id.slice(1));})),
      h('p',{className:'semi-reading',role:'status'},descriptions[layer[0]]),
      h('p',{className:'semi-model-note'},'Schematic cutaway, not to scale. Layer separation is for inspection; the real layers touch. Green marks channel formation, not its charge density or exact shape. The electrical values use the same model as the 2D diagram.')
    );
  }


  // Representative emission centers and illustrative widths; these are not measured spectra.
  var SEMI_LED_EMITTERS = {
    infrared:{name:'AlGaAs/GaAs (Infrared)',label:'Infrared · 940 nm',nm:940,sigma:22,color:'#FCA5A5'},
    'red-gaas':{name:'AlGaAs (Red)',label:'Red · 660 nm',nm:660,sigma:12,color:'#F87171'},
    'red-gan':{name:'GaAsP (Red)',label:'Red · 630 nm',nm:630,sigma:12,color:'#FB7185'},
    orange:{name:'GaAsP (Orange)',label:'Orange · 605 nm',nm:605,sigma:13,color:'#FB923C'},
    yellow:{name:'GaP:N (Yellow)',label:'Yellow · 585 nm',nm:585,sigma:15,color:'#FACC15'},
    green:{name:'InGaN (Green)',label:'Green · 525 nm',nm:525,sigma:15,color:'#4ADE80'},
    blue:{name:'InGaN (Blue)',label:'Blue · 470 nm',nm:470,sigma:12,color:'#60A5FA'},
    uv:{name:'AlGaN (UV)',label:'UV · 365 nm',nm:365,sigma:8,color:'#C4B5FD'},
    white:{name:'Blue InGaN + Phosphor',label:'Phosphor white',nm:460,sigma:11,color:'#F8FAFC'}
  };
  function semiLed(state) {
    state=state||{};
    var key=Object.prototype.hasOwnProperty.call(SEMI_LED_EMITTERS,state.ledMaterial)?state.ledMaterial:'red-gan';
    var mat=SEMI_LED_EMITTERS[key],current=semiNumber(state.ledCurrent,20,0,50),mix=!!state.ledMixMode;
    var rgb=[state.ledMixR,state.ledMixG,state.ledMixB].map(function(v,i){return Math.round(semiNumber(v,i===0?100:0,0,255));});
    var components=mix ? [
      {name:'Red channel',nm:630,sigma:12,weight:rgb[0]/255,color:'#FB7185'},
      {name:'Green channel',nm:525,sigma:15,weight:rgb[1]/255,color:'#4ADE80'},
      {name:'Blue channel',nm:470,sigma:12,weight:rgb[2]/255,color:'#60A5FA'}
    ] : key==='white' ? [
      {name:'Blue pump',nm:460,sigma:11,weight:.45*current/20,color:'#60A5FA'},
      {name:'Phosphor band',nm:570,sigma:48,weight:.85*current/20,color:'#FACC15'}
    ] : [{name:mat.name,nm:mat.nm,sigma:mat.sigma,weight:current/20,color:mat.color}];
    var active=components.some(function(p){return p.weight>0;});
    var visible=mix||key!=='uv'&&key!=='infrared';
    return {key:key,mat:mat,current:current,mix:mix,rgb:rgb,components:components,active:active,visible:visible,
      white:!mix&&key==='white',energy:mix||key==='white'?null:1239.841984/mat.nm,
      status:!active?'Off · no emission':visible?'Visible emission':'Outside the approximate visible range',
      preview:!active||!visible?'#020617':mix?'rgb('+rgb.join(',')+')':mat.color};
  }
  function semiLedSpectrum(model,nm) {
    if(!Number.isFinite(nm))return 0;
    return model.components.reduce(function(sum,p){return sum+p.weight*Math.exp(-.5*Math.pow((nm-p.nm)/p.sigma,2));},0);
  }


  var SEMI_GATES = {
    NOT:{inputs:1,formula:'Q = NOT A',desc:'The output is the opposite of A.',count:2},
    AND:{inputs:2,formula:'Q = A AND B',desc:'The output is 1 only when both inputs are 1.',count:6},
    OR:{inputs:2,formula:'Q = A OR B',desc:'The output is 1 when at least one input is 1.',count:6},
    NAND:{inputs:2,formula:'Q = NOT (A AND B)',desc:'The output is 0 only when both inputs are 1.',count:4},
    NOR:{inputs:2,formula:'Q = NOT (A OR B)',desc:'The output is 1 only when both inputs are 0.',count:4},
    XOR:{inputs:2,formula:'Q = A XOR B',desc:'The output is 1 when the inputs differ.',count:null},
    XNOR:{inputs:2,formula:'Q = NOT (A XOR B)',desc:'The output is 1 when the inputs match.',count:null}
  };
  function semiBit(value){return value===true||value===1||value==='1';}
  function semiLogic(type,a,b){
    type=Object.prototype.hasOwnProperty.call(SEMI_GATES,type)?type:'NOT';
    a=semiBit(a);b=semiBit(b);
    var q=type==='NOT'?!a:type==='AND'?a&&b:type==='OR'?a||b:type==='NAND'?!(a&&b):type==='NOR'?!(a||b):type==='XOR'?a!==b:a===b;
    return {type:type,a:a,b:b,q:q,inputs:SEMI_GATES[type].inputs,definition:SEMI_GATES[type]};
  }
  function semiNandTrace(type,a,b){
    var logic=semiLogic(type,a,b),values={A:logic.a,B:logic.b},nodes=[];
    function nand(left,right){
      var name='N'+(nodes.length+1),q=!(values[left]&&values[right]);
      nodes.push({name:name,left:left,right:right,a:values[left],b:values[right],q:q});values[name]=q;return name;
    }
    var t,u,v,out;
    switch(logic.type){
      case 'NOT':out=nand('A','A');break;
      case 'NAND':out=nand('A','B');break;
      case 'AND':t=nand('A','B');out=nand(t,t);break;
      case 'OR':u=nand('A','A');v=nand('B','B');out=nand(u,v);break;
      case 'NOR':u=nand('A','A');v=nand('B','B');t=nand(u,v);out=nand(t,t);break;
      default:t=nand('A','B');u=nand('A',t);v=nand('B',t);out=nand(u,v);if(logic.type==='XNOR')out=nand(out,out);
    }
    return {nodes:nodes,output:values[out],outputNode:out};
  }
  function semiCMOS(type,a,b){
    var logic=semiLogic(type,a,b);type=logic.type;
    if(['NOT','NAND','NOR'].indexOf(type)<0)return null;
    var pA={name:'A',on:!logic.a},pB={name:'B',on:!logic.b},nA={name:'A',on:logic.a},nB={name:'B',on:logic.b};
    var up=type==='NOT'?[[pA]]:type==='NAND'?[[pA],[pB]]:[[pA,pB]];
    var down=type==='NOT'?[[nA]]:type==='NAND'?[[nA,nB]]:[[nA],[nB]];
    function conducts(branches){return branches.some(function(branch){return branch.every(function(sw){return sw.on;});});}
    return {up:up,down:down,pullup:conducts(up),pulldown:conducts(down),q:logic.q};
  }
  function semiLogicExperiment(state){
    state=state||{};var logic=semiLogic(state.gateType,state.inputA,state.inputB),half=state.gateExperiment==='halfadder';
    var id=half?'halfadder':logic.type,inputs=half?2:logic.inputs;
    var rows=(inputs===1?[[false,false],[true,false]]:[[false,false],[false,true],[true,false],[true,true]]).map(function(pair){
      var q=semiLogic(half?'XOR':logic.type,pair[0],pair[1]).q;
      return {key:inputs===1?String(+pair[0]):String(+pair[0])+String(+pair[1]),a:pair[0],b:pair[1],q:q,carry:half&&pair[0]&&pair[1]};
    });
    var raw=(state.gateRecorded||{})[id],recorded=Array.isArray(raw)?rows.map(function(row){return row.key;}).filter(function(key){return raw.indexOf(key)>=0;}):[];
    return {id:id,half:half,logic:logic,inputs:inputs,rows:rows,recorded:recorded,
      key:inputs===1?String(+logic.a):String(+logic.a)+String(+logic.b),
      q:half?logic.a!==logic.b:logic.q,carry:half&&logic.a&&logic.b,total:+logic.a+ +logic.b};
  }


  var SEMI_MILESTONES = [
    {year:1971,name:'Intel 4004',transistors:2300,node:'10 µm',dies:1,source:'https://www.intel.com/pressroom/kits/quickreffam.htm'},
    {year:1978,name:'Intel 8086',transistors:29000,node:'3 µm',dies:1,source:'https://www.intel.com/pressroom/kits/quickreffam.htm'},
    {year:1985,name:'Intel 386 DX',transistors:275000,node:'1.5 µm',dies:1,source:'https://www.intel.com/pressroom/kits/quickreffam.htm'},
    {year:1993,name:'Intel Pentium',transistors:3100000,node:'0.8 µm',dies:1,source:'https://www.intel.com/pressroom/kits/quickreffam.htm'},
    {year:2020,name:'Apple M1',transistors:16000000000,node:'5 nm',dies:1,source:'https://www.apple.com/newsroom/2020/11/apple-unleashes-m1/'},
    {year:2021,name:'Apple M1 Max',transistors:57000000000,node:'5 nm',dies:1,source:'https://www.apple.com/newsroom/2021/10/introducing-m1-pro-and-m1-max-the-most-powerful-chips-apple-has-ever-built/'},
    {year:2022,name:'Apple M1 Ultra',transistors:114000000000,node:'5 nm',dies:2,source:'https://www.apple.com/newsroom/2022/03/apple-unveils-m1-ultra-the-worlds-most-powerful-chip-for-a-personal-computer/'},
    {year:2024,name:'NVIDIA B200',transistors:208000000000,node:'TSMC 4NP',dies:2,source:'https://nvidianews.nvidia.com/news/nvidia-blackwell-platform-arrives-to-power-a-new-era-of-computing'}
  ];
  function semiDoubling(year,period){
    return 2300*Math.pow(2,(semiNumber(year,2024,1965,2030)-1971)/semiNumber(period,2,1,4));
  }
  function semiMoore(state){
    state=state||{};var year=Math.round(semiNumber(state.mooreYear,2024,1965,2030)),period=semiNumber(state.mooreDoubling,2,1,4);
    var multi=state.mooreIncludeMulti!==false,log=state.mooreLogScale!==false,show=state.mooreShowPred!==false;
    var points=SEMI_MILESTONES.filter(function(p){return multi||p.dies===1;});
    var selected=SEMI_MILESTONES.find(function(p){return p.year===year;})||null,included=!!selected&&(multi||selected.dies===1);
    var max=Math.max(208e9,semiDoubling(2030,period)),exp=Math.floor(Math.log10(max)),unit=Math.pow(10,exp),lead=max/unit;
    var linearMax=(lead<=1?1:lead<=2?2:lead<=5?5:10)*unit,logMax=Math.ceil(Math.log10(max)),logMin=Math.floor(Math.log10(Math.min(2300,semiDoubling(1965,period))));
    return {year:year,period:period,multi:multi,log:log,show:show,points:points,selected:selected,included:included,
      reference:semiDoubling(year,period),ratio:included?selected.transistors/semiDoubling(year,period):null,
      status:selected?(included?'Reported product count':'Product excluded by die filter'):year>2024?'Scenario only · dataset ends in 2024':'No product entry for this year',
      previous:points.filter(function(p){return p.year<year;}).slice(-1)[0]||null,next:points.find(function(p){return p.year>year;})||null,
      linearMax:linearMax,logMin:logMin,logMax:logMax,
      fraction:function(n){return log?(Math.log10(n)-logMin)/(logMax-logMin):n/linearMax;}
    };
  }
  function semiTrendCount(n){
    return n>=1e15?n.toExponential(2):n>=1e12?(n/1e12).toFixed(2)+' trillion':formatTransistorCount(n);
  }


  var SEMI_LESSONS = {bandgap:'Band Gap',doping:'Doping',pnjunction:'P-N Junction',transistor:'Transistor',gates:'Logic Gates',ivcurve:'I–V Curves',sandbox:'Circuit Lab',waferfab:'Wafer Fab',ledspec:'LED Spectrum',solarcell:'Solar Cell',moorelaw:"Moore’s Law",qwell:'Quantum Wells',memory:'Memory Cells',amplifier:'Amplifier',dopeHunt:'Doping Discovery'};
  var SEMI_ROUTES = [
    {id:'charge',question:'How do materials control charge?',steps:['bandgap','doping','pnjunction','dopeHunt']},
    {id:'light',question:'How do devices exchange light and energy?',steps:['ledspec','solarcell','ivcurve','qwell','amplifier']},
    {id:'logic',question:'How does a chip switch, calculate and remember?',steps:['transistor','gates','memory','sandbox']},
    {id:'manufacture',question:'How are chips made and compared?',steps:['waferfab','moorelaw']}
  ];
  var semiSnapshotSequence=0;
  function semiCopy(value){try{return JSON.parse(JSON.stringify(value));}catch(e){return null;}}
  function semiWorkspaceField(workspace,key){
    var exact={bandgap:['material','temperature','showPhoton','photonNm','showFermi'],
      doping:['dopant','dopantCount','crystalSize','dopingTemp','showResistivity','crystalView'],
      transistor:['transistorType','gateVoltage','drainVoltage','showCurrentFlow','showCMOS','deviceView'],
      gates:['gateType','inputA','inputB','gateChain','showTruthGrid','gateExperiment','gateRecorded'],
      dopeHunt:['dopeHunt']};
    if(exact[workspace])return exact[workspace].indexOf(key)>=0;
    var prefix={pnjunction:'pn',ivcurve:'iv',sandbox:'circuit',waferfab:'fab',ledspec:'led',solarcell:'solar',moorelaw:'moore',qwell:'qw',memory:'mem',amplifier:'amp'}[workspace];
    return !!prefix&&key.indexOf(prefix)===0;
  }
  function semiEvidenceRows(rows){
    var seen={};return (Array.isArray(rows)?rows:[]).filter(function(row){
      if(!Array.isArray(row)||typeof row[0]!=='string'||!row[0]||Object.prototype.hasOwnProperty.call(seen,row[0]))return false;
      Object.defineProperty(seen,row[0],{value:true,enumerable:true});return true;
    }).map(function(row){return [row[0],typeof row[1]==='string'||typeof row[1]==='boolean'||typeof row[1]==='number'&&isFinite(row[1])?String(row[1]):'Not recorded'];});
  }
  function semiCapture(state,label,evidence,meta){
    state=state||{};meta=meta||{};
    var workspace=Object.prototype.hasOwnProperty.call(SEMI_LESSONS,state.subtool)?state.subtool:'bandgap';
    var data=Object.assign({},state,{snapshotVersion:2,subtool:workspace,mode:state.mode||'explore'});
    ['guidedSubtool','guidedObservation','guidedPrediction','guidedEvidence','guidedObservationSaved'].forEach(function(key){delete data[key];});
    data.recordedEvidence=semiEvidenceRows(evidence);
    if(typeof meta.guidedObservation==='string'){
      data.guidedSubtool=workspace;data.guidedObservation=meta.guidedObservation;data.guidedPrediction=meta.guidedPrediction||'';
      data.guidedEvidence={baseline:semiEvidenceRows((meta.guidedEvidence||{}).baseline),observed:semiEvidenceRows((meta.guidedEvidence||{}).observed)};
      data.guidedObservationSaved=workspace;
    }
    var now=Date.now();
    return {id:(data.guidedObservation?'semi-guided-':'semi-')+now+'-'+(++semiSnapshotSequence),tool:'semiconductor',label:label,data:semiCopy(data),timestamp:now};
  }
  function semiNotebookEntries(snapshots){
    return (Array.isArray(snapshots)?snapshots:[]).map(function(entry,i){
      if(!entry||entry.tool!=='semiconductor')return null;
      var data=entry.data&&typeof entry.data==='object'?entry.data:{},mode=data.mode||'explore',id=data.guidedSubtool||data.subtool;
      var workspace=mode==='explore'&&Object.prototype.hasOwnProperty.call(SEMI_LESSONS,id)?id:null;
      var observation=typeof data.guidedObservation==='string'?data.guidedObservation:'',prediction=typeof data.guidedPrediction==='string'?data.guidedPrediction:'';
      return {key:String(entry.id||'legacy')+'@'+i,label:typeof entry.label==='string'?entry.label:'Saved Semiconductor Lab state',
        workspace:workspace,mode:mode,observation:observation,prediction:prediction,
        evidence:semiEvidenceRows(data.recordedEvidence||(data.guidedEvidence||{}).observed),
        baseline:semiEvidenceRows((data.guidedEvidence||{}).baseline),data:data,
        timestamp:typeof entry.timestamp==='number'&&isFinite(entry.timestamp)?entry.timestamp:null};
    }).filter(Boolean);
  }
  function semiRestore(current,entry){
    if(!entry||!entry.workspace||!Object.prototype.hasOwnProperty.call(SEMI_LESSONS,entry.workspace))return null;
    var next=Object.assign({},current||{});
    Object.keys(next).forEach(function(key){if(semiWorkspaceField(entry.workspace,key))delete next[key];});
    Object.keys(entry.data||{}).forEach(function(key){if(semiWorkspaceField(entry.workspace,key))next[key]=semiCopy(entry.data[key]);});
    next.subtool=entry.workspace;next.mode='explore';next.guidedSetupSubtool=null;next.guidedObservationSaved=null;next.aiExplain=null;
    return next;
  }
  function semiCompare(a,b){
    if(!a||!b)return {reason:'Choose two entries to compare.',rows:[]};
    if(!a.workspace||a.workspace!==b.workspace)return {reason:'Choose two entries from the same lesson. Different lessons use different quantities.',rows:[]};
    var left=semiEvidenceRows(a.evidence),right=semiEvidenceRows(b.evidence),labels=left.map(function(r){return r[0];});
    right.forEach(function(r){if(labels.indexOf(r[0])<0)labels.push(r[0]);});
    return {reason:labels.length?'':'These older entries do not contain recorded numerical evidence.',rows:labels.map(function(label){
      var l=left.find(function(r){return r[0]===label;}),r=right.find(function(r){return r[0]===label;});
      return [label,l?l[1]:'Not recorded',r?r[1]:'Not recorded'];
    })};
  }
  function semiRouteProgress(routeId,entries){
    var route=SEMI_ROUTES.find(function(r){return r.id===routeId;});if(!route)return null;
    var done=route.steps.filter(function(id){return (entries||[]).some(function(e){return e.workspace===id&&e.observation.trim().length>=12;});});
    return {route:route,done:done,next:route.steps.find(function(id){return done.indexOf(id)<0;})||null};
  }
  function semiNotebookMarkdown(entries){
    function text(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\\\x60*_{}\[\]#|]/g,function(c){return '\\'+c;}).replace(/\r?\n/g,' ');}
    var lines=['# Semiconductor Lab notebook','','Recorded teaching-model evidence. Saved values may come from an earlier model version.',''];
    (entries||[]).forEach(function(e){
      lines.push('## '+text(e.label),'','Lesson: '+text(e.workspace?SEMI_LESSONS[e.workspace]:e.mode+' session'),'');
      if(e.prediction)lines.push('Prediction: '+text(e.prediction),'');
      if(e.observation)lines.push('Observation: '+text(e.observation),'');
      if(e.evidence.length){lines.push('| Quantity | Recorded value |','| --- | --- |');e.evidence.forEach(function(r){lines.push('| '+text(r[0])+' | '+text(r[1])+' |');});lines.push('');}
      else lines.push('No numerical evidence was stored with this entry.','');
    });
    return lines.join('\n');
  }


  // Controlled experiments reuse the same teaching models as the live workspaces.
  function semiSweepSpec(state, materials, solarMaterials, variable) {
    state=state||{};var id=state.subtool||'bandgap',p=state.transistorType==='mosfet-p';
    if(id==='bandgap'){
      var key=state.material||'silicon',mat=materials&&materials[key];
      if(['silicon','germanium','gaas'].indexOf(key)<0||!mat)return {unavailable:'Temperature sweeps currently support silicon, germanium and GaAs. Select one of these materials in the simulation.'};
      return {workspace:id,field:'temperature',xLabel:'Temperature',xUnit:'K',min:50,max:800,start:200,end:500,step:10,
        settings:{material:key,temperature:semiNumber(state.temperature,300,50,800)},material:mat,
        held:mat.name||key,outputs:[{id:'gap',label:'Band gap',unit:'eV',scale:'linear'},{id:'intrinsic',label:'Intrinsic carrier concentration',unit:'cm⁻³',scale:'log'}],
        question:'As temperature increases, how will the band gap and intrinsic carrier concentration change?',
        scope:'Intrinsic thermal-equilibrium estimates using the workspace model. Carrier concentration uses a logarithmic axis: equal vertical steps represent equal ratios. These are model predictions, not measured data.'};
    }
    if(id==='solarcell'){
      var sk=state.solarMaterial||'silicon',sm=solarMaterials&&(solarMaterials[sk]||solarMaterials.silicon);
      if(!sm)return {unavailable:'Solar material data is unavailable.'};
      if(!Object.prototype.hasOwnProperty.call(solarMaterials,sk))sk='silicon';
      var heating=variable==='temperature',ss={solarMaterial:sk,solarIrradiance:semiNumber(state.solarIrradiance,1000,0,1200),
        solarTemp:semiNumber(state.solarTemp,300,270,370),solarArea:semiNumber(state.solarArea,100,10,500),
        solarLoadR:semiNumber(state.solarLoadR,100,0,10000),solarOpen:!!state.solarOpen};
      var load=ss.solarOpen?'open circuit':ss.solarLoadR===0?'short circuit':semiSweepValue(ss.solarLoadR)+' Ω resistor';
      return {workspace:id,field:heating?'solarTemp':'solarIrradiance',variable:heating?'temperature':'irradiance',
        variables:[{id:'irradiance',label:'Irradiance (W/m²)'},{id:'temperature',label:'Temperature (K)'}],
        xLabel:heating?'Temperature':'Irradiance',xUnit:heating?'K':'W/m²',min:heating?270:0,max:heating?370:1200,start:heating?270:0,end:heating?370:1200,
        settings:ss,material:sm,held:sm.name+'; area '+ss.solarArea+' cm²; '+load+'; '+(heating?'irradiance '+ss.solarIrradiance+' W/m²':'temperature '+ss.solarTemp+' K'),
        outputs:[{id:'power',label:'Delivered power',unit:'W',scale:'linear'}],reference:{label:'Available maximum power',unit:'W'},
        question:heating?'With irradiance and load fixed, will heating change available and delivered power in the same way?':'With the same load connected, will more light increase available and delivered power by the same amount?',
        scope:'Empirical solar I–V teaching model with a resistive load. The dashed maximum-power curve assumes an optimally matched load at every sample; the solid delivered-power curve keeps your selected load fixed. These are calculated estimates, not measured cell performance.'};
    }
    if(id==='pnjunction')return {workspace:id,field:'pnBias',xLabel:'Junction bias',xUnit:'V',min:-3,max:3,start:-1,end:.5,step:.1,
      settings:{pnBias:semiNumber(state.pnBias,0,-3,3)},held:'Silicon; 300 K; equal donor and acceptor densities of 10¹⁶ cm⁻³; built-in potential 0.7 V',
      outputs:[{id:'width',label:'Depletion width',unit:'µm',scale:'linear'}],
      question:'Will the depletion region widen or narrow as you move from reverse toward forward bias?',
      scope:'Abrupt-junction depletion approximation. At bias ≥ 0.65 V this model withholds depletion width; gaps in the plot are not zero width. Junction settings other than bias are fixed by this teaching model.'};
    if(id==='transistor'){
      if(state.showCMOS||state.transistorType==='bjt-npn')return {unavailable:'Select N-MOSFET or P-MOSFET in the simulation to sweep gate voltage. BJT and CMOS views do not calculate a matching drain-current curve.'};
      return {workspace:id,field:'gateVoltage',xLabel:'Gate voltage VGS',xUnit:'V',min:p?-5:0,max:p?0:5,start:p?-5:0,end:p?0:5,step:.1,
        settings:{transistorType:p?'mosfet-p':'mosfet-n',showCMOS:false,gateVoltage:semiNumber(state.gateVoltage,0,p?-5:0,p?0:5),drainVoltage:semiNumber(state.drainVoltage,p?-5:5,p?-10:0,p?0:10)},
        held:(p?'P':'N')+'-MOSFET; VDS = '+semiNumber(state.drainVoltage,p?-5:5,p?-10:0,p?0:10)+' V; |threshold| = 1.5 V; fixed model geometry',
        outputs:[{id:'current',label:'Signed drain current',unit:'mA',scale:'linear'}],
        question:'Where will the channel turn on, and how will drain current change beyond that point?',
        scope:'Ideal long-channel MOSFET model with fixed threshold and geometry. P-channel current is negative by the workspace sign convention. Leakage, heating and short-channel effects are omitted.'};
    }
    return null;
  }
  function semiSweepRun(state, options, materials, solarMaterials) {
    options=options||{};var spec=semiSweepSpec(state,materials,solarMaterials,options.variable);
    if(!spec||spec.unavailable)return {error:spec?spec.unavailable:'Sweeps are not available for this lesson.'};
    function endpoint(value,fallback){return value==null?fallback:typeof value==='string'&&!value.trim()?NaN:Number(value);}
    var start=endpoint(options.start,spec.start),end=endpoint(options.end,spec.end);
    if(!isFinite(start)||!isFinite(end)||start<spec.min||end>spec.max||start>=end)
      return {error:'Enter a start smaller than the end, both within '+spec.min+' to '+spec.max+' '+spec.xUnit+'.'};
    var output=spec.outputs.find(function(o){return o.id===options.output;})||spec.outputs[0];
    function sample(x){
      var y=null,status='Calculated',extra={};
      if(spec.workspace==='bandgap'){var gap=semiBandGap(spec.material,x,spec.settings.material);y=output.id==='gap'?gap:semiIntrinsic(spec.material,x,gap);}
      if(spec.workspace==='pnjunction'){var pn=semiJunction(x);y=pn.valid?pn.widthUm:null;status=pn.valid?pn.regime:'Outside depletion approximation';}
      if(spec.workspace==='transistor'){var mos=semiMOS(spec.settings.transistorType,x,spec.settings.drainVoltage);y=mos.currentA==null?null:mos.currentA*1000;status=mos.region;}
      if(spec.workspace==='solarcell'){
        var ss=Object.assign({},spec.settings);ss[spec.field]=x;
        var model=semiSolar(spec.material,ss.solarIrradiance,ss.solarTemp,ss.solarArea,ss.solarLoadR,ss.solarOpen);
        y=model.loadPower;extra={reference:model.Pmax,voltage:model.loadV,current:model.loadI,fraction:model.Pmax>0?model.loadPower/model.Pmax:null};
        status=model.G===0?'No illumination':ss.solarOpen?'Open circuit':ss.solarLoadR===0?'Short circuit':'Fixed resistive load';
      }
      return Object.assign({x:x,y:y!=null&&isFinite(y)?y:null,status:status},extra);
    }
    var points=Array.from({length:11},function(_,i){return sample(i===10?end:start+(end-start)*i/10);});
    return {version:1,workspace:spec.workspace,field:spec.field,xLabel:spec.xLabel,xUnit:spec.xUnit,output:semiCopy(output),
      reference:spec.reference?semiCopy(spec.reference):null,variable:spec.variable||null,
      start:start,end:end,points:points,baseline:sample(spec.settings[spec.field]),settings:semiCopy(spec.settings),
      held:spec.held,scope:spec.scope,prediction:typeof options.prediction==='string'?options.prediction.slice(0,500):''};
  }
  function semiSweepValue(value){return value==null||!isFinite(value)?'Not calculated':value===0?'0':Math.abs(value)<.001||Math.abs(value)>=10000?value.toExponential(3):String(Number(value.toPrecision(5)));}
  function semiSweepGeometry(run) {
    var log=run.output.scale==='log',all=run.points.concat([run.baseline]),reference=run.reference?all.map(function(p){return {x:p.x,y:p.reference};}):[];
    all=all.concat(reference);
    function valid(p){return p.y!=null&&isFinite(p.y)&&(!log||p.y>0);}
    function transform(y){return log?Math.log10(y):y;}
    var values=all.filter(valid).map(function(p){return transform(p.y);}),lo=values.length?Math.min.apply(null,values):0,hi=values.length?Math.max.apply(null,values):1;
    if(!log){lo=Math.min(0,lo);hi=Math.max(0,hi);}
    var pad=hi===lo?Math.max(1,Math.abs(hi)*.1):(hi-lo)*.08;lo-=pad;hi+=pad;
    var xmin=Math.min(run.start,run.baseline.x),xmax=Math.max(run.end,run.baseline.x);
    function xy(p){return {x:80+(p.x-xmin)/(xmax-xmin)*540,y:valid(p)?260-(transform(p.y)-lo)/(hi-lo)*220:null};}
    function pathsFor(points){var paths=[],path='';
      points.forEach(function(p){var q=xy(p);if(q.y==null){if(path)paths.push(path);path='';}else path+=(path?' L':'M')+q.x+' '+q.y;});
      if(path)paths.push(path);return paths;
    }var paths=pathsFor(run.points);
    return {points:run.points.map(xy),baseline:xy(run.baseline),paths:paths,referencePaths:run.reference?pathsFor(reference.slice(0,-1)):[],
      xTicks:Array.from({length:5},function(_,i){return {x:80+i*135,label:semiSweepValue(xmin+(xmax-xmin)*i/4)};}),
      yTicks:Array.from({length:5},function(_,i){var value=lo+(hi-lo)*i/4;return {y:260-i*55,label:log?'10^'+Number(value.toFixed(1)):semiSweepValue(Number(value.toPrecision(3)))};})};
  }
  function semiSweepApply(current,run,index) {
    if(!run||run.version!==1||!Array.isArray(run.points)||!run.points[index])return null;
    var next=Object.assign({},current||{},semiCopy(run.settings));next[run.field]=run.points[index].x;
    next.subtool=run.workspace;next.mode='explore';next.guidedObservationSaved=null;return next;
  }
  function semiSweepEvidence(run) {
    var rows=[['Experiment','Controlled parameter sweep'],['Held constant',run.held],['Plotted output',run.output.label+' ('+run.output.unit+')'],['Axis scale',run.output.scale==='log'?'Logarithmic':'Linear'],
      ['Baseline at '+semiSweepValue(run.baseline.x)+' '+run.xUnit,semiSweepValue(run.baseline.y)+' '+(run.baseline.y==null?'':run.output.unit)],
      ['Model scope',run.scope]].concat(run.points.map(function(p,i){return ['Sample '+(i+1)+' · '+run.xLabel+' = '+semiSweepValue(p.x)+' '+run.xUnit,semiSweepValue(p.y)+(p.y==null?' · '+p.status:' '+run.output.unit+' · '+p.status)];}));
    if(run.reference){
      rows.push(['Reference curve',run.reference.label+' ('+run.reference.unit+')'],['Reference baseline',semiSweepValue(run.baseline.reference)+' '+run.reference.unit]);
      run.points.forEach(function(p,i){rows.push(['Sample '+(i+1)+' · '+run.reference.label,semiSweepValue(p.reference)+' '+run.reference.unit+'; load voltage '+semiSweepValue(p.voltage)+' V; load current '+semiSweepValue(p.current)+' A']);});
    }
    return rows;
  }

  function semiSweepCompare(run, aIndex, bIndex) {
    if(!run||!Array.isArray(run.points)||!Number.isInteger(aIndex)||!Number.isInteger(bIndex)||!run.points[aIndex]||!run.points[bIndex])
      return {error:'Choose two samples from this recorded run.',rows:[]};
    if(aIndex===bIndex)return {error:'Choose different samples for A and B.',rows:[]};
    var a=run.points[aIndex],b=run.points[bIndex];
    function finite(v){return typeof v==='number'&&isFinite(v);}
    function row(label,unit,av,bv){
      var delta=finite(av)&&finite(bv)?bv-av:null;if(!finite(delta))delta=null;
      var ratio=finite(av)&&finite(bv)&&av>0&&bv>=0?bv/av:null;
      var percent=ratio!=null?(ratio-1)*100:null;
      if(!finite(ratio))ratio=null;if(!finite(percent))percent=null;
      var reason=!finite(av)||!finite(bv)?'A reading is outside the model.':av===0?'Relative change is undefined because A is zero.':av<0||bv<0?'Signed values: use B − A rather than a growth percentage.':ratio==null?'Relative change exceeds the numeric range.':'';
      return {label:label,unit:unit,a:finite(av)?av:null,b:finite(bv)?bv:null,delta:delta,ratio:ratio,percent:percent,reason:reason};
    }
    var rows=[row(run.output.label,run.output.unit,a.y,b.y)];
    if(run.reference)rows.push(row(run.reference.label,run.reference.unit,a.reference,b.reference));
    return {aIndex:aIndex,bIndex:bIndex,a:semiCopy(a),b:semiCopy(b),rows:rows,error:'',
      scope:'This compares two recorded samples, not the shape of the whole curve. Differences use unrounded values; displayed readings are rounded.'};
  }
  function semiSweepComparisonEvidence(run, comparison) {
    if(!comparison||comparison.error||!comparison.rows.length)return [];
    var rows=[['Comparison A','Sample '+(comparison.aIndex+1)+' · '+semiSweepValue(comparison.a.x)+' '+run.xUnit],
      ['Comparison B','Sample '+(comparison.bIndex+1)+' · '+semiSweepValue(comparison.b.x)+' '+run.xUnit],
      ['Comparison scope',comparison.scope]];
    comparison.rows.forEach(function(r){rows.push(['Comparison · '+r.label,
      'A: '+semiSweepValue(r.a)+' '+r.unit+'; B: '+semiSweepValue(r.b)+' '+r.unit+'; B − A: '+semiSweepValue(r.delta)+' '+r.unit+
      (r.reason?'; '+r.reason:'; B / A: '+semiSweepValue(r.ratio)+'; relative change: '+semiSweepValue(r.percent)+'%')]);});
    return rows;
  }
  function SemiSweepComparison(props) {
    var h=props.React.createElement,run=props.run,box=props.box,update=props.update;
    var ai=Number.isInteger(box.compareA)?box.compareA:0,bi=Number.isInteger(box.compareB)?box.compareB:run.points.length-1;
    var comparison=semiSweepCompare(run,ai,bi);
    function select(label,value,key){return h('label',null,label,h('select',{'aria-label':label,value:value,style:{display:'block',width:'100%',minHeight:44,padding:8,marginTop:6,background:'#020617',color:'#f8fafc',border:'1px solid #64748b',borderRadius:8},onChange:function(e){var patch={saved:false};patch[key]=Number(e.target.value);update(patch);}},
      run.points.map(function(p,i){return h('option',{key:i,value:i},'Sample '+(i+1)+' · '+semiSweepValue(p.x)+' '+run.xUnit);}))); }
    return h('section',{'aria-label':'Compare sweep samples','data-sweep-comparison':true,style:{margin:'16px 0',padding:12,border:'1px solid #475569',borderRadius:10}},
      h('button',{type:'button','aria-expanded':!!box.comparisonOpen,onClick:function(){update({comparisonOpen:!box.comparisonOpen,saved:false});}},box.comparisonOpen?'Hide sample comparison':'Compare two samples'),
      box.comparisonOpen&&h('div',null,
        h('p',null,'Choose A as your reference and B as your comparison. This reads the saved run and does not change the simulation.'),
        h('div',{className:'semi-study-grid'},select('Comparison sample A',ai,'compareA'),select('Comparison sample B',bi,'compareB')),
        comparison.error?h('p',{role:'status'},comparison.error):h('div',null,
          comparison.rows.map(function(r){return h('section',{key:r.label,'aria-label':r.label+' comparison'},
            h('h4',{style:{marginTop:16}},r.label+' ('+r.unit+')'),
            h('table',null,h('caption',null,'A → B · '+r.label),
              h('tbody',null,[['A',semiSweepValue(r.a)+' '+r.unit],['B',semiSweepValue(r.b)+' '+r.unit],['Change (B − A)',semiSweepValue(r.delta)+' '+r.unit]].map(function(row){return h('tr',{key:row[0]},h('th',{scope:'row'},row[0]),h('td',null,row[1]));}))),
            h('p',null,r.reason||('B / A = '+semiSweepValue(r.ratio)+' ×; relative change = '+semiSweepValue(r.percent)+'%.')),
            r.a<0&&r.b<0&&h('p',null,'A more negative current can have a larger magnitude. Distinguish the current’s sign from its size.'));}),
          h('p',null,comparison.scope),
          h('p',null,'Use these readings as evidence: “When '+run.xLabel.toLowerCase()+' changed from '+semiSweepValue(comparison.a.x)+' to '+semiSweepValue(comparison.b.x)+' '+run.xUnit+', … changed because …”. Check another pair before describing the full curve.'),
          run.output.scale==='log'&&h('p',null,'On this logarithmic axis, equal vertical distances represent equal ratios. The difference above is in the original units, not log units.'),
          h('p',null,'This selected comparison will be included when you save the sweep. Your explanation below remains your own.'))));
  }


  function semiSavedSweep(entry) {
    var run=entry&&entry.data&&entry.data.parameterSweep;if(!run)return {run:null,error:''};
    var fields={bandgap:['temperature'],pnjunction:['pnBias'],transistor:['gateVoltage'],solarcell:['solarIrradiance','solarTemp']};
    function finite(v){return typeof v==='number'&&isFinite(v);}
    function label(v){return typeof v==='string'&&v.length>0&&v.length<=1000;}
    function point(p){return p&&(p.status==null||typeof p.status==='string')&&finite(p.x)&&(p.y===null||finite(p.y))&&(!run.reference||p.reference===null||finite(p.reference));}
    if(run.version!==1||!Object.prototype.hasOwnProperty.call(fields,entry.workspace)||run.workspace!==entry.workspace||fields[entry.workspace].indexOf(run.field)<0||
      !Array.isArray(run.points)||run.points.length!==11||!run.points.every(point)||!point(run.baseline)||
      !finite(run.start)||!finite(run.end)||run.start>=run.end||run.points[0].x!==run.start||run.points[10].x!==run.end||
      run.points.some(function(p,i){return i>0&&p.x<=run.points[i-1].x;})||
      !run.output||!label(run.output.label)||!label(run.output.unit)||['linear','log'].indexOf(run.output.scale)<0||
      !label(run.xLabel)||!label(run.xUnit)||!label(run.held)||!label(run.scope)||
      (run.reference&&(!label(run.reference.label)||!label(run.reference.unit)))||
      (run.output.scale==='log'&&run.points.concat([run.baseline]).some(function(p){return p.y!==null&&p.y<=0;})))
      return {run:null,error:'This entry’s saved plot data is incomplete or unsupported. Its recorded notebook evidence is still available above.'};
    var copy=semiCopy(run);if(!copy)return {run:null,error:'Saved plot data could not be read.'};
    return {run:copy,error:''};
  }
  function SemiSavedSweep(props) {
    var h=props.React.createElement,parsed=semiSavedSweep(props.entry),run=parsed.run;
    var selection=props.React.useState(0),index=selection[0],setIndex=selection[1];
    if(parsed.error)return h('p',null,parsed.error);
    if(!run)return null;
    var g=semiSweepGeometry(run),p=run.points[index]||run.points[0],saved=props.entry.data.sweepComparison;
    var comparison=saved?semiSweepCompare(run,saved.aIndex,saved.bIndex):null;
    return h('details',{'data-saved-sweep':true,style:{margin:'14px 0',padding:12,border:'1px solid #64748b',borderRadius:10}},
      h('summary',null,'Review saved sweep plot'),
      h('p',null,'Recorded run · values are shown as saved. Reviewing a sample does not change your live simulation, drafts or current sweep. Restoring experiment settings uses the current model and may produce different results.'),
      h('h4',null,run.output.label+(run.reference?' and '+run.reference.label:'')+' ('+run.output.unit+')'),
      h('p',null,run.xLabel+' ('+run.xUnit+') · '+(run.output.scale==='log'?'Logarithmic':'Linear')+' output axis.'),
      h('p',null,'Held constant: '+run.held+'.'),
      h('svg',{viewBox:'0 0 660 330',role:'img','aria-label':'Saved '+run.output.label+' curve with '+run.points.length+' recorded samples. Select a sample below for its reading.',style:{width:'100%',display:'block',background:'#07111f',borderRadius:8}},
        g.yTicks.map(function(t,i){return h('g',{key:'y'+i},h('line',{x1:80,x2:620,y1:t.y,y2:t.y,stroke:'#334155'}),h('text',{x:73,y:t.y+4,textAnchor:'end',fill:'#e2e8f0',fontSize:15},t.label));}),
        g.xTicks.map(function(t,i){return h('text',{key:'x'+i,x:t.x,y:282,textAnchor:'middle',fill:'#e2e8f0',fontSize:16},t.label);}),
        h('text',{x:350,y:313,textAnchor:'middle',fill:'#e2e8f0',fontSize:17},run.xLabel+' ('+run.xUnit+')'),
        g.referencePaths.map(function(path,i){return h('path',{key:'r'+i,d:path,fill:'none',stroke:'#c4b5fd',strokeWidth:3,strokeDasharray:'8 6'});}),
        g.paths.map(function(path,i){return h('path',{key:'p'+i,d:path,fill:'none',stroke:'#67e8f9',strokeWidth:3});}),
        g.points.map(function(point,i){return point.y!==null&&h('circle',{key:i,cx:point.x,cy:point.y,r:i===index?7:4,fill:i===index?'#fff':'#67e8f9'});}),
        g.baseline.y!==null&&h('path',{d:'M'+g.baseline.x+' '+(g.baseline.y-7)+' l7 7 l-7 7 l-7 -7 Z',fill:'#fbbf24',stroke:'#07111f',strokeWidth:2})),
      h('p',null,'Cyan: recorded samples. White dot: selected sample. Amber diamond: saved baseline. '+(run.reference?'Dashed lavender: '+run.reference.label+'. ':'')+'Lines connect the stored samples as a guide; no new simulation is run.'),
      h('p',null,'Saved baseline: '+semiSweepValue(run.baseline.x)+' '+run.xUnit+' → '+semiSweepValue(run.baseline.y)+' '+run.output.unit+(run.reference?'; available maximum '+semiSweepValue(run.baseline.reference)+' '+run.reference.unit:'')+'.'),
      h('label',null,'Review sample',h('select',{'aria-label':'Review sample',value:index,onChange:function(e){setIndex(Number(e.target.value));},style:{display:'block',width:'100%',minHeight:44,margin:'8px 0',padding:8,background:'#020617',color:'#f8fafc',border:'1px solid #64748b',borderRadius:8}},
        run.points.map(function(point,i){return h('option',{key:i,value:i},'Sample '+(i+1)+' · '+semiSweepValue(point.x)+' '+run.xUnit);}))),
      h('div',{role:'status'},h('p',null,'Sample '+(index+1)+': '+semiSweepValue(p.x)+' '+run.xUnit+' → '+semiSweepValue(p.y)+(p.y===null?'':' '+run.output.unit)+'. '+(p.status||'')),
        run.reference&&h('p',null,run.reference.label+': '+semiSweepValue(p.reference)+' '+run.reference.unit)),
      h('details',null,h('summary',null,'Saved model assumptions'),h('p',null,run.scope)),
      comparison&&!comparison.error&&h('div',null,h('h4',null,'Saved comparison'),
        h('p',null,'A: sample '+(comparison.aIndex+1)+' ('+semiSweepValue(comparison.a.x)+' '+run.xUnit+'); B: sample '+(comparison.bIndex+1)+' ('+semiSweepValue(comparison.b.x)+' '+run.xUnit+').'),
        h('p',null,'The pair is restored from your saved selection. Differences below are calculated from the stored readings, not the current model.'),
        comparison.rows.map(function(row){return h('p',{key:row.label},row.label+': B − A = '+semiSweepValue(row.delta)+' '+row.unit+'. '+(row.reason||('B / A = '+semiSweepValue(row.ratio)+'; relative change = '+semiSweepValue(row.percent)+'%.')));})),
      saved&&(!comparison||comparison.error)&&h('p',null,'The saved comparison selection is unavailable. The original recorded evidence remains above.'));
  }


  function semiSweepOverlay(aEntry,bEntry) {
    if(!aEntry||!bEntry)return {error:'',runs:[]};
    var aResult=semiSavedSweep(aEntry),bResult=semiSavedSweep(bEntry);
    if(!aResult.run||!bResult.run)return {error:'Curve overlay needs two complete saved sweeps. Their recorded evidence can still be compared below.',runs:[]};
    var a=aResult.run,b=bResult.run;
    if(a.workspace!==b.workspace||a.field!==b.field||a.xUnit!==b.xUnit||a.output.id!==b.output.id||
      a.output.label!==b.output.label||a.output.unit!==b.output.unit||a.output.scale!==b.output.scale)
      return {error:'Choose sweeps from the same lesson with the same input variable, plotted quantity, units and scale.',runs:[]};
    var all=a.points.concat(b.points),combined=Object.assign({},a,{points:all,start:Math.min(a.start,b.start),end:Math.max(a.end,b.end),baseline:a.points[0],reference:null});
    var geometry=semiSweepGeometry(combined);
    if(geometry.points.some(function(p){return !isFinite(p.x)||(p.y!==null&&!isFinite(p.y));}))
      return {error:'These stored values exceed the supported plotting range. Use the recorded evidence below.',runs:[]};
    function segments(points){var paths=[],path='';points.forEach(function(p){if(p.y===null){if(path)paths.push(path);path='';}else path+=(path?' L':'M')+p.x+' '+p.y;});if(path)paths.push(path);return paths;}
    var pointsA=geometry.points.slice(0,a.points.length),pointsB=geometry.points.slice(a.points.length);
    var xs=Array.from(new Set(all.map(function(p){return p.x;}))).sort(function(x,y){return x-y;});
    var rows=xs.map(function(x){var ap=a.points.find(function(p){return p.x===x;}),bp=b.points.find(function(p){return p.x===x;});
      var av=ap?ap.y:null,bv=bp?bp.y:null,delta=av!==null&&bv!==null?bv-av:null;
      return {x:x,a:av,b:bv,aPresent:!!ap,bPresent:!!bp,delta:delta!==null&&isFinite(delta)?delta:null};});
    var names={material:'Material',transistorType:'Device type',drainVoltage:'Drain voltage (V)',showCMOS:'CMOS view',
      solarMaterial:'Solar material',solarIrradiance:'Irradiance (W/m²)',solarTemp:'Temperature (K)',solarArea:'Cell area (cm²)',solarLoadR:'Load resistance (Ω)',solarOpen:'Open circuit'};
    var keys=Array.from(new Set(Object.keys(a.settings||{}).concat(Object.keys(b.settings||{})))).filter(function(k){return k!==a.field&&semiWorkspaceField(a.workspace,k);});
    function display(v){return v==null?'Not recorded':typeof v==='boolean'?(v?'Yes':'No'):typeof v==='string'||typeof v==='number'?String(v):'Recorded structure';}
    var settings=keys.map(function(k){var av=(a.settings||{})[k],bv=(b.settings||{})[k];return {key:k,label:names[k]||k,a:display(av),b:display(bv),changed:JSON.stringify(av)!==JSON.stringify(bv)};});
    return {error:'',runs:[a,b],geometry:geometry,pointsA:pointsA,pointsB:pointsB,pathsA:segments(pointsA),pathsB:segments(pointsB),rows:rows,
      shared:rows.filter(function(r){return r.aPresent&&r.bPresent;}).length,settings:settings,changed:settings.filter(function(s){return s.changed;}).length,
      assumptionsDiffer:a.scope!==b.scope||a.held!==b.held};
  }
  function SemiSweepOverlay(props) {
    var h=props.React.createElement,overlay=semiSweepOverlay(props.a,props.b);
    if(!props.a||!props.b)return null;
    if(!props.a.data.parameterSweep&&!props.b.data.parameterSweep)return null;
    if(overlay.error)return h('p',{'data-sweep-overlay-message':true},overlay.error);
    var run=overlay.runs[0],g=overlay.geometry;
    function reading(value,present){return !present?'Not sampled':value===null?'Outside model':semiSweepValue(value);}
    return h('details',{'data-sweep-overlay':true,style:{margin:'14px 0',padding:12,border:'1px solid #64748b',borderRadius:10}},
      h('summary',null,'Overlay saved sweep curves'),
      h('h4',{style:{marginTop:12}},run.output.label+' ('+run.output.unit+')'),
      h('p',null,'Same axes · '+run.xLabel+' ('+run.xUnit+') · '+(run.output.scale==='log'?'logarithmic':'linear')+' output scale. Curves use stored samples; no new simulation or interpolation is performed.'),
      h('p',null,'A · solid cyan line and circles: '+props.a.label),
      h('p',null,'B · dashed lavender line and squares: '+props.b.label),
      run.reference&&h('p',null,'This overlay compares delivered power only. Review each saved sweep to see its available-maximum reference curve.'),
      h('svg',{viewBox:'0 0 660 330',role:'img','aria-label':'Overlay of two saved '+run.output.label+' sweeps. Shared-input comparisons follow in the table.',style:{width:'100%',display:'block',background:'#07111f',borderRadius:8}},
        g.yTicks.map(function(t,i){return h('g',{key:'y'+i},h('line',{x1:80,x2:620,y1:t.y,y2:t.y,stroke:'#334155'}),h('text',{x:73,y:t.y+4,textAnchor:'end',fill:'#e2e8f0',fontSize:17},t.label));}),
        g.xTicks.map(function(t,i){return h('text',{key:'x'+i,x:t.x,y:285,textAnchor:'middle',fill:'#e2e8f0',fontSize:18},t.label);}),
        h('text',{x:350,y:316,textAnchor:'middle',fill:'#e2e8f0',fontSize:19},run.xLabel+' ('+run.xUnit+')'),
        overlay.pathsA.map(function(path,i){return h('path',{key:'a'+i,d:path,fill:'none',stroke:'#67e8f9',strokeWidth:3});}),
        overlay.pathsB.map(function(path,i){return h('path',{key:'b'+i,d:path,fill:'none',stroke:'#c4b5fd',strokeWidth:3,strokeDasharray:'8 6'});}),
        overlay.pointsA.map(function(p,i){return p.y!==null&&h('circle',{key:'ac'+i,cx:p.x,cy:p.y,r:4,fill:'#67e8f9'});}),
        overlay.pointsB.map(function(p,i){return p.y!==null&&h('rect',{key:'bs'+i,x:p.x-4,y:p.y-4,width:8,height:8,fill:'#07111f',stroke:'#c4b5fd',strokeWidth:2});})),
      h('h4',{style:{marginTop:14}},'Check the comparison conditions'),
      h('p',null,'A held constant: '+overlay.runs[0].held+'.'),
      h('p',null,'B held constant: '+overlay.runs[1].held+'.'),
      h('p',null,overlay.changed===0?'No recorded fixed settings differ. This alone does not prove the models or conditions were identical.':overlay.changed===1?'One recorded fixed setting differs. Check model assumptions before attributing the curve change to that setting.':overlay.changed+' recorded fixed settings differ. This comparison cannot isolate the effect of one variable.'),
      overlay.settings.length>0&&h('table',null,h('caption',null,'Fixed settings across the saved runs'),
        h('thead',null,h('tr',null,h('th',{scope:'col'},'Setting'),h('th',{scope:'col'},'A'),h('th',{scope:'col'},'B'))),
        h('tbody',null,overlay.settings.map(function(s){return h('tr',{key:s.key},h('th',{scope:'row'},s.label+(s.changed?' · changed':'')),h('td',null,s.a),h('td',null,s.b));}))),
      overlay.assumptionsDiffer&&h('p',null,'The saved descriptions or assumptions differ. Check both entries before drawing a causal conclusion.'),
      h('h4',{style:{marginTop:14}},'Compare shared inputs'),
      h('p',null,overlay.shared+' exactly shared input values. “Not sampled” means the other run has no reading at that input; “Outside model” means a stored sample has no calculated output. Lines are visual guides, not extra data points.'),
      h('details',null,h('summary',null,'Read overlay values'),
        h('table',null,h('caption',null,'Recorded '+run.output.label+' ('+run.output.unit+') · B − A at shared inputs'),
          h('thead',null,h('tr',null,h('th',{scope:'col'},run.xLabel+' ('+run.xUnit+')'),h('th',{scope:'col'},'A'),h('th',{scope:'col'},'B'),h('th',{scope:'col'},'B − A'))),
          h('tbody',null,overlay.rows.map(function(r,i){return h('tr',{key:i},h('th',{scope:'row'},semiSweepValue(r.x)),h('td',null,reading(r.a,r.aPresent)),h('td',null,reading(r.b,r.bPresent)),h('td',null,r.delta===null?'Not compared':semiSweepValue(r.delta)));})))),
      h('p',null,'Use a shared input to describe the numerical difference, then identify what changed between runs. Your live experiment and saved entries stay unchanged.'));
  }

  function SemiSweepPanel(props) {
    var h=props.React.createElement,d=props.data,id=d.subtool||'bandgap',box=(d.experimentSweeps||{})[id]||{};
    var spec=semiSweepSpec(d,props.materials,props.solarMaterials,box.variable);
    if(!spec)return null;
    var run=box.run&&box.run.version===1?box.run:null;
    function update(patch){props.setData(function(prev){var state=prev.semiconductor||{},map=Object.assign({},state.experimentSweeps||{});map[id]=Object.assign({},map[id]||{},patch);return Object.assign({},prev,{semiconductor:Object.assign({},state,{experimentSweeps:map})});});}
    var control={display:'block',width:'100%',boxSizing:'border-box',minHeight:44,margin:'6px 0 12px',padding:10,border:'1px solid #64748b',borderRadius:8,background:'#020617',color:'#f8fafc'};
    var opts={start:box.start,end:box.end,output:box.output,prediction:box.prediction,variable:box.variable},candidate=!spec.unavailable?semiSweepRun(d,opts,props.materials,props.solarMaterials):null;
    function apply(index){props.setData(function(prev){var state=prev.semiconductor||{},next=semiSweepApply(state,run,index);if(!next)return prev;next.experimentSweeps=Object.assign({},state.experimentSweeps||{});next.experimentSweeps[id]=Object.assign({},box,{selected:index,notice:'Applied sample '+(index+1)+' to the simulation using this run’s fixed settings.'});return Object.assign({},prev,{semiconductor:next});});}
    function save(){
      var comparison=box.comparisonOpen?semiSweepCompare(run,Number.isInteger(box.compareA)?box.compareA:0,Number.isInteger(box.compareB)?box.compareB:run.points.length-1):null;
      var rows=semiSweepEvidence(run).concat(semiSweepComparisonEvidence(run,comparison)),entry=semiCapture(Object.assign({subtool:id,mode:'explore'},run.settings),'Sweep: '+SEMI_LESSONS[id]+' · '+run.output.label,rows,
        {guidedObservation:(box.note||'').trim(),guidedPrediction:run.prediction,guidedEvidence:{observed:rows}});
      entry.data.parameterSweep=semiCopy(run);
      if(comparison&&!comparison.error)entry.data.sweepComparison=semiCopy(comparison);
      props.setSnapshots(function(prev){return (prev||[]).concat([entry]);});
      update({notice:'Saved the complete sweep, prediction and explanation to your notebook.',saved:true});
    }
    var g=run?semiSweepGeometry(run):null,selected=run&&run.points[box.selected];
    var stale=run&&(!!spec.unavailable||Object.keys(run.settings).some(function(k){return k!==run.field&&spec.settings&&spec.settings[k]!==run.settings[k];}));
    return h('details',{className:'semi-study','data-parameter-sweep':id},
      h('summary',null,'Controlled experiment · sweep one variable'),
      h('style',null,'.semi-sweep-plot text{font-size:15px}@media(max-width:640px){.semi-sweep-plot text{font-size:20px}.semi-sweep-plot .semi-sweep-y-label{font-size:17px}}'),
      h('p',null,'Predict → run 11 evenly spaced samples → inspect → explain. Running a sweep keeps the live simulation unchanged.'),
      spec.unavailable?h('p',null,spec.unavailable):h('div',null,
        h('h4',null,'1. Set up a fair comparison'),
        spec.variables&&h('label',null,'Variable to sweep',h('select',{'aria-label':'Variable to sweep',value:spec.variable,style:control,onChange:function(e){update({variable:e.target.value,start:null,end:null});}},
          spec.variables.map(function(v){return h('option',{key:v.id,value:v.id},v.label);}))),
        h('p',null,'Change: '+spec.xLabel+'. Hold constant: '+spec.held+'.'),
        h('div',{className:'semi-study-grid'},
          h('label',null,'Sweep start ('+spec.xUnit+')',h('input',{type:'number',step:'any',min:spec.min,max:spec.max,value:box.start==null?spec.start:box.start,onChange:function(e){update({start:e.target.value});},style:control})),
          h('label',null,'Sweep end ('+spec.xUnit+')',h('input',{type:'number',step:'any',min:spec.min,max:spec.max,value:box.end==null?spec.end:box.end,onChange:function(e){update({end:e.target.value});},style:control}))),
        h('label',null,'Plot quantity',h('select',{'aria-label':'Plot quantity',value:box.output||spec.outputs[0].id,onChange:function(e){update({output:e.target.value});},style:control},
          spec.outputs.map(function(o){return h('option',{key:o.id,value:o.id},o.label+' ('+o.unit+')');}))),
        h('p',null,spec.question),
        h('label',null,'Your sweep prediction (optional)',h('textarea',{'aria-label':'Your sweep prediction (optional)',rows:2,maxLength:500,value:box.prediction||'',onChange:function(e){update({prediction:e.target.value});},style:control})),
        candidate.error&&h('p',{role:'status'},candidate.error),
        h('button',{type:'button',disabled:!!candidate.error,onClick:function(){update({run:candidate,selected:null,note:'',saved:false,comparisonOpen:false,compareA:0,compareB:10,notice:'Sweep complete. Select a sample to inspect it in the simulation.'});}},'Run sweep')),
      run&&h('section',{'aria-label':'Sweep results'},
        h('h4',{style:{marginTop:20}},'2. Inspect the recorded curve'),
        h('p',null,run.output.label+' ('+run.output.unit+') versus '+run.xLabel+' ('+run.xUnit+'). '+(run.output.scale==='log'?'Logarithmic y-axis.':'Linear y-axis.')),
        h('p',null,'This run holds constant: '+run.held+'.'),
        spec.field&&spec.field!==run.field&&h('p',{role:'status'},'The setup now varies '+spec.xLabel.toLowerCase()+'. Run again to replace the recorded '+run.xLabel.toLowerCase()+' sweep.'),
        h('p',null,run.scope),
        stale&&h('p',{role:'status'},'The simulation’s fixed settings have changed. This recorded curve stays unchanged. Selecting a sample reapplies the settings listed above.'),
        run.prediction&&h('p',null,'Prediction recorded before this run: '+run.prediction),
        h('svg',{className:'semi-sweep-plot',viewBox:'0 0 660 310',role:'img','aria-label':run.output.label+(run.reference?' and '+run.reference.label:'')+' sweep. Eleven samples; readings and inspection buttons follow in the table.',style:{width:'100%',display:'block',background:'#07111f',borderRadius:10}},
          h('title',null,run.output.label+(run.reference?' and '+run.reference.label:'')+' versus '+run.xLabel),
          g.yTicks.map(function(t,i){return h('g',{key:'y'+i},h('line',{x1:80,x2:620,y1:t.y,y2:t.y,stroke:'#334155'}),h('text',{className:'semi-sweep-y-label',x:72,y:t.y+4,textAnchor:'end',fill:'#e2e8f0',fontSize:12},t.label));}),
          g.xTicks.map(function(t,i){return h('g',{key:'x'+i},h('line',{x1:t.x,x2:t.x,y1:40,y2:260,stroke:'#1e293b'}),h('text',{x:t.x,y:281,textAnchor:'middle',fill:'#e2e8f0',fontSize:12},t.label));}),
          h('text',{x:350,y:302,textAnchor:'middle',fill:'#e2e8f0',fontSize:13},run.xLabel+' ('+run.xUnit+')'),
          g.referencePaths.map(function(path,i){return h('path',{key:'reference'+i,'data-sweep-reference':true,d:path,fill:'none',stroke:'#c4b5fd',strokeWidth:3,strokeDasharray:'8 6'});}),
          g.paths.map(function(path,i){return h('path',{key:i,d:path,fill:'none',stroke:'#67e8f9',strokeWidth:3});}),
          g.points.map(function(p,i){return p.y!=null&&h('circle',{key:i,cx:p.x,cy:p.y,r:box.selected===i?7:4,fill:box.selected===i?'#fff':'#67e8f9'});}),
          g.baseline.y!=null&&h('path',{d:'M'+g.baseline.x+' '+(g.baseline.y-7)+' l7 7 l-7 7 l-7 -7 Z',fill:'#fbbf24',stroke:'#07111f',strokeWidth:2})),
        h('p',null,'Cyan line and dots: calculated samples, joined as a visual guide. Amber diamond: the simulation baseline before this run. Axes include the baseline even when it is outside the sweep range. The white dot marks the last sample applied.'),
        run.reference&&h('p',null,'Dashed lavender line: '+run.reference.label+' (W), using the same power axis. It assumes a separately matched load at every sample.'),
        run.reference&&h('p',null,'Power = voltage × current. Open circuit has zero load current; short circuit has zero load voltage. Both deliver zero power even when maximum available power is positive. Use the live simulation’s load controls to test a different fixed load, then run again.'),
        run.points.every(function(p){return p.y==null;})&&h('p',{role:'status'},'No samples fall within the model’s valid range. Choose a different range and run again.'),
        h('p',null,'Baseline: '+semiSweepValue(run.baseline.x)+' '+run.xUnit+' → '+semiSweepValue(run.baseline.y)+(run.baseline.y==null?'':(' '+run.output.unit))+'.'),
        run.reference&&h('p',null,'Available maximum at baseline: '+semiSweepValue(run.baseline.reference)+' W.'),
        h('label',null,'Inspect sample',h('input',{type:'range',min:0,max:10,step:1,value:box.selected==null?0:box.selected,'aria-valuetext':box.selected==null?'No sample applied. Use the table or move this slider.':'Sample '+(box.selected+1)+': '+semiSweepValue(selected.x)+' '+run.xUnit,onChange:function(e){apply(Number(e.target.value));},style:{width:'100%',minHeight:44}})),
        h('p',null,'Use the slider or a table button to apply a sample to the simulation above, including its 3D view when enabled.'),
        selected&&h('p',null,'Last applied: '+semiSweepValue(selected.x)+' '+run.xUnit+' → '+semiSweepValue(selected.y)+(selected.y==null?'':(' '+run.output.unit))+' · '+selected.status),
        run.reference&&selected&&h('p',{'data-solar-sweep-reading':true},'At this sample: '+semiSweepValue(selected.voltage)+' V × '+semiSweepValue(selected.current)+' A = '+semiSweepValue(selected.y)+' W delivered; '+semiSweepValue(selected.reference)+' W available. '+(selected.fraction==null?'No available power, so a delivered/available percentage is not defined.':semiSweepValue(selected.fraction*100)+'% of available power delivered.')),
        h('button',{type:'button',onClick:function(){var el=document.querySelector('.semi-workspace');if(el){el.setAttribute('tabindex','-1');el.focus();el.scrollIntoView({block:'start'});}}},'View linked simulation'),
        h('details',null,h('summary',null,'All 11 readings and inspection buttons'),
          h('table',null,h('caption',null,'Sweep readings · '+run.output.label+' ('+run.output.unit+')'),
            h('thead',null,h('tr',null,h('th',{scope:'col'},run.xLabel+' ('+run.xUnit+')'),h('th',{scope:'col'},run.output.label+' ('+run.output.unit+')'),h('th',{scope:'col'},'Inspect'))),
            h('tbody',null,run.points.map(function(p,i){return h('tr',{key:i},h('th',{scope:'row'},semiSweepValue(p.x)),h('td',null,run.reference?'Delivered: '+semiSweepValue(p.y):semiSweepValue(p.y),run.reference&&h('div',null,'Available: '+semiSweepValue(p.reference)),h('div',null,p.status)),h('td',null,h('button',{type:'button','aria-label':'Apply sample '+(i+1)+': '+semiSweepValue(p.x)+' '+run.xUnit,'aria-pressed':box.selected===i,onClick:function(){apply(i);}},'Apply '+(i+1))));})))),
        h(SemiSweepComparison,{React:props.React,run:run,box:box,update:update}),
        h('h4',{style:{marginTop:20}},'3. Explain the pattern'),
        h('p',null,'Compare two readings. What changed, what stayed fixed, and did the result support your prediction? Use the curve’s model limits in your explanation.'),
        h('label',null,'Sweep explanation',h('textarea',{'aria-label':'Sweep explanation',rows:3,maxLength:1500,value:box.note||'',onChange:function(e){update({note:e.target.value,saved:false});},style:control})),
        h('button',{type:'button',disabled:!props.setSnapshots||(box.note||'').trim().length<12||!!box.saved,onClick:save},box.saved?'Sweep saved':'Save sweep to notebook'),
        h('p',null,'Write at least 12 characters to save your explanation with all 11 readings and the baseline.'),
        box.notice&&h('p',{role:'status'},box.notice)));
  }

  window.__SemiconductorCore = {
    sweepOverlay:semiSweepOverlay, savedSweep:semiSavedSweep,
    sweepCompare:semiSweepCompare, sweepComparisonEvidence:semiSweepComparisonEvidence,
    sweepSpec:semiSweepSpec, sweepRun:semiSweepRun, sweepGeometry:semiSweepGeometry, sweepApply:semiSweepApply, sweepEvidence:semiSweepEvidence,
    capture:semiCapture, notebookEntries:semiNotebookEntries, restoreNotebook:semiRestore, compareNotebook:semiCompare, notebookMarkdown:semiNotebookMarkdown, routeProgress:semiRouteProgress, routes:SEMI_ROUTES,
    moore:semiMoore, doubling:semiDoubling, milestones:SEMI_MILESTONES,
    logic:semiLogic, nandTrace:semiNandTrace, cmos:semiCMOS, logicExperiment:semiLogicExperiment,
    led:semiLed, ledSpectrum:semiLedSpectrum, ledEmitters:SEMI_LED_EMITTERS,
    memory:semiMemory, memoryStep:semiMemoryStep, oxidation:semiOxidation, quantum:semiQuantum, series:semiSeries, mosfet:semiMOS, solar:semiSolar, amplifier:semiAmplifier, iv:semiIV,
    carriers: semiCarriers, bandGap: semiBandGap, intrinsic: semiIntrinsic, junction: semiJunction, diamondCell: semiDiamondCell,
    orderOptions: orderOptions,
    formatTransistorCount: formatTransistorCount
  };

  window.StemLab.registerTool('semiconductor', {
    icon: '\uD83D\uDCA0',
    label: 'Semiconductor Lab',
    desc: 'Explore band gaps, doping, junctions, transistors, gates, I-V curves, wafer fab, LEDs, solar cells, quantum wells, memory & amplifiers.',
    color: 'cyan',
    category: 'science',
    ready: true,

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k) ? (fb != null ? fb : k) : v; };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var canvasNarrate = ctx.canvasNarrate;
      var props = ctx.props;

      // ═══ STATE INIT GUARD ═══
      var d = (labToolData && labToolData.semiconductor) || {};
      var _semiInitialized = !!(labToolData && labToolData.semiconductor);
      if (!_semiInitialized) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { semiconductor: {
            // sub-tool selection
            subtool: 'bandgap',
            mode: 'explore',
            // Band Gap
            material: 'silicon',
            temperature: 300,
            showPhoton: false,
            showFermi: false,
            // Doping
            dopant: 'none',
            dopantCount: 3,
            crystalSize: 8,
            dopingTemp: 300,
            showResistivity: false,
            // P-N Junction
            pnBias: 0,
            pnShowField: true,
            pnShowCarriers: true,
            pnShowDepletion: true,
            pnAnimating: true,
            pnShowIV: false,
            pnLedMode: false,
            // Transistor
            transistorType: 'mosfet-n',
            gateVoltage: 0,
            drainVoltage: 5,
            showCurrentFlow: true,
            showCMOS: false,
            // Logic Gates
            gateType: 'NOT',
            inputA: false,
            inputB: false,
            gateChain: [],
            showTruthGrid: false,
            // I-V Curve
            ivDevice: 'diode',
            ivSweepV: 0,
            ivTracePoints: [],
            ivShowIdeal: true,
            ivTemp: 300,
            // Circuit Sandbox
            circuitComponents: [],
            circuitWires: [],
            circuitSelectedComp: null,
            circuitVoltage: 5,
            circuitSimResult: null,
            // Wafer Fab
            fabStage: 0,
            fabRunning: false,
            fabTemp: 1000,
            fabTime: 30,
            fabDopant: 'phosphorus',
            fabHistory: [],
            fabGuided: true,
            // LED Spectrum
            ledMaterial: 'red-gan',
            ledCurrent: 20,
            ledShowSpectrum: true,
            ledMixR: 100, ledMixG: 0, ledMixB: 0,
            ledMixMode: false,
            // Solar Cell
            solarIrradiance: 1000,
            solarTemp: 300,
            solarArea: 100,
            solarMaterial: 'silicon',
            solarShowPV: true,
            solarLoadR: 100,
            // Moore's Law
            mooreYear: 2024,
            mooreShowPred: true,
            mooreLogScale: true,
            mooreHighlight: null,
            // Quantum Wells
            qwWidth: 5,
            qwDepth: 0.3,
            qwMaterial: 'gaas-algaas',
            qwLevels: 3,
            qwShowWave: true,
            qwShowProb: false,
            qwElectricField: 0,
            // Semiconductor Memory
            memType: 'sram',
            memBitValue: 0,
            memWriteEnable: false,
            memShowArray: false,
            memRefreshing: false,
            memCellCount: 4,
            memShowTiming: false,
            // Signal Amplifier
            ampType: 'common-source',
            ampVin: 0.01,
            ampFreq: 1000,
            ampVdd: 5,
            ampRd: 10000,
            ampShowBode: false,
            ampShowDC: true,
            ampBiasPoint: 2.5,
            // Battle Mode — Chip Defense
            battleActive: false,
            battleRound: 0,
            battleScore: 0,
            battleHP: 5,
            battleEnemyHP: 5,
            battleLog: [],
            battleConstraint: null,
            battleFeedback: null,
            battleDifficulty: 'cadet',
            // Challenge (10-tier)
            challengeActive: false,
            challengeTier: 0,
            challengeScore: 0,
            challengeStreak: 0,
            challengeFeedback: null,
            challengeAnswer: null,
            challengeIdx: 0,
            challengeMisses: 0,
            challengeShowHint: false,
            // Learn
            showLearn: false,
            learnTopic: null,
            // AI
            aiExplain: null,
            aiLoading: false,
            guidedSetupSubtool: null,
            guidedNotes: {},
            guidedObservationSaved: null,
            // XP tracking
            xpAwardedKeys: {}
          }});
        });
        // Don't early-return — hooks below must always execute (Rules of Hooks).
        // Default values below render the real lab on the first pass.
      }

      var upd = function(key, val) {
        setLabToolData(function(prev) {
          prev = prev || {};
          return Object.assign({}, prev, {
            semiconductor: Object.assign({}, prev.semiconductor || {}, (typeof key === 'object' ? key : (function() { var o = {}; o[key] = val; return o; })()))
          });
        });
      };
      var updMulti = function(obj) { upd(obj); };

      // Canvas Narration: Semiconductor Lab init
      if (typeof canvasNarrate === 'function') canvasNarrate('semiconductor', 'init', {
        first: 'Semiconductor Lab loaded. Explore band gaps, doping, P-N junctions, transistors, logic gates, I-V curves, wafer fabrication, LEDs, solar cells, and more. Use the sub-tool navigation to switch topics.',
        repeat: 'Semiconductor Lab ready.',
        terse: 'Semiconductor Lab ready.'
      });

      // ═══ GRADE BAND HELPER ═══
      var GRADE_BANDS = ['K-2', '3-5', '6-8', '9-12'];
      function getGradeBand() {
        var gl = (gradeLevel || '5th Grade').toLowerCase();
        if (/k|1st|2nd|pre/.test(gl)) return 'K-2';
        if (/3rd|4th|5th/.test(gl)) return '3-5';
        if (/6th|7th|8th/.test(gl)) return '6-8';
        if (/9th|10|11|12|high/.test(gl)) return '9-12';
        return '3-5';
      }
      var gradeBand = getGradeBand();

      // Grade-band text helper
      function gradeText(k2, g35, g68, g912) {
        if (gradeBand === 'K-2') return k2;
        if (gradeBand === '3-5') return g35;
        if (gradeBand === '6-8') return g68;
        return g912;
      }

      // ═══ MATERIAL DATA ═══


      var MATERIALS = {
        // tempCoeff is dE_g/dT NEAR 300 K, in eV/K, used by the linear model below.
        // It is NOT the Varshni alpha parameter. Si and GaAs previously held their
        // Varshni alphas (4.73e-4 and 5.405e-4), which are roughly 1.2-1.9x the actual
        // slope at room temperature, so the linear model over-predicted how fast the
        // gap closes with heating. Ge already held a real slope, so the table was
        // internally inconsistent about what this column meant.
        silicon:    { name: t('stem.semiconductor.silicon_si', 'Silicon (Si)'),     bandGap: 1.12, color: '#4F46E5', lattice: 'Diamond Cubic', electrons: 4, tempCoeff: -0.000270, ni: 1.5e10, mobility: 1400 },
        germanium:  { name: t('stem.semiconductor.germanium_ge', 'Germanium (Ge)'),   bandGap: 0.67, color: '#7C3AED', lattice: 'Diamond Cubic', electrons: 4, tempCoeff: -0.000377, ni: 2.4e13, mobility: 3900 },
        gaas:       { name: 'GaAs',             bandGap: 1.42, color: '#DC2626', lattice: 'Zinc Blende',   electrons: 4, tempCoeff: -0.000450, ni: 1.8e6,  mobility: 8500 },
        diamond:    { name: t('stem.semiconductor.diamond_c', 'Diamond (C)'),       bandGap: 5.47, color: '#F59E0B', lattice: 'Diamond Cubic', electrons: 4, tempCoeff: -0.000050, ni: 1e-27,  mobility: 2200 },
        // 3.26 eV is the 4H polytype, which is HEXAGONAL. The zinc-blende polytype of
        // SiC is 3C and its gap is 2.36 eV, so "Zinc Blende" alongside 3.26 eV named
        // one polytype and gave another's band gap. 4H is the one used for power
        // devices, so the gap was the value worth keeping.
        sic:        { name: 'SiC (4H)',         bandGap: 3.26, color: '#10B981', lattice: 'Hexagonal (4H)', electrons: 4, tempCoeff: -0.000330, ni: 6.9e-11,mobility: 900 },
        gan:        { name: 'GaN',              bandGap: 3.40, color: '#06B6D4', lattice: 'Wurtzite',      electrons: 4, tempCoeff: -0.000420, ni: 1.9e-10,mobility: 1000 },
        copper:     { name: t('stem.semiconductor.copper_cu', 'Copper (Cu)'),       bandGap: 0,    color: '#D97706', lattice: 'FCC',           electrons: 1, tempCoeff: 0,         ni: 8.5e22, mobility: 32 },
        insulator:  { name: t('stem.semiconductor.glass_sio', 'Glass (SiO\u2082)'), bandGap: 9.0,  color: '#94A3B8', lattice: 'Amorphous',    electrons: 0, tempCoeff: 0,         ni: 0,      mobility: 0 }
      };

      var SOLAR_MATS = {
        silicon: { name: t('stem.semiconductor.crystalline_si', 'Crystalline Si'), eff: 0.22, Voc: 0.72, color: '#4F46E5' },
        thinfilm: { name: t('stem.semiconductor.cdte_thin_film', 'CdTe Thin Film'), eff: 0.18, Voc: 0.87, color: '#10B981' },
        perovskite: { name: t('stem.semiconductor.perovskite', 'Perovskite'), eff: 0.25, Voc: 1.18, color: '#F59E0B' },
        gaas: { name: t('stem.semiconductor.gaas_iii_v', 'GaAs (III-V)'), eff: 0.29, Voc: 1.12, color: '#EF4444' },
        organic: { name: t('stem.semiconductor.organic_pv', 'Organic PV'), eff: 0.12, Voc: 0.85, color: '#8B5CF6' },
        tandem: { name: t('stem.semiconductor.perovskite_si_tandem', 'Perovskite/Si Tandem'), eff: 0.33, Voc: 1.90, color: '#06B6D4' }
      };
      var AMP_TYPES = {
        'common-source': { name: t('stem.semiconductor.common_source_mosfet', 'Common Source (MOSFET)'), gain: -10, inputZ: 'Very High', outputZ: 'Medium', bandwidth: 'Medium', icon: 'CS', desc: t('stem.semiconductor.voltage_amplifier_high_input_impedance', 'Voltage amplifier. High input impedance (\u221E for ideal). Gain = -g\u2098R\u2093. Inverts signal. Most common MOSFET amp.') },
        'common-drain':  { name: t('stem.semiconductor.source_follower', 'Source Follower'),        gain: 0.9, inputZ: 'Very High', outputZ: 'Low',    bandwidth: 'Wide',   icon: 'CD', desc: t('stem.semiconductor.voltage_buffer_gain_1_no_inversion_low', 'Voltage buffer. Gain \u2248 1 (no inversion). Low output impedance \u2192 good for driving loads. Also called source follower.') },
        'common-gate':   { name: t('stem.semiconductor.common_gate_mosfet', 'Common Gate (MOSFET)'),   gain: 10,  inputZ: 'Low',       outputZ: 'High',   bandwidth: 'Wide',   icon: 'CG', desc: t('stem.semiconductor.current_buffer_low_input_impedance_non', 'Current buffer. Low input impedance. Non-inverting. Wide bandwidth \u2192 good for RF applications.') },
        'common-emitter': { name: t('stem.semiconductor.common_emitter_bjt', 'Common Emitter (BJT)'),  gain: -50, inputZ: 'Medium',    outputZ: 'Medium', bandwidth: 'Medium', icon: 'CE', desc: t('stem.semiconductor.bjt_voltage_amplifier_gain_g_r_inverts', 'BJT voltage amplifier. Gain = -g\u2098R\u1D9C. Inverts signal. Higher gain than MOSFET but lower input impedance.') },
        'diff-pair':     { name: t('stem.semiconductor.differential_pair', 'Differential Pair'),       gain: 20,  inputZ: 'High',      outputZ: 'Medium', bandwidth: 'Medium', icon: 'DP', desc: t('stem.semiconductor.amplifies_difference_of_two_inputs_rej', 'Amplifies difference of two inputs. Rejects common-mode noise. Foundation of op-amps. CMRR typically >60dB.') }
      };
      var DOPANTS = {
        none:      { name: t('stem.semiconductor.intrinsic', 'Intrinsic'),    type: null,   valence: 4, color: '#9ca3af', symbol: '-' },
        phosphorus:{ name: t('stem.semiconductor.phosphorus_p', 'Phosphorus (P)'), type: 'n',   valence: 5, color: '#EF4444', symbol: 'P' },
        arsenic:   { name: t('stem.semiconductor.arsenic_as', 'Arsenic (As)'),  type: 'n',    valence: 5, color: '#F97316', symbol: 'As' },
        boron:     { name: t('stem.semiconductor.boron_b', 'Boron (B)'),     type: 'p',    valence: 3, color: '#3B82F6', symbol: 'B' },
        gallium:   { name: t('stem.semiconductor.gallium_ga', 'Gallium (Ga)'), type: 'p',     valence: 3, color: '#8B5CF6', symbol: 'Ga' },
        antimony:  { name: t('stem.semiconductor.antimony_sb', 'Antimony (Sb)'), type: 'n',    valence: 5, color: '#F43F5E', symbol: 'Sb' },
        indium:    { name: t('stem.semiconductor.indium_in', 'Indium (In)'),   type: 'p',    valence: 3, color: '#14B8A6', symbol: 'In' }
      };

      // ═══ SUB-TOOL NAV ═══
      var SUBTOOLS = [
        { id: 'bandgap',    icon: '\u26A1', label: t('stem.semiconductor.band_gap', 'Band Gap'),     short: 'Bands' },
        { id: 'doping',     icon: '\uD83E\uDDEA', label: t('stem.semiconductor.doping', 'Doping'),       short: 'Dope' },
        { id: 'pnjunction', icon: '\u2194\uFE0F', label: t('stem.semiconductor.p_n_junction', 'P-N Junction'), short: 'P-N' },
        { id: 'transistor', icon: '\uD83D\uDD0C', label: t('stem.semiconductor.transistor', 'Transistor'),   short: 'FET' },
        { id: 'gates',      icon: '\uD83D\uDDA5\uFE0F', label: t('stem.semiconductor.logic_gates', 'Logic Gates'),  short: 'Gates' },
        { id: 'ivcurve',    icon: '\uD83D\uDCC8', label: t('stem.semiconductor.i_v_curves', 'I-V Curves'),   short: 'I-V' },
        { id: 'sandbox',    icon: '\uD83D\uDD27', label: t('stem.semiconductor.circuit_lab', 'Circuit Lab'),  short: 'Circuit' },
        { id: 'waferfab',   icon: '\uD83C\uDFED', label: t('stem.semiconductor.wafer_fab', 'Wafer Fab'),    short: 'Fab' },
        { id: 'ledspec',    icon: '\uD83C\uDF08', label: t('stem.semiconductor.led_spectrum', 'LED Spectrum'),  short: 'LED' },
        { id: 'solarcell',  icon: '\u2600\uFE0F', label: t('stem.semiconductor.solar_cell', 'Solar Cell'),   short: 'Solar' },
        { id: 'moorelaw',   icon: '\uD83D\uDCC9', label: t('stem.semiconductor.moore_s_law', 'Moore\'s Law'), short: 'Moore' },
        { id: 'qwell',     icon: '\uD83C\uDF0A', label: t('stem.semiconductor.quantum_wells', 'Quantum Wells'), short: 'QWell' },
        { id: 'memory',    icon: '\uD83D\uDCBE', label: t('stem.semiconductor.memory_cells', 'Memory Cells'),  short: 'Memory' },
        { id: 'amplifier', icon: '\uD83D\uDD09', label: t('stem.semiconductor.amplifier', 'Amplifier'),     short: 'Amp' },
        { id: 'dopeHunt',  icon: '\u2697\uFE0F', label: t('stem.semiconductor.doping_discovery', 'Doping Discovery'), short: 'Dope?' }
      ];

      function getSubtoolLabel(id) {
        var st = SUBTOOLS.find(function(item) { return item.id === id; });
        return st ? st.label : id;
      }

      // ═══ SHARED HELPERS ═══
      function btn(label, onClick, extraClass, key) {
        return h('button', Object.assign({
          key: key != null ? key : label,
          type: 'button',
          onClick: onClick,
          className: 'semi-action px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm hover:shadow-md ' + (extraClass || 'bg-cyan-700 text-white hover:bg-cyan-700')
        }, a11yClick ? a11yClick(onClick) : {}), label);
      }

      function pill(label, active, onClick, key) {
        return h('button', Object.assign({
          key: key != null ? key : label,
          type: 'button',
          onClick: onClick,
          'aria-pressed': !!active,
          'data-active': active ? 'true' : 'false',
          className: 'semi-pill px-2.5 py-1 text-xs font-semibold rounded-full transition-all ' +
            (active ? 'bg-cyan-700 text-white shadow-md' : 'bg-slate-800 text-slate-200 hover:bg-slate-700')
        }, a11yClick ? a11yClick(onClick) : {}), label);
      }

      function sliderRow(label, value, min, max, step, onChange, unit) {
        var sliderPercent = max === min ? 0 : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
        var sliderValueText = value + (unit || '');
        return h('div', { className: 'semi-slider-row flex items-center gap-2 mt-1' },
          h('span', { className: 'semi-slider-label text-xs w-20 shrink-0' }, label),
          h('input', {
            type: 'range', min: min, max: max, step: step, value: value,
            onChange: function(e) { onChange(parseFloat(e.target.value)); },
            className: 'flex-1 accent-cyan-500',
            style: { background: 'linear-gradient(90deg, #22d3ee 0%, #22d3ee ' + sliderPercent + '%, #334155 ' + sliderPercent + '%, #334155 100%)' },
            'aria-label': label,
            'aria-valuetext': sliderValueText
          }),
          h('output', { className: 'semi-slider-output text-xs font-mono w-16 text-right' }, sliderValueText)
        );
      }

      function infoBox(text, color) {
        return h('div', { role: 'note', className: 'mt-2 p-2 rounded-lg border text-xs leading-relaxed ' +
          (color === 'green' ? 'bg-emerald-900/30 border-emerald-700 text-emerald-200' :
           color === 'amber' ? 'bg-amber-900/30 border-amber-700 text-amber-200' :
           color === 'red' ? 'bg-red-900/30 border-red-700 text-red-200' :
           'bg-slate-800/80 border-slate-600 text-slate-200') }, text);
      }

      function statBadge(label, value, color, key) {
        return h('div', { key: key != null ? key : label, className: 'semi-stat-card flex flex-col items-center justify-center px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-600' },
          h('span', { className: 'text-[0.6875rem] text-slate-300 uppercase tracking-wider font-semibold' }, label),
          h('span', { className: 'text-sm font-bold ' + (color || 'text-cyan-400') }, value)
        );
      }

      // Keep a stable logical coordinate space while matching the backing bitmap
      // to the canvas's real CSS size and the display's device pixel ratio.
      function prepareCanvas(canvasEl, logicalWidth, logicalHeight) {
        // Explicit CSS constraints keep the high-DPI bitmap dimensions from
        // becoming the canvas's flex-item minimum size and causing resize loops.
        canvasEl.style.display = 'block';
        canvasEl.style.width = '100%';
        canvasEl.style.maxWidth = '760px';
        canvasEl.style.minWidth = '0';
        canvasEl.style.height = 'auto';
        canvasEl.style.aspectRatio = logicalWidth + ' / ' + logicalHeight;
        var rect = canvasEl.getBoundingClientRect();
        var cssWidth = Math.max(1, rect.width || logicalWidth);
        var cssHeight = cssWidth * logicalHeight / logicalWidth;
        var dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
        var pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
        var pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
        if (canvasEl.width !== pixelWidth || canvasEl.height !== pixelHeight) {
          canvasEl.width = pixelWidth;
          canvasEl.height = pixelHeight;
        }
        var cx = canvasEl.getContext('2d');
        cx.setTransform(pixelWidth / logicalWidth, 0, 0, pixelHeight / logicalHeight, 0, 0);
        cx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in cx) cx.imageSmoothingQuality = 'high';
        return { cx: cx, W: logicalWidth, H: logicalHeight };
      }

      function bindStaticCanvas(canvasEl, draw) {
        var frame = null;
        function paint() {
          if (canvasEl.isConnected) draw(canvasEl);
        }
        paint();
        if (typeof ResizeObserver === 'undefined') return function() {};
        var observer = new ResizeObserver(function() {
          if (frame != null) cancelAnimationFrame(frame);
          frame = requestAnimationFrame(paint);
        });
        observer.observe(canvasEl);
        return function() {
          observer.disconnect();
          if (frame != null) cancelAnimationFrame(frame);
        };
      }

      function canvasInkFor(background) {
        var hex = String(background || '').replace('#', '');
        if (hex.length !== 6) return '#FFFFFF';
        var rgb = [0, 2, 4].map(function(i) {
          var channel = parseInt(hex.slice(i, i + 2), 16) / 255;
          return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
        });
        var luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
        var whiteContrast = 1.05 / (luminance + 0.05);
        var darkContrast = (luminance + 0.05) / 0.055;
        return darkContrast > whiteContrast ? '#020617' : '#FFFFFF';
      }

      // ═══ AI EXPLAIN (grade-aware) ═══
      function askAI(topic) {
        if (d.aiLoading) return;
        if (typeof callGemini !== 'function') {
          updMulti({ aiExplain: 'AI explanation is not available in this session yet.', aiLoading: false });
          return;
        }
        updMulti({ aiLoading: true, aiExplain: null });
        var gradeCtx = gradeBand === 'K-2' ? 'kindergarten, very simple with fun analogies'
          : gradeBand === '3-5' ? '3rd-5th grade, simple but accurate'
          : gradeBand === '6-8' ? '6th-8th grade, include basic equations'
          : '9th-12th grade AP Physics, include equations and Fermi level concepts';
        var prompt = 'Explain "' + topic + '" for a ' + gradeCtx + ' student in 3-4 sentences. Focus on semiconductor physics. Be concise.';
        try {
          Promise.resolve(callGemini(prompt)).then(function(resp) {
            updMulti({ aiExplain: resp || 'No explanation was returned.', aiLoading: false });
            if (announceToSR) announceToSR('AI explanation loaded for ' + topic);
          }).catch(function() {
            updMulti({ aiExplain: 'Could not load AI explanation.', aiLoading: false });
          });
        } catch(e) {
          updMulti({ aiExplain: 'Could not load AI explanation.', aiLoading: false });
        }
      }

      // ═══ TTS HELPER ═══
      function speakText(text) {
        if (callTTS) {
          try { callTTS(text); } catch(e) { /* TTS unavailable */ }
        }
      }

      // ═══ XP HELPER ═══
      function tryAwardXP(key, amount, reason) {
        if (d.xpAwardedKeys && d.xpAwardedKeys[key]) return;
        if (awardStemXP) awardStemXP('semi-' + key, amount, reason);
        var newKeys = Object.assign({}, d.xpAwardedKeys || {});
        newKeys[key] = true;
        upd('xpAwardedKeys', newKeys);
        if (stemCelebrate) stemCelebrate();
        if (announceToSR) announceToSR('Earned ' + amount + ' XP: ' + reason);
      }

      // ═══ AI RESPONSE BOX (shared) ═══
      function aiBox() {
        if (!d.aiExplain && !d.aiLoading) return null;
        return h('div', { className: 'mt-2 p-2 rounded-lg bg-indigo-900/40 border border-indigo-700 text-xs text-indigo-200' },
          d.aiLoading ? h('span', { className: 'motion-reduce:animate-none animate-pulse' }, t('stem.semiconductor.thinking', '\u2728 Thinking\u2026')) : h(React.Fragment, null,
            h('span', null, d.aiExplain),
            callTTS ? h('button', {
              onClick: function() { speakText(d.aiExplain); },
              className: 'ml-2 px-1.5 py-0.5 text-[0.6875rem] bg-indigo-700 rounded hover:bg-indigo-600 transition-colors',
              'aria-label': t('stem.semiconductor.read_aloud', 'Read aloud')
            }, '\uD83D\uDD0A') : null
          )
        );
      }

      // ════════════════════════════════════════════
      // BAND GAP VISUALIZER (enhanced)
      // ════════════════════════════════════════════
      function renderBandGap() {
        var mat = MATERIALS[d.material] || MATERIALS.silicon;
        var tempK = Math.max(50, Math.min(800, Number(d.temperature) || 300));
        var Eg = semiBandGap(mat, tempK, d.material || 'silicon');
        var intrinsicN = semiIntrinsic(mat, tempK, Eg);
        var photonNm = Math.max(200, Math.min(2000, Number(d.photonNm) || 550));
        var photonEnergy = 1239.841984 / photonNm;
        var photonAllowed = photonEnergy >= Eg;
        var isConductor = mat.bandGap === 0;
        var isInsulator = d.material === 'insulator';

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var surface = prepareCanvas(canvasEl, 440, 240);
          var cx = surface.cx, W = surface.W, H = surface.H;
          cx.clearRect(0, 0, W, H);

          var midY = H / 2;
          var gapPx = Math.min(H * 0.40, Math.max(10, Eg * 28));
          var valenceTop = midY + gapPx / 2;
          var conductionBot = midY - gapPx / 2;

          // Background gradient
          var bgGrad = cx.createLinearGradient(0, 0, 0, H);
          bgGrad.addColorStop(0, '#0F172A');
          bgGrad.addColorStop(1, '#1E293B');
          cx.fillStyle = bgGrad;
          cx.fillRect(0, 0, W, H);

          // Valence band (filled)
          var vGrad = cx.createLinearGradient(0, valenceTop, 0, H);
          vGrad.addColorStop(0, mat.color);
          vGrad.addColorStop(1, '#1E293B');
          cx.fillStyle = vGrad;
          cx.fillRect(30, valenceTop, W - 60, H - valenceTop - 15);
          cx.fillStyle = '#E2E8F0';
          cx.font = 'bold 13px sans-serif';
          cx.textAlign = 'center';
          cx.fillText('Valence Band (E\u1D65)', W / 2, valenceTop + 22);

          // Conduction band
          var cGrad = cx.createLinearGradient(0, 15, 0, conductionBot);
          cGrad.addColorStop(0, '#1E293B');
          cGrad.addColorStop(1, isConductor ? mat.color : '#334155');
          cx.fillStyle = cGrad;
          cx.fillRect(30, 15, W - 60, conductionBot - 15);
          cx.fillStyle = '#E2E8F0';
          cx.fillText('Conduction Band (E\u1D9C)', W / 2, conductionBot - 12);

          // Band gap region
          if (!isConductor) {
            cx.fillStyle = 'rgba(0,0,0,0.35)';
            cx.fillRect(30, conductionBot, W - 60, gapPx);

            // Gap label with glow
            cx.shadowColor = '#FCD34D';
            cx.shadowBlur = 0;
            cx.fillStyle = '#FCD34D';
            cx.font = 'bold 14px sans-serif';
            cx.fillText('E_g = ' + Eg.toFixed(2) + ' eV', W / 2, midY + 5);
            cx.shadowBlur = 0;

            // Arrow
            cx.strokeStyle = '#FCD34D';
            cx.lineWidth = 2;
            cx.setLineDash([4, 3]);
            cx.beginPath();
            cx.moveTo(W / 2 - 165, conductionBot + 2);
            cx.lineTo(W / 2 - 165, valenceTop - 2);
            cx.stroke();
            cx.setLineDash([]);
            // Arrowheads
            cx.beginPath();
            cx.moveTo(W / 2 - 169, conductionBot + 8); cx.lineTo(W / 2 - 165, conductionBot + 2); cx.lineTo(W / 2 - 161, conductionBot + 8);
            cx.stroke();
            cx.beginPath();
            cx.moveTo(W / 2 - 169, valenceTop - 8); cx.lineTo(W / 2 - 165, valenceTop - 2); cx.lineTo(W / 2 - 161, valenceTop - 8);
            cx.stroke();
          }

          // Fermi level (9-12 or toggle)
          if (d.showFermi && !isConductor) {
            var fermiY = midY; // intrinsic: mid-gap
            cx.strokeStyle = '#F97316';
            cx.lineWidth = 1.5;
            cx.setLineDash([6, 4]);
            cx.beginPath();
            cx.moveTo(35, fermiY); cx.lineTo(W / 2 - 80, fermiY);
            cx.moveTo(W / 2 + 80, fermiY); cx.lineTo(W - 35, fermiY);
            cx.stroke();
            cx.setLineDash([]);
            cx.fillStyle = '#F97316';
            cx.font = '12px sans-serif';
            cx.textAlign = 'right';
            cx.fillText('E\u1DA0 (Fermi)', W - 10, fermiY - 4);
          }

          // Electrons in valence band
          cx.fillStyle = '#60A5FA';
          var electronY = isConductor ? midY : valenceTop + 30;
          for (var i = 0; i < 8; i++) {
            var ex = 60 + i * (W - 120) / 7;
            cx.beginPath();
            cx.arc(ex, electronY + Math.sin(Date.now() / 500 + i) * 3, 4, 0, Math.PI * 2);
            cx.fill();
          }

          // Thermal excitation — more electrons jump at higher temp
          var thermalProb = isConductor ? 0.5 : Math.min(0.4, Math.exp(-Eg / (2 * 8.617e-5 * tempK)) * 1e5);
          var excitedCount = Math.floor(thermalProb * 6);
          for (var ti = 0; ti < excitedCount; ti++) {
            var tex = 70 + ti * (W - 140) / Math.max(1, excitedCount - 1);
            var tBob = Math.sin(Date.now() / 400 + ti * 2) * 5;
            // Excited electron in conduction band
            cx.fillStyle = '#F59E0B';
            cx.beginPath();
            cx.arc(tex, conductionBot - 20 + tBob, 4, 0, Math.PI * 2);
            cx.fill();
            // Hole left behind
            cx.strokeStyle = '#F87171';
            cx.lineWidth = 1.5;
            cx.beginPath();
            cx.arc(tex + 10, valenceTop + 30 - tBob, 4, 0, Math.PI * 2);
            cx.stroke();
          }

          // Photon excitation
          if (d.showPhoton && !isConductor && photonAllowed) {
            var pTime = (Date.now() % 2000) / 2000;
            var px = 60 + pTime * (W - 120);
            // Photon wavy arrow
            cx.strokeStyle = '#FBBF24';
            cx.lineWidth = 2;
            cx.beginPath();
            for (var pw = 0; pw < 6; pw++) {
              var pwy = valenceTop + 30 - pw * (gapPx + 45) / 6;
              var pwx = px + Math.sin(pw * 1.5) * 6;
              if (pw === 0) cx.moveTo(pwx, pwy); else cx.lineTo(pwx, pwy);
            }
            cx.stroke();
            // Photon label
            cx.fillStyle = '#FBBF24';
            cx.font = '11px sans-serif';
            cx.textAlign = 'center';
            cx.fillText('Photon: ' + photonEnergy.toFixed(2) + ' eV', px, valenceTop + 45);
            // Excited electron
            cx.fillStyle = '#F59E0B';
            cx.shadowColor = '#F59E0B';
            cx.shadowBlur = 10;
            cx.beginPath();
            cx.arc(px, conductionBot - 15 + Math.sin(Date.now() / 300) * 4, 5, 0, Math.PI * 2);
            cx.fill();
            cx.shadowBlur = 0;
            // Hole
            cx.strokeStyle = '#F87171';
            cx.lineWidth = 1.5;
            cx.beginPath();
            cx.arc(px, valenceTop + 30, 5, 0, Math.PI * 2);
            cx.stroke();
          }

          // Carrier concentration bar (9-12)
          if (gradeBand === '9-12' || gradeBand === '6-8') {
            var niLog = intrinsicN > 0 ? Math.log10(intrinsicN) : 0;
            var barW = Math.max(5, Math.min(80, niLog * 3.5));
            cx.fillStyle = '#94A3B8';
            cx.fillRect(W - 95, H - 35, 85, 12);
            cx.fillStyle = '#22D3EE';
            cx.fillRect(W - 95, H - 35, barW, 12);
            cx.fillStyle = '#94A3B8';
            cx.font = '10px sans-serif';
            cx.textAlign = 'right';
            cx.fillText('n\u1D62 carrier conc.', W - 10, H - 40);
          }

          // Classification label
          cx.fillStyle = isConductor ? '#34D399' : (isInsulator ? '#F87171' : '#FBBF24');
          cx.font = 'bold 12px sans-serif';
          cx.textAlign = 'left';
          var classLabel = isConductor ? '\u2713 Conductor' : (isInsulator ? '\u2717 Insulator' : '\u26A1 Semiconductor');
          cx.fillText(classLabel, 10, H - 5);
        };

        var animRef = React.useRef(null);
        React.useEffect(function() {
          var canvas = document.getElementById('semi-bandgap-canvas');
          if (!canvas) return;
          if (canvasA11yDesc) canvasA11yDesc(canvas, 'Band gap energy diagram. Shows valence and conduction bands for ' + mat.name + '. Band gap is ' + Eg.toFixed(2) + ' electron volts at ' + tempK + ' Kelvin.');
          function draw() { if (!canvas.isConnected) { cancelAnimationFrame(animRef.current); return; } canvasRef(canvas); if (!d.motionPaused && !semiReducedMotion()) animRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animRef.current); };
        }, [tab, subtool, d.motionPaused, d.material, d.temperature, d.showPhoton, d.showFermi, d.photonNm]);

        return h('div', null,
          // A single named selector keeps all eight comparison materials available
          // without placing eight focus stops between the learner and the diagram.
          h('div', { className: 'flex flex-wrap items-center gap-2 mb-3 rounded-lg border border-slate-600 bg-slate-900/60 p-2' },
            h('label', { htmlFor: 'semiconductor-material-select', className: 'text-sm font-bold text-slate-100' }, t('stem.semiconductor.material', 'Material')),
            h('select', {
              id: 'semiconductor-material-select',
              value: d.material || 'silicon',
              onChange: function(e) {
                var key = e.target.value;
                var selected = MATERIALS[key] || MATERIALS.silicon;
                upd('material', key);
                tryAwardXP('mat-' + key, 5, 'Explored ' + selected.name);
                if (typeof canvasNarrate === 'function') canvasNarrate('semiconductor', 'materialSelect', 'Selected ' + selected.name + '. Band gap: ' + selected.bandGap + ' electron volts. Lattice: ' + selected.lattice + '.', { debounce: 500 });
                if (announceToSR) announceToSR('Selected ' + selected.name + ', band gap ' + selected.bandGap + ' eV');
              },
              className: 'min-h-10 flex-1 min-w-[220px] rounded-lg bg-slate-950 text-slate-100 border border-slate-500 px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-cyan-400',
              'aria-describedby': 'semiconductor-material-help'
            }, Object.keys(MATERIALS).map(function(key) {
              return h('option', { key: key, value: key }, MATERIALS[key].name + ' — ' + MATERIALS[key].bandGap.toFixed(2) + ' eV at 300 K');
            })),
            h('span', { id: 'semiconductor-material-help', className: 'w-full text-xs text-slate-300' }, t('stem.semiconductor.material_help', 'Choose a material, then compare its band gap and classification in the diagram.'))
          ),
          h('canvas', { 
            id: 'semi-bandgap-canvas', width: 440, height: 240,
            className: 'block w-full max-w-5xl mx-auto rounded-lg bg-slate-950 border border-slate-500',
            tabIndex: 0,
            role: 'img', 'aria-label': 'Band gap diagram for ' + mat.name + ' at ' + tempK + ' kelvin. '
              + 'Band gap ' + Eg.toFixed(2) + ' electron volts. '
              + (isConductor ? 'Conductor: the bands overlap, so electrons move freely.'
                 : isInsulator ? 'Insulator: the gap is far too wide for thermal energy to bridge.'
                 : 'Semiconductor: thermal energy lifts some electrons across the gap.')
              + ' Use the material selector and temperature slider to change this visualization.'
          }),
          sliderRow('Temperature', tempK, 50, 800, 10, function(v) { upd('temperature', v); }, ' K'),
          h('div', { className: 'flex flex-wrap items-center gap-3 mt-2' },
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!d.showPhoton, onChange: function() { upd('showPhoton', !d.showPhoton); }, className: 'accent-amber-500' }),
              t('stem.semiconductor.photon_excitation', 'Photon Excitation')
            ),
            (gradeBand === '9-12' || gradeBand === '6-8') && h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!d.showFermi, onChange: function() { upd('showFermi', !d.showFermi); }, className: 'accent-orange-500' }),
              t('stem.semiconductor.fermi_level', 'Fermi Level')
            ),
            btn('\uD83E\uDD16 AI Explain', function() { askAI('band gap of ' + mat.name + ' semiconductor'); }),
            btn('\uD83D\uDD0A Read', function() { speakText(mat.name + ' has a band gap of ' + Eg.toFixed(2) + ' electron volts. ' + (isConductor ? 'It is a conductor.' : isInsulator ? 'It is an insulator.' : 'It is a semiconductor.')); }, 'transition-colors bg-slate-600 text-slate-200 hover:bg-slate-700')
          ),
          // Stats bar
          h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
            statBadge('Band Gap', Eg.toFixed(2) + ' eV', isConductor ? 'text-emerald-400' : isInsulator ? 'text-red-400' : 'text-amber-400'),
            statBadge('Lattice', mat.lattice),
            statBadge('Mobility at 300 K', mat.mobility + ' cm\u00B2/Vs'),
            intrinsicN != null && statBadge('Intrinsic carriers at ' + tempK + ' K', intrinsicN.toExponential(2) + ' /cm\u00B3')
          ),
          h('div', { className: 'semi-study', 'aria-label': 'Energy and carrier guide' },
            h('h4', null, t('stem.semiconductor.read_energy','Read this as energy, not distance')),
            h('p', null, t('stem.semiconductor.energy_axis_help','Higher on the diagram means higher electron energy. The gap is an energy range without allowed bulk states, not an empty space between atoms. Particle counts and motion are illustrative.')),
            d.showPhoton && !isConductor && h('div', null,
              sliderRow(t('stem.semiconductor.photon_wavelength','Photon wavelength'), photonNm, 200, 2000, 10, function(v){upd('photonNm',v);}, ' nm'),
              h('p', {role:'status'}, 'Photon energy: '+photonEnergy.toFixed(2)+' eV. '+(photonAllowed
                ? t('stem.semiconductor.photon_above_gap','Enough energy for band-to-band excitation. Absorption probability is not modeled; indirect-gap silicon also requires a phonon.')
                : t('stem.semiconductor.photon_below_gap','Below the band gap: no band-to-band excitation in this model.')))),
            h('details', null, h('summary', null, t('stem.semiconductor.model_assumptions','Model assumptions & sources')),
              h('p', null, t('stem.semiconductor.band_model_scope','Intrinsic thermal equilibrium; effective densities of states scale as T to the power 3/2. Concentrations are normalized to the listed 300 K values. Mobility is a 300 K reference, not a temperature-dependent conductivity prediction. Local linear fits for other materials become less reliable far from 300 K.')),
              h('a', {href:'https://www.ioffe.ru/SVA/NSM/Semicond/Si/bandstr.html',target:'_blank',rel:'noopener noreferrer'}, 'Ioffe Institute: silicon band structure'))),
          // Grade-differentiated info
          infoBox(gradeText(
            mat.name + ' \u2014 ' + (isConductor ? 'Electricity flows through it easily, like water in a pipe!' : isInsulator ? 'Electricity cannot flow through it \u2014 it blocks like a wall.' : 'A special material! Sometimes it conducts, sometimes it doesn\'t. We can control it like a switch!'),
            mat.name + ' \u2014 Band Gap: ' + Eg.toFixed(2) + ' eV. ' + (isConductor ? 'Conductor: free electrons flow easily.' : isInsulator ? 'Insulator: electrons are stuck.' : 'Semiconductor: moderate gap \u2014 we can control conduction with heat, light, or doping.'),
            mat.name + ' \u2014 E_g = ' + Eg.toFixed(2) + ' eV at ' + tempK + 'K. Lattice: ' + mat.lattice + '. ' + (isConductor ? 'Conductor: overlapping bands, metallic bonding.' : isInsulator ? 'Insulator: very large gap, covalent/ionic bonding.' : 'Semiconductor: moderate gap. Conductivity \u221D exp(-E_g/2kT).'),
            mat.name + ' \u2014 E_g(' + tempK + 'K) = ' + Eg.toFixed(3) + ' eV. Si, Ge and GaAs use a Varshni fit, E_g(T) = E_g(0) − αT²/(T+β), anchored at 300 K; other materials use a local linear estimate. Lattice: ' + mat.lattice + '. \u03BC\u2099 = ' + mat.mobility + ' cm\u00B2/Vs. n\u1D62(' + tempK + 'K) \u2248 ' + (intrinsicN != null ? intrinsicN.toExponential(2) : 'not applicable') + ' cm\u207B\u00B3. ' + (isConductor ? 'Metal: E\u1DA0 in conduction band.' : isInsulator ? 'E_g >> kT, negligible intrinsic carriers.' : 'Intrinsic: E\u1DA0 \u2248 mid-gap. \u03C3 = n\u1D62\u00B7q\u00B7(\u03BC\u2099+\u03BC\u209A).')
          )),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // DOPING SIMULATOR (enhanced)
      // ════════════════════════════════════════════
      function renderDoping() {
        // Normalise the raw state value ONCE. The line that seeds dopant positions
        // used to read d.dopant.length directly, so a state slice without a `dopant`
        // key threw "Cannot read properties of undefined" — and because renderTool
        // swallows render throws, the whole tool went blank rather than just this
        // panel. The default state does set dopant:'none', but any partially
        // restored or older persisted slice hit it.
        //
        // It also fixes a quieter bug: `d.dopant !== 'none'` is TRUE when the key is
        // undefined, so the animation loop below kept running on a static intrinsic
        // lattice. Normalising makes a missing key behave exactly like 'none'.
        var dopantKey = DOPANTS[d.dopant] ? d.dopant : 'none';
        var dopant = DOPANTS[dopantKey] || DOPANTS.none;
        var gridSize = Math.max(4,Math.min(12,Math.round(Number(d.crystalSize)||8)));
        var count = Math.max(1,Math.min(Math.floor(gridSize*gridSize*.3),Math.round(Number(d.dopantCount)||3)));

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var surface = prepareCanvas(canvasEl, 440, 300);
          var cx = surface.cx, W = surface.W, H = surface.H;
          cx.clearRect(0, 0, W, H);

          // Background
          cx.fillStyle = '#0F172A';
          cx.fillRect(0, 0, W, H);

          var cellW = (W - 20) / gridSize;
          var cellH = (H - 30) / gridSize;

          var dopantPositions = {};
          var seed = dopantKey.length * 7 + count * 13;
          for (var di = 0; di < count && di < gridSize * gridSize * 0.3; di++) {
            var pos = (seed * (di + 1) * 37 + di * 53) % (gridSize * gridSize);
            while (dopantPositions[pos]) pos = (pos + 1) % (gridSize * gridSize);
            dopantPositions[pos] = true;
          }

          // Draw crystal lattice
          for (var row = 0; row < gridSize; row++) {
            for (var col = 0; col < gridSize; col++) {
              var cx1 = 10 + col * cellW + cellW / 2;
              var cy1 = 10 + row * cellH + cellH / 2;
              var idx = row * gridSize + col;
              var isDopant = dopantPositions[idx] && dopantKey !== 'none';

              // Bonds
              cx.strokeStyle = '#64748B';
              cx.lineWidth = 1;
              if (col < gridSize - 1) { cx.beginPath(); cx.moveTo(cx1, cy1); cx.lineTo(cx1 + cellW, cy1); cx.stroke(); }
              if (row < gridSize - 1) { cx.beginPath(); cx.moveTo(cx1, cy1); cx.lineTo(cx1, cy1 + cellH); cx.stroke(); }

              var radius = Math.min(cellW, cellH) * 0.26;
              cx.beginPath();
              cx.arc(cx1, cy1, radius, 0, Math.PI * 2);

              if (isDopant) {
                // Glow effect
                cx.shadowColor = dopant.color;
                cx.shadowBlur = 6;
                cx.fillStyle = dopant.color;
                cx.fill();
                cx.shadowBlur = 0;
                cx.strokeStyle = '#FCD34D';
                cx.lineWidth = 2;
                cx.stroke();
                cx.fillStyle = canvasInkFor(dopant.color);
                cx.font = 'bold ' + Math.max(11, radius * 0.8) + 'px Inter, system-ui, sans-serif';
                cx.textAlign = 'center';
                cx.textBaseline = 'middle';
                cx.fillText(dopant.symbol, cx1, cy1);

                // Animated free carrier
                var carrierT = Date.now() / 600 + idx;
                var carrierDx = Math.sin(carrierT) * (radius + 6);
                var carrierDy = Math.cos(carrierT * 0.7) * (radius + 6);
                if (dopant.type === 'n') {
                  cx.fillStyle = '#60A5FA';
                  cx.beginPath();
                  cx.arc(cx1 + carrierDx, cy1 + carrierDy, 3, 0, Math.PI * 2);
                  cx.fill();
                  if (radius > 10) { cx.fillStyle = '#93C5FD'; cx.font = '10px sans-serif'; cx.fillText('e\u207B', cx1 + carrierDx, cy1 + carrierDy - 7); }
                } else if (dopant.type === 'p') {
                  cx.strokeStyle = '#F87171';
                  cx.lineWidth = 1.5;
                  cx.beginPath();
                  cx.arc(cx1 + carrierDx, cy1 + carrierDy, 3, 0, Math.PI * 2);
                  cx.stroke();
                  if (radius > 10) { cx.fillStyle = '#FCA5A5'; cx.font = '10px sans-serif'; cx.fillText('h\u207A', cx1 + carrierDx, cy1 + carrierDy - 7); }
                }
              } else {
                cx.fillStyle = '#4F46E5';
                cx.fill();
                cx.strokeStyle = '#6366F1';
                cx.lineWidth = 1;
                cx.stroke();
                cx.fillStyle = '#C7D2FE';
                cx.font = Math.max(10, radius * 0.65) + 'px sans-serif';
                cx.textAlign = 'center';
                cx.textBaseline = 'middle';
                cx.fillText('Si', cx1, cy1);
              }
            }
          }

          // Legend
          cx.fillStyle = '#94A3B8';
          cx.font = '12px sans-serif';
          cx.textAlign = 'left';
          cx.textBaseline = 'alphabetic';
          cx.fillText('Si lattice' + (dopantKey !== 'none' ? ' + ' + dopant.name + ' (' + dopant.type + '-type)' : ' (intrinsic)'), 10, H - 5);

          // Doping concentration readout (6-8+)
          if (gradeBand !== 'K-2' && gradeBand !== '3-5' && dopantKey !== 'none') {
            var concExp = 14 + count;
            cx.fillStyle = '#22D3EE';
            cx.font = '11px sans-serif';
            cx.textAlign = 'right';
            cx.fillText('N\u2093 \u2248 10^' + concExp + ' cm\u207B\u00B3', W - 10, H - 5);
          }
        };

        var animRef = React.useRef(null);
        React.useEffect(function() {
          var canvas = document.getElementById('semi-doping-canvas');
          if (!canvas) return;
          // Only loop while there's a moving free carrier to animate (dopant set).
          // The intrinsic (none) lattice is static — paint it once; the effect
          // re-fires and restarts the loop when the student picks a real dopant.
          function draw() { if (!canvas.isConnected) { cancelAnimationFrame(animRef.current); return; } canvasRef(canvas); if (dopantKey !== 'none' && !d.motionPaused && !semiReducedMotion()) animRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animRef.current); };
        }, [tab, subtool, d.motionPaused, dopantKey, d.dopantCount, d.crystalSize, d.crystalView]);

        return h('div', null,
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            Object.keys(DOPANTS).map(function(key) {
              var dp = DOPANTS[key];
              return pill(dp.name, dopantKey === key, function() {
                upd('dopant', key);
                if (key !== 'none') tryAwardXP('dope-' + key, 8, 'Tried ' + dp.name + ' doping');
                if (typeof canvasNarrate === 'function') canvasNarrate('semiconductor', 'dopantSelect', dp.name + (dp.type ? ', ' + dp.type + '-type doping. Majority carriers: ' + (dp.type === 'n' ? 'electrons' : 'holes') + '.' : '. Intrinsic silicon, no doping.'), { debounce: 500 });
                if (announceToSR) announceToSR('Selected dopant: ' + dp.name + (dp.type ? ', ' + dp.type + '-type' : ''));
              }, 'dop-' + key);
            })
          ),
          h('div', {className:'semi-inspector-controls semi-view-switch',role:'group','aria-label':'Crystal view'},
            h('button',{type:'button','aria-pressed':d.crystalView!=='3d',onClick:function(){upd('crystalView','2d');}},t('stem.semiconductor.diagram_2d','2D bond diagram')),
            h('button',{type:'button','aria-pressed':d.crystalView==='3d',onClick:function(){upd('crystalView','3d');}},t('stem.semiconductor.crystal_3d','3D crystal'))),
          d.crystalView === '3d' ? h(SemiCrystalInspector,{React:React,t:t,dopant:dopant}) : h('canvas', {
            id: 'semi-doping-canvas', width: 440, height: 300,
            className: 'block w-full max-w-5xl mx-auto rounded-lg bg-slate-950 border border-slate-500',
            role: 'img', 'aria-label': dopantKey !== 'none'
              ? 'Silicon crystal lattice with ' + count + ' ' + dopant.name + ' atoms substituted in. '
                + dopant.name + ' has ' + dopant.valence + ' valence electrons against silicon\u2019s 4, making this '
                + dopant.type + '-type with ' + (dopant.type === 'n' ? 'free electrons' : 'holes') + ' as the majority carrier.'
              : 'Intrinsic silicon crystal lattice. Every atom has 4 valence electrons, all shared in covalent bonds, so there are almost no free carriers.'
          }),
          h('p',{className:'semi-model-note'},t('stem.semiconductor.doping_scale_note','The 2D grid exaggerates dopant abundance to show substitutions; it does not predict carrier density. The 3D view isolates one representative site. Doped bulk material remains electrically neutral overall.')),
          d.crystalView !== '3d' && sliderRow('Dopant atoms', count, 1, Math.floor(gridSize * gridSize * 0.3), 1, function(v) { upd('dopantCount', v); }),
          d.crystalView !== '3d' && sliderRow('Grid size', gridSize, 4, 12, 1, function(v) { upd('crystalSize', v); }),
          // Stats
          dopantKey !== 'none' && h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
            statBadge('Type', dopant.type + '-type', dopant.type === 'n' ? 'text-blue-400' : 'text-red-400'),
            statBadge('Valence e\u207B', String(dopant.valence)),
            statBadge('Majority', dopant.type === 'n' ? 'Electrons' : 'Holes'),
            statBadge('Minority', dopant.type === 'n' ? 'Holes' : 'Electrons')
          ),
          infoBox(gradeText(
            dopantKey === 'none' ? 'Silicon is like a team where everyone holds hands. No free helpers!' : dopant.type === 'n' ? dopant.name + ' brings an EXTRA helper (electron) that can move around freely!' : dopant.name + ' is missing a helper, leaving a hole that other helpers can jump into!',
            dopantKey === 'none' ? 'Intrinsic silicon: 4 valence electrons each, all shared in bonds. Very few free carriers.' : dopant.type === 'n' ? 'N-type: ' + dopant.name + ' has ' + dopant.valence + ' electrons (1 extra). Extra electrons are free to move and carry current.' : 'P-type: ' + dopant.name + ' has ' + dopant.valence + ' electrons (1 fewer). Creates holes that act as positive charge carriers.',
            dopantKey === 'none' ? 'Intrinsic Si: n\u1D62 = p\u1D62 = 1.5\u00D710\u00B9\u2070 cm\u207B\u00B3 at 300K. Equal electron-hole pairs from thermal generation.' : dopant.type === 'n' ? 'N-type with ' + dopant.name + ': N\u2093 >> n\u1D62. Majority: electrons, minority: holes. E\u1DA0 shifts toward E\u1D9C.' : 'P-type with ' + dopant.name + ': N\u2090 >> n\u1D62. Majority: holes, minority: electrons. E\u1DA0 shifts toward E\u1D65.',
            dopantKey === 'none' ? 'Intrinsic Si at 300K: n = p = n\u1D62 = 1.5\u00D710\u00B9\u2070 cm\u207B\u00B3. Fermi level at mid-gap. \u03C3 = q\u00B7n\u1D62\u00B7(\u03BC\u2099 + \u03BC\u209A) \u2248 4.4\u00D710\u207B\u2076 S/cm (\u03C1 \u2248 2.3\u00D710\u2075 \u03A9\u00B7cm).' : dopant.type === 'n' ? 'N-type (' + dopant.name + '): n \u2248 N\u2093, p = n\u1D62\u00B2/N\u2093. E\u1DA0 \u2212 E\u1D62 = kT\u00B7ln(N\u2093/n\u1D62). Conductivity \u03C3 \u2248 q\u00B7N\u2093\u00B7\u03BC\u2099. Mass-action law: np = n\u1D62\u00B2.' : 'P-type (' + dopant.name + '): p \u2248 N\u2090, n = n\u1D62\u00B2/N\u2090. E\u1D62 \u2212 E\u1DA0 = kT\u00B7ln(N\u2090/n\u1D62). \u03C3 \u2248 q\u00B7N\u2090\u00B7\u03BC\u209A. Mass-action law: np = n\u1D62\u00B2.'
          )),
          h('div', { className: 'flex gap-2 mt-2' },
            btn('\uD83E\uDD16 AI Explain', function() { askAI(dopantKey === 'none' ? 'intrinsic semiconductor crystal lattice' : dopant.type + '-type doping with ' + dopant.name); }, 'transition-colors bg-indigo-600 text-white hover:bg-indigo-700'),
            btn('\uD83D\uDD0A Read', function() { speakText(dopantKey === 'none' ? 'Intrinsic silicon with 4 valence electrons in covalent bonds.' : dopant.type + '-type doping with ' + dopant.name + '. Majority carriers are ' + (dopant.type === 'n' ? 'electrons' : 'holes') + '.'); }, 'transition-colors bg-slate-600 text-slate-200 hover:bg-slate-700')
          ),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // P-N JUNCTION (enhanced with I-V overlay + LED)
      // ════════════════════════════════════════════
      function renderPNJunction() {
        var pn = semiJunction(d.pnBias);
        var bias = pn.bias;
        var showField = d.pnShowField !== false;
        var showCarriers = d.pnShowCarriers !== false;
        var showDepletion = d.pnShowDepletion !== false;

        // Physical width and regime come from the shared junction model.
        // Drawing width is bounded for legibility; numerical values remain physical.
        var PN_PX_PER_UM = 141;
        var depletionUm = pn.widthUm;
        var pnModelValid = pn.valid;
        var depletionW = Math.max(5, Math.min(120, depletionUm * PN_PX_PER_UM));
        var pnDepletionLabel = pnModelValid
          ? 'Depletion region about ' + depletionUm.toFixed(2) + ' micrometres wide.'
          : 'Depletion approximation is no longer reliable near or beyond the built-in potential; no quantitative width is reported.';

        var animFrameRef = React.useRef(null);

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var surface = prepareCanvas(canvasEl, 440, 280);
          var cx = surface.cx, W = surface.W, H = surface.H;
          cx.clearRect(0, 0, W, H);

          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          var midX = W / 2;
          var junctionY = 30;
          var junctionH = H - 70;
          // depletionW / depletionUm / pnModelValid are computed at renderPNJunction
          // scope above, so the drawing and the aria-label cannot disagree.

          // P-side
          var pGrad = cx.createLinearGradient(10, 0, midX - depletionW / 2, 0);
          pGrad.addColorStop(0, '#1E40AF'); pGrad.addColorStop(1, '#3B82F6');
          cx.fillStyle = pGrad;
          cx.fillRect(10, junctionY, midX - 10 - depletionW / 2, junctionH);
          cx.fillStyle = '#FFF'; cx.font = 'bold 13px sans-serif'; cx.textAlign = 'center';
          cx.fillText('P-type', (10 + midX - depletionW / 2) / 2, junctionY + 18);
          // N-side
          var nGrad = cx.createLinearGradient(midX + depletionW / 2, 0, W - 10, 0);
          nGrad.addColorStop(0, '#EF4444'); nGrad.addColorStop(1, '#991B1B');
          cx.fillStyle = nGrad;
          cx.fillRect(midX + depletionW / 2, junctionY, W - 10 - midX - depletionW / 2, junctionH);
          cx.fillStyle = '#FFF';
          cx.fillText('N-type', (midX + depletionW / 2 + W - 10) / 2, junctionY + 18);
          // Depletion region
          if (showDepletion) {
            cx.fillStyle = 'rgba(148, 163, 184, 0.25)';
            cx.fillRect(midX - depletionW / 2, junctionY, depletionW, junctionH);
            cx.strokeStyle = '#CBD5E1'; cx.setLineDash([4, 3]); cx.lineWidth = 1;
            cx.strokeRect(midX - depletionW / 2, junctionY, depletionW, junctionH);
            cx.setLineDash([]);
            cx.fillStyle = '#CBD5E1'; cx.font = '11px sans-serif'; cx.textAlign = 'center';
            // Plain glyphs on purpose: at this label size the Latin modifier-letter
            // subscripts used elsewhere in the tool shrink to 2-3px and read as
            // punctuation. Verified on a rendered canvas, not assumed.
            cx.fillText(
              pnModelValid
                ? 'Depletion ≈ ' + depletionUm.toFixed(2) + ' µm  (doping 10¹⁶ cm⁻³)'
                : 'Outside depletion approximation',
              midX, junctionY + junctionH + 12);
          }

          // Uncompensated fixed charge belongs INSIDE the depletion region.
          if (showDepletion && pnModelValid && depletionW > 12) {
            cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
            for (var row = 0; row < 3; row++) {
              cx.fillStyle = '#93c5fd'; cx.fillText('\u2296', midX-depletionW/4, junctionY+48+row*35);
              cx.fillStyle = '#fca5a5'; cx.fillText('\u2295', midX+depletionW/4, junctionY+48+row*35);
            }
          }
          // E-field arrows
          if (showField && pnModelValid && depletionW > 15) {
            cx.strokeStyle = '#FBBF24'; cx.lineWidth = 2;
            var arrowCount = Math.floor(junctionH / 35);
            for (var ai = 0; ai < arrowCount; ai++) {
              var ay = junctionY + 30 + ai * 35;
              var ax1 = midX - depletionW / 3, ax2 = midX + depletionW / 3;
              cx.beginPath(); cx.moveTo(ax2, ay); cx.lineTo(ax1, ay); cx.stroke();
              cx.beginPath(); cx.moveTo(ax1 + 5, ay - 4); cx.lineTo(ax1, ay); cx.lineTo(ax1 + 5, ay + 4); cx.stroke();
            }
            cx.fillStyle = '#FBBF24'; cx.font = '11px sans-serif'; cx.fillText('\u2190 E field', midX, junctionY + junctionH - 8);
          }

          // Carrier animation
          if (showCarriers) {
            var t = (Date.now() % 3000) / 3000;
            if (bias > 0) {
              var flowSpeed = t;
              cx.strokeStyle = '#93C5FD'; cx.lineWidth = 1.5;
              for (var hi = 0; hi < 6; hi++) {
                var hx = 40 + ((flowSpeed * W + hi * 70) % (W - 80));
                var hy = junctionY + 40 + (hi % 3) * (junctionH / 4);
                cx.beginPath(); cx.arc(hx, hy, 4, 0, Math.PI * 2); cx.stroke();
              }
              cx.fillStyle = '#FCA5A5';
              for (var ei = 0; ei < 6; ei++) {
                var exx = W - 40 - ((flowSpeed * W + ei * 70) % (W - 80));
                var ey = junctionY + 55 + (ei % 3) * (junctionH / 4);
                cx.beginPath(); cx.arc(exx, ey, 3, 0, Math.PI * 2); cx.fill();
              }
              // Current indicator with glow
              cx.shadowColor = '#34D399'; cx.shadowBlur = 8;
              cx.fillStyle = '#34D399'; cx.font = 'bold 12px sans-serif';
              cx.fillText('Forward bias: conventional current \u2192', midX, junctionY - 10);
              cx.shadowBlur = 0;

              // LED glow effect
              if (d.pnLedMode && bias > 0.6) {
                var glowIntensity = Math.min(1, (bias - 0.6) / 1.5);
                cx.beginPath();
                cx.arc(midX, junctionY - 25, 12, 0, Math.PI * 2);
                cx.fillStyle = 'rgba(251, 191, 36, ' + glowIntensity.toFixed(2) + ')';
                cx.shadowColor = '#FBBF24'; cx.shadowBlur = 20 * glowIntensity;
                cx.fill();
                cx.shadowBlur = 0;
                cx.fillStyle = '#FCD34D'; cx.font = '10px sans-serif';
                cx.fillText('LED analogy', midX, junctionY - 38);
              }
            } else {
              if (bias < 0) {
                cx.fillStyle = '#F87171'; cx.font = '13px sans-serif'; cx.textAlign = 'center';
                cx.fillText('Reverse bias: small leakage; wider depletion', midX, junctionY - 10);
              }
              cx.strokeStyle = '#93C5FD'; cx.lineWidth = 1.5;
              for (var qpi = 0; qpi < 5; qpi++) {
                var ppx = 30 + qpi * ((midX - depletionW / 2 - 30) / 4);
                var ppy = junctionY + 45 + (qpi % 3) * 30 + Math.sin(Date.now() / 700 + qpi) * 5;
                cx.beginPath(); cx.arc(ppx, ppy, 4, 0, Math.PI * 2); cx.stroke();
              }
              cx.fillStyle = '#FCA5A5';
              for (var qni = 0; qni < 5; qni++) {
                var nnx = midX + depletionW / 2 + 15 + qni * ((W - midX - depletionW / 2 - 30) / 4);
                var nny = junctionY + 45 + (qni % 3) * 30 + Math.sin(Date.now() / 700 + qni + 3) * 5;
                cx.beginPath(); cx.arc(nnx, nny, 3, 0, Math.PI * 2); cx.fill();
              }
            }
          }

          // Same ideal-diode model as the readout; explicit finite voltage window.
          if (d.pnShowIV) {
            var ivX=W-145,ivY=H-92,ivW=132,ivH=55;
            var xAt=function(v){return ivX+8+(v+3)/3.6*(ivW-16);};
            var yAt=function(i){return ivY+ivH-8-i/6e-6*(ivH-16);};
            cx.fillStyle='#020617';cx.fillRect(ivX,ivY,ivW,ivH);
            cx.strokeStyle='#64748b';cx.lineWidth=1;cx.strokeRect(ivX,ivY,ivW,ivH);
            cx.beginPath();cx.moveTo(xAt(-3),yAt(0));cx.lineTo(xAt(.6),yAt(0));cx.stroke();
            cx.beginPath();cx.moveTo(xAt(0),ivY+4);cx.lineTo(xAt(0),ivY+ivH-4);cx.stroke();
            cx.strokeStyle='#67e8f9';cx.beginPath();
            for(var point=0;point<=100;point++){
              var voltage=-3+point*3.6/100,xx=xAt(voltage),yy=yAt(semiJunction(voltage).currentA);
              if(point===0)cx.moveTo(xx,yy);else cx.lineTo(xx,yy);
            }
            cx.stroke();
            if(bias<=.6){cx.fillStyle='#fbbf24';cx.beginPath();cx.arc(xAt(bias),yAt(pn.currentA),3,0,Math.PI*2);cx.fill();}
            cx.fillStyle='#e2e8f0';cx.font='9px sans-serif';cx.textAlign='center';
            cx.fillText('−3 to +0.6 V · 0 to 6 µA',ivX+ivW/2,ivY+ivH+10);
          }

          // Battery / bias
          cx.fillStyle = '#E2E8F0'; cx.font = '13px sans-serif'; cx.textAlign = 'left';
          cx.fillText('V\u2090\u209A\u209A = ' + (bias >= 0 ? '+' : '') + bias.toFixed(1) + ' V', 10, H - 5);
        };

        React.useEffect(function() {
          var canvas = document.getElementById('semi-pn-canvas');
          if (!canvas) return;
          function draw() { if (!canvas.isConnected) { cancelAnimationFrame(animFrameRef.current); return; } canvasRef(canvas); if (!d.motionPaused && !semiReducedMotion()) animFrameRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animFrameRef.current); };
        }, [tab, subtool, d.motionPaused, d.pnBias, d.pnShowField, d.pnShowCarriers, d.pnShowDepletion, d.pnShowIV, d.pnLedMode]);

        return h('div', null,
          h('canvas', { 
            id: 'semi-pn-canvas', width: 440, height: 280,
            className: 'block w-full max-w-5xl mx-auto rounded-lg bg-slate-950 border border-slate-500',
            // The depletion width is the quantity this view exists to show, so the
            // non-visual label carries it too rather than just the bias.
            role: 'img', 'aria-label': 'P-N junction diagram. Bias ' + bias.toFixed(1)
              + ' volts. ' + (bias > 0 ? 'Forward biased' : bias < 0 ? 'Reverse biased' : 'Zero bias, equilibrium')
              + '. ' + (pnDepletionLabel || '')
          }),
          h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Bias presets'},
            h('button',{type:'button',onClick:function(){upd('pnBias',-1);}},t('stem.semiconductor.reverse_preset','Reverse −1 V')),
            h('button',{type:'button',onClick:function(){upd('pnBias',0);}},t('stem.semiconductor.equilibrium_preset','Equilibrium 0 V')),
            h('button',{type:'button',onClick:function(){upd('pnBias',.5);}},t('stem.semiconductor.forward_preset','Forward +0.5 V'))),
          sliderRow('Bias Voltage', bias, -3, 3, 0.1, function(v) {
            upd('pnBias', v);
            if (v > 0.6) tryAwardXP('pn-forward', 10, 'Applied forward bias to P-N junction');
            if (v < -1) tryAwardXP('pn-reverse', 10, 'Applied reverse bias');
          }, ' V'),
          h('div', { className: 'flex flex-wrap gap-3 mt-2' },
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showField, onChange: function() { upd('pnShowField', !showField); }, className: 'accent-yellow-500' }), 'E-Field'),
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showCarriers, onChange: function() { upd('pnShowCarriers', !showCarriers); }, className: 'accent-blue-500' }), t('stem.semiconductor.carriers', 'Carriers')),
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showDepletion, onChange: function() { upd('pnShowDepletion', !showDepletion); }, className: 'accent-slate-400' }), t('stem.semiconductor.depletion', 'Depletion')),
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!d.pnShowIV, onChange: function() { upd('pnShowIV', !d.pnShowIV); }, className: 'accent-cyan-500' }), t('stem.semiconductor.i_v_curve', 'I-V Curve')),
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!d.pnLedMode, onChange: function() { upd('pnLedMode', !d.pnLedMode); if (!d.pnLedMode) tryAwardXP('pn-led', 10, 'Explored LED mode'); }, className: 'accent-amber-500' }), t('stem.semiconductor.led_analogy', 'LED analogy (different material)')),
            btn('\uD83E\uDD16 AI', function() {
              askAI(bias > 0 ? 'forward biased P-N junction current flow' : bias < 0 ? 'reverse biased P-N junction depletion' : 'P-N junction equilibrium');
            })
          ),
          h('div',{className:'semi-study',role:'status'},
            h('h4',null,pn.regime+' · '+bias.toFixed(1)+' V'),
            h('p',null,pnDepletionLabel),
            h('p',null,pn.currentA == null
              ? t('stem.semiconductor.high_injection_limit','Strong forward bias: this simplified model does not estimate current or depletion width here. Real behavior depends on injection, resistance and heating.')
              : 'Illustrative ideal-diode current: '+(pn.currentA===0?'0':pn.currentA.toExponential(2))+' A.'),
            h('p',null,t('stem.semiconductor.pn_charge_guide','Hollow blue circles are holes; filled red circles are electrons. Fixed − acceptor ions lie on the P side of the depletion region; fixed + donor ions lie on the N side. The built-in electric field points from N to P. Forward electron flow is opposite conventional current.')),
            h('details',null,h('summary',null,t('stem.semiconductor.model_assumptions','Model assumptions & sources')),
              h('p',null,t('stem.semiconductor.pn_model_scope','Abrupt, equally doped silicon junction at 300 K: NA = ND = 10¹⁶ cm⁻³; built-in potential approximated as 0.7 V. Width follows the depletion approximation. The ideal-diode example uses Is = 1 pA and ideality factor 1.5. Motion is schematic, not drift speed. Breakdown, series resistance and heating are not simulated. A silicon junction is not an efficient light emitter; LED glow is an analogy for a different material.')),
              h('a',{href:'https://openstax.org/books/university-physics-volume-3/pages/9-7-semiconductor-devices',target:'_blank',rel:'noopener noreferrer'},'OpenStax: semiconductor devices'))),
          infoBox(gradeText(
            bias > 0 ? 'Push the positive side \u2014 electricity flows through like opening a gate!' : bias < 0 ? 'Push the wrong way \u2014 the gate closes tighter!' : 'The gate is balanced \u2014 no electricity flows yet.',
            bias > 0 ? 'Forward Bias: voltage pushes carriers across the junction. Current flows!' : bias < 0 ? 'Reverse Bias: voltage pulls carriers apart. Depletion widens, blocking current.' : 'Equilibrium: internal electric field balances diffusion. No net current.',
            bias > 0 ? 'Forward Bias (V > 0): depletion narrows, diffusion current dominates. I = I\u2080(e^(V/V\u209C) \u2212 1). This is how diodes and LEDs work.' : bias < 0 ? 'Reverse Bias: depletion widens \u221D \u221A(V\u2091\u1D62 + |V\u1D63|). Only leakage current I\u2080 flows. Breakdown at V\u2091\u1D63.' : 'Equilibrium: built-in potential V\u2091\u1D62 \u2248 0.6-0.7V (Si). Drift and diffusion currents balance.',
            bias > 0 ? 'Forward: I = I\u2080(e^(qV/nkT) \u2212 1), n\u22481-2. Depletion width W \u221D \u221A(V\u2091\u1D62\u2212V\u1DA0). Minority carrier injection dominates. At V >> V\u209C: I \u2248 I\u2080\u00B7e^(qV/kT).' : bias < 0 ? 'Reverse: W = \u221A(2\u03B5(V\u2091\u1D62+|V\u1D63|)/q \u00B7 (1/N\u2090+1/N\u2093)). C\u2C7C = \u03B5A/W (junction capacitance). Breakdown mechanisms depend on doping and field; breakdown is not modeled here.' : 'Equilibrium: V\u2091\u1D62 = (kT/q)ln(N\u2090N\u2093/n\u1D62\u00B2). Built-in field \u2248 10\u2074-10\u2075 V/cm. Depletion approximation: very few mobile carriers; uncompensated fixed ions remain.'
          )),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // TRANSISTOR SIMULATOR (enhanced + CMOS)
      // ════════════════════════════════════════════
      function renderTransistor() {
        var type = ['mosfet-n','mosfet-p','bjt-npn'].indexOf(d.transistorType)>=0?d.transistorType:'mosfet-n';
        var showCMOS=!!d.showCMOS,isMos=type!=='bjt-npn',isP=type==='mosfet-p';
        var Vg=semiNumber(d.gateVoltage,0,showCMOS?0:isP?-5:0,showCMOS?5:isP?0:isMos?5:.9);
        var Vd=semiNumber(d.drainVoltage,isP?-5:5,isP?-10:0,isP?0:10);
        var mos=semiMOS(type,Vg,Vd),threshold=isMos?(isP?-1.5:1.5):.6;
        var isOn=isMos?mos.channel:Vg>threshold;
        var currentPct=isMos?Math.min(100,Math.abs(mos.currentA||0)/.006125*100):Math.max(0,Math.min(100,(Vg-.6)/.3*100));
        var cmosTransition=Vg>1.5&&Vg<3.5,cmosOut=Vg<2.5;
        var cmosText=cmosTransition?'TRANSITION':cmosOut?'HIGH':'LOW';
        var transistorReadout=showCMOS?'CMOS output: '+cmosText:isMos
          ? mos.region+'. Drain current '+(1000*(mos.currentA||0)).toFixed(3)+' mA. '+(mos.channel?'Channel present.':'No strong-inversion channel.')
          : 'NPN base-emitter voltage '+Vg.toFixed(2)+' V. Qualitative '+(isOn?'conducting':'cutoff')+' illustration.';

        var animRef = React.useRef(null);
        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var logicalHeight = showCMOS ? 200 : 220;
          var surface = prepareCanvas(canvasEl, 440, logicalHeight);
          var cx = surface.cx, W = surface.W, H = surface.H;
          cx.clearRect(0, 0, W, H);
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          var midX = W / 2, midY = H / 2;

          if (showCMOS) {
            // ═══ CMOS INVERTER DIAGRAM ═══
            var vdd = 5;
            // VDD rail
            cx.strokeStyle = '#EF4444'; cx.lineWidth = 2;
            cx.beginPath(); cx.moveTo(midX, 15); cx.lineTo(midX, 35); cx.stroke();
            cx.fillStyle = '#EF4444'; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
            cx.fillText('VDD = ' + vdd + 'V', midX, 12);

            // PMOS (top)
            cx.fillStyle = '#1E3A5F'; cx.fillRect(midX - 30, 35, 60, 40);
            cx.strokeStyle = '#3B82F6'; cx.lineWidth = 1.5; cx.strokeRect(midX - 30, 35, 60, 40);
            cx.fillStyle = '#93C5FD'; cx.font = 'bold 12px sans-serif';
            cx.fillText('PMOS', midX, 58);
            var pmosOn = Vg < (vdd - 1.5);
            cx.fillStyle = pmosOn ? '#34D399' : '#94A3B8'; cx.font = '11px sans-serif';
            cx.fillText(pmosOn ? 'ON' : 'OFF', midX + 40, 55);

            // Connection
            cx.strokeStyle = '#64748B'; cx.lineWidth = 2;
            cx.beginPath(); cx.moveTo(midX, 75); cx.lineTo(midX, 95); cx.stroke();

            // Output node
            cx.fillStyle = cmosTransition ? '#FBBF24' : cmosOut ? '#34D399' : '#EF4444';
            cx.beginPath(); cx.arc(midX, 95, 6, 0, Math.PI * 2); cx.fill();
            cx.strokeStyle = '#64748B'; cx.beginPath(); cx.moveTo(midX + 6, 95); cx.lineTo(midX + 50, 95); cx.stroke();
            cx.fillStyle = cmosTransition ? '#FBBF24' : cmosOut ? '#34D399' : '#EF4444'; cx.font = 'bold 13px sans-serif'; cx.textAlign = 'left';
            cx.fillText('OUT = ' + cmosText, midX + 55, 98);

            // NMOS (bottom)
            cx.fillStyle = '#3B1212'; cx.fillRect(midX - 30, 105, 60, 40);
            cx.strokeStyle = '#EF4444'; cx.lineWidth = 1.5; cx.strokeRect(midX - 30, 105, 60, 40);
            cx.fillStyle = '#FCA5A5'; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
            cx.fillText('NMOS', midX, 128);
            var nmosOn = Vg > 1.5;
            cx.fillStyle = nmosOn ? '#34D399' : '#94A3B8'; cx.font = '11px sans-serif';
            cx.fillText(nmosOn ? 'ON' : 'OFF', midX + 40, 125);

            // GND rail
            cx.strokeStyle = '#64748B'; cx.lineWidth = 2;
            cx.beginPath(); cx.moveTo(midX, 145); cx.lineTo(midX, 165); cx.stroke();
            cx.fillStyle = '#94A3B8'; cx.font = 'bold 12px sans-serif';
            cx.fillText('GND', midX, 178);

            // Gate input
            cx.strokeStyle = '#FBBF24'; cx.lineWidth = 2;
            cx.beginPath(); cx.moveTo(30, 95); cx.lineTo(midX - 30, 95); cx.stroke();
            // Branch to both gates
            cx.beginPath(); cx.moveTo(midX - 35, 55); cx.lineTo(midX - 30, 55); cx.stroke();
            cx.beginPath(); cx.moveTo(midX - 35, 125); cx.lineTo(midX - 30, 125); cx.stroke();
            cx.beginPath(); cx.moveTo(midX - 35, 55); cx.lineTo(midX - 35, 125); cx.stroke();
            cx.beginPath(); cx.moveTo(midX - 35, 95); cx.lineTo(30, 95); cx.stroke();
            cx.fillStyle = '#FBBF24'; cx.font = 'bold 13px sans-serif'; cx.textAlign = 'right';
            cx.fillText('IN = ' + Vg.toFixed(1) + 'V', 28, 92);

            // Current flow animation
            if (nmosOn && pmosOn) {
              var ft = (Date.now() % 1200) / 1200;
              cx.fillStyle = 'rgba(52, 211, 153, 0.6)';
              cx.beginPath(); cx.arc(midX, 125 + ft * 40, 3, 0, Math.PI * 2); cx.fill();
            }
            if (pmosOn && nmosOn) {
              var ft2 = (Date.now() % 1200) / 1200;
              cx.fillStyle = 'rgba(52, 211, 153, 0.6)';
              cx.beginPath(); cx.arc(midX, 35 + ft2 * 40, 3, 0, Math.PI * 2); cx.fill();
            }

            // Truth table
            cx.fillStyle = '#94A3B8'; cx.font = '11px monospace'; cx.textAlign = 'left';
            cx.fillText('IN\u2502OUT', W - 55, 30);
            cx.fillText(' 0 \u2502 1', W - 55, 42);
            cx.fillText(' 1 \u2502 0', W - 55, 54);
          } else if (type.startsWith('mosfet')) {
            // ═══ SINGLE MOSFET ═══
            cx.fillStyle = '#1E293B'; cx.fillRect(midX - 60, midY - 30, 120, 60);
            cx.strokeStyle = '#64748B'; cx.lineWidth = 2; cx.strokeRect(midX - 60, midY - 30, 120, 60);
            // Gate
            cx.fillStyle = '#FBBF24'; cx.fillRect(midX - 40, midY - 55, 80, 18);
            cx.fillStyle = '#FFF'; cx.font = 'bold 13px sans-serif'; cx.textAlign = 'center';
            cx.fillText('Gate', midX, midY - 42);
            // Oxide
            cx.fillStyle = '#94A3B8'; cx.fillRect(midX - 40, midY - 37, 80, 7);
            cx.fillStyle = '#94A3B8'; cx.font = '10px sans-serif'; cx.fillText('SiO\u2082', midX, midY - 32);
            // Source
            cx.fillStyle = type === 'mosfet-n' ? '#EF4444' : '#3B82F6';
            cx.fillRect(midX - 80, midY - 15, 25, 30);
            cx.fillStyle = '#FFF'; cx.font = 'bold 12px sans-serif'; cx.fillText('S', midX - 67, midY + 4);
            // Drain
            cx.fillStyle = type === 'mosfet-n' ? '#EF4444' : '#3B82F6';
            cx.fillRect(midX + 55, midY - 15, 25, 30);
            // Back to white before the letter. The line above sets fillStyle to the
            // block colour for the rectangle, so without this the D was drawn red on
            // red and was invisible — the source terminal was labelled and the drain
            // silently was not.
            cx.fillStyle = '#FFF';
            cx.fillText('D', midX + 68, midY + 4);
            // Substrate label
            cx.fillStyle = '#94A3B8'; cx.font = '10px sans-serif';
            cx.fillText(type === 'mosfet-n' ? 'p-substrate' : 'n-substrate', midX, midY + 25);

            // Channel
            if (isOn) {
              var channelAlpha = Math.min(1,.3+mos.overdrive/3.5);
              cx.fillStyle = 'rgba(52, 211, 153, ' + channelAlpha.toFixed(2) + ')';
              cx.fillRect(midX - 55, midY - 5, 110, 10);
              cx.strokeStyle = '#34D399'; cx.lineWidth = 2;
              var flowOffset = (Date.now() % 1000) / 1000 * 30;
              for (var fi = 0; fi < (Math.abs(mos.currentA||0)>0?5:0); fi++) {
                var fx = midX - 50 + (fi * 25 + flowOffset) % 110;
                cx.beginPath(); cx.moveTo(fx, midY); cx.lineTo(fx + 8, midY); cx.stroke();
                cx.beginPath(); cx.moveTo(fx + 6, midY - 3); cx.lineTo(fx + 8, midY); cx.lineTo(fx + 6, midY + 3); cx.stroke();
              }
            }

            // Labels
            cx.fillStyle = '#E2E8F0'; cx.font = '12px sans-serif'; cx.textAlign = 'left';
            cx.fillText('V\u2097\u209B = ' + Vg.toFixed(1) + 'V', 10, 20);
            cx.fillText('V\u2093\u209B = ' + Vd.toFixed(1) + 'V', 10, 35);
            cx.fillText('Vth = ' + threshold.toFixed(1) + 'V', 10, 50);
            cx.fillStyle = isOn ? '#34D399' : '#F87171'; cx.font = 'bold 14px sans-serif';
            cx.fillText(isOn ? 'Channel' : 'Cutoff', W - 65, 25);
            cx.fillStyle = '#60A5FA'; cx.font = '12px sans-serif';
            cx.textAlign='right';cx.fillText('Id = '+((mos.currentA||0)*1000).toFixed(3)+' mA', W - 10, 45);

            // Operating region (9-12)
            if (gradeBand === '9-12' && isOn) {
              var region = mos.region;
              cx.fillStyle = '#A78BFA'; cx.font = '11px sans-serif';
              cx.fillText(region, W - 10, 60);
            }

            // Wires
            cx.strokeStyle = '#64748B'; cx.lineWidth = 2;
            cx.beginPath(); cx.moveTo(midX, midY - 55); cx.lineTo(midX, midY - 75); cx.stroke();
            cx.fillStyle = '#FBBF24'; cx.font = '12px sans-serif'; cx.textAlign = 'center'; cx.fillText('G', midX, midY - 78);
            cx.strokeStyle = '#64748B';
            cx.beginPath(); cx.moveTo(midX - 80, midY); cx.lineTo(midX - 100, midY); cx.stroke();
            cx.beginPath(); cx.moveTo(midX + 80, midY); cx.lineTo(midX + 100, midY); cx.stroke();
          } else {
            // ═══ BJT ═══
            cx.fillStyle = '#94A3B8'; cx.fillRect(midX - 4, midY - 40, 8, 80);
            cx.strokeStyle = '#EF4444'; cx.lineWidth = 3;
            cx.beginPath(); cx.moveTo(midX + 4, midY + 10); cx.lineTo(midX + 50, midY + 40); cx.stroke();
            // Emitter arrow
            cx.beginPath(); cx.moveTo(midX + 40, midY + 35); cx.lineTo(midX + 50, midY + 40); cx.lineTo(midX + 42, midY + 30); cx.stroke();
            cx.strokeStyle = '#3B82F6';
            cx.beginPath(); cx.moveTo(midX + 4, midY - 10); cx.lineTo(midX + 50, midY - 40); cx.stroke();
            cx.strokeStyle = '#FBBF24';
            cx.beginPath(); cx.moveTo(midX - 4, midY); cx.lineTo(midX - 50, midY); cx.stroke();

            cx.fillStyle = '#FFF'; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
            cx.fillText('B', midX - 60, midY + 4);
            cx.fillText('C', midX + 60, midY - 40);
            cx.fillText('E', midX + 60, midY + 44);

            // Beta/gain for 9-12
            if (gradeBand === '9-12' && isOn) {
              cx.fillStyle = '#A78BFA'; cx.font = '12px sans-serif';
              cx.fillText('\u03B2 \u2248 100 (I\u1D9C = \u03B2\u00B7I\u1D47)', midX, midY + 65);
            }

            cx.fillStyle = isOn ? '#34D399' : '#F87171'; cx.font = 'bold 14px sans-serif';
            cx.fillText(isOn ? '\u2713 ON \u2014 I\u1D9C flows' : '\u2717 OFF \u2014 cutoff', midX, midY + 80);
            if (isOn) {
              var bft = (Date.now() % 800) / 800;
              cx.fillStyle = 'rgba(52, 211, 153, 0.7)';
              cx.beginPath(); cx.arc(midX + 4 + bft * 46, midY - 10 - bft * 30, 3, 0, Math.PI * 2); cx.fill();
            }

            cx.fillStyle = '#E2E8F0'; cx.font = '12px sans-serif'; cx.textAlign = 'left';
            cx.fillText('VBE = ' + Vg.toFixed(2) + 'V (qualitative onset near 0.6 V)', 10, H - 10);
          }
        };

        React.useEffect(function() {
          var canvas = document.getElementById('semi-transistor-canvas');
          if (!canvas) return;
          function draw() { if (!canvas.isConnected) { cancelAnimationFrame(animRef.current); return; } canvasRef(canvas); if (!d.motionPaused && !semiReducedMotion()) animRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animRef.current); };
        }, [tab, subtool, d.motionPaused, d.transistorType, d.gateVoltage, d.drainVoltage, d.showCMOS, d.deviceView]);

        return h('div', null,
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            pill('N-MOSFET', type === 'mosfet-n' && !showCMOS, function() { updMulti({ transistorType: 'mosfet-n', showCMOS: false, gateVoltage:0, drainVoltage:5 }); }),
            pill('P-MOSFET', type === 'mosfet-p' && !showCMOS, function() { updMulti({ transistorType: 'mosfet-p', showCMOS: false, gateVoltage:0, drainVoltage:-5 }); }),
            pill('NPN BJT', type === 'bjt-npn' && !showCMOS, function() { updMulti({ transistorType: 'bjt-npn', showCMOS: false, gateVoltage:.7 }); tryAwardXP('bjt', 10, 'Explored BJT'); }),
            pill('\u2699\uFE0F CMOS Inverter', showCMOS, function() { updMulti({ showCMOS: !showCMOS, transistorType:'mosfet-n', gateVoltage:0, drainVoltage:5 }); tryAwardXP('cmos', 15, 'Explored CMOS inverter'); })
          ),
          !showCMOS&&isMos&&h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Transistor view'},
            h('button',{type:'button','aria-pressed':d.deviceView!=='3d',onClick:function(){upd('deviceView','2d');}},'2D device diagram'),
            h('button',{type:'button','aria-pressed':d.deviceView==='3d',onClick:function(){upd('deviceView','3d');}},'3D device cutaway')),
          !showCMOS&&isMos&&d.deviceView==='3d'?h(SemiMOSInspector,{React:React,t:t,model:mos}):h('canvas', {
            id: 'semi-transistor-canvas', width: 440, height: showCMOS ? 200 : 220,
            className: 'block w-full max-w-5xl mx-auto rounded-lg bg-slate-950 border border-slate-500',
            role: 'img', 'aria-label': (showCMOS ? 'CMOS inverter' : type + ' transistor') + '. ' + transistorReadout
          }),
          sliderRow(showCMOS ? 'Input V' : isMos ? 'Gate VGS' : 'Base VBE', Vg, isP&&!showCMOS?-5:0, isP&&!showCMOS?0:!isMos?.9:5, !isMos?.01:.1, function(v) {
            upd('gateVoltage', v);
            if (isOn) tryAwardXP('trans-on', 10, 'Turned transistor ON');
          }, ' V'),
          !showCMOS && isMos && sliderRow('Drain VDS', Vd, isP?-10:0, isP?0:10, 0.5, function(v) { upd('drainVoltage', v); }, ' V'),
          // Current bar
          h('div', { className: 'mt-2 flex items-center gap-2' },
            h('span', { className: 'text-xs text-slate-400 w-20' }, showCMOS ? 'Output' : isMos?'Current':'Drive (illustrative)'),
            h('div', { className: 'flex-1 h-3 bg-slate-800 rounded-full overflow-hidden' },
              h('div', { className: 'h-full rounded-full transition-all duration-300 ' + (showCMOS ? (cmosOut ? 'bg-emerald-500' : 'bg-red-500') : isOn ? 'bg-emerald-500' : 'bg-slate-700'),
                style: { width: (showCMOS ? (cmosTransition ? 50 : cmosOut ? 100 : 0) : currentPct) + '%' }
              })
            ),
            h('span', { className: 'text-xs font-mono shrink-0 text-right ' + (isOn || cmosOut ? 'text-emerald-400' : 'text-slate-200') },
              showCMOS ? cmosText : isMos?((mos.currentA||0)*1000).toFixed(3)+' mA':Math.round(currentPct)+'%'
            )
          ),
          h('div',{className:'semi-study'},
            h('h4',{role:'status'},transistorReadout),
            h('p',null,showCMOS
              ? 'Use input 0 V and 5 V for logic states. Between 1.5 V and 3.5 V both devices can conduct; the output is in transition. This digital illustration does not solve an analog transfer curve.'
              : isMos ? (isP?'PMOS uses negative VGS and VDS with its source at 0 V. ':'NMOS uses positive VGS and VDS with its source at 0 V. ')+(mos.channel&&Vd===0?'A channel alone does not make current: a drain-to-source voltage is also needed. ':'Gate voltage controls channel formation; drain voltage drives transport.')
              : 'Use the base-emitter voltage control to explore the onset of conduction. This BJT view is qualitative, not a prediction of collector current.'),
            !showCMOS&&isMos&&h('div',{className:'semi-inspector-controls',role:'group','aria-label':'MOSFET experiment presets'},
              h('button',{type:'button',onClick:function(){updMulti({gateVoltage:0,drainVoltage:isP?-5:5});}},'Cutoff'),
              h('button',{type:'button',onClick:function(){updMulti({gateVoltage:isP?-3:3,drainVoltage:0});}},'Channel, zero current'),
              h('button',{type:'button',onClick:function(){updMulti({gateVoltage:isP?-3:3,drainVoltage:isP?-.5:.5});}},'Linear region'),
              h('button',{type:'button',onClick:function(){updMulti({gateVoltage:isP?-3:3,drainVoltage:isP?-3:3});}},'Saturation region')),
            h('details',null,h('summary',null,t('stem.semiconductor.model_assumptions','Model assumptions & sources')),
              h('p',null,showCMOS?'Ideal complementary switches at 5 V. Both-on transition current is schematic; leakage, capacitance and switching energy are not calculated.'
                : isMos?'Long-channel square-law model with |Vth| = 1.5 V; beta = 1 mA/V² for NMOS and 0.5 mA/V² for PMOS. With positive magnitudes: linear when VDS < VGS − Vth; saturation when VDS ≥ VGS − Vth. Drain current is signed positive from drain to source; carrier arrows show source-to-drain motion. Body is tied to source. Subthreshold current, body effect, channel-length modulation and breakdown are omitted. In saturation current continues after pinch-off.':'NPN onset is illustrated near 0.6 V. Actual current and operating region require the external bias circuit.'),
              h('a',{href:'https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c3/c3s1/',target:'_blank',rel:'noopener noreferrer'},'MIT: MOSFET behavior'))),
          h('div', { className: 'flex gap-2 mt-2' },
            btn('\uD83E\uDD16 AI Explain', function() { askAI(showCMOS ? 'CMOS inverter operation' : type + ' transistor'); }, 'transition-colors bg-indigo-600 text-white hover:bg-indigo-700'),
            btn('\uD83D\uDD0A Read', function(){speakText(transistorReadout);}, 'transition-colors bg-slate-600 text-slate-200 hover:bg-slate-700')
          ),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // LOGIC GATES — truth tables, NAND constructions, CMOS paths and half adder
      // ════════════════════════════════════════════
      function renderLogicGates() {
        var model=semiLogicExperiment(d),gate=model.logic,gateType=gate.type,inA=gate.a,inB=gate.b,output=model.q;
        var description=model.half?'Half adder: A='+ (+inA)+' B='+ (+inB)+' Sum='+ (+output)+' Carry='+ (+model.carry)+'. Binary result '+(+model.carry)+(+output)+'.':gateType+' gate: A='+ (+inA)+(gate.inputs===2?' B='+ (+inB):'')+' Q='+ (+output)+'. '+gate.definition.desc;
        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var surface = prepareCanvas(canvasEl, 440, 180);
          var cx = surface.cx, W = surface.W, H = surface.H;
          cx.clearRect(0, 0, W, H);
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);


          if(model.half){
            function wire(points,color){cx.strokeStyle=color;cx.lineWidth=2;cx.beginPath();points.forEach(function(p,i){if(i)cx.lineTo(p[0],p[1]);else cx.moveTo(p[0],p[1]);});cx.stroke();}
            var ac=inA?'#34D399':'#94A3B8',bc=inB?'#34D399':'#94A3B8';
            wire([[30,45],[175,45]],ac);wire([[90,45],[90,110],[175,110]],ac);
            wire([[30,135],[175,135]],bc);wire([[120,135],[120,116]],bc);
            cx.strokeStyle=bc;cx.beginPath();cx.arc(120,110,6,Math.PI/2,-Math.PI/2,true);cx.stroke();
            wire([[120,104],[120,70],[175,70]],bc);
            [[90,45,ac],[120,135,bc]].forEach(function(p){cx.fillStyle=p[2];cx.beginPath();cx.arc(p[0],p[1],3,0,Math.PI*2);cx.fill();});
            [['XOR',28,output,'Sum'],['AND',98,model.carry,'Carry']].forEach(function(g){
              cx.fillStyle='#1E293B';cx.strokeStyle='#818CF8';cx.lineWidth=2;cx.fillRect(175,g[1],85,60);cx.strokeRect(175,g[1],85,60);
              cx.fillStyle='#F8FAFC';cx.font='bold 13px sans-serif';cx.textAlign='center';cx.fillText(g[0],217,g[1]+35);
              wire([[260,g[1]+30],[325,g[1]+30]],g[2]?'#34D399':'#94A3B8');
              cx.fillStyle='#F8FAFC';cx.fillText(g[3]+' = '+(+g[2]),370,g[1]+34);
            });
            cx.textAlign='left';cx.font='bold 12px sans-serif';cx.fillStyle='#E2E8F0';cx.fillText('A = '+(+inA),10,27);cx.fillText('B = '+(+inB),10,123);
            cx.font='11px sans-serif';cx.fillText('Dots join wires · crossing bridge keeps signals separate',10,175);
            return;
          }

          var midX = W / 2, midY = H / 2;
          var gateW = 80, gateH = 60;

          // Input wires with signal propagation glow
          cx.lineWidth = 3;
          cx.strokeStyle = inA ? '#34D399' : '#94A3B8';
          if (inA) { cx.shadowColor = '#34D399'; cx.shadowBlur = 6; }
          cx.beginPath();
          cx.moveTo(30, gate.inputs === 1 ? midY : midY - 15);
          cx.lineTo(midX - gateW / 2, gate.inputs === 1 ? midY : midY - 15);
          cx.stroke(); cx.shadowBlur = 0;

          cx.fillStyle = inA ? '#34D399' : '#94A3B8';
          cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
          cx.fillText('A=' + (inA ? '1' : '0'), 18, (gate.inputs === 1 ? midY : midY - 15) - 10);

          if (gate.inputs === 2) {
            cx.strokeStyle = inB ? '#34D399' : '#94A3B8';
            if (inB) { cx.shadowColor = '#34D399'; cx.shadowBlur = 6; }
            cx.beginPath(); cx.moveTo(30, midY + 15); cx.lineTo(midX - gateW / 2, midY + 15); cx.stroke();
            cx.shadowBlur = 0;
            cx.fillStyle = inB ? '#34D399' : '#94A3B8';
            cx.fillText('B=' + (inB ? '1' : '0'), 18, midY + 15 - 10);
          }

          // Gate body
          cx.fillStyle = '#1E293B'; cx.strokeStyle = '#818CF8'; cx.lineWidth = 2;
          if (gateType === 'NOT') {
            cx.beginPath(); cx.moveTo(midX - gateW / 2, midY - gateH / 2); cx.lineTo(midX + gateW / 2 - 8, midY); cx.lineTo(midX - gateW / 2, midY + gateH / 2); cx.closePath(); cx.fill(); cx.stroke();
            cx.beginPath(); cx.arc(midX + gateW / 2 - 2, midY, 6, 0, Math.PI * 2); cx.fillStyle = output ? '#34D399' : '#1E293B'; cx.fill(); cx.stroke();
          } else if (gateType === 'AND' || gateType === 'NAND') {
            cx.beginPath(); cx.moveTo(midX - gateW / 2, midY - gateH / 2); cx.lineTo(midX, midY - gateH / 2); cx.arc(midX, midY, gateH / 2, -Math.PI / 2, Math.PI / 2); cx.lineTo(midX - gateW / 2, midY + gateH / 2); cx.closePath(); cx.fill(); cx.stroke();
            if (gateType === 'NAND') { cx.beginPath(); cx.arc(midX + gateH / 2 + 6, midY, 6, 0, Math.PI * 2); cx.fillStyle = output ? '#34D399' : '#1E293B'; cx.fill(); cx.stroke(); }
          } else if (gateType === 'OR' || gateType === 'NOR') {
            cx.beginPath(); cx.moveTo(midX - gateW / 2, midY - gateH / 2); cx.quadraticCurveTo(midX + 10, midY - gateH / 2, midX + gateW / 2, midY); cx.quadraticCurveTo(midX + 10, midY + gateH / 2, midX - gateW / 2, midY + gateH / 2); cx.quadraticCurveTo(midX - gateW / 4, midY, midX - gateW / 2, midY - gateH / 2); cx.fill(); cx.stroke();
            if (gateType === 'NOR') { cx.beginPath(); cx.arc(midX + gateW / 2 + 6, midY, 6, 0, Math.PI * 2); cx.fillStyle = output ? '#34D399' : '#1E293B'; cx.fill(); cx.stroke(); }
          } else {
            cx.beginPath(); cx.moveTo(midX - gateW / 2, midY - gateH / 2); cx.quadraticCurveTo(midX + 10, midY - gateH / 2, midX + gateW / 2, midY); cx.quadraticCurveTo(midX + 10, midY + gateH / 2, midX - gateW / 2, midY + gateH / 2); cx.quadraticCurveTo(midX - gateW / 4, midY, midX - gateW / 2, midY - gateH / 2); cx.fill(); cx.stroke();
            cx.beginPath(); cx.strokeStyle = '#818CF8'; cx.moveTo(midX - gateW / 2 - 8, midY - gateH / 2); cx.quadraticCurveTo(midX - gateW / 4 - 8, midY, midX - gateW / 2 - 8, midY + gateH / 2); cx.stroke();
            if (gateType === 'XNOR') { cx.beginPath(); cx.arc(midX + gateW / 2 + 6, midY, 6, 0, Math.PI * 2); cx.fillStyle = output ? '#34D399' : '#1E293B'; cx.fill(); cx.strokeStyle = '#818CF8'; cx.stroke(); }
          }

          // Gate label
          cx.fillStyle = '#E2E8F0'; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
          cx.fillText(gateType, gateType === 'NOT' ? midX - 12 : midX - 5, midY + 4);

          // Output wire with glow
          var outStartX = gateType==='NOT'?midX+gateW/2+4:gateType==='NAND'?midX+gateH/2+12:gateType==='AND'?midX+gateH/2:midX+gateW/2+(['NOR','XNOR'].indexOf(gateType)>=0?12:0);
          cx.strokeStyle = output ? '#34D399' : '#94A3B8'; cx.lineWidth = 3;
          if (output) { cx.shadowColor = '#34D399'; cx.shadowBlur = 6; }
          cx.beginPath(); cx.moveTo(outStartX, midY); cx.lineTo(W - 30, midY); cx.stroke();
          cx.shadowBlur = 0;

          // Output LED
          cx.fillStyle = output ? '#34D399' : '#EF4444';
          cx.shadowColor = output ? '#34D399' : '#EF4444'; cx.shadowBlur = 10;
          cx.beginPath(); cx.arc(W - 18, midY, 10, 0, Math.PI * 2); cx.fill();
          cx.shadowBlur = 0;
          cx.fillStyle = '#FFF'; cx.font = 'bold 12px sans-serif'; cx.fillText(output ? '1' : '0', W - 18, midY + 4);
          cx.fillStyle = output ? '#34D399' : '#F87171'; cx.font = 'bold 12px sans-serif';
          cx.fillText('Q=' + (output ? '1' : '0'), W - 18, midY - 16);

          // Transistor count label
          cx.fillStyle = '#94A3B8'; cx.font = '11px sans-serif'; cx.textAlign = 'left';
          cx.fillText('Ideal steady logic · no timing simulation', 10, H - 5);
        };

        React.useEffect(function() {
          var canvas = document.getElementById('semi-gates-canvas');
          if (!canvas) return;
          return bindStaticCanvas(canvas, canvasRef);
        }, [tab, subtool, d.motionPaused, d.gateType, d.inputA, d.inputB, d.gateExperiment]);


        function selectInputs(a,b){updMulti({inputA:a,inputB:b});}
        function recordRow(){
          var all=Object.assign({},d.gateRecorded||{});all[model.id]=model.recorded.indexOf(model.key)>=0?model.recorded:model.recorded.concat([model.key]);upd('gateRecorded',all);
        }
        var cmos=semiCMOS(gateType,inA,inB),trace=semiNandTrace(gateType,inA,inB);
        function switchDrawing(){
          if(!cmos)return null;
          var shapes=[],line=function(x1,y1,x2,y2,color,key){shapes.push(h('line',{key:key,x1:x1,y1:y1,x2:x2,y2:y2,stroke:color||'#94A3B8',strokeWidth:2}));};
          function label(x,y,text,key,color){shapes.push(h('text',{key:key,x:x,y:y,fill:color||'#E2E8F0',fontSize:12,textAnchor:'middle'},text));}
          function network(branches,y1,y2,prefix){
            branches.forEach(function(branch,i){
              var x=branches.length===1?210:125+i*170,conducting=branch.every(function(sw){return sw.on;}),color=conducting?'#34D399':'#94A3B8';
              line(210,y1,x,y1,color,prefix+i+'top');line(x,y2,210,y2,color,prefix+i+'bottom');
              var cursor=y1;
              branch.forEach(function(sw,j){
                var cy=y1+(j+1)*(y2-y1)/(branch.length+1),key=prefix+i+j;
                line(x,cursor,x,cy-10,color,key+'wire');
                line(x,cy-10,sw.on?x:x+14,cy+10,sw.on?'#34D399':'#FBBF24',key+'switch');
                shapes.push(h('circle',{key:key+'dot1',cx:x,cy:cy-10,r:3,fill:'#CBD5E1'}),h('circle',{key:key+'dot2',cx:x,cy:cy+10,r:3,fill:'#CBD5E1'}));
                label(x+58,cy+4,sw.name+': '+(sw.on?'closed':'open'),key+'label');cursor=cy+10;
              });
              line(x,cursor,x,y2,color,prefix+i+'end');
            });
          }
          label(210,18,'VDD · logic 1','vdd');label(210,302,'GND · logic 0','ground');
          network(cmos.up,30,150,'p');network(cmos.down,150,285,'n');
          line(210,150,365,150,output?'#34D399':'#CBD5E1','out');
          shapes.push(h('circle',{key:'node',cx:210,cy:150,r:4,fill:'#F8FAFC'}));
          label(385,154,'Q = '+(+output),'q');label(45,70,'PMOS','p-name');label(45,220,'NMOS','n-name');
          return h('svg',{viewBox:'0 0 440 315',style:{width:'100%',maxWidth:'620px',display:'block',margin:'0 auto'},role: 'img','aria-label':gateType+' CMOS switches. Pull-up '+(cmos.pullup?'conducts':'is open')+'. Pull-down '+(cmos.pulldown?'conducts':'is open')+'. Output '+(+output)+'.'},shapes);
        }
        return h('div',null,
          h('section',{className:'semi-study'},h('p',null,'INPUTS → RULE → RESULT'),h('h4',null,'Build an explanation one input row at a time'),
            h('p',null,'Choose a rule, predict its result, then change the inputs. Record each row you inspect and connect the truth table to a circuit implementation.')),
          h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Logic experiment'},
            pill('Single gate',!model.half,function(){upd('gateExperiment','single');}),
            pill('Half adder',model.half,function(){upd('gateExperiment','halfadder');})),
          !model.half&&h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Logic gate'},
            Object.keys(SEMI_GATES).map(function(key){return pill(key,gateType===key,function(){upd('gateType',key);},'gate-'+key);})),
          h('canvas',{id:'semi-gates-canvas',width:440,height:180,
            className:'block w-full max-w-5xl mx-auto rounded-lg bg-slate-950 border border-slate-500',
            role: 'img','aria-label':description}),
          h('section',{className:'semi-study'},
            h('h4',null,model.half?'Add two one-bit numbers':gate.definition.formula),
            h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Logic inputs'},
              h('button',{type:'button','aria-pressed':inA,onClick:function(){selectInputs(!inA,inB);}},'A = '+(+inA)),
              model.inputs===2&&h('button',{type:'button','aria-pressed':inB,onClick:function(){selectInputs(inA,!inB);}},'B = '+(+inB))),
            h('p',{role:'status'},model.half?'Sum = '+(+output)+' · Carry = '+(+model.carry)+' · Binary result = '+(+model.carry)+(+output)+'₂':'Output Q = '+(+output)+' · '+gate.definition.desc),
            model.half&&h('p',null,(+inA)+' + '+(+inB)+' = '+model.total+' in decimal. Sum = A XOR B; Carry = A AND B. A half adder has no carry-in input.'),
            h('p',{className:'semi-model-note'},'0 and 1 are ideal logic levels. This lesson does not calculate voltage thresholds, propagation delay, switching glitches or power.')
          ),
          h('section',{className:'semi-study'},
            h('h4',null,'Explore the complete truth table'),
            h('p',null,'Use a row to apply its inputs. Recording is an observation checklist, not a mastery score.'),
            h('table',null,h('caption',null,(model.half?'Half adder':gateType)+' input/output table'),
              h('thead',null,h('tr',null,h('th',{scope:'col'},'A'),model.inputs===2&&h('th',{scope:'col'},'B'),h('th',{scope:'col'},model.half?'Sum':'Q'),model.half&&h('th',{scope:'col'},'Carry'),h('th',{scope:'col'},'Explore'))),
              h('tbody',null,model.rows.map(function(row){var active=row.key===model.key,seen=model.recorded.indexOf(row.key)>=0;return h('tr',{key:row.key,style:active?{background:'rgba(8,145,178,.16)'}:{}},
                h('td',null,+row.a),model.inputs===2&&h('td',null,+row.b),h('td',null,+row.q),model.half&&h('td',null,+row.carry),
                h('td',null,h('button',{type:'button','aria-label':'Use inputs '+row.key,'aria-pressed':active,onClick:function(){selectInputs(row.a,row.b);},style:{minHeight:'44px',padding:'6px 10px',border:'1px solid #64748b',borderRadius:'8px'}},active?'Current':'Use row'),seen&&h('span',{style:{display:'block',fontSize:'12px'}},'Recorded')));}))
            ),
            h('div',{className:'semi-inspector-controls'},
              h('button',{type:'button',disabled:model.recorded.indexOf(model.key)>=0,onClick:recordRow},'Record current row'),
              btn('Clear this checklist',function(){var all=Object.assign({},d.gateRecorded||{});all[model.id]=[];upd('gateRecorded',all);})),
            h('p',{role:'status'},'Recorded '+model.recorded.length+' / '+model.rows.length+' input rows'+(model.recorded.length===model.rows.length?' · all cases inspected.':'.'))
          ),
          !model.half&&h('details',{className:'semi-study'},h('summary',null,'Build this function using only NAND gates'),
            h('p',null,'Each line below is a two-input NAND. Intermediate results update with A and B. Tying both inputs together makes an inverter.'),
            h('ol',null,trace.nodes.map(function(node){return h('li',{key:node.name},node.name+' = NAND('+node.left+', '+node.right+') = NAND('+ (+node.a)+', '+(+node.b)+') = '+(+node.q));})),
            h('p',{role:'status'},'Final '+trace.outputNode+' = '+(+trace.output)+' · matches '+gateType+' output Q = '+(+output)+'.'),
            h('p',null,'This construction uses '+trace.nodes.length+' NAND gate'+(trace.nodes.length===1?'':'s')+'. It demonstrates equivalence; it is not a minimum-area or minimum-delay implementation.')),
          !model.half&&h('details',{className:'semi-study'},h('summary',null,'Inspect the CMOS implementation'),
            cmos?switchDrawing():h('p',null,gateType==='AND'?'A conventional static CMOS AND uses a four-transistor NAND followed by a two-transistor inverter.':
              gateType==='OR'?'A conventional static CMOS OR uses a four-transistor NOR followed by a two-transistor inverter.':'XOR and XNOR have several transistor implementations. Their counts depend on topology and whether complementary inputs are already available. Inspect the NAND construction above for one explicit gate-level implementation.'),
            cmos&&h('p',null,'Pull-up to VDD: '+(cmos.pullup?'conducting':'open')+' · Pull-down to GND: '+(cmos.pulldown?'conducting':'open')+'.'),
            cmos&&h('p',null,'PMOS closes for an input of 0; NMOS closes for 1. Series paths require every switch to close. Parallel paths require at least one complete branch.'),
            gate.definition.count!=null&&h('p',null,'Example static CMOS implementation: '+gate.definition.count+' transistors.'),
            h('p',null,'A conducting path connects the output to a supply rail. It does not imply continuous current through an ideal, unloaded gate at a stable input. Switching and leakage require a richer electrical model.'),
            !cmos&&h('div',{className:'semi-inspector-controls'},btn('Inspect NAND switches',function(){upd('gateType','NAND');}),btn('Inspect NOR switches',function(){upd('gateType','NOR');}))),
          model.half&&h('section',{className:'semi-study'},h('h4',null,'Why 1 + 1 needs two output bits'),
            h('p',null,'XOR gives a sum bit of 0 when both inputs are 1. AND supplies the carry bit of 1, giving 10₂ = 2. A full adder adds a third input for an incoming carry.')),
          h('details',{className:'semi-study'},h('summary',null,'Model assumptions & sources'),
            h('p',null,'Ideal combinational Boolean logic with settled inputs. NAND traces are explicit constructions, not transistor timing simulations. Switch drawings show connectivity rather than device geometry.'),
            h('p',null,h('a',{href:'https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c3/c3s1/',target:'_blank',rel:'noopener noreferrer'},'MIT · CMOS gates and complementary paths')),
            h('p',null,h('a',{href:'https://www.nand2tetris.org/project02',target:'_blank',rel:'noopener noreferrer'},'Nand to Tetris · Boolean arithmetic'))),
          h('div',{className:'semi-inspector-controls'},btn('Read logic results',function(){speakText(description);}),btn('Connect to Transistor',function(){updMulti({subtool:'transistor',transistorType:'mosfet-n',showCMOS:true,gateVoltage:inA?5:0,guidedSetupSubtool:null});})),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // I-V CURVE PLOTTER (new sub-tool)
      // ════════════════════════════════════════════
      function renderIVCurve() {
        var device = d.ivDevice || 'diode';
        var sweepV = semiNumber(d.ivSweepV,0,-6,5);
        var showIdeal = d.ivShowIdeal !== false;
        var ivTemp = semiNumber(d.ivTemp,300,200,400);
        var Vt = 8.617e-5 * ivTemp; // thermal voltage kT/q

        function calcCurrent(V) { return semiIV(device,V,ivTemp); }

        // Sweep range. This was -3..+5 V while the Zener's breakdown sits at -5.1 V,
        // so selecting "zener" could never reach breakdown -- the one behaviour the
        // device exists for. -6 V brings the knee into view and costs the other
        // devices nothing (a resistor just reads -6 mA, a diode sits at -I_s).
        var IV_V_MIN = -6, IV_V_MAX = 5;

        var currentI = calcCurrent(sweepV);

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var surface = prepareCanvas(canvasEl, 440, 260);
          var cx = surface.cx, W = surface.W, H = surface.H;
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          // Zener breakdown current runs to about -25 mA in this model, so it needs
          // room below the axis; the other devices are dominated by their forward
          // quadrant and keep the low origin.
          var originY = H * (device === 'zener' ? 0.42 : 0.65);
          var scaleX = (W - 40) / (IV_V_MAX - IV_V_MIN);
          // Derive the origin from the range instead of pinning it at 35% of the
          // width. With the sweep widened to -6 V a fixed origin pushed everything
          // left of about -3.7 V off the canvas, which is exactly where the Zener
          // knee lives — it was being drawn outside the visible area.
          var originX = 20 + (0 - IV_V_MIN) * scaleX;

          // Vertical scale. calcCurrent returns AMPS, and this used to be
          //     scaleY = H * 0.5 / 0.05      then      py = originY - i * scaleY * 1000
          // The scale maps amps to pixels already (0.05 A across half the height), so
          // the extra x1000 made the axis a thousand times too sensitive: full scale
          // came out around 46 microamps, every real forward current slammed into the
          // ceiling, and the clamp below drew it as a flat line along the top edge.
          // That reads as current saturating, which is a JFET, not a diode.
          //
          // Now an explicit full-scale in mA per device, so the axis can be labelled
          // and the numbers mean something.
          var fullScaleMa = device === 'resistor' ? 6 : 20;
          var plotTop = 12;
          var scaleY = (originY - plotTop) / fullScaleMa;   // px per mA

          // Grid
          cx.strokeStyle = '#64748B'; cx.lineWidth = 1;
          for (var gv = IV_V_MIN; gv <= IV_V_MAX; gv++) {
            var gx = originX + gv * scaleX;
            cx.beginPath(); cx.moveTo(gx, 10); cx.lineTo(gx, H - 10); cx.stroke();
            cx.fillStyle = '#94A3B8'; cx.font = '10px sans-serif'; cx.textAlign = 'center';
            cx.fillText(gv + 'V', gx, H - 3);
          }

          // Current ticks. The y axis was previously labelled "I (mA)" with no scale
          // at all, so no value could be read off the graph.
          cx.textAlign = 'right';
          for (var ti = 1; ti <= 4; ti++) {
            var ma = fullScaleMa * ti / 4;
            var ty = originY - ma * scaleY;
            cx.strokeStyle = '#64748B';
            cx.beginPath(); cx.moveTo(originX - 3, ty); cx.lineTo(W - 5, ty); cx.stroke();
            cx.fillStyle = '#94A3B8'; cx.font = '10px sans-serif';
            cx.fillText(ma.toFixed(0), originX - 5, ty + 3);
          }
          // One negative tick so reverse/breakdown current is readable too.
          var negMa = -fullScaleMa / 4;
          var negY = originY - negMa * scaleY;
          if (negY < H - 16) {
            cx.strokeStyle = '#64748B';
            cx.beginPath(); cx.moveTo(originX - 3, negY); cx.lineTo(W - 5, negY); cx.stroke();
            cx.fillStyle = '#94A3B8'; cx.fillText(negMa.toFixed(0), originX - 5, negY + 3);
          }

          // Axes
          cx.strokeStyle = '#64748B'; cx.lineWidth = 1.5;
          cx.beginPath(); cx.moveTo(15, originY); cx.lineTo(W - 5, originY); cx.stroke(); // V axis
          cx.beginPath(); cx.moveTo(originX, 5); cx.lineTo(originX, H - 15); cx.stroke(); // I axis
          cx.fillStyle = '#94A3B8'; cx.font = '12px sans-serif'; cx.textAlign = 'center';
          cx.fillText('V (Volts)', W / 2, H - 12);
          cx.save(); cx.translate(8, H / 2); cx.rotate(-Math.PI / 2);
          cx.fillText('I (mA)', 0, 0); cx.restore();

          // I-V curve
          cx.strokeStyle = '#22D3EE'; cx.lineWidth = 2; cx.beginPath();
          // Lift the pen when the trace leaves the plot instead of clamping it to the
          // border. Clamping drew a hard flat line along the top, which looks like the
          // current levelling off rather than running off the top of the scale.
          var penDown = false;
          for (var v = IV_V_MIN; v <= IV_V_MAX; v += 0.05) {
            var iMa = calcCurrent(v) * 1000;
            var px = originX + v * scaleX;
            var py = originY - iMa * scaleY;
            if (py < plotTop || py > H - 15) { penDown = false; continue; }
            if (!penDown) { cx.moveTo(px, py); penDown = true; } else cx.lineTo(px, py);
          }
          cx.stroke();

          // Ideal reference (Ohm's law line)
          if (showIdeal && device !== 'resistor') {
            cx.strokeStyle = '#94A3B8'; cx.lineWidth = 1; cx.setLineDash([4, 4]);
            cx.beginPath();
            cx.moveTo(originX + IV_V_MIN * scaleX, originY - IV_V_MIN * scaleY);
            cx.lineTo(originX + IV_V_MAX * scaleX, originY - IV_V_MAX * scaleY);
            cx.stroke(); cx.setLineDash([]);
            cx.fillStyle = '#94A3B8'; cx.font = '10px sans-serif'; cx.textAlign = 'right';
            cx.fillText('1 kΩ ref.', W - 10, originY - 5);
          }

          // Current sweep marker
          var markerX = originX + sweepV * scaleX;
          var markerI = calcCurrent(sweepV);
          // scaleY is px per mA now, so convert once here — same units bug as the
          // trace above, which had the marker drifting off the curve it marks.
          var markerY = originY - markerI * 1000 * scaleY;
          var markerOffScale=markerY<plotTop||markerY>H-15;
          var aboveScale=markerY<plotTop;
          markerY = Math.max(plotTop, Math.min(H - 15, markerY));
          cx.fillStyle = '#F59E0B';
          cx.shadowColor = '#F59E0B'; cx.shadowBlur = 8;
          cx.beginPath();
          if(markerOffScale){var direction=aboveScale?1:-1;cx.moveTo(markerX,markerY);cx.lineTo(markerX-5,markerY+direction*9);cx.lineTo(markerX+5,markerY+direction*9);cx.closePath();}else cx.arc(markerX, markerY, 5, 0, Math.PI * 2);
          cx.fill();
          cx.shadowBlur = 0;

          // Crosshairs
          cx.strokeStyle = 'rgba(245, 158, 11, 0.3)'; cx.lineWidth = 1; cx.setLineDash([3, 3]);
          cx.beginPath(); cx.moveTo(markerX, originY); cx.lineTo(markerX, markerY); cx.stroke();
          cx.beginPath(); cx.moveTo(originX, markerY); cx.lineTo(markerX, markerY); cx.stroke();
          cx.setLineDash([]);

          // Readout
          cx.fillStyle = '#FCD34D'; cx.font = 'bold 13px sans-serif'; cx.textAlign = 'left';
          var iDisplay = Math.abs(currentI) < 0.001 ? (currentI * 1e6).toFixed(1) + ' \u03BCA' : (currentI * 1000).toFixed(2) + ' mA';
          var labelX=markerX>W-145?markerX-8:markerX+8,labelY=Math.max(58,Math.min(H-38,markerY));
          cx.textAlign=markerX>W-145?'right':'left';
          cx.fillText('V = ' + sweepV.toFixed(2) + 'V', labelX, labelY - 8);
          cx.fillText('I = ' + iDisplay + (markerOffScale?' (off scale)':''), labelX, labelY + 8);

          // Device icon
          cx.fillStyle = '#94A3B8'; cx.font = '12px sans-serif'; cx.textAlign = 'right';
          cx.fillText(device.charAt(0).toUpperCase() + device.slice(1) + ' @ ' + ivTemp + 'K', W - 10, 15);

          // LED glow for LED device
          if (device === 'led' && currentI > 1e-6) {
            var ledGlow = Math.min(1, Math.sqrt(currentI/.02));
            cx.beginPath(); cx.arc(W - 25, 30, 8, 0, Math.PI * 2);
            cx.fillStyle = 'rgba(251, 191, 36, ' + ledGlow.toFixed(2) + ')';
            cx.shadowColor = '#FBBF24'; cx.shadowBlur = 15 * ledGlow; cx.fill(); cx.shadowBlur = 0;
          }
        };

        React.useEffect(function() {
          var canvas = document.getElementById('semi-iv-canvas');
          if (!canvas) return;
          return bindStaticCanvas(canvas, canvasRef);
        }, [tab, subtool, d.motionPaused, d.ivDevice, d.ivSweepV, d.ivShowIdeal, d.ivTemp]);

        var iDisplay = Math.abs(currentI) < 0.001 ? (currentI * 1e6).toFixed(1) + ' \u03BCA' : (currentI * 1000).toFixed(2) + ' mA';

        return h('div', null,
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            pill('Diode', device === 'diode', function() { upd('ivDevice', 'diode'); tryAwardXP('iv-diode', 8, 'Explored diode I-V'); }),
            pill('Zener', device === 'zener', function() { upd('ivDevice', 'zener'); tryAwardXP('iv-zener', 10, 'Explored Zener I-V'); }),
            pill('LED', device === 'led', function() { upd('ivDevice', 'led'); tryAwardXP('iv-led', 10, 'Explored LED I-V'); }),
            pill('Resistor', device === 'resistor', function() { upd('ivDevice', 'resistor'); tryAwardXP('iv-resistor', 5, 'Explored resistor I-V'); })
          ),
          h('canvas', { 
            id: 'semi-iv-canvas', width: 440, height: 260,
            className: 'block w-full max-w-5xl mx-auto rounded-lg bg-slate-950 border border-slate-500',
            role: 'img', 'aria-label': 'I-V curve for ' + device + ' at V=' + sweepV.toFixed(2) + 'V, I=' + iDisplay
          }),
          sliderRow('Sweep V', sweepV, IV_V_MIN, IV_V_MAX, 0.05, function(v) { upd('ivSweepV', v); }, ' V'),
          sliderRow('Temp', ivTemp, 200, 500, 10, function(v) { upd('ivTemp', v); }, ' K'),
          h('div', { className: 'flex items-center gap-3 mt-2' },
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showIdeal, onChange: function() { upd('ivShowIdeal', !showIdeal); }, className: 'accent-slate-400' }), t('stem.semiconductor.ohm_reference', 'Ohm Reference')),
            btn('\uD83E\uDD16 AI Explain', function() { askAI('I-V characteristic curve of a ' + device); }, 'transition-colors bg-indigo-600 text-white hover:bg-indigo-700')
          ),
          // Stats
          h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
            statBadge('Voltage', sweepV.toFixed(2) + ' V'),
            statBadge('Current', iDisplay),
            statBadge('Power', (Math.abs(sweepV * currentI) * 1000).toFixed(2) + ' mW'),
            device === 'resistor' && statBadge('R', '1 k\u03A9')
          ),
          h('div',{className:'semi-study'},h('h4',null,'Read the curve and its limits'),
            h('p',null,'The dashed comparison is a 1 kΩ resistor. A triangular marker means the current is beyond the vertical plot range; the numeric readout still reports the value.'),
            h('p',null,'Diode and LED curves solve the exponential junction relation together with an illustrative series resistance (10 Ω for silicon, 20 Ω for LED). Temperature changes both thermal voltage and saturation current. The Zener uses a fixed 5.1 V reverse knee with 20 Ω slope resistance. These are teaching presets, not device ratings. Reverse breakdown of the ordinary diode and LED is not modeled.')),
          infoBox(gradeText(
            device === 'diode' ? 'A diode is like a one-way door for electricity!' : device === 'led' ? 'An LED makes light when electricity goes through it the right way!' : device === 'zener' ? 'A Zener diode lets electricity go backwards at a certain voltage!' : 'A resistor slows down electricity evenly in both directions.',
            device === 'diode' ? 'Diodes only conduct in one direction. Forward current grows continuously with voltage. Reverse: almost no current.' : device === 'led' ? 'LEDs emit light under forward current. Their voltage depends on current, material and temperature.' : device === 'zener' ? 'Zener diodes break down at a specific reverse voltage (5.1V here). Used for voltage regulation.' : 'Resistors follow Ohm\'s Law: V = IR. Linear I-V curve.',
            device === 'diode' ? 'Shockley equation: I = I\u2080(e^(V/nV\u209C) \u2212 1). V\u209C = kT/q = ' + (Vt * 1000).toFixed(1) + 'mV at ' + ivTemp + 'K. n \u2248 1-2 (ideality factor).' : device === 'led' ? 'LED: E_g determines color (\u03BB = hc/E_g). Red ~1.8eV, Blue ~2.8eV, UV ~3.4eV. Current varies continuously; series resistance limits its rise.' : device === 'zener' ? 'Low-voltage Zener breakdown: quantum tunneling. Avalanche breakdown: impact ionization. V\u2093 has negative temp coefficient for Zener, positive for avalanche.' : 'Ohm\'s law: V = IR. R = \u03C1L/A where \u03C1 is resistivity. Power: P = IV = I\u00B2R = V\u00B2/R.',
            device === 'diode' ? 'Shockley: I = I\u2080(e^(qV/nkT) \u2212 1). I\u2080 = qAn\u1D62\u00B2(D\u2099/L\u2099N\u2090 + D\u209A/L\u209AN\u2093). At ' + ivTemp + 'K: V\u209C = ' + (Vt * 1000).toFixed(2) + 'mV. Small-signal: r\u2093 = nV\u209C/I\u2093, C\u2093 = \u03C4\u2093\u00B7g\u2093.' : device === 'led' ? 'LED internal quantum efficiency \u03B7\u1D62 = B\u00B7n/(A + B\u00B7n + C\u00B7n\u00B2). Wall-plug efficiency = P\u2092\u209A\u209C/P\u2091\u2097\u2091\u209C. Spectral emission: \u0394\u03BB \u2248 1.8kT\u03BB\u00B2/hc.' : device === 'zener' ? 'Zener: V\u2093(T) = V\u2093\u2080 + \u03B1\u209C\u00B7(T\u2212T\u2080). \u03B1\u209C < 0 for V\u2093<5V (tunneling), \u03B1\u209C > 0 for V\u2093>5V (avalanche). Dynamic impedance: Z\u2093 = \u0394V\u2093/\u0394I\u2093.' : 'Ohm: J = \u03C3E. \u03C3 = nq\u03BC. Temperature: R(T) = R\u2080(1+\u03B1\u0394T). Noise: V\u2099 = \u221A(4kTRB).'
          )),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // CIRCUIT SANDBOX (new sub-tool)
      // ════════════════════════════════════════════
      function renderCircuitSandbox() {
        var components=Array.isArray(d.circuitComponents)?d.circuitComponents:[],supplyV=semiNumber(d.circuitVoltage,5,0,12);
        var result=semiSeries(components,supplyV);
        var names={resistor:'Resistor',diode:'Silicon diode',led:'Red LED',capacitor:'Capacitor',nmos:'NMOS',pmos:'PMOS'};
        function part(type,index){return {id:'series-'+Date.now()+'-'+index,type:type,label:names[type],ohms:1000,value:type==='resistor'?'1 kΩ':type==='capacitor'?'100 µF':type==='led'?'Red':'Si'};}
        function setParts(next){updMulti({circuitComponents:next,circuitSimResult:null});}
        function preset(types){updMulti({circuitComponents:types.map(part),circuitVoltage:5,circuitSimResult:null});}
        var usable=result.currentA!=null,colors=['#22d3ee','#fbbf24','#a78bfa','#34d399','#fb7185'];
        return h('section',{'aria-label':'Series circuit workbench'},
          h('div',{className:'semi-study'},
            h('span',{className:'semi-eyebrow'},'FROM DEVICE TO CIRCUIT'),
            h('h4',null,'Build one path. Account for every volt.'),
            h('p',null,'Add components in series. The calculation updates as you change the supply or resistance. Follow the same current through each part, then compare its voltage drop.'),
            h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Circuit starters'},
              h('button',{type:'button',onClick:function(){preset(['resistor']);}},'Resistor baseline'),
              h('button',{type:'button',onClick:function(){preset(['resistor','led']);}},'Light an LED'),
              h('button',{type:'button',onClick:function(){preset(['resistor','resistor']);}},'Share the voltage'),
              h('button',{type:'button',onClick:function(){preset(['resistor','capacitor']);}},'Capacitor at steady DC'))),
          h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Add a series component'},
            ['resistor','diode','led','capacitor'].map(function(type){return h('button',{type:'button',key:type,disabled:components.length>=10,onClick:function(){setParts(components.concat([part(type,components.length)]));}},'Add '+names[type]);})),
          components.length>=10&&h('p',{className:'semi-model-note'},'This workbench supports up to 10 components in one path.'),
          sliderRow('Supply',supplyV,0,12,.5,function(v){updMulti({circuitVoltage:v,circuitSimResult:null});},' V'),
          h('div',{className:'semi-study'},
            h('h4',null,'Series path: supply + → components → supply −'),
            components.length===0?h('p',null,'Choose a starter above or add your first component.'):h('ol',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,padding:0,listStyle:'none'}},
              components.map(function(comp,index){return h('li',{key:comp.id||index,style:{minWidth:0,border:'1px solid #64748b',borderTop:'3px solid '+colors[index%colors.length],borderRadius:10,padding:12,background:'#0f172a'}},
                h('strong',null,(index+1)+'. '+(names[comp.type]||'Unsupported component')),
                comp.type==='resistor'?h('label',{style:{display:'block',marginTop:10}},'Resistance (Ω)',
                  h('input',{type:'number',min:10,max:100000,step:'any',value:comp.ohms==null?1000:comp.ohms,'aria-label':'Resistance for component '+(index+1),style:{display:'block',width:'100%',minHeight:44,background:'#020617',color:'#f8fafc',border:'1px solid #94a3b8',borderRadius:6,padding:8},onChange:function(e){var next=components.map(function(p,i){return i===index?Object.assign({},p,{ohms:e.target.value}):p;});setParts(next);}}))
                  :h('p',null,comp.type==='capacitor'?'Ideal capacitor · steady DC':comp.type==='led'?'Red emission · forward orientation':comp.type==='diode'?'Silicon · forward orientation':'Separate terminal connections required'),
                h('button',{type:'button','aria-label':'Remove component '+(index+1)+' '+(names[comp.type]||''),onClick:function(){setParts(components.filter(function(p,i){return i!==index;}));},style:{minHeight:44,marginTop:10,padding:'6px 12px',border:'1px solid #94a3b8',borderRadius:7,background:'#1e293b',color:'#f8fafc'}},'Remove'));
              })),
            components.length>0&&h('div',{className:'semi-inspector-controls'},h('button',{type:'button',onClick:function(){setParts([]);}},'Clear circuit'))),
          h('section',{className:'semi-study','aria-label':'Live circuit result'},
            h('h4',{role:'status'},!usable?result.message:'Series current: '+(result.currentA*1000).toFixed(3)+' mA'),
            usable&&h('p',null,result.message),
            usable&&h('div',{className:'flex flex-wrap gap-2'},statBadge('Supply power',(result.powerW*1000).toFixed(3)+' mW'),statBadge('Explicit resistance',result.resistance.toLocaleString()+' Ω'),components.some(function(comp){return comp.type==='led';})&&statBadge('LED',result.ledOn?'Emitting (illustrative)':'No modeled emission')),
            result.unprotected&&h('p',null,'No external current-limiting resistor. Current is limited only by the illustrative internal diode resistance; this is not a recommended LED driving circuit.'),
            result.status==='solved'&&h('div',null,
              h('h4',null,'Where the supply voltage goes'),
              h('div',{role:'img','aria-label':result.rows.map(function(row){return names[row.type]+' '+row.voltage.toFixed(3)+' volts';}).join('; '),style:{display:'flex',height:20,background:'#334155',borderRadius:6,overflow:'hidden'}},result.rows.map(function(row,index){return h('span',{key:index,style:{width:(supplyV>0?100*row.voltage/supplyV:0)+'%',background:colors[index%colors.length]}});})),
              h('table',null,h('caption',{className:'sr-only'},'Voltage and power for each series component at the current supply'),
                h('thead',null,h('tr',null,h('th',{scope:'col'},'Component'),h('th',{scope:'col'},'Drop (V)'),h('th',{scope:'col'},'Power (mW)'))),
                h('tbody',null,result.rows.map(function(row,index){return h('tr',{key:index},h('th',{scope:'row'},(index+1)+'. '+names[row.type]),h('td',null,row.voltage.toFixed(3)),h('td',null,(row.power*1000).toFixed(3)));}))),
              h('p',null,'Voltage balance: '+result.rows.reduce(function(sum,row){return sum+row.voltage;},0).toFixed(3)+' V across the components = '+supplyV.toFixed(3)+' V from the supply.'))),
          h('details',{className:'semi-study'},h('summary',null,'Model assumptions & sources'),
            h('p',null,'One series path, ideal DC supply, all diodes forward oriented, 300 K. Each resistor uses its entered value; no hidden resistor is added. Diodes use the same exponential relation and internal series resistance as I–V Curves. Capacitors are open circuits after charging; this view does not solve transients or capacitor charge distribution. Transistors require additional terminals and are not reduced to two-terminal components.'),
            h('a',{href:'https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits',target:'_blank',rel:'noopener noreferrer'},'OpenStax: capacitor charging and steady current')),
          h('div',{className:'semi-inspector-controls'},
            h('button',{type:'button',onClick:function(){upd('subtool','ivcurve');}},'Inspect the diode I–V curve'),
            h('button',{type:'button',onClick:function(){upd('subtool','transistor');}},'Explore transistor terminals')),
          aiBox()
        );
      }

      function renderWaferFab() {
        var stages=[
          {name:'Crystal Growth',action:'Grow an ordered silicon crystal from purified molten silicon.',result:'A single-crystal ingot; this is not yet a patterned wafer.',why:'A seed guides crystal orientation. Purification comes before crystal growth.'},
          {name:'Wafer Slicing',action:'Slice, polish and clean a wafer from the ingot.',result:'A smooth silicon starting surface.',why:'Flatness and cleanliness help later films and patterns remain uniform.'},
          {name:'Thermal Oxidation',action:'React silicon at the surface with an oxidizing ambient.',result:'An insulating silicon dioxide layer.',why:'Oxidation consumes silicon. Longer or hotter processing grows more oxide in this simplified comparison.'},
          {name:'Photolithography',action:'Coat resist, expose through a mask, and develop a pattern.',result:'Openings in a temporary resist layer.',why:'This example uses positive resist: exposed areas are removed during development. Resist defines where the next process can act.'},
          {name:'Etching',action:'Remove exposed oxide through the resist openings.',result:'Windows reach silicon while protected oxide remains.',why:'The mask determines location; etch chemistry and selectivity determine which material is removed. The resist is temporary.'},
          {name:'Ion Implantation',action:'Introduce dopant ions through the openings, then compare activation annealing.',result:'Dopants beneath exposed silicon regions.',why:'Dose is ions per area. Energy affects penetration. Annealing repairs damage and activates dopants; implantation alone is not the same as an active junction.'},
          {name:'Thin Film Deposition',action:'Strip the temporary resist and deposit another film.',result:'A new film over the patterned surface.',why:'Deposition adds material; oxidation converts silicon into oxide. Actual fabrication repeats deposition, lithography and etching many times.'},
          {name:'Metallization & CMP',action:'Create illustrative contacts and wiring, then planarize.',result:'Separate metal contacts and a flatter top surface.',why:'A working chip needs repeated patterning, many interconnect levels, testing and packaging. This walkthrough shows process ideas, not a complete manufacturing recipe.'}
        ];
        var stage=Math.round(semiNumber(d.fabStage,0,0,7)),current=stages[stage];
        var visited=Array.from(new Set((Array.isArray(d.fabVisited)?d.fabVisited:[]).filter(function(v){return Number.isInteger(v)&&v>=0&&v<8;}).concat([stage])));
        var temp=semiNumber(d.fabTemp,1000,800,1200),minutes=semiNumber(d.fabTime,30,0,120),growth=semiOxidation(temp,minutes);
        var dose=semiNumber(d.fabDoseLog,14,12,16),energy=semiNumber(d.fabEnergy,50,10,150),annealed=!!d.fabAnnealed,dopant=d.fabDopant==='boron'?'boron':'phosphorus';
        var windows=d.fabMask==='one'?[[.42,.58]]:[[.24,.36],[.64,.76]],complete=!!d.fabCompleted&&visited.length===8;
        function goStage(index){updMulti({fabStage:index,fabVisited:Array.from(new Set(visited.concat([index])))});}
        function next(){
          if(stage<7){goStage(stage+1);return;}
          if(visited.length<8){goStage(stages.findIndex(function(_,i){return visited.indexOf(i)<0;}));return;}
          if(!complete){upd('fabCompleted',true);tryAwardXP('fab-complete',50,'Completed wafer process walkthrough');if(announceToSR)announceToSR('Wafer fabrication walkthrough complete');}
        }
        var description='Wafer fabrication stage '+(stage+1)+': '+current.name+'. '+current.result;
        if(stage>=2)description+=' Relative oxide growth index '+growth.index.toFixed(2)+'.';
        if(stage>=3)description+=' '+windows.length+' mask opening'+(windows.length===1?'':'s')+'.';
        if(stage===5)description+=' '+dopant+' dose '+Math.pow(10,dose).toExponential(1)+' ions per square centimetre, energy '+energy+' keV. '+(annealed?'Activation anneal illustrated.':'As implanted; activation not yet illustrated.');
        function canvasRef(canvasEl){
          if(!canvasEl)return;
          var surface=prepareCanvas(canvasEl, 440, 260),cx=surface.cx,W=surface.W,H=surface.H;
          cx.fillStyle='#0f172a';cx.fillRect(0,0,W,H);
          cx.fillStyle='#67e8f9';cx.font='bold 13px sans-serif';cx.textAlign='center';cx.fillText((stage+1)+'. '+current.name,W/2,23);
          if(stage===0){
            cx.fillStyle='#4338ca';cx.fillRect(W*.36,70,W*.28,110);cx.beginPath();cx.ellipse(W/2,70,W*.14,20,0,0,Math.PI*2);cx.fill();
            cx.strokeStyle='#a5b4fc';cx.lineWidth=2;cx.beginPath();cx.ellipse(W/2,70,W*.14,20,0,0,Math.PI*2);cx.stroke();
            cx.fillStyle='#e0e7ff';cx.font='12px sans-serif';cx.fillText('Single-crystal ingot',W/2,205);return;
          }
          var left=35,right=W-35,span=right-left,y=H*.63,bodyH=42,oxideH=stage>=2?Math.min(40,20*growth.index):0;
          function xp(f){return left+span*f;}
          cx.fillStyle='#3730a3';cx.fillRect(left,y,span,bodyH);
          cx.fillStyle='#e0e7ff';cx.font='12px sans-serif';cx.fillText('Silicon substrate',W/2,y+bodyH+16);
          var segments=[],last=0;
          windows.forEach(function(win){segments.push([last,win[0]]);last=win[1];});segments.push([last,1]);
          if(oxideH>0){
            cx.fillStyle='#a5b4fc';
            (stage>=4?segments:[[0,1]]).forEach(function(seg){cx.fillRect(xp(seg[0]),y-oxideH,span*(seg[1]-seg[0]),oxideH);});
          }
          if(stage>=3&&stage<=5){
            cx.fillStyle='#f472b6';segments.forEach(function(seg){cx.fillRect(xp(seg[0]),y-oxideH-13,span*(seg[1]-seg[0]),11);});
          }
          if(stage>=5){
            windows.forEach(function(win,wi){
              var count=Math.round(5+(dose-12)*5),depth=6+(energy-10)/140*23;
              cx.fillStyle=annealed?'#34d399':'#fbbf24';
              for(var i=0;i<count;i++){var frac=(i*.61803398875+wi*.2)%1,spread=Math.sin(i*2.4)*3;cx.beginPath();cx.arc(xp(win[0]+(win[1]-win[0])*(.12+.76*frac)),y+depth+spread,2,0,Math.PI*2);cx.fill();}
            });
          }
          if(stage>=6){
            cx.fillStyle='#38bdf8';cx.fillRect(left,y-oxideH-16,span,11);
          }
          if(stage===7){
            cx.fillStyle='#fb923c';windows.forEach(function(win){var center=xp((win[0]+win[1])/2);cx.fillRect(center-6,y-oxideH-24,12,oxideH+24);cx.fillRect(center-27,y-oxideH-31,54,9);});
          }
          cx.fillStyle='#cbd5e1';cx.font='11px sans-serif';cx.textAlign='left';
          var labels=['Si: substrate'];if(stage>=2)labels.push('SiO₂: pale blue');if(stage>=3&&stage<=5)labels.push('Resist: pink');if(stage>=5)labels.push(annealed?'Active dopants: green':'Implanted ions: gold');if(stage>=6)labels.push('Added film: cyan');if(stage===7)labels.push('Metal: orange');
          labels.forEach(function(label,i){cx.fillText(label,35+(i%2)*W*.48,48+Math.floor(i/2)*17);});
          cx.fillStyle='#94a3b8';cx.textAlign='center';cx.font='10px sans-serif';cx.fillText('Schematic cross-section · layer sizes and depth are exaggerated',W/2,H-17);
        }
        React.useEffect(function(){
          var canvas=document.getElementById('semi-fab-canvas');if(!canvas)return;
          return bindStaticCanvas(canvas,canvasRef);
        }, [tab, subtool,d.motionPaused,d.fabStage,d.fabTemp,d.fabTime,d.fabMask,d.fabDoseLog,d.fabEnergy,d.fabAnnealed,d.fabDopant]);
        return h('section',{'aria-label':'Wafer process workbench'},
          h('div',{className:'semi-study'},h('span',{className:'semi-eyebrow'},'PROCESS → STRUCTURE → PURPOSE'),
            h('h4',null,'Follow what each process changes'),
            h('p',null,'An eight-stage walkthrough of representative process ideas. Later stages reuse your mask and implant choices; the diagram is not a complete CMOS manufacturing recipe.')),
          h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Wafer fabrication stages'},stages.map(function(item,i){return h('button',{key:i,type:'button','aria-label':'Stage '+(i+1)+': '+item.name,'aria-pressed':stage===i,'aria-current':stage===i?'step':undefined,onClick:function(){goStage(i);}},(i+1)+'. '+item.name);})),
          h('canvas',{id:'semi-fab-canvas',width:440,height:260,className:'block w-full max-w-5xl mx-auto rounded-lg bg-slate-950 border border-slate-500',role: 'img','aria-label':description}),
          h('div',{className:'semi-inspector-controls'},
            h('button',{type:'button',disabled:stage===0,onClick:function(){goStage(stage-1);}},'← Prev'),
            h('button',{type:'button',disabled:stage===7&&complete,onClick:next},stage<7?'Next →':complete?'Walkthrough complete':visited.length<8?'Review remaining stages':'Finish walkthrough ✓'),
            h('span',{role:'status'},visited.length+' / 8 stages visited'+(complete?' · walkthrough complete':''))),
          h('div',{className:'semi-study'},h('h4',null,current.name),
            h('p',null,h('strong',null,'Process: '),current.action),
            h('p',null,h('strong',null,'Result: '),current.result),
            h('p',null,h('strong',null,'Why it matters: '),current.why)),
          stage===2&&h('section',{className:'semi-study','aria-label':'Oxidation experiment'},
            h('h4',null,'Compare oxide growth'),
            sliderRow('Temperature',temp,800,1200,50,function(v){upd('fabTemp',v);},' °C'),
            sliderRow('Oxidation duration',minutes,0,120,5,function(v){upd('fabTime',v);},' min'),
            h('p',{role:'status'},'Relative oxide growth index: '+growth.index.toFixed(2)+' × baseline.'),
            h('p',null,'Baseline = 1000 °C for 30 min. At zero duration, no new oxide grows in this model. Compare equal time at two temperatures, or double the duration while holding temperature fixed.'),
            h('p',{className:'semi-model-note'},'Dimensionless kinetic comparison, not oxide thickness in nm. Diagram height is capped for readability. Silicon consumption and thin-oxide corrections are not drawn.')),
          stage>=4&&growth.index===0&&h('p',{className:'semi-model-note'},'No oxide was grown in this setup, so there is no oxide for the etch to remove. Return to Thermal Oxidation to compare a nonzero duration.'),
          stage>=3&&stage<=5&&h('div',{className:'semi-study'},h('h4',null,'Pattern the openings'),
            h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Mask openings'},
              h('button',{type:'button','aria-pressed':windows.length===1,onClick:function(){upd('fabMask','one');}},'One opening'),
              h('button',{type:'button','aria-pressed':windows.length===2,onClick:function(){upd('fabMask','two');}},'Two openings')),
            h('p',null,'Pink resist protects the surface. Openings determine where oxide is etched and where the schematic implant enters.')),
          stage===5&&h('section',{className:'semi-study','aria-label':'Implant experiment'},
            h('h4',null,'Separate dose, energy, and activation'),
            sliderRow('Dose exponent',dose,12,16,.5,function(v){upd('fabDoseLog',v);},''),
            h('p',null,'Dose: '+Math.pow(10,dose).toExponential(2)+' ions/cm². More dose is shown by more dots. Dot count is compressed for readability; each dot represents many ions.'),
            sliderRow('Implant energy',energy,10,150,10,function(v){upd('fabEnergy',v);},' keV'),
            h('div',{className:'semi-inspector-controls'},
              h('button',{type:'button','aria-pressed':dopant==='phosphorus',onClick:function(){upd('fabDopant','phosphorus');}},'Phosphorus donors'),
              h('button',{type:'button','aria-pressed':dopant==='boron',onClick:function(){upd('fabDopant','boron');}},'Boron acceptors'),
              h('label',null,h('input',{type:'checkbox',checked:annealed,onChange:function(){upd('fabAnnealed',!annealed);}}),'Show activation anneal')),
            h('p',{role:'status'},annealed?'Activation illustrated: dopants can contribute majority carriers.':'As implanted: lattice damage and incomplete electrical activation must be addressed.'),
            h('p',{className:'semi-model-note'},'Higher energy places the schematic distribution deeper. Depth and spread are illustrative; species-dependent stopping, channeling, diffusion and activation fraction are not calculated.')),
          h('details',{className:'semi-study'},h('summary',null,'Model assumptions & sources'),
            h('p',null,'The oxidation comparison follows x² + Ax = Bt with zero initial oxide. Normalized reference B = 1 and B/A = 1 at 1273.15 K; illustrative activation energies are 1.2 eV for B and 2.0 eV for B/A. The result is divided by the reference x at 30 min. These chosen coefficients illustrate reaction- and diffusion-limited trends and are not a calibrated furnace model. Etching, deposition and implantation are schematic. One mask is reused to keep the causal story visible; a real flow requires many masks, stripping/cleaning steps and process-specific recipes.'),
            h('a',{href:'https://www.iue.tuwien.ac.at/phd/filipovic/node31.html',target:'_blank',rel:'noopener noreferrer'},'TU Wien: Deal–Grove oxidation model')),
          h('div',{className:'semi-inspector-controls'},h('button',{type:'button',onClick:function(){speakText(description+' '+current.why);}},'Read process results'),
            h('button',{type:'button',onClick:function(){upd('subtool','doping');}},'Connect to Doping'),
            h('button',{type:'button',onClick:function(){updMulti({fabStage:0,fabVisited:[0],fabCompleted:false,fabTemp:1000,fabTime:30,fabMask:'two',fabDoseLog:14,fabEnergy:50,fabAnnealed:false,fabDopant:'phosphorus'});}},'Reset walkthrough')),
          aiBox()
        );
      }

      function renderLedSpectrum() {
        var model=semiLed(d),mixMode=model.mix,mat=model.mat,current=model.current;
        var description=(mixMode?'RGB mixture':mat.name)+'. '+model.status+'. '+
          (mixMode?'Channel settings '+model.rgb.join(', ')+'.':current+' mA. ')+
          (model.white?'Blue pump at 460 nm plus a broad phosphor band; white has no single wavelength.':
          mixMode?'The component spectra add; photons do not become an average wavelength.':'Nominal emission center '+mat.nm+' nm, photon energy '+model.energy.toFixed(2)+' eV.')+
          ' Curves are illustrative, not measured spectral power.';
        var canvasRef=function(canvasEl){
          if(!canvasEl)return;
          var surface=prepareCanvas(canvasEl, 440, 290),cx=surface.cx,W=surface.W,H=surface.H;
          cx.fillStyle='#0F172A';cx.fillRect(0,0,W,H);
          var L=48,R=18,T=48,B=54,gW=W-L-R,gH=H-T-B,yMax=mixMode?1.1:2.5;
          var x=function(nm){return L+(nm-350)/650*gW;},y=function(v){return T+gH-v/yMax*gH;};
          cx.fillStyle='#1E293B';cx.fillRect(x(380),T,x(780)-x(380),gH);
          cx.font='11px sans-serif';cx.textAlign='center';cx.fillStyle='#CBD5E1';
          cx.fillText('UV',x(365),T-12);cx.fillText('Approximate visible range',x(575),T-12);cx.fillText('Infrared',x(885),T-12);
          cx.strokeStyle='#475569';cx.lineWidth=1;
          [0,yMax/2,yMax].forEach(function(v){cx.beginPath();cx.moveTo(L,y(v));cx.lineTo(W-R,y(v));cx.stroke();cx.textAlign='right';cx.fillStyle='#CBD5E1';cx.fillText(v.toFixed(2),L-6,y(v)+4);});
          [350,450,550,650,750,850,1000].forEach(function(nm){cx.textAlign='center';cx.fillStyle='#CBD5E1';cx.fillText(String(nm),x(nm),T+gH+18);});
          function curve(sample,color,dash){
            cx.save();cx.beginPath();cx.rect(L,T,gW,gH);cx.clip();cx.strokeStyle=color;cx.lineWidth=2;cx.setLineDash(dash||[]);
            cx.beginPath();for(var nm=350;nm<=1000;nm+=1){var yy=y(sample(nm));if(nm===350)cx.moveTo(x(nm),yy);else cx.lineTo(x(nm),yy);}cx.stroke();cx.restore();
          }
          if(model.components.length>1)model.components.forEach(function(p){curve(function(nm){return p.weight*Math.exp(-.5*Math.pow((nm-p.nm)/p.sigma,2));},p.color,[4,3]);});
          curve(function(nm){return semiLedSpectrum(model,nm);},'#F8FAFC');
          cx.textAlign='center';cx.fillStyle='#E2E8F0';cx.font='12px sans-serif';cx.fillText('Wavelength (nm)',L+gW/2,H-8);
          cx.save();cx.translate(11,T+gH/2);cx.rotate(-Math.PI/2);cx.font='10px sans-serif';cx.fillText('Relative spectral output',0,0);cx.restore();
          cx.textAlign='right';cx.font='10px sans-serif';cx.fillStyle='#CBD5E1';cx.fillText('Solid: total · dashed: components',W-R,14);
        };
        React.useEffect(function(){
          var canvas=document.getElementById('semi-led-canvas');if(!canvas)return;
          return bindStaticCanvas(canvas,canvasRef);
        }, [tab, subtool, d.motionPaused,d.ledMaterial,d.ledCurrent,d.ledMixMode,d.ledMixR,d.ledMixG,d.ledMixB]);
        function mixPreset(r,g,b){updMulti({ledMixMode:true,ledMixR:r,ledMixG:g,ledMixB:b});}
        return h('div',null,
          h('section',{className:'semi-study'},
            h('p',{className:'semi-kicker'},'DRIVE · SPECTRUM · PERCEPTION'),
            h('h4',null,'What changes the light an LED emits?'),
            h('p',null,'Predict first: will changing the drive change the amount of light, its wavelength, or both? Compare a single emitter with two ways to make white light.')
          ),
          h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Light source mode'},
            pill('Single LED',!mixMode,function(){upd('ledMixMode',false);}),
            pill('RGB Mixer',mixMode,function(){upd('ledMixMode',true);})
          ),
          !mixMode&&h('div',{className:'semi-inspector-controls',role:'group','aria-label':'LED emitter'},
            Object.keys(SEMI_LED_EMITTERS).map(function(key){var m=SEMI_LED_EMITTERS[key];return h('button',{key:key,type:'button','aria-label':m.name+' LED','aria-pressed':model.key===key,onClick:function(){upd('ledMaterial',key);}},m.label);})
          ),
          h('section',{className:'semi-study','aria-label':'Emission state'},
            h('div',{style:{display:'flex',alignItems:'center',gap:'16px'}},
              h('span',{'aria-hidden':true,style:{display:'block',flexShrink:0,width:'48px',height:'48px',borderRadius:'50%',background:model.preview,border:'2px solid #94a3b8',boxShadow:model.active&&model.visible?'0 0 20px '+model.preview:'none'}}),
              h('div',null,h('h4',null,model.status),h('p',null,mixMode?'Screen RGB preview · not a calibrated prediction of LED color':!model.active?'No photons are emitted in this model at zero current.':!model.visible?'The spectrum shows emission, but this preview stays dark because the radiation is not visible.':'Color swatch identifies the source; its brightness is not a photometric measurement.'))
            )
          ),
          h('canvas',{id:'semi-led-canvas',width:440,height:290,className:'block w-full max-w-5xl mx-auto rounded-lg bg-slate-950 border border-slate-500',role: 'img', 'aria-label':description}),
          h('p',{className:'semi-model-note'},mixMode?'Channel levels weight illustrative peaks on a fixed 0–1.1 scale. Equal screen RGB values do not specify equal LED optical power.':'The vertical scale stays fixed as current changes: 20 mA gives a single-emitter peak of 1.00. Peak wavelength and spectral width stay fixed in this teaching model.'),
          !mixMode&&h('section',{className:'semi-study'},
            h('h4',null,'Change the drive'),
            sliderRow('Current',current,0,50,1,function(v){upd('ledCurrent',v);},' mA'),
            h('div',{className:'semi-inspector-controls'},btn('Turn off · 0 mA',function(){upd('ledCurrent',0);}),btn('Reference · 20 mA',function(){upd('ledCurrent',20);}),btn('Double drive · 40 mA',function(){upd('ledCurrent',40);})),
            h('p',null,'Current scales relative output linearly here. Real devices can heat up, shift wavelength, and change efficiency; those effects are not calculated.')
          ),
          mixMode&&h('section',{className:'semi-study'},
            h('h4',null,'Add separate spectra'),
            sliderRow('Red',model.rgb[0],0,255,1,function(v){upd('ledMixR',v);}),
            sliderRow('Green',model.rgb[1],0,255,1,function(v){upd('ledMixG',v);}),
            sliderRow('Blue',model.rgb[2],0,255,1,function(v){upd('ledMixB',v);}),
            h('div',{className:'semi-inspector-controls'},
              btn('All off',function(){mixPreset(0,0,0);}),btn('Yellow mix',function(){mixPreset(255,255,0);}),
              btn('Cyan mix',function(){mixPreset(0,255,255);}),btn('Magenta mix',function(){mixPreset(255,0,255);}),btn('RGB white',function(){mixPreset(255,255,255);})
            ),
            h('p',null,'Red plus green can look yellow while retaining two distinct emission bands. Perceived color does not uniquely identify a spectrum.')
          ),
          h('section',{className:'semi-study'},
            h('h4',null,model.white?'White light contains a range of wavelengths':mixMode?'A mixture keeps its component wavelengths':'Connect wavelength and photon energy'),
            h('p',null,model.white?'Some blue pump light remains, while a phosphor converts some to a broad band at longer wavelengths. The combined light can appear white. White has no single photon energy or band gap.':
              mixMode?'Adding intensities changes the mixture. It does not merge red and green photons into photons at an average wavelength.':
              'Nominal center: '+mat.nm+' nm · photon energy: '+model.energy.toFixed(2)+' eV. E = hc/λ. This is photon energy, not an independently measured material band gap.'),
            h('table',null,h('caption',null,'Illustrative spectral components'),
              h('thead',null,h('tr',null,h('th',{scope:'col'},'Component'),h('th',{scope:'col'},'Center'),h('th',{scope:'col'},'Relative peak'))),
              h('tbody',null,model.components.map(function(p){return h('tr',{key:p.name},h('th',{scope:'row'},p.name),h('td',null,p.nm+' nm'),h('td',null,p.weight.toFixed(2)));}))
            ),
            h('div',{className:'semi-inspector-controls'},
              btn('Compare phosphor white',function(){updMulti({ledMixMode:false,ledMaterial:'white',ledCurrent:20});}),
              btn('Compare RGB white',function(){mixPreset(255,255,255);})
            )
          ),
          h('details',{className:'semi-study'},h('summary',null,'Model assumptions & sources'),
            h('p',null,'Emission centers are representative examples, not specifications for every device made from that material family. Gaussian widths and phosphor weights are illustrative. This model does not compute lumens, chromaticity, color rendering, efficiency, forward voltage, or a measured band gap. Screen colors are approximate. The 380–780 nm visible region is a conventional guide; human sensitivity has no sharp boundary.'),
            h('a',{href:'https://www.energy.gov/cmei/ssl/led-basics',target:'_blank',rel:'noopener noreferrer'},'US Department of Energy · LED basics'),
            h('p',null,h('a',{href:'https://www.nobelprize.org/uploads/2018/06/advanced-physicsprize2014.pdf',target:'_blank',rel:'noopener noreferrer'},'Nobel Prize · blue LEDs and phosphor conversion'))
          ),
          h('div',{className:'semi-inspector-controls'},btn('Read light results',function(){speakText(description);}),btn('Connect to Band Gap',function(){updMulti({subtool:'bandgap',guidedSetupSubtool:null});})),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // SOLAR CELL SIMULATOR
      // ════════════════════════════════════════════
      function renderSolarCell() {
        var irradiance = semiNumber(d.solarIrradiance,1000,0,1200); // W/m^2
        var temp = semiNumber(d.solarTemp,300,270,370);
        var area = semiNumber(d.solarArea,100,10,500); // cm^2
        var material = d.solarMaterial || 'silicon';
        var loadR = semiNumber(d.solarLoadR,100,0,10000);



        var sMat = SOLAR_MATS[material] || SOLAR_MATS.silicon;
        var solar=semiSolar(sMat,irradiance,temp,area,loadR,!!d.solarOpen);
        var irradianceFactor=irradiance/1000,effActual=solar.efficiency,Voc=solar.Voc,Isc=solar.Isc,Vmp=solar.Vmp,Imp=solar.Imp,Pmax=solar.Pmax,FF=solar.FF;

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var surface = prepareCanvas(canvasEl, 440, 230);
          var cx = surface.cx, W = surface.W, H = surface.H;
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          // Sun
          var sunPulse = 1 + (irradiance>0?Math.sin(Date.now() / 800)*.1:0);
          cx.fillStyle = irradiance>0?'#FBBF24':'#334155'; cx.shadowColor = '#FBBF24'; cx.shadowBlur = 20 * irradianceFactor;
          cx.beginPath(); cx.arc(60, 30, 18 * sunPulse, 0, Math.PI * 2); cx.fill();
          cx.shadowBlur = 0;
          cx.fillStyle = '#FCD34D'; cx.font = '10px sans-serif'; cx.textAlign = 'center';
          cx.fillText(irradiance + ' W/m\u00B2', 60, 58);

          // Photon rays
          cx.strokeStyle = '#FCD34D'; cx.lineWidth = 1; cx.globalAlpha = 0.4;
          for (var ray = 0; ray < (irradiance>0?5:0); ray++) {
            var rayT = ((Date.now() / 400 + ray * 200) % 1000) / 1000;
            var rx1 = 80 + ray * 15;
            var ry1 = 45 + rayT * 50;
            cx.beginPath(); cx.moveTo(rx1, ry1); cx.lineTo(rx1 + 40, ry1 + 40); cx.stroke();
          }
          cx.globalAlpha = 1;

          // Solar panel
          var panelX = 120, panelY = 100, panelW = 160, panelH = 50;
          cx.fillStyle = sMat.color; cx.fillRect(panelX, panelY, panelW, panelH);
          cx.strokeStyle = '#CBD5E1'; cx.lineWidth = 1;
          // Grid lines on panel
          for (var gr = 1; gr < 4; gr++) {
            cx.beginPath(); cx.moveTo(panelX + gr * panelW / 4, panelY); cx.lineTo(panelX + gr * panelW / 4, panelY + panelH); cx.stroke();
            cx.beginPath(); cx.moveTo(panelX, panelY + gr * panelH / 4); cx.lineTo(panelX + panelW, panelY + gr * panelH / 4); cx.stroke();
          }
          cx.fillStyle = '#FFF'; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
          cx.fillText(sMat.name, panelX + panelW / 2, panelY + panelH / 2 + 4);

          // Electron-hole pairs generated inside
          var tick = Date.now();
          var pairCount = Math.floor(irradianceFactor * 6);
          for (var ep = 0; ep < pairCount; ep++) {
            var epx = panelX + 15 + (ep * panelW / pairCount);
            var epy = panelY + 10 + Math.sin(tick / 300 + ep) * 12;
            // electron
            cx.fillStyle = '#60A5FA';
            cx.beginPath(); cx.arc(epx, epy, 2.5, 0, Math.PI * 2); cx.fill();
            // hole
            cx.strokeStyle = '#F87171'; cx.lineWidth = 1;
            cx.beginPath(); cx.arc(epx + 5, epy + 8, 2.5, 0, Math.PI * 2); cx.stroke();
          }

          // Wires to load
          cx.strokeStyle = '#64748B'; cx.lineWidth = 2;
          cx.beginPath(); cx.moveTo(panelX + panelW, panelY + 15); cx.lineTo(panelX + panelW + 50, panelY + 15); cx.lineTo(panelX + panelW + 50, panelY + panelH + 30); cx.stroke();
          cx.beginPath(); cx.moveTo(panelX + panelW, panelY + panelH - 15); cx.lineTo(panelX + panelW + 30, panelY + panelH - 15); cx.lineTo(panelX + panelW + 30, panelY + panelH + 30); cx.stroke();
          // Load resistor
          cx.fillStyle = '#334155'; cx.fillRect(panelX + panelW + 25, panelY + panelH + 30, 30, 20);
          cx.fillStyle = '#CBD5E1'; cx.font = '10px sans-serif'; cx.textAlign = 'center';
          cx.fillText('Load', panelX + panelW + 40, panelY + panelH + 43);

          // Power output with glow
          cx.fillStyle = '#34D399'; cx.shadowColor = '#34D399'; cx.shadowBlur = 10;
          cx.font = 'bold 14px sans-serif'; cx.textAlign = 'center';
          cx.fillText(solar.loadPower.toFixed(2) + ' W to load', W / 2, H - 25);
          cx.shadowBlur = 0;
          cx.fillStyle = '#94A3B8'; cx.font = '11px sans-serif';
          cx.fillText('\u03B7 = ' + (effActual * 100).toFixed(1) + '%', W / 2, H - 10);

          // Mini I-V curve
          if (d.solarShowPV && Voc>0 && Isc>0) {
            var ivX = W - 115, ivY = 15, ivW = 105, ivH = 65;
            cx.fillStyle = 'rgba(15, 23, 42, 0.85)'; cx.fillRect(ivX, ivY, ivW, ivH);
            cx.strokeStyle = '#64748B'; cx.lineWidth = 1; cx.strokeRect(ivX, ivY, ivW, ivH);
            // I-V curve
            cx.strokeStyle = '#22D3EE'; cx.lineWidth = 1.5; cx.beginPath();
            for (var sv = 0; sv <= 1; sv += 0.02) {
              var sV = sv * Voc * 1.1;
              var sI = solar.current(sV);
              if (sI < 0) sI = 0;
              var spx = ivX + 5 + sv * (ivW - 10);
              var spy = ivY + ivH - 5 - (sI / Isc) * (ivH - 10);
              if (sv === 0) cx.moveTo(spx, spy); else cx.lineTo(spx, spy);
            }
            cx.stroke();
            // Power curve
            cx.strokeStyle = '#F59E0B'; cx.lineWidth = 1; cx.setLineDash([3, 2]); cx.beginPath();
            var maxPy = ivY + ivH;
            for (var pv = 0; pv <= 1; pv += 0.02) {
              var pV = pv * Voc * 1.1;
              var pI = solar.current(pV);
              if (pI < 0) pI = 0;
              var pPow = pV * pI;
              var ppx = ivX + 5 + pv * (ivW - 10);
              var ppy = ivY + ivH - 5 - (pPow / (Pmax * 1.3)) * (ivH - 10);
              if (pv === 0) cx.moveTo(ppx, ppy); else cx.lineTo(ppx, ppy);
            }
            cx.stroke(); cx.setLineDash([]);
            // Load operating point on the current curve (square, distinct from MPP).
            cx.fillStyle='#f8fafc';
            cx.fillRect(ivX+5+solar.loadV/(Voc*1.1)*(ivW-10)-2,ivY+ivH-5-solar.loadI/Isc*(ivH-10)-2,4,4);
            // MPP dot
            var mppFrac = Vmp / (Voc * 1.1);
            cx.fillStyle = '#F59E0B';
            cx.beginPath(); cx.arc(ivX + 5 + mppFrac * (ivW - 10), ivY + ivH - 5 - (Pmax / (Pmax * 1.3)) * (ivH - 10), 3, 0, Math.PI * 2); cx.fill();
            cx.fillStyle = '#CBD5E1'; cx.font = '10px sans-serif'; cx.textAlign = 'center';
            cx.fillText('Voltage →', ivX + ivW / 2, ivY + ivH + 10);
          }

          // Temperature indicator
          cx.fillStyle = temp > 320 ? '#EF4444' : temp > 300 ? '#F59E0B' : '#34D399';
          cx.font = '11px sans-serif'; cx.textAlign = 'left';
          cx.fillText(temp + 'K' + (temp > 320 ? ' \u26A0 Hot!' : ''), 10, H - 5);
        };

        var animRef = React.useRef(null);
        React.useEffect(function() {
          var canvas = document.getElementById('semi-solar-canvas');
          if (!canvas) return;
          function draw() { if (!canvas.isConnected) { cancelAnimationFrame(animRef.current); return; } canvasRef(canvas); if (!d.motionPaused && !semiReducedMotion()) animRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animRef.current); };
        }, [tab, subtool, d.motionPaused, d.solarIrradiance, d.solarTemp, d.solarArea, d.solarMaterial, d.solarShowPV, d.solarLoadR, d.solarOpen]);

        return h('div', null,
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            Object.keys(SOLAR_MATS).map(function(key) {
              var sm = SOLAR_MATS[key];
              return pill(sm.name, material === key, function() {
                upd('solarMaterial', key);
                tryAwardXP('solar-' + key, 8, 'Explored ' + sm.name + ' solar cell');
              }, 'solar-' + key);
            })
          ),
          h('canvas', { 
            id: 'semi-solar-canvas', width: 440, height: 230,
            className: 'block w-full max-w-5xl mx-auto rounded-lg bg-slate-950 border border-slate-500',
            role: 'img', 'aria-label': sMat.name + ' solar cell. Available maximum ' + Pmax.toFixed(3) + ' watts. Delivered to load ' + solar.loadPower.toFixed(3) + ' watts.'
          }),
          sliderRow('Irradiance', irradiance, 0, 1200, 50, function(v) { upd('solarIrradiance', v); }, ' W/m\u00B2'),
          sliderRow('Cell Temp', temp, 270, 370, 5, function(v) { upd('solarTemp', v); }, ' K'),
          sliderRow('Area', area, 10, 500, 10, function(v) { upd('solarArea', v); }, ' cm\u00B2'),
          h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Solar load experiments'},
            h('button',{type:'button',onClick:function(){updMulti({solarLoadR:0,solarOpen:false});}},'Short circuit'),
            h('button',{type:'button',disabled:Imp<=0,onClick:function(){updMulti({solarLoadR:Vmp/Imp,solarOpen:false});}},'Match load to maximum power'),
            h('button',{type:'button',onClick:function(){upd('solarOpen',true);}},'Open circuit'),
            h('button',{type:'button',onClick:function(){upd('solarIrradiance',irradiance===0?1000:0);}},irradiance===0?'Restore sunlight':'Try darkness')),
          h('div',{className:'semi-slider-row flex items-center gap-2'},
            h('label',{htmlFor:'semi-solar-load',className:'semi-slider-label'},'Load resistance'),
            h('input',{id:'semi-solar-load',type:'range',min:-2,max:4,step:.05,value:Math.log10(Math.max(.01,loadR)),
              'aria-valuetext':d.solarOpen?'Open circuit':loadR===0?'Short circuit':loadR.toPrecision(3)+' ohms',
              onChange:function(e){updMulti({solarLoadR:Math.pow(10,Number(e.target.value)),solarOpen:false});},className:'flex-1'}),
            h('output',{className:'semi-slider-output'},d.solarOpen?'Open':loadR===0?'Short':loadR.toPrecision(3)+' Ω')),
          h('div',{className:'semi-study'},
            h('h4',{role:'status'},'Power delivered to load: '+solar.loadPower.toFixed(3)+' W'),
            h('p',null,'Load voltage '+solar.loadV.toFixed(3)+' V · Load current '+solar.loadI.toFixed(3)+' A. Available maximum: '+Pmax.toFixed(3)+' W.'),
            h('p',null,'An open circuit can have voltage but no current. A short circuit can have current but no voltage. Both deliver zero power to the load. Find the resistance that balances voltage and current.'),
            h('details',null,h('summary',null,t('stem.semiconductor.model_assumptions','Model assumptions & sources')),
              h('p',null,'Empirical teaching curve: I = Isc[1 − (V/Voc)^10] in the generating quadrant. The maximum is calculated from this same curve. Reference efficiencies describe illustrative cells at 1000 W/m² and 298 K, not laboratory records. Isc scales with light; Voc varies logarithmically with light. A shared illustrative temperature coefficient approximates silicon trends. Shading, spectrum, recombination details and maximum-power tracking are not simulated.'),
              h('a',{href:'https://www.pveducation.org/pvcdrom/solar-cell-operation/iv-curve',target:'_blank',rel:'noopener noreferrer'},'PVEducation: I–V curve and maximum power'))),
          h('div', { className: 'flex items-center gap-3 mt-2' },
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!d.solarShowPV, onChange: function() { upd('solarShowPV', !d.solarShowPV); }, className: 'accent-cyan-500' }), t('stem.semiconductor.i_v_p_v_curve', 'I-V / P-V Curve')),
            btn('\uD83E\uDD16 AI Explain', function() { askAI(sMat.name + ' solar cell photovoltaic effect and efficiency'); }, 'transition-colors bg-indigo-600 text-white hover:bg-indigo-700')
          ),
          d.solarShowPV&&h('p',{className:'semi-model-note'},'Chart key: solid cyan = current / Isc; dashed gold = power / (1.3 × Pmax); gold dot = maximum power; white square = load current. Horizontal axis: 0 to 1.1 × Voc. Read numerical values above.'),
          // Stats
          h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
            statBadge('Available max', Pmax.toFixed(3) + ' W', 'text-emerald-400'),
            statBadge('Efficiency', (effActual * 100).toFixed(1) + '%'),
            statBadge('V\u2092\u1D9C', Voc.toFixed(2) + ' V'),
            statBadge('I\u209B\u1D9C', Isc.toFixed(2) + ' A'),
            statBadge('FF', (FF * 100).toFixed(1) + '%')
          ),
          infoBox(gradeText(
            'Solar cells turn sunlight into electricity! Brighter sun = more power. They work because light knocks electrons free inside the material.',
            'Solar cells are P-N junctions that absorb photons. Each photon with enough energy creates an electron-hole pair. The junction\'s electric field separates them, creating current. More sun = more pairs = more power!',
            'Photovoltaic effect: photons with h\u03BD > E_g generate e-h pairs separated by junction field. V\u2092\u1D9C = (kT/q)ln(I\u2097/I\u2080 + 1). Shockley-Queisser limit: ~33.7% for single-junction at 1.34 eV. FF = P\u2098\u2090\u2093/(V\u2092\u1D9CI\u209B\u1D9C).',
            'Maximum power is found on the same I–V curve: P = VI. FF = Pmax/(Voc × Isc). A resistive load operates where I(V) = V/R. These illustrative material presets are not certified efficiency records; a tandem uses multiple junctions and should not be compared directly with a single-junction limit.'
          )),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // MOORE'S LAW INTERACTIVE TIMELINE
      // ════════════════════════════════════════════
      function renderMooreLaw() {
        var model=semiMoore(d),year=model.year,selected=model.selected;
        var ratioText=model.ratio==null?'Not compared':(model.ratio<.01||model.ratio>=1000?model.ratio.toExponential(2):model.ratio.toFixed(2))+' × reference';
        var description="Moore's Law exploration, "+(model.log?'logarithmic':'linear')+' scale, 1965 to 2030. Selected year '+year+'. '+model.status+'. '+
          (selected?selected.name+', '+formatTransistorCount(selected.transistors)+' transistors across '+selected.dies+' compute die'+(selected.dies===1?'':'s')+', '+selected.node+' process label. ':'')+
          'Illustrative doubling reference for '+year+': '+semiTrendCount(model.reference)+', using '+model.period+' years per doubling, anchored to 2,300 in 1971. '+(model.show?'Reference line shown.':'Reference line hidden.')+
          ' Product counts are not density or performance measurements.';
        var canvasRef=function(canvasEl){
          if(!canvasEl)return;
          var surface=prepareCanvas(canvasEl, 440, 290),cx=surface.cx,W=surface.W,H=surface.H;
          cx.fillStyle='#0F172A';cx.fillRect(0,0,W,H);
          var L=78,R=18,T=35,B=48,gW=W-L-R,gH=H-T-B;
          function x(y){return L+(y-1965)/65*gW;}
          function y(n){return T+gH-model.fraction(n)*gH;}
          cx.fillStyle='#31263A';cx.fillRect(x(2024),T,x(2030)-x(2024),gH);
          cx.strokeStyle='#475569';cx.lineWidth=1;cx.fillStyle='#CBD5E1';cx.font='10px sans-serif';
          var ticks=[];
          if(model.log){for(var power=model.logMin;power<=model.logMax;power+=Math.max(1,Math.ceil((model.logMax-model.logMin)/5)))ticks.push(Math.pow(10,power));}
          else for(var i=0;i<=4;i++)ticks.push(model.linearMax*i/4);
          ticks.forEach(function(n){var yy=y(n);cx.beginPath();cx.moveTo(L,yy);cx.lineTo(W-R,yy);cx.stroke();cx.textAlign='right';cx.fillText(n===0?'0':n.toExponential(2),L-6,yy+3);});
          [1965,1980,1995,2010,2030].forEach(function(yr){cx.fillStyle='#CBD5E1';cx.textAlign='center';cx.fillText(String(yr),x(yr),H-B+18);});
          cx.save();cx.beginPath();cx.rect(L,T,gW,gH);cx.clip();
          if(model.show){
            cx.strokeStyle='#FBBF24';cx.lineWidth=2;cx.setLineDash([5,4]);cx.beginPath();
            for(var yr=1965;yr<=2030;yr+=.25){if(yr===1965)cx.moveTo(x(yr),y(semiDoubling(yr,model.period)));else cx.lineTo(x(yr),y(semiDoubling(yr,model.period)));}
            cx.stroke();cx.setLineDash([]);
          }
          cx.strokeStyle='#FCA5A5';cx.lineWidth=1;cx.setLineDash([3,3]);cx.beginPath();cx.moveTo(x(year),T);cx.lineTo(x(year),T+gH);cx.stroke();cx.setLineDash([]);
          cx.restore();
          model.points.forEach(function(p){
            var px=x(p.year),py=y(p.transistors),active=p.year===year;
            cx.fillStyle=p.dies===1?'#22D3EE':'#C4B5FD';cx.strokeStyle=active?'#FFF':cx.fillStyle;cx.lineWidth=active?2:1;
            cx.beginPath();if(p.dies===1)cx.arc(px,py,active?5:3.5,0,Math.PI*2);else cx.rect(px-4,py-4,8,8);cx.fill();cx.stroke();
          });
          cx.textAlign='left';cx.font='11px sans-serif';cx.fillStyle='#E2E8F0';cx.fillText('Product totals · selected year '+year,L,17);
          cx.textAlign='right';cx.fillStyle='#E9D5FF';cx.font='10px sans-serif';cx.fillText('After 2024: no product data',W-R,H-7);
          cx.save();cx.translate(13,T+gH/2);cx.rotate(-Math.PI/2);cx.textAlign='center';cx.font='11px sans-serif';cx.fillStyle='#CBD5E1';cx.fillText('Transistors · '+(model.log?'log scale':'linear scale'),0,0);cx.restore();
        };
        React.useEffect(function(){
          var canvas=document.getElementById('semi-moore-canvas');if(!canvas)return;
          return bindStaticCanvas(canvas,canvasRef);
        }, [tab, subtool, d.motionPaused,d.mooreYear,d.mooreDoubling,d.mooreShowPred,d.mooreLogScale,d.mooreIncludeMulti]);
        function chooseYear(v){upd('mooreYear',v);}
        return h('div',null,
          h('section',{className:'semi-study'},h('p',null,'EVIDENCE · EXPONENTIAL GROWTH · SCOPE'),
            h('h4',null,'What does a growing transistor count tell us?'),
            h('p',null,'Compare sourced product counts with a doubling example. Ask whether a change comes from denser transistors, a larger die, more dies, or a different kind of product. This curated dataset ends in 2024.')),
          h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Transistor count scale'},
            pill('Log scale',model.log,function(){upd('mooreLogScale',true);}),pill('Linear scale',!model.log,function(){upd('mooreLogScale',false);})),
          h('canvas',{id:'semi-moore-canvas',width:440,height:290,
            className:'block w-full max-w-5xl mx-auto rounded-lg bg-slate-950 border border-slate-500',
            role: 'img','aria-label':description}),
          h('p',{className:'semi-model-note'},'● One compute die · ■ Two compute dies · dashed amber: illustrative reference. Points are separate products, not an interpolated industry average. Axis labels use powers of ten: 1e+9 means one billion.'),
          h('section',{className:'semi-study'},
            h('h4',null,'Inspect a year'),
            sliderRow('Year',year,1965,2030,1,chooseYear,''),
            h('div',{className:'semi-inspector-controls'},
              h('button',{type:'button',disabled:!model.previous,onClick:function(){if(model.previous)chooseYear(model.previous.year);}},'Previous product'),
              h('button',{type:'button',disabled:!model.next,onClick:function(){if(model.next)chooseYear(model.next.year);}},'Next product')),
            h('p',{role:'status'},year+' · '+model.status),
            selected&&h('div',null,h('h4',null,selected.name),
              h('p',null,formatTransistorCount(selected.transistors)+' transistors · '+selected.dies+' compute die'+(selected.dies===1?'':'s')+' · '+selected.node+' process label'),
              !model.included&&h('p',null,'This product is excluded from the plotted points and ratio. Include products with two compute dies to compare it.'),
              h('a',{href:selected.source,target:'_blank',rel:'noopener noreferrer'},'Read the product source')),
            !selected&&h('p',null,'No nearby product is substituted for the selected year. Use Previous product or Next product to inspect an actual entry.'),
            h('div',{className:'semi-inspector-controls'},
              statBadge('Reference at selected year',semiTrendCount(model.reference)),statBadge('Reported / reference',ratioText))
          ),
          h('section',{className:'semi-study'},
            h('h4',null,'Change the doubling assumption'),
            sliderRow('Doubling interval',model.period,1,4,.25,function(v){upd('mooreDoubling',v);},' years'),
            h('div',{className:'semi-inspector-controls'},btn('1-year experiment',function(){upd('mooreDoubling',1);}),btn('2-year reference',function(){upd('mooreDoubling',2);}),btn('4-year experiment',function(){upd('mooreDoubling',4);})),
            h('label',null,h('input',{type:'checkbox',checked:model.show,onChange:function(){upd('mooreShowPred',!model.show);}}),' Show doubling reference'),
            h('p',null,'N(y) = 2,300 × 2^((y − 1971) / T). The anchor is the Intel 4004 count. T is your chosen doubling interval; this curve is not a fit to these products or Moore’s original forecast. Before 1971 it is backward extrapolation.'),
            h('p',null,model.log?'On a log scale, equal vertical distances represent equal ratios. Exponential growth appears as a straight line.':'On a linear scale, equal vertical distances represent equal count differences. Early small counts cluster near zero, but have not disappeared.'),
            h('p',{className:'semi-model-note'},'Axis bounds include the full reference through 2030 even when its line is hidden. Changing T can rescale the chart; toggling visibility or the die filter does not.')
          ),
          h('section',{className:'semi-study'},
            h('h4',null,'Check the counting boundary'),
            h('label',null,h('input',{type:'checkbox',checked:model.multi,onChange:function(){upd('mooreIncludeMulti',!model.multi);}}),' Include products with two compute dies'),
            h('p',null,'These are reported processor or SoC transistor totals, excluding separate memory chips. CPU, SoC and GPU functions differ. Die count is explicit; die areas are not tabulated, so transistor density cannot be calculated here.'),
            h('div',{className:'semi-inspector-controls'},btn('Inspect M1 Max',function(){chooseYear(2021);}),btn('Inspect M1 Ultra',function(){updMulti({mooreYear:2022,mooreIncludeMulti:true});})),
            h('div',{style:{display:'flex',flexWrap:'wrap',gap:'12px',marginTop:'12px'}},
              h('div',{style:{padding:'14px',border:'1px solid #22D3EE',borderRadius:'10px'}},'M1 Max · one die',h('p',null,'57 billion')),
              h('div',{style:{padding:'14px',border:'1px solid #C4B5FD',borderRadius:'10px'}},'M1 Ultra · two M1 Max dies',h('p',null,'57 + 57 = 114 billion'))),
            h('p',null,'M1 Ultra connects two M1 Max dies. Its doubled total is an example of combining dies; it does not by itself show a doubling of transistor density.'),
            h('a',{href:SEMI_MILESTONES[6].source,target:'_blank',rel:'noopener noreferrer'},'Apple’s M1 Ultra announcement')
          ),
          h('section',{className:'semi-study'},
            h('h4',null,'Inspect the source data'),
            h('p',null,model.points.length+' products shown. Select a product to update the year. Gaps reflect this curated selection, not missing years of technological progress.'),
            h('table',null,h('caption',null,'Reported transistor counts · 1971–2024'),
              h('thead',null,h('tr',null,h('th',{scope:'col'},'Year'),h('th',{scope:'col'},'Product / scope'),h('th',{scope:'col'},'Count'))),
              h('tbody',null,model.points.map(function(p){return h('tr',{key:p.year},
                h('td',null,p.year),h('th',{scope:'row'},h('button',{type:'button','aria-pressed':p.year===year,'aria-label':'Inspect '+p.name,onClick:function(){chooseYear(p.year);},style:{minHeight:'44px',textAlign:'left',whiteSpace:'normal'}},p.name),
                  h('div',{style:{fontWeight:'normal',fontSize:'12px'}},p.dies+' compute die'+(p.dies===1?'':'s')),
                  h('a',{href:p.source,target:'_blank',rel:'noopener noreferrer','aria-label':'Source for '+p.name},'Source')),
                h('td',null,formatTransistorCount(p.transistors)));})))
          ),
          h('details',{className:'semi-study'},h('summary',null,'History and interpretation'),
            h('p',null,'Moore’s 1965 projection used annual doubling; he revised the outlook in 1975 toward a two-year interval. It was an empirical observation and projection, not a physical law that guarantees performance, cost or efficiency.'),
            h('p',null,'This chart counts transistors, not transistors per unit area. Modern process-node labels identify manufacturing generations; they are not a direct measurement of every transistor feature. Product architecture, die area and packaging complicate comparisons.'),
            h('a',{href:'https://www.intel.com/content/www/us/en/newsroom/resources/moores-law.html',target:'_blank',rel:'noopener noreferrer'},'Intel · Moore’s Law history')),
          h('div',{className:'semi-inspector-controls'},btn('Read trend results',function(){speakText(description);}),btn('Connect to Wafer Fab',function(){updMulti({subtool:'waferfab',guidedSetupSubtool:null});})),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // QUANTUM WELLS — Confinement & Wavefunctions
      // ════════════════════════════════════════════
      function renderQuantumWell() {
        var QW_MATS={
          'gaas-algaas':{name:'GaAs/AlGaAs',well:'GaAs',barrier:'AlGaAs',me:.067},
          'inas-gaas':{name:'InAs/GaAs',well:'InAs',barrier:'GaAs',me:.023},
          'gan-algan':{name:'GaN/AlGaN',well:'GaN',barrier:'AlGaN',me:.20}
        };
        var material=QW_MATS[d.qwMaterial]?d.qwMaterial:'gaas-algaas',qmat=QW_MATS[material];
        var infinite=d.qwModel==='infinite',wellWidth=semiNumber(d.qwWidth,5,1,20),wellDepth=semiNumber(d.qwDepth,.3,.1,1);
        var numLevels=Math.round(semiNumber(d.qwLevels,3,1,6)),showWave=d.qwShowWave!==false&&!d.qwShowProb,showProb=!!d.qwShowProb;
        var model=semiQuantum(wellWidth,wellDepth,qmat.me,infinite,numLevels),levels=model.levels;
        var selected=Math.round(semiNumber(d.qwSelected,1,1,levels.length)),state=levels[selected-1];
        var transitions=levels.slice(1).map(function(level,index){var gap=level.E-levels[index].E;return {from:level.n,to:levels[index].n,dE:gap,wavelength:1239.841984/gap};});
        var description='Quantum well potential for '+qmat.name+', '+wellWidth+' nanometres wide and '+(infinite?'infinite barriers':wellDepth+' electron volts deep')+'. '
          +levels.length+' displayed confined level'+(levels.length===1?'':'s')+': '+levels.map(function(level){return 'n='+level.n+' at '+level.E.toFixed(3)+' eV';}).join(', ')+'. Selected n='+selected+'. Probability outside the well: '+(state.outside*100).toFixed(2)+' percent.';
        function canvasRef(canvasEl){
          if(!canvasEl)return;
          var surface=prepareCanvas(canvasEl, 440, (showWave||showProb)?360:260);
          var cx=surface.cx,W=surface.W,H=surface.H;
          cx.fillStyle='#0f172a';cx.fillRect(0,0,W,H);
          var left=58,right=W-18,top=34,bottom=(showWave||showProb)?H*.5:H-38;
          var emax=infinite?levels[levels.length-1].E*1.25:wellDepth*1.3;
          var extent=infinite?wellWidth:wellWidth/2+Math.min(wellWidth*3,Math.max(wellWidth*.5,4/state.kappa));
          function xpx(x){return left+(x+extent)/(extent*2)*(right-left);}
          function ypx(e){return bottom-e/emax*(bottom-top);}
          var wl=xpx(-wellWidth/2),wr=xpx(wellWidth/2),barrierY=infinite?top:ypx(wellDepth);
          cx.fillStyle='#4c1d9555';cx.fillRect(left,barrierY,wl-left,bottom-barrierY);cx.fillRect(wr,barrierY,right-wr,bottom-barrierY);
          cx.font='10px sans-serif';
          for(var tick=0;tick<=4;tick++){
            var energy=emax*tick/4,y=ypx(energy);
            cx.strokeStyle='#334155';cx.lineWidth=1;cx.beginPath();cx.moveTo(left,y);cx.lineTo(right,y);cx.stroke();
            cx.fillStyle='#cbd5e1';cx.textAlign='right';cx.fillText(energy.toFixed(2),left-7,y+3);
          }
          cx.strokeStyle='#c4b5fd';cx.lineWidth=2;cx.beginPath();cx.moveTo(left,barrierY);cx.lineTo(wl,barrierY);cx.lineTo(wl,bottom);cx.lineTo(wr,bottom);cx.lineTo(wr,barrierY);cx.lineTo(right,barrierY);cx.stroke();
          cx.fillStyle='#ddd6fe';cx.textAlign='center';cx.font='11px sans-serif';
          cx.fillText(infinite?'Infinite barriers':'Barrier = '+wellDepth.toFixed(2)+' eV',W/2,18);
          levels.forEach(function(level){
            cx.strokeStyle=level.n===selected?'#22d3ee':'#94a3b8';cx.lineWidth=level.n===selected?2:1;
            cx.setLineDash(level.n===selected?[]:[3,3]);cx.beginPath();cx.moveTo(wl,ypx(level.E));cx.lineTo(wr,ypx(level.E));cx.stroke();cx.setLineDash([]);
          });
          if(showWave||showProb){
            var points=[],max=0,profileTop=H*.64,profileBottom=H-38;
            for(var i=0;i<=300;i++){var x=-extent+2*extent*i/300,psi=model.psi(state,x),value=showProb?psi*psi:psi;max=Math.max(max,Math.abs(value));points.push([x,value]);}
            var ceiling=max*1.2,zero=showProb?profileBottom:(profileTop+profileBottom)/2;
            function profileY(value){return zero-value/ceiling*(showProb?profileBottom-profileTop:(profileBottom-profileTop)/2);}
            cx.fillStyle='#4c1d9533';cx.fillRect(left,profileTop,wl-left,profileBottom-profileTop);cx.fillRect(wr,profileTop,right-wr,profileBottom-profileTop);
            cx.strokeStyle='#64748b';cx.lineWidth=1;cx.beginPath();cx.moveTo(left,zero);cx.lineTo(right,zero);cx.stroke();
            cx.fillStyle='#cbd5e1';cx.font='10px sans-serif';cx.textAlign='right';
            (showProb?[0,max]:[-max,0,max]).forEach(function(value){cx.fillText(value.toFixed(3),left-7,profileY(value)+3);});
            cx.textAlign='center';cx.fillText(showProb?'Probability density |ψ|² (nm⁻¹)':'Wavefunction ψ (nm⁻½)',W/2,profileTop-12);
            cx.strokeStyle=showProb?'#fbbf24':'#34d399';cx.lineWidth=2;cx.beginPath();
            points.forEach(function(point,i){var x=xpx(point[0]),y=profileY(point[1]);if(i===0)cx.moveTo(x,y);else cx.lineTo(x,y);});cx.stroke();
          }
          cx.fillStyle='#cbd5e1';cx.font='10px sans-serif';cx.textAlign='center';
          [-extent,0,extent].forEach(function(x){cx.fillText(x.toFixed(1),xpx(x),H-20);});
          cx.fillText('Position x (nm)',W/2,H-5);
          cx.save();cx.translate(12,(top+bottom)/2);cx.rotate(-Math.PI/2);cx.fillText('Energy (eV)',0,0);cx.restore();
          cx.fillStyle='#67e8f9';cx.font='bold 11px sans-serif';cx.textAlign='right';cx.fillText('n='+selected+' · '+state.E.toFixed(3)+' eV',right,top+12);
        }
        React.useEffect(function(){
          var canvas=document.getElementById('semi-qw-canvas');if(!canvas)return;
          return bindStaticCanvas(canvas,canvasRef);
        }, [tab, subtool,d.motionPaused,d.qwWidth,d.qwDepth,d.qwMaterial,d.qwLevels,d.qwShowWave,d.qwShowProb,d.qwModel,d.qwSelected]);
        return h('section',{'aria-label':'Quantum confinement workbench'},
          h('div',{className:'semi-study'},h('span',{className:'semi-eyebrow'},'ENERGY AND PROBABILITY'),
            h('h4',null,'How tightly is the electron confined?'),
            h('p',null,'Compare a finite barrier with the ideal infinite limit. Change the width or barrier height, select a state, then look for probability extending into the barriers.'),
            h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Quantum well model'},
              h('button',{type:'button','aria-pressed':!infinite,onClick:function(){upd('qwModel','finite');}},'Finite barriers'),
              h('button',{type:'button','aria-pressed':infinite,onClick:function(){upd('qwModel','infinite');}},'Infinite barrier comparison'))),
          h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Effective mass presets'},Object.keys(QW_MATS).map(function(key){return h('button',{type:'button',key:key,'aria-pressed':material===key,onClick:function(){updMulti({qwMaterial:key,qwSelected:1});}},QW_MATS[key].name);})),
          h('canvas',{id:'semi-qw-canvas',width:440,height:(showWave||showProb)?360:260,className:'block w-full max-w-5xl mx-auto rounded-lg bg-slate-950 border border-slate-500',role: 'img', 'aria-label':description}),
          h('p',{className:'semi-model-note'},'Cyan line: selected energy. Dashed lines: other displayed energies. '+(showProb?'Gold curve: probability density |ψ|².':showWave?'Green curve: signed wavefunction ψ.':'Profiles hidden.')+' Energy and the selected profile use separate vertical axes and share the position axis. Zero energy is the well bottom. The horizontal range adapts to the selected state; probability totals include tails beyond the drawing.'),
          sliderRow('Well Width',wellWidth,1,20,.5,function(v){upd('qwWidth',v);},' nm'),
          !infinite&&sliderRow('Well Depth',wellDepth,.1,1,.05,function(v){upd('qwDepth',v);},' eV'),
          sliderRow('Display up to',numLevels,1,6,1,function(v){upd('qwLevels',v);},' states'),
          h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Select a confined state'},
            levels.map(function(level){return h('button',{type:'button',key:level.n,'aria-pressed':selected===level.n,onClick:function(){upd('qwSelected',level.n);}},'State n='+level.n);})),
          h('div',{className:'semi-inspector-controls'},
            h('label',null,h('input',{type:'checkbox',checked:showWave,onChange:function(){updMulti({qwShowWave:!showWave,qwShowProb:false});}}),'Show wavefunction'),
            h('label',null,h('input',{type:'checkbox',checked:showProb,onChange:function(){updMulti({qwShowProb:!showProb,qwShowWave:false});}}),'Show probability density')),
          h('section',{className:'semi-study','aria-label':'Confinement measurements'},
            h('h4',{role:'status'},infinite?'Infinite-barrier limit':model.total+' bound state'+(model.total===1?'':'s')+' supported; '+levels.length+' displayed'),
            h('p',null,'Selected state n='+selected+': '+state.E.toFixed(4)+' eV. Probability outside: '+(state.outside*100).toFixed(2)+'%.'),
            h('p',null,'Effective electron mass: '+qmat.me+' mₑ. '+(infinite?'No penetration is possible through an infinite barrier.':'The finite-barrier energy is below its same-width infinite-well value of '+state.infiniteE.toFixed(4)+' eV. Nonzero tails describe barrier penetration, not an escaping electron.')),
            h('table',null,h('caption',{className:'sr-only'},'Displayed bound-state energies and integrated probability outside the well'),
              h('thead',null,h('tr',null,h('th',{scope:'col'},'State'),h('th',{scope:'col'},'Energy (eV)'),h('th',{scope:'col'},'Outside (%)'))),
              h('tbody',null,levels.map(function(level){return h('tr',{key:level.n},h('th',{scope:'row'},'n='+level.n),h('td',null,level.E.toFixed(4)),h('td',null,(level.outside*100).toFixed(2)));}))),
            h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Confinement experiments'},
              h('button',{type:'button',onClick:function(){updMulti({qwModel:'finite',qwMaterial:'gaas-algaas',qwWidth:1,qwDepth:.1,qwSelected:1});}},'Shallow, narrow well'),
              h('button',{type:'button',onClick:function(){updMulti({qwModel:'finite',qwMaterial:'gaas-algaas',qwWidth:10,qwDepth:.5,qwSelected:1});}},'Wider, deeper well'))),
          transitions.length>0&&h('details',{className:'semi-study'},h('summary',null,'Compare adjacent energy spacings'),
            h('p',null,'These are electron subband spacings. A matching photon energy does not guarantee a transition; coupling and selection rules matter. These are not interband LED wavelengths.'),
            transitions.map(function(tr){return h('p',{key:tr.from},'n='+tr.from+' → n='+tr.to+': '+tr.dE.toFixed(4)+' eV · equivalent photon wavelength '+tr.wavelength.toFixed(0)+' nm');})),
          h('details',{className:'semi-study'},h('summary',null,'Model assumptions & sources'),
            h('p',null,'One electron in a symmetric one-dimensional square well, zero electric field, constant effective mass equal in the well and both barriers. Finite states satisfy continuity of ψ and its derivative; all displayed finite states lie below the barrier. The wavefunction is normalized over all space, including tails beyond the drawing. Every attractive finite 1D square well supports a ground state. Material presets choose an illustrative effective mass; the barrier height is user supplied, not a calculated band offset. Nonparabolicity, mass mismatch, electron interactions and applied-field shifts are omitted.'),
            h('a',{href:'https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2016/a565b327f85c7721b18f1074dbd69ede_MIT8_04S16_LecNotes11.pdf',target:'_blank',rel:'noopener noreferrer'},'MIT: finite and infinite square wells')),
          d.qwElectricField!==0&&d.qwElectricField!=null&&h('p',{className:'semi-model-note'},'This solver uses zero electric field. A field saved from the earlier schematic is not applied.'),
          h('div',{className:'semi-inspector-controls'},h('button',{type:'button',onClick:function(){speakText(description);}},'Read confinement results')),
          aiBox()
        );
      }

      function renderMemoryCells() {
        var types={
          sram:{name:'SRAM (6T)',color:'#22d3ee',mechanism:'Two cross-coupled inverters maintain a stable state while powered. No periodic refresh is needed.',structure:'6 transistors per cell'},
          dram:{name:'DRAM (1T1C)',color:'#34d399',mechanism:'A capacitor stores charge. Leakage reduces the sensing margin; a valid read or refresh restores it.',structure:'1 transistor + 1 capacitor'},
          flash:{name:'Flash (NOR)',color:'#fbbf24',mechanism:'Stored charge changes transistor threshold. This SLC illustration uses erased = 1 and programmed = 0.',structure:'Illustrative floating-gate cell'},
          nand:{name:'Flash (NAND)',color:'#fb7185',mechanism:'NAND cells form strings. Real devices read/program pages and erase blocks; this small array illustrates the program/erase distinction.',structure:'Illustrative single-level cell'},
          feram:{name:'FeRAM',color:'#c4b5fd',mechanism:'Remanent ferroelectric polarization stores the state. It is not floating-gate charge storage.',structure:'Ferroelectric capacitor + access device'}
        };
        var type=types[d.memType]?d.memType:'sram',mt=types[type],bank=semiMemory(type,(d.memBanks||{})[type],d.memBitValue);
        var address=Math.round(semiNumber(d.memAddress,0,0,15)),bit=bank.bits[address],writeEn=!!d.memWriteEnable,auto=!!d.memAutoRefresh;
        var flash=type==='flash'||type==='nand',volatile=type==='sram'||type==='dram',value=bit==null?'Unknown':String(bit);
        var margin=type==='dram'&&bit!=null?Math.exp(-bank.ages[address]/4):bit==null?0:1;
        function operate(action,steps){
          var next=semiMemoryStep(type,bank,action,{address:address,writeEnable:writeEn,autoRefresh:auto,steps:steps});
          var banks=Object.assign({},d.memBanks||{});banks[type]=next;
          updMulti({memBanks:banks,memBitValue:next.bits[address],memLastAction:action});
          if(announceToSR)announceToSR(next.message);
        }
        var description=mt.name+'. Address '+address+'. Stored model state: '+value+'. Power '+(bank.power?'on':'off')+'. '+mt.mechanism;
        function canvasRef(canvasEl){
          if(!canvasEl)return;
          var surface=prepareCanvas(canvasEl, 440, 240),cx=surface.cx,W=surface.W,H=surface.H;
          cx.fillStyle='#0f172a';cx.fillRect(0,0,W,H);
          cx.textAlign='center';cx.fillStyle=mt.color;cx.font='bold 14px sans-serif';cx.fillText(mt.name+' · address '+address,W/2,24);
          cx.fillStyle='#cbd5e1';cx.font='11px sans-serif';cx.fillText(bank.power?'Powered':'Power off · internal state shown',W/2,44);
          if(type==='sram'){
            cx.strokeStyle=mt.color;cx.lineWidth=2;cx.strokeRect(W*.2,78,W*.2,52);cx.strokeRect(W*.6,78,W*.2,52);
            cx.fillStyle='#e2e8f0';cx.fillText('Inverter',W*.3,108);cx.fillText('Inverter',W*.7,108);
            cx.strokeStyle='#fbbf24';cx.beginPath();cx.moveTo(W*.4,91);cx.lineTo(W*.6,119);cx.moveTo(W*.4,119);cx.lineTo(W*.6,91);cx.stroke();
            cx.fillStyle='#67e8f9';cx.fillText('Q = '+value,W*.3,158);cx.fillText('Q̅ = '+(bit==null?'Unknown':1-bit),W*.7,158);
            cx.fillStyle='#cbd5e1';cx.fillText('Cross-coupled feedback · access devices abstracted',W/2,184);
          }else if(type==='dram'){
            cx.strokeStyle=mt.color;cx.lineWidth=3;cx.beginPath();cx.moveTo(W/2-45,105);cx.lineTo(W/2+45,105);cx.moveTo(W/2-45,127);cx.lineTo(W/2+45,127);cx.stroke();
            cx.fillStyle=bit==null?'#475569':bit?mt.color+'90':'#1e293b';cx.fillRect(W/2-42,108,84,16);
            cx.fillStyle='#cbd5e1';cx.fillText('Storage capacitor · '+value,W/2,83);
            cx.fillText('Sensing margin (illustrative)',W/2,156);
            cx.fillStyle='#334155';cx.fillRect(W*.2,168,W*.6,12);cx.fillStyle=mt.color;cx.fillRect(W*.2,168,W*.6*margin,12);
            cx.fillStyle='#cbd5e1';cx.fillText('Age: '+bank.ages[address]+' lesson steps',W/2,202);
          }else if(type==='feram'){
            cx.fillStyle='#4c1d9580';cx.fillRect(W*.23,85,W*.54,80);cx.strokeStyle='#c4b5fd';cx.lineWidth=3;
            cx.beginPath();cx.moveTo(W*.2,82);cx.lineTo(W*.8,82);cx.moveTo(W*.2,168);cx.lineTo(W*.8,168);cx.stroke();
            cx.fillStyle='#e9d5ff';cx.font='bold 24px sans-serif';
            for(var i=0;i<5;i++)cx.fillText(bit==null?'?':bit?'↑':'↓',W*.3+i*W*.1,136);
            cx.font='11px sans-serif';cx.fillStyle='#cbd5e1';cx.fillText('Remanent polarization · opposite states',W/2,196);
          }else{
            cx.fillStyle='#334155';cx.fillRect(W*.2,148,W*.6,28);
            cx.fillStyle='#c4b5fd';cx.fillRect(W*.3,138,W*.4,6);
            cx.fillStyle=mt.color;cx.fillRect(W*.3,106,W*.4,27);
            cx.fillStyle='#c4b5fd';cx.fillRect(W*.3,95,W*.4,6);
            cx.fillStyle='#64748b';cx.fillRect(W*.3,69,W*.4,21);
            cx.fillStyle='#f8fafc';cx.font='10px sans-serif';cx.fillText('Control gate',W/2,83);
            cx.fillStyle='#0f172a';cx.fillText('Charge storage',W/2,122);
            if(bit===0){cx.fillStyle='#38bdf8';for(var e=0;e<5;e++){cx.beginPath();cx.arc(W*.33+e*W*.085,129,2,0,Math.PI*2);cx.fill();}}
            cx.fillStyle='#cbd5e1';cx.font='11px sans-serif';cx.fillText(bit==null?'State unknown':bit===1?'1: erased':'0: programmed',W/2,199);
          }
          cx.fillStyle='#94a3b8';cx.font='10px sans-serif';cx.fillText('Schematic mechanism · not to scale',W/2,H-12);
        }
        React.useEffect(function(){
          var canvas=document.getElementById('semi-mem-canvas');if(!canvas)return;
          return bindStaticCanvas(canvas,canvasRef);
        }, [tab, subtool,d.motionPaused,d.memType,d.memBanks,d.memAddress,d.memBitValue]);
        return h('section',{'aria-label':'Memory operations workbench'},
          h('div',{className:'semi-study'},h('span',{className:'semi-eyebrow'},'WRITE · RETAIN · READ'),
            h('h4',null,'What keeps a bit stored?'),
            h('p',null,'Select a cell, enable writes, and store a bit. Then test time, refresh, and power loss. Each memory type keeps its own 16-cell experiment. Initial RAM and FeRAM zeros are a prepared teaching state, not a promise about hardware power-up.')),
          h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Memory technology'},Object.keys(types).map(function(key){return h('button',{key:key,type:'button','aria-pressed':type===key,onClick:function(){var banks=Object.assign({},d.memBanks||{});banks[type]=bank;if(!banks[key])banks[key]=semiMemory(key);updMulti({memType:key,memBanks:banks,memWriteEnable:false,memAddress:0,memLastAction:null});}},types[key].name);})),
          h('canvas',{id:'semi-mem-canvas',width:440,height:240,className:'block w-full max-w-5xl mx-auto rounded-lg bg-slate-950 border border-slate-500',role: 'img','aria-label':description}),
          h('div',{className:'semi-study'},
            h('h4',null,'Addressable teaching array'),
            h('p',null,'Select an address. Selecting a cell does not read or write it. “?” means the original bit can no longer be inferred.'),
            h('div',{role:'group','aria-label':'Memory addresses',style:{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8}},bank.bits.map(function(v,index){return h('button',{type:'button',key:index,'aria-pressed':address===index,'aria-label':'Address '+index+': '+(v==null?'unknown':v),onClick:function(){upd('memAddress',index);},style:{minHeight:60,border:address===index?'2px solid #67e8f9':'1px solid #64748b',borderRadius:8,background:address===index?'#164e63':'#0f172a',color:'#f8fafc',padding:8}},
              h('span',{style:{display:'block',fontSize:11,color:'#cbd5e1'}},'Addr '+index),h('strong',{style:{fontSize:20}},v==null?'?':String(v)));})),
            h('p',null,'Selected address '+address+' · stored model state '+value+' · '+(bank.power?'powered':'power off')),
            h('div',{className:'semi-inspector-controls'},
              h('label',null,h('input',{type:'checkbox',checked:writeEn,onChange:function(){upd('memWriteEnable',!writeEn);}}),'Enable writes'),
              h('button',{type:'button',disabled:!bank.power||!writeEn,onClick:function(){operate('write0');}},flash?'Program selected to 0':'Write 0'),
              !flash&&h('button',{type:'button',disabled:!bank.power||!writeEn,onClick:function(){operate('write1');}},'Write 1'),
              h('button',{type:'button',disabled:!bank.power,onClick:function(){operate('read');}},'Read selected'),
              flash&&h('button',{type:'button',disabled:!bank.power||!writeEn,onClick:function(){operate('erase');}},'Erase teaching block to 1'),
              h('button',{type:'button',onClick:function(){operate('power');}},bank.power?'Remove power':'Restore power')),
            h('p',{role:'status'},bank.message),
            bank.lastRead&&h('p',null,'Last read: address '+bank.lastRead.address+' → '+(bank.lastRead.value==null?'unknown':bank.lastRead.value)+'. This is a recorded result, not a live read.')),
          h('div',{className:'semi-study'},h('h4',null,'Test retention'),
            h('p',null,'Lesson step '+bank.clock+'. '+(type==='dram'?'Unrefreshed cells become unknown after six lesson steps. The step count is a deliberately slowed teaching model, not a timing specification.':volatile?'SRAM retains its state over these steps while powered. Remove power to test volatility.':'Nonvolatile storage retains the modeled state when power is removed.')),
            h('div',{className:'semi-inspector-controls'},
              h('button',{type:'button',disabled:!bank.power,onClick:function(){operate('advance',1);}},'Advance 1 step'),
              h('button',{type:'button',disabled:!bank.power,onClick:function(){operate('advance',6);}},'Advance 6 steps'),
              type==='dram'&&h('button',{type:'button',disabled:!bank.power,onClick:function(){operate('refresh');}},'Refresh valid cells'),
              type==='dram'&&h('label',null,h('input',{type:'checkbox',checked:auto,onChange:function(){upd('memAutoRefresh',!auto);}}),'Automatic refresh every 2 steps'),
              h('button',{type:'button',onClick:function(){operate('reset');}},'Reset this memory experiment')),
            h('p',null,mt.mechanism),
            h('p',null,mt.structure+'. '+(volatile?'Volatile storage.':'Nonvolatile storage.'))),
          h('details',{className:'semi-study'},h('summary',null,'Recent operations'),
            bank.log.length?h('ol',null,bank.log.map(function(event,i){return h('li',{key:i},'Step '+event.step+': '+event.message);})):h('p',null,'Your operations will appear here.')),
          h('details',{className:'semi-study'},h('summary',null,'Model assumptions & sources'),
            h('p',null,'Deterministic functional model, not a device timing or reliability simulator. SRAM/DRAM contents become unknown when power is removed; residual charge is omitted. DRAM sensing margin decays as exp(−age/4), with a chosen six-step validity limit. Automatic refresh runs every two lesson steps and only restores still-valid bits. Real retention and refresh depend on the device and temperature. FeRAM reads include any internal restore operation. Flash uses an illustrative single-level-cell convention: erased 1, programmed 0; real devices have implementation-specific encoding and larger pages/blocks. Wear, ECC, disturbances and endurance are omitted.'),
            h('p',null,h('a',{href:'https://www.ti.com/lit/pdf/slaa502',target:'_blank',rel:'noopener noreferrer'},'TI: ferroelectric memory'),' · ',h('a',{href:'https://www.micron.com/sales-support/sales/faqs',target:'_blank',rel:'noopener noreferrer'},'Micron: memory and refresh'),' · ',h('a',{href:'https://community.infineon.com/t5/Knowledge-Base-Articles/How-Erase-Operation-Works-in-NOR-Flash/ta-p/251756',target:'_blank',rel:'noopener noreferrer'},'Infineon: flash erase'))),
          h('div',{className:'semi-inspector-controls'},h('button',{type:'button',onClick:function(){speakText(description+' '+bank.message);}},'Read memory results')),
          aiBox()
        );
      }

      function renderAmplifier() {
        var ampType = d.ampType || 'common-source';
        var Vin = semiNumber(d.ampVin,.01,0,.2); // V peak
        var freq = semiNumber(d.ampFreq,1000,10,100000); // Hz
        var Vdd = semiNumber(d.ampVdd,5,1,12);
        var Rd = semiNumber(d.ampRd,10000,1000,100000); // ohms
        var showBode = !!d.ampShowBode;
        var showDC = d.ampShowDC !== false;
        var biasPoint = semiNumber(d.ampBiasPoint,Vdd/2,0,Vdd);



        var amp = AMP_TYPES[ampType] || AMP_TYPES['common-source'];
        var response=semiAmplifier(amp.gain,Vin,freq,Vdd,Rd,biasPoint,ampType==='common-drain');
        var absGain = Math.abs(response.gain);
        var inverts = amp.gain < 0;
        var Vout = response.sample(0);
        var gainDB = 20 * Math.log10(absGain);

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var surface = prepareCanvas(canvasEl, 440, 240);
          var cx = surface.cx, W = surface.W, H = surface.H;
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          if (showBode) {
            // Bode plot (simplified)
            var padL = 50, padR = 15, padT = 20, padB = 30;
            var gW = W - padL - padR, gH = H - padT - padB;

            // Background grid
            cx.strokeStyle = '#64748B'; cx.lineWidth = 1;
            for (var bx = 0; bx <= 6; bx++) {
              var x = padL + bx * gW / 6;
              cx.beginPath(); cx.moveTo(x, padT); cx.lineTo(x, padT + gH); cx.stroke();
              cx.fillStyle = '#94A3B8'; cx.font = '10px sans-serif'; cx.textAlign = 'center';
              cx.fillText('10^' + bx, x, H - 5);
            }
            for (var by = 0; by <= 4; by++) {
              var y = padT + by * gH / 4;
              cx.beginPath(); cx.moveTo(padL, y); cx.lineTo(padL + gW, y); cx.stroke();
              cx.fillStyle = '#94A3B8'; cx.font = '10px sans-serif'; cx.textAlign = 'right';
              var dbVal = gainDB + 10 - by * 20;
              cx.fillText(dbVal.toFixed(0) + 'dB', padL - 3, y + 3);
            }

            // Bode magnitude curve
            var fLow = response.low; // low-frequency pole
            var fHigh = response.high; // high-frequency pole (GBW)
            cx.strokeStyle = '#22D3EE'; cx.lineWidth = 2; cx.beginPath();
            for (var fi = 0; fi <= 200; fi++) {
              var fLog = fi * 6 / 200;
              var fHz = Math.pow(10, fLog);
              var magLow = 1 / Math.sqrt(1 + Math.pow(fLow / fHz, 2));
              var magHigh = 1 / Math.sqrt(1 + Math.pow(fHz / fHigh, 2));
              var mag = response.response(fHz);
              var magdB = 20 * Math.log10(Math.max(0.01, mag));
              var px = padL + fLog / 6 * gW;
              var py = padT + (gainDB + 10 - magdB) / 80 * gH;
              py = Math.max(padT, Math.min(padT + gH, py));
              if (fi === 0) cx.moveTo(px, py); else cx.lineTo(px, py);
            }
            cx.stroke();

            // -3dB line
            cx.strokeStyle = '#F87171'; cx.lineWidth = 0.5; cx.setLineDash([4, 3]);
            var m3dBY = padT + 13 / 80 * gH;
            cx.beginPath(); cx.moveTo(padL, m3dBY); cx.lineTo(padL + gW, m3dBY); cx.stroke();
            cx.setLineDash([]);
            cx.fillStyle = '#F87171'; cx.font = '10px sans-serif'; cx.textAlign = 'left';
            cx.fillText('-3dB', padL + 3, m3dBY - 3);

            // Freq marker
            var freqLog = Math.log10(freq);
            var markerX = padL + freqLog / 6 * gW;
            cx.strokeStyle = '#F59E0B'; cx.lineWidth = 1; cx.setLineDash([3, 2]);
            cx.beginPath(); cx.moveTo(markerX, padT); cx.lineTo(markerX, padT + gH); cx.stroke();
            cx.setLineDash([]);
            cx.fillStyle = '#F59E0B'; cx.font = 'bold 10px sans-serif'; cx.textAlign = 'center';
            cx.fillText(freq >= 1000 ? (freq / 1000) + 'kHz' : freq + 'Hz', markerX, padT - 5);

            // Axes
            cx.fillStyle = '#94A3B8'; cx.font = '10px sans-serif'; cx.textAlign = 'center';
            cx.fillText('Frequency (Hz)', W / 2, H - 15);
          } else {
            // Time-domain waveforms
            var padL = 15, padR = 15, padT = 15, padB = 10;
            var gW = W - padL - padR, halfH = (H - padT - padB) / 2 - 5;
            var tick = Date.now();

            // Input waveform (top half)
            cx.fillStyle = '#1E293B'; cx.fillRect(padL, padT, gW, halfH);
            cx.strokeStyle = '#22D3EE'; cx.lineWidth = 1.5; cx.beginPath();
            for (var ti = 0; ti <= gW; ti++) {
              var t = ti / gW * 4;
              var vIn = Vin * Math.sin(2 * Math.PI * t + tick / 500);
              var py = padT + halfH / 2 - (vIn / Math.max(.001,Vin * 1.3)) * halfH / 2;
              if (ti === 0) cx.moveTo(padL + ti, py); else cx.lineTo(padL + ti, py);
            }
            cx.stroke();
            // Zero line
            cx.strokeStyle = '#64748B'; cx.lineWidth = 0.5;
            cx.beginPath(); cx.moveTo(padL, padT + halfH / 2); cx.lineTo(padL + gW, padT + halfH / 2); cx.stroke();
            cx.fillStyle = '#22D3EE'; cx.font = '11px sans-serif'; cx.textAlign = 'left';
            cx.fillText('V\u1D62\u2099 = ' + (Vin * 1000).toFixed(0) + ' mV peak', padL + 5, padT + 12);

            // Output waveform (bottom half)
            var outTop = padT + halfH + 10;
            cx.fillStyle = '#1E293B'; cx.fillRect(padL, outTop, gW, halfH);
            cx.strokeStyle = '#34D399'; cx.lineWidth = 1.5; cx.beginPath();
            var VoutPeak = response.peak;
            for (var to = 0; to <= gW; to++) {
              var tOut = to / gW * 4;
              var clipped = response.sample(2 * Math.PI * tOut + tick / 500);
              var pyo = outTop + halfH - 8 - clipped / Vdd * (halfH-24);
              if (to === 0) cx.moveTo(padL + to, pyo); else cx.lineTo(padL + to, pyo);
            }
            cx.stroke();
            // Zero line
            cx.strokeStyle = '#64748B'; cx.lineWidth = 0.5;
            cx.beginPath(); var biasY=outTop+halfH-8-response.bias/Vdd*(halfH-24);
            cx.moveTo(padL,biasY);cx.lineTo(padL+gW,biasY); cx.stroke();
            cx.fillStyle = '#34D399'; cx.font = '11px sans-serif'; cx.textAlign = 'left';
            cx.fillText('Output: '+response.min.toFixed(2)+' to '+response.max.toFixed(2)+' V'+(response.clipped?' · CLIPPED':''),padL+5,outTop+12);
            cx.textAlign='right';cx.fillText('4 periods = '+(4000/freq).toPrecision(3)+' ms',W-15,H-2);

            // Gain label
            cx.fillStyle = '#F59E0B'; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
            cx.fillText('|Av| = ' + response.magnitude.toFixed(2) + ' (' + response.gainDB.toFixed(1) + ' dB)', W / 2, padT + halfH + 7);
          }
        };

        var animRef = React.useRef(null);
        React.useEffect(function() {
          var canvas = document.getElementById('semi-amp-canvas');
          if (!canvas) return;
          function draw() { if (!canvas.isConnected) { cancelAnimationFrame(animRef.current); return; } canvasRef(canvas); if (!d.motionPaused && !semiReducedMotion()) animRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animRef.current); };
        }, [tab, subtool, d.motionPaused, d.ampType, d.ampVin, d.ampFreq, d.ampVdd, d.ampRd, d.ampShowBode, d.ampBiasPoint]);

        return h('div', null,
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            Object.keys(AMP_TYPES).map(function(key) {
              var a = AMP_TYPES[key];
              return pill(a.icon + ' ' + a.name.split(' ')[0], ampType === key, function() {
                upd('ampType', key);
                tryAwardXP('amp-' + key, 8, 'Explored ' + a.name + ' amplifier');
              }, 'amp-' + key);
            })
          ),
          h('canvas', { 
            id: 'semi-amp-canvas', width: 440, height: 240,
            className: 'block w-full max-w-5xl mx-auto rounded-lg bg-slate-950 border border-slate-500',
            role: 'img', 'aria-label': amp.name + ' amplifier. Gain magnitude at '+freq+' Hz is '+response.magnitude.toFixed(2)+'. Output '+response.min.toFixed(3)+' to '+response.max.toFixed(3)+' volts. '+(response.clipped?'Clipped at supply rails.':'Within supply rails.')
          }),
          sliderRow('Input amplitude', Vin * 1000, 0, 200, 1, function(v) { upd('ampVin', v / 1000); }, ' mV'),
          sliderRow('Frequency', freq, 10, 100000, 10, function(v) { upd('ampFreq', v); }, ' Hz'),
          (gradeBand === '6-8' || gradeBand === '9-12') && sliderRow('VDD', Vdd, 1, 12, 0.5, function(v) { upd('ampVdd', v); }, ' V'),
          (gradeBand === '9-12') && ampType !== 'common-drain' && sliderRow('Load resistance', Rd / 1000, 1, 100, 1, function(v) { upd('ampRd', v * 1000); }, ' k\u03A9'),
          h('div', { className: 'flex items-center gap-3 mt-2' },
            pill('\uD83D\uDCC9 Waveform', !showBode, function() { upd('ampShowBode', false); }),
            pill('\uD83D\uDCC8 Bode Plot', showBode, function() { upd('ampShowBode', true); tryAwardXP('amp-bode', 10, 'Explored frequency response'); })
          ),
          // Stats
          sliderRow('Output bias', response.bias, 0, Vdd, .1, function(v){upd('ampBiasPoint',v);}, ' V'),
          h('div',{className:'semi-study'},
            h('h4',{role:'status'},response.clipped?'Output clips at a supply rail':'Output remains within the supply rails'),
            h('p',null,'At '+freq+' Hz: gain magnitude '+response.magnitude.toFixed(2)+' V/V ('+response.gainDB.toFixed(1)+' dB). Output range '+response.min.toFixed(3)+' to '+response.max.toFixed(3)+' V.'),
            h('p',null,'The waveform and Bode plot share one frequency-response model. Increasing input amplitude can flatten the waveform at 0 V or VDD. Moving the output bias changes the available headroom.'),
            h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Amplifier experiments'},
              h('button',{type:'button',onClick:function(){updMulti({ampType:'common-emitter',ampVin:.01,ampVdd:5,ampBiasPoint:2.5,ampRd:10000,ampFreq:1000,ampShowBode:false});}},'Small signal'),
              h('button',{type:'button',onClick:function(){updMulti({ampType:'common-emitter',ampVin:.2,ampVdd:5,ampBiasPoint:2.5,ampRd:10000,ampFreq:1000,ampShowBode:false});}},'Observe clipping')),
            h('details',null,h('summary',null,t('stem.semiconductor.model_assumptions','Model assumptions & sources')),
              h('p',null,'Illustrative voltage gain with a 100 Hz high-pass corner and a low-pass corner of 1 MHz divided by midband gain magnitude. The load-resistance control scales midband gain except in the source follower. This is a teaching transfer function with ideal hard supply limits, not a transistor bias solver. Input trace is auto-scaled; output trace uses 0 V to VDD. The display shows four input periods, with phase shift and frequency attenuation.'),
              h('a',{href:'https://www.analog.com/en/resources/app-notes/an-581.html',target:'_blank',rel:'noopener noreferrer'},'Analog Devices: bias and supply headroom'))),
          h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
            statBadge('Gain at '+freq+' Hz',response.magnitude.toFixed(2)+' ('+response.gainDB.toFixed(1)+' dB)'),
            statBadge('Z\u1D62\u2099', amp.inputZ),
            statBadge('Z\u2092\u1D64\u209C', amp.outputZ),
            statBadge('BW', amp.bandwidth),
            statBadge('Inverts', inverts ? 'Yes' : 'No', inverts ? 'text-amber-400' : 'text-emerald-400')
          ),
          h('div', { className: 'mt-2 p-2 rounded-lg border border-slate-700 bg-slate-800/40 text-xs text-slate-300' }, amp.desc),
          infoBox(gradeText(
            'An amplifier makes small signals bigger! Like a megaphone for electricity. You speak softly in, and it comes out loud!',
            'Amplifiers use transistors to make weak signals stronger. The gain tells you how much bigger the output is. Some amplifiers flip the signal upside down (inversion). They\'re in phones, radios, and speakers!',
            'Voltage gain: A\u1D65 = V\u2092\u1D64\u209C/V\u1D62\u2099. Common source: A\u1D65 = -g\u2098R\u2093 where g\u2098 = 2I\u2093/(V\u2097\u209B-V\u209C\u2095). Bandwidth-gain tradeoff: GBW = A\u1D65 \u00D7 f\u2083\u2093\u0042. Input/output impedance determines loading effects.',
            'Small-signal model: hybrid-\u03C0 for BJT, MOSFET small-signal params: g\u2098 = \u2202I\u2093/\u2202V\u2097\u209B, r\u2092 = 1/(\u03BB\u00B7I\u2093). Miller effect: C\u2098\u2097 = C\u2097\u2093(1+|A\u1D65|). Cascode: improved bandwidth via reduced Miller effect. Diff pair CMRR = A\u2093\u2098/A\u1D9C\u2098 \u221D g\u2098R\u209B\u209B. Noise figure: NF = 10\u00B7log(1 + v\u2099\u00B2/(4kTR\u209B)).'
          )),
          h('div', { className: 'flex gap-2 mt-2' },
            btn('\uD83E\uDD16 AI Explain', function() { askAI(amp.name + ' amplifier gain and frequency response'); }, 'transition-colors bg-indigo-600 text-white hover:bg-indigo-700'),
            btn('\uD83D\uDD0A Read', function() { speakText(amp.name + '. Gain magnitude at this frequency is ' + response.magnitude.toFixed(2) + ', or ' + response.gainDB.toFixed(1) + ' decibels. Input impedance: ' + amp.inputZ + '. ' + (inverts ? 'This amplifier inverts the signal.' : 'This amplifier does not invert.')); }, 'transition-colors bg-slate-600 text-slate-200 hover:bg-slate-700')
          ),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // CHALLENGE MODE — 10-Tier Progression
      // ════════════════════════════════════════════
      var CHALLENGES = [
        // Tier 0 — Cadet
        { q: 'Silicon has a band gap of ~1.12 eV. Is it a conductor, semiconductor, or insulator?', a: 'Semiconductor', opts: ['Conductor', 'Semiconductor', 'Insulator'], xp: 10, tier: 0, hint: t('stem.semiconductor.band_gaps_between_0_5_and_3_5_ev_are_s', 'Band gaps between 0.5 and 3.5 eV are semiconductors.'), topic: 'bandgap' },
        { q: 'Phosphorus has 5 valence electrons. Adding it to silicon creates what type?', a: 'N-type', opts: ['N-type', 'P-type', 'Intrinsic'], xp: 10, tier: 0, hint: t('stem.semiconductor.extra_electrons_n_for_negative_charge_', 'Extra electrons = N for Negative charge carriers.'), topic: 'doping' },
        { q: 'Which logic gate outputs HIGH only when BOTH inputs are HIGH?', a: 'AND', opts: ['OR', 'AND', 'XOR', 'NAND'], xp: 10, tier: 0, hint: t('stem.semiconductor.think_of_it_as_multiplication_1_1_1_ev', 'Think of it as multiplication: 1\u00D71=1, everything else=0.'), topic: 'gates' },
        // Tier 1 — Technician
        { q: 'In a P-N junction at equilibrium, the depletion region has:', a: 'No free carriers', opts: ['Maximum current', 'No free carriers', 'Only holes'], xp: 15, tier: 1, hint: t('stem.semiconductor.carriers_recombine_at_the_junction_lea', 'Carriers recombine at the junction leaving fixed ions.'), topic: 'pnjunction' },
        { q: 'To turn ON an N-channel MOSFET, the gate voltage must be:', a: 'Above the threshold voltage', opts: ['Below the threshold voltage but positive', 'Above the threshold voltage', 'Negative with respect to the source'], xp: 15, tier: 1, hint: t('stem.semiconductor.positive_gate_attracts_electrons_to_fo', 'Positive gate attracts electrons to form a channel.'), topic: 'transistor' },
        { q: 'Forward biasing a P-N junction means:', a: 'Positive to P, negative to N', opts: ['Positive to P, negative to N', 'Negative to P, positive to N', 'No voltage'], xp: 15, tier: 1, hint: t('stem.semiconductor.forward_pushing_carriers_toward_the_ju', 'Forward = pushing carriers TOWARD the junction.'), topic: 'pnjunction' },
        { q: 'In intrinsic silicon near room temperature, heating generally makes conductivity:', a: 'Increases', opts: ['Increases', 'Decreases', 'Stays the same'], xp: 15, tier: 1, hint: t('stem.semiconductor.more_thermal_energy_more_electron_hole', 'More thermal energy = more electron-hole pairs.'), topic: 'bandgap' },
        // Tier 2 — Engineer
        { q: 'A NAND gate is called "universal" because:', a: 'Any logic function can be built from NANDs', opts: ['It switches faster than any other gate type', 'Any logic function can be built from NANDs', 'It uses fewer transistors than any other gate'], xp: 20, tier: 2, hint: t('stem.semiconductor.nand_can_implement_not_and_or_everythi', 'NAND can implement NOT, AND, OR \u2014 everything!'), topic: 'gates' },
        { q: 'In CMOS technology, what does the "C" stand for?', a: 'Complementary', opts: ['Complementary', 'Conductive', 'Capacitive', 'Compound'], xp: 20, tier: 2, hint: t('stem.semiconductor.pmos_nmos_work_as_a_complementary_pair', 'PMOS + NMOS work as a complementary pair.'), topic: 'transistor' },
        { q: 'GaAs is better than Si for high-frequency applications because:', a: 'Higher electron mobility', opts: ['Larger band gap', 'Higher electron mobility', 'Its lower cost makes fast parts affordable', 'It carries heat away faster than silicon'], xp: 20, tier: 2, hint: t('stem.semiconductor.speed_mobility_gaas_8500_vs_si_1400_cm', 'Speed \u221D mobility. GaAs: 8500 vs Si: 1400 cm\u00B2/Vs.'), topic: 'bandgap' },
        // Tier 3 — Specialist
        { q: 'A Zener diode operates in which region?', a: 'Reverse breakdown', opts: ['Forward bias above its knee voltage', 'Reverse breakdown', 'Cutoff with no current flowing'], xp: 25, tier: 3, hint: t('stem.semiconductor.zener_diodes_are_designed_to_conduct_i', 'Zener diodes are designed to conduct in reverse!'), topic: 'ivcurve' },
        { q: 'In a MOSFET, the gate oxide (SiO\u2082) acts as:', a: 'An insulator between gate and channel', opts: ['A conductor carrying current into the channel', 'An insulator between gate and channel', 'A semiconductor that switches with the gate'], xp: 25, tier: 3, hint: t('stem.semiconductor.the_o_in_mos_stands_for_oxide_insulato', 'The "O" in MOS stands for Oxide (insulator).'), topic: 'transistor' },
        { q: 'Boron doping creates which type of majority carriers?', a: 'Holes', opts: ['Electrons', 'Holes', 'Protons', 'Neutrons'], xp: 20, tier: 3, hint: t('stem.semiconductor.boron_has_3_valence_electrons_1_fewer_', 'Boron has 3 valence electrons (1 fewer than Si).'), topic: 'doping' },
        // Tier 4 — Master
        { q: 'The built-in potential of a Si P-N junction at 300K is approximately:', a: '0.6-0.7 V', opts: ['0.1-0.2 V', '0.6-0.7 V', '1.5-2.0 V', '5.0 V'], xp: 30, tier: 4, hint: t('stem.semiconductor.v_kt_q_ln_n_n_n_for_typical_doping_lev', 'V\u2091\u1D62 = (kT/q)ln(N\u2090N\u2093/n\u1D62\u00B2) for typical doping levels.'), topic: 'pnjunction' },
        { q: 'Which material has the widest band gap?', a: 'Diamond', opts: ['Silicon', 'GaAs', 'Diamond', 'Germanium'], xp: 25, tier: 4, hint: t('stem.semiconductor.carbon_forms_very_strong_bonds', 'Carbon forms very strong bonds.'), topic: 'bandgap' },
        { q: 'In CMOS, static power dissipation is ideally:', a: 'Zero', opts: ['Zero', 'Proportional to frequency', 'Constant', 'Proportional to VDD'], xp: 30, tier: 4, hint: t('stem.semiconductor.in_cmos_one_transistor_is_always_off_b', 'In CMOS, one transistor is always OFF blocking current.'), topic: 'transistor' },
        // Tier 5+ — Grandmaster
        { q: 'The Shockley diode equation ideality factor n equals 1 when:', a: 'Diffusion current dominates', opts: ['Recombination dominates', 'Diffusion current dominates', 'Tunneling occurs', 'Avalanche breakdown'], xp: 40, tier: 5, hint: t('stem.semiconductor.n_1_for_ideal_junction_n_2_for_recombi', 'n=1 for ideal junction, n=2 for recombination in depletion region.'), topic: 'ivcurve' },
        { q: 'GaN is preferred for power electronics because of its:', a: 'Wide band gap and high breakdown field', opts: ['Lower manufacturing cost than silicon devices', 'Wide band gap and high breakdown field', 'Higher electron mobility than any semiconductor', 'Ability to run without any heat sinking'], xp: 35, tier: 5, hint: t('stem.semiconductor.e_3_4_ev_allows_higher_voltage_operati', 'E_g = 3.4 eV allows higher voltage operation.'), topic: 'bandgap' },
        { q: 'A half-adder circuit requires which gates?', a: 'XOR + AND', opts: ['OR + NOT', 'XOR + AND', 'NAND + NAND', 'NOR + OR'], xp: 35, tier: 5, hint: t('stem.semiconductor.sum_a_xor_b_carry_a_and_b', 'Sum = A XOR B, Carry = A AND B.'), topic: 'gates' },
        { q: 'The Early effect in BJTs causes:', a: 'Output current to increase with V_CE', opts: ['Output current to decrease as V_CE rises', 'Output current to increase with V_CE', 'Base current to double for every extra volt', 'Thermal runaway at high collector current'], xp: 40, tier: 5, hint: t('stem.semiconductor.higher_v_ce_widens_the_depletion_regio', 'Higher V_CE widens the depletion region into the base.'), topic: 'transistor' },
        // Quantum Wells
        { q: 'In a quantum well, making the well narrower causes energy levels to:', a: 'Spread further apart', opts: ['Move closer together', 'Spread further apart', 'Disappear', 'Stay the same'], xp: 15, tier: 1, hint: t('stem.semiconductor.e_1_l_smaller_box_higher_energy_steps', 'E \u221D 1/L\u00B2 \u2014 smaller box = higher energy steps.'), topic: 'qwell' },
        { q: 'Quantum wells are used in which common device?', a: 'Laser diodes', opts: ['Resistors', 'Laser diodes', 'Capacitors', 'Transformers'], xp: 20, tier: 2, hint: t('stem.semiconductor.telecom_lasers_use_ingaasp_quantum_wel', 'Telecom lasers use InGaAsP quantum wells for precise wavelength control.'), topic: 'qwell' },
        { q: 'In an infinite potential well, the ground state energy is proportional to:', a: 'n\u00B2/L\u00B2', opts: ['n/L', 'n\u00B2/L\u00B2', 'L/n', 'L\u00B2/n'], xp: 30, tier: 4, hint: t('stem.semiconductor.e_n_2m_l', 'E\u2099 = n\u00B2\u03C0\u00B2\u0127\u00B2/(2m*L\u00B2).'), topic: 'qwell' },
        // Memory
        { q: 'SRAM uses how many transistors per bit?', a: '6', opts: ['1', '2', '4', '6'], xp: 10, tier: 0, hint: t('stem.semiconductor.6t_sram_2_cross_coupled_inverters_4t_2', '6T SRAM: 2 cross-coupled inverters (4T) + 2 access transistors.'), topic: 'memory' },
        { q: 'DRAM must be refreshed because:', a: 'The capacitor charge leaks away', opts: ['The access transistors overheat during reads', 'The capacitor charge leaks away', 'Wires corrode', 'Power supply ripple corrupts stored values'], xp: 15, tier: 1, hint: t('stem.semiconductor.dram_stores_bits_as_charge_on_a_tiny_c', 'DRAM stores bits as charge on a tiny capacitor \u2014 it leaks!'), topic: 'memory' },
        { q: 'Flash memory stores data by trapping electrons on a:', a: 'Floating gate', opts: ['Control gate', 'Floating gate', 'Base region', 'Emitter'], xp: 20, tier: 2, hint: t('stem.semiconductor.the_floating_gate_is_electrically_isol', 'The floating gate is electrically isolated by oxide layers.'), topic: 'memory' },
        { q: 'Which memory type is used in CPU L1 cache?', a: 'SRAM', opts: ['DRAM', 'SRAM', 'Flash', 'MRAM'], xp: 20, tier: 3, hint: t('stem.semiconductor.l1_cache_needs_the_fastest_possible_ac', 'L1 cache needs the fastest possible access time.'), topic: 'memory' },
        // Amplifiers
        { q: 'A common-source MOSFET amplifier does what to the signal?', a: 'Amplifies and inverts it', opts: ['Amplifies it without changing its phase', 'Amplifies and inverts it', 'Inverts it without providing any gain', 'Attenuates it and shifts it by 90 degrees'], xp: 15, tier: 1, hint: t('stem.semiconductor.gain_is_negative_a_g_r', 'Gain is negative: A\u1D65 = -g\u2098R\u2093.'), topic: 'amplifier' },
        { q: 'What does a source follower (common drain) provide?', a: 'Gain \u2248 1 with low output impedance', opts: ['High voltage gain with high output impedance', 'Gain \u2248 1 with low output impedance', 'Voltage gain of about ten with inversion', 'Frequency doubling'], xp: 20, tier: 2, hint: t('stem.semiconductor.it_s_a_buffer_unity_gain_impedance_tra', 'It\'s a buffer: unity gain, impedance transformation.'), topic: 'amplifier' },
        { q: 'The gain-bandwidth product (GBW) of an amplifier is:', a: 'Constant', opts: ['Constant', 'Proportional to gain', 'Proportional to bandwidth', 'Random'], xp: 30, tier: 4, hint: t('stem.semiconductor.higher_gain_lower_bandwidth_a_bw_gbw_c', 'Higher gain = lower bandwidth. A\u1D65 \u00D7 BW = GBW = constant.'), topic: 'amplifier' }
      ];

      function renderChallenge() {
        var tier = d.challengeTier || 0;
        var score = d.challengeScore || 0;
        var streak = d.challengeStreak || 0;
        var idx = d.challengeIdx || 0;
        var misses = d.challengeMisses || 0;

        var tierNames = ['Cadet', 'Technician', 'Engineer', 'Specialist', 'Master', 'Grandmaster'];
        var tierColors = ['text-slate-200', 'text-blue-400', 'text-cyan-400', 'text-purple-400', 'text-amber-400', 'text-red-400'];
        var tierName = tierNames[Math.min(tier, tierNames.length - 1)];
        var tierColor = tierColors[Math.min(tier, tierColors.length - 1)];

        var available = CHALLENGES.filter(function(c) { return c.tier <= tier; });
        var current = d.challengeActive ? available[idx % available.length] : null;

        if (!d.challengeActive) {
          return h('div', { className: 'text-center py-6' },
            h('section', { id: 'semiconductor-challenge-howto', className: 'max-w-xl mx-auto mb-4 rounded-xl border border-amber-500/50 bg-amber-950/30 p-3 text-left', 'aria-labelledby': 'semiconductor-challenge-howto-title' },
              h('div', { id: 'semiconductor-challenge-howto-title', className: 'text-sm font-black text-amber-200' }, t('stem.semiconductor.how_challenge_works', 'How Challenge works')),
              h('p', { className: 'mt-1 text-sm text-slate-100 leading-relaxed' }, t('stem.semiconductor.choose_one_answer_misses_unlock_a_hint', 'Choose one answer. Misses unlock a hint; correct answers build your streak and XP.')),
              h('div', { className: 'mt-2 flex flex-wrap gap-2 text-[0.6875rem] text-slate-200' },
                h('span', { className: 'rounded-full bg-slate-800/80 px-2 py-1' }, '1. Read the topic'),
                h('span', { className: 'rounded-full bg-slate-800/80 px-2 py-1' }, '2. Choose an answer'),
                h('span', { className: 'rounded-full bg-slate-800/80 px-2 py-1' }, '3. Review feedback')
              )
            ),
            h('div', { className: 'text-4xl mb-2' }, '\uD83C\uDFC6'),
            h('div', { className: 'text-lg font-bold text-white mb-1' }, t('stem.semiconductor.semiconductor_challenge', 'Semiconductor Challenge')),
            h('div', { className: 'flex justify-center gap-3 mb-3' },
              statBadge('Score', String(score)),
              statBadge('Rank', tierName, tierColor),
              statBadge('Streak', streak > 0 ? '\uD83D\uDD25 ' + streak : '0'),
              statBadge('Questions', String(CHALLENGES.length))
            ),
            // Tier progress bar
            h('div', { className: 'w-48 mx-auto mb-4' },
              h('div', { className: 'text-[0.6875rem] text-slate-400 mb-1' }, t('stem.semiconductor.progress_to_next_rank', 'Progress to next rank')),
              h('div', { className: 'h-2 bg-slate-800 rounded-full overflow-hidden' },
                h('div', { className: 'h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all', style: { width: Math.min(100, (score % 5) * 20) + '%' } })
              )
            ),
            btn('\uD83D\uDE80 Start Challenge', function() { updMulti({ challengeActive: true, challengeFeedback: null, challengeAnswer: null, challengeIdx: Math.floor(Math.random() * available.length), challengeShowHint: false }); }, 'bg-gradient-to-r from-cyan-700 to-indigo-600 text-white px-6 py-2 text-sm')
          );
        }

        return h('div', null,
          // Header stats
          h('div', { className: 'flex items-center justify-between mb-3' },
            h('div', { className: 'flex gap-2' },
              statBadge('Score', String(score)),
              statBadge('Streak', streak > 0 ? '\uD83D\uDD25 ' + streak : '0')
            ),
            h('div', { className: 'text-xs font-bold ' + tierColor }, tierName + ' (Tier ' + (tier + 1) + ')'),
            btn('Quit', function() { upd('challengeActive', false); }, 'transition-colors bg-slate-700 text-slate-300 hover:bg-slate-600')
          ),
          // Question card
          h('div', { className: 'p-4 rounded-xl bg-slate-800 border border-slate-700 mb-3' },
            current.topic && h('span', { className: 'text-[0.6875rem] uppercase tracking-wider text-cyan-500 mb-1 block' }, current.topic),
            h('p', { className: 'text-sm font-semibold text-white mb-3', role: 'status' }, current.q),
            h('div', { className: 'flex flex-col gap-2' },
              orderOptions(current.q, current.opts, current.a).map(function(opt) {
                var isSelected = d.challengeAnswer === opt;
                var isCorrect = opt === current.a;
                var showResult = d.challengeFeedback !== null;
                var optClass = 'px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ';
                if (showResult && isSelected && isCorrect) optClass += 'bg-emerald-700 text-white ring-2 ring-emerald-400';
                else if (showResult && isSelected && !isCorrect) optClass += 'bg-red-600 text-white';
                else if (showResult && isCorrect) optClass += 'bg-emerald-600/30 text-emerald-300 border border-emerald-500';
                else optClass += 'border border-slate-500 bg-slate-800 text-slate-100 hover:border-cyan-300 hover:bg-slate-700';

                // Native buttons already provide Enter/Space support. Do not merge a
                // no-op a11yClick object here: it overwrites this real answer handler.
                return h('button', {
                  key: opt, type: 'button', disabled: showResult,
                  'aria-pressed': isSelected,
                  onClick: function() {
                    var correct = opt === current.a;
                    var newStreak = correct ? streak + 1 : 0;
                    var newMisses = correct ? misses : misses + 1;
                    updMulti({ challengeAnswer: opt, challengeFeedback: correct ? 'correct' : 'wrong', challengeStreak: newStreak, challengeMisses: newMisses });
                    if (correct) {
                      var bonusXP = newStreak >= 5 ? current.xp * 2 : newStreak >= 3 ? Math.round(current.xp * 1.5) : current.xp;
                      tryAwardXP('ch-' + idx + '-' + score, bonusXP, 'Challenge: ' + current.q.substring(0, 30) + '...');
                      if (stemBeep) stemBeep();
                      if (newStreak >= 5 && stemCelebrate) stemCelebrate();
                    }
                    if (announceToSR) announceToSR(correct ? 'Correct!' : 'Incorrect. The answer is ' + current.a);
                  },
                  className: 'min-h-11 ' + optClass
                }, opt);
              })
            ),
            // Hint (show after 1 miss on this question)
            !d.challengeFeedback && h('div', { className: 'mt-2' },
              d.challengeShowHint
                ? h('div', { className: 'text-xs text-amber-400 bg-amber-900/20 rounded p-2 border border-amber-800' }, '\uD83D\uDCA1 ' + current.hint)
                : btn('\uD83D\uDCA1 Hint', function() { upd('challengeShowHint', true); }, 'transition-colors bg-amber-700/50 text-amber-300 hover:bg-amber-700/70')
            )
          ),
          // Feedback
          d.challengeFeedback && h('div', { className: 'text-center mb-3', role: 'status', 'aria-live': 'polite' },
            h('p', { className: 'text-sm font-bold ' + (d.challengeFeedback === 'correct' ? 'text-emerald-400' : 'text-red-400') },
              d.challengeFeedback === 'correct'
                ? '\u2705 Correct! +' + (streak >= 5 ? current.xp * 2 : streak >= 3 ? Math.round(current.xp * 1.5) : current.xp) + ' XP' + (streak >= 3 ? ' (\uD83D\uDD25 streak bonus!)' : '')
                : '\u274C The answer is: ' + current.a
            ),
            d.challengeFeedback === 'wrong' && current.hint && h('div', { className: 'text-xs text-amber-400 mt-1' }, '\uD83D\uDCA1 ' + current.hint),
            h('p', { className: 'text-xs text-slate-300 mt-2' }, d.challengeFeedback === 'correct' ? 'Keep the streak going with the next question.' : 'Review the hint, then use the next question to try again.'),
            h('div', { className: 'mt-2 flex justify-center gap-2 flex-wrap' },
              btn('Next Question \u2192', function() {
                var newScore = d.challengeFeedback === 'correct' ? score + 1 : score;
                var newTier = newScore >= 15 ? 5 : newScore >= 11 ? 4 : newScore >= 8 ? 3 : newScore >= 5 ? 2 : newScore >= 3 ? 1 : 0;
                var newAvailable = CHALLENGES.filter(function(c) { return c.tier <= newTier; });
                updMulti({ challengeScore: newScore, challengeTier: newTier, challengeFeedback: null, challengeAnswer: null, challengeIdx: Math.floor(Math.random() * newAvailable.length), challengeShowHint: false });
              }),
              current.topic && btn('Open ' + getSubtoolLabel(current.topic), function() {
                updMulti({ mode: 'explore', subtool: current.topic, challengeActive: false, challengeFeedback: null, challengeAnswer: null, challengeShowHint: false, aiExplain: null });
                if (announceToSR) announceToSR('Opened ' + getSubtoolLabel(current.topic) + ' simulator');
              }, 'transition-colors bg-cyan-700 text-white hover:bg-cyan-800')
            )
          )
        );
      }

      // ════════════════════════════════════════════
      // BATTLE MODE — CHIP DEFENSE
      // ════════════════════════════════════════════
      function renderBattle() {
        var round = d.battleRound || 0;
        var playerHP = d.battleHP || 5;
        var enemyHP = d.battleEnemyHP || 5;
        var log = d.battleLog || [];
        var feedback = d.battleFeedback;
        var difficulty = d.battleDifficulty || 'cadet';

        var BATTLE_ROUNDS = [
          { enemy: '\uD83D\uDC1B Bug Swarm', desc: t('stem.semiconductor.a_swarm_of_logic_bugs_what_gate_output', 'A swarm of logic bugs! What gate outputs 1 when A=0?'), answer: 'NOT', opts: ['AND', 'NOT', 'OR', 'XOR'], damage: 1, xp: 15 },
          { enemy: '\u26A1 Voltage Spike', desc: t('stem.semiconductor.a_voltage_spike_is_overloading_which_d', 'A voltage spike is overloading! Which device regulates voltage?'), answer: t('stem.semiconductor.zener_diode', 'Zener diode'), opts: ['Resistor', 'Zener diode', 'Capacitor', 'LED'], damage: 1, xp: 15 },
          { enemy: '\uD83D\uDD25 Thermal Runaway', desc: t('stem.semiconductor.temperature_rising_in_a_semiconductor_', 'Temperature rising! In a semiconductor, increasing temp does what to conductivity?'), answer: t('stem.semiconductor.increases_it', 'Increases it'), opts: ['Increases it', 'Decreases it', 'No effect', 'Destroys it'], damage: 1, xp: 20 },
          { enemy: '\uD83D\uDC7E Bit Flipper', desc: t('stem.semiconductor.an_enemy_flipped_all_bits_which_gate_c', 'An enemy flipped all bits! Which gate can invert every signal?'), answer: 'NOT', opts: ['AND', 'OR', 'NOT', 'NAND'], damage: 1, xp: 15 },
          { enemy: '\uD83E\uDDA0 Leakage Virus', desc: t('stem.semiconductor.carriers_are_leaking_what_narrows_the_', 'Carriers are leaking! What narrows the depletion region?'), answer: t('stem.semiconductor.forward_bias', 'Forward bias'), opts: ['Forward bias', 'Reverse bias', 'No bias', 'Heating'], damage: 2, xp: 25 },
          { enemy: '\uD83D\uDCA3 ESD Strike', desc: t('stem.semiconductor.electrostatic_discharge_what_protects_', 'Electrostatic discharge! What protects ICs from ESD?'), answer: t('stem.semiconductor.diode_clamps', 'Diode clamps'), opts: ['Resistors', 'Diode clamps', 'Capacitors', 'Inductors'], damage: 2, xp: 25 },
          { enemy: '\uD83C\uDF0A Clock Jitter', desc: t('stem.semiconductor.clock_is_unstable_cmos_power_dissipati', 'Clock is unstable! CMOS power dissipation is proportional to:'), answer: t('stem.semiconductor.frequency', 'Frequency'), opts: ['Voltage only', 'Frequency', 'Temperature', 'Resistance'], damage: 2, xp: 30 },
          { enemy: '\uD83D\uDC80 BOSS: Short Circuit', desc: t('stem.semiconductor.direct_short_what_is_the_threshold_vol', 'Direct short! What is the threshold voltage of a typical Si MOSFET?'), answer: '~1-2V', opts: ['~0.1V', '~1-2V', '~5V', '~12V'], damage: 3, xp: 50 },
          { enemy: '\uD83C\uDF0A Quantum Tunneler', desc: t('stem.semiconductor.electrons_are_tunneling_through_the_ox', 'Electrons are tunneling through the oxide! In a quantum well, narrower well ='), answer: t('stem.semiconductor.wider_energy_spacing', 'Wider energy spacing'), opts: ['Wider energy spacing', 'Narrower spacing', 'No change', 'Infinite energy'], damage: 2, xp: 25 },
          { enemy: '\uD83D\uDCBE Memory Corruptor', desc: t('stem.semiconductor.memory_bits_are_flipping_which_memory_', 'Memory bits are flipping! Which memory type needs refreshing?'), answer: 'DRAM', opts: ['SRAM', 'DRAM', 'Flash', 'ROM'], damage: 1, xp: 20 },
          { enemy: '\uD83D\uDD0A Noise Invader', desc: t('stem.semiconductor.signal_to_noise_ratio_dropping_what_do', 'Signal-to-noise ratio dropping! What does a differential amplifier reject?'), answer: t('stem.semiconductor.common_mode_noise', 'Common-mode noise'), opts: ['All signals', 'Common-mode noise', 'Differential signals', 'DC voltage'], damage: 2, xp: 30 },
          { enemy: '\uD83D\uDC80 BOSS: Quantum Decoherence', desc: t('stem.semiconductor.final_boss_what_limits_transistor_scal', 'Final boss! What limits transistor scaling below ~1nm gate oxide?'), answer: t('stem.semiconductor.quantum_tunneling', 'Quantum tunneling'), opts: ['Overheating', 'Quantum tunneling', 'Wire resistance', 'Cost'], damage: 3, xp: 60 }
        ];

        if (!d.battleActive) {
          return h('div', { className: 'text-center py-6' },
            h('section', { id: 'semiconductor-battle-howto', className: 'max-w-xl mx-auto mb-4 rounded-xl border border-red-500/50 bg-red-950/25 p-3 text-left', 'aria-labelledby': 'semiconductor-battle-howto-title' },
              h('div', { id: 'semiconductor-battle-howto-title', className: 'text-sm font-black text-red-200' }, t('stem.semiconductor.how_chip_defense_works', 'How Chip Defense works')),
              h('p', { className: 'mt-1 text-sm text-slate-100 leading-relaxed' }, t('stem.semiconductor.answer_to_damage_the_enemy', 'Answer a round to damage the enemy. A miss costs chip HP, so use the prompt and take your time.')),
              h('div', { className: 'mt-2 flex flex-wrap gap-2 text-[0.6875rem] text-slate-200' },
                h('span', { className: 'rounded-full bg-slate-800/80 px-2 py-1' }, '1. Read the threat'),
                h('span', { className: 'rounded-full bg-slate-800/80 px-2 py-1' }, '2. Pick the best answer'),
                h('span', { className: 'rounded-full bg-slate-800/80 px-2 py-1' }, '3. Defend the chip')
              )
            ),
            h('div', { className: 'text-4xl mb-2' }, '\u2694\uFE0F'),
            h('div', { className: 'text-lg font-bold text-white mb-1' }, t('stem.semiconductor.chip_defense', 'Chip Defense')),
            h('div', { className: 'text-sm text-slate-200 mb-3' }, t('stem.semiconductor.protect_your_chip_from_waves_of_hardwa', 'Protect your chip from waves of hardware enemies! Use semiconductor knowledge to fight back.')),
            h('div', { className: 'flex justify-center gap-3 mb-4' },
              statBadge('Best Score', String(d.battleScore || 0)),
              statBadge('Rounds', String(BATTLE_ROUNDS.length))
            ),
            btn('\u2694\uFE0F Start Battle', function() {
              updMulti({ battleActive: true, battleRound: 0, battleHP: 5, battleEnemyHP: 5, battleLog: [], battleFeedback: null });
              tryAwardXP('battle-start', 5, 'Started Chip Defense');
            }, 'bg-gradient-to-r from-red-600 to-orange-700 text-white px-6 py-2 text-sm')
          );
        }

        var currentRound = BATTLE_ROUNDS[round % BATTLE_ROUNDS.length];
        var gameOver = playerHP <= 0;
        var victory = round >= BATTLE_ROUNDS.length;

        if (gameOver || victory) {
          return h('div', { className: 'text-center py-6' },
            h('div', { className: 'text-4xl mb-2' }, victory ? '\uD83C\uDFC6' : '\uD83D\uDCA5'),
            h('div', { className: 'text-lg font-bold ' + (victory ? 'text-emerald-400' : 'text-red-400') + ' mb-2' },
              victory ? 'CHIP DEFENDED!' : 'CHIP DESTROYED!'
            ),
            h('div', { className: 'flex justify-center gap-3 mb-4' },
              statBadge('Rounds', round + '/' + BATTLE_ROUNDS.length),
              statBadge('HP Left', String(playerHP))
            ),
            // Battle log
            log.length > 0 && h('div', { className: 'max-h-32 overflow-y-auto text-xs text-left bg-slate-800/60 rounded-lg border border-slate-700 p-2 mb-3' },
              log.map(function(entry, i) {
                return h('div', { key: i, className: 'py-0.5 ' + (entry.hit ? 'text-emerald-400' : 'text-red-400') }, entry.text);
              })
            ),
            btn('Play Again', function() { updMulti({ battleActive: false }); }, 'transition-colors bg-cyan-700 text-white hover:bg-cyan-700')
          );
        }

        return h('div', null,
          // HP bars
          h('div', { className: 'flex items-center gap-3 mb-3' },
            h('div', { className: 'flex-1' },
              h('div', { className: 'text-[0.6875rem] text-slate-400 mb-0.5' }, t('stem.semiconductor.your_chip', '\uD83D\uDEE1\uFE0F Your Chip')),
              h('div', { className: 'h-3 bg-slate-800 rounded-full overflow-hidden' },
                h('div', { className: 'h-full bg-emerald-500 rounded-full transition-all', style: { width: (playerHP / 5 * 100) + '%' } })
              ),
              h('div', { className: 'text-[0.6875rem] text-emerald-400 mt-0.5' }, playerHP + '/5 HP')
            ),
            h('div', { className: 'text-sm font-bold text-slate-400' }, 'VS'),
            h('div', { className: 'flex-1' },
              h('div', { className: 'text-[0.6875rem] text-slate-400 mb-0.5 text-right' }, currentRound.enemy),
              h('div', { className: 'h-3 bg-slate-800 rounded-full overflow-hidden' },
                h('div', { className: 'h-full bg-red-500 rounded-full transition-all', style: { width: (enemyHP / 5 * 100) + '%' } })
              ),
              h('div', { className: 'text-[0.6875rem] text-red-400 mt-0.5 text-right' }, enemyHP + '/5 HP')
            )
          ),
          // Round info
          h('div', { className: 'text-xs text-slate-200 mb-1' }, 'Round ' + (round + 1) + '/' + BATTLE_ROUNDS.length),
          // Enemy card
          h('div', { className: 'p-4 rounded-xl bg-red-900/20 border border-red-800 mb-3' },
            h('div', { className: 'text-lg mb-1' }, currentRound.enemy),
            h('p', { className: 'text-sm text-white mb-3' }, currentRound.desc),
            h('div', { className: 'flex flex-col gap-2' },
              orderOptions(currentRound.desc, currentRound.opts, currentRound.answer).map(function(opt) {
                var showResult = feedback !== null;
                var isSelected = d.battleFeedback === opt || (showResult && feedback === 'wrong-' + opt);
                var isCorrect = opt === currentRound.answer;
                var optClass = 'px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ';
                if (showResult && isCorrect) optClass += 'bg-emerald-700 text-white ring-2 ring-emerald-400';
                else if (showResult && isSelected) optClass += 'bg-red-600 text-white';
                else optClass += 'bg-slate-700 text-slate-200 hover:bg-slate-600';

                return h('button', { key: opt, disabled: showResult,
                  onClick: function() {
                    var hit = opt === currentRound.answer;
                    var newLog = log.concat([{
                      text: (hit ? '\u2694\uFE0F Hit! ' : '\uD83D\uDCA5 Miss! ') + 'R' + (round + 1) + ': ' + currentRound.enemy + (hit ? ' neutralized!' : ' attacks! -' + currentRound.damage + ' HP'),
                      hit: hit
                    }]);
                    var newPlayerHP = hit ? playerHP : playerHP - currentRound.damage;
                    var newEnemyHP = hit ? 0 : enemyHP;
                    var completedRounds = hit ? round + 1 : round;
                    var battlePatch = {
                      battleFeedback: hit ? 'correct' : 'wrong-' + opt,
                      battleHP: Math.max(0, newPlayerHP),
                      battleEnemyHP: Math.max(0, newEnemyHP),
                      battleLog: newLog
                    };
                    if (Math.max(0, newPlayerHP) <= 0 || completedRounds >= BATTLE_ROUNDS.length) {
                      battlePatch.battleScore = Math.max(d.battleScore || 0, completedRounds);
                    }
                    updMulti(battlePatch);
                    if (hit) {
                      tryAwardXP('battle-r' + round, currentRound.xp, 'Defeated ' + currentRound.enemy);
                      if (stemBeep) stemBeep();
                    }
                  },
                  className: optClass
                }, opt);
              })
            )
          ),
          // Next round
          feedback && h('div', { className: 'mb-2 rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-center text-xs text-slate-100', role: 'status', 'aria-live': 'polite' },
            feedback === 'correct' ? '✅ Hit confirmed. Advance when you are ready.' : '❌ Miss recorded. Review the answer, then try the next round.'
          ),
          feedback && h('div', { className: 'text-center' },
            btn('Next Round \u2192', function() {
              var nextRound = round + 1;
              if (nextRound >= BATTLE_ROUNDS.length) tryAwardXP('battle-victory', 100, 'Survived all rounds in Chip Defense!');
              updMulti({ battleRound: nextRound, battleFeedback: null, battleEnemyHP: 5, battleScore: Math.max(d.battleScore || 0, nextRound) });
            }, feedback === 'correct' ? 'bg-emerald-700 text-white' : 'bg-red-600 text-white')
          ),
          // Log
          log.length > 0 && h('div', { className: 'mt-3 max-h-24 overflow-y-auto text-xs bg-slate-800/60 rounded-lg border border-slate-700 p-2' },
            log.slice(-5).map(function(entry, i) {
              return h('div', { key: i, className: 'py-0.5 ' + (entry.hit ? 'text-emerald-400' : 'text-red-400') }, entry.text);
            })
          )
        );
      }

      // ════════════════════════════════════════════
      // LEARN TAB (grade-differentiated)
      // ════════════════════════════════════════════
      function renderLearn() {
        var TOPICS = [
          {
            title: t('stem.semiconductor.what_is_a_semiconductor', 'What is a Semiconductor?'),
            body: gradeText(
              'Some materials let electricity flow (like metal wires), and some don\'t (like rubber). Semiconductors are special \u2014 they\'re in between! We can control when they let electricity through.',
              'Semiconductors have conductivity between metals and insulators. Silicon is the most common. We control their behavior by adding tiny amounts of other elements (doping) or by applying voltage.',
              'Semiconductors have band gaps of 0.5-3.5 eV. At 0K they\'re insulators, but at room temperature thermal energy promotes some electrons across the gap. Conductivity: \u03C3 = nq\u03BC.',
              'Intrinsic carrier concentration: n\u1D62 = \u221A(N\u1D9CN\u1D65)\u00B7exp(-E_g/2kT). Fermi-Dirac distribution: f(E) = 1/(1+exp((E-E\u1DA0)/kT)). Effective mass accounts for band curvature: m* = \u0127\u00B2(d\u00B2E/dk\u00B2)\u207B\u00B9.'
            )
          },
          {
            title: t('stem.semiconductor.band_gap_energy', 'Band Gap Energy'),
            body: gradeText(
              'Think of it like a wall. Electricity needs to jump over the wall. Small wall = easy (conductor). Huge wall = impossible (insulator). Medium wall = controllable (semiconductor)!',
              'The band gap is the energy electrons need to become free. Conductors: no gap. Insulators: very large gap (>4 eV). Semiconductors: moderate gap that can be overcome with heat or light.',
              'E_g is the energy between valence band maximum and conduction band minimum. Direct gap (GaAs): efficient photon emission. Indirect gap (Si): requires phonon assistance for optical transitions.',
              'Band structure from Bloch theorem: \u03C8(r) = u\u2096(r)\u00B7e^(ik\u00B7r). Direct gap: optical transitions at k\u2080. Indirect gap: requires phonon (momentum change). Varshni: E_g(T) = E_g(0) - \u03B1T\u00B2/(T+\u03B2).'
            )
          },
          {
            title: t('stem.semiconductor.doping_carriers', 'Doping & Carriers'),
            body: gradeText(
              'We add special atoms to make semiconductors work! Some atoms bring extra electrons (N-type). Some create empty spots called holes (P-type). It\'s like adding ingredients to a recipe!',
              'N-type: add atoms with 5 electrons (like Phosphorus) to get extra free electrons. P-type: add atoms with 3 electrons (like Boron) to create holes. Majority carriers determine the type.',
              'Doping concentration N\u2093 or N\u2090 typically 10\u00B9\u2074-10\u00B9\u2078 cm\u207B\u00B3. Mass action law: np = n\u1D62\u00B2 always holds. Fermi level shifts: E\u1DA0-E\u1D62 = kT\u00B7ln(n/n\u1D62) for n-type.',
              'Compensation doping: n = N\u2093-N\u2090 (for N\u2093>N\u2090). Degenerate doping: E\u1DA0 inside band when N\u2093 > N\u1D9C (~10\u00B9\u2079 cm\u207B\u00B3). Carrier freeze-out at low T: n \u2248 \u221A(N\u2093N\u1D9C/2)\u00B7exp(-E\u2093/2kT).'
            )
          },
          {
            title: t('stem.semiconductor.p_n_junction_diodes', 'P-N Junction & Diodes'),
            body: gradeText(
              'When P-type meets N-type, magic happens! A barrier forms that only lets electricity through one way \u2014 like a one-way door. This is called a diode!',
              'At the P-N junction, electrons and holes combine near the boundary creating a depletion region with an electric field. Forward bias: current flows. Reverse bias: current blocked.',
              'Built-in potential V\u2091\u1D62 \u2248 0.6-0.7V for Si. Depletion width W \u221D \u221A(V\u2091\u1D62+V\u1D63). Shockley equation: I = I\u2080(e^(V/nV\u209C)-1). Applications: rectifiers, LEDs, solar cells, Zener regulators.',
              'V\u2091\u1D62 = (kT/q)ln(N\u2090N\u2093/n\u1D62\u00B2). Junction capacitance: C\u2C7C = \u03B5A/W = C\u2C7C\u2080/\u221A(1+V\u1D63/V\u2091\u1D62). Diffusion capacitance: C\u2093 = \u03C4\u1DA0\u00B7g\u2093 = \u03C4\u1DA0\u00B7I/(nV\u209C). Breakdown: V\u2091\u1D63 \u221D E_g\u00B3\u00B2/(N\u2093).'
            )
          },
          {
            title: t('stem.semiconductor.mosfets_digital_logic', 'MOSFETs & Digital Logic'),
            body: gradeText(
              'A transistor is an electric switch! Apply a small voltage to the "gate" and it opens or closes a bigger circuit. Billions of these tiny switches make up your computer!',
              'MOSFETs have a gate, source, and drain. Gate voltage above threshold creates a conductive channel. CMOS uses both N and P type MOSFETs paired together for zero standby power.',
              'MOSFET: I\u2093 = \u03BC\u00B7C\u2092\u2093\u00B7(W/L)\u00B7[(V\u2097\u209B-V\u209C\u2095)V\u2093\u209B - V\u2093\u209B\u00B2/2] (triode). Saturation: I\u2093 = (1/2)\u03BC\u00B7C\u2092\u2093\u00B7(W/L)\u00B7(V\u2097\u209B-V\u209C\u2095)\u00B2. CMOS: P\u2093\u2098\u2099 = C\u2097V\u00B2f.',
              'Subthreshold: I\u2093 = I\u2080\u00B7e^((V\u2097\u209B-V\u209C\u2095)/nV\u209C). Subthreshold swing: SS = n\u00B7V\u209C\u00B7ln(10) \u2248 60-100 mV/dec. Short-channel effects: DIBL, V\u209C\u2095 roll-off. FinFET: improved gate control via 3D geometry.'
            )
          },
          {
            title: t('stem.semiconductor.real_world_applications', 'Real-World Applications'),
            body: gradeText(
              'Semiconductors are in everything! Phones, tablets, cars, toys, and even refrigerators. They help computers think, LEDs make light, and solar panels catch sunshine!',
              'CPUs: billions of transistors doing logic. Memory (RAM/Flash): transistors storing 1s and 0s. LEDs: P-N junctions emitting light. Solar cells: P-N junctions converting light to electricity.',
              'IC fabrication patterns circuits through repeated processing steps. Moore’s Law is a historical growth observation, commonly associated with a two-year doubling interval. Product counts do not directly measure density or performance. Applications include logic, memory, power, RF and photonics.',
              'Advanced transistor designs include FinFET and gate-all-around structures. EUV lithography uses a 13.5nm wavelength. Power electronics: SiC/GaN replacing Si for high-voltage/high-frequency. Quantum computing: superconducting qubits use Josephson junctions.'
            )
          },
          {
            title: t('stem.semiconductor.quantum_confinement', 'Quantum Confinement'),
            body: gradeText(
              'When spaces are super tiny (just a few atoms wide), electrons act like waves! They can only have certain energy steps, like climbing a special staircase.',
              'Quantum wells trap electrons in ultra-thin semiconductor layers (nanometers). The particle-in-a-box model shows that smaller wells = wider energy steps. This is used in lasers and LEDs.',
              'Quantum confinement: when L \u2248 de Broglie wavelength, energy becomes quantized. E\u2099 = n\u00B2\u03C0\u00B2\u0127\u00B2/(2m*L\u00B2). Applications: QW lasers, HEMTs (2DEG), quantum dots (0D), quantum cascade lasers.',
              'Heterostructure design: band offsets determine well depth. Anderson model: \u0394Ec = \u03C7\u2082 - \u03C7\u2081. Finite well corrections reduce bound state count. Superlattices: miniband formation via Kronig-Penney model. Stark effect: QCSE for modulators.'
            )
          },
          {
            title: t('stem.semiconductor.memory_technologies', 'Memory Technologies'),
            body: gradeText(
              'Computer memory is like a notebook for your computer! Some memory forgets when power turns off (volatile). Some remembers forever (non-volatile), like a USB drive!',
              'SRAM (6 transistors/bit) is fastest but biggest \u2192 CPU cache. DRAM (1 transistor + capacitor) is dense but needs refreshing \u2192 main memory. Flash traps electrons on a floating gate \u2192 SSDs and USB drives.',
              'SRAM: bistable cross-coupled inverters, no refresh, 6T cell, access time <1ns. DRAM: 1T1C, refresh every 64ms, trench/stack capacitors. Flash: Fowler-Nordheim tunneling for write, 10\u00B3-10\u2075 P/E cycles. 3D NAND: 100+ vertical layers.',
              'Emerging memories: STT-MRAM (spin-transfer torque, MTJ), ReRAM (resistive switching via filament), PCM (GST phase change), FeRAM (ferroelectric HfO\u2082). Neuromorphic: analog memristive weights. Memory-compute architectures for AI workloads.'
            )
          },
          {
            title: t('stem.semiconductor.amplifier_circuits', 'Amplifier Circuits'),
            body: gradeText(
              'Amplifiers make tiny signals bigger! Like a megaphone for electricity. They\'re in your phone, your speakers, and everywhere sound and signals need a boost!',
              'Transistor amplifiers take a small input signal and produce a bigger output. The gain tells you how much bigger. Common types: common-source (MOSFET), common-emitter (BJT). They have tradeoffs between gain, speed, and impedance.',
              'Voltage gain: A\u1D65 = -g\u2098R\u2093 (common source). Bandwidth-gain tradeoff: GBW = A\u1D65\u00D7f\u2083\u2093\u0042. Source follower: gain \u22481, low Z\u2092\u1D64\u209C. Differential pair: rejects common-mode noise (CMRR). Miller effect limits bandwidth in CE/CS.',
              'Small-signal analysis: hybrid-\u03C0 model. Cascode: stacked transistors reduce Miller effect. Op-amps: A\u2092\u2097 > 10\u2075, virtual ground principle. Feedback: A\u1DA0 = A/(1+A\u03B2). Stability: Barkhausen criterion. Noise: thermal (4kTR), shot (2qI), flicker (1/f).'
            )
          }
        ];

        return h('div', { className: 'space-y-3' },
          h('div', { className: 'flex items-center justify-between' },
            h('div', { className: 'text-sm font-bold text-white' }, t('stem.semiconductor.semiconductor_concepts', '\uD83D\uDCDA Semiconductor Concepts')),
            h('div', { className: 'text-[0.6875rem] text-slate-300 px-2 py-0.5 rounded bg-slate-800' }, 'Grade band: ' + gradeBand)
          ),
          h('section', { id: 'semiconductor-learn-start', className: 'rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-3', 'aria-labelledby': 'semiconductor-learn-start-title' },
            h('div', { id: 'semiconductor-learn-start-title', className: 'text-sm font-black text-cyan-200' }, t('stem.semiconductor.start_here_band_gap_energy', 'Start here: Band Gap Energy')),
            h('p', { className: 'mt-1 text-sm text-slate-100 leading-relaxed' }, t('stem.semiconductor.open_one_card_then_test_the_idea', 'Open one card to build the idea, then test it in the simulator. Band gap energy is the key that connects materials, light, and temperature.')),
            btn('⚡ Try Band Gap simulator', function() {
              updMulti({ mode: 'explore', subtool: 'bandgap', aiExplain: null });
              if (announceToSR) announceToSR('Opened Band Gap simulator from Learn');
            }, 'mt-2 bg-cyan-700 text-white hover:bg-cyan-800')
          ),
          TOPICS.map(function(item, topicIndex) {
            var topicId = 'semiconductor-learn-topic-' + topicIndex;
            return h('details', { className: 'group', key: item.title, open: topicIndex === 0 },
              h('summary', { className: 'cursor-pointer text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors list-none flex items-center gap-1', 'aria-controls': topicId },
                h('span', { className: 'text-[0.6875rem] text-slate-400 group-open:rotate-90 transition-transform', 'aria-hidden': 'true' }, '\u25B6'),
                item.title
              ),
              h('div', { id: topicId, className: 'mt-1 pl-4 text-xs text-slate-300 leading-relaxed' }, item.body)
            );
          }),
          h('div', { className: 'flex gap-2 mt-3' },
            btn('\uD83E\uDD16 AI: Explain all for my level', function() { askAI('comprehensive semiconductor overview for ' + gradeBand + ' student'); }, 'transition-colors bg-indigo-600 text-white hover:bg-indigo-700'),
            btn('\uD83D\uDD0A Read intro', function() { speakText('Semiconductors are materials whose electrical conductivity is between conductors and insulators. Silicon is the most important semiconductor. We control it with doping, temperature, and voltage.'); }, 'transition-colors bg-slate-600 text-slate-200 hover:bg-slate-700')
          ),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // MAIN RENDER
      // ════════════════════════════════════════════
      var subtool = d.subtool || 'bandgap';
      var tab = d.mode || 'explore';
      var navSubtoolIndex = Math.max(0, SUBTOOLS.findIndex(function(item) { return item.id === subtool; }));

      function selectSubtool(next) {
        updMulti({ subtool: next, aiExplain: null, guidedSetupSubtool: null, guidedObservationSaved: null });
        if (typeof canvasNarrate === 'function') canvasNarrate('semiconductor', 'subtoolSwitch', 'Switched to ' + getSubtoolLabel(next) + ' simulation.', { debounce: 500 });
        if (announceToSR) announceToSR('Selected ' + getSubtoolLabel(next) + ' simulation');
      }

      function moveSubtool(direction) {
        var nextIndex = (navSubtoolIndex + direction + SUBTOOLS.length) % SUBTOOLS.length;
        var nextTool = SUBTOOLS[nextIndex] || SUBTOOLS[0];
        selectSubtool(nextTool.id);
      }

      var backBtn = h('button', Object.assign({
        onClick: function() { setStemLabTool(null); if (announceToSR) announceToSR('Returned to STEAM Lab tools'); },
        className: 'semi-action flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-100 hover:border-cyan-400 hover:bg-slate-800 hover:text-white transition-colors mb-3'
      }, a11yClick ? a11yClick(function() { setStemLabTool(null); }) : {}),
        h(ArrowLeft, { size: 14 }), t('stem.semiconductor.back_to_stem_lab', ' Back to STEAM Lab')
      );

      var semiconductorTabKeyDown = function(e, index) {
        var nextIndex = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % 4;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index + 3) % 4;
        else if (e.key === 'Home') nextIndex = 0;
        else if (e.key === 'End') nextIndex = 3;
        if (nextIndex < 0) return;
        e.preventDefault();
        var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
        var nextTab = tabs[nextIndex];
        if (nextTab) { nextTab.focus(); nextTab.click(); }
      };

      var tabBar = h('div', { className: 'semi-mode-tabs flex flex-wrap gap-2 mb-3', role: 'tablist', 'aria-label': t('stem.semiconductor.semiconductor_lab_navigation', 'Semiconductor Lab navigation') },
        ['explore', 'challenge', 'battle', 'learn'].map(function(tb, tabIndex) {
          var labels = { explore: '\uD83D\uDD2C Explore', challenge: '\uD83C\uDFC6 Challenge', battle: '\u2694\uFE0F Battle', learn: '\uD83D\uDCDA Learn' };
          var active = tab === tb;
          return h('button', { key: 'tab-' + tb, type: 'button', role: 'tab',
            id: 'semiconductor-tab-' + tb, 'aria-controls': 'semiconductor-panel-' + tb,
            'aria-selected': active, tabIndex: active ? 0 : -1,
            'data-active': active ? 'true' : 'false',
            onKeyDown: function(e) { semiconductorTabKeyDown(e, tabIndex); },
            onClick: function() { updMulti({ mode: tb, aiExplain: null }); if (announceToSR) announceToSR(tb + ' tab selected'); },
            className: 'semi-mode-tab px-4 py-2 min-h-11 text-sm font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ' +
              (active ? 'bg-cyan-700 text-white shadow-md' : 'bg-slate-800 text-slate-100 hover:bg-slate-700')
          }, labels[tb]);
        })
      );

      // Topic-accent hero band per tab
      var TAB_META = {
        explore:   { accent: '#67e8f9', soft: 'rgba(14,165,233,0.18)', icon: '\uD83D\uDD2C', title: t('stem.semiconductor.explore_diodes_transistors_doping', 'Explore semiconductor behavior'), hint: t('stem.semiconductor.doping_silicon_with_phosphorus_n_type_', 'Begin with one observable change. Compare materials, add a dopant, or bias a junction, then explain what changed and why.') },
        challenge: { accent: '#fbbf24', soft: 'rgba(245,158,11,0.18)', icon: '\uD83C\uDFC6', title: t('stem.semiconductor.challenge_graded_problems', 'Challenge \u2014 graded problems'),              hint: t('stem.semiconductor.bias_a_transistor_calculate_band_gap_e', 'Bias a transistor, calculate band-gap energy, predict current vs voltage. AP Physics 2 + intro EE problems with step-by-step feedback.') },
        battle:    { accent: '#f87171', soft: 'rgba(239,68,68,0.18)',  icon: '\u2694\uFE0F', title: t('stem.semiconductor.battle_head_to_head_circuit_duels', 'Battle \u2014 head-to-head circuit duels'),       hint: t('stem.semiconductor.time_pressure_rounds_build_a_circuit_f', 'Time-pressure rounds: build a circuit faster than the timer. Tests whether semiconductor reasoning is automatic, not just recognized.') },
        learn:     { accent: '#4ade80', soft: 'rgba(34,197,94,0.18)',  icon: '\uD83D\uDCDA', title: t('stem.semiconductor.learn_reference_history', 'Learn \u2014 reference + history'),               hint: t('stem.semiconductor.learn_history_empirical', "Bardeen, Brattain and Shockley developed the transistor at Bell Labs; the 1956 Nobel Prize recognized their work. Moore’s annual 1965 projection was revised toward two-year doubling in 1975. Counts, density and performance are different measures.") }
      };
      var meta = TAB_META[tab] || TAB_META.explore;
      var tabHero = h('div', {
        className: 'semi-tab-hero',
        style: {
          margin: '4px 0 12px',
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
          h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.5 } }, meta.hint)
        )
      );

      var subtoolNav = tab === 'explore' ? h('div', {
        className: 'semi-subtool-nav flex items-center gap-3 mb-3 p-3 rounded-xl bg-slate-800/70 border border-slate-600 flex-wrap',
        role: 'navigation', 'aria-label': t('stem.semiconductor.semiconductor_sub_tools', 'Semiconductor simulations')
      },
        h('label', { htmlFor: 'semiconductor-simulation-select', className: 'text-xs font-bold text-slate-200' }, t('stem.semiconductor.simulation', 'Simulation')),
        h('button', { type: 'button', className: 'semi-nav-step', onClick: function() { moveSubtool(-1); }, 'aria-label': 'Previous simulation', title: 'Previous simulation' }, '\u2190'),
        h('select', {
          id: 'semiconductor-simulation-select', value: subtool,
          onChange: function(e) { selectSubtool(e.target.value); },
          className: 'semi-simulation-select min-h-11 flex-1 min-w-[220px] rounded-lg bg-slate-950 text-slate-100 border border-slate-500 px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-cyan-400',
          'aria-label': t('stem.semiconductor.choose_simulation', 'Choose a semiconductor simulation')
        }, SUBTOOLS.map(function(st) {
          return h('option', { key: st.id, value: st.id }, st.label);
        })),
        h('button', { type: 'button', className: 'semi-nav-step', onClick: function() { moveSubtool(1); }, 'aria-label': 'Next simulation', title: 'Next simulation' }, '\u2192'),
        h('span', { className: 'semi-live-badge', role: 'status' },
          h('span', { className: 'semi-live-dot', 'aria-hidden': 'true' }),
          t('stem.semiconductor.live_model', 'Live model')
        )
      ) : null;

      // Render every mode/subtool in one stable order so hooks inside canvas
      // renderers never change position when a learner switches modes. Only the
      // selected tree is attached below; unmounted canvas effects exit immediately.
      var stableRenderCache = {
        challenge: renderChallenge(),
        battle: renderBattle(),
        learn: renderLearn(),
        bandgap: renderBandGap(),
        doping: renderDoping(),
        pnjunction: renderPNJunction(),
        transistor: renderTransistor(),
        gates: renderLogicGates(),
        ivcurve: renderIVCurve(),
        sandbox: renderCircuitSandbox(),
        waferfab: renderWaferFab(),
        ledspec: renderLedSpectrum(),
        solarcell: renderSolarCell(),
        moorelaw: renderMooreLaw(),
        qwell: renderQuantumWell(),
        memory: renderMemoryCells(),
        amplifier: renderAmplifier()
      };
      var content;
      if (tab === 'challenge') content = stableRenderCache.challenge;
      else if (tab === 'battle') content = stableRenderCache.battle;
      else if (tab === 'learn') content = stableRenderCache.learn;
      else {
        if (subtool === 'bandgap') content = stableRenderCache.bandgap;
        else if (subtool === 'doping') content = stableRenderCache.doping;
        else if (subtool === 'pnjunction') content = stableRenderCache.pnjunction;
        else if (subtool === 'transistor') content = stableRenderCache.transistor;
        else if (subtool === 'gates') content = stableRenderCache.gates;
        else if (subtool === 'ivcurve') content = stableRenderCache.ivcurve;
        else if (subtool === 'sandbox') content = stableRenderCache.sandbox;
        else if (subtool === 'waferfab') content = stableRenderCache.waferfab;
        else if (subtool === 'ledspec') content = stableRenderCache.ledspec;
        else if (subtool === 'solarcell') content = stableRenderCache.solarcell;
        else if (subtool === 'moorelaw') content = stableRenderCache.moorelaw;
        else if (subtool === 'qwell') content = stableRenderCache.qwell;
        else if (subtool === 'memory') content = stableRenderCache.memory;
        else if (subtool === 'amplifier') content = stableRenderCache.amplifier;
        else if (subtool === 'dopeHunt') content = (function() {
          var h = React.createElement;
          var iq = Object.assign({ donorLog:15, tempK:300, material:'Si', intrinsic:false, hypothesis:'', stuckRevealed:false, understood:false, explanation:'', log:[] }, d.dopeHunt || {});
          iq.donorLog = Math.max(10,Math.min(17,Number(iq.donorLog)||15));
          iq.tempK = Math.max(250,Math.min(500,Number(iq.tempK)||300));
          function setIQ(patch) { upd('dopeHunt', Object.assign({}, iq, patch)); }
          var materialKey = {Si:'silicon',Ge:'germanium',GaAs:'gaas'}[iq.material] || 'silicon';
          var discoveryMat = MATERIALS[materialKey], discoveryGap=semiBandGap(discoveryMat,iq.tempK,materialKey);
          var discoveryNi = semiIntrinsic(discoveryMat,iq.tempK,discoveryGap);
          var donors=iq.intrinsic?0:Math.pow(10,iq.donorLog),carriers=semiCarriers(discoveryNi,donors);
          var densityStates={silicon:3.2e19,germanium:1e19,gaas:4.7e17}[materialKey]*Math.pow(iq.tempK/300,1.5);
          var discoveryValid=carriers.n < .1*densityStates;
          var state = donors < discoveryNi ? 'intrinsic' : 'extrinsic';
          var sm = { label:discoveryValid?(state==='intrinsic'?'Intrinsic carriers dominate':'Donor electrons dominate'):'Degenerate regime: outside model',
            color:discoveryValid?'#67e8f9':'#fbbf24',bg:'rgba(14,116,144,.15)',border:'#64748b',
            desc:'N-type donor model: n − p = ND and n × p = ni² at equilibrium.' };
          return h('div', { className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/40 shadow-sm space-y-3' },
            h('h3', { className: 'text-sm font-black text-amber-300' }, t('stem.semiconductor.doping_discovery_2', '⚗️ Doping discovery')),
            h('p', { className: 'text-[0.75rem] text-slate-300' }, t('stem.semiconductor.adjust_dopant_concentration_temperatur', 'Compare how donor density, temperature and material affect electrons and holes. Change one variable at a time.')),
            h('div', { className: 'p-3 rounded-lg text-center', style: { background: sm.bg, border: '2px solid ' + sm.border } },
              h('div', { className: 'text-base font-black', style: { color: sm.color } }, sm.label),
              h('div', { className: 'text-[0.6875rem] text-slate-300 mt-1' }, sm.desc),
              h('div', { className: 'text-[0.625rem] text-slate-400 mt-1 font-mono' }, discoveryValid ? 'Electrons n = '+carriers.n.toExponential(2)+' cm⁻³ · Holes p = '+carriers.p.toExponential(2)+' cm⁻³' : 'The nondegenerate approximation cannot reliably estimate carriers here.')
            ),
            h('div', { className: 'flex gap-2' },
              ['Si', 'Ge', 'GaAs'].map(function(m) {
                var active = iq.material === m;
                return h('button', { key: m, onClick: function() { setIQ({ material: m }); }, className: 'px-2 py-1 rounded text-[0.6875rem] font-bold border ' + (active ? 'bg-amber-300 text-slate-950 border-amber-400' : 'bg-slate-900/70 text-slate-300 border-slate-700') }, m);
              })
            ),
            h('div', { className: 'grid grid-cols-2 gap-3' },
              [{ k: 'donorLog', l: 'Donor density exponent (10^x cm⁻³)', mn: 10, mx: 17, st: 1 },
               { k: 'tempK', l: 'Temperature (K)', mn: 250, mx: 500, st: 10 }].map(function(s) {
                return h('div', { key: s.k },
                  h('label', { htmlFor: 'dh-' + s.k, className: 'block text-[0.6875rem] font-bold text-slate-300' }, s.l + ': ', h('span', { className: 'font-mono text-amber-300' }, iq[s.k])),
                  h('input', { id: 'dh-' + s.k, type: 'range', min: s.mn, max: s.mx, step: s.st, value: iq[s.k], disabled: s.k === 'donorLog' && !!iq.intrinsic,
                    onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                    className: 'w-full', 'aria-label': s.l }));
              })
            ),
            h('div', { className: 'flex gap-2 items-center flex-wrap' },
              h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ donors: donors, t: iq.tempK, m: iq.material, st: state, n: discoveryValid?carriers.n:null, p: discoveryValid?carriers.p:null }]).slice(-8) }); }, className: 'px-2 py-1 rounded bg-slate-700 text-[0.6875rem] font-bold text-slate-100 border border-slate-600' }, t('stem.semiconductor.log', '📋 Log')),
              h('button', { onClick: function() { setIQ({ donorLog: 15, intrinsic:false, tempK: 300, material: 'Si', log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-slate-900/70 text-[0.6875rem] font-semibold text-slate-300 border border-slate-700' }, t('stem.semiconductor.reset', '↺ Reset'))
            ),
            (iq.log || []).length > 0 && h('div',{className:'semi-study'},h('table',null,
              h('caption',null,'Recent comparisons (up to 8)'),
              h('thead',null,h('tr',null,['Material','Temperature','Donors','Electrons'].map(function(label){return h('th',{key:label,scope:'col'},label);}))),
              h('tbody',null,iq.log.map(function(entry,i){return h('tr',{key:i},
                h('td',null,entry.m),h('td',null,entry.t+' K'),
                h('td',null,entry.donors==null?'Legacy entry':entry.donors.toExponential(1)+' cm⁻³'),
                h('td',null,entry.n==null?'Outside model':entry.n.toExponential(1)+' cm⁻³'));})))),
            h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, 'aria-label': t('stem.semiconductor.hypothesis_input', 'Semiconductor carrier concentration hypothesis'), placeholder: t('stem.semiconductor.hypothesis_how_does_temperature_affect', 'Hypothesis: How does temperature affect carrier concentration?'),
              className: 'w-full text-[0.75rem] border border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-400 rounded p-2 font-mono leading-snug', rows: 3 }),
            !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-900/30 text-[0.6875rem] font-bold text-amber-200 border border-amber-700' }, t('stem.semiconductor.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
            iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-900/20 border border-amber-700 text-[0.6875rem] text-amber-100 leading-relaxed' },
              h('ul', { className: 'list-disc pl-5 space-y-1' },
                h('li', null, t('stem.semiconductor.compare_si_and_gaas_at_same_concentrat', 'Compare Si and GaAs at same concentration. Why differ?')),
                h('li', null, t('stem.semiconductor.find_two_settings_producing_same_regim', 'Find two settings producing same regime.')))),
            h('label', { className: 'flex items-center gap-2 text-[0.75rem] font-bold text-emerald-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
              t('stem.semiconductor.i_understand_explain_in_own_words', 'I understand — explain in own words')),
            iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, 'aria-label': t('stem.semiconductor.explanation_input', 'Explain semiconductor carrier concentration'), placeholder: t('stem.semiconductor.explain_how_concentration_temperature_', 'Explain how concentration, temperature, and material jointly set the regime.'),
              className: 'w-full text-[0.75rem] border border-emerald-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-400 rounded p-2 font-mono leading-snug mt-2', rows: 4 }),
            h('label',{className:'semi-reading'},h('input',{type:'checkbox',checked:!!iq.intrinsic,onChange:function(e){setIQ({intrinsic:e.target.checked});}}),' Intrinsic sample (no donors)'),
            h('p',{className:'semi-reading'},'Donors ND = '+donors.toExponential(2)+' cm⁻³; intrinsic ni = '+discoveryNi.toExponential(2)+' cm⁻³.'),
            h('p',{className:'semi-model-note'},'Assumes fully ionized donors, no acceptors, and thermal equilibrium at 250–500 K. Values are withheld when n exceeds 10% of the conduction-band density of states; Fermi–Dirac statistics are then needed. Freeze-out, compensation and mobility are not modeled.')
          );
        })();
        else content = stableRenderCache.bandgap;
      }

      // Enhanced snapshot with context
      var snapshotLabel = t('stem.semiconductor.snapshot', '\uD83D\uDCF8 Snapshot');
      var snapshotButtonCount = Array.isArray(toolSnapshots) ? toolSnapshots.filter(function(item) { return item && item.tool === 'semiconductor'; }).length : 0;
      if (snapshotButtonCount > 0) snapshotLabel += ' (' + snapshotButtonCount + ')';
      var snapshotBtn = h('button', { onClick: function() {
          var rows=tab==='explore'?experimentEvidence(d):[];
          var label='Semi: '+(tab==='explore'?getSubtoolLabel(subtool):tab)+(rows.length?' — '+rows.slice(0,2).map(function(row){return row[0]+': '+String(row[1]).slice(0,100);}).join(' · '):' session');
          var entry=semiCapture(Object.assign({},d,{subtool:subtool,mode:tab}),label,rows);
          setToolSnapshots(function(prev) {
            var snapshots = Array.isArray(prev) ? prev : [];
            return snapshots.concat([entry]);
          });
          addToast('Snapshot and live values saved to your notebook.','success');
          if(announceToSR)announceToSR('Snapshot saved');
        },
        className: 'semi-snapshot mt-3 ml-auto px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-cyan-700 to-indigo-600 rounded-full hover:from-cyan-700 hover:to-indigo-600 shadow-md hover:shadow-lg transition-all',
        'aria-label': snapshotLabel + '. Save the current Semiconductor Lab state to your notebook.',
        title: 'Save current state to notebook'
      }, snapshotLabel);

      var currentSubtool = SUBTOOLS.find(function(st) { return st.id === subtool; }) || SUBTOOLS[0];
      var activeMaterial = MATERIALS[d.material] || MATERIALS.silicon;
      var activeTemp = d.temperature || 300;
      var activeBandGap = semiBandGap(activeMaterial,activeTemp,d.material||'silicon');
      var chipRoutes = [
        { label: t('stem.semiconductor.route_band_structure', 'Band structure'), value: activeBandGap.toFixed(2) + ' eV', note: activeMaterial.name, accent: '#38bdf8', onClick: function() { updMulti({ mode: 'explore', subtool: 'bandgap', aiExplain: null }); } },
        { label: t('stem.semiconductor.route_doping', 'Doping'), value: (DOPANTS[d.dopant] || DOPANTS.none).name, note: (d.dopantCount || 3) + ' dopants on the lattice', accent: '#f59e0b', onClick: function() { updMulti({ mode: 'explore', subtool: 'doping', aiExplain: null }); } },
        { label: t('stem.semiconductor.route_junctions', 'Junctions'), value: ((d.pnBias || 0).toFixed(1)) + ' V', note: t('stem.semiconductor.route_junctions_note', 'Bias a diode or LED'), accent: '#a78bfa', onClick: function() { updMulti({ mode: 'explore', subtool: 'pnjunction', aiExplain: null }); } },
        { label: t('stem.semiconductor.route_chip_logic', 'Chip logic'), value: d.gateExperiment==='halfadder'?'Half adder':semiLogic(d.gateType).type, note: t('stem.semiconductor.route_chip_logic_note', 'Build gates and CMOS flow'), accent: '#34d399', onClick: function() { updMulti({ mode: 'explore', subtool: 'gates', aiExplain: null }); } },
        { label: t('stem.semiconductor.route_solar_led', 'Solar + LED'), value: semiLed(d).mix?'RGB mix':semiLed(d).current + ' mA', note: t('stem.semiconductor.route_solar_led_note', 'Turn photons into power and color'), accent: '#fb7185', onClick: function() { updMulti({ mode: 'explore', subtool: 'ledspec', aiExplain: null }); } },
        { label: t('stem.semiconductor.route_practice', 'Practice'), value: tab === 'challenge' ? t('stem.semiconductor.active', 'Active') : t('stem.semiconductor.ready', 'Ready'), note: t('stem.semiconductor.route_practice_note', 'Challenge or Chip Defense'), accent: '#22d3ee', onClick: function() { updMulti({ mode: 'challenge', aiExplain: null }); } }
      ];
      var commandPanel = h('section', {
        'data-semiconductor-command': 'true',
        'aria-labelledby': 'semiconductor-command-title',
        style: {
          margin: '0 0 12px',
          padding: 14,
          borderRadius: 12,
          border: '1px solid rgba(56,189,248,0.30)',
          background: 'radial-gradient(circle at 78% 14%, rgba(56,189,248,0.18), transparent 28%), linear-gradient(135deg, rgba(8,47,73,0.72), rgba(15,23,42,0.96))',
          boxShadow: '0 18px 40px rgba(2,8,23,0.28)'
        }
      },
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 12, alignItems: 'stretch' } },
          h('div', null,
            h('div', { style: { fontSize: 10, fontWeight: 900, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 4 } }, t('stem.semiconductor.command_kicker', 'Chip lab bench')),
            h('h3', { id: 'semiconductor-command-title', style: { margin: 0, color: '#f8fafc', fontSize: 20, lineHeight: 1.15, fontWeight: 900 } }, currentSubtool.label),
            h('p', { style: { margin: '6px 0 12px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.55, maxWidth: '68ch' } }, t('stem.semiconductor.command_copy', 'Choose a question, change one variable, and use the diagram plus the live values to explain what happened.')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(126px, 1fr))', gap: 8 } },
              chipRoutes.map(function(route) {
                return h('button', {
                  key: route.label,
                  type: 'button',
                  onClick: route.onClick,
                  style: {
                    minHeight: 82,
                    padding: '9px 10px',
                    textAlign: 'left',
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.22)',
                    borderLeft: '4px solid ' + route.accent,
                    background: 'rgba(15,23,42,0.62)',
                    color: '#f8fafc',
                    cursor: 'pointer'
                  }
                },
                  h('span', { style: { display: 'block', fontSize: 10, color: route.accent, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 } }, route.label),
                  h('span', { style: { display: 'block', fontSize: 13, fontWeight: 900, lineHeight: 1.2 } }, route.value),
                  h('span', { style: { display: 'block', fontSize: 10, color: '#bae6fd', lineHeight: 1.35, marginTop: 4 } }, route.note)
                );
              })
            )
          ),
          h('div', { style: { borderRadius: 10, border: '1px solid rgba(125,211,252,0.24)', background: 'rgba(2,6,23,0.36)', padding: 10, minHeight: 190 } },
            h('div', { style: { height: 112, borderRadius: 8, border: '1px solid rgba(56,189,248,0.24)', background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(15,23,42,0.84))', position: 'relative', overflow: 'hidden', marginBottom: 9 }, 'aria-hidden': 'true' },
              [18, 32, 46, 60, 74].map(function(x) {
                return h('span', { key: 'v' + x, style: { position: 'absolute', left: x + '%', top: 12, bottom: 12, width: 1, background: 'rgba(125,211,252,0.22)' } });
              }),
              [24, 50, 76].map(function(y) {
                return h('span', { key: 'h' + y, style: { position: 'absolute', left: 18, right: 18, top: y + '%', height: 1, background: 'rgba(125,211,252,0.18)' } });
              }),
              h('span', { style: { position: 'absolute', left: '16%', top: '42%', width: 11, height: 11, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 14px rgba(56,189,248,0.55)' } }),
              h('span', { style: { position: 'absolute', left: '49%', top: '23%', width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 14px rgba(245,158,11,0.55)' } }),
              h('span', { style: { position: 'absolute', left: '71%', top: '61%', width: 11, height: 11, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 14px rgba(52,211,153,0.55)' } }),
              h('span', { style: { position: 'absolute', left: 24, right: 24, top: '50%', height: 2, background: 'linear-gradient(90deg, #38bdf8, #f59e0b, #34d399)', opacity: 0.75 } })
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 } },
              [
                { label: t('stem.semiconductor.status_material', 'Material'), value: activeMaterial.name },
                { label: t('stem.semiconductor.status_temperature', 'Temperature'), value: activeTemp + ' K' },
                { label: t('stem.semiconductor.status_workspace', 'Workspace'), value: currentSubtool.short },
                { label: t('stem.semiconductor.status_xp', 'XP'), value: String(getStemXP ? getStemXP() : 0) }
              ].map(function(card) {
                return h('div', { key: card.label, style: { padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.58)' } },
                  h('div', { style: { fontSize: 9, color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase' } }, card.label),
                  h('div', { style: { marginTop: 3, fontSize: 12, color: '#f8fafc', fontWeight: 900, lineHeight: 1.2 } }, card.value)
                );
              })
            )
          )
        )
      );

      var QUICK_STARTS = {
        bandgap: { action: 'Load a room-temperature silicon baseline.', change: 'Turn on Photon Excitation, then switch the material to Glass.', notice: 'Which material lets an electron cross the gap, and why?' },
        doping: { action: 'Load silicon with a small phosphorus dose.', change: 'Increase the dopant count one step at a time.', notice: 'What new majority carrier appears as doping increases?' },
        pnjunction: { action: 'Load an unbiased P-N junction with its field and carriers visible.', change: 'Move the bias to +0.5 V, then to -1.0 V.', notice: 'How do current and depletion width respond?' },
        transistor: { action: 'Load an N-channel MOSFET in its off state.', change: 'Raise the gate voltage slowly until the channel turns on.', notice: 'At what voltage does current begin to flow?' },
        gates: { action: 'Load a NOT gate with input A set to 0.', change: 'Predict the output, then toggle A.', notice: 'Does the output match your prediction?' },
        ivcurve: { action: 'Load a diode at 0 V and room temperature.', change: 'Sweep through reverse and forward bias.', notice: 'Where does current begin increasing sharply?' },
        sandbox: { action: 'Clear the board with a 5 V supply.', change: 'Choose Light an LED, then increase the resistor value.', notice: 'How do the current and component voltage drops change?' },
        waferfab: { action: 'Reset the wafer to the first fabrication stage.', change: 'Advance one stage at a time.', notice: 'What new layer or pattern does each stage add?' },
        ledspec: { action: 'Load a red LED at 20 mA.', change: 'Change current, then compare another LED material.', notice: 'What controls brightness, wavelength, and perceived color?' },
        solarcell: { action: 'Load silicon at standard sunlight and room temperature.', change: 'Lower irradiance, then raise temperature.', notice: 'Which variable changes maximum power most strongly?' },
        moorelaw: { action: 'Load the 2024 product and a two-year doubling reference.', change: 'Change the doubling interval, scale, or product year.', notice: 'Which values are reported data, and which come from your assumption?' },
        qwell: { action: 'Load a 5 nm GaAs/AlGaAs quantum well.', change: 'Narrow the well, then deepen it.', notice: 'How do the allowed energy levels move?' },
        memory: { action: 'Load known SRAM zeros at address 0.', change: 'Enable writes, write 1, then remove and restore power.', notice: 'What survives power loss, and can a read recover an unknown bit?' },
        amplifier: { action: 'Load a common-source amplifier with a 10 mV input.', change: 'Increase the input amplitude, then frequency.', notice: 'When does the output stop being a clean amplified copy?' },
        dopeHunt: { action: 'Load a moderate silicon doping baseline.', change: 'Change concentration, temperature, and material one at a time.', notice: 'Can two different settings produce the same conductivity regime?' }
      };
      var GUIDED_SETUPS = {
        bandgap: { material: 'silicon', temperature: 300, showPhoton: false, showFermi: true, photonNm: 550 },
        doping: { dopant: 'phosphorus', dopantCount: 3, crystalSize: 8, dopingTemp: 300, showResistivity: false },
        pnjunction: { pnBias: 0, pnShowField: true, pnShowCarriers: true, pnShowDepletion: true, pnAnimating: true, pnShowIV: false, pnLedMode: false },
        transistor: { transistorType: 'mosfet-n', gateVoltage: 0, drainVoltage: 5, showCurrentFlow: true, showCMOS: false },
        gates: { gateType: 'NOT', inputA: false, inputB: false, gateExperiment:'single', gateChain: [], showTruthGrid: true },
        ivcurve: { ivDevice: 'diode', ivSweepV: 0, ivTracePoints: [], ivShowIdeal: true, ivTemp: 300 },
        sandbox: { circuitComponents: [], circuitWires: [], circuitSelectedComp: null, circuitVoltage: 5, circuitSimResult: null },
        waferfab: { fabStage: 0, fabVisited:[0], fabCompleted:false, fabMask:'two', fabDoseLog:14, fabEnergy:50, fabAnnealed:false, fabRunning: false, fabTemp: 1000, fabTime: 30, fabDopant: 'phosphorus', fabHistory: [], fabGuided: true },
        ledspec: { ledMaterial: 'red-gan', ledCurrent: 20, ledShowSpectrum: true, ledMixR: 100, ledMixG: 0, ledMixB: 0, ledMixMode: false },
        solarcell: { solarIrradiance: 1000, solarTemp: 300, solarArea: 100, solarMaterial: 'silicon', solarShowPV: true, solarLoadR: 100, solarOpen:false },
        moorelaw: { mooreYear: 2024, mooreDoubling:2, mooreIncludeMulti:true, mooreShowPred: true, mooreLogScale: true, mooreHighlight: null },
        qwell: { qwWidth: 5, qwDepth: 0.3, qwMaterial: 'gaas-algaas', qwModel:'finite', qwSelected:1, qwLevels: 3, qwShowWave: true, qwShowProb: false, qwElectricField: 0 },
        memory: { memType: 'sram', memBitValue: 0, memAddress:0, memLastAction:null, memAutoRefresh:false, memWriteEnable: false, memShowArray: false, memRefreshing: false, memCellCount: 4, memShowTiming: false },
        amplifier: { ampType: 'common-source', ampVin: 0.01, ampFreq: 1000, ampVdd: 5, ampRd: 10000, ampShowBode: false, ampShowDC: true, ampBiasPoint: 2.5 },
        dopeHunt: { dopeHunt: { conc: 5, donorLog:15, intrinsic:false, tempK: 300, material: 'Si', hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] } }
      };
      var quick = QUICK_STARTS[subtool] || QUICK_STARTS.bandgap;
      var guidedSetup = GUIDED_SETUPS[subtool] || GUIDED_SETUPS.bandgap;
      var guidedNotes = d.guidedNotes || {};
      var guidedNote = guidedNotes[subtool] || '';
      var guidedReady = d.guidedSetupSubtool === subtool;

      // Each workspace advances only when the learner changes the variable named
      // in step 2. Unrelated toggles do not create a false completion signal.
      function hasGuidedChange() {
        var hunt = d.dopeHunt || {};
        if (subtool === 'bandgap') return !!d.showPhoton || (d.material || 'silicon') !== 'silicon' || (d.temperature || 300) !== 300;
        if (subtool === 'doping') return (d.dopant || 'phosphorus') !== 'phosphorus' || (d.dopantCount == null ? 3 : d.dopantCount) !== 3;
        if (subtool === 'pnjunction') return Math.abs(d.pnBias || 0) > 0.001;
        if (subtool === 'transistor') return Math.abs(d.gateVoltage || 0) > 0.001;
        if (subtool === 'gates') {var logic=semiLogicExperiment(d);return logic.half||logic.logic.type!=='NOT'||logic.logic.a||logic.recorded.indexOf('1')>=0;}
        if (subtool === 'ivcurve') return Math.abs(d.ivSweepV || 0) > 0.001;
        if (subtool === 'sandbox') return !!(d.circuitComponents && d.circuitComponents.length);
        if (subtool === 'waferfab') return (d.fabStage || 0) > 0;
        if (subtool === 'ledspec') {var light=semiLed(d);return light.mix||light.current!==20||light.key!=='red-gan';}
        if (subtool === 'solarcell') return !!d.solarOpen || (d.solarLoadR == null ? 100 : d.solarLoadR) !== 100 || (d.solarIrradiance == null ? 1000 : d.solarIrradiance) !== 1000 || (d.solarTemp || 300) !== 300;
        if (subtool === 'moorelaw') {var trend=semiMoore(d);return trend.year!==2024||trend.period!==2||!trend.log||!trend.multi;}
        if (subtool === 'qwell') return (d.qwWidth || 5) !== 5 || (d.qwDepth || 0.3) !== 0.3 || d.qwModel==='infinite' || (d.qwMaterial||'gaas-algaas')!=='gaas-algaas';
        if (subtool === 'memory') {var memoryKind=d.memType||'sram',memoryState=semiMemory(memoryKind,(d.memBanks||{})[memoryKind],d.memBitValue);return memoryKind!=='sram'||!memoryState.power||memoryState.clock>0||memoryState.bits.some(function(bit){return bit!==0;});}
        if (subtool === 'amplifier') return (d.ampVin == null ? .01 : d.ampVin) !== .01 || (d.ampFreq || 1000) !== 1000;
        if (subtool === 'dopeHunt') return !!hunt.intrinsic || (hunt.donorLog == null ? 15 : hunt.donorLog) !== 15 || (hunt.tempK || 300) !== 300 || (hunt.material || 'Si') !== 'Si';
        return false;
      }

      var guidedChanged = guidedReady && hasGuidedChange();
      var guidedSaved = guidedChanged && d.guidedObservationSaved === subtool && guidedNote.trim().length >= 12;
      var semiconductorSnapshots = Array.isArray(toolSnapshots) ? toolSnapshots.filter(function(item) { return item && item.tool === 'semiconductor'; }) : [];
      var notebookCount = semiconductorSnapshots.length;
      var guidedNotebookCount = semiconductorSnapshots.filter(function(item) { return String(item.id || '').indexOf('semi-guided-') === 0; }).length;
      var currentSubtoolIndex = SUBTOOLS.findIndex(function(item) { return item.id === subtool; });
      var nextSubtool = SUBTOOLS[(currentSubtoolIndex + 1 + SUBTOOLS.length) % SUBTOOLS.length] || SUBTOOLS[0];
      var activeRoute=SEMI_ROUTES.find(function(r){return r.id===d.learningRoute;});
      if(activeRoute&&activeRoute.steps.indexOf(subtool)>=0){var nextRouteId=activeRoute.steps[(activeRoute.steps.indexOf(subtool)+1)%activeRoute.steps.length];nextSubtool=SUBTOOLS.find(function(st){return st.id===nextRouteId;})||nextSubtool;}
      var progressText = tab === 'challenge' ? 'Answer one question to earn XP.' : tab === 'battle' ? 'Defend the chip one round at a time.' : tab === 'learn' ? 'Read one concept, then test it in Explore.' : guidedSaved ? 'Complete — choose another workspace to keep going.' : guidedChanged ? 'Explain your change to finish this experiment.' : guidedReady ? 'Change one variable to continue.' : 'Start with a guided setup.';
      var guidedProgressStep = guidedSaved ? 3 : guidedChanged ? 2 : guidedReady ? 1 : 0;
      var guidedProgressPercent = Math.round((guidedProgressStep / 3) * 100);
      function openNextWorkspace() {
        updMulti({ mode: 'explore', subtool: nextSubtool.id, guidedSetupSubtool: null, guidedObservationSaved: null, aiExplain: null });
        if (announceToSR) announceToSR('Opened next workspace: ' + nextSubtool.label);
      }
      function applyGuidedSetup() {
        var clearedPredictions = Object.assign({}, predictions); clearedPredictions[subtool] = '';
        var clearedNotes = Object.assign({}, guidedNotes);
        clearedNotes[subtool] = '';
        updMulti(Object.assign({}, guidedSetup, subtool==='memory'?{memBanks:Object.assign({},d.memBanks||{},{sram:semiMemory('sram')})}:subtool==='gates'?{gateRecorded:Object.assign({},d.gateRecorded||{},{NOT:[]})}:{}, {
          guidedSetupSubtool: subtool,
          guidedNotes: clearedNotes,
          guidedPredictions: clearedPredictions,
          guidedObservationSaved: null
        }));
        tryAwardXP('guided-' + subtool, 3, 'Started guided ' + getSubtoolLabel(subtool) + ' experiment');
        if (typeof canvasNarrate === 'function') canvasNarrate('semiconductor', 'guidedSetup', getSubtoolLabel(subtool) + ' guided baseline loaded. Now change one variable and observe the diagram.', { debounce: 300 });
        if (announceToSR) announceToSR(getSubtoolLabel(subtool) + ' guided baseline loaded. Continue with step 2.');
      }
      function updateGuidedNote(value) {
        var nextNotes = Object.assign({}, guidedNotes);
        nextNotes[subtool] = value;
        updMulti({ guidedNotes: nextNotes, guidedObservationSaved: null });
      }

      // Keep numerical evidence with the observation so the notebook records
      // what was compared, not just a learner's prose.


      function experimentEvidence(state) {
        state=Object.assign({},guidedSetup,state);
        if(subtool==='memory'){
          var kind=['sram','dram','flash','nand','feram'].indexOf(state.memType)>=0?state.memType:'sram';
          var mem=semiMemory(kind,(state.memBanks||{})[kind],state.memBitValue),address=Math.round(semiNumber(state.memAddress,0,0,15));
          return [['Technology',kind],['Power',mem.power?'On':'Off'],['Address',String(address)],['Stored model state',mem.bits[address]==null?'Unknown':String(mem.bits[address])],['Known cells',mem.bits.filter(function(bit){return bit!=null;}).length+' / 16'],['Lesson step',String(mem.clock)],['Cell age',kind==='dram'?mem.ages[address]+' steps':'Not applicable']];
        }
        if(subtool==='moorelaw'){
          var trend=semiMoore(state);
          return [['Selected year',String(trend.year)],['Data status',trend.status],['Product',trend.selected?trend.selected.name:'No entry'],['Reported count',trend.included?formatTransistorCount(trend.selected.transistors):'Not compared'],['Compute dies',trend.selected?String(trend.selected.dies):'No entry'],['Doubling interval',trend.period+' years'],['Reference count',semiTrendCount(trend.reference)],['Reported / reference',trend.ratio==null?'Not compared':trend.ratio.toPrecision(3)+' ×'],['Scale',trend.log?'Logarithmic':'Linear'],['Included products',trend.multi?'One or two compute dies':'One compute die']];
        }
        if(subtool==='gates'){
          var logic=semiLogicExperiment(state),path=logic.half?null:semiCMOS(logic.logic.type,logic.logic.a,logic.logic.b);
          return [['Experiment',logic.half?'Half adder':logic.logic.type],['Inputs','A='+ (+logic.logic.a)+(logic.inputs===2?' B='+ (+logic.logic.b):'')],['Output',logic.half?'Sum='+ (+logic.q)+' Carry='+ (+logic.carry):'Q='+ (+logic.q)],['Binary addition',logic.half?(+logic.logic.a)+' + '+(+logic.logic.b)+' = '+(+logic.carry)+(+logic.q)+'₂':'Not an adder'],['Pull-up',path?(path.pullup?'Conducting':'Open'):'Not shown'],['Pull-down',path?(path.pulldown?'Conducting':'Open'):'Not shown'],['Recorded rows',logic.recorded.length+' / '+logic.rows.length]];
        }
        if(subtool==='ledspec'){
          var light=semiLed(state);
          return [['Light source',light.mix?'RGB mixer':light.mat.name],['Drive',light.mix?'RGB '+light.rgb.join(', '):light.current+' mA'],['Emission',light.status],['Spectral form',light.mix?'Separate RGB bands':light.white?'Blue pump + broad phosphor band':'Single illustrative band'],['Centers',light.components.map(function(p){return p.nm+' nm';}).join(', ')],['Relative peaks',light.components.map(function(p){return p.weight.toFixed(2);}).join(', ')],['Peak photon energy',!light.active?'No emission':light.energy==null?'Multiple photon energies':light.energy.toFixed(2)+' eV']];
        }
        if(subtool==='waferfab'){
          var stage=Math.round(semiNumber(state.fabStage,0,0,7)),ox=semiOxidation(state.fabTemp,state.fabTime);
          return [['Stage',(stage+1)+' / 8'],['Oxidation temperature',ox.temperature+' °C'],['Oxidation duration',ox.minutes+' min'],['Relative growth',stage>=2?ox.index.toFixed(2)+' × baseline':'Not grown yet'],['Mask openings',stage>=3?(state.fabMask==='one'?'1':'2'):'Not patterned yet'],['Implant dose',stage>=5?Math.pow(10,semiNumber(state.fabDoseLog,14,12,16)).toExponential(2)+' ions/cm²':'Not implanted yet'],['Implant energy',stage>=5?semiNumber(state.fabEnergy,50,10,150)+' keV':'Not implanted yet'],['Activation',stage>=5?(state.fabAnnealed?'Illustrated':'Not yet illustrated'):'Not implanted yet']];
        }
        if(subtool==='sandbox'){
          var circuit=semiSeries(state.circuitComponents,state.circuitVoltage),parts=Array.isArray(state.circuitComponents)?state.circuitComponents:[];
          return [['Supply voltage',semiNumber(state.circuitVoltage,5,0,12)+' V'],['Components',parts.length?parts.map(function(p){return p.type==='resistor'?(p.ohms==null?1000:String(p.ohms).trim()||'Unset')+' Ω resistor':p.type;}).join(' → '):'Empty'],['State',circuit.status],['Series current',circuit.currentA==null?'Not calculated':(circuit.currentA*1000).toFixed(3)+' mA'],['Supply power',circuit.powerW==null?'Not calculated':(circuit.powerW*1000).toFixed(3)+' mW']];
        }
        if(subtool==='qwell'){
          var mass={'gaas-algaas':.067,'inas-gaas':.023,'gan-algan':.20}[state.qwMaterial]||.067;
          var well=semiQuantum(state.qwWidth,state.qwDepth,mass,state.qwModel==='infinite',state.qwLevels),level=well.levels[Math.round(semiNumber(state.qwSelected,1,1,well.levels.length))-1];
          return [['Model',well.infinite?'Infinite barriers':'Finite barriers'],['Width',well.width+' nm'],['Barrier height',well.infinite?'Infinite':well.depth+' eV'],['Effective mass',well.mass+' mₑ'],['Selected state','n='+level.n],['Energy',level.E.toFixed(4)+' eV'],['Outside probability',(level.outside*100).toFixed(2)+'%']];
        }
        if(subtool==='transistor'){
          var type=state.transistorType||'mosfet-n',m=semiMOS(type,state.gateVoltage,state.drainVoltage);
          return [['Device',state.showCMOS?'CMOS inverter':type],['Control voltage',String(state.gateVoltage)+' V'],['Drain voltage',String(state.drainVoltage)+' V'],['Region',state.showCMOS?'Logic illustration':type==='bjt-npn'?'Qualitative BJT drive':m.region],['Drain current',state.showCMOS||type==='bjt-npn'?'Not calculated':m.currentA==null?'Outside model':(m.currentA*1000).toFixed(3)+' mA']];
        }
        if(subtool==='solarcell'){
          var sm=SOLAR_MATS[state.solarMaterial]||SOLAR_MATS.silicon,sv=semiSolar(sm,state.solarIrradiance,state.solarTemp,state.solarArea,state.solarLoadR,state.solarOpen);
          return [['Material',sm.name],['Irradiance',sv.G+' W/m²'],['Temperature',sv.T+' K'],['Load',state.solarOpen?'Open circuit':sv.R.toPrecision(3)+' Ω'],['Available maximum',sv.Pmax.toFixed(3)+' W'],['Delivered power',sv.loadPower.toFixed(3)+' W'],['Load voltage',sv.loadV.toFixed(3)+' V'],['Load current',sv.loadI.toFixed(3)+' A']];
        }
        if(subtool==='amplifier'){
          var at=state.ampType||'common-source',ap=AMP_TYPES[at]||AMP_TYPES['common-source'],av=semiAmplifier(ap.gain,state.ampVin,state.ampFreq,state.ampVdd,state.ampRd,state.ampBiasPoint,at==='common-drain');
          return [['Input amplitude',semiNumber(state.ampVin,.01,0,.2)+' V'],['Frequency',av.f+' Hz'],['Gain magnitude',av.magnitude.toFixed(2)+' V/V'],['Output minimum',av.min.toFixed(3)+' V'],['Output maximum',av.max.toFixed(3)+' V'],['Clipping',av.clipped?'Yes':'No']];
        }
        if(subtool==='ivcurve'){
          var ivt=semiNumber(state.ivTemp,300,200,400),ivv=semiNumber(state.ivSweepV,0,-6,5),ivd=state.ivDevice||'diode';
          return [['Device',ivd],['Voltage',ivv+' V'],['Temperature',ivt+' K'],['Current',semiIV(ivd,ivv,ivt).toExponential(3)+' A']];
        }
        if (subtool === 'bandgap') {
          var key = state.material || 'silicon', m = MATERIALS[key] || MATERIALS.silicon;
          var temp = Math.max(50, Math.min(800, Number(state.temperature) || 300));
          var gap = semiBandGap(m,temp,key), n = semiIntrinsic(m,temp,gap);
          return [['Material',m.name],['Temperature',temp+' K'],['Band gap',gap.toFixed(3)+' eV'],['Intrinsic carriers',n==null?'Not applicable':n.toExponential(2)+' cm⁻³']];
        }
        if (subtool === 'pnjunction') {
          var j = semiJunction(state.pnBias);
          return [['Bias',j.bias.toFixed(1)+' V'],['Regime',j.regime],['Depletion width',j.valid?j.widthUm.toFixed(3)+' µm':'Outside model'],['Ideal current',j.currentA==null?'Outside model':j.currentA.toExponential(2)+' A']];
        }
        if (subtool === 'doping') {
          var dop = DOPANTS[state.dopant] || DOPANTS.none;
          return [['Dopant',dop.name],['Valence electrons',String(dop.valence)],['Majority carrier',dop.type==='n'?'Electrons':dop.type==='p'?'Holes':'Equal electrons and holes'],['Bulk net charge','Neutral']];
        }
        var fields = {
          transistor:[['Device','transistorType',''],['Gate voltage','gateVoltage',' V'],['Drain voltage','drainVoltage',' V']],
          gates:[['Gate','gateType',''],['Input A','inputA',''],['Input B','inputB','']],
          ivcurve:[['Device','ivDevice',''],['Voltage','ivSweepV',' V'],['Temperature','ivTemp',' K']],
          sandbox:[['Supply voltage','circuitVoltage',' V']],
          waferfab:[['Stage index','fabStage',''],['Temperature','fabTemp',' °C'],['Duration','fabTime',' min']],
          ledspec:[['Emitter','ledMaterial',''],['Current','ledCurrent',' mA']],
          solarcell:[['Material','solarMaterial',''],['Irradiance','solarIrradiance',' W/m²'],['Temperature','solarTemp',' K']],
          moorelaw:[['Selected year','mooreYear','']],
          qwell:[['Well width','qwWidth',' nm'],['Well depth','qwDepth',' eV']],
          memory:[['Memory type','memType',''],['Stored bit','memBitValue','']],
          amplifier:[['Input amplitude','ampVin',' V'],['Frequency','ampFreq',' Hz']]
        }[subtool];
        if (subtool === 'dopeHunt') {
          var hunt=Object.assign({material:'Si',donorLog:15,tempK:300,intrinsic:false},state.dopeHunt||{});
          return [['Material',hunt.material],['Donor density',hunt.intrinsic?'0 cm⁻³':Math.pow(10,Math.max(10,Math.min(17,Number(hunt.donorLog)||15))).toExponential(2)+' cm⁻³'],['Temperature',Math.max(250,Math.min(500,Number(hunt.tempK)||300))+' K']];
        }
        return fields ? fields.map(function(f){var value=state[f[1]] == null ? guidedSetup[f[1]] : state[f[1]];return [f[0],String(value)+f[2]];}) : null;

      }
      var baselineEvidence = experimentEvidence(guidedSetup), currentEvidence = experimentEvidence(d);
      var predictions = d.guidedPredictions || {}, prediction = predictions[subtool] || '';
      var conceptChecks = {
        bandgap:{q:'What does the vertical gap in the energy diagram represent?',choices:['Empty space between atoms','Energy with no allowed bulk electron states','The size of an electron'],answer:1,why:'The vertical axis measures electron energy. Atomic spacing belongs to a crystal model, not an energy-band diagram.'},
        doping:{q:'After donor ionization, which statement describes N-type silicon?',choices:['The whole crystal gains a net negative charge','Mobile protons carry the current','Mobile electrons are balanced by fixed positive donor ions'],answer:2,why:'The added electron can move while the ionized donor stays in the lattice. N-type names the majority carrier; the bulk remains neutral.'},
        pnjunction:{q:'What changes when a small positive voltage is applied to P relative to N?',choices:['The barrier and depletion width decrease','The junction remains at equilibrium until 0.7 V','The barrier and depletion width increase'],answer:0,why:'Any positive applied bias is forward bias. Current grows continuously; 0.7 V is a useful circuit approximation, not an on/off threshold.'}
      };
      Object.assign(conceptChecks,{
        moorelaw:{q:'A product combines two identical dies and doubles its transistor total. What does that show?',choices:['Transistor density must have doubled','The product contains twice as many transistors; density need not change','Every task must run twice as fast'],answer:1,why:'Combining dies increases the product total without requiring smaller transistors. Density needs an area measurement, and performance depends on architecture and workload.'},
        gates:{q:'For a half adder, what is the result of 1 + 1?',choices:['Sum 1, Carry 0','Sum 0, Carry 1','Sum 1, Carry 1'],answer:1,why:'XOR gives Sum 0 when the inputs match, while AND gives Carry 1 when both inputs are 1. The two-bit result is 10₂, which is 2 in decimal.'},
        ledspec:{q:'Red and green LEDs together look yellow. What happens to their spectra?',choices:['They keep their separate emission bands','Every photon changes to a yellow wavelength','Their wavelengths are averaged'],answer:0,why:'The component spectra add. A mixture can look like a single-color source while containing different wavelengths. White light also has no single wavelength.'},
        memory:{q:'Can DRAM refresh reconstruct a bit after its state has become unknown?',choices:['Yes, refresh remembers the original value','No, it can only restore a still-valid sensed state','Only when write protection is on'],answer:1,why:'Refresh restores information that can still be sensed. Once the original bit cannot be distinguished, this model has no information from which to reconstruct it.'},
        waferfab:{q:'Which implant control primarily changes the number of ions delivered per area?',choices:['Dose','Energy','The display magnification'],answer:0,why:'Dose measures ions per area. Energy affects penetration, and activation annealing addresses lattice damage and electrical activation. These are separate process choices.'},
        sandbox:{q:'Why is the steady current zero when an ideal capacitor is in the series path?',choices:['The resistor uses up current','After charging, the ideal capacitor blocks steady DC','The source voltage must be zero'],answer:1,why:'Charge can flow during charging, but the final steady current is zero. A transient model is needed to study the charging process.'},
        qwell:{q:'What do the decaying wavefunction tails in the barriers mean?',choices:['The electron has definitely escaped','The electron can be found in a classically forbidden region','The energy is above the barrier'],answer:1,why:'A finite bound state has nonzero probability inside the barriers even though its energy is below them. Its stationary density stays localized; this is not an escape rate.'},
        transistor:{q:'A channel exists, but drain-to-source voltage is zero. What is the net drain current?',choices:['Zero in this model','Maximum current','Current must cross the gate oxide'],answer:0,why:'Gate voltage forms the channel. A drain-to-source voltage is needed to drive net drain current. The gate oxide insulates the gate.'},
        solarcell:{q:'Why does an illuminated open-circuit cell deliver zero power?',choices:['There are no photons','Its current is zero, so VI is zero','Its voltage is always zero'],answer:1,why:'Power requires voltage and current together. Open circuit has no load current; short circuit has no load voltage. The maximum lies between these endpoints.'},
        amplifier:{q:'What causes the flat peaks in a clipped output waveform?',choices:['The signal changes to a lower frequency','Gain becomes exactly zero','The requested output exceeds the supply rails'],answer:2,why:'The output cannot extend beyond its supply rails in this model. Reduce input amplitude or gain, or center the bias to increase headroom.'},
        ivcurve:{q:'Is a diode an ideal switch that suddenly starts conducting at 0.7 V?',choices:['Yes, current jumps instantly','No, its current changes continuously with voltage','Yes, for every diode and temperature'],answer:1,why:'The diode equation gives continuous current. A fixed forward drop is a circuit approximation. Series resistance limits the rise at high current; temperature also changes the curve.'}
      });
      var check = conceptChecks[subtool], checkedChoice = (d.conceptChoices || {})[subtool];
      var studyEvidence = tab === 'explore' && currentEvidence && h('section',{className:'semi-study','aria-label':'Experiment evidence'},
        h('h4',null,t('stem.semiconductor.evidence_title','Use evidence in your explanation')),
        guidedReady ? h('table',null,
          h('caption',{className:'sr-only'},t('stem.semiconductor.evidence_caption','Guided baseline compared with current settings')),
          h('thead',null,h('tr',null,h('th',{scope:'col'},t('stem.semiconductor.quantity','Quantity')),h('th',{scope:'col'},t('stem.semiconductor.baseline','Baseline')),h('th',{scope:'col'},t('stem.semiconductor.now','Now')))),
          h('tbody',null,currentEvidence.map(function(row,i){return h('tr',{key:row[0]},h('th',{scope:'row'},row[0]),h('td',null,baselineEvidence[i][1]),h('td',null,row[1]));})))
          : h('p',null,t('stem.semiconductor.evidence_setup_help','Load the guided setup to compare a baseline with your changed settings.')),
        h('p',null,t('stem.semiconductor.evidence_sentence','Try: “When I changed ___, ___ changed from ___ to ___. This happened because ___.”')),
        check && h('details',null,h('summary',null,t('stem.semiconductor.check_model','Check your model')),
          h('p',null,check.q),
          h('div',{className:'semi-inspector-controls',role:'group','aria-label':check.q},check.choices.map(function(choice,i){
            return h('button',{key:choice,type:'button','aria-pressed':checkedChoice===i,onClick:function(){
              var next=Object.assign({},d.conceptChoices||{});next[subtool]=i;upd('conceptChoices',next);
            }},choice);
          })),
          checkedChoice != null && h('p',{role:'status'},(checkedChoice===check.answer?'Yes. ':'Reconsider. ')+check.why)))
      ;

      function saveGuidedObservation() {
        if (guidedNote.trim().length < 12 || guidedSaved) return;
        var entry=semiCapture(Object.assign({},d,{subtool:subtool,mode:'explore'}),
          'Guided: '+getSubtoolLabel(subtool)+' — '+guidedNote.trim().slice(0,72),currentEvidence,{
            guidedObservation: guidedNote.trim(),
            guidedPrediction: prediction.trim(),
            guidedEvidence:{baseline:baselineEvidence,observed:currentEvidence}
          });
        setToolSnapshots(function(prev) {
          var snapshots = Array.isArray(prev) ? prev : [];
          return snapshots.concat([entry]);
        });
        upd('guidedObservationSaved', subtool);
        addToast('Observation saved to your lab notebook.', 'success');
        tryAwardXP('guided-explain-' + subtool, 5, 'Explained a ' + getSubtoolLabel(subtool) + ' observation');
        if (announceToSR) announceToSR('Observation saved to your lab notebook. Guided experiment complete.');
      }
      function guidedStepClass(done, active) {
        return 'semi-guided-step rounded-lg border p-2 text-sm ' + (done
          ? 'border-emerald-500/80 bg-emerald-950/40 text-slate-100'
          : active ? 'border-cyan-300 bg-cyan-950/70 text-slate-100' : 'border-slate-500 bg-slate-950/70 text-slate-200');
      }
      function guidedStepState(done, active) {
        return done ? 'done' : active ? 'active' : 'upcoming';
      }
      var quickStart = tab === 'explore' ? h('section', {
        className: 'semi-guided-card mb-3 rounded-xl border border-cyan-400/70 bg-cyan-950/50 p-3',
        'aria-labelledby': 'semiconductor-quick-start-title'
      },
        h('div', { className: 'flex flex-wrap items-center gap-2' },
          h('div', { id: 'semiconductor-quick-start-title', className: 'text-sm font-black text-cyan-100' }, t('stem.semiconductor.guided_experiment', 'Guided experiment')),
          h('span', { className: 'rounded-full border border-cyan-400/50 bg-cyan-950 px-2 py-1 text-[0.6875rem] font-bold text-cyan-50' }, guidedSaved ? t('stem.semiconductor.complete', 'Complete') : guidedProgressStep + '/3 · ' + t('stem.semiconductor.three_short_steps', '3 short steps'))
        ),
        h('ol', { className: 'mt-3', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 } },
          h('li', { className: guidedStepClass(guidedReady, !guidedReady), 'data-state': guidedStepState(guidedReady, !guidedReady) }, h('strong', { className: 'block ' + (guidedReady ? 'text-emerald-300' : 'text-cyan-100') }, guidedReady ? '✓ Baseline loaded' : '1. Set up'), quick.action),
          h('li', { className: guidedStepClass(guidedChanged, guidedReady && !guidedChanged), 'data-state': guidedStepState(guidedChanged, guidedReady && !guidedChanged) }, h('strong', { className: 'block ' + (guidedChanged ? 'text-emerald-300' : 'text-cyan-100') }, guidedChanged ? '✓ Change observed' : '2. Change'), quick.change),
          h('li', { id: 'semiconductor-guided-question', className: guidedStepClass(guidedSaved, guidedChanged && !guidedSaved), 'data-state': guidedStepState(guidedSaved, guidedChanged && !guidedSaved) }, h('strong', { className: 'block ' + (guidedSaved ? 'text-emerald-300' : 'text-cyan-100') }, guidedSaved ? '✓ Explanation saved' : '3. Explain'), quick.notice)
        ),
        h('div', { className: 'mt-3 flex flex-wrap items-center gap-2' },
          h('button', {
            type: 'button', onClick: applyGuidedSetup,
            className: 'semi-action min-h-11 rounded-lg border border-cyan-200/60 bg-cyan-700 px-4 py-2 text-sm font-black text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-300'
          }, guidedReady ? t('stem.semiconductor.reload_baseline', 'Reload baseline') : t('stem.semiconductor.load_guided_setup', 'Load guided setup')),
          guidedReady && h('span', { className: 'text-sm font-semibold ' + (guidedSaved ? 'text-emerald-300' : guidedChanged ? 'text-amber-200' : 'text-cyan-100'), role: 'status' }, guidedSaved
            ? t('stem.semiconductor.experiment_complete', 'Observation saved — experiment complete.')
            : guidedChanged ? t('stem.semiconductor.change_detected', 'Change detected — explain what you observed.')
            : t('stem.semiconductor.baseline_ready', 'Baseline ready — continue with step 2.')),
          guidedSaved && h('button', { type: 'button', onClick: openNextWorkspace, className: 'min-h-10 rounded-lg border border-cyan-400/70 bg-cyan-950/60 px-3 py-2 text-sm font-black text-cyan-100 hover:bg-cyan-900/70 focus:outline-none focus:ring-2 focus:ring-cyan-300' }, 'Next workspace →')
        )

      ) : null;
      var guidedReflection = tab === 'explore' && guidedChanged && h('div', { className: 'mt-3 rounded-lg border border-amber-500/60 bg-slate-950/70 p-3', style: { width: '100%', minWidth: 0, boxSizing: 'border-box' } },
          h('label', { htmlFor: 'semiconductor-guided-observation', className: 'block text-sm font-black text-amber-200' }, t('stem.semiconductor.what_i_observed', 'What I observed and why')),
          h('textarea', {
            id: 'semiconductor-guided-observation', value: guidedNote, rows: 3, maxLength: 500,
            style: { display: 'block', width: '100%', minWidth: 0, boxSizing: 'border-box' },
            onChange: function(e) { updateGuidedNote(e.target.value); },
            placeholder: t('stem.semiconductor.observation_placeholder', 'I observed… This happened because…'),
            className: 'mt-2 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400',
            'aria-describedby': 'semiconductor-guided-question'
          }),
          h('div', { className: 'mt-2 flex flex-wrap items-center gap-2' },
            h('button', {
              type: 'button', onClick: saveGuidedObservation, disabled: guidedNote.trim().length < 12 || guidedSaved,
              'aria-disabled': guidedNote.trim().length < 12 || guidedSaved,
              className: 'min-h-10 rounded-lg px-4 py-2 text-sm font-black focus:outline-none focus:ring-2 focus:ring-amber-300 ' + (guidedNote.trim().length < 12 || guidedSaved ? 'cursor-not-allowed bg-slate-700 text-slate-300' : 'bg-amber-500 text-slate-950 hover:bg-amber-400')
            }, guidedSaved ? t('stem.semiconductor.observation_saved', 'Observation saved') : t('stem.semiconductor.save_observation', 'Save observation')),
            h('span', { className: 'text-xs text-slate-300' }, guidedNote.trim().length < 12 ? t('stem.semiconductor.observation_minimum', 'Write at least 12 characters.') : guidedNote.length + '/500')
          )
        );
      var commandDrawer = tab === 'explore' ? h('details', { className: 'semi-command-drawer mt-4 rounded-xl border border-slate-500 bg-slate-900/80' },
        h('summary', { className: 'cursor-pointer px-4 py-3 text-sm font-bold text-cyan-200 hover:text-white' }, t('stem.semiconductor.open_lab_map', 'Explore more chip-lab activities')),
        h('div', { className: 'px-3 pb-3' }, commandPanel)
      ) : null;


      var notebookEntries=semiNotebookEntries(toolSnapshots),routeProgress=semiRouteProgress(d.learningRoute,notebookEntries);
      function focusExperiment(){requestAnimationFrame(function(){var el=document.getElementById('semiconductor-simulation-select');if(el){el.focus();el.scrollIntoView({block:'nearest'});}});}
      function openRouteLesson(id){updMulti({subtool:id,mode:'explore',guidedSetupSubtool:null,guidedObservationSaved:null,aiExplain:null});focusExperiment();}
      function openNotebook(){upd('notebookOpen',true);requestAnimationFrame(function(){var el=document.querySelector('#semiconductor-notebook-preview summary');if(el){el.focus();el.scrollIntoView({block:'nearest'});}});}
      var learningRoutes=tab==='explore'&&h('details',{className:'semi-study','data-learning-routes':true},
        h('summary',null,'Choose a question / learning route'),
        h('p',null,'Choose a route, then continue to its first lesson without a saved explanation. You can open any lesson directly; selecting a route does not reset an experiment.'),
        h('div',{className:'semi-inspector-controls',role:'group','aria-label':'Learning routes'},SEMI_ROUTES.map(function(route){
          return h('button',{key:route.id,type:'button','aria-pressed':d.learningRoute===route.id,onClick:function(){upd('learningRoute',route.id);},style:{whiteSpace:'normal',textAlign:'left'}},route.question);
        })),
        routeProgress&&h('div',null,
          h('h4',null,routeProgress.route.question),
          h('p',{role:'status'},routeProgress.done.length+' / '+routeProgress.route.steps.length+' lessons with saved explanations. This tracks notebook work, not mastery.'),
          h('ol',null,routeProgress.route.steps.map(function(id){return h('li',{key:id},
            h('button',{type:'button','aria-current':subtool===id?'step':undefined,onClick:function(){openRouteLesson(id);},style:{minHeight:'44px',textAlign:'left'}},'Open '+SEMI_LESSONS[id]),
            ' · '+(routeProgress.done.indexOf(id)>=0?'Explanation saved':subtool===id?'Current lesson':'No saved explanation'));})),
          h('div',{className:'semi-inspector-controls'},btn(routeProgress.next?'Continue route: '+SEMI_LESSONS[routeProgress.next]:'Review route from the beginning',function(){openRouteLesson(routeProgress.next||routeProgress.route.steps[0]);}),
            btn('Leave route',function(){upd('learningRoute',null);})))
      );
      var notebookFilter=d.notebookFilter||'all';
      var filteredEntries=notebookEntries.filter(function(entry){return notebookFilter==='all'||entry.workspace===notebookFilter;}).slice().reverse();
      var comparisonKeys=Array.isArray(d.notebookCompare)?d.notebookCompare:[],comparisonEntries=notebookEntries.filter(function(entry){return comparisonKeys.indexOf(entry.key)>=0;}).slice(0,2);
      var comparison=semiCompare(comparisonEntries[0],comparisonEntries[1]);
      var notebookLimit=Math.round(semiNumber(d.notebookLimit,20,20,10000));
      function toggleComparison(entry){
        var keys=comparisonEntries.map(function(e){return e.key;}),index=keys.indexOf(entry.key);
        if(index>=0)keys.splice(index,1);else if(keys.length<2)keys.push(entry.key);
        upd('notebookCompare',keys);
      }
      function restoreNotebook(entry){
        if(!entry.workspace)return;
        setLabToolData(function(prev){prev=prev||{};var next=semiRestore(prev.semiconductor,entry);if(!next)return prev;
          next.notebookNotice='Restored '+SEMI_LESSONS[entry.workspace]+'. Other lessons and drafts were preserved. Saved evidence remains as recorded.';
          return Object.assign({},prev,{semiconductor:next});
        });
        focusExperiment();
        if(announceToSR)announceToSR('Restored '+SEMI_LESSONS[entry.workspace]+' experiment settings.');
      }
      function exportNotebook(){
        var blob=new Blob([semiNotebookMarkdown(filteredEntries)],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
        link.href=url;link.download='semiconductor-notebook.md';document.body.appendChild(link);link.click();link.remove();
        setTimeout(function(){URL.revokeObjectURL(url);},1000);
        upd('notebookNotice','Exported '+filteredEntries.length+' notebook entries as Markdown.');
      }
      var notebookPreview=h('details',{id:'semiconductor-notebook-preview',className:'semi-notebook-preview semi-study',open:!!d.notebookOpen,
        onToggle:function(e){var value=e.currentTarget.open;if(value!==!!d.notebookOpen)upd('notebookOpen',value);}},
        h('summary',null,'Recent notebook entries · '+notebookCount+' saved'),
        h('p',null,'Inspect the saved evidence, compare two entries from one lesson, or restore experiment settings. Restore preserves other lessons and your draft text. Older saved states may lack numerical evidence; restored settings run through the current model.'),
        notebookCount===0&&h('p',null,'Your notebook is empty. Save a snapshot to capture settings and live values, or save a guided observation to include your explanation.'),
        h('label',{htmlFor:'semi-notebook-filter'},'Filter notebook by lesson'),
        h('select',{id:'semi-notebook-filter',value:notebookFilter,onChange:function(e){updMulti({notebookFilter:e.target.value,notebookLimit:20,notebookCompare:[]});},
          style:{display:'block',maxWidth:'100%',padding:'10px',margin:'8px 0',background:'#0f172a',color:'#f8fafc',border:'1px solid #64748b',borderRadius:'8px'}},
          h('option',{value:'all'},'All lessons'),Object.keys(SEMI_LESSONS).map(function(id){return h('option',{key:id,value:id},SEMI_LESSONS[id]);})),
        h('div',{className:'semi-inspector-controls'},h('button',{type:'button',disabled:!filteredEntries.length,onClick:exportNotebook},'Export filtered entries (.md)'),
          comparisonEntries.length>0&&btn('Clear comparison',function(){upd('notebookCompare',[]);})),
        d.notebookNotice&&h('p',{role:'status'},d.notebookNotice),
        h('section',{'aria-label':'Notebook comparison'},
          h('h4',null,'Compare recorded evidence'),
          h('p',null,comparisonEntries.length===2?'Two entries selected. Uncheck one before choosing another.':'Select up to two entries using their Compare checkboxes.'),
          comparisonEntries.map(function(entry,i){return h('p',{key:entry.key},(i===0?'A: ':'B: ')+entry.label);}),
          comparison.reason&&h('p',{role:'status'},comparison.reason),
          h(SemiSweepOverlay,{React:React,a:comparisonEntries[0],b:comparisonEntries[1]}),
          comparison.rows.length>0&&h('table',null,h('caption',null,'Recorded values · no recalculation'),
            h('thead',null,h('tr',null,h('th',{scope:'col'},'Quantity'),h('th',{scope:'col'},'Entry A'),h('th',{scope:'col'},'Entry B'))),
            h('tbody',null,comparison.rows.map(function(row){return h('tr',{key:row[0]},h('th',{scope:'row'},row[0]),h('td',null,row[1]),h('td',null,row[2]));})))
        ),
        filteredEntries.length===0&&notebookCount>0&&h('p',null,'No saved entries for this lesson. Choose All lessons to see the rest.'),
        h('ol',{style:{paddingLeft:'20px'}},filteredEntries.slice(0,notebookLimit).map(function(entry){
          var checked=comparisonEntries.some(function(e){return e.key===entry.key;});
          return h('li',{key:entry.key,style:{marginTop:'12px',overflowWrap:'anywhere'}},
            h('details',{'data-notebook-entry':entry.key},
              h('summary',null,entry.label),
              h('p',null,entry.workspace?SEMI_LESSONS[entry.workspace]+' · '+(entry.observation?'Guided observation':'Snapshot'):'Saved '+entry.mode+' session · experiment restoration unavailable'),
              entry.prediction&&h('p',null,h('strong',null,'Prediction: '),entry.prediction),
              entry.observation&&h('p',null,h('strong',null,'Observation: '),entry.observation),
              entry.evidence.length?h('table',null,h('caption',null,'Evidence recorded at save time'),
                h('thead',null,h('tr',null,h('th',{scope:'col'},'Quantity'),h('th',{scope:'col'},'Recorded value'))),
                h('tbody',null,entry.evidence.map(function(row){return h('tr',{key:row[0]},h('th',{scope:'row'},row[0]),h('td',null,row[1]));})))
                :h('p',null,'No numerical evidence was stored with this older entry.'),
              h(SemiSavedSweep,{React:React,entry:entry}),
              h('div',{className:'semi-inspector-controls'},
                h('label',null,h('input',{type:'checkbox',checked:checked,disabled:!entry.workspace||!checked&&comparisonEntries.length>=2,onChange:function(){toggleComparison(entry);},'aria-label':'Compare '+entry.label}),' Compare this entry'),
                h('button',{type:'button',disabled:!entry.workspace,onClick:function(){restoreNotebook(entry);},'aria-label':'Restore '+entry.label},'Restore experiment'))
            ));
        })),
        filteredEntries.length>notebookLimit&&btn('Show more entries',function(){upd('notebookLimit',notebookLimit+20);})
      );
      var labHeader = h('header', { className: 'semi-lab-header' },
        h('span', { className: 'semi-brand-mark', 'aria-hidden': 'true' }, '\uD83D\uDCA1'),
        h('div', { className: 'semi-header-copy' },
          h('div', { className: 'semi-header-kicker' }, t('stem.semiconductor.interactive_chip_lab', 'Interactive chip lab')),
          h('div', { className: 'flex flex-wrap items-baseline gap-2' },
            h('h2', { className: 'm-0 text-xl font-black text-white' }, t('stem.semiconductor.semiconductor_lab_2', 'Semiconductor Lab')),
            h('span', { className: 'text-[0.625rem] font-bold text-slate-300' }, 'v3.0')
          ),
          h('p', { className: 'semi-header-subtitle' }, tab === 'explore'
            ? getSubtoolLabel(subtool) + ' · Change a control and watch the model respond.'
            : meta.title + ' · ' + progressText)
        ),
        h('div', { className: 'semi-progress-card' },
          h('div', { className: 'flex items-center justify-between gap-2' },
            h('span', { className: 'semi-live-badge' },
              h('span', { className: 'semi-live-dot', 'aria-hidden': 'true' }),
              tab === 'explore' ? t('stem.semiconductor.simulation_live', 'Simulation live') : tab.charAt(0).toUpperCase() + tab.slice(1) + ' mode'
            ),
            h('span', { id: 'semiconductor-progress-summary', className: 'text-xs font-black text-cyan-50', 'aria-label': 'Progress: ' + progressText + ' Notebook: ' + notebookCount }, '\u2B50 ' + (getStemXP ? getStemXP() : 0) + ' XP · Notebook ' + notebookCount)
          ),
          tab === 'explore' && h('div', { className: 'semi-progress-track', role: 'progressbar', 'aria-label': 'Experiment progress', 'aria-valuemin': 0, 'aria-valuemax': 3, 'aria-valuenow': guidedProgressStep, 'aria-valuetext': guidedProgressStep + ' of 3 steps complete' },
            h('span', { className: 'semi-progress-fill', style: { width: guidedProgressPercent + '%' } })
          )
        )
      );

      return h('div', { className: 'semiconductor-lab flex flex-col h-full', 'data-mode': tab, role: 'application', 'aria-label': t('stem.semiconductor.semiconductor_lab', 'Semiconductor Lab') },
        backBtn,
        labHeader,
        tabBar,
        h('div', { role: 'tabpanel', id: 'semiconductor-panel-' + tab,
          'aria-labelledby': 'semiconductor-tab-' + tab, tabIndex: 0 },
          tabHero,
          subtoolNav,
          tab === 'explore' && h('div',{className:'semi-inspector-controls'},h('button',{type:'button','aria-pressed':!!d.motionPaused,onClick:function(){upd('motionPaused',!d.motionPaused);}},d.motionPaused ? t('stem.semiconductor.resume_motion','Resume particle motion') : t('stem.semiconductor.pause_motion','Pause particle motion'))),
          h('div',{className:'semi-inspector-controls'},btn('Open notebook ('+notebookCount+')',openNotebook)),
          learningRoutes,
          quickStart,
          tab === 'explore' && guidedReady && baselineEvidence && h('div',{className:'semi-study'},
            h('label',{htmlFor:'semi-prediction'},t('stem.semiconductor.predict_prompt','Before changing a setting: what do you predict? (optional)')),
            h('textarea',{id:'semi-prediction',rows:2,maxLength:500,value:prediction,style:{display:'block',width:'100%',boxSizing:'border-box',marginTop:8,padding:10,border:'1px solid #64748b',borderRadius:8,background:'#020617',color:'#f8fafc'},
              onChange:function(e){var next=Object.assign({},predictions);next[subtool]=e.target.value;upd('guidedPredictions',next);}})),
          h('div', { className: 'semi-workspace flex-1' }, content),
          tab === 'explore' && h(SemiSweepPanel,{key:subtool,React:React,data:d,materials:MATERIALS,solarMaterials:SOLAR_MATS,setData:setLabToolData,setSnapshots:setToolSnapshots}),
          studyEvidence,
          guidedReflection,
          commandDrawer),
        snapshotBtn,
        notebookPreview
      );
    }
  });

})();
