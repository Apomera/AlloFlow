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

      var BADGE_IDS = ['heatInput','beadLab','defectHunt','processCompare','jointCatalog','symbolsReader','ppeSafety','careerPaths','underwater','speedChallenge','defectCatalog'];
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
          h('div', {
            'aria-live': 'polite',
            className: 'mb-6 p-4 rounded-2xl border-2 ' + (allDone ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-200') + ' flex items-center justify-between gap-4'
          },
            h('div', { className: 'flex items-center gap-3' },
              h('span', { className: 'text-3xl' + (allDone ? ' weldlab-arc-pulse' : '') }, allDone ? '🏆' : '🛠️'),
              h('div', null,
                h('div', { className: 'font-bold text-slate-800' },
                  allDone ? 'All modules explored — full welding path complete!' : ('Progress: ' + visitedCount + ' of ' + totalCount + ' modules explored')
                ),
                h('div', { className: 'text-xs text-slate-700' },
                  allDone ? 'Revisit any module to deepen your understanding.' : 'Open each card below to learn its specialty.')
              )
            ),
            h('div', { className: 'flex-shrink-0 w-32 h-3 bg-slate-200 rounded-full overflow-hidden relative', 'aria-hidden': true },
              h('div', {
                className: 'h-full weldlab-stripe-anim ' + (allDone ? 'bg-orange-500' : 'bg-orange-400') + ' transition-all',
                style: { width: Math.round((visitedCount / totalCount) * 100) + '%' }
              })
            )
          ),
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
        var V_state = useState(d.hi_V != null ? d.hi_V : 22);
        var A_state = useState(d.hi_A != null ? d.hi_A : 180);
        var TS_state = useState(d.hi_TS != null ? d.hi_TS : 12);
        var P_state = useState(d.hi_process || 'mig');
        var V = V_state[0], setV = V_state[1];
        var A = A_state[0], setA = A_state[1];
        var TS = TS_state[0], setTS = TS_state[1];
        var P = P_state[0], setP = P_state[1];

        useEffect(function() { upd('hi_V', V); }, [V]);
        useEffect(function() { upd('hi_A', A); }, [A]);
        useEffect(function() { upd('hi_TS', TS); }, [TS]);
        useEffect(function() { upd('hi_process', P); }, [P]);

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
        var V_state = useState(d.bl_V != null ? d.bl_V : 22);
        var A_state = useState(d.bl_A != null ? d.bl_A : 180);
        var TS_state = useState(d.bl_TS != null ? d.bl_TS : 12);
        var P_state = useState(d.bl_process || 'mig');
        var M_state = useState(d.bl_material || 'steel');
        var TH_state = useState(d.bl_thickness != null ? d.bl_thickness : 0.25);
        var V = V_state[0], setV = V_state[1];
        var A = A_state[0], setA = A_state[1];
        var TS = TS_state[0], setTS = TS_state[1];
        var P = P_state[0], setP = P_state[1];
        var M = M_state[0], setM = M_state[1];
        var TH = TH_state[0], setTH = TH_state[1];

        useEffect(function() { upd('bl_V', V); }, [V]);
        useEffect(function() { upd('bl_A', A); }, [A]);
        useEffect(function() { upd('bl_TS', TS); }, [TS]);
        useEffect(function() { upd('bl_process', P); }, [P]);
        useEffect(function() { upd('bl_material', M); }, [M]);
        useEffect(function() { upd('bl_thickness', TH); }, [TH]);

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
          var ctxC = canvas.getContext('2d');
          var W = canvas.width, H = canvas.height;
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
            } else if (_prefersReducedMotion) {
              // Static finished bead — no arc
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
        }, []);

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
            // Canvas
            h('div', { className: 'bg-slate-900 rounded-2xl shadow border-2 border-slate-700 p-3' },
              h('canvas', {
                ref: canvasRef,
                width: 900,
                height: 280,
                role: 'img',
                'aria-label': canvasAriaLabel,
                className: 'w-full block rounded-lg'
              })
            ),
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
        var sampleIdx_state = useState(d.dh_sampleIdx != null ? d.dh_sampleIdx : 0);
        var sampleIdx = sampleIdx_state[0], setSampleIdx = sampleIdx_state[1];
        var found_state = useState({});
        var found = found_state[0], setFound = found_state[1];
        var falseReads_state = useState(0);
        var falseReads = falseReads_state[0], setFalseReads = falseReads_state[1];
        var revealAll_state = useState(false);
        var revealAll = revealAll_state[0], setRevealAll = revealAll_state[1];

        useEffect(function() { upd('dh_sampleIdx', sampleIdx); }, [sampleIdx]);

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
          var ctxC = canvas.getContext('2d');
          var W = canvas.width, H = canvas.height;
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
        var tab_state = useState(d.jc_tab || 'butt');
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

        useEffect(function() { upd('jc_tab', tab); }, [tab]);

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
        var view_state = useState(d.sr_view || 'anatomy');
        var view = view_state[0], setLocalView = view_state[1];
        var challengeIdx_state = useState(0);
        var challengeIdx = challengeIdx_state[0], setChallengeIdx = challengeIdx_state[1];
        var answers_state = useState({});
        var answers = answers_state[0], setAnswers = answers_state[1];

        useEffect(function() { upd('sr_view', view); }, [view]);

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
        var view_state = useState(d.ps_view || 'gear');
        var view = view_state[0], setLocalView = view_state[1];
        var geared_state = useState({});
        var geared = geared_state[0], setGeared = geared_state[1];
        var scenarioIdx_state = useState(0);
        var scenarioIdx = scenarioIdx_state[0], setScenarioIdx = scenarioIdx_state[1];
        var scenarioPick_state = useState({});
        var scenarioPick = scenarioPick_state[0], setScenarioPick = scenarioPick_state[1];

        useEffect(function() { upd('ps_view', view); }, [view]);

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
        var view_state = useState(d.cp_view || 'overview');
        var view = view_state[0], setLocalView = view_state[1];

        useEffect(function() { upd('cp_view', view); }, [view]);

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
        var view_state = useState(d.uw_view || 'intro');
        var view = view_state[0], setLocalView = view_state[1];
        var depth_state = useState(d.uw_depth != null ? d.uw_depth : 30);
        var depth = depth_state[0], setDepth = depth_state[1];
        var technique_state = useState(d.uw_tech || 'wet');
        var technique = technique_state[0], setTech = technique_state[1];

        useEffect(function() { upd('uw_view', view); }, [view]);
        useEffect(function() { upd('uw_depth', depth); }, [depth]);
        useEffect(function() { upd('uw_tech', technique); }, [technique]);

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
        var tier_state = useState(d.sc_tier || 'apprentice');
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

        useEffect(function() { upd('sc_tier', tier); }, [tier]);

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
      else viewBody = h(MainMenu);
      return h(React.Fragment, null, defectCelebOverlay(), viewBody);
    }
  });

})();

}
