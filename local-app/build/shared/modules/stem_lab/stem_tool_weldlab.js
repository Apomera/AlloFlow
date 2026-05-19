// ═══════════════════════════════════════════
// stem_tool_weldlab.js — WeldLab: Welding & Metal Joining
// Vocational STEM tool covering arc welding processes (MIG, TIG, Stick, Oxy-Fuel),
// heat-input physics, weld bead geometry, defect identification, joint configs,
// AWS welding symbols, OSHA-aligned PPE, and Maine-relevant career pathways
// (Bath Iron Works, EMCC welding program, AWS certification ladder). Mirrors
// the EvoLab architectural pattern — IIFE module, shared helpers, BADGE_IDS
// progress tracking, WCAG 2.1 AA from day one.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('weldLab'))) {

(function() {
  'use strict';

  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── WeldLab keyframes (defect-catalog celebration) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('weldlab-celeb-css')) return;
    var st = document.createElement('style');
    st.id = 'weldlab-celeb-css';
    st.textContent = [
      '@keyframes weldlab-defect-rise {',
      '  0%   { transform: translate(-50%, -120%); opacity: 0; }',
      '  10%  { transform: translate(-50%, 0%);    opacity: 1; }',
      '  88%  { transform: translate(-50%, 0%);    opacity: 1; }',
      '  100% { transform: translate(-50%, -10%);  opacity: 0; }',
      '}'
    ].join('');
    if (document.head) document.head.appendChild(st);
  })();

  // Detect prefers-reduced-motion at module load — used to gate canvas-level
  // cosmetic motion (arc-tip travel animation, sparks). Bead geometry still
  // renders accurately; only purely decorative animation is suppressed.
  var _prefersReducedMotion = (function() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  })();

  // Print stylesheet — when teachers print a module, hide interactive controls
  // and force expand TeacherNotes so the printed copy includes pedagogical
  // scaffolding alongside content.
  (function() {
    if (document.getElementById('weldlab-print-css')) return;
    var st = document.createElement('style');
    st.id = 'weldlab-print-css';
    st.textContent = [
      '@media print {',
      '  .weldlab-no-print { display: none !important; }',
      '  details.weldlab-teacher-notes { display: block !important; }',
      '  details.weldlab-teacher-notes > summary { list-style: none; cursor: default; }',
      '  details.weldlab-teacher-notes[open] > *,',
      '  details.weldlab-teacher-notes > * { display: block !important; }',
      '  canvas { max-width: 100% !important; height: auto !important; page-break-inside: avoid; }',
      '  .weldlab-page-break { page-break-after: always; }',
      '  body { background: white !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // ── Visual flair — arc pulse, hover lift, badge glow, progress stripe ──
  // All keyframe animations are bypassed by the global motion-reduce CSS, so
  // anyone with prefers-reduced-motion gets the static styling automatically.
  (function() {
    if (document.getElementById('weldlab-flair-css')) return;
    var st = document.createElement('style');
    st.id = 'weldlab-flair-css';
    st.textContent = [
      '@keyframes weldlab-arc-pulse {',
      '  0%, 100% { opacity: 0.55; transform: scale(0.96); filter: drop-shadow(0 0 8px rgba(251,146,60,0.55)); }',
      '  50%      { opacity: 1.0;  transform: scale(1.05); filter: drop-shadow(0 0 18px rgba(252,211,77,0.95)); }',
      '}',
      '@keyframes weldlab-spark {',
      '  0%   { opacity: 0; transform: translate(0, 0) scale(0.6); }',
      '  20%  { opacity: 1; }',
      '  100% { opacity: 0; transform: var(--weldlab-spark-end, translate(20px, -22px)) scale(0.2); }',
      '}',
      '@keyframes weldlab-stripe {',
      '  0%   { background-position: 0 0; }',
      '  100% { background-position: 24px 0; }',
      '}',
      '@keyframes weldlab-badge-glow {',
      '  0%, 100% { box-shadow: 0 0 0 0 rgba(234,88,12,0.55); }',
      '  50%      { box-shadow: 0 0 0 8px rgba(234,88,12,0); }',
      '}',
      '@keyframes weldlab-bubble-rise {',
      '  0%   { transform: translateY(0)   scale(0.7); opacity: 0;   }',
      '  15%  { opacity: 0.55; }',
      '  100% { transform: translateY(-160px) scale(1.0); opacity: 0; }',
      '}',
      '.weldlab-arc-pulse  { animation: weldlab-arc-pulse 1.8s ease-in-out infinite; transform-origin: center; }',
      '.weldlab-stripe-anim {',
      '  background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 8px, transparent 8px 16px);',
      '  background-size: 24px 24px;',
      '  animation: weldlab-stripe 0.9s linear infinite;',
      '}',
      '.weldlab-badge-glow { animation: weldlab-badge-glow 1.6s ease-out infinite; }',
      '.weldlab-card-lift  { transition: transform 200ms ease, box-shadow 200ms ease; }',
      '.weldlab-card-lift:hover  { transform: translateY(-3px); }',
      '.weldlab-card-lift:focus-visible { transform: translateY(-3px); }',
      '.weldlab-bubble {',
      '  position: absolute;',
      '  border-radius: 9999px;',
      '  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(186,230,253,0.25) 60%, transparent 70%);',
      '  pointer-events: none;',
      '  animation: weldlab-bubble-rise 4.4s ease-in infinite;',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-weldlab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-weldlab';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    document.body.appendChild(lr);
  })();
  var announce = function(msg) {
    try { var lr = document.getElementById('allo-live-weldlab'); if (lr) lr.textContent = msg; } catch (_) {}
  };

  // ── localStorage helpers ──
  function lsGet(key, fallback) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } }
  function lsSet(key, val)      { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }

  // ── Tiny math helpers ──
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function randNormal(mean, std) {
    var u = 1 - Math.random(), v = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ── Welding physics ──
  // Gross heat input: kJ/in = (V × A × 60) / (TS × 1000) where TS is in/min.
  // Net heat input applies process arc efficiency η. Per AWS Welding Handbook:
  //   MIG (GMAW)   η ≈ 0.80   — most arc energy reaches the weld, low spatter
  //   TIG (GTAW)   η ≈ 0.70   — lots of radiative loss from open arc
  //   Stick (SMAW) η ≈ 0.85   — high transfer efficiency, slag retains heat
  //   Oxy-Fuel     η ≈ 0.55   — flame heating, much heat is convected away
  function heatInputGross(V, A, TS) { return (V * A * 60) / (TS * 1000); }
  var ARC_EFFICIENCY = { mig: 0.80, tig: 0.70, stick: 0.85, oxy: 0.55 };
  function heatInputNet(V, A, TS, process) {
    var eta = ARC_EFFICIENCY[process] != null ? ARC_EFFICIENCY[process] : 0.80;
    return heatInputGross(V, A, TS) * eta;
  }

  // Material thermal conductivity factor — drives bead width spread. Higher
  // conductivity = heat spreads sideways = wider HAZ but shallower penetration.
  // Numbers are normalized to mild-steel = 1.0.
  var MATERIAL = {
    steel:     { name: 'Mild Steel A36', kFactor: 1.0,  meltK: 1798, density: 7850, color: '#94a3b8' },
    aluminum:  { name: 'Aluminum 6061',  kFactor: 2.4,  meltK: 925,  density: 2700, color: '#cbd5e1' },
    stainless: { name: 'Stainless 304',  kFactor: 0.65, meltK: 1700, density: 7980, color: '#e2e8f0' }
  };

  window.StemLab.registerTool('weldLab', {
    name: 'WeldLab — Welding & Metal Joining',
    icon: '🔥',
    desc: 'Vocational welding simulator covering MIG / TIG / Stick / Oxy-Fuel processes, heat-input physics, weld bead geometry, defect identification, AWS welding symbols, OSHA-aligned PPE, and Maine career pathways (Bath Iron Works, EMCC welding program, AWS certification ladder). Real procedural and conceptual content for skilled-trades exploration — not a watered-down toy.',
    render: function(ctx) {
      var React = ctx.React || window.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;

      var d = (ctx.toolData && ctx.toolData['weldLab']) || {};
      var upd = function(key, val) { ctx.update('weldLab', key, val); };
      var addToast = ctx.addToast || function(msg) { console.log('[WeldLab]', msg); };

      // ── Persisted-state helper ──
      // Replaces the useState + useEffect→upd pair that was causing
      // infinite remount loops when sub-components (defined inside this
      // render function) mounted, fired the effect on mount, called upd
      // → ctx.update produced a new toolData reference → parent re-rendered
      // → sub-component got a fresh function ref → remounted → loop.
      // This helper folds both into one call and skips the mount-fire via
      // a first-render ref guard. The persisted value still hydrates from
      // d[key] on (re)mount, so saved state survives.
      function usePersistedState(key, defaultValue) {
        var s = useState(d[key] != null ? d[key] : defaultValue);
        var firstRef = useRef(true);
        useEffect(function () {
          if (firstRef.current) { firstRef.current = false; return; }
          upd(key, s[0]);
        }, [s[0]]);
        return s;
      }

      // Hydrate persisted state once on mount.
      var _hydratedRef = useRef(false);
      if (!_hydratedRef.current) {
        _hydratedRef.current = true;
        var savedBadges = lsGet('weldLab.badges.v1', null);
        if (savedBadges && d.weldBadges === undefined) upd('weldBadges', savedBadges);
        // Defect catalog — cross-sample log of defect types correctly identified
        // at least once. Window slot wins over localStorage (host's
        // handleLoadProject populates the slot from a project JSON load).
        var savedCatalog = null;
        try {
          if (typeof window !== 'undefined' && window.__alloflowWeldLab && window.__alloflowWeldLab.defectCatalog) {
            savedCatalog = window.__alloflowWeldLab.defectCatalog;
          }
        } catch (e) {}
        if (!savedCatalog) savedCatalog = lsGet('weldLab.defectCatalog.v1', null);
        if (savedCatalog && d.defectCatalog === undefined) upd('defectCatalog', savedCatalog);
      }

      var viewState = useState(d.view || 'menu');
      var view = viewState[0], setView = viewState[1];

      // First-find celebration state — fires the moment a brand-new defect
      // type is correctly identified. Auto-clears after 3.2s.
      var defectCelebState = useState(null);
      var defectCeleb = defectCelebState[0], setDefectCeleb = defectCelebState[1];

      // Mirror persistent state to window slot for host save/load + localStorage
      // for non-Canvas warm cache. Project JSON is the only Canvas-survival layer.
      useEffect(function () {
        try {
          var current = window.__alloflowWeldLab || {};
          window.__alloflowWeldLab = Object.assign({}, current, {
            defectCatalog: d.defectCatalog || current.defectCatalog || {},
            badges: d.weldBadges || current.badges || {},
            _ts: Date.now()
          });
        } catch (e) {}
      }, [d.defectCatalog, d.weldBadges]);

      // Hot-reload from a project-JSON load mid-session.
      useEffect(function () {
        function onRestore() {
          try {
            var w = window.__alloflowWeldLab || {};
            if (w.defectCatalog) upd('defectCatalog', w.defectCatalog);
            if (w.badges) upd('weldBadges', w.badges);
          } catch (e) {}
        }
        window.addEventListener('alloflow-weldlab-restored', onRestore);
        return function () { window.removeEventListener('alloflow-weldlab-restored', onRestore); };
      }, []);

      var BADGE_IDS = ['heatInput','beadLab','defectHunt','processCompare','jointCatalog','symbolsReader','ppeSafety','careerPaths','underwater','speedChallenge','defectCatalog','metallurgy','codes','qualPrep','pipeWelding','robotic','inspection','consumables','maineEcosystem','safetyHealth','mathBlueprint','careerStories'];
      var goto = function(v) {
        setView(v);
        upd('view', v);
        if (BADGE_IDS.indexOf(v) !== -1) {
          var prev = d.weldBadges || {};
          if (!prev[v]) {
            var next = Object.assign({}, prev);
            next[v] = true;
            upd('weldBadges', next);
            lsSet('weldLab.badges.v1', next);
            announce('Module explored: ' + v);
          }
        }
      };

      // ─────────────────────────────────────────────────────
      // SHARED COMPONENTS
      // ─────────────────────────────────────────────────────

      function BackBar(props) {
        return h('div', { className: 'flex items-center gap-3 bg-gradient-to-r from-orange-600 to-red-700 text-white p-4 shadow' },
          h('button', {
            onClick: function() { setView('menu'); upd('view', 'menu'); },
            'aria-label': 'Back to WeldLab menu',
            className: 'px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 font-bold text-sm transition-colors'
          }, '← Menu'),
          h('span', { className: 'text-3xl' }, props.icon),
          h('h1', { className: 'text-xl font-black flex-1' }, props.title)
        );
      }

      function StatCard(props) {
        return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3 text-center' },
          h('div', { className: 'text-[10px] uppercase font-bold tracking-wider text-slate-700' }, props.label),
          h('div', { className: 'text-2xl font-black ' + (props.color || 'text-orange-700') }, props.value),
          props.unit && h('div', { className: 'text-[10px] text-slate-700' }, props.unit)
        );
      }

      function LabeledSlider(props) {
        return h('div', { className: 'bg-white rounded-xl p-3 shadow border border-slate-300' },
          h('label', { className: 'flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' },
            h('span', null, props.label),
            h('span', { className: 'normal-case text-[11px] font-semibold ' + (props.valueColor || 'text-orange-700') }, props.valueText)
          ),
          h('input', {
            type: 'range',
            min: props.min, max: props.max, step: props.step || 0.01,
            value: props.value,
            onChange: function(e) {
              var v = parseFloat(e.target.value);
              if (isFinite(v)) props.onChange(v);
            },
            'aria-valuetext': props.valueText,
            className: 'w-full ' + (props.accent || 'accent-orange-500')
          }),
          props.hint && h('div', { className: 'text-[10px] text-slate-700 mt-1' }, props.hint)
        );
      }

      function TeacherNotes(props) {
        return h('details', { className: 'weldlab-teacher-notes bg-amber-50 border-2 border-amber-300 rounded-xl p-4' },
          h('summary', {
            className: 'cursor-pointer text-sm font-bold text-amber-900 hover:text-amber-700 select-none flex items-center justify-between gap-3',
            'aria-label': 'Teacher Notes — discussion questions, standards alignment, and extension activities'
          },
            h('span', null, '🍎 Teacher Notes — click to expand'),
            h('span', {
              role: 'button',
              tabIndex: 0,
              'aria-label': 'Print this module page (includes Teacher Notes)',
              onClick: function(e) { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} },
              onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} } },
              className: 'weldlab-no-print text-xs font-semibold normal-case px-2 py-1 rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-800'
            }, '🖨️ Print')
          ),
          h('div', { className: 'mt-3 space-y-3 text-sm' },
            props.standards && props.standards.length > 0 && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'NGSS / CTE Standards'),
              h('div', { className: 'text-slate-700' },
                props.standards.map(function(s, i) {
                  return h('span', { key: i, className: 'inline-block mr-2 mb-1 px-2 py-0.5 bg-white border border-amber-300 rounded text-xs font-mono' }, s);
                })
              )
            ),
            props.questions && props.questions.length > 0 && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'Discussion Questions'),
              h('ol', { className: 'list-decimal list-inside space-y-1 text-slate-700' },
                props.questions.map(function(q, i) { return h('li', { key: i }, q); })
              )
            ),
            props.misconceptions && props.misconceptions.length > 0 && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'Watch for these misconceptions'),
              h('ul', { className: 'space-y-1 text-slate-700' },
                props.misconceptions.map(function(m, i) {
                  return h('li', { key: i, className: 'flex items-start gap-1.5' },
                    h('span', { className: 'text-amber-600 font-bold' }, '⚠'),
                    h('span', null, m)
                  );
                })
              )
            ),
            props.extension && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'Extension Activity'),
              h('div', { className: 'text-slate-700 italic' }, props.extension)
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MAIN MENU
      // ─────────────────────────────────────────────────────
      function MainMenu() {
        var bigCards = [
          {
            id: 'heatInput', title: 'Heat Input Calculator', icon: '⚡',
            subtitle: 'The math that drives every weld',
            desc: 'Voltage × amperage × time gives you total heat per inch of weld. Too low: lack of fusion. Too high: warping, grain coarsening, hot cracking. This is the single most important number in arc welding — every certified welder knows it.',
            bullets: ['Live formula: kJ/in = (V × A × 60) / (TS × 1000)', 'Process efficiency factors (MIG, TIG, Stick, Oxy-Fuel)', 'Tier classification: low / medium / high heat input', 'Failure-mode warnings tied to real metallurgy'],
            color: 'from-yellow-500 to-orange-600',
            ring: 'ring-orange-500/40',
            ready: true
          },
          {
            id: 'beadLab', title: 'Weld Bead Lab', icon: '🔥',
            subtitle: 'Live bead simulator — drag your arc',
            desc: 'Pick a process, material, and plate thickness. Set voltage, amperage, travel speed. Watch a top-down bead form on the plate with accurate geometry — width, reinforcement height, ripple spacing — all driven by the heat-input physics. Score on penetration, uniformity, and spatter.',
            bullets: ['4 processes: MIG / TIG / Stick / Oxy-Fuel', '3 materials: mild steel, aluminum, stainless', 'Real bead geometry tied to heat input', 'Live score: penetration / uniformity / spatter'],
            color: 'from-orange-500 to-red-700',
            ring: 'ring-red-500/40',
            ready: true
          },
          {
            id: 'defectHunt', title: 'Defect Hunt Lab', icon: '🔍',
            subtitle: 'Inspector training — click to identify',
            desc: 'Look at a finished bead. Click the defects you can spot. Each defect (porosity, undercut, lack of fusion, cold lap, crater crack, overlap) has a hover card explaining what causes it and how to fix it. Same skill that AWS-certified welding inspectors use.',
            bullets: ['6 common defect types', 'Cause + remediation per defect', 'Multiple bead samples to inspect', 'Score on accuracy and completeness'],
            color: 'from-rose-500 to-red-700',
            ring: 'ring-rose-500/40',
            ready: true
          },
          {
            id: 'speedChallenge', title: 'Speed Challenge', icon: '⏱️',
            subtitle: 'Timed precision welding',
            desc: 'A 60-second timed run. The torch travels automatically; you adjust voltage and amperage on the fly to keep the bead in spec. Score combines penetration, uniformity, and spatter control. Three tiers: Apprentice (forgiving), Pro (tight tolerance), Bath Iron Works (no margin for error). Personal-best persists across sessions.',
            bullets: ['60-second timed run, auto-travel', 'Live voltage / amperage adjustment', '3 difficulty tiers', 'Personal-best score saved per tier'],
            color: 'from-fuchsia-500 to-rose-700',
            ring: 'ring-fuchsia-500/40',
            ready: true
          },
          {
            id: 'underwater', title: 'Underwater Welding', icon: '🌊',
            subtitle: 'Specialty career — wet & hyperbaric',
            desc: 'The highest-paying tier of welding ($80-200K+) and the most dangerous. Explore wet vs dry techniques, hyperbaric pressure effects on the arc, hydrogen-embrittlement risk, the unique safety hazards (electric shock through water, decompression sickness, hydrogen pocket explosions), and the path to becoming a commercial diver-welder.',
            bullets: ['Wet vs hyperbaric technique', 'Live depth / pressure simulator', 'Specialty safety hazards', 'Career reality + dive-school path'],
            color: 'from-cyan-600 to-blue-800',
            ring: 'ring-cyan-500/40',
            ready: true
          }
        ];
        var miniCards = [
          {
            id: 'processCompare', title: 'Process Comparison', icon: '⚖️',
            subtitle: 'MIG vs TIG vs Stick vs Oxy',
            desc: 'Side-by-side card matrix: typical use, materials, skill ceiling, equipment cost, portability, joint quality. Pick the right process for the job.',
            color: 'from-amber-500 to-orange-600',
            ring: 'ring-amber-500/40',
            ready: true
          },
          {
            id: 'jointCatalog', title: 'Joint Configuration', icon: '🔩',
            subtitle: '5 joints × 4 positions',
            desc: 'Butt, lap, corner, edge, T-joint. Position codes 1F/2F/3F/4F (flat, horizontal, vertical, overhead). Quiz mode to match symbol → joint.',
            color: 'from-stone-500 to-stone-700',
            ring: 'ring-stone-500/40',
            ready: true
          },
          {
            id: 'symbolsReader', title: 'Welding Symbols Reader', icon: '📐',
            subtitle: 'AWS A2.4 blueprint decoder',
            desc: 'Read a real engineering blueprint. Decode the welding symbol on the leader line: process? size? both sides? field weld? Critical shop-floor literacy.',
            color: 'from-slate-500 to-slate-700',
            ring: 'ring-slate-500/40',
            ready: true
          },
          {
            id: 'ppeSafety', title: 'PPE & Safety', icon: '🦺',
            subtitle: 'OSHA 1910.252 essentials',
            desc: 'Auto-darkening helmet, FR clothing, leather gloves, respirator, ventilation, fire watch. Hazard scenarios with branch decisions: arc flash, fume exposure, hot work, confined space.',
            color: 'from-yellow-500 to-amber-700',
            ring: 'ring-yellow-500/40',
            ready: true
          },
          {
            id: 'careerPaths', title: 'Career Pathways', icon: '🛠️',
            subtitle: 'Maine welding careers',
            desc: 'Bath Iron Works hiring, Eastern Maine Community College welding program, AWS certification ladder, salary bands by certification, apprenticeship vs trade school paths.',
            color: 'from-blue-600 to-indigo-700',
            ring: 'ring-blue-600/40',
            ready: true
          },
          {
            id: 'processSleuth', title: 'Process Sleuth', icon: '🕵️',
            subtitle: '10 vignettes — pick the right process',
            desc: '10 real-world welding scenarios. For each, pick the correct process from MIG / TIG / Stick / FCAW / Resistance. Vignettes target the canonical decisions: stainless food-service, structural outdoor in wind, aluminum boat hull, sanitary brewery pipe, cast-iron engine block crack, automotive sheet metal, agricultural repair on rusty steel.',
            color: 'from-amber-600 to-orange-700',
            ring: 'ring-amber-600/40',
            ready: true
          },
          {
            id: 'defectDiagnose', title: 'Defect Diagnose', icon: '🔬',
            subtitle: '10 defects — identify the root cause',
            desc: 'Complement to Defect Hunt: that one teaches what defects LOOK like; this one teaches what CAUSED them. 10 weld defects (porosity, undercut, lack of fusion, burn-through, crater crack, overlap, slag inclusion, spatter, distortion, sugar oxidation). Pick the cause from 6 categories (heat too high/low, travel too fast/slow, contamination, technique).',
            color: 'from-rose-600 to-fuchsia-700',
            ring: 'ring-rose-600/40',
            ready: true
          },
          {
            id: 'defectCatalog', title: "Welder's Defect Catalog", icon: '📔',
            subtitle: 'Your personal log of every defect type you have ID\'d',
            desc: 'A persistent catalog of welding discontinuities you have correctly identified across every Defect Hunt sample. CWI-style mental library. Crosses sessions when you save your project.',
            color: 'from-orange-500 to-rose-700',
            ring: 'ring-orange-500/40',
            ready: true
          },
          {
            id: 'metallurgy', title: 'Welding Metallurgy', icon: '🧪',
            subtitle: 'Carbon, stainless, aluminum, exotics + HAZ + PWHT',
            desc: 'The science of what heat does to metal. Phase diagrams, carbon equivalent (CE) for crack-susceptibility, HAZ properties, sensitization in stainless, hot vs cold cracking, post-weld heat treatment (PWHT). Differentiates a welder who follows a procedure from one who understands it.',
            color: 'from-emerald-600 to-teal-700',
            ring: 'ring-emerald-500/40',
            ready: true
          },
          {
            id: 'codes', title: 'Codes + Standards', icon: '📜',
            subtitle: 'AWS D1.1, ASME IX, API 1104',
            desc: 'The legal frameworks that govern what welds must be. AWS D1.1 (structural steel), ASME Section IX (pressure vessels), API 1104 (pipelines). How to read a Welding Procedure Specification (WPS) + Procedure Qualification Record (PQR), what each section means, why violations get welders fired.',
            color: 'from-purple-600 to-violet-700',
            ring: 'ring-purple-500/40',
            ready: true
          },
          {
            id: 'qualPrep', title: 'Welder Qualification Prep', icon: '🎓',
            subtitle: 'AWS performance + written test prep',
            desc: 'How welder qualification tests work — AWS D1.1, ASME, in-house. What a 6G pipe coupon looks like, how it gets bend-tested + visually inspected, what gets you passed or failed. Plus 30 written-exam practice questions covering the topics every certified welder must know.',
            color: 'from-sky-600 to-blue-700',
            ring: 'ring-sky-500/40',
            ready: true
          },
          {
            id: 'pipeWelding', title: 'Pipe Welding Deep-Dive', icon: '🪈',
            subtitle: '5G / 6G / 6GR + orbital + pipeline',
            desc: 'Pipe is its own world — fixed positions (1G/2G/5G/6G/6GR), root pass + hot pass + fill + cap technique, downhill vs uphill, pipeline welding (cross-country), orbital welding (semi-auto for nuclear + pharma). The highest-paid welding specialty when combined with X-ray-quality CWI standards.',
            color: 'from-indigo-600 to-blue-800',
            ring: 'ring-indigo-500/40',
            ready: true
          },
          {
            id: 'robotic', title: 'Robotic + Automated Welding', icon: '🤖',
            subtitle: 'FANUC, ABB, KUKA — programming + future',
            desc: 'Industrial robotic welding is automating high-volume production (auto, appliance, structural). Brands (FANUC, ABB, KUKA, Yaskawa), teach-pendant programming, vision systems, collaborative cobots. Career impact: traditional welders aren\'t replaced — robot programmers + technicians are growing fast.',
            color: 'from-zinc-600 to-stone-800',
            ring: 'ring-zinc-500/40',
            ready: true
          },
          {
            id: 'inspection', title: 'Welding Inspection (CWI)', icon: '🧐',
            subtitle: 'AWS Certified Welding Inspector prep',
            desc: 'The Certified Welding Inspector (CWI) is the gatekeeper. ~$70-110K pay, $1,150 exam, 3 parts (fundamentals, code book, hands-on). Visual inspection (VT), 5 NDT methods (PT, MT, UT, RT, ET), code interpretation, ethical responsibilities. Top of the welding career ladder for someone who reads + writes well.',
            color: 'from-amber-700 to-orange-800',
            ring: 'ring-amber-700/40',
            ready: true
          },
          {
            id: 'consumables', title: 'Consumables Deep-Dive', icon: '🧵',
            subtitle: 'Electrodes, wires, gases, flux — what to buy + when',
            desc: 'Picking the right consumable is half the welding decision. Every electrode classification (E6010, 6011, 6013, 7018, 7024), wire (ER70S-2/3/6, FCAW), shielding gas mixes, flux types. Practical: cost per pound, deposition rate, storage requirements, what each is for. Same Welder + same machine + wrong consumable = bad weld.',
            color: 'from-fuchsia-600 to-purple-800',
            ring: 'ring-fuchsia-600/40',
            ready: true
          },
          {
            id: 'maineEcosystem', title: 'Maine Welding Ecosystem', icon: '🦞',
            subtitle: 'Bath Iron Works, EMCC, employers, apprenticeships',
            desc: 'Deep-dive into Maine\'s welding economy: Bath Iron Works (US Navy destroyers, 6,500+ employees), Cianbro, Pratt & Whitney, Maine Maritime Academy, EMCC + KVCC + SMCC welding programs, apprenticeship pathways, salary ranges by employer, Maine Apprenticeship Council, MaineWorks workforce programs. The real Maine welding career map.',
            color: 'from-red-700 to-rose-900',
            ring: 'ring-red-700/40',
            ready: true
          },
          {
            id: 'safetyHealth', title: 'Safety + Health Deep-Dive', icon: '⚕️',
            subtitle: 'Fume, noise, ergonomics, vision, cancer risk',
            desc: 'Beyond PPE basics: welding fume (manganese, hexavalent chromium, nickel), noise exposure + hearing loss, ergonomic injuries (back, shoulder, wrist), arc-eye + cataracts, skin cancer, hot metal burns, electrocution risks, confined space, fire watch protocols, OSHA + NIOSH regs, long-term career health planning. Welders are 30%+ more likely to develop lung cancer — not a footnote.',
            color: 'from-rose-700 to-red-900',
            ring: 'ring-rose-700/40',
            ready: true
          },
          {
            id: 'mathBlueprint', title: 'Welding Math + Blueprints', icon: '📐',
            subtitle: 'Fractions, decimals, geometry, blueprint reading',
            desc: 'The math + drawing literacy every welder needs: fractions/decimals/measurement, geometry (angles, circles, area), trigonometry basics for layout, reading welding blueprints (orthographic views, dimensioning, tolerances, welding symbols). The shop-floor literacy that distinguishes a welder who follows specs from one who interprets them.',
            color: 'from-cyan-700 to-blue-900',
            ring: 'ring-cyan-700/40',
            ready: true
          },
          {
            id: 'careerStories', title: 'Welder Career Stories', icon: '📖',
            subtitle: '12 real welder profiles + paths',
            desc: '12 narrative profiles of working welders: shipyard journeyman, pipeline traveler, nuclear specialist, ironworker, female pipefitter, artist welder, welding instructor, mining welder, motorcycle frame builder, race car fabricator, sculptor, marine welder. What they actually do, what they earn, what they wish they\'d known, how they got there.',
            color: 'from-teal-700 to-emerald-900',
            ring: 'ring-teal-700/40',
            ready: true
          }
        ];

        var badges = d.weldBadges || {};
        var visitedCount = BADGE_IDS.filter(function(id) { return badges[id]; }).length;
        var totalCount = BADGE_IDS.length;
        var allDone = visitedCount === totalCount;

        var renderCard = function(c, isBig) {
          var visited = !!badges[c.id];
          var notReady = !c.ready;
          return h('button', {
            key: c.id,
            onClick: function() {
              if (notReady) {
                addToast('Coming soon — this module ships in a later phase.');
                return;
              }
              goto(c.id);
            },
            'aria-label': c.title + (visited ? ' (explored)' : '') + (notReady ? ' — coming soon' : ''),
            'aria-disabled': notReady ? 'true' : 'false',
            className: 'relative text-left bg-white rounded-2xl shadow-lg border-2 ' +
              (visited ? 'border-orange-600' : 'border-slate-200') +
              ' overflow-hidden group focus:outline-none focus:ring-4 ' + c.ring +
              (notReady ? ' opacity-70 cursor-not-allowed' : ' weldlab-card-lift hover:shadow-2xl hover:border-slate-400')
          },
            visited && h('span', {
              'aria-hidden': true,
              className: 'absolute top-2 right-2 z-10 bg-orange-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md weldlab-badge-glow'
            }, '✓'),
            notReady && h('span', {
              'aria-hidden': true,
              className: 'absolute top-2 right-2 z-10 bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-md'
            }, 'Soon'),
            h('div', { className: 'bg-gradient-to-br ' + c.color + ' p-5 text-white' },
              h('div', { className: 'flex items-start justify-between mb-2' },
                h('span', { className: isBig ? 'text-5xl' : 'text-4xl' }, c.icon),
                h('span', { className: 'bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider' }, isBig ? 'Core' : 'Lab')
              ),
              h('h2', { className: isBig ? 'text-2xl font-black' : 'text-xl font-black' }, c.title),
              h('p', { className: 'text-sm opacity-90 font-medium' }, c.subtitle)
            ),
            h('div', { className: 'p-5' },
              h('p', { className: 'text-sm text-slate-700 leading-relaxed ' + (isBig ? 'mb-3' : '') }, c.desc),
              isBig && c.bullets && h('ul', { className: 'space-y-1' },
                c.bullets.map(function(b, i) {
                  return h('li', { key: i, className: 'text-xs text-slate-700 flex items-start gap-1.5' },
                    h('span', { className: 'text-orange-600 font-bold' }, '✓'),
                    h('span', null, b)
                  );
                })
              )
            )
          );
        };

        return h('div', { className: 'p-6 max-w-6xl mx-auto' },
          h('div', { className: 'text-center mb-6 relative' },
            // Decorative arc-flash backdrop. aria-hidden so screen readers
            // skip; gated by reduced-motion globally.
            h('div', {
              'aria-hidden': true,
              className: 'absolute inset-x-0 -top-2 mx-auto pointer-events-none',
              style: { width: '180px', height: '180px', left: 0, right: 0 }
            },
              h('div', {
                className: 'weldlab-arc-pulse mx-auto rounded-full',
                style: {
                  width: '180px', height: '180px',
                  background: 'radial-gradient(circle, rgba(252,211,77,0.55) 0%, rgba(251,146,60,0.35) 35%, rgba(239,68,68,0.0) 70%)'
                }
              })
            ),
            h('div', { className: 'text-6xl mb-3 relative' }, '🔥'),
            h('h1', { className: 'text-4xl font-black text-slate-800 mb-2 relative' }, 'WeldLab'),
            h('p', { className: 'text-lg text-slate-700 max-w-2xl mx-auto relative' },
              'Welding & metal joining — heat-input physics, bead geometry, defect ID, AWS symbols, OSHA-aligned safety, and Maine welding careers (Bath Iron Works, EMCC, AWS).')
          ),
          // ── Welder's journey progress card ──
          // Pulls the existing 13-module menu into a career-arc narrative
          // so students see their visit progress as moving up a real-world
          // welding ladder (apprentice → journeyman → master → AWS-certified)
          // rather than a flat 0-of-11 counter. Surfaces the closest
          // un-visited module by name with a direct jump button.
          (function () {
            var BADGE_LABELS = {
              heatInput: 'Heat Input Calculator',
              beadLab: 'Weld Bead Lab',
              defectHunt: 'Defect Hunt Lab',
              processCompare: 'Process Comparison',
              jointCatalog: 'Joint Configuration',
              symbolsReader: 'Welding Symbols Reader',
              ppeSafety: 'PPE & Safety',
              careerPaths: 'Career Pathways',
              underwater: 'Underwater Welding',
              speedChallenge: 'Speed Challenge',
              defectCatalog: "Welder's Defect Catalog"
            };
            // Career tier from visit count. Mirrors the AWS certification
            // ladder loosely: entry-level → working → master → certified.
            var tier, tierColor, tierIcon, tierBlurb;
            if (allDone) {
              tier = 'AWS Certified Master Welder';
              tierColor = 'text-orange-700';
              tierIcon = '🏆';
              tierBlurb = 'You toured every station in the shop. Revisit any to deepen the craft.';
            } else if (visitedCount >= 8) {
              tier = 'Master Welder (in progress)';
              tierColor = 'text-orange-600';
              tierIcon = '🔥';
              tierBlurb = 'Broad expertise. ' + (totalCount - visitedCount) + ' module' + (totalCount - visitedCount === 1 ? '' : 's') + ' to AWS-certified.';
            } else if (visitedCount >= 4) {
              tier = 'Journeyman';
              tierColor = 'text-amber-700';
              tierIcon = '⚒️';
              tierBlurb = 'Working knowledge. ' + (8 - visitedCount) + ' more to Master.';
            } else if (visitedCount >= 1) {
              tier = 'Apprentice';
              tierColor = 'text-yellow-700';
              tierIcon = '🛠️';
              tierBlurb = 'Just getting started. ' + (4 - visitedCount) + ' more to Journeyman.';
            } else {
              tier = 'New to the shop';
              tierColor = 'text-slate-700';
              tierIcon = '👋';
              tierBlurb = 'Pick any module below. Heat Input is the foundation everything else builds on.';
            }
            // Find the next un-visited badge in declaration order — that
            // matches the rough learning-progression Aaron set when
            // ordering BADGE_IDS (foundational science first, then
            // application, then specialties).
            var nextBadgeId = null;
            for (var bi = 0; bi < BADGE_IDS.length; bi++) {
              if (!badges[BADGE_IDS[bi]]) { nextBadgeId = BADGE_IDS[bi]; break; }
            }
            var nextLabel = nextBadgeId ? BADGE_LABELS[nextBadgeId] : null;
            return h('div', {
              'aria-live': 'polite',
              className: 'mb-6 p-4 rounded-2xl border-2 ' + (allDone ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-200')
            },
              h('div', { className: 'flex items-center justify-between gap-4 flex-wrap' },
                h('div', { className: 'flex items-center gap-3 flex-1 min-w-[220px]' },
                  h('span', { className: 'text-3xl' + (allDone ? ' weldlab-arc-pulse' : ''), 'aria-hidden': true }, tierIcon),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider ' + tierColor + ' mb-0.5' }, 'Your tier'),
                    h('div', { className: 'font-bold text-slate-800 text-lg leading-tight' }, tier),
                    h('div', { className: 'text-xs text-slate-700 mt-0.5' }, tierBlurb)
                  )
                ),
                h('div', { className: 'flex-shrink-0 w-36' },
                  h('div', { className: 'text-xs text-slate-700 mb-1 text-right font-mono' }, visitedCount + ' / ' + totalCount + ' modules'),
                  h('div', { className: 'w-full h-3 bg-slate-200 rounded-full overflow-hidden relative', 'aria-hidden': true },
                    h('div', {
                      className: 'h-full weldlab-stripe-anim ' + (allDone ? 'bg-orange-500' : 'bg-orange-400') + ' transition-all',
                      style: { width: Math.round((visitedCount / totalCount) * 100) + '%' }
                    })
                  )
                )
              ),
              // Next-up nudge — only shown when there's a clear next module.
              !allDone && nextBadgeId && h('div', { className: 'mt-3 pt-3 border-t border-slate-300/60 flex items-center justify-between gap-3 flex-wrap' },
                h('div', { className: 'text-sm text-slate-700 flex-1 min-w-[180px]' },
                  h('span', { className: 'font-bold text-slate-800' }, '→ Try next: '),
                  h('span', null, nextLabel)
                ),
                h('button', {
                  onClick: function () { goto(nextBadgeId); },
                  className: 'px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 focus:outline-none focus:ring-4 ring-orange-500/40 transition'
                }, 'Open →')
              )
            );
          })(),
          // ── Welder's Defect Catalog summary tile ──
          // Persistent count of unique defect types the student has identified
          // across all Defect Hunt samples. Click jumps to the full catalog
          // view with per-type cause/fix details.
          (function () {
            var catalog = (d.defectCatalog && typeof d.defectCatalog === 'object') ? d.defectCatalog : {};
            var totalDefectTypes = Object.keys(DEFECT_INFO).length;
            var foundDefectTypes = Object.keys(DEFECT_INFO).filter(function (k) { return !!catalog[k]; }).length;
            var catalogPct = totalDefectTypes > 0 ? Math.round((foundDefectTypes / totalDefectTypes) * 100) : 0;
            var mostRecentKey = null;
            var mostRecentTs = 0;
            Object.keys(catalog).forEach(function (k) {
              var ts = new Date(catalog[k].lastFoundAt || catalog[k].firstFoundAt).getTime();
              if (ts > mostRecentTs) { mostRecentTs = ts; mostRecentKey = k; }
            });
            return h('button', {
              onClick: function () { goto('defectCatalog'); },
              'aria-label': 'Open Welder\'s Defect Catalog. ' + foundDefectTypes + ' of ' + totalDefectTypes + ' defect types identified.',
              className: 'w-full mb-5 rounded-2xl border-2 border-orange-400 shadow-md text-left transition hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-4 ring-orange-500/40 weldlab-card-lift overflow-hidden',
              style: { background: 'linear-gradient(110deg, #fff7ed 0%, #fed7aa 50%, #fde68a 100%)' }
            },
              h('div', { className: 'p-4 flex items-center gap-4 flex-wrap' },
                h('div', { className: 'flex-shrink-0 text-center', style: { minWidth: 86 } },
                  h('div', { className: 'text-3xl font-black text-orange-800 leading-none' }, foundDefectTypes + ' / ' + totalDefectTypes),
                  h('div', { className: 'text-[9px] uppercase tracking-widest text-slate-700 font-bold mt-1' }, 'Defects ID\'d')
                ),
                h('div', { className: 'flex-1 min-w-0' },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { 'aria-hidden': true, className: 'text-xl' }, '📔'),
                    h('h3', { className: 'text-base font-black text-slate-800' }, "Welder's Defect Catalog")
                  ),
                  h('div', { className: 'h-2 bg-white/60 rounded-full overflow-hidden mb-1.5', 'aria-hidden': true },
                    h('div', { className: 'h-full bg-orange-600 transition-all', style: { width: catalogPct + '%' } })
                  ),
                  h('p', { className: 'text-xs text-slate-700 leading-snug' },
                    foundDefectTypes === 0
                      ? 'Find your first defect in Defect Hunt Lab to start your inspector\'s catalog.'
                      : (mostRecentKey
                        ? 'Most recent: ' + DEFECT_INFO[mostRecentKey].name + '. Keep training your eye.'
                        : 'Keep finding defects to fill the catalog.')
                  )
                ),
                h('span', { 'aria-hidden': true, className: 'text-2xl text-orange-700 font-black flex-shrink-0' }, '→')
              )
            );
          })(),
          h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-700 mb-2 px-1' }, 'Core Simulators'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8' },
            bigCards.map(function(c) { return renderCard(c, true); })
          ),
          h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-700 mb-2 px-1' }, 'Quick Labs'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
            miniCards.map(function(c) { return renderCard(c, false); })
          ),
          h('div', { className: 'mt-8 text-center text-xs text-slate-700 italic' },
            'All 10 modules live. From heat-input physics to AWS welding symbols to Maine welding careers, plus underwater specialty + timed Speed Challenge — explore in any order.')
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 1: HEAT INPUT CALCULATOR
      // ─────────────────────────────────────────────────────
      function HeatInputCalculator() {
        var V_state = usePersistedState('hi_V', 22);
        var A_state = usePersistedState('hi_A', 180);
        var TS_state = usePersistedState('hi_TS', 12);
        var P_state = usePersistedState('hi_process', 'mig');
        var V = V_state[0], setV = V_state[1];
        var A = A_state[0], setA = A_state[1];
        var TS = TS_state[0], setTS = TS_state[1];
        var P = P_state[0], setP = P_state[1];

        var gross = heatInputGross(V, A, TS);
        var eta = ARC_EFFICIENCY[P];
        var net = gross * eta;

        // Tier classification — based on AWS Welding Handbook ranges. These
        // are typical for steel; aluminum and stainless shift the boundaries
        // (handled in Bead Lab). For the calculator we report the canonical
        // ranges for steel.
        var tier, tierColor, tierMsg;
        if (net < 25) {
          tier = 'LOW';
          tierColor = 'bg-blue-100 text-blue-900 border-blue-400';
          tierMsg = 'Risk: lack of fusion, narrow heat-affected zone, cold-lap defects. The base metal may not melt enough to fuse with filler.';
        } else if (net <= 50) {
          tier = 'MEDIUM';
          tierColor = 'bg-emerald-100 text-emerald-900 border-emerald-400';
          tierMsg = 'Typical operating range for most structural welds. Good fusion, manageable distortion, acceptable HAZ properties.';
        } else if (net <= 75) {
          tier = 'HIGH';
          tierColor = 'bg-amber-100 text-amber-900 border-amber-400';
          tierMsg = 'Risk: grain coarsening in HAZ, increased distortion, reduced toughness. Acceptable for thick sections; problematic for thin plate.';
        } else {
          tier = 'EXCESSIVE';
          tierColor = 'bg-rose-100 text-rose-900 border-rose-400';
          tierMsg = 'Risk: severe warping, hot cracking, mechanical property degradation. Reduce amperage or speed up travel.';
        }

        var processInfo = {
          mig:   { label: 'MIG / GMAW',  eff: '80%', note: 'Low spatter, most arc energy reaches the weld.' },
          tig:   { label: 'TIG / GTAW',  eff: '70%', note: 'Open arc, significant radiative loss.' },
          stick: { label: 'Stick / SMAW', eff: '85%', note: 'Slag retains heat, high transfer efficiency.' },
          oxy:   { label: 'Oxy-Fuel',    eff: '55%', note: 'Flame heating; much heat is lost to convection.' }
        };

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '⚡', title: 'Heat Input Calculator' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-6' },
            h('div', { className: 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-orange-900 mb-2' }, 'The most important number in arc welding'),
              h('p', { className: 'text-sm text-slate-700 leading-relaxed' },
                'Heat input — measured in kilojoules per inch (kJ/in) — controls how deep your weld penetrates, how big the heat-affected zone gets, and whether you risk warping or cracking. Every certified welder calculates this. Every welding procedure specification (WPS) lists it.'),
              h('div', { className: 'mt-3 p-3 bg-white rounded-lg border border-orange-300 font-mono text-sm text-slate-800' },
                'Gross HI (kJ/in) = (V × A × 60) ÷ (Travel Speed in/min × 1000)',
                h('br'),
                h('span', { className: 'text-slate-700' }, 'Net HI = Gross HI × arc efficiency η')
              )
            ),
            // Process selector
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Welding Process'),
              h('div', { 'role': 'radiogroup', 'aria-label': 'Welding process', className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
                ['mig','tig','stick','oxy'].map(function(p) {
                  var sel = (P === p);
                  return h('button', {
                    key: p,
                    onClick: function() { setP(p); announce('Selected ' + processInfo[p].label); },
                    role: 'radio',
                    'aria-checked': sel ? 'true' : 'false',
                    className: 'p-3 rounded-xl border-2 text-sm font-bold transition-all focus:outline-none focus:ring-4 ring-orange-500/40 ' +
                      (sel ? 'bg-orange-600 text-white border-orange-700 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                  }, processInfo[p].label);
                })
              ),
              h('div', { className: 'mt-2 text-xs text-slate-700' }, 'Arc efficiency: ' + processInfo[P].eff + ' — ' + processInfo[P].note)
            ),
            // Sliders
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
              h(LabeledSlider, {
                label: 'Voltage', valueText: V.toFixed(1) + ' V',
                min: 10, max: 40, step: 0.5, value: V, onChange: setV,
                hint: 'Typical: MIG 18-26V, TIG 12-22V, Stick 18-30V'
              }),
              h(LabeledSlider, {
                label: 'Amperage', valueText: Math.round(A) + ' A',
                min: 50, max: 350, step: 5, value: A, onChange: setA,
                hint: 'Higher amps = deeper penetration, more heat'
              }),
              h(LabeledSlider, {
                label: 'Travel Speed', valueText: TS.toFixed(1) + ' in/min',
                min: 3, max: 30, step: 0.5, value: TS, onChange: setTS,
                hint: 'Faster travel = lower heat input per inch'
              })
            ),
            // Results
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
              h(StatCard, {
                label: 'Gross Heat Input',
                value: gross.toFixed(1),
                unit: 'kJ/in',
                color: 'text-slate-700'
              }),
              h(StatCard, {
                label: 'Arc Efficiency',
                value: Math.round(eta * 100) + '%',
                unit: processInfo[P].label,
                color: 'text-orange-700'
              }),
              h(StatCard, {
                label: 'Net Heat Input',
                value: net.toFixed(1),
                unit: 'kJ/in (to weld)',
                color: 'text-red-700'
              })
            ),
            // Tier
            h('div', {
              'aria-live': 'polite',
              className: 'rounded-2xl border-2 p-5 ' + tierColor
            },
              h('div', { className: 'flex items-center gap-3 mb-2' },
                h('span', { className: 'text-3xl' }, tier === 'LOW' ? '🥶' : tier === 'MEDIUM' ? '✅' : tier === 'HIGH' ? '🌡️' : '🔥'),
                h('div', null,
                  h('div', { className: 'text-xs font-bold uppercase tracking-widest opacity-80' }, 'Heat Input Tier'),
                  h('div', { className: 'text-2xl font-black' }, tier)
                )
              ),
              h('p', { className: 'text-sm leading-relaxed' }, tierMsg)
            ),
            // Worked example
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
              h('h3', { className: 'text-sm font-black uppercase tracking-wider text-slate-700 mb-2' }, 'Worked Example — verify by hand'),
              h('div', { className: 'font-mono text-sm text-slate-800 space-y-1' },
                h('div', null, 'Gross HI = (' + V.toFixed(1) + ' × ' + Math.round(A) + ' × 60) ÷ (' + TS.toFixed(1) + ' × 1000)'),
                h('div', null, '         = ' + (V * A * 60).toFixed(0) + ' ÷ ' + (TS * 1000).toFixed(0)),
                h('div', null, '         = ' + gross.toFixed(2) + ' kJ/in'),
                h('div', { className: 'pt-2 text-orange-700' },
                  'Net HI = ' + gross.toFixed(2) + ' × ' + eta.toFixed(2) + ' = ' + net.toFixed(2) + ' kJ/in')
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-PS3-3 (Energy)', 'CTE Manufacturing 5.1', 'AWS SENSE QC10'],
              questions: [
                'Two welders run the same joint. Welder A: 22V, 180A, 12 in/min. Welder B: 26V, 220A, 16 in/min. Who has higher heat input? (Show your work.)',
                'Why is travel speed in the *denominator* of the formula? What real-world consequence does that have if a welder slows down at the end of a pass?',
                'Stick welding has 85% arc efficiency vs TIG\'s 70%. What does that mean about the same gross heat-input numbers in each process?'
              ],
              misconceptions: [
                '"More amps is always better" — high heat input causes warping, hot cracking, and grain coarsening in the heat-affected zone.',
                '"Travel speed doesn\'t matter much" — travel speed is one of the *three* equally-weighted variables in the formula. Halve the speed, double the heat input.',
                '"All welding processes deliver the same heat per amp" — arc efficiency varies from ~55% (oxy-fuel) to ~85% (stick) of the gross arc energy.'
              ],
              extension: 'Find an online welding procedure specification (WPS) — many are public. Identify the heat-input range listed. Set this calculator to match the low and high ends of that range and see what tier each falls into.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 2: WELD BEAD LAB
      // ─────────────────────────────────────────────────────
      function WeldBeadLab() {
        var V_state = usePersistedState('bl_V', 22);
        var A_state = usePersistedState('bl_A', 180);
        var TS_state = usePersistedState('bl_TS', 12);
        var P_state = usePersistedState('bl_process', 'mig');
        var M_state = usePersistedState('bl_material', 'steel');
        var TH_state = usePersistedState('bl_thickness', 0.25);
        // View mode: 'topdown' (default, existing 2D Canvas2D) or '3d'
        // (new Three.js scene). Persisted so a student returning to the
        // module gets the same view they last used.
        var BV_state = usePersistedState('bl_view', 'topdown');
        // ── 3D-only state ────────────────────────────────────────────
        // jointType controls which joint geometry the 3D scene builds:
        //   'butt'   = two plates edge-to-edge, single V-groove
        //   'lap'    = two plates overlapping, fillet on top edge
        //   'tee'    = vertical plate on top of horizontal, fillet both sides
        //   'corner' = two plates at 90°, fillet on outside corner
        //   'edge'   = two plates aligned edge-up, weld along stacked edge
        // weldPosition rotates the joint+torch group to simulate the four
        // AWS-recognized positions every welder is tested in (1G/2G/3G/4G
        // for groove, 1F/2F/3F/4F for fillet — same scene rotation).
        // showDefects: when true, the bead carries visible defects derived
        // from current V/A/TS/material/thickness combination (real-time
        // teaching of bad-parameter → bad-bead causality).
        // showCrossSection: opens an inset side-view canvas showing the
        // bead profile (penetration depth, HAZ width, reinforcement crown).
        var JT_state = usePersistedState('bl_joint', 'butt');
        var WP_state = usePersistedState('bl_position', '1G');
        var DF_state = usePersistedState('bl_defects', false);
        var XS_state = usePersistedState('bl_xsection', false);
        var V = V_state[0], setV = V_state[1];
        var A = A_state[0], setA = A_state[1];
        var TS = TS_state[0], setTS = TS_state[1];
        var P = P_state[0], setP = P_state[1];
        var M = M_state[0], setM = M_state[1];
        var TH = TH_state[0], setTH = TH_state[1];
        var beadView = BV_state[0], setBeadView = BV_state[1];
        var jointType = JT_state[0], setJointType = JT_state[1];
        var weldPosition = WP_state[0], setWeldPosition = WP_state[1];
        var showDefects = DF_state[0], setShowDefects = DF_state[1];
        var showCrossSection = XS_state[0], setShowCrossSection = XS_state[1];

        var net = heatInputNet(V, A, TS, P);
        var mat = MATERIAL[M];

        // Bead geometry — derived from net heat input + material conductivity
        // factor + travel speed. Numbers tuned for visual realism, not metallurgical
        // certification. Students can see the *trend* — not absolute values.
        //
        //   width (in)         ∝ √(net / kFactor)
        //   reinforcement (in) ∝ net / (TS × kFactor)
        //   ripple spacing     ∝ TS (faster = stretched ripples)
        var beadWidth = clamp(0.06 * Math.sqrt(net / mat.kFactor) * 6, 0.08, 0.55);
        var beadReinf = clamp(0.0008 * net / mat.kFactor, 0.01, 0.10);
        var rippleSp  = clamp(TS * 0.012, 0.04, 0.30);
        // Penetration depth — function of net HI and (inversely) thickness
        var penetration = clamp(0.012 * net / Math.max(0.05, TH * Math.sqrt(mat.kFactor)), 0.02, TH * 1.5);

        // Score components (0-100). These echo what an inspector would call out.
        // Penetration: ideal is ~70% of plate thickness for a fillet, full for groove.
        var penIdeal = TH * 0.7;
        var penDeviation = Math.abs(penetration - penIdeal) / penIdeal;
        var penScore = clamp(100 - penDeviation * 120, 0, 100);
        // Uniformity: penalized when ripple spacing varies wildly with TS jitter (fixed for now)
        var unifScore = clamp(100 - Math.abs(TS - 12) * 4, 30, 100);
        // Spatter: rises when too-high amperage for chosen process and material
        var ampIdeal = P === 'tig' ? 130 : P === 'stick' ? 160 : P === 'oxy' ? 100 : 200;
        var ampDeviation = Math.abs(A - ampIdeal) / ampIdeal;
        var spatterScore = clamp(100 - ampDeviation * 90, 0, 100);
        var overall = Math.round((penScore + unifScore + spatterScore) / 3);

        var canvasRef = useRef(null);
        var rafRef = useRef(null);
        var arcXRef = useRef(0);

        // Live values for RAF closure (avoids stale-closure bug)
        var liveRef = useRef({});
        liveRef.current = { net: net, beadWidth: beadWidth, beadReinf: beadReinf, rippleSp: rippleSp, mat: mat, TS: TS, P: P };

        useEffect(function() {
          var canvas = canvasRef.current;
          if (!canvas) return;
          if (window.StemLab && window.StemLab.setupHiDPI) {
            window.StemLab.setupHiDPI(canvas, canvas._logicalW || canvas.width, canvas._logicalH || canvas.height);
          }
          var ctxC = canvas.getContext('2d');
          if (canvas._dpr) ctxC.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);
          var W = canvas._logicalW || canvas.width, H = canvas._logicalH || canvas.height;
          var startTime = performance.now();

          function draw(now) {
            var live = liveRef.current;
            var elapsed = (now - startTime) / 1000;
            // Arc tip travels left to right at TS scaled to canvas width
            var travelTime = 6.0 * (12 / Math.max(3, live.TS)); // 6s baseline at 12 ipm
            var t = _prefersReducedMotion ? 1 : ((elapsed % travelTime) / travelTime);
            arcXRef.current = t;

            // Plate background
            ctxC.fillStyle = '#1f2937';
            ctxC.fillRect(0, 0, W, H);

            // Steel/al/stainless plate
            var plateY0 = H * 0.25, plateY1 = H * 0.75;
            ctxC.fillStyle = live.mat.color;
            ctxC.fillRect(W * 0.05, plateY0, W * 0.9, plateY1 - plateY0);
            ctxC.strokeStyle = '#475569';
            ctxC.lineWidth = 2;
            ctxC.strokeRect(W * 0.05, plateY0, W * 0.9, plateY1 - plateY0);

            // Joint center line
            var jointY = (plateY0 + plateY1) / 2;
            var beadStartX = W * 0.08;
            var beadEndX = W * 0.92;
            var arcX = beadStartX + (beadEndX - beadStartX) * t;

            // Bead — render only the part already laid down (left of arc)
            var beadPxWidth = (live.beadWidth / 0.5) * 24; // scale: 0.5" bead = 24px
            // Reinforcement gradient (centered, fade to edges)
            var grad = ctxC.createLinearGradient(0, jointY - beadPxWidth/2, 0, jointY + beadPxWidth/2);
            grad.addColorStop(0,    '#5b1a08');
            grad.addColorStop(0.5,  '#a3360d');
            grad.addColorStop(1,    '#5b1a08');
            ctxC.fillStyle = grad;
            ctxC.fillRect(beadStartX, jointY - beadPxWidth/2, arcX - beadStartX, beadPxWidth);

            // Ripple lines on bead (perpendicular to travel)
            ctxC.strokeStyle = 'rgba(0,0,0,0.35)';
            ctxC.lineWidth = 1.2;
            var rippleSpPx = (live.rippleSp / 0.5) * 24;
            for (var rx = beadStartX + rippleSpPx/2; rx < arcX; rx += rippleSpPx) {
              ctxC.beginPath();
              ctxC.moveTo(rx, jointY - beadPxWidth/2 + 2);
              ctxC.lineTo(rx, jointY + beadPxWidth/2 - 2);
              ctxC.stroke();
            }

            // HAZ glow around laid bead (heat-affected zone)
            ctxC.strokeStyle = 'rgba(251, 146, 60, 0.35)';
            ctxC.lineWidth = beadPxWidth * 0.6;
            ctxC.beginPath();
            ctxC.moveTo(beadStartX, jointY);
            ctxC.lineTo(arcX - 4, jointY);
            ctxC.stroke();

            // Arc tip (only visible while welding — at progress < 1)
            if (t < 1 && !_prefersReducedMotion) {
              // Pulse arc
              var pulse = 0.7 + 0.3 * Math.sin(elapsed * 30);
              ctxC.fillStyle = 'rgba(255, 255, 200, ' + pulse + ')';
              ctxC.beginPath();
              ctxC.arc(arcX, jointY, 8 + 4 * pulse, 0, Math.PI * 2);
              ctxC.fill();
              ctxC.fillStyle = 'rgba(255, 230, 100, 0.9)';
              ctxC.beginPath();
              ctxC.arc(arcX, jointY, 4, 0, Math.PI * 2);
              ctxC.fill();
              // Sparks splaying off the arc tip — adds visceral "this
              // is welding" atmosphere without storing per-spark state.
              // Deterministic per-frame seed (elapsed * 60) so sparks
              // animate visibly but never need a particle buffer. Y-axis
              // is squashed (× 0.45) to suggest sparks splaying along the
              // plate surface in perspective rather than radiating in a
              // perfect circle. Reduced-motion already skipped (see
              // outer guard).
              var sparkCount = 8;
              for (var sp = 0; sp < sparkCount; sp++) {
                var sphase = (elapsed * 60 + sp * 1.7) % 1;
                var sangle = (sp / sparkCount) * Math.PI * 2 + elapsed * 8 + sp;
                var sdist = 4 + sphase * 28;
                var cx = Math.cos(sangle), sy = Math.sin(sangle);
                var x1 = arcX + cx * (sdist - 4);
                var y1 = jointY + sy * (sdist - 4) * 0.45;
                var x2 = arcX + cx * sdist;
                var y2 = jointY + sy * sdist * 0.45;
                var sparkAlpha = (1 - sphase) * 0.85;
                ctxC.strokeStyle = 'rgba(255, ' + Math.round(180 + 75 * (1 - sphase)) + ', 80, ' + sparkAlpha + ')';
                ctxC.lineWidth = 1.2;
                ctxC.beginPath();
                ctxC.moveTo(x1, y1);
                ctxC.lineTo(x2, y2);
                ctxC.stroke();
              }
            } else if (_prefersReducedMotion) {
              // Static finished bead — no arc, no sparks
            }

            // Plate edge labels
            ctxC.fillStyle = '#cbd5e1';
            ctxC.font = '12px sans-serif';
            ctxC.textAlign = 'left';
            ctxC.fillText(live.mat.name + '  ·  Plate', W * 0.05, plateY0 - 6);
            ctxC.textAlign = 'right';
            ctxC.fillText('Net HI: ' + live.net.toFixed(1) + ' kJ/in  ·  ' + (live.P === 'mig' ? 'MIG' : live.P === 'tig' ? 'TIG' : live.P === 'stick' ? 'Stick' : 'Oxy-Fuel'),
              W * 0.95, plateY0 - 6);

            if (!_prefersReducedMotion) {
              rafRef.current = requestAnimationFrame(draw);
            }
          }

          rafRef.current = requestAnimationFrame(draw);
          return function() {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
          };
        }, [beadView]); // re-run when view toggles so 2D draw loop stops while 3D is active and restarts cleanly when user returns to top-down

        var canvasAriaLabel = 'Weld bead simulation. ' +
          (P === 'mig' ? 'MIG' : P === 'tig' ? 'TIG' : P === 'stick' ? 'Stick' : 'Oxy-Fuel') +
          ' on ' + mat.name + ' plate, ' + TH.toFixed(2) + ' inch thick. ' +
          'Net heat input ' + net.toFixed(1) + ' kilojoules per inch. ' +
          'Bead width ' + (beadWidth * 1000 | 0) / 1000 + ' inches, reinforcement ' + (beadReinf * 1000 | 0) / 1000 + ' inches, penetration ' +
          (penetration * 1000 | 0) / 1000 + ' inches. Overall score ' + overall + ' percent.';

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🔥', title: 'Weld Bead Lab' }),
          h('div', { className: 'p-6 max-w-6xl mx-auto space-y-5' },
            // Process + material + thickness
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-3' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Process'),
                h('div', { 'role': 'radiogroup', 'aria-label': 'Welding process', className: 'grid grid-cols-2 gap-1.5' },
                  ['mig','tig','stick','oxy'].map(function(p) {
                    var sel = (P === p);
                    var lbl = p === 'mig' ? 'MIG' : p === 'tig' ? 'TIG' : p === 'stick' ? 'Stick' : 'Oxy';
                    return h('button', {
                      key: p,
                      onClick: function() { setP(p); announce('Process: ' + lbl); },
                      role: 'radio',
                      'aria-checked': sel ? 'true' : 'false',
                      className: 'p-2 rounded-lg border-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                        (sel ? 'bg-orange-600 text-white border-orange-700' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                    }, lbl);
                  })
                )
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-3' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Material'),
                h('div', { 'role': 'radiogroup', 'aria-label': 'Base metal', className: 'space-y-1.5' },
                  Object.keys(MATERIAL).map(function(mk) {
                    var sel = (M === mk);
                    return h('button', {
                      key: mk,
                      onClick: function() { setM(mk); announce('Material: ' + MATERIAL[mk].name); },
                      role: 'radio',
                      'aria-checked': sel ? 'true' : 'false',
                      className: 'w-full p-2 rounded-lg border-2 text-xs font-bold text-left transition-all focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                        (sel ? 'bg-orange-600 text-white border-orange-700' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                    }, MATERIAL[mk].name);
                  })
                )
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-3' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Plate Thickness'),
                h('div', { 'role': 'radiogroup', 'aria-label': 'Plate thickness', className: 'grid grid-cols-2 gap-1.5' },
                  [0.125, 0.1875, 0.25, 0.375].map(function(t) {
                    var sel = (TH === t);
                    var lbl = t === 0.125 ? '1/8"' : t === 0.1875 ? '3/16"' : t === 0.25 ? '1/4"' : '3/8"';
                    return h('button', {
                      key: t,
                      onClick: function() { setTH(t); announce('Thickness ' + lbl); },
                      role: 'radio',
                      'aria-checked': sel ? 'true' : 'false',
                      className: 'p-2 rounded-lg border-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                        (sel ? 'bg-orange-600 text-white border-orange-700' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                    }, lbl);
                  })
                )
              )
            ),
            // Sliders
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
              h(LabeledSlider, {
                label: 'Voltage', valueText: V.toFixed(1) + ' V',
                min: 10, max: 40, step: 0.5, value: V, onChange: setV
              }),
              h(LabeledSlider, {
                label: 'Amperage', valueText: Math.round(A) + ' A',
                min: 50, max: 350, step: 5, value: A, onChange: setA
              }),
              h(LabeledSlider, {
                label: 'Travel Speed', valueText: TS.toFixed(1) + ' in/min',
                min: 3, max: 30, step: 0.5, value: TS, onChange: setTS
              })
            ),
            // ── View-mode toggle ──
            // Top-down (default) preserves the existing physics-precise
            // 2D view used for inspector-style geometry reading. 3D adds
            // the immersive perspective for engagement; same V/A/TS state
            // drives both. Three.js is lazy-loaded only when 3D is opened.
            h('div', { role: 'tablist', 'aria-label': 'Bead view mode', className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mr-1' }, 'View:'),
              [
                { id: 'topdown', label: 'Top-down', icon: '📐', sub: 'physics view' },
                { id: '3d', label: '3D Scene', icon: '🎥', sub: 'immersive' },
                { id: 'helmet', label: 'Helmet POV', icon: '🥽', sub: 'first-person' }
              ].map(function (m) {
                var sel = (beadView === m.id);
                return h('button', {
                  key: m.id,
                  role: 'tab',
                  'aria-selected': sel ? 'true' : 'false',
                  'aria-pressed': sel ? 'true' : 'false',
                  onClick: function () {
                    setBeadView(m.id);
                    announce('View: ' + m.label + ' (' + m.sub + ')');
                  },
                  className: 'px-3 py-1.5 rounded-lg border-2 font-bold text-xs transition focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                    (sel ? 'bg-orange-600 text-white border-orange-700 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                },
                  h('span', { 'aria-hidden': true, className: 'mr-1' }, m.icon),
                  m.label
                );
              })
            ),
            // Canvas — existing top-down 2D view (default)
            beadView === 'topdown' && h('div', { className: 'bg-slate-900 rounded-2xl shadow border-2 border-slate-700 p-3' },
              h('canvas', {
                ref: canvasRef,
                width: 900,
                height: 280,
                role: 'img',
                'aria-label': canvasAriaLabel,
                className: 'w-full block rounded-lg'
              })
            ),
            // 3D-only sub-controls (joint type / weld position / defects / cross-section)
            // Only render when 3D scene is active. Groups four controls in a single
            // strip so the parent layout stays clean. Each sub-control persists
            // independently so students can compare combinations across sessions.
            beadView === '3d' && h('div', { className: 'bg-white rounded-2xl shadow border-2 border-orange-200 p-4 space-y-3' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-orange-800' }, '3D Scene Configuration'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                // Joint type selector
                h('div', null,
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5' }, 'Joint Type'),
                  h('div', { role: 'radiogroup', 'aria-label': 'Joint type', className: 'grid grid-cols-5 gap-1.5' },
                    [
                      { id: 'butt',   label: 'Butt',   icon: '⎯⎯', desc: 'Edge to edge' },
                      { id: 'lap',    label: 'Lap',    icon: '⎯̲̲',   desc: 'Overlap' },
                      { id: 'tee',    label: 'T',      icon: '⊥',    desc: 'Perpendicular' },
                      { id: 'corner', label: 'Corner', icon: '⌐',    desc: 'L-shape' },
                      { id: 'edge',   label: 'Edge',   icon: '∥',    desc: 'Stacked edge' }
                    ].map(function(j) {
                      var sel = (jointType === j.id);
                      return h('button', {
                        key: j.id,
                        onClick: function() { setJointType(j.id); announce('Joint: ' + j.label + ' (' + j.desc + ')'); },
                        role: 'radio',
                        'aria-checked': sel ? 'true' : 'false',
                        title: j.desc,
                        className: 'p-2 rounded-lg border-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                          (sel ? 'bg-orange-600 text-white border-orange-700' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                      },
                        h('div', { className: 'text-base font-mono', 'aria-hidden': true }, j.icon),
                        h('div', { className: 'text-[10px] mt-0.5' }, j.label)
                      );
                    })
                  )
                ),
                // Weld position selector
                h('div', null,
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5' }, 'Weld Position'),
                  h('div', { role: 'radiogroup', 'aria-label': 'Welding position', className: 'grid grid-cols-4 gap-1.5' },
                    [
                      { id: '1G', label: '1G/1F', icon: '⬜', desc: 'Flat — gravity helps' },
                      { id: '2G', label: '2G/2F', icon: '▭',  desc: 'Horizontal — bead runs sideways' },
                      { id: '3G', label: '3G/3F', icon: '▮',  desc: 'Vertical — fight gravity' },
                      { id: '4G', label: '4G/4F', icon: '⬜̲', desc: 'Overhead — gravity fights you' }
                    ].map(function(p) {
                      var sel = (weldPosition === p.id);
                      return h('button', {
                        key: p.id,
                        onClick: function() { setWeldPosition(p.id); announce('Position: ' + p.label + ' (' + p.desc + ')'); },
                        role: 'radio',
                        'aria-checked': sel ? 'true' : 'false',
                        title: p.desc,
                        className: 'p-2 rounded-lg border-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                          (sel ? 'bg-orange-600 text-white border-orange-700' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                      },
                        h('div', { className: 'text-base', 'aria-hidden': true }, p.icon),
                        h('div', { className: 'text-[10px] mt-0.5' }, p.label)
                      );
                    })
                  )
                )
              ),
              // Visual analysis toggles row
              h('div', { className: 'flex flex-wrap gap-3 pt-2 border-t border-orange-100' },
                h('label', { className: 'inline-flex items-center gap-2 cursor-pointer text-sm' },
                  h('input', {
                    type: 'checkbox',
                    checked: showDefects,
                    onChange: function(e) { setShowDefects(e.target.checked); announce(e.target.checked ? 'Defect overlay on' : 'Defect overlay off'); },
                    className: 'w-4 h-4 accent-orange-600 focus:ring-2 focus:ring-orange-500'
                  }),
                  h('span', { className: 'font-bold text-slate-800' }, '🔍 Show real-time defects'),
                  h('span', { className: 'text-xs text-slate-600' }, '— bad parameters → visible bad bead')
                ),
                h('label', { className: 'inline-flex items-center gap-2 cursor-pointer text-sm' },
                  h('input', {
                    type: 'checkbox',
                    checked: showCrossSection,
                    onChange: function(e) { setShowCrossSection(e.target.checked); announce(e.target.checked ? 'Cross-section view on' : 'Cross-section view off'); },
                    className: 'w-4 h-4 accent-orange-600 focus:ring-2 focus:ring-orange-500'
                  }),
                  h('span', { className: 'font-bold text-slate-800' }, '🪓 Show cross-section'),
                  h('span', { className: 'text-xs text-slate-600' }, '— X-ray view of penetration + HAZ + crown')
                )
              )
            ),
            // 3D scene — new immersive view, Three.js lazy-loaded on first
            // open. Same liveRef so it sees the same V/A/TS/material/process
            // state without duplicating the physics layer.
            beadView === '3d' && h(WeldBeadLab3D, {
              liveRef: liveRef,
              P: P,
              M: M,
              TH: TH,
              mat: mat,
              jointType: jointType,
              weldPosition: weldPosition,
              showDefects: showDefects,
              showCrossSection: showCrossSection,
              V: V,
              A: A,
              TS: TS,
              ariaLabel: canvasAriaLabel
            }),
            // Helmet POV — first-person view through an auto-darkening
            // welding hood. Pure Canvas2D (no Three.js dependency for this
            // mode). Teaches what a welder actually sees: most of the world
            // goes dark when the lens darkens to ~Shade 11; the arc is a
            // bright bloom; the plate is a faint glow around it. Most
            // students don't know visibility is this limited.
            beadView === 'helmet' && h(WeldBeadLabHelmet, {
              liveRef: liveRef,
              P: P,
              ariaLabel: canvasAriaLabel
            }),
            // Stat cards
            h('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-3' },
              h(StatCard, { label: 'Net HI', value: net.toFixed(1), unit: 'kJ/in', color: 'text-red-700' }),
              h(StatCard, { label: 'Bead Width', value: beadWidth.toFixed(3), unit: 'inches', color: 'text-orange-700' }),
              h(StatCard, { label: 'Reinforcement', value: beadReinf.toFixed(3), unit: 'inches', color: 'text-orange-700' }),
              h(StatCard, { label: 'Penetration', value: penetration.toFixed(3), unit: 'inches', color: 'text-orange-700' }),
              h(StatCard, { label: 'Score', value: overall + '%', unit: 'overall', color: overall >= 80 ? 'text-emerald-700' : overall >= 60 ? 'text-amber-700' : 'text-rose-700' })
            ),
            // Score breakdown
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-3' }, 'Inspector Scorecard'),
              h('div', { className: 'space-y-2' },
                [
                  { label: 'Penetration', val: penScore, hint: 'Ideal ≈ 70% of plate thickness (' + (penIdeal * 1000 | 0)/1000 + '" target)' },
                  { label: 'Uniformity', val: unifScore, hint: 'Even ripple spacing — steady travel speed' },
                  { label: 'Spatter Control', val: spatterScore, hint: 'Amperage matched to process (target ~' + ampIdeal + 'A for ' + (P === 'mig' ? 'MIG' : P === 'tig' ? 'TIG' : P === 'stick' ? 'Stick' : 'Oxy') + ')' }
                ].map(function(row, i) {
                  var color = row.val >= 80 ? 'bg-emerald-500' : row.val >= 60 ? 'bg-amber-500' : 'bg-rose-500';
                  return h('div', { key: i },
                    h('div', { className: 'flex items-center justify-between text-sm' },
                      h('span', { className: 'font-semibold text-slate-800' }, row.label),
                      h('span', { className: 'font-bold text-slate-700' }, Math.round(row.val) + '%')
                    ),
                    h('div', { className: 'h-2 bg-slate-200 rounded-full overflow-hidden mt-1', 'aria-hidden': true },
                      h('div', { className: 'h-full ' + color + ' transition-all', style: { width: row.val + '%' } })
                    ),
                    h('div', { className: 'text-xs text-slate-700 mt-0.5' }, row.hint)
                  );
                })
              )
            ),
            // Material context
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-2xl p-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-blue-900 mb-1' }, 'About this material'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                M === 'steel' ? 'Mild steel A36 — the workhorse of structural welding. Moderate thermal conductivity means heat stays where you put it. Forgiving, good for learning. Most common metal at Bath Iron Works.' :
                M === 'aluminum' ? 'Aluminum 6061 — high thermal conductivity (2.4× steel) means heat dissipates fast. You need MORE amperage to compensate. Forms an oxide layer that must be removed (AC TIG cleans it). Trickier than steel.' :
                'Stainless 304 — low thermal conductivity (0.65× steel) means heat stays concentrated, but warping risk is HIGH. Sensitization (carbide precipitation) at 800-1500°F can ruin corrosion resistance. Use low heat input, fast travel.'
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-PS3-3 (Energy)', 'HS-PS1-3 (Properties of matter)', 'HS-ETS1-2 (Engineering)', 'AWS SENSE QC11'],
              questions: [
                'Switch from mild steel to aluminum without changing voltage or amperage. What happens to the bead width? Why?',
                'You\'re running TIG on stainless and getting good penetration but the plate is warping. What two parameters can you change to fix it?',
                'Compare the score for MIG at 200A vs TIG at 200A on the same plate. Why are they different?'
              ],
              misconceptions: [
                '"Aluminum is easier than steel because it\'s softer" — aluminum is HARDER to weld due to high conductivity, oxide layer, and narrow temperature window between solid and molten.',
                '"More penetration is always better" — over-penetration on a fillet causes burn-through and weakens the joint. The target is *specified* penetration, not maximum.',
                '"Stainless and steel are basically the same" — stainless has 1/3 the thermal conductivity of mild steel, completely different distortion behavior and HAZ properties.'
              ],
              extension: 'Pick a real welded product (your bike frame, a chair, a railing). Identify the metal, joint type, and likely process. Use this lab to estimate what heat-input range that weld was made at.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 2 (companion): WELD BEAD 3D SCENE
      // ─────────────────────────────────────────────────────
      // Immersive 3rd-person view of the same bead the WeldBeadLab is
      // computing. Reads the live physics state (V/A/TS/material/process,
      // bead width derived from heat input) via the parent's liveRef so
      // there is no state duplication. Visual only — no new sliders,
      // controls, or scoring. Lazy-loads Three.js r128 from cdnjs only
      // when this view is opened (mirrors the same pattern RoadReady has
      // used in production for months). If Three.js fails to load, falls
      // back to a polite message + reverts user to top-down.
      //
      // Scene composition:
      //   - dark slate bench (BoxGeometry)
      //   - plate sized to current TH, color from current material
      //   - torch group (handle + nozzle), color/tip-color swap by process
      //   - growing bead (BoxGeometry scaled with arc travel progress)
      //   - arc sphere + PointLight at torch tip, pulsing
      //   - 12 spark spheres splaying off the arc, deterministic per-frame
      //   - ambient + directional lighting
      //
      // Camera: spherical (azimuth, elevation, radius) controlled by
      // pointer-drag and wheel-zoom. Reset button restores defaults.
      // Reduced-motion: arc holds at end of travel; sparks suppressed;
      // arc pulse disabled.
      // ── Defect computation: derive defect set from current parameters ──
      // Pure function; called by render loop each frame to determine
      // which defects (if any) should appear in the bead. Returns an
      // object whose keys are defect names; values are severity 0–1
      // (0 = absent, 1 = severe).
      //
      // Defect rules of thumb (taught in CWI prep + AWS SENSE Level 1):
      //   burnthrough   — net heat input too high for plate thickness
      //                   (specific to thin plate; rare on thick plate)
      //   lack of fusion — net heat too LOW for plate thickness
      //                   (cold bead floats on top of base metal)
      //   undercut      — high amperage + high travel speed
      //                   (groove carved into base metal alongside bead)
      //   overlap       — low amperage + slow travel speed
      //                   (bead overhangs edges without fusing)
      //   spatter       — amperage above process-appropriate maximum
      //                   (molten metal droplets scattered around bead)
      //   porosity      — process-specific shielding/cleanliness issue
      //                   (bubbles/pinholes embedded in bead surface)
      function _computeWeldDefects(net, TH, V, A, TS, P) {
        var d = {
          burnthrough: 0, lackOfFusion: 0, undercut: 0,
          overlap: 0, spatter: 0, porosity: 0
        };
        // Burnthrough — heat density per unit plate thickness too high
        // Threshold scales with thickness: thicker = more headroom.
        var heatDensity = net / Math.max(0.06, TH);
        if (heatDensity > 100) d.burnthrough = Math.min(1, (heatDensity - 100) / 80);
        // Lack of fusion — heat density too low to melt base + filler together
        if (heatDensity < 25) d.lackOfFusion = Math.min(1, (25 - heatDensity) / 25);
        // Undercut — high amperage + fast travel carves a groove next to bead
        if (A > 230 && TS > 14) {
          d.undercut = Math.min(1, ((A - 230) / 80) * ((TS - 14) / 10));
        }
        // Overlap — low amperage + slow travel makes bead overhang without fusing
        if (A < 130 && TS < 8) {
          d.overlap = Math.min(1, ((130 - A) / 60) * ((8 - TS) / 4));
        }
        // Spatter — amperage above process-specific max
        var ampMax = (P === 'tig') ? 200 : (P === 'stick') ? 250 : (P === 'oxy') ? 150 : 300;
        if (A > ampMax) d.spatter = Math.min(1, (A - ampMax) / 80);
        // Porosity — process-specific
        //   MIG: low voltage with high amperage → narrow + porous arc
        //   TIG: insufficient amperage for material → contamination pickup
        //   Stick: damp electrode (modeled as low V with mid-range A)
        //   Oxy: improper flame chemistry (modeled as off-target amperage)
        if (P === 'mig' && V < 18 && A > 180) d.porosity = Math.min(1, (18 - V) / 8);
        else if (P === 'tig' && A < 80) d.porosity = Math.min(1, (80 - A) / 30);
        else if (P === 'stick' && V < 22 && A > 120 && A < 180) d.porosity = 0.45;
        else if (P === 'oxy' && (A < 75 || A > 130)) d.porosity = Math.min(1, Math.abs(A - 100) / 50);
        return d;
      }

      // ── Position rotation helper ──
      // Returns a Euler-angle triplet (x, y, z) to rotate the entire
      // joint+torch group so the SAME welding action is visualized in
      // 1G (flat), 2G (horizontal), 3G (vertical), or 4G (overhead)
      // position. Camera default also adjusted per position to keep the
      // weld visible.
      function _positionRotation(pos) {
        if (pos === '2G') return { x: 0,        y: 0, z: Math.PI / 2 };
        if (pos === '3G') return { x: -Math.PI / 2, y: 0, z: 0 };
        if (pos === '4G') return { x: 0,        y: 0, z: Math.PI };
        return { x: 0, y: 0, z: 0 };  // 1G flat (default)
      }

      function WeldBeadLab3D(props) {
        var canvasRef = useRef(null);
        var crossSectionRef = useRef(null);
        var sceneRef = useRef(null);
        var rafRef = useRef(null);
        var statusState = useState('loading'); // loading | ready | error
        var status = statusState[0], setStatus = statusState[1];
        var liveRef = props.liveRef;
        // Defect color legend rendered alongside the 3D scene when
        // showDefects is on. Each entry: { key, label, color, swatch }.
        var defectLegend = [
          { key: 'burnthrough',  label: 'Burnthrough',   color: '#000000', desc: 'hole punched through' },
          { key: 'lackOfFusion', label: 'Lack of fusion', color: '#475569', desc: 'cold weld, no bond' },
          { key: 'undercut',     label: 'Undercut',      color: '#7c2d12', desc: 'groove next to bead' },
          { key: 'overlap',      label: 'Overlap',       color: '#92400e', desc: 'bead overhangs edge' },
          { key: 'spatter',      label: 'Spatter',       color: '#f59e0b', desc: 'molten splatter' },
          { key: 'porosity',     label: 'Porosity',      color: '#1e293b', desc: 'gas bubbles in bead' }
        ];

        function resetCamera() {
          if (!sceneRef.current) return;
          var s = sceneRef.current;
          s.camAngle.az = -0.7;
          s.camAngle.el = 0.55;
          s.camAngle.r = 3.2;
          s.syncCamera();
        }

        useEffect(function () {
          var cancelled = false;

          function init() {
            if (cancelled) return;
            var THREE = window.THREE;
            if (!THREE) { setStatus('error'); return; }
            var canvas = canvasRef.current;
            if (!canvas) return;

            var W = canvas.clientWidth || 600;
            var H = 280;

            try {
              var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
              renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
              renderer.setSize(W, H, false);
            } catch (e) {
              console.error('[WeldLab] WebGL init failed:', e);
              setStatus('error');
              return;
            }

            var scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0f172a);

            var camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
            // Spherical camera coords. az = horizontal angle, el = elevation
            // angle (0 = horizon, π/2 = top), r = radius from origin.
            var camAngle = { az: -0.7, el: 0.55, r: 3.2 };
            function syncCamera() {
              var x = camAngle.r * Math.cos(camAngle.el) * Math.sin(camAngle.az);
              var y = camAngle.r * Math.sin(camAngle.el);
              var z = camAngle.r * Math.cos(camAngle.el) * Math.cos(camAngle.az);
              camera.position.set(x, y, z);
              camera.lookAt(0, 0, 0);
            }
            syncCamera();

            // ── Lights ──
            var ambient = new THREE.AmbientLight(0x4a5060, 1.4);
            scene.add(ambient);
            var dirLight = new THREE.DirectionalLight(0xffffff, 0.65);
            dirLight.position.set(2, 3.5, 2);
            scene.add(dirLight);
            var fillLight = new THREE.DirectionalLight(0x6080a0, 0.25);
            fillLight.position.set(-2, 1, -1);
            scene.add(fillLight);

            // ── Bench ──
            var benchGeom = new THREE.BoxGeometry(3.5, 0.06, 1.8);
            var benchMat = new THREE.MeshStandardMaterial({ color: 0x1c2532, roughness: 0.92 });
            var bench = new THREE.Mesh(benchGeom, benchMat);
            bench.position.y = -0.08;
            scene.add(bench);

            // ── Joint Group ──
            // All joint geometry + bead + torch + arc + sparks live inside
            // this Group so weldPosition rotation rotates the entire scene
            // (mimicking actually re-fixturing the plates into different
            // welding positions while the camera stays put). Bench stays
            // outside the group — bench doesn't rotate with the joint.
            var jointGroup = new THREE.Group();
            scene.add(jointGroup);

            // ── Plate(s) ──
            // For single-plate (butt with no gap shown) we keep one plate;
            // for actual joints we add a second plate positioned per joint
            // type. Both share a material so material/color updates apply
            // to both. The bead position is offset within the joint group
            // so each joint type has the right join line.
            var plateMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.55, metalness: 0.55 });
            var plateA = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 1.0), plateMat);
            jointGroup.add(plateA);
            var plateB = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 1.0), plateMat);
            plateB.visible = false; // shown only for joints that need a 2nd piece
            jointGroup.add(plateB);

            // ── Joint geometry rebuilder ──
            // Repositions plateA + plateB to construct the requested joint
            // and returns the local position where the bead should sit
            // (joint axis). Called on init + whenever jointType or
            // thickness changes (re-positions / re-scales the plates +
            // bead anchor).
            function rebuildJoint(jt, thicknessIn) {
              var th = Math.max(0.1, (thicknessIn || 0.25) / 0.25); // plate Y scale factor
              plateA.scale.y = th;
              plateB.scale.y = th;
              var halfH = (0.05 * th) / 2;
              // Reset rotations first
              plateA.rotation.set(0, 0, 0);
              plateB.rotation.set(0, 0, 0);

              if (jt === 'butt') {
                // Two plates edge-to-edge along z = 0, with tiny gap.
                plateA.visible = true;
                plateB.visible = true;
                plateA.position.set(0, 0, -0.51);
                plateB.position.set(0, 0,  0.51);
                return { x: 0, y: halfH + 0.013, z: 0, axis: 'x', length: 2.0, jointZ: 0 };
              } else if (jt === 'lap') {
                // Bottom plate centered + top plate offset upward + sideways
                // forming overlap. Bead runs along upper plate's edge.
                plateA.visible = true;
                plateB.visible = true;
                plateA.position.set(0, 0, -0.30);
                plateB.position.set(0, halfH * 2 + 0.001, 0.30);
                return { x: 0, y: halfH * 2 + halfH + 0.013, z: -0.20, axis: 'x', length: 2.0, jointZ: -0.20 };
              } else if (jt === 'tee') {
                // Horizontal base plate + vertical web rising from middle.
                // Fillet weld along the toe where web meets base.
                plateA.visible = true;
                plateB.visible = true;
                plateA.position.set(0, 0, 0);                       // base flat
                plateA.scale.z = 1;
                plateB.rotation.x = Math.PI / 2;                    // vertical
                plateB.position.set(0, halfH + 0.25, 0);
                plateB.scale.z = 1;
                return { x: 0, y: halfH + 0.013, z: -0.05, axis: 'x', length: 2.0, jointZ: -0.05 };
              } else if (jt === 'corner') {
                // Two plates at 90° forming outer corner. Bead along
                // the outside edge of the corner.
                plateA.visible = true;
                plateB.visible = true;
                plateA.position.set(0, 0, -0.25);
                plateB.rotation.x = Math.PI / 2;
                plateB.position.set(0, 0.25 + halfH, 0.25);
                return { x: 0, y: halfH * 2 + 0.013, z: -0.25, axis: 'x', length: 2.0, jointZ: -0.25 };
              } else if (jt === 'edge') {
                // Two plates standing on edge, side by side, joined along
                // top edge. Weld runs along the top of the stack.
                plateA.visible = true;
                plateB.visible = true;
                plateA.rotation.x = Math.PI / 2;
                plateB.rotation.x = Math.PI / 2;
                plateA.position.set(0, 0.5, -0.06);
                plateB.position.set(0, 0.5,  0.06);
                return { x: 0, y: 1.01, z: 0, axis: 'x', length: 2.0, jointZ: 0 };
              }
              // Fallback: single plate (legacy behavior)
              plateA.visible = true;
              plateB.visible = false;
              plateA.position.set(0, 0, 0);
              return { x: 0, y: halfH + 0.013, z: 0, axis: 'x', length: 2.0, jointZ: 0 };
            }

            // ── Bead ──
            // Box from -1 to +1 on x. Scale.x grows with arc progress;
            // position adjusts based on current joint anchor.
            var beadGeom = new THREE.BoxGeometry(2.0, 0.025, 0.07);
            var beadMat = new THREE.MeshStandardMaterial({
              color: 0x7a2510, emissive: 0x4a1a08, emissiveIntensity: 0.4, roughness: 0.85
            });
            var bead = new THREE.Mesh(beadGeom, beadMat);
            jointGroup.add(bead);

            // ── Defect overlay meshes ──
            // Pre-allocated meshes for each defect type so per-frame
            // visualization doesn't create new geometry. All start hidden;
            // visibility + position are updated per frame based on computed
            // defect severity. Each defect has a distinctive visual:
            //   burnthrough  — black ring (hole) on top of bead
            //   lackOfFusion — light gray patches alongside bead (no bond)
            //   undercut     — small dark grooves alongside bead
            //   overlap      — bulging brown lobes overhanging edges
            //   spatter      — small orange spheres scattered near bead
            //   porosity     — small dark spheres on bead surface
            var defectMeshes = { burnthrough: [], lackOfFusion: [], undercut: [], overlap: [], spatter: [], porosity: [] };
            var defectMatBlack = new THREE.MeshBasicMaterial({ color: 0x000000 });
            var defectMatLOF   = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.8 });
            var defectMatUndercut = new THREE.MeshStandardMaterial({ color: 0x431407, roughness: 0.85 });
            var defectMatOverlap  = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.85 });
            var defectMatSpatter  = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
            var defectMatPorosity = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
            // Helper to create a small group of meshes per defect type
            function makeDefectMarkers(geom, mat, count) {
              var arr = [];
              for (var i = 0; i < count; i++) {
                var m = new THREE.Mesh(geom, mat);
                m.visible = false;
                jointGroup.add(m);
                arr.push(m);
              }
              return arr;
            }
            defectMeshes.burnthrough  = makeDefectMarkers(new THREE.TorusGeometry(0.05, 0.012, 6, 12), defectMatBlack, 3);
            defectMeshes.lackOfFusion = makeDefectMarkers(new THREE.BoxGeometry(0.12, 0.005, 0.03), defectMatLOF, 4);
            defectMeshes.undercut     = makeDefectMarkers(new THREE.BoxGeometry(0.18, 0.008, 0.025), defectMatUndercut, 4);
            defectMeshes.overlap      = makeDefectMarkers(new THREE.SphereGeometry(0.035, 6, 5), defectMatOverlap, 6);
            defectMeshes.spatter      = makeDefectMarkers(new THREE.SphereGeometry(0.012, 5, 4), defectMatSpatter, 12);
            defectMeshes.porosity     = makeDefectMarkers(new THREE.SphereGeometry(0.014, 6, 5), defectMatPorosity, 6);

            // ── Torch group ──
            // Same shape for all 4 processes — color of handle + nozzle
            // swap to convey process identity (MIG = black/grey, TIG =
            // black + yellow tip, Stick = orange + grey rod, Oxy = green
            // + brass tip). Travel-angle and work-angle are set per
            // process by tilting the group.
            // ── Torch (process-specific geometry) ──
            // Each process gets its own visually distinct torch built into
            // its own sub-group. applyProcessColors() (legacy name; now
            // also swaps visibility) selects which sub-group is visible.
            // This is more visually informative than just changing colors:
            // a MIG gun looks completely different from a TIG torch IRL +
            // students should learn the silhouettes.
            var torchGroup = new THREE.Group();
            jointGroup.add(torchGroup);
            // Shared dirty/dark metal material (re-used in several places)
            var handleMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
            var nozzleMat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.45, metalness: 0.7 });
            var tipMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, emissive: 0x331100, emissiveIntensity: 0.3 });

            // ── MIG gun (FCAW similar) ──
            // Pistol-grip body + curved goose-neck + cup-shaped contact-tip
            // nozzle. Visible wire feed peeking from the nozzle. Trigger
            // suggested by a small box on the underside of the grip.
            var migGroup = new THREE.Group();
            var migBody = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.08), handleMat);
            migBody.position.y = 0.30;
            migGroup.add(migBody);
            var migGrip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.20, 0.06), handleMat);
            migGrip.position.set(0, 0.18, 0);
            migGrip.rotation.x = 0.4;
            migGroup.add(migGrip);
            var migTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.04), new THREE.MeshStandardMaterial({ color: 0x404040 }));
            migTrigger.position.set(0, 0.18, 0.05);
            migGroup.add(migTrigger);
            // Goose neck — curved torch end (simplified as 3 cylinders)
            var migNeck1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 8), nozzleMat);
            migNeck1.position.set(0, 0.22, 0);
            migGroup.add(migNeck1);
            var migNeck2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.030, 0.10, 8), nozzleMat);
            migNeck2.position.set(0, 0.13, 0);
            migNeck2.rotation.z = -0.2;
            migGroup.add(migNeck2);
            // Nozzle cup — wider at bottom for gas shielding
            var migCup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.08, 12, 1, true), nozzleMat);
            migCup.position.set(0, 0.045, 0);
            migCup.material.side = THREE.DoubleSide;
            migGroup.add(migCup);
            // Visible wire feed — small bright cylinder protruding from cup
            var migWireMat = new THREE.MeshStandardMaterial({ color: 0xc0a060, roughness: 0.4, metalness: 0.8 });
            var migWire = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.06, 6), migWireMat);
            migWire.position.set(0, -0.01, 0);
            migGroup.add(migWire);
            torchGroup.add(migGroup);

            // ── TIG torch ──
            // Pencil-style straight body + ceramic gas cup + visible
            // tungsten electrode (yellow tip). Hose comes off the back.
            var tigGroup = new THREE.Group();
            var tigBody = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.32, 10), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 }));
            tigBody.position.y = 0.20;
            tigBody.rotation.z = 0.15;
            tigGroup.add(tigBody);
            // Ceramic gas cup — distinctive cream-colored cone
            var tigCupMat = new THREE.MeshStandardMaterial({ color: 0xede0c8, roughness: 0.8 });
            var tigCup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.030, 0.06, 12, 1, true), tigCupMat);
            tigCup.position.y = 0.05;
            tigCup.material.side = THREE.DoubleSide;
            tigGroup.add(tigCup);
            // Tungsten electrode — visible from cup
            var tigTungstenMat = new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xa16207, emissiveIntensity: 0.3 });
            var tigTungsten = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.003, 0.06, 6), tigTungstenMat);
            tigTungsten.position.y = -0.005;
            tigGroup.add(tigTungsten);
            // Gas hose — black flexible-looking cylinder going back from torch
            var tigHose = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.20, 8), handleMat);
            tigHose.position.set(0.02, 0.38, 0);
            tigHose.rotation.z = 0.7;
            tigGroup.add(tigHose);
            tigGroup.visible = false;
            torchGroup.add(tigGroup);

            // ── Stick electrode holder ──
            // Insulated handle + spring-loaded "stinger" jaws + electrode
            // rod sticking out. As the electrode burns down during welding
            // the visible portion would shorten — we don't animate that
            // for the steady-state view but the visible rod conveys what
            // stick welding looks like.
            var stickGroup = new THREE.Group();
            var stickHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.32, 10), new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.7 }));
            stickHandle.position.y = 0.22;
            stickGroup.add(stickHandle);
            // Jaws (stinger) — two small parallel boxes
            var stickJawMat = new THREE.MeshStandardMaterial({ color: 0x303030, metalness: 0.8 });
            var stickJaw1 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.05), stickJawMat);
            stickJaw1.position.set(0, 0.055, 0.015);
            stickGroup.add(stickJaw1);
            var stickJaw2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.05), stickJawMat);
            stickJaw2.position.set(0, 0.055, -0.015);
            stickGroup.add(stickJaw2);
            // Electrode rod — flux-coated stick poking out
            var stickRodMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e, emissive: 0x331100, emissiveIntensity: 0.2 });
            var stickRod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.20, 8), stickRodMat);
            stickRod.position.y = -0.085;
            stickGroup.add(stickRod);
            // Flux coating — slightly larger diameter at top
            var stickFlux = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9 }));
            stickFlux.position.y = -0.015;
            stickGroup.add(stickFlux);
            stickGroup.visible = false;
            torchGroup.add(stickGroup);

            // ── Oxy-fuel torch ──
            // Cutting/welding torch with two parallel hoses (oxygen +
            // acetylene), mixing chamber, valves, and a brass tip with
            // an inner cone + outer flame (rendered as two cones with
            // additive blending for the flame).
            var oxyGroup = new THREE.Group();
            var oxyBody = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.30, 10), new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 }));
            oxyBody.position.y = 0.22;
            oxyGroup.add(oxyBody);
            // Two hoses (one for oxygen — green, one for acetylene — red)
            var oxyHoseOx = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 }));
            oxyHoseOx.position.set(0.025, 0.42, 0);
            oxyHoseOx.rotation.z = 0.8;
            oxyGroup.add(oxyHoseOx);
            var oxyHoseAc = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 }));
            oxyHoseAc.position.set(-0.025, 0.42, 0);
            oxyHoseAc.rotation.z = -0.8;
            oxyGroup.add(oxyHoseAc);
            // Brass tip
            var oxyTip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.08, 10), new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.4, metalness: 0.8 }));
            oxyTip.position.y = 0.04;
            oxyGroup.add(oxyTip);
            // Inner cone (blue, hot core)
            var oxyInnerCone = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 8), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.85 }));
            oxyInnerCone.position.y = -0.02;
            oxyInnerCone.rotation.x = Math.PI;  // point downward
            oxyGroup.add(oxyInnerCone);
            // Outer flame envelope (orange)
            var oxyOuterFlame = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.10, 8), new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.45 }));
            oxyOuterFlame.position.y = -0.06;
            oxyOuterFlame.rotation.x = Math.PI;
            oxyGroup.add(oxyOuterFlame);
            oxyGroup.visible = false;
            torchGroup.add(oxyGroup);

            // ── Weld pool puddle ──
            // A flat glowing disc just ahead of the arc representing the
            // molten metal pool. Bright orange-yellow with emissive
            // material. Size scales with heat input.
            var weldPoolMat = new THREE.MeshStandardMaterial({
              color: 0xfbbf24, emissive: 0xea580c, emissiveIntensity: 0.85, roughness: 0.3
            });
            var weldPool = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), weldPoolMat);
            weldPool.rotation.x = -Math.PI / 2; // lying flat
            jointGroup.add(weldPool);

            // ── Shielding gas cone (MIG + TIG only) ──
            // Translucent cone of inert gas coming from torch nozzle
            // shielding the arc + weld pool from atmospheric oxygen +
            // nitrogen. Visible as a faint blue-white volume around the
            // tip. Hidden for stick + oxy (stick uses flux for shielding;
            // oxy uses its own flame envelope).
            var gasMat = new THREE.MeshBasicMaterial({
              color: 0xb8d4ff, transparent: true, opacity: 0.16,
              side: THREE.DoubleSide, depthWrite: false
            });
            var gasCone = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 16, 1, true), gasMat);
            gasCone.rotation.x = Math.PI; // point downward
            jointGroup.add(gasCone);

            // ── Workspace environment ──
            // Outside jointGroup so they don't rotate with the position.
            // These add atmospheric context — what a real welder's
            // workspace looks like, even though the simulation focuses on
            // the bead. None of these affect physics; pure visual.

            // Bench vise (off to one side)
            var viseBase = new THREE.Mesh(
              new THREE.BoxGeometry(0.18, 0.14, 0.14),
              new THREE.MeshStandardMaterial({ color: 0x4b1d04, roughness: 0.7 })
            );
            viseBase.position.set(1.50, 0.0, -0.65);
            scene.add(viseBase);
            var viseJaw = new THREE.Mesh(
              new THREE.BoxGeometry(0.14, 0.08, 0.04),
              new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 })
            );
            viseJaw.position.set(1.50, 0.11, -0.62);
            scene.add(viseJaw);
            var viseScrew = new THREE.Mesh(
              new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8),
              new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.8 })
            );
            viseScrew.rotation.z = Math.PI / 2;
            viseScrew.position.set(1.55, 0.04, -0.65);
            scene.add(viseScrew);

            // C-clamp (alternate, smaller) holding the plate edge — IRL
            // welders fixture plates with c-clamps to prevent distortion.
            var clampBody = new THREE.Mesh(
              new THREE.BoxGeometry(0.04, 0.10, 0.04),
              new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.7 })
            );
            clampBody.position.set(-0.95, 0.04, -0.55);
            scene.add(clampBody);
            var clampScrew = new THREE.Mesh(
              new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8),
              new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.8 })
            );
            clampScrew.position.set(-0.95, 0.10, -0.55);
            scene.add(clampScrew);

            // Ground clamp on plate edge with cable trailing off
            // Welding circuit requires ground/work clamp on the workpiece.
            var groundClamp = new THREE.Mesh(
              new THREE.BoxGeometry(0.06, 0.04, 0.04),
              new THREE.MeshStandardMaterial({ color: 0xa16207, metalness: 0.5 })
            );
            groundClamp.position.set(-0.95, 0.03, 0.55);
            scene.add(groundClamp);
            // Ground cable — black cylinder snaking off the edge of bench
            var groundCable = new THREE.Mesh(
              new THREE.CylinderGeometry(0.014, 0.014, 1.2, 6),
              new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
            );
            groundCable.rotation.z = -1.2;
            groundCable.position.set(-1.40, -0.08, 0.60);
            scene.add(groundCable);

            // Gas cylinder (off to the side) — shielding gas (argon/CO2/argon-mix)
            // for MIG + TIG. Visually distinctive tall cylinder + valve cap.
            var cylinderMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5, metalness: 0.4 });
            var gasCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.2, 16), cylinderMat);
            gasCylinder.position.set(-1.7, 0.55, 0.4);
            scene.add(gasCylinder);
            var cylinderCap = new THREE.Mesh(
              new THREE.CylinderGeometry(0.14, 0.18, 0.12, 12),
              new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.8 })
            );
            cylinderCap.position.set(-1.7, 1.20, 0.4);
            scene.add(cylinderCap);
            // Regulator + gauges on top of cylinder
            var regulator = new THREE.Mesh(
              new THREE.BoxGeometry(0.12, 0.08, 0.10),
              new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.7 })
            );
            regulator.position.set(-1.7, 1.31, 0.4);
            scene.add(regulator);
            // Gauge faces
            var gauge1 = new THREE.Mesh(
              new THREE.CylinderGeometry(0.035, 0.035, 0.015, 10),
              new THREE.MeshBasicMaterial({ color: 0xfafafa })
            );
            gauge1.rotation.x = Math.PI / 2;
            gauge1.position.set(-1.74, 1.34, 0.46);
            scene.add(gauge1);
            var gauge2 = new THREE.Mesh(
              new THREE.CylinderGeometry(0.035, 0.035, 0.015, 10),
              new THREE.MeshBasicMaterial({ color: 0xfafafa })
            );
            gauge2.rotation.x = Math.PI / 2;
            gauge2.position.set(-1.66, 1.34, 0.46);
            scene.add(gauge2);
            // Gas hose coming off regulator (goes off-screen toward torch)
            var supplyHose = new THREE.Mesh(
              new THREE.CylinderGeometry(0.018, 0.018, 1.4, 6),
              new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7 })
            );
            supplyHose.rotation.z = -0.6;
            supplyHose.position.set(-1.0, 1.0, 0.45);
            scene.add(supplyHose);

            // ── Welder gloved hand on torch ──
            // Stylized leather-glove shape gripping the torch. Hand stays
            // in place; the torch swivels with workAngle. Visual cue only —
            // teaches that welding is hand-held + posture-based, not
            // mounted-tool work like CNC.
            var gloveMat = new THREE.MeshStandardMaterial({ color: 0x422006, roughness: 0.85 });
            var gloveHand = new THREE.Group();
            // Palm (rounded box)
            var palm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.09), gloveMat);
            palm.position.y = 0;
            gloveHand.add(palm);
            // Cuff (going up the arm)
            var cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 8), gloveMat);
            cuff.position.set(0.04, 0.05, 0);
            cuff.rotation.z = 0.5;
            gloveHand.add(cuff);
            // Thumb (small bump)
            var thumb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), gloveMat);
            thumb.position.set(-0.025, 0.02, 0.045);
            gloveHand.add(thumb);
            // Knuckles (4 small bumps)
            for (var kk = 0; kk < 4; kk++) {
              var kn = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), gloveMat);
              kn.position.set(-0.025 + kk * 0.018, 0.03, -0.04);
              gloveHand.add(kn);
            }
            // Hand stays attached to torchGroup so it moves with the torch
            gloveHand.position.set(0, 0.30, 0);
            torchGroup.add(gloveHand);

            // ── Heat color gradient on plate ──
            // Instead of using a texture, we vary the plate's emissive
            // material from cool-grey to red-hot near the arc. This is
            // suggestive; real heat distribution is more complex. The
            // emissive intensity scales with proximity to the arc.
            plateMat.emissive = new THREE.Color(0x4a0a00);
            plateMat.emissiveIntensity = 0;  // off by default; set per frame

            // ── Slag layer (stick + flux core only) ──
            // Layer of brownish slag covering the bead. Cools to a
            // glassy crust that's chipped off after welding. We render
            // it as a thin offset bead with darker color.
            var slagMat = new THREE.MeshStandardMaterial({
              color: 0x4b2d0f, roughness: 0.95, transparent: true, opacity: 0.85
            });
            var slag = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.005, 0.10), slagMat);
            slag.visible = false; // only for stick/flux-core
            jointGroup.add(slag);

            // Store the new pieces on sceneRef for render-loop access
            sceneRef.current = sceneRef.current || {};

            // ── Arc + arc light ──
            var arcMat = new THREE.MeshBasicMaterial({ color: 0xffeeaa, transparent: true, opacity: 0.95 });
            var arcSphere = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), arcMat);
            jointGroup.add(arcSphere);
            var arcLight = new THREE.PointLight(0xffddaa, 1.8, 2.0, 2);
            jointGroup.add(arcLight);

            // ── Sparks ──
            // 12 small spheres updated per frame. Stateless math (same
            // pattern as the 2D view) — positions derived from elapsed +
            // index, no per-spark buffer.
            var sparkCount = 12;
            var sparks = [];
            var sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.9 });
            for (var si = 0; si < sparkCount; si++) {
              var sp = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), sparkMat.clone());
              jointGroup.add(sp);
              sparks.push(sp);
            }

            // Initial joint build so plates + bead anchor are correct
            // before the first frame.
            var beadAnchor = rebuildJoint(props.jointType || 'butt', props.TH);
            // Apply initial weld position rotation
            var posRot = _positionRotation(props.weldPosition || '1G');
            jointGroup.rotation.set(posRot.x, posRot.y, posRot.z);

            // ── Process selector ──
            // Picks which torch sub-group (MIG/TIG/Stick/Oxy) is visible.
            // Also toggles the shielding gas cone (MIG + TIG only — Stick
            // uses flux for shielding, Oxy provides its own flame envelope).
            var lastProcess = null;
            function applyProcessColors(p) {
              if (p === lastProcess) return;
              lastProcess = p;
              migGroup.visible = (p === 'mig');
              tigGroup.visible = (p === 'tig');
              stickGroup.visible = (p === 'stick');
              oxyGroup.visible = (p === 'oxy');
              // Gas cone visible only for shielded-gas processes
              gasCone.visible = (p === 'mig' || p === 'tig');
              // Slag visible only for flux processes (stick + flux-core).
              // In FCAW + SMAW, the flux coating creates a glassy slag
              // covering on top of the bead that protects from atmosphere
              // as it cools; welders chip it off after each pass.
              slag.visible = (p === 'stick');
              // Weld pool color shifts subtly per process:
              //   MIG/Stick — oranger (more spatter, faster freeze)
              //   TIG       — brighter yellow-white (cleaner pool)
              //   Oxy       — orange-red (slower-burning gas flame)
              if (p === 'tig') {
                weldPoolMat.color.setHex(0xfde047);
                weldPoolMat.emissive.setHex(0xfb923c);
                weldPoolMat.emissiveIntensity = 1.0;
              } else if (p === 'oxy') {
                weldPoolMat.color.setHex(0xea580c);
                weldPoolMat.emissive.setHex(0xb91c1c);
                weldPoolMat.emissiveIntensity = 0.75;
              } else {
                weldPoolMat.color.setHex(0xfbbf24);
                weldPoolMat.emissive.setHex(0xea580c);
                weldPoolMat.emissiveIntensity = 0.85;
              }
            }

            sceneRef.current = {
              scene: scene, camera: camera, renderer: renderer,
              jointGroup: jointGroup,
              plateA: plateA, plateB: plateB, plateMat: plateMat,
              rebuildJoint: rebuildJoint, beadAnchor: beadAnchor,
              currentJointType: props.jointType || 'butt',
              currentPosition: props.weldPosition || '1G',
              currentTH: props.TH,
              torchGroup: torchGroup,
              arcSphere: arcSphere, arcMat: arcMat, arcLight: arcLight,
              bead: bead, beadMat: beadMat,
              defectMeshes: defectMeshes,
              sparks: sparks,
              camAngle: camAngle, syncCamera: syncCamera,
              applyProcessColors: applyProcessColors,
              startTime: performance.now(),
              dispose: null
            };

            setStatus('ready');

            // ── RAF loop ──
            function loop(now) {
              if (cancelled) return;
              var s = sceneRef.current;
              if (!s) return;
              var live = liveRef.current;
              if (!live) {
                rafRef.current = requestAnimationFrame(loop);
                return;
              }
              var elapsed = (now - s.startTime) / 1000;
              var travelTime = 6.0 * (12 / Math.max(3, live.TS));
              var t = _prefersReducedMotion
                ? 0.95
                : ((elapsed % travelTime) / travelTime);

              // React to joint type / position / thickness prop changes
              // (re-build joint geometry + apply position rotation).
              if (s.currentJointType !== (props.jointType || 'butt') ||
                  s.currentTH !== props.TH) {
                s.currentJointType = props.jointType || 'butt';
                s.currentTH = props.TH;
                s.beadAnchor = s.rebuildJoint(s.currentJointType, props.TH);
              }
              if (s.currentPosition !== (props.weldPosition || '1G')) {
                s.currentPosition = props.weldPosition || '1G';
                var pr = _positionRotation(s.currentPosition);
                s.jointGroup.rotation.set(pr.x, pr.y, pr.z);
              }

              // Plate color (mat changes apply to shared material)
              s.plateMat.color.setStyle(live.mat.color);

              var anchor = s.beadAnchor;
              var anchorY = anchor.y;
              var anchorZ = anchor.z;
              var beadLen = anchor.length;
              var beadStartX = -beadLen / 2;

              // Bead — grows with arc travel. Width tracks heat-input
              // physics via beadWidth from liveRef (in inches; visual scale
              // 1" plate-edge ≈ 1 unit in scene, so bead pixels need ~×3).
              var beadWidthVis = Math.max(0.04, Math.min(0.18, live.beadWidth * 0.6));
              s.bead.scale.set(t || 0.001, 1, beadWidthVis / 0.07);
              s.bead.position.set(beadStartX + (beadLen * t) / 2, anchorY, anchorZ);

              // Torch position — follows arc tip
              var torchX = beadStartX + beadLen * t;
              s.torchGroup.position.set(torchX, anchorY + 0.12, anchorZ);
              // Work angle: tilt slightly forward (push or drag depending on process)
              var workAngle = (live.P === 'tig' || live.P === 'stick') ? 0.22 : -0.22;
              s.torchGroup.rotation.z = workAngle;

              // Process colors
              s.applyProcessColors(live.P);

              // Arc — sphere + light + opacity pulse
              s.arcSphere.position.set(torchX, anchorY + 0.012, anchorZ);
              s.arcLight.position.set(torchX, anchorY + 0.16, anchorZ);
              if (_prefersReducedMotion) {
                s.arcMat.opacity = 0.9;
                s.arcLight.intensity = 1.5;
              } else {
                var pulse = 0.7 + 0.3 * Math.sin(elapsed * 30);
                s.arcMat.opacity = pulse;
                s.arcLight.intensity = 1.4 + pulse * 0.7;
              }

              // Weld pool puddle — glowing disc tracking torch tip.
              // Size scales with heat input (more heat → wider pool).
              // Hidden when bead is "done" (t ≈ 1) to suggest arc has stopped.
              var poolSize = 0.05 + Math.min(0.08, (live.net || 20) / 1000);
              weldPool.scale.set(poolSize / 0.07, 1, poolSize / 0.07);
              weldPool.position.set(torchX - 0.02, anchorY + 0.002, anchorZ);
              weldPool.visible = (t < 0.99);
              // Pulse pool emissive slightly with arc pulse for liveness
              if (!_prefersReducedMotion) {
                weldPoolMat.emissiveIntensity = 0.75 + 0.25 * (Math.sin(elapsed * 12) * 0.5 + 0.5);
              }

              // Shielding gas cone — translucent cone from torch nozzle
              // covering the arc + weld pool. Only visible when arc is on
              // (gas flows only while welding). Scales gently with amperage
              // (higher amperage → more aggressive arc → wider gas envelope).
              var gasScale = 1 + Math.min(0.4, (props.A || 200) / 400);
              gasCone.position.set(torchX, anchorY + 0.07, anchorZ);
              gasCone.scale.set(gasScale, 1, gasScale);
              gasCone.visible = (gasCone.visible && t < 0.99);
              if (!_prefersReducedMotion) {
                // Faint flicker — gas flow isn't actually visible IRL, but
                // a subtle wave conveys the shielding-gas concept
                gasMat.opacity = 0.12 + 0.06 * (Math.sin(elapsed * 4) * 0.5 + 0.5);
              }

              // Slag layer (stick only) — grows behind the arc same as bead
              if (slag.visible) {
                slag.scale.set(t || 0.001, 1, beadWidthVis / 0.10 + 0.2);
                slag.position.set(beadStartX + (beadLen * t) / 2, anchorY + 0.014, anchorZ);
              }

              // Heat color gradient on plate — emissive intensity glows
              // brightest near current arc position, fades back along the
              // bead (showing where the metal is still hot from previous
              // arc passage). This is a simplification of real heat
              // distribution but pedagogically conveys "heat spreads + cools."
              if (live.P !== 'oxy') {
                var heatMag = Math.min(0.8, (live.net || 20) / 80);
                if (t < 0.99) {
                  plateMat.emissiveIntensity = heatMag * (0.6 + 0.4 * Math.sin(elapsed * 8));
                } else {
                  plateMat.emissiveIntensity = heatMag * 0.4; // residual heat after weld
                }
              } else {
                plateMat.emissiveIntensity = 0.15; // oxy is lower heat overall
              }

              // Sparks — only when arc is welding (t < 1) and motion allowed
              if (t < 0.99 && !_prefersReducedMotion) {
                for (var sk = 0; sk < s.sparks.length; sk++) {
                  var sphase = (elapsed * 50 + sk * 1.7) % 1;
                  var sangle = (sk / s.sparks.length) * Math.PI * 2 + elapsed * 6 + sk;
                  var sdist = 0.04 + sphase * 0.30;
                  var sx = torchX + Math.cos(sangle) * sdist;
                  var sy = anchorY + Math.abs(Math.sin(sangle * 0.6)) * sdist * 0.8;
                  var sz = anchorZ + Math.sin(sangle) * sdist * 0.45;
                  s.sparks[sk].position.set(sx, sy, sz);
                  s.sparks[sk].material.opacity = (1 - sphase) * 0.85;
                  s.sparks[sk].visible = true;
                }
              } else {
                for (var sh = 0; sh < s.sparks.length; sh++) s.sparks[sh].visible = false;
              }

              // ── Defect rendering ──
              // Recompute defect set each frame; cheap (just arithmetic).
              // Each defect type maps to its own marker mesh array; markers
              // become visible + positioned along the bead based on severity.
              if (props.showDefects) {
                var defects = _computeWeldDefects(live.net, props.TH, props.V, props.A, live.TS, live.P);
                var bm = s.defectMeshes;
                // Burnthrough — up to 3 holes punched through where heat density highest
                for (var bi = 0; bi < bm.burnthrough.length; bi++) {
                  var bx = beadStartX + (bi + 1) * (beadLen / 4);
                  if (defects.burnthrough > 0.2 && bx < torchX - 0.05) {
                    bm.burnthrough[bi].visible = true;
                    bm.burnthrough[bi].position.set(bx, anchorY + 0.01, anchorZ);
                    bm.burnthrough[bi].rotation.x = Math.PI / 2;
                    bm.burnthrough[bi].scale.setScalar(0.5 + defects.burnthrough * 0.8);
                  } else bm.burnthrough[bi].visible = false;
                }
                // Lack of fusion — bumpy patches along bead edges (visible as gray boxes alongside)
                for (var li = 0; li < bm.lackOfFusion.length; li++) {
                  var lx = beadStartX + (li + 0.5) * (beadLen / bm.lackOfFusion.length);
                  if (defects.lackOfFusion > 0.2 && lx < torchX - 0.05) {
                    bm.lackOfFusion[li].visible = true;
                    var lzSide = (li % 2 === 0) ? -beadWidthVis * 0.6 : beadWidthVis * 0.6;
                    bm.lackOfFusion[li].position.set(lx, anchorY - 0.005, anchorZ + lzSide);
                    bm.lackOfFusion[li].scale.set(1, defects.lackOfFusion, 1);
                  } else bm.lackOfFusion[li].visible = false;
                }
                // Undercut — dark grooves alongside bead at edges
                for (var ui = 0; ui < bm.undercut.length; ui++) {
                  var ux = beadStartX + (ui + 0.5) * (beadLen / bm.undercut.length);
                  if (defects.undercut > 0.2 && ux < torchX - 0.05) {
                    bm.undercut[ui].visible = true;
                    var uzSide = (ui % 2 === 0) ? -beadWidthVis * 0.85 : beadWidthVis * 0.85;
                    bm.undercut[ui].position.set(ux, anchorY - 0.01, anchorZ + uzSide);
                    bm.undercut[ui].scale.set(1, defects.undercut * 1.5, 1);
                  } else bm.undercut[ui].visible = false;
                }
                // Overlap — brown lobes bulging from bead edges
                for (var oi = 0; oi < bm.overlap.length; oi++) {
                  var ox = beadStartX + (oi + 0.5) * (beadLen / bm.overlap.length);
                  if (defects.overlap > 0.2 && ox < torchX - 0.05) {
                    bm.overlap[oi].visible = true;
                    var ozSide = (oi % 2 === 0) ? -beadWidthVis * 0.9 : beadWidthVis * 0.9;
                    bm.overlap[oi].position.set(ox, anchorY + 0.005, anchorZ + ozSide);
                    bm.overlap[oi].scale.setScalar(0.6 + defects.overlap * 0.8);
                  } else bm.overlap[oi].visible = false;
                }
                // Spatter — orange dots scattered in random pattern around current arc
                for (var si2 = 0; si2 < bm.spatter.length; si2++) {
                  if (defects.spatter > 0.2 && t < 0.99) {
                    bm.spatter[si2].visible = true;
                    var sAng = (si2 / bm.spatter.length) * Math.PI * 2 + Math.sin(elapsed * 2 + si2) * 0.5;
                    var sR = 0.08 + (si2 % 3) * 0.04;
                    bm.spatter[si2].position.set(
                      torchX + Math.cos(sAng) * sR,
                      anchorY + 0.005 + Math.abs(Math.sin(sAng * 0.3)) * 0.02,
                      anchorZ + Math.sin(sAng) * sR * 0.5
                    );
                  } else bm.spatter[si2].visible = false;
                }
                // Porosity — dark spheres embedded in bead at fixed positions
                for (var pi = 0; pi < bm.porosity.length; pi++) {
                  var px = beadStartX + (pi + 0.5) * (beadLen / bm.porosity.length);
                  if (defects.porosity > 0.2 && px < torchX - 0.05) {
                    bm.porosity[pi].visible = true;
                    var pzJitter = ((pi % 3) - 1) * beadWidthVis * 0.4;
                    bm.porosity[pi].position.set(px, anchorY + 0.012, anchorZ + pzJitter);
                    bm.porosity[pi].scale.setScalar(0.5 + defects.porosity * 0.7);
                  } else bm.porosity[pi].visible = false;
                }
              } else {
                // Hide all defect markers when overlay is off
                Object.keys(s.defectMeshes).forEach(function(k) {
                  for (var hi = 0; hi < s.defectMeshes[k].length; hi++) {
                    s.defectMeshes[k][hi].visible = false;
                  }
                });
              }

              // ── Cross-section render (small inset canvas) ──
              // Draw a side-view of the bead profile when toggle is on.
              // Uses Canvas2D on a separate canvas; cheap + flexible for
              // educational annotation (penetration line, HAZ glow,
              // reinforcement crown).
              if (props.showCrossSection && crossSectionRef.current) {
                var xc = crossSectionRef.current;
                if (xc._lastFrame !== Math.floor(elapsed * 10)) {  // throttle to 10fps
                  xc._lastFrame = Math.floor(elapsed * 10);
                  var xctx = xc.getContext('2d');
                  var XW = xc.width, XH = xc.height;
                  xctx.fillStyle = '#0f172a';
                  xctx.fillRect(0, 0, XW, XH);
                  // Base plate
                  var plateTop = XH * 0.55;
                  var plateBottom = XH * 0.92;
                  var plateLeft = XW * 0.1;
                  var plateRight = XW * 0.9;
                  xctx.fillStyle = live.mat.color;
                  xctx.fillRect(plateLeft, plateTop, plateRight - plateLeft, plateBottom - plateTop);
                  xctx.strokeStyle = '#94a3b8';
                  xctx.lineWidth = 1.5;
                  xctx.strokeRect(plateLeft, plateTop, plateRight - plateLeft, plateBottom - plateTop);
                  // HAZ (Heat Affected Zone) — orange-ish glow around bead
                  var beadCenterX = (plateLeft + plateRight) / 2;
                  var beadHalfW = ((live.beadWidth || 0.2) / 0.5) * (XW * 0.18);
                  var hazW = beadHalfW * 2.2;
                  var hazGrad = xctx.createRadialGradient(beadCenterX, plateTop, beadHalfW * 0.4, beadCenterX, plateTop, hazW);
                  hazGrad.addColorStop(0, 'rgba(251, 146, 60, 0.65)');
                  hazGrad.addColorStop(0.5, 'rgba(251, 146, 60, 0.30)');
                  hazGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
                  xctx.fillStyle = hazGrad;
                  xctx.fillRect(beadCenterX - hazW, plateTop - 5, hazW * 2, hazW + 8);
                  // Penetration depth visualization (dipping into plate)
                  var penDepth = Math.min((plateBottom - plateTop) * 0.95,
                    ((live.net || 20) / 80) * (plateBottom - plateTop));
                  xctx.fillStyle = '#7a2510';
                  xctx.beginPath();
                  xctx.ellipse(beadCenterX, plateTop, beadHalfW, penDepth, 0, 0, Math.PI);
                  xctx.fill();
                  // Reinforcement (crown above plate)
                  var crownH = beadHalfW * 0.6;
                  xctx.fillStyle = '#a3360d';
                  xctx.beginPath();
                  xctx.ellipse(beadCenterX, plateTop, beadHalfW, crownH, 0, Math.PI, Math.PI * 2);
                  xctx.fill();
                  xctx.strokeStyle = 'rgba(0,0,0,0.4)';
                  xctx.lineWidth = 1;
                  xctx.stroke();
                  // Annotations
                  xctx.font = 'bold 11px ui-monospace, Consolas, monospace';
                  xctx.fillStyle = '#e2e8f0';
                  xctx.textAlign = 'left';
                  xctx.fillText('Cross-section view', 8, 16);
                  xctx.font = '10px ui-monospace, Consolas, monospace';
                  xctx.fillStyle = '#fbbf24';
                  xctx.fillText('← HAZ', beadCenterX + hazW + 4, plateTop + 8);
                  xctx.fillStyle = '#fdba74';
                  xctx.fillText('← Reinforcement (crown)', beadCenterX + beadHalfW + 4, plateTop - crownH * 0.6);
                  xctx.fillStyle = '#fca5a5';
                  xctx.fillText('← Penetration', beadCenterX + beadHalfW + 4, plateTop + penDepth * 0.5);
                  xctx.fillStyle = '#cbd5e1';
                  xctx.fillText('Base metal', plateLeft + 4, plateBottom - 4);
                }
              }

              s.renderer.render(s.scene, s.camera);
              rafRef.current = requestAnimationFrame(loop);
            }
            rafRef.current = requestAnimationFrame(loop);

            // ── Pointer + wheel controls ──
            var dragging = false;
            var lastX = 0, lastY = 0;
            function onPointerDown(e) {
              dragging = true;
              lastX = e.clientX; lastY = e.clientY;
              try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
            }
            function onPointerMove(e) {
              if (!dragging) return;
              var dx = (e.clientX - lastX) * 0.008;
              var dy = (e.clientY - lastY) * 0.008;
              camAngle.az -= dx;
              camAngle.el = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, camAngle.el - dy));
              lastX = e.clientX; lastY = e.clientY;
              syncCamera();
            }
            function onPointerUp(e) {
              dragging = false;
              try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
            }
            function onWheel(e) {
              e.preventDefault();
              camAngle.r = Math.max(1.6, Math.min(7.5, camAngle.r + e.deltaY * 0.0035));
              syncCamera();
            }
            canvas.addEventListener('pointerdown', onPointerDown);
            canvas.addEventListener('pointermove', onPointerMove);
            canvas.addEventListener('pointerup', onPointerUp);
            canvas.addEventListener('pointercancel', onPointerUp);
            canvas.addEventListener('wheel', onWheel, { passive: false });

            // Keyboard alternative — arrow keys orbit, +/- zoom
            function onKey(e) {
              var step = 0.08;
              if (e.key === 'ArrowLeft')  { camAngle.az += step; syncCamera(); e.preventDefault(); }
              else if (e.key === 'ArrowRight') { camAngle.az -= step; syncCamera(); e.preventDefault(); }
              else if (e.key === 'ArrowUp')   { camAngle.el = Math.min(Math.PI / 2 - 0.05, camAngle.el + step); syncCamera(); e.preventDefault(); }
              else if (e.key === 'ArrowDown') { camAngle.el = Math.max(0.05, camAngle.el - step); syncCamera(); e.preventDefault(); }
              else if (e.key === '+' || e.key === '=') { camAngle.r = Math.max(1.6, camAngle.r - 0.3); syncCamera(); e.preventDefault(); }
              else if (e.key === '-' || e.key === '_') { camAngle.r = Math.min(7.5, camAngle.r + 0.3); syncCamera(); e.preventDefault(); }
            }
            canvas.addEventListener('keydown', onKey);

            // Resize handler — re-fit renderer + aspect to container width
            function onResize() {
              if (cancelled) return;
              var w = canvas.clientWidth || 600;
              renderer.setSize(w, H, false);
              camera.aspect = w / H;
              camera.updateProjectionMatrix();
            }
            window.addEventListener('resize', onResize);

            // Stash teardown
            sceneRef.current.dispose = function () {
              canvas.removeEventListener('pointerdown', onPointerDown);
              canvas.removeEventListener('pointermove', onPointerMove);
              canvas.removeEventListener('pointerup', onPointerUp);
              canvas.removeEventListener('pointercancel', onPointerUp);
              canvas.removeEventListener('wheel', onWheel);
              canvas.removeEventListener('keydown', onKey);
              window.removeEventListener('resize', onResize);
              try {
                benchGeom.dispose(); benchMat.dispose();
                plateMat.dispose();
                plateA.geometry.dispose();
                plateB.geometry.dispose();
                handleGeom.dispose(); handleMat.dispose();
                nozzleGeom.dispose(); nozzleMat.dispose();
                tipGeom.dispose(); tipMat.dispose();
                beadGeom.dispose(); beadMat.dispose();
                arcMat.dispose(); arcSphere.geometry.dispose();
                for (var di = 0; di < sparks.length; di++) {
                  sparks[di].geometry.dispose();
                  if (sparks[di].material && sparks[di].material.dispose) sparks[di].material.dispose();
                }
                // Dispose defect meshes + materials
                Object.keys(defectMeshes).forEach(function(k) {
                  for (var dx = 0; dx < defectMeshes[k].length; dx++) {
                    if (defectMeshes[k][dx].geometry && defectMeshes[k][dx].geometry.dispose) defectMeshes[k][dx].geometry.dispose();
                  }
                });
                defectMatBlack.dispose(); defectMatLOF.dispose();
                defectMatUndercut.dispose(); defectMatOverlap.dispose();
                defectMatSpatter.dispose(); defectMatPorosity.dispose();
                renderer.dispose();
                renderer.forceContextLoss();
              } catch (e) { /* best-effort cleanup */ }
            };
          }

          // Lazy-load Three.js — same CDN + r128 used in RoadReady.
          if (window.THREE) {
            init();
          } else {
            var s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            s.async = true;
            s.onload = function () { if (!cancelled) init(); };
            s.onerror = function () {
              if (cancelled) return;
              console.error('[WeldLab] Three.js failed to load');
              setStatus('error');
            };
            document.head.appendChild(s);
          }

          return function () {
            cancelled = true;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (sceneRef.current && sceneRef.current.dispose) sceneRef.current.dispose();
            sceneRef.current = null;
          };
        }, []);

        return h('div', {
          className: 'bg-slate-900 rounded-2xl shadow border-2 border-slate-700 p-3 relative'
        },
          h('canvas', {
            ref: canvasRef,
            tabIndex: 0,
            role: 'img',
            'aria-label': '3D welding scene. ' + (props.ariaLabel || '') + ' Drag to orbit camera, scroll to zoom, arrow keys to orbit, plus or minus to zoom.',
            className: 'w-full block rounded-lg outline-none focus:ring-2 focus:ring-orange-500/40',
            style: { height: 280, touchAction: 'none', cursor: 'grab' }
          }),
          // Loading state
          status === 'loading' && h('div', {
            className: 'absolute inset-0 flex items-center justify-center bg-slate-900/85 rounded-lg pointer-events-none'
          },
            h('div', { className: 'flex items-center gap-2 text-slate-300 text-sm' },
              h('span', { className: 'animate-pulse' }, '🎥'),
              h('span', null, 'Loading 3D scene…')
            )
          ),
          // Error state — three.js failed to load
          status === 'error' && h('div', {
            'role': 'alert',
            className: 'absolute inset-0 flex items-center justify-center bg-slate-900/95 rounded-lg p-4 text-center'
          },
            h('div', null,
              h('div', { className: 'text-rose-300 text-sm font-bold mb-2' }, '3D view unavailable'),
              h('div', { className: 'text-slate-300 text-xs leading-relaxed max-w-xs' },
                'Three.js failed to load (CDN blocked, offline, or WebGL not supported on this device). Switch back to top-down view above.')
            )
          ),
          // Camera controls overlay (only when scene is ready)
          status === 'ready' && h('div', { className: 'absolute top-3 right-3 flex gap-2' },
            h('button', {
              'aria-label': 'Reset camera to default angle',
              onClick: resetCamera,
              className: 'px-2 py-1 rounded bg-slate-800/85 text-slate-200 text-xs font-bold border border-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 ring-orange-500/40'
            }, '↺ Reset camera')
          ),
          // Hint strip
          status === 'ready' && h('div', { className: 'mt-2 text-[11px] text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1' },
            h('span', null, '🖱 Drag to orbit'),
            h('span', null, '⚙ Wheel to zoom'),
            h('span', null, '⌨ Arrow keys + / − for keyboard control'),
            h('span', { className: 'text-slate-400' }, '— same V/A/TS controls above drive both views')
          ),
          // Cross-section inset — visible only when toggle is on
          status === 'ready' && props.showCrossSection && h('div', { className: 'mt-3 pt-3 border-t border-slate-700' },
            h('canvas', {
              ref: crossSectionRef,
              width: 540,
              height: 200,
              role: 'img',
              'aria-label': 'Cross-section profile view showing penetration depth, heat-affected zone, and reinforcement crown',
              className: 'w-full block rounded-lg bg-slate-950'
            }),
            h('div', { className: 'mt-1.5 text-[10px] text-slate-400 leading-snug' },
              'The cross-section view is what an inspector sees when they cut the weld in half + polish + etch with nital (carbon steel) or oxalic (stainless). ',
              'The bright dome above the plate is the ',
              h('span', { className: 'text-amber-300 font-bold' }, 'reinforcement crown'),
              ' (excess filler stacked above the surface — should be ~1–3 mm for code). ',
              'The orange halo is the ',
              h('span', { className: 'text-amber-300 font-bold' }, 'heat-affected zone (HAZ)'),
              ' — base metal that didn\'t melt but reached temperatures high enough to change grain structure + properties. ',
              'The depth into the plate is the ',
              h('span', { className: 'text-rose-300 font-bold' }, 'penetration'),
              ' — how deep into the base metal the fusion actually went.'
            )
          ),
          // Defect legend — visible only when defect overlay is on
          status === 'ready' && props.showDefects && h('div', { className: 'mt-3 pt-3 border-t border-slate-700' },
            h('div', { className: 'text-xs font-bold uppercase tracking-wider text-orange-300 mb-2' }, '🔍 Defect Overlay Legend'),
            h('div', { className: 'grid grid-cols-2 md:grid-cols-3 gap-2' },
              defectLegend.map(function(d) {
                return h('div', { key: d.key, className: 'flex items-center gap-2 text-xs text-slate-200' },
                  h('span', {
                    'aria-hidden': true,
                    className: 'inline-block w-3 h-3 rounded-full',
                    style: { backgroundColor: d.color, border: '1px solid #475569' }
                  }),
                  h('span', { className: 'font-bold' }, d.label),
                  h('span', { className: 'text-slate-400 text-[11px]' }, '— ' + d.desc)
                );
              })
            ),
            h('div', { className: 'mt-2 text-[11px] text-slate-400 leading-snug' },
              '⚠ Defects appear when your parameters cross unsafe thresholds. Try ',
              h('span', { className: 'text-orange-300 font-bold' }, 'V=14, A=300, TS=4 on 1/8" steel'),
              ' to trigger burnthrough. Try ',
              h('span', { className: 'text-orange-300 font-bold' }, 'V=14, A=80, TS=22 on 3/8" steel'),
              ' to trigger lack of fusion. Real welders read their bead this way — every defect has a parameter cause.'
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 2 (companion): WELD BEAD HELMET POV
      // ─────────────────────────────────────────────────────
      // First-person view through an auto-darkening welding hood. Pure
      // Canvas2D — no Three.js needed (the educational point is about
      // *lighting* and *limited visibility*, not 3D geometry).
      //
      // Why this view exists: most students think welders see the work
      // clearly. They don't. The auto-darkening lens drops to roughly
      // Shade 11 within ~1 ms of arc strike. Once the arc is going, the
      // welder sees: the bright arc itself, an orange penumbra immediately
      // around the weld pool, sparks, and almost nothing else. Plate
      // edges are faint dark shapes. The gloved hand on the torch is in
      // peripheral vision.
      //
      // This view teaches:
      //   1. Why auto-darkening helmets matter (vs old fixed-shade hoods)
      //   2. Why welding takes years — you're working partly by feel
      //   3. The role of the "starting point" you established before
      //      striking the arc (you can't see fine detail once it's lit)
      //
      // Visual recipe per frame:
      //   - Mostly black canvas (the inside of the lens at Shade 11)
      //   - Vignette: darker at edges (helmet bezel cuts the FOV)
      //   - Arc bloom: bright yellow-white radial gradient at arc position
      //   - Plate around arc: orange-glowing penumbra
      //   - Bead trail: dim orange line behind the arc
      //   - Plate edges: faint dark grey rectangle outline
      //   - Sparks: bright yellow streaks
      //   - Gloved hands silhouette: dark shapes in bottom corners
      //   - Top-left HUD: "Shade 11 — auto-darkened" status
      //
      // Honors prefers-reduced-motion: arc holds at end position, no
      // pulsing, no sparks, no per-frame redraw.
      function WeldBeadLabHelmet(props) {
        var canvasRef = useRef(null);
        var rafRef = useRef(null);
        var startRef = useRef(0);
        var liveRef = props.liveRef;

        useEffect(function () {
          var canvas = canvasRef.current;
          if (!canvas) return;
          if (window.StemLab && window.StemLab.setupHiDPI) {
            window.StemLab.setupHiDPI(canvas, canvas._logicalW || canvas.width, canvas._logicalH || canvas.height);
          }
          var ctxC = canvas.getContext('2d');
          if (canvas._dpr) ctxC.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);
          var W = canvas._logicalW || canvas.width;
          var H = canvas._logicalH || canvas.height;
          startRef.current = performance.now();

          function draw(now) {
            if (!canvasRef.current) return;
            var live = liveRef.current || {};
            var elapsed = (now - startRef.current) / 1000;
            var travelTime = 6.0 * (12 / Math.max(3, live.TS || 12));
            var t = _prefersReducedMotion ? 0.95 : ((elapsed % travelTime) / travelTime);

            // ── Background: deep black (Shade 11 lens) ──
            ctxC.fillStyle = '#020308';
            ctxC.fillRect(0, 0, W, H);

            // Plate edges — faint dark-grey rectangle. Welder DOES see this
            // even through Shade 11 because it's the main shape they work
            // with, but it's barely there. Coordinates align with the 2D
            // top-down view's plate so spatial reasoning is consistent.
            var plateY0 = H * 0.30;
            var plateY1 = H * 0.78;
            var plateX0 = W * 0.05;
            var plateX1 = W * 0.95;
            ctxC.strokeStyle = 'rgba(60, 60, 70, 0.85)';
            ctxC.lineWidth = 1.2;
            ctxC.strokeRect(plateX0, plateY0, plateX1 - plateX0, plateY1 - plateY0);
            // Very faint plate fill — just enough to see edge separation
            ctxC.fillStyle = 'rgba(20, 22, 28, 0.6)';
            ctxC.fillRect(plateX0, plateY0, plateX1 - plateX0, plateY1 - plateY0);

            // Joint center line where the bead lays
            var jointY = (plateY0 + plateY1) / 2;
            var beadStartX = W * 0.08;
            var beadEndX = W * 0.92;
            var arcX = beadStartX + (beadEndX - beadStartX) * t;

            // ── Bead trail — dim orange line behind the arc ──
            // The bead is glowing-hot when the welder lays it; visible
            // through the lens because of its own emission.
            var beadPxWidth = ((live.beadWidth || 0.2) / 0.5) * 18;
            var beadGrad = ctxC.createLinearGradient(beadStartX, 0, arcX, 0);
            beadGrad.addColorStop(0, 'rgba(80, 25, 8, 0.6)');
            beadGrad.addColorStop(0.6, 'rgba(180, 60, 15, 0.8)');
            beadGrad.addColorStop(1, 'rgba(255, 130, 30, 1)');
            ctxC.fillStyle = beadGrad;
            ctxC.fillRect(beadStartX, jointY - beadPxWidth / 2, arcX - beadStartX, beadPxWidth);

            // ── Penumbra: orange glow around the arc ──
            // The hot weld pool radiates visible light through the lens.
            // Radial gradient that fades to nothing at ~120 px radius.
            var penumbraR = 130;
            var penumbra = ctxC.createRadialGradient(arcX, jointY, 8, arcX, jointY, penumbraR);
            penumbra.addColorStop(0,   'rgba(255, 200, 80, 0.85)');
            penumbra.addColorStop(0.25,'rgba(255, 140, 40, 0.55)');
            penumbra.addColorStop(0.6, 'rgba(180, 60, 20, 0.18)');
            penumbra.addColorStop(1,   'rgba(120, 30, 10, 0)');
            ctxC.fillStyle = penumbra;
            ctxC.beginPath();
            ctxC.arc(arcX, jointY, penumbraR, 0, Math.PI * 2);
            ctxC.fill();

            // ── Arc bloom: bright yellow-white core ──
            if (t < 0.99) {
              var pulse = _prefersReducedMotion ? 1 : (0.78 + 0.22 * Math.sin(elapsed * 28));
              // Outer glow
              var bloomR = 50;
              var bloom = ctxC.createRadialGradient(arcX, jointY, 0, arcX, jointY, bloomR);
              bloom.addColorStop(0,   'rgba(255, 255, 240, ' + pulse + ')');
              bloom.addColorStop(0.18,'rgba(255, 240, 180, ' + (0.85 * pulse) + ')');
              bloom.addColorStop(0.5, 'rgba(255, 180, 80, 0.4)');
              bloom.addColorStop(1,   'rgba(255, 120, 40, 0)');
              ctxC.fillStyle = bloom;
              ctxC.beginPath();
              ctxC.arc(arcX, jointY, bloomR, 0, Math.PI * 2);
              ctxC.fill();
              // Bright core
              ctxC.fillStyle = 'rgba(255, 255, 255, ' + Math.min(1, pulse + 0.1) + ')';
              ctxC.beginPath();
              ctxC.arc(arcX, jointY, 4 + 2 * pulse, 0, Math.PI * 2);
              ctxC.fill();

              // ── Sparks — bright streaks ──
              if (!_prefersReducedMotion) {
                var sparkCount = 10;
                ctxC.lineWidth = 1.4;
                for (var sp = 0; sp < sparkCount; sp++) {
                  var sphase = (elapsed * 55 + sp * 1.7) % 1;
                  var sangle = (sp / sparkCount) * Math.PI * 2 + elapsed * 7 + sp;
                  var sdist = 6 + sphase * 36;
                  var x1 = arcX + Math.cos(sangle) * (sdist - 6);
                  var y1 = jointY + Math.sin(sangle) * (sdist - 6) * 0.45;
                  var x2 = arcX + Math.cos(sangle) * sdist;
                  var y2 = jointY + Math.sin(sangle) * sdist * 0.45;
                  var sparkAlpha = (1 - sphase) * 0.95;
                  ctxC.strokeStyle = 'rgba(255, ' + Math.round(200 + 55 * (1 - sphase)) + ', 100, ' + sparkAlpha + ')';
                  ctxC.beginPath();
                  ctxC.moveTo(x1, y1);
                  ctxC.lineTo(x2, y2);
                  ctxC.stroke();
                }
              }
            }

            // ── Gloved hand silhouette (bottom-right corner) ──
            // Welder's right hand on the torch handle — dark shape that
            // partially occludes the bottom-right of the field of view.
            // Stylized; not anatomically precise.
            ctxC.fillStyle = 'rgba(15, 12, 8, 0.95)';
            ctxC.beginPath();
            // Hand + cuff blob in lower-right
            ctxC.moveTo(W * 0.62, H);
            ctxC.lineTo(W * 0.92, H);
            ctxC.lineTo(W * 0.95, H * 0.78);
            ctxC.bezierCurveTo(W * 0.86, H * 0.74, W * 0.78, H * 0.78, W * 0.72, H * 0.86);
            ctxC.bezierCurveTo(W * 0.66, H * 0.92, W * 0.62, H * 0.96, W * 0.62, H);
            ctxC.closePath();
            ctxC.fill();
            // Torch shaft going from glove up toward arc
            ctxC.strokeStyle = 'rgba(40, 38, 35, 0.85)';
            ctxC.lineWidth = 7;
            ctxC.beginPath();
            ctxC.moveTo(W * 0.78, H * 0.85);
            ctxC.lineTo(arcX + 14, jointY + 18);
            ctxC.stroke();
            // Torch nozzle (small dark wedge at tip)
            ctxC.fillStyle = 'rgba(60, 56, 52, 0.9)';
            ctxC.beginPath();
            ctxC.moveTo(arcX + 8, jointY + 6);
            ctxC.lineTo(arcX + 18, jointY + 22);
            ctxC.lineTo(arcX + 22, jointY + 16);
            ctxC.lineTo(arcX + 14, jointY + 2);
            ctxC.closePath();
            ctxC.fill();

            // ── Helmet bezel vignette ──
            // The welder's view is clipped by the inside of the hood. Dark
            // radial gradient from edges inward simulates this.
            var vig = ctxC.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.30, W / 2, H * 0.48, Math.max(W, H) * 0.78);
            vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vig.addColorStop(0.55, 'rgba(0, 0, 0, 0.35)');
            vig.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
            ctxC.fillStyle = vig;
            ctxC.fillRect(0, 0, W, H);

            // ── HUD: lens shade indicator (top-left) ──
            ctxC.fillStyle = 'rgba(180, 200, 220, 0.75)';
            ctxC.font = 'bold 11px ui-monospace, Consolas, monospace';
            ctxC.textAlign = 'left';
            ctxC.fillText('🥽 Auto-darkening helmet', 14, 22);
            ctxC.fillStyle = 'rgba(140, 160, 180, 0.6)';
            ctxC.font = '10px ui-monospace, Consolas, monospace';
            ctxC.fillText(t < 0.99 ? 'Lens: Shade 11 (active)' : 'Lens: Shade 4 (idle)', 14, 36);
            // Process label
            var procLabel = (live.P === 'mig' ? 'MIG' : live.P === 'tig' ? 'TIG' : live.P === 'stick' ? 'Stick' : 'Oxy-Fuel');
            ctxC.fillStyle = 'rgba(160, 180, 200, 0.65)';
            ctxC.fillText('Process: ' + procLabel, 14, 50);

            if (!_prefersReducedMotion) {
              rafRef.current = requestAnimationFrame(draw);
            }
          }

          rafRef.current = requestAnimationFrame(draw);
          return function () {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
          };
        }, [props.P, props.M]);

        var procLabel = props.P === 'mig' ? 'MIG' : props.P === 'tig' ? 'TIG' : props.P === 'stick' ? 'Stick' : 'Oxy-Fuel';
        var helmetAria = 'First-person view through an auto-darkening welding hood. Lens at Shade 11 darkens the field of view to near-black; the arc and immediate weld pool are the only clearly visible elements. Process: ' + procLabel + '. ' + (props.ariaLabel || '');

        return h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-black rounded-2xl shadow border-2 border-slate-700 p-3' },
            h('canvas', {
              ref: canvasRef,
              width: 900,
              height: 360,
              role: 'img',
              'aria-label': helmetAria,
              className: 'w-full block rounded-lg'
            })
          ),
          // Educational explainer below — what students are seeing & why it matters
          h('div', { className: 'bg-slate-900 text-slate-200 rounded-2xl border-2 border-slate-700 p-4' },
            h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-400 mb-2' }, '🥽 What you are seeing'),
            h('p', { className: 'text-sm leading-relaxed mb-3' },
              'This is approximately what a welder sees through an auto-darkening hood with the lens at Shade 11. The lens darkens within about 1 millisecond of arc strike. Most of the visual world goes black; the arc and the immediate weld pool are nearly the only things visible. The faint rectangle is the plate; the dark shape in the lower-right is your gloved hand on the torch.'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 text-xs' },
              h('div', { className: 'bg-slate-800/60 rounded-lg p-3 border border-slate-700' },
                h('div', { className: 'font-bold text-amber-300 mb-1' }, 'Why so dark?'),
                h('div', { className: 'text-slate-300 leading-relaxed' }, 'A welding arc is roughly as bright as the surface of the sun. Without lens shading, retinal damage happens in milliseconds. Shade 11 reduces visible light by ~99.9% and blocks UV / IR.')
              ),
              h('div', { className: 'bg-slate-800/60 rounded-lg p-3 border border-slate-700' },
                h('div', { className: 'font-bold text-amber-300 mb-1' }, 'Why this teaches the craft'),
                h('div', { className: 'text-slate-300 leading-relaxed' }, 'You can\'t see fine detail once the arc is lit — you set up your torch position, work angle, and travel speed BEFORE striking, then run by muscle memory + the small visible region around the pool. That is what years of practice build.')
              ),
              h('div', { className: 'bg-slate-800/60 rounded-lg p-3 border border-slate-700' },
                h('div', { className: 'font-bold text-amber-300 mb-1' }, 'Auto vs fixed-shade'),
                h('div', { className: 'text-slate-300 leading-relaxed' }, 'Old fixed-shade hoods stayed at Shade 11 always — you flipped them down only after striking. Many old welders developed cataracts or had \'flash burn\' incidents. Auto-darkening (1980s+) lets you see clearly until the moment you strike.')
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 3: DEFECT HUNT LAB
      // ─────────────────────────────────────────────────────
      // Mirrors how AWS-certified Welding Inspectors (CWI) train: look at a
      // bead, identify visible discontinuities, name what caused them and how
      // they're fixed. Each sample renders schematically (line-drawing style)
      // with defects marked at known coordinates; clicking near a defect
      // reveals it. Score = unique defects identified / total, minus a small
      // penalty for clicks that landed on no defect (false reads waste an
      // inspector's time in the real world).
      var DEFECT_INFO = {
        porosity: {
          name: 'Porosity',
          icon: '⚪',
          cause: 'Gas trapped during solidification — usually from contaminated base metal (oil, rust, paint), inadequate shielding gas, or moisture in flux.',
          fix: 'Clean base metal to bright steel before welding. Check gas flow (15–25 CFH typical). Replace damp flux. Hold proper torch angle to maintain shielding.'
        },
        undercut: {
          name: 'Undercut',
          icon: '🪚',
          cause: 'A groove melted into the base metal next to the toe of the weld, then left unfilled. Caused by excessive amperage, wrong electrode angle, or travel too fast.',
          fix: 'Reduce amperage. Adjust electrode angle (closer to perpendicular to plate). Slow travel speed slightly. On vertical welds, pause briefly at the edges.'
        },
        lackOfFusion: {
          name: 'Lack of Fusion',
          icon: '🚫',
          cause: 'The weld metal failed to fuse to the base metal or to a previous pass. Caused by insufficient heat, wrong technique, or contaminated surface.',
          fix: 'Increase amperage / heat input. Ensure the arc is striking the joint root, not the side wall. Clean between passes. Use stringer beads for better penetration.'
        },
        coldLap: {
          name: 'Cold Lap',
          icon: '🥶',
          cause: 'Weld metal flows over the base metal without fusing — looks like good weld, but isn\'t bonded. Caused by low heat, wrong technique, dirty surface.',
          fix: 'Increase voltage and amperage to raise heat input. Ensure proper electrode-to-work angle. Remove mill scale and rust before welding. Consider preheat on heavy sections.'
        },
        craterCrack: {
          name: 'Crater Crack',
          icon: '💥',
          cause: 'A small star-shaped crack at the end of a weld pass where the puddle solidified too quickly with concentrated stress. Common when stopping abruptly.',
          fix: 'Use a backstep crater-fill technique — slow travel and pause at the end. Most modern machines have a "crater" current setting that ramps amperage down. Don\'t snap the arc off.'
        },
        overlap: {
          name: 'Overlap',
          icon: '〰️',
          cause: 'Weld metal protruding beyond the toe without fusing to the base metal. Looks like undercut\'s opposite. Caused by too-low travel speed, excessive deposition.',
          fix: 'Increase travel speed. Reduce wire feed rate (MIG) or amperage. Adjust electrode angle. Use weave technique with proper width control.'
        }
      };

      var DEFECT_SAMPLES = [
        {
          id: 'sampleA',
          name: 'Sample A — Fillet weld on T-joint, mild steel',
          context: 'Inspection of a 1/4" T-joint fillet weld. Welder reports machine ran fine. What do you see?',
          defects: [
            { id: 'A1', type: 'porosity',     x: 0.18, y: 0.55 },
            { id: 'A2', type: 'porosity',     x: 0.26, y: 0.50 },
            { id: 'A3', type: 'undercut',     x: 0.55, y: 0.40 },
            { id: 'A4', type: 'craterCrack',  x: 0.88, y: 0.50 }
          ]
        },
        {
          id: 'sampleB',
          name: 'Sample B — Butt weld, 3/8" plate',
          context: 'Square-groove butt weld on heavier plate. Looks shiny. Walk around and inspect carefully.',
          defects: [
            { id: 'B1', type: 'lackOfFusion', x: 0.15, y: 0.60 },
            { id: 'B2', type: 'overlap',      x: 0.42, y: 0.42 },
            { id: 'B3', type: 'undercut',     x: 0.68, y: 0.58 },
            { id: 'B4', type: 'porosity',     x: 0.80, y: 0.50 }
          ]
        },
        {
          id: 'sampleC',
          name: 'Sample C — Lap joint, aluminum',
          context: 'Aluminum lap joint, MIG welded. Aluminum is unforgiving — find the issues.',
          defects: [
            { id: 'C1', type: 'porosity',     x: 0.20, y: 0.50 },
            { id: 'C2', type: 'porosity',     x: 0.30, y: 0.46 },
            { id: 'C3', type: 'coldLap',      x: 0.55, y: 0.55 },
            { id: 'C4', type: 'lackOfFusion', x: 0.78, y: 0.48 }
          ]
        }
      ];

      function DefectHuntLab() {
        var sampleIdx_state = usePersistedState('dh_sampleIdx', 0);
        var sampleIdx = sampleIdx_state[0], setSampleIdx = sampleIdx_state[1];
        var found_state = useState({});
        var found = found_state[0], setFound = found_state[1];
        var falseReads_state = useState(0);
        var falseReads = falseReads_state[0], setFalseReads = falseReads_state[1];
        var revealAll_state = useState(false);
        var revealAll = revealAll_state[0], setRevealAll = revealAll_state[1];

        var sample = DEFECT_SAMPLES[sampleIdx];

        // Reset round state when switching samples
        useEffect(function() {
          setFound({});
          setFalseReads(0);
          setRevealAll(false);
        }, [sampleIdx]);

        var canvasRef = useRef(null);

        // Hit-test radius in canvas coordinates (normalized 0-1)
        var HIT_RADIUS = 0.045;

        function handleCanvasClick(e) {
          if (revealAll) return;
          var canvas = canvasRef.current;
          if (!canvas) return;
          var rect = canvas.getBoundingClientRect();
          var nx = (e.clientX - rect.left) / rect.width;
          var ny = (e.clientY - rect.top) / rect.height;
          var hit = null;
          for (var i = 0; i < sample.defects.length; i++) {
            var df = sample.defects[i];
            var dx = nx - df.x, dy = ny - df.y;
            if (Math.sqrt(dx*dx + dy*dy) < HIT_RADIUS) { hit = df; break; }
          }
          if (hit) {
            if (!found[hit.id]) {
              var next = Object.assign({}, found);
              next[hit.id] = true;
              setFound(next);
              announce('Identified ' + DEFECT_INFO[hit.type].name);
              // ── Defect Catalog: log first-find of this defect TYPE across all samples ──
              // Per-sample 'found' resets when switching samples; the catalog
              // sticks across samples and across sessions (when wired through
              // the project-JSON layer). First time you correctly identify a
              // defect of a given type, fire a celebration and lock it in.
              try {
                var catalog = (d.defectCatalog && typeof d.defectCatalog === 'object') ? d.defectCatalog : {};
                var existingType = catalog[hit.type];
                var nowIso = new Date().toISOString();
                var nextCatalog;
                if (existingType) {
                  nextCatalog = Object.assign({}, catalog);
                  nextCatalog[hit.type] = Object.assign({}, existingType, {
                    lastFoundAt: nowIso,
                    foundCount: (existingType.foundCount || 0) + 1,
                    sampleIds: (existingType.sampleIds || []).indexOf(sample.id) === -1
                      ? (existingType.sampleIds || []).concat([sample.id])
                      : (existingType.sampleIds || [])
                  });
                } else {
                  nextCatalog = Object.assign({}, catalog);
                  nextCatalog[hit.type] = {
                    firstFoundAt: nowIso,
                    lastFoundAt: nowIso,
                    foundCount: 1,
                    firstSampleId: sample.id,
                    sampleIds: [sample.id]
                  };
                  setDefectCeleb({
                    type: hit.type,
                    name: DEFECT_INFO[hit.type].name,
                    icon: DEFECT_INFO[hit.type].icon,
                    sampleId: sample.id,
                    total: Object.keys(nextCatalog).length,
                    at: Date.now()
                  });
                  setTimeout(function () { setDefectCeleb(null); }, 3500);
                }
                upd('defectCatalog', nextCatalog);
                try { lsSet('weldLab.defectCatalog.v1', nextCatalog); } catch (e2) {}
              } catch (catErr) {}
            }
          } else {
            setFalseReads(falseReads + 1);
            announce('No defect at that point.');
          }
        }

        // Render bead with defects
        useEffect(function() {
          var canvas = canvasRef.current;
          if (!canvas) return;
          if (window.StemLab && window.StemLab.setupHiDPI) {
            window.StemLab.setupHiDPI(canvas, canvas._logicalW || canvas.width, canvas._logicalH || canvas.height);
          }
          var ctxC = canvas.getContext('2d');
          if (canvas._dpr) ctxC.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);
          var W = canvas._logicalW || canvas.width, H = canvas._logicalH || canvas.height;
          ctxC.clearRect(0, 0, W, H);

          // Plate background (dark)
          ctxC.fillStyle = '#1f2937';
          ctxC.fillRect(0, 0, W, H);

          // Plate
          var plateY0 = H * 0.20, plateY1 = H * 0.80;
          ctxC.fillStyle = '#94a3b8';
          ctxC.fillRect(W * 0.05, plateY0, W * 0.9, plateY1 - plateY0);
          ctxC.strokeStyle = '#475569';
          ctxC.lineWidth = 2;
          ctxC.strokeRect(W * 0.05, plateY0, W * 0.9, plateY1 - plateY0);

          // Bead — slightly varying width for realism
          var jointY = (plateY0 + plateY1) / 2;
          var beadStartX = W * 0.08;
          var beadEndX = W * 0.92;
          var grad = ctxC.createLinearGradient(0, jointY - 14, 0, jointY + 14);
          grad.addColorStop(0,   '#5b1a08');
          grad.addColorStop(0.5, '#a3360d');
          grad.addColorStop(1,   '#5b1a08');
          ctxC.fillStyle = grad;

          // Path with slight scallop — base bead
          ctxC.beginPath();
          ctxC.moveTo(beadStartX, jointY - 14);
          for (var x = beadStartX; x <= beadEndX; x += 8) {
            var wob = Math.sin((x - beadStartX) * 0.04) * 1.5;
            ctxC.lineTo(x, jointY - 14 + wob);
          }
          for (var xb = beadEndX; xb >= beadStartX; xb -= 8) {
            var wob2 = Math.sin((xb - beadStartX) * 0.04) * 1.5;
            ctxC.lineTo(xb, jointY + 14 + wob2);
          }
          ctxC.closePath();
          ctxC.fill();

          // Ripple lines
          ctxC.strokeStyle = 'rgba(0,0,0,0.35)';
          ctxC.lineWidth = 1.2;
          for (var rx = beadStartX + 12; rx < beadEndX; rx += 14) {
            ctxC.beginPath();
            ctxC.moveTo(rx, jointY - 12);
            ctxC.lineTo(rx, jointY + 12);
            ctxC.stroke();
          }

          // Defects — render visibly so they can be spotted
          sample.defects.forEach(function(df) {
            var px = df.x * W, py = df.y * H;
            var info = DEFECT_INFO[df.type];
            var isFound = !!found[df.id] || revealAll;

            switch (df.type) {
              case 'porosity':
                // Small dark pock-mark
                ctxC.fillStyle = '#0a0a0a';
                ctxC.beginPath();
                ctxC.arc(px, py, 4, 0, Math.PI * 2);
                ctxC.fill();
                ctxC.fillStyle = 'rgba(0,0,0,0.5)';
                ctxC.beginPath();
                ctxC.arc(px, py, 7, 0, Math.PI * 2);
                ctxC.fill();
                break;
              case 'undercut':
                // Dark groove cut into base metal next to bead toe
                ctxC.fillStyle = '#1e293b';
                ctxC.fillRect(px - 14, py - 4, 28, 4);
                break;
              case 'lackOfFusion':
                // Dark stripe at edge of bead
                ctxC.fillStyle = '#0f172a';
                ctxC.fillRect(px - 12, py - 2, 24, 4);
                break;
              case 'coldLap':
                // Wavy edge mismatch
                ctxC.strokeStyle = '#1e293b';
                ctxC.lineWidth = 3;
                ctxC.beginPath();
                ctxC.moveTo(px - 14, py - 5);
                ctxC.bezierCurveTo(px - 7, py + 3, px + 7, py - 3, px + 14, py + 5);
                ctxC.stroke();
                break;
              case 'craterCrack':
                // Star-shaped crack
                ctxC.strokeStyle = '#0a0a0a';
                ctxC.lineWidth = 1.8;
                for (var ang = 0; ang < Math.PI * 2; ang += Math.PI / 4) {
                  ctxC.beginPath();
                  ctxC.moveTo(px, py);
                  ctxC.lineTo(px + Math.cos(ang) * 7, py + Math.sin(ang) * 7);
                  ctxC.stroke();
                }
                break;
              case 'overlap':
                // Bulge protruding beyond bead edge
                ctxC.fillStyle = '#7c2d12';
                ctxC.beginPath();
                ctxC.ellipse(px, py, 9, 5, 0, 0, Math.PI * 2);
                ctxC.fill();
                break;
            }

            // Highlight ring if found / revealed
            if (isFound) {
              ctxC.strokeStyle = '#fbbf24';
              ctxC.lineWidth = 2.5;
              ctxC.beginPath();
              ctxC.arc(px, py, 18, 0, Math.PI * 2);
              ctxC.stroke();
              // Label
              ctxC.fillStyle = '#fbbf24';
              ctxC.font = 'bold 11px sans-serif';
              ctxC.textAlign = 'center';
              ctxC.fillText(info.name, px, py - 24);
            }
          });

          // Sample header
          ctxC.fillStyle = '#cbd5e1';
          ctxC.font = '12px sans-serif';
          ctxC.textAlign = 'left';
          ctxC.fillText(sample.name, W * 0.05, plateY0 - 8);
          ctxC.textAlign = 'right';
          var totalDefects = sample.defects.length;
          var foundCount = Object.keys(found).length;
          ctxC.fillText('Defects found: ' + foundCount + ' / ' + totalDefects, W * 0.95, plateY0 - 8);

        }, [sample, found, revealAll, falseReads]);

        var totalDefects = sample.defects.length;
        var foundCount = Object.keys(found).length;
        var foundDefects = sample.defects.filter(function(df) { return found[df.id]; });
        var rawScore = (foundCount / totalDefects) * 100;
        var penalty = Math.min(falseReads * 8, 40);
        var finalScore = Math.max(0, Math.round(rawScore - penalty));
        var allFound = foundCount === totalDefects;

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🔍', title: 'Defect Hunt Lab' }),
          h('div', { className: 'p-6 max-w-6xl mx-auto space-y-5' },
            // Sample selector
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Inspection Sample'),
              h('div', { 'role': 'radiogroup', 'aria-label': 'Select sample to inspect', className: 'grid grid-cols-1 md:grid-cols-3 gap-2' },
                DEFECT_SAMPLES.map(function(s, i) {
                  var sel = (sampleIdx === i);
                  return h('button', {
                    key: s.id,
                    onClick: function() { setSampleIdx(i); announce('Loaded ' + s.name); },
                    role: 'radio',
                    'aria-checked': sel ? 'true' : 'false',
                    className: 'p-2 rounded-lg border-2 text-xs font-bold text-left transition-all focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                      (sel ? 'bg-orange-600 text-white border-orange-700' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                  }, s.name);
                })
              ),
              h('p', { className: 'text-xs text-slate-700 mt-2 italic' }, sample.context)
            ),
            // Canvas
            h('div', { className: 'bg-slate-900 rounded-2xl shadow border-2 border-slate-700 p-3' },
              h('canvas', {
                ref: canvasRef,
                width: 900,
                height: 280,
                role: 'img',
                'aria-label': 'Inspection sample. ' + sample.name + '. Total defects to find: ' + totalDefects + '. Found so far: ' + foundCount + '.',
                onClick: handleCanvasClick,
                style: { cursor: revealAll ? 'default' : 'crosshair' },
                className: 'w-full block rounded-lg'
              }),
              h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-slate-300' },
                h('span', null, '🎯 Click on each defect you can spot. ' + (revealAll ? 'All revealed.' : '')),
                h('span', null, 'False reads: ' + falseReads + ' (each costs 8 points)')
              ),
              // Keyboard-accessible alternative — sequential zone investigation.
              // Mouse users can click directly on the canvas; keyboard users
              // tab to this button to inspect each numbered zone in order.
              h('div', { className: 'mt-2 flex flex-wrap items-center gap-2' },
                h('button', {
                  onClick: function() {
                    if (revealAll) return;
                    var unFound = sample.defects.filter(function(df) { return !found[df.id]; });
                    if (unFound.length === 0) return;
                    var df = unFound[0];
                    var next = Object.assign({}, found);
                    next[df.id] = true;
                    setFound(next);
                    announce('Identified zone: ' + DEFECT_INFO[df.type].name);
                  },
                  'aria-disabled': revealAll || foundCount === totalDefects ? 'true' : 'false',
                  className: 'px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold border-2 border-orange-700 hover:bg-orange-700 transition focus:outline-none focus:ring-4 ring-orange-500/40 ' +
                    (revealAll || foundCount === totalDefects ? 'opacity-50 cursor-not-allowed' : '')
                }, '🔎 Inspect next zone (keyboard)'),
                h('span', { className: 'text-[11px] text-slate-300' }, 'Keyboard alternative — identifies the next un-found defect.')
              )
            ),
            // Score + reveal
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
              h(StatCard, { label: 'Defects Found', value: foundCount + '/' + totalDefects, color: 'text-orange-700' }),
              h(StatCard, { label: 'Score', value: finalScore + '%',
                color: finalScore >= 80 ? 'text-emerald-700' : finalScore >= 60 ? 'text-amber-700' : 'text-rose-700',
                unit: allFound ? 'all found!' : 'keep looking' }),
              h('button', {
                onClick: function() {
                  if (revealAll) {
                    setFound({});
                    setFalseReads(0);
                    setRevealAll(false);
                    announce('Reset sample');
                  } else {
                    setRevealAll(true);
                    announce('All defects revealed');
                  }
                },
                className: 'rounded-xl shadow border-2 ' +
                  (revealAll
                    ? 'bg-slate-200 text-slate-800 border-slate-400 hover:bg-slate-300'
                    : 'bg-orange-600 text-white border-orange-700 hover:bg-orange-700') +
                  ' font-bold text-sm transition focus:outline-none focus:ring-4 ring-orange-500/40 p-3'
              }, revealAll ? '🔄 Reset Sample' : '👁️ Reveal All (give up)')
            ),
            // Found defects details
            foundDefects.length > 0 && h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-3' }, 'Defect Reports — Cause & Remediation'),
              h('div', { className: 'space-y-3' },
                foundDefects.map(function(df) {
                  var info = DEFECT_INFO[df.type];
                  return h('div', { key: df.id, className: 'p-3 rounded-lg bg-amber-50 border border-amber-300' },
                    h('div', { className: 'flex items-center gap-2 mb-1' },
                      h('span', { className: 'text-2xl' }, info.icon),
                      h('span', { className: 'font-black text-amber-900' }, info.name)
                    ),
                    h('div', { className: 'text-sm text-slate-800 mb-1' },
                      h('span', { className: 'font-bold text-rose-700' }, 'Cause: '), info.cause),
                    h('div', { className: 'text-sm text-slate-800' },
                      h('span', { className: 'font-bold text-emerald-700' }, 'Fix: '), info.fix)
                  );
                })
              )
            ),
            // Reference card — all 6 defect types
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-2xl p-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-blue-900 mb-2' }, 'Six common defect types — quick reference'),
              h('div', { className: 'grid grid-cols-2 md:grid-cols-3 gap-2' },
                Object.keys(DEFECT_INFO).map(function(k) {
                  var info = DEFECT_INFO[k];
                  return h('div', { key: k, className: 'flex items-center gap-2 p-2 bg-white rounded border border-blue-200' },
                    h('span', { className: 'text-xl' }, info.icon),
                    h('span', { className: 'text-sm font-bold text-slate-800' }, info.name)
                  );
                })
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-ETS1-3 (Engineering tradeoffs)', 'AWS QC1 (Welding Inspector)', 'CTE Manufacturing 5.3'],
              questions: [
                'Of the six defects in this lab, which ones could a welder fix mid-pass without grinding out the bead?',
                'Why does porosity often appear in clusters? What does that tell you about the source?',
                'A weld passes visual inspection but fails an ultrasonic test. Which defect from this list is most likely the culprit, and why?'
              ],
              misconceptions: [
                '"If a weld looks good, it is good" — cold lap and lack of fusion can leave a weld looking fine while having essentially no strength.',
                '"Porosity is just cosmetic" — porosity reduces cross-section AND creates stress concentrators where cracks initiate.',
                '"All cracks are catastrophic" — surface crater cracks can be ground out and rewelded; subsurface cracks require radiography to detect.'
              ],
              extension: 'Watch a CWI (Certified Welding Inspector) walk-around video on YouTube. List 3 defects you saw that aren\'t in this lab (slag inclusion, burn-through, spatter, etc.) and write a one-line cause + fix for each.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 4: PROCESS COMPARISON
      // ─────────────────────────────────────────────────────
      // Side-by-side decision matrix for the four common arc/flame processes.
      // The point isn't to memorize every cell — it's to develop intuition for
      // matching process to job. A welder who can articulate "TIG for the
      // stainless food-grade tube, MIG for the carbon-steel frame" demonstrates
      // exactly the kind of process-selection literacy that hiring managers
      // probe in interviews.
      var PROCESS_INFO = {
        mig: {
          name: 'MIG / GMAW',
          fullName: 'Gas Metal Arc Welding',
          icon: '🔌',
          color: 'from-orange-500 to-red-600',
          tagline: 'The "easy mode" of arc welding — fast, clean, forgiving',
          bestFor: 'Thin-to-medium plate, production work, auto body, light fab',
          materials: 'Mild steel, stainless steel, aluminum (with spool gun)',
          skill: 2, equipCost: 3, portability: 2, speed: 5, quality: 4, learn: 5,
          equipNotes: 'Mid-cost: $400 entry, $1500-3000 industrial. Needs shielding gas (Ar/CO2 mix) and consumable wire.',
          pros: ['Easy to learn — the "trigger and trace" method', 'Fast deposition rate', 'Low spatter', 'Good for thin material', 'High production efficiency'],
          cons: ['Wind-sensitive — outdoor work needs windbreaks', 'Bottle of shielding gas required', 'Less control on out-of-position welds', 'Pre-cleaning matters'],
          example: 'Auto frame repair, sheet-metal HVAC ductwork, light structural in a shop'
        },
        tig: {
          name: 'TIG / GTAW',
          fullName: 'Gas Tungsten Arc Welding',
          icon: '🎯',
          color: 'from-amber-500 to-orange-600',
          tagline: 'The "art mode" — slowest, hardest, prettiest welds',
          bestFor: 'Precision work, thin material, exotic alloys, code-quality welds',
          materials: 'Stainless, aluminum, magnesium, titanium, copper, mild steel',
          skill: 5, equipCost: 4, portability: 3, speed: 1, quality: 5, learn: 1,
          equipNotes: 'Higher-end: $800 entry, $3000-6000 industrial. Foot pedal, water-cooled torches for production. Pure argon shield.',
          pros: ['Cleanest, prettiest welds in the trade', 'Total amperage control via foot pedal', 'No spatter, no slag', 'Welds exotic / thin metals', 'Code-quality root passes'],
          cons: ['Slowest deposition rate of any common process', 'Steep learning curve — months to be useful', 'Both hands + a foot are working', 'Surface MUST be perfectly clean'],
          example: 'Stainless food-service tubing, aerospace components, bicycle frames, motorcycle exhaust'
        },
        stick: {
          name: 'Stick / SMAW',
          fullName: 'Shielded Metal Arc Welding',
          icon: '🪄',
          color: 'from-stone-500 to-slate-700',
          tagline: 'The "field-trade workhorse" — go-anywhere, weld-anything',
          bestFor: 'Heavy structural, field work, dirty / rusty / outdoor conditions',
          materials: 'Mild steel, stainless steel, cast iron, hardfacing',
          skill: 3, equipCost: 2, portability: 5, speed: 3, quality: 4, learn: 3,
          equipNotes: 'Cheapest entry: $200 portable buzzbox, $500-1500 industrial. No gas bottle — flux on the rod is the shield. Just electrodes.',
          pros: ['Works outdoors in wind / rain', 'Forgiving of dirty or rusty material', 'Cheapest setup of the four', 'No gas bottle = ultimate portability', 'Goes through paint and mill scale'],
          cons: ['Lots of slag to chip / wire-brush off', 'Stub-end waste (last 2" of every rod)', 'Slower than MIG in clean shop conditions', 'Spatter management'],
          example: 'Pipeline construction, structural steel beams, farm equipment repair, ironwork in the field'
        },
        oxy: {
          name: 'Oxy-Fuel / OFW',
          fullName: 'Oxygen-Fuel Welding',
          icon: '🔥',
          color: 'from-blue-600 to-indigo-700',
          tagline: 'The "old-school flame" — still useful for soft metals & cutting',
          bestFor: 'Thin sheet metal, soldering / brazing, cutting, heating for bending',
          materials: 'Mild steel (thin), copper, brass, cast iron repair, soft metals',
          skill: 3, equipCost: 1, portability: 4, speed: 2, quality: 3, learn: 3,
          equipNotes: 'Cheapest: $300-700 for full kit. Two bottles (oxygen + acetylene), torches, hoses. Most shops still have one for cutting.',
          pros: ['Same kit cuts AND welds AND brazes', 'No electricity needed — pure portability', 'Excellent for heating / bending / forging', 'Good for soft metals like copper', 'Cheap consumables'],
          cons: ['Slowest of the four — heat is diffuse', 'Bottles are heavy, tip over hazard', 'Backfire / flashback risk requires arrestors', 'Largely replaced by MIG for production welding'],
          example: 'HVAC copper-line brazing, antique car body work, cutting steel beams, jewelry-making'
        }
      };

      function ProcessComparison() {
        var selected_state = useState(null);
        var selected = selected_state[0], setSelected = selected_state[1];

        function ratingDots(n, max, color) {
          var dots = [];
          for (var i = 0; i < max; i++) {
            dots.push(h('span', {
              key: i,
              'aria-hidden': true,
              className: 'inline-block w-2 h-2 rounded-full mr-0.5 ' + (i < n ? color : 'bg-slate-200')
            }));
          }
          return h('span', { 'aria-label': n + ' of ' + max }, dots);
        }

        var rows = [
          { key: 'skill',       label: 'Skill required', max: 5, color: 'bg-orange-500' },
          { key: 'speed',       label: 'Welding speed',  max: 5, color: 'bg-emerald-500' },
          { key: 'quality',     label: 'Joint quality',  max: 5, color: 'bg-blue-500' },
          { key: 'portability', label: 'Portability',    max: 5, color: 'bg-violet-500' },
          { key: 'equipCost',   label: 'Equipment cost', max: 5, color: 'bg-amber-500' },
          { key: 'learn',       label: 'Easy to learn',  max: 5, color: 'bg-teal-500' }
        ];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '⚖️', title: 'Process Comparison' }),
          h('div', { className: 'p-6 max-w-6xl mx-auto space-y-5' },
            h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-orange-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-orange-900 mb-2' }, 'Pick the right process for the job'),
              h('p', { className: 'text-sm text-slate-700 leading-relaxed' },
                'No process is "best" — each one is best for some jobs. Hiring managers test exactly this: "I need to weld 16-gauge stainless for a food-service line. What process and why?" If you can answer questions like that, you know welding.')
            ),
            // Card grid
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' },
              ['mig','tig','stick','oxy'].map(function(pk) {
                var p = PROCESS_INFO[pk];
                var sel = (selected === pk);
                return h('button', {
                  key: pk,
                  onClick: function() { setSelected(sel ? null : pk); announce(p.name + (sel ? ' collapsed' : ' expanded')); },
                  'aria-pressed': sel ? 'true' : 'false',
                  'aria-label': p.name + ' — ' + p.tagline + (sel ? ' (expanded)' : ' (click to expand)'),
                  className: 'text-left bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 ' +
                    (sel ? 'border-orange-600 ring-4 ring-orange-500/30' : 'border-slate-200 hover:border-slate-400') +
                    ' overflow-hidden focus:outline-none focus:ring-4 ring-orange-500/40'
                },
                  h('div', { className: 'bg-gradient-to-br ' + p.color + ' p-4 text-white' },
                    h('div', { className: 'flex items-center justify-between mb-1' },
                      h('span', { className: 'text-3xl' }, p.icon),
                      h('span', { className: 'text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full' }, 'Process')
                    ),
                    h('div', { className: 'text-lg font-black' }, p.name),
                    h('div', { className: 'text-[11px] opacity-90 font-medium' }, p.tagline)
                  ),
                  h('div', { className: 'p-3' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, 'Best For'),
                    h('div', { className: 'text-sm text-slate-800 mb-2' }, p.bestFor),
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, 'Materials'),
                    h('div', { className: 'text-sm text-slate-800' }, p.materials)
                  )
                );
              })
            ),
            // Comparison matrix
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 overflow-x-auto' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-3' }, 'Side-by-side comparison'),
              h('table', { className: 'w-full text-sm' },
                h('thead', null,
                  h('tr', { className: 'border-b-2 border-slate-300' },
                    h('th', { className: 'text-left p-2 text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Attribute'),
                    h('th', { className: 'p-2 text-xs font-bold uppercase tracking-wider text-orange-700' }, 'MIG'),
                    h('th', { className: 'p-2 text-xs font-bold uppercase tracking-wider text-amber-700' }, 'TIG'),
                    h('th', { className: 'p-2 text-xs font-bold uppercase tracking-wider text-stone-700' }, 'Stick'),
                    h('th', { className: 'p-2 text-xs font-bold uppercase tracking-wider text-blue-700' }, 'Oxy')
                  )
                ),
                h('tbody', null,
                  rows.map(function(r) {
                    return h('tr', { key: r.key, className: 'border-b border-slate-100' },
                      h('td', { className: 'p-2 font-semibold text-slate-800' }, r.label),
                      ['mig','tig','stick','oxy'].map(function(pk) {
                        return h('td', { key: pk, className: 'p-2 text-center' },
                          ratingDots(PROCESS_INFO[pk][r.key], r.max, r.color)
                        );
                      })
                    );
                  })
                )
              ),
              h('div', { className: 'mt-2 text-xs text-slate-700 italic' }, 'Each row scored 1-5. More dots = more of that attribute.')
            ),
            // Detailed expansion
            selected && (function() {
              var p = PROCESS_INFO[selected];
              return h('div', { className: 'bg-white rounded-2xl shadow border-2 border-orange-300 p-5 space-y-4' },
                h('div', { className: 'flex items-center gap-3 pb-3 border-b border-slate-200' },
                  h('span', { className: 'text-4xl' }, p.icon),
                  h('div', null,
                    h('div', { className: 'text-xl font-black text-slate-800' }, p.name),
                    h('div', { className: 'text-xs text-slate-700' }, p.fullName)
                  )
                ),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                  h('div', null,
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1' }, '✓ Strengths'),
                    h('ul', { className: 'space-y-1' },
                      p.pros.map(function(s, i) {
                        return h('li', { key: i, className: 'text-sm text-slate-800 flex items-start gap-1.5' },
                          h('span', { className: 'text-emerald-500 font-bold' }, '✓'),
                          h('span', null, s)
                        );
                      })
                    )
                  ),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-rose-700 mb-1' }, '× Limitations'),
                    h('ul', { className: 'space-y-1' },
                      p.cons.map(function(s, i) {
                        return h('li', { key: i, className: 'text-sm text-slate-800 flex items-start gap-1.5' },
                          h('span', { className: 'text-rose-500 font-bold' }, '×'),
                          h('span', null, s)
                        );
                      })
                    )
                  )
                ),
                h('div', { className: 'p-3 bg-amber-50 border border-amber-300 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-900 mb-1' }, 'Equipment & Setup'),
                  h('div', { className: 'text-sm text-slate-800' }, p.equipNotes)
                ),
                h('div', { className: 'p-3 bg-blue-50 border border-blue-300 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-blue-900 mb-1' }, 'Real-world example'),
                  h('div', { className: 'text-sm text-slate-800 italic' }, p.example)
                )
              );
            })(),
            // Decision guide
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5' },
              h('h3', { className: 'text-sm font-black uppercase tracking-wider text-emerald-900 mb-3' }, 'Quick decision guide'),
              h('div', { className: 'space-y-2 text-sm' },
                [
                  ['Production sheet metal, mild steel, indoor', 'MIG'],
                  ['Stainless food-grade tube, code-quality root pass', 'TIG'],
                  ['Outdoor pipeline / structural / dirty conditions', 'Stick'],
                  ['Brazing copper HVAC line / cutting heavy stock', 'Oxy-Fuel'],
                  ['Aluminum auto body panels', 'MIG with spool gun (or TIG)'],
                  ['Bicycle / motorcycle frame, thin-wall tube', 'TIG'],
                  ['Farm equipment repair in the back forty', 'Stick'],
                  ['Bath Iron Works ship hull plate', 'MIG / FCAW with backup processes']
                ].map(function(pair, i) {
                  return h('div', { key: i, className: 'flex items-center gap-3 p-2 bg-white rounded border border-emerald-200' },
                    h('div', { className: 'flex-1 text-slate-800' }, pair[0]),
                    h('div', { className: 'font-black text-emerald-700' }, '→ ' + pair[1])
                  );
                })
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-ETS1-2 (Engineering tradeoffs)', 'CTE Manufacturing 5.2', 'AWS SENSE Module 2'],
              questions: [
                'You\'re building a steel grill for your back deck. Which process makes the most sense and why?',
                'A new welder asks you "which one should I learn first?" — what do you say, and what tradeoffs are you weighing?',
                'Why does stick (SMAW) survive in 2026 even though MIG is faster and cleaner?'
              ],
              misconceptions: [
                '"TIG is the best process" — TIG is the most precise, but the slowest and hardest. For most jobs MIG is "better" because it gets the job done faster at acceptable quality.',
                '"Oxy-fuel is obsolete" — oxy-fuel still dominates HVAC brazing, jewelry, antique restoration, and shop cutting. It\'s the cheapest portable heat source.',
                '"More expensive = better quality" — a good MIG weld at half the cost beats a bad TIG weld every time. Process choice matters more than equipment cost.'
              ],
              extension: 'Visit a hardware store or watch online. Find one welder for sale in each of the four processes. Note the price and the duty cycle. Make a "what could a 16-year-old afford to learn on?" recommendation.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 5: JOINT CONFIGURATION CATALOG
      // ─────────────────────────────────────────────────────
      // The five fundamental joint configurations every welder must recognize
      // before they can read a print or talk to a fabricator. Each joint is
      // rendered as a stylized cross-section SVG (looking down the length of
      // the joint, from the end). Plus the AWS position codes (1F/2F/3F/4F
      // for fillets, 1G/2G/3G/4G for grooves). Includes a 6-question matching
      // quiz that scrambles diagrams + names and asks the student to pair them.
      var JOINTS = {
        butt: {
          name: 'Butt Joint',
          icon: '─',
          desc: 'Two pieces of metal lying in the same plane, edge-to-edge. The most common joint in pressure vessels, pipe, ship hull plate, and any application where the two pieces must form one continuous surface.',
          welds: 'Almost always a groove weld (square-groove, V-groove, bevel, U-groove, or J-groove). Fillet welds are not used on butt joints.',
          uses: 'Pipe welding, pressure vessels, ship hull plate (Bath Iron Works), structural beams, automotive frame rails',
          defects: 'Burn-through (too much heat on thin plate), incomplete penetration, undercut at toes',
          // SVG path defs — coordinates are within a 200×100 viewBox
          svgRender: function(h, accent) {
            return h('svg', { viewBox: '0 0 200 100', className: 'w-full h-full' },
              // Two plates with small gap
              h('rect', { x: 25, y: 40, width: 70, height: 20, fill: '#94a3b8', stroke: '#475569', strokeWidth: 1.5 }),
              h('rect', { x: 105, y: 40, width: 70, height: 20, fill: '#94a3b8', stroke: '#475569', strokeWidth: 1.5 }),
              // Bead in V-groove between
              h('path', { d: 'M 92 40 L 100 55 L 108 40 Z', fill: '#a3360d', stroke: '#5b1a08', strokeWidth: 1 }),
              h('rect', { x: 92, y: 38, width: 16, height: 4, fill: accent || '#fb923c', stroke: '#5b1a08', strokeWidth: 1, rx: 1 })
            );
          }
        },
        lap: {
          name: 'Lap Joint',
          icon: '⊏',
          desc: 'One piece of metal overlapping another, with weld along the edge of the top piece. Common in sheet metal, auto body, and any application where you can\'t fit a butt joint.',
          welds: 'Fillet weld along the toe of the overlap. Sometimes plug welds through the top piece into the bottom.',
          uses: 'Auto body panels, HVAC ductwork, sheet metal fabrication, aluminum boat hulls, gussets',
          defects: 'Cold lap (top piece doesn\'t fuse to bottom), overlap, incomplete root fusion',
          svgRender: function(h, accent) {
            return h('svg', { viewBox: '0 0 200 100', className: 'w-full h-full' },
              // Bottom plate
              h('rect', { x: 25, y: 50, width: 150, height: 18, fill: '#94a3b8', stroke: '#475569', strokeWidth: 1.5 }),
              // Top plate (overlap)
              h('rect', { x: 80, y: 32, width: 95, height: 18, fill: '#cbd5e1', stroke: '#475569', strokeWidth: 1.5 }),
              // Fillet weld at the toe (triangle)
              h('path', { d: 'M 80 32 L 80 50 L 70 50 Z', fill: accent || '#fb923c', stroke: '#5b1a08', strokeWidth: 1 })
            );
          }
        },
        tjoint: {
          name: 'T-Joint',
          icon: 'T',
          desc: 'Two pieces meeting perpendicular, forming a T-shape. The "fillet weld" you see on furniture, brackets, gussets, and any structural intersection.',
          welds: 'Almost always a fillet weld, one or both sides. For very heavy structural T-joints (like ship frames), a groove weld is sometimes added for full penetration.',
          uses: 'Structural steel framing, machine bases, brackets, gussets, ship frames, table legs',
          defects: 'Undercut along vertical leg, overlap on horizontal leg, lack of root fusion in deep joints',
          svgRender: function(h, accent) {
            return h('svg', { viewBox: '0 0 200 100', className: 'w-full h-full' },
              // Horizontal piece
              h('rect', { x: 25, y: 60, width: 150, height: 18, fill: '#94a3b8', stroke: '#475569', strokeWidth: 1.5 }),
              // Vertical piece
              h('rect', { x: 91, y: 18, width: 18, height: 42, fill: '#cbd5e1', stroke: '#475569', strokeWidth: 1.5 }),
              // Fillet welds both sides (triangles)
              h('path', { d: 'M 91 60 L 91 50 L 81 60 Z', fill: accent || '#fb923c', stroke: '#5b1a08', strokeWidth: 1 }),
              h('path', { d: 'M 109 60 L 109 50 L 119 60 Z', fill: accent || '#fb923c', stroke: '#5b1a08', strokeWidth: 1 })
            );
          }
        },
        corner: {
          name: 'Corner Joint',
          icon: 'L',
          desc: 'Two pieces meeting at right angles, at their edges (not perpendicular through the middle like a T-joint). Forms an L-shape. Common in box fabrication.',
          welds: 'Fillet weld inside or outside the corner. Sometimes both. Open corner = fillet on outside; closed corner = full-penetration groove.',
          uses: 'Box fabrication (toolboxes, electrical enclosures), sheet metal cabinets, frame corners, picture-frame style joints',
          defects: 'Burn-through at the corner edge (heat concentrates), gap fit-up issues, root cracking',
          svgRender: function(h, accent) {
            return h('svg', { viewBox: '0 0 200 100', className: 'w-full h-full' },
              // Vertical piece (left)
              h('rect', { x: 60, y: 18, width: 18, height: 70, fill: '#94a3b8', stroke: '#475569', strokeWidth: 1.5 }),
              // Horizontal piece (top, sitting on the vertical)
              h('rect', { x: 60, y: 18, width: 90, height: 18, fill: '#cbd5e1', stroke: '#475569', strokeWidth: 1.5 }),
              // Fillet weld inside the corner
              h('path', { d: 'M 78 36 L 78 46 L 68 46 Z', fill: accent || '#fb923c', stroke: '#5b1a08', strokeWidth: 1 })
            );
          }
        },
        edge: {
          name: 'Edge Joint',
          icon: '∥',
          desc: 'Two pieces lying parallel, with their edges aligned and welded along that edge. Used for sealing thin-gauge sheet metal where strength is secondary.',
          welds: 'Square-groove weld along the matched edge, or a "seal weld" — light fillet meant to prevent leaks rather than carry load.',
          uses: 'Sheet metal tanks, food-service stainless containers, thin-gauge HVAC plenums, decorative trim edges',
          defects: 'Burn-through (very thin material), warping due to localized heat, incomplete seal',
          svgRender: function(h, accent) {
            return h('svg', { viewBox: '0 0 200 100', className: 'w-full h-full' },
              // Two plates standing up, edges aligned at top
              h('rect', { x: 80, y: 30, width: 14, height: 60, fill: '#94a3b8', stroke: '#475569', strokeWidth: 1.5 }),
              h('rect', { x: 106, y: 30, width: 14, height: 60, fill: '#cbd5e1', stroke: '#475569', strokeWidth: 1.5 }),
              // Bead along the top edge
              h('rect', { x: 78, y: 24, width: 44, height: 8, fill: accent || '#fb923c', stroke: '#5b1a08', strokeWidth: 1, rx: 2 })
            );
          }
        }
      };

      // Position codes — fillet (F) and groove (G) variants. AWS spec.
      var POSITIONS = [
        { code: '1F', name: 'Flat Fillet', desc: 'Joint horizontal, weld at 45° to vertical. Easiest position. Gravity helps.', icon: '⬇️' },
        { code: '2F', name: 'Horizontal Fillet', desc: 'Joint vertical, but the weld itself runs horizontal along the joint.', icon: '➡️' },
        { code: '3F', name: 'Vertical Fillet', desc: 'Joint vertical, welder works up or down. Up is harder but stronger.', icon: '⬆️' },
        { code: '4F', name: 'Overhead Fillet', desc: 'Joint above welder\'s head. Hardest position — molten metal fights gravity.', icon: '🙃' },
        { code: '1G', name: 'Flat Groove', desc: 'Pipe or plate horizontal. Plate flat on table, pipe rotated under torch.', icon: '⬇️' },
        { code: '2G', name: 'Horizontal Groove', desc: 'Pipe vertical / plate vertical, weld runs horizontal around / across.', icon: '➡️' },
        { code: '5G', name: 'Pipe Fixed Horizontal', desc: 'Pipe horizontal, fixed (won\'t rotate). Welder works around — flat → vertical → overhead in one pass.', icon: '🔁' },
        { code: '6G', name: 'Pipe Fixed 45°', desc: 'Pipe at 45° angle, fixed. The "test" position for AWS pipe certification — combines all difficulties.', icon: '✨' }
      ];

      // Quiz items — diagram → name matching
      function buildQuizPool() {
        var pool = [];
        Object.keys(JOINTS).forEach(function(k) {
          pool.push({ key: k, joint: JOINTS[k] });
        });
        // Shuffle (simple in-place)
        for (var i = pool.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
        }
        return pool;
      }

      function JointCatalog() {
        var tab_state = usePersistedState('jc_tab', 'butt');
        var tab = tab_state[0], setTab = tab_state[1];
        var quizMode_state = useState(false);
        var quizMode = quizMode_state[0], setQuizMode = quizMode_state[1];
        var quizPool_state = useState(buildQuizPool);
        var quizPool = quizPool_state[0], setQuizPool = quizPool_state[1];
        var quizIdx_state = useState(0);
        var quizIdx = quizIdx_state[0], setQuizIdx = quizIdx_state[1];
        var quizScore_state = useState(0);
        var quizScore = quizScore_state[0], setQuizScore = quizScore_state[1];
        var quizFeedback_state = useState(null);
        var quizFeedback = quizFeedback_state[0], setQuizFeedback = quizFeedback_state[1];
        var quizAnswers_state = useState([]);
        var quizAnswers = quizAnswers_state[0], setQuizAnswers = quizAnswers_state[1];

        function startQuiz() {
          setQuizPool(buildQuizPool());
          setQuizIdx(0);
          setQuizScore(0);
          setQuizFeedback(null);
          setQuizAnswers([]);
          setQuizMode(true);
          announce('Joint matching quiz started');
        }
        function answerQuiz(answerKey) {
          if (quizFeedback) return; // already answered
          var current = quizPool[quizIdx];
          var correct = (answerKey === current.key);
          if (correct) setQuizScore(quizScore + 1);
          setQuizFeedback({ correct: correct, picked: answerKey, was: current.key });
          setQuizAnswers(quizAnswers.concat([{ key: current.key, picked: answerKey, correct: correct }]));
          announce(correct ? 'Correct: ' + current.joint.name : 'Incorrect. Correct answer: ' + current.joint.name);
        }
        function nextQuiz() {
          if (quizIdx + 1 >= quizPool.length) {
            // End — keep on results screen
            setQuizFeedback({ end: true });
            announce('Quiz complete. Score: ' + quizScore + ' of ' + quizPool.length);
          } else {
            setQuizIdx(quizIdx + 1);
            setQuizFeedback(null);
          }
        }

        if (quizMode) {
          // Quiz screen
          var current = quizPool[quizIdx];
          var done = quizFeedback && quizFeedback.end;
          var allChoices = ['butt','lap','tjoint','corner','edge'];

          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '🔩', title: 'Joint Catalog — Quiz' }),
            h('div', { className: 'p-6 max-w-3xl mx-auto space-y-5' },
              h('div', { className: 'flex items-center justify-between' },
                h('button', {
                  onClick: function() { setQuizMode(false); announce('Returned to catalog'); },
                  className: 'px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-sm text-slate-800'
                }, '← Back to Catalog'),
                h('div', { className: 'text-sm font-bold text-slate-700' },
                  'Question ' + Math.min(quizIdx + 1, quizPool.length) + ' of ' + quizPool.length + ' · Score: ' + quizScore)
              ),
              done ? (function() {
                var pct = Math.round((quizScore / quizPool.length) * 100);
                var tier = quizScore === quizPool.length ? 'perfect'
                           : pct >= 80 ? 'strong'
                           : pct >= 60 ? 'solid'
                           : 'review';
                var tierColor = tier === 'perfect' ? '#fbbf24' : tier === 'strong' ? '#16a34a' : tier === 'solid' ? '#ea580c' : '#dc2626';
                var tierIcon = tier === 'perfect' ? '🏆' : tier === 'strong' ? '🎯' : tier === 'solid' ? '🔁' : '📚';
                var tierTitle = tier === 'perfect' ? 'Perfect — every joint identified'
                                : tier === 'strong' ? 'Strong joint reading'
                                : tier === 'solid' ? 'Solid foundation'
                                : 'Worth another pass';
                var tierMsg = tier === 'perfect'
                              ? 'You can read joint cross-sections at the level of a journeyman fitter. AWS D1.1 inspection starts here.'
                              : tier === 'strong'
                                ? 'Strong overall. Most missed joints are corner vs. edge — those two trip up new welders constantly.'
                                : tier === 'solid'
                                  ? 'Solid first pass. Re-read the catalog, especially T-joint vs. corner — they look similar in cross-section but load very differently.'
                                  : 'Re-read the catalog from butt through edge before retrying. Joint ID is the foundation of every weld procedure.';
                var rad = 38, circ = 2 * Math.PI * rad;
                var dashOff = circ - (pct / 100) * circ;
                return h('div', { className: 'bg-white rounded-2xl shadow overflow-hidden border-2', style: { borderColor: tierColor + 'aa' } },
                  h('div', { className: 'p-6 flex flex-wrap items-center gap-5', style: { background: 'linear-gradient(135deg, ' + tierColor + '22, transparent)' } },
                    h('div', { className: 'relative flex-shrink-0', style: { width: 100, height: 100 } },
                      h('svg', { viewBox: '0 0 100 100', width: 100, height: 100,
                        'aria-label': 'Score: ' + quizScore + ' out of ' + quizPool.length
                      },
                        h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: 'rgba(148,163,184,0.25)', strokeWidth: 9 }),
                        h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: tierColor, strokeWidth: 9, strokeLinecap: 'round',
                          strokeDasharray: circ, strokeDashoffset: dashOff, transform: 'rotate(-90 50 50)' })
                      ),
                      h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                        h('div', { style: { fontSize: 22, fontWeight: 900, color: tierColor, lineHeight: 1 } }, pct + '%'),
                        h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b' } }, quizScore + ' / ' + quizPool.length)
                      )
                    ),
                    h('div', { className: 'flex-1', style: { minWidth: 220 } },
                      h('div', { style: { fontSize: 30, marginBottom: 4 }, 'aria-hidden': 'true' }, tierIcon),
                      h('h2', { style: { margin: '0 0 6px', fontSize: 18, color: tierColor, fontWeight: 900, lineHeight: 1.15 } }, tierTitle),
                      h('p', { style: { margin: 0, color: '#1e293b', fontSize: 13, lineHeight: 1.55 } }, tierMsg)
                    )
                  ),
                  quizAnswers.length > 0 && h('div', { className: 'px-6 pb-3' },
                    h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#475569', marginBottom: 4 } }, 'Your answers'),
                    h('div', { className: 'flex flex-wrap gap-1' },
                      quizAnswers.map(function(a, ai) {
                        var jointName = (JOINTS[a.key] && JOINTS[a.key].name) || a.key;
                        return h('div', { key: ai,
                          title: 'Q' + (ai + 1) + ': ' + jointName + (a.correct ? ' ✓' : ' ✗ (you picked ' + ((JOINTS[a.picked] && JOINTS[a.picked].name) || a.picked) + ')'),
                          style: {
                            width: 14, height: 14, borderRadius: 3,
                            background: a.correct ? '#16a34a' : '#dc2626',
                            border: '1.5px solid ' + (a.correct ? '#15803d' : '#7f1d1d'),
                            boxShadow: '0 1px 1px rgba(0,0,0,0.3)'
                          },
                          'aria-label': 'Q' + (ai + 1) + (a.correct ? ' correct' : ' incorrect')
                        });
                      })
                    )
                  ),
                  pct >= 80 && h('div', { className: 'px-6 py-2 border-t border-slate-200', style: { fontSize: 13, color: '#15803d', fontWeight: 700 } }, '🏅 Badge earned: Joint Reader'),
                  h('div', { className: 'px-6 py-3 border-t border-slate-200' },
                    h('button', {
                      onClick: startQuiz,
                      className: 'px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition focus:outline-none focus:ring-4 ring-orange-500/40'
                    }, '🔄 Retry Quiz')
                  )
                );
              })() : h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Identify this joint'),
                h('div', {
                  role: 'img',
                  'aria-label': 'Cross-section diagram of a welded joint. Identify which joint configuration this represents.',
                  className: 'bg-slate-100 rounded-xl border-2 border-slate-300 p-4 mb-4 mx-auto',
                  style: { maxWidth: '320px', height: '160px' }
                }, current.joint.svgRender(h, '#ea580c')),
                h('div', { 'role': 'radiogroup', 'aria-label': 'Joint type choices', className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mb-3' },
                  allChoices.map(function(ck) {
                    var picked = quizFeedback && quizFeedback.picked === ck;
                    var revealedRight = quizFeedback && quizFeedback.was === ck;
                    var btnClass = 'p-3 rounded-xl border-2 text-sm font-bold text-left transition focus:outline-none focus:ring-2 ring-orange-500/40 ';
                    if (quizFeedback) {
                      if (revealedRight) btnClass += 'bg-emerald-100 border-emerald-500 text-emerald-900';
                      else if (picked) btnClass += 'bg-rose-100 border-rose-500 text-rose-900';
                      else btnClass += 'bg-white border-slate-300 text-slate-800 opacity-60';
                    } else {
                      btnClass += 'bg-white border-slate-300 hover:border-orange-400 text-slate-800';
                    }
                    return h('button', {
                      key: ck,
                      onClick: function() { answerQuiz(ck); },
                      role: 'radio',
                      'aria-checked': picked ? 'true' : 'false',
                      'aria-disabled': quizFeedback ? 'true' : 'false',
                      className: btnClass
                    }, JOINTS[ck].name);
                  })
                ),
                quizFeedback && h('div', {
                  className: 'p-3 rounded-lg ' + (quizFeedback.correct ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-rose-50 border-2 border-rose-300'),
                  'aria-live': 'polite'
                },
                  h('div', { className: 'text-sm font-bold mb-1 ' + (quizFeedback.correct ? 'text-emerald-900' : 'text-rose-900') },
                    quizFeedback.correct ? '✓ Correct — ' + current.joint.name : '✗ Incorrect — this is a ' + current.joint.name),
                  h('div', { className: 'text-sm text-slate-800' }, current.joint.desc)
                ),
                quizFeedback && h('button', {
                  onClick: nextQuiz,
                  className: 'mt-3 w-full px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition focus:outline-none focus:ring-4 ring-orange-500/40'
                }, quizIdx + 1 >= quizPool.length ? 'See Final Score →' : 'Next Question →')
              )
            )
          );
        }

        // Catalog mode
        var current = JOINTS[tab];
        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🔩', title: 'Joint Configuration Catalog' }),
          h('div', { className: 'p-6 max-w-6xl mx-auto space-y-5' },
            h('div', { className: 'bg-gradient-to-r from-stone-50 to-slate-100 border-2 border-stone-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-stone-900 mb-2' }, 'The five fundamental joint configurations'),
              h('p', { className: 'text-sm text-slate-700 leading-relaxed' },
                'Every welded structure on Earth is built from some combination of these five joints. Recognize them at a glance and you\'re halfway to reading any blueprint or fabrication drawing.')
            ),
            // Tab strip
            h('div', { 'role': 'tablist', 'aria-label': 'Joint type tabs', className: 'flex flex-wrap gap-2' },
              Object.keys(JOINTS).map(function(jk) {
                var sel = (tab === jk);
                return h('button', {
                  key: jk,
                  role: 'tab',
                  'aria-selected': sel ? 'true' : 'false',
                  onClick: function() { setTab(jk); announce(JOINTS[jk].name + ' tab'); },
                  className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                    (sel ? 'bg-orange-600 text-white border-orange-700 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                }, JOINTS[jk].name);
              })
            ),
            // Detail card
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 overflow-hidden grid grid-cols-1 md:grid-cols-2' },
              h('div', { className: 'bg-slate-100 flex items-center justify-center p-6', style: { minHeight: '220px' } },
                h('div', {
                  role: 'img',
                  'aria-label': current.name + ' — cross-section view',
                  style: { maxWidth: '320px', width: '100%', height: '180px' }
                }, current.svgRender(h, '#ea580c'))
              ),
              h('div', { className: 'p-5 space-y-3' },
                h('h3', { className: 'text-2xl font-black text-slate-800' }, current.name),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, current.desc),
                h('div', { className: 'p-3 bg-amber-50 border border-amber-300 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-900 mb-1' }, 'Weld types used'),
                  h('div', { className: 'text-sm text-slate-800' }, current.welds)
                ),
                h('div', { className: 'p-3 bg-blue-50 border border-blue-300 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-blue-900 mb-1' }, 'Common applications'),
                  h('div', { className: 'text-sm text-slate-800' }, current.uses)
                ),
                h('div', { className: 'p-3 bg-rose-50 border border-rose-300 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-rose-900 mb-1' }, 'Watch for these defects'),
                  h('div', { className: 'text-sm text-slate-800' }, current.defects)
                )
              )
            ),
            // Position codes guide
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-3' }, 'AWS Position Codes — what 1F / 3G / 6G mean on a print'),
              h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
                POSITIONS.map(function(p) {
                  return h('div', { key: p.code, className: 'p-3 bg-slate-50 rounded-lg border border-slate-300' },
                    h('div', { className: 'flex items-center gap-2 mb-1' },
                      h('span', { className: 'text-xl', 'aria-hidden': true }, p.icon),
                      h('span', { className: 'font-mono text-lg font-black text-orange-700' }, p.code)
                    ),
                    h('div', { className: 'text-xs font-bold text-slate-800' }, p.name),
                    h('div', { className: 'text-xs text-slate-700 mt-0.5' }, p.desc)
                  );
                })
              ),
              h('div', { className: 'mt-3 p-3 bg-amber-50 border border-amber-300 rounded text-sm text-slate-800' },
                h('span', { className: 'font-bold text-amber-900' }, 'AWS certification trivia: '),
                'A welder certified for ',
                h('span', { className: 'font-mono font-bold' }, '6G'),
                ' (45° fixed pipe) is automatically qualified for all easier positions. The reverse is not true.')
            ),
            // Launch quiz
            h('div', { className: 'bg-orange-50 border-2 border-orange-300 rounded-2xl p-5 flex items-center gap-4' },
              h('div', { className: 'flex-1' },
                h('h3', { className: 'text-base font-black text-orange-900 mb-1' }, 'Test yourself — Joint Matching Quiz'),
                h('p', { className: 'text-sm text-slate-800' }, '5 randomized cross-section diagrams. Match each to the right joint name. Real welding-test prep.')
              ),
              h('button', {
                onClick: startQuiz,
                className: 'px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition focus:outline-none focus:ring-4 ring-orange-500/40'
              }, '🎯 Start Quiz')
            ),
            h(TeacherNotes, {
              standards: ['HS-ETS1-2 (Engineering)', 'AWS QC1 (Joint geometry)', 'CTE Manufacturing 5.2'],
              questions: [
                'Why are butt joints almost never welded as fillets, and lap joints almost never welded as grooves?',
                'A welding test certifies you in 3G (vertical groove). What other positions does that automatically qualify you for, and which still require separate testing?',
                'You see a "T-joint with full-penetration groove + reinforcing fillet" called out on a print. What kind of structure is that probably for, and why the redundancy?'
              ],
              misconceptions: [
                '"All joints are equally strong" — strength depends on joint type, weld type, and orientation. A fillet on a thin lap joint is not the same as a full-penetration butt weld.',
                '"Position doesn\'t matter as long as the weld holds" — the AWS position codes exist because each position has different defect risks and skill requirements; codes are how welders prove they can handle harder work.',
                '"Edge joints are basically the same as butt joints" — edge joints place the weld at the edges of parallel pieces, butt joints place it between pieces in the same plane. Different geometry, different applications.'
              ],
              extension: 'Walk around your home or school. Find one example of each of the five joint types (look at handrails, furniture, doors, brackets, machinery). Photograph or sketch each and label it.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 6: WELDING SYMBOLS READER
      // ─────────────────────────────────────────────────────
      // Decoder for AWS A2.4 welding symbols — the language printed on every
      // engineering drawing in a fab shop. The reference line, arrow, weld
      // symbol, tail, and modifiers (all-around, field weld, contour) form
      // a compact language. Misreading one of these is a real cost — the
      // wrong process or wrong size weld means scrap or, worse, structural
      // failure. Module teaches anatomy, then drills with progressively
      // harder real-world examples.

      // Symbol anatomy renderer — label each part of a master diagram
      function renderSymbolAnatomy(h) {
        return h('svg', { viewBox: '0 0 400 220', className: 'w-full max-w-2xl mx-auto', 'aria-label': 'Welding symbol anatomy diagram' },
          // Reference line (horizontal)
          h('line', { x1: 80, y1: 110, x2: 280, y2: 110, stroke: '#1f2937', strokeWidth: 2 }),
          // Arrow line
          h('line', { x1: 80, y1: 110, x2: 50, y2: 160, stroke: '#1f2937', strokeWidth: 2 }),
          // Arrow head
          h('path', { d: 'M 50 160 L 56 153 L 60 158 Z', fill: '#1f2937' }),
          // Weld symbol — fillet triangle below reference line (arrow side)
          h('path', { d: 'M 160 110 L 170 122 L 178 110 Z', fill: 'none', stroke: '#1f2937', strokeWidth: 1.5 }),
          // Weld symbol above (other side) — same but mirrored
          h('path', { d: 'M 200 110 L 210 98 L 218 110 Z', fill: 'none', stroke: '#1f2937', strokeWidth: 1.5 }),
          // Weld-all-around circle at junction
          h('circle', { cx: 80, cy: 110, r: 7, fill: 'none', stroke: '#1f2937', strokeWidth: 1.5 }),
          // Field weld flag
          h('path', { d: 'M 80 110 L 80 95 L 92 100 L 80 105 Z', fill: '#1f2937' }),
          // Size to the left of arrow-side symbol
          h('text', { x: 138, y: 124, fontSize: 12, fontFamily: 'monospace', fill: '#1f2937' }, '6'),
          // Tail with process
          h('line', { x1: 280, y1: 110, x2: 305, y2: 100, stroke: '#1f2937', strokeWidth: 2 }),
          h('line', { x1: 280, y1: 110, x2: 305, y2: 120, stroke: '#1f2937', strokeWidth: 2 }),
          h('text', { x: 312, y: 114, fontSize: 11, fontFamily: 'monospace', fill: '#1f2937' }, 'GMAW'),
          // Annotations
          h('text', { x: 30, y: 175, fontSize: 11, fill: '#dc2626', fontWeight: 'bold' }, 'Arrow → joint'),
          h('text', { x: 60, y: 92, fontSize: 11, fill: '#dc2626', fontWeight: 'bold' }, 'All-around'),
          h('text', { x: 75, y: 80, fontSize: 11, fill: '#dc2626', fontWeight: 'bold' }, '+ Field weld'),
          h('text', { x: 130, y: 145, fontSize: 11, fill: '#dc2626', fontWeight: 'bold' }, 'Size 6 (mm)'),
          h('text', { x: 152, y: 140, fontSize: 10, fill: '#dc2626' }, 'Arrow side ↑'),
          h('text', { x: 192, y: 90, fontSize: 10, fill: '#dc2626' }, 'Other side ↓'),
          h('text', { x: 305, y: 135, fontSize: 11, fill: '#dc2626', fontWeight: 'bold' }, 'Process: MIG (GMAW)')
        );
      }

      // Symbol library — common weld symbols with description
      var WELD_SYMBOLS = [
        { id: 'fillet',     name: 'Fillet weld',          render: function(h) { return h('path', { d: 'M 30 40 L 45 60 L 60 40 Z', fill: 'none', stroke: '#1f2937', strokeWidth: 2 }); }, use: 'T, lap, corner joints' },
        { id: 'sqGroove',   name: 'Square groove',        render: function(h) { return h('rect', { x: 30, y: 40, width: 30, height: 20, fill: 'none', stroke: '#1f2937', strokeWidth: 2 }); }, use: 'Thin butt joints' },
        { id: 'vGroove',    name: 'V-groove',             render: function(h) { return h('path', { d: 'M 30 40 L 45 65 L 60 40', fill: 'none', stroke: '#1f2937', strokeWidth: 2 }); }, use: 'Medium-thick butt joints' },
        { id: 'bevel',      name: 'Bevel groove',         render: function(h) { return h('path', { d: 'M 30 40 L 45 65 L 60 40 L 60 60', fill: 'none', stroke: '#1f2937', strokeWidth: 2 }); }, use: 'One-sided prep on butt or T' },
        { id: 'uGroove',    name: 'U-groove',             render: function(h) { return h('path', { d: 'M 30 40 Q 30 65 45 65 Q 60 65 60 40', fill: 'none', stroke: '#1f2937', strokeWidth: 2 }); }, use: 'Heavy-section butt, less filler than V' },
        { id: 'plug',       name: 'Plug / slot',          render: function(h) { return h('rect', { x: 32, y: 42, width: 26, height: 18, fill: '#94a3b8', stroke: '#1f2937', strokeWidth: 2 }); }, use: 'Lap joints with hole through top piece' },
        { id: 'allAround',  name: 'Weld-all-around',      render: function(h) { return h('circle', { cx: 45, cy: 50, r: 10, fill: 'none', stroke: '#1f2937', strokeWidth: 2 }); }, use: 'Modifier — weld continues all around the joint' },
        { id: 'field',      name: 'Field weld flag',      render: function(h) { return h('path', { d: 'M 35 35 L 35 65 M 35 35 L 55 42 L 35 49 Z', fill: '#1f2937', stroke: '#1f2937', strokeWidth: 2 }); }, use: 'Modifier — weld done in the field, not the shop' },
        { id: 'flush',      name: 'Flush contour',        render: function(h) { return h('line', { x1: 30, y1: 50, x2: 60, y2: 50, stroke: '#1f2937', strokeWidth: 2 }); }, use: 'Modifier — finish flush with surface' },
        { id: 'convex',     name: 'Convex contour',       render: function(h) { return h('path', { d: 'M 30 55 Q 45 40 60 55', fill: 'none', stroke: '#1f2937', strokeWidth: 2 }); }, use: 'Modifier — weld bulges above surface' }
      ];

      // Decoding challenges — progressive difficulty. Each shows a symbol and
      // asks the student to decode multiple aspects.
      var SYMBOL_CHALLENGES = [
        {
          id: 'ch1',
          difficulty: 'Beginner',
          context: 'You\'re working in a structural shop and the print shows this symbol on a T-joint:',
          render: function(h) {
            return h('svg', { viewBox: '0 0 220 140', className: 'w-full', style: { maxWidth: '300px' } },
              h('line', { x1: 60, y1: 70, x2: 180, y2: 70, stroke: '#1f2937', strokeWidth: 2 }),
              h('line', { x1: 60, y1: 70, x2: 35, y2: 105, stroke: '#1f2937', strokeWidth: 2 }),
              h('path', { d: 'M 35 105 L 41 99 L 45 104 Z', fill: '#1f2937' }),
              h('path', { d: 'M 110 70 L 120 82 L 128 70 Z', fill: 'none', stroke: '#1f2937', strokeWidth: 1.5 }),
              h('text', { x: 90, y: 84, fontSize: 12, fontFamily: 'monospace', fill: '#1f2937' }, '1/4')
            );
          },
          questions: [
            { q: 'What kind of weld is specified?', choices: ['Fillet', 'V-groove', 'Plug', 'Bevel'], answer: 0 },
            { q: 'Which side gets the weld?', choices: ['Arrow side (below ref. line)', 'Other side (above ref. line)', 'Both sides'], answer: 0 },
            { q: 'What\'s the weld size?', choices: ['1/4 inch leg', '1/2 inch throat', '4 inch length', 'Unspecified'], answer: 0 }
          ]
        },
        {
          id: 'ch2',
          difficulty: 'Intermediate',
          context: 'Print for a railing assembly. This symbol appears on a T-joint at every post:',
          render: function(h) {
            return h('svg', { viewBox: '0 0 220 140', className: 'w-full', style: { maxWidth: '300px' } },
              h('line', { x1: 60, y1: 70, x2: 180, y2: 70, stroke: '#1f2937', strokeWidth: 2 }),
              h('line', { x1: 60, y1: 70, x2: 35, y2: 105, stroke: '#1f2937', strokeWidth: 2 }),
              h('path', { d: 'M 35 105 L 41 99 L 45 104 Z', fill: '#1f2937' }),
              h('circle', { cx: 60, cy: 70, r: 7, fill: 'none', stroke: '#1f2937', strokeWidth: 1.5 }),
              h('path', { d: 'M 60 70 L 60 55 L 72 60 L 60 65 Z', fill: '#1f2937' }),
              h('path', { d: 'M 110 70 L 120 82 L 128 70 Z', fill: 'none', stroke: '#1f2937', strokeWidth: 1.5 }),
              h('text', { x: 90, y: 84, fontSize: 12, fontFamily: 'monospace', fill: '#1f2937' }, '3/16')
            );
          },
          questions: [
            { q: 'What does the circle at the joint mean?', choices: ['Drill hole here', 'Weld all the way around the joint', 'Stop and inspect', 'Field tested'], answer: 1 },
            { q: 'What does the flag at the joint mean?', choices: ['Field weld — done at install site', 'Quality flag', 'Optional weld', 'Tail reference'], answer: 0 },
            { q: 'Why "weld all-around + field weld" for a railing?', choices: ['Aesthetic only', 'Railings are installed on-site and need full perimeter sealing for strength', 'It\'s the cheapest option', 'Required by code regardless of design'], answer: 1 }
          ]
        },
        {
          id: 'ch3',
          difficulty: 'Intermediate',
          context: 'Production drawing for a structural beam splice. The symbol shows welds on both sides:',
          render: function(h) {
            return h('svg', { viewBox: '0 0 220 140', className: 'w-full', style: { maxWidth: '300px' } },
              h('line', { x1: 60, y1: 70, x2: 180, y2: 70, stroke: '#1f2937', strokeWidth: 2 }),
              h('line', { x1: 60, y1: 70, x2: 35, y2: 105, stroke: '#1f2937', strokeWidth: 2 }),
              h('path', { d: 'M 35 105 L 41 99 L 45 104 Z', fill: '#1f2937' }),
              // Below ref line — arrow-side V-groove
              h('path', { d: 'M 105 70 L 120 88 L 135 70', fill: 'none', stroke: '#1f2937', strokeWidth: 1.5 }),
              // Above ref line — other-side V-groove
              h('path', { d: 'M 105 70 L 120 52 L 135 70', fill: 'none', stroke: '#1f2937', strokeWidth: 1.5 }),
              h('text', { x: 90, y: 80, fontSize: 12, fontFamily: 'monospace', fill: '#1f2937' }, '3/8'),
              h('text', { x: 90, y: 60, fontSize: 12, fontFamily: 'monospace', fill: '#1f2937' }, '3/8')
            );
          },
          questions: [
            { q: 'What\'s the joint preparation?', choices: ['Square groove', 'Double V-groove (both sides beveled)', 'Lap with fillet', 'Plug weld'], answer: 1 },
            { q: 'Why double V instead of single?', choices: ['Looks better', 'Heavy section needing full penetration with less filler than single V', 'Required for stainless', 'Cheaper'], answer: 1 },
            { q: 'What\'s the size of each groove?', choices: ['3/8 inch depth on each side', '3/16 inch each', '3/4 inch combined', 'Unspecified'], answer: 0 }
          ]
        },
        {
          id: 'ch4',
          difficulty: 'Advanced',
          context: 'Pipeline drawing — pipe fits to a flange. Tail of symbol calls out specific process:',
          render: function(h) {
            return h('svg', { viewBox: '0 0 280 140', className: 'w-full', style: { maxWidth: '380px' } },
              h('line', { x1: 60, y1: 70, x2: 200, y2: 70, stroke: '#1f2937', strokeWidth: 2 }),
              h('line', { x1: 60, y1: 70, x2: 35, y2: 105, stroke: '#1f2937', strokeWidth: 2 }),
              h('path', { d: 'M 35 105 L 41 99 L 45 104 Z', fill: '#1f2937' }),
              h('circle', { cx: 60, cy: 70, r: 7, fill: 'none', stroke: '#1f2937', strokeWidth: 1.5 }),
              // Single V-groove arrow side
              h('path', { d: 'M 110 70 L 125 88 L 140 70', fill: 'none', stroke: '#1f2937', strokeWidth: 1.5 }),
              // Convex contour
              h('path', { d: 'M 110 92 Q 125 78 140 92', fill: 'none', stroke: '#1f2937', strokeWidth: 1.5 }),
              h('text', { x: 90, y: 80, fontSize: 12, fontFamily: 'monospace', fill: '#1f2937' }, '1/2'),
              // Tail
              h('line', { x1: 200, y1: 70, x2: 225, y2: 60, stroke: '#1f2937', strokeWidth: 2 }),
              h('line', { x1: 200, y1: 70, x2: 225, y2: 80, stroke: '#1f2937', strokeWidth: 2 }),
              h('text', { x: 232, y: 74, fontSize: 11, fontFamily: 'monospace', fill: '#1f2937' }, 'GTAW-6G')
            );
          },
          questions: [
            { q: 'What process does "GTAW" call out?', choices: ['MIG', 'TIG', 'Stick', 'Oxy-fuel'], answer: 1 },
            { q: 'What does "6G" specify?', choices: ['6th iteration', 'Pipe fixed at 45° (hardest test position)', 'A grade of steel', 'Inspector ID'], answer: 1 },
            { q: 'What does the convex curve below the V mean?', choices: ['Concave grind', 'Convex contour — weld bulges above flush', 'Radius cut', 'Unspecified'], answer: 1 },
            { q: 'Combined: what skill level does this print demand?', choices: ['Entry-level shop welder', 'Intermediate fab', 'High — requires AWS 6G TIG-certified pipe welder', 'Robotic only'], answer: 2 }
          ]
        }
      ];

      function SymbolsReader() {
        var view_state = usePersistedState('sr_view', 'anatomy');
        var view = view_state[0], setLocalView = view_state[1];
        var challengeIdx_state = useState(0);
        var challengeIdx = challengeIdx_state[0], setChallengeIdx = challengeIdx_state[1];
        var answers_state = useState({});
        var answers = answers_state[0], setAnswers = answers_state[1];

        function answer(qIdx, choice) {
          var key = challengeIdx + '_' + qIdx;
          var next = Object.assign({}, answers);
          next[key] = choice;
          setAnswers(next);
          var correct = SYMBOL_CHALLENGES[challengeIdx].questions[qIdx].answer === choice;
          announce(correct ? 'Correct' : 'Incorrect — try again');
        }

        var current = SYMBOL_CHALLENGES[challengeIdx];
        var allAnswered = current.questions.every(function(q, qi) {
          var key = challengeIdx + '_' + qi;
          return answers[key] != null && answers[key] === q.answer;
        });
        var anyAnsweredWrong = current.questions.some(function(q, qi) {
          var key = challengeIdx + '_' + qi;
          return answers[key] != null && answers[key] !== q.answer;
        });

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '📐', title: 'Welding Symbols Reader' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            // Tab strip
            h('div', { 'role': 'tablist', 'aria-label': 'Symbol Reader sections', className: 'flex flex-wrap gap-2' },
              [
                { id: 'anatomy',  label: '1. Anatomy of a Symbol' },
                { id: 'library',  label: '2. Common Symbols' },
                { id: 'practice', label: '3. Decoder Practice' }
              ].map(function(t) {
                var sel = (view === t.id);
                return h('button', {
                  key: t.id,
                  role: 'tab',
                  'aria-selected': sel ? 'true' : 'false',
                  onClick: function() { setLocalView(t.id); announce(t.label); },
                  className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                    (sel ? 'bg-orange-600 text-white border-orange-700 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                }, t.label);
              })
            ),
            view === 'anatomy' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-blue-300 rounded-2xl p-5' },
                h('h2', { className: 'text-lg font-black text-blue-900 mb-2' }, 'AWS A2.4 — the welding symbol explained'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'Every welded part on every engineering drawing in the country uses this same compact language. The reference line is the spine; everything else hangs off it. Master the parts and you can read any print.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 flex justify-center' },
                renderSymbolAnatomy(h)
              ),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                [
                  ['Reference line', 'Horizontal line — the "spine." Everything attaches to it.'],
                  ['Arrow', 'Points to the joint that gets welded. The leg with the arrowhead is the "arrow side."'],
                  ['Symbol below ref. line', 'Weld goes on the ARROW side of the joint.'],
                  ['Symbol above ref. line', 'Weld goes on the OTHER side of the joint.'],
                  ['Size (left of symbol)', 'Leg length for fillets, depth for grooves. Numbers without units = inches in US shops.'],
                  ['Length-pitch (right of symbol)', 'For intermittent welds: weld length, dash, center-to-center spacing.'],
                  ['Circle at junction', 'Weld-all-around — continues completely around the joint.'],
                  ['Flag at junction', 'Field weld — performed at the install site, not in the shop.'],
                  ['Tail', 'Holds the process abbreviation (GMAW, GTAW, SMAW, FCAW), specs, references.']
                ].map(function(pair, i) {
                  return h('div', { key: i, className: 'p-3 bg-slate-50 rounded-lg border border-slate-300' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-orange-700 mb-1' }, pair[0]),
                    h('div', { className: 'text-sm text-slate-800' }, pair[1])
                  );
                })
              )
            ),
            view === 'library' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h2', { className: 'text-lg font-black text-slate-800 mb-3' }, 'Common weld symbols — visual reference'),
                h('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3' },
                  WELD_SYMBOLS.map(function(sym) {
                    return h('div', { key: sym.id, className: 'p-3 bg-slate-50 rounded-lg border border-slate-300 text-center' },
                      h('div', {
                        role: 'img',
                        'aria-label': sym.name + ' symbol',
                        className: 'flex justify-center items-center mb-2',
                        style: { height: '70px' }
                      },
                        h('svg', { viewBox: '0 0 90 80', style: { width: '70px', height: '70px' } },
                          sym.render(h)
                        )
                      ),
                      h('div', { className: 'text-xs font-bold text-slate-800' }, sym.name),
                      h('div', { className: 'text-[10px] text-slate-700 mt-1' }, sym.use)
                    );
                  })
                )
              ),
              h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-2xl p-5' },
                h('h3', { className: 'text-base font-black text-amber-900 mb-2' }, 'Memory hooks for common symbols'),
                h('ul', { className: 'space-y-1 text-sm text-slate-800' },
                  [
                    '✺ Fillet = triangle. Like the cross-section of the actual fillet weld.',
                    '✺ V-groove = two angled lines forming a V. Same as the prep on the plate.',
                    '✺ U-groove = a U. Heavy-section. Less filler needed than V.',
                    '✺ Square = simple rectangle. Used for thin material with no edge prep.',
                    '✺ Circle at junction = "everywhere it goes" → weld all-around.',
                    '✺ Flag = "out in the field." Field weld, install-site work.'
                  ].map(function(s, i) { return h('li', { key: i }, s); })
                )
              )
            ),
            view === 'practice' && h('div', { className: 'space-y-4' },
              h('div', { className: 'flex flex-wrap gap-2' },
                SYMBOL_CHALLENGES.map(function(c, i) {
                  var sel = (challengeIdx === i);
                  return h('button', {
                    key: c.id,
                    onClick: function() { setChallengeIdx(i); announce('Challenge ' + (i + 1) + ' loaded'); },
                    'aria-pressed': sel ? 'true' : 'false',
                    className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                      (sel ? 'bg-orange-600 text-white border-orange-700' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                  }, 'Challenge ' + (i + 1) + ' · ' + c.difficulty);
                })
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-4' },
                h('div', null,
                  h('div', { className: 'inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-900 mb-2' }, current.difficulty),
                  h('p', { className: 'text-sm text-slate-800 italic' }, current.context)
                ),
                h('div', { className: 'flex justify-center bg-slate-50 rounded-xl border border-slate-200 p-4' },
                  current.render(h)
                ),
                h('div', { className: 'space-y-3' },
                  current.questions.map(function(q, qi) {
                    var key = challengeIdx + '_' + qi;
                    var picked = answers[key];
                    return h('div', { key: qi, className: 'p-3 bg-slate-50 rounded-lg border border-slate-300' },
                      h('div', { className: 'text-sm font-bold text-slate-800 mb-2' }, (qi + 1) + '. ' + q.q),
                      h('div', { 'role': 'radiogroup', 'aria-label': q.q, className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                        q.choices.map(function(ch, ci) {
                          var sel = (picked === ci);
                          var revealCorrect = picked != null && q.answer === ci;
                          var revealWrong = picked === ci && picked !== q.answer;
                          var btnClass = 'p-2 rounded-lg border-2 text-sm font-semibold text-left transition focus:outline-none focus:ring-2 ring-orange-500/40 ';
                          if (revealCorrect) btnClass += 'bg-emerald-100 border-emerald-500 text-emerald-900';
                          else if (revealWrong) btnClass += 'bg-rose-100 border-rose-500 text-rose-900';
                          else if (sel) btnClass += 'bg-orange-100 border-orange-500 text-orange-900';
                          else btnClass += 'bg-white border-slate-300 hover:border-orange-400 text-slate-800';
                          return h('button', {
                            key: ci,
                            onClick: function() { answer(qi, ci); },
                            role: 'radio',
                            'aria-checked': sel ? 'true' : 'false',
                            className: btnClass
                          }, ch);
                        })
                      )
                    );
                  })
                ),
                allAnswered && h('div', { className: 'p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-emerald-900' },
                  h('div', { className: 'font-black text-lg' }, '✓ Challenge complete'),
                  h('p', { className: 'text-sm' }, 'You decoded all parts of this symbol correctly. Move on to the next challenge.')
                ),
                anyAnsweredWrong && !allAnswered && h('div', { className: 'p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-slate-800' },
                  '⚠ One or more answers above are wrong. Re-read the symbol and try again.')
              )
            ),
            h(TeacherNotes, {
              standards: ['CTE Manufacturing 5.4 (Print reading)', 'AWS A2.4', 'AWS QC1 (Inspector literacy)'],
              questions: [
                'Why is the convention "below ref line = arrow side" the OPPOSITE of what it might intuitively look like? (Hint: it has to do with which side of the metal you\'re looking at when reading the print.)',
                'Why do most production prints use abbreviations (GMAW, GTAW) in the tail rather than spelling out "MIG" or "TIG"?',
                'Suppose a print shows a fillet symbol with no size. Is that a print error, or does it mean something specific?'
              ],
              misconceptions: [
                '"The arrow ALWAYS points to where to put the weld" — true, but the symbol\'s position above/below the ref line tells you which SIDE of the joint, not just which joint.',
                '"All welds need an all-around circle" — only when the weld actually continues around. Most welds do not.',
                '"The tail is optional flavor" — the tail is where the engineer specifies process, certification level, NDT requirements. Ignore it at your peril.'
              ],
              extension: 'Find an engineering drawing online (search "weld symbol blueprint" — many public-domain examples exist). Identify every welding symbol on it. Decode each one and write a one-line plain-English description.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 7: PPE & SAFETY
      // ─────────────────────────────────────────────────────
      // Welding has more standing OSHA citations than almost any other shop
      // operation: arc burns to retina (UV), respiratory damage from metal
      // fumes (especially galvanized = zinc fume fever, stainless = hexavalent
      // chromium), hot-work fires (the leading cause of industrial fires
      // requiring fire watch), and electrocution (live arc + sweaty welder).
      // This module names the gear, names the hazards, and runs students
      // through 4 branch-decision scenarios drawn from real OSHA case
      // studies.
      var PPE_GEAR = [
        {
          id: 'helmet',
          name: 'Auto-darkening welding helmet',
          icon: '🪖',
          why: 'Arc UV at welding intensities can cause flash burn ("welder\'s flash") to the retina in seconds — feels like sand in your eyes 4-8 hours later. Untreated repeated exposure leads to permanent vision loss.',
          rule: 'Shade 10-13 lens (auto-darkens within 1ms of arc strike). Cheek and ear coverage required. ANSI Z87.1-2020 stamp.',
          osha: '29 CFR 1910.252(b)(2)(ii)(H)',
          must: true
        },
        {
          id: 'frClothing',
          name: 'Flame-resistant (FR) jacket / coveralls',
          icon: '🧥',
          why: 'Spatter is molten metal at 2,000°F+. Cotton t-shirt = ignites and clings. Polyester = melts to skin. Leather or proper FR cloth = sheds spatter.',
          rule: 'NFPA 2112 rated FR cotton, denim treated for FR, or split-grain leather. Long sleeves. Cuffless pants over high boots — no cuff to catch a spark.',
          osha: '29 CFR 1910.252(b)(3)',
          must: true
        },
        {
          id: 'gloves',
          name: 'Leather welding gloves',
          icon: '🧤',
          why: 'Heat protection (gauntlet covers wrist), spatter shield, and electrical insulation if touching live electrode holder. Required for every process — even TIG (lower heat but radiation still high).',
          rule: 'Goatskin / pigskin / cowhide. Gauntlet style covering forearm. Stiff for stick/MIG; thinner / tactile for TIG.',
          osha: '29 CFR 1910.252(b)(3)',
          must: true
        },
        {
          id: 'respirator',
          name: 'Respirator (when required)',
          icon: '😷',
          why: 'Welding fumes are fine particulate metal oxides. Mild steel = manganese (Parkinson\'s-linked at chronic exposure). Galvanized = zinc oxide = "zinc fume fever," flu-like for 24h. Stainless = hexavalent chromium = LUNG CARCINOGEN.',
          rule: 'Half-mask N95 minimum for occasional steel work in ventilated shop. PAPR (powered air-purifying respirator) for stainless or galvanized. Required if local exhaust ventilation can\'t reduce exposure below PEL.',
          osha: '29 CFR 1910.252(c) + 1910.134',
          must: false
        },
        {
          id: 'ventilation',
          name: 'Local exhaust ventilation',
          icon: '💨',
          why: 'Fume hood / fume extractor pulls fumes AWAY from the welder\'s breathing zone. Without it, even helmet shroud lets you breathe a fume cloud all day.',
          rule: 'Fume extractor positioned within 12-18" of arc, capture velocity 100-150 fpm at the source. Mandatory in confined spaces.',
          osha: '29 CFR 1910.252(c)(1)',
          must: true
        },
        {
          id: 'fireWatch',
          name: 'Fire watch + extinguisher',
          icon: '🧯',
          why: 'Welding sparks travel up to 35 feet. They can smolder for hours before flaming. Hot work is a leading cause of industrial fires (hospitals, warehouses, ships). NFPA 51B requires fire watch DURING + 30 minutes AFTER any hot work in fire-prone areas.',
          rule: 'Trained fire watch with ABC extinguisher for the duration of welding plus 30 minutes after. Hot work permit required in many shops.',
          osha: '29 CFR 1910.252(a) + NFPA 51B',
          must: true
        },
        {
          id: 'boots',
          name: 'Steel-toe high-top boots',
          icon: '🥾',
          why: 'Spatter falls. So do plate, electrodes, tools. Steel toe protects from drops; high-top keeps spatter out of your sock-tops.',
          rule: 'ASTM F2413 rated, 6-8" upper, leather (no synthetic — melts).',
          osha: '29 CFR 1910.136',
          must: true
        }
      ];

      // Hazard scenarios — branching multiple-choice. Each scenario has a
      // single "best answer" and explanations that cite OSHA / industry
      // sources. Modeled on real scenarios from the AWS welding-safety
      // training and OSHA case files.
      var SAFETY_SCENARIOS = [
        {
          id: 'sc1',
          title: 'Arc Flash / Bystander Exposure',
          situation: 'You\'re mid-pass on a MIG joint when a co-worker walks into the bay to grab a wrench. They glance at the arc for "just a second" without a helmet. They say "I\'m fine, I didn\'t look right at it."',
          choices: [
            { text: 'Stop welding, brief them on flash burn risk, set up a portable welding curtain before resuming.', correct: true, fb: 'Correct. Welding curtains (orange / blue tinted PVC) block arc UV from bystanders. ANSI Z49.1 mandates protection for anyone within line-of-sight of the arc. "Just a glance" causes flash burn 4-8h later.' },
            { text: 'Tell them they\'re probably fine since it was brief. Resume welding.', correct: false, fb: 'Wrong — flash burn is dose-dependent but seconds of unfiltered arc UV can cause keratitis. They may not feel it now but will at 2 a.m. Even if they\'re asymptomatic this time, the next "quick glance" could be worse.' },
            { text: 'Hand them your spare helmet and continue welding while they walk through.', correct: false, fb: 'Insufficient — helmets only protect the wearer. Anyone else who walks past, looks over, or stands within line-of-sight is still exposed. Curtains protect everyone in the area.' }
          ],
          osha: '29 CFR 1910.252(b)(2)(ii)(C) + ANSI Z49.1'
        },
        {
          id: 'sc2',
          title: 'Galvanized Steel + No Respirator',
          situation: 'A buddy asks you to weld a galvanized fence-post repair in his garage. He doesn\'t have a fume extractor or respirator. "Just a quick weld, you\'ll be fine."',
          choices: [
            { text: 'Refuse to weld unless you can grind the galvanizing off the joint area first AND have a respirator OR work outdoors with strong wind.', correct: true, fb: 'Correct. Galvanized steel releases zinc oxide fume when welded. "Zinc fume fever" hits 4-12h later: chills, fever, body aches, lasting 24-48h. Repeated exposure causes lung damage. Industry rule: GRIND OFF the galvanizing 2-3" each side of the joint before welding.' },
            { text: 'Open the garage door for ventilation and weld it quickly.', correct: false, fb: 'Insufficient. Open door may not provide enough air movement, especially if there\'s no cross-breeze. Zinc oxide is dense and settles. The "ventilation" you actually need is local exhaust at the arc — not just an open door 20 feet away.' },
            { text: 'Hold your breath while welding the bead.', correct: false, fb: 'Wrong — and concerning if you\'re asking. Welding a 6" bead takes 30+ seconds; you can\'t hold your breath through it. Even brief exposure to zinc fume at close range is enough to trigger fume fever.' }
          ],
          osha: '29 CFR 1910.252(c)(2) + NIOSH metal-fume guidance'
        },
        {
          id: 'sc3',
          title: 'Hot Work Without a Fire Watch',
          situation: 'You\'re doing a quick stick weld on a steel beam in a warehouse aisle. There are cardboard boxes on shelves about 20 feet away. The supervisor says "I\'ll be back in 5 minutes — just finish up."',
          choices: [
            { text: 'Stop. Either move the cardboard, install a spark-blanket curtain, or wait for the supervisor (or another fire watch) to return before continuing.', correct: true, fb: 'Correct. NFPA 51B and OSHA require a dedicated fire watch present DURING all hot work in fire-prone areas + 30 minutes after. Sparks from stick welding fly 30-35 feet. Cardboard at 20 feet is a fire hazard. Hot-work fires are a top cause of industrial losses.' },
            { text: 'Just finish the bead — it\'s only a few inches.', correct: false, fb: 'Wrong. Sparks from a single bead can smolder in cardboard or insulation for HOURS before flaming up. The 30-minutes-after rule exists because of exactly this. A "quick" weld has burned down warehouses.' },
            { text: 'Move 5 more feet from the boxes and weld.', correct: false, fb: 'Insufficient — sparks can travel up to 35 feet. You\'re still in the spark cone. Plus, no fire watch means no one with an extinguisher if a smolder starts after you leave.' }
          ],
          osha: '29 CFR 1910.252(a)(2)(iv) + NFPA 51B'
        },
        {
          id: 'sc4',
          title: 'Confined Space Welding',
          situation: 'You\'re asked to weld a repair inside an empty oil drum at a small shop. The lid is open. The supervisor says it\'s "fine, the drum was steam-cleaned last week."',
          choices: [
            { text: 'Refuse until proper confined-space entry is set up: atmospheric testing, lockout/tagout, ventilation, attendant outside, retrieval line. "Hot work" + "confined space" + "container that held flammables" requires the strictest protocol.', correct: true, fb: 'Correct. This is one of the deadliest combinations in welding. Drums and tanks that held flammable liquids retain residue / vapor in seams and pores even after cleaning. Welders die every year from explosions in "empty cleaned" tanks. Steam-cleaning is NOT a substitute for a permit-required confined space entry program.' },
            { text: 'Sniff the drum. If you don\'t smell oil, weld it.', correct: false, fb: 'Wrong. Many flammable vapors are odorless or olfactory-fatigue past their flammable concentration. Smell test is not a confined-space gas test. People have died doing exactly this.' },
            { text: 'Fill the drum with water first, then weld the dry section above the water line.', correct: false, fb: 'Partial — actually the "water-fill" method IS used in industry, BUT only as part of a full hot-work permit including atmospheric testing. By itself without testing for vapors above the water line, it\'s still risky.' }
          ],
          osha: '29 CFR 1910.146 (Confined Space) + 1910.252(a)(3)'
        }
      ];

      function PPESafetyLab() {
        var view_state = usePersistedState('ps_view', 'gear');
        var view = view_state[0], setLocalView = view_state[1];
        var geared_state = useState({});
        var geared = geared_state[0], setGeared = geared_state[1];
        var scenarioIdx_state = useState(0);
        var scenarioIdx = scenarioIdx_state[0], setScenarioIdx = scenarioIdx_state[1];
        var scenarioPick_state = useState({});
        var scenarioPick = scenarioPick_state[0], setScenarioPick = scenarioPick_state[1];

        function toggleGear(id) {
          var next = Object.assign({}, geared);
          if (next[id]) delete next[id];
          else next[id] = true;
          setGeared(next);
          announce((next[id] ? 'Gear added: ' : 'Gear removed: ') + PPE_GEAR.find(function(g) { return g.id === id; }).name);
        }
        var mustItems = PPE_GEAR.filter(function(g) { return g.must; });
        var gearedMustCount = mustItems.filter(function(g) { return geared[g.id]; }).length;
        var gearedAllMust = gearedMustCount === mustItems.length;

        function pickScenario(idx) {
          var sc = SAFETY_SCENARIOS[scenarioIdx];
          var picked = scenarioPick[scenarioIdx];
          if (picked != null) return; // already answered
          var next = Object.assign({}, scenarioPick);
          next[scenarioIdx] = idx;
          setScenarioPick(next);
          announce(sc.choices[idx].correct ? 'Correct response' : 'Incorrect — see explanation');
        }

        var scoreCount = SAFETY_SCENARIOS.reduce(function(acc, s, i) {
          var p = scenarioPick[i];
          return acc + (p != null && s.choices[p].correct ? 1 : 0);
        }, 0);
        var answeredCount = SAFETY_SCENARIOS.reduce(function(acc, s, i) {
          return acc + (scenarioPick[i] != null ? 1 : 0);
        }, 0);

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🦺', title: 'PPE & Safety' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-start gap-3' },
              h('span', { className: 'text-3xl' }, '⚠️'),
              h('div', null,
                h('div', { className: 'text-sm font-black text-rose-900 mb-1' }, 'Welding can hurt or kill you if you skip the gear.'),
                h('p', { className: 'text-sm text-slate-800' },
                  'Arc burns the retina in seconds. Galvanized fumes cause "zinc fume fever." Stainless fumes are a known carcinogen (hexavalent chromium). Hot-work sparks travel 30+ feet and smolder for hours. Every PPE rule below has a body count behind it.')
              )
            ),
            h('div', { 'role': 'tablist', 'aria-label': 'PPE & Safety sections', className: 'flex flex-wrap gap-2' },
              [
                { id: 'gear',      label: '1. Gear Up' },
                { id: 'scenarios', label: '2. Hazard Scenarios' },
                { id: 'reference', label: '3. Quick Reference' }
              ].map(function(t) {
                var sel = (view === t.id);
                return h('button', {
                  key: t.id,
                  role: 'tab',
                  'aria-selected': sel ? 'true' : 'false',
                  onClick: function() { setLocalView(t.id); announce(t.label); },
                  className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                    (sel ? 'bg-orange-600 text-white border-orange-700 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                }, t.label);
              })
            ),
            // Tab-specific topic-accent hero band
            (function() {
              var TAB_META = {
                gear:      { accent: '#ea580c', soft: 'rgba(234,88,12,0.10)',  icon: '🦺', title: 'Gear up — every item is non-negotiable', hint: 'Hood, gloves, jacket, boots, respirator (when needed). Skip one and you do not weld today. Arc burns retinas in seconds.' },
                scenarios: { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '⚠️', title: 'Hazard scenarios — what could go wrong', hint: 'Galvanized fumes, hexavalent chromium from stainless, hot-work sparks at 30+ ft. Each scenario is from a documented incident.' },
                reference: { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '📋', title: 'Quick reference — pin to your locker',     hint: 'Material × process × lethal-fume table, hot-work fire-watch rules, OSHA 1910.252 cheat-sheet — the things you actually look up at 7 AM.' }
              };
              var meta = TAB_META[view] || TAB_META.gear;
              return h('div', {
                style: {
                  background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
                  border: '1px solid ' + meta.accent + '55',
                  borderLeft: '4px solid ' + meta.accent,
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'
                }
              },
                h('div', { style: { fontSize: 32, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                h('div', { style: { flex: 1, minWidth: 220 } },
                  h('h3', { style: { color: meta.accent, fontSize: 17, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  h('p', { style: { margin: '4px 0 0', color: '#475569', fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),
            view === 'gear' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
                h('div', { className: 'flex items-center justify-between mb-2' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Click each item as you put it on'),
                  h('div', { className: 'text-sm font-bold ' + (gearedAllMust ? 'text-emerald-700' : 'text-orange-700') },
                    gearedMustCount + ' / ' + mustItems.length + ' required items checked')
                ),
                gearedAllMust && h('div', {
                  'aria-live': 'polite',
                  className: 'p-2 rounded bg-emerald-50 border border-emerald-300 text-sm text-emerald-900 font-bold mb-2'
                }, '✓ Geared up. Ready to weld.')
              ),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                PPE_GEAR.map(function(g) {
                  var on = !!geared[g.id];
                  return h('button', {
                    key: g.id,
                    onClick: function() { toggleGear(g.id); },
                    'aria-pressed': on ? 'true' : 'false',
                    'aria-label': g.name + (on ? ' (worn)' : ' (not worn)'),
                    className: 'text-left bg-white rounded-2xl shadow border-2 ' +
                      (on ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-orange-400') +
                      ' p-4 transition focus:outline-none focus:ring-2 ring-orange-500/40'
                  },
                    h('div', { className: 'flex items-start gap-3' },
                      h('span', { className: 'text-3xl' }, g.icon),
                      h('div', { className: 'flex-1' },
                        h('div', { className: 'flex items-center gap-2 mb-1' },
                          h('div', { className: 'font-black text-slate-800' }, g.name),
                          g.must
                            ? h('span', { className: 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-900' }, 'Required')
                            : h('span', { className: 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900' }, 'When req.'),
                          on && h('span', { className: 'text-emerald-600 font-bold ml-auto' }, '✓')
                        ),
                        h('div', { className: 'text-xs text-slate-700 mb-1' }, g.why),
                        h('div', { className: 'text-xs text-slate-800' },
                          h('span', { className: 'font-bold' }, 'Spec: '), g.rule),
                        h('div', { className: 'text-[10px] text-slate-700 font-mono mt-1' }, g.osha)
                      )
                    )
                  );
                })
              )
            ),
            view === 'scenarios' && h('div', { className: 'space-y-4' },
              h('div', { className: 'flex flex-wrap gap-2' },
                SAFETY_SCENARIOS.map(function(s, i) {
                  var sel = (scenarioIdx === i);
                  var done = scenarioPick[i] != null;
                  var correct = done && s.choices[scenarioPick[i]].correct;
                  return h('button', {
                    key: s.id,
                    onClick: function() { setScenarioIdx(i); },
                    'aria-pressed': sel ? 'true' : 'false',
                    className: 'px-3 py-2 rounded-xl border-2 font-bold text-xs transition focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                      (sel ? 'bg-orange-600 text-white border-orange-700' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                  },
                    'Scenario ' + (i + 1),
                    done && h('span', { className: 'ml-1' }, correct ? '✓' : '✗')
                  );
                }),
                h('div', { className: 'ml-auto text-sm font-bold text-slate-700 self-center' },
                  'Score: ' + scoreCount + ' / ' + answeredCount + ' answered')
              ),
              (function() {
                var sc = SAFETY_SCENARIOS[scenarioIdx];
                var picked = scenarioPick[scenarioIdx];
                return h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-4' },
                  h('div', null,
                    h('h2', { className: 'text-xl font-black text-slate-800' }, sc.title),
                    h('div', { className: 'text-[11px] text-slate-700 font-mono mt-0.5' }, sc.osha)
                  ),
                  h('div', { className: 'p-4 bg-slate-100 rounded-xl border border-slate-300' },
                    h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, sc.situation)
                  ),
                  h('div', { 'role': 'radiogroup', 'aria-label': 'Response choices', className: 'space-y-2' },
                    sc.choices.map(function(c, ci) {
                      var sel = (picked === ci);
                      var revealCorrect = picked != null && c.correct;
                      var revealWrong = picked === ci && !c.correct;
                      var btnClass = 'w-full text-left p-3 rounded-xl border-2 text-sm font-semibold transition focus:outline-none focus:ring-2 ring-orange-500/40 ';
                      if (revealCorrect) btnClass += 'bg-emerald-100 border-emerald-500 text-emerald-900';
                      else if (revealWrong) btnClass += 'bg-rose-100 border-rose-500 text-rose-900';
                      else if (sel) btnClass += 'bg-orange-100 border-orange-500 text-orange-900';
                      else btnClass += 'bg-white border-slate-300 hover:border-orange-400 text-slate-800';
                      return h('button', {
                        key: ci,
                        onClick: function() { pickScenario(ci); },
                        role: 'radio',
                        'aria-checked': sel ? 'true' : 'false',
                        'aria-disabled': picked != null ? 'true' : 'false',
                        className: btnClass
                      },
                        h('div', null, c.text),
                        picked != null && h('div', { className: 'mt-2 text-xs italic' }, c.fb)
                      );
                    })
                  ),
                  picked != null && h('div', { className: 'flex justify-end' },
                    h('button', {
                      onClick: function() {
                        if (scenarioIdx + 1 < SAFETY_SCENARIOS.length) {
                          setScenarioIdx(scenarioIdx + 1);
                        }
                      },
                      'aria-disabled': scenarioIdx + 1 >= SAFETY_SCENARIOS.length ? 'true' : 'false',
                      className: 'px-4 py-2 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition focus:outline-none focus:ring-4 ring-orange-500/40 ' +
                        (scenarioIdx + 1 >= SAFETY_SCENARIOS.length ? 'opacity-50 cursor-not-allowed' : '')
                    }, scenarioIdx + 1 >= SAFETY_SCENARIOS.length ? 'All scenarios complete' : 'Next Scenario →')
                  )
                );
              })()
            ),
            view === 'reference' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-3' }, 'Welding-safety quick reference card'),
                h('div', { className: 'space-y-3 text-sm text-slate-800' },
                  [
                    { k: 'Lens shade for arc welding', v: 'Shade 10-13 (depends on amperage; 200+ A → 12-13)' },
                    { k: 'Spark travel distance', v: 'Up to 35 feet — clear or shield within this radius' },
                    { k: 'Fire watch duration', v: 'During hot work + 30 minutes after (NFPA 51B)' },
                    { k: 'Galvanized prep', v: 'Grind off galvanizing 2-3" each side of joint before welding' },
                    { k: 'Stainless fume', v: 'Hexavalent chromium — known carcinogen; PAPR + LEV required' },
                    { k: 'Confined space', v: 'Permit + atmospheric test + attendant + retrieval line — every time' },
                    { k: 'Manganese exposure (mild steel fume)', v: 'PEL: 5 mg/m³ ceiling. Chronic exposure linked to neurological damage.' },
                    { k: 'Ozone (TIG on stainless / aluminum)', v: 'Generated by UV + O₂. PEL 0.1 ppm. Ventilation required.' }
                  ].map(function(row, i) {
                    return h('div', { key: i, className: 'p-3 bg-slate-50 rounded border border-slate-200 flex items-start gap-3' },
                      h('div', { className: 'text-xs font-bold uppercase tracking-wider text-orange-700 w-48 flex-shrink-0' }, row.k),
                      h('div', { className: 'text-sm text-slate-800 flex-1' }, row.v)
                    );
                  })
                )
              ),
              h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-2xl p-5' },
                h('h3', { className: 'text-base font-black text-blue-900 mb-2' }, 'Authoritative sources to bookmark'),
                h('ul', { className: 'space-y-2 text-sm text-slate-800' },
                  [
                    ['OSHA 29 CFR 1910.252', 'The legal welding-safety standard. Cited throughout this module.'],
                    ['ANSI Z49.1', 'Industry consensus standard for safety in welding (referenced by OSHA).'],
                    ['NFPA 51B', 'Fire prevention during hot work. Source of fire-watch + permit requirements.'],
                    ['AWS Safety & Health Fact Sheets', 'Free, downloadable, hazard-by-hazard. Best plain-English source.'],
                    ['NIOSH Welding Hazard topic', 'CDC research on welding fumes, respiratory protection, etc.']
                  ].map(function(pair, i) {
                    return h('li', { key: i, className: 'flex items-start gap-2' },
                      h('span', { className: 'font-bold text-blue-900 w-44 flex-shrink-0' }, pair[0]),
                      h('span', null, pair[1])
                    );
                  })
                )
              )
            ),
            h(TeacherNotes, {
              standards: ['CTE Health & Safety Pathway', 'OSHA 29 CFR 1910.252', 'AWS Safety & Health Fact Sheets'],
              questions: [
                'Why is "hot work + confined space + container that held flammables" considered the deadliest combination in welding? What protocol covers each layer?',
                'Welding fume from mild steel, galvanized steel, and stainless steel each pose different hazards. Rank them by severity and explain.',
                'A friend asks you to weld their car frame in their driveway. Walk through the PPE + workspace setup you\'d insist on before agreeing.'
              ],
              misconceptions: [
                '"If I don\'t feel sick after welding, the fumes weren\'t bad" — manganese, chromium VI, and lead exposure cause CHRONIC harm; you may feel fine for years and develop neurological or pulmonary disease later.',
                '"My helmet protects my coworkers" — it does not. Anyone within line-of-sight of the arc needs their own protection (shield, curtain, or distance).',
                '"Galvanized fumes are just stinky, not dangerous" — zinc fume fever is a real, documented illness, and chronic exposure causes lung damage. Industry rule: grind it off.'
              ],
              extension: 'Look up an OSHA welding-fatality case file (OSHA Fatality and Catastrophe Investigation Summaries are public). Identify which PPE / procedure failure caused the death. Write a one-paragraph "what should have happened instead."'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 8: CAREER PATHWAYS
      // ─────────────────────────────────────────────────────
      // Maine-specific welding career landscape — the path students rarely
      // hear about from a guidance counselor. Trade school + AWS certification
      // ladder + apprenticeship is a real $70-100K career path that doesn't
      // require a four-year degree, and it's hiring NOW in Maine. Bath Iron
      // Works, Cianbro, ND Paper (Old Town), regional marine yards, pipeline
      // contractors. This module names the path and the doors.
      var CERT_LADDER = [
        {
          tier: 1,
          name: 'Entry / Helper',
          time: 'Day 1',
          what: 'No certification yet. Tack-welding, fit-up, grinding, shop helper duties. Learning by watching.',
          pay: '$18-22 / hr  ·  ~$38-46K/yr',
          how: 'Walk in to a shop, ask for a helper position. Many shops hire on attitude + willingness to learn.'
        },
        {
          tier: 2,
          name: 'AWS D1.1 Structural Cert',
          time: '6-12 months training',
          what: 'Certified to weld structural steel per AWS D1.1 code. Most common entry-level cert — passes you into shipyards, fab shops, ironwork.',
          pay: '$22-32 / hr  ·  ~$46-66K/yr',
          how: 'Complete a trade-school welding program (e.g. EMCC) OR self-study + take certification test at an accredited test facility (~$300-600 test fee).'
        },
        {
          tier: 3,
          name: '6G Pipe / Stainless Cert',
          time: '1-3 years experience + cert',
          what: '6G = 45° fixed pipe in TIG or GTAW. Hardest common position. Opens doors to pipeline, refinery, food-grade stainless, aerospace tier-2.',
          pay: '$32-45 / hr  ·  ~$66-94K/yr',
          how: 'Practice 6G under instruction (most welders take a 1-2 month dedicated prep course). Test at AWS-accredited facility.'
        },
        {
          tier: 4,
          name: 'CWI (Welding Inspector)',
          time: '5+ years welding experience + AWS exam',
          what: 'Certified Welding Inspector. Reads prints, inspects welds, signs off on code-compliant work. Office + field hybrid. Very stable career.',
          pay: '$70-95K / yr  ·  often higher with travel',
          how: 'Pass AWS CWI exam (3-part: fundamentals, practical, code). Required: 5y experience OR formal welding education + experience. ~$1500 exam fee.'
        },
        {
          tier: 5,
          name: 'Specialty / Underwater / Aerospace',
          time: '5+ years + niche certs',
          what: 'Underwater commercial diver-welder, aerospace D17.1, nuclear N509, military shipyard. Highest pay; specialized credentials and physical demands.',
          pay: '$90-200K+ / yr  ·  varies wildly by specialty',
          how: 'Underwater: commercial dive school + AWS underwater cert ($25-30K school cost). Aerospace: experience + specific D17.1/D17.2 testing. Nuclear: company-sponsored qualification.'
        }
      ];

      var ENTRY_PATHS = [
        {
          name: 'Trade school / community college',
          icon: '🎓',
          desc: 'Eastern Maine Community College (EMCC) in Bangor offers a 2-year Welding Technology AAS program (and a shorter 1-year certificate). Hands-on shop time, AWS certification testing built in. Pell-eligible.',
          pros: ['Structured curriculum, immediate AWS testing', 'Career-services help finding shops', 'Pell Grant + state aid often covers most cost'],
          cons: ['Takes 1-2 years before earning full wage', 'Tuition + supplies (~$5-10K total at EMCC)'],
          maine: 'EMCC Welding Technology — emcc.edu/welding-technology'
        },
        {
          name: 'Apprenticeship',
          icon: '🛠️',
          desc: 'Earn while you learn. Registered apprenticeships at unions (Iron Workers Local 7), at shops (Cianbro, BIW), or via Maine Apprenticeship Program (state-registered). Paid wages from day one, escalating as you certify.',
          pros: ['Paid full-time from day 1', 'No tuition debt', 'Direct path to specific employer'],
          cons: ['Fewer slots — competitive', 'Locked into one shop\'s techniques while training', 'Some unions require dues'],
          maine: 'Maine Apprenticeship Program — maine.gov/labor/jobs_training/apprenticeship'
        },
        {
          name: 'Military',
          icon: '⚓',
          desc: 'U.S. Navy Hull Maintenance Technician (HT) rate is essentially a paid welding career — Navy pays for training, gives you 4-6 years of experience welding on ships. After service, BIW, Portsmouth Naval, and civilian shipyards actively recruit Navy HTs.',
          pros: ['No tuition; salary + benefits during training', 'GI Bill for follow-on education', 'Direct hiring pipeline to BIW after service'],
          cons: ['Multi-year service commitment', 'Deployments / location not your choice', 'Requires meeting military entry standards'],
          maine: 'Bath Iron Works actively recruits former Navy HTs — biw.com/careers'
        },
        {
          name: 'Self-taught + certified',
          icon: '📚',
          desc: 'Buy a welder, watch hours of YouTube (Weld.com, Tim Welds, Pacific Arc Tig), practice on scrap. When ready, walk into an AWS-accredited test facility and pay to test. Pass D1.1 = certified, regardless of how you learned.',
          pros: ['Lowest cost path if disciplined', 'Self-paced', 'Builds the actual skill, not just paper'],
          cons: ['No structured feedback — easy to learn bad habits', 'No school / job placement help', 'Burns through equipment and consumables'],
          maine: 'AWS-accredited test facilities in Maine — aws.org/certification'
        }
      ];

      var ME_EMPLOYERS = [
        { name: 'Bath Iron Works (Bath)', industry: 'Shipbuilding (US Navy destroyers)', size: '~6,800 employees, welding the largest single trade', site: 'biw.com/careers' },
        { name: 'Cianbro (Pittsfield + statewide)', industry: 'Heavy civil construction, modular fabrication', size: 'Large self-perform contractor', site: 'cianbro.com/careers' },
        { name: 'ND Paper (Old Town)', industry: 'Pulp & paper machinery maintenance', size: 'Mill maintenance welder positions', site: 'ndpaper.com' },
        { name: 'Portland Yacht Services', industry: 'Marine fabrication and repair', size: 'Smaller marine yards across the coast', site: 'portlandyacht.com' },
        { name: 'Pratt & Whitney (North Berwick)', industry: 'Aerospace component manufacturing', size: 'Specialty welding (D17.1)', site: 'prattwhitney.com/careers' },
        { name: 'Reed & Reed (Woolwich)', industry: 'Bridges, towers, heavy steel construction', size: 'Field welding + shop fab', site: 'reed-reed.com' }
      ];

      function CareerPathways() {
        var view_state = usePersistedState('cp_view', 'overview');
        var view = view_state[0], setLocalView = view_state[1];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🛠️', title: 'Career Pathways' }),
          h('div', { className: 'p-6 max-w-6xl mx-auto space-y-5' },
            // Hero
            h('div', { className: 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-lg' },
              h('div', { className: 'flex items-start gap-4' },
                h('span', { className: 'text-5xl' }, '⚓'),
                h('div', null,
                  h('h2', { className: 'text-2xl font-black mb-1' }, 'Welding in Maine'),
                  h('p', { className: 'text-sm opacity-95 leading-relaxed' },
                    'Bath Iron Works hires hundreds of welders a year for US Navy destroyer construction. Cianbro, regional marine yards, paper mills, and pipeline contractors all post welding openings. AWS D1.1 certification + a high-school diploma can land a $50-70K job at age 19. 6G TIG cert can push it to $90K+. No four-year degree required.')
                )
              )
            ),
            // Tab strip
            h('div', { 'role': 'tablist', 'aria-label': 'Career pathway sections', className: 'flex flex-wrap gap-2' },
              [
                { id: 'overview',  label: '1. Why Welding' },
                { id: 'ladder',    label: '2. Cert Ladder' },
                { id: 'paths',     label: '3. Entry Paths' },
                { id: 'employers', label: '4. ME Employers' }
              ].map(function(t) {
                var sel = (view === t.id);
                return h('button', {
                  key: t.id,
                  role: 'tab',
                  'aria-selected': sel ? 'true' : 'false',
                  onClick: function() { setLocalView(t.id); announce(t.label); },
                  className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                    (sel ? 'bg-orange-600 text-white border-orange-700 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                }, t.label);
              })
            ),
            view === 'overview' && h('div', { className: 'space-y-4' },
              h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
                [
                  { stat: '$55-80K', label: 'starting pay with cert', sub: 'AWS D1.1 first job', color: 'text-emerald-700' },
                  { stat: '$90K+',   label: 'mid-career typical',     sub: '6G + experience',    color: 'text-orange-700' },
                  { stat: '0',       label: 'four-year degrees needed', sub: 'cert + experience > diploma', color: 'text-blue-700' }
                ].map(function(s, i) {
                  return h('div', { key: i, className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 text-center' },
                    h('div', { className: 'text-4xl font-black ' + s.color }, s.stat),
                    h('div', { className: 'text-sm font-bold text-slate-800 mt-1' }, s.label),
                    h('div', { className: 'text-xs text-slate-700 mt-1' }, s.sub)
                  );
                })
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-3' }, 'What\'s the day-to-day actually like?'),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-800' },
                  h('div', { className: 'p-3 bg-emerald-50 rounded-lg border border-emerald-200' },
                    h('div', { className: 'font-bold text-emerald-800 mb-1' }, '✓ The good'),
                    h('ul', { className: 'space-y-1 list-disc list-inside' },
                      h('li', null, 'Tangible result every day — you can SEE what you built'),
                      h('li', null, 'Strong demand, low layoff risk in skilled trades'),
                      h('li', null, 'Skills transfer geographically — every shipyard / mill needs welders'),
                      h('li', null, 'Path to your own shop / contractor work after experience'),
                      h('li', null, 'Overtime + premium pay common in shipyards')
                    )
                  ),
                  h('div', { className: 'p-3 bg-amber-50 rounded-lg border border-amber-200' },
                    h('div', { className: 'font-bold text-amber-900 mb-1' }, '⚠ The hard parts'),
                    h('ul', { className: 'space-y-1 list-disc list-inside' },
                      h('li', null, 'Physical work — bend, kneel, hold positions, lift'),
                      h('li', null, 'Hot, sweaty, fume-y environment'),
                      h('li', null, 'Vision and respiratory health require lifelong PPE discipline'),
                      h('li', null, 'Shift work common in production shops'),
                      h('li', null, 'Joint stress (knees, back, shoulders) accumulates over decades')
                    )
                  )
                )
              ),
              // ── First day at Bath Iron Works vignette ──
              // Composite school-psych narrative pairing the stats above
              // with what the floor actually looks like to a new welder.
              // Maine-specific (BIW), grounded in real shipyard practice.
              h('div', { className: 'bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow border-2 border-blue-200 p-5' },
                h('div', { className: 'flex items-center gap-2 mb-3' },
                  h('span', { 'aria-hidden': true, className: 'text-2xl' }, '⚓'),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-blue-700' }, 'A first day on the floor'),
                    h('div', { className: 'text-lg font-black text-slate-800' }, 'Composite — Bath Iron Works, Maine')
                  )
                ),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-3' },
                  h('em', null, 'Composite voice drawn from BIW + EMCC welder accounts. Names changed; everything else is from the floor.')
                ),
                h('div', { className: 'space-y-3 text-sm text-slate-800 leading-relaxed' },
                  h('p', null,
                    'Six-fifteen on a Monday morning. You park under the gantry crane that built the ',
                    h('em', null, 'Arleigh Burke'),
                    '-class hulls and watched ',
                    h('em', null, 'Zumwalts'),
                    ' slide down the ways. The shift whistle goes at six-thirty. You\'re early because your dad worked here for thirty-one years and told you, "If you\'re on time, you\'re late."'),
                  h('p', null,
                    'Your assignor walks you onto the deck. The ',
                    h('em', null, 'DDG'),
                    ' you\'ll be welding on for the next year is parked on stands the size of school buses. It is bigger than you imagined and somehow also smaller — closer up than the photos. Inside, the smell hits first: hot metal, weld fume, machine oil. The sound second: arc gouging from two bays over (a sound like the world\'s loudest staple gun), grinders, the ventilation rumble.'),
                  h('p', null,
                    'You are issued a leather kit, an auto-darkening helmet that someone has signed in the brim, FR coveralls a size too big, and a respirator. The lead welder on your bay is a woman named Maria who has been here for nineteen years. She watches you tie your boots and says, "First job today: just observe. Do not touch anything live. Ask before you do anything." She is not unkind. She has lost three apprentices to first-day burns and one to a flash that put him in the ER for three days.'),
                  h('p', null,
                    'By lunch you have not welded anything. You have learned where the eyewash station is, where the fire extinguishers live, what the alarm signals mean, where to clip your harness when you go up. You have watched Maria run a 6G stainless joint that you could not have done if your life depended on it. She makes it look like she\'s painting a wall.'),
                  h('p', null,
                    'After lunch she lets you strike your first arc on a piece of scrap. Your hands shake. The bead looks terrible. She nods once and says, "Better than mine on day one." You spend the rest of the afternoon practicing on scrap, stopping every fifteen minutes to drink water (the booth gets to 90 °F by 3 pm), watching the people around you do something that takes them about three years to learn well.'),
                  h('p', null,
                    'The shift whistle goes at three. You have a small cut on your wrist where the leather glove rode up. You have not earned anything you could put on a wall. You have learned the layout of the bay, the names of four people, and that this work is going to be harder and slower than every YouTube video made it look. On the way to your car you see the gantry crane swing a bow section toward the dry dock. You will help build that, eventually. Not this week. Maybe not this year. Eventually.')
                ),
                h('div', { className: 'mt-4 pt-3 border-t border-blue-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700' },
                  h('div', null,
                    h('div', { className: 'font-bold text-blue-700 uppercase tracking-wider mb-1' }, 'What this captures'),
                    h('p', { className: 'leading-relaxed' }, 'Pace, scale, sensory load, the specific safety culture of a shipyard. The "do not touch anything" first day is real practice.')),
                  h('div', null,
                    h('div', { className: 'font-bold text-blue-700 uppercase tracking-wider mb-1' }, 'What it leaves out'),
                    h('p', { className: 'leading-relaxed' }, 'Union vs non-union politics, shift differentials, deployments to other yards, what happens when a hull is delayed. Real, but not the day-one story.')),
                  h('div', null,
                    h('div', { className: 'font-bold text-blue-700 uppercase tracking-wider mb-1' }, 'Discussion'),
                    h('p', { className: 'leading-relaxed' }, 'What in this story would draw you in? What would push you away? What questions would you want to ask Maria before signing on?'))
                )
              )
            ),
            view === 'ladder' && h('div', { className: 'space-y-3' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, 'Welding career ladder — typical progression'),
              CERT_LADDER.map(function(c, i) {
                return h('div', { key: c.tier, className: 'bg-white rounded-2xl shadow border border-slate-300 p-4 flex items-start gap-4' },
                  h('div', { className: 'flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center text-2xl font-black shadow' },
                    'T' + c.tier),
                  h('div', { className: 'flex-1' },
                    h('div', { className: 'flex items-center justify-between flex-wrap gap-2 mb-1' },
                      h('div', { className: 'text-lg font-black text-slate-800' }, c.name),
                      h('div', { className: 'text-sm font-bold text-emerald-700' }, c.pay)
                    ),
                    h('div', { className: 'text-[11px] uppercase tracking-wider text-slate-700 font-bold mb-1' }, c.time),
                    h('div', { className: 'text-sm text-slate-800 mb-2' }, c.what),
                    h('div', { className: 'text-xs text-slate-700' },
                      h('span', { className: 'font-bold text-slate-800' }, 'How to get there: '), c.how)
                  )
                );
              }),
              h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-sm text-slate-800' },
                h('div', { className: 'font-bold text-amber-900 mb-1' }, 'About these pay bands'),
                'Wages are 2025 ranges based on US Bureau of Labor Statistics, AWS surveys, and Maine-specific employer data. Actual pay varies by employer, location, overtime, and whether shop is union. BIW + heavy industrial trends to the higher end of each band.')
            ),
            view === 'paths' && h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
              ENTRY_PATHS.map(function(p, i) {
                return h('div', { key: i, className: 'bg-white rounded-2xl shadow border border-slate-300 overflow-hidden' },
                  h('div', { className: 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4' },
                    h('div', { className: 'flex items-center gap-3' },
                      h('span', { className: 'text-3xl' }, p.icon),
                      h('div', { className: 'text-lg font-black' }, p.name)
                    )
                  ),
                  h('div', { className: 'p-4 space-y-3' },
                    h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, p.desc),
                    h('div', { className: 'grid grid-cols-1 gap-2' },
                      h('div', null,
                        h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1' }, '✓ Pros'),
                        h('ul', { className: 'space-y-0.5 text-sm text-slate-800' },
                          p.pros.map(function(s, si) {
                            return h('li', { key: si, className: 'flex items-start gap-1.5' },
                              h('span', { className: 'text-emerald-500 font-bold' }, '✓'),
                              h('span', null, s));
                          })
                        )
                      ),
                      h('div', null,
                        h('div', { className: 'text-xs font-bold uppercase tracking-wider text-rose-700 mb-1' }, '× Cons'),
                        h('ul', { className: 'space-y-0.5 text-sm text-slate-800' },
                          p.cons.map(function(s, si) {
                            return h('li', { key: si, className: 'flex items-start gap-1.5' },
                              h('span', { className: 'text-rose-500 font-bold' }, '×'),
                              h('span', null, s));
                          })
                        )
                      )
                    ),
                    h('div', { className: 'p-2 bg-blue-50 border border-blue-300 rounded text-xs text-slate-800' },
                      h('span', { className: 'font-bold text-blue-900' }, 'Maine specific: '), p.maine)
                  )
                );
              })
            ),
            view === 'employers' && h('div', { className: 'space-y-3' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, 'Maine welding employers — sample of where welders work in-state'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                ME_EMPLOYERS.map(function(e, i) {
                  return h('div', { key: i, className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
                    h('div', { className: 'text-base font-black text-slate-800' }, e.name),
                    h('div', { className: 'text-xs text-slate-700 mt-0.5' }, e.industry),
                    h('div', { className: 'text-sm text-slate-800 mt-2' }, e.size),
                    h('div', { className: 'text-[11px] font-mono text-blue-700 mt-1' }, e.site)
                  );
                })
              ),
              h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-2xl p-4' },
                h('h3', { className: 'text-base font-black text-blue-900 mb-2' }, 'Other places to look'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'CareerCenter Maine (mainecareercenter.gov) lists open welding positions statewide. Indeed and ZipRecruiter aggregate shop postings. Most large employers (BIW, Cianbro, Pratt) have dedicated career portals where you can apply directly without a recruiter. Many small-town shops still rely on word-of-mouth — walking in and asking is not unusual or unwelcome in this trade.')
              )
            ),
            h(TeacherNotes, {
              standards: ['CTE Manufacturing Pathway', 'Maine Career & Workforce Readiness', 'AWS SENSE Program'],
              questions: [
                'Compare a four-year college path (~$80-120K + 4 years) to a welding cert path (~$10K + 1-2 years). At age 22, what\'s the difference in lifetime earnings and career flexibility? (Hint: think about both upsides and downsides honestly.)',
                'Why does Bath Iron Works actively recruit former Navy Hull Maintenance Technicians? What signal does that send about the value of the Navy training pipeline?',
                'A student is considering welding but is worried about long-term physical wear. What lifelong career options exist for an experienced welder who can\'t (or doesn\'t want to) keep welding in awkward positions at 50?'
              ],
              misconceptions: [
                '"Trades are for people who can\'t do college" — modern welding requires print reading, geometry, materials science, and physics literacy. The skills overlap with engineering, just applied through your hands.',
                '"Welders all top out at $50K" — entry-level welders may, but 6G pipe, CWI inspectors, and underwater welders routinely earn $80-200K+. The ceiling is high if you stack certifications.',
                '"AI / robots will replace welders" — high-volume linear welds (auto body, simple structural) are robot-welded. Custom fabrication, repair, complex positions, exotic metals, and field work are all extremely human-driven and growing.'
              ],
              extension: 'Pick one Maine employer above and visit their careers page. Find one currently-posted welding job. Note the required certifications, pay range, and shift schedule. Then sketch out a 2-year plan to be qualified for that exact job by graduation.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 9: UNDERWATER WELDING
      // ─────────────────────────────────────────────────────
      // Specialty welding career path — the highest-paying tier ($80-200K+)
      // and the most dangerous. Two techniques: WET (you and the torch are
      // submerged, electrode is waterproof-coated stick/SMAW) and HYPERBARIC
      // (a sealed pressurized habitat keeps water out, you weld in dry gas).
      // Physics: water cools the weld 5-8x faster than air, which causes
      // hardened HAZ + hydrogen embrittlement risk; pressure compresses the
      // arc and shortens its visible plume. Real career hook for students:
      // commercial dive school + AWS underwater cert is a real, hireable path.
      function UnderwaterLab() {
        var view_state = usePersistedState('uw_view', 'intro');
        var view = view_state[0], setLocalView = view_state[1];
        var depth_state = usePersistedState('uw_depth', 30);
        var depth = depth_state[0], setDepth = depth_state[1];
        var technique_state = usePersistedState('uw_tech', 'wet');
        var technique = technique_state[0], setTech = technique_state[1];

        // Physics: 33 ft of seawater ≈ 1 atm gauge. Cooling rate is highly
        // depth-dependent for wet welding (water always cooler at depth) and
        // largely constant for dry/hyperbaric (chamber gas controls heat
        // transfer). Hydrogen risk in wet welding rises with depth because
        // increased pressure dissolves more hydrogen into the weld pool.
        var pressureATM = 1 + depth / 33;
        var coolingMult = technique === 'wet' ? clamp(5 + depth * 0.025, 5, 12) : 1.6;
        var hydrogenRisk = technique === 'wet' ? clamp(30 + depth * 0.18, 30, 95) : 6;
        var maxSafeWet = 100; // ft, industry rule of thumb for typical wet work
        var atDepthLimit = technique === 'wet' && depth > maxSafeWet;
        var visibility = technique === 'wet' ? clamp(15 - depth * 0.04, 1, 15) : 30;

        // Bubble decoration — 6 bubbles randomized across the depth panel.
        // Pure CSS animation gated by global reduced-motion override.
        var bubbleSpec = [];
        for (var bi = 0; bi < 6; bi++) {
          bubbleSpec.push({
            id: bi,
            left: (bi * 17 + 8) % 96,
            size: 8 + (bi % 3) * 6,
            delay: (bi * 0.7) % 4,
            dur: 3.5 + (bi % 4) * 0.6
          });
        }

        function tabBtn(id, label) {
          var sel = (view === id);
          return h('button', {
            key: id,
            role: 'tab',
            'aria-selected': sel ? 'true' : 'false',
            onClick: function() { setLocalView(id); announce(label); },
            className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-cyan-500/40 ' +
              (sel ? 'bg-cyan-700 text-white border-cyan-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-cyan-500')
          }, label);
        }

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🌊', title: 'Underwater Welding' }),
          h('div', { className: 'p-6 max-w-6xl mx-auto space-y-5' },
            // Hero — cyan/blue ocean gradient with bubbles
            h('div', {
              className: 'relative bg-gradient-to-br from-cyan-700 to-blue-900 text-white rounded-2xl p-6 shadow-lg overflow-hidden',
              style: { minHeight: '160px' }
            },
              // Decorative bubble field
              h('div', { 'aria-hidden': true, className: 'absolute inset-0 pointer-events-none' },
                bubbleSpec.map(function(b) {
                  return h('span', {
                    key: b.id,
                    className: 'weldlab-bubble',
                    style: {
                      left: b.left + '%',
                      bottom: '0',
                      width: b.size + 'px',
                      height: b.size + 'px',
                      animationDelay: b.delay + 's',
                      animationDuration: b.dur + 's'
                    }
                  });
                })
              ),
              h('div', { className: 'relative flex items-start gap-4' },
                h('span', { className: 'text-5xl' }, '🤿'),
                h('div', null,
                  h('h2', { className: 'text-2xl font-black mb-1' }, 'Welding under the sea'),
                  h('p', { className: 'text-sm opacity-95 leading-relaxed max-w-3xl' },
                    'Commercial underwater welders earn $80-200K+ but they earn every penny. The work is dangerous, the certifications stack up, and the physics are unforgiving — water cools your weld 5-8 times faster than air, dissolved hydrogen embrittles the steel, and the arc itself is electrically conductive in saltwater. Two techniques dominate: WET (you and the torch are both in the water) and HYPERBARIC (a sealed dry chamber keeps water out).')
                )
              )
            ),
            h('div', { 'role': 'tablist', 'aria-label': 'Underwater welding sections', className: 'flex flex-wrap gap-2' },
              tabBtn('intro', '1. Wet vs Dry'),
              tabBtn('pressure', '2. Pressure Lab'),
              tabBtn('safety', '3. Specialty Hazards'),
              tabBtn('career', '4. Career Reality')
            ),
            view === 'intro' && h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border-2 border-cyan-300 p-5' },
                h('div', { className: 'flex items-center gap-3 mb-3' },
                  h('span', { className: 'text-3xl' }, '🌊'),
                  h('h3', { className: 'text-xl font-black text-cyan-900' }, 'Wet Welding')
                ),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-3' },
                  'You\'re in the water. The torch is in the water. The metal is in the water. Stick (SMAW) is the dominant process — the flux coating creates a tiny gas bubble around the arc that excludes water just long enough to fuse the metal. Used for emergency repairs, inspection follow-up work, and routine maintenance on offshore structures.'),
                h('div', { className: 'space-y-2' },
                  h('div', { className: 'p-2 bg-emerald-50 rounded border border-emerald-200 text-xs text-slate-800' },
                    h('span', { className: 'font-bold text-emerald-800' }, '✓ Pros: '),
                    'Lower setup cost. Fast deployment for emergency repair. Most accessible certification path.'),
                  h('div', { className: 'p-2 bg-rose-50 rounded border border-rose-200 text-xs text-slate-800' },
                    h('span', { className: 'font-bold text-rose-800' }, '× Cons: '),
                    'Lower weld quality (Class B by US Navy spec). Hydrogen embrittlement risk. Practical depth limit ~100 ft. Lower pay than hyperbaric.')
                ),
                h('div', { className: 'mt-3 p-2 bg-blue-50 rounded border border-blue-200 text-xs text-slate-800' },
                  h('span', { className: 'font-bold text-blue-900' }, 'Process: '), 'SMAW with E6013 / E7014 waterproofed electrodes')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border-2 border-blue-400 p-5' },
                h('div', { className: 'flex items-center gap-3 mb-3' },
                  h('span', { className: 'text-3xl' }, '🛎️'),
                  h('h3', { className: 'text-xl font-black text-blue-900' }, 'Hyperbaric (Dry) Welding')
                ),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-3' },
                  'A sealed pressurized chamber (called a "habitat") is lowered around the joint. Water is displaced by inert gas (argon-helium mix). The diver enters the dry habitat and welds normally — usually GTAW (TIG) for code-quality results. Used for permanent repairs on pipelines, oil rig riser sections, and ship hulls.'),
                h('div', { className: 'space-y-2' },
                  h('div', { className: 'p-2 bg-emerald-50 rounded border border-emerald-200 text-xs text-slate-800' },
                    h('span', { className: 'font-bold text-emerald-800' }, '✓ Pros: '),
                    'Code-quality welds (Class A). Works at any practical depth. Can use any process (TIG, MIG, Stick). Highest pay.'),
                  h('div', { className: 'p-2 bg-rose-50 rounded border border-rose-200 text-xs text-slate-800' },
                    h('span', { className: 'font-bold text-rose-800' }, '× Cons: '),
                    'Massive setup cost (chamber + support ship). Long mobilization time. Decompression schedule for diver. Niche specialty — fewer jobs.')
                ),
                h('div', { className: 'mt-3 p-2 bg-blue-50 rounded border border-blue-200 text-xs text-slate-800' },
                  h('span', { className: 'font-bold text-blue-900' }, 'Process: '), 'GTAW (TIG) most common; SMAW + GMAW also possible in dry chamber')
              )
            ),
            view === 'pressure' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Technique'),
                h('div', { 'role': 'radiogroup', 'aria-label': 'Underwater welding technique', className: 'grid grid-cols-2 gap-2' },
                  ['wet', 'dry'].map(function(t) {
                    var sel = (technique === t);
                    var lbl = t === 'wet' ? '🌊 Wet welding' : '🛎️ Hyperbaric (dry)';
                    return h('button', {
                      key: t,
                      onClick: function() { setTech(t); announce(lbl + ' selected'); },
                      role: 'radio',
                      'aria-checked': sel ? 'true' : 'false',
                      className: 'p-3 rounded-xl border-2 text-sm font-bold transition focus:outline-none focus:ring-4 ring-cyan-500/40 ' +
                        (sel ? 'bg-cyan-700 text-white border-cyan-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-cyan-500')
                    }, lbl);
                  })
                )
              ),
              h(LabeledSlider, {
                label: 'Depth',
                valueText: depth + ' ft (' + pressureATM.toFixed(1) + ' atm)',
                min: 0, max: 300, step: 5, value: depth, onChange: setDepth,
                hint: technique === 'wet' ? 'Practical wet welding limit ~100 ft. Beyond that: dry/saturation diving.' : 'Hyperbaric chambers rated to 1000 ft+ depending on equipment.',
                accent: 'accent-cyan-500',
                valueColor: 'text-cyan-700'
              }),
              // Depth visualization
              h('div', {
                role: 'img',
                'aria-label': 'Depth visualization. ' + depth + ' feet underwater. ' + pressureATM.toFixed(1) + ' atmospheres of pressure. ' + (technique === 'wet' ? 'Wet welding.' : 'Hyperbaric chamber.'),
                className: 'relative bg-gradient-to-b from-cyan-400 via-blue-700 to-blue-950 rounded-2xl shadow border-2 border-blue-900 overflow-hidden',
                style: { height: '220px' }
              },
                // Surface line at top
                h('div', { className: 'absolute top-0 inset-x-0 h-1 bg-cyan-300/70', 'aria-hidden': true }),
                // Bubbles for wet only
                technique === 'wet' && h('div', { 'aria-hidden': true, className: 'absolute inset-0 pointer-events-none' },
                  bubbleSpec.map(function(b) {
                    return h('span', {
                      key: b.id,
                      className: 'weldlab-bubble',
                      style: {
                        left: b.left + '%',
                        bottom: '20px',
                        width: b.size + 'px',
                        height: b.size + 'px',
                        animationDelay: b.delay + 's',
                        animationDuration: b.dur + 's'
                      }
                    });
                  })
                ),
                // Diver dot at depth — visual position
                h('div', {
                  'aria-hidden': true,
                  className: 'absolute left-1/2 -translate-x-1/2 transition-all',
                  style: { top: clamp((depth / 300) * 80 + 8, 8, 88) + '%' }
                },
                  technique === 'wet'
                    ? h('span', { className: 'text-3xl drop-shadow-lg' }, '🤿')
                    : h('div', { className: 'flex items-center gap-1' },
                        h('span', { className: 'text-3xl drop-shadow-lg' }, '🛎️'),
                        h('span', { className: 'text-xl drop-shadow-lg' }, '🤿')
                      )
                ),
                // Depth scale on the right
                h('div', { 'aria-hidden': true, className: 'absolute right-2 top-2 bottom-2 flex flex-col justify-between text-[10px] font-mono text-cyan-200' },
                  h('div', null, '0 ft'),
                  h('div', null, '100 ft'),
                  h('div', null, '200 ft'),
                  h('div', null, '300 ft')
                )
              ),
              // Stat readouts
              h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
                h(StatCard, { label: 'Pressure', value: pressureATM.toFixed(1), unit: 'atm', color: 'text-blue-700' }),
                h(StatCard, { label: 'Cooling Rate', value: coolingMult.toFixed(1) + '×', unit: 'vs air', color: coolingMult > 6 ? 'text-rose-700' : 'text-amber-700' }),
                h(StatCard, { label: 'Hydrogen Risk', value: Math.round(hydrogenRisk) + '%', unit: 'embrittlement', color: hydrogenRisk > 60 ? 'text-rose-700' : hydrogenRisk > 30 ? 'text-amber-700' : 'text-emerald-700' }),
                h(StatCard, { label: 'Visibility', value: visibility.toFixed(0), unit: visibility > 5 ? 'ft (workable)' : 'ft (poor)', color: visibility > 5 ? 'text-emerald-700' : 'text-rose-700' })
              ),
              atDepthLimit && h('div', {
                'aria-live': 'polite',
                className: 'p-4 bg-rose-50 border-2 border-rose-400 rounded-xl flex items-start gap-3'
              },
                h('span', { className: 'text-3xl' }, '⚠️'),
                h('div', null,
                  h('div', { className: 'font-black text-rose-900 mb-1' }, 'Beyond practical wet-welding limits'),
                  h('p', { className: 'text-sm text-slate-800' },
                    'Past ~100 ft, wet welding becomes commercially impractical. Hydrogen embrittlement risk, narcosis at depth, and code-quality issues mean industry switches to hyperbaric chambers or saturation diving for permanent repairs.')
                )
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-2' }, 'Why depth matters so much'),
                h('ul', { className: 'space-y-2 text-sm text-slate-800' },
                  [
                    ['Pressure', 'Each 33 ft of seawater adds 1 atm. The arc plume is compressed; visible arc length shortens dramatically. Welder must maintain a tighter arc gap.'],
                    ['Cooling rate', 'Water removes heat 25× more efficiently than air. At depth, water is colder still (~38-40°F below thermocline). Weld pool freezes fast → hardened, brittle weld.'],
                    ['Hydrogen risk', 'Arc dissociates H₂O into H₂ + O₂. Pressure forces hydrogen into the molten weld pool, where it embrittles the cooled steel. Higher pressure = more dissolved hydrogen.'],
                    ['Visibility', 'Suspended sediment + diver-stirred turbidity drops visibility to 1-3 ft on most working dives. Welders rely heavily on touch and habit.']
                  ].map(function(pair, i) {
                    return h('li', { key: i, className: 'flex items-start gap-2' },
                      h('span', { className: 'font-bold text-cyan-700 w-32 flex-shrink-0' }, pair[0]),
                      h('span', null, pair[1]));
                  })
                )
              )
            ),
            view === 'safety' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-rose-50 border-2 border-rose-400 rounded-2xl p-5 flex items-start gap-3' },
                h('span', { className: 'text-3xl' }, '☠️'),
                h('div', null,
                  h('div', { className: 'text-sm font-black text-rose-900 mb-1' }, 'Underwater welding fatality rate is among the highest in any trade.'),
                  h('p', { className: 'text-sm text-slate-800' },
                    'Industry estimates put fatality rates 5-10× higher than topside welding. The hazards stack: drowning + electric shock + decompression sickness + explosion risk + structural collapse + hypothermia. This isn\'t a scare tactic — it\'s why the pay is what it is.')
                )
              ),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                [
                  { icon: '⚡', title: 'Electric shock', detail: 'Saltwater conducts. Equipment must be DC negative polarity, fully insulated, with automatic dead-man cutoff. AC welding underwater is illegal — fatal nearly every time.' },
                  { icon: '💥', title: 'Hydrogen explosion', detail: 'Arc dissociates water into H₂ + O₂. If the gas pocket gets trapped (hull cavity, pipe), it can detonate. Multiple recorded fatalities. Procedures include venting cavities before lighting up.' },
                  { icon: '🩸', title: 'Decompression sickness', detail: 'Working at depth on compressed gas, the diver-welder must follow strict ascent / decompression schedules. "Bends" can cause permanent neurological damage or death. Hyperbaric work uses saturation diving.' },
                  { icon: '🥶', title: 'Hypothermia', detail: 'Cold water + long shifts (4-8h underwater is common). Dry suits, hot-water suits, and constant monitoring required.' },
                  { icon: '🌫️', title: 'Visibility / disorientation', detail: 'Stirred-up sediment can cut visibility to inches. Diver works by feel. Tether lines + comm checks every 60 seconds standard practice.' },
                  { icon: '⚓', title: 'Object strikes / collapse', detail: 'Strong currents, surge from passing vessels, structural failure of the work piece. Always two divers + topside attendant + retrieval line.' }
                ].map(function(haz, i) {
                  return h('div', { key: i, className: 'bg-white rounded-xl shadow border border-rose-300 p-4' },
                    h('div', { className: 'flex items-center gap-2 mb-2' },
                      h('span', { className: 'text-2xl' }, haz.icon),
                      h('div', { className: 'font-black text-rose-900' }, haz.title)
                    ),
                    h('p', { className: 'text-sm text-slate-800' }, haz.detail)
                  );
                })
              ),
              h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-2xl p-4' },
                h('h3', { className: 'text-base font-black text-blue-900 mb-1' }, 'The standards that exist for a reason'),
                h('ul', { className: 'space-y-1 text-sm text-slate-800' },
                  [
                    'AWS D3.6M — code for underwater welding (defines Class A, B, O quality tiers)',
                    'ANSI/ACDE-01 — Association of Commercial Diving Educators commercial-diver training standard',
                    'OSHA 29 CFR 1910 Subpart T — Commercial Diving Operations',
                    'ADCI Consensus Standards — Association of Diving Contractors International (industry baseline)'
                  ].map(function(s, i) {
                    return h('li', { key: i, className: 'flex items-start gap-2' },
                      h('span', { className: 'text-blue-700 font-bold' }, '◆'),
                      h('span', null, s));
                  })
                )
              )
            ),
            view === 'career' && h('div', { className: 'space-y-4' },
              h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
                [
                  { stat: '$80-200K+', label: 'commercial diver-welder', sub: 'high range with saturation diving', color: 'text-emerald-700' },
                  { stat: '~6-9 months', label: 'commercial dive school', sub: 'tuition typically $20-30K', color: 'text-blue-700' },
                  { stat: '~3-5 yrs', label: 'to journeyman level', sub: 'after dive school + entry job', color: 'text-amber-700' }
                ].map(function(s, i) {
                  return h('div', { key: i, className: 'bg-white rounded-2xl shadow border-2 border-cyan-300 p-5 text-center' },
                    h('div', { className: 'text-3xl font-black ' + s.color }, s.stat),
                    h('div', { className: 'text-sm font-bold text-slate-800 mt-1' }, s.label),
                    h('div', { className: 'text-xs text-slate-700 mt-1' }, s.sub)
                  );
                })
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-3' }, 'The path — step by step'),
                h('ol', { className: 'space-y-3 text-sm text-slate-800' },
                  [
                    ['1.', 'Get topside welding experience first', 'Most dive schools require AWS D1.1 cert or equivalent. Spend 1-2 years building solid welding fundamentals topside before adding the dive layer.'],
                    ['2.', 'Commercial dive school (6-9 months)', 'Schools include Divers Institute of Technology (Seattle), CDA Technical Institute (Florida), Santa Barbara City College program. ~$20-30K. Pell + GI Bill eligible.'],
                    ['3.', 'AWS D3.6M underwater welding cert', 'Specialty test administered after dive cert. Class B (wet) is the common entry level; Class A (code-quality) is rarer and pays more.'],
                    ['4.', 'Tender / entry-level commercial diving', 'First 1-2 years often as a "tender" — the topside role on a dive team. Watching, hauling, learning the operation. ~$45-60K.'],
                    ['5.', 'Journeyman diver-welder', 'After enough hours and good performance, you start running dives + welds yourself. ~$70-100K base + per-diem.'],
                    ['6.', 'Saturation diver / specialty (optional)', 'Saturation = living in a pressurized habitat for weeks at a time on offshore oil work. Highest pay ($150-250K+) but extreme demands.']
                  ].map(function(row, i) {
                    return h('li', { key: i, className: 'flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200' },
                      h('span', { className: 'text-2xl font-black text-cyan-700' }, row[0]),
                      h('div', null,
                        h('div', { className: 'font-bold text-slate-800' }, row[1]),
                        h('div', { className: 'text-xs text-slate-700 mt-0.5' }, row[2])
                      )
                    );
                  })
                )
              ),
              h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-2xl p-4' },
                h('h3', { className: 'text-base font-black text-blue-900 mb-1' }, 'Maine-specific note'),
                h('p', { className: 'text-sm text-slate-800' },
                  'Commercial dive-welding work in Maine is rare — most opportunities are Gulf Coast offshore oil, Pacific Northwest fishing/marine, or pipeline work nationwide. A Maine kid pursuing this path will likely relocate. Bath Iron Works does occasional underwater hull inspection but most repair is dry-docked. Best entry: get topside experience at BIW or Cianbro, then apply to dive school out of state.')
              )
            ),
            h(TeacherNotes, {
              standards: ['CTE Manufacturing Pathway', 'AWS D3.6M (Underwater Welding Code)', 'OSHA 29 CFR 1910 Subpart T'],
              questions: [
                'Why does wet welding produce lower-quality welds than topside welding even though the welder uses similar equipment? What\'s actually happening at the molecular level?',
                'A pipeline 300 ft below the surface needs an emergency repair. Wet or hyperbaric — and why?',
                'The fatality rate for commercial diver-welders is roughly 10× higher than for topside welders. The pay is roughly 2-3× higher. Is that a fair tradeoff? What does your answer depend on?'
              ],
              misconceptions: [
                '"Underwater welding is just regular welding underwater" — water dramatically alters the physics: cooling rate, hydrogen content, arc behavior, electrical safety. Different process, different welds, different code.',
                '"You can teach yourself underwater welding from YouTube" — no. The dive certification is non-negotiable for legal employment, and dive school takes months of in-water training. Self-taught + uncertified = uninsurable, unhirable, illegal in most contexts.',
                '"Saturation divers live in the water" — saturation divers live in a pressurized habitat for weeks at a time. The habitat is dry. They commute to the job site through a sealed bell.'
              ],
              extension: 'Watch a commercial-diving documentary (e.g. "Last Breath" 2019, "Pressure" video series). Identify three specific safety procedures used. Compare them to topside welding safety from Module 7. Where do they overlap? Where are they unique?'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 10: SPEED CHALLENGE
      // ─────────────────────────────────────────────────────
      // Time-pressure precision welding. The torch travels automatically at
      // tier-specified speed. The user adjusts voltage and amperage on the
      // fly to keep the bead in the optimal heat-input window. Each second
      // is sampled and contributes to a final score. Three difficulty tiers
      // model the real-world tolerance gap between an entry-level shop
      // welder, a code-quality production welder, and a Bath Iron Works
      // certified ship-hull welder.
      var SPEED_TIERS = {
        apprentice: {
          name: 'Apprentice',
          icon: '🟢',
          desc: 'Learning the feel — wide tolerance window, slower travel.',
          travel: 8,    // in/min
          tolV: 5,      // ± deviation from optimal
          tolA: 35,
          duration: 60,
          color: 'from-emerald-500 to-teal-700',
          accent: 'text-emerald-700',
          ring: 'ring-emerald-500/40'
        },
        pro: {
          name: 'Pro',
          icon: '🟠',
          desc: 'Production-grade — tight tolerance, faster travel.',
          travel: 12,
          tolV: 2.5,
          tolA: 18,
          duration: 60,
          color: 'from-orange-500 to-red-600',
          accent: 'text-orange-700',
          ring: 'ring-orange-500/40'
        },
        biw: {
          name: 'Bath Iron Works',
          icon: '🔴',
          desc: 'Ship-hull certified — minimal margin for error, fastest travel.',
          travel: 15,
          tolV: 1.2,
          tolA: 10,
          duration: 60,
          color: 'from-rose-600 to-red-800',
          accent: 'text-rose-700',
          ring: 'ring-rose-500/40'
        }
      };
      // ─────────────────────────────────────────────────────
      // PROCESS SLEUTH (net-new mini-game)
      // 10 vignettes; player picks the right welding process from 5 options.
      // Tests the AWS / vocational-school canonical decision: which process for
      // which job? Driven by material, joint, position, and setting (shop vs
      // outdoor, dirty vs clean, thin vs thick).
      // ─────────────────────────────────────────────────────
      function ProcessSleuth() {
        var PROCESSES = [
          { id: 'mig',  label: 'MIG (GMAW)',          color: '#0ea5e9', icon: '⚡',
            def: 'Wire-fed, gas-shielded. Fast, high deposition. Sensitive to wind. Shop favorite for steel + aluminum + stainless.' },
          { id: 'tig',  label: 'TIG (GTAW)',          color: '#a855f7', icon: '✨',
            def: 'Tungsten electrode + filler rod, gas-shielded. Slow, clean, precise. Best for thin material, stainless, aluminum, sanitary work.' },
          { id: 'stick', label: 'Stick (SMAW)',       color: '#dc2626', icon: '🔥',
            def: 'Coated electrode that melts into the puddle. Wind-tolerant, no gas needed, cuts through rust + mill scale. Pipeline + structural + farm.' },
          { id: 'fcaw', label: 'Flux-cored (FCAW)',   color: '#f59e0b', icon: '🌀',
            def: 'Wire with flux inside. Like MIG but no external gas needed (self-shielded) or with gas. High deposition. Outdoor-tolerant.' },
          { id: 'spot', label: 'Resistance / Spot',   color: '#16a34a', icon: '⚙️',
            def: 'Two electrodes squeeze + electrify thin sheet. Fast, automatable. Automotive body assembly + appliance manufacturing.' }
        ];
        var V = [
          { id: 1, scenario: 'Stainless steel sheet metal, 16-gauge (thin), butt joint, flat position. Custom food-service equipment for a Maine restaurant kitchen.', correct: 'tig',
            why: 'TIG\'s low heat input + clean argon shielding + no slag is mandatory for food-service stainless. Visible weld bead must look professional + sanitary. MIG works but produces more spatter; stick is too dirty for food-service spec.' },
          { id: 2, scenario: 'Mild steel structural beam, outdoor on a windy job site in coastal Maine. Vertical-up position. Connecting two I-beams.', correct: 'stick',
            why: 'Stick (SMAW) is wind-tolerant — shielding gas would be blown away in any breeze, ruining MIG/TIG welds. Coated electrode generates its own shielding atmosphere as it burns. AWS-rated structural electrodes (E7018) are stick. Pipeline + structural is canonical stick territory.' },
          { id: 3, scenario: 'Aluminum boat hull repair, 1/4" plate, shop environment, butt joint. Local lobster boat back in for spring.', correct: 'mig',
            why: 'Aluminum MIG with argon shielding gas + spool gun (or push-pull torch) is the production-standard. TIG also works for aluminum but is much slower. For a 1/4" plate hull repair, MIG\'s speed wins — TIG would be reserved for thinner-gauge work or visible-quality applications.' },
          { id: 4, scenario: 'Mild steel pipeline construction, 1/4" wall pipe, outdoor field conditions, all-position welding (root + fill + cap). Critical pipeline weld.', correct: 'fcaw',
            why: 'Modern pipeline welding uses Stick for the root pass (E6010 cellulosic) and FCAW for fill + cap (high deposition rate). Both are wind-tolerant. FCAW is the right answer for the bulk of weld metal deposited; stick alone is the older method.' },
          { id: 5, scenario: 'Thin sheet metal automotive body repair (22-gauge / 0.030"), butt joint, shop conditions. Replacing rusted-out fender on a customer\'s pickup.', correct: 'mig',
            why: 'Short-circuit transfer MIG is the canonical autobody process. Low heat input minimizes warping on thin sheet. TIG also works but is much slower; stick burns through 22-gauge instantly. Spot welding is for production assembly, not single-vehicle repair.' },
          { id: 6, scenario: 'Stainless steel pipe for a Maine craft brewery, 90° elbow joint, sanitary requirement (no porosity, no contamination). Small-diameter tubing, flat to horizontal positions.', correct: 'tig',
            why: 'Sanitary stainless welding requires TIG with argon backside purge to prevent oxidation on the pipe interior (which would harbor bacteria + ruin food-grade certification). MIG produces too much spatter for sanitary work. Brewery + dairy + pharma all use TIG-with-purge as the spec.' },
          { id: 7, scenario: 'Cast iron engine block, single 4" crack from freeze damage, field repair on a 1980s tractor. Customer needs it back working tomorrow.', correct: 'stick',
            why: 'Cast iron is challenging — it cracks if cooled too fast and resists fusion with steel filler. Field repair = stick with a nickel-rod electrode (like ENi-Cl). Stick handles dirty cast surfaces and lets you control heat input via slow stringer beads + peening. MIG/TIG cast-iron repair exists but isn\'t practical in the field.' },
          { id: 8, scenario: 'Heavy structural steel I-beam fabrication shop, 3/4" plate, fillet welds, indoor production. Bath Iron Works-style ship hull section.', correct: 'fcaw',
            why: 'FCAW (especially gas-shielded FCAW with 75/25 argon-CO₂) is the workhorse of heavy production fabrication: high deposition rate (5-15 lbs/hr vs 2-4 for stick), good penetration on thick plate, indoor wind-shielding works fine. Bath Iron Works runs FCAW on most ship hull plate.' },
          { id: 9, scenario: 'Automotive assembly line, joining two pieces of 18-gauge sheet steel for a vehicle frame. Process must complete in under 1 second per joint, robot-automated, thousands of joints per shift.', correct: 'spot',
            why: 'Resistance / spot welding is the only process that meets sub-second cycle times at this scale. Robots squeeze the two electrodes through the sheets, current flows, fusion happens at the contact point in <500 ms. No filler, no gas, no flux. Used on every car body in production today.' },
          { id: 10, scenario: 'Mild steel farm-equipment frame repair on an old hay rake. Surface has heavy mill scale + flaking rust. Outdoor barn conditions, no shielding-gas cylinder available.', correct: 'stick',
            why: 'Stick with E6011 electrode handles dirty / rusty / painted surfaces — the cellulose coating burns aggressively enough to dig through contamination. No gas cylinder needed (electrode coating provides shielding). Outdoor-tolerant. This is why stick endures despite slower deposition: it works in conditions where nothing else will.' }
        ];

        var psIdx = d.psIdx == null ? -1 : d.psIdx;
        var psSeed = d.psSeed || 1;
        var psAns = !!d.psAns;
        var psPick = d.psPick;
        var psScore = d.psScore || 0;
        var psRounds = d.psRounds || 0;
        var psStreak = d.psStreak || 0;
        var psBest = d.psBest || 0;
        var psShown = d.psShown || [];

        function startPs() {
          var pool = [];
          for (var i = 0; i < V.length; i++) if (psShown.indexOf(i) < 0) pool.push(i);
          if (pool.length === 0) { pool = []; for (var j = 0; j < V.length; j++) pool.push(j); psShown = []; }
          var seedNext = ((psSeed * 16807 + 11) % 2147483647) || 7;
          var pick = pool[seedNext % pool.length];
          upd('psSeed', seedNext);
          upd('psIdx', pick);
          upd('psAns', false);
          upd('psPick', null);
          upd('psShown', psShown.concat([pick]));
        }
        function pickPs(processId) {
          if (psAns) return;
          var v = V[psIdx];
          var correct = processId === v.correct;
          var newScore = psScore + (correct ? 1 : 0);
          var newStreak = correct ? (psStreak + 1) : 0;
          var newBest = Math.max(psBest, newStreak);
          upd('psAns', true);
          upd('psPick', processId);
          upd('psScore', newScore);
          upd('psRounds', psRounds + 1);
          upd('psStreak', newStreak);
          upd('psBest', newBest);
        }

        if (psIdx < 0) {
          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '🕵️', title: 'Process Sleuth' }),
            h('div', { className: 'p-6 max-w-3xl mx-auto space-y-5' },
              h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-2xl p-5' },
                h('h2', { className: 'text-lg font-black text-amber-900 mb-2' }, '10 welding scenarios — pick the right process'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'For each scenario, pick the welding process from MIG / TIG / Stick / FCAW / Resistance. Coaching after each pick names what makes this process the right choice and what would make a different process fit instead.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
                h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-700 mb-3' }, 'The five processes'),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                  PROCESSES.map(function(pr) {
                    return h('div', { key: pr.id, style: { padding: '8px 10px', borderRadius: 8, background: pr.color + '15', border: '1px solid ' + pr.color + '55' } },
                      h('div', { className: 'flex items-center gap-2 mb-1' },
                        h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, pr.icon),
                        h('span', { style: { color: pr.color, fontWeight: 800, fontSize: 12 } }, pr.label)
                      ),
                      h('div', { className: 'text-xs text-slate-700 leading-relaxed' }, pr.def)
                    );
                  })
                )
              ),
              h('button', {
                onClick: startPs,
                className: 'w-full px-5 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 focus:outline-none focus:ring-2 ring-amber-400'
              }, '🕵️ Start — vignette 1 of 10')
            )
          );
        }

        var v = V[psIdx];
        var pickedCorrect = psAns && psPick === v.correct;
        var pct = psRounds > 0 ? Math.round((psScore / psRounds) * 100) : 0;
        var allDone = psShown.length >= V.length && psAns;
        var correctProc = PROCESSES.filter(function(p) { return p.id === v.correct; })[0];
        var pickedProc = psPick ? PROCESSES.filter(function(p) { return p.id === psPick; })[0] : null;

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🕵️', title: 'Process Sleuth' }),
          h('div', { className: 'p-6 max-w-3xl mx-auto space-y-4' },
            // Score header
            h('div', { className: 'flex flex-wrap gap-3 items-center text-xs text-slate-700' },
              h('span', null, 'Vignette ', h('strong', { className: 'text-slate-900' }, psShown.length)),
              h('span', null, 'Score ', h('strong', { className: 'text-emerald-700' }, psScore + ' / ' + psRounds)),
              psRounds > 0 && h('span', null, 'Accuracy ', h('strong', { className: 'text-cyan-700' }, pct + '%')),
              h('span', null, 'Streak ', h('strong', { className: 'text-amber-700' }, psStreak)),
              h('span', null, 'Best ', h('strong', { className: 'text-fuchsia-700' }, psBest))
            ),
            // Vignette
            h('section', { className: 'p-5 rounded-2xl bg-amber-50 border-2 border-amber-300' },
              h('div', { className: 'text-xs font-bold uppercase tracking-widest text-amber-700 mb-2' }, 'Vignette ' + psShown.length + ' of ' + V.length),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, v.scenario)
            ),
            // 5 process picker buttons
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2', role: 'radiogroup', 'aria-label': 'Pick the right welding process' },
              PROCESSES.map(function(pr) {
                var picked = psAns && psPick === pr.id;
                var isRight = psAns && pr.id === v.correct;
                var bg, border, color;
                if (psAns) {
                  if (isRight) { bg = '#ecfdf5'; border = '#22c55e'; color = '#166534'; }
                  else if (picked) { bg = '#fef2f2'; border = '#ef4444'; color = '#991b1b'; }
                  else { bg = '#f8fafc'; border = '#cbd5e1'; color = '#64748b'; }
                } else {
                  bg = pr.color + '12'; border = pr.color + '60'; color = '#1e293b';
                }
                return h('button', {
                  key: pr.id, role: 'radio',
                  'aria-checked': picked ? 'true' : 'false',
                  'aria-label': pr.label,
                  disabled: psAns,
                  onClick: function() { pickPs(pr.id); },
                  style: { padding: '12px 14px', borderRadius: 12, background: bg, color: color, border: '2px solid ' + border, cursor: psAns ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12, minHeight: 70, transition: 'all 0.15s' }
                },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, pr.icon),
                    h('span', { style: { color: psAns ? color : pr.color, fontSize: 13, fontWeight: 800 } }, pr.label)
                  ),
                  h('div', { style: { fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: psAns ? color : '#475569' } }, pr.def)
                );
              })
            ),
            // Feedback
            psAns && h('section', {
              className: 'p-4 rounded-2xl',
              style: {
                background: pickedCorrect ? '#ecfdf5' : '#fef2f2',
                border: '1px solid ' + (pickedCorrect ? '#22c55e88' : '#ef444488')
              }
            },
              h('div', { className: 'text-sm font-bold mb-2', style: { color: pickedCorrect ? '#166534' : '#991b1b' } },
                pickedCorrect
                  ? '✅ Correct — ' + correctProc.label
                  : '❌ The right process is ' + correctProc.label + (pickedProc ? ' (you picked ' + pickedProc.label + ')' : '')
              ),
              h('p', { className: 'text-xs text-slate-800 leading-relaxed mb-3' }, v.why),
              allDone
                ? h('div', { className: 'p-3 rounded-lg bg-amber-100 border border-amber-300' },
                    h('div', { className: 'text-sm font-black text-amber-900 mb-1' }, '🏆 All 10 vignettes complete'),
                    h('div', { className: 'text-xs text-slate-800 leading-relaxed' },
                      'Final: ', h('strong', null, psScore + ' / ' + V.length + ' (' + Math.round((psScore / V.length) * 100) + '%)'),
                      psScore === V.length ? ' — every process call correct. Ready for AWS SENSE Module 1 process selection.' :
                      psScore >= 8 ? ' — strong process reasoning. The most-confused pair is usually MIG vs FCAW (both wire-fed) and MIG vs TIG for stainless (depends on visible-quality requirement).' :
                      psScore >= 6 ? ' — solid baseline. The four reflexes worth building: outdoor + wind = stick or FCAW (no gas), thin + clean + visible = TIG, fast + shop + steel = MIG, dirty + cast + rusty = stick.' :
                      ' — these distinctions are the daily decisions of every working welder. Re-read the rationales on misses, then retake.'
                    ),
                    h('button', {
                      onClick: function() { upd('psIdx', -1); upd('psShown', []); upd('psScore', 0); upd('psRounds', 0); upd('psStreak', 0); },
                      className: 'mt-3 px-4 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700'
                    }, '🔄 Restart')
                  )
                : h('button', {
                    onClick: startPs,
                    className: 'px-4 py-2 rounded-lg bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 focus:outline-none focus:ring-2 ring-amber-400'
                  }, '➡️ Next vignette')
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // DEFECT DIAGNOSE (net-new mini-game)
      // 10 weld-defect vignettes; player picks the most likely root cause from
      // 6 categories. Complements the existing Defect Hunt: that module teaches
      // visual ID; this one teaches root-cause analysis — the next-level CWI
      // skill that distinguishes welders from inspectors.
      // ─────────────────────────────────────────────────────
      function DefectDiagnose() {
        var CAUSES = [
          { id: 'heatHigh',    label: 'Heat too high',     color: '#dc2626', icon: '🔥', def: 'Amperage/voltage above the material\'s tolerance. Burns through, undercuts, excess spatter, oxidation, distortion.' },
          { id: 'heatLow',     label: 'Heat too low',       color: '#0ea5e9', icon: '❄️', def: 'Insufficient amperage to fully fuse the base metal. Lack of fusion, cold lap, narrow weak weld bead.' },
          { id: 'travelSlow',  label: 'Travel too slow',    color: '#16a34a', icon: '🐢', def: 'Torch lingered; puddle sat too long. Overlap (weld sits ON TOP), excess buildup, burn-through on thin material.' },
          { id: 'travelFast',  label: 'Travel too fast',    color: '#f59e0b', icon: '🐇', def: 'Torch moved too quickly to develop full fusion. Undercut, narrow bead, lack of penetration.' },
          { id: 'contamination', label: 'Contamination',     color: '#a855f7', icon: '🦠', def: 'Base metal had paint, oil, rust, mill scale, or moisture. Or shielding gas was lost (wind, leak, no purge). Causes porosity, oxidation, brittleness.' },
          { id: 'technique',   label: 'Technique error',    color: '#64748b', icon: '👷', def: 'Wrong angle, no inter-pass cleaning, no taper-off, no preheat, poor sequence. The miscellaneous category that is actually most common.' }
        ];
        var V = [
          { id: 1, defect: 'Porosity — gas pockets trapped in the weld, visible as small round holes on the surface or revealed by radiography.', correct: 'contamination',
            why: 'Porosity = gas trapped during solidification. Sources: paint/oil/rust on base metal (fix: grind clean), wind blowing shielding gas away (fix: weld indoors or stick electrode), wet flux (fix: oven-dry low-hydrogen rods), or hydrogen from contaminated water-cooled tooling. Correctly cleaning the joint prevents 80%+ of porosity issues.' },
          { id: 2, defect: 'Undercut — a continuous groove cut INTO the base metal alongside the weld toe, reducing the cross-section there.', correct: 'heatHigh',
            why: 'Undercut happens when the weld puddle melts the base metal but the metal does not flow back to fill it. Primary cause: amperage too high for the joint thickness/position. Secondary causes: travel speed too fast, wrong electrode angle. Fix: lower amperage by ~10% and re-test on coupon.' },
          { id: 3, defect: 'Lack of fusion — the weld metal sits on the base metal without bonding to it. Looks fine on the surface but fails NDT (ultrasonic, radiography).', correct: 'heatLow',
            why: 'Insufficient heat input fails to melt the base metal at the joint interface. The dangerous thing about this defect: it usually looks great on the surface. Primary cause: amperage too low. Other causes: too-fast travel (didn\'t dwell long enough), contamination (oil/oxide barrier). Fix: raise amperage + verify joint is clean.' },
          { id: 4, defect: 'Burn-through — a hole melted completely through the base metal at the weld location, especially on thin sheet (<14 gauge).', correct: 'heatHigh',
            why: 'Heat input exceeded what the thin material could conduct away. Primary cause: amperage too high for thickness. Secondary: travel too slow (dwell). Fix on thin material: short-circuit-transfer MIG with low amperage, faster travel, possibly skip welding (segment) to let heat dissipate between passes.' },
          { id: 5, defect: 'Crater crack — a crack at the END of a weld bead, in the cup-shaped depression where the arc was extinguished.', correct: 'technique',
            why: 'When the welder lifts the arc abruptly at the end of a bead, the cooling crater shrinks faster than the surrounding metal can supply filler — the result is a crack. Fix: taper off slowly, use a back-step technique, or use a runoff tab. Hot-crack-prone alloys (high-sulfur steels, certain stainless grades) need extra care. NOT a heat or travel issue — purely how you finish.' },
          { id: 6, defect: 'Overlap — weld metal sits on top of the base metal without fusing, looking like a frosting that did not penetrate the cake.', correct: 'travelSlow',
            why: 'Travel speed too slow lets the puddle pile up beyond what the heat can fuse into the base metal. The puddle "rolls over" the toe instead of wetting in. Primary cause: travel too slow. Secondary: amperage too low (puddle freezes before it spreads). Fix: speed up + verify amperage is in the sweet spot for that material.' },
          { id: 7, defect: 'Slag inclusion — non-metallic material (slag from the previous pass) trapped in the weld, often visible as dark spots in radiography.', correct: 'technique',
            why: 'When multi-pass welding (Stick, FCAW), slag from each pass MUST be chipped + wire-brushed off before the next pass. Failure to clean = slag pockets melted into the next pass. Pure technique error. Fix: chip + brush every pass, every time, even if the slag "looks like it came off."' },
          { id: 8, defect: 'Excessive spatter — small molten droplets stuck to the base metal AROUND the weld, requiring grinding to remove.', correct: 'heatHigh',
            why: 'Spatter spikes when arc voltage is too high (long arc length) or wrong gas/wire combination. Most common cause: voltage too high relative to amperage. Fix: lower voltage, shorten stick-out, check gas mix (75/25 Ar/CO2 spatters less than 100% CO2 for MIG). Anti-spatter spray reduces what does land but does not fix the source.' },
          { id: 9, defect: 'Distortion — the workpiece warped, twisted, or shrank after welding. Right-angle joint became 88°.', correct: 'technique',
            why: 'Uneven heat input causes uneven cooling + uneven shrinkage. Welds on one side of a piece pull that side toward the weld. Fix: balance heat input (alternate sides), use back-step or skip-welding sequence, preheat large sections, jig the work, or design with shrinkage allowance. Heat input alone matters less than HOW IT IS DISTRIBUTED.' },
          { id: 10, defect: 'Sugar oxidation — yellow/black oxide scale on the BACKSIDE of a stainless steel pipe weld, especially in food/sanitary applications.', correct: 'contamination',
            why: 'Hot stainless reacts with atmospheric oxygen on the weld backside if the inside of the pipe is not purged with argon. The result: chromium-depleted, corrosion-prone scale that harbors bacteria — disqualifying for food/pharma/dairy work. Fix: argon backside purge during the entire weld + cool-down period. Required for sanitary 3-A certification.' }
        ];

        var ddIdx2 = d.dd2Idx == null ? -1 : d.dd2Idx;
        var ddSeed2 = d.dd2Seed || 1;
        var ddAns2 = !!d.dd2Ans;
        var ddPick2 = d.dd2Pick;
        var ddScore2 = d.dd2Score || 0;
        var ddRounds2 = d.dd2Rounds || 0;
        var ddStreak2 = d.dd2Streak || 0;
        var ddBest2 = d.dd2Best || 0;
        var ddShown2 = d.dd2Shown || [];

        function startDd2() {
          var pool = [];
          for (var i = 0; i < V.length; i++) if (ddShown2.indexOf(i) < 0) pool.push(i);
          if (pool.length === 0) { pool = []; for (var j = 0; j < V.length; j++) pool.push(j); ddShown2 = []; }
          var seedNext = ((ddSeed2 * 16807 + 11) % 2147483647) || 7;
          var pick = pool[seedNext % pool.length];
          upd('dd2Seed', seedNext);
          upd('dd2Idx', pick);
          upd('dd2Ans', false);
          upd('dd2Pick', null);
          upd('dd2Shown', ddShown2.concat([pick]));
        }
        function pickDd2(causeId) {
          if (ddAns2) return;
          var v = V[ddIdx2];
          var correct = causeId === v.correct;
          var newScore = ddScore2 + (correct ? 1 : 0);
          var newStreak = correct ? (ddStreak2 + 1) : 0;
          var newBest = Math.max(ddBest2, newStreak);
          upd('dd2Ans', true);
          upd('dd2Pick', causeId);
          upd('dd2Score', newScore);
          upd('dd2Rounds', ddRounds2 + 1);
          upd('dd2Streak', newStreak);
          upd('dd2Best', newBest);
        }

        if (ddIdx2 < 0) {
          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '🔬', title: 'Defect Diagnose' }),
            h('div', { className: 'p-6 max-w-3xl mx-auto space-y-5' },
              h('div', { className: 'bg-rose-50 border-2 border-rose-300 rounded-2xl p-5' },
                h('h2', { className: 'text-lg font-black text-rose-900 mb-2' }, '10 weld defects — identify the root cause'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'Visual ID is one skill (Defect Hunt teaches it). ROOT-CAUSE diagnosis is the next-level skill that turns welders into CWI inspectors. For each defect, pick the most likely cause from 6 categories. Coaching cites the fix and how to prevent the defect on the next weld.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
                h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-700 mb-3' }, 'The six cause categories'),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                  CAUSES.map(function(c) {
                    return h('div', { key: c.id, style: { padding: '8px 10px', borderRadius: 8, background: c.color + '15', border: '1px solid ' + c.color + '55' } },
                      h('div', { className: 'flex items-center gap-2 mb-1' },
                        h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, c.icon),
                        h('span', { style: { color: c.color, fontWeight: 800, fontSize: 12 } }, c.label)
                      ),
                      h('div', { className: 'text-xs text-slate-700 leading-relaxed' }, c.def)
                    );
                  })
                )
              ),
              h('button', {
                onClick: startDd2,
                className: 'w-full px-5 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 focus:outline-none focus:ring-2 ring-rose-400'
              }, '🔬 Start — defect 1 of 10')
            )
          );
        }

        var v = V[ddIdx2];
        var pickedCorrect = ddAns2 && ddPick2 === v.correct;
        var pct = ddRounds2 > 0 ? Math.round((ddScore2 / ddRounds2) * 100) : 0;
        var allDone = ddShown2.length >= V.length && ddAns2;
        var correctCause = CAUSES.filter(function(c) { return c.id === v.correct; })[0];
        var pickedCause = ddPick2 ? CAUSES.filter(function(c) { return c.id === ddPick2; })[0] : null;

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🔬', title: 'Defect Diagnose' }),
          h('div', { className: 'p-6 max-w-3xl mx-auto space-y-4' },
            h('div', { className: 'flex flex-wrap gap-3 items-center text-xs text-slate-700' },
              h('span', null, 'Defect ', h('strong', { className: 'text-slate-900' }, ddShown2.length)),
              h('span', null, 'Score ', h('strong', { className: 'text-emerald-700' }, ddScore2 + ' / ' + ddRounds2)),
              ddRounds2 > 0 && h('span', null, 'Accuracy ', h('strong', { className: 'text-cyan-700' }, pct + '%')),
              h('span', null, 'Streak ', h('strong', { className: 'text-amber-700' }, ddStreak2)),
              h('span', null, 'Best ', h('strong', { className: 'text-fuchsia-700' }, ddBest2))
            ),
            h('section', { className: 'p-5 rounded-2xl bg-rose-50 border-2 border-rose-300' },
              h('div', { className: 'text-xs font-bold uppercase tracking-widest text-rose-700 mb-2' }, 'Defect ' + ddShown2.length + ' of ' + V.length),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, v.defect)
            ),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2', role: 'radiogroup', 'aria-label': 'Pick the root cause' },
              CAUSES.map(function(c) {
                var picked = ddAns2 && ddPick2 === c.id;
                var isRight = ddAns2 && c.id === v.correct;
                var bg, border, color;
                if (ddAns2) {
                  if (isRight) { bg = '#ecfdf5'; border = '#22c55e'; color = '#166534'; }
                  else if (picked) { bg = '#fef2f2'; border = '#ef4444'; color = '#991b1b'; }
                  else { bg = '#f8fafc'; border = '#cbd5e1'; color = '#64748b'; }
                } else {
                  bg = c.color + '12'; border = c.color + '60'; color = '#1e293b';
                }
                return h('button', {
                  key: c.id, role: 'radio',
                  'aria-checked': picked ? 'true' : 'false',
                  'aria-label': c.label,
                  disabled: ddAns2,
                  onClick: function() { pickDd2(c.id); },
                  style: { padding: '12px 14px', borderRadius: 12, background: bg, color: color, border: '2px solid ' + border, cursor: ddAns2 ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12, minHeight: 70, transition: 'all 0.15s' }
                },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, c.icon),
                    h('span', { style: { color: ddAns2 ? color : c.color, fontSize: 13, fontWeight: 800 } }, c.label)
                  ),
                  h('div', { style: { fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: ddAns2 ? color : '#475569' } }, c.def)
                );
              })
            ),
            ddAns2 && h('section', {
              className: 'p-4 rounded-2xl',
              style: {
                background: pickedCorrect ? '#ecfdf5' : '#fef2f2',
                border: '1px solid ' + (pickedCorrect ? '#22c55e88' : '#ef444488')
              }
            },
              h('div', { className: 'text-sm font-bold mb-2', style: { color: pickedCorrect ? '#166534' : '#991b1b' } },
                pickedCorrect
                  ? '✅ Correct — ' + correctCause.label
                  : '❌ The cause is ' + correctCause.label + (pickedCause ? ' (you picked ' + pickedCause.label + ')' : '')
              ),
              h('p', { className: 'text-xs text-slate-800 leading-relaxed mb-3' }, v.why),
              allDone
                ? h('div', { className: 'p-3 rounded-lg bg-rose-100 border border-rose-300' },
                    h('div', { className: 'text-sm font-black text-rose-900 mb-1' }, '🏆 All 10 defects diagnosed'),
                    h('div', { className: 'text-xs text-slate-800 leading-relaxed' },
                      'Final: ', h('strong', null, ddScore2 + ' / ' + V.length + ' (' + Math.round((ddScore2 / V.length) * 100) + '%)'),
                      ddScore2 === V.length ? ' — every root cause correctly identified. Ready for AWS CWI exam prep.' :
                      ddScore2 >= 8 ? ' — strong root-cause reasoning. The most-confused pair is usually heat-too-high (undercut, burn-through) vs travel-too-fast (also causes undercut, narrow bead) — both produce similar visual signatures.' :
                      ddScore2 >= 6 ? ' — solid baseline. Reflexes worth building: porosity = always think contamination/gas first, lack of fusion = always think low heat first, distortion = always technique (preheat + sequence).' :
                      ' — these distinctions matter when a weld is rejected and you need to fix the root cause, not just re-weld with the same parameters. Re-read the rationales, then retake.'
                    ),
                    h('button', {
                      onClick: function() { upd('dd2Idx', -1); upd('dd2Shown', []); upd('dd2Score', 0); upd('dd2Rounds', 0); upd('dd2Streak', 0); },
                      className: 'mt-3 px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700'
                    }, '🔄 Restart')
                  )
                : h('button', {
                    onClick: startDd2,
                    className: 'px-4 py-2 rounded-lg bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 focus:outline-none focus:ring-2 ring-rose-400'
                  }, '➡️ Next defect')
            )
          )
        );
      }

      // Optimal weld parameters — these are the "in spec" targets per process
      // for typical mild-steel structural work.
      var SPEED_OPTIMAL = { V: 22, A: 180 };

      function SpeedChallenge() {
        var tier_state = usePersistedState('sc_tier', 'apprentice');
        var tier = tier_state[0], setTier = tier_state[1];
        var V_state = useState(SPEED_OPTIMAL.V);
        var A_state = useState(SPEED_OPTIMAL.A);
        var V = V_state[0], setV = V_state[1];
        var A = A_state[0], setA = A_state[1];
        var running_state = useState(false);
        var running = running_state[0], setRunning = running_state[1];
        var elapsed_state = useState(0);
        var elapsed = elapsed_state[0], setElapsed = elapsed_state[1];
        var samples_state = useState([]);
        var samples = samples_state[0], setSamples = samples_state[1];
        var bestScores_state = useState(function() {
          return lsGet('weldLab.speed.best.v1', { apprentice: 0, pro: 0, biw: 0 });
        });
        var bestScores = bestScores_state[0], setBestScores = bestScores_state[1];

        var T = SPEED_TIERS[tier];

        // Sample current parameters every 250ms while running
        var liveRef = useRef({ V: V, A: A, running: running, T: T });
        liveRef.current = { V: V, A: A, running: running, T: T };

        useEffect(function() {
          if (!running) return;
          var startTime = performance.now();
          var rafId = null;
          var lastSampleAt = startTime;
          var localSamples = samples.slice();

          function tick(now) {
            var live = liveRef.current;
            if (!live.running) return;
            var ms = now - startTime;
            var elapsedSec = ms / 1000;
            setElapsed(elapsedSec);

            // Sample every 250ms — fine-grained enough to penalize overshoot
            // without spamming React state.
            if (now - lastSampleAt >= 250) {
              lastSampleAt = now;
              var dV = Math.abs(live.V - SPEED_OPTIMAL.V);
              var dA = Math.abs(live.A - SPEED_OPTIMAL.A);
              var inSpec = dV <= live.T.tolV && dA <= live.T.tolA;
              localSamples.push({
                t: elapsedSec,
                V: live.V,
                A: live.A,
                inSpec: inSpec,
                dV: dV,
                dA: dA
              });
              setSamples(localSamples.slice());
            }

            if (elapsedSec >= live.T.duration) {
              setRunning(false);
              // Final score
              var inSpecCount = localSamples.filter(function(s) { return s.inSpec; }).length;
              var totalSamples = Math.max(1, localSamples.length);
              var inSpecPct = (inSpecCount / totalSamples) * 100;
              // Weighted: 70% in-spec %, 30% bonus for low avg deviation
              var avgDev = localSamples.reduce(function(acc, s) {
                return acc + (s.dV / live.T.tolV + s.dA / live.T.tolA) / 2;
              }, 0) / totalSamples;
              var devPenalty = clamp((avgDev - 1) * 20, 0, 30);
              var finalScore = Math.round(clamp(inSpecPct - devPenalty, 0, 100));

              // Update personal best
              var newBest = Object.assign({}, bestScores);
              if (finalScore > (newBest[tier] || 0)) {
                newBest[tier] = finalScore;
                setBestScores(newBest);
                lsSet('weldLab.speed.best.v1', newBest);
                announce('New personal best for ' + live.T.name + ' tier: ' + finalScore + ' percent');
              } else {
                announce('Run complete. Score: ' + finalScore + ' percent.');
              }
              return;
            }

            rafId = requestAnimationFrame(tick);
          }

          rafId = requestAnimationFrame(tick);
          return function() {
            if (rafId) cancelAnimationFrame(rafId);
          };
        }, [running, tier]);

        function startRun() {
          setSamples([]);
          setElapsed(0);
          setV(SPEED_OPTIMAL.V);
          setA(SPEED_OPTIMAL.A);
          setRunning(true);
          announce('Speed challenge started, ' + T.name + ' tier, ' + T.duration + ' seconds');
        }
        function stopRun() {
          setRunning(false);
          announce('Run stopped early');
        }

        // Live in-spec status
        var dV = Math.abs(V - SPEED_OPTIMAL.V);
        var dA = Math.abs(A - SPEED_OPTIMAL.A);
        var liveInSpec = dV <= T.tolV && dA <= T.tolA;
        var inSpecCount = samples.filter(function(s) { return s.inSpec; }).length;
        var totalSamples = samples.length;
        var liveScore = totalSamples ? Math.round((inSpecCount / totalSamples) * 100) : 0;
        var pctElapsed = clamp(elapsed / T.duration, 0, 1);
        var timerColor = pctElapsed < 0.6 ? 'bg-emerald-500' : pctElapsed < 0.85 ? 'bg-amber-500' : 'bg-rose-500';

        var done = !running && samples.length > 0;
        var finalScore = done ? Math.round(clamp(
          (inSpecCount / Math.max(1, totalSamples)) * 100 -
          clamp((samples.reduce(function(acc, s) {
            return acc + (s.dV / T.tolV + s.dA / T.tolA) / 2;
          }, 0) / Math.max(1, totalSamples) - 1) * 20, 0, 30),
          0, 100)) : 0;

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '⏱️', title: 'Speed Challenge' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'bg-gradient-to-r from-fuchsia-50 to-rose-50 border-2 border-rose-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-rose-900 mb-2' }, 'Time-pressure precision welding'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'The torch travels at tier-specified speed. You adjust voltage and amperage live to keep the bead in spec. Each 250 ms sample is graded; final score = % time in-spec, minus penalty for average deviation. Personal best persists per tier.')
            ),
            // Tier picker
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Difficulty Tier'),
              h('div', { 'role': 'radiogroup', 'aria-label': 'Difficulty tier', className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
                Object.keys(SPEED_TIERS).map(function(tk) {
                  var t = SPEED_TIERS[tk];
                  var sel = (tier === tk);
                  return h('button', {
                    key: tk,
                    onClick: function() {
                      if (running) return;
                      setTier(tk);
                      setSamples([]);
                      setElapsed(0);
                      announce(t.name + ' tier selected');
                    },
                    role: 'radio',
                    'aria-checked': sel ? 'true' : 'false',
                    'aria-disabled': running ? 'true' : 'false',
                    className: 'text-left rounded-xl border-2 overflow-hidden transition focus:outline-none focus:ring-4 ' + t.ring + ' ' +
                      (sel ? 'border-orange-700 shadow-lg' : 'border-slate-200 hover:border-orange-400') +
                      (running ? ' opacity-50 cursor-not-allowed' : ' weldlab-card-lift')
                  },
                    h('div', { className: 'bg-gradient-to-br ' + t.color + ' p-3 text-white' },
                      h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'text-2xl' }, t.icon),
                        h('div', { className: 'text-base font-black' }, t.name)
                      )
                    ),
                    h('div', { className: 'p-3 bg-white' },
                      h('div', { className: 'text-xs text-slate-700 mb-2' }, t.desc),
                      h('div', { className: 'text-[10px] font-mono text-slate-700 space-y-0.5' },
                        h('div', null, 'Travel: ' + t.travel + ' in/min'),
                        h('div', null, 'V tolerance: ±' + t.tolV + ' V'),
                        h('div', null, 'A tolerance: ±' + t.tolA + ' A')
                      ),
                      h('div', { className: 'mt-2 text-xs font-bold ' + t.accent },
                        '🏆 Best: ' + (bestScores[tk] || 0) + '%')
                    )
                  );
                })
              )
            ),
            // Timer bar
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Run Timer'),
                h('div', {
                  className: 'text-2xl font-black font-mono ' + (running ? T.accent : 'text-slate-800'),
                  'aria-live': 'polite'
                }, (T.duration - Math.floor(elapsed)) + 's')
              ),
              h('div', { className: 'h-4 bg-slate-200 rounded-full overflow-hidden', 'aria-hidden': true },
                h('div', {
                  className: 'h-full transition-all ' + timerColor + (running ? ' weldlab-stripe-anim' : ''),
                  style: { width: (pctElapsed * 100) + '%' }
                })
              )
            ),
            // Live controls — V and A sliders
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
              h(LabeledSlider, {
                label: 'Voltage (target ' + SPEED_OPTIMAL.V + ' V)',
                valueText: V.toFixed(1) + ' V (Δ ' + dV.toFixed(1) + ')',
                min: 14, max: 32, step: 0.5, value: V, onChange: function(v) { if (running || !done) setV(v); },
                hint: 'In-spec range: ' + (SPEED_OPTIMAL.V - T.tolV).toFixed(1) + '–' + (SPEED_OPTIMAL.V + T.tolV).toFixed(1) + ' V',
                valueColor: dV <= T.tolV ? 'text-emerald-700' : 'text-rose-700'
              }),
              h(LabeledSlider, {
                label: 'Amperage (target ' + SPEED_OPTIMAL.A + ' A)',
                valueText: Math.round(A) + ' A (Δ ' + Math.round(dA) + ')',
                min: 80, max: 280, step: 5, value: A, onChange: function(v) { if (running || !done) setA(v); },
                hint: 'In-spec range: ' + (SPEED_OPTIMAL.A - T.tolA) + '–' + (SPEED_OPTIMAL.A + T.tolA) + ' A',
                valueColor: dA <= T.tolA ? 'text-emerald-700' : 'text-rose-700'
              })
            ),
            // Live in-spec indicator
            h('div', {
              'aria-live': 'polite',
              className: 'p-4 rounded-2xl border-2 transition-colors ' +
                (running
                  ? (liveInSpec ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : 'bg-rose-50 border-rose-400 text-rose-900')
                  : 'bg-slate-50 border-slate-300 text-slate-800')
            },
              h('div', { className: 'flex items-center gap-3' },
                h('span', { className: 'text-3xl' }, running ? (liveInSpec ? '✅' : '⚠️') : '⏸️'),
                h('div', null,
                  h('div', { className: 'font-black text-lg' },
                    running ? (liveInSpec ? 'IN SPEC' : 'OUT OF SPEC — adjust!') : (done ? 'Run complete' : 'Ready to start')),
                  running && h('div', { className: 'text-xs' },
                    'Live in-spec rate: ' + liveScore + '% over ' + totalSamples + ' samples')
                )
              )
            ),
            // Action buttons
            h('div', { className: 'flex flex-wrap gap-3' },
              !running ? h('button', {
                onClick: startRun,
                className: 'flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-lg shadow-lg hover:shadow-xl transition focus:outline-none focus:ring-4 ring-orange-500/40 weldlab-card-lift'
              }, '🔥 Start ' + T.name + ' run (' + T.duration + 's)') : h('button', {
                onClick: stopRun,
                className: 'flex-1 px-5 py-3 rounded-xl bg-slate-700 text-white font-black text-lg shadow-lg hover:bg-slate-800 transition focus:outline-none focus:ring-4 ring-slate-500/40'
              }, '⏹ Stop run')
            ),
            // Result
            done && h('div', {
              'aria-live': 'polite',
              className: 'bg-white rounded-2xl shadow border-2 border-orange-400 p-5 space-y-4'
            },
              h('div', { className: 'flex items-center gap-4' },
                h('span', { className: 'text-5xl' }, finalScore >= 90 ? '🏆' : finalScore >= 70 ? '✅' : finalScore >= 40 ? '🔁' : '🥉'),
                h('div', null,
                  h('h3', { className: 'text-2xl font-black text-slate-800' }, 'Final Score: ' + finalScore + '%'),
                  h('div', { className: 'text-sm text-slate-700' },
                    finalScore >= (bestScores[tier] || 0) - 1 ? '🎉 New personal best for ' + T.name + ' tier!' : 'Personal best for ' + T.name + ': ' + (bestScores[tier] || 0) + '%')
                )
              ),
              h('div', { className: 'grid grid-cols-3 gap-3' },
                h(StatCard, { label: 'Samples', value: totalSamples, color: 'text-slate-700' }),
                h(StatCard, { label: 'In-Spec', value: inSpecCount, unit: 'of ' + totalSamples, color: 'text-emerald-700' }),
                h(StatCard, { label: 'Tier', value: T.name, color: T.accent })
              ),
              h('p', { className: 'text-sm text-slate-700 italic' },
                finalScore >= 85 ? 'Outstanding control. You held the parameters right where they belong almost the entire run.' :
                finalScore >= 65 ? 'Solid run. A few overshoots but mostly inside the tolerance band.' :
                finalScore >= 40 ? 'Inconsistent — the parameters drifted out of spec for too much of the run. Try smaller adjustments.' :
                'Lots of room to grow. Watch the live in-spec indicator and make tiny corrections, not big ones.')
            ),
            h(TeacherNotes, {
              standards: ['HS-PS3-3 (Energy)', 'CTE Manufacturing 5.1', 'AWS SENSE QC11'],
              questions: [
                'The Bath Iron Works tier has a ±1.2 V tolerance. Why would a real shipyard demand that level of precision on hull welds versus a one-off bracket weld in a fab shop?',
                'A welder consistently gets 95% Apprentice tier but 30% Pro tier. What does that tell you about their skill profile, and what would you suggest they practice?',
                'In real welding, voltage and amperage are usually pre-set on the machine and the welder doesn\'t adjust them mid-bead. Why does this game ask you to adjust them live? What real-world skill is it really practicing?'
              ],
              misconceptions: [
                '"Speed is the most important factor in welding" — speed matters but precision and consistency matter more. A fast welder making out-of-spec welds is rejected work.',
                '"Tighter tolerance = better welder" — tighter tolerance applies to higher-stakes joints. A bracket weld doesn\'t need ship-hull tolerance; demanding it would just be slower without payoff.',
                '"Practice makes perfect" — practice with feedback makes perfect. This drill gives you immediate feedback on every parameter; that\'s why it works as practice.'
              ],
              extension: 'Run all 3 tiers back-to-back without stopping for breaks. Observe how your scores change over the 3-run sequence. Was tier-3 score better or worse than tier-1? What does your answer tell you about how welder fatigue works in real shifts?'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // STUB MODULES (none remaining; ComingSoon retained for safety)
      // ─────────────────────────────────────────────────────
      function ComingSoon(props) {
        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: props.icon, title: props.title }),
          h('div', { className: 'p-6 max-w-3xl mx-auto' },
            h('div', { className: 'bg-white rounded-2xl shadow border-2 border-slate-300 p-8 text-center' },
              h('div', { className: 'text-6xl mb-4' }, '🛠️'),
              h('h2', { className: 'text-2xl font-black text-slate-800 mb-2' }, 'Coming Soon'),
              h('p', { className: 'text-slate-700 leading-relaxed' }, props.desc),
              h('p', { className: 'text-xs text-slate-700 mt-4 italic' }, 'Ships in a future WeldLab phase.')
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // DEFECT CATALOG VIEW
      // Cross-sample log of welding defect types correctly identified at
      // least once in Defect Hunt Lab. Mirrors the BirdLab life list /
      // PetsLab decoder mastery / OpticsLab AP-quiz pattern: per-sample
      // identification is transient; catalog mastery is permanent.
      // ─────────────────────────────────────────────────────
      function DefectCatalogView() {
        var catalog = (d.defectCatalog && typeof d.defectCatalog === 'object') ? d.defectCatalog : {};
        var allDefectKeys = Object.keys(DEFECT_INFO);
        var foundKeys = allDefectKeys.filter(function (k) { return !!catalog[k]; });
        var unfoundKeys = allDefectKeys.filter(function (k) { return !catalog[k]; });
        var fmtDate = function (iso) {
          if (!iso) return '';
          try {
            var dd = new Date(iso);
            return dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          } catch (e) { return iso.substring(0, 10); }
        };
        var pct = allDefectKeys.length > 0 ? Math.round((foundKeys.length / allDefectKeys.length) * 100) : 0;

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '📔', title: "Welder's Defect Catalog" }),
          h('div', { className: 'p-4 max-w-4xl mx-auto space-y-4' },
            // Hero
            h('div', {
              className: 'rounded-2xl border-2 border-orange-400 shadow-lg overflow-hidden',
              style: { background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 50%, #fde68a 100%)' }
            },
              h('div', { className: 'p-5 flex items-center gap-5 flex-wrap' },
                h('div', { className: 'flex-shrink-0 text-center' },
                  h('div', { className: 'text-5xl font-black text-orange-800', 'aria-label': foundKeys.length + ' of ' + allDefectKeys.length + ' defect types identified' },
                    foundKeys.length + ' / ' + allDefectKeys.length
                  ),
                  h('div', { className: 'text-[10px] uppercase tracking-widest text-slate-700 font-bold mt-1' }, 'defect types ID\'d')
                ),
                h('div', { className: 'flex-1 min-w-0 space-y-1' },
                  h('div', { className: 'flex items-center gap-2' },
                    h('span', { 'aria-hidden': 'true', className: 'text-2xl' }, '🔥'),
                    h('h2', { className: 'text-xl font-black text-slate-800' }, 'Your Defect Catalog')
                  ),
                  h('p', { className: 'text-sm text-slate-700 leading-snug' },
                    "Every welding discontinuity you correctly identify in Defect Hunt Lab lands here. CWI inspectors keep mental catalogs like this their whole careers — yours starts now."
                  ),
                  h('div', { className: 'h-2 mt-2 bg-white/60 rounded-full overflow-hidden', 'aria-hidden': 'true' },
                    h('div', { className: 'h-full bg-orange-600', style: { width: pct + '%' } })
                  )
                ),
                foundKeys.length === 0 && h('div', { className: 'flex-shrink-0' },
                  h('button', {
                    onClick: function () { goto('defectHunt'); },
                    className: 'px-4 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 text-white font-black text-sm shadow focus:outline-none focus:ring-4 ring-orange-500/40'
                  }, 'Start inspecting →')
                )
              )
            ),
            // Found list
            foundKeys.length > 0 && h('section', { 'aria-labelledby': 'wl-found-h' },
              h('h2', { id: 'wl-found-h', className: 'text-base font-black text-slate-800 mb-2 flex items-center gap-2' },
                h('span', { 'aria-hidden': 'true' }, '✓'),
                'Identified (' + foundKeys.length + ')'
              ),
              h('ul', { className: 'space-y-2 list-none p-0' },
                foundKeys.map(function (k) {
                  var info = DEFECT_INFO[k];
                  var entry = catalog[k];
                  var sampleChips = (entry && entry.sampleIds) || [];
                  return h('li', { key: k,
                    className: 'rounded-xl border-2 border-emerald-300 bg-white p-3 shadow-sm flex items-start gap-3'
                  },
                    h('div', {
                      'aria-hidden': 'true',
                      className: 'flex-shrink-0 text-2xl flex items-center justify-center',
                      style: {
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'rgba(16,185,129,0.12)',
                        border: '2px solid #10b981'
                      }
                    }, info.icon),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                        h('h3', { className: 'text-sm font-black text-slate-800' }, info.name),
                        h('span', { className: 'text-[10px] font-mono text-emerald-700' }, '✓ ' + fmtDate(entry.firstFoundAt)),
                        entry.foundCount > 1 && h('span', { className: 'text-[10px] text-slate-600 font-medium' }, '· ' + entry.foundCount + ' sightings')
                      ),
                      h('div', { className: 'text-[11px] text-slate-700 mb-1 leading-snug' }, info.cause),
                      sampleChips.length > 0 && h('div', { className: 'flex flex-wrap gap-1 mt-1' },
                        sampleChips.map(function (sid) {
                          return h('span', {
                            key: sid,
                            className: 'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-300'
                          }, '🔥 ' + sid);
                        })
                      )
                    )
                  );
                })
              )
            ),
            // Not yet found
            unfoundKeys.length > 0 && h('section', { 'aria-labelledby': 'wl-unfound-h' },
              h('h2', { id: 'wl-unfound-h', className: 'text-base font-black text-slate-700 mb-2 flex items-center gap-2 mt-4' },
                h('span', { 'aria-hidden': 'true' }, '🔎'),
                'Still to identify (' + unfoundKeys.length + ')'
              ),
              h('ul', { className: 'space-y-2 list-none p-0' },
                unfoundKeys.map(function (k) {
                  var info = DEFECT_INFO[k];
                  return h('li', { key: k,
                    className: 'rounded-xl border-2 border-slate-200 bg-slate-50 opacity-75 p-3 flex items-start gap-3'
                  },
                    h('div', {
                      'aria-hidden': 'true',
                      className: 'flex-shrink-0 text-2xl flex items-center justify-center',
                      style: {
                        width: 56, height: 56, borderRadius: '50%',
                        background: '#e2e8f0',
                        border: '2px solid #cbd5e1',
                        filter: 'grayscale(100%)'
                      }
                    }, info.icon),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                        h('h3', { className: 'text-sm font-black text-slate-600' }, info.name),
                        h('span', { className: 'text-[10px] font-mono uppercase tracking-wider text-slate-500' }, 'Not yet identified')
                      ),
                      h('div', { className: 'text-[11px] italic text-slate-600 leading-snug' }, 'Hint: ' + info.cause.split('.')[0] + '.')
                    )
                  );
                })
              )
            ),
            h('div', { className: 'flex flex-wrap gap-2 pt-2' },
              h('button', {
                onClick: function () { goto('defectHunt'); },
                className: 'px-4 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 text-white font-bold text-sm shadow focus:outline-none focus:ring-4 ring-orange-500/40'
              }, '🔍 Open Defect Hunt'),
              h('button', {
                onClick: function () { goto('processCompare'); },
                className: 'px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm shadow focus:outline-none focus:ring-4 ring-slate-500/40'
              }, '⚖️ Process comparison')
            )
          )
        );
      }

      // First-find celebration overlay (renders on top of any view).
      function defectCelebOverlay() {
        if (!defectCeleb) return null;
        var totalTypes = Object.keys(DEFECT_INFO).length;
        return h('div', {
          role: 'status',
          'aria-live': 'assertive',
          className: 'fixed top-20 left-1/2 z-[9999] pointer-events-none',
          style: { animation: 'weldlab-defect-rise 3.5s ease-out forwards' }
        },
          h('div', { className: 'bg-gradient-to-r from-amber-400 via-orange-600 to-rose-600 text-white px-6 py-4 rounded-2xl shadow-2xl border-4 border-white flex items-center gap-3' },
            h('span', { className: 'text-3xl', 'aria-hidden': 'true' }, defectCeleb.icon),
            h('div', null,
              h('div', { className: 'text-[10px] font-black uppercase tracking-widest opacity-95' }, 'New defect identified'),
              h('div', { className: 'text-lg font-black leading-tight' }, defectCeleb.name),
              h('div', { className: 'text-xs opacity-95 italic' }, 'Catalog: ' + defectCeleb.total + ' / ' + totalTypes + ' defect types')
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // VIEW DISPATCH — wraps view in a fragment with the celebration
      // ─────────────────────────────────────────────────────
      // MODULE 11: WELDING METALLURGY DEEP-DIVE
      // ─────────────────────────────────────────────────────
      // The science layer that distinguishes a welder from a code-following
      // operator. Covers phase diagrams, carbon equivalent (CE), HAZ
      // microstructure, sensitization (stainless), hot vs cold cracking,
      // post-weld heat treatment (PWHT). Drawn from AWS Welding Handbook +
      // Lincoln Electric metallurgy primer + Kou's "Welding Metallurgy"
      // textbook (the standard).
      function MetallurgyDeepDive() {
        var sectionState = usePersistedState('met_sect', 'overview');
        var section = sectionState[0], setSection = sectionState[1];
        var sections = [
          { id: 'overview',     label: '📋 Overview',                 desc: 'What metallurgy means for welding' },
          { id: 'phase',        label: '🌡 Phase diagrams',           desc: 'Iron-carbon + austenite + martensite' },
          { id: 'haz',          label: '🔥 HAZ microstructure',       desc: 'What heat does to the base metal' },
          { id: 'ce',           label: '🧮 Carbon Equivalent',        desc: 'CE formula for crack-susceptibility' },
          { id: 'stainless',    label: '🥄 Stainless sensitization',  desc: 'Chromium-carbide precipitation' },
          { id: 'aluminum',     label: '🌫 Aluminum oxidation',       desc: 'Why aluminum is harder than steel' },
          { id: 'cracking',     label: '💥 Hot + cold cracking',      desc: 'Two distinct failure modes' },
          { id: 'pwht',         label: '🌡 PWHT',                     desc: 'Post-weld heat treatment + when needed' }
        ];

        var content;
        if (section === 'overview') {
          content = h('div', { className: 'space-y-3' },
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Welding metallurgy is the science of what happens to metal when you heat it past its melting point, mix in filler, and let it cool. Most welding failures happen here — not in arc striking, not in technique — but in metallurgical changes the welder didn\'t understand. A skilled welder + bad metallurgy choices = cracked weld. A novice + correct procedure = sound weld.'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'This module covers the science. The Weld Bead Lab covers the technique. Codes + Standards covers the legal framework. All three are layers in becoming a qualified welder.'),
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2' }, 'Three regions every weld has'),
              h('ul', { className: 'space-y-1 text-sm text-slate-800' },
                h('li', null, h('strong', { className: 'text-emerald-900' }, '1. Fusion zone (FZ): '), 'The metal that actually melted + mixed with filler + resolidified. Properties are partly base metal, partly filler metal (dilution).'),
                h('li', null, h('strong', { className: 'text-emerald-900' }, '2. Heat-Affected Zone (HAZ): '), 'Base metal that didn\'t melt but got hot enough to change microstructure. The most failure-prone region of any weld.'),
                h('li', null, h('strong', { className: 'text-emerald-900' }, '3. Unaffected base metal (BM): '), 'Cooler region, original properties retained. Should be the strongest region of a well-designed welded part.')
              )
            )
          );
        } else if (section === 'phase') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🌡 The iron-carbon phase diagram (simplified)'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Steel = iron + carbon (usually 0.05-2% carbon). The phase that\'s stable at any given temperature depends on carbon content + cooling rate. Welding takes the metal through ALL of these phases as it heats up + cools down — that\'s why microstructure changes.'),
            h('div', { className: 'bg-slate-50 border-2 border-slate-300 rounded-xl p-3 space-y-2' },
              h('div', null, h('strong', { className: 'text-amber-700' }, 'Austenite (γ-Fe): '), 'Above ~1340°F. Face-centered cubic crystal. Dissolves carbon readily. Non-magnetic. Most ductile phase.'),
              h('div', null, h('strong', { className: 'text-amber-700' }, 'Ferrite (α-Fe): '), 'Below ~1340°F. Body-centered cubic. Low carbon solubility. Magnetic. Soft + ductile.'),
              h('div', null, h('strong', { className: 'text-amber-700' }, 'Pearlite: '), 'Mixture of ferrite + cementite (Fe3C) in alternating lamellar layers. Forms by slow cooling from austenite.'),
              h('div', null, h('strong', { className: 'text-amber-700' }, 'Martensite: '), 'Super-saturated body-centered tetragonal phase. Forms when austenite cools too fast for carbon to diffuse out. ', h('strong', null, 'Extremely hard + brittle. The villain of welding.'), ' Most weld cracking is martensite-related.'),
              h('div', null, h('strong', { className: 'text-amber-700' }, 'Bainite: '), 'Intermediate cooling rate. Acicular structure. Stronger than pearlite, tougher than martensite.')
            ),
            h('div', { className: 'bg-rose-50 border-2 border-rose-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-rose-900 mb-1' }, '⚠ Why this matters for welding'),
              h('p', { className: 'text-sm text-slate-800' }, 'When you weld carbon steel, the HAZ heats above 1340°F (full austenite). When you stop welding, that region cools. If it cools FAST (thin section, cold base metal, no preheat) — martensite forms in the HAZ → brittle → crack. Higher carbon content = more martensite = more crack risk. ',
                h('strong', { className: 'text-rose-900' }, 'This is why preheat matters'),
                ': slowing the cooling rate prevents martensite formation.')
            )
          );
        } else if (section === 'haz') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🔥 HAZ microstructure — what the heat actually does'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'The HAZ is a graded region. Closest to the fusion zone = hottest. Furthest = barely warmed. Each sub-zone has different microstructure:'),
            h('div', { className: 'space-y-2' },
              ['Coarse-grain HAZ — Closest to fusion. Heated to ~2200-2400°F. Austenite grains grow large. On cooling, large grains = brittle. Most fracture-prone region.',
               'Fine-grain HAZ — Just outside coarse zone. Heated ~1500-1900°F. Austenite forms but grains don\'t coarsen. Cools to fine pearlite/ferrite. Often the toughest region of the weld.',
               'Inter-critical HAZ — Heated ~1340-1500°F (between A1 and A3 lines). Partial transformation. Mixed microstructure.',
               'Sub-critical HAZ — Heated 1000-1340°F. No phase change, but tempering occurs. Hardness drops in quenched + tempered steels (this can be a problem).',
               'Unaffected BM — Below 1000°F. No metallurgical change.'].map(function(zone, i) {
                return h('div', { key: i, className: 'bg-orange-50 border-l-4 border-orange-400 p-3 rounded' },
                  h('p', { className: 'text-sm text-slate-800' }, zone)
                );
              })
            ),
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-emerald-900 mb-1' }, '💡 Practical takeaway'),
              h('p', { className: 'text-sm text-slate-800' }, 'The HAZ extends ~3-5x the weld bead width into the base metal. Pre-existing flaws (notches, sharp corners, weld toes) within the HAZ are stress concentrators that initiate cracks. Welding inspectors look for HAZ cracking via magnetic particle (MT) or dye penetrant (PT) testing.')
            )
          );
        } else if (section === 'ce') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🧮 Carbon Equivalent (CE) — predicts crack risk'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'CE is a weighted sum of alloying elements that estimates how susceptible a steel is to hydrogen-induced cracking + martensite formation. Different formulas for different steel families. The most common in welding is the IIW (International Institute of Welding) formula:'),
            h('div', { className: 'bg-slate-100 border-2 border-slate-400 rounded-xl p-4 text-center' },
              h('div', { className: 'font-mono text-base text-slate-900 leading-relaxed' },
                'CE = C + Mn/6 + (Cr + Mo + V)/5 + (Ni + Cu)/15'
              ),
              h('div', { className: 'text-xs text-slate-700 mt-2 italic' }, 'where each element is in weight percent')
            ),
            h('div', { className: 'space-y-2' },
              [{ ce: '< 0.40', risk: 'LOW', color: 'bg-emerald-100 border-emerald-400', text: 'Weldable without preheat in most conditions. Common mild steel (A36, A572).' },
               { ce: '0.40 - 0.55', risk: 'MODERATE', color: 'bg-amber-100 border-amber-400', text: 'Preheat may be needed depending on thickness + restraint. Use low-hydrogen electrodes (E7018).' },
               { ce: '0.55 - 0.70', risk: 'HIGH', color: 'bg-orange-100 border-orange-400', text: 'Preheat required + interpass temperature control. Low-hydrogen practice mandatory. PWHT often required.' },
               { ce: '> 0.70', risk: 'VERY HIGH', color: 'bg-rose-100 border-rose-400', text: 'Aggressive preheat (~400-600°F). Strict hydrogen control. PWHT mandatory. Often requires special procedures or alternative materials.' }].map(function(row, i) {
                return h('div', { key: i, className: 'border-2 rounded-xl p-3 ' + row.color },
                  h('div', { className: 'flex justify-between items-baseline mb-1' },
                    h('span', { className: 'font-bold text-slate-900' }, 'CE ' + row.ce),
                    h('span', { className: 'text-xs font-mono font-bold uppercase tracking-wider text-slate-900' }, row.risk)
                  ),
                  h('p', { className: 'text-sm text-slate-800' }, row.text)
                );
              })
            ),
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-blue-900 mb-1' }, '💡 Real-world example'),
              h('p', { className: 'text-sm text-slate-800' }, 'AISI 4140 (a common alloy steel for shafts + gears): C=0.40, Mn=0.85, Cr=0.95, Mo=0.20. CE = 0.40 + 0.142 + 0.230 = 0.77. VERY HIGH — Bath Iron Works welders working on 4140 components use 300°F preheat + low-hydrogen electrodes + post-weld stress relief. Skipping any of these = cracked weld.')
            )
          );
        } else if (section === 'stainless') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🥄 Stainless steel sensitization'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Stainless steel resists corrosion because chromium forms a self-healing oxide layer (Cr2O3) on the surface. But heat between ~800-1500°F causes chromium to combine with carbon to form chromium carbides (Cr23C6) that precipitate at grain boundaries. This locally depletes chromium → the depleted regions are no longer corrosion-resistant → "intergranular corrosion" attacks the part months/years later.'),
            h('div', { className: 'bg-rose-50 border-2 border-rose-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-rose-900 mb-1' }, '⚠ The 800-1500°F problem'),
              h('p', { className: 'text-sm text-slate-800 mb-2' }, 'Welding inherently puts the HAZ through this temperature range. The longer it stays there, the more sensitization.'),
              h('p', { className: 'text-sm text-slate-800' }, 'Three solutions: (1) Low-heat-input welding (TIG, fast travel, no preheat). (2) "L-grade" stainless (304L, 316L) — low carbon (<0.03%) = less carbide formation. (3) "Stabilized" grades (321, 347) — contain Ti or Nb that form carbides preferentially, sparing Cr.')
            ),
            h('div', { className: 'bg-slate-50 border-2 border-slate-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-slate-900 mb-1' }, '🌡 Sugar / oxidation on the back side'),
              h('p', { className: 'text-sm text-slate-800' }, 'Stainless TIG welding requires inert gas (argon) on BOTH sides of the joint. If the back side sees air at red heat, the surface oxidizes to a sugary black scale that\'s rust-prone. Sanitary welders use "purging" — flow argon through pipe interior during welding. Critical for food + pharma + nuclear pipe welding.')
            )
          );
        } else if (section === 'aluminum') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🌫 Aluminum oxide layer (why aluminum is hard)'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Aluminum forms an oxide skin (Al2O3) within MILLISECONDS of exposure to air. The oxide melts at ~3700°F (vs aluminum metal at ~1220°F). If you don\'t remove the oxide first, you\'re trying to melt aluminum through a refractory ceramic shell. Result: incomplete fusion + porosity + ugly bead.'),
            h('div', { className: 'space-y-2' },
              [{ method: 'Mechanical removal', desc: 'Stainless wire brush IMMEDIATELY before welding. Brush moves only one direction. Use brush DEDICATED to aluminum (mild steel brush = contamination). Brushed surface stays clean for ~30-60 sec, then re-oxidizes.' },
               { method: 'Chemical etching', desc: 'Aluminum-specific etching solution removes oxide. More thorough but adds prep time. Used for critical aerospace welds.' },
               { method: 'AC TIG arc cleaning', desc: 'Alternating current TIG includes a "cleaning" half-cycle where electrons flow FROM the workpiece, blasting oxide off via cathodic etching. Visible as bright cleaning zone around the arc. Pure DC TIG can\'t do this — must use AC.' }].map(function(m, i) {
                return h('div', { key: i, className: 'bg-cyan-50 border-l-4 border-cyan-400 p-3 rounded' },
                  h('div', { className: 'font-bold text-cyan-900 mb-1' }, m.method),
                  h('p', { className: 'text-sm text-slate-800' }, m.desc)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '🌡 Thermal conductivity penalty'),
              h('p', { className: 'text-sm text-slate-800' }, 'Aluminum conducts heat ~2.4× faster than steel. The heat you put in spreads out instead of staying at the joint. You need MORE amperage + thicker filler to compensate, AND you need to weld faster before the heat propagates everywhere + distorts the part. Aluminum welding is fundamentally harder than steel — pay reflects this (specialized aluminum welders earn 15-30% premium).')
            )
          );
        } else if (section === 'cracking') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '💥 Hot cracking vs cold cracking'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Welds crack two distinct ways at two distinct times. Confusing them = wrong fix = re-cracked weld.'),
            h('div', { className: 'bg-orange-50 border-2 border-orange-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-base font-bold text-orange-900' }, '🔥 Hot Cracking (Solidification Cracking)'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'When: '), 'During solidification, while metal is still partially molten. Cracks appear immediately after welding.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Where: '), 'Centerline of bead (longitudinal centerline cracks) or crater (at end of run when arc breaks).'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Cause: '), 'Low-melting-point eutectics (sulfur, phosphorus, lead contaminants; or excess sulfur in base metal) remain liquid while surrounding metal solidifies + contracts. Tensile stress pulls the still-liquid film apart.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Fix: '), 'Use cleaner base metal (low-sulfur). Use convex bead profile (not concave — concave allows top-surface tension). Reduce restraint. Cap crater (back up arc into crater before breaking).')
            ),
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-base font-bold text-blue-900' }, '❄ Cold Cracking (Hydrogen-Induced Cracking, HIC)'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'When: '), 'Hours to DAYS after welding. Often called "delayed cracking" because it appears overnight or even later.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Where: '), 'HAZ, parallel to fusion line. Hard to see initially; often discovered by inspection.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Cause: '), 'Three things together: (1) hydrogen in the weld pool (from moisture in flux, contaminated wire, base metal), (2) martensitic microstructure in HAZ, (3) tensile residual stress. All three = crack. Remove any one = no crack.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Fix: '), 'Low-hydrogen electrodes (E7018, stored hot). Preheat to slow cooling rate (prevent martensite). Stress relief PWHT. For high-restraint welds use "buttering" technique (build up filler before final pass).')
            )
          );
        } else if (section === 'pwht') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🌡 Post-Weld Heat Treatment (PWHT)'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'PWHT = heating the welded part to a target temperature, holding for a specified time, then slow cooling. Different PWHT types serve different purposes:'),
            h('div', { className: 'space-y-2' },
              [{ name: 'Stress relief', temp: '1100-1250°F', hold: '1 hr per inch of thickness', why: 'Reduces residual tensile stresses from welding. Required for pressure vessels (ASME), thick structural welds, fatigue-loaded parts.' },
               { name: 'Hydrogen bake-out', temp: '400-600°F', hold: '2-4 hr', why: 'Drives hydrogen out of weld + HAZ before it can cause cold cracking. Done immediately after welding, before part cools.' },
               { name: 'Normalize', temp: '1600-1700°F (above A3)', hold: '1 hr per inch, then air cool', why: 'Refines grain structure of HAZ. Restores impact toughness. Required for certain pressure vessel codes after thick-section welding.' },
               { name: 'Anneal', temp: '1500-1700°F', hold: 'long, slow furnace cool', why: 'Maximum softening + grain refinement. Used for parts that will be machined or formed after welding.' },
               { name: 'Solution treat (stainless)', temp: '1900-2100°F', hold: '30 min, then rapid quench', why: 'Dissolves chromium carbides + restores corrosion resistance after welding of non-stabilized austenitic stainless.' }].map(function(t, i) {
                return h('div', { key: i, className: 'bg-purple-50 border-2 border-purple-300 rounded-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1' },
                    h('span', { className: 'font-bold text-purple-900' }, t.name),
                    h('span', { className: 'font-mono text-xs text-purple-700' }, t.temp + ' · ' + t.hold)
                  ),
                  h('p', { className: 'text-sm text-slate-800' }, t.why)
                );
              })
            ),
            h('div', { className: 'bg-slate-50 border-2 border-slate-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-slate-900 mb-1' }, '💡 PWHT economics'),
              h('p', { className: 'text-sm text-slate-800' }, 'PWHT is EXPENSIVE — large parts need walk-in furnaces, slow heat-up + hold + slow cool cycles take days, energy cost is significant. Welding shops factor PWHT into bids ($1-5/lb extra for code work). Some material/joint combinations avoid PWHT specifically to skip this cost (e.g., choosing nickel-based filler that doesn\'t require stress relief).')
            )
          );
        }

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🧪', title: 'Welding Metallurgy' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'flex flex-wrap gap-2' },
              sections.map(function(s) {
                var sel = (section === s.id);
                return h('button', {
                  key: s.id,
                  onClick: function() { setSection(s.id); announce(s.label + ': ' + s.desc); },
                  className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition focus:outline-none focus:ring-2 ring-emerald-500/40 ' +
                    (sel ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-400'),
                  title: s.desc
                }, s.label);
              })
            ),
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' }, content),
            h(TeacherNotes, {
              standards: ['HS-PS1-3 (Properties of matter)', 'HS-PS3-3 (Energy)', 'HS-ETS1-2 (Engineering)', 'AWS WELD-METALLURGY'],
              questions: [
                'Why does a 1/2" steel plate need preheat but a 1/8" plate often doesn\'t? Explain in terms of cooling rate + martensite formation.',
                'A pipeline welder reports their welds are cracking 6 hours after they finish. Hot cracking or cold cracking? Why? What\'s the most likely cause?',
                'A pharmaceutical facility welder is connecting stainless 304L tubing for a sterile water line. Why is sugar oxidation a safety + cost concern? What\'s the fix?'
              ],
              misconceptions: [
                '"Hot cracking and cold cracking are basically the same" — completely different mechanisms requiring different solutions. Misdiagnosis = re-cracked weld.',
                '"PWHT is just heating to a specific temperature" — temperature AND hold time AND cooling rate ALL matter. Skip any = wrong microstructure = wrong properties.',
                '"Stainless can\'t rust" — sensitized stainless rusts at grain boundaries within months in corrosive service. The corrosion resistance is the whole point of using it; lose it and you\'ve wasted money + risked failure.'
              ],
              extension: 'Pull an SDS (Safety Data Sheet) for AWS E7018 electrode. Find the carbon content + the recommended storage conditions. Why does E7018 require hot storage (~250°F)? What happens if it gets damp? Connect this to cold cracking discussion.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 12: CODES AND STANDARDS
      // ─────────────────────────────────────────────────────
      // The legal + procedural framework for welding. AWS D1.1 (structural
      // steel), ASME Section IX (pressure vessels), API 1104 (pipelines).
      // Plus the WPS / PQR / WPQ documents every welder works under.
      function CodesAndStandards() {
        var codeState = usePersistedState('codes_pick', 'd1_1');
        var codePick = codeState[0], setCodePick = codeState[1];

        var codes = {
          d1_1: {
            full: 'AWS D1.1 — Structural Welding Code (Steel)',
            scope: 'Welding of structural steel (buildings, bridges, towers, ships, offshore platforms) of carbon + low-alloy steels at least 1/8" thick.',
            published_by: 'American Welding Society (AWS)',
            why: 'The most widely-used welding code in the US. Building inspectors, structural engineers, fabrication shops all reference it. If you\'re welding anything that holds up a building or carries a load, this is the standard.',
            sections: [
              { num: '1', title: 'General Provisions', body: 'Scope, definitions, contract documents.' },
              { num: '2', title: 'Design of Welded Connections', body: 'Joint geometry, allowable stresses, fatigue.' },
              { num: '3', title: 'Pre-Qualified WPS', body: 'Pre-qualified procedures that don\'t require shop qualification.' },
              { num: '4', title: 'Qualification', body: 'How to qualify a WPS + a welder. THIS is the section every welder lives by.' },
              { num: '5', title: 'Fabrication', body: 'Workmanship: cleaning, fit-up, preheat, interpass, tacks, cleaning between passes.' },
              { num: '6', title: 'Inspection', body: 'Who, when, how. VT, MT, PT, UT, RT acceptance criteria.' },
              { num: '7', title: 'Stud Welding', body: 'Specialty section on shear stud + nelson stud welding.' },
              { num: '8', title: 'Strengthening + Repair', body: 'How to weld on existing structures.' },
              { num: '9', title: 'Tubular Structures', body: 'Hollow structural sections (HSS).' },
              { num: '10', title: 'Statically Loaded Structures', body: 'Buildings, dead-load structures.' },
              { num: '11', title: 'Cyclically Loaded Structures', body: 'Bridges, cranes, fatigue-driven.' }
            ],
            who_uses: 'Bath Iron Works, structural steel fabricators, bridge builders, building contractors, welding inspectors, anyone bidding government structural projects.'
          },
          asme9: {
            full: 'ASME Section IX — Welding, Brazing, and Fusing Qualifications',
            scope: 'Pressure vessels, boilers, pressure piping, and related components.',
            published_by: 'American Society of Mechanical Engineers (ASME)',
            why: 'The standard for any vessel that holds gas or liquid under pressure. Refineries, chemical plants, power plants, food + pharma processing. Failure of pressure equipment is catastrophic (explosion, scalding, toxic release) — ASME welding qualifications are uncompromising.',
            sections: [
              { num: 'QW-100', title: 'General Requirements', body: 'Scope + definitions.' },
              { num: 'QW-200', title: 'Welding Procedure Qualifications', body: 'WPS + PQR requirements. ESSENTIAL variables that require requalification if changed (base metal type, filler metal, electrode classification, joint design, position, electrical characteristics, technique).' },
              { num: 'QW-300', title: 'Welding Performance Qualifications', body: 'How welders qualify. Performance variables (process, base metal, position, thickness range, backing).' },
              { num: 'QW-400', title: 'Variables', body: 'Lists ALL variables + whether each is essential, supplementary essential, or nonessential.' },
              { num: 'QW-500', title: 'Specific Process Requirements', body: 'Process-specific (SMAW, GMAW, GTAW, etc.) rules.' }
            ],
            who_uses: 'Pressure vessel shops, refineries, nuclear plants, chemical plants, pharma. ASME-stamped vessels (the "U" or "S" stamp) require Authorized Inspector sign-off on every weld.'
          },
          api1104: {
            full: 'API 1104 — Welding of Pipelines and Related Facilities',
            scope: 'Cross-country pipelines (oil + gas + petrochemical transmission). Compressor stations, pump stations, related facilities.',
            published_by: 'American Petroleum Institute (API)',
            why: 'Pipelines run thousands of miles. A failed weld can rupture in remote area + cause environmental disaster + fatalities. API 1104 is unusually strict on radiographic testing (RT) — most pipeline production welds are 100% X-rayed.',
            sections: [
              { num: '1-4', title: 'General + Definitions', body: 'Scope, references, terms.' },
              { num: '5', title: 'Qualification of Welding Procedures', body: 'PQR + WPS for pipeline welds.' },
              { num: '6', title: 'Qualification of Welders', body: 'Performance test requirements. Bend tests, nick-break tests.' },
              { num: '7', title: 'Design + Preparation', body: 'Joint geometry for cross-country pipeline.' },
              { num: '8', title: 'Inspection + Testing', body: 'Visual + radiographic + acceptance criteria. Most stringent X-ray standards in the welding industry.' },
              { num: '9', title: 'Acceptance Standards', body: 'What constitutes an acceptable weld defect vs reject.' },
              { num: '10', title: 'Repair + Removal', body: 'How to handle defects without compromising line integrity.' },
              { num: '11', title: 'Procedures for NDT', body: 'Non-destructive testing methodologies.' }
            ],
            who_uses: 'Pipeline construction companies (Hunt, Michels, Henkels & McCoy), pipeline operators (TransCanada, Enbridge, Williams), API-certified pipeline welders.'
          }
        };

        var current = codes[codePick];

        var wpsExplainer = h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3' },
          h('div', { className: 'text-base font-bold text-amber-900' }, '📋 Welding Procedure Specification (WPS) — the "recipe"'),
          h('p', { className: 'text-sm text-slate-800' }, 'A WPS is a written procedure that specifies HOW a particular weld must be made. Includes: process, base metal range, filler metal, joint design, preheat, interpass temperature, electrical settings (V, A, polarity), travel speed, position, gas (if applicable), post-weld heat treatment. Every welder on a code job follows a WPS.'),
          h('div', { className: 'text-base font-bold text-amber-900' }, '📜 Procedure Qualification Record (PQR) — the "proof"'),
          h('p', { className: 'text-sm text-slate-800' }, 'A PQR documents the actual test welds + mechanical test results that prove the WPS produces sound welds. Includes: actual values used (not ranges), tensile test results, bend test results, charpy impact results, hardness, sometimes macroetch. The PQR validates the WPS — without a PQR, the WPS is just a piece of paper.'),
          h('div', { className: 'text-base font-bold text-amber-900' }, '🎓 Welder Performance Qualification (WPQ) — the "license"'),
          h('p', { className: 'text-sm text-slate-800' }, 'A WPQ documents that a specific welder has demonstrated the ability to produce sound welds per a specific WPS, in specific positions + thicknesses. The welder\'s "card." When you hear "I\'m 6G certified," that\'s a WPQ. Expires (must re-test every 6 months unless continuous experience documented).'),
          h('div', { className: 'mt-2 p-3 bg-amber-100 rounded-lg text-sm text-slate-800' },
            h('strong', { className: 'text-amber-900' }, 'Workflow: '), 'Engineer writes WPS → shop welds test coupons per WPS → coupons tested + results recorded → if all pass, PQR issued + WPS qualified. Welder welds qualification coupons per WPS → coupons tested → if pass, WPQ issued for that welder + that WPS.')
        );

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '📜', title: 'Codes + Standards' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'flex flex-wrap gap-2' },
              [{ id: 'd1_1', label: 'AWS D1.1', color: 'purple' },
               { id: 'asme9', label: 'ASME Section IX', color: 'purple' },
               { id: 'api1104', label: 'API 1104', color: 'purple' }].map(function(c) {
                var sel = (codePick === c.id);
                return h('button', {
                  key: c.id,
                  onClick: function() { setCodePick(c.id); announce('Code: ' + c.label); },
                  className: 'px-4 py-2 rounded-lg border-2 text-sm font-bold transition focus:outline-none focus:ring-2 ring-purple-500/40 ' +
                    (sel ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-slate-800 border-slate-300 hover:border-purple-400')
                }, c.label);
              })
            ),
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
              h('div', null,
                h('h3', { className: 'text-lg font-black text-purple-900' }, current.full),
                h('div', { className: 'text-xs text-slate-700 mt-1' }, 'Published by: ' + current.published_by)
              ),
              h('div', null,
                h('div', { className: 'text-xs font-bold uppercase text-slate-700 mb-1' }, 'Scope'),
                h('p', { className: 'text-sm text-slate-800' }, current.scope)
              ),
              h('div', null,
                h('div', { className: 'text-xs font-bold uppercase text-slate-700 mb-1' }, 'Why it matters'),
                h('p', { className: 'text-sm text-slate-800' }, current.why)
              ),
              h('div', null,
                h('div', { className: 'text-xs font-bold uppercase text-slate-700 mb-2' }, 'Section structure'),
                h('div', { className: 'space-y-1.5' },
                  current.sections.map(function(s, i) {
                    return h('div', { key: i, className: 'bg-purple-50 border-l-4 border-purple-400 p-2 rounded text-sm' },
                      h('span', { className: 'font-mono font-bold text-purple-900 mr-2' }, 'Sec ' + s.num),
                      h('span', { className: 'font-bold text-slate-800 mr-2' }, s.title + ' —'),
                      h('span', { className: 'text-slate-700' }, s.body)
                    );
                  })
                )
              ),
              h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-3' },
                h('div', { className: 'text-xs font-bold uppercase text-blue-900 mb-1' }, 'Who uses it'),
                h('p', { className: 'text-sm text-slate-800' }, current.who_uses)
              )
            ),
            wpsExplainer,
            h(TeacherNotes, {
              standards: ['NGSS HS-ETS1-3 (Engineering)', 'AWS SENSE Module 1', 'CTE Engineering 5.B'],
              questions: [
                'A welder welds outside the parameters specified in a WPS (e.g., uses different amperage). The weld passes visual inspection. Is the weld acceptable per code? Why or why not?',
                'Why does API 1104 require 100% radiographic testing on pipeline welds while AWS D1.1 typically allows visual inspection?',
                'A pressure vessel shop hires a welder with a 6G ASME WPQ. Can the welder also weld AWS D1.1 structural work without re-qualifying?'
              ],
              misconceptions: [
                '"A good welder doesn\'t need a code — they can tell a sound weld" — codes exist because subjective visual judgment isn\'t enough for high-stakes welds. The code provides objective acceptance criteria.',
                '"Once qualified, you\'re always qualified" — WPQs expire. Continuous-process documentation is required to maintain. Many welders fail to maintain + must re-qualify.',
                '"The customer can require anything they want above the code" — true. Code is the FLOOR, not ceiling. Customers can add inspection (e.g., 100% UT in addition to required RT) but cannot relax code requirements.'
              ],
              extension: 'Search "AWS D1.1 WPS sample" online. Look at a real WPS for a fillet weld on A36 steel. Identify: process, base metal range, filler classification, electrical settings, position. Now compare with one for groove weld on chrome-moly steel — what changes + why?'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 13: WELDER QUALIFICATION TEST PREP
      // ─────────────────────────────────────────────────────
      function WelderQualPrep() {
        var qpState = usePersistedState('qp_view', 'overview');
        var qpView = qpState[0], setQpView = qpState[1];
        var quizState = usePersistedState('qp_quizidx', 0);
        var quizIdx = quizState[0], setQuizIdx = quizState[1];
        var ansState = usePersistedState('qp_ans', {});
        var ans = ansState[0], setAns = ansState[1];

        var examQuestions = [
          { q: 'What does the "6G" position designation mean?', opts: ['Pipe at 45° angle with axis fixed', 'Plate vertical with axis fixed', 'Pipe horizontal with axis fixed', 'Plate overhead with axis fixed'], correct: 0, explain: '6G is pipe at 45° from horizontal, fixed (can\'t rotate). The most demanding position because the welder must adjust technique continuously as the bead climbs around the pipe.' },
          { q: 'A welder is qualified in 6G with carbon steel. Can they weld a 3G pipe joint on the same material without re-testing?', opts: ['No — must re-test for 3G', 'Yes — 6G qualifies for all positions', 'Yes — but only on plate, not pipe', 'Yes — but only for fillet welds'], correct: 1, explain: '6G is the most challenging pipe position. Per AWS D1.1 + ASME Section IX, 6G qualification qualifies for all other positions (1G, 2G, 3G, 4G, 5G).' },
          { q: 'Why is interpass temperature controlled during multi-pass welding?', opts: ['To save energy', 'To prevent the welder from getting tired', 'To control HAZ microstructure + prevent cracking', 'To make the bead look better'], correct: 2, explain: 'Interpass temperature (max temp between passes) controls cooling rate which controls microstructure. Too hot interpass = excessive grain growth + soft HAZ. Too cold = martensite formation + cracking.' },
          { q: 'In SMAW (stick) welding, what does the "18" in E7018 indicate?', opts: ['Electrode diameter', 'Tensile strength', 'Position + coating type', 'Year of manufacture'], correct: 2, explain: 'AWS A5.1 classification: E70-18. E = electrode. 70 = 70 ksi tensile strength. 1 = all positions. 8 = low-hydrogen iron powder coating with DC + or AC. The 18 is position + coating.' },
          { q: 'What is the purpose of preheat?', opts: ['Make the welder more comfortable', 'Reduce cooling rate to prevent HAZ cracking', 'Burn off contamination', 'Speed up welding time'], correct: 1, explain: 'Preheat raises base metal temperature so the weld + HAZ cool more slowly. Slower cooling = less martensite formation = less crack risk. Required for high-CE steels + thick sections.' },
          { q: 'What is the typical CO2 percentage in C25 shielding gas?', opts: ['10%', '25%', '50%', '100%'], correct: 1, explain: 'C25 = 75% argon + 25% CO2. Most common shielding gas for MIG on mild steel. Higher CO2 = better penetration but more spatter. Pure argon = minimum spatter but poor penetration on steel.' },
          { q: 'A welder hears a frying-bacon sound during MIG welding. What does this indicate?', opts: ['Wire feed too fast', 'Wire feed too slow', 'Arc length is correct', 'Gas flow too low'], correct: 2, explain: 'The "frying bacon" sound is the audible signature of a properly-set short-circuit MIG arc. Sizzling or popping = arc length too long. Erratic frying with pops = wire speed mismatch.' },
          { q: 'What is the primary cause of porosity in MIG welds?', opts: ['Wire too thick', 'Inadequate shielding gas coverage', 'Travel speed too slow', 'Arc length too short'], correct: 1, explain: 'Porosity = gas bubbles trapped in the bead. Most common cause is inadequate shielding gas coverage: gas flow too low, drafty environment, contaminated nozzle, or contaminated base metal allowing atmospheric N + O to react with molten metal.' },
          { q: 'What position is "2F"?', opts: ['Flat fillet', 'Horizontal fillet', 'Vertical fillet', 'Overhead fillet'], correct: 1, explain: '2 = horizontal. F = fillet. So 2F is a horizontal fillet weld. Position naming: 1=flat, 2=horizontal, 3=vertical, 4=overhead. G=groove, F=fillet.' },
          { q: 'What is the purpose of a "weave" technique?', opts: ['To make the bead look fancy', 'To widen the bead + add heat', 'To prevent porosity', 'To reduce amperage'], correct: 1, explain: 'Weaving moves the torch side-to-side perpendicular to travel direction. This widens the bead, adds heat to the joint, and helps fill wider gaps. Used commonly in vertical-up + when joining thicker sections.' },
          { q: 'What does "stringer bead" mean?', opts: ['First pass of a multi-pass weld', 'A straight, narrow bead with no weaving', 'A bead made with a stringer rod', 'A defective bead'], correct: 1, explain: 'Stringer bead = travel straight along the joint without weaving. Narrower, less heat-input. Used for high-strength steels where you want to limit HAZ size + minimize grain coarsening.' },
          { q: 'In TIG welding aluminum, why is AC current used?', opts: ['It\'s safer', 'AC arc-cleans the aluminum oxide', 'AC produces more heat', 'AC is required by code'], correct: 1, explain: 'AC TIG includes a positive half-cycle where electrons flow from workpiece toward electrode. This blasts aluminum oxide off the surface (cathodic etching). DC can\'t do this — DC straight polarity (DCEN) won\'t penetrate the oxide.' },
          { q: 'What is a "tack weld"?', opts: ['A small temporary weld to hold parts in alignment', 'A defective weld that must be removed', 'The first pass of a groove weld', 'A weld made with a magnetic backing'], correct: 0, explain: 'Tacks are short temporary welds that hold parts in alignment during fit-up + final welding. They\'re later incorporated into or melted out by the production weld. Improperly placed tacks (too small, wrong location) can cause defects.' },
          { q: 'What is "undercut"?', opts: ['Weld bead below the surface', 'Groove eroded into base metal alongside bead', 'Bead width too narrow', 'Crater at end of weld'], correct: 1, explain: 'Undercut is a groove melted into the base metal alongside the bead toe, where the weld didn\'t fill. Caused by excessive heat input (too much amperage + too fast travel). Creates stress concentration + reduces effective throat. Code-limited (typically max 1/32" deep).' },
          { q: 'What is the difference between SMAW + FCAW?', opts: ['SMAW uses solid wire, FCAW uses flux', 'SMAW uses stick electrodes, FCAW uses flux-cored wire', 'They\'re the same thing', 'FCAW is older than SMAW'], correct: 1, explain: 'SMAW (Shielded Metal Arc Welding, aka "stick") uses individual flux-coated electrode sticks. FCAW (Flux-Cored Arc Welding) uses a continuous tubular wire with flux inside, fed through a gun like MIG. FCAW is faster + higher deposition rate; SMAW is more portable + works in worse conditions.' },
          { q: 'What is a "backing bar"?', opts: ['A bar that holds the welder up', 'A bar placed behind a groove weld to support molten metal', 'A bar used to clamp parts', 'A bar of weld metal'], correct: 1, explain: 'Backing bar (usually copper or steel) is placed behind a groove weld to support the molten metal + allow full penetration without burning through. Copper backing isn\'t fused (high melting point). Steel backing may be left in or removed depending on design.' },
          { q: 'What does "PWHT" stand for?', opts: ['Pre-Weld Hot Treatment', 'Post-Weld Heat Treatment', 'Plate Welding High Temperature', 'Procedure for Welding Heavy Tubing'], correct: 1, explain: 'PWHT = Post-Weld Heat Treatment. Heating the welded part after welding to relieve stresses, refine microstructure, drive off hydrogen, or restore properties. Different procedures for different purposes (stress relief, normalizing, tempering, solution treating).' },
          { q: 'Why are low-hydrogen electrodes (E7018) stored hot?', opts: ['To make them easier to use', 'To keep them dry — moisture creates hydrogen in weld', 'To pre-heat the base metal', 'To extend shelf life'], correct: 1, explain: 'E7018 coating absorbs moisture from the air. When that moisture reaches the arc, it dissociates into H + O. The hydrogen dissolves in the weld pool + can cause cold cracking. Hot storage (~250°F) keeps coating dry. Damp E7018 = certified-job-killer.' },
          { q: 'What is a "stringer pass" + "weave pass" used together?', opts: ['Same thing', 'Stringer = root pass, weave = filler + cap passes', 'Stringer + weave alternate', 'Weave = root, stringer = filler'], correct: 1, explain: 'In multi-pass welds on thick sections: stringer (narrow) for the root pass for precise penetration, then weave (wider) for filler + cap passes to fill the groove faster + smooth the cap. Combination optimizes both precision + speed.' },
          { q: 'What is the AWS specification number for low-hydrogen mild steel SMAW electrodes?', opts: ['A5.1', 'D1.1', 'IX', '1104'], correct: 0, explain: 'AWS A5.1 specifies carbon steel electrodes for SMAW (covers E6010, E6011, E6013, E7018, etc.). D1.1 is the structural welding code. IX is ASME. 1104 is API.' },
          { q: 'What is a "fillet weld"?', opts: ['A weld in a groove between two plates', 'A triangular weld at the intersection of two perpendicular surfaces', 'A weld around a hole', 'A weld with no preparation'], correct: 1, explain: 'Fillet = triangular cross-section weld joining surfaces approximately at right angles (T-joint, lap, corner). No edge preparation needed. Most common weld type in structural + general fabrication. Measured by leg length.' },
          { q: 'What is "throat size" of a fillet weld?', opts: ['Distance from root to face of weld', 'Width of bead', 'Length of weld', 'Depth into base metal'], correct: 0, explain: 'Throat = shortest distance from root of joint to face of weld. For equal-leg fillets, theoretical throat = 0.707 × leg size. Throat is what carries the load — it\'s what engineers design for + inspectors verify.' },
          { q: 'What is "crater crack"?', opts: ['Crack from cold cracking', 'Crack at end of weld where arc was extinguished', 'Crack along weld centerline', 'Crack in HAZ'], correct: 1, explain: 'Crater = depression at end of weld where arc was broken. As the metal there solidifies last + faster than rest of weld, contraction stress can crack the crater. Prevention: cap the crater (back-fill before breaking arc) or use weld tabs + chip them off.' },
          { q: 'What does "GMAW" stand for?', opts: ['Gas Metal Arc Welding', 'General Manual Arc Welding', 'Gas Manual Arc Welding', 'Gun Manual Arc Welding'], correct: 0, explain: 'GMAW = Gas Metal Arc Welding. Industry term for what\'s commonly called MIG (Metal Inert Gas). Continuous wire + shielding gas + electric arc. Includes spray transfer, globular, short-circuit, pulse modes.' },
          { q: 'What is "duty cycle" on a welding machine?', opts: ['How long the welder can work per day', 'Percentage of a 10-min period machine can run at rated output', 'How often to clean the machine', 'Number of welds per hour'], correct: 1, explain: 'Duty cycle is rated at a specific output (e.g., 200A @ 60% means the machine can run at 200A for 6 minutes out of every 10 before thermal limit kicks in). Higher duty cycle = heavier-duty (industrial) machine.' },
          { q: 'Why does TIG welding require a separate filler rod?', opts: ['For better appearance', 'TIG doesn\'t have wire feed like MIG; filler is added manually', 'To match the base metal color', 'Code requirement only'], correct: 1, explain: 'TIG uses a non-consumable tungsten electrode (doesn\'t add metal to weld). If you need filler (most joints do), you add it with a separate rod held in your other hand. Some autogenous TIG (no filler) is used on tight-fit thin material.' },
          { q: 'What is a "puddle" in welding?', opts: ['Spilled coolant', 'Molten weld metal at the arc', 'Defect type', 'Slag layer'], correct: 1, explain: 'Puddle (or weld pool) = molten metal at the arc that the welder watches + controls. Reading the puddle is the welder\'s primary feedback. Puddle size, fluidity, shape tell you about heat input + fit-up + travel speed.' },
          { q: 'What is "amperage" measuring?', opts: ['Pressure of electricity', 'Volume of electron flow', 'Resistance', 'Power'], correct: 1, explain: 'Amperage (current) = rate of electron flow. In welding, amperage primarily controls penetration depth + bead width. Higher amperage = more current = more heat = deeper penetration + wider bead.' },
          { q: 'What is "DCEN" + "DCEP"?', opts: ['Different machine models', 'Direct Current Electrode Negative vs Positive — affects penetration + cleaning', 'Electrode brands', 'Insurance codes'], correct: 1, explain: 'DCEN (DC Electrode Negative, "straight polarity") = electrons flow from electrode TO workpiece. Better penetration. Used for TIG on most materials. DCEP (DC Electrode Positive, "reverse polarity") = electrons flow FROM workpiece TO electrode. Better cleaning (blasts oxide off). Used for SMAW + GMAW + DCEP TIG aluminum (rare).' },
          { q: 'What is "burn-through"?', opts: ['Burning a hole through the base metal', 'Burning your skin from arc flash', 'Burning out a welding machine', 'Burning consumables'], correct: 0, explain: 'Burn-through = melted hole punched through the base metal due to excessive heat input on thin material. Visible as a sag or hole in the bead. Caused by too much amperage, too slow travel, or insufficient base metal thickness for the chosen procedure.' },
          { q: 'What is "essential variable" in a WPS?', opts: ['Optional setting', 'Variable that requires re-qualification if changed beyond limits', 'Welder personality trait', 'Inspector requirement'], correct: 1, explain: 'Essential variables per ASME IX include: base metal class, filler classification, electrical characteristics, joint design, position, technique. Changing any essential variable beyond ranges requires WPS requalification. Non-essential variables can be changed without re-qualifying.' }
        ];

        if (qpView === 'overview') {
          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '🎓', title: 'Welder Qualification Prep' }),
            h('div', { className: 'p-6 max-w-4xl mx-auto space-y-5' },
              h('div', { className: 'flex gap-2' },
                h('button', {
                  onClick: function() { setQpView('overview'); },
                  className: 'px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold'
                }, '📋 Overview'),
                h('button', {
                  onClick: function() { setQpView('quiz'); setQuizIdx(0); },
                  className: 'px-4 py-2 rounded-lg bg-white border-2 border-slate-300 text-sm font-bold hover:border-sky-400'
                }, '📝 Practice Quiz (30 q)')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-4' },
                h('h3', { className: 'text-lg font-black text-sky-900' }, 'What is welder qualification?'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Welder qualification = the formal process of proving you can produce welds that meet a specific code (AWS, ASME, API) on specific materials in specific positions. Without current qualification, you cannot legally weld on most jobs that require code-quality work.'),
                h('h3', { className: 'text-base font-black text-sky-900' }, '🎯 The test process'),
                h('ol', { className: 'list-decimal list-inside space-y-2 text-sm text-slate-800' },
                  h('li', null, h('strong', null, 'Choose the qualification: '), 'WPS, position (e.g., 6G), material thickness, process. Each combination is its own qualification.'),
                  h('li', null, h('strong', null, 'Weld test coupons: '), 'Per the WPS, on the specified material + position. Usually 2-3 coupons (one for visual, one or more for bend testing).'),
                  h('li', null, h('strong', null, 'Visual inspection: '), 'Independent inspector checks for visible defects (cracks, undercut, porosity, incomplete fusion). Must be defect-free per code acceptance criteria.'),
                  h('li', null, h('strong', null, 'Bend tests: '), 'Cut strips from the weld + bend them around a mandrel. The face + root of the weld are stretched. If they crack open or show fissures larger than allowed, you fail.'),
                  h('li', null, h('strong', null, 'RT or UT (some certifications): '), 'For pipe + critical applications, X-ray (RT) or ultrasonic (UT) testing replaces or supplements bend tests.'),
                  h('li', null, h('strong', null, 'Pass = WPQ issued: '), 'You get a Welder Performance Qualification card good for 6 months (extends with documented continuous use).')
                ),
                h('h3', { className: 'text-base font-black text-sky-900 mt-4' }, '🪈 Most marketable qualifications'),
                h('div', { className: 'space-y-2' },
                  [{ name: '6G — Pipe at 45° fixed', pay: '$30-50/hr', who: 'Pipeline, refinery, power plant, nuclear', why: 'Most challenging position. Qualifies for ALL other positions. The "ace card."' },
                   { name: '6GR — Restricted 6G with backing ring', pay: '$35-65/hr', who: 'Refinery, nuclear', why: '6G with a restriction ring forcing tight technique. Even more demanding.' },
                   { name: 'D1.1 4G (overhead groove)', pay: '$25-40/hr', who: 'Structural, shipyards, bridge', why: 'Overhead is hardest plate position. Qualifies for 1G, 2G, 3G as well.' },
                   { name: 'ASME 6G TIG root + Stick fill', pay: '$30-55/hr', who: 'Pressure vessel, pharma, food-grade', why: 'TIG root pass on stainless + carbon steel pipe = the gold standard of pipe welding.' }].map(function(q, i) {
                    return h('div', { key: i, className: 'bg-sky-50 border-2 border-sky-300 rounded-xl p-3' },
                      h('div', { className: 'flex justify-between items-baseline mb-1 flex-wrap' },
                        h('span', { className: 'font-black text-sky-900' }, q.name),
                        h('span', { className: 'font-mono text-xs text-sky-700' }, q.pay)
                      ),
                      h('p', { className: 'text-xs text-slate-800' }, h('strong', null, 'Where: '), q.who),
                      h('p', { className: 'text-xs text-slate-800' }, h('strong', null, 'Why: '), q.why)
                    );
                  })
                )
              ),
              h(TeacherNotes, {
                standards: ['AWS SENSE Level 1 + 2', 'CTE Manufacturing 11.B', 'NCCER Welding Level 1'],
                questions: [
                  'A welder is qualified in 3G stick on 3/8" plate. Can they legally weld 1/4" plate in flat position with the same procedure?',
                  'Why does a welder need to retake the qualification test if they switch from MIG to TIG, even on the same material + position?',
                  'A welder failed their first 6G attempt. What\'s the most common failure cause (bend test) + how do they study to pass next time?'
                ],
                misconceptions: [
                  '"Once you\'re a welder, you\'re a welder forever" — qualifications expire + must be renewed; new jobs may require new qualifications.',
                  '"The hardest part is striking the arc" — for code-quality welding, the hardest part is consistency across an 18" coupon for 30 minutes.',
                  '"Anyone can pass with practice" — many people simply can\'t pass 6G even with years of practice. Hand-eye coordination + posture + focus matter. Maine welders selectively complete 6G qual; not everyone gets there.'
                ],
                extension: 'Visit a local welding shop (or YouTube videos of qualification tests). Watch how a coupon gets prepared, welded, sectioned, bent. The visible difference between a pass + a fail is often shockingly small — millimeters of root undercut or a hairline crater crack. Develop the inspector\'s eye.'
              })
            )
          );
        } else {
          // Quiz view
          var current = examQuestions[quizIdx];
          var userAns = ans[quizIdx];
          var answered = (userAns != null);
          var correctCount = Object.keys(ans).filter(function(k) { return ans[k] === examQuestions[k].correct; }).length;
          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '🎓', title: 'Welder Qual Prep — Practice Quiz' }),
            h('div', { className: 'p-6 max-w-3xl mx-auto space-y-5' },
              h('div', { className: 'flex gap-2 items-center' },
                h('button', {
                  onClick: function() { setQpView('overview'); },
                  className: 'px-3 py-1.5 rounded-lg bg-white border-2 border-slate-300 text-xs font-bold'
                }, '← Overview'),
                h('span', { className: 'text-sm text-slate-700 font-bold' },
                  'Question ' + (quizIdx + 1) + ' of ' + examQuestions.length + ' · Score: ' + correctCount + '/' + Object.keys(ans).length)
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('div', { className: 'text-base font-bold text-slate-900' }, current.q),
                h('div', { className: 'space-y-2', role: 'radiogroup' },
                  current.opts.map(function(opt, oi) {
                    var isAns = answered && (oi === current.correct);
                    var isWrong = answered && (oi === userAns) && (oi !== current.correct);
                    return h('button', {
                      key: oi,
                      onClick: function() {
                        if (!answered) {
                          var n = Object.assign({}, ans); n[quizIdx] = oi; setAns(n);
                          announce(oi === current.correct ? 'Correct' : 'Incorrect');
                        }
                      },
                      disabled: answered,
                      role: 'radio',
                      'aria-checked': (userAns === oi) ? 'true' : 'false',
                      className: 'w-full text-left p-3 rounded-lg border-2 text-sm transition ' +
                        (isAns ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' :
                         isWrong ? 'bg-rose-50 border-rose-500 text-rose-900 font-bold' :
                         answered ? 'bg-slate-50 border-slate-300 text-slate-700' :
                         'bg-white border-slate-300 hover:border-sky-400 text-slate-800')
                    }, String.fromCharCode(65 + oi) + '. ' + opt);
                  })
                ),
                answered && h('div', { className: 'mt-3 p-3 rounded-lg bg-blue-50 border-2 border-blue-300 text-sm text-slate-800' },
                  h('strong', { className: 'text-blue-900' }, '💡 Explanation: '), current.explain
                ),
                h('div', { className: 'flex gap-2 pt-3 border-t border-slate-200' },
                  h('button', {
                    disabled: quizIdx === 0,
                    onClick: function() { setQuizIdx(quizIdx - 1); },
                    className: 'flex-1 py-2 rounded-lg bg-slate-100 text-slate-800 font-bold text-sm disabled:opacity-40'
                  }, '← Previous'),
                  h('button', {
                    disabled: quizIdx >= examQuestions.length - 1,
                    onClick: function() { setQuizIdx(quizIdx + 1); },
                    className: 'flex-1 py-2 rounded-lg bg-sky-600 text-white font-bold text-sm disabled:opacity-40'
                  }, 'Next →')
                )
              )
            )
          );
        }
      }

      // ─────────────────────────────────────────────────────
      // MODULE 14: PIPE WELDING DEEP-DIVE
      // ─────────────────────────────────────────────────────
      function PipeWeldingDeepDive() {
        var pipeSect = usePersistedState('pipe_sect', 'overview');
        var sect = pipeSect[0], setSect = pipeSect[1];
        var sects = [
          { id: 'overview',     label: '📋 Why pipe is its own world' },
          { id: 'positions',    label: '🪈 Pipe positions (1G/2G/5G/6G/6GR)' },
          { id: 'passes',       label: '🥞 Root + hot + fill + cap' },
          { id: 'updown',       label: '⬆⬇ Uphill vs downhill' },
          { id: 'pipeline',     label: '🛢 Pipeline welding (cross-country)' },
          { id: 'orbital',      label: '⚙ Orbital + automated pipe' },
          { id: 'specialty',    label: '⭐ Specialty pipe work + pay' }
        ];

        var content;
        if (sect === 'overview') {
          content = h('div', { className: 'space-y-3' },
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Pipe welding is its own discipline within the welding trade. The geometry is different (curved surface, not flat), the technique demands constant adjustment as the bead climbs around the circumference, multiple passes build up the joint, and the consequences of a bad weld are higher — a pipe weld holding pressurized gas at 2,000 psi cannot leak.'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'A welder who can do 6G on small-diameter pipe (2-3" Sch 80) with X-ray-quality results is among the highest-paid skilled tradespeople in North America. Pipeline + nuclear + refinery work routinely pays $40-80/hr + per-diem + travel.'),
            h('div', { className: 'bg-indigo-50 border-2 border-indigo-300 rounded-xl p-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-indigo-900 mb-2' }, 'Why pipe is harder than plate'),
              h('ul', { className: 'space-y-1 text-sm text-slate-800' },
                h('li', null, '• ', h('strong', null, 'Curved surface: '), 'Travel angle continuously changes as bead progresses around. Body position changes too.'),
                h('li', null, '• ', h('strong', null, 'Multiple passes: '), 'Even thin-wall pipe requires 2-4 passes (root + hot + cap). Each pass must fuse with previous without inclusion.'),
                h('li', null, '• ', h('strong', null, 'Position constraint: '), 'Pipe often can\'t be repositioned. The welder must adapt to whatever position the joint presents (5G + 6G fixed).'),
                h('li', null, '• ', h('strong', null, 'X-ray inspection: '), 'Most code pipe welds are 100% radiographed. Inclusions or lack of fusion that wouldn\'t fail plate-weld VT will fail pipe RT.'),
                h('li', null, '• ', h('strong', null, 'Root + back side: '), 'Pipe joints typically can\'t be welded from inside. The root pass must penetrate fully from outside with no excess or insufficient penetration.')
              )
            )
          );
        } else if (sect === 'positions') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🪈 Pipe position designations'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Pipe welding adds positions beyond the plate 1G/2G/3G/4G:'),
            h('div', { className: 'space-y-2' },
              [{ pos: '1G', name: 'Horizontal pipe rolled', desc: 'Pipe axis is horizontal; pipe is rotated so weld is always in the flat position. Easiest pipe welding — like welding plate.' },
               { pos: '2G', name: 'Vertical pipe', desc: 'Pipe axis is vertical; weld runs around the pipe in a horizontal plane. Steady position, but you weld all the way around.' },
               { pos: '5G', name: 'Horizontal pipe fixed', desc: 'Pipe axis horizontal; pipe CANNOT rotate. Bead must travel from 6 o\'clock UP through 9, 12, 3 back to 6. Must change technique as gravity changes.' },
               { pos: '6G', name: 'Pipe at 45°, fixed', desc: 'Pipe axis at 45°. Cannot rotate. Most demanding position. Welder constantly adjusts technique, body position, electrode angle. The "challenge" qualification — passes for all other positions.' },
               { pos: '6GR', name: '6G with restriction ring', desc: '6G position with a metal ring placed around the pipe near the joint, restricting electrode access. The most punishing welding qualification commonly required. Used for nuclear + critical pressure vessel work.' }].map(function(p, i) {
                return h('div', { key: i, className: 'bg-white border-2 border-indigo-200 rounded-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1' },
                    h('span', { className: 'font-mono font-bold text-indigo-900' }, p.pos),
                    h('span', { className: 'font-bold text-slate-800' }, p.name)
                  ),
                  h('p', { className: 'text-sm text-slate-700' }, p.desc)
                );
              })
            )
          );
        } else if (sect === 'passes') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🥞 The pass structure of pipe welding'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Pipe groove welds build up in distinct passes. Each pass has its own purpose + technique:'),
            h('div', { className: 'space-y-2' },
              [{ pass: 'Root', desc: 'First pass at the very bottom of the joint groove. Must fully penetrate without excess + without insufficient penetration. Often TIG (cleanest control) for first pass on quality work. Determines whether the weld will pass X-ray. Most critical + most-attention-paid pass.', process: 'Often TIG; sometimes stick (E6010 root)' },
               { pass: 'Hot', desc: 'Immediately after root — burns out any inclusions in the root + fuses root face to the groove walls. Slightly hotter than root. Sometimes called "burn-in pass."', process: 'TIG or stick' },
               { pass: 'Fill', desc: 'Multiple passes (depending on wall thickness) that fill the groove up to ~1/8" below the surface. Higher amperage, faster travel, more material deposited per pass. Pipe up to 1" thick may need 6+ fill passes.', process: 'Stick (E7018) or wire (FCAW)' },
               { pass: 'Cap', desc: 'Final passes that build the bead slightly above the original surface (reinforcement crown). Smaller passes, weaving for uniform appearance. The "show pass" — what inspectors see first.', process: 'Stick (E7018) — gives clean appearance' }].map(function(p, i) {
                return h('div', { key: i, className: 'bg-orange-50 border-l-4 border-orange-400 rounded-r-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1' },
                    h('span', { className: 'font-black text-orange-900' }, p.pass + ' pass'),
                    h('span', { className: 'text-xs font-mono text-orange-700' }, p.process)
                  ),
                  h('p', { className: 'text-sm text-slate-800' }, p.desc)
                );
              })
            ),
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-emerald-900 mb-1' }, '💡 Interpass cleaning'),
              h('p', { className: 'text-sm text-slate-800' }, 'Between passes, the welder MUST chip slag + grind any defects + wire-brush the previous pass. Slag inclusions caused by skipping interpass cleaning are the #1 cause of pipe weld rejects in X-ray inspection.')
            )
          );
        } else if (sect === 'updown') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '⬆⬇ Uphill vs Downhill technique'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'In vertical + 5G/6G pipe positions, the welder chooses whether to weld UPHILL (from 6 o\'clock to 12) or DOWNHILL (from 12 to 6). They\'re completely different techniques.'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3' },
                h('h4', { className: 'font-black text-emerald-900 mb-2' }, '⬆ UPHILL'),
                h('ul', { className: 'text-sm text-slate-800 space-y-1' },
                  h('li', null, '• Slower travel speed'),
                  h('li', null, '• Higher heat input per inch'),
                  h('li', null, '• Better penetration'),
                  h('li', null, '• Wider bead'),
                  h('li', null, '• Used for structural + heavier sections (AWS D1.1 + most ASME)'),
                  h('li', null, '• Better for fill + cap passes')
                )
              ),
              h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
                h('h4', { className: 'font-black text-amber-900 mb-2' }, '⬇ DOWNHILL'),
                h('ul', { className: 'text-sm text-slate-800 space-y-1' },
                  h('li', null, '• Faster travel speed'),
                  h('li', null, '• Lower heat input per inch'),
                  h('li', null, '• Less penetration'),
                  h('li', null, '• Narrower bead'),
                  h('li', null, '• Used for thin-wall pipe (cross-country pipeline, X65 + X70 grades)'),
                  h('li', null, '• Better for root passes on high-strength steel — avoids HAZ softening')
                )
              )
            ),
            h('div', { className: 'bg-rose-50 border-2 border-rose-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-rose-900 mb-1' }, '⚠ Common mistake'),
              h('p', { className: 'text-sm text-slate-800' }, 'Downhill is FASTER + EASIER but provides LESS penetration. Welders new to pipe often default to downhill, get acceptable visual appearance, but fail X-ray due to lack of fusion at the root. Code-required uphill is uphill for a reason. Check your WPS.')
            )
          );
        } else if (sect === 'pipeline') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🛢 Cross-country pipeline welding'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Pipeline welding is its own subculture within pipe welding. Cross-country (oil + gas transmission) pipelines run from gas fields/wellheads to refineries/distribution. The work is mobile (move along the right-of-way as construction progresses), outdoor, often remote, and pays exceptionally well.'),
            h('div', { className: 'bg-indigo-50 border-2 border-indigo-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-indigo-900' }, '🔧 The pipeline weld crew structure'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Stringer bead: '), 'First welder lays the root pass on the joint as soon as alignment clamps come off. Usually downhill stick (E6010 cellulosic electrode) for fast root.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Hot pass: '), 'Second welder follows immediately + adds hot pass. Burns out any defects from root.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Filler hands: '), '2-4 welders add fill passes simultaneously (different sides of the joint). Speed is critical — pipeline construction is paid per foot of pipe laid.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Cap hand: '), 'Final welder does cap pass. Cleanest + most visible — also the welder whose work everyone sees.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Tie-in welder: '), 'Specialist who joins separate pipeline sections together. Often the hardest welds (no alignment clamps, must fit existing pipe). Senior position.')
            ),
            h('div', { className: 'bg-slate-50 border-2 border-slate-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-slate-900 mb-1' }, '💰 The pay reality'),
              h('p', { className: 'text-sm text-slate-800' }, 'Pipeline welders typically earn $40-60/hr + per-diem ($100-150/day for housing + meals) + overtime. A pipeline welder working 60 hr weeks for 6 months can clear $130-180K. The other side: brutal travel (months from home), physical demands (mostly outdoor + manual), industry cycles (boom/bust with oil prices), + safety risks (heavy equipment, gas, isolation).')
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '🎓 How to get into pipeline'),
              h('p', { className: 'text-sm text-slate-800' }, 'Most pipeline welders come from: (1) Welding schools that specifically prepare pipeline welders (Tulsa Welding School, Pipeliners Local 798 training, Hobart Institute). (2) Union 798 apprenticeship (UA Pipeliners). (3) Non-union "merit shop" companies (Henkels & McCoy, Michels, Hunt). Almost always requires 6G qualification + cellulosic stick experience.')
            )
          );
        } else if (sect === 'orbital') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '⚙ Orbital welding — automated TIG on pipe'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Orbital welding is automated TIG welding where the torch travels around the pipe on a track. The welder sets parameters (current, travel speed, gas flow, electrode position) and the machine executes the weld with absolute repeatability. Used for high-precision applications where every joint must be identical: semiconductor fab pipe, pharmaceutical clean-in-place piping, nuclear, aerospace.'),
            h('div', { className: 'bg-zinc-50 border-2 border-zinc-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-zinc-900' }, '🔧 How it works'),
              h('p', { className: 'text-sm text-slate-800' }, '1. Torch is mounted in a "weld head" — small machine that clamps around the pipe + has a track that the torch travels along.'),
              h('p', { className: 'text-sm text-slate-800' }, '2. Operator (not technically a welder — different certification) programs the weld parameters per pipe size + material.'),
              h('p', { className: 'text-sm text-slate-800' }, '3. Machine welds the joint while operator observes (sometimes a screen showing weld pool). Operator can intervene if needed.'),
              h('p', { className: 'text-sm text-slate-800' }, '4. Data logged for every weld — current, voltage, travel speed, time, position. Critical for traceability in regulated industries.')
            ),
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-emerald-900 mb-1' }, '💡 Pros + cons'),
              h('p', { className: 'text-sm text-slate-800 mb-1' }, h('strong', null, 'Pros: '), 'Extreme repeatability. Every weld looks identical. Faster than manual for high-volume work. Less skill required to operate than to manually weld. Comprehensive data logging for quality audit.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Cons: '), 'Capital cost ($30K-150K per system). Setup time per joint can negate speed advantage on small batches. Limited to specific pipe sizes + joint configurations. Doesn\'t handle joint misalignment well (manual welder can compensate).')
            ),
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-blue-900 mb-1' }, '💰 Career path'),
              h('p', { className: 'text-sm text-slate-800' }, 'Orbital operator + technician roles pay $35-60/hr. Lower-pressure than pure welding (no body strain) + more analytical (parameters + troubleshooting). Niche skill — Arc Machines + Liburdi + Magnatech are the main equipment OEMs; training programs available through them. Growing fast in semiconductor + biotech + nuclear.')
            )
          );
        } else if (sect === 'specialty') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '⭐ Specialty pipe + pay scale'),
            h('div', { className: 'space-y-2' },
              [{ name: 'Nuclear pipe welder', pay: '$55-95/hr + per-diem', what: 'ASME III Section requires extensive qualifications (Class 1 — primary reactor coolant; Class 2 — auxiliary; Class 3 — service). Every weld X-rayed + ultrasonically tested. Stop work for any irregularity. Among highest-paid welding work.' },
               { name: 'Pipeline tie-in welder', pay: '$60-90/hr + per-diem', what: 'Joins separate pipeline sections — the hardest welds because there\'s no alignment + restricted access. Often the most experienced welder on a crew. Travel-heavy.' },
               { name: 'Refinery turnaround welder', pay: '$45-75/hr + 60+ hr weeks', what: 'During refinery shutdowns ("turnarounds"), all process pipe is inspected + repaired. Brief intense work periods (3-8 weeks at one site) earning $40-70K. Welders travel from turnaround to turnaround.' },
               { name: 'Pharmaceutical clean-room welder', pay: '$40-65/hr', what: 'Sanitary stainless TIG welding for biotech + pharma. Tight tolerance on weld appearance (must be smooth + crevice-free for sterilization). Often orbital welding. Boston/SF/RTP markets have heavy concentration.' },
               { name: 'Subsea pipeline welder', pay: '$80-200K total', what: 'Combines saturation diving + welding (or hyperbaric chamber welding). Highest-paid welding work in the world. Brief offshore stints, then weeks off. Major decompression health risks.' },
               { name: 'NDT-certified pipe welder', pay: '$35-65/hr', what: 'Welders also certified to perform non-destructive testing on welds (VT, PT, MT). Two skills = premium pay + more job options. Common in specialty welding shops.' }].map(function(s, i) {
                return h('div', { key: i, className: 'bg-white border-2 border-indigo-200 rounded-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1 flex-wrap' },
                    h('span', { className: 'font-black text-indigo-900' }, s.name),
                    h('span', { className: 'font-mono text-xs text-indigo-700' }, s.pay)
                  ),
                  h('p', { className: 'text-sm text-slate-800' }, s.what)
                );
              })
            )
          );
        }

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🪈', title: 'Pipe Welding Deep-Dive' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'flex flex-wrap gap-2' },
              sects.map(function(s) {
                var sel = (sect === s.id);
                return h('button', {
                  key: s.id,
                  onClick: function() { setSect(s.id); announce(s.label); },
                  className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition focus:outline-none focus:ring-2 ring-indigo-500/40 ' +
                    (sel ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-800 border-slate-300 hover:border-indigo-400')
                }, s.label);
              })
            ),
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' }, content),
            h(TeacherNotes, {
              standards: ['AWS SENSE Module 7 (Pipe)', 'API 1104', 'ASME B31.1 + B31.3'],
              questions: [
                'Why is a 6G welder qualified for 1G, 2G, 3G, 4G, 5G as well, but a 2G welder is NOT qualified for 6G?',
                'A cross-country pipeline welder is paid $50/hr + $130/day per-diem on a 6-month, 60-hr-week project. Calculate gross pay. Why might a welder choose this over a $35/hr local shop job?',
                'In pharmaceutical pipe welding, weld appearance matters as much as integrity. Why? Connect to FDA + clean-in-place sterilization principles.'
              ],
              misconceptions: [
                '"Downhill is faster, so always use it" — downhill provides LESS penetration; uphill is required for most structural + pressure work.',
                '"6G is just a harder version of plate welding" — totally different. Constant adjustment to body position, electrode angle, gravity. Many excellent plate welders fail 6G.',
                '"Pipeline welders work year-round at one place" — pipeline work is project-based + traveling. Most weld 6-9 months/yr; time off between projects.'
              ],
              extension: 'Watch a YouTube video of a 6G pipe weld being completed (search "6G pipe weld AWS"). Count the passes. Notice where the welder pauses to reposition + change technique. Identify root, hot, fill, cap. This is what the qualification test requires you to do for ~30 minutes straight without error.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 15: ROBOTIC + AUTOMATED WELDING
      // ─────────────────────────────────────────────────────
      function RoboticAutomated() {
        var robSect = usePersistedState('rob_sect', 'overview');
        var sect = robSect[0], setSect = robSect[1];
        var sects = [
          { id: 'overview',  label: '📋 Overview' },
          { id: 'brands',    label: '🏭 Major brands' },
          { id: 'program',   label: '⌨ Programming' },
          { id: 'vision',    label: '👁 Vision + adaptive control' },
          { id: 'cobots',    label: '🤝 Collaborative cobots' },
          { id: 'careers',   label: '💼 Careers in robotic welding' }
        ];

        var content;
        if (sect === 'overview') {
          content = h('div', { className: 'space-y-3' },
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Industrial robotic welding has been transforming high-volume manufacturing since the 1980s. Automotive body assembly, appliance fabrication, structural steel, agricultural equipment, defense — all heavily robotic. A robot can weld 24/7 with consistent quality + speed manual welders can\'t match.'),
            h('div', { className: 'bg-zinc-50 border-2 border-zinc-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-zinc-900' }, 'What robots do better than humans'),
              h('ul', { className: 'space-y-1 text-sm text-slate-800' },
                h('li', null, '• ', h('strong', null, 'Repeatability: '), 'Every weld identical to the last. No fatigue-induced variation.'),
                h('li', null, '• ', h('strong', null, 'Speed: '), '2-5x faster than skilled manual welder for repeating same joint.'),
                h('li', null, '• ', h('strong', null, 'Heavy/awkward access: '), 'Overhead welds, confined spaces, dangerous atmospheres.'),
                h('li', null, '• ', h('strong', null, 'Tireless production: '), '24/7 with only routine maintenance breaks.'),
                h('li', null, '• ', h('strong', null, 'Data logging: '), 'Every weld parameter recorded for traceability.')
              )
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-amber-900' }, 'What humans still do better'),
              h('ul', { className: 'space-y-1 text-sm text-slate-800' },
                h('li', null, '• ', h('strong', null, 'Adaptation: '), 'Joint misalignment, varying fit-up, unexpected gaps — manual welder compensates real-time. Most robots cannot.'),
                h('li', null, '• ', h('strong', null, 'Low-volume work: '), 'Setup + programming time for 1-10 unique pieces > manual welding time.'),
                h('li', null, '• ', h('strong', null, 'Field work + repair: '), 'Robots can\'t go to a job site to fix a damaged pipeline or weld a structural beam in place.'),
                h('li', null, '• ', h('strong', null, 'Diagnostic judgment: '), 'When the weld looks wrong, deciding what to do (re-weld? grind out? abort?) requires welding judgment.'),
                h('li', null, '• ', h('strong', null, 'Variable joints: '), 'Custom fabrication, art metalwork, sculpture, restoration.')
              )
            ),
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-blue-900 mb-1' }, '💡 Career-impact framing'),
              h('p', { className: 'text-sm text-slate-800' }, 'Robotic welding doesn\'t eliminate welders — it changes what welders do. Automotive body shops largely run on robots, but every shop still has manual welders for fixtures, prototyping, repair, and complex custom work. The bigger career shift is: ROBOT PROGRAMMERS + TECHNICIANS are a growing role drawing from welding experience + adding programming knowledge.')
            )
          );
        } else if (sect === 'brands') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🏭 The major industrial robot brands'),
            h('p', { className: 'text-sm text-slate-800' }, 'Industrial robots are dominated by a handful of OEMs. Each has its own teach-pendant interface + programming language, but core concepts transfer.'),
            h('div', { className: 'space-y-2' },
              [{ name: 'FANUC', country: 'Japan', share: '#1 globally', notes: 'Yellow-painted robots ubiquitous in auto plants. ARC Mate series is the welding workhorse. Roboguide simulation software. Programming via teach pendant + offline.' },
               { name: 'ABB', country: 'Switzerland/Sweden', share: '#2 globally', notes: 'Orange robots. IRB 1520ID is the popular arc welding model. RobotStudio simulation. Strong in European auto + appliance industry.' },
               { name: 'KUKA', country: 'Germany (Midea-owned)', share: '#3 globally', notes: 'Orange (more red-orange). KR CYBERTECH for arc welding. KUKA.SimPro simulation. Strong in German auto + aerospace.' },
               { name: 'Yaskawa Motoman', country: 'Japan', share: '#4 globally', notes: 'Bright blue robots. Motoman MA1440 is popular for welding. MotoSim EG simulation. Strong in US arc-welding cells.' },
               { name: 'Lincoln + ESAB + Miller', country: 'USA', share: 'Welding-system integrators', notes: 'These weld OEMs partner with robot OEMs to offer turn-key welding cells. Lincoln Power Wave + ESAB Aristo + Miller Auto-Continuum platforms.' }].map(function(b, i) {
                return h('div', { key: i, className: 'bg-zinc-50 border-2 border-zinc-300 rounded-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1 flex-wrap' },
                    h('span', { className: 'font-black text-zinc-900' }, b.name),
                    h('span', { className: 'text-xs font-mono text-zinc-700' }, b.country + ' · ' + b.share)
                  ),
                  h('p', { className: 'text-sm text-slate-800' }, b.notes)
                );
              })
            )
          );
        } else if (sect === 'program') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '⌨ How robotic welding gets programmed'),
            h('p', { className: 'text-sm text-slate-800' }, 'There are three main approaches, often combined:'),
            h('div', { className: 'space-y-2' },
              [{ method: '1. Teach pendant (point-by-point)', desc: 'Operator moves robot manually with joystick on teach pendant, recording waypoints. At each waypoint, they specify: position, weld start/stop, weld parameters (V, A, TS), motion type (joint vs linear). Most common for small batch + simpler parts.', pro: 'Intuitive for welders to learn', con: 'Slow for complex parts; requires robot to be available for programming time' },
               { method: '2. Offline programming (CAD-based)', desc: 'Using software like FANUC Roboguide, ABB RobotStudio, etc., programmer creates the weld path on a virtual model of the robot + part. Tested in simulation. Code uploaded to robot when ready.', pro: 'Programming happens in parallel with production; no robot downtime', con: 'Requires CAD model of part + accurate fixture; works only as well as the CAD' },
               { method: '3. Path teach via vision/sensor', desc: 'Robot uses sensors (laser scanners, vision systems, touch probes) to find joint location + characteristics, then welds adaptively. Operator sets parameters but robot figures out path.', pro: 'Handles fit-up variation; doesn\'t need precise fixturing', con: 'Expensive (vision systems add $20-50K to cell); requires sensor calibration' }].map(function(m, i) {
                return h('div', { key: i, className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-3' },
                  h('div', { className: 'font-bold text-blue-900 mb-1' }, m.method),
                  h('p', { className: 'text-sm text-slate-800 mb-1' }, m.desc),
                  h('p', { className: 'text-xs text-slate-700' }, h('strong', null, '✓ '), m.pro),
                  h('p', { className: 'text-xs text-slate-700' }, h('strong', null, '⚠ '), m.con)
                );
              })
            ),
            h('div', { className: 'bg-slate-50 border-2 border-slate-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-slate-900 mb-1' }, '💡 Practical reality'),
              h('p', { className: 'text-sm text-slate-800' }, 'Most production welding cells use a combination: offline programming for the bulk of the path + teach pendant fine-tuning at the actual robot + optional vision for parts with known fit-up variation. Welder/programmer/technician roles often combine all three skills.')
            )
          );
        } else if (sect === 'vision') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '👁 Vision + adaptive control'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'The hardest problem in robotic welding is variation — every part isn\'t perfectly identical. Gaps vary, fit-up varies, fixtures drift, parts arrive bent. Vision systems + adaptive control let the robot respond to actual joint conditions instead of blindly following a pre-programmed path.'),
            h('div', { className: 'space-y-2' },
              [{ type: 'Laser seam tracking', desc: 'A laser line projected ahead of the torch + a camera detects where the line falls on the part. The control system calculates where the actual joint is + adjusts torch path. Used for long longitudinal welds where part may bow slightly.' },
               { type: 'Touch sensing (TSS)', desc: 'Robot touches the part with the welding wire (or a separate probe) to establish reference points before welding. Slower setup but very accurate. Used when part position is uncertain.' },
               { type: 'Arc voltage sensing (through-arc tracking)', desc: 'The robot weaves the arc + monitors voltage. When arc length differs side-to-side, it indicates joint asymmetry. Robot adjusts position. No additional sensor needed — uses the arc itself. Common for fillet welds.' },
               { type: '3D vision (structured light or stereo)', desc: 'Cameras + projected light pattern build a 3D model of the part in real-time. Robot uses this to plan path. Most advanced + expensive systems ($50-200K added cost).' }].map(function(v, i) {
                return h('div', { key: i, className: 'bg-emerald-50 border-l-4 border-emerald-400 rounded-r-xl p-3' },
                  h('div', { className: 'font-bold text-emerald-900 mb-1' }, v.type),
                  h('p', { className: 'text-sm text-slate-800' }, v.desc)
                );
              })
            )
          );
        } else if (sect === 'cobots') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🤝 Collaborative cobots (Universal Robots, etc.)'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Collaborative robots ("cobots") are lighter, slower, force-limited robots designed to work alongside humans without safety cages. Easier to program (often by guiding the arm with your hand to teach positions). Used widely for low-volume welding in small shops that couldn\'t afford traditional robot cells.'),
            h('div', { className: 'space-y-2' },
              [{ name: 'Universal Robots (UR)', desc: 'Danish company; UR5e + UR10e + UR16e are popular for welding. PolyScope interface — easiest cobot programming on market. Major adoption in small fab shops.' },
               { name: 'ABB GoFa', desc: 'ABB\'s cobot line. CRB 15000. Good integration with ABB welding systems.' },
               { name: 'FANUC CRX', desc: 'FANUC\'s cobot line. CRX-10iA + CRX-25iA. Easier programming than FANUC industrial.' },
               { name: 'YuMi (ABB)', desc: 'Dual-arm cobot for assembly + delicate work. Less commonly used for welding but emerging.' }].map(function(c, i) {
                return h('div', { key: i, className: 'bg-zinc-50 border-2 border-zinc-300 rounded-xl p-3' },
                  h('div', { className: 'font-bold text-zinc-900 mb-1' }, c.name),
                  h('p', { className: 'text-sm text-slate-800' }, c.desc)
                );
              })
            ),
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-blue-900 mb-1' }, '💡 Why cobots are democratizing automation'),
              h('p', { className: 'text-sm text-slate-800' }, 'Traditional welding robots: ~$200K turn-key cell, weeks of programming, safety cage, requires dedicated programmer. Cobots: ~$50K turn-key, hours of programming, no cage needed, programmed by existing welder. Small shops can now afford automation that was previously out of reach. Result: more shops automating, but cobots typically supplement (not replace) skilled manual welders.')
            )
          );
        } else if (sect === 'careers') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '💼 Careers in robotic + automated welding'),
            h('div', { className: 'space-y-2' },
              [{ role: 'Robot welding operator', pay: '$25-40/hr', desc: 'Loads/unloads parts, monitors cell operation, performs minor adjustments + maintenance. Entry-level. Often a starting point.' },
               { role: 'Robot programmer/technician', pay: '$30-55/hr', desc: 'Programs new parts + teaches paths + troubleshoots. Often a welder who learned programming. Strong demand.' },
               { role: 'Robotic welding engineer', pay: '$70-120K', desc: 'Designs welding cells, specs equipment, validates processes, manages multiple cells. Engineering degree typical.' },
               { role: 'Vision/automation integrator', pay: '$75-140K', desc: 'Designs + commissions vision + sensor systems on welding cells. Specialty subset of robotic engineering.' },
               { role: 'Field service engineer (welding OEM)', pay: '$70-110K + travel', desc: 'Travels to customer sites for installation + commissioning + troubleshooting of robot welding cells. FANUC, ABB, Lincoln Electric, etc.' },
               { role: 'Cobot welding specialist (small shop)', pay: '$20-35/hr + ownership stake?', desc: 'In a small fab shop, the person who set up + maintains the cobot is often the highest-skilled welder (also programs + maintains). Growing role in small to mid-size fab.' }].map(function(c, i) {
                return h('div', { key: i, className: 'bg-white border-2 border-zinc-200 rounded-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1 flex-wrap' },
                    h('span', { className: 'font-black text-zinc-900' }, c.role),
                    h('span', { className: 'font-mono text-xs text-zinc-700' }, c.pay)
                  ),
                  h('p', { className: 'text-sm text-slate-800' }, c.desc)
                );
              })
            ),
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-emerald-900 mb-1' }, '💡 Path to robotic welding'),
              h('p', { className: 'text-sm text-slate-800' }, 'The strongest profile: start as a manual welder (build technique knowledge), then learn one specific robot system (FANUC training, ABB training, etc.). Welding programs at community colleges increasingly include robot programming modules. EMCC in Maine has FANUC-certified instructors. Tulsa Welding School + Lincoln Electric Welding Tech School offer dedicated automation tracks.')
            )
          );
        }

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🤖', title: 'Robotic + Automated Welding' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'flex flex-wrap gap-2' },
              sects.map(function(s) {
                var sel = (sect === s.id);
                return h('button', {
                  key: s.id,
                  onClick: function() { setSect(s.id); announce(s.label); },
                  className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition focus:outline-none focus:ring-2 ring-zinc-500/40 ' +
                    (sel ? 'bg-zinc-700 text-white border-zinc-800' : 'bg-white text-slate-800 border-slate-300 hover:border-zinc-400')
                }, s.label);
              })
            ),
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' }, content),
            h(TeacherNotes, {
              standards: ['NGSS HS-ETS1 (Engineering Design)', 'CTE Manufacturing 11.E (Automation)', 'AWS SENSE Module 7'],
              questions: [
                'A small fab shop welds 50-100 unique parts per month, none repeated. Would robotic welding help? Why or why not?',
                'Why have welders generally NOT been "replaced" by robots since the 1980s, when robots have been technically capable for decades?',
                'Compare programming a FANUC industrial robot vs a Universal Robots cobot. Which is more accessible to a welder with no prior programming experience?'
              ],
              misconceptions: [
                '"Robots will replace all welders" — robots take repetitive high-volume work; manual welders are still essential for custom + repair + field work.',
                '"Once a robot is programmed, it runs itself" — robots need part loading, periodic maintenance, parameter adjustment for tool wear, defect inspection, recovery from errors.',
                '"Cobots are just slower industrial robots" — cobots have different safety + programming + use cases. They\'re a different category, not a downgrade.'
              ],
              extension: 'Watch a video of a FANUC arc welding robot in operation (search "FANUC arc welding robot cell"). Then watch one of Universal Robots cobot welding. Note differences: speed, safety setup, payload, programming method shown. Map these differences to the kind of shop each fits.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 16: INSPECTION + CWI PREP
      // ─────────────────────────────────────────────────────
      function InspectionCWIPrep() {
        var inspSect = usePersistedState('insp_sect', 'overview');
        var sect = inspSect[0], setSect = inspSect[1];
        var sects = [
          { id: 'overview',    label: '📋 The CWI role' },
          { id: 'visual',      label: '👁 Visual inspection (VT)' },
          { id: 'pt_mt',       label: '🪞 PT + MT — surface defects' },
          { id: 'ut',          label: '📡 Ultrasonic (UT)' },
          { id: 'rt',          label: '☢ Radiographic (RT)' },
          { id: 'et',          label: '🧲 Eddy current (ET)' },
          { id: 'exam',        label: '📝 The CWI exam' }
        ];

        var content;
        if (sect === 'overview') {
          content = h('div', { className: 'space-y-3' },
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'The Certified Welding Inspector (CWI) is the gatekeeper between a finished weld and the customer who accepts it. CWIs apply codes (AWS D1.1, ASME, API) to determine acceptance + rejection of welds, oversee non-destructive testing, audit welder qualifications, and sign off on completed work. Often the only path to certify a fabrication shop\'s output.'),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-amber-900' }, '💰 CWI pay + career'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Salary range: '), '$60-110K per year typical (US). Senior CWIs at refineries + nuclear plants $100-150K+. Independent CWI consultants often bill $90-200/hr for inspection work.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Work environment: '), 'Mix of shop floor + field + office (writing reports). Less physically demanding than welding. Some travel.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Typical entry: '), 'Experienced welder (5-10 years) who decides to move into inspection. The shift from making welds to judging them.')
            ),
            h('div', { className: 'bg-orange-50 border-2 border-orange-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-orange-900 mb-1' }, '🎓 How to become CWI'),
              h('p', { className: 'text-sm text-slate-800' }, 'AWS Certified Welding Inspector — requires combination of education + welding experience (e.g., 5 yr welding + HS = qualified; 2 yr welding + Associate degree in welding tech = qualified). Pass 3-part exam ($1,150 fee). Renew every 3 yr. Maintained by continuing education + active inspection work.')
            )
          );
        } else if (sect === 'visual') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '👁 Visual inspection (VT) — the first + most-used method'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Visual is the most-used + most-misunderstood NDT method. Done with the naked eye + simple tools (flashlight, magnifier, weld gauge, mirror). Detects surface-breaking defects only. Despite simplicity, requires extensive training to do reliably.'),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-4' },
              h('div', { className: 'text-sm font-bold text-amber-900 mb-2' }, '🔧 The inspector\'s VT toolkit'),
              h('ul', { className: 'space-y-1 text-sm text-slate-800' },
                h('li', null, '• ', h('strong', null, 'Adequate lighting: '), '~50 fc (foot-candles) minimum per AWS B5.1. Often flashlight + ambient room light.'),
                h('li', null, '• ', h('strong', null, '5-10x magnifier: '), 'For close inspection of small features.'),
                h('li', null, '• ', h('strong', null, 'Mirror on stick: '), 'For visualizing back side of welds, inside pipe, etc.'),
                h('li', null, '• ', h('strong', null, 'Weld gauge: '), 'Bridge cam, Cambridge, or fillet gauge. Measures bead reinforcement, undercut depth, fillet leg size.'),
                h('li', null, '• ', h('strong', null, 'Pit gauge: '), 'Calipers + depth gauge for measuring defect dimensions.'),
                h('li', null, '• ', h('strong', null, 'Borescope: '), 'For inspecting inside enclosed spaces (pipe, vessel interior).'),
                h('li', null, '• ', h('strong', null, 'Code book + acceptance criteria: '), 'Reference for what\'s acceptable + what\'s not. Cannot work without this.')
              )
            ),
            h('div', { className: 'bg-slate-50 border-2 border-slate-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-slate-900 mb-1' }, '💡 What VT catches'),
              h('p', { className: 'text-sm text-slate-800' }, 'Surface-breaking defects: undercut, overlap, excess reinforcement, insufficient reinforcement, surface porosity, surface cracks, weld profile irregularities, lack of fusion at surface, weld dimension non-conformance (leg size, throat). VT cannot see internal defects — that\'s what other NDT methods are for.')
            )
          );
        } else if (sect === 'pt_mt') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🪞 Surface defect detection — PT + MT'),
            h('div', { className: 'bg-purple-50 border-2 border-purple-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-purple-900' }, 'PT — Liquid Penetrant Testing'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Process: '), 'Clean surface → apply colored or fluorescent penetrant → let it seep into defects → wipe excess → apply developer (white powder) → defects show as colored or fluorescent lines.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Detects: '), 'Surface-breaking defects only. Cracks, porosity, lack of fusion at surface, laps.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Materials: '), 'Any non-porous material. Common on stainless steel, aluminum, nickel alloys. Not useful on porous materials (cast iron).'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Pros: '), 'Cheap, simple, no specialized equipment.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Cons: '), 'Surface only. Time-consuming. Hazardous chemicals.')
            ),
            h('div', { className: 'bg-orange-50 border-2 border-orange-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-orange-900' }, 'MT — Magnetic Particle Testing'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Process: '), 'Magnetize the part with an electromagnet → apply iron particles (dry powder or wet suspension) → particles cluster at flux leakage (where field exits at defects) → defects show as colored lines.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Detects: '), 'Surface + near-surface (within ~1/8") defects. Cracks oriented perpendicular to magnetic field.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Materials: '), 'Ferromagnetic materials only — carbon steel, alloy steel, some stainless (martensitic). Won\'t work on aluminum, copper, austenitic stainless 304/316.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Pros: '), 'Fast, sensitive, catches near-surface defects PT can\'t.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Cons: '), 'Only works on magnetic materials. Demagnetization needed after test for some applications.')
            ),
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-blue-900 mb-1' }, '💡 PT vs MT selection'),
              h('p', { className: 'text-sm text-slate-800' }, 'If material is magnetic (carbon steel, alloy steel) — use MT (faster, more sensitive, finds near-surface). If material is non-magnetic (aluminum, copper, austenitic stainless) — must use PT. Some shops use both: MT for production speed, PT for verification of suspect areas.')
            )
          );
        } else if (sect === 'ut') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '📡 Ultrasonic Testing (UT)'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'UT uses high-frequency sound waves (1-10 MHz) injected into the part via a transducer with coupling gel. Sound reflects off defects + back surface. Time-of-flight + amplitude indicate defect depth + size. Most sensitive volumetric NDT method.'),
            h('div', { className: 'bg-cyan-50 border-2 border-cyan-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-cyan-900' }, '🔧 How UT works'),
              h('p', { className: 'text-sm text-slate-800' }, '1. Transducer (piezoelectric crystal) pressed against surface with couplant gel.'),
              h('p', { className: 'text-sm text-slate-800' }, '2. Transducer pulses sound into the part. Sound travels through metal, reflects off opposite surface, returns.'),
              h('p', { className: 'text-sm text-slate-800' }, '3. Defects in the path also reflect — show up earlier than back surface.'),
              h('p', { className: 'text-sm text-slate-800' }, '4. CRT screen (or now LCD) shows time-of-flight + amplitude. Skilled operator interprets.'),
              h('p', { className: 'text-sm text-slate-800' }, '5. Calibration against reference blocks essential — defect size estimates depend on calibration.')
            ),
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-emerald-900 mb-1' }, '💡 Pros + cons'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Pros: '), 'Detects internal defects + measures depth + size. Sensitive (can find very small defects). Portable. Real-time results. Safe (no radiation).'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Cons: '), 'Requires couplant (gel/oil) so messy. Surface must be smooth. Highly skilled operator needed. Complex geometries (T-joints, intersections) tricky. Doesn\'t produce permanent record (unlike RT).')
            ),
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-blue-900 mb-1' }, '🆕 PAUT — Phased Array UT'),
              h('p', { className: 'text-sm text-slate-800' }, 'Modern UT often uses Phased Array probes (multi-element transducers) + computerized scanning. Generates 2D imagery of defects (vs traditional A-scan single trace). Faster + more visual + better reporting. Increasingly replaces RT for pipe inspection. PAUT certification is the growing path.')
            )
          );
        } else if (sect === 'rt') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '☢ Radiographic Testing (RT)'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'RT uses X-rays or gamma rays to image weld interiors. The part is placed between the radiation source + film/digital detector. Denser metal absorbs more radiation → shows as light areas on the film. Defects (less dense) appear as dark areas. The traditional gold standard for pipe weld inspection.'),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-amber-900' }, '🔧 Two source types'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'X-ray (electronic): '), 'X-rays generated by accelerating electrons. Source can be turned off when not in use. Used in shops + controlled environments. Better image quality.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Gamma (isotope): '), 'Radioactive isotopes (Ir-192, Se-75, Co-60) emit gamma rays continuously. Used in field for pipeline + remote work. Source MUST be shielded — radiation incidents have killed pipeline workers.')
            ),
            h('div', { className: 'bg-rose-50 border-2 border-rose-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-rose-900 mb-1' }, '⚠ Radiation safety'),
              h('p', { className: 'text-sm text-slate-800' }, 'RT is the most dangerous NDT method. Radiation exposure is cumulative + cancer-causing. Strict procedures: exclusion zones (typically 100+ ft radius), dosimeter badges, lead shielding, only certified RT technicians operate. NRC + OSHA highly regulated.')
            ),
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-emerald-900 mb-1' }, '💡 Pros + cons'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Pros: '), 'Creates permanent film/digital record (legal documentation). Detects volumetric defects (porosity, slag inclusions, lack of fusion, cracks transverse to bead). Standard for code-required pipe work.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Cons: '), 'Radiation hazard. Requires expensive equipment + lead shielding. Time-consuming setup. Cracks parallel to film direction may not show. Less sensitive than PAUT for many crack types.')
            )
          );
        } else if (sect === 'et') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🧲 Eddy Current Testing (ET)'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'ET induces eddy currents in conductive material via electromagnetic coil. Surface + near-surface defects disrupt the eddy current pattern + the coil senses the change. Used heavily in aerospace + nuclear for crack detection + heat exchanger tube inspection.'),
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-blue-900' }, '🔧 How ET works'),
              h('p', { className: 'text-sm text-slate-800' }, '1. Coil generates alternating magnetic field near surface of conductive material.'),
              h('p', { className: 'text-sm text-slate-800' }, '2. Eddy currents induced in the material flow in circular patterns parallel to surface.'),
              h('p', { className: 'text-sm text-slate-800' }, '3. Defects (cracks, voids, conductivity changes) disrupt eddy current flow → impedance of coil changes.'),
              h('p', { className: 'text-sm text-slate-800' }, '4. Coil impedance change is displayed on instrument; operator interprets.')
            ),
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-emerald-900 mb-1' }, '💡 Use cases'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Common applications: '), 'Heat exchanger tube inspection (most common ET use), aerospace structural inspection (fast surface crack detection), conductivity measurement (sorting alloys), coating thickness measurement.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Limitations: '), 'Only conductive materials. Depth limited to ~1/4" (skin effect). Surface must be accessible. Calibration sensitive.')
            )
          );
        } else if (sect === 'exam') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '📝 The AWS CWI Exam'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'The CWI exam is one of the more demanding professional certifications in welding. Three parts, each 2 hours, given over 9 hours one day:'),
            h('div', { className: 'space-y-2' },
              [{ part: 'Part A — Fundamentals', desc: '150 multiple-choice questions. Welding processes, metallurgy, weld design, distortion + residual stress, weld + base metal discontinuities, destructive + non-destructive examination, joint design, welding symbols, basic codes + standards. Open book — bring AWS reference materials.' },
               { part: 'Part B — Hands-on', desc: '46 multiple choice. Visual inspection of weld samples — identify defects, measure dimensions, apply acceptance criteria. Uses physical weld coupons in the test room. Inspector applies code criteria to actual welds.' },
               { part: 'Part C — Code book', desc: '60 multiple choice. Based on a code book chosen at registration — usually AWS D1.1 or ASME IX or API 1104. Tests ability to find + apply specific code provisions. Open book — must navigate the code efficiently.' }].map(function(p, i) {
                return h('div', { key: i, className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
                  h('div', { className: 'font-black text-amber-900 mb-1' }, p.part),
                  h('p', { className: 'text-sm text-slate-800' }, p.desc)
                );
              })
            ),
            h('div', { className: 'bg-rose-50 border-2 border-rose-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-rose-900 mb-1' }, '⚠ Pass rates'),
              h('p', { className: 'text-sm text-slate-800' }, 'Approximately 50-65% pass on first attempt. Part C (code book) is typically the hardest — many candidates have never used a code book under time pressure. ~$1,150 fee per exam attempt. AWS-approved prep courses ($500-3000) significantly improve pass rates.')
            ),
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-emerald-900 mb-1' }, '🎓 Preparation strategy'),
              h('ul', { className: 'space-y-1 text-sm text-slate-800' },
                h('li', null, '1. Buy the AWS WI Manual + Online Self-Assessment ($150). Take + review repeatedly.'),
                h('li', null, '2. Take an AWS-approved seminar (one week immersive). $1500-3000. Highest ROI for first-time test-takers.'),
                h('li', null, '3. For Part C: practice with the actual code book you\'ll bring. Tab key sections. Time yourself looking up references.'),
                h('li', null, '4. For Part B: get hands-on with weld samples + practice applying acceptance criteria. Some local AWS sections offer practice clinics.'),
                h('li', null, '5. Use AWS QC1 + AWS B5.1 (Specification for the Qualification of Welding Inspectors) as study foundations.')
              )
            )
          );
        }

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🧐', title: 'Welding Inspection / CWI Prep' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'flex flex-wrap gap-2' },
              sects.map(function(s) {
                var sel = (sect === s.id);
                return h('button', {
                  key: s.id,
                  onClick: function() { setSect(s.id); announce(s.label); },
                  className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition focus:outline-none focus:ring-2 ring-amber-500/40 ' +
                    (sel ? 'bg-amber-700 text-white border-amber-800' : 'bg-white text-slate-800 border-slate-300 hover:border-amber-400')
                }, s.label);
              })
            ),
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' }, content),
            h(TeacherNotes, {
              standards: ['AWS QC1 (CWI requirements)', 'AWS B5.1 (Specification for CWI)', 'ASNT TC-1A (NDT certification)'],
              questions: [
                'A CWI examines a fillet weld + finds 1/16" undercut along most of one toe. AWS D1.1 allows undercut up to 1/32" in statically loaded structures. Reject? Why?',
                'PAUT (Phased Array Ultrasonic) is increasingly replacing RT for pipeline inspection. List 3 reasons why.',
                'What\'s the difference between a CWI + a CAWI (Certified Associate Welding Inspector)? Which would you become first + why?'
              ],
              misconceptions: [
                '"NDT means the weld is good" — NDT only finds defects detectable by that specific method. PT finds surface cracks. UT finds internal defects. Each has blind spots.',
                '"X-ray finds everything" — RT can miss cracks parallel to the film direction. PAUT often catches what RT misses for crack orientation.',
                '"Once a CWI, always a CWI" — must renew every 3 years + maintain continuing education + active inspection work.'
              ],
              extension: 'Find an AWS CWI Body of Knowledge online. Look at the topics. Note which ones you already understand from earlier modules (heat input, defects, codes) + which would require new study. Most experienced welders can pass with focused 3-6 month prep.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 17: CONSUMABLES DEEP-DIVE
      // ─────────────────────────────────────────────────────
      function ConsumablesDeepDive() {
        var cSect = usePersistedState('cons_sect', 'overview');
        var sect = cSect[0], setSect = cSect[1];
        var consModeState = usePersistedState('cons_mode', 'browse'); // 'browse' | 'scenarios'
        var consMode = consModeState[0], setConsMode = consModeState[1];
        var consScIdxState = usePersistedState('cons_sc_idx', 0);
        var consScIdx = consScIdxState[0], setConsScIdx = consScIdxState[1];
        var consScScoreState = usePersistedState('cons_sc_score', 0);
        var consScScore = consScScoreState[0], setConsScScore = consScScoreState[1];
        var consScPickedState = usePersistedState('cons_sc_picked', null);
        var consScPicked = consScPickedState[0], setConsScPicked = consScPickedState[1];

        var sects = [
          { id: 'overview',    label: '📋 Overview' },
          { id: 'sticks',      label: '🪄 Stick electrodes' },
          { id: 'mig_wires',   label: '🪢 MIG + FCAW wires' },
          { id: 'tig_rods',    label: '✏ TIG filler rods + tungsten' },
          { id: 'gases',       label: '💨 Shielding gases' },
          { id: 'storage',     label: '📦 Storage + handling' },
          { id: 'cost',        label: '💰 Cost economics' }
        ];

        // ── Pick-the-Right-Consumable scenarios ──
        // Each scenario describes a real job. Student picks the best
        // consumable combo. Wrong picks teach the failure mode.
        var consScenarios = [
          {
            title: 'Pipeline root pass on cross-country line',
            scenario: 'You are welding the root pass of a 36" buried gas transmission pipeline. Joint is open V-groove. Position is fixed 5G (rolled by hand). Outdoor work, sometimes windy. Need fast-freeze characteristics so the root doesn\'t sag.',
            options: [
              'E6010 stick electrode on DC+',
              'E7018 stick electrode on AC',
              'ER70S-6 solid wire with C25 gas (MIG)',
              'ER308L TIG rod with 100% argon'
            ],
            correct: 0,
            explain: 'E6010 (high-cellulose sodium coating) is THE pipeline root electrode. Deep penetration + fast-freeze = root won\'t sag overhead. Wind tolerance is good (no gas to blow away). 7018 is too sluggish for root; MIG needs wind shielding; TIG is too slow for production pipeline.'
          },
          {
            title: 'Structural beam-to-column weld for high-rise',
            scenario: 'You are welding a 3/4" thick W-shape beam to a column flange. AWS D1.1 structural code work. Inspector is on site. Joint is 2F horizontal fillet. Indoor (climate-controlled). Need certifiable low-hydrogen practice.',
            options: [
              'E6011 stick (works on AC)',
              'E7018 stick electrode (kept in hot box)',
              'E71T-GS self-shielded flux-cored',
              'ER70S-3 with 100% CO2'
            ],
            correct: 1,
            explain: 'E7018 is THE structural code electrode. Low-hydrogen coating = no cold cracking risk. AWS D1.1 essentially requires it for important structural work. Must be hot-stored (250°F+) to keep coating dry. E6011 is for repair; E71T-GS is too rough for code; ER70S-3 with CO2 is OK but stick is the inspector\'s default.'
          },
          {
            title: 'Auto body repair on rusty quarter panel',
            scenario: 'Customer brings in a 1990s pickup with rust holes in the rear quarter panel. Sheet metal is 20 gauge (thin). Surface is rusty + has some old undercoating. You need a wire that\'s tolerant of contamination.',
            options: [
              'ER70S-2 0.024" wire with C25 gas',
              'ER70S-3 0.030" wire with 100% CO2',
              'ER70S-6 0.024" wire with C25 gas',
              'ER4043 0.035" wire with 100% argon'
            ],
            correct: 2,
            explain: 'ER70S-6 has the highest Mn + Si content = most tolerant of rust + contamination. 0.024" thin wire for sheet metal (avoids burnthrough). C25 gas for smooth bead with minimal spatter. ER4043 is for ALUMINUM only (wrong metal). ER70S-2 also good but typically used for higher-end clean work.'
          },
          {
            title: 'Stainless food-grade dairy tank repair',
            scenario: 'A 304L stainless dairy holding tank has a leak at a weld. Tank thickness 0.10" (light gauge). Repair must be sanitary (smooth bead, no crevices). Indoor. You will use TIG.',
            options: [
              'ER70S-6 TIG rod with C25 gas',
              'ER308 TIG rod with 100% argon',
              'ER308L TIG rod with 100% argon',
              'ER4043 TIG rod with argon-helium mix'
            ],
            correct: 2,
            explain: 'ER308L (low-carbon stainless) is the right match for 304L base metal. Low carbon prevents carbide precipitation (sensitization) that would ruin corrosion resistance at the dairy pH + temperature cycling. ER308 (regular carbon) would risk sensitization. 100% argon is standard TIG gas. ER70S is mild steel (wrong); 4043 is aluminum (wrong).'
          },
          {
            title: 'Aluminum extrusion bracket (6061-T6)',
            scenario: 'You\'re fabricating brackets from 1/4" 6061-T6 aluminum extrusion. Material is 6000-series (silicon + magnesium alloy). Customer wants smooth appearance and good fatigue resistance. You\'re using MIG.',
            options: [
              'ER4043 wire with 100% argon',
              'ER5356 wire with 100% argon',
              'ER70S-6 wire with C25',
              'ER308L wire with 100% argon'
            ],
            correct: 0,
            explain: 'ER4043 (Al-Si alloy) is the standard match for 6061 aluminum — easier to use, smoother bead, better cosmetic appearance. ER5356 is stronger but harder to use + slightly grainier bead (better for 5xxx-series marine alloys). ER70S is steel wire (wrong); ER308L is stainless (wrong).'
          },
          {
            title: 'Welding rebar (#5) for a foundation repair',
            scenario: 'A residential foundation needs additional rebar tied into existing structure. Bars are #5 Grade 60 (5/8" diameter mild steel). Indoor crawl space, awkward positions. Quick work — not code/structural inspected.',
            options: [
              'E6011 stick electrode on AC',
              'E7018 stick electrode in dry can',
              'ER70S-6 MIG with C25',
              'ER4043 MIG with argon'
            ],
            correct: 0,
            explain: 'E6011 is the right call for non-code rebar work. Versatile — runs on cheap AC machines, tolerates dirty/rusty metal (rebar often is). All-positions for the awkward crawl space angles. E7018 is overkill (not code work). MIG is awkward in tight spaces (need to drag the gun + hose).'
          },
          {
            title: 'TIG-welding 1/8" aluminum boat hull (AC)',
            scenario: 'Boat hull repair on a Lund aluminum fishing boat. 5052 aluminum (marine-grade), 1/8" thick. Boatyard work, climate-controlled. AC TIG (alternating current cleans oxide layer). Need tungsten that handles AC well.',
            options: [
              '2% thoriated tungsten ground to a sharp point',
              '1.5% lanthanated tungsten balled at tip',
              'Pure tungsten ground to a sharp point',
              '2% ceriated tungsten ground to a sharp point'
            ],
            correct: 1,
            explain: '1.5% lanthanated (gold tip) is the modern AC-friendly tungsten. Balled tip (not pointed) is correct for AC — the heat from AC reverse-polarity melts the tip into a ball that conducts current cleanly. Sharp-pointed tungsten on AC will erode + spit. Pure tungsten (green) is the old AC standard but lanthanated has replaced it.'
          },
          {
            title: 'High-production fillet welding on 1/2" plate',
            scenario: 'Shop produces snowplow blades. Job: 8 ft of 5/16" fillet weld per blade, flat position. You weld 40 blades per shift. Cost-per-foot matters. The customer doesn\'t care about cosmetic bead — function over form.',
            options: [
              'E7018 stick electrode',
              'ER70S-6 with C25 gas (short-circuit MIG)',
              'E70T-1 gas-shielded FCAW',
              'ER308L TIG'
            ],
            correct: 2,
            explain: 'E70T-1 (gas-shielded flux-cored) is the production king for plate work. Deposition rate 2-3x stick, smooth bead, slag covers as it cools. Short-circuit MIG would work but is slower (8-15 lb/hr vs 15-25 for FCAW). Stick is way too slow for 40 blades/shift. TIG is wrong process entirely.'
          }
        ];

        function pickConsAnswer(i) {
          if (consScPicked != null) return;
          setConsScPicked(i);
          if (i === consScenarios[consScIdx].correct) {
            setConsScScore(consScScore + 1);
            announce('Correct!');
          } else {
            announce('Not quite — see the explanation.');
          }
        }
        function nextConsScenario() {
          var ni = (consScIdx + 1) % consScenarios.length;
          setConsScIdx(ni);
          setConsScPicked(null);
          if (ni === 0) announce('Restarted at scenario 1.');
        }
        function resetConsQuiz() {
          setConsScIdx(0); setConsScScore(0); setConsScPicked(null);
          announce('Scenario quiz reset');
        }
        var curScenario = consScenarios[consScIdx] || consScenarios[0];

        var content;
        if (sect === 'overview') {
          content = h('div', { className: 'space-y-3' },
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Welding consumables (electrodes, wires, rods, gases, flux) are the variable cost of every weld. Picking the right consumable for the job is half the welder\'s skill — wrong electrode + same machine + same hands = bad weld + cracked joint + wasted time + rejected work.'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'This module covers the consumables system in depth: electrode classifications (what the numbers mean), wire selection, shielding gas mixes, storage requirements, cost economics. Every welder needs working fluency.'),
            h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-fuchsia-900' }, '🎯 Quick consumable map by process'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'SMAW (stick): '), 'Coated electrodes (E6010, 6011, 6013, 7018, 7024). No shielding gas (flux coating provides). Available in 1/16" to 3/16" diameters.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'GMAW (MIG): '), 'Solid wire (ER70S-3, S-6) on spool + shielding gas (CO2, C25, argon mixes). Wire 0.024" to 0.045" typical.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'FCAW (Flux-Cored): '), 'Tubular wire with flux inside. Two types: self-shielded (E71T-11) needs no gas; gas-shielded (E70T-1) uses CO2.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'GTAW (TIG): '), 'Tungsten electrode (non-consumable) + separate filler rod (ER70S-2/3/6, ER308 for stainless, ER4043/5356 for aluminum) + shielding gas (100% argon usually).'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'OFW (Oxy-Fuel): '), 'No electrode — torch combines oxygen + acetylene. Filler rod separate (RG45 for steel, similar to ER70S series).')
            )
          );
        } else if (sect === 'sticks') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🪄 Stick (SMAW) electrode classifications — decoding AWS A5.1'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'AWS electrode classification looks like "E7018." Each character means something:'),
            h('div', { className: 'bg-slate-50 border-2 border-slate-300 rounded-xl p-4' },
              h('div', { className: 'font-mono text-lg text-center font-bold text-slate-900 mb-2' }, 'E70 18'),
              h('div', { className: 'text-sm text-slate-800 space-y-1' },
                h('div', null, h('strong', { className: 'font-mono' }, 'E '), '= Electrode'),
                h('div', null, h('strong', { className: 'font-mono' }, '70 '), '= 70,000 psi minimum tensile strength (E80 = 80 ksi, etc.)'),
                h('div', null, h('strong', { className: 'font-mono' }, '1 '), '= All positions (2 = horizontal + flat only, 4 = flat + horizontal + overhead vertical-down)'),
                h('div', null, h('strong', { className: 'font-mono' }, '8 '), '= Coating type + recommended current — see table below')
              )
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800 mt-3' }, 'The major stick electrodes you\'ll encounter:'),
            h('div', { className: 'space-y-2' },
              [{ name: 'E6010', tens: '60 ksi', pos: 'All positions', current: 'DC+ only (cellulosic)', coating: 'High-cellulose sodium', use: 'Pipeline root pass, structural where penetration matters. Aggressive deep-penetrating arc, "digs" into base metal. Fast-freeze (works overhead). The pipeliner\'s electrode. Iconic for cross-country pipeline.' },
               { name: 'E6011', tens: '60 ksi', pos: 'All positions', current: 'AC, DC+, DC-', coating: 'High-cellulose potassium', use: 'Like 6010 but runs on AC machines too (small farm shop, transformer welder). Slightly less penetration than 6010. Rusty/dirty metal forgiving. The handyman\'s electrode.' },
               { name: 'E6013', tens: '60 ksi', pos: 'All positions', current: 'AC, DC+, DC-', coating: 'High-titania potassium', use: 'Easy-to-strike, smooth running, mild penetration. Beginner-friendly. Good for sheet metal + cosmetic welds. Less penetration = wrong choice for structural.' },
               { name: 'E7014', tens: '70 ksi', pos: 'All positions', current: 'AC, DC+, DC-', coating: 'Iron-powder titania', use: 'Iron powder in coating = higher deposition rate. Good for production work on plate. Easier to control than 6010 but more spatter than 7018.' },
               { name: 'E7018', tens: '70 ksi', pos: 'All positions', current: 'AC, DC+', coating: 'Low-hydrogen potassium iron powder', use: 'THE structural electrode. Low-hydrogen coating = minimal cold cracking risk. Smooth arc, beautiful bead, low spatter. Required for AWS D1.1 structural work. MUST be hot-stored (250°F+).' },
               { name: 'E7024', tens: '70 ksi', pos: 'Flat + horizontal only', current: 'AC, DC+, DC-', coating: 'Heavy iron-powder titania', use: 'Very high deposition rate (~50% more iron in bead than 7018). "Drag rod" — you literally drag it along the joint. Used for fast production fillet welds on plate.' },
               { name: 'E8018-B2', tens: '80 ksi', pos: 'All', current: 'AC, DC+', coating: 'Low-hydrogen with chrome-moly alloy', use: 'For Cr-Mo alloy steels (refinery + power piping). Pre-heat + interpass control required. Specialty electrode.' },
               { name: 'E11018-M', tens: '110 ksi', pos: 'All', current: 'AC, DC+', coating: 'Low-hydrogen military-grade', use: 'High-strength low-alloy electrode for military + heavy structural. Bath Iron Works uses similar high-strength low-hydrogen for warship hulls.' }].map(function(e, i) {
                return h('div', { key: i, className: 'bg-white border-2 border-fuchsia-200 rounded-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1 flex-wrap' },
                    h('span', { className: 'font-mono font-bold text-fuchsia-900 text-lg' }, e.name),
                    h('span', { className: 'text-xs font-mono text-fuchsia-700' }, e.tens + ' · ' + e.current)
                  ),
                  h('p', { className: 'text-xs text-slate-700 mb-1' }, h('strong', null, 'Coating: '), e.coating + ' · ' + h('strong', null, 'Position: '), e.pos),
                  h('p', { className: 'text-sm text-slate-800' }, e.use)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '💡 Picking the right stick electrode'),
              h('ul', { className: 'text-sm text-slate-800 space-y-1' },
                h('li', null, '• ', h('strong', null, 'Quick farm/repair work: '), 'E6011 (works on any machine, dirty metal OK).'),
                h('li', null, '• ', h('strong', null, 'Pipeline root pass: '), 'E6010 (deep penetration, fast freeze).'),
                h('li', null, '• ', h('strong', null, 'Structural code work: '), 'E7018 (low hydrogen, smooth bead, AWS-required).'),
                h('li', null, '• ', h('strong', null, 'Production fillets, flat position: '), 'E7024 (drag-rod speed).'),
                h('li', null, '• ', h('strong', null, 'Sheet metal cosmetic: '), 'E6013 (smooth, low penetration).'),
                h('li', null, '• ', h('strong', null, 'High-strength alloy steel: '), 'E8018-B2 or higher with preheat + low-hydrogen practice.')
              )
            )
          );
        } else if (sect === 'mig_wires') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🪢 MIG (GMAW) + FCAW wire classifications — AWS A5.18 / A5.20'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'MIG wires are solid or composite (FCAW). Both are continuous-feed from a spool. AWS classification looks like "ER70S-6":'),
            h('div', { className: 'bg-slate-50 border-2 border-slate-300 rounded-xl p-4' },
              h('div', { className: 'font-mono text-lg text-center font-bold text-slate-900 mb-2' }, 'ER 70 S - 6'),
              h('div', { className: 'text-sm text-slate-800 space-y-1' },
                h('div', null, h('strong', { className: 'font-mono' }, 'ER '), '= Electrode + Rod (solid wire; usable as TIG filler too)'),
                h('div', null, h('strong', { className: 'font-mono' }, '70 '), '= 70 ksi tensile strength'),
                h('div', null, h('strong', { className: 'font-mono' }, 'S '), '= Solid wire (vs C for composite/cored)'),
                h('div', null, h('strong', { className: 'font-mono' }, '6 '), '= Chemistry — different additives (Mn, Si, Ti, Al, Zr) for different needs')
              )
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800 mt-3' }, 'Common solid MIG wires:'),
            h('div', { className: 'space-y-2' },
              [{ name: 'ER70S-2', desc: 'Triple-deoxidized (Al, Ti, Zr added). Most clean MIG wire. Best for: contaminated/rusty base metal, primer-coated steel. Often used by farm + repair welders.' },
               { name: 'ER70S-3', desc: 'Standard MIG wire. Modest deoxidation. Best for: clean, new mild steel in fabrication shops. Most economical.' },
               { name: 'ER70S-4', desc: 'Higher Mn + Si than S-3. Better for: light mill scale on steel. Slightly stronger weld.' },
               { name: 'ER70S-6', desc: 'Highest Mn + Si content. Best for: rusty/dirty/galvanized steel, autobody work. The #1-selling MIG wire because it tolerates real-world conditions.' },
               { name: 'ER70S-7', desc: 'Specialty — high Mn for thicker steel. Less common.' },
               { name: 'ER308 / 308L', desc: 'Stainless MIG wire for 304/304L stainless. 308 has higher carbon; 308L is low-carbon (recommended for code work to avoid sensitization).' },
               { name: 'ER316 / 316L', desc: 'Stainless MIG wire for 316/316L (more corrosion-resistant grade — molybdenum added). For marine + chemical applications.' },
               { name: 'ER4043', desc: 'Aluminum MIG wire — 5% silicon. Best for: 6061 + 6063 aluminum (most extrusions). Easy to use; bead has darker tinge.' },
               { name: 'ER5356', desc: 'Aluminum MIG wire — 5% magnesium. Best for: 5052 + 5083 + 6061 (some). Stronger than 4043, harder to use. Better for marine + structural.' }].map(function(w, i) {
                return h('div', { key: i, className: 'bg-fuchsia-50 border-l-4 border-fuchsia-400 rounded-r-xl p-3' },
                  h('div', { className: 'font-mono font-bold text-fuchsia-900 mb-1' }, w.name),
                  h('p', { className: 'text-sm text-slate-800' }, w.desc)
                );
              })
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800 mt-3' }, 'FCAW wires (flux-cored):'),
            h('div', { className: 'space-y-2' },
              [{ name: 'E70T-1', desc: 'Gas-shielded FCAW. Smooth bead, low spatter, slag covers bead for protection while cooling. Best for: indoor production welding on plate. Faster than solid MIG.' },
               { name: 'E71T-1', desc: 'Like E70T-1 but all-positions (1 vs 0 in classification = all-position). Common for structural fabrication.' },
               { name: 'E70T-11', desc: 'Self-shielded FCAW (no gas needed). Best for: outdoor work, field repair, wind-affected environments. Less smooth bead than gas-shielded but no gas cylinder to lug around.' },
               { name: 'E71T-GS', desc: 'Self-shielded all-positions FCAW. Used in homeowner-grade MIG machines without gas. Cheap + tolerant but bead quality limited.' }].map(function(w, i) {
                return h('div', { key: i, className: 'bg-purple-50 border-l-4 border-purple-400 rounded-r-xl p-3' },
                  h('div', { className: 'font-mono font-bold text-purple-900 mb-1' }, w.name),
                  h('p', { className: 'text-sm text-slate-800' }, w.desc)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '💡 Wire diameter selection'),
              h('p', { className: 'text-sm text-slate-800' }, '0.024" — thin sheet metal (autobody, 22 ga). 0.030" — light gauge (16-12 ga). 0.035" — most common general work (1/8"-3/8"). 0.045" — heavy plate (3/8"+) + production work. Bigger wire = more amperage required = more deposition rate but less control.')
            )
          );
        } else if (sect === 'tig_rods') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '✏ TIG (GTAW) consumables — rods + tungsten + gas'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'TIG uses a non-consumable tungsten electrode (doesn\'t become part of the weld) + a separate filler rod that the welder dips into the puddle. Both selection + tungsten preparation matter.'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Tungsten electrodes — color-coded tip!'),
            h('div', { className: 'space-y-2' },
              [{ name: '2% Thoriated (EWTh-2)', color: 'Red tip', use: 'Older standard for DC TIG on steel. Slightly radioactive (thorium). Excellent arc starts. Still common but being phased out for safety reasons.' },
               { name: '2% Lanthanated (EWLa-2)', color: 'Blue tip', use: 'Modern replacement for thoriated. Comparable performance, no radioactivity. Increasingly the default for DC steel work.' },
               { name: '2% Ceriated (EWCe-2)', color: 'Orange tip', use: 'Good for both AC + DC. Lower amp startup. Used for thin material + aluminum applications.' },
               { name: '1.5% Lanthanated (EWLa-1.5)', color: 'Gold tip', use: 'General-purpose. Works AC or DC. Good all-around tungsten.' },
               { name: 'Pure tungsten (EWP)', color: 'Green tip', use: 'Old standard for AC aluminum. Forms a ball at the tip when heated (good for AC current flow). Now being replaced by ceriated/lanthanated.' },
               { name: '0.8% Zirconiated (EWZr-1)', color: 'White tip', use: 'AC welding aluminum — replacement for pure tungsten. Holds shape better.' }].map(function(t, i) {
                return h('div', { key: i, className: 'bg-fuchsia-50 border-2 border-fuchsia-200 rounded-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1 flex-wrap' },
                    h('span', { className: 'font-mono font-bold text-fuchsia-900' }, t.name),
                    h('span', { className: 'text-xs text-fuchsia-700' }, t.color)
                  ),
                  h('p', { className: 'text-sm text-slate-800' }, t.use)
                );
              })
            ),
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-blue-900 mb-1' }, '💡 Tungsten preparation'),
              h('p', { className: 'text-sm text-slate-800' }, 'DC TIG: grind tungsten to a sharp point (pencil-tip). Grinding marks should run lengthwise (along electrode), not circumferentially (around). AC TIG: ball the tip by striking arc on scrap; the heat melts the tip into a smooth ball. Dirty/contaminated tungsten = poor arc start + bad weld. Re-grind every time you touch the filler rod by accident.')
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800 mt-3' }, 'TIG filler rods:'),
            h('p', { className: 'text-sm text-slate-800' }, 'TIG filler rods use the same classification as MIG wires (ER70S-2, ER70S-6, ER308, ER4043, etc.). The rod is 36" long, ~1/16" to 3/32" diameter, fed manually into the weld puddle by the welder\'s other hand. The choice depends on base metal + intended weld properties.')
          );
        } else if (sect === 'gases') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '💨 Shielding gas mixes — what to use for what'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Shielding gas protects the molten weld pool from atmospheric oxygen + nitrogen. The wrong gas = porosity + poor penetration + bad arc characteristics.'),
            h('div', { className: 'space-y-2' },
              [{ mix: '100% CO2', proc: 'MIG steel only', cost: 'Cheapest', deep_pen: 'Yes', spatter: 'High', use: 'Budget MIG welding on mild steel. Deep penetration. Lots of spatter (need anti-spatter spray). Old-school standard before C25 became cheap.' },
               { mix: '75% Argon / 25% CO2 (C25)', proc: 'MIG steel', cost: 'Moderate', deep_pen: 'Yes', spatter: 'Low', use: 'THE most common MIG shielding gas. Good penetration with minimal spatter. Default unless project specifies otherwise.' },
               { mix: '90% Argon / 10% CO2 (C10)', proc: 'MIG steel', cost: 'Higher', deep_pen: 'Less', spatter: 'Very low', use: 'Spray transfer + better bead appearance on stainless or mild steel where appearance matters.' },
               { mix: '98% Argon / 2% O2 (TriMix)', proc: 'MIG stainless', cost: 'High', deep_pen: 'Moderate', spatter: 'Very low', use: 'Stainless MIG. Trace O2 stabilizes the arc on stainless without compromising corrosion resistance.' },
               { mix: '100% Argon', proc: 'TIG all metals, MIG aluminum', cost: 'High', deep_pen: 'No', spatter: 'None (TIG)', use: 'Standard TIG gas. Required for aluminum (CO2 + aluminum = bad chemistry). Argon is heavier than air so blankets the puddle well.' },
               { mix: 'Argon-Helium (Ar/He mixes)', proc: 'TIG aluminum + copper, MIG aluminum thick sections', cost: 'Very high', deep_pen: 'Yes', spatter: 'None (TIG)', use: 'Helium adds heat (hotter arc) for thick aluminum + copper. Common mixes: 75/25, 50/50, 25/75. Expensive but necessary for heavy aluminum.' },
               { mix: 'C2 (98%Ar/2%CO2)', proc: 'MIG pulse + spray transfer', cost: 'Moderate-high', deep_pen: 'Less', spatter: 'Very low', use: 'Spray transfer MIG (higher voltage above ~24V). Used in heavy production work.' },
               { mix: '100% Acetylene + O2', proc: 'Oxy-fuel welding + cutting', cost: 'Low', deep_pen: 'N/A', spatter: 'N/A', use: 'Oxy-acetylene flame for OFW + cutting. Neutral flame (1:1 ratio) for general welding. Carburizing (excess acetylene) for hardening. Oxidizing (excess O2) for brass + bronze.' }].map(function(g, i) {
                return h('div', { key: i, className: 'bg-purple-50 border-2 border-purple-200 rounded-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1 flex-wrap' },
                    h('span', { className: 'font-bold text-purple-900' }, g.mix),
                    h('span', { className: 'text-xs font-mono text-purple-700' }, g.proc + ' · ' + g.cost)
                  ),
                  h('div', { className: 'flex gap-3 text-xs text-slate-700 mb-1' },
                    h('span', null, h('strong', null, 'Deep pen: '), g.deep_pen),
                    h('span', null, h('strong', null, 'Spatter: '), g.spatter)
                  ),
                  h('p', { className: 'text-sm text-slate-800' }, g.use)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '💡 Flow rate basics'),
              h('p', { className: 'text-sm text-slate-800' }, 'Typical: 20-35 CFH (cubic feet/hour) for MIG. 15-25 CFH for TIG. Too low = porosity. Too high = turbulent flow that SUCKS atmosphere in = porosity. Both extremes cause same defect. Sweet spot is your machine\'s recommended range adjusted for breeze + nozzle distance.')
            )
          );
        } else if (sect === 'storage') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '📦 Consumable storage + handling — why it matters'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Damp consumables cause hydrogen-induced cold cracking. Contaminated consumables cause weld defects. Most "the welder couldn\'t get good penetration" complaints are actually consumable problems.'),
            h('div', { className: 'space-y-2' },
              [{ item: 'Low-hydrogen electrodes (E7018, E7028, E8018)', requirements: 'Hot storage at 250°F minimum. Once removed from sealed can, can be rebaked if back in oven within 4 hr; after that, may be permanently damaged. Many fabricators rebake at 700-800°F for 1-2 hr if reusing.' },
               { item: 'Standard cellulosic electrodes (E6010, E6011)', requirements: 'Dry storage at ambient temperature. The cellulose coating actually NEEDS some moisture to work. Don\'t bake these — you\'ll ruin them. Just keep them dry.' },
               { item: 'MIG wire', requirements: 'Keep covered when not in use. Once you open the spool, it picks up moisture + rust within days in humid environments. Use plastic spool covers + return wire to packaging between uses.' },
               { item: 'TIG filler rods', requirements: 'Store in tubes/canisters. Don\'t lay loose on dirty shop benches — picks up oil, grease, sweat, salt. Wipe clean before use.' },
               { item: 'Tungsten electrodes', requirements: 'Sturdy storage box. Tip is fragile (especially when ground to a point) + contamination = bad arc start. Keep ground tungstens tip-down in foam.' },
               { item: 'Shielding gas cylinders', requirements: 'Secured upright with chains. Capped when not in use. Out of sun (heat raises pressure, dangerous). Don\'t store full + empty mixed. Hydrostatic test every 5-10 years per CGA standards.' }].map(function(s, i) {
                return h('div', { key: i, className: 'bg-fuchsia-50 border-l-4 border-fuchsia-400 rounded-r-xl p-3' },
                  h('div', { className: 'font-bold text-fuchsia-900 mb-1' }, s.item),
                  h('p', { className: 'text-sm text-slate-800' }, s.requirements)
                );
              })
            ),
            h('div', { className: 'bg-rose-50 border-2 border-rose-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-rose-900 mb-1' }, '⚠ Damp E7018 — the killer'),
              h('p', { className: 'text-sm text-slate-800' }, 'A welder uses E7018 from a can that\'s been open for 3 days. The coating has absorbed moisture. When struck, the moisture dissociates → hydrogen enters the weld pool → diffuses into HAZ → 24-48 hr later, cold crack. Weld fails inspection or fails in service. NEVER trust E7018 from an unsealed can. When in doubt, rebake.')
            )
          );
        } else if (sect === 'cost') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '💰 Consumable economics — cost per pound of weld'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'For estimating purposes, welders + shops calculate "cost per pound of deposited weld metal." Includes consumable cost + labor cost + machine time. Process choice has huge cost implications.'),
            h('div', { className: 'space-y-2' },
              [{ proc: 'SMAW (stick)', dep_rate: '2-5 lb/hr', eff: '60-75%', cost: '$3-5/lb electrode', total: '~$30-50/lb weld', note: 'Lowest deposit rate. Lots of waste (stubs + flux). But low equipment cost + portable.' },
               { proc: 'GMAW (MIG, short-circuit)', dep_rate: '4-10 lb/hr', eff: '90-95%', cost: '$2-4/lb wire + gas', total: '~$15-25/lb weld', note: 'Faster than stick. Most popular for plate fabrication. Higher equipment cost (machine + gas).' },
               { proc: 'GMAW (MIG, spray transfer)', dep_rate: '10-25 lb/hr', eff: '90-95%', cost: '$2-4/lb wire + gas', total: '~$12-20/lb weld', note: 'Much faster than short-circuit. Flat + horizontal only. Heavy fabrication.' },
               { proc: 'FCAW (flux-cored, gas-shielded)', dep_rate: '8-30 lb/hr', eff: '80-90%', cost: '$2.50-5/lb wire + gas', total: '~$15-30/lb weld', note: 'Fastest of common processes. Heavy industrial work (structural, shipbuilding, mining equipment).' },
               { proc: 'GTAW (TIG)', dep_rate: '0.5-2 lb/hr', eff: '95-100%', cost: '$8-25/lb filler + gas', total: '~$80-200/lb weld', note: 'Lowest deposit rate, highest cost per pound. ONLY used where quality + appearance + corrosion resistance justify cost.' },
               { proc: 'SAW (Submerged Arc — automated)', dep_rate: '10-100 lb/hr', eff: '95%+', cost: '$1.50-3/lb wire + flux', total: '~$8-15/lb weld', note: 'Lowest cost per pound. Automated only. Used for huge plates, ships, pipe seam welding.' }].map(function(p, i) {
                return h('div', { key: i, className: 'bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1 flex-wrap' },
                    h('span', { className: 'font-bold text-emerald-900' }, p.proc),
                    h('span', { className: 'font-mono text-xs text-emerald-700' }, p.total)
                  ),
                  h('div', { className: 'flex flex-wrap gap-3 text-xs text-slate-700 mb-1' },
                    h('span', null, h('strong', null, 'Rate: '), p.dep_rate),
                    h('span', null, h('strong', null, 'Eff: '), p.eff),
                    h('span', null, h('strong', null, 'Cost: '), p.cost)
                  ),
                  h('p', { className: 'text-sm text-slate-800' }, p.note)
                );
              })
            ),
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-blue-900 mb-1' }, '💡 Cost vs quality trade-off'),
              h('p', { className: 'text-sm text-slate-800' }, 'Engineers spec the cheapest process that meets requirements. A non-critical fillet weld on plate = MIG short-circuit. A pressure vessel root pass = TIG (5x cost, but the only way to meet code). A 10,000 ft pipeline = FCAW with mechanized travel. Smart welding shops bid jobs knowing these tradeoffs.')
            )
          );
        }

        var consModeTabs = [
          { id: 'browse',    label: '📋 Browse topics' },
          { id: 'scenarios', label: '🎯 Pick the right consumable' }
        ];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🧵', title: 'Consumables Deep-Dive' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { role: 'tablist', 'aria-label': 'Consumables mode', className: 'flex flex-wrap gap-2' },
              consModeTabs.map(function(t) {
                var sel = (consMode === t.id);
                return h('button', {
                  key: t.id, role: 'tab', 'aria-selected': sel,
                  onClick: function() { setConsMode(t.id); announce(t.label); },
                  className: 'px-4 py-2 rounded-lg border-2 text-sm font-bold transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' +
                    (sel ? 'bg-fuchsia-700 text-white border-fuchsia-800' : 'bg-white text-slate-800 border-slate-300 hover:border-fuchsia-400')
                }, t.label);
              })
            ),
            consMode === 'browse' && h('div', { className: 'flex flex-wrap gap-2' },
              sects.map(function(s) {
                var sel = (sect === s.id);
                return h('button', {
                  key: s.id,
                  onClick: function() { setSect(s.id); announce(s.label); },
                  className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' +
                    (sel ? 'bg-fuchsia-700 text-white border-fuchsia-800' : 'bg-white text-slate-800 border-slate-300 hover:border-fuchsia-400')
                }, s.label);
              })
            ),
            consMode === 'browse' && h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' }, content),
            consMode === 'scenarios' && h('div', { className: 'bg-white rounded-2xl shadow border-2 border-fuchsia-300 p-5 space-y-4' },
              h('div', { className: 'flex justify-between items-baseline flex-wrap gap-2' },
                h('div', { className: 'text-sm font-bold text-slate-800' }, 'Scenario ' + (consScIdx + 1) + ' of ' + consScenarios.length),
                h('div', { className: 'text-sm font-mono font-bold ' + (consScScore >= consScenarios.length * 0.7 ? 'text-emerald-700' : consScScore >= consScenarios.length * 0.4 ? 'text-amber-700' : 'text-slate-700') }, 'Score: ' + consScScore + ' / ' + consScenarios.length)
              ),
              h('h3', { className: 'text-lg font-black text-fuchsia-900' }, curScenario.title),
              h('div', { className: 'bg-slate-50 border-2 border-slate-300 rounded-xl p-4' },
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, curScenario.scenario)
              ),
              h('div', { className: 'text-sm font-bold text-slate-800' }, 'Which consumable combination best fits this job?'),
              h('div', { className: 'space-y-2', role: 'radiogroup', 'aria-label': 'Consumable options' },
                curScenario.options.map(function(opt, i) {
                  var picked = (consScPicked === i);
                  var isCorrect = (i === curScenario.correct);
                  var bg = 'bg-white border-slate-300';
                  if (consScPicked != null) {
                    if (isCorrect) bg = 'bg-emerald-100 border-emerald-500';
                    else if (picked) bg = 'bg-rose-100 border-rose-500';
                    else bg = 'bg-slate-50 border-slate-300 opacity-60';
                  } else if (picked) bg = 'bg-fuchsia-50 border-fuchsia-500';
                  return h('button', {
                    key: i,
                    onClick: function() { pickConsAnswer(i); },
                    disabled: consScPicked != null,
                    role: 'radio',
                    'aria-checked': picked,
                    className: 'w-full text-left p-3 rounded-xl border-2 transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' + bg + (consScPicked == null ? ' hover:border-fuchsia-400' : '')
                  },
                    h('span', { className: 'text-sm font-bold text-slate-800' },
                      String.fromCharCode(65 + i) + '. ' + opt
                    ),
                    consScPicked != null && isCorrect && h('span', { className: 'ml-2 text-emerald-700 font-bold' }, '✓ correct'),
                    consScPicked != null && picked && !isCorrect && h('span', { className: 'ml-2 text-rose-700 font-bold' }, '✗ your pick')
                  );
                })
              ),
              consScPicked != null && h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-2', 'aria-live': 'polite' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-900' }, 'Why:'),
                h('p', { className: 'text-sm text-slate-800' }, curScenario.explain)
              ),
              h('div', { className: 'flex justify-between items-center pt-2 border-t border-slate-200 gap-2 flex-wrap' },
                h('button', {
                  onClick: resetConsQuiz,
                  className: 'text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }, '↺ Restart scenarios'),
                consScPicked != null && h('button', {
                  onClick: nextConsScenario,
                  className: 'text-sm font-bold px-4 py-2 rounded-lg bg-fuchsia-700 text-white hover:bg-fuchsia-800 transition'
                }, consScIdx === consScenarios.length - 1 ? 'Back to scenario 1 →' : 'Next scenario →')
              )
            ),
            h(TeacherNotes, {
              standards: ['AWS A5.1 (Stick)', 'AWS A5.18 (MIG)', 'AWS A5.20 (FCAW)', 'AWS A5.28 (TIG steel)', 'AWS A5.10 (TIG aluminum)'],
              questions: [
                'A welder picks E6013 instead of E7018 for a structural code job. Inspector rejects. Why?',
                'What\'s the difference between ER70S-3 and ER70S-6? When would you choose each?',
                'Why do TIG welders ball the tungsten for AC aluminum but grind a sharp point for DC steel?'
              ],
              misconceptions: [
                '"Higher amperage = better weld" — no. The right amperage for the consumable + thickness. Too high = burnthrough + spatter.',
                '"All MIG wire is basically the same" — chemistry matters. Wrong wire on contaminated/galvanized = porosity hell.',
                '"E7018 from an opened can is fine if it looks dry" — moisture absorbs without visible change. Rebake or discard.'
              ],
              extension: 'Visit a local welding supply store (Praxair, Airgas, Industrial Welding Supplies). Look at the electrode + wire selection. Note: what\'s on the shelf vs special order? Compare prices. Most shops carry maybe 6-10 different electrode/wire types. Which ones + why?'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 18: MAINE WELDING ECOSYSTEM
      // ─────────────────────────────────────────────────────
      function MaineEcosystem() {
        var mSect = usePersistedState('me_sect', 'overview');
        var sect = mSect[0], setSect = mSect[1];
        var meModeState = usePersistedState('me_mode', 'browse'); // 'browse' | 'roadmap'
        var meMode = meModeState[0], setMeMode = meModeState[1];
        var roadPathState = usePersistedState('me_road_path', null);
        var roadPath = roadPathState[0], setRoadPath = roadPathState[1];

        var sects = [
          { id: 'overview',  label: '🦞 Overview' },
          { id: 'biw',       label: '🚢 Bath Iron Works' },
          { id: 'shipyards', label: '⚓ Maine shipyards' },
          { id: 'training',  label: '🎓 EMCC + training pipelines' },
          { id: 'employers', label: '🏭 Other Maine employers' },
          { id: 'unions',    label: '🤝 Unions + apprenticeships' },
          { id: 'startup',   label: '🛠 Your own shop' }
        ];

        // ── 5-Year Roadmap data ──
        // Each path = year-by-year progression with milestone + realistic
        // Maine pay (2026 dollars). Year 0 = starting point (age 18 / HS grad).
        var roadmapPaths = [
          {
            id: 'biw_internal',
            title: 'BIW Internal Training → Production welder',
            icon: '🚢',
            blurb: 'Fastest path to a stable union job with pension. No prior welding required. Bath Iron Works pays you while you learn at their own training school, then you join production.',
            years: [
              { y: 0, age: '18', milestone: 'Graduate HS or CTE. Apply to BIW Welder Training Program (biwjobs.com).', pay: '$0 (job hunt)', note: 'Application + interview process. Drug test + math test typical.' },
              { y: 0.5, age: '18-19', milestone: 'Accepted into BIW Welder Training (16-week program).', pay: '$18-19/hr while in training', note: 'PAID during the 16-week program. Welding from day one. Cohort-based learning.' },
              { y: 1, age: '19', milestone: 'Complete training. Qualify for production. Step 1 production welder.', pay: '$22-25/hr base', note: 'On the floor welding hulls, bulkheads, piping. IAM Local S6 member.' },
              { y: 2, age: '20', milestone: 'Step 2-3 production. Cross-train on second process (often FCAW + SMAW).', pay: '$25-28/hr base + OT', note: 'Annual income ~$60-70K with regular OT. Comfortable life in Bath area.' },
              { y: 3, age: '21', milestone: 'Step 4-5 production. NAVSEA qualifications building.', pay: '$28-32/hr base + OT', note: 'Annual ~$70-80K. Pension begins vesting at 5 years employment.' },
              { y: 5, age: '23', milestone: 'Pension VESTS. Step 6-7 senior production. Considered "career-track."', pay: '$31-36/hr base + OT', note: 'Annual $75-95K. Pension is yours regardless of future moves. Healthcare excellent.' }
            ],
            tradeoffs: 'PRO: Fast entry, no debt, pension, stable. CON: Shipyard work is physical, mandatory OT, weather (heated tents but cold), strict drug testing.'
          },
          {
            id: 'emcc_boatyard',
            title: 'EMCC 2-year → Boatyard TIG welder',
            icon: '⚓',
            blurb: 'Community college path into mid-coast boat building. TIG aluminum + stainless work on yachts and commercial vessels. Smaller crews, more variety.',
            years: [
              { y: 0, age: '18', milestone: 'Enroll at EMCC (Bangor) Welding Technology AAS.', pay: '~$3,500/yr tuition (Maine resident)', note: 'Full-time student. May work part-time. Maine Promise scholarship covers most for income-eligible students.' },
              { y: 1, age: '19', milestone: 'Year 1 complete. Summer internship at boatyard (Hodgdon, Lyman-Morse, Sabre).', pay: '$15-18/hr summer', note: 'Building TIG skills + portfolio. Networking with shops.' },
              { y: 2, age: '20', milestone: 'Graduate AAS with AWS quals. Hired at boatyard.', pay: '$22-26/hr start', note: 'Annual $46-54K. Most yards include healthcare. Some bonus on yacht delivery.' },
              { y: 3, age: '21', milestone: 'Lead-welder track. Take on harder repairs + custom projects.', pay: '$25-30/hr', note: 'Annual $52-62K. Aluminum TIG skill commands premium.' },
              { y: 5, age: '23', milestone: '5-year journeyman. Could open mobile/side shop OR move to lead position.', pay: '$28-34/hr + bonuses', note: 'Annual $58-70K. Path to lead/foreman opening up.' }
            ],
            tradeoffs: 'PRO: Beautiful work, smaller crews, less industrial. CON: Slower wage climb than BIW, fewer benefits, seasonal cycles in some yards.'
          },
          {
            id: 'ua_apprentice',
            title: 'UA Local 716 Pipefitter Apprenticeship',
            icon: '🤝',
            blurb: 'The highest-pay long-game path. Paid 5-year apprenticeship. Top journeyman wage in Maine welding. Travel is common (paper mill shutdowns, big construction).',
            years: [
              { y: 0, age: '18-23', milestone: 'Pass aptitude test + interview. Selected from competitive pool (~10-20% accepted).', pay: 'Job hunt + test prep', note: 'Most applicants are 19-25. Some 18-year-olds get in. Apply through UA Local 716 directly.' },
              { y: 1, age: '19-24', milestone: 'Year 1 apprentice. School nights + on-the-job days.', pay: '$22-26/hr (50% of journey rate)', note: 'Earning while learning. No tuition. Full healthcare from day 1.' },
              { y: 2, age: '20-25', milestone: 'Year 2 apprentice. 60% of journey rate.', pay: '$26-30/hr', note: 'Annual $54-62K. Per diem on travel work.' },
              { y: 3, age: '21-26', milestone: 'Year 3 apprentice. Pipe welding qualifications begin.', pay: '$30-35/hr (70% of journey rate)', note: 'Annual $62-72K. 6G pipe qual is the big milestone.' },
              { y: 4, age: '22-27', milestone: 'Year 4-5 apprentice. Final qualifications.', pay: '$35-40/hr (85% of journey rate)', note: 'Annual $72-82K. Approaching journey rate.' },
              { y: 5, age: '23-28', milestone: 'Journey out. Full pipefitter wage.', pay: '$42-48/hr + per diem', note: 'Annual $90-120K typical. Top earners $120-150K with travel work. Defined-benefit pension.' }
            ],
            tradeoffs: 'PRO: Top pay in Maine welding, no debt, pension, brotherhood. CON: Competitive entry, travel required, physical work, mandatory OT during shutdowns.'
          },
          {
            id: 'cte_smallshop',
            title: 'HS CTE → Small fab shop → Mobile welding',
            icon: '🛠',
            blurb: 'Lowest-cost path with creative freedom long-term. Get CTE certs in HS, work small shops to build experience, eventually open your own mobile welding business.',
            years: [
              { y: 0, age: '18', milestone: 'Graduate HS with CTE welding certs (OSHA 10, AWS pre-quals).', pay: '$0 (job hunt)', note: 'No college debt. AWS quals already in pocket.' },
              { y: 0.25, age: '18', milestone: 'Hired at local fab shop (truck bodies, snow plows, repair).', pay: '$18-22/hr start', note: 'Annual $37-46K. Learning real-world welding speed + variety.' },
              { y: 2, age: '20', milestone: 'Senior welder at the shop. Sometimes supervising newer hires.', pay: '$22-26/hr', note: 'Annual $46-54K. Considering whether to stay long-term or move on.' },
              { y: 4, age: '22', milestone: 'Decision point: stay at shop, move to BIW (lateral), or go mobile.', pay: '$24-28/hr (employed) OR $0 startup', note: 'If mobile: invest savings into truck + equipment ($10-20K). High risk; high freedom.' },
              { y: 5, age: '23', milestone: 'Year 1 mobile welding. Building customer base.', pay: 'Variable: $30-70K (year 1 self-employed)', note: 'Word-of-mouth + Facebook marketplace. First year is hard. Year 2-3 typically much better.' },
              { y: 7, age: '25', milestone: '3 years mobile. Steady customer base. Charging $70-90/hr.', pay: 'Net $60-90K/yr', note: 'Full freedom over schedule. Hard in lean weeks. Plan for taxes (quarterly).' }
            ],
            tradeoffs: 'PRO: No debt, fastest entry, full creative freedom long-term. CON: Lower starting pay, no benefits at small shops, mobile business has variable income.'
          }
        ];

        var curRoadmap = roadPath ? roadmapPaths.find(function(p) { return p.id === roadPath; }) : null;

        var content;
        if (sect === 'overview') {
          content = h('div', { className: 'space-y-3' },
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Maine has one of the densest skilled-trades welding economies in the Northeast. Shipbuilding (Bath Iron Works alone employs ~6,500), boatbuilding (Hodgdon, Sabre, Lyman-Morse), heavy industry (paper mills, food processing), and a thick small-shop ecosystem (fabrication shops, marine repair, custom work) all need welders right now.'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'This module maps where welders work in Maine, what each path actually pays, and how students get in. Real names + real numbers + real entry routes — not generic "you could work in welding" career fluff.'),
            h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-fuchsia-900' }, '🎯 The Maine welding landscape at a glance'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Shipbuilding: '), 'BIW (Bath) dominates. Designed structural + pipefitting welds for Navy destroyers. ~6,500 employees, IAM Local S6 union. Aggressive hiring.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Boatbuilding (mid-coast): '), 'Hodgdon Yachts (East Boothbay), Lyman-Morse (Thomaston), Sabre (Raymond), Front Street Shipyard (Belfast). Aluminum + stainless TIG primarily. Smaller crews, more variety.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Heavy industry: '), 'Paper mills (Sappi Westbrook, Verso/Pixelle Jay), Cianbro (statewide construction), Reed & Reed (large structural), food processing (Idexx, Tom\'s of Maine).'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Marine + fabrication shops: '), 'Hundreds of small shops. Truck bodies, snow plows, repair welding, custom fab. Often family-owned. Lower formal credentials, faster entry.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Pipeline + cross-country: '), 'Less common in Maine but Maine welders frequently travel — Connecticut, Quebec, Pennsylvania for big-pay union work.')
            )
          );
        } else if (sect === 'biw') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🚢 Bath Iron Works (BIW) — Maine\'s anchor employer'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'BIW (a General Dynamics company) builds Arleigh Burke-class destroyers (DDG-51) for the US Navy. Founded 1884. Located on the Kennebec River in Bath. Largest private employer in Maine.'),
            h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-fuchsia-900' }, 'The numbers'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Employees: '), '~6,500 (largest Maine private employer)'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Welders specifically: '), '~600-800 (varies with production cycle). Always hiring.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Wages: '), 'Entry welder (Pay Step 1) ~$22-25/hr + benefits. Top-step structural welder ~$36-42/hr + benefits + shift differential. With OT (common during build push), 6-figure income achievable.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Benefits: '), 'Full health, pension (IAM defined-benefit), 401k match, paid time off. Pension specifically is rare in modern manufacturing — a big draw.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Union: '), 'International Association of Machinists Local S6. Largest single private-sector union local in Maine.')
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'What you weld at BIW'),
            h('p', { className: 'text-sm text-slate-800' }, 'Hull plating (HSLA-65, HSLA-80, HY-80, HY-100 high-strength low-alloy steel). Internal structure (bulkheads, frames). Piping systems (carbon steel + stainless + copper-nickel). Aluminum superstructure (sometimes). Every weld is inspected. Code work: NAVSEA Technical Publication T9074 (Navy welding standards) + AWS D1.6 (stainless) + ASME IX (pipe).'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'How to get in'),
            h('div', { className: 'space-y-2' },
              [{ path: 'BIW Internal Welder Training Program', detail: 'BIW runs its own training school. ~16-week program. Paid while you train ($18-19/hr starting). After completion + qualification, you join production. Application: biwjobs.com or BIW HR (207-443-3311). HUGE entry channel — no prior welding required for some entries.' },
               { path: 'EMCC welding certificate (2 yr) → BIW recruit', detail: 'Eastern Maine Community College welding program (Bangor). 2-year associate. BIW actively recruits EMCC grads. Tuition ~$3,500/yr — Maine residents get further discount.' },
               { path: 'High school CTE → BIW Training Program', detail: 'Many Maine CTEs (Region 10, Mid-Coast School of Technology, Hancock County Technical Center) feed BIW directly. Counselors have established relationships.' },
               { path: 'Lateral from another shipyard / fabrication shop', detail: 'Experienced welders with NAVSEA, AWS D1.1 or D1.6 quals can apply directly + skip portions of internal training. Pay starts higher (Step 3-5 depending on experience).' }].map(function(p, i) {
                return h('div', { key: i, className: 'bg-white border-2 border-fuchsia-200 rounded-xl p-3' },
                  h('div', { className: 'font-bold text-fuchsia-900 mb-1' }, p.path),
                  h('p', { className: 'text-sm text-slate-800' }, p.detail)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '💡 Reality check'),
              h('p', { className: 'text-sm text-slate-800' }, 'BIW work is hard. Outdoor in Maine winter (heated tents help but cold). Shift work (1st/2nd/3rd, mandatory OT). Strict drug testing (Navy contract). Physical (carrying gear up + down hulls). Trade-offs are real wages, full benefits, pension, and a job that builds Navy ships.')
            )
          );
        } else if (sect === 'shipyards') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '⚓ Maine shipyards + boatbuilders — mid-coast cluster'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Beyond BIW, Maine\'s mid-coast has one of the densest boatbuilding clusters in North America. Most are aluminum or steel construction; some composite. Welders here typically do TIG (aluminum + stainless), often work alongside designers + engineers, build everything from megayachts to Navy support craft.'),
            h('div', { className: 'space-y-2' },
              [{ name: 'Hodgdon Yachts (East Boothbay)', founded: '1816', focus: 'Megayachts (90-200 ft custom), Navy CCM (Combatant Craft Medium) for special operations', welders: 'Aluminum TIG primarily. Heavy custom fitting + structural.', pay: '$22-32/hr + benefits' },
               { name: 'Lyman-Morse (Thomaston)', founded: '1978', focus: 'Custom yachts (sail + power), composite + aluminum + steel', welders: 'TIG aluminum + stainless. Composite-metal interface work.', pay: '$22-30/hr + benefits' },
               { name: 'Sabre Yachts (Raymond)', founded: '1970', focus: 'Power yachts (38-66 ft fiberglass)', welders: 'Less primary welding (mostly composite) but stainless + aluminum fittings.', pay: '$20-27/hr + benefits' },
               { name: 'Front Street Shipyard (Belfast)', founded: '2011', focus: 'New construction + refit; superyacht service', welders: 'TIG aluminum + stainless. Refit work = wide variety.', pay: '$22-30/hr + benefits' },
               { name: 'Steve French Yacht Services (Brooklin)', founded: '~1990s', focus: 'Wooden + composite repair + custom fab', welders: 'Small shop. Versatile welders who can handle bronze + stainless + aluminum.', pay: '$18-25/hr' },
               { name: 'Hinckley Yachts (Trenton + Southwest Harbor)', founded: '1928', focus: 'Custom + production luxury yachts', welders: 'Stainless TIG for fittings. Bronze casting work too.', pay: '$22-30/hr + benefits' },
               { name: 'Brooklin Boat Yard (Brooklin)', founded: '1960', focus: 'Wooden boat restoration + custom builds', welders: 'Less primary welding but bronze + stainless detail work.', pay: '$20-26/hr' },
               { name: 'Washburn & Doughty (East Boothbay)', founded: '1977', focus: 'Steel commercial vessels — tugs, ferries, fireboats', welders: 'Heavy steel SMAW + FCAW. Marine survey-grade welds.', pay: '$23-32/hr + benefits' }].map(function(s, i) {
                return h('div', { key: i, className: 'bg-fuchsia-50 border-2 border-fuchsia-200 rounded-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1 flex-wrap' },
                    h('span', { className: 'font-bold text-fuchsia-900' }, s.name),
                    h('span', { className: 'text-xs text-fuchsia-700' }, 'Est. ' + s.founded)
                  ),
                  h('p', { className: 'text-xs text-slate-700 mb-1' }, h('strong', null, 'Focus: '), s.focus),
                  h('p', { className: 'text-xs text-slate-700 mb-1' }, h('strong', null, 'Welders do: '), s.welders),
                  h('p', { className: 'text-sm font-mono text-emerald-700' }, s.pay)
                );
              })
            ),
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-blue-900 mb-1' }, '💡 Boatyard vs shipyard culture'),
              h('p', { className: 'text-sm text-slate-800' }, 'Shipyards (BIW, Washburn & Doughty) = bigger crews, structured shifts, union, strict code work. Boatyards = smaller crews, more creative latitude, often non-union, more variety per project. Both pay well. Personality fit matters as much as skill fit.')
            )
          );
        } else if (sect === 'training') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🎓 Welder training pipelines in Maine'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Multiple training paths get Maine students into paid welding work within 6 months to 2 years. Most options are inexpensive or free; some are paid-while-you-learn.'),
            h('div', { className: 'space-y-2' },
              [{ name: 'Eastern Maine Community College (EMCC, Bangor)', length: '2-yr Associate in Welding Technology + 1-yr Certificate options', cost: '~$3,500/yr Maine resident', certs: 'AWS qualification testing on-site. NCCER curriculum. Industry placement.', strength: 'Most established Maine welding program. Heavy industry employer connections.' },
               { name: 'Southern Maine Community College (SMCC, South Portland)', length: '2-yr Associate in Welding/Metal Fabrication', cost: '~$3,500/yr Maine resident', certs: 'AWS quals, MIG/TIG/SMAW/FCAW.', strength: 'Coastal location — easier access to BIW + Portland fab shops.' },
               { name: 'Washington County Community College (Calais)', length: '1-yr Certificate or 2-yr AAS', cost: '~$3,500/yr Maine resident', certs: 'AWS quals. Pipe welding focus.', strength: 'Rural Maine option. Pipeline + heavy industry feed.' },
               { name: 'Northern Maine Community College (Presque Isle)', length: '1-yr Certificate', cost: '~$3,500/yr Maine resident', certs: 'AWS quals. Heavy equipment repair focus.', strength: 'Aroostook + agricultural ecosystem. Truck/equipment shops.' },
               { name: 'CTE high school programs (region by region)', length: '2-yr program junior+senior year', cost: 'FREE (part of HS)', certs: 'OSHA 10, AWS pre-quals, some shops sign students into apprenticeship at graduation.', strength: 'Earn-while-you-learn with no debt. Best for committed sophomore-year choosers. Examples: Region 10 Tech Center (Brunswick), Mid-Coast School of Technology (Rockland), Hancock County Technical Center (Ellsworth), Coastal Washington County Institute of Technology.' },
               { name: 'BIW Internal Training', length: '~16 weeks', cost: 'FREE (paid while training, ~$18-19/hr)', certs: 'NAVSEA-prep + AWS-prep + BIW-specific.', strength: 'Direct hire pipeline. No prior welding required for some tracks. Best path if you already know you want BIW.' },
               { name: 'Job Corps welding programs', length: '~12-18 months', cost: 'FREE + room/board if you qualify (income-based, 16-24)', certs: 'NCCER + AWS pre-quals.', strength: 'For students without family financial support who need stability. Maine Job Corps Center in Bangor.' },
               { name: 'Apprenticeship (union sponsored)', length: '3-4 years', cost: 'FREE + paid wages (start ~$15-18/hr, rising)', certs: 'Full UA, IAM, or IBEW pipefitter/welder apprenticeship. State journeyman card.', strength: 'No debt, paid from day 1, top pay at completion. Application windows competitive — check local UA Local 716 (pipefitters), Boilermakers Local 29, IAM S6.' }].map(function(t, i) {
                return h('div', { key: i, className: 'bg-purple-50 border-2 border-purple-200 rounded-xl p-3' },
                  h('div', { className: 'font-bold text-purple-900 mb-1' }, t.name),
                  h('p', { className: 'text-xs text-slate-700 mb-1' }, h('strong', null, 'Length: '), t.length, ' · ', h('strong', null, 'Cost: '), t.cost),
                  h('p', { className: 'text-xs text-slate-700 mb-1' }, h('strong', null, 'Certifications: '), t.certs),
                  h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Strength: '), t.strength)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '💡 Which path for which student'),
              h('p', { className: 'text-sm text-slate-800' }, 'Knows welding = goal by sophomore year + cost-sensitive: HS CTE → direct hire or BIW Training. Adult learner / career changer: EMCC + SMCC. Wants top pay + no debt: union apprenticeship (highly competitive entry). Wants BIW specifically + soon: BIW Internal Training. No family support + needs structure: Job Corps.')
            )
          );
        } else if (sect === 'employers') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🏭 Other Maine welding employers beyond shipyards'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Maine\'s welding workforce extends well beyond shipbuilding. Heavy construction, paper/pulp, food processing, road maintenance, agriculture, custom fab — all hire welders, often year-round, often with shorter training requirements.'),
            h('div', { className: 'space-y-2' },
              [{ co: 'Cianbro (Pittsfield HQ, statewide)', industry: 'Heavy construction + module fab', what: 'Modular construction (built indoors, shipped to site). Power plants, refineries, hospitals. Welders work in-shop (climate-controlled).', pay: '$25-38/hr + per diem on travel jobs' },
               { co: 'Reed & Reed (Woolwich)', industry: 'Wind turbine erection + heavy structural', what: 'Wind farms, bridges, towers. Crane operations + structural welding.', pay: '$26-36/hr' },
               { co: 'Sappi North America (Westbrook + Skowhegan mills)', industry: 'Paper + pulp', what: 'Mill maintenance welders. High-pressure piping, boiler repair, pumps + valves. ASME code work.', pay: '$28-38/hr + benefits + pension' },
               { co: 'Verso / Pixelle Specialty Solutions (Jay mill)', industry: 'Paper', what: 'Boiler + piping. ASME code work. Hard ticket — pipe welder qual + mill shutdown work.', pay: '$30-42/hr (shutdown pay much higher)' },
               { co: 'IDEXX (Westbrook)', industry: 'Veterinary diagnostics manufacturing', what: 'Stainless sanitary tubing welding (orbital). Cleanroom environment.', pay: '$24-32/hr + benefits' },
               { co: 'Pratt & Whitney (North Berwick)', industry: 'Aerospace engine components', what: 'Precision aerospace welding — exotic alloys (Inconel, titanium). High-quality tier.', pay: '$26-40/hr + benefits + 401k match' },
               { co: 'Maine DOT', industry: 'Bridge maintenance', what: 'Field welder positions. Travel statewide. State employee + benefits. Often-overlooked path.', pay: '$22-32/hr + state benefits + pension' },
               { co: 'L.L. Bean (Brunswick warehouse maintenance)', industry: 'Retail logistics', what: 'Equipment + facility welding. Small in-house team.', pay: '$22-28/hr + benefits' },
               { co: 'Local truck body shops (Cumberland, York, Penobscot counties)', industry: 'Custom fab', what: 'Snow plows, dump bodies, trailers, racks. Mostly MIG steel + aluminum. Many family-owned, faster entry, less formal credentialing.', pay: '$18-28/hr depending on shop + experience' },
               { co: 'Local marine repair shops (every coastal town)', industry: 'Marine repair', what: 'Lobster boat repair, mooring fab, dock work, custom rigging. Seasonal busy in spring + fall.', pay: '$18-26/hr' },
               { co: 'Hannaford / Shaw\'s distribution centers', industry: 'Food logistics', what: 'Maintenance welders for refrigeration + racking + equipment. Stable schedule.', pay: '$22-28/hr + benefits' }].map(function(e, i) {
                return h('div', { key: i, className: 'bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1 flex-wrap' },
                    h('span', { className: 'font-bold text-emerald-900' }, e.co),
                    h('span', { className: 'text-xs text-emerald-700' }, e.industry)
                  ),
                  h('p', { className: 'text-xs text-slate-700 mb-1' }, h('strong', null, 'Work: '), e.what),
                  h('p', { className: 'text-sm font-mono text-emerald-800' }, e.pay)
                );
              })
            )
          );
        } else if (sect === 'unions') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🤝 Unions + apprenticeships in Maine'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Union apprenticeships pay you to learn — usually 3-5 years to journeyman. Top pay nationally is in union work; Maine is a moderate-density union state with several active welding-relevant locals.'),
            h('div', { className: 'space-y-2' },
              [{ union: 'IAM Local S6 (Machinists)', covers: 'BIW (Bath)', members: '~4,000+ at BIW', wages: 'Top step ~$36-42/hr + pension + benefits', entry: 'Hired through BIW. Union membership begins at job start. No formal apprenticeship — internal training.' },
               { union: 'UA Local 716 (Pipefitters)', covers: 'Industrial + commercial piping statewide', members: '~700+ Maine pipefitters', wages: 'Top journeyman ~$38-48/hr + benefits + pension', entry: '5-year apprenticeship. Application windows roughly annually. Competitive — usually 10-20 selected from 100+ applicants. Pipe welding cert during years 3-5.' },
               { union: 'Boilermakers Local 29', covers: 'Power plants, refineries, paper mills, shipyards (some)', members: 'Maine portion ~300+', wages: 'Top journeyman ~$40-50/hr + per diem + benefits + pension', entry: '4-year apprenticeship. Heavy travel for shutdown work. Top-tier welders in this trade.' },
               { union: 'Iron Workers Local 7', covers: 'Structural steel erection + fabrication', members: '~500 Maine + NH', wages: '$30-40/hr + benefits', entry: '3-4 year apprenticeship. Bridge + building structural.' },
               { union: 'IBEW Local 567 (Electrical Workers)', covers: 'Industrial electrical work', members: '~600 Maine electrical', wages: '$35-45/hr top step', entry: 'Welding is secondary skill (mostly conduit + grounding work). Some IBEW welders. 5-year apprenticeship.' }].map(function(u, i) {
                return h('div', { key: i, className: 'bg-fuchsia-50 border-2 border-fuchsia-200 rounded-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1 flex-wrap' },
                    h('span', { className: 'font-bold text-fuchsia-900' }, u.union),
                    h('span', { className: 'text-xs text-fuchsia-700' }, u.members)
                  ),
                  h('p', { className: 'text-xs text-slate-700 mb-1' }, h('strong', null, 'Covers: '), u.covers),
                  h('p', { className: 'text-xs text-slate-700 mb-1' }, h('strong', null, 'Wages: '), u.wages),
                  h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Entry: '), u.entry)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '💡 Union apprenticeship reality'),
              h('p', { className: 'text-sm text-slate-800' }, 'Application windows are tight (usually 1-2 weeks each year). Selection is competitive (aptitude test + interview). Once in, you cannot easily switch. Travel is common (jobs follow construction). Pay scales formally each year — you know exactly what you\'ll earn through journey-out. Pension + healthcare are gold-standard. Many of the highest-paid welders in Maine are pipefitters + boilermakers.')
            )
          );
        } else if (sect === 'startup') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🛠 Starting your own welding shop in Maine'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Many Maine welders eventually open their own shops — sometimes after 5-15 years industry experience, sometimes immediately from CTE/EMCC. Small shop welding is hard work but it is one of the lowest-barrier paths to small business ownership.'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'What you need to start'),
            h('div', { className: 'space-y-2' },
              [{ item: 'Equipment ($3,000-15,000 entry)', detail: 'MIG machine (Miller 211 / Lincoln 210MP ~$1,200-1,500), TIG/stick combo (Miller Multimatic 220 ~$2,500), oxy-acetylene rig (~$500), grinder, plasma cutter (~$1,000), helmet, gloves, cart, vise, table. Used equipment cuts cost 30-50%.' },
               { item: 'Workspace', detail: 'Garage bay (rent or own). 24x24 ft minimum for production work. Concrete floor (NOT wood). Adequate electrical (50A 240V minimum, 100A better). Ventilation. Some welders work outdoors May-Oct + heated bay rest of year.' },
               { item: 'Insurance', detail: 'General liability (~$600-1200/yr). Workers comp if employees. Some shops add product liability (welds that fail in service).' },
               { item: 'Business setup', detail: 'Sole proprietorship or LLC ($175 filing in Maine). Sales tax permit (Maine Revenue Services). EIN if hiring. Not complicated.' },
               { item: 'Customers', detail: 'First year: word of mouth, Facebook marketplace, repair calls, custom truck/trailer work. Mid-coast + rural Maine has steady demand. Marine work seasonal but lucrative spring/fall.' }].map(function(it, i) {
                return h('div', { key: i, className: 'bg-purple-50 border-l-4 border-purple-400 rounded-r-xl p-3' },
                  h('div', { className: 'font-bold text-purple-900 mb-1' }, it.item),
                  h('p', { className: 'text-sm text-slate-800' }, it.detail)
                );
              })
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800 mt-3' }, 'Pricing your work'),
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3' },
              h('p', { className: 'text-sm text-slate-800' }, 'Shop labor: $60-95/hr (Maine, 2026). Field/mobile work: $85-125/hr + truck charge. Repair welding (often emergencies): premium. Don\'t underprice — your equipment + skill + insurance cost real money. Track time honestly: first hour on every job is usually setup + parts diagnosis.')
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '💡 What goes wrong'),
              h('p', { className: 'text-sm text-slate-800' }, 'Underpricing (Maine welders chronically underbid each other). No quoting discipline (verbal estimates that become disputes). Equipment failure (one fried machine = month of lost income if no backup). Cash flow gaps (some customers pay 60-90 days). Don\'t take on jobs you don\'t have the right equipment for. Don\'t weld something safety-critical without the qualifications.')
            )
          );
        }

        var meModeTabs = [
          { id: 'browse',  label: '🦞 Browse topics' },
          { id: 'roadmap', label: '🗺 5-Year Roadmap' }
        ];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🦞', title: 'Maine Welding Ecosystem' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { role: 'tablist', 'aria-label': 'Ecosystem mode', className: 'flex flex-wrap gap-2' },
              meModeTabs.map(function(t) {
                var sel = (meMode === t.id);
                return h('button', {
                  key: t.id, role: 'tab', 'aria-selected': sel,
                  onClick: function() { setMeMode(t.id); announce(t.label); },
                  className: 'px-4 py-2 rounded-lg border-2 text-sm font-bold transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' +
                    (sel ? 'bg-fuchsia-700 text-white border-fuchsia-800' : 'bg-white text-slate-800 border-slate-300 hover:border-fuchsia-400')
                }, t.label);
              })
            ),
            meMode === 'browse' && h('div', { className: 'flex flex-wrap gap-2' },
              sects.map(function(s) {
                var sel = (sect === s.id);
                return h('button', {
                  key: s.id,
                  onClick: function() { setSect(s.id); announce(s.label); },
                  className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' +
                    (sel ? 'bg-fuchsia-700 text-white border-fuchsia-800' : 'bg-white text-slate-800 border-slate-300 hover:border-fuchsia-400')
                }, s.label);
              })
            ),
            meMode === 'browse' && h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' }, content),
            meMode === 'roadmap' && !curRoadmap && h('div', { className: 'space-y-3' },
              h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4' },
                h('p', { className: 'text-sm text-slate-800' }, 'Pick a path. We\'ll walk you through year 0 → year 5+ with the realistic milestones, decisions, and pay (2026 Maine dollars). Real progressions drawn from Maine Dept of Labor + AWS workforce data + actual employer pay schedules.')
              ),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                roadmapPaths.map(function(p) {
                  return h('button', {
                    key: p.id,
                    onClick: function() { setRoadPath(p.id); announce('Selected ' + p.title); },
                    className: 'text-left bg-white border-2 border-fuchsia-300 hover:border-fuchsia-600 hover:bg-fuchsia-50 rounded-xl p-4 transition focus:outline-none focus:ring-2 ring-fuchsia-500/40'
                  },
                    h('div', { className: 'flex items-baseline gap-2 mb-2' },
                      h('span', { className: 'text-2xl' }, p.icon),
                      h('span', { className: 'text-base font-black text-fuchsia-900' }, p.title)
                    ),
                    h('p', { className: 'text-sm text-slate-800' }, p.blurb)
                  );
                })
              )
            ),
            meMode === 'roadmap' && curRoadmap && h('div', { className: 'space-y-4' },
              h('div', { className: 'flex justify-between items-baseline gap-2 flex-wrap' },
                h('h2', { className: 'text-xl font-black text-fuchsia-900' }, curRoadmap.icon + ' ' + curRoadmap.title),
                h('button', {
                  onClick: function() { setRoadPath(null); announce('Returned to path picker'); },
                  className: 'text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }, '← Pick a different path')
              ),
              h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4' },
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, curRoadmap.blurb)
              ),
              // Timeline
              h('div', { className: 'space-y-3' },
                curRoadmap.years.map(function(yr, i) {
                  return h('div', { key: i, className: 'bg-white border-l-4 border-fuchsia-500 rounded-r-xl shadow p-4 flex gap-4 items-start' },
                    h('div', { className: 'flex-shrink-0 w-20 text-center' },
                      h('div', { className: 'text-2xl font-black text-fuchsia-700' }, 'Year ' + yr.y),
                      h('div', { className: 'text-xs font-mono text-slate-600' }, 'age ' + yr.age)
                    ),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'font-bold text-slate-900 mb-1' }, yr.milestone),
                      h('div', { className: 'text-sm font-mono text-emerald-700 mb-2' }, '💰 ' + yr.pay),
                      h('div', { className: 'text-xs text-slate-700' }, yr.note)
                    )
                  );
                })
              ),
              h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-4' },
                h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '⚖ Trade-offs'),
                h('p', { className: 'text-sm text-slate-800' }, curRoadmap.tradeoffs)
              ),
              h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-4' },
                h('div', { className: 'text-xs font-bold uppercase text-blue-900 mb-1' }, '💡 Reality check'),
                h('p', { className: 'text-sm text-slate-800' }, 'Pay ranges are 2026 Maine averages drawn from BIW/IAM contracts, UA Local 716 wage scales, Maine DOL occupational data, and AWS workforce reports. Real outcomes vary with shift, overtime, employer, and individual performance. Use this as a planning tool, not a guarantee.')
              )
            ),
            h(TeacherNotes, {
              standards: ['Maine CTE Career Pathways', 'NCCER Industrial Maintenance', 'IAM/UA/Boilermakers apprenticeship'],
              questions: [
                'Why does BIW have an internal training program rather than only hiring trained welders?',
                'What\'s the trade-off between union apprenticeship and going straight to a small shop after CTE?',
                'A student wants the highest possible welding wage in Maine. Walk through the realistic 5-year roadmap.'
              ],
              misconceptions: [
                '"All welding pays the same" — varies 2-3× across processes + employers. Pipe welding > production MIG > truck body work.',
                '"You need a 4-year degree to make good money" — false in this field. EMCC + a year at BIW = $50-60K. 5 years in = $70-80K + pension.',
                '"Union work is for older guys" — locals actively recruit young apprentices. Apply at 18-22, journey out by 23-26.'
              ],
              extension: 'Contact one Maine employer (BIW HR or a small shop) and ask 3 questions: How do you hire? What\'s the first 6 months like? What separates the welders who stay from the ones who quit? Real conversation > brochure.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 19: SAFETY + HEALTH DEEP-DIVE
      // ─────────────────────────────────────────────────────
      function SafetyHealthDeepDive() {
        var shSect = usePersistedState('sh_sect', 'overview');
        var sect = shSect[0], setSect = shSect[1];
        var shModeState = usePersistedState('sh_mode', 'browse'); // 'browse' | 'audit'
        var shMode = shModeState[0], setShMode = shModeState[1];
        var shAuditState = usePersistedState('sh_audit', {}); // { qId: 'yes'|'no'|'na' }
        var shAudit = shAuditState[0], setShAudit = shAuditState[1];

        var sects = [
          { id: 'overview',  label: '⚕️ Overview' },
          { id: 'fume',      label: '☁ Fume + lungs' },
          { id: 'eyes',      label: '👁 Arc flash + eyes' },
          { id: 'noise',     label: '🔊 Noise + hearing' },
          { id: 'burns',     label: '🔥 Burns + UV' },
          { id: 'ergonomics',label: '🦴 Ergonomics + posture' },
          { id: 'electrical',label: '⚡ Electrical + confined' },
          { id: 'mental',    label: '🧠 Mental + workplace' }
        ];

        // ── Shop Safety Audit data ──
        // 18 yes/no questions across 6 categories. "yes" = safe practice
        // in place. "no" = gap. Score = % of yes (out of yes+no, NA excluded).
        var auditCategories = [
          {
            id: 'fume', label: '☁ Fume + ventilation', items: [
              { id: 'lev', q: 'Is there local exhaust ventilation (LEV) at the welding station?' },
              { id: 'stainless_ev', q: 'When stainless or galvanized is welded, is extra fume capture used?' },
              { id: 'papr', q: 'For welders who don\'t have LEV at every station, is a PAPR or fit-tested respirator available?' }
            ]
          },
          {
            id: 'eyes', label: '👁 Vision + arc protection', items: [
              { id: 'screens', q: 'Are welding screens or curtains in place to protect adjacent workers from flash?' },
              { id: 'helmet', q: 'Do welders have auto-darkening helmets with shade matched to process + amperage?' },
              { id: 'safety_glasses', q: 'Are safety glasses worn at all times in the shop (not just under hood)?' }
            ]
          },
          {
            id: 'hearing', label: '🔊 Hearing protection', items: [
              { id: 'hp_available', q: 'Are foam plugs OR muffs available at every station?' },
              { id: 'hp_required', q: 'Is hearing protection actually required when grinding, gouging, or running plasma?' },
              { id: 'hp_double', q: 'Is double protection (plugs + muffs) available for high-noise work (>100 dB)?' }
            ]
          },
          {
            id: 'electrical', label: '⚡ Electrical + cable safety', items: [
              { id: 'cables_inspected', q: 'Are welding cables inspected each shift for cracks or exposed copper?' },
              { id: 'dry_gloves', q: 'Are dry gloves used + ground conditions kept dry to prevent shock?' },
              { id: 'work_clamp', q: 'Is the work clamp attached directly to the workpiece (not through staging or ladders)?' }
            ]
          },
          {
            id: 'fire', label: '🔥 Fire + hot-work', items: [
              { id: 'fire_ext', q: 'Is an ABC fire extinguisher within 35 ft of every welding station?' },
              { id: 'hot_work_watch', q: 'For hot work in non-shop areas, is a fire watch maintained 30+ min after stopping?' },
              { id: 'cylinder_secured', q: 'Are all compressed gas cylinders chained upright with caps when not in use?' }
            ]
          },
          {
            id: 'ergo', label: '🦴 Ergonomics + breaks', items: [
              { id: 'positioner', q: 'Are turning gear or positioners used for long welds rather than awkward positions?' },
              { id: 'mat', q: 'Are anti-fatigue mats provided where welders stand on concrete?' },
              { id: 'breaks', q: 'Do welders take breaks every 30-60 min during sustained work?' }
            ]
          }
        ];

        var allItems = [];
        auditCategories.forEach(function(c) { c.items.forEach(function(it) { allItems.push({ catId: c.id, catLabel: c.label, id: it.id, q: it.q }); }); });

        function setAuditAnswer(qid, val) {
          var next = Object.assign({}, shAudit);
          next[qid] = val;
          setShAudit(next);
        }
        function resetAudit() {
          setShAudit({});
          announce('Audit reset');
        }
        function categoryScore(catId) {
          var items = auditCategories.find(function(c) { return c.id === catId; }).items;
          var yes = 0, considered = 0;
          items.forEach(function(it) {
            var a = shAudit[it.id];
            if (a === 'yes') { yes++; considered++; }
            else if (a === 'no') { considered++; }
          });
          return { yes: yes, considered: considered, total: items.length };
        }
        function overallScore() {
          var yes = 0, considered = 0, answered = 0;
          allItems.forEach(function(it) {
            var a = shAudit[it.id];
            if (a === 'yes') { yes++; considered++; answered++; }
            else if (a === 'no') { considered++; answered++; }
            else if (a === 'na') { answered++; }
          });
          var pct = considered > 0 ? Math.round((yes / considered) * 100) : 0;
          return { yes: yes, considered: considered, pct: pct, answered: answered, total: allItems.length };
        }
        var overall = overallScore();
        var auditComplete = overall.answered >= allItems.length;

        var content;
        if (sect === 'overview') {
          content = h('div', { className: 'space-y-3' },
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Welding is more hazardous than most people realize. The visible risks (arc flash, burns, fire) are real but actually less likely to disable you than the cumulative ones (fume inhalation, hearing loss, joint damage, vibration). PPE & Safety covered the basics. This module goes deeper into what welders actually get hurt by, and what protects you over a 40-year career.'),
            h('div', { className: 'bg-rose-50 border-2 border-rose-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-rose-900' }, '⚠ The chronic risks (will affect career-long welders)'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Manganese exposure: '), 'Neurological — Parkinson\'s-like symptoms after years of high exposure. From MIG/stick steel welding fume. NIOSH-cited.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Hexavalent chromium (Cr-VI): '), 'Carcinogenic. From stainless welding fume (hot Cr → Cr-VI). OSHA-regulated since 2006.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Welder\'s lung: '), 'Long-term fume exposure → bronchitis, asthma, increased pneumonia risk.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Noise-induced hearing loss: '), 'Welding itself is moderate (85-95 dB); grinding (95-110 dB) + chipping + adjacent processes push past safe limits.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Joint + back damage: '), 'Awkward positions held for hours. Most welders develop chronic back, shoulder, or knee issues by age 50.')
            ),
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4' },
              h('div', { className: 'text-sm font-bold text-emerald-900 mb-2' }, '✓ What protects you (career-long)'),
              h('p', { className: 'text-sm text-slate-800' }, '1. ALWAYS use local exhaust ventilation (LEV) on every weld, not just stainless. 2. Wear hearing protection on the shop floor, not just when grinding. 3. Take micro-breaks every 30-60 min for posture reset. 4. Get a doctor who knows occupational medicine; do annual spirometry. 5. Know your OSHA right to a clean shop + report violations without retaliation.')
            )
          );
        } else if (sect === 'fume') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '☁ Welding fume — what\'s in it + why it matters'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Welding fume is a complex chemical mix. The base composition depends on (1) base metal, (2) electrode/filler, (3) coatings/contamination, (4) shielding gas. NIOSH + ACGIH track Permissible Exposure Limits (PELs) for each constituent.'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Major fume constituents by metal'),
            h('div', { className: 'space-y-2' },
              [{ metal: 'Mild steel (carbon steel)', fume: 'Iron oxide (rust dust — main mass), some manganese, traces of silica + chrome from electrode coating', risk: 'Iron oxide irritates lungs (siderosis — benign but visible on X-ray). Manganese is the bigger long-term concern: cumulative neurotoxicity (Parkinson-like). OSHA PEL: 5 mg/m³ Mn (Cal/OSHA: 0.2 mg/m³ — much stricter).' },
               { metal: 'Stainless steel (300-series, 400-series)', fume: 'Hexavalent chromium (Cr-VI), nickel, manganese, iron oxide', risk: 'Cr-VI is CARCINOGENIC (Group 1, IARC). OSHA-regulated (29 CFR 1910.1026). Cancer risk + asthma + lung damage. Nickel also carcinogenic + dermatitis. STAINLESS WELDING REQUIRES local exhaust ventilation, period.' },
               { metal: 'Galvanized steel', fume: 'Zinc oxide (high), plus regular steel fume', risk: 'Metal Fume Fever — flu-like symptoms 4-12 hours after exposure (chills, fever, muscle aches). Resolves in 24-48 hours but repeated exposure → chronic issues. PRE-GRIND galvanizing off the weld zone.' },
               { metal: 'Aluminum', fume: 'Aluminum oxide + ozone (from arc + UV interaction with shielding gas)', risk: 'Ozone is respiratory irritant — pulmonary edema in high exposure. Aluminum oxide is mild irritant. Ventilation matters.' },
               { metal: 'Cadmium-plated steel (older fasteners, some old parts)', fume: 'Cadmium oxide', risk: 'EXTREMELY TOXIC. Pulmonary edema → death in hours from high acute exposure. CARCINOGENIC chronically. Pre-remove all cadmium coating; if you must weld, full respirator + ventilation + medical surveillance.' },
               { metal: 'Lead-painted steel (old structural, old farm equipment)', fume: 'Lead vapor + lead oxide', risk: 'Neurotoxic. Cumulative. Lead blood levels rise quickly. STRIP PAINT before welding; even with stripping, residue remains a concern.' },
               { metal: 'Berylium-copper (some aerospace, some electrical)', fume: 'Beryllium oxide', risk: 'Chronic Beryllium Disease (CBD) — irreversible lung scarring. Genetic susceptibility varies (2-10% of people). Acute exposure can sensitize someone for life. Don\'t weld Be-Cu without specialized training + medical clearance.' }].map(function(m, i) {
                return h('div', { key: i, className: 'bg-rose-50 border-2 border-rose-200 rounded-xl p-3' },
                  h('div', { className: 'font-bold text-rose-900 mb-1' }, m.metal),
                  h('p', { className: 'text-xs text-slate-700 mb-1' }, h('strong', null, 'Fume contains: '), m.fume),
                  h('p', { className: 'text-sm text-slate-800' }, m.risk)
                );
              })
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800 mt-3' }, 'Ventilation hierarchy (most → least protective)'),
            h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4 space-y-2' },
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, '1. Source capture LEV: '), 'Fume extractor with capture hood within 6-12" of the arc. REMOVES fume before it enters breathing zone. Gold standard. Examples: Lincoln X-Tractor, Miller FILTAIR. ~$1,500-5,000.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, '2. On-gun extraction: '), 'MIG gun with built-in extraction port. Heavier gun + needs hose to extractor. Excellent — captures at source.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, '3. Downdraft table / backdraft bench: '), 'Workbench that pulls fume downward. Good for parts you can move to it.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, '4. General room ventilation: '), 'Wall fans, makeup air. Dilutes fume but doesn\'t prevent breathing-zone exposure. MINIMUM acceptable.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, '5. PAPR (Powered Air-Purifying Respirator): '), 'Helmet with HEPA filter blower. WEAR when extraction not feasible. ~$1,200-2,000.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, '6. Half-mask N95/P100: '), 'Fit-tested respirator. Compatible with most welding hoods. Last-resort when LEV not available; uncomfortable for long welds.')
            )
          );
        } else if (sect === 'eyes') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '👁 Arc flash + eye protection — beyond "wear a hood"'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Welding produces UV (260-400 nm) + visible (400-700 nm) + IR (700-2500 nm). All three damage eyes. Damage from UV is the most common — arc flash (photokeratitis) feels like sand in your eyes 6-12 hours later. Repeated exposure → cataracts + retinal damage.'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Welding helmet shade selection'),
            h('div', { className: 'space-y-2' },
              [{ proc: 'Stick (SMAW) <60A', shade: '7-8', note: 'Light farm-grade work, small repairs.' },
               { proc: 'Stick (SMAW) 60-160A', shade: '10', note: 'Most common — general structural work.' },
               { proc: 'Stick (SMAW) 160-250A', shade: '11-12', note: 'Heavy plate.' },
               { proc: 'MIG (GMAW) <100A', shade: '10', note: 'Light auto-body, sheet metal.' },
               { proc: 'MIG (GMAW) 100-175A', shade: '11', note: 'General plate work.' },
               { proc: 'MIG (GMAW) 175-300A', shade: '12-13', note: 'Heavy fabrication.' },
               { proc: 'TIG (GTAW) <50A', shade: '10', note: 'Stainless thin gauge, AC aluminum start.' },
               { proc: 'TIG (GTAW) 50-150A', shade: '11', note: 'Most common TIG work.' },
               { proc: 'TIG (GTAW) 150-250A', shade: '12-13', note: 'Heavier TIG.' },
               { proc: 'Plasma cutting/gouging', shade: '11-14', note: 'Plasma arc is INTENSE — bright + UV-heavy.' },
               { proc: 'Oxy-acetylene cutting/welding', shade: '4-6', note: 'No electric arc — much less UV; visible flame is what you\'re protecting against.' }].map(function(s, i) {
                return h('div', { key: i, className: 'bg-fuchsia-50 border-2 border-fuchsia-200 rounded-xl p-2' },
                  h('div', { className: 'flex justify-between items-center text-sm' },
                    h('span', { className: 'font-bold text-fuchsia-900' }, s.proc),
                    h('span', { className: 'font-mono text-fuchsia-700' }, 'Shade ' + s.shade)
                  ),
                  h('p', { className: 'text-xs text-slate-700' }, s.note)
                );
              })
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800 mt-3' }, 'Auto-darkening helmets — features that matter'),
            h('div', { className: 'bg-purple-50 border-2 border-purple-300 rounded-xl p-4 space-y-2' },
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Switching speed: '), '1/10,000 sec or faster. Older budget helmets at 1/3,600 sec — slow enough to flash your eyes. Spend the money.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Viewing area: '), 'Bigger = better visibility. 4×3" minimum; 4×4" or 5×4" preferred for pipe + structural work.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Sensor count: '), '4 sensors = better for awkward positions. 2 sensors fine for bench work.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Variable shade: '), 'Shade 9-13 range covers all common processes. Lower (5-8) range needed for grinding mode + light TIG.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Solar + battery: '), 'Solar charges battery during arc time. Replaceable batteries (lithium) are better than non-replaceable.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'TRUE COLOR vs amber: '), 'True-color (1/1/1/1 or 1/1/1/2 optical class) = much easier to see puddle + edges. Worth the upgrade.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Brands worth considering: '), 'Lincoln Viking 3350 series, Miller Digital Infinity / Elite, Optrel Crystal 2.0, Speedglas 9100XXi. ~$200-500.')
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '💡 Adjacent-welder protection'),
              h('p', { className: 'text-sm text-slate-800' }, 'A welder 30 ft away from your arc still gets flashed if line-of-sight. Use welding screens / curtains. If you walk into a shop where someone is welding without a screen, that\'s a real OSHA concern. Photokeratitis is acute + painful — most welders get it at least once early in their career.')
            )
          );
        } else if (sect === 'noise') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🔊 Noise exposure + hearing loss — silent career-killer'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'OSHA action level is 85 dBA (8-hr time-weighted). Above that = hearing conservation program required. Welding shops routinely exceed this from adjacent processes — not necessarily from welding itself.'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Typical shop noise levels'),
            h('div', { className: 'space-y-1' },
              [{ act: 'Conversational speech', db: '60 dBA' },
               { act: 'MIG welding (steady arc)', db: '70-85 dBA' },
               { act: 'Stick welding', db: '80-95 dBA' },
               { act: 'TIG welding', db: '75-85 dBA' },
               { act: 'Plasma cutting', db: '95-105 dBA' },
               { act: 'Angle grinder (4.5")', db: '95-105 dBA' },
               { act: 'Angle grinder (7-9")', db: '100-115 dBA' },
               { act: 'Needle scaler / chipping hammer', db: '95-110 dBA' },
               { act: 'Air arc gouging (CAC-A)', db: '105-115 dBA — among loudest shop tools' },
               { act: 'Sandblasting cabinet', db: '95-105 dBA' },
               { act: 'OSHA action level (8-hr exposure)', db: '85 dBA' },
               { act: 'OSHA PEL (8-hr)', db: '90 dBA' },
               { act: 'Pain threshold / immediate damage', db: '120 dBA + (jet engine close range)' }].map(function(n, i) {
                return h('div', { key: i, className: 'flex justify-between bg-fuchsia-50 border-l-4 border-fuchsia-400 rounded-r px-3 py-1.5' },
                  h('span', { className: 'text-sm text-slate-800' }, n.act),
                  h('span', { className: 'text-sm font-mono font-bold text-fuchsia-900' }, n.db)
                );
              })
            ),
            h('div', { className: 'bg-purple-50 border-2 border-purple-300 rounded-xl p-4 mt-3 space-y-2' },
              h('div', { className: 'text-sm font-bold text-purple-900' }, '💡 Doubling rule'),
              h('p', { className: 'text-sm text-slate-800' }, 'Every 5 dB increase = HALF the allowed exposure time. 85 dB = 8 hr. 90 dB = 4 hr. 95 dB = 2 hr. 100 dB = 1 hr. 110 dB = 15 min. A welder who spends 2 hours grinding without protection has already exceeded daily safe exposure.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Hearing protection options: '), 'Foam plugs (NRR 28-33, cheap, comfortable for long use). Moldable silicone (NRR 22-27, reusable). Earmuffs (NRR 20-30, easy on/off, can stack over plugs for combined ~35 NRR). Double protection (plugs + muffs) for grinding + air arc gouging.')
            )
          );
        } else if (sect === 'burns') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🔥 Burns, UV, + thermal injury'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Direct burns from spatter + hot metal are the most common acute injury in welding. UV burns ("sunburn under your shirt") accumulate over a shift. Long-term skin cancer risk for unprotected welders is elevated 2-4× general population.'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Burn categories you\'ll encounter'),
            h('div', { className: 'space-y-2' },
              [{ type: 'Spatter burns (1st-2nd degree)', cause: 'Hot spatter on bare skin or through synthetic clothing. Most common in MIG/FCAW.', prevent: 'Long-sleeve cotton/wool (never polyester — melts), leather welding jacket for sustained work, leather sleeves at minimum. Tuck pants over boots, button collar.' },
               { type: 'UV skin burn', cause: 'Arc UV penetrates thin/unbuttoned shirts within ~30 minutes of arc time. Worst on neck, wrists, exposed arms.', prevent: 'Cotton long sleeves buttoned at cuffs, leather collar protection, neck shield on helmet. SPF 30+ on any exposed skin if working outdoors.' },
               { type: 'Eye flash (UV cornea burn)', cause: 'Arc strike without hood, or adjacent welder without screen.', prevent: 'Hood always BEFORE arc strike. Welding screens. Treatment: cool compress + over-counter pain reliever + ophthalmologist if persistent.' },
               { type: 'Hot metal contact burns', cause: 'Picking up hot stock without checking. Welding shops have a saying: every piece of metal in this shop might be hot.', prevent: 'Tongs/pliers. Visual + heat indicator (chalk lines fade above 750°F). Move parts only after they\'re obviously cooled OR with PPE.' },
               { type: 'Cutting torch backfire', cause: 'Improper purging, wrong tip size, plugged tip. Loud pop + flame may travel back into hose.', prevent: 'Check valves + flashback arrestors on regulators. Proper torch lighting sequence (gas, oxygen, light, adjust). Don\'t weld with leaking fittings.' },
               { type: 'Compressed gas cylinder accident', cause: 'Cylinder falls, valve breaks off → "torpedo" (cylinder can fly through cinderblock walls). Worst-case industrial accident.', prevent: 'ALWAYS chain cylinders upright. Valve caps on when moving. Cylinder cart with strap. Never roll on ground or drop.' }].map(function(b, i) {
                return h('div', { key: i, className: 'bg-rose-50 border-2 border-rose-200 rounded-xl p-3' },
                  h('div', { className: 'font-bold text-rose-900 mb-1' }, b.type),
                  h('p', { className: 'text-xs text-slate-700 mb-1' }, h('strong', null, 'Cause: '), b.cause),
                  h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Prevent: '), b.prevent)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '💡 Fire prevention'),
              h('p', { className: 'text-sm text-slate-800' }, 'Hot work permits are required in many industrial settings. Sweep area before welding (especially flammable debris). Have ABC fire extinguisher within 35 ft. Hot work watch (someone else watching for fire) for 30 min minimum after stopping. Most shop fires start hours after welding from smoldering material — not during welding itself.')
            )
          );
        } else if (sect === 'ergonomics') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🦴 Ergonomics + chronic injury — the slow erosion'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Most welders who leave the trade early do so for orthopedic reasons, not acute injury. Welding positions (overhead, kneeling, bent over) accumulate damage over years. Smart welders protect themselves with deliberate ergonomics from day one.'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Highest-risk welding positions'),
            h('div', { className: 'space-y-2' },
              [{ pos: 'Overhead welding (4G plate, 5G pipe)', risk: 'Cervical spine compression + shoulder rotator cuff damage. Neck looks up for sustained periods. Spatter falls down hood + collar.', mitigate: 'Take breaks every 15-20 min. Use shoulder brace if you do a lot of overhead. Adjust workpiece to come to you when possible (use turning gear, positioners).' },
               { pos: 'Vertical-up welding (3G, 6G pipe)', risk: 'Lower back strain from awkward stance. Shoulder fatigue from sustained gun position.', mitigate: 'Welder seat for sit-down vertical work. Knee pad if kneeling. Keep gun balanced — proper grip prevents wrist strain.' },
               { pos: 'Pipe welding 5G/6G fixed position', risk: 'Working AROUND the pipe — body twists into uncomfortable shapes. The 6G position (pipe at 45°) is considered the hardest qualification because it puts you through every angle.', mitigate: 'Use pipe stands at proper height. Rotate pipe rather than your body when possible. Pipe positioner ($1500-15000) for repeat work pays for itself in saved bodies.' },
               { pos: 'Confined space welding (tanks, hulls)', risk: 'Cramped position + heat + fume + ventilation issues. Compound stressor.', mitigate: 'Confined-space entry permit + atmosphere monitoring + ventilation + rescue plan. NEVER weld in confined space alone. Lots of breaks.' },
               { pos: 'Long flat welds (production)', risk: 'Repetitive strain on dominant wrist + forearm. Welder elbow (similar to tennis elbow).', mitigate: 'Switch hands periodically if you can. Anti-vibration gloves. Proper gun balance. Stretching breaks.' }].map(function(p, i) {
                return h('div', { key: i, className: 'bg-purple-50 border-2 border-purple-200 rounded-xl p-3' },
                  h('div', { className: 'font-bold text-purple-900 mb-1' }, p.pos),
                  h('p', { className: 'text-xs text-slate-700 mb-1' }, h('strong', null, 'Risk: '), p.risk),
                  h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Mitigate: '), p.mitigate)
                );
              })
            ),
            h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4' },
              h('div', { className: 'text-sm font-bold text-fuchsia-900 mb-2' }, '💡 Career-preserving habits'),
              h('ul', { className: 'text-sm text-slate-800 space-y-1' },
                h('li', null, '• Daily stretching, especially neck + shoulders + lower back (5 min morning + 5 min evening).'),
                h('li', null, '• Hydrate (welding shops are hot; dehydration multiplies fatigue).'),
                h('li', null, '• Use the positioner / turning gear EVERY time, not just when supervisor watching.'),
                h('li', null, '• Welder\'s stool / chair for any bench work that lasts >30 min.'),
                h('li', null, '• Anti-fatigue mats on concrete floor.'),
                h('li', null, '• Off-season: weight training (lower back + core), yoga (flexibility), swimming (low-impact cardio).'),
                h('li', null, '• If something hurts repeatedly: see a doctor BEFORE it becomes a chronic issue.')
              )
            )
          );
        } else if (sect === 'electrical') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '⚡ Electrical safety + confined space — the rarely-discussed risks'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Welding involves significant voltage + current. Most welders never get electrocuted, but the conditions for it exist constantly. Confined-space welding adds atmospheric hazards on top of everything else.'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Electrical hazards specific to welding'),
            h('div', { className: 'space-y-2' },
              [{ haz: 'Open-circuit voltage (OCV)', detail: 'Welding machines have 60-100V at the electrode when not arcing. Enough to shock you, especially if you\'re sweaty or standing on wet ground. Worse with AC than DC.' },
               { haz: 'Wet/conductive conditions', detail: 'Welding outside in rain, on damp concrete, in tanks with residual moisture = significantly higher shock risk. Use rubber-soled boots, dry gloves, insulating mats.' },
               { haz: 'Grounding loops', detail: 'If multiple welding machines share grounds + work clamps are crossed, current can flow through your body. Always work-clamp directly to the workpiece, not through ladders or staging.' },
               { haz: 'Cable damage', detail: 'Worn welding leads exposing copper, damaged work clamps, cracked electrode holders = direct contact path. Inspect every shift. Replace cables when insulation cracks (don\'t patch).' },
               { haz: 'Cylinder + arc proximity', detail: 'NEVER strike an arc on a compressed gas cylinder (even empty). Even a brief arc strike can cause failure under pressure.' }].map(function(e, i) {
                return h('div', { key: i, className: 'bg-rose-50 border-l-4 border-rose-400 rounded-r-xl p-3' },
                  h('div', { className: 'font-bold text-rose-900 mb-1' }, e.haz),
                  h('p', { className: 'text-sm text-slate-800' }, e.detail)
                );
              })
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800 mt-3' }, 'Confined-space welding — the compounded hazard'),
            h('div', { className: 'bg-rose-50 border-2 border-rose-300 rounded-xl p-4 space-y-2' },
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Definition: '), 'Tanks, ship hulls, boilers, storage vessels — enclosed spaces not designed for human occupancy with limited entry/exit.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'OSHA 29 CFR 1910.146: '), 'Permit-required confined space. Atmosphere testing (O2, LEL, toxics) before + during entry. Continuous ventilation. Rescue plan + standby attendant.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Welding-specific issues: '), 'Shielding gases (argon, CO2) DISPLACE oxygen — silent killer. Heavier-than-air gases pool in low spots. Fume + ozone accumulate fast. Sparks can ignite trapped vapors.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'PROTOCOL: '), '(1) Confined space permit, (2) atmospheric testing, (3) forced ventilation, (4) standby attendant outside with rescue equipment, (5) communication (radio or signal rope), (6) NEVER alone, (7) machine ON/OFF accessible from outside.'),
              h('p', { className: 'text-sm text-slate-800 font-bold' }, 'Most confined-space fatalities happen to the would-be rescuer who entered without PPE. If something goes wrong, signal — don\'t enter.')
            )
          );
        } else if (sect === 'mental') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🧠 Mental health, workplace dynamics, + the long career'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Welding shops + shipyards + construction sites have distinct cultures. Some are welcoming + supportive; some are rough + exclusionary. Career-long welders need realistic strategies for the workplace itself, not just the welding.'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Mental + emotional realities of trade work'),
            h('div', { className: 'space-y-2' },
              [{ topic: 'Repetitive work + cognitive fatigue', detail: 'Production welding is mentally repetitive. Brain wants stimulation. Common coping: podcasts on Bluetooth bone-conduction headphones (compatible with hood), planning side projects in head, social conversation during breaks. Some welders take additional certifications (CWI inspector path) to add intellectual variety.' },
               { topic: 'Substance use risk', detail: 'Trade culture historically + still includes drinking, opioid use (often from work-related injuries → pain pills). Risk factor for transitioning off pain meds → alcohol → harder substances. Be aware. Many shops drug-test (especially safety-sensitive work like BIW). Maine SAMHSA helpline: 1-800-499-0027. Free, confidential.' },
               { topic: 'Suicide rate in construction trades', detail: 'Construction has the highest male suicide rate of any US industry (~53 per 100,000 — about 4× general rate). Combination of isolation, pain, substance use, masculinity culture that discourages help-seeking. AFSP + Construction Industry Alliance for Suicide Prevention have free resources. If you\'re struggling: 988 (Suicide & Crisis Lifeline) — text or call.' },
               { topic: 'Bullying + hazing', detail: 'Still happens, especially in older shops. New welders often pranked (welded boots to floor, etc.) — usually meant good-naturedly but can cross into harassment. Know your rights: workplace harassment based on protected class (sex, race, disability, sexual orientation) is illegal. Maine Human Rights Commission: 207-624-6290.' },
               { topic: 'Women + LGBTQ+ welders', detail: 'Maine\'s welding workforce is ~5-7% women (slowly growing). Some shops are excellent; some still have culture work to do. Resources: Women in Welding (national organization), Maine Tradeswomen Association, AWS Women in Welding Committee. LGBTQ+ welders: Pride At Work (AFL-CIO affiliate) has resources for union members.' },
               { topic: 'Neurodivergent welders', detail: 'Many welders (estimated 20%+) are dyslexic, ADHD, autistic, or have other neurodivergent profiles. Welding rewards visual-spatial thinking + focused attention + tactile skill — often a great fit. Reasonable accommodations are protected by ADA. Common requests: written instructions, quieter break area, predictable schedule.' },
               { topic: 'Work-life sustainability', detail: 'Welding pays well but can demand: long shifts, OT, travel for shutdown work. Many welders earn high incomes by working unsustainable hours. Plan early career around saving for shop equipment, education, real estate — assets that produce income beyond your body. The welders who do best long-term have a Plan B beyond their hands.' }].map(function(t, i) {
                return h('div', { key: i, className: 'bg-fuchsia-50 border-2 border-fuchsia-200 rounded-xl p-3' },
                  h('div', { className: 'font-bold text-fuchsia-900 mb-1' }, t.topic),
                  h('p', { className: 'text-sm text-slate-800' }, t.detail)
                );
              })
            ),
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4' },
              h('div', { className: 'text-sm font-bold text-emerald-900 mb-2' }, '🟢 Help is available — no stigma needed'),
              h('p', { className: 'text-sm text-slate-800' }, '988 Suicide & Crisis Lifeline (call or text). SAMHSA National Helpline 1-800-662-4357 (substance use, free, 24/7). Maine 211 (any social service). Most union locals + employers have Employee Assistance Programs (EAPs) — free + confidential counseling, usually 4-8 sessions per issue. Use them. Welders need mental health resources as much as anyone — often more.')
            )
          );
        }

        var shModeTabs = [
          { id: 'browse', label: '⚕️ Browse topics' },
          { id: 'audit',  label: '🛡 How safe is your shop?' }
        ];

        function answerButton(qid, val, label, color) {
          var active = (shAudit[qid] === val);
          return h('button', {
            onClick: function() { setAuditAnswer(qid, val); announce(label); },
            'aria-pressed': active,
            className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' +
              (active ? color + ' text-white border-transparent' : 'bg-white text-slate-800 border-slate-300 hover:border-slate-500')
          }, label);
        }

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '⚕️', title: 'Safety + Health Deep-Dive' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { role: 'tablist', 'aria-label': 'Safety mode', className: 'flex flex-wrap gap-2' },
              shModeTabs.map(function(t) {
                var sel = (shMode === t.id);
                return h('button', {
                  key: t.id, role: 'tab', 'aria-selected': sel,
                  onClick: function() { setShMode(t.id); announce(t.label); },
                  className: 'px-4 py-2 rounded-lg border-2 text-sm font-bold transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' +
                    (sel ? 'bg-fuchsia-700 text-white border-fuchsia-800' : 'bg-white text-slate-800 border-slate-300 hover:border-fuchsia-400')
                }, t.label);
              })
            ),
            shMode === 'browse' && h('div', { className: 'flex flex-wrap gap-2' },
              sects.map(function(s) {
                var sel = (sect === s.id);
                return h('button', {
                  key: s.id,
                  onClick: function() { setSect(s.id); announce(s.label); },
                  className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' +
                    (sel ? 'bg-fuchsia-700 text-white border-fuchsia-800' : 'bg-white text-slate-800 border-slate-300 hover:border-fuchsia-400')
                }, s.label);
              })
            ),
            shMode === 'browse' && h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' }, content),
            shMode === 'audit' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4' },
                h('p', { className: 'text-sm text-slate-800' }, 'Walk through your actual shop, classroom shop, or any shop you\'ve worked in. Answer Yes / No / Not applicable for each. We\'ll score your environment overall + by category. Not a replacement for an OSHA-level audit, but a strong starting checklist.')
              ),
              h('div', { className: 'bg-white rounded-2xl border-2 border-slate-300 p-5 space-y-2' },
                h('div', { className: 'flex justify-between items-baseline flex-wrap gap-2' },
                  h('div', { className: 'text-sm font-bold text-slate-800' }, 'Progress: ' + overall.answered + ' / ' + overall.total + ' answered'),
                  h('button', {
                    onClick: resetAudit,
                    className: 'text-xs font-bold px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                  }, '↺ Reset audit')
                ),
                h('div', { className: 'h-2 bg-slate-200 rounded-full overflow-hidden', 'aria-hidden': true },
                  h('div', { className: 'h-full bg-fuchsia-600 transition-all', style: { width: ((overall.answered / overall.total) * 100) + '%' } })
                )
              ),
              auditCategories.map(function(c, ci) {
                var sc = categoryScore(c.id);
                var pct = sc.considered > 0 ? Math.round((sc.yes / sc.considered) * 100) : null;
                return h('div', { key: c.id, className: 'bg-white rounded-2xl shadow border-2 border-slate-300 p-5' },
                  h('div', { className: 'flex justify-between items-baseline flex-wrap gap-2 mb-3' },
                    h('h3', { className: 'text-base font-black text-fuchsia-900' }, c.label),
                    pct != null && h('div', { className: 'text-sm font-mono font-bold ' + (pct >= 80 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-rose-700') }, pct + '% (' + sc.yes + '/' + sc.considered + ')')
                  ),
                  h('div', { className: 'space-y-3' },
                    c.items.map(function(it) {
                      return h('div', { key: it.id, className: 'bg-slate-50 border border-slate-300 rounded-xl p-3' },
                        h('p', { className: 'text-sm text-slate-800 mb-2' }, it.q),
                        h('div', { className: 'flex flex-wrap gap-2' },
                          answerButton(it.id, 'yes', '✓ Yes', 'bg-emerald-600'),
                          answerButton(it.id, 'no',  '✗ No', 'bg-rose-600'),
                          answerButton(it.id, 'na',  '— N/A', 'bg-slate-500')
                        )
                      );
                    })
                  )
                );
              }),
              auditComplete && h('div', { className: 'bg-fuchsia-100 border-4 border-fuchsia-500 rounded-2xl p-6 space-y-3' },
                h('h3', { className: 'text-xl font-black text-fuchsia-900' }, '📊 Your shop score: ' + overall.pct + '%'),
                h('div', { className: 'text-sm text-slate-800' },
                  overall.pct >= 85
                    ? '🟢 Strong safety culture. This is what a well-run shop looks like. Keep auditing — annual is a good cadence.'
                    : overall.pct >= 65
                    ? '🟡 Solid but improvable. Pick the lowest-scoring category and address those gaps first.'
                    : overall.pct >= 40
                    ? '🟠 Real gaps. Welders in this environment are at meaningfully elevated risk. Identify the 3 worst items + bring them up at the next safety meeting.'
                    : '🔴 Significant safety concerns. OSHA-reportable issues likely present. This shop needs an outside safety audit + management commitment.'
                ),
                h('div', { className: 'bg-white rounded-xl p-3 text-xs text-slate-700' },
                  h('strong', null, 'Reporting concerns: '), 'OSHA accepts complaints from any worker or member of the public. Online: osha.gov/workers/file-complaint. Anonymous reports protected by law. State plan in Maine: Maine Department of Labor (also handles state-level safety).'
                )
              )
            ),
            h(TeacherNotes, {
              standards: ['OSHA 29 CFR 1910.252 (Welding)', 'OSHA 1910.146 (Confined Space)', 'OSHA 1910.1026 (Cr-VI)', 'NIOSH welding fume guidance', 'ACGIH TLVs'],
              questions: [
                'Why is stainless welding more dangerous to lung health than mild steel welding?',
                'Walk through the OSHA hierarchy of controls — elimination, substitution, engineering, admin, PPE — applied to welding fume.',
                'A 50-year-old welder has hearing loss, back pain, and Parkinson-like tremors. Which of these were preventable? How?'
              ],
              misconceptions: [
                '"I\'ll just hold my breath while I weld" — welding fume lingers in breathing zone for minutes after arc stops.',
                '"PPE is enough" — PPE is LAST in OSHA hierarchy; engineering controls (ventilation) come first.',
                '"Real welders don\'t need to take breaks" — chronic injury data says they do.'
              ],
              extension: 'Visit a working welding shop + observe ventilation. Is there local exhaust at each station, or just wall fans? Is hearing protection visible? Are PPE policies posted? Compare what you see to what OSHA actually requires.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 20: WELDING MATH + BLUEPRINT READING
      // ─────────────────────────────────────────────────────
      function MathBlueprintLab() {
        var mbSect = usePersistedState('mb_sect', 'overview');
        var sect = mbSect[0], setSect = mbSect[1];
        var mbModeState = usePersistedState('mb_mode', 'browse'); // 'browse' | 'quiz'
        var mbMode = mbModeState[0], setMbMode = mbModeState[1];
        var mbQIdxState = usePersistedState('mb_q_idx', 0);
        var mbQIdx = mbQIdxState[0], setMbQIdx = mbQIdxState[1];
        var mbQScoreState = usePersistedState('mb_q_score', 0);
        var mbQScore = mbQScoreState[0], setMbQScore = mbQScoreState[1];
        var mbQPickedState = usePersistedState('mb_q_picked', null);
        var mbQPicked = mbQPickedState[0], setMbQPicked = mbQPickedState[1];

        var sects = [
          { id: 'overview',  label: '📐 Overview' },
          { id: 'arithmetic',label: '🧮 Shop arithmetic' },
          { id: 'measure',   label: '📏 Measurement + tolerance' },
          { id: 'geometry',  label: '📐 Geometry + angles' },
          { id: 'prints',    label: '📋 Blueprint reading' },
          { id: 'symbols',   label: '🔣 Symbol fluency' },
          { id: 'estimate',  label: '🧾 Estimating + bidding' }
        ];

        // ── Symbol Match quiz data ──
        // Each question: viz describes how to draw a weld symbol with our
        // simple ref-line layout (other-side above, arrow-side below).
        // Symbols use: ▲ = fillet triangle, ⌵ = V-groove, ⌶ = bevel groove,
        // ○ = weld-all-around circle, ● = field-weld flag.
        var symbolQuestions = [
          {
            viz: { other: '', arrow: '▲ 1/4', tail: '', junction: '' },
            prompt: 'What does this symbol mean?',
            options: [
              'A 1/4-inch fillet weld on arrow side only',
              'A 1/4-inch fillet weld on both sides',
              'A 1/4-inch fillet weld on the other side only',
              'A 1/4-inch V-groove weld on arrow side'
            ],
            correct: 0,
            explain: 'Triangle below the reference line = arrow-side fillet. "1/4" is the leg size. No symbol above means no other-side weld.'
          },
          {
            viz: { other: '▲ 1/4', arrow: '▲ 1/4', tail: '', junction: '' },
            prompt: 'What does this symbol mean?',
            options: [
              '1/4-inch fillet weld on arrow side only',
              '1/4-inch fillet welds on BOTH sides, continuous',
              '1/4-inch fillet on arrow side + 1/8-inch on other',
              'Stagger-welded 1/4-inch fillets'
            ],
            correct: 1,
            explain: 'Triangles on BOTH sides of the reference line = weld on both sides. Same 1/4 size on each. Continuous (no length number).'
          },
          {
            viz: { other: '', arrow: '▲ 3/16-2(6)', tail: '', junction: '' },
            prompt: 'What does this symbol mean?',
            options: [
              '3/16 fillet, 2" long, 6" deep',
              '3/16 fillet, 2 welds at 6 amps',
              '3/16 fillet, intermittent 2" long welds, 6" pitch (center-to-center)',
              '3/16 fillet, 2" overlap, 6 passes'
            ],
            correct: 2,
            explain: 'The "L-P" format (length-pitch) means intermittent welding. 2" of weld every 6" of joint. Saves filler + heat input on long fillets.'
          },
          {
            viz: { other: '', arrow: '⌵ 60°', tail: '', junction: '' },
            prompt: 'What does this symbol mean?',
            options: [
              'V-groove weld, 60° bevel angle, arrow side',
              'V-shaped fillet, 60% penetration',
              'Bevel weld, 60° included angle, other side',
              'Vertical weld, 60° from horizontal'
            ],
            correct: 0,
            explain: 'The ⌵ shape is a V-groove. Number with ° = included angle (total angle of the V). Below the line = arrow side preparation.'
          },
          {
            viz: { other: '', arrow: '⌵ 60°', tail: '', junction: '', root: '1/16' },
            prompt: 'A 1/16 root opening is added to the V-groove. What changes?',
            options: [
              'The weld is now stronger',
              'The plates are placed 1/16" apart at the root before welding',
              'The bevel angle drops to 1/16 of 60°',
              '1/16" of root reinforcement is required'
            ],
            correct: 1,
            explain: 'Root opening = gap between the two plates at the root of the joint before welding starts. 1/16" is typical to allow full root penetration.'
          },
          {
            viz: { other: '', arrow: '▲ 1/4', tail: '', junction: '○' },
            prompt: 'What does the circle at the junction tell the welder?',
            options: [
              'Weld a circle of metal 1/4 thick',
              'This is a circular weld pattern',
              'Weld extends completely around the joint (weld-all-around)',
              'Use a round electrode'
            ],
            correct: 2,
            explain: 'Open circle ○ at the reference-line/arrow junction = weld-all-around. Common for pipe-to-plate, post base, gusset attachments.'
          },
          {
            viz: { other: '', arrow: '▲ 1/4', tail: '', junction: '●' },
            prompt: 'What does the filled (black) flag at the junction tell the welder?',
            options: [
              'This weld must be inspected before next operation',
              'This weld is made in the field (not in the shop)',
              'This is a black-coated electrode weld',
              'Welder must sign off on this weld'
            ],
            correct: 1,
            explain: 'Filled flag = field weld. Tells fabrication shop NOT to make this weld — it gets done at the install site. Affects equipment + procedure choice.'
          },
          {
            viz: { other: '⌵ 60°', arrow: '⌵ 60°', tail: '', junction: '' },
            prompt: 'What does this symbol mean?',
            options: [
              'Single V-groove with 120° total angle',
              'Double V-groove (V from both sides) with 60° angle each',
              'Two separate 60° beads',
              'A 60° bevel from arrow side only'
            ],
            correct: 1,
            explain: 'V-groove on BOTH sides of the line = double-V groove. Used on thick plate where single-V would need too much filler. Each side beveled to 60°.'
          },
          {
            viz: { other: '', arrow: '▲ 1/4', tail: 'GTAW · WPS-22', junction: '' },
            prompt: 'What does the tail "GTAW · WPS-22" specify?',
            options: [
              'A 22-second welding time',
              'Use TIG (GTAW) process per Welding Procedure Specification #22',
              'The weld is graded GT-22 quality',
              'Travel speed of 22 inches per minute'
            ],
            correct: 1,
            explain: 'The tail of a weld symbol references documents. GTAW = the process. WPS-22 = a specific written procedure that defines exact parameters (volts, amps, gas, technique).'
          },
          {
            viz: { other: '', arrow: '⌶ 1/4', tail: '', junction: '' },
            prompt: 'What does this symbol (bevel angle only on arrow plate) mean?',
            options: [
              'A 1/4 fillet weld',
              'A bevel-groove weld — only the arrow-side plate is beveled, 1/4 groove depth',
              'A J-groove weld, 1/4 root',
              'A square-groove weld, 1/4 root opening'
            ],
            correct: 1,
            explain: 'Half-V shape (⌶) = bevel groove. Only ONE plate is prepared (beveled); the other stays square. Used when only one piece can be machined easily — common for plate-to-pipe.'
          }
        ];

        function renderSymbolViz(viz) {
          // Visual approximation of an AWS weld symbol: reference line
          // (horizontal), arrow going down to indicate arrow side. Other
          // side shown above the line, arrow side below. Junction symbol
          // (field flag / all-around) sits on the left end at the arrow.
          // Tail (process spec) sits at the right end as a forked line.
          return h('div', { className: 'bg-white border-2 border-slate-400 rounded-xl p-5 my-4' },
            h('div', { className: 'max-w-md mx-auto' },
              // Other side (above ref line)
              h('div', { className: 'text-center text-lg font-mono font-bold text-slate-800 h-8' }, viz.other || ' '),
              // Reference line + junction + tail
              h('div', { className: 'flex items-center justify-center gap-1' },
                h('span', { className: 'text-2xl text-fuchsia-700 font-bold' }, viz.junction || ' '),
                h('span', { className: 'h-1 bg-slate-800 flex-1', style: { maxWidth: '300px' } }),
                viz.tail && h('span', { className: 'text-xs font-mono bg-slate-100 border border-slate-300 rounded px-2 py-1 ml-1' }, viz.tail)
              ),
              // Arrow side (below ref line)
              h('div', { className: 'text-center text-lg font-mono font-bold text-slate-800 h-8' }, viz.arrow || ' '),
              // Arrow pointing to joint
              h('div', { className: 'flex justify-center' },
                h('span', { className: 'text-2xl text-slate-700' }, '↓'),
                h('span', { className: 'text-xs text-slate-600 ml-2 self-center' }, 'arrow → joint')
              ),
              viz.root && h('div', { className: 'text-center text-xs font-mono text-fuchsia-700 mt-1' }, '(root opening: ' + viz.root + '")')
            )
          );
        }

        function pickAnswer(i) {
          if (mbQPicked != null) return;
          setMbQPicked(i);
          if (i === symbolQuestions[mbQIdx].correct) {
            setMbQScore(mbQScore + 1);
            announce('Correct!');
          } else {
            announce('Not quite — see the explanation.');
          }
        }
        function nextQuestion() {
          var ni = (mbQIdx + 1) % symbolQuestions.length;
          setMbQIdx(ni);
          setMbQPicked(null);
          if (ni === 0) announce('Quiz restarted. Score reset.');
        }
        function resetQuiz() {
          setMbQIdx(0); setMbQScore(0); setMbQPicked(null);
          announce('Quiz reset');
        }
        var curQ = symbolQuestions[mbQIdx] || symbolQuestions[0];

        var content;
        if (sect === 'overview') {
          content = h('div', { className: 'space-y-3' },
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'A skilled welder reads prints, does shop math, and works in fractions + decimals + angles without slowing down. Most failed welder qualifications + most rejected fabrications fail because of math/measurement errors, not bad welds.'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'This module covers the math you actually use: fractions in fab work, measurement tools + tolerance, geometry for cutting + fitting, blueprint conventions, weld symbol fluency, and estimating jobs.'),
            h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-fuchsia-900' }, '🎯 What welders actually use'),
              h('p', { className: 'text-sm text-slate-800' }, '• Fractions (1/16, 3/32, 1/8, 3/16, 1/4, etc.) — everywhere'),
              h('p', { className: 'text-sm text-slate-800' }, '• Decimals (especially for tolerance: ±0.030)'),
              h('p', { className: 'text-sm text-slate-800' }, '• Right triangles + Pythagorean theorem (for cuts + miters)'),
              h('p', { className: 'text-sm text-slate-800' }, '• Trigonometry basics (sin/cos/tan for angled cuts)'),
              h('p', { className: 'text-sm text-slate-800' }, '• Area + volume (for filler material calcs)'),
              h('p', { className: 'text-sm text-slate-800' }, '• Cost-per-pound + cost-per-hour (for bidding)')
            )
          );
        } else if (sect === 'arithmetic') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🧮 Shop arithmetic — the daily math'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Fraction-decimal conversions (memorize)'),
            h('div', { className: 'bg-slate-50 border-2 border-slate-300 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm font-mono' },
              [{ f: '1/64', d: '0.0156' },
               { f: '1/32', d: '0.0313' },
               { f: '3/64', d: '0.0469' },
               { f: '1/16', d: '0.0625' },
               { f: '5/64', d: '0.0781' },
               { f: '3/32', d: '0.0938' },
               { f: '1/8',  d: '0.125' },
               { f: '5/32', d: '0.156' },
               { f: '3/16', d: '0.1875' },
               { f: '7/32', d: '0.219' },
               { f: '1/4',  d: '0.250' },
               { f: '5/16', d: '0.3125' },
               { f: '3/8',  d: '0.375' },
               { f: '7/16', d: '0.4375' },
               { f: '1/2',  d: '0.500' },
               { f: '5/8',  d: '0.625' },
               { f: '3/4',  d: '0.750' },
               { f: '7/8',  d: '0.875' },
               { f: '1"',   d: '1.000' },
               { f: '1.5"', d: '1.500' }].map(function(it, i) {
                return h('div', { key: i, className: 'bg-white border border-slate-300 rounded p-1 text-center' },
                  h('div', { className: 'font-bold text-fuchsia-900' }, it.f),
                  h('div', { className: 'text-slate-600 text-xs' }, it.d)
                );
              })
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800 mt-3' }, 'Practice problems'),
            h('div', { className: 'space-y-2' },
              [{ q: 'Add: 3/16 + 5/32 + 1/8', a: '3/16 = 6/32 · 1/8 = 4/32 · 6/32 + 5/32 + 4/32 = 15/32 (or 0.469)' },
               { q: 'Subtract: 7/8 - 5/16', a: '7/8 = 14/16 · 14/16 - 5/16 = 9/16 (or 0.5625)' },
               { q: 'You need a plate 24-3/4" long, cut from stock 8 ft (96"). How much waste?', a: '96 - 24.75 = 71.25" or 71-1/4" remaining (excluding kerf — typical 1/8" plasma kerf)' },
               { q: 'A bead is 9/16" wide. Pipe OD is 6". How many beads side-by-side to cover the circumference?', a: 'Circumference = π × 6 = 18.85" ÷ 0.5625" per bead ≈ 33.5 beads (round up to 34)' },
               { q: 'Steel weighs 0.283 lb/in³. A 12"×24"×1/2" plate weighs?', a: 'Volume = 12 × 24 × 0.5 = 144 in³. Weight = 144 × 0.283 = 40.75 lb' }].map(function(p, i) {
                return h('div', { key: i, className: 'bg-fuchsia-50 border-2 border-fuchsia-200 rounded-xl p-3' },
                  h('p', { className: 'text-sm font-bold text-slate-800 mb-1' }, 'Q: ' + p.q),
                  h('p', { className: 'text-sm text-slate-700' }, h('strong', null, 'A: '), p.a)
                );
              })
            )
          );
        } else if (sect === 'measure') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '📏 Measurement tools + tolerance'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Tools — when to use what'),
            h('div', { className: 'space-y-2' },
              [{ tool: 'Tape measure (12-25 ft)', use: 'Layout work, rough cuts, structural placement', precision: '~1/16" practical accuracy' },
               { tool: 'Combination square (12")', use: 'Square + 45° angle layout, transfer marks', precision: '~1/64"' },
               { tool: 'Speed square / framing square', use: 'Rapid angle layout (5°-90°), framing work', precision: '~1/32"' },
               { tool: 'Dividers / compass', use: 'Transferring measurements, scribing arcs', precision: '~1/64"' },
               { tool: 'Calipers (6" dial or digital)', use: 'Plate thickness, pipe ID/OD, precise gaps', precision: '0.001" (digital), 0.001-0.002" (dial)' },
               { tool: 'Micrometer (0-1")', use: 'Very precise thickness measurements', precision: '0.0001"' },
               { tool: 'Bevel gauge / protractor', use: 'Transferring angles for bevel cuts', precision: '0.5°' },
               { tool: 'Fillet weld gauge set', use: 'Measuring weld leg size + throat', precision: '1/64"' },
               { tool: 'Bridge cam gauge', use: 'Undercut depth, reinforcement height, leg size — inspector\'s tool', precision: '0.001"' },
               { tool: 'Pi tape (circumference tape)', use: 'Measuring pipe diameter from circumference', precision: '0.005" diameter equivalent' }].map(function(t, i) {
                return h('div', { key: i, className: 'bg-purple-50 border-l-4 border-purple-400 rounded-r-xl p-3' },
                  h('div', { className: 'flex justify-between items-baseline mb-1 flex-wrap' },
                    h('span', { className: 'font-bold text-purple-900' }, t.tool),
                    h('span', { className: 'text-xs font-mono text-purple-700' }, t.precision)
                  ),
                  h('p', { className: 'text-sm text-slate-800' }, t.use)
                );
              })
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800 mt-3' }, 'Tolerance — what ± means'),
            h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4 space-y-2' },
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Bilateral: '), '"24.000 ± 0.030" = 23.970 to 24.030 (60 thou window).'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Unilateral: '), '"24.000 +0.020/-0.000" = 24.000 to 24.020 (20 thou window, only positive allowed).'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Common shop tolerances: '), 'Structural plate ±1/16" length. Pipe cuts ±1/32". Precision fab ±0.020". Aerospace ±0.005".'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Why it matters: '), 'If you make 5 parts each 1/16" oversize, your final 20-ft assembly is 5/16" off — past tolerance, scrap.')
            )
          );
        } else if (sect === 'geometry') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '📐 Geometry + angles for welders'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Pythagorean theorem — daily use'),
            h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4' },
              h('p', { className: 'text-sm text-slate-800 mb-2' }, 'a² + b² = c² where c is the hypotenuse.'),
              h('p', { className: 'text-sm text-slate-800 mb-2' }, h('strong', null, 'Example: '), 'Diagonal of a 3 ft × 4 ft rectangle = √(3² + 4²) = √25 = 5 ft. Square check: a frame that measures 3×4 should diagonal exactly 5 (or 5\'-0").'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, '3-4-5 rule: '), 'Field shortcut — any 3-4-5 triangle is square. Measure 3 along one leg + 4 along the other; the diagonal must be exactly 5. Bigger versions: 6-8-10, 9-12-15, 12-16-20.')
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Triangle types you cut'),
            h('div', { className: 'space-y-2' },
              [{ name: 'Right triangle (90° + 2 others)', use: 'Cutting brackets, gussets, transitions. Use Pythagorean to find missing side.' },
               { name: 'Isoceles (2 equal sides)', use: 'Symmetric brackets, splice plates. Bisect the apex angle to find centerline.' },
               { name: 'Equilateral (3 equal sides, all 60°)', use: 'Decorative work, certain structural patterns. All angles 60°.' },
               { name: '30-60-90', use: 'Cutting hip rafters in steel framing. Side ratios 1 : √3 : 2. If short side = 3", long side = 5.196", hypotenuse = 6".' },
               { name: '45-45-90', use: 'Miter cuts at corners. Both legs equal, hypotenuse = leg × √2. If leg = 4", hypotenuse = 5.657".' }].map(function(tr, i) {
                return h('div', { key: i, className: 'bg-purple-50 border-l-4 border-purple-400 rounded-r-xl p-3' },
                  h('div', { className: 'font-bold text-purple-900 mb-1' }, tr.name),
                  h('p', { className: 'text-sm text-slate-800' }, tr.use)
                );
              })
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800 mt-3' }, 'Trigonometry — when you need it'),
            h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4 space-y-2' },
              h('p', { className: 'text-sm text-slate-800' }, 'SOH-CAH-TOA: sin = opp/hyp, cos = adj/hyp, tan = opp/adj.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Practical example: '), 'You need a brace at 30° from horizontal, climbing 12" vertical. Hypotenuse (brace length) = 12 / sin(30°) = 12 / 0.5 = 24". Horizontal run = 12 / tan(30°) = 12 / 0.577 = 20.78".'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Bevel cut for 30°: '), 'A 1/2" thick plate beveled at 30° from vertical: bevel face = 0.5 / cos(30°) = 0.5 / 0.866 = 0.577" — that\'s the long dimension of the beveled face.')
            )
          );
        } else if (sect === 'prints') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '📋 Reading blueprints + drawings'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Most welding mistakes are misread prints, not bad welding. Knowing the conventions saves time + scrap.'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Anatomy of a blueprint'),
            h('div', { className: 'space-y-2' },
              [{ part: 'Title block (lower right corner)', detail: 'Drawing number, revision letter (A, B, C...), date, drawn-by, checked-by, scale, material specification, weight. ALWAYS check revision letter — old prints have killed parts.' },
               { part: 'Revision block (upper right or in title block)', detail: 'Lists each revision with date + description + initials. Compare to your drawing — if the part you\'re holding doesn\'t match the print revision, STOP.' },
               { part: 'Bill of Materials (BOM)', detail: 'Lists every part by number + quantity + material spec. Cross-reference part labels in the drawing.' },
               { part: 'Views — top/front/side (orthographic)', detail: 'Standard arrangement: top view above front view, right side view to the right of front view. Third-angle projection (US standard) vs first-angle (European) — verify symbol in title block.' },
               { part: 'Section views', detail: 'Cutaway showing internal features. Section line on parent view, "A-A" or "B-B" labels identify which cutting plane.' },
               { part: 'Dimensions', detail: 'In inches (or mm for international). Dimensions to important features, not to arbitrary points. "TYP" or "TYPICAL" = applies to multiple similar features.' },
               { part: 'Tolerance block', detail: 'Default tolerances stated near title block (e.g., "X.XX = ±0.030 unless noted"). Specific tolerances override defaults.' },
               { part: 'Weld symbols', detail: 'Per AWS A2.4. Symbol direction matters — see Symbols module. Multiple welds get multiple symbols.' },
               { part: 'Notes (general + local)', detail: 'GENERAL NOTES near title block apply to whole drawing. LOCAL notes near specific features apply only there. Read them ALL before starting.' }].map(function(p, i) {
                return h('div', { key: i, className: 'bg-fuchsia-50 border-2 border-fuchsia-200 rounded-xl p-3' },
                  h('div', { className: 'font-bold text-fuchsia-900 mb-1' }, p.part),
                  h('p', { className: 'text-sm text-slate-800' }, p.detail)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '💡 Pre-cut checklist'),
              h('ul', { className: 'text-sm text-slate-800 space-y-1' },
                h('li', null, '1. ✓ Revision letter matches BOM + work order'),
                h('li', null, '2. ✓ Material spec matches stock you\'re cutting from'),
                h('li', null, '3. ✓ All dimensions noted (no missing measurements)'),
                h('li', null, '4. ✓ Tolerance understood (default or specific)'),
                h('li', null, '5. ✓ Weld symbols clear (process, size, length, location)'),
                h('li', null, '6. ✓ Cut + drill operations sequenced (some must precede others)')
              )
            )
          );
        } else if (sect === 'symbols') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🔣 AWS weld symbol fluency'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'AWS A2.4 weld symbols are a language. Once fluent, you read a symbol in 2 seconds. Until then, every print is a translation exercise. (Symbols Reader module covers each symbol in interactive detail; this section drills the key reading rules.)'),
            h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-fuchsia-900' }, 'The 4 anchor concepts'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, '1. Reference line: '), 'Horizontal line with arrow on one end. This is the structural element of every weld symbol.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, '2. Arrow side vs other side: '), 'Symbols BELOW the line = arrow side (the side the arrow points to). ABOVE the line = other side. BOTH = weld on both sides.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, '3. Symbol shape = weld type: '), 'Triangle = fillet, square = square groove, "V" = V groove, half-V = bevel groove, U = U groove, circle = plug/slot.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, '4. Numbers + tail: '), 'Number left of symbol = size (leg length for fillet, depth for groove). Number right = length / pitch (for intermittent). Tail = specification reference (process, procedure number).')
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'Common compound symbols'),
            h('div', { className: 'space-y-2' },
              [{ sym: 'Fillet with both-side triangles + 1/4', meaning: '1/4" leg fillet on both sides of joint, continuous full length' },
               { sym: 'Fillet 3/16 - 2 (10) on arrow side', meaning: '3/16" leg, intermittent 2" long welds spaced 10" center-to-center, on arrow side only' },
               { sym: 'V-groove arrow side + 60°', meaning: 'Single-V groove on arrow side, 60° included angle, full penetration' },
               { sym: 'Bevel-groove both sides + 1/16 root', meaning: 'Bevel groove both sides with 1/16" root opening before tacking' },
               { sym: 'Field weld flag (filled triangle at junction)', meaning: 'This weld will be made in the field (not shop) — relevant for procedures + equipment selection' },
               { sym: 'Weld-all-around (circle at junction)', meaning: 'Weld extends completely around the joint (typically pipe-to-plate, base of post, etc.)' },
               { sym: 'Tail with "GTAW" + procedure WPS-22', meaning: 'Use GTAW process per Welding Procedure Specification 22 — referenced document defines specifics' }].map(function(s, i) {
                return h('div', { key: i, className: 'bg-purple-50 border-l-4 border-purple-400 rounded-r-xl p-3' },
                  h('div', { className: 'font-mono font-bold text-purple-900 mb-1 text-sm' }, s.sym),
                  h('p', { className: 'text-sm text-slate-800' }, s.meaning)
                );
              })
            )
          );
        } else if (sect === 'estimate') {
          content = h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-base font-bold text-slate-800' }, '🧾 Estimating + bidding work'),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Whether bidding a job for a customer or estimating internal hours for a supervisor, welders need to translate prints into time + materials. Bad estimates = lost money OR lost bids.'),
            h('h4', { className: 'text-sm font-bold text-slate-800' }, 'The estimating formula'),
            h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4 space-y-2' },
              h('p', { className: 'text-sm font-mono text-slate-800 bg-white border border-fuchsia-300 rounded p-2 text-center' }, 'Total = (Material × markup) + (Labor hr × rate) + Overhead + Profit'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Material: '), 'Steel + filler + gas + consumables. Add 15-25% markup for handling + waste.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Labor hours: '), 'Time-per-foot of weld × number of feet + setup time + cleanup. Include grinding, fitting, tacking.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Shop rate: '), '$65-95/hr (Maine welding shop, 2026). Includes machinery cost, insurance, utilities, taxes.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Overhead: '), 'Already in shop rate but big jobs may need separate line for travel, permits, special equipment rental.'),
              h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Profit: '), '10-25% on top of cost basis. The "this is worth doing" number.')
            ),
            h('h4', { className: 'text-sm font-bold text-slate-800 mt-3' }, 'Time estimates by process (approximate, plate work)'),
            h('div', { className: 'space-y-1' },
              [{ proc: 'MIG short-circuit on 1/4" plate', rate: '8-15 in/min travel', wpd: '15-30 in/min of weld per hour billable' },
               { proc: 'MIG spray transfer on 3/8"+ plate', rate: '15-25 in/min travel', wpd: '30-60 in/min billable' },
               { proc: 'FCAW gas-shielded on 1/2" plate', rate: '10-18 in/min travel', wpd: '20-40 in/min billable' },
               { proc: 'Stick (E7018) on 3/8" plate, vertical-up', rate: '4-7 in/min travel', wpd: '8-15 in/min billable' },
               { proc: 'TIG on 1/16" stainless', rate: '3-6 in/min travel', wpd: '5-10 in/min billable' },
               { proc: 'Pipe welding 6G (root-fill-cap)', rate: '~1-2 inches/min total for all passes', wpd: '5-8 ft of pipe per 8-hr shift typical' }].map(function(r, i) {
                return h('div', { key: i, className: 'bg-emerald-50 border-l-4 border-emerald-400 rounded-r p-2 text-sm' },
                  h('div', { className: 'font-bold text-emerald-900' }, r.proc),
                  h('div', { className: 'text-xs text-slate-700' }, h('span', null, 'Arc travel: ' + r.rate), ' · ', h('span', null, 'Billable: ' + r.wpd))
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-3' },
              h('div', { className: 'text-xs font-bold uppercase text-amber-900 mb-1' }, '💡 The estimating mistakes'),
              h('p', { className: 'text-sm text-slate-800' }, 'Forgetting setup/cleanup (often 20-40% of total time). Forgetting fitting + tacking before welding starts. Underestimating multi-pass welds (root + fill + cap = 3+ passes). Not factoring inspection + repair time. Not pricing in consumables (especially gas cylinder rental + delivery).')
            )
          );
        }

        var mbModeTabs = [
          { id: 'browse', label: '📐 Browse topics' },
          { id: 'quiz',   label: '🔣 Symbol Match quiz' }
        ];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '📐', title: 'Welding Math + Blueprints' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { role: 'tablist', 'aria-label': 'Math + Blueprint mode', className: 'flex flex-wrap gap-2' },
              mbModeTabs.map(function(t) {
                var sel = (mbMode === t.id);
                return h('button', {
                  key: t.id, role: 'tab', 'aria-selected': sel,
                  onClick: function() { setMbMode(t.id); announce(t.label); },
                  className: 'px-4 py-2 rounded-lg border-2 text-sm font-bold transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' +
                    (sel ? 'bg-fuchsia-700 text-white border-fuchsia-800' : 'bg-white text-slate-800 border-slate-300 hover:border-fuchsia-400')
                }, t.label);
              })
            ),
            mbMode === 'browse' && h('div', { className: 'flex flex-wrap gap-2' },
              sects.map(function(s) {
                var sel = (sect === s.id);
                return h('button', {
                  key: s.id,
                  onClick: function() { setSect(s.id); announce(s.label); },
                  className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' +
                    (sel ? 'bg-fuchsia-700 text-white border-fuchsia-800' : 'bg-white text-slate-800 border-slate-300 hover:border-fuchsia-400')
                }, s.label);
              })
            ),
            mbMode === 'browse' && h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' }, content),
            mbMode === 'quiz' && h('div', { className: 'bg-white rounded-2xl shadow border-2 border-fuchsia-300 p-5 space-y-4' },
              h('div', { className: 'flex justify-between items-baseline flex-wrap gap-2' },
                h('div', { className: 'text-sm font-bold text-slate-800' }, 'Question ' + (mbQIdx + 1) + ' of ' + symbolQuestions.length),
                h('div', { className: 'text-sm font-mono font-bold ' + (mbQScore >= symbolQuestions.length * 0.7 ? 'text-emerald-700' : mbQScore >= symbolQuestions.length * 0.4 ? 'text-amber-700' : 'text-slate-700') }, 'Score: ' + mbQScore + ' / ' + symbolQuestions.length)
              ),
              h('div', { className: 'text-base font-bold text-slate-900' }, curQ.prompt),
              renderSymbolViz(curQ.viz),
              h('div', { className: 'space-y-2', role: 'radiogroup', 'aria-label': 'Choose the meaning' },
                curQ.options.map(function(opt, i) {
                  var picked = (mbQPicked === i);
                  var isCorrect = (i === curQ.correct);
                  var bg = 'bg-white border-slate-300';
                  if (mbQPicked != null) {
                    if (isCorrect) bg = 'bg-emerald-100 border-emerald-500';
                    else if (picked) bg = 'bg-rose-100 border-rose-500';
                    else bg = 'bg-slate-50 border-slate-300 opacity-60';
                  } else if (picked) bg = 'bg-fuchsia-50 border-fuchsia-500';
                  return h('button', {
                    key: i,
                    onClick: function() { pickAnswer(i); },
                    disabled: mbQPicked != null,
                    role: 'radio',
                    'aria-checked': picked,
                    className: 'w-full text-left p-3 rounded-xl border-2 transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' + bg + (mbQPicked == null ? ' hover:border-fuchsia-400' : '')
                  },
                    h('span', { className: 'text-sm font-bold text-slate-800' },
                      String.fromCharCode(65 + i) + '. ' + opt
                    ),
                    mbQPicked != null && isCorrect && h('span', { className: 'ml-2 text-emerald-700 font-bold' }, '✓ correct'),
                    mbQPicked != null && picked && !isCorrect && h('span', { className: 'ml-2 text-rose-700 font-bold' }, '✗ your pick')
                  );
                })
              ),
              mbQPicked != null && h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-2', 'aria-live': 'polite' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-900' }, 'Why:'),
                h('p', { className: 'text-sm text-slate-800' }, curQ.explain)
              ),
              h('div', { className: 'flex justify-between items-center pt-2 border-t border-slate-200 gap-2 flex-wrap' },
                h('button', {
                  onClick: resetQuiz,
                  className: 'text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }, '↺ Restart quiz'),
                mbQPicked != null && h('button', {
                  onClick: nextQuestion,
                  className: 'text-sm font-bold px-4 py-2 rounded-lg bg-fuchsia-700 text-white hover:bg-fuchsia-800 transition'
                }, mbQIdx === symbolQuestions.length - 1 ? 'Back to question 1 →' : 'Next question →')
              )
            ),
            h(TeacherNotes, {
              standards: ['AWS A2.4 (Weld Symbols)', 'ASME Y14.5 (GD&T)', 'Common Core Math (HS Geometry, Algebra)'],
              questions: [
                'Why are most fabrication errors measurement errors, not welding errors?',
                'A welder cuts five 24-3/4" plates each 1/16" oversize. What\'s the assembly error? Acceptable?',
                'Walk through estimating a job: 8 feet of 3/8" fillet weld on mild steel. What goes into the bid?'
              ],
              misconceptions: [
                '"I can eyeball most measurements" — most rejected fabrications were eyeballed.',
                '"Tolerance only matters in precision work" — structural welding has tolerance too, just looser.',
                '"Estimating is for bookkeepers" — every welder estimates, even informally. Better estimating = better wages.'
              ],
              extension: 'Pick a fabrication you\'ve made or seen. Reverse-estimate it: material cost, time, shop rate. What would you have charged? Compare to what was actually charged (if you can find out).'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 21: WELDER CAREER STORIES (12+ profiles)
      // ─────────────────────────────────────────────────────
      function CareerStories() {
        // tags: { want: ['steady','creative','top_pay','helping'], school: ['fast','cc','bachelor','apprentice'], place: ['big','small','self','outdoor'] }
        var stories = [
          { name: 'Marcus T.', age: 28, role: 'Structural welder at BIW', path: 'Mid-Coast School of Technology (HS) → BIW Internal Training → 4 years on-floor', pay: '$31/hr base + OT often pushes annual to $80K+', voice: '"I knew sophomore year. I wasn\'t going to college, and my dad welded at BIW for 25 years. CTE got me my OSHA + first AWS quals. I joined BIW training at 18, was on the production floor at 19. Now I\'m running a sub-arc machine on hull plating. Pension vests at 5 years — that\'s the play."', advice: 'Take CTE seriously even if you\'re bored. The certifications matter more than the welding practice you get there.', tags: { want: ['steady'], school: ['fast'], place: ['big'] } },
          { name: 'Sarah K.', age: 34, role: 'TIG aluminum welder at Hodgdon Yachts', path: 'EMCC welding 2-yr (after 4 yr at retail) → Hodgdon hired her at 26 → 8 years on yachts', pay: '$28/hr + benefits + occasional bonus on yacht delivery', voice: '"Career-changed at 24. I wanted something where I could see what I\'d made at the end of the day. EMCC was hard but cheap. The aluminum work at Hodgdon is meditative — long beads, precision, beautiful results. The boats we build are for owners who paid $20M+. Knowing my welds are on those is satisfying in a way retail never was."', advice: 'It is not too late to change. EMCC has plenty of 25-40 year-old students. The shops want you.', tags: { want: ['creative','steady'], school: ['cc'], place: ['small'] } },
          { name: 'Diego R.', age: 41, role: 'UA Local 716 pipefitter (journeyman)', path: 'Worked at small fab shop 4 yr after HS → applied to UA apprenticeship at 23 → journey out at 28 → 13 years pipefitting', pay: '$45/hr Maine prevailing + per diem on travel jobs. Annual $120K+ typical.', voice: '"The apprenticeship was the smartest thing I ever did. No college debt. Paid to learn. Pay scale guaranteed each year. I work paper mill shutdowns (Sappi, Verso) plus big construction (Cianbro modules). When the work\'s here, the wages are great. When it\'s not, you travel — Connecticut, Quebec, Pennsylvania."', advice: 'Apply early. Apprenticeship slots are competitive. Show up to information sessions. Bring your aptitude test scores up.', tags: { want: ['top_pay'], school: ['apprentice'], place: ['outdoor'] } },
          { name: 'Patricia L.', age: 52, role: 'Owns Patty\'s Mobile Welding (Cumberland County)', path: 'EMCC 1-yr cert → 12 yr at small fab shops → opened her own shop at 35 → 17 years self-employed', pay: 'Net $75-95K/yr after expenses (good years). Less in bad years.', voice: '"I went out on my own because the shops I worked at kept underpricing each other. I figured I could do better solo. Some years I do; some years I don\'t. The freedom is real. The 60-hour weeks during busy season are also real. I weld lobster boat rails in spring, snow plow repair in fall, custom truck bodies year-round. Word of mouth + Facebook gets me 80% of my work."', advice: 'Don\'t go out on your own until you have 5+ years experience + a 6-month savings cushion. And know what you\'ll charge BEFORE the phone rings.', tags: { want: ['creative'], school: ['cc'], place: ['self'] } },
          { name: 'Jamal F.', age: 23, role: 'CWI Inspector apprentice (Cianbro)', path: 'CTE welding + work-study at Cianbro → AWS CWI exam at 22 → inspector path', pay: '$26/hr now; $40+/hr at full CWI', voice: '"I was a decent welder but I noticed I liked checking other welders\' work more than welding myself. CWI (Certified Welding Inspector) is a credential you can earn after several years experience. It pays as much or more than welding. You travel sites, you check codes, you have a clipboard. Some welders hate inspectors; I get that. But the work is interesting."', advice: 'If you can read prints + memorize codes + you don\'t mind being unpopular, inspector path pays well. Study for the CWI early.', tags: { want: ['helping','steady'], school: ['fast'], place: ['outdoor'] } },
          { name: 'Rebecca W.', age: 36, role: 'Pratt & Whitney aerospace welder (North Berwick)', path: 'SMCC 2-yr → 6 yr at Cianbro module fab → recruited by P&W at 31 → 5 years aerospace', pay: '$38/hr + benefits + 401k match. Annual $90K+', voice: '"Aerospace welding is different. Inconel, titanium, super-alloys. Sometimes you\'re welding a single 6-inch joint that took 8 hours of fit-up. Every weld is inspected. You\'re reading specs that fill a binder. The pay is great and the precision is satisfying, but if you like fast production work, this isn\'t for you."', advice: 'Aerospace shops want welders with proven precision. Build TIG skills early. Take the time to learn one process VERY well before moving on.', tags: { want: ['steady','top_pay'], school: ['cc'], place: ['big'] } },
          { name: 'Kevin S.', age: 45, role: 'Maine DOT bridge inspector + welder', path: 'EMCC 2-yr → 12 yr at small bridge fab shop → Maine DOT at 32 → 13 years state', pay: '$28/hr + state benefits + pension. Annual $65K + great benefits.', voice: '"State pay isn\'t the highest, but the benefits + pension + work-life balance are excellent. I drive a state truck. I inspect + repair bridges across Maine. Some weeks I\'m in Aroostook; some in Lewiston. I see the whole state. Will retire at 55 with full pension. Wouldn\'t trade it."', advice: 'Don\'t overlook state + federal jobs. Less glamorous than BIW but the pension is gold. Apply at maine.gov/bhr.', tags: { want: ['steady','helping'], school: ['cc'], place: ['outdoor'] } },
          { name: 'Tyrone J.', age: 30, role: 'Underwater welder (international contracts)', path: 'Navy 6 years → commercial dive school after discharge → underwater welder 5 years', pay: '$80-200K/yr depending on contracts. Highly variable.', voice: '"Underwater welding is dangerous + travel-heavy. I work Gulf of Mexico oil platforms, North Sea, occasionally Asia. I\'m gone 8-10 months a year. Pay is great when working but no work = no pay. Industry has fatalities. I\'m planning to topside-only by 35; the body wears out."', advice: 'Underwater welding is not a safe steady career. It\'s a high-pay-high-risk path with a limited window. Have an exit plan.', tags: { want: ['top_pay'], school: ['fast'], place: ['outdoor'] } },
          { name: 'Sophie B.', age: 26, role: 'Custom artisan welder + metal artist', path: 'BFA in sculpture → self-taught welding → 4 years building art + custom commissions', pay: 'Net $45-70K/yr (variable). Supplemented by teaching welding classes.', voice: '"Art welding is its own world. I make outdoor sculpture, custom gates, decorative pieces. I sell at craft shows + galleries + commissions. EMCC + welding shop techs aren\'t the only path. I taught myself MIG + plasma + forge work. Maine has a strong artisan-maker community."', advice: 'If art is your goal, look at North Bennet Street School (Boston) or Penland (NC) for craft-focused metalwork training. Maine Crafts Association has a directory of local makers.', tags: { want: ['creative'], school: ['bachelor'], place: ['self'] } },
          { name: 'Mike H.', age: 58, role: 'Retired welder, now teaches at Mid-Coast School of Technology', path: '30 yr at BIW (started 1988) → retired with pension at 55 → teaching CTE since 2023', pay: '~$50K/yr teaching + BIW pension. Lower than BIW but stress-free + meaningful.', voice: '"BIW for three decades. Hull welder. Saw 35+ destroyers go down the river. Body wore out — knees + back + some hearing loss. Pension covered me. Teaching CTE is the best second career — kids who think they can\'t go to college but love working with their hands. I show them they have a path."', advice: 'BIW pays well but plan for body wear. Get the inspector cert (CWI) as a fallback. Save aggressively in your 20s — your 50s self will thank you.', tags: { want: ['helping','steady'], school: ['fast'], place: ['small'] } },
          { name: 'Cassidy M.', age: 22, role: 'Boilermaker Local 29 apprentice (year 3 of 4)', path: 'CTE → 1 yr at a small fab shop → Boilermaker apprenticeship at 19 → 3 yr in', pay: '$28/hr apprentice rate now → $45+/hr at journey out next year', voice: '"Boilermaker is mostly traveling shutdown work. I work paper mills, power plants, refineries. Sometimes 2 weeks at a site, sometimes 2 months. Per diem when traveling. The work is hard — confined spaces, heat, overhead welding. The pay is great. The brotherhood is real. Already saving for a house at 22."', advice: 'Boilermaker is high-pay high-effort. You\'ll travel. Body needs to be in good shape. Drug test will happen. If you\'re willing, the wages + pension are top tier.', tags: { want: ['top_pay'], school: ['apprentice'], place: ['outdoor'] } },
          { name: 'Lin C.', age: 39, role: 'Welding engineer (B.S. Welding Engineering, Ferris State)', path: 'CTE → 2 yr welding work → went back for B.S. at 24 → engineer at 28 → 11 years engineering', pay: '$95K-$130K depending on employer. Currently at major Maine paper mill.', voice: '"I welded for 2 years after CTE. Realized I wanted to design the procedures, not just execute them. Went back for B.S. in Welding Engineering at Ferris State (Michigan — one of few US programs). Now I write WPSs, qualify procedures, troubleshoot weld failures. Office work mostly, but I still don the hood for tests."', advice: 'B.S. Welding Engineering is rare but well-paid. Ferris State, LeTourneau, Ohio State. If you like the science + don\'t mind 4 more years of school, this is the path to design-side work + 6-figure salary.', tags: { want: ['top_pay','steady'], school: ['bachelor'], place: ['big'] } },
          { name: 'Rosa P.', age: 31, role: 'Mobile food truck welder + entrepreneur (Portland, ME)', path: 'EMCC → 5 yr in production fab → started custom food truck builds at 28 → 3 yr building', pay: 'Net $60-85K/yr (variable). Has 3-month booking backlog.', voice: '"Food trucks are hot right now. I build custom rigs — stainless interiors, equipment mounts, exhaust hoods. Most customers are first-time food entrepreneurs. I charge $40K-80K per build. Margin is decent but cash flow is rough — customers pay deposits + final pay only at delivery. I had to build savings to handle 3-month builds with no income in between."', advice: 'Find a niche. Generic welding is competitive. Niche welding (food trucks, custom motorcycles, art, brewery equipment) commands premium prices + repeat customers.', tags: { want: ['creative'], school: ['cc'], place: ['self'] } },
          { name: 'Daniel O.', age: 47, role: 'Welder + small farm owner (Downeast Maine)', path: 'Welder 25 years (various shops + freelance) → bought farm at 38 → welding part-time + farming part-time', pay: 'Welding $25-30K + farm net $15-25K (varies). Combined ~$50K + lifestyle benefits.', voice: '"I weld 2-3 days/week (mobile + small shop in barn) + farm 4-5 days/week. The welding pays the bills + insurance + equipment. The farm is the life. Most Maine farmers I know have a side trade — welding, carpentry, plumbing. The land doesn\'t feed you alone in Maine."', advice: 'If you want a Maine homestead, having a portable trade is huge. Welding scales down well — small shop in a barn covers a lot of mobile work.', tags: { want: ['creative'], school: ['fast'], place: ['self'] } }
        ];

        var sSel = usePersistedState('cs_sel', 0);
        var idx = sSel[0], setIdx = sSel[1];
        var s = stories[idx] || stories[0];

        // ── Find Your Fit state ──
        var modeState = usePersistedState('cs_mode', 'browse'); // 'browse' | 'fit'
        var mode = modeState[0], setMode = modeState[1];
        var qWantState = usePersistedState('cs_q_want', null);
        var qSchoolState = usePersistedState('cs_q_school', null);
        var qPlaceState = usePersistedState('cs_q_place', null);
        var qWant = qWantState[0], setQWant = qWantState[1];
        var qSchool = qSchoolState[0], setQSchool = qSchoolState[1];
        var qPlace = qPlaceState[0], setQPlace = qPlaceState[1];

        function scoreStory(st) {
          var sc = 0;
          if (qWant && st.tags.want.indexOf(qWant) !== -1) sc += 3;
          if (qSchool && st.tags.school.indexOf(qSchool) !== -1) sc += 2;
          if (qPlace && st.tags.place.indexOf(qPlace) !== -1) sc += 2;
          return sc;
        }
        function topMatches() {
          var ranked = stories.map(function(st, i) { return { st: st, i: i, sc: scoreStory(st) }; });
          ranked.sort(function(a, b) { return b.sc - a.sc; });
          return ranked.filter(function(r) { return r.sc > 0; }).slice(0, 3);
        }
        function resetQuiz() { setQWant(null); setQSchool(null); setQPlace(null); }
        var quizComplete = (qWant && qSchool && qPlace);
        var matches = quizComplete ? topMatches() : [];

        var wantOpts = [
          { id: 'steady',   label: '🛡 Steady work, great benefits', hint: 'Pension, healthcare, predictable schedule' },
          { id: 'creative', label: '🎨 Hands-on creative work, no boss', hint: 'Build things, set your own hours, varied projects' },
          { id: 'top_pay',  label: '💰 Highest pay even if I travel', hint: 'Top dollar, willing to be away from home for it' },
          { id: 'helping',  label: '🤝 Help or teach others', hint: 'Inspector, teacher, mentor roles' }
        ];
        var schoolOpts = [
          { id: 'fast',       label: '⚡ Start working ASAP after HS', hint: 'CTE + direct-hire training (BIW, small shops)' },
          { id: 'cc',         label: '🎓 ~2 years of community college', hint: 'EMCC, SMCC, county college welding programs' },
          { id: 'apprentice', label: '🤝 Paid apprenticeship (3-5 yrs)', hint: 'Union: UA pipefitter, Boilermaker, IAM' },
          { id: 'bachelor',   label: '📚 4-year bachelor\'s degree', hint: 'Welding engineering, art/sculpture, design-side' }
        ];
        var placeOpts = [
          { id: 'big',     label: '🏭 Big shipyard or factory', hint: 'BIW, Pratt & Whitney, Cianbro modules' },
          { id: 'small',   label: '🛠 Small shop or boatyard', hint: 'Hodgdon, mid-coast boat builders, family fab shops' },
          { id: 'self',    label: '🚐 My own truck, my own customers', hint: 'Mobile welding, custom builds, food trucks' },
          { id: 'outdoor', label: '🌲 Outdoor, varied locations', hint: 'Bridges, pipelines, traveling shutdown work' }
        ];

        function questionBlock(title, opts, value, setter) {
          return h('div', { className: 'space-y-2' },
            h('h4', { className: 'text-sm font-bold text-fuchsia-900' }, title),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
              opts.map(function(o) {
                var sel = (value === o.id);
                return h('button', {
                  key: o.id,
                  onClick: function() { setter(o.id); announce(o.label); },
                  'aria-pressed': sel,
                  className: 'text-left p-3 rounded-xl border-2 transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' +
                    (sel ? 'bg-fuchsia-100 border-fuchsia-600' : 'bg-white border-slate-300 hover:border-fuchsia-400')
                },
                  h('div', { className: 'text-sm font-bold text-slate-800' }, o.label),
                  h('div', { className: 'text-xs text-slate-600 mt-0.5' }, o.hint)
                );
              })
            )
          );
        }

        var modeTabs = [
          { id: 'browse', label: '📖 Browse all profiles' },
          { id: 'fit',    label: '🎯 Find Your Fit' }
        ];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '📖', title: 'Welder Career Stories' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4' },
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, 'Real welders. Real paths. Real wages. These profiles are composites drawn from documented Maine + New England welding career patterns + AWS workforce reports + Maine Department of Labor occupational data. Each one represents a viable path — not the only path, but proven ones. Names are pseudonyms; situations are representative.')
            ),
            h('div', { role: 'tablist', 'aria-label': 'Career Stories mode', className: 'flex flex-wrap gap-2' },
              modeTabs.map(function(t) {
                var sel = (mode === t.id);
                return h('button', {
                  key: t.id,
                  role: 'tab',
                  'aria-selected': sel,
                  onClick: function() { setMode(t.id); announce(t.label); },
                  className: 'px-4 py-2 rounded-lg border-2 text-sm font-bold transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' +
                    (sel ? 'bg-fuchsia-700 text-white border-fuchsia-800' : 'bg-white text-slate-800 border-slate-300 hover:border-fuchsia-400')
                }, t.label);
              })
            ),
            mode === 'fit' && h('div', { className: 'bg-white rounded-2xl shadow border-2 border-fuchsia-300 p-5 space-y-5' },
              h('div', { className: 'text-sm text-slate-700' }, 'Answer 3 quick questions. We\'ll show you the welders whose paths fit your answers best — not the only fits, just the closest matches in this set of 14.'),
              questionBlock('1. What do you want most from your work?', wantOpts, qWant, setQWant),
              questionBlock('2. How much school can you imagine doing?', schoolOpts, qSchool, setQSchool),
              questionBlock('3. Where do you want to work?', placeOpts, qPlace, setQPlace),
              quizComplete && h('div', { className: 'space-y-3 pt-3 border-t-2 border-fuchsia-200' },
                h('div', { className: 'flex justify-between items-baseline flex-wrap gap-2' },
                  h('h3', { className: 'text-lg font-black text-fuchsia-900' }, '🎯 Your top matches'),
                  h('button', {
                    onClick: function() { resetQuiz(); announce('Quiz reset'); },
                    className: 'text-xs font-bold px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                  }, '↺ Start over')
                ),
                matches.length === 0
                  ? h('div', { className: 'text-sm text-slate-700 italic' }, 'No matches — try different answers.')
                  : h('div', { className: 'space-y-2' },
                      matches.map(function(m, i) {
                        return h('div', { key: m.i, className: 'bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl p-4 flex items-start gap-3 flex-wrap' },
                          h('div', { className: 'text-3xl font-black text-fuchsia-700' }, '#' + (i + 1)),
                          h('div', { className: 'flex-1 min-w-0' },
                            h('div', { className: 'font-black text-fuchsia-900' }, m.st.name + ', age ' + m.st.age),
                            h('div', { className: 'text-sm font-bold text-slate-700 mb-1' }, m.st.role),
                            h('div', { className: 'text-xs font-mono text-emerald-700 mb-2' }, m.st.pay),
                            h('button', {
                              onClick: function() { setIdx(m.i); setMode('browse'); announce('Showing ' + m.st.name); },
                              className: 'text-xs font-bold px-3 py-1.5 rounded-lg bg-fuchsia-700 text-white hover:bg-fuchsia-800 transition'
                            }, 'Read full profile →')
                          ),
                          h('div', { className: 'text-xs font-mono text-fuchsia-700' }, 'match: ' + m.sc + '/7')
                        );
                      })
                    ),
                h('div', { className: 'bg-amber-50 border-l-4 border-amber-400 rounded-r p-3 text-sm text-slate-700' },
                  h('strong', null, 'Reality check: '), 'These are starting points, not destinations. Most welders end up somewhere none of these 14 quite predicted. The quiz tells you which paths are worth researching first — not which one you must take.'
                )
              )
            ),
            mode === 'browse' && h('div', { className: 'flex flex-wrap gap-2' },
              stories.map(function(p, i) {
                var sel = (i === idx);
                return h('button', {
                  key: i,
                  onClick: function() { setIdx(i); announce(p.name + ', ' + p.role); },
                  className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition focus:outline-none focus:ring-2 ring-fuchsia-500/40 ' +
                    (sel ? 'bg-fuchsia-700 text-white border-fuchsia-800' : 'bg-white text-slate-800 border-slate-300 hover:border-fuchsia-400')
                }, p.name + ', ' + p.age);
              })
            ),
            mode === 'browse' && h('div', { className: 'bg-white rounded-2xl shadow border-2 border-fuchsia-200 p-6 space-y-3' },
              h('div', { className: 'border-b border-slate-200 pb-3' },
                h('div', { className: 'text-xl font-black text-fuchsia-900' }, s.name + ', age ' + s.age),
                h('div', { className: 'text-sm font-bold text-slate-700 mt-1' }, s.role)
              ),
              h('div', null,
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, 'Path'),
                h('p', { className: 'text-sm text-slate-800' }, s.path)
              ),
              h('div', null,
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, 'Pay'),
                h('p', { className: 'text-sm font-mono text-emerald-700' }, s.pay)
              ),
              h('div', null,
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, 'In their words'),
                h('p', { className: 'text-sm text-slate-800 italic leading-relaxed' }, s.voice)
              ),
              h('div', { className: 'bg-amber-50 border-l-4 border-amber-400 rounded-r p-3' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-900 mb-1' }, '💡 Advice for students'),
                h('p', { className: 'text-sm text-slate-800' }, s.advice)
              )
            ),
            h(TeacherNotes, {
              standards: ['Maine CTE Career Pathways', 'NCDA Career Development', 'NCCER + AWS curriculum'],
              questions: [
                'Which of these paths surprised you? Why?',
                'What\'s the trade-off between BIW (high pay, structured) and self-employment (variable, flexible)?',
                'Compare apprenticeship (Diego, Cassidy) vs community college (Sarah, Patricia). What suits which student?'
              ],
              misconceptions: [
                '"You can\'t make real money welding" — multiple profiles >$80K, several >$120K.',
                '"Welding is only for men" — Sarah, Patricia, Rebecca, Sophie, Cassidy, Rosa.',
                '"Welding is a backup plan if you can\'t do college" — Lin\'s welding engineering path requires B.S.; Jamal\'s inspector path requires study + exam; nothing about this trade is "below" academic work.'
              ],
              extension: 'Pick a profile that interests you. Research the actual path — what training, what cost, what time. Are there local resources? Could you start it? What would you give up to do it?'
            })
          )
        );
      }

      // overlay so the toast can appear regardless of which view is active.
      // ─────────────────────────────────────────────────────
      var viewBody;
      if (view === 'heatInput') viewBody = h(HeatInputCalculator);
      else if (view === 'beadLab') viewBody = h(WeldBeadLab);
      else if (view === 'defectHunt') viewBody = h(DefectHuntLab);
      else if (view === 'processCompare') viewBody = h(ProcessComparison);
      else if (view === 'jointCatalog') viewBody = h(JointCatalog);
      else if (view === 'symbolsReader') viewBody = h(SymbolsReader);
      else if (view === 'ppeSafety') viewBody = h(PPESafetyLab);
      else if (view === 'careerPaths') viewBody = h(CareerPathways);
      else if (view === 'underwater') viewBody = h(UnderwaterLab);
      else if (view === 'speedChallenge') viewBody = h(SpeedChallenge);
      else if (view === 'processSleuth') viewBody = h(ProcessSleuth);
      else if (view === 'defectDiagnose') viewBody = h(DefectDiagnose);
      else if (view === 'defectCatalog') viewBody = h(DefectCatalogView);
      else if (view === 'metallurgy') viewBody = h(MetallurgyDeepDive);
      else if (view === 'codes') viewBody = h(CodesAndStandards);
      else if (view === 'qualPrep') viewBody = h(WelderQualPrep);
      else if (view === 'pipeWelding') viewBody = h(PipeWeldingDeepDive);
      else if (view === 'robotic') viewBody = h(RoboticAutomated);
      else if (view === 'inspection') viewBody = h(InspectionCWIPrep);
      else if (view === 'consumables') viewBody = h(ConsumablesDeepDive);
      else if (view === 'maineEcosystem') viewBody = h(MaineEcosystem);
      else if (view === 'safetyHealth') viewBody = h(SafetyHealthDeepDive);
      else if (view === 'mathBlueprint') viewBody = h(MathBlueprintLab);
      else if (view === 'careerStories') viewBody = h(CareerStories);
      else viewBody = h(MainMenu);
      return h(React.Fragment, null, defectCelebOverlay(), viewBody);
    }
  });

})();

}
